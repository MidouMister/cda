import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename, resolve, relative } from 'node:path'
import { createRequire } from 'node:module'
import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'node:crypto'
import { hash as argon2Hash, argon2id } from 'argon2'
import unzipper from 'unzipper'

const require = createRequire(import.meta.url)
const archiver = require('archiver') as {
  create: (type: string, options?: Record<string, unknown>) => {
    pipe: (dest: NodeJS.WritableStream) => void
    file: (path: string, data?: { name: string }) => void
    append: (source: Buffer | string, data?: { name: string }) => void
    finalize: () => void
    on: (event: string, cb: (...args: unknown[]) => void) => void
  }
}

export const MAGIC = 'EGTO'
export const FORMAT_VERSION = 2
export const FORMAT_VERSION_LEGACY = 1
export const SALT_TAILLE = 32
export const IV_TAILLE = 12
export const TAG_TAILLE = 16

export const KDF_ARGON2ID = 1
export const KDF_PBKDF2 = 0

export const PARAMETRES_ARGON2ID = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
} as const

export const RETENTION_QUOTIDIENNE = 30
export const RETENTION_MENSUELLE = 12
export const NOM_FICHIER_BASE = 'egto.db'
export const NOM_DOSSIER_ENVELOPPES = 'enveloppes'
export const NOM_ENVELOPPE_RECOURS = 'recours.bin'
export const MANIFESTE_VERSION = 1
export const DOSSIER_SAUVEGARDES_DEFAUT = 'sauvegardes'

export interface ManifesteSauvegarde {
  version: number
  date: string
  type: 'quotidienne' | 'mensuelle' | 'manuelle'
  nomFichierBase: string
  nomEnveloppeRecours: string
}

export interface ResultatExport {
  succes: boolean
  chemin?: string
  erreur?: string
}

export interface ResultatRestauration {
  succes: boolean
  erreur?: string
}

const TAILLE_ENTETE_V2 = 4 + 2 + 1 + 2 + (4 + 4 + 4 + 2) + SALT_TAILLE + IV_TAILLE + TAG_TAILLE
const TAILLE_ENTETE_V1 = 4 + 2 + SALT_TAILLE + IV_TAILLE + TAG_TAILLE
const PBKDF2_ITERATIONS = 100_000

async function deriverCleArgon2id(motDePasse: string, sel: Buffer): Promise<Buffer> {
  return Buffer.from(await argon2Hash(motDePasse, {
    type: argon2id,
    memoryCost: PARAMETRES_ARGON2ID.memoryCost,
    timeCost: PARAMETRES_ARGON2ID.timeCost,
    parallelism: PARAMETRES_ARGON2ID.parallelism,
    hashLength: PARAMETRES_ARGON2ID.hashLength,
    salt: sel,
    raw: true,
  }))
}

function deriverClePbkdf2(motDePasse: string, sel: Buffer): Buffer {
  return pbkdf2Sync(motDePasse, sel, PBKDF2_ITERATIONS, 32, 'sha512')
}

export async function chiffrer(donnees: Buffer, motDePasse: string): Promise<Buffer> {
  const sel = randomBytes(SALT_TAILLE)
  const cle = await deriverCleArgon2id(motDePasse, sel)
  const iv = randomBytes(IV_TAILLE)
  const cipher = createCipheriv('aes-256-gcm', cle, iv)
  const chiffre = Buffer.concat([cipher.update(donnees), cipher.final()])
  const tag = cipher.getAuthTag()

  const enTete = Buffer.alloc(TAILLE_ENTETE_V2)
  let pos = 0
  enTete.write(MAGIC, pos, 4, 'ascii')
  pos += 4
  enTete.writeUInt16BE(FORMAT_VERSION, pos)
  pos += 2
  enTete.writeUInt8(KDF_ARGON2ID, pos)
  pos += 1
  enTete.writeUInt16BE(14, pos)
  pos += 2
  enTete.writeUInt32BE(PARAMETRES_ARGON2ID.memoryCost, pos)
  pos += 4
  enTete.writeUInt32BE(PARAMETRES_ARGON2ID.timeCost, pos)
  pos += 4
  enTete.writeUInt32BE(PARAMETRES_ARGON2ID.parallelism, pos)
  pos += 4
  enTete.writeUInt16BE(PARAMETRES_ARGON2ID.hashLength, pos)
  pos += 2
  sel.copy(enTete, pos)
  pos += SALT_TAILLE
  iv.copy(enTete, pos)
  pos += IV_TAILLE
  tag.copy(enTete, pos)

  return Buffer.concat([enTete, chiffre])
}

