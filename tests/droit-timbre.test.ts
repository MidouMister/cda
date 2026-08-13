import { describe, expect, it } from 'vitest'
import {
  calculerDroitTimbre,
  type ModeReglement,
  type TrancheTimbre,
} from '../domaine/droit-timbre'

const BAREME_SEED: TrancheTimbre[] = [
  { borneMinTtcCentimes: 0, borneMaxTtcCentimes: 30000, tauxBps: 0, plancherCentimes: 500, plafondCentimes: 1000000 },
  { borneMinTtcCentimes: 30000, borneMaxTtcCentimes: 3000000, tauxBps: 100, plancherCentimes: 500, plafondCentimes: 1000000 },
  { borneMinTtcCentimes: 3000000, borneMaxTtcCentimes: 10000000, tauxBps: 150, plancherCentimes: 500, plafondCentimes: 1000000 },
  { borneMinTtcCentimes: 10000000, borneMaxTtcCentimes: null, tauxBps: 200, plancherCentimes: 500, plafondCentimes: 1000000 },
]

const SEUIL_ESPECES = 100_000_000

const timbre = (
  montantTtcCentimes: number,
  modeReglement: ModeReglement = 'ESPECES',
  barème: TrancheTimbre[] = BAREME_SEED,
  seuilMaxEspecesCentimes: number = SEUIL_ESPECES,
): number =>
  calculerDroitTimbre({
    montantTtcCentimes,
    modeReglement,
    barème,
    seuilMaxEspecesCentimes,
  })

describe('calculerDroitTimbre — une tranche par montant (barème de départ)', () => {
  it('tranche 1 exonérée : 250 DA → 0', () => {
    expect(timbre(25000)).toBe(0)
  })

  it('tranche 2 : 500 DA → 1 % = 5 DA', () => {
    expect(timbre(50000)).toBe(500)
  })

  it('tranche 3 : 50 000 DA → 1,5 % = 750 DA', () => {
    expect(timbre(5_000_000)).toBe(75_000)
  })

  it('tranche 4 : 200 000 DA → 2 % = 4 000 DA', () => {
    expect(timbre(20_000_000)).toBe(400_000)
  })

  it('montant nul → 0', () => {
    expect(timbre(0)).toBe(0)
  })
})

describe('calculerDroitTimbre — plancher', () => {
  it('300 DA (1 % = 3 DA) porté au plancher de 5 DA', () => {
    expect(timbre(30000)).toBe(500)
  })

  it('300,01 DA (1 % ≈ 3 DA) porté au plancher de 5 DA', () => {
    expect(timbre(30001)).toBe(500)
  })
})

describe('calculerDroitTimbre — plafond', () => {
  it('600 000 DA (2 % = 12 000 DA) plafonné à 10 000 DA', () => {
    expect(timbre(60_000_000)).toBe(1_000_000)
  })

  it('500 000 DA (2 % = 10 000 DA) atteint le plafond sans le dépasser', () => {
    expect(timbre(50_000_000)).toBe(1_000_000)
  })
})

describe('calculerDroitTimbre — exonération sous 300 DA', () => {
  it('299,99 DA exonéré → 0', () => {
    expect(timbre(29999)).toBe(0)
  })

  it('250 DA exonéré → 0', () => {
    expect(timbre(25000)).toBe(0)
  })

  it('juste au-dessus de la borne (300,01 DA) → tranche suivante et plancher', () => {
    expect(timbre(30001)).toBe(500)
  })
})

describe('calculerDroitTimbre — jamais de timbre hors espèces', () => {
  const MODES_SANS_TIMBRE: ModeReglement[] = ['VIREMENT', 'CHEQUE', 'TRAITE', 'LCN']

  it.each(MODES_SANS_TIMBRE)('%s → 0 même sur un montant élevé', (mode) => {
    expect(timbre(50_000_000, mode)).toBe(0)
  })
})

describe('calculerDroitTimbre — seuil des espèces', () => {
  it('au-delà de 1 000 000 DA en espèces → 0', () => {
    expect(timbre(100_000_100)).toBe(0)
  })

  it('à exactement 1 000 000 DA le timbre reste dû', () => {
    expect(timbre(100_000_000)).toBe(1_000_000)
  })
})

