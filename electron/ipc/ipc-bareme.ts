import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import type { TrancheTimbre } from '../../domaine/droit-timbre'
import { lireTranchesActives } from '../depots/depot-bareme-timbre'
import type { TrancheTimbreVue } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperTrancheEnVue = (tranche: TrancheTimbre): TrancheTimbreVue => ({
  borneMinTtcCentimes: tranche.borneMinTtcCentimes,
  borneMaxTtcCentimes: tranche.borneMaxTtcCentimes,
  tauxBps: tranche.tauxBps,
  plancherCentimes: tranche.plancherCentimes,
  plafondCentimes: tranche.plafondCentimes,
})

export const enregistrerHandlersBareme = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.bareme.lister, () =>
    lireTranchesActives(obtenirBase()).map(mapperTrancheEnVue),
  )
}