export async function dechiffrer(data: Buffer, motDePasse: string): Promise<Buffer> {
  const magique = data.subarray(0, 4).toString('ascii')
  if (magique !== MAGIC) {
    throw new Error('Format de fichier invalide.')
  }
  const version = data.readUInt16BE(4)

  if (version === FORMAT_VERSION) {
    const kdfAlgo = data.readUInt8(6)
    if (kdfAlgo !== KDF_ARGON2ID) {
      throw new Error(`Algorithme KDF inconnu : ${kdfAlgo}`)
    }
    const paramsLen = data.readUInt16BE(7)
    if (paramsLen !== 14) {
      throw new Error(`Longueur de parametres KDF inattendue : ${paramsLen}`)
    }
    const memoryCost = data.readUInt32BE(9)
    const timeCost = data.readUInt32BE(13)
    const parallelism = data.readUInt32BE(17)
    const hashLength = data.readUInt16BE(21)

    const sel = data.subarray(23, 23 + SALT_TAILLE)
    const iv = data.subarray(23 + SALT_TAILLE, 23 + SALT_TAILLE + IV_TAILLE)
    const tag = data.subarray(23 + SALT_TAILLE + IV_TAILLE, 23 + SALT_TAILLE + IV_TAILLE + TAG_TAILLE)
    const chiffre = data.subarray(23 + SALT_TAILLE + IV_TAILLE + TAG_TAILLE)

    const cle = Buffer.from(await argon2Hash(motDePasse, {
      type: argon2id,
      memoryCost,
      timeCost,
      parallelism,
      hashLength,
      salt: sel,
      raw: true,
    }))

    const decipher = createDecipheriv('aes-256-gcm', cle, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(chiffre), decipher.final()])
  }

  if (version === FORMAT_VERSION_LEGACY) {
    const sel = data.subarray(6, 6 + SALT_TAILLE)
    const iv = data.subarray(6 + SALT_TAILLE, 6 + SALT_TAILLE + IV_TAILLE)
    const tag = data.subarray(6 + SALT_TAILLE + IV_TAILLE, 6 + SALT_TAILLE + IV_TAILLE + TAG_TAILLE)
    const chiffre = data.subarray(TAILLE_ENTETE_V1)
    const cle = deriverClePbkdf2(motDePasse, sel)
    const decipher = createDecipheriv('aes-256-gcm', cle, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(chiffre), decipher.final()])
  }

  throw new Error(`Version de format incompatible : ${version}`)
}

export function nommerSauvegarde(params: {
  typeBackup: 'quotidienne' | 'mensuelle' | 'manuelle'
  date?: Date
}): string {
  const d = params.date ?? new Date()
  const an = d.getFullYear().toString()
  const mois = (d.getMonth() + 1).toString().padStart(2, '0')
  const jour = d.getDate().toString().padStart(2, '0')
  const heures = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')

  if (params.typeBackup === 'mensuelle') {
    return `egto-mensuelle-${an}-${mois}.zip`
  }
  return `egto-${params.typeBackup}-${an}-${mois}-${jour}-${heures}${minutes}.zip`
}

