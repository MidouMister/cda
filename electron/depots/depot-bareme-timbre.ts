import type { TrancheTimbre } from '../../domaine/droit-timbre'
import type { Base } from '../db/connexion'
import { depuisCentimes } from './conversion-centimes'

export const lireTranchesActives = (base: Base): TrancheTimbre[] => {
  const lignes = base
    .prepare(
      `SELECT borne_min_ttc_centimes AS borneMinTtcCentimes,
              borne_max_ttc_centimes AS borneMaxTtcCentimes,
              taux_bps AS tauxBps,
              plancher_centimes AS plancherCentimes,
              plafond_centimes AS plafondCentimes
         FROM bareme_timbre
        WHERE actif = 1
        ORDER BY borne_min_ttc_centimes`,
    )
    .all() as {
    borneMinTtcCentimes: number
    borneMaxTtcCentimes: number | null
    tauxBps: number
    plancherCentimes: number
    plafondCentimes: number
  }[]
  return lignes.map((ligne) => ({
    borneMinTtcCentimes: depuisCentimes(ligne.borneMinTtcCentimes),
    borneMaxTtcCentimes:
      ligne.borneMaxTtcCentimes === null ? null : depuisCentimes(ligne.borneMaxTtcCentimes),
    tauxBps: ligne.tauxBps,
    plancherCentimes: depuisCentimes(ligne.plancherCentimes),
    plafondCentimes: depuisCentimes(ligne.plafondCentimes),
  }))
}
