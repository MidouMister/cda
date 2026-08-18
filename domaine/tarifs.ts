import { Montant } from './montant'
import {
  Tarif,
  verifierDateIso,
  verifierEntierNonNegatif,
  verifierEntierPositif,
} from './entites-referentielles'

export interface ResultatResolutionTarif {
  prixUnitaire: Montant
  source: 'AFFAIRE' | 'CLIENT' | 'CATALOGUE' | 'REFERENCE'
  tarifId: number | null
}

export interface ParametresResolutionTarif {
  produitId: number
  tarifs: Tarif[]
  puReferenceCentimes: number
  clientId?: number
  affaireId?: number
  dateLigne: string
}

const periodeEnglobeDate = (
  debutPeriode: string,
  finPeriode: string | null,
  date: string,
): boolean => {
  if (debutPeriode > date) return false
  if (finPeriode !== null && finPeriode < date) return false
  return true
}

const choisirTarifLePlusRecent = (tarifs: Tarif[], dateLigne: string): Tarif => {
  let meilleur = tarifs[0]
  for (let i = 1; i < tarifs.length; i++) {
    const candidat = tarifs[i]
    if (
      candidat.debut_periode <= dateLigne &&
      candidat.debut_periode > meilleur.debut_periode
    ) {
      meilleur = candidat
    }
  }
  return meilleur
}

export const resoudreTarif = (params: ParametresResolutionTarif): ResultatResolutionTarif => {
  verifierEntierPositif(params.produitId, 'identifiant produit')
  verifierDateIso(params.dateLigne, 'date de la ligne')
  verifierEntierNonNegatif(params.puReferenceCentimes, 'PU de référence en centimes')

  const candidats = params.tarifs.filter((t) => t.produit_id === params.produitId)

  const affaires = candidats.filter(
    (t) =>
      t.type_niveau === 'AFFAIRE' &&
      t.affaire_id === params.affaireId &&
      periodeEnglobeDate(t.debut_periode, t.fin_periode, params.dateLigne),
  )
  if (affaires.length > 0) {
    const choix = choisirTarifLePlusRecent(affaires, params.dateLigne)
    return { prixUnitaire: Montant.depuisCentimes(choix.prix_centimes), source: 'AFFAIRE', tarifId: choix.id }
  }

  const clients = candidats.filter(
    (t) =>
      t.type_niveau === 'CLIENT' &&
      t.client_id === params.clientId &&
      periodeEnglobeDate(t.debut_periode, t.fin_periode, params.dateLigne),
  )
  if (clients.length > 0) {
    const choix = choisirTarifLePlusRecent(clients, params.dateLigne)
    return { prixUnitaire: Montant.depuisCentimes(choix.prix_centimes), source: 'CLIENT', tarifId: choix.id }
  }

  const catalogues = candidats.filter(
    (t) =>
      t.type_niveau === 'CATALOGUE' &&
      periodeEnglobeDate(t.debut_periode, t.fin_periode, params.dateLigne),
  )
  if (catalogues.length > 0) {
    const choix = choisirTarifLePlusRecent(catalogues, params.dateLigne)
    return { prixUnitaire: Montant.depuisCentimes(choix.prix_centimes), source: 'CATALOGUE', tarifId: choix.id }
  }

  return {
    prixUnitaire: Montant.depuisCentimes(params.puReferenceCentimes),
    source: 'REFERENCE',
    tarifId: null,
  }
}
