import { describe, expect, it } from 'vitest'
import { Reference } from '../domaine/identites'
import {
  convertirDevisEnAffaire,
  type DonneesConversionDevis,
  type LigneDevisPourConversion,
} from '../domaine/conversion-devis'

const referenceAffaire = Reference.depuisValeur('AFG-2026-0001')

const uneLigne = (id: number, overrides?: Partial<LigneDevisPourConversion>): LigneDevisPourConversion => ({
  id,
  designation: `Poste ${id}`,
  unite: 'UNITE',
  quantite_milliemes: 1000,
  pu_ht_centimes: 50000,
  montant_ht_centimes: 50000,
  produit_id: null,
  famille_id: null,
  sous_famille_id: null,
  ...overrides,
})

const donneesDeBase = (
  lignes: readonly LigneDevisPourConversion[],
  overrides?: Partial<DonneesConversionDevis>,
): DonneesConversionDevis => ({
  devis_id: 1,
  statut_devis: 'ENVOYE',
  client_id: 10,
  date_devis: '2026-08-15',
  exercice_id: null,
  rabais_global_bps: 0,
  lignes,
  reference_affaire: referenceAffaire,
  ...overrides,
})

describe('convertirDevisEnAffaire', () => {
  it('convertit un devis ENVOYÉ avec 3 lignes en affaire ACCEPTE', () => {
    const lignes = [uneLigne(1), uneLigne(2), uneLigne(3)]
    const resultat = convertirDevisEnAffaire(donneesDeBase(lignes))

    expect(resultat.nouveau_statut_devis).toBe('ACCEPTE')
    expect(resultat.affaire.type_affaire).toBe('CONTRAT_PRIVE')
    expect(resultat.affaire.statut).toBe('SIGNE')
    expect(resultat.postes_dqe).toHaveLength(3)
    expect(resultat.affaire.montant_initial_ht_centimes).toBe(150000)
  })

  it('chaque poste DQE reprend les montants de la ligne devis correspondante', () => {
    const l1 = uneLigne(1, { quantite_milliemes: 2000, pu_ht_centimes: 30000, montant_ht_centimes: 60000 })
    const l2 = uneLigne(2, { quantite_milliemes: 500, pu_ht_centimes: 80000, montant_ht_centimes: 40000 })
    const resultat = convertirDevisEnAffaire(donneesDeBase([l1, l2]))

    expect(resultat.postes_dqe[0].pu_ht_centimes).toBe(30000)
    expect(resultat.postes_dqe[0].quantite_milliemes).toBe(2000)
    expect(resultat.postes_dqe[0].montant_ht_centimes).toBe(60000)
    expect(resultat.postes_dqe[1].pu_ht_centimes).toBe(80000)
    expect(resultat.postes_dqe[1].quantite_milliemes).toBe(500)
    expect(resultat.postes_dqe[1].montant_ht_centimes).toBe(40000)
  })

  it('numérote les postes DQE de 1 à N dans l\'ordre des lignes', () => {
    const lignes = [uneLigne(10), uneLigne(20), uneLigne(30)]
    const resultat = convertirDevisEnAffaire(donneesDeBase(lignes))

    expect(resultat.postes_dqe.map((p) => p.numero)).toEqual([1, 2, 3])
  })

  it('chaque poste DQE a origine DEVIS et ligne_devis_id correspondant', () => {
    const lignes = [uneLigne(5), uneLigne(8)]
    const resultat = convertirDevisEnAffaire(donneesDeBase(lignes))

    expect(resultat.postes_dqe[0].origine).toBe('DEVIS')
    expect(resultat.postes_dqe[0].ligne_devis_id).toBe(5)
    expect(resultat.postes_dqe[1].origine).toBe('DEVIS')
    expect(resultat.postes_dqe[1].ligne_devis_id).toBe(8)
  })

  it('rejette un devis BROUILLON', () => {
    expect(() => convertirDevisEnAffaire(donneesDeBase([], { statut_devis: 'BROUILLON' }))).toThrow(
      /Conversion impossible/,
    )
  })

  it('rejette un devis déjà ACCEPTÉ', () => {
    expect(() => convertirDevisEnAffaire(donneesDeBase([], { statut_devis: 'ACCEPTE' }))).toThrow(
      /Conversion impossible/,
    )
  })

  it('la somme des postes DQE correspond au montant de l\'affaire', () => {
    const l1 = uneLigne(1, { montant_ht_centimes: 123456 })
    const l2 = uneLigne(2, { montant_ht_centimes: 78901 })
    const l3 = uneLigne(3, { montant_ht_centimes: 23456 })
    const resultat = convertirDevisEnAffaire(donneesDeBase([l1, l2, l3]))

    const sommePostes = resultat.postes_dqe.reduce((s, p) => s + p.montant_ht_centimes, 0)
    expect(sommePostes).toBe(resultat.affaire.montant_initial_ht_centimes)
  })

  it('reprend le produit_id lorsqu\'il est défini', () => {
    const ligne = uneLigne(1, { produit_id: 42 })
    const resultat = convertirDevisEnAffaire(donneesDeBase([ligne]))

    expect(resultat.postes_dqe[0].produit_id).toBe(42)
  })

  it('conserve produit_id null lorsqu\'il n\'est pas défini', () => {
    const ligne = uneLigne(1, { produit_id: null })
    const resultat = convertirDevisEnAffaire(donneesDeBase([ligne]))

    expect(resultat.postes_dqe[0].produit_id).toBeNull()
  })

  it('accepte un devis sans lignes', () => {
    const resultat = convertirDevisEnAffaire(donneesDeBase([]))

    expect(resultat.nouveau_statut_devis).toBe('ACCEPTE')
    expect(resultat.affaire.montant_initial_ht_centimes).toBe(0)
    expect(resultat.postes_dqe).toHaveLength(0)
  })
})
