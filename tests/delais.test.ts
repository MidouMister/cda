import { describe, expect, it } from 'vitest'
import { ajouterJoursDateIso, calculerDelaisAffaire } from '../domaine/delais'

const _date = (annee: number, mois: number, jour: number): Date =>
  new Date(annee, mois - 1, jour)

const paramBase = (overrides: Partial<Parameters<typeof calculerDelaisAffaire>[0]> = {}) => ({
  date_ods: null as string | null,
  delai_execution_jours: null as number | null,
  date_fin_contractuelle: null as string | null,
  date_fin_revisee: null as string | null,
  date_fin_reelle: null as string | null,
  evenements: [] as Parameters<typeof calculerDelaisAffaire>[0]['evenements'],
  ...overrides,
})

describe('ajouterJoursDateIso', () => {
  it('ajoute des jours dans le même mois', () => {
    expect(ajouterJoursDateIso('2026-01-01', 10)).toBe('2026-01-11')
  })

  it('traverse un mois', () => {
    expect(ajouterJoursDateIso('2026-01-25', 10)).toBe('2026-02-04')
  })

  it('traverse une année bissextile', () => {
    expect(ajouterJoursDateIso('2024-02-28', 1)).toBe('2024-02-29')
    expect(ajouterJoursDateIso('2024-02-29', 1)).toBe('2024-03-01')
  })

  it('traverse une année non bissextile', () => {
    expect(ajouterJoursDateIso('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('ajoute 365 jours sur une année non bissextile', () => {
    expect(ajouterJoursDateIso('2026-01-01', 365)).toBe('2027-01-01')
  })

  it('ajoute 366 jours sur une année bissextile', () => {
    expect(ajouterJoursDateIso('2024-01-01', 366)).toBe('2025-01-01')
  })

  it('traverse plusieurs mois', () => {
    expect(ajouterJoursDateIso('2026-03-15', 45)).toBe('2026-04-29')
  })
})

describe('calculerDelaisAffaire — ODS seul', () => {
  it('calcule la date fin contractuelle = ODS + délai', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({ date_ods: '2026-01-01', delai_execution_jours: 365 }),
      _date(2026, 6, 15),
    )
    expect(resultat.date_fin_contractuelle).toBe('2027-01-01')
    expect(resultat.duree_totale_suspensions_jours).toBe(0)
    expect(resultat.duree_totale_prorogations_jours).toBe(0)
    expect(resultat.date_fin_revisee).toBe('2027-01-01')
    expect(resultat.depassement_jours).toBe(0)
  })
})

describe('calculerDelaisAffaire — suspensions', () => {
  it('ajoute une suspension de 20 jours', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'SUSPENSION', date_debut: '2026-03-01', date_fin: '2026-03-21', duree_jours: 20, impact_delai_jours: 0 },
        ],
      }),
      _date(2026, 6, 15),
    )
    expect(resultat.duree_totale_suspensions_jours).toBe(20)
    expect(resultat.date_fin_revisee).toBe('2027-01-21')
  })

  it('calcule la durée depuis les dates si duree_jours est null', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'SUSPENSION', date_debut: '2026-03-01', date_fin: '2026-03-21', duree_jours: null, impact_delai_jours: 0 },
        ],
      }),
      _date(2026, 6, 15),
    )
    expect(resultat.duree_totale_suspensions_jours).toBe(20)
  })

  it('somme plusieurs suspensions', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'SUSPENSION', date_debut: '2026-03-01', date_fin: '2026-03-21', duree_jours: 20, impact_delai_jours: 0 },
          { type_evenement: 'SUSPENSION', date_debut: '2026-06-01', date_fin: '2026-06-11', duree_jours: 10, impact_delai_jours: 0 },
        ],
      }),
      _date(2026, 7, 1),
    )
    expect(resultat.duree_totale_suspensions_jours).toBe(30)
    expect(resultat.date_fin_revisee).toBe('2027-01-31')
  })
})

describe('calculerDelaisAffaire — reprise', () => {
  it('la reprise ne modifie pas les calculs', () => {
    const sansReprise = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'SUSPENSION', date_debut: '2026-03-01', date_fin: '2026-03-21', duree_jours: 20, impact_delai_jours: 0 },
        ],
      }),
      _date(2026, 6, 15),
    )
    const avecReprise = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'SUSPENSION', date_debut: '2026-03-01', date_fin: '2026-03-21', duree_jours: 20, impact_delai_jours: 0 },
          { type_evenement: 'REPRISE', date_debut: '2026-03-22', date_fin: null, duree_jours: null, impact_delai_jours: 0 },
        ],
      }),
      _date(2026, 6, 15),
    )
    expect(avecReprise.date_fin_revisee).toBe(sansReprise.date_fin_revisee)
    expect(avecReprise.duree_totale_suspensions_jours).toBe(sansReprise.duree_totale_suspensions_jours)
  })
})

