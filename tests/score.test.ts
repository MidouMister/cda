import { describe, expect, it } from 'vitest'
import { calculerScoreClient, ParametresScoreClient } from '../domaine/score'

function paramsPartiels(overrides: Partial<ParametresScoreClient> = {}): ParametresScoreClient {
  return {
    delaiMoyenPaiementJours: 30,
    caAnnuelTtcCentimes: 10_000_000_00,
    nombreAffairesAnnee: 3,
    nombreFacturesEnRetard12Mois: 0,
    creanceImpayeeEcheancePlus90Jours: false,
    contentieuxDeclare: false,
    estGroupeOuGitra: false,
    ...overrides,
  }
}

describe('calculerScoreClient', () => {
  it('score A quand tous les criteres sont atteints', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 20,
      caAnnuelTtcCentimes: 15_000_000_00,
      nombreAffairesAnnee: 4,
    }))
    expect(resultat.score).toBe('A')
    expect(resultat.motif).toContain('Delai moyen 20j')
    expect(resultat.motif).toContain('4 affaires')
  })

  it('score B quand les criteres B sont remplis', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 45,
      caAnnuelTtcCentimes: 5_000_000_00,
      nombreAffairesAnnee: 2,
    }))
    expect(resultat.score).toBe('B')
    expect(resultat.motif).toContain('Delai moyen 45j')
  })

  it('score C quand delai > 60j', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 70,
      caAnnuelTtcCentimes: 5_000_000_00,
      nombreAffairesAnnee: 2,
    }))
    expect(resultat.score).toBe('C')
    expect(resultat.motif).toContain('Delai moyen 70j')
  })

  it('score C quand CA inferieur a 2M', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 20,
      caAnnuelTtcCentimes: 1_000_000_00,
      nombreAffairesAnnee: 2,
    }))
    expect(resultat.score).toBe('C')
    expect(resultat.motif).toBe('CA inferieur au seuil')
  })

  it('score C quand 2 factures en retard', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 30,
      caAnnuelTtcCentimes: 5_000_000_00,
      nombreAffairesAnnee: 1,
      nombreFacturesEnRetard12Mois: 2,
    }))
    expect(resultat.score).toBe('C')
    expect(resultat.motif).toBe('2 retards > 2')
  })

  it('score D quand delai > 90j', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 95,
    }))
    expect(resultat.score).toBe('D')
    expect(resultat.motif).toBe('Delai moyen 95j > 90j')
  })

  it('score D quand creance impayee > 90j', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      creanceImpayeeEcheancePlus90Jours: true,
    }))
    expect(resultat.score).toBe('D')
    expect(resultat.motif).toBe('Creance impayee > 90j')
  })

  it('score D quand contentieux declare', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      contentieuxDeclare: true,
    }))
    expect(resultat.score).toBe('D')
    expect(resultat.motif).toBe('Contentieux declare')
  })

  it('protection GITRA : delai > 90j donne C au lieu de D', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 95,
      estGroupeOuGitra: true,
    }))
    expect(resultat.score).toBe('C')
    expect(resultat.motif).toBe('Delai moyen 95j > 90j')
  })

  it('protection GITRA : contentieux declare donne C au lieu de D', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      contentieuxDeclare: true,
      estGroupeOuGitra: true,
    }))
    expect(resultat.score).toBe('C')
    expect(resultat.motif).toBe('Contentieux declare')
  })

  it('GITRA ne bloque pas le score A', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 20,
      caAnnuelTtcCentimes: 15_000_000_00,
      nombreAffairesAnnee: 4,
      estGroupeOuGitra: true,
    }))
    expect(resultat.score).toBe('A')
  })

  it('delaiMoyen exactement 30j donne A', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 30,
      caAnnuelTtcCentimes: 15_000_000_00,
      nombreAffairesAnnee: 3,
    }))
    expect(resultat.score).toBe('A')
  })

  it('delaiMoyen exactement 31j ne donne pas A, tombe a B si autres criteres remplis', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 31,
      caAnnuelTtcCentimes: 15_000_000_00,
      nombreAffairesAnnee: 4,
    }))
    expect(resultat.score).toBe('B')
  })

  it('CA exactement 10M ne donne pas A', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 20,
      caAnnuelTtcCentimes: 10_000_000_00,
      nombreAffairesAnnee: 4,
    }))
    expect(resultat.score).toBe('B')
  })

  it('nombreAffaires exactement 3 donne A', () => {
    const resultat = calculerScoreClient(paramsPartiels({
      delaiMoyenPaiementJours: 25,
      caAnnuelTtcCentimes: 12_000_000_00,
      nombreAffairesAnnee: 3,
    }))
    expect(resultat.score).toBe('A')
  })
})
