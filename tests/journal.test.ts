import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import {
  ecrireLog, lireLogs, exporterLogs, initialiserJournal,
  nettoyerAnciensLogs, estSecretDansLog
} from '../electron/journal'
import type { NiveauJournal } from '../electron/journal'

let dossierTest: string

const creerDossierTest = (): string => {
  const nom = `egto-journal-test-${randomBytes(8).toString('hex')}`
  const chemin = join(tmpdir(), nom)
  mkdirSync(chemin, { recursive: true })
  return chemin
}

const ecrireEntree = (niveau: NiveauJournal, message: string, module = 'test') => {
  return ecrireLog({
    dossierJournal: dossierTest,
    entree: {
      horodatage: new Date().toISOString(),
      niveau,
      module,
      message,
    },
  })
}

beforeEach(() => {
  dossierTest = creerDossierTest()
})

afterEach(() => {
  rmSync(dossierTest, { recursive: true, force: true })
})

describe('estSecretDansLog', () => {
  it('detecte mot de passe', () => {
    expect(estSecretDansLog('Mot de passe: abc')).toBe(true)
  })

  it('detecte DEK', () => {
    expect(estSecretDansLog('DEK stockée en mémoire')).toBe(true)
  })

  it('detecte phrase', () => {
    expect(estSecretDansLog('Phrase de récupération')).toBe(true)
  })

  it('detecte token', () => {
    expect(estSecretDansLog("Token d'authentification")).toBe(true)
  })

  it('detecte cle', () => {
    expect(estSecretDansLog('Cle de chiffrement')).toBe(true)
  })

  it('detecte enveloppe', () => {
    expect(estSecretDansLog('Enveloppe utilisateur')).toBe(true)
  })

  it('accepte message normal', () => {
    expect(estSecretDansLog('Application demarree')).toBe(false)
  })

  it('accepte message avec accents', () => {
    expect(estSecretDansLog('Fichier sauvegarde cree avec succes')).toBe(false)
  })
})

describe('ecrireLog', () => {
  it('ecriture basique', () => {
    const resultat = ecrireEntree('info', 'Demarrage application')
    expect(resultat.succes).toBe(true)

    const contenu = readFileSync(join(dossierTest, 'egto-journal.log'), 'utf8')
    expect(contenu).toContain('[INFO]')
    expect(contenu).toContain('Demarrage application')
  })

  it('refuse les secrets dans le message', () => {
    const resultat = ecrireEntree('erreur', 'Mot de passe incorrect')
    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/secret/)
  })

  it('refuse les secrets dans le stack', () => {
    const resultat = ecrireLog({
      dossierJournal: dossierTest,
      entree: {
        horodatage: new Date().toISOString(),
        niveau: 'erreur',
        module: 'test',
        message: 'Erreur inattendue',
        stack: 'Error at DEK allocation',
      },
    })
    expect(resultat.succes).toBe(false)
    expect(resultat.erreur).toMatch(/secret/)
  })

  it('gere les niveaux differents', () => {
    ecrireEntree('erreur', 'Erreur critique')
    ecrireEntree('avertissement', 'Espace disque faible')
    ecrireEntree('info', 'Sauvegarde terminee')

    const contenu = readFileSync(join(dossierTest, 'egto-journal.log'), 'utf8')
    expect(contenu).toContain('[ERREUR]')
    expect(contenu).toContain('[AVERTISSEMENT]')
    expect(contenu).toContain('[INFO]')
  })
})

describe('lireLogs', () => {
  it('lecture basique', () => {
    ecrireEntree('info', 'Message 1')
    ecrireEntree('erreur', 'Message 2')
    ecrireEntree('info', 'Message 3')

    const resultat = lireLogs({ dossierJournal: dossierTest })
    expect(resultat.entrees).toHaveLength(3)
    expect(resultat.entrees[0].message).toBe('Message 3')
  })

  it('filtre par niveau', () => {
    ecrireEntree('erreur', 'Err 1')
    ecrireEntree('info', 'Info 1')
    ecrireEntree('erreur', 'Err 2')
    ecrireEntree('info', 'Info 2')

    const resultat = lireLogs({ dossierJournal: dossierTest, niveau: 'erreur' })
    expect(resultat.entrees).toHaveLength(2)
    expect(resultat.entrees.every(e => e.niveau === 'erreur')).toBe(true)
  })

  it('limite le nombre', () => {
    for (let i = 0; i < 10; i++) {
      ecrireEntree('info', `Message ${i}`)
    }

    const resultat = lireLogs({ dossierJournal: dossierTest, nombre: 3 })
    expect(resultat.entrees).toHaveLength(3)
  })

  it('dossier inexistant', () => {
    const resultat = lireLogs({ dossierJournal: join(dossierTest, 'inexistant') })
    expect(resultat.entrees).toHaveLength(0)
    expect(resultat.fichiers).toHaveLength(0)
  })
})

describe('exporterLogs', () => {
  it('exporte les logs', () => {
    ecrireEntree('info', 'Ligne 1')
    ecrireEntree('erreur', 'Ligne 2')

    const destination = join(dossierTest, 'export.log')
    const resultat = exporterLogs({ dossierJournal: dossierTest, destination })
    expect(resultat.succes).toBe(true)
    expect(existsSync(destination)).toBe(true)

    const contenu = readFileSync(destination, 'utf8')
    expect(contenu).toContain('Ligne 1')
    expect(contenu).toContain('Ligne 2')
  })
})

describe('initialiserJournal', () => {
  it('cree le dossier', () => {
    const nouveauDossier = join(dossierTest, 'nouveau-journal')
    initialiserJournal({ dossierJournal: nouveauDossier })
    expect(existsSync(nouveauDossier)).toBe(true)
  })
})

describe('nettoyerAnciensLogs', () => {
  it('supprime les anciens fichiers', () => {
    for (let i = 0; i < 7; i++) {
      writeFileSync(join(dossierTest, `egto-journal-${i}.log`), `contenu ${i}`)
    }

    const resultat = nettoyerAnciensLogs({ dossierJournal: dossierTest, rotations: 3 })
    expect(resultat.succes).toBe(true)
    const fichiers = readdirSync(dossierTest).filter(f => f.endsWith('.log'))
    expect(fichiers).toHaveLength(3)
  })
})

describe('securite journal', () => {
  it('aucun secret n apparaît dans les fichiers', () => {
    ecrireEntree('erreur', 'Connexion echouee')
    ecrireEntree('info', 'Base ouverte')
    ecrireEntree('avertissement', 'Espace faible')

    const fichiers = readdirSync(dossierTest).filter(f => f.endsWith('.log'))
    for (const f of fichiers) {
      const contenu = readFileSync(join(dossierTest, f), 'utf8').toLowerCase()
      expect(contenu).not.toContain('mot de passe')
      expect(contenu).not.toContain('dek')
      expect(contenu).not.toContain('phrase')
      expect(contenu).not.toContain('secret')
      expect(contenu).not.toContain('token')
    }
  })
})