export async function archiverDonnees(params: {
  dossierSource: string
  destination: string
  motDePasse: string
  typeBackup: 'quotidienne' | 'mensuelle' | 'manuelle'
}): Promise<ResultatExport> {
  if (typeof params.motDePasse !== 'string' || params.motDePasse.length < 1) {
    return { succes: false, erreur: 'Le mot de passe d\'archive est obligatoire.' }
  }

  try {
    const cheminBase = join(params.dossierSource, NOM_FICHIER_BASE)
    const cheminRecours = join(params.dossierSource, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS)

    if (!existsSync(cheminBase)) {
      return { succes: false, erreur: 'Fichier de base introuvable.' }
    }
    if (!existsSync(cheminRecours)) {
      return { succes: false, erreur: "Enveloppe de recours introuvable." }
    }

    const dossierDest = params.destination.replace(basename(params.destination), '')
    if (dossierDest && !existsSync(dossierDest)) {
      mkdirSync(dossierDest, { recursive: true })
    }

    const manifeste: ManifesteSauvegarde = {
      version: MANIFESTE_VERSION,
      date: new Date().toISOString(),
      type: params.typeBackup,
      nomFichierBase: NOM_FICHIER_BASE,
      nomEnveloppeRecours: NOM_ENVELOPPE_RECOURS,
    }

    const zipBuffer = await new Promise<Buffer>((res, rej) => {
      const chunks: Buffer[] = []
      const archive = archiver.create('zip', { zlib: { level: 6 } })

      archive.on('error', rej)
      archive.on('data', (chunk: unknown) => { chunks.push(Buffer.from(chunk as ArrayBufferLike)) })
      archive.on('end', () => res(Buffer.concat(chunks)))

      archive.file(cheminBase, { name: NOM_FICHIER_BASE })
      archive.file(cheminRecours, { name: join(NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS) })
      archive.append(JSON.stringify(manifeste, null, 2), { name: 'manifeste.json' })

      archive.finalize()
    })

    const fichierChiffre = await chiffrer(zipBuffer, params.motDePasse)
    writeFileSync(params.destination, fichierChiffre)

    return { succes: true, chemin: params.destination }
  } catch (err) {
    return { succes: false, erreur: String(err) }
  }
}

export async function restaurerDonnees(params: {
  archive: string
  motDePasse: string
  dossierDestination: string
  deballerDekParPhrase?: (dossierUserData: string, phrase: string) => Promise<Buffer>
  phraseRecuperation?: string
}): Promise<ResultatRestauration> {
  try {
    if (!existsSync(params.archive)) {
      return { succes: false, erreur: 'Fichier archive introuvable.' }
    }

    if (!existsSync(params.dossierDestination)) {
      mkdirSync(params.dossierDestination, { recursive: true })
    }

    const fichiersDest = readdirSync(params.dossierDestination)
    if (fichiersDest.length > 0) {
      return { succes: false, erreur: "Le dossier de destination n'est pas vide." }
    }

    const fichierChiffre = readFileSync(params.archive)
    let zipBuffer: Buffer
    try {
      zipBuffer = await dechiffrer(fichierChiffre, params.motDePasse)
    } catch {
      return { succes: false, erreur: 'Mot de passe incorrect ou fichier corrompu.' }
    }

    const dossierTemp = join(params.dossierDestination, '__temp_extract__')
    mkdirSync(dossierTemp, { recursive: true })

    try {
      const zipEntries = await unzipper.Open.buffer(zipBuffer)
      for (const entry of zipEntries.files) {
        if (entry.type === 'File' && !entry.path.endsWith('/')) {
          const resolu = resolve(dossierTemp, entry.path)
          const relatif = relative(dossierTemp, resolu)
          if (relatif.startsWith('..') || relatif.includes('..')) {
            return { succes: false, erreur: 'Chemin dangereux détecté dans l\'archive.' }
          }
        }
      }

      await new Promise<void>((resolveExtract, rejectExtract) => {
        const extraction = unzipper.Extract({ path: dossierTemp })
        const stream = require('node:stream')
        const readable = new stream.Readable()
        readable.push(zipBuffer)
        readable.push(null)
        readable.pipe(extraction)
        extraction.on('close', resolveExtract)
        extraction.on('error', rejectExtract)
      })

      const cheminManifeste = join(dossierTemp, 'manifeste.json')
      if (!existsSync(cheminManifeste)) {
        return { succes: false, erreur: 'Archive invalide : manifeste manquant.' }
      }

      const manifeste: ManifesteSauvegarde = JSON.parse(readFileSync(cheminManifeste, 'utf8'))
      if (manifeste.version !== MANIFESTE_VERSION) {
        return { succes: false, erreur: `Version de manifeste incompatible : ${manifeste.version}` }
      }

      const cheminBaseTemp = join(dossierTemp, NOM_FICHIER_BASE)
      const cheminRecoursTemp = join(dossierTemp, NOM_DOSSIER_ENVELOPPES, NOM_ENVELOPPE_RECOURS)

      if (!existsSync(cheminBaseTemp)) {
        return { succes: false, erreur: 'Archive invalide : fichier de base manquant.' }
      }

      if (params.phraseRecuperation && params.deballerDekParPhrase) {
        try {
          const dek = await params.deballerDekParPhrase(dossierTemp, params.phraseRecuperation)
          if (!Buffer.isBuffer(dek) || dek.length !== 32) {
            return { succes: false, erreur: 'Phrase de récupération incorrecte.' }
          }
        } catch {
          return { succes: false, erreur: 'Phrase de récupération incorrecte.' }
        }
      }

      copyFileSync(cheminBaseTemp, join(params.dossierDestination, NOM_FICHIER_BASE))

      const dossierEnvDest = join(params.dossierDestination, NOM_DOSSIER_ENVELOPPES)
      if (!existsSync(dossierEnvDest)) {
        mkdirSync(dossierEnvDest, { recursive: true })
      }
      if (existsSync(cheminRecoursTemp)) {
        copyFileSync(cheminRecoursTemp, join(dossierEnvDest, NOM_ENVELOPPE_RECOURS))
      }

      return { succes: true }
    } finally {
      nettoyerDossier(dossierTemp)
    }
  } catch (err) {
    return { succes: false, erreur: String(err) }
  }
}

