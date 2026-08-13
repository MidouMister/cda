import type { Base } from '../db/connexion'
import { SEUIL_ESPECES_CLE } from '../db/seeds'
import { versCentimes } from './conversion-centimes'

export const lireParametre = (base: Base, cle: string): string | null => {
  const ligne = base
    .prepare('SELECT valeur FROM parametres WHERE cle = ? AND supprime_le IS NULL')
    .get(cle) as { valeur: string } | undefined
  return ligne?.valeur ?? null
}

export const lireParametreObli = (base: Base, cle: string): string => {
  const valeur = lireParametre(base, cle)
  if (valeur === null) {
    throw new Error(`Paramètre obligatoire « ${cle} » absent de la base.`)
  }
  return valeur
}

export const lireSeuilEspecesCentimes = (base: Base): number => {
  const valeur = lireParametreObli(base, SEUIL_ESPECES_CLE)
  return versCentimes(Number.parseInt(valeur, 10))
}

export const mettreAJourParametre = (base: Base, cle: string, valeur: string): void => {
  base
    .prepare(
      `INSERT INTO parametres (cle, valeur)
       VALUES (?, ?)
       ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur, modifie_le = datetime('now')`,
    )
    .run(cle, valeur)
}