describe('calculerDelaisAffaire — prorogations', () => {
  it('ajoute une prorogation de 30 jours', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'PROROGATION', date_debut: null, date_fin: null, duree_jours: null, impact_delai_jours: 30 },
        ],
      }),
      _date(2026, 6, 15),
    )
    expect(resultat.duree_totale_prorogations_jours).toBe(30)
    expect(resultat.date_fin_revisee).toBe('2027-01-31')
  })

  it('cumule suspension + prorogation', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        evenements: [
          { type_evenement: 'SUSPENSION', date_debut: '2026-03-01', date_fin: '2026-03-21', duree_jours: 20, impact_delai_jours: 0 },
          { type_evenement: 'PROROGATION', date_debut: null, date_fin: null, duree_jours: null, impact_delai_jours: 30 },
        ],
      }),
      _date(2026, 6, 15),
    )
    expect(resultat.duree_totale_suspensions_jours).toBe(20)
    expect(resultat.duree_totale_prorogations_jours).toBe(30)
    expect(resultat.date_fin_revisee).toBe('2027-02-20')
  })
})

describe('calculerDelaisAffaire — dépassement', () => {
  it('détecte un dépassement quand date_fin_reelle > date_fin_revisee', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        date_fin_reelle: '2027-02-10',
      }),
      _date(2027, 3, 1),
    )
    expect(resultat.depassement_jours).toBe(40)
  })

  it('retourne 0 quand date_fin_reelle <= date_fin_revisee', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        date_fin_reelle: '2026-12-15',
      }),
      _date(2027, 1, 15),
    )
    expect(resultat.depassement_jours).toBe(0)
  })
})

describe('calculerDelaisAffaire — pas d\'ODS', () => {
  it('retourne des zéros/nuls sans ODS', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({ date_ods: null, delai_execution_jours: null }),
      _date(2026, 6, 15),
    )
    expect(resultat.date_fin_contractuelle).toBeNull()
    expect(resultat.duree_totale_suspensions_jours).toBe(0)
    expect(resultat.duree_totale_prorogations_jours).toBe(0)
    expect(resultat.date_fin_revisee).toBeNull()
    expect(resultat.depassement_jours).toBe(0)
    expect(resultat.est_en_cours).toBe(false)
    expect(resultat.delai_consomme_pourcentage).toBe(0)
  })
})

describe('calculerDelaisAffaire — pourcentage consommé', () => {
  it('calcule le pourcentage de délai consommé', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({ date_ods: '2026-01-01', delai_execution_jours: 365 }),
      _date(2026, 7, 2),
    )
    expect(resultat.delai_consomme_pourcentage).toBeCloseTo(50, 0)
  })

  it('retourne > 100% en cas de retard', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({ date_ods: '2026-01-01', delai_execution_jours: 100 }),
      _date(2026, 5, 1),
    )
    expect(resultat.delai_consomme_pourcentage).toBeGreaterThan(100)
  })
})

describe('calculerDelaisAffaire — est_en_cours', () => {
  it('est true entre ODS et fin réelle', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({ date_ods: '2026-01-01', delai_execution_jours: 365 }),
      _date(2026, 6, 15),
    )
    expect(resultat.est_en_cours).toBe(true)
  })

  it('est false après la fin réelle', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        date_fin_reelle: '2026-12-01',
      }),
      _date(2027, 1, 1),
    )
    expect(resultat.est_en_cours).toBe(false)
  })

  it('est false avant l\'ODS', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({ date_ods: '2026-06-01', delai_execution_jours: 365 }),
      _date(2026, 1, 15),
    )
    expect(resultat.est_en_cours).toBe(false)
  })
})

describe('calculerDelaisAffaire — date_fin_revisee override', () => {
  it('utilise date_fin_revisee fournie en paramètre', () => {
    const resultat = calculerDelaisAffaire(
      paramBase({
        date_ods: '2026-01-01',
        delai_execution_jours: 365,
        date_fin_revisee: '2027-06-01',
      }),
      _date(2026, 6, 15),
    )
    expect(resultat.date_fin_revisee).toBe('2027-06-01')
  })
})
