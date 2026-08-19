import { verifierDateIso, verifierEntierNonNegatif, verifierEntierPositif } from './entites-referentielles'

const MOIS_PAR_ANNEE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

const estBissextile = (annee: number): boolean =>
  (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0

const joursDansLeMois = (annee: number, mois: number): number =>
  mois === 2 && estBissextile(annee) ? 29 : MOIS_PAR_ANNEE[mois - 1]

export const ajouterJoursDateIso = (dateIso: string, jours: number): string => {
  verifierDateIso(dateIso, 'date de base')
  verifierEntierNonNegatif(jours, 'nombre de jours à ajouter')
  const parties = dateIso.split('-')
  let annee = Number(parties[0])
  let mois = Number(parties[1])
  let jour = Number(parties[2])
  let restant = jours
  while (restant > 0) {
    const maxJours = joursDansLeMois(annee, mois)
    const joursRestantsMois = maxJours - jour
    if (restant <= joursRestantsMois) {
      jour += restant
      restant = 0
    } else {
      restant -= joursRestantsMois + 1
      jour = 1
      mois += 1
      if (mois > 12) {
        mois = 1
        annee += 1
      }
    }
  }
  return `${String(annee).padStart(4, '0')}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`
}

const joursDepuisEpoch = (dateIso: string): number => {
  verifierDateIso(dateIso, 'date pour calcul de jours')
  const parties = dateIso.split('-')
  const annee = Number(parties[0])
  const mois = Number(parties[1])
  const jour = Number(parties[2])
  let totalJours = 0
  for (let a = 1970; a < annee; a += 1) {
    totalJours += estBissextile(a) ? 366 : 365
  }
  for (let m = 1; m < mois; m += 1) {
    totalJours += joursDansLeMois(annee, m)
  }
  totalJours += jour
  return totalJours
}

const differenceEnJours = (dateDebut: string, dateFin: string): number =>
  joursDepuisEpoch(dateFin) - joursDepuisEpoch(dateDebut)

export type TypeEvenementDelai = 'ODS' | 'SUSPENSION' | 'REPRISE' | 'PROROGATION'

export interface EvenementDelai {
  readonly type_evenement: TypeEvenementDelai
  readonly date_debut: string | null
  readonly date_fin: string | null
  readonly duree_jours: number | null
  readonly impact_delai_jours: number
}

export interface ParametresDelais {
  readonly date_ods: string | null
  readonly delai_execution_jours: number | null
  readonly date_fin_contractuelle: string | null
  readonly date_fin_revisee: string | null
  readonly date_fin_reelle: string | null
  readonly evenements: readonly EvenementDelai[]
}

export interface ResultatDelais {
  readonly date_fin_contractuelle: string | null
  readonly duree_totale_suspensions_jours: number
  readonly duree_totale_prorogations_jours: number
  readonly date_fin_revisee: string | null
  readonly depassement_jours: number
  readonly est_en_cours: boolean
  readonly delai_consomme_pourcentage: number
}

const extraireSuspensions = (evenements: readonly EvenementDelai[]): number => {
  let total = 0
  for (const evt of evenements) {
    if (evt.type_evenement !== 'SUSPENSION') continue
    if (evt.duree_jours !== null) {
      total += evt.duree_jours
    } else if (evt.date_debut !== null && evt.date_fin !== null) {
      total += Math.max(0, differenceEnJours(evt.date_debut, evt.date_fin))
    }
  }
  return total
}

const extraireProrogations = (evenements: readonly EvenementDelai[]): number => {
  let total = 0
  for (const evt of evenements) {
    if (evt.type_evenement !== 'PROROGATION') continue
    total += evt.impact_delai_jours
  }
  return total
}

const resultatsVides = (): ResultatDelais => ({
  date_fin_contractuelle: null,
  duree_totale_suspensions_jours: 0,
  duree_totale_prorogations_jours: 0,
  date_fin_revisee: null,
  depassement_jours: 0,
  est_en_cours: false,
  delai_consomme_pourcentage: 0,
})

export function calculerDelaisAffaire(parametres: ParametresDelais, aujourdHui: Date): ResultatDelais {
  const { date_ods, delai_execution_jours, evenements, date_fin_revisee, date_fin_reelle } = parametres

  if (date_ods === null || delai_execution_jours === null) {
    return resultatsVides()
  }

  verifierDateIso(date_ods, 'date ODS')
  verifierEntierPositif(delai_execution_jours, 'délai d\'exécution en jours')

  const anneeAujourdhui = aujourdHui.getFullYear()
  const moisAujourdhui = aujourdHui.getMonth() + 1
  const jourAujourdhui = aujourdHui.getDate()
  const dateAujourdhui = `${String(anneeAujourdhui).padStart(4, '0')}-${String(moisAujourdhui).padStart(2, '0')}-${String(jourAujourdhui).padStart(2, '0')}`

  const dateFinContractuelleCalculee = ajouterJoursDateIso(date_ods, delai_execution_jours)
  const dureeSuspensions = extraireSuspensions(evenements)
  const dureeProrogations = extraireProrogations(evenements)

  const dureeAjoutee = dureeSuspensions + dureeProrogations
  const dateFinReviseeCalculee =
    dureeAjoutee > 0 ? ajouterJoursDateIso(dateFinContractuelleCalculee, dureeAjoutee) : dateFinContractuelleCalculee

  const dateFinReviseeEffective = date_fin_revisee ?? dateFinReviseeCalculee

  let depassementJours = 0
  if (date_fin_reelle !== null) {
    verifierDateIso(date_fin_reelle, 'date fin réelle')
    const ecart = differenceEnJours(dateFinReviseeEffective, date_fin_reelle)
    depassementJours = ecart > 0 ? ecart : 0
  }

  const estEnCours =
    dateAujourdhui >= date_ods &&
    (date_fin_reelle === null || dateAujourdhui < date_fin_reelle)

  const joursEcoules = differenceEnJours(date_ods, dateAujourdhui)
  const pourcentage =
    delai_execution_jours > 0 ? Math.round((joursEcoules / delai_execution_jours) * 10000) / 100 : 0

  return {
    date_fin_contractuelle: dateFinContractuelleCalculee,
    duree_totale_suspensions_jours: dureeSuspensions,
    duree_totale_prorogations_jours: dureeProrogations,
    date_fin_revisee: dateFinReviseeEffective,
    depassement_jours: depassementJours,
    est_en_cours: estEnCours,
    delai_consomme_pourcentage: pourcentage,
  }
}
