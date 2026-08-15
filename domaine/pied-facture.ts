import { Montant } from './montant'
import { verifierEntierNonNegatif } from './entites-referentielles'
import type { PiedFacture } from './entites-facturation'

export interface DonneesLignePied {
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
  rabaisMarcheBps: number
}

export interface ParametresPiedFacture {
  lignes: DonneesLignePied[]
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  marchePublic: boolean
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
  verifierBps(ligne.rabaisMarcheBps, 'rabais marché de ligne en bps')
}

interface LigneCalculee {
  brut: number
  remise: number
  rabaisMarche: number
  net: number
}

// §4.4.5bis : par ligne, base = BRUT (décision 15/08/2026) —
//   brut = PU × qté ; remise = brut × remiseBps ; rabais marché = brut ×
//   rabaisMarcheBps ; net = brut − remise − rabais marché.
// Arrondi half-up ligne par ligne (§10.3).
const calculerLignes = (lignes: DonneesLignePied[]): LigneCalculee[] =>
  lignes.map((ligne) => {
    const brut = Montant.depuisCentimes(ligne.puHtCentimes).foisQuantiteMilliemes(ligne.quantiteMilliemes).centimes
    const remise = Montant.depuisCentimes(brut).appliquerTauxBps(ligne.remiseBps).centimes
    const rabaisMarche = Montant.depuisCentimes(brut).appliquerTauxBps(ligne.rabaisMarcheBps).centimes
    return { brut, remise, rabaisMarche, net: brut - remise - rabaisMarche }
  })

// Écart d'arrondi (§4.4.5bis) : écart entre la somme des rabais de lignes
// (arrondis individuellement) et le rabais théorique calculé sur le brut total
// du groupe, par taux distinct. En pratique |écart| ≤ 2 centimes.
const calculerEcart = (lignesCalculees: LigneCalculee[], lignes: DonneesLignePied[]): number => {
  let sommeRabaisLignes = 0
  let rabaisTheoriqueTotal = 0
  for (const taux of new Set(lignes.map((ligne) => ligne.rabaisMarcheBps).filter((taux) => taux > 0))) {
    let brutTotalGroupe = 0
    lignesCalculees.forEach((ligneCalculee, index) => {
      if (lignes[index].rabaisMarcheBps === taux) {
        brutTotalGroupe += ligneCalculee.brut
        sommeRabaisLignes += ligneCalculee.rabaisMarche
      }
    })
    rabaisTheoriqueTotal += Montant.depuisCentimes(brutTotalGroupe).appliquerTauxBps(taux).centimes
  }
  return sommeRabaisLignes - rabaisTheoriqueTotal
}

// Ligne éligible = ligne avec rabais marché (taux > 0) ; l'écart d'arrondi est
// porté sur celle de montant net le plus élevé (égalité → première ligne).
const trouverLigneEligible = (lignesCalculees: LigneCalculee[], lignes: DonneesLignePied[]): number => {
  let index = -1
  let netMaximum = -1
  lignesCalculees.forEach((ligneCalculee, indexCourant) => {
    if (lignes[indexCourant].rabaisMarcheBps > 0 && ligneCalculee.net > netMaximum) {
      netMaximum = ligneCalculee.net
      index = indexCourant
    }
  })
  return index
}

export const calculerPiedFacture = (parametres: ParametresPiedFacture): PiedFacture => {
  const tauxTvaBps = parametres.tauxTvaBps ?? TAUX_TVA_DEFAUT_BPS
  verifierBps(parametres.retenueGarantieBps, 'retenue de garantie en bps')
  verifierBps(tauxTvaBps, 'taux de TVA en bps')
  verifierEntierNonNegatif(parametres.remboursementAvanceCentimes, 'remboursement d’avance en centimes')
  for (const ligne of parametres.lignes) {
    verifierLigne(ligne)
  }

  const lignesCalculees = calculerLignes(parametres.lignes)

  let totalBrut = 0
  let totalRemisesLignes = 0
  let totalRabaisMarcheLignes = 0
  for (const ligne of lignesCalculees) {
    totalBrut += ligne.brut
    totalRemisesLignes += ligne.remise
    totalRabaisMarcheLignes += ligne.rabaisMarche
  }

  const ecart = calculerEcart(lignesCalculees, parametres.lignes)

  // Règle d'arrondi de l'écart (§4.4.5bis), deux comportements :
  // - Marché public : l'écart (≤ 2 centimes, positif ou négatif) est appliqué à
  //   la ligne éligible de montant le plus élevé ; la trace audit (chaîne de
  //   description) est retournée pour que le dépôt écrive le journal en Phase D.
  // - Document privé : aucun ajustement automatique — la ligne AJUSTEMENT_ARRONDI
  //   reste optionnelle (saisie manuelle) et n'est jamais créée ici ; l'écart
  //   constaté est tracé pour l'audit. Jamais de trace si l'écart est nul.
  let ajustement = 0
  let traceAudit: string | null = null
  if (ecart !== 0) {
    const qualificatif = ecart > 0 ? 'positif' : 'négatif'
    const montantEcart = Math.abs(ecart)
    if (parametres.marchePublic) {
      const indexLigneEligible = trouverLigneEligible(lignesCalculees, parametres.lignes)
      ajustement = ecart
      traceAudit =
        `ajustement d'arrondi rabais marché : écart ${montantEcart} centime(s) ${qualificatif}, ` +
        `appliqué à la ligne éligible la plus élevée ` +
        `(ligne ${indexLigneEligible + 1}, montant net ${lignesCalculees[indexLigneEligible].net} centimes).`
    } else {
      traceAudit =
        `ajustement d'arrondi rabais marché : écart ${montantEcart} centime(s) ${qualificatif}, ` +
        `constaté non ajusté (document privé, ligne AJUSTEMENT_ARRONDI optionnelle).`
    }
  }

  // Total HT = somme des montants nets de ligne, ajustée de l'écart (§4.4.5bis) :
  // net commercial = brut total − (remises lignes + rabais marché lignes − écart).
  const totalRemises = totalRemisesLignes + totalRabaisMarcheLignes - ajustement
  const netCommercialHt = totalBrut - totalRemises
  const retenueGarantie = Montant.depuisCentimes(netCommercialHt).appliquerTauxBps(parametres.retenueGarantieBps).centimes

  // Enchaînement §4.4.6 : net commercial − remboursement d'avance − retenue de
  // garantie (base HT) ; TVA ; total TTC ; NET À PAYER = total TTC — le droit de
  // timbre ne figure plus dans le pied (décision 15/08/2026, §4.7.3).
  const totalHt = netCommercialHt - parametres.remboursementAvanceCentimes - retenueGarantie
  const totalTva = Montant.depuisCentimes(totalHt).appliquerTauxBps(tauxTvaBps).centimes
  const totalTtc = totalHt + totalTva

  return {
    total_ht_lignes_centimes: totalBrut,
    total_remises_centimes: totalRemises,
    net_commercial_ht_centimes: netCommercialHt,
    remboursement_avance_centimes: parametres.remboursementAvanceCentimes,
    retenue_garantie_centimes: retenueGarantie,
    total_ht_centimes: totalHt,
    total_tva_centimes: totalTva,
    total_ttc_centimes: totalTtc,
    net_a_payer_centimes: totalTtc,
    ajustement_ecart_audit: traceAudit,
  }
}
