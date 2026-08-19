import type { Base } from '../db/connexion'

export interface DonneesAvenantDepot {
  statut: string
  numero: string
  affaire_id: number
  objet?: string | null
  date_avenant?: string | null
  impact_delai_jours?: number
  impact_montant_ht_centimes?: number
}

export interface AvenantDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  statut: string
  numero: string
  affaire_id: number
  objet: string | null
  date_avenant: string | null
  impact_delai_jours: number
  impact_montant_ht_centimes: number
}

export interface DonneesAvenantPosteDepot {
  avenant_id: number
  action: string
  poste_dqe_id?: number | null
  designation?: string | null
  unite?: string | null
  quantite_milliemes?: number | null
  pu_ht_centimes?: number | null
}

export interface AvenantPosteDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  avenant_id: number
  action: string
  poste_dqe_id: number | null
  designation: string | null
  unite: string | null
  quantite_milliemes: number | null
  pu_ht_centimes: number | null
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerAvenant = (base: Base, donnees: DonneesAvenantDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO avenants (
         statut, numero, affaire_id, objet, date_avenant,
         impact_delai_jours, impact_montant_ht_centimes
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.statut,
      donnees.numero,
      donnees.affaire_id,
      normaliser(donnees.objet),
      normaliser(donnees.date_avenant),
      donnees.impact_delai_jours ?? 0,
      donnees.impact_montant_ht_centimes ?? 0,
    )
  return Number(resultat.lastInsertRowid)
}

export const lireAvenantParId = (base: Base, id: number): AvenantDepot | null => {
  const ligne = base
    .prepare('SELECT * FROM avenants WHERE id = ? AND supprime_le IS NULL')
    .get(id) as AvenantDepot | undefined
  return ligne ?? null
}

export const listerAvenantsParAffaire = (base: Base, affaireId: number): AvenantDepot[] => {
  return base
    .prepare('SELECT * FROM avenants WHERE affaire_id = ? AND supprime_le IS NULL ORDER BY numero')
    .all(affaireId) as AvenantDepot[]
}

export const modifierStatutAvenant = (base: Base, id: number, statut: string): boolean => {
  const resultat = base
    .prepare(
      `UPDATE avenants SET statut = ?, modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(statut, id)
  return resultat.changes === 1
}

export const supprimerLogiquementAvenant = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE avenants
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}

export const creerAvenantPoste = (base: Base, donnees: DonneesAvenantPosteDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO avenants_postes (
         avenant_id, action, poste_dqe_id, designation, unite,
         quantite_milliemes, pu_ht_centimes
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.avenant_id,
      donnees.action,
      normaliser(donnees.poste_dqe_id),
      normaliser(donnees.designation),
      normaliser(donnees.unite),
      normaliser(donnees.quantite_milliemes),
      normaliser(donnees.pu_ht_centimes),
    )
  return Number(resultat.lastInsertRowid)
}

export const listerAvenantsPostes = (base: Base, avenantId: number): AvenantPosteDepot[] => {
  return base
    .prepare('SELECT * FROM avenants_postes WHERE avenant_id = ? AND supprime_le IS NULL')
    .all(avenantId) as AvenantPosteDepot[]
}
