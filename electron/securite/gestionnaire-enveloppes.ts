import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

export const NOM_ENVELOPPE_UTILISATEUR = 'utilisateur.bin'
export const NOM_ENVELOPPE_RECOURS = 'recours.bin'
export const NOM_DOSSIER_ENVELOPPES = 'enveloppes'
export const MODE_FICHIER_ENVELOPPE = 0o600

const MOTIF_NOM_ENVELOPPE = /^[a-z0-9-]+\.bin$/

export const cheminDossierEnveloppes = (dossierUserData: string): string =>
  join(dossierUserData, NOM_DOSSIER_ENVELOPPES)

// Garde anti-traversée : le nom doit rester un simple nom de fichier dans le
// dossier des enveloppes (jamais de séparateur de chemin).
const verifierNomEnveloppe = (nom: string): string => {
  if (
    typeof nom !== 'string' ||
    nom.length === 0 ||
    basename(nom) !== nom ||
    !MOTIF_NOM_ENVELOPPE.test(nom)
  ) {
    throw new TypeError(`Nom d’enveloppe invalide : « ${String(nom)} ».`)
  }
  return nom
}

export const initialiserDossierEnveloppes = (dossierUserData: string): string => {
  const chemin = cheminDossierEnveloppes(dossierUserData)
  mkdirSync(chemin, { recursive: true, mode: 0o700 })
  return chemin
}

// Écriture atomique : fichier temporaire du même dossier puis rename — jamais
// de blob tronqué en cas de crash. Mode 0o600 sur le fichier créé (sous
// Windows le mode POSIX est une intention, l'application des ACL est NTFS).
export const ecrireEnveloppe = (dossierUserData: string, nom: string, blob: Buffer): void => {
  verifierNomEnveloppe(nom)
  if (!Buffer.isBuffer(blob) || blob.length === 0) {
    throw new TypeError('ecrireEnveloppe : le blob doit être un Buffer non vide.')
  }
  const dossier = initialiserDossierEnveloppes(dossierUserData)
  const cheminFinal = join(dossier, nom)
  const cheminTemporaire = join(dossier, `${nom}.tmp`)
  const descripteur = openSync(cheminTemporaire, 'w', MODE_FICHIER_ENVELOPPE)
  try {
    writeFileSync(descripteur, blob)
  } finally {
    closeSync(descripteur)
  }
  renameSync(cheminTemporaire, cheminFinal)
}

export const lireEnveloppe = (dossierUserData: string, nom: string): Buffer => {
  verifierNomEnveloppe(nom)
  const chemin = join(cheminDossierEnveloppes(dossierUserData), nom)
  if (!existsSync(chemin)) {
    throw new Error(`Enveloppe « ${nom} » introuvable dans le dossier des enveloppes.`)
  }
  return readFileSync(chemin)
}

export const enveloppesExistent = (dossierUserData: string): boolean => {
  const dossier = cheminDossierEnveloppes(dossierUserData)
  if (!existsSync(dossier)) {
    return false
  }
  for (const nom of [NOM_ENVELOPPE_UTILISATEUR, NOM_ENVELOPPE_RECOURS]) {
    const chemin = join(dossier, nom)
    if (!existsSync(chemin) || statSync(chemin).size === 0) {
      return false
    }
  }
  return true
}
