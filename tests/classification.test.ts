import { describe, expect, it } from 'vitest'
import {
  CategorieClassification,
  Classification,
  LectureClassification,
  creerSnapshotClassification,
  figerClassification,
} from '../domaine/classification'

describe('Classification', () => {
  it('construit un mapping valide', () => {
    const classification = Classification.depuisDonnees({ id: 1, sous_famille_id: 10, categorie: 'NOIR' })
    expect(classification.id).toBe(1)
    expect(classification.sous_famille_id).toBe(10)
    expect(classification.categorie).toBe('NOIR')
  })

  it('accepte les trois catégories du schéma', () => {
    expect(Classification.depuisDonnees({ id: 1, sous_famille_id: 1, categorie: 'BLANC' }).categorie).toBe('BLANC')
    expect(Classification.depuisDonnees({ id: 2, sous_famille_id: 2, categorie: 'AUTRE' }).categorie).toBe('AUTRE')
  })

  it('refuse une catégorie inconnue', () => {
    expect(() =>
      Classification.depuisDonnees({ id: 1, sous_famille_id: 10, categorie: 'GRIS' as CategorieClassification }),
    ).toThrow(Error)
  })

  it('refuse un identifiant non positif', () => {
    expect(() => Classification.depuisDonnees({ id: 0, sous_famille_id: 10, categorie: 'NOIR' })).toThrow()
    expect(() => Classification.depuisDonnees({ id: 1, sous_famille_id: 0, categorie: 'NOIR' })).toThrow()
  })
})

describe('figerClassification', () => {
  const classification = Classification.depuisDonnees({ id: 1, sous_famille_id: 10, categorie: 'NOIR' })

  it('retourne la catégorie du mapping au moment du snapshot', () => {
    const lecture: LectureClassification = () => 'BLANC'
    expect(figerClassification(classification, lecture)).toBe('BLANC')
  })

  it('retourne null pour une ligne sans sous-famille (classification absente)', () => {
    expect(figerClassification(undefined, () => 'NOIR')).toBeNull()
  })

  it('retourne null pour un mapping absent au moment du snapshot', () => {
    const lecture: LectureClassification = () => null
    expect(figerClassification(classification, lecture)).toBeNull()
  })

  it('fige la valeur au moment de la saisie : un changement de mapping ne réécrit pas le snapshot déjà pris', () => {
    const mapping = new Map<number, CategorieClassification>([[10, 'NOIR']])
    const lecture: LectureClassification = (sous_famille_id) => mapping.get(sous_famille_id) ?? null

    const snapshotPriseASaisie = figerClassification(classification, lecture)
    expect(snapshotPriseASaisie).toBe('NOIR')

    mapping.set(10, 'BLANC')

    expect(snapshotPriseASaisie).toBe('NOIR')
    expect(figerClassification(classification, lecture)).toBe('BLANC')
  })
})

describe('creerSnapshotClassification', () => {
  const classification = Classification.depuisDonnees({ id: 1, sous_famille_id: 10, categorie: 'NOIR' })
  const lecture: LectureClassification = () => 'AUTRE'

  it('construit un snapshot complet avec la date de saisie', () => {
    const snapshot = creerSnapshotClassification(classification, lecture, '2026-08-13')
    expect(snapshot).toEqual({ sous_famille_id: 10, categorie: 'AUTRE', au: '2026-08-13' })
  })

  it('construit un snapshot sans catégorie pour une ligne sans sous-famille', () => {
    const snapshot = creerSnapshotClassification(undefined, lecture, '2026-08-13')
    expect(snapshot.sous_famille_id).toBeNull()
    expect(snapshot.categorie).toBeNull()
    expect(snapshot.au).toBe('2026-08-13')
  })
})
