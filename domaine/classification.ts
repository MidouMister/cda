import { verifierEntierPositif, verifierParmi } from './entites-referentielles'

export const CATEGORIES_CLASSIFICATION = ['NOIR', 'BLANC', 'AUTRE'] as const
export type CategorieClassification = (typeof CATEGORIES_CLASSIFICATION)[number]

export interface DonneesClassification {
  id: number
  sous_famille_id: number
  categorie: CategorieClassification
}

export class Classification {
  private constructor(
    private readonly _id: number,
    private readonly _sous_famille_id: number,
    private readonly _categorie: CategorieClassification,
  ) {}

  static depuisDonnees(donnees: DonneesClassification): Classification {
    verifierEntierPositif(donnees.id, 'identifiant classification')
    verifierEntierPositif(donnees.sous_famille_id, 'identifiant sous-famille')
    verifierParmi(donnees.categorie, CATEGORIES_CLASSIFICATION, 'catégorie classification')
    return new Classification(donnees.id, donnees.sous_famille_id, donnees.categorie)
  }

  get id(): number {
    return this._id
  }

  get sous_famille_id(): number {
    return this._sous_famille_id
  }

  get categorie(): CategorieClassification {
    return this._categorie
  }
}

export type LectureClassification = (sous_famille_id: number) => CategorieClassification | null

export interface SnapshotClassification {
  readonly sous_famille_id: number | null
  readonly categorie: CategorieClassification | null
  readonly au: string
}

// Sémantique : sans sous-famille ni mapping → null, sinon la catégorie du mapping au moment du snapshot (valeur figée à la saisie).
export const figerClassification = (
  classification: Classification | undefined,
  categories: LectureClassification,
): CategorieClassification | null => {
  if (classification === undefined) {
    return null
  }
  return categories(classification.sous_famille_id) ?? null
}

export const creerSnapshotClassification = (
  classification: Classification | undefined,
  categories: LectureClassification,
  au: string,
): SnapshotClassification => ({
  sous_famille_id: classification === undefined ? null : classification.sous_famille_id,
  categorie: figerClassification(classification, categories),
  au,
})
