import { describe, expect, it } from 'vitest'
import {
  calculerPiedFacture,
  type DonneesLignePied,
  type ParametresPiedFacture,
} from '../domaine/pied-facture'

// Les 10 cas types révisés (décision 15/08/2026, §4.4.5bis + §4.4.6) :
// rabais marché ligne par ligne (base = BRUT), plus de droit de timbre dans le
// pied (NET À PAYER = total TTC), écart d'arrondi (marchés publics → ligne
// éligible la plus élevée ; documents privés → AJUSTEMENT_ARRONDI optionnelle,
// jamais créée par le moteur). Arrondi half-up ligne par ligne (§10.3).

const pied = (
  lignes: DonneesLignePied[],
  options: Partial<Omit<ParametresPiedFacture, 'lignes'>> = {},
) =>
  calculerPiedFacture({
    lignes,
    retenueGarantieBps: 0,
    remboursementAvanceCentimes: 0,
    marchePublic: false,
    ...options,
  })

const ligneSimple = (puHtCentimes: number, remiseBps = 0, rabaisMarcheBps = 0): DonneesLignePied => ({
  quantiteMilliemes: 1000,
  puHtCentimes,
  remiseBps,
  rabaisMarcheBps,
})

describe('calculerPiedFacture — les 10 cas types de contrôle (§11, DoD J1 révisé)', () => {
  it('cas 1 — sans retenue, sans remise, sans rabais : calcul simple', () => {
    // ligne 1 : 1 × 125,00 DA = 125,00 DA ; ligne 2 : 1,5 × 100,00 DA = 150,00 DA.
    // Total HT lignes = 27 500 ; TVA 19 % = 5 225 ; TTC = 32 725 ; net à payer = 32 725.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 12500, remiseBps: 0, rabaisMarcheBps: 0 },
        { quantiteMilliemes: 1500, puHtCentimes: 10000, remiseBps: 0, rabaisMarcheBps: 0 },
      ],
      { marchePublic: true },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 27500,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 27500,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 27500,
      total_tva_centimes: 5225,
      total_ttc_centimes: 32725,
      net_a_payer_centimes: 32725,
      ajustement_ecart_audit: null,
    })
  })

  it('cas 2 — retenue 5 % sur le net commercial HT, avant la TVA', () => {
    // Retenue 5 % sur le net commercial HT (27 500) = 1 375, avant la TVA.
    // Total HT = 27 500 − 1 375 = 26 125 ; TVA 19 % = 4 964 ; TTC = 31 089.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 12500, remiseBps: 0, rabaisMarcheBps: 0 },
        { quantiteMilliemes: 1500, puHtCentimes: 10000, remiseBps: 0, rabaisMarcheBps: 0 },
      ],
      { retenueGarantieBps: 500 },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 27500,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 27500,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 1375,
      total_ht_centimes: 26125,
      total_tva_centimes: 4964,
      total_ttc_centimes: 31089,
      net_a_payer_centimes: 31089,
      ajustement_ecart_audit: null,
    })
  })

  it('cas 3 — remboursement d’avance : net commercial − avance', () => {
    // HT lignes = 1 000,00 DA ; avance 250,00 DA → total HT = 100 000 − 25 000 = 75 000
    // (l’avance réduit la base avant TVA). TVA 19 % = 14 250 ; TTC = 89 250.
    const resultat = pied([ligneSimple(100000)], { remboursementAvanceCentimes: 25000 })
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 100000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 100000,
      remboursement_avance_centimes: 25000,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 75000,
      total_tva_centimes: 14250,
      total_ttc_centimes: 89250,
      net_a_payer_centimes: 89250,
      ajustement_ecart_audit: null,
    })
  })

  it('cas 4 — remise + rabais marché : net ligne = brut − remise − brut × rabais (base = BRUT)', () => {
    // Ligne 1 : brut 100 000 − remise 5 % (5 000) − rabais 5 % de 100 000 (5 000) → net 90 000.
    // Ligne 2 : brut 100 000 − remise 10 % (10 000) − rabais 5 % de 100 000 (5 000) → net 85 000.
    // Base du rabais = BRUT (décision 15/08/2026) : rabais total 10 000 = 5 % de 200 000.
    // (Si la base était le net de remise : rabais = 5 % de 190 000 = 9 500 → totaux différents.)
    // Total remises = 25 000 ; net commercial = 175 000 ; TVA 19 % = 33 250 ; TTC = 208 250.
    // Écart d'arrondi nul (Σ rabais lignes = rabais théorique sur total = 10 000) → aucune trace.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 100000, remiseBps: 500, rabaisMarcheBps: 500 },
        { quantiteMilliemes: 2000, puHtCentimes: 50000, remiseBps: 1000, rabaisMarcheBps: 500 },
      ],
      { marchePublic: true },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 200000,
      total_remises_centimes: 25000,
      net_commercial_ht_centimes: 175000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 175000,
      total_tva_centimes: 33250,
      total_ttc_centimes: 208250,
      net_a_payer_centimes: 208250,
      ajustement_ecart_audit: null,
    })
  })

  it('cas 5 — écart d’arrondi POSITIF appliqué à la ligne éligible la plus élevée (marché public)', () => {
    // Deux lignes de brut 10, rabais 5 % : rabais ligne = round(0,5) = 1 chacune → Σ = 2.
    // Rabais théorique sur total = round(20 × 5 %) = round(1,0) = 1 → écart = +1 centime.
    // Somme des nets arrondis (18) < total HT attendu (19) : +1 appliqué à la ligne éligible
    // (net le plus élevé ; égalité → première ligne). Total HT = 19 ; TVA 19 % = 4 ; TTC = 23.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 10, remiseBps: 0, rabaisMarcheBps: 500 },
        { quantiteMilliemes: 1000, puHtCentimes: 10, remiseBps: 0, rabaisMarcheBps: 500 },
      ],
      { marchePublic: true },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 20,
      total_remises_centimes: 1,
      net_commercial_ht_centimes: 19,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 19,
      total_tva_centimes: 4,
      total_ttc_centimes: 23,
      net_a_payer_centimes: 23,
      ajustement_ecart_audit:
        "ajustement d'arrondi rabais marché : écart 1 centime(s) positif, " +
        'appliqué à la ligne éligible la plus élevée (ligne 1, montant net 9 centimes).',
    })
  })

  it('cas 6 — écart d’arrondi NÉGATIF appliqué à la ligne éligible la plus élevée (marché public)', () => {
    // Deux lignes de brut 8, rabais 5 % : rabais ligne = round(0,4) = 0 chacune → Σ = 0.
    // Rabais théorique sur total = round(16 × 5 %) = round(0,8) = 1 → écart = −1 centime.
    // Somme des nets arrondis (16) > total HT attendu (15) : −1 retranché de la ligne éligible
    // la plus élevée. Total HT = 15 ; TVA 19 % = 3 ; TTC = 18.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 8, remiseBps: 0, rabaisMarcheBps: 500 },
        { quantiteMilliemes: 1000, puHtCentimes: 8, remiseBps: 0, rabaisMarcheBps: 500 },
      ],
      { marchePublic: true },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 16,
      total_remises_centimes: 1,
      net_commercial_ht_centimes: 15,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 15,
      total_tva_centimes: 3,
      total_ttc_centimes: 18,
      net_a_payer_centimes: 18,
      ajustement_ecart_audit:
        "ajustement d'arrondi rabais marché : écart 1 centime(s) négatif, " +
        'appliqué à la ligne éligible la plus élevée (ligne 1, montant net 8 centimes).',
    })
  })

  it('cas 7 — document privé : aucun ajustement automatique, AJUSTEMENT_ARRONDI jamais créée, écart constaté', () => {
    // Mêmes lignes que le cas 5, mais document privé : le moteur n’applique pas l’écart —
    // la ligne AJUSTEMENT_ARRONDI reste optionnelle (saisie manuelle) et n’est jamais créée.
    // Total HT = somme des nets non ajustés = 18 ; TVA 19 % = 3 ; TTC = 21 ; l’écart est tracé.
    const avecEcart = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 10, remiseBps: 0, rabaisMarcheBps: 500 },
        { quantiteMilliemes: 1000, puHtCentimes: 10, remiseBps: 0, rabaisMarcheBps: 500 },
      ],
      { marchePublic: false },
    )
    expect(avecEcart.total_ht_centimes).toBe(18)
    expect(avecEcart.net_a_payer_centimes).toBe(21)
    expect(avecEcart.ajustement_ecart_audit).toBe(
      "ajustement d'arrondi rabais marché : écart 1 centime(s) positif, " +
        'constaté non ajusté (document privé, ligne AJUSTEMENT_ARRONDI optionnelle).',
    )

    // Écart nul → aucune trace d’ajustement (aucune ligne créée).
    const sansEcart = pied([ligneSimple(10000)], { marchePublic: false })
    expect(sansEcart.ajustement_ecart_audit).toBeNull()
  })

  it('cas 8 — NET À PAYER = total TTC, aucun droit de timbre dans le pied', () => {
    // 500,00 DA HT ; TVA 19 % = 95,00 DA ; TTC = 59 500 centimes.
    // Même pour un règlement en espèces (ancien déclencheur du timbre), le pied ne comporte
    // plus de droit de timbre : NET À PAYER = 59 500 strictement (§4.4.6, §4.7.3).
    const resultat = pied([ligneSimple(50000)])
    expect(resultat.total_ttc_centimes).toBe(59500)
    expect(resultat.net_a_payer_centimes).toBe(59500)
    expect('droit_timbre_centimes' in resultat).toBe(false)
  })

  it('cas 9 — taux de TVA 19 % par défaut et paramétrable', () => {
    // 1 000,00 DA HT : TVA 0 % → TTC = 100 000 ; par défaut 19 % → TVA 19 000, TTC = 119 000.
    const sansTva = pied([ligneSimple(100000)], { tauxTvaBps: 0 })
    expect(sansTva.total_tva_centimes).toBe(0)
    expect(sansTva.net_a_payer_centimes).toBe(100000)

    const avecTva = pied([ligneSimple(100000)])
    expect(avecTva.total_tva_centimes).toBe(19000)
    expect(avecTva.net_a_payer_centimes).toBe(119000)
  })

  it('cas 10 — au centime près : arrondi half-up ligne par ligne (qte × PU à 0,5 centime)', () => {
    // Ligne 1 : 2,5 × 1 = 2,5 centimes → arrondi half-up → 3.
    // Ligne 2 : 1,5 × 1 = 1,5 centime → arrondi half-up → 2.
    // Sans arrondi ligne par ligne le total serait 4 (2,5 + 1,5), pas 5.
    // Total HT = 5 ; TVA 19 % = 1 ; TTC = 6 ; net à payer = 6.
    const resultat = pied(
      [
        { quantiteMilliemes: 2500, puHtCentimes: 1, remiseBps: 0, rabaisMarcheBps: 0 },
        { quantiteMilliemes: 1500, puHtCentimes: 1, remiseBps: 0, rabaisMarcheBps: 0 },
      ],
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 5,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 5,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 5,
      total_tva_centimes: 1,
      total_ttc_centimes: 6,
      net_a_payer_centimes: 6,
      ajustement_ecart_audit: null,
    })
  })
})

