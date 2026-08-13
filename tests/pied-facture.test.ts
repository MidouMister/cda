import { describe, expect, it } from 'vitest'
import {
  calculerPiedFacture,
  type DonneesLignePied,
  type ParametresPiedFacture,
} from '../domaine/pied-facture'
import type { TrancheTimbre } from '../domaine/droit-timbre'

// Barème de référence (seeds M5, decisions-j0 §1.16.2) :
// tranches 0 / 1 % / 1,5 % / 2 %, plancher 500, plafond 1 000 000, seuil espèces 100 000 000.
const BAREME_SEED: TrancheTimbre[] = [
  { borneMinTtcCentimes: 0, borneMaxTtcCentimes: 30000, tauxBps: 0, plancherCentimes: 500, plafondCentimes: 1000000 },
  { borneMinTtcCentimes: 30000, borneMaxTtcCentimes: 3000000, tauxBps: 100, plancherCentimes: 500, plafondCentimes: 1000000 },
  { borneMinTtcCentimes: 3000000, borneMaxTtcCentimes: 10000000, tauxBps: 150, plancherCentimes: 500, plafondCentimes: 1000000 },
  { borneMinTtcCentimes: 10000000, borneMaxTtcCentimes: null, tauxBps: 200, plancherCentimes: 500, plafondCentimes: 1000000 },
]

const SEUIL_ESPECES = 100_000_000

const pied = (
  lignes: DonneesLignePied[],
  options: Partial<Omit<ParametresPiedFacture, 'lignes'>> = {},
) =>
  calculerPiedFacture({
    lignes,
    rabaisGlobalBps: 0,
    retenueGarantieBps: 0,
    remboursementAvanceCentimes: 0,
    modeReglement: null,
    baremeTimbre: BAREME_SEED,
    seuilMaxEspecesCentimes: SEUIL_ESPECES,
    ...options,
  })

describe('calculerPiedFacture — les 10 cas types de contrôle (§11, DoD J1)', () => {
  it('cas 1 — sans retenue, sans remise, virement : calcul simple', () => {
    // Calcul manuel :
    // ligne 1 : 1 × 125,00 DA = 125,00 DA ; ligne 2 : 1,5 × 100,00 DA = 150,00 DA.
    // Total HT lignes = 27 500 ; TVA 19 % = 5 225 ; TTC = 32 725 ; virement → aucun timbre.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 12500, remiseBps: 0 },
        { quantiteMilliemes: 1500, puHtCentimes: 10000, remiseBps: 0 },
      ],
      { modeReglement: 'VIREMENT' },
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
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 32725,
    })
  })

  it('cas 2 — retenue 5 % sur le net commercial HT, avant la TVA', () => {
    // Retenue 5 % sur net commercial HT (27 500) = 1 375, avant la TVA.
    // Total HT = 27 500 − 1 375 = 26 125 ; TVA 19 % = 4 964 ; TTC = 31 089 ; virement → aucun timbre.
    // (Si la retenue passait après la TVA, la TVA serait de 5 225 — le test verrouille l’ordre §4.4.6.)
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 12500, remiseBps: 0 },
        { quantiteMilliemes: 1500, puHtCentimes: 10000, remiseBps: 0 },
      ],
      { retenueGarantieBps: 500, modeReglement: 'VIREMENT' },
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
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 31089,
    })
  })

  it('cas 3 — espèces : timbre 1 % appliqué sur le TTC', () => {
    // 500,00 DA HT ; TVA 19 % = 95,00 DA ; TTC = 595,00 DA = 59 500 centimes.
    // Timbre espèces : tranche 1 % sur 59 500 → 595 centimes (≥ plancher 500).
    // Net à payer = 59 500 + 595 = 60 095.
    const resultat = pied(
      [{ quantiteMilliemes: 1000, puHtCentimes: 50000, remiseBps: 0 }],
      { modeReglement: 'ESPECES' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 50000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 50000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 50000,
      total_tva_centimes: 9500,
      total_ttc_centimes: 59500,
      droit_timbre_centimes: 595,
      net_a_payer_centimes: 60095,
    })
  })

  it('cas 4 — retenue 5 % et timbre espèces combinés', () => {
    // HT lignes = 400,00 + 200,00 = 600,00 DA ; retenue 5 % = 30,00 DA.
    // Total HT = 570,00 ; TVA 19 % = 108,30 ; TTC = 678,30 DA = 67 830 centimes.
    // Timbre : 1 % de 67 830 = 678 centimes ; net à payer = 67 830 + 678 = 68 508.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 40000, remiseBps: 0 },
        { quantiteMilliemes: 1000, puHtCentimes: 20000, remiseBps: 0 },
      ],
      { retenueGarantieBps: 500, modeReglement: 'ESPECES' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 60000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 60000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 3000,
      total_ht_centimes: 57000,
      total_tva_centimes: 10830,
      total_ttc_centimes: 67830,
      droit_timbre_centimes: 678,
      net_a_payer_centimes: 68508,
    })
  })

  it('cas 5 — remises lignes (5 % et 10 %) + rabais global 2 %', () => {
    // Ligne 1 : brut 100 000 − remise 5 % = 5 000 → 95 000.
    // Ligne 2 : brut 100 000 − remise 10 % = 10 000 → 90 000.
    // Rabais global 2 % sur le total HT lignes (200 000) = 4 000 (base documentée : avant remises lignes).
    // Total remises = 15 000 + 4 000 = 19 000 ; net commercial = 200 000 − 19 000 = 181 000.
    // TVA 19 % = 34 390 ; TTC = 215 390 ; virement → aucun timbre.
    const resultat = pied(
      [
        { quantiteMilliemes: 1000, puHtCentimes: 100000, remiseBps: 500 },
        { quantiteMilliemes: 2000, puHtCentimes: 50000, remiseBps: 1000 },
      ],
      { rabaisGlobalBps: 200, modeReglement: 'VIREMENT' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 200000,
      total_remises_centimes: 19000,
      net_commercial_ht_centimes: 181000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 181000,
      total_tva_centimes: 34390,
      total_ttc_centimes: 215390,
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 215390,
    })
  })

  it('cas 6 — remboursement d’avance : net commercial − avance', () => {
    // HT lignes = 1 000,00 DA ; net commercial = 100 000 centimes.
    // Avance 250,00 DA → total HT = 100 000 − 25 000 = 75 000 (l’avance réduit la base avant TVA).
    // TVA 19 % = 14 250 ; TTC = 89 250 ; virement → aucun timbre.
    const resultat = pied(
      [{ quantiteMilliemes: 1000, puHtCentimes: 100000, remiseBps: 0 }],
      { remboursementAvanceCentimes: 25000, modeReglement: 'VIREMENT' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 100000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 100000,
      remboursement_avance_centimes: 25000,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 75000,
      total_tva_centimes: 14250,
      total_ttc_centimes: 89250,
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 89250,
    })
  })

  it('cas 7 — arrondi ligne par ligne : qte × PU à 0,5 centime arrondi au supérieur', () => {
    // Ligne 1 : 1 × 2,5 = 2,5 centimes → arrondi half-up → 3.
    // Ligne 2 : 1 × 1,5 = 1,5 centime → arrondi half-up → 2.
    // Sans arrondi ligne par ligne le total serait 4 (2,5 + 1,5), pas 5 : le total dépend des arrondis de ligne.
    // Total HT = 5 ; TVA 19 % = 1 ; TTC = 6 ; net à payer = 6.
    const resultat = pied(
      [
        { quantiteMilliemes: 2500, puHtCentimes: 1, remiseBps: 0 },
        { quantiteMilliemes: 1500, puHtCentimes: 1, remiseBps: 0 },
      ],
      { modeReglement: 'VIREMENT' },
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
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 6,
    })
  })

  it('cas 8 — timbre au plancher : TTC faible en espèces → plancher 500 centimes', () => {
    // 400,00 DA HT ; TVA 19 % = 76,00 ; TTC = 476,00 DA = 47 600 centimes.
    // Tranche 1 % → 476 centimes, inférieur au plancher 500 → porté à 500.
    // Net à payer = 47 600 + 500 = 48 100.
    const resultat = pied(
      [{ quantiteMilliemes: 1000, puHtCentimes: 40000, remiseBps: 0 }],
      { modeReglement: 'ESPECES' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 40000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 40000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 40000,
      total_tva_centimes: 7600,
      total_ttc_centimes: 47600,
      droit_timbre_centimes: 500,
      net_a_payer_centimes: 48100,
    })
  })

  it('cas 9 — timbre au plafond : gros montant en espèces sous le seuil', () => {
    // 480 000,00 DA HT ; TVA 19 % = 91 200,00 ; TTC = 571 200,00 DA = 57 120 000 centimes.
    // Tranche 2 % → 1 142 400 centimes, plafonné à 1 000 000.
    // TTC 57 120 000 < seuil 100 000 000 → timbre dû.
    // Net à payer = 57 120 000 + 1 000 000 = 58 120 000.
    const resultat = pied(
      [{ quantiteMilliemes: 1000, puHtCentimes: 48_000_000, remiseBps: 0 }],
      { modeReglement: 'ESPECES' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 48_000_000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 48_000_000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 48_000_000,
      total_tva_centimes: 9_120_000,
      total_ttc_centimes: 57_120_000,
      droit_timbre_centimes: 1_000_000,
      net_a_payer_centimes: 58_120_000,
    })
  })

  it('cas 10 — chèque : aucun timbre, même sur un montant élevé', () => {
    // 600 000,00 DA HT ; TVA 19 % = 114 000,00 ; TTC = 714 000,00 DA = 71 400 000 centimes.
    // Mode chèque → jamais de timbre (règle §16.2). Net à payer = 71 400 000.
    const resultat = pied(
      [{ quantiteMilliemes: 1000, puHtCentimes: 60_000_000, remiseBps: 0 }],
      { modeReglement: 'CHEQUE' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 60_000_000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 60_000_000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 60_000_000,
      total_tva_centimes: 11_400_000,
      total_ttc_centimes: 71_400_000,
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 71_400_000,
    })
  })

  it('cas 10 bis — espèces au-delà du seuil de 1 000 000 DA : timbre 0, pied cohérent', () => {
    // 850 000,00 DA HT ; TVA 19 % = 161 500,00 ; TTC = 1 011 500,00 DA = 101 150 000 centimes.
    // Au-delà du seuil de caisse (100 000 000) : aucun timbre. Net à payer = 101 150 000.
    const resultat = pied(
      [{ quantiteMilliemes: 1000, puHtCentimes: 85_000_000, remiseBps: 0 }],
      { modeReglement: 'ESPECES' },
    )
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 85_000_000,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 85_000_000,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 85_000_000,
      total_tva_centimes: 16_150_000,
      total_ttc_centimes: 101_150_000,
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 101_150_000,
    })
  })
})

describe('calculerPiedFacture — cas limites', () => {
  it('lignes vides → tous les totaux à 0, timbre calculé sur 0', () => {
    const resultat = pied([], { modeReglement: 'ESPECES' })
    expect(resultat).toEqual({
      total_ht_lignes_centimes: 0,
      total_remises_centimes: 0,
      net_commercial_ht_centimes: 0,
      remboursement_avance_centimes: 0,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 0,
      total_tva_centimes: 0,
      total_ttc_centimes: 0,
      droit_timbre_centimes: 0,
      net_a_payer_centimes: 0,
    })
  })

  it('mode de règlement non renseigné (null) → aucun timbre', () => {
    // 500,00 DA HT, TTC = 595,00 DA — sans mode renseigné, jamais de timbre.
    const resultat = pied([{ quantiteMilliemes: 1000, puHtCentimes: 50000, remiseBps: 0 }])
    expect(resultat.droit_timbre_centimes).toBe(0)
    expect(resultat.net_a_payer_centimes).toBe(59500)
  })

  it('le remboursement d’avance peut dépasser le net commercial : total HT négatif autorisé (cas réel géré en saisie)', () => {
    // HT lignes = 100,00 DA ; avance 150,00 DA → total HT = 10 000 − 15 000 = −5 000.
    // TVA 19 % = −950 ; TTC = −5 950 ; net à payer = −5 950.
    const resultat = pied([{ quantiteMilliemes: 1000, puHtCentimes: 10000, remiseBps: 0 }], {
      remboursementAvanceCentimes: 15000,
    })
    expect(resultat.total_ht_centimes).toBe(-5000)
    expect(resultat.total_tva_centimes).toBe(-950)
    expect(resultat.net_a_payer_centimes).toBe(-5950)
  })
})

describe('calculerPiedFacture — paramétrage, aucun taux ni barème en dur', () => {
  it('le taux de TVA est reçu en paramètre (défaut 19 %)', () => {
    // 100,00 DA HT : avec TVA 0 % → TTC = 10 000 ; par défaut 19 % → TVA 1 900, TTC = 11 900.
    const sansTva = pied([{ quantiteMilliemes: 1000, puHtCentimes: 10000, remiseBps: 0 }], { tauxTvaBps: 0 })
    expect(sansTva.total_tva_centimes).toBe(0)
    expect(sansTva.net_a_payer_centimes).toBe(10000)

    const avecTva = pied([{ quantiteMilliemes: 1000, puHtCentimes: 10000, remiseBps: 0 }])
    expect(avecTva.total_tva_centimes).toBe(1900)
    expect(avecTva.net_a_payer_centimes).toBe(11900)
  })

  it('le barème du timbre est reçu en paramètre : un barème modifié change le pied', () => {
    // Barème alternatif 3 % sur tout : TTC = 595,00 DA → timbre 1 785 centimes (au lieu de 595).
    const barèmeAlternatif: TrancheTimbre[] = [
      { borneMinTtcCentimes: 0, borneMaxTtcCentimes: null, tauxBps: 300, plancherCentimes: 1000, plafondCentimes: 100_000_000 },
    ]
    const resultat = calculerPiedFacture({
      lignes: [{ quantiteMilliemes: 1000, puHtCentimes: 50000, remiseBps: 0 }],
      rabaisGlobalBps: 0,
      retenueGarantieBps: 0,
      remboursementAvanceCentimes: 0,
      modeReglement: 'ESPECES',
      baremeTimbre: barèmeAlternatif,
      seuilMaxEspecesCentimes: SEUIL_ESPECES,
    })
    expect(resultat.droit_timbre_centimes).toBe(1785)
    expect(resultat.net_a_payer_centimes).toBe(59500 + 1785)
  })
})

describe('calculerPiedFacture — entrées invalides', () => {
  const ligneValide: DonneesLignePied = { quantiteMilliemes: 1000, puHtCentimes: 10000, remiseBps: 0 }

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

  it('refuse un rabais global hors [0, 10000] bps', () => {
    expect(() => pied([ligneValide], { rabaisGlobalBps: 10001 })).toThrow(TypeError)
    expect(() => pied([ligneValide], { rabaisGlobalBps: -1 })).toThrow(TypeError)
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
