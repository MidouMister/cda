import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  MODE_FICHIER_ENVELOPPE,
  NOM_DOSSIER_ENVELOPPES,
  NOM_ENVELOPPE_RECOURS,
  NOM_ENVELOPPE_UTILISATEUR,
  cheminDossierEnveloppes,
  ecrireEnveloppe,
  enveloppesExistent,
  initialiserDossierEnveloppes,
  lireEnveloppe,
} from '../electron/securite/gestionnaire-enveloppes'

let dossierUserData: string
let dossierEnveloppes: string

const blobTest = (octet: number): Buffer => Buffer.from([octet, 0x01, 0x02, 0x03, 0x04, octet])

beforeAll(() => {
  dossierUserData = mkdtempSync(join(tmpdir(), 'egto-enveloppes-test-'))
  dossierEnveloppes = cheminDossierEnveloppes(dossierUserData)
})

afterAll(() => {
  rmSync(dossierUserData, { recursive: true, force: true })
})

describe('Dossier des enveloppes', () => {
  it('cheminDossierEnveloppes place le dossier sous userData', () => {
    expect(dossierEnveloppes).toBe(join(dossierUserData, NOM_DOSSIER_ENVELOPPES))
  })

  it('initialiserDossierEnveloppes crée le dossier (récursif)', () => {
    const dossier = initialiserDossierEnveloppes(dossierUserData)
    expect(existsSync(dossier)).toBe(true)
    expect(dossier).toBe(dossierEnveloppes)
  })
})

describe('Écriture / lecture des enveloppes', () => {
  it('ecrireEnveloppe puis lireEnveloppe restituent un contenu identique', () => {
    const blob = blobTest(0xaa)
    ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, blob)
    expect(lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)).toEqual(blob)
  })

  it('écriture atomique : aucun fichier temporaire résiduel après succès', () => {
    ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, blobTest(0xbb))
    ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS, blobTest(0xcc))
    const contenus = readdirSync(dossierEnveloppes).sort()
    expect(contenus).toEqual([NOM_ENVELOPPE_RECOURS, NOM_ENVELOPPE_UTILISATEUR].sort())
  })

  it('pose le mode 0o600 sur les fichiers créés (vérifié hors Windows)', () => {
    if (process.platform === 'win32') {
      // Limite documentée : sous Windows le mode POSIX n'est pas appliqué
      // (la sécurité relève des ACL NTFS) — seul le contenu est testé ici.
      return
    }
    const chemin = join(dossierEnveloppes, NOM_ENVELOPPE_UTILISATEUR)
    expect(statSync(chemin).mode & 0o777).toBe(MODE_FICHIER_ENVELOPPE)
  })

  it('lireEnveloppe lève une erreur explicite si le fichier manque', () => {
    expect(() => lireEnveloppe(dossierUserData, 'absente.bin')).toThrow(
      'Enveloppe « absente.bin » introuvable',
    )
  })

  it('refuse un nom d’enveloppe hors périmètre (traversée de chemin)', () => {
    expect(() => ecrireEnveloppe(dossierUserData, '..\\hors-dossier.bin', blobTest(0xdd))).toThrow()
    expect(() => lireEnveloppe(dossierUserData, '../hors-dossier.bin')).toThrow()
    expect(() => ecrireEnveloppe(dossierUserData, 'autre', blobTest(0xee))).toThrow()
    expect(() => ecrireEnveloppe(dossierUserData, 'AUTRE.bin', blobTest(0xee))).toThrow()
  })

  it('refuse un blob vide', () => {
    expect(() => ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, Buffer.alloc(0))).toThrow()
  })
})

describe('enveloppesExistent', () => {
  it('renvoie vrai quand les deux enveloppes sont présentes et non vides', () => {
    ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, blobTest(0xbb))
    ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS, blobTest(0xcc))
    expect(enveloppesExistent(dossierUserData)).toBe(true)
  })

  it('renvoie faux si une seule enveloppe est présente', () => {
    rmSync(join(dossierEnveloppes, NOM_ENVELOPPE_RECOURS), { force: true })
    expect(enveloppesExistent(dossierUserData)).toBe(false)
  })

  it('renvoie faux si une enveloppe est vide', () => {
    writeFileSync(join(dossierEnveloppes, NOM_ENVELOPPE_RECOURS), '')
    expect(enveloppesExistent(dossierUserData)).toBe(false)
    rmSync(join(dossierEnveloppes, NOM_ENVELOPPE_RECOURS), { force: true })
  })

  it('renvoie faux si le dossier n’existe pas', () => {
    const dossierVierge = join(dossierUserData, 'vierge')
    expect(enveloppesExistent(dossierVierge)).toBe(false)
  })
})
