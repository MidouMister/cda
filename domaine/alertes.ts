import { verifierDateIso } from './entites-referentielles'
import type { ResultatDelais } from './delais'

export type NiveauAlerte = 'INFO' | 'AVERTISSEMENT' | 'CRITIQUE'

export type CategorieAlerte =
  | 'DELAI_50_POURCENT'
  | 'DELAI_80_POURCENT'
  | 'DELAI_J_15'
  | 'DELAI_DEPASSE'
  | 'SUSPENSION_A_LEVER'
  | 'VALIDITE_DEVIS_BIENTOT_EXPIREE'
  | 'VALIDITE_DEVIS_EXPIREE'

export interface Alerte {
  readonly categorie: CategorieAlerte
  readonly niveau: NiveauAlerte
  readonly message: string
}

export interface ParametresAlertesAffaire {
  readonly resultat_delais: ResultatDelais
  readonly delai_execution_jours: number | null
  readonly date_reception_provoisee: string | null
  readonly delai_garantie_mois: number | null
}

export interface ParametresAlertesDevis {
  readonly statut: string
  readonly date_validite: string | null
}

const versDateAffichage = (iso: string): string => {
  const parties = iso.split('-')
  return `${parties[2]}/${parties[1]}/${parties[0]}`
}

const construireAlerte = (categorie: CategorieAlerte, niveau: NiveauAlerte, message: string): Alerte => ({
  categorie,
  niveau,
  message,
})

export function evaluerAlertesAffaire(parametres: ParametresAlertesAffaire, dateCourante: string): readonly Alerte[] {
  verifierDateIso(dateCourante, 'date courante')

  const { resultat_delais, delai_execution_jours } = parametres

  if (delai_execution_jours === null) {
    return []
  }

  const { delai_consomme_pourcentage, depassement_jours, date_fin_revisee, duree_totale_suspensions_jours } =
    resultat_delais

  if (depassement_jours > 0) {
    return [construireAlerte('DELAI_DEPASSE', 'CRITIQUE', `Délai dépassé de ${depassement_jours} jours`)]
  }

  const alertes: Alerte[] = []

  const joursRestants = Math.max(0, Math.round(delai_execution_jours * (100 - delai_consomme_pourcentage) / 100))

  if (delai_consomme_pourcentage >= 50 && delai_consomme_pourcentage < 80) {
    alertes.push(
      construireAlerte(
        'DELAI_50_POURCENT',
        'INFO',
        `Délai consommé à ${delai_consomme_pourcentage} % — ${joursRestants} jours restants`,
      ),
    )
  }

  if (delai_consomme_pourcentage >= 80 && delai_consomme_pourcentage < 100) {
    alertes.push(
      construireAlerte(
        'DELAI_80_POURCENT',
        'AVERTISSEMENT',
        `Délai consommé à ${delai_consomme_pourcentage} % — ${joursRestants} jours restants`,
      ),
    )
  }

  if (joursRestants >= 0 && joursRestants <= 15) {
    alertes.push(
      construireAlerte('DELAI_J_15', 'AVERTISSEMENT', `Plus que ${joursRestants} jours avant la fin contractuelle`),
    )
  }

  if (date_fin_revisee !== null && date_fin_revisee > dateCourante && duree_totale_suspensions_jours > 0) {
    alertes.push(
      construireAlerte(
        'SUSPENSION_A_LEVER',
        'INFO',
        `Suspension en cours — ${duree_totale_suspensions_jours} jours cumulés`,
      ),
    )
  }

  return alertes
}

export function evaluerAlertesDevis(parametres: ParametresAlertesDevis, dateCourante: string): readonly Alerte[] {
  verifierDateIso(dateCourante, 'date courante')

  const { statut, date_validite } = parametres

  if (statut !== 'ENVOYE') {
    return []
  }

  if (date_validite === null) {
    return []
  }

  verifierDateIso(date_validite, 'date de validité')

  const partiesValidite = date_validite.split('-')
  const partiesCourante = dateCourante.split('-')
  const joursValidite = Number(partiesValidite[0]) * 366 + Number(partiesValidite[1]) * 31 + Number(partiesValidite[2])
  const joursCourant = Number(partiesCourante[0]) * 366 + Number(partiesCourante[1]) * 31 + Number(partiesCourante[2])
  const ecartJours = joursValidite - joursCourant

  if (ecartJours < 0) {
    return [construireAlerte('VALIDITE_DEVIS_EXPIREE', 'CRITIQUE', 'Validité du devis expirée')]
  }

  if (ecartJours <= 15) {
    return [
      construireAlerte(
        'VALIDITE_DEVIS_BIENTOT_EXPIREE',
        'AVERTISSEMENT',
        `Expire le ${versDateAffichage(date_validite)}`,
      ),
    ]
  }

  return []
}
