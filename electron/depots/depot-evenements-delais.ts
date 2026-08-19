import type { Base } from '../db/connexion'

export interface DonneesEvenementDepot {
  affaire_id: number
  type_evenement: string
  date_debut?: string | null
  date_fin?: string | null
  duree_jours?: number | null
  motif?: string | null
  impact_delai_jours?: number
}

export interface EvenementDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  affaire_id: number
  type_evenement: string
  date_debut: string | null
  date_fin: string | null
  duree_jours: number | null
  motif: string | null
  impact_delai_jours: number
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerEvenementDelai = (base: Base, donnees: DonneesEvenementDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO evenements_delais (
         affaire_id, type_evenement, date_debut, date_fin,
         duree_jours, motif, impact_delai_jours
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.affaire_id,
      donnees.type_evenement,
      normaliser(donnees.date_debut),
      normaliser(donnees.date_fin),
      normaliser(donnees.duree_jours),
      normaliser(donnees.motif),
      donnees.impact_delai_jours ?? 0,
    )
  return Number(resultat.lastInsertRowid)
}

export const listerEvenementsDelaiParAffaire = (base: Base, affaireId: number): EvenementDepot[] => {
  return base
    .prepare('SELECT * FROM evenements_delais WHERE affaire_id = ? AND supprime_le IS NULL ORDER BY date_debut')
    .all(affaireId) as EvenementDepot[]
}

export const supprimerLogiquementEvenementDelai = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE evenements_delais
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
