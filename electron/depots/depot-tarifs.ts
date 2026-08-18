import type { Base } from '../db/connexion'

export type TypeNiveauTarif = 'CATALOGUE' | 'CLIENT' | 'AFFAIRE'

export interface DonneesCreationTarif {
  produit_id: number
  type_niveau: TypeNiveauTarif
  client_id?: number | null
  affaire_id?: number | null
  prix_centimes: number
  debut_periode: string
  fin_periode?: string | null
}

export interface Tarif {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  produit_id: number
  type_niveau: TypeNiveauTarif
  client_id: number | null
  affaire_id: number | null
  prix_centimes: number
  debut_periode: string
  fin_periode: string | null
}

export const creerTarif = (base: Base, donnees: DonneesCreationTarif): number => {
  const resultat = base
    .prepare(
      `INSERT INTO tarifs_historique (
         produit_id, type_niveau, client_id, affaire_id,
         prix_centimes, debut_periode, fin_periode
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.produit_id,
      donnees.type_niveau,
      donnees.client_id ?? null,
      donnees.affaire_id ?? null,
      donnees.prix_centimes,
      donnees.debut_periode,
      donnees.fin_periode ?? null,
    )
  return Number(resultat.lastInsertRowid)
}

export const lireTarifParId = (base: Base, id: number): Tarif | null => {
  const ligne = base
    .prepare('SELECT * FROM tarifs_historique WHERE id = ? AND supprime_le IS NULL')
    .get(id) as Tarif | undefined
  return ligne ?? null
}

export const listerTarifs = (base: Base): Tarif[] => {
  return base
    .prepare(
      `SELECT * FROM tarifs_historique
        WHERE supprime_le IS NULL
        ORDER BY produit_id, type_niveau, debut_periode`,
    )
    .all() as Tarif[]
}

export const listerTarifsParProduit = (base: Base, produitId: number): Tarif[] => {
  return base
    .prepare(
      `SELECT * FROM tarifs_historique
        WHERE supprime_le IS NULL AND produit_id = ?
        ORDER BY type_niveau, debut_periode`,
    )
    .all(produitId) as Tarif[]
}

export const listerTarifsParClient = (base: Base, clientId: number): Tarif[] => {
  return base
    .prepare(
      `SELECT * FROM tarifs_historique
        WHERE supprime_le IS NULL AND client_id = ?
        ORDER BY produit_id, debut_periode`,
    )
    .all(clientId) as Tarif[]
}

export const listerTarifsParAffaire = (base: Base, affaireId: number): Tarif[] => {
  return base
    .prepare(
      `SELECT * FROM tarifs_historique
        WHERE supprime_le IS NULL AND affaire_id = ?
        ORDER BY produit_id, debut_periode`,
    )
    .all(affaireId) as Tarif[]
}

export const supprimerLogiquementTarif = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE tarifs_historique
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
