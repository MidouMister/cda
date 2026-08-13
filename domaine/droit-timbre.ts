import { Montant } from './montant'

export type ModeReglement = 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'TRAITE' | 'LCN'

export interface TrancheTimbre {
  borneMinTtcCentimes: number
  borneMaxTtcCentimes: number | null
  tauxBps: number
  plancherCentimes: number
  plafondCentimes: number
}

export interface ParametresDroitTimbre {
  montantTtcCentimes: number
  modeReglement: ModeReglement
  barème: TrancheTimbre[]
  seuilMaxEspecesCentimes: number
}

const trouverTranche = (montant: number, barème: TrancheTimbre[]): TrancheTimbre | null =>
  barème.find(
    (tranche) =>
      montant >= tranche.borneMinTtcCentimes &&
      (tranche.borneMaxTtcCentimes === null || montant < tranche.borneMaxTtcCentimes),
  ) ?? null

export const calculerDroitTimbre = (parametres: ParametresDroitTimbre): number => {
  const { montantTtcCentimes, modeReglement, barème, seuilMaxEspecesCentimes } = parametres
  const montant = Montant.depuisCentimes(montantTtcCentimes)

  if (modeReglement !== 'ESPECES') {
    return 0
  }

  // Au-delà du plafond légal de caisse, le versement en espèces n'est pas
  // régularisable : aucun droit de timbre n'est liquidé.
  if (montant.centimes > seuilMaxEspecesCentimes) {
    return 0
  }

  if (barème.length === 0) {
    throw new Error('calculerDroitTimbre : aucun barème renseigné.')
  }

  const tranche = trouverTranche(montant.centimes, barème)
  if (tranche === null) {
    const borneMinLaPlusBasse = Math.min(
      ...barème.map((trancheCourante) => trancheCourante.borneMinTtcCentimes),
    )
    if (montant.centimes <= borneMinLaPlusBasse) {
      return 0
    }
    throw new Error(
      `calculerDroitTimbre : aucun barème actif pour le montant ${montant.centimes} centimes.`,
    )
  }

  if (tranche.tauxBps === 0) {
    return 0
  }

  let resultat = montant.appliquerTauxBps(tranche.tauxBps).centimes
  if (resultat < tranche.plancherCentimes) {
    resultat = tranche.plancherCentimes
  } else if (resultat > tranche.plafondCentimes) {
    resultat = tranche.plafondCentimes
  }
  return resultat
}
