import type { Base } from '../db/connexion'

export interface DonneesPosteDqeDepot {
  affaire_id: number
  numero: number
  designation: string
  unite?: string | null
  quantite_milliemes?: number
  pu_ht_centimes?: number
  montant_ht_centimes?: number
  famille_id?: number | null
  sous_famille_id?: number | null
  classification?: string | null
  origine?: string
  ligne_devis_id?: number | null
}

export interface PosteDqeDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  affaire_id: number
  numero: number
  designation: string
  unite: string | null
  quantite_milliemes: number
  pu_ht_centimes: number
  montant_ht_centimes: number
  famille_id: number | null
  sous_famille_id: number | null
  classification: string | null
  origine: string
  ligne_devis_id: number | null
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerPosteDqe = (base: Base, donnees: DonneesPosteDqeDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO postes_dqe (
         affaire_id, numero, designation, unite, quantite_milliemes,
         pu_ht_centimes, montant_ht_centimes, famille_id, sous_famille_id,
         classification, origine, ligne_devis_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.affaire_id,
      donnees.numero,
      donnees.designation,
      normaliser(donnees.unite),
      donnees.quantite_milliemes ?? 0,
      donnees.pu_ht_centimes ?? 0,
      donnees.montant_ht_centimes ?? 0,
      normaliser(donnees.famille_id),
      normaliser(donnees.sous_famille_id),
      normaliser(donnees.classification),
      donnees.origine ?? 'MANUEL',
      normaliser(donnees.ligne_devis_id),
    )
  return Number(resultat.lastInsertRowid)
}

export const lirePosteDqeParId = (base: Base, id: number): PosteDqeDepot | null => {
  const ligne = base
    .prepare('SELECT * FROM postes_dqe WHERE id = ? AND supprime_le IS NULL')
    .get(id) as PosteDqeDepot | undefined
  return ligne ?? null
}

export const listerPostesDqeParAffaire = (base: Base, affaireId: number): PosteDqeDepot[] => {
  return base
    .prepare('SELECT * FROM postes_dqe WHERE affaire_id = ? AND supprime_le IS NULL ORDER BY numero')
    .all(affaireId) as PosteDqeDepot[]
}

export const modifierPosteDqe = (
  base: Base,
  id: number,
  donneesPartielles: Partial<DonneesPosteDqeDepot>,
): boolean => {
  const existant = lirePosteDqeParId(base, id)
  if (existant === null) {
    return false
  }
  const champs: string[] = []
  const valeurs: unknown[] = []

  const MAPPAGE: Record<string, string> = {
    affaire_id: 'affaire_id',
    numero: 'numero',
    designation: 'designation',
    unite: 'unite',
    quantite_milliemes: 'quantite_milliemes',
    pu_ht_centimes: 'pu_ht_centimes',
    montant_ht_centimes: 'montant_ht_centimes',
    famille_id: 'famille_id',
    sous_famille_id: 'sous_famille_id',
    classification: 'classification',
    origine: 'origine',
    ligne_devis_id: 'ligne_devis_id',
  }

  for (const [cle, colonne] of Object.entries(MAPPAGE)) {
    if (cle in donneesPartielles) {
      champs.push(`${colonne} = ?`)
      valeurs.push(donneesPartielles[cle as keyof DonneesPosteDqeDepot] ?? null)
    }
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE postes_dqe SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementPosteDqe = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE postes_dqe
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
