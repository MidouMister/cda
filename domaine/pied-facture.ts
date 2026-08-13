import { Montant } from './montant'
import { verifierEntierNonNegatif, type ModeReglement } from './entites-referentielles'
import { calculerDroitTimbre, type TrancheTimbre } from './droit-timbre'
import type { PiedFacture } from './entites-facturation'

export interface DonneesLignePied {
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
}

export interface ParametresPiedFacture {
  lignes: DonneesLignePied[]
  rabaisGlobalBps: number
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  modeReglement: ModeReglement | null
  baremeTimbre: TrancheTimbre[]
  seuilMaxEspecesCentimes: number
  tauxTvaBps?: number
}

const TAUX_TVA_DEFAUT_BPS = 1900

const verifierBps = (valeur: number, libelle: string): void => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur) || valeur < 0 || valeur > 10000) {
    throw new TypeError(`« ${libelle} » doit être un entier entre 0 et 10000 (reçu : ${String(valeur)}).`)
  }
}

const verifierLigne = (ligne: DonneesLignePied): void => {
  verifierEntierNonNegatif(ligne.quantiteMilliemes, 'quantité de la ligne')
  verifierEntierNonNegatif(ligne.puHtCentimes, 'prix unitaire HT de la ligne')
  verifierBps(ligne.remiseBps, 'remise de ligne en bps')
}

export const calculerPiedFacture = (parametres: ParametresPiedFacture): PiedFacture => {
  const tauxTvaBps = parametres.tauxTvaBps ?? TAUX_TVA_DEFAUT_BPS
  verifierBps(parametres.rabaisGlobalBps, 'rabais global en bps')
  verifierBps(parametres.retenueGarantieBps, 'retenue de garantie en bps')
  verifierBps(tauxTvaBps, 'taux de TVA en bps')
  verifierEntierNonNegatif(parametres.remboursementAvanceCentimes, 'remboursement d’avance en centimes')
  verifierEntierNonNegatif(parametres.seuilMaxEspecesCentimes, 'seuil maximum des espèces en centimes')
  for (const ligne of parametres.lignes) {
    verifierLigne(ligne)
  }

  // Arrondi ligne par ligne (§10.3) : brut et remise arrondis avant agrégation.
  let totalHtLignes = 0
  let totalRemisesLignes = 0
  for (const ligne of parametres.lignes) {
    const brut = Montant.depuisCentimes(ligne.puHtCentimes).foisQuantiteMilliemes(ligne.quantiteMilliemes).centimes
    const remise = Montant.depuisCentimes(brut).appliquerTauxBps(ligne.remiseBps).centimes
    totalHtLignes += brut
    totalRemisesLignes += remise
  }

  // Rabais global : base le total HT des lignes, avant déduction des remises lignes
  // (arbitrage comptable §4.4.6 — le fichier est isolé exprès, cf. réserve §5.5 du plan).
  const rabaisGlobal = Montant.depuisCentimes(totalHtLignes).appliquerTauxBps(parametres.rabaisGlobalBps).centimes

  const totalRemises = totalRemisesLignes + rabaisGlobal
  const netCommercialHt = totalHtLignes - totalRemises
  const retenueGarantie = Montant.depuisCentimes(netCommercialHt).appliquerTauxBps(parametres.retenueGarantieBps).centimes

  // Enchaînement §4.4.6 : net commercial − remboursement d’avance − retenue de garantie.
  // Un total HT négatif reste autorisé en interne (entiers signés) : le cas réel est contrôlé à la saisie.
  const totalHt = netCommercialHt - parametres.remboursementAvanceCentimes - retenueGarantie
  const totalTva = Montant.depuisCentimes(totalHt).appliquerTauxBps(tauxTvaBps).centimes
  const totalTtc = totalHt + totalTva

  const droitTimbre =
    parametres.modeReglement === null
      ? 0
      : calculerDroitTimbre({
          montantTtcCentimes: totalTtc,
          modeReglement: parametres.modeReglement,
          barème: parametres.baremeTimbre,
          seuilMaxEspecesCentimes: parametres.seuilMaxEspecesCentimes,
        })

  return {
    total_ht_lignes_centimes: totalHtLignes,
    total_remises_centimes: totalRemises,
    net_commercial_ht_centimes: netCommercialHt,
    remboursement_avance_centimes: parametres.remboursementAvanceCentimes,
    retenue_garantie_centimes: retenueGarantie,
    total_ht_centimes: totalHt,
    total_tva_centimes: totalTva,
    total_ttc_centimes: totalTtc,
    droit_timbre_centimes: droitTimbre,
    net_a_payer_centimes: totalTtc + droitTimbre,
  }
}
