import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { baseEstOuverte, fermerBase, obtenirBase, ouvrirBase } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import { enregistrerHandlersSauvegarde } from '../electron/ipc/ipc-sauvegarde'
import type { EnregistreurIpc } from '../electron/ipc/enregistrer-ipc'
import type { OrdonnanceurSauvegarde } from '../electron/ordonnanceur-sauvegarde'
import { mettreAJourParametre, lireParametre, SAUVEGARDE_DERNIERE_ERREUR } from '../electron/depots/depot-parametres'
import { CANAUX } from '../contrats'

const CLE_VALIDE = 'clé-test-ipc-sauvegarde'
const CHEMIN_ESSAI = join(tmpdir(), `egto-ipc-sauvegarde-${randomUUID()}.db`)

interface Capture {
  canal: string
  appel: (_evenement: unknown, ...args: unknown[]) => unknown
}

let captures: Capture[] = []
let dossierUserData: string
let destination: string

const creerEnregistreurMock = (): EnregistreurIpc => ({
  handle(canal, appel) {
    captures.push({ canal, appel })
  },
})

const enregistrer = (ordonnanceur?: OrdonnanceurSauvegarde): void => {
  captures = []
  enregistrerHandlersSauvegarde(
    creerEnregistreurMock(),
    () => dossierUserData,
    () => obtenirBase(),
    () => baseEstOuverte(),
    ordonnanceur,
  )
}

const appeler = (canal: string, ...args: unknown[]): unknown => {
  const capture = captures.find((c) => c.canal === canal)
  if (capture === undefined) {
    throw new Error(`Aucun handler enregistré pour le canal « ${canal} ».`)
  }
  return capture.appel(null, ...args)
}

const creerFauxOrdonnanceur = (): OrdonnanceurSauvegarde => ({
  verifierEcheance: vi.fn(async () => ({ executee: false, skippee: true })),
  demarrer: vi.fn(),
  arreter: vi.fn(),
  derniereErreur: vi.fn(() => null),
})

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

beforeAll(() => {
  dossierUserData = mkdtempSync(join(tmpdir(), 'egto-ipc-sauvegarde-dossier-'))
  destination = mkdtempSync(join(tmpdir(), 'egto-ipc-sauvegarde-dest-'))
})

afterAll(() => {
  fermerBase()
  rmSync(dossierUserData, { recursive: true, force: true })
  rmSync(destination, { recursive: true, force: true })
  nettoyerFichiers(CHEMIN_ESSAI)
})

describe('Handlers IPC sauvegarde — verrouillage et enregistrement', () => {
  beforeAll(() => {
    enregistrer()
  })

  it('enregistre les 8 canaux sauvegarde, sans canal SQL générique', () => {
    const noms = captures.map((c) => c.canal).sort()
    expect(noms).toEqual(
      [
        CANAUX.sauvegarde.archiver,
        CANAUX.sauvegarde.restaurer,
        CANAUX.sauvegarde.lister,
        CANAUX.sauvegarde.appliquerRetention,
        CANAUX.sauvegarde.nommer,
        CANAUX.sauvegarde.configurer,
        CANAUX.sauvegarde.etat,
        CANAUX.sauvegarde.choisirDestination,
      ].sort(),
    )
    expect(noms).not.toContainEqual(expect.stringMatching(/sql|exec|requete|raw/i))
  })

  it('session verrouillée → tous les canaux protégés rejettent', async () => {
    expect(baseEstOuverte()).toBe(false)
    await expect(appeler(CANAUX.sauvegarde.configurer, { activee: true, horaireQuotidienne: '03:00', destination }))
      .rejects.toThrow(/Session verrouillée/)
    await expect(appeler(CANAUX.sauvegarde.etat)).rejects.toThrow(/Session verrouillée/)
    await expect(appeler(CANAUX.sauvegarde.choisirDestination)).rejects.toThrow(/Session verrouillée/)
  })

  it('restaurer sans archive valide → échec propre (poste vierge)', async () => {
    const dest = mkdtempSync(join(tmpdir(), 'egto-ipc-restaure-dest-'))
    try {
      const resultat = (await appeler(CANAUX.sauvegarde.restaurer, {
        archive: join(dossierUserData, 'inexistant.zip'),
        dossierDestination: dest,
        phraseRecuperation: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF',
      })) as { succes: boolean; erreur?: string }
      expect(resultat.succes).toBe(false)
      expect(resultat.erreur).toMatch(/introuvable/)
    } finally {
      rmSync(dest, { recursive: true, force: true })
    }
  })
})

