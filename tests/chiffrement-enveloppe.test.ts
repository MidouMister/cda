import { beforeAll, describe, expect, it } from 'vitest'
import {
  ALPHABET_PHRASE,
  MAGIC_ENVELOPPE,
  MESSAGE_ENVELOPPE_INVALIDE,
  NOMBRE_GROUPES_PHRASE,
  OCTETS_AVANT_DONNEES,
  PARAMETRES_ARGON2ID,
  SEUIL_MIN_DUREE_DERIVATION_MS,
  SEPARATEUR_PHRASE,
  TAILLE_BLOB_DEK_OCTETS,
  TAILLE_DEK_OCTETS,
  TAILLE_GROUPE_PHRASE,
  TAILLE_IV_OCTETS,
  TAILLE_SEL_OCTETS,
  TAILLE_TAG_OCTETS,
  TAILLE_VERSION_OCTETS,
  VERSION_ENVELOPPE,
  deballerDek,
  deriverCle,
  envelopperDek,
  genererDek,
  genererPhraseRecuperation,
  lireSelDepuisBlob,
  mesurerTempsDerivation,
  validerPhraseRecuperation,
} from '../electron/securite/chiffrement-enveloppe'

const SEL_1 = Buffer.alloc(TAILLE_SEL_OCTETS, 0x11)
const SEL_2 = Buffer.alloc(TAILLE_SEL_OCTETS, 0x22)

describe('genererDek', () => {
  it('renvoie une DEK de 32 octets', () => {
    const dek = genererDek()
    expect(Buffer.isBuffer(dek)).toBe(true)
    expect(dek.length).toBe(TAILLE_DEK_OCTETS)
  })

  it('deux appels produisent des DEK differentes', () => {
    expect(genererDek()).not.toEqual(genererDek())
  })
})

describe('deriverCle (argon2id, parametres OWASP)', () => {
  it('renvoie une cle derivee de 32 octets', async () => {
    const cle = await deriverCle('mot-de-passe-test', SEL_1)
    expect(Buffer.isBuffer(cle)).toBe(true)
    expect(cle.length).toBe(32)
  })

  it('deux sels distincts produisent des cles differentes', async () => {
    const cle1 = await deriverCle('mot-de-passe-test', SEL_1)
    const cle2 = await deriverCle('mot-de-passe-test', SEL_2)
    expect(cle1).not.toEqual(cle2)
  })

  it('meme sel et meme secret produisent la meme cle', async () => {
    const cle1 = await deriverCle('mot-de-passe-test', SEL_1)
    const cle3 = await deriverCle('mot-de-passe-test', SEL_1)
    expect(cle3).toEqual(cle1)
  })

  it('refuse un secret vide et un sel de longueur invalide', async () => {
    await expect(deriverCle('', SEL_1)).rejects.toThrow()
    await expect(deriverCle('mot-de-passe-test', Buffer.alloc(8))).rejects.toThrow()
  })

  it('verrouille les parametres OWASP imposes (non surchargables)', async () => {
    expect(PARAMETRES_ARGON2ID).toEqual({
      type: 2,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
      hashLength: 32,
    })
    const deriveeAvecOptions = deriverCle as unknown as (
      secret: string,
      sel: Buffer,
      options: { memoryCost: number },
    ) => Promise<Buffer>
    const cleReference = await deriverCle('mot-de-passe-test', SEL_1)
    const cleSurchargee = await deriveeAvecOptions('mot-de-passe-test', SEL_1, { memoryCost: 4096 })
    expect(cleSurchargee).toEqual(cleReference)
  })
})

