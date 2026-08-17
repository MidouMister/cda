import { createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { argon2id, hash } from 'argon2'

export const TAILLE_DEK_OCTETS = 32
export const TAILLE_SEL_OCTETS = 16
export const TAILLE_IV_OCTETS = 12
export const TAILLE_TAG_OCTETS = 16

export const MAGIC_ENVELOPPE = 'EGTOENV'
export const VERSION_ENVELOPPE = 1
export const TAILLE_VERSION_OCTETS = 4
export const OCTETS_AVANT_DONNEES =
  MAGIC_ENVELOPPE.length + TAILLE_VERSION_OCTETS + TAILLE_SEL_OCTETS + TAILLE_IV_OCTETS + TAILLE_TAG_OCTETS
export const TAILLE_BLOB_DEK_OCTETS = OCTETS_AVANT_DONNEES + TAILLE_DEK_OCTETS

// Un seul message pour toutes les erreurs de dechiffrement : il ne distingue
// pas « mauvais secret » de « blob corrompu » (anti-oracle) et ne contient
// jamais le secret saisi.
export const MESSAGE_ENVELOPPE_INVALIDE = 'Enveloppe invalide ou secret incorrect.'

// Parametres OWASP imposes pour argon2id (KDF, pas un digest de verification).
// Ils sont fixes en dur et non surchargables via l'API publique.
export const PARAMETRES_ARGON2ID = {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
} as const

export type ParametresArgon2id = typeof PARAMETRES_ARGON2ID

// Seuil plancher de detection d'un affaiblissement des parametres (mesure :
// ≈ 70-80 ms sur machine de dev, marge 2,4x).
export const SEUIL_MIN_DUREE_DERIVATION_MS = 30

// Alphabet sans ambiguïte : exclut 0/O, 1/I/l et L — caracteres indistinguables
// sur un document imprime. 31 caracteres → 24 tires ⇒ ≈ 2^119 combinaisons.
export const ALPHABET_PHRASE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const TAILLE_GROUPE_PHRASE = 4
export const NOMBRE_GROUPES_PHRASE = 6
export const SEPARATEUR_PHRASE = '-'

const ensembleAlphabet = new Set(ALPHABET_PHRASE)

export const genererDek = (): Buffer => randomBytes(TAILLE_DEK_OCTETS)

export const deriverCle = async (secret: string, sel: Buffer): Promise<Buffer> => {
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new TypeError('deriverCle : le secret doit etre une chaine non vide.')
  }
  if (!Buffer.isBuffer(sel) || sel.length !== TAILLE_SEL_OCTETS) {
    throw new TypeError(`deriverCle : le sel doit etre un Buffer de ${TAILLE_SEL_OCTETS} octets.`)
  }
  return hash(secret, { ...PARAMETRES_ARGON2ID, salt: sel, raw: true })
}

// Format de blob versionne : magic ASCII « EGTOENV » (7) + version u32 big-endian
// (4) + sel KDF (16) + IV GCM (12) + tag GCM (16) + donnees chiffrees. 87 octets pour une DEK.
export const envelopperDek = (dek: Buffer, cle: Buffer, sel: Buffer): Buffer => {
  if (!Buffer.isBuffer(dek) || dek.length !== TAILLE_DEK_OCTETS) {
    throw new TypeError(`envelopperDek : la DEK doit etre un Buffer de ${TAILLE_DEK_OCTETS} octets.`)
  }
  if (!Buffer.isBuffer(cle) || cle.length !== TAILLE_DEK_OCTETS) {
    throw new TypeError(`envelopperDek : la cle d'enveloppement doit etre un Buffer de ${TAILLE_DEK_OCTETS} octets.`)
  }
  if (!Buffer.isBuffer(sel) || sel.length !== TAILLE_SEL_OCTETS) {
    throw new TypeError(`envelopperDek : le sel doit etre un Buffer de ${TAILLE_SEL_OCTETS} octets.`)
  }
  const iv = randomBytes(TAILLE_IV_OCTETS)
  const chiffreur = createCipheriv('aes-256-gcm', cle, iv)
  const donnees = Buffer.concat([chiffreur.update(dek), chiffreur.final()])
  const tag = chiffreur.getAuthTag()
  const blob = Buffer.alloc(OCTETS_AVANT_DONNEES + donnees.length)
  let position = 0
  blob.write(MAGIC_ENVELOPPE, position, 'ascii')
  position += MAGIC_ENVELOPPE.length
  blob.writeUInt32BE(VERSION_ENVELOPPE, position)
  position += TAILLE_VERSION_OCTETS
  sel.copy(blob, position)
  position += TAILLE_SEL_OCTETS
  iv.copy(blob, position)
  position += iv.length
  tag.copy(blob, position)
  position += tag.length
  donnees.copy(blob, position)
  return blob
}

