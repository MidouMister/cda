import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Base } from './db/connexion'
import { ouvrirBase } from './db/connexion'

export const NOM_FICHIER_CLE = 'egto.cle'

// PROVISOIRE (J1) : clé de dev générée au premier lancement et stockée dans
// egto.cle sous userData (jamais en dur dans le code versionné). J2 la
// remplacera par la DEK 256 bits chiffrée en enveloppe avec phrase de
// récupération.
export const lireOuCreerCleDev = (dossierUserData: string): string => {
  const chemin = join(dossierUserData, NOM_FICHIER_CLE)
  if (existsSync(chemin)) {
    const cle = readFileSync(chemin, 'utf8').trim()
    if (cle.length === 0) {
      throw new Error('Clé de dev vide dans le fichier egto.cle.')
    }
    return cle
  }
  const cle = randomBytes(32).toString('hex')
  writeFileSync(chemin, cle, { encoding: 'utf8', mode: 0o600 })
  return cle
}

export const ouvrirBaseDev = (cheminBase: string, dossierUserData: string): Base =>
  ouvrirBase(cheminBase, lireOuCreerCleDev(dossierUserData))