function nettoyerDossier(dossier: string): void {
  if (!existsSync(dossier)) return
  const elements = readdirSync(dossier)
  for (const el of elements) {
    const chemin = join(dossier, el)
    const stats = statSync(chemin)
    if (stats.isDirectory()) {
      nettoyerDossier(chemin)
    } else {
      unlinkSync(chemin)
    }
  }
  try { require('node:fs').rmdirSync(dossier) } catch { /* ignore */ }
}

export function listerSauvegardes(params: {
  dossierSauvegardes: string
}): Array<{ nom: string; date: Date; type: string }> {
  if (!existsSync(params.dossierSauvegardes)) return []

  return readdirSync(params.dossierSauvegardes)
    .filter(f => f.startsWith('egto-') && f.endsWith('.zip'))
    .map(f => {
      const chemin = join(params.dossierSauvegardes, f)
      const stats = statSync(chemin)
      let type = 'inconnue'
      if (f.includes('mensuelle')) type = 'mensuelle'
      else if (f.includes('manuelle')) type = 'manuelle'
      else if (f.includes('quotidienne')) type = 'quotidienne'
      return { nom: f, date: stats.mtime, type }
    })
    .sort((a, b) => b.nom.localeCompare(a.nom))
}

export function appliquerRetention(params: {
  dossierSauvegardes: string
  retentionQuotidienne?: number
  retentionMensuelle?: number
}): { supprimees: number } {
  const quota = params.retentionQuotidienne ?? RETENTION_QUOTIDIENNE
  const quotaMensuel = params.retentionMensuelle ?? RETENTION_MENSUELLE
  let supprimees = 0

  if (!existsSync(params.dossierSauvegardes)) return { supprimees: 0 }

  const sauvegardes = listerSauvegardes(params)

  const quotidiennes = sauvegardes.filter(s => s.type === 'quotidienne')
  const mensuelles = sauvegardes.filter(s => s.type === 'mensuelle')

  for (const s of quotidiennes.slice(quota)) {
    try { unlinkSync(join(params.dossierSauvegardes, s.nom)); supprimees++ } catch { /* ignore */ }
  }

  for (const s of mensuelles.slice(quotaMensuel)) {
    try { unlinkSync(join(params.dossierSauvegardes, s.nom)); supprimees++ } catch { /* ignore */ }
  }

  return { supprimees }
}
