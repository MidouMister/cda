import { describe, expect, it } from 'vitest'
import { evaluerAlertesAffaire, evaluerAlertesDevis } from '../domaine/alertes'
import type { ParametresAlertesAffaire, ParametresAlertesDevis } from '../domaine/alertes'
import type { ResultatDelais } from '../domaine/delais'

const resultatDelaisBase: ResultatDelais = {
  date_fin_contractuelle: '2026-12-31',
  duree_totale_suspensions_jours: 0,
  duree_totale_prorogations_jours: 0,
  date_fin_revisee: '2026-12-31',
  depassement_jours: 0,
  est_en_cours: true,
  delai_consomme_pourcentage: 0,
}

const paramAffaire = (
  delaisOverrides: Partial<ResultatDelais> = {},
  paramOverrides: Partial<Omit<ParametresAlertesAffaire, 'resultat_delais'>> = {},
): ParametresAlertesAffaire => ({
  resultat_delais: { ...resultatDelaisBase, ...delaisOverrides },
  delai_execution_jours: 100,
  date_reception_provoisee: null,
  delai_garantie_mois: null,
  ...paramOverrides,
})

const paramDevis = (overrides: Partial<ParametresAlertesDevis> = {}): ParametresAlertesDevis => ({
  statut: 'ENVOYE',
  date_validite: null,
  ...overrides,
})

describe('evaluerAlertesAffaire', () => {
  it('délai à 50 % génère une alerte INFO', () => {
    const resultats = evaluerAlertesAffaire(paramAffaire({ delai_consomme_pourcentage: 50 }), '2026-06-01')
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('DELAI_50_POURCENT')
    expect(resultats[0].niveau).toBe('INFO')
  })

  it('délai à 80 % génère une alerte AVERTISSEMENT', () => {
    const resultats = evaluerAlertesAffaire(paramAffaire({ delai_consomme_pourcentage: 80 }), '2026-09-01')
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('DELAI_80_POURCENT')
    expect(resultats[0].niveau).toBe('AVERTISSEMENT')
  })

  it('J-15 génère une alerte AVERTISSEMENT', () => {
    const resultats = evaluerAlertesAffaire(paramAffaire({ delai_consomme_pourcentage: 90 }), '2026-09-20')
    expect(resultats.some((a) => a.categorie === 'DELAI_J_15')).toBe(true)
    const alerte = resultats.find((a) => a.categorie === 'DELAI_J_15')!
    expect(alerte.niveau).toBe('AVERTISSEMENT')
  })

  it('dépassement génère une alerte CRITIQUE', () => {
    const resultats = evaluerAlertesAffaire(
      paramAffaire({ depassement_jours: 10, delai_consomme_pourcentage: 100 }),
      '2026-12-31',
    )
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('DELAI_DEPASSE')
    expect(resultats[0].niveau).toBe('CRITIQUE')
    expect(resultats[0].message).toContain('10 jours')
  })

  it('suspension en cours génère une alerte INFO', () => {
    const resultats = evaluerAlertesAffaire(
      paramAffaire({ duree_totale_suspensions_jours: 30, date_fin_revisee: '2027-06-01' }),
      '2026-06-01',
    )
    expect(resultats.some((a) => a.categorie === 'SUSPENSION_A_LEVER')).toBe(true)
    const alerte = resultats.find((a) => a.categorie === 'SUSPENSION_A_LEVER')!
    expect(alerte.niveau).toBe('INFO')
  })

  it('pas d\'ODS retourne 0 alertes', () => {
    const resultats = evaluerAlertesAffaire(
      paramAffaire({ date_fin_revisee: null, delai_consomme_pourcentage: 0 }),
      '2026-06-01',
    )
    expect(resultats).toHaveLength(0)
  })

  it('50 % et J-15 combinés génèrent 2 alertes', () => {
    const resultats = evaluerAlertesAffaire(
      paramAffaire({ delai_consomme_pourcentage: 50 }, { delai_execution_jours: 30 }),
      '2026-06-01',
    )
    expect(resultats).toHaveLength(2)
    expect(resultats.map((a) => a.categorie)).toContain('DELAI_50_POURCENT')
    expect(resultats.map((a) => a.categorie)).toContain('DELAI_J_15')
  })

  it('plus de 80 % sans J-15 retourne 1 seule alerte', () => {
    const resultats = evaluerAlertesAffaire(
      paramAffaire({ delai_consomme_pourcentage: 85 }, { delai_execution_jours: 200 }),
      '2026-06-01',
    )
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('DELAI_80_POURCENT')
  })

  it('dépassement avec 80 % retourne uniquement DELAI_DEPASSE', () => {
    const resultats = evaluerAlertesAffaire(
      paramAffaire({ depassement_jours: 5, delai_consomme_pourcentage: 100 }),
      '2026-12-31',
    )
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('DELAI_DEPASSE')
  })
})

describe('evaluerAlertesDevis', () => {
  it('devis ENVOYÉ date validité expirée → CRITIQUE', () => {
    const resultats = evaluerAlertesDevis(paramDevis({ date_validite: '2026-01-01' }), '2026-06-01')
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('VALIDITE_DEVIS_EXPIREE')
    expect(resultats[0].niveau).toBe('CRITIQUE')
  })

  it('devis ENVOYÉ date validité dans 10 jours → AVERTISSEMENT', () => {
    const resultats = evaluerAlertesDevis(paramDevis({ date_validite: '2026-06-11' }), '2026-06-01')
    expect(resultats).toHaveLength(1)
    expect(resultats[0].categorie).toBe('VALIDITE_DEVIS_BIENTOT_EXPIREE')
    expect(resultats[0].niveau).toBe('AVERTISSEMENT')
    expect(resultats[0].message).toContain('11/06/2026')
  })

  it('devis BROUILLON date validité expirée → 0 alertes', () => {
    const resultats = evaluerAlertesDevis(paramDevis({ statut: 'BROUILLON', date_validite: '2026-01-01' }), '2026-06-01')
    expect(resultats).toHaveLength(0)
  })

  it('devis ACCEPTE date validité expirée → 0 alertes', () => {
    const resultats = evaluerAlertesDevis(paramDevis({ statut: 'ACCEPTE', date_validite: '2026-01-01' }), '2026-06-01')
    expect(resultats).toHaveLength(0)
  })

  it('devis sans date_validité → 0 alertes', () => {
    const resultats = evaluerAlertesDevis(paramDevis({ date_validite: null }), '2026-06-01')
    expect(resultats).toHaveLength(0)
  })
})
