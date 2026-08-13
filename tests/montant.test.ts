import { describe, expect, it } from 'vitest'
import { Montant, arrondirHalfUp, montantDepuisBps } from '../domaine/montant'

describe('Montant — construction', () => {
  it('se construit depuis un entier positif', () => {
    expect(Montant.depuisCentimes(123456).centimes).toBe(123456)
  })

  it('se construit depuis zéro et un entier négatif', () => {
    expect(Montant.depuisCentimes(0).centimes).toBe(0)
    expect(Montant.depuisCentimes(-50).centimes).toBe(-50)
  })

  it('refuse un flottant', () => {
    expect(() => Montant.depuisCentimes(10.5)).toThrow(TypeError)
    expect(() => Montant.depuisCentimes(0.1)).toThrow(TypeError)
    expect(() => Montant.depuisCentimes(-3.14)).toThrow(TypeError)
  })

  it('refuse NaN et l’infini', () => {
    expect(() => Montant.depuisCentimes(NaN)).toThrow(TypeError)
    expect(() => Montant.depuisCentimes(Infinity)).toThrow(TypeError)
    expect(() => Montant.depuisCentimes(-Infinity)).toThrow(TypeError)
  })

  it('refuse les valeurs non numériques', () => {
    expect(() => Montant.depuisCentimes(null as unknown as number)).toThrow(TypeError)
    expect(() => Montant.depuisCentimes('10' as unknown as number)).toThrow(TypeError)
  })
})

describe('Montant — arithmétique', () => {
  it('additionne', () => {
    expect(Montant.depuisCentimes(100).additionner(Montant.depuisCentimes(25)).centimes).toBe(125)
  })

  it('soustrait, y compris en négatif', () => {
    expect(Montant.depuisCentimes(50).soustraire(Montant.depuisCentimes(30)).centimes).toBe(20)
    expect(Montant.depuisCentimes(20).soustraire(Montant.depuisCentimes(50)).centimes).toBe(-30)
    expect(Montant.depuisCentimes(-10).soustraire(Montant.depuisCentimes(-25)).centimes).toBe(15)
  })

  it('oppose et prend l’absolu', () => {
    expect(Montant.depuisCentimes(123).opposer().centimes).toBe(-123)
    expect(Montant.depuisCentimes(-123).opposer().centimes).toBe(123)
    expect(Montant.depuisCentimes(-45).absolu().centimes).toBe(45)
  })
})

describe('Montant — appliquerTauxBps (half-up)', () => {
  it('calcule 19 % de 1 234 567 centimes', () => {
    expect(Montant.depuisCentimes(1234567).appliquerTauxBps(1900).centimes).toBe(234568)
  })

  it('arrondit 1,5 % de 1 234 567 centimes vers le haut', () => {
    expect(Montant.depuisCentimes(1234567).appliquerTauxBps(150).centimes).toBe(18519)
  })

  it('arrondit les demi-centimes vers +∞ (half-up), positifs et négatifs', () => {
    expect(Montant.depuisCentimes(1).appliquerTauxBps(5000).centimes).toBe(1)
    expect(Montant.depuisCentimes(-1).appliquerTauxBps(5000).centimes).toBe(0)
    expect(Montant.depuisCentimes(3).appliquerTauxBps(5000).centimes).toBe(2)
    expect(Montant.depuisCentimes(-3).appliquerTauxBps(5000).centimes).toBe(-1)
    expect(Montant.depuisCentimes(3333).appliquerTauxBps(150).centimes).toBe(50)
  })

  it('gère le taux zéro et le taux 100 %', () => {
    expect(Montant.depuisCentimes(777).appliquerTauxBps(0).centimes).toBe(0)
    expect(Montant.depuisCentimes(777).appliquerTauxBps(10000).centimes).toBe(777)
  })

  it('refuse un taux non entier', () => {
    expect(() => Montant.depuisCentimes(100).appliquerTauxBps(1900.5)).toThrow(TypeError)
  })
})

