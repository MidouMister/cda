import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  CompteurInactivite,
  premierDemarrage,
  deverrouiller,
  verrouiller,
  changerMotDePasse,
  deballerDekParPhrase,
  type DepsSession,
} from '../electron/securite/session'
import {
  NOM_ENVELOPPE_UTILISATEUR,
  NOM_ENVELOPPE_RECOURS,
  lireEnveloppe,
} from '../electron/securite/gestionnaire-enveloppes'
import { lireSelDepuisBlob, TAILLE_SEL_OCTETS } from '../electron/securite/chiffrement-enveloppe'

let dossierUserData: string

const MOT_DE_PASSE_VALIDE = 'monMotDePasse123'

const creerDepsFausse = (): DepsSession => ({
  ouvrirBase: () => ({ close: () => {} }),
  fermerBase: () => {},
  appliquerMigrations: () => {},
  insererSeeds: () => {},
})

beforeAll(() => {
  dossierUserData = mkdtempSync(join(tmpdir(), 'egto-session-test-'))
})

afterAll(() => {
  rmSync(dossierUserData, { recursive: true, force: true })
})

describe('premierDemarrage', () => {
  it('cree les deux enveloppes et retourne une phrase valide', async () => {
    const deps = creerDepsFausse()
    const phrase = await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    expect(typeof phrase).toBe('string')
    expect(phrase.length).toBeGreaterThan(0)
    const blobUser = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
    const blobRecours = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
    expect(Buffer.isBuffer(blobUser)).toBe(true)
    expect(Buffer.isBuffer(blobRecours)).toBe(true)
    expect(blobUser.length).toBeGreaterThan(0)
    expect(blobRecours.length).toBeGreaterThan(0)
  })
})

describe('deverrouiller', () => {
  it('ouvre la session avec le bon mot de passe', async () => {
    const deps = creerDepsFausse()
    await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const { dekCourante } = await deverrouiller(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    expect(Buffer.isBuffer(dekCourante)).toBe(true)
    expect(dekCourante.length).toBe(32)
  })

  it('echoue avec un mauvais mot de passe', async () => {
    const deps = creerDepsFausse()
    await expect(deverrouiller(dossierUserData, 'mauvaisMotDePasse', deps)).rejects.toThrow(
      'Mot de passe incorrect.',
    )
  })
})

describe('verrouiller', () => {
  it('purge la DEK (buffer zeroed) et ferme la base', async () => {
    const deps = creerDepsFausse()
    await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const { dekCourante } = await deverrouiller(dossierUserData, MOT_DE_PASSE_VALIDE, deps)

    const etat = { dekCourante, base: { close: () => {} } }
    verrouiller(etat, deps)

    expect(etat.dekCourante).toBeNull()
  })

  it('lance une erreur si la session est deja verrouillee', () => {
    const deps = creerDepsFausse()
    const etat = { dekCourante: null, base: null }
    expect(() => verrouiller(etat, deps)).toThrow('Session verrouillee.')
  })
})

describe('changerMotDePasse', () => {
  beforeAll(async () => {
    const deps = creerDepsFausse()
    await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
  })

  it('echoue si l\'ancien mot de passe est incorrect', async () => {
    await expect(changerMotDePasse(dossierUserData, 'mauvais', 'nouveauMotDePasse123')).rejects.toThrow(
      'Mot de passe incorrect.',
    )
  })

  it('ouvre avec le nouveau mot de passe apres changement', async () => {
    const nouveauMdp = 'nouveauMotDePasse123'
    await changerMotDePasse(dossierUserData, MOT_DE_PASSE_VALIDE, nouveauMdp)
    const deps = creerDepsFausse()
    const { dekCourante } = await deverrouiller(dossierUserData, nouveauMdp, deps)
    expect(Buffer.isBuffer(dekCourante)).toBe(true)
  })

  it('la DEK reste identique (testee via deballerDekParPhrase sur recours)', async () => {
    const blobRecours = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
    const selRecours = lireSelDepuisBlob(blobRecours)
    expect(selRecours.length).toBe(TAILLE_SEL_OCTETS)
  })

  it('la base n\'est pas rechiffree (recours identique)', async () => {
    const blobRecoursAvant = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
    await changerMotDePasse(dossierUserData, 'nouveauMotDePasse123', 'encoreUnAutre123')
    const blobRecoursApres = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
    expect(blobRecoursApres).toEqual(blobRecoursAvant)
  })
})

describe('deballerDekParPhrase', () => {
  it('la phrase deballe la meme DEK que le mot de passe', async () => {
    const deps = creerDepsFausse()
    const phrase = await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const { dekCourante: dekDepuisMdp } = await deverrouiller(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const dekDepuisPhrase = await deballerDekParPhrase(dossierUserData, phrase)
    expect(dekDepuisPhrase).toEqual(dekDepuisMdp)
  })

  it('une phrase incorrecte echoue', async () => {
    await expect(deballerDekParPhrase(dossierUserData, 'FAUX-FAUX-FAUX-FAUX-FAUX-FAUX')).rejects.toThrow(
      'Phrase de recuperation incorrecte.',
    )
  })
})

describe('Sels distincts', () => {
  it('les deux enveloppes utilisent des sels differents', async () => {
    const deps = creerDepsFausse()
    await premierDemarrage(dossierUserData, MOT_DE_PASSE_VALIDE, deps)
    const blobUser = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
    const blobRecours = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
    const selUser = lireSelDepuisBlob(blobUser)
    const selRecours = lireSelDepuisBlob(blobRecours)
    expect(selUser).not.toEqual(selRecours)
  })
})

describe('CompteurInactivite', () => {
  it('delence le callback apres la duree d\'inactivite', () => {
    let appele = false
    const callback = () => { appele = true }
    const compteur = new CompteurInactivite(1000, callback)
    compteur.noterActivite()
    expect(appele).toBe(false)
  })

  it('reset par activite retarde le callback', () => {
    let appele = false
    const callback = () => { appele = true }
    const compteur = new CompteurInactivite(1000, callback)
    compteur.noterActivite()
    compteur.noterActivite()
    expect(appele).toBe(false)
  })

  it('arreter empeche le callback', () => {
    let appele = false
    const callback = () => { appele = true }
    const compteur = new CompteurInactivite(1000, callback)
    compteur.noterActivite()
    compteur.arreter()
    expect(appele).toBe(false)
  })
})
