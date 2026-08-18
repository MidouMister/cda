import type { Base } from '../db/connexion'

export type CategorieClassification = 'NOIR' | 'BLANC' | 'AUTRE'

export interface Classification {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  sous_famille_id: number
  categorie: CategorieClassification
}

export interface DonneesCreationClassification {
  sous_famille_id: number
  categorie: CategorieClassification
}

export const creerClassification = (base: Base, donnees: DonneesCreationClassification): number => {
  const resultat = base
    .prepare(
      `INSERT INTO classifications (sous_famille_id, categorie)
       VALUES (?, ?)`,
    )
    .run(donnees.sous_famille_id, donnees.categorie)
  return Number(resultat.lastInsertRowid)
}

export const lireClassificationParSousFamille = (base: Base, sousFamilleId: number): Classification | null => {
  const ligne = base
    .prepare(
      'SELECT * FROM classifications WHERE sous_famille_id = ? AND supprime_le IS NULL',
    )
    .get(sousFamilleId) as Classification | undefined
  return ligne ?? null
}

export const listerClassifications = (base: Base): Classification[] => {
  return base
    .prepare('SELECT * FROM classifications WHERE supprime_le IS NULL ORDER BY id')
    .all() as Classification[]
}

export const modifierClassification = (base: Base, id: number, categorie: CategorieClassification): boolean => {
  const resultat = base
    .prepare(
      `UPDATE classifications
          SET categorie = ?, modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(categorie, id)
  return resultat.changes === 1
}