describe('calculerDroitTimbre — bornes de tranches (borneMin incluse, borneMax exclue)', () => {
  it('30 000 centimes (300 DA) appartient à la tranche suivante, pas à l’exonération', () => {
    expect(timbre(30000)).toBe(500)
  })

  it('3 000 000 centimes (30 000 DA) bascule dans la tranche à 1,5 %', () => {
    expect(timbre(3_000_000)).toBe(45_000)
  })

  it('10 000 000 centimes (100 000 DA) bascule dans la tranche à 2 %', () => {
    expect(timbre(10_000_000)).toBe(200_000)
  })

  it('la borne haute d’un barème custom est exclusive, la basse inclusive', () => {
    const BAREME_CUSTOM: TrancheTimbre[] = [
      { borneMinTtcCentimes: 0, borneMaxTtcCentimes: 50_000, tauxBps: 100, plancherCentimes: 0, plafondCentimes: 100_000 },
      { borneMinTtcCentimes: 50_000, borneMaxTtcCentimes: null, tauxBps: 300, plancherCentimes: 0, plafondCentimes: 500_000 },
    ]
    expect(timbre(40_000, 'ESPECES', BAREME_CUSTOM)).toBe(400)
    expect(timbre(50_000, 'ESPECES', BAREME_CUSTOM)).toBe(1_500)
  })
})

describe('calculerDroitTimbre — arrondi half-up', () => {
  it('500,50 DA à 1 % → 500,5 centimes arrondis à 501', () => {
    expect(timbre(50_050)).toBe(501)
  })

  it('un demi-centime est arrondi au centime supérieur (barème custom)', () => {
    const BAREME_HALF_UP: TrancheTimbre[] = [
      { borneMinTtcCentimes: 0, borneMaxTtcCentimes: null, tauxBps: 5_000, plancherCentimes: 0, plafondCentimes: 100_000_000 },
    ]
    expect(timbre(1, 'ESPECES', BAREME_HALF_UP)).toBe(1)
    expect(timbre(3, 'ESPECES', BAREME_HALF_UP)).toBe(2)
  })
})

describe('calculerDroitTimbre — barème lu depuis les paramètres, jamais en dur', () => {
  const BAREME_3PCT: TrancheTimbre[] = [
    { borneMinTtcCentimes: 0, borneMaxTtcCentimes: null, tauxBps: 300, plancherCentimes: 1_000, plafondCentimes: 1_000_000 },
  ]

  it('un barème à 3 % avec plancher 10 DA est suivi à la lettre', () => {
    expect(timbre(5_000_000, 'ESPECES', BAREME_3PCT)).toBe(150_000)
    expect(timbre(20_000, 'ESPECES', BAREME_3PCT)).toBe(1_000)
  })

  it('les mêmes montants diffèrent du barème de départ : preuve d’absence de constante', () => {
    expect(timbre(5_000_000, 'ESPECES', BAREME_3PCT)).toBe(150_000)
    expect(timbre(5_000_000)).toBe(75_000)
    expect(timbre(20_000, 'ESPECES', BAREME_3PCT)).toBe(1_000)
    expect(timbre(20_000)).toBe(0)
  })
})

describe('calculerDroitTimbre — barème inutilisable', () => {
  it('refuse un barème vide', () => {
    expect(() =>
      calculerDroitTimbre({
        montantTtcCentimes: 50_000,
        modeReglement: 'ESPECES',
        barème: [],
        seuilMaxEspecesCentimes: SEUIL_ESPECES,
      }),
    ).toThrow('aucun barème renseigné')
  })

  it('refuse un montant qui ne tombe dans aucune tranche', () => {
    const barèmeAvecTrou: TrancheTimbre[] = [
      { borneMinTtcCentimes: 0, borneMaxTtcCentimes: 1_000, tauxBps: 100, plancherCentimes: 0, plafondCentimes: 100_000 },
      { borneMinTtcCentimes: 2_000, borneMaxTtcCentimes: null, tauxBps: 100, plancherCentimes: 0, plafondCentimes: 100_000 },
    ]
    expect(() => timbre(1_500, 'ESPECES', barèmeAvecTrou)).toThrow('aucun barème actif')
  })
})
