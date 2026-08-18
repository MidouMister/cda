import type { Base } from '../db/connexion'

export type Unite = 'T' | 'M2' | 'M3' | 'FORFAIT' | 'H' | 'J' | 'KM' | 'U' | 'L'
export type TypeTarification = 'FIXE' | 'PAR_CLIENT' | 'PAR_AFFAIRE' | 'FORFAIT'

export interface DonneesCreationProduit {
  code_produit: string
  libelle: string
  famille_id: number
  sous_famille_id?: number | null
  unite?: Unite
  pu_reference_centimes?: number
  type_tarification?: TypeTarification
  actif?: 0 | 1
}

export interface Produit {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  code_produit: string
  libelle: string
  famille_id: number
  sous_famille_id: number | null
  unite: Unite
  pu_reference_centimes: number
  type_tarification: TypeTarification
  actif: 0 | 1
}

export interface DonneesPartiellesProduit {
  code_produit?: string
  libelle?: string
  famille_id?: number
  sous_famille_id?: number | null
  unite?: Unite
  pu_reference_centimes?: number
  type_tarification?: TypeTarification
  actif?: 0 | 1
}

const verifierObligatoire = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new TypeError(`« ${libelle} » est obligatoire.`)
  }
}

export const creerProduit = (base: Base, donnees: DonneesCreationProduit): number => {
  verifierObligatoire(donnees.code_produit, 'code_produit')
  verifierObligatoire(donnees.libelle, 'libelle')
  const resultat = base
    .prepare(
      `INSERT INTO produits (
         code_produit, libelle, famille_id, sous_famille_id, unite,
         pu_reference_centimes, type_tarification, actif
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.code_produit,
      donnees.libelle,
      donnees.famille_id,
      donnees.sous_famille_id ?? null,
      donnees.unite ?? 'U',
      donnees.pu_reference_centimes ?? 0,
      donnees.type_tarification ?? 'FIXE',
      donnees.actif ?? 1,
    )
  return Number(resultat.lastInsertRowid)
}

export const lireProduitParId = (base: Base, id: number): Produit | null => {
  const ligne = base
    .prepare('SELECT * FROM produits WHERE id = ? AND supprime_le IS NULL')
    .get(id) as Produit | undefined
  return ligne ?? null
}

export const listerProduits = (base: Base): Produit[] => {
  return base
    .prepare('SELECT * FROM produits WHERE supprime_le IS NULL ORDER BY code_produit')
    .all() as Produit[]
}

export const modifierProduit = (base: Base, id: number, donneesPartielles: DonneesPartiellesProduit): boolean => {
  const cles: string[] = []
  const valeurs: unknown[] = []
  for (const [cle, valeur] of Object.entries(donneesPartielles)) {
    if (valeur !== undefined) {
      cles.push(`${cle} = ?`)
      valeurs.push(valeur)
    }
  }
  if (cles.length === 0) {
    return false
  }
  cles.push("modifie_le = datetime('now')")
  valeurs.push(id)
  const resultat = base
    .prepare(
      `UPDATE produits SET ${cles.join(', ')} WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementProduit = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE produits
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}

export const listerProduitsParFamille = (base: Base, familleId: number): Produit[] => {
  return base
    .prepare(
      'SELECT * FROM produits WHERE famille_id = ? AND supprime_le IS NULL ORDER BY code_produit',
    )
    .all(familleId) as Produit[]
}
