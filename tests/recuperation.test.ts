import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { executerExportSecours } from '../electron/securite/recuperation'
import { premierDemarrage, type DepsSession } from '../electron/securite/session'
import { DOSSIER_SAUVEGARDES_DEFAUT, NOM_FICHIER_BASE } from '../electron/sauvegarde'

const MOT_DE_PASSE_VALIDE = 'monMotDePasse123'

let dossierUserData: string

const creerDepsFausse = (): DepsSession => ({
  ouvrirBase: () => ({ close: () => {} }),
  fermerBase: () => {},
  appliquerMigrations: () => {},
  insererSeeds: () => {},
})

const preparerEnvironnement = async (): Promise<string> => {
  const phrase = await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, creerDepsFausse())
  writeFileSync(join(dossierUserData, NOM_FICHIER_BASE), Buffer.from('donnees de test'))
  return phrase
}

beforeAll(() => {
  dossierUserData = mkdtempSync(join(tmpdir(), 'egto-recuperation-test-'))
})

afterAll(() => {
  rmSync(dossierUserData, { recursive: true, force: true })
})

describe('executerExportSecours', () => {
  it('phrase correcte : sauvegarde manuelle creee, archive chiffree dans sauvegardes/', async () => {
    const phrase = await preparerEnvironnement()

    const resultat = await executerExportSecours(dossierUserData, phrase)
    expect(resultat.succes).toBe(true)
    if (!resultat.succes) return

    expect(resultat.chemin.startsWith(join(dossierUserData, DOSSIER_SAUVEGARDES_DEFAUT))).toBe(true)
    expect(existsSync(resultat.chemin)).toBe(true)
    const nom = resultat.chemin.split(/[\\/]/).pop()
    expect(nom).toMatch(/^egto-manuelle-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/)
  })

  it('porte un espace autour : phrase trimmee', async () => {
    const phrase = await preparerEnvironnement()
    const resultat = await executerExportSecours(dossierUserData, `  ${phrase}  `)
    expect(resultat.succes).toBe(true)
  })

  it('phrase fausse : erreur, aucune archive creee', async () => {
    await preparerEnvironnement()
    const dossierSauvegardes = join(dossierUserData, DOSSIER_SAUVEGARDES_DEFAUT)
    if (existsSync(dossierSauvegardes)) {
      rmSync(dossierSauvegardes, { recursive: true, force: true })
    }

    const resultat = await executerExportSecours(dossierUserData, 'FAUX-FAUX-FAUX-FAUX-FAUX-FAUX')
    expect(resultat.succes).toBe(false)
    if (!resultat.succes) {
      expect(resultat.erreur).toMatch(/incorrecte/)
    }
    expect(existsSync(dossierSauvegardes)).toBe(false)
  })

  it('phrase vide ou non fournie : erreur', async () => {
    await preparerEnvironnement()
    const resultatVide = await executerExportSecours(dossierUserData, '')
    expect(resultatVide.succes).toBe(false)
    if (!resultatVide.succes) {
      expect(resultatVide.erreur).toMatch(/requise/)
    }
    const resultatAbsente = await executerExportSecours(dossierUserData, '   ')
    expect(resultatAbsente.succes).toBe(false)
  })
})