import { join } from 'node:path'
import * as fsDefaut from 'node:fs'

export const DOSSIER_JOURNAL = 'logs'
export const PREFIXE_FICHIER = 'egto-journal'
export const EXTENSION_FICHIER = '.log'
export const ROTATIONS_MAX = 5
export const TAILLE_MAXIMO_OCTETS = 5 * 1024 * 1024

export type NiveauJournal = 'erreur' | 'avertissement' | 'info'

export interface EntreeJournal {
  horodatage: string
  niveau: NiveauJournal
  module: string
  message: string
  stack?: string
}

export interface ResultatEcriture {
  succes: boolean
  erreur?: string
}

export interface ResultatLecture {
  entrees: EntreeJournal[]
  fichiers: string[]
}

type Fs = typeof fsDefaut

const MOTS_SECRETS = [
  'mot de passe', 'password', 'dek', 'phrase',
  'secret', 'token', 'cle', 'key', 'enveloppe',
]

export const estSecretDansLog = (ligne: string): boolean => {
  const bascule = ligne.toLowerCase()
  return MOTS_SECRETS.some(mot => bascule.includes(mot))
}

const formaterEntree = (entree: EntreeJournal): string => {
  let ligne = `[${entree.horodatage}] [${entree.niveau.toUpperCase()}] [${entree.module}] ${entree.message}`
  if (entree.stack) {
    ligne += `\n  ${entree.stack}`
  }
  return ligne
}

const resoudreChemin = (dossierJournal: string, index?: number): string => {
  if (index === undefined || index === 0) {
    return join(dossierJournal, `${PREFIXE_FICHIER}${EXTENSION_FICHIER}`)
  }
  return join(dossierJournal, `${PREFIXE_FICHIER}-${index}${EXTENSION_FICHIER}`)
}

const listerFichiersJournal = (dossierJournal: string, fs: Fs): string[] => {
  if (!fs.existsSync(dossierJournal)) return []
  return fs.readdirSync(dossierJournal)
    .filter(f => f.startsWith(PREFIXE_FICHIER) && f.endsWith(EXTENSION_FICHIER))
    .sort()
    .map(f => join(dossierJournal, f))
}

export const initialiserJournal = ({ dossierJournal, fs = fsDefaut }: {
  dossierJournal: string
  fs?: Fs
}): void => {
  if (!fs.existsSync(dossierJournal)) {
    fs.mkdirSync(dossierJournal, { recursive: true })
  }
}

const effectuerRotation = (dossierJournal: string, fs: Fs): void => {
  const fichiers = listerFichiersJournal(dossierJournal, fs)
  const courant = resoudreChemin(dossierJournal)

  if (fichiers.length > 0 && fichiers[fichiers.length - 1] !== courant) {
    const contenu = fs.readFileSync(fichiers[fichiers.length - 1], 'utf8')
    fs.writeFileSync(courant, contenu)
  }

  for (const fichier of fichiers) {
    if (fichier === courant) continue
    fs.unlinkSync(fichier)
  }

  let indexRotation = 1
  if (fs.existsSync(courant)) {
    const stats = fs.statSync(courant)
    if (stats.size >= TAILLE_MAXIMO_OCTETS) {
      const nouveauNom = resoudreChemin(dossierJournal, indexRotation)
      fs.renameSync(courant, nouveauNom)
      indexRotation++
    }
  }

  const fichiersApresRotation = listerFichiersJournal(dossierJournal, fs)
  while (fichiersApresRotation.length > ROTATIONS_MAX) {
    fs.unlinkSync(fichiersApresRotation.shift()!)
  }
}

export const ecrireLog = ({ dossierJournal, entree, fs = fsDefaut }: {
  dossierJournal: string
  entree: EntreeJournal
  fs?: Fs
}): ResultatEcriture => {
  if (estSecretDansLog(entree.message)) {
    return { succes: false, erreur: 'Message contenant un secret détecté, écriture refusée.' }
  }
  if (entree.stack && estSecretDansLog(entree.stack)) {
    return { succes: false, erreur: 'Stack contenant un secret détecté, écriture refusée.' }
  }

  try {
    initialiserJournal({ dossierJournal, fs })
    effectuerRotation(dossierJournal, fs)

    const ligne = formaterEntree(entree)
    const courant = resoudreChemin(dossierJournal)
    fs.appendFileSync(courant, ligne + '\n', 'utf8')

    return { succes: true }
  } catch (err) {
    return { succes: false, erreur: String(err) }
  }
}

export const lireLogs = ({ dossierJournal, nombre = 200, niveau, fs = fsDefaut }: {
  dossierJournal: string
  nombre?: number
  niveau?: NiveauJournal
  fs?: Fs
}): ResultatLecture => {
  const fichiers = listerFichiersJournal(dossierJournal, fs)
  const toutesLesLignes: string[] = []

  for (const fichier of [...fichiers].reverse()) {
    if (!fs.existsSync(fichier)) continue
    const contenu = fs.readFileSync(fichier, 'utf8')
    const lignes = contenu.split('\n').filter(l => l.trim().length > 0).reverse()
    toutesLesLignes.push(...lignes)
  }

  const entrees: EntreeJournal[] = []

  for (const ligne of toutesLesLignes) {
    const correspondance = ligne.match(/^\[([^\]]+)\] \[([^\]]+)\] \[([^\]]+)\] (.+)$/)
    if (!correspondance) continue

    const [, horodatage, niveauStr, module, reste] = correspondance
    const niveauValide = niveauStr.toLowerCase() as NiveauJournal

    if (niveau && niveauValide.toLowerCase() !== niveau.toLowerCase()) continue

    const stackMatch = reste.match(/^(.*?)\n\s+(.+)$/)
    const message = stackMatch ? stackMatch[1] : reste
    const stack = stackMatch ? stackMatch[2] : undefined

    entrees.push({
      horodatage,
      niveau: niveauValide,
      module,
      message,
      stack,
    })

    if (entrees.length >= nombre) break
  }

  return { entrees, fichiers }
}

export const exporterLogs = ({ dossierJournal, destination, fs = fsDefaut }: {
  dossierJournal: string
  destination: string
  fs?: Fs
}): ResultatEcriture => {
  try {
    const fichiers = listerFichiersJournal(dossierJournal, fs)
    const morceaux: string[] = []

    for (const fichier of fichiers) {
      if (!fs.existsSync(fichier)) continue
      const contenu = fs.readFileSync(fichier, 'utf8')
      if (contenu.trim().length > 0) {
        morceaux.push(contenu)
      }
    }

    fs.writeFileSync(destination, morceaux.join(''), 'utf8')
    return { succes: true }
  } catch (err) {
    return { succes: false, erreur: String(err) }
  }
}

export const nettoyerAnciensLogs = ({ dossierJournal, rotations = ROTATIONS_MAX, fs = fsDefaut }: {
  dossierJournal: string
  rotations?: number
  fs?: Fs
}): ResultatEcriture => {
  try {
    const fichiers = listerFichiersJournal(dossierJournal, fs)

    while (fichiers.length > rotations) {
      const lePlusAncien = fichiers.shift()!
      if (fs.existsSync(lePlusAncien)) {
        fs.unlinkSync(lePlusAncien)
      }
    }

    return { succes: true }
  } catch (err) {
    return { succes: false, erreur: String(err) }
  }
}