describe('Handlers IPC sauvegarde — base réelle ouverte', () => {
  beforeAll(() => {
    mkdirSync(dossierUserData, { recursive: true })
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
    enregistrer()
  })

  it('etat → valeurs par défaut issues des seeds', async () => {
    const etat = (await appeler(CANAUX.sauvegarde.etat)) as {
      activee: boolean
      horaireQuotidienne: string
      destination: string
      derniereExecution: string | null
      derniereErreur: string | null
    }
    expect(etat).toEqual({
      activee: true,
      horaireQuotidienne: '03:00',
      destination: '',
      derniereExecution: null,
      derniereErreur: null,
    })
  })

  it('nommer reste opérationnel', async () => {
    const nom = (await appeler(CANAUX.sauvegarde.nommer, 'quotidienne')) as string
    expect(nom).toMatch(/^egto-quotidienne-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/)
  })

  it('restaurer avec base ouverte → rejette', async () => {
    await expect(
      appeler(CANAUX.sauvegarde.restaurer, {
        archive: join(dossierUserData, 'archive.zip'),
        dossierDestination: destination,
        phraseRecuperation: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF',
      }),
    ).rejects.toThrow(/restauration est interdite/)
  })

  it('configurer avec un horaire invalide → rejet', async () => {
    await expect(
      appeler(CANAUX.sauvegarde.configurer, { activee: true, horaireQuotidienne: '25:00', destination }),
    ).rejects.toThrow(/Horaire invalide/)
  })

  it('configurer avec une destination inexistante → rejet', async () => {
    await expect(
      appeler(CANAUX.sauvegarde.configurer, {
        activee: true,
        horaireQuotidienne: '03:00',
        destination: join(tmpdir(), `egto-ipc-absente-${randomUUID()}`),
      }),
    ).rejects.toThrow(/dossier existant/)
  })

  it('configurer valide → persiste et met à jour etat', async () => {
    await expect(
      appeler(CANAUX.sauvegarde.configurer, {
        activee: false,
        horaireQuotidienne: '07:15',
        destination,
      }),
    ).resolves.toBeUndefined()

    const etat = (await appeler(CANAUX.sauvegarde.etat)) as {
      activee: boolean
      horaireQuotidienne: string
      destination: string
      derniereErreur: string | null
    }
    expect(etat.activee).toBe(false)
    expect(etat.horaireQuotidienne).toBe('07:15')
    expect(etat.destination).toBe(destination)
    expect(etat.derniereErreur).toBeNull()
    expect(lireParametre(obtenirBase(), 'sauvegarde.activee')).toBe('0')
  })

  it('etat remonte une dernière erreur persistée', async () => {
    mettreAJourParametre(obtenirBase(), SAUVEGARDE_DERNIERE_ERREUR, 'Erreur volontaire de service')
    const etat = (await appeler(CANAUX.sauvegarde.etat)) as { derniereErreur: string | null }
    expect(etat.derniereErreur).toBe('Erreur volontaire de service')
  })

  it('configurer déclenche une vérification d’échéance de l’ordonnanceur', async () => {
    const faux = creerFauxOrdonnanceur()
    enregistrer(faux)
    await appeler(CANAUX.sauvegarde.configurer, { activee: true, horaireQuotidienne: '03:00', destination })
    expect(faux.verifierEcheance).toHaveBeenCalledTimes(1)
  })

  it('etat remonte la dernière erreur mémorisée par l’ordonnanceur', async () => {
    const spyErreur = vi.fn((): string | null => 'Échec simulé du service')
    const faux: OrdonnanceurSauvegarde = { ...creerFauxOrdonnanceur(), derniereErreur: spyErreur }
    enregistrer(faux)
    const etat = (await appeler(CANAUX.sauvegarde.etat)) as { derniereErreur: string | null }
    expect(etat.derniereErreur).toBe('Échec simulé du service')
    expect(spyErreur).toHaveBeenCalledTimes(1)
  })
})