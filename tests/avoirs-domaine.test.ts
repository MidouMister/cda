import { describe, expect, it } from 'vitest'
import {
  validerDonneesAvoir,
  validerSelectionsPartielles,
  validerSelectionsParLignes,
  genererLignesAvoir,
  type LigneFactureOrigine,
  type ModeAvoir,
} from '../domaine/avoir'

const LIGNE_1: LigneFactureOrigine = {
  id: 1,
  designation: 'Fondations',
  unite: 'm³',
  quantite_milliemes: 1000,
  pu_ht_centimes: 50000,
  remise_bps: 0,
  rabais_marche_bps: 0,
  montant_ht_net_centimes: 50000,
}

const LIGNE_2: LigneFactureOrigine = {
  id: 2,
  designation: 'Armatures',
  unite: 'kg',
  quantite_milliemes: 2000,
  pu_ht_centimes: 12000,
  remise_bps: 500,
  rabais_marche_bps: 0,
  montant_ht_net_centimes: 22800,
}

const LIGNE_3: LigneFactureOrigine = {
  id: 3,
  designation: 'Béton',
  unite: 'm³',
  quantite_milliemes: 500,
  pu_ht_centimes: 75000,
  remise_bps: 0,
  rabais_marche_bps: 1000,
  montant_ht_net_centimes: 33750,
}

const LIGNE_MONTANT_NEGATIF: LigneFactureOrigine = {
  id: 10,
  designation: 'Rabais commercial',
  unite: 'F',
  quantite_milliemes: 1,
  pu_ht_centimes: -150000,
  remise_bps: 0,
  rabais_marche_bps: 0,
  montant_ht_net_centimes: -150000,
}

function baseParams() {
  return {
    factureOrigineId: 1,
    motifAvoir: 'Retour matériaux',
    modeAvoir: 'TOTAL' as const,
  }
}

// ── validerDonneesAvoir ─────────────────────────────────────────────

describe('validerDonneesAvoir', () => {
  it('1 — motif vide → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), motifAvoir: '' }),
    ).toThrow(TypeError)
  })

  it('2 — motif = 2 caractères → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), motifAvoir: 'AB' }),
    ).toThrow(TypeError)
  })

  it('3 — factureOrigineId = 0 → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), factureOrigineId: 0 }),
    ).toThrow(TypeError)
  })

  it('4 — factureOrigineId négatif → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), factureOrigineId: -5 }),
    ).toThrow(TypeError)
  })

  it('5 — modeAvoir inconnu → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), modeAvoir: 'BIDON' as unknown as ModeAvoir }),
    ).toThrow(TypeError)
  })

  it('6 — PAR_LIGNES sans sélections → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), modeAvoir: 'PAR_LIGNES', selections: undefined }),
    ).toThrow(TypeError)
  })

  it('7 — PARTIEL avec sélections vide → erreur', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), modeAvoir: 'PARTIEL', selections: [] }),
    ).toThrow(TypeError)
  })

  it('8 — PARTIEL avec quantiteMilliemes = 0 → erreur', () => {
    expect(() =>
      validerDonneesAvoir({
        ...baseParams(),
        modeAvoir: 'PARTIEL',
        selections: [{ ligneOrigineId: 1, quantiteMilliemes: 0 }],
      }),
    ).toThrow(TypeError)
  })

  it('9 — doublon de ligneOrigineId → erreur', () => {
    expect(() =>
      validerDonneesAvoir({
        ...baseParams(),
        modeAvoir: 'PARTIEL',
        selections: [
          { ligneOrigineId: 1, quantiteMilliemes: 500 },
          { ligneOrigineId: 1, quantiteMilliemes: 200 },
        ],
      }),
    ).toThrow(TypeError)
  })

  it('10 — TOTAL avec sélections absentes → OK', () => {
    expect(() =>
      validerDonneesAvoir({ ...baseParams(), modeAvoir: 'TOTAL', selections: undefined }),
    ).not.toThrow()
  })

  it('11 — sélections avec ligneOrigineId = 0 → erreur', () => {
    expect(() =>
      validerDonneesAvoir({
        ...baseParams(),
        modeAvoir: 'PARTIEL',
        selections: [{ ligneOrigineId: 0, quantiteMilliemes: 100 }],
      }),
    ).toThrow(TypeError)
  })
})

// ── validerSelectionsPartielles ─────────────────────────────────────

describe('validerSelectionsPartielles', () => {
  it('12 — quantiteMilliemes >= quantite origine → erreur', () => {
    expect(() =>
      validerSelectionsPartielles(
        [{ ligneOrigineId: 1, quantiteMilliemes: 1500 }],
        [LIGNE_1],
      ),
    ).toThrow(TypeError)
  })

  it('13 — quantiteMilliemes = quantite origine → erreur (strictement inférieur)', () => {
    expect(() =>
      validerSelectionsPartielles(
        [{ ligneOrigineId: 1, quantiteMilliemes: 1000 }],
        [LIGNE_1],
      ),
    ).toThrow(TypeError)
  })

  it('14 — ligneOrigineId inexistant → erreur', () => {
    expect(() =>
      validerSelectionsPartielles(
        [{ ligneOrigineId: 999, quantiteMilliemes: 500 }],
        [LIGNE_1],
      ),
    ).toThrow(TypeError)
  })
})

// ── validerSelectionsParLignes ──────────────────────────────────────

describe('validerSelectionsParLignes', () => {
  it('15 — quantiteMilliemes ≠ quantite origine → erreur', () => {
    expect(() =>
      validerSelectionsParLignes(
        [{ ligneOrigineId: 1, quantiteMilliemes: 999 }],
        [LIGNE_1],
      ),
    ).toThrow(TypeError)
  })

  it('16 — ligneOrigineId inexistant → erreur', () => {
    expect(() =>
      validerSelectionsParLignes(
        [{ ligneOrigineId: 999, quantiteMilliemes: 1000 }],
        [LIGNE_1],
      ),
    ).toThrow(TypeError)
  })
})

// ── genererLignesAvoir ──────────────────────────────────────────────

describe('genererLignesAvoir', () => {
  it('17 — TOTAL — 3 lignes → 3 lignes avec quantités négatives', () => {
    const result = genererLignesAvoir([LIGNE_1, LIGNE_2, LIGNE_3], 'TOTAL')

    expect(result).toHaveLength(3)
    expect(result[0].quantite_milliemes).toBe(-1000)
    expect(result[1].quantite_milliemes).toBe(-2000)
    expect(result[2].quantite_milliemes).toBe(-500)
  })

  it('18 — PAR_LIGNES — sélection de 2 lignes sur 3 → 2 lignes', () => {
    const result = genererLignesAvoir([LIGNE_1, LIGNE_2, LIGNE_3], 'PAR_LIGNES', [
      { ligneOrigineId: 1, quantiteMilliemes: 1000 },
      { ligneOrigineId: 3, quantiteMilliemes: 500 },
    ])

    expect(result).toHaveLength(2)
    expect(result[0].quantite_milliemes).toBe(-1000)
    expect(result[1].quantite_milliemes).toBe(-500)
  })

  it('19 — PARTIEL — 1 ligne avec quantité réduite → 1 ligne avec quantité négative', () => {
    const result = genererLignesAvoir([LIGNE_1, LIGNE_2], 'PARTIEL', [
      { ligneOrigineId: 1, quantiteMilliemes: 300 },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].quantite_milliemes).toBe(-300)
    expect(result[0].designation).toBe('Fondations')
  })

  it('20 — absence d\'effet sur les données d\'origine (non-mutation)', () => {
    const originales = [LIGNE_1, LIGNE_2]
    const copie = originales.map((l) => ({ ...l }))

    genererLignesAvoir(originales, 'TOTAL')

    expect(originales[0].quantite_milliemes).toBe(copie[0].quantite_milliemes)
    expect(originales[1].quantite_milliemes).toBe(copie[1].quantite_milliemes)
  })

  it('21 — TOTAL — lignes avec montants négatifs → quantités négatives préservées', () => {
    const result = genererLignesAvoir([LIGNE_MONTANT_NEGATIF], 'TOTAL')

    expect(result).toHaveLength(1)
    expect(result[0].quantite_milliemes).toBe(-1)
    expect(result[0].pu_ht_centimes).toBe(-150000)
  })
})