export const lireSelDepuisBlob = (blob: Buffer): Buffer => {
  if (!Buffer.isBuffer(blob) || blob.length < OCTETS_AVANT_DONNEES) {
    throw new Error(MESSAGE_ENVELOPPE_INVALIDE)
  }
  if (blob.subarray(0, MAGIC_ENVELOPPE.length).toString('ascii') !== MAGIC_ENVELOPPE) {
    throw new Error(MESSAGE_ENVELOPPE_INVALIDE)
  }
  const version = blob.readUInt32BE(MAGIC_ENVELOPPE.length)
  if (version !== VERSION_ENVELOPPE) {
    throw new Error(MESSAGE_ENVELOPPE_INVALIDE)
  }
  const positionSel = MAGIC_ENVELOPPE.length + TAILLE_VERSION_OCTETS
  return Buffer.from(blob.subarray(positionSel, positionSel + TAILLE_SEL_OCTETS))
}

// Dechiffrement GCM : toute erreur (mauvaise cle, tag altere, donnees corrompues)
// est ramenee au message uniforme, qui ne contient jamais le secret saisi.
const dechiffrerDonnees = (cle: Buffer, iv: Buffer, tag: Buffer, donnees: Buffer): Buffer => {
  try {
    const dechiffreur = createDecipheriv('aes-256-gcm', cle, iv)
    dechiffreur.setAuthTag(tag)
    return Buffer.concat([dechiffreur.update(donnees), dechiffreur.final()])
  } catch {
    throw new Error(MESSAGE_ENVELOPPE_INVALIDE)
  }
}

export const deballerDek = (blob: Buffer, cle: Buffer): Buffer => {
  if (!Buffer.isBuffer(cle) || cle.length !== TAILLE_DEK_OCTETS) {
    throw new TypeError(`deballerDek : la cle d'enveloppement doit etre un Buffer de ${TAILLE_DEK_OCTETS} octets.`)
  }
  const enveloppeInvalide = (): never => {
    throw new Error(MESSAGE_ENVELOPPE_INVALIDE)
  }
  if (!Buffer.isBuffer(blob) || blob.length < OCTETS_AVANT_DONNEES) {
    enveloppeInvalide()
  }
  if (blob.subarray(0, MAGIC_ENVELOPPE.length).toString('ascii') !== MAGIC_ENVELOPPE) {
    enveloppeInvalide()
  }
  const version = blob.readUInt32BE(MAGIC_ENVELOPPE.length)
  if (version !== VERSION_ENVELOPPE) {
    enveloppeInvalide()
  }
  const positionIv = MAGIC_ENVELOPPE.length + TAILLE_VERSION_OCTETS + TAILLE_SEL_OCTETS
  const iv = blob.subarray(positionIv, positionIv + TAILLE_IV_OCTETS)
  const positionTag = positionIv + TAILLE_IV_OCTETS
  const tag = blob.subarray(positionTag, positionTag + TAILLE_TAG_OCTETS)
  const donnees = blob.subarray(positionTag + TAILLE_TAG_OCTETS)
  const dek = dechiffrerDonnees(cle, iv, tag, donnees)
  if (dek.length !== TAILLE_DEK_OCTETS) {
    enveloppeInvalide()
  }
  return dek
}

export const genererPhraseRecuperation = (): string => {
  const groupes: string[] = []
  for (let groupe = 0; groupe < NOMBRE_GROUPES_PHRASE; groupe++) {
    let contenu = ''
    for (let caractere = 0; caractere < TAILLE_GROUPE_PHRASE; caractere++) {
      contenu += ALPHABET_PHRASE[randomInt(ALPHABET_PHRASE.length)]
    }
    groupes.push(contenu)
  }
  return groupes.join(SEPARATEUR_PHRASE)
}

// Normalisation definie : conversion en majuscules puis suppression des
// separateurs (tirets, espaces, points, soulignes) — seuls les 24 caracteres
// comptent. Coherente avec la generation (6 × 4, majuscules, tirets).
export const validerPhraseRecuperation = (phrase: string): boolean => {
  if (typeof phrase !== 'string') {
    return false
  }
  const normalisee = phrase.trim().toUpperCase().replace(/[-\s._]+/g, '')
  if (normalisee.length !== NOMBRE_GROUPES_PHRASE * TAILLE_GROUPE_PHRASE) {
    return false
  }
  for (const caractere of normalisee) {
    if (!ensembleAlphabet.has(caractere)) {
      return false
    }
  }
  return true
}

export type MesureDerivation = {
  dureeMs: number
  dureeMinMs: number
  dureeMaxMs: number
  iterations: number
  parametres: ParametresArgon2id
}

export const mesurerTempsDerivation = async (
  secret = 'secret-de-mesure-egto',
  iterations = 3,
): Promise<MesureDerivation> => {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10) {
    throw new RangeError('mesurerTempsDerivation : le nombre d\'iterations doit etre un entier entre 1 et 10.')
  }
  const sel = randomBytes(TAILLE_SEL_OCTETS)
  const durees: number[] = []
  for (let i = 0; i < iterations; i++) {
    const debut = performance.now()
    await deriverCle(secret, sel)
    durees.push(performance.now() - debut)
  }
  const dureeMinMs = Math.min(...durees)
  const dureeMaxMs = Math.max(...durees)
  const moyenne = durees.reduce((somme, duree) => somme + duree, 0) / durees.length
  return {
    dureeMs: Math.round(moyenne * 10) / 10,
    dureeMinMs: Math.round(dureeMinMs * 10) / 10,
    dureeMaxMs: Math.round(dureeMaxMs * 10) / 10,
    iterations,
    parametres: PARAMETRES_ARGON2ID,
  }
}