describe('Montant — foisQuantiteMilliemes', () => {
  it('calcule 12,5 t × 150 DA = 1 875,00 DA', () => {
    expect(Montant.depuisCentimes(15000).foisQuantiteMilliemes(12500).centimes).toBe(187500)
  })

  it('arrondit half-up au centime', () => {
    expect(Montant.depuisCentimes(1).foisQuantiteMilliemes(500).centimes).toBe(1)
    expect(Montant.depuisCentimes(1).foisQuantiteMilliemes(250).centimes).toBe(0)
    expect(Montant.depuisCentimes(1).foisQuantiteMilliemes(750).centimes).toBe(1)
    expect(Montant.depuisCentimes(1).foisQuantiteMilliemes(999).centimes).toBe(1)
    expect(Montant.depuisCentimes(1).foisQuantiteMilliemes(499).centimes).toBe(0)
    expect(Montant.depuisCentimes(-1).foisQuantiteMilliemes(500).centimes).toBe(0)
  })

  it('refuse une quantité non entière', () => {
    expect(() => Montant.depuisCentimes(100).foisQuantiteMilliemes(12.5)).toThrow(TypeError)
  })
})

describe('Montant — formatEnDinars', () => {
  it('formate avec groupement des milliers et virgule décimale', () => {
    expect(Montant.depuisCentimes(123456).formatEnDinars()).toBe('1 234,56 DA')
    expect(Montant.depuisCentimes(100).formatEnDinars()).toBe('1,00 DA')
    expect(Montant.depuisCentimes(5).formatEnDinars()).toBe('0,05 DA')
    expect(Montant.depuisCentimes(0).formatEnDinars()).toBe('0,00 DA')
    expect(Montant.depuisCentimes(1000000).formatEnDinars()).toBe('10 000,00 DA')
    expect(Montant.depuisCentimes(-123456).formatEnDinars()).toBe('-1 234,56 DA')
  })
})

describe('Montant — pas de dérive de flottant', () => {
  it('une chaîne de dix additions de 0,10 DA reste exacte', () => {
    let total = Montant.depuisCentimes(0)
    for (let i = 0; i < 10; i += 1) {
      total = total.additionner(Montant.depuisCentimes(10))
    }
    expect(total.centimes).toBe(100)
    expect(total.formatEnDinars()).toBe('1,00 DA')
  })

  it('0,10 DA + 0,20 DA vaut exactement 0,30 DA', () => {
    const total = Montant.depuisCentimes(10).additionner(Montant.depuisCentimes(20))
    expect(total.centimes).toBe(30)
    expect(total.formatEnDinars()).toBe('0,30 DA')
  })

  it('une suite de taux successifs reste déterministe au centime', () => {
    const base = Montant.depuisCentimes(1234567)
    const apresTva = base.appliquerTauxBps(1900)
    const apresRetenue = apresTva.appliquerTauxBps(500)
    expect(apresTva.centimes).toBe(234568)
    expect(apresRetenue.centimes).toBe(11728)
  })
})

describe('Montant — comparaisons', () => {
  it('compare deux montants', () => {
    const un = Montant.depuisCentimes(100)
    const deux = Montant.depuisCentimes(200)
    expect(un.estEgal(Montant.depuisCentimes(100))).toBe(true)
    expect(un.estEgal(deux)).toBe(false)
    expect(un.estInferieurA(deux)).toBe(true)
    expect(deux.estInferieurA(un)).toBe(false)
    expect(deux.estSuperieurA(un)).toBe(true)
    expect(un.estSuperieurA(deux)).toBe(false)
    expect(un.estInferieurOuEgalA(un)).toBe(true)
    expect(un.estSuperieurOuEgalA(un)).toBe(true)
  })
})

describe('Montant — helpers libres', () => {
  it('arrondirHalfUp arrondit les .5 vers +∞', () => {
    expect(arrondirHalfUp(2.5)).toBe(3)
    expect(arrondirHalfUp(-2.5)).toBe(-2)
    expect(arrondirHalfUp(2.4)).toBe(2)
    expect(arrondirHalfUp(0.5)).toBe(1)
    expect(arrondirHalfUp(-0.5)).toBe(0)
  })

  it('montantDepuisBps délègue à appliquerTauxBps', () => {
    expect(montantDepuisBps(Montant.depuisCentimes(1234567), 1900).centimes).toBe(234568)
  })
})