describe('calculerPiedFacture — cas limites', () => {
  it('lignes vides → tous les totaux à 0, aucune trace d’ajustement', () => {
    const resultat = pied([])
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 0,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 0,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 0,
      total_tva_centimes: 0,
      total_ttc_centimes: 0,
      net_a_payer_centimes: 0,
      ajustement_ecart_audit: null,
    })
  })

  it('le remboursement d’avance peut dépasser le net commercial : total HT négatif autorisé (cas réel géré en saisie)', () => {
    // HT lignes = 100,00 DA ; avance 150,00 DA → total HT = 10 000 − 15 000 = −5 000.
    // TVA 19 % = −950 ; TTC = −5 950 ; net à payer = −5 950.
    const resultat = pied([ligneSimple(10000)], { remboursementAvanceCentimes: 15000 })
    expect(resultat.total_ht_centimes).toBe(-5000)
    expect(resultat.total_tva_centimes).toBe(-950)
    expect(resultat.net_a_payer_centimes).toBe(-5950)
  })

  it('un rabais marché à 0 % ne crée aucun écart d’arrondi', () => {
    // Des lignes sans rabais marché : le taux 0 ne rend aucune ligne éligible,
    // l’écart est nul et aucune trace d’ajustement n’est retournée.
    const resultat = pied([ligneSimple(100000), ligneSimple(200000)], { marchePublic: true })
    expect(resultat.ajustement_ecart_audit).toBeNull()
    expect(resultat.net_a_payer_centimes).toBe(357000)
  })
})