describe('envelopperDek / deballerDek', () => {
  let dek: Buffer
  let cle: Buffer
  let cleDifferente: Buffer
  let blob: Buffer

  beforeAll(async () => {
    dek = genererDek()
    cle = await deriverCle('mot-de-passe-test', SEL_1)
    cleDifferente = await deriverCle('autre-secret-test', SEL_2)
    blob = envelopperDek(dek, cle, SEL_1)
  })

  it('le blob fait 87 octets avec le format versionne attendu', () => {
    expect(blob.length).toBe(TAILLE_BLOB_DEK_OCTETS)
    expect(blob.subarray(0, MAGIC_ENVELOPPE.length).toString('ascii')).toBe(MAGIC_ENVELOPPE)
    expect(blob.readUInt32BE(MAGIC_ENVELOPPE.length)).toBe(VERSION_ENVELOPPE)
    expect(blob).not.toEqual(dek)
  })

  it('le sel est present dans le blob a la position attendue', () => {
    const positionSel = MAGIC_ENVELOPPE.length + TAILLE_VERSION_OCTETS
    const selLu = blob.subarray(positionSel, positionSel + TAILLE_SEL_OCTETS)
    expect(selLu).toEqual(SEL_1)
  })

  it('lireSelDepuisBlob extrait le sel identique', () => {
    const selExtrait = lireSelDepuisBlob(blob)
    expect(selExtrait).toEqual(SEL_1)
  })

  it('lireSelDepuisBlob echoue sur un blob trop court', () => {
    expect(() => lireSelDepuisBlob(Buffer.alloc(OCTETS_AVANT_DONNEES - 1))).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('lireSelDepuisBlob echoue sur un magic invalide', () => {
    const corrompu = Buffer.from(blob)
    corrompu[0] ^= 0xff
    expect(() => lireSelDepuisBlob(corrompu)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('lireSelDepuisBlob echoue sur une version inconnue (999)', () => {
    const corrompu = Buffer.from(blob)
    corrompu.writeUInt32BE(999, MAGIC_ENVELOPPE.length)
    expect(() => lireSelDepuisBlob(corrompu)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('sel extrait puis derivee et deballage restitue la DEK identique', async () => {
    const selExtrait = lireSelDepuisBlob(blob)
    expect(selExtrait).toEqual(SEL_1)
    const cleRederivee = await deriverCle('mot-de-passe-test', selExtrait)
    expect(deballerDek(blob, cleRederivee)).toEqual(dek)
  })

  it('deballer avec la bonne cle restitue la DEK identique', () => {
    expect(deballerDek(blob, cle)).toEqual(dek)
  })

  it('echoue avec une mauvaise cle, message uniforme sans le secret saisi', () => {
    expect(() => deballerDek(blob, cleDifferente)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
    try {
      deballerDek(blob, cleDifferente)
    } catch (erreur) {
      expect((erreur as Error).message).not.toContain('autre-secret-test')
    }
  })

  it('echoue si un octet des donnees chiffrees est altere', () => {
    const corrompu = Buffer.from(blob)
    corrompu[OCTETS_AVANT_DONNEES + 5] ^= 0xff
    expect(() => deballerDek(corrompu, cle)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('echoue si un octet de l\'IV est altere', () => {
    const corrompu = Buffer.from(blob)
    const positionIv = MAGIC_ENVELOPPE.length + TAILLE_VERSION_OCTETS + TAILLE_SEL_OCTETS
    corrompu[positionIv + 3] ^= 0xff
    expect(() => deballerDek(corrompu, cle)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('echoue si un octet du tag est altere', () => {
    const corrompu = Buffer.from(blob)
    const positionTag = MAGIC_ENVELOPPE.length + TAILLE_VERSION_OCTETS + TAILLE_SEL_OCTETS + TAILLE_IV_OCTETS
    corrompu[positionTag + TAILLE_TAG_OCTETS - 1] ^= 0xff
    expect(() => deballerDek(corrompu, cle)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('echoue sur un magic inconnu', () => {
    const corrompu = Buffer.from(blob)
    corrompu[0] ^= 0xff
    expect(() => deballerDek(corrompu, cle)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('echoue sur une version inconnue', () => {
    const corrompu = Buffer.from(blob)
    corrompu.writeUInt32BE(99, MAGIC_ENVELOPPE.length)
    expect(() => deballerDek(corrompu, cle)).toThrow(MESSAGE_ENVELOPPE_INVALIDE)
  })

  it('echoue sur un blob trop court', () => {
    expect(() => deballerDek(Buffer.alloc(OCTETS_AVANT_DONNEES - 1), cle)).toThrow(
      MESSAGE_ENVELOPPE_INVALIDE,
    )
  })

  it('echoue si la cle d\'enveloppement n\'a pas 32 octets', () => {
    expect(() => deballerDek(blob, Buffer.alloc(16))).toThrow()
    expect(() => envelopperDek(dek, Buffer.alloc(16), SEL_1)).toThrow()
  })

  it('echoue si le sel n\'a pas 16 octets', () => {
    expect(() => envelopperDek(dek, cle, Buffer.alloc(8))).toThrow()
  })

  it('deux enveloppes avec des sels distincts sont differentes', async () => {
    const blob1 = envelopperDek(dek, cle, SEL_1)
    const blob2 = envelopperDek(dek, cle, SEL_2)
    expect(blob1).not.toEqual(blob2)
  })
})

describe('Phrase de recuperation', () => {
  it('genere une phrase de 6 groupes de 4 caracteres separes par des tirets', () => {
    for (let i = 0; i < 20; i++) {
      const phrase = genererPhraseRecuperation()
      expect(phrase).toMatch(
        new RegExp(
          `^[${ALPHABET_PHRASE}]{${TAILLE_GROUPE_PHRASE}}(?:\\${SEPARATEUR_PHRASE}[${ALPHABET_PHRASE}]{${TAILLE_GROUPE_PHRASE}}){${NOMBRE_GROUPES_PHRASE - 1}}$`,
        ),
      )
      expect(phrase.split(SEPARATEUR_PHRASE)).toHaveLength(NOMBRE_GROUPES_PHRASE)
    }
  })

  it('l\'alphabet exclut les caracteres ambigus (0/O, 1/I/l, L)', () => {
    for (const ambigu of ['0', '1', 'I', 'O', 'L', 'l', 'o']) {
      expect(ALPHABET_PHRASE).not.toContain(ambigu)
    }
  })

  it('validerPhraseRecuperation accepte la phrase generee', () => {
    expect(validerPhraseRecuperation(genererPhraseRecuperation())).toBe(true)
  })

  it('accepte les variantes normalisees (minuscules, separateurs varies)', () => {
    const phrase = genererPhraseRecuperation()
    expect(validerPhraseRecuperation(phrase.toLowerCase())).toBe(true)
    expect(validerPhraseRecuperation(phrase.replace(/-/g, ' '))).toBe(true)
    expect(validerPhraseRecuperation(phrase.replace(/-/g, '.'))).toBe(true)
    expect(validerPhraseRecuperation(`  ${phrase}  `)).toBe(true)
  })

  it('rejette une phrase tronquee', () => {
    expect(validerPhraseRecuperation(genererPhraseRecuperation().slice(0, -1))).toBe(false)
    expect(validerPhraseRecuperation('ABCD-EFGH')).toBe(false)
  })

  it('rejette une phrase contenant un caractere ambigu', () => {
    expect(validerPhraseRecuperation('0000-BBBB-CCCC-DDDD-EEEE-FFFF')).toBe(false)
    expect(validerPhraseRecuperation('ABCD-EFGH-IJKL-MNOP-QRST-UVWX')).toBe(false)
  })

  it('rejette un caractere hors alphabet et une valeur non chaine', () => {
    expect(validerPhraseRecuperation('AABB-CCDD-EEFF-GGHH-IIJJ-KKLL')).toBe(false)
    expect(validerPhraseRecuperation(null as unknown as string)).toBe(false)
  })
})

describe('Temps de derivation (mesure reelle)', () => {
  it('mesure le temps et verifie que chaque derivation depasse le seuil plancher', async () => {
    const mesure = await mesurerTempsDerivation('secret-mesure-test', 3)
    expect(mesure.iterations).toBe(3)
    expect(mesure.dureeMinMs).toBeGreaterThanOrEqual(SEUIL_MIN_DUREE_DERIVATION_MS)
    expect(mesure.dureeMaxMs).toBeGreaterThanOrEqual(SEUIL_MIN_DUREE_DERIVATION_MS)
    expect(mesure.dureeMs).toBeGreaterThanOrEqual(SEUIL_MIN_DUREE_DERIVATION_MS)
    expect(mesure.parametres).toEqual(PARAMETRES_ARGON2ID)
    console.log(
      `[mesure] derivation argon2id : moyenne ${mesure.dureeMs} ms ` +
        `(min ${mesure.dureeMinMs} ms, max ${mesure.dureeMaxMs} ms, ${mesure.iterations} iterations)`,
    )
  })
})
