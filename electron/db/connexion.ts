import Database from 'better-sqlite3-multiple-ciphers'

export type Base = Database.Database

let baseCourante: Base | null = null

const echapperValeur = (valeur: string): string => valeur.replace(/'/g, "''")

export const ouvrirBase = (chemin: string, cle: string): Base => {
  if (baseCourante !== null) {
    throw new Error('ouvrirBase : une base est déjà ouverte, fermez-la avant d’en ouvrir une autre.')
  }
  if (cle.length === 0) {
    throw new TypeError('ouvrirBase : la clé SQLCipher ne peut pas être vide.')
  }
  const base = new Database(chemin)
  try {
    base.pragma("cipher='sqlcipher'")
    base.pragma('legacy=0')
    base.pragma(`key='${echapperValeur(cle)}'`)
    base.pragma('journal_mode = WAL')
    base.pragma('foreign_keys = ON')
  } catch (erreur) {
    base.close()
    throw erreur
  }
  baseCourante = base
  return base
}

export const obtenirBase = (): Base => {
  if (baseCourante === null) {
    throw new Error('obtenirBase : aucune base n’est ouverte.')
  }
  return baseCourante
}

export const fermerBase = (): void => {
  if (baseCourante !== null) {
    baseCourante.close()
    baseCourante = null
  }
}

export const baseEstOuverte = (): boolean => baseCourante !== null
