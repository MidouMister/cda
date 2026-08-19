import type { Base } from '../db/connexion'

export interface DonneesDevisDepot {
  statut: string
  numero_devis: string
  client_id: number
  date_devis: string
  date_validite?: string | null
  rabais_global_bps?: number
  affaire_id?: number | null
  exercice_id?: number | null
}

export interface DevisDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  statut: string
  numero_devis: string
  client_id: number
  date_devis: string
  date_validite: string | null
  rabais_global_bps: number
  affaire_id: number | null
  exercice_id: number | null
}

export interface DonneesLigneDevisDepot {
  devis_id: number
  produit_id?: number | null
  designation: string
  unite?: string | null
  quantite_milliemes?: number
  pu_ht_centimes?: number
  montant_ht_centimes?: number
  famille_id?: number | null
  sous_famille_id?: number | null
}

export interface LigneDevisDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  devis_id: number
  produit_id: number | null
  designation: string
  unite: string | null
  quantite_milliemes: number
  pu_ht_centimes: number
  montant_ht_centimes: number
  famille_id: number | null
  sous_famille_id: number | null
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerDevis = (base: Base, donnees: DonneesDevisDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO devis (
         statut, numero_devis, client_id, date_devis, date_validite,
         rabais_global_bps, affaire_id, exercice_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.statut,
      donnees.numero_devis,
      donnees.client_id,
      donnees.date_devis,
      normaliser(donnees.date_validite),
      donnees.rabais_global_bps ?? 0,
      normaliser(donnees.affaire_id),
      normaliser(donnees.exercice_id),
    )
  return Number(resultat.lastInsertRowid)
}

export const lireDevisParId = (base: Base, id: number): DevisDepot | null => {
  const ligne = base
    .prepare('SELECT * FROM devis WHERE id = ? AND supprime_le IS NULL')
    .get(id) as DevisDepot | undefined
  return ligne ?? null
}

export const listerDevis = (base: Base): DevisDepot[] => {
  return base
    .prepare('SELECT * FROM devis WHERE supprime_le IS NULL ORDER BY numero_devis')
    .all() as DevisDepot[]
}

export const modifierDevis = (
  base: Base,
  id: number,
  donneesPartielles: Partial<DonneesDevisDepot>,
): boolean => {
  const existant = lireDevisParId(base, id)
  if (existant === null) {
    return false
  }
  const champs: string[] = []
  const valeurs: unknown[] = []

  const MAPPAGE: Record<string, string> = {
    statut: 'statut',
    numero_devis: 'numero_devis',
    client_id: 'client_id',
    date_devis: 'date_devis',
    date_validite: 'date_validite',
    rabais_global_bps: 'rabais_global_bps',
    affaire_id: 'affaire_id',
    exercice_id: 'exercice_id',
  }

  for (const [cle, colonne] of Object.entries(MAPPAGE)) {
    if (cle in donneesPartielles) {
      champs.push(`${colonne} = ?`)
      valeurs.push(donneesPartielles[cle as keyof DonneesDevisDepot] ?? null)
    }
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE devis SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementDevis = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE devis
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}

export const creerLigneDevis = (base: Base, donnees: DonneesLigneDevisDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO lignes_devis (
         devis_id, produit_id, designation, unite, quantite_milliemes,
         pu_ht_centimes, montant_ht_centimes, famille_id, sous_famille_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.devis_id,
      normaliser(donnees.produit_id),
      donnees.designation,
      normaliser(donnees.unite),
      donnees.quantite_milliemes ?? 0,
      donnees.pu_ht_centimes ?? 0,
      donnees.montant_ht_centimes ?? 0,
      normaliser(donnees.famille_id),
      normaliser(donnees.sous_famille_id),
    )
  return Number(resultat.lastInsertRowid)
}

export const listerLignesDevis = (base: Base, devisId: number): LigneDevisDepot[] => {
  return base
    .prepare('SELECT * FROM lignes_devis WHERE devis_id = ? AND supprime_le IS NULL')
    .all(devisId) as LigneDevisDepot[]
}

export const supprimerLogiquementLigneDevis = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE lignes_devis
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