describe('calculerPiedFacture — paramétrage, aucun taux en dur', () => {
  it('la retenue de garantie et la TVA sont reçues en paramètres (défauts non figés)', () => {
    const resultat = pied([ligneSimple(100000)], { retenueGarantieBps: 1000, tauxTvaBps: 0 })
    // Retenue 10 % = 10 000 → total HT = 90 000 ; TVA 0 % → TTC = 90 000.
    expect(resultat.retenue_garantie_centimes).toBe(10000)
    expect(resultat.net_a_payer_centimes).toBe(90000)
  })
})

describe('calculerPiedFacture — entrées invalides', () => {
  const ligneValide: DonneesLignePied = { quantiteMilliemes: 1000, puHtCentimes: 10000, remiseBps: 0, rabaisMarcheBps: 0 }

  it('refuse une quantité négative', () => {
    expect(() => pied([{ ...ligneValide, quantiteMilliemes: -1 }])).toThrow(TypeError)
  })

  it('refuse un prix unitaire négatif', () => {
    expect(() => pied([{ ...ligneValide, puHtCentimes: -1 }])).toThrow(TypeError)
  })

  it('refuse une remise de ligne hors [0, 10000] bps', () => {
    expect(() => pied([{ ...ligneValide, remiseBps: 10001 }])).toThrow(TypeError)
    expect(() => pied([{ ...ligneValide, remiseBps: -1 }])).toThrow(TypeError)
  })

  it('refuse un rabais marché de ligne hors [0, 10000] bps', () => {
    expect(() => pied([{ ...ligneValide, rabaisMarcheBps: 10001 }])).toThrow(TypeError)
    expect(() => pied([{ ...ligneValide, rabaisMarcheBps: -1 }])).toThrow(TypeError)
  })

  it('refuse une retenue de garantie hors [0, 10000] bps', () => {
    expect(() => pied([ligneValide], { retenueGarantieBps: 10001 })).toThrow(TypeError)
    expect(() => pied([ligneValide], { retenueGarantieBps: -1 })).toThrow(TypeError)
  })

  it('refuse un taux de TVA hors [0, 10000] bps', () => {
    expect(() => pied([ligneValide], { tauxTvaBps: 10001 })).toThrow(TypeError)
    expect(() => pied([ligneValide], { tauxTvaBps: -1 })).toThrow(TypeError)
  })

  it('refuse un remboursement d’avance négatif', () => {
    expect(() => pied([ligneValide], { remboursementAvanceCentimes: -1 })).toThrow(TypeError)
  })
})
