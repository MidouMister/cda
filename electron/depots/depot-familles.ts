import type { Base } from '../db/connexion'

export interface Famille {
  id: number
  code: string
  libelle: string
  ordre: number
}

export const listerFamillesActives = (base: Base): Famille[] => {
  return base
    .prepare(
      `SELECT id, code, libelle, ordre
         FROM familles
        WHERE statut = 'ACTIF' AND supprime_le IS NULL
        ORDER BY ordre`,
    )
    .all() as Famille[]
}
