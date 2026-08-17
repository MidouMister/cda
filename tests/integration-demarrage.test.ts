import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  premierDemarrage,
  deverrouiller,
  verrouiller,
  type DepsSession,
} from '../electron/securite/session'
import {
  ouvrirBase,
  obtenirBase,
  fermerBase,
  baseEstOuverte,
  type Base,
} from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds } from '../electron/db/seeds'
import {
  NOM_ENVELOPPE_UTILISATEUR,
  lireEnveloppe,
} from '../electron/securite/gestionnaire-enveloppes'

const CHEMIN_ESSAI = join(tmpdir(), `egto-integration-demarrage-${randomUUID()}.db`)
const MOT_DE_PASSE = 'monMotDePasse123'

let dossierUserData: string

const depsReelles: DepsSession = {
  ouvrirBase: (chemin, cle) => ouvrirBase(chemin, cle),
  fermerBase: () => fermerBase(),
  appliquerMigrations: (base) => {
    appliquerMigrations(base as Base)
  },
  insererSeeds: (base) => {
    insererSeeds(base as Base)
  },
}

afterAll(() => {
  if (baseEstOuverte()) {
    fermerBase()
  }
  if (dossierUserData) {
    rmSync(dossierUserData, { recursive: true, force: true })
  }
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${CHEMIN_ESSAI}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
})

describe('Intégration démarrage — cycle de session complet', () => {
  it("la base n'est pas ouverte avant un déverrouillage", () => {
    expect(baseEstOuverte()).toBe(false)
    expect(() => obtenirBase()).toThrow()
  })

  it("premierDemarrage crée les enveloppes et déverrouille ouvre la base", async () => {
    dossierUserData = mkdtempSync(join(tmpdir(), 'egto-integration-demarrage-'))

    const phrase = await premierDemarrage(dossierUserData, MOT_DE_PASSE, depsReelles)
    expect(typeof phrase).toBe('string')
    expect(phrase.length).toBeGreaterThan(0)

    expect(baseEstOuverte()).toBe(false)

    await deverrouiller(dossierUserData, MOT_DE_PASSE, depsReelles)
    expect(baseEstOuverte()).toBe(true)
    expect(() => obtenirBase()).not.toThrow()

    const version = obtenirBase().pragma('user_version', { simple: true })
    expect(typeof version).toBe('number')
  })

  it('les dépôts sont accessibles après déverrouillage', () => {
    const familles = obtenirBase()
      .prepare('SELECT COUNT(*) AS n FROM familles')
      .get() as { n: number }
    expect(familles.n).toBe(4)

    const version = obtenirBase().pragma('user_version', { simple: true })
    expect(version).toBeGreaterThan(0)

    const parametres = obtenirBase()
      .prepare('SELECT COUNT(*) AS n FROM parametres')
      .get() as { n: number }
    expect(parametres.n).toBeGreaterThan(0)
  })

  it('verrouillage ferme la base et bloque les dépôts', () => {
    const etat = {
      dekCourante: Buffer.alloc(32, 0x42),
      base: obtenirBase(),
    }
    verrouiller(etat, depsReelles)

    expect(baseEstOuverte()).toBe(false)
    expect(() => obtenirBase()).toThrow()
    expect(etat.dekCourante).toBeNull()
  })

  it('déverrouillage rouvre la base fermée', async () => {
    const { dekCourante } = await deverrouiller(dossierUserData, MOT_DE_PASSE, depsReelles)
    expect(baseEstOuverte()).toBe(true)
    expect(Buffer.isBuffer(dekCourante)).toBe(true)

    const familles = obtenirBase()
      .prepare('SELECT COUNT(*) AS n FROM familles')
      .get() as { n: number }
    expect(familles.n).toBe(4)
  })

  it('la phase complète cycle sans erreur : verrouiller → déverrouiller → verrouiller', async () => {
    for (let i = 0; i < 3; i++) {
      const etat = { dekCourante: Buffer.alloc(32, 0x42), base: obtenirBase() }
      verrouiller(etat, depsReelles)
      expect(baseEstOuverte()).toBe(false)

      const { dekCourante } = await deverrouiller(dossierUserData, MOT_DE_PASSE, depsReelles)
      expect(baseEstOuverte()).toBe(true)
      etat.dekCourante = Buffer.from(dekCourante)
    }
    const etatFinal = { dekCourante: Buffer.alloc(32, 0x42), base: obtenirBase() }
    verrouiller(etatFinal, depsReelles)
    expect(baseEstOuverte()).toBe(false)
  })

  it('le verrouillage purge la DEK (buffer zeroed)', async () => {
    const { dekCourante } = await deverrouiller(dossierUserData, MOT_DE_PASSE, depsReelles)
    expect(Buffer.isBuffer(dekCourante)).toBe(true)
    expect(dekCourante.length).toBe(32)
    expect(dekCourante.some((octet) => octet !== 0)).toBe(true)

    const etat = { dekCourante, base: obtenirBase() }
    verrouiller(etat, depsReelles)
    expect(etat.dekCourante).toBeNull()
  })

  it('premierDemarrage avec mdp trop court est rejeté', async () => {
    await expect(premierDemarrage(dossierUserData, 'court', depsReelles)).rejects.toThrow(
      /au moins 8/,
    )

    const blobUser = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
    expect(Buffer.isBuffer(blobUser)).toBe(true)
  })

  it('deverrouiller avec mauvais mot de passe est rejeté sans altérer la base', async () => {
    const { dekCourante } = await deverrouiller(dossierUserData, MOT_DE_PASSE, depsReelles)
    const etat = { dekCourante, base: obtenirBase() }
    verrouiller(etat, depsReelles)
    expect(baseEstOuverte()).toBe(false)

    await expect(
      deverrouiller(dossierUserData, 'mauvaisMotDePasse', depsReelles),
    ).rejects.toThrow(/Mot de passe incorrect/)

    expect(baseEstOuverte()).toBe(false)

    const result = await deverrouiller(dossierUserData, MOT_DE_PASSE, depsReelles)
    expect(baseEstOuverte()).toBe(true)
    expect(Buffer.isBuffer(result.dekCourante)).toBe(true)
  })
})
