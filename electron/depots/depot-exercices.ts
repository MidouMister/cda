import type { Base } from '../db/connexion'

export type StatutExercice = 'OUVERT' | 'CLOTURE'

export interface Exercice {
  id: number
  annee: number
  date_debut: string
  date_fin: string
  statut: StatutExercice
}

export const lireExerciceCourant = (base: Base): Exercice | null => {
  const ligne = base
    .prepare(
      `SELECT id, annee, date_debut, date_fin, statut
         FROM exercices
        WHERE statut = 'OUVERT' AND supprime_le IS NULL
        ORDER BY annee DESC
        LIMIT 1`,
    )
    .get() as Exercice | undefined
  return ligne ?? null
}

export const lireExerciceParAnnee = (base: Base, annee: number): Exercice | null => {
  const ligne = base
    .prepare(
      `SELECT id, annee, date_debut, date_fin, statut
         FROM exercices
        WHERE annee = ? AND supprime_le IS NULL`,
    )
    .get(annee) as Exercice | undefined
  return ligne ?? null
}
