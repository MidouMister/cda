import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { executerReset } from '../electron/securite/egto-admin-reset'
import { premierDemarrage, deverrouiller, deballerDekParPhrase, type DepsSession } from '../electron/securite/session'
import { NOM_ENVELOPPE_UTILISATEUR, NOM_ENVELOPPE_RECOURS, lireEnveloppe } from '../electron/securite/gestionnaire-enveloppes'

let dossierUserData: string

const MOT_DE_PASSE_VALIDE = 'monMotDePasse123'
const MOT_DE_PASSE_NOUVEAU = 'nouveauMotDePasse456'

const creerDepsFausse = (): DepsSession => ({
  ouvrirBase: () => ({ close: () => {} }),
  fermerBase: () => {},
  appliquerMigrations: () => {},
  insererSeeds: () => {},
})

beforeAll(() => {
  dossierUserData = mkdtempSync(join(tmpdir(), 'egto-admin-reset-test-'))
})

afterAll(() => {
  rmSync(dossierUserData, { recursive: true, force: true })
})

describe('executerReset', () => {
  it('avec phrase correcte : ancien mdp echoue, nouveau fonctionne, recours inchange, DEK identique', async () => {
    const deps = creerDepsFausse()
    const phrase = await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const { dekCourante: dekAvant } = await deverrouiller(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const blobRecoursAvant = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)

    const resultat = await executerReset(dossierUserData, phrase, MOT_DE_PASSE_NOUVEAU)
    expect(resultat).toEqual({ succes: true })

    await expect(deverrouiller(dossierUserData, MOT_DE_PASSE_VALIDE, deps)).rejects.toThrow(
      'Mot de passe incorrect.',
    )

    const { dekCourante: dekApres } = await deverrouiller(dossierUserData, MOT_DE_PASSE_NOUVEAU, deps)
    expect(dekApres).toEqual(dekAvant)

    const dekDepuisRecours = await deballerDekParPhrase(dossierUserData, phrase)
    expect(dekDepuisRecours).toEqual(dekAvant)

    const blobRecoursApres = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
    expect(blobRecoursApres).toEqual(blobRecoursAvant)
  })

  it('phrase fausse : erreur, aucune ecriture', async () => {
    const deps = creerDepsFausse()
    await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const blobUserAvant = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)

    const resultat = await executerReset(dossierUserData, 'FAUX-FAUX-FAUX-FAUX-FAUX-FAUX', MOT_DE_PASSE_NOUVEAU)
    expect(resultat.succes).toBe(false)

    const blobUserApres = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
    expect(blobUserApres).toEqual(blobUserAvant)
  })

  it('mot de passe trop court : erreur, aucune ecriture', async () => {
    const deps = creerDepsFausse()
    const phrase = await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const blobUserAvant = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)

    const resultat = await executerReset(dossierUserData, phrase, 'court')
    expect(resultat.succes).toBe(false)

    const blobUserApres = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
    expect(blobUserApres).toEqual(blobUserAvant)
  })
})
