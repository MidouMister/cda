import { CATEGORIES_CLASSIFICATION, type CategorieClassification } from '../../domaine/classification'
import type { PiedFacture } from '../../domaine/entites-facturation'
import {
  UNITES_PRODUIT,
  verifierChaineNonVide,
  verifierEntierPositif,
  verifierParmi,
  type Unite,
} from '../../domaine/entites-referentielles'
import { Montant } from '../../domaine/montant'
import {
  calculerPiedFacture,
  type DonneesLignePied,
  type ParametresPiedFacture,
} from '../../domaine/pied-facture'
import type { Base } from '../db/connexion'
import { versCentimes } from './conversion-centimes'

const TAUX_TVA_DEFAUT_BPS = 1900

const MOTIF_AJUSTEMENT = "ajustement d'arrondi rabais marché"
const DESIGNATION_AJUSTEMENT = "Ajustement d'arrondi"
const TYPE_LIGNE_AJUSTEMENT = 'AJUSTEMENT_ARRONDI'

export interface LigneFactureAInserer {
  designation: string
  unite: Unite
  quantite_milliemes: number
  pu_ht_centimes: number
  remise_bps: number
  rabais_marche_bps: number
  produit_id?: number | null
  famille_id?: number | null
  sous_famille_id?: number | null
  classification?: CategorieClassification | null
}

export interface ParametresMaterialisationFacture {
  lignes: LigneFactureAInserer[]
  retenue_garantie_bps: number
  remboursement_avance_centimes: number
  marche_public: boolean
  taux_tva_bps?: number
}

export interface ResultatMaterialisation {
  pied: PiedFacture
  ecart_centimes: number
  ajustement_materialise: boolean
  ligne_cible_id: number | null
  id_lignes_inserees: number[]
}

interface LigneCalculee {
  brut: number
  remise: number
  rabaisMarche: number
  net: number
}

// §4.4.5bis : par ligne, base = BRUT (décision 15/08/2026) — brut = PU × qté ;
// remise = brut × remiseBps ; rabais marché = brut × rabaisMarcheBps ;
// net = brut − remise − rabais marché. Arrondi half-up ligne par ligne (§10.3).
// Réplique exactement calculerLignes du domaine pour garantir la cohérence
// somme des nets = net commercial après matérialisation de l'écart.
const calculerLignes = (lignes: LigneFactureAInserer[]): LigneCalculee[] =>
  lignes.map((ligne) => {
    const brut = Montant.depuisCentimes(ligne.pu_ht_centimes).foisQuantiteMilliemes(ligne.quantite_milliemes).centimes
    const remise = Montant.depuisCentimes(brut).appliquerTauxBps(ligne.remise_bps).centimes
    const rabaisMarche = Montant.depuisCentimes(brut).appliquerTauxBps(ligne.rabais_marche_bps).centimes
    return { brut, remise, rabaisMarche, net: brut - remise - rabaisMarche }
  })

const verifierLigneSaisie = (ligne: LigneFactureAInserer): void => {
  verifierChaineNonVide(ligne.designation, 'désignation de la ligne')
  verifierParmi(ligne.unite, UNITES_PRODUIT, 'unité')
  if (ligne.classification !== undefined && ligne.classification !== null) {
    verifierParmi(ligne.classification, CATEGORIES_CLASSIFICATION, 'classification')
  }
}

const versDonneesLignePied = (lignes: LigneFactureAInserer[]): DonneesLignePied[] =>
  lignes.map((ligne) => ({
    quantiteMilliemes: ligne.quantite_milliemes,
    puHtCentimes: ligne.pu_ht_centimes,
    remiseBps: ligne.remise_bps,
    rabaisMarcheBps: ligne.rabais_marche_bps,
  }))

const construireParametresPied = (
  parametres: ParametresMaterialisationFacture,
  marchePublic: boolean,
): ParametresPiedFacture => ({
  lignes: versDonneesLignePied(parametres.lignes),
  retenueGarantieBps: parametres.retenue_garantie_bps,
  remboursementAvanceCentimes: parametres.remboursement_avance_centimes,
  marchePublic,
  tauxTvaBps: parametres.taux_tva_bps,
})

// L'écart d'arrondi est une propriété des lignes (arrondi ligne par ligne du
// rabais marché vs rabais théorique sur le total du groupe), indépendante du
// type de document. Le domaine ne l'expose que via la chaîne d'audit et, pour
// les marchés publics, en l'intégrant au net commercial. On le déduit en
// comparant les deux pieds calculés sur les mêmes lignes : net commercial
// marché public − net commercial document privé = écart (signé, |écart| ≤ 2).
// Aucune extension du domaine, aucun parse de la chaîne d'audit.
const calculerEcartCentimes = (parametres: ParametresMaterialisationFacture): number => {
  const piedPublic = calculerPiedFacture(construireParametresPied(parametres, true))
  const piedPrive = calculerPiedFacture(construireParametresPied(parametres, false))
  return piedPublic.net_commercial_ht_centimes - piedPrive.net_commercial_ht_centimes
}

// Ligne éligible = ligne avec rabais marché (taux > 0) ; l'écart d'arrondi est
// porté sur celle de montant net le plus élevé (égalité → première ligne),
// même critère que le domaine (§4.4.5bis).
const trouverLigneEligible = (lignesCalculees: LigneCalculee[], lignes: LigneFactureAInserer[]): number => {
  let index = -1
  let netMaximum = -1
  lignesCalculees.forEach((ligneCalculee, indexCourant) => {
    if (lignes[indexCourant].rabais_marche_bps > 0 && ligneCalculee.net > netMaximum) {
      netMaximum = ligneCalculee.net
      index = indexCourant
    }
  })
  return index
}

// Contexte d'audit (§4.4.5bis, migration 3) : le dépôt renseigne motif et
// écart dans contexte_audit DANS sa transaction, juste avant l'INSERT/UPDATE
// de ligne ; les triggers peuplent journal_audit. Le dépôt n'écrit jamais
// directement dans journal_audit.
const renseignerContexteAudit = (base: Base, motif: string, ecartCentimes: number): void => {
  base
    .prepare(
      `INSERT INTO contexte_audit (id, motif, ecart_centimes) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET motif = excluded.motif, ecart_centimes = excluded.ecart_centimes`,
    )
    .run(motif, ecartCentimes)
}

const viderContexteAudit = (base: Base): void => {
  base.prepare('DELETE FROM contexte_audit WHERE id = 1').run()
}

const LIGNE_SELECT_INSERT = `
  INSERT INTO lignes_facture (
    facture_id, produit_id, designation, unite, quantite_milliemes,
    pu_ht_centimes, remise_bps, montant_ht_brut_centimes,
    montant_ht_remise_centimes, rabais_marche_bps,
    montant_rabais_marche_centimes, montant_ht_net_centimes,
    famille_id, sous_famille_id, classification
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

export const materialiserLignesEtPiedFacture = (
  base: Base,
  factureId: number,
  parametres: ParametresMaterialisationFacture,
): ResultatMaterialisation => {
  verifierEntierPositif(factureId, 'identifiant de facture')
  for (const ligne of parametres.lignes) {
    verifierLigneSaisie(ligne)
  }

  const executer = base.transaction((): ResultatMaterialisation => {
    const facture = base
      .prepare('SELECT id FROM factures WHERE id = ? AND supprime_le IS NULL')
      .get(factureId)
    if (facture === undefined) {
      throw new Error(`Matérialisation impossible : la facture ${String(factureId)} est introuvable ou supprimée.`)
    }

    const pied = calculerPiedFacture(construireParametresPied(parametres, parametres.marche_public))
    const ecartCentimes = calculerEcartCentimes(parametres)
    const lignesCalculees = calculerLignes(parametres.lignes)

    // Garde interne : la présence d'une trace d'ajustement dans le pied doit
    // correspondre exactement à un écart non nul (cohérence domaine/dépôt).
    if ((pied.ajustement_ecart_audit === null) !== (ecartCentimes === 0)) {
      throw new Error('Incohérence interne : l’écart d’arrondi du pied ne correspond pas à la trace d’audit.')
    }

    // Contexte d'audit vide au départ : les INSERT/UPDATE de lignes normales
    // sont audités sans motif ni écart.
    viderContexteAudit(base)

    // INSERT des lignes commerciales avec les montants calculés ligne par ligne.
    const idLignesInserees: number[] = []
    const insertionLigne = base.prepare(LIGNE_SELECT_INSERT)
    for (let index = 0; index < parametres.lignes.length; index += 1) {
      const ligne = parametres.lignes[index]
      const valeur = lignesCalculees[index]
      const resultat = insertionLigne.run(
        factureId,
        ligne.produit_id ?? null,
        ligne.designation,
        ligne.unite,
        versCentimes(ligne.quantite_milliemes),
        versCentimes(ligne.pu_ht_centimes),
        versCentimes(ligne.remise_bps),
        versCentimes(valeur.brut),
        versCentimes(valeur.brut - valeur.remise),
        versCentimes(ligne.rabais_marche_bps),
        versCentimes(valeur.rabaisMarche),
        versCentimes(valeur.net),
        ligne.famille_id ?? null,
        ligne.sous_famille_id ?? null,
        ligne.classification ?? null,
      )
      idLignesInserees.push(Number(resultat.lastInsertRowid))
    }

    // Matérialisation de l'écart d'arrondi (§4.4.5bis) :
    // - Marché public : écart (signé) porté sur la ligne éligible de montant
    //   net le plus élevé, tracé en audit (motif + delta).
    // - Document privé : ligne AJUSTEMENT_ARRONDI optionnelle dont le net =
    //   l'écart (signé), tracée en audit ; jamais créée si l'écart est nul.
    let ligneCibleId: number | null = null
    let ajustementMaterialise = false
    if (ecartCentimes !== 0) {
      if (parametres.marche_public) {
        const indexEligible = trouverLigneEligible(lignesCalculees, parametres.lignes)
        if (indexEligible < 0) {
          throw new Error('Écart d’arrondi non nul sans ligne éligible : incohérence.')
        }
        const idLigneCible = idLignesInserees[indexEligible]
        const nouveauNet = versCentimes(lignesCalculees[indexEligible].net + ecartCentimes)
        renseignerContexteAudit(base, MOTIF_AJUSTEMENT, versCentimes(ecartCentimes))
        base
          .prepare("UPDATE lignes_facture SET montant_ht_net_centimes = ?, modifie_le = datetime('now') WHERE id = ?")
          .run(nouveauNet, idLigneCible)
        viderContexteAudit(base)
        ligneCibleId = idLigneCible
        ajustementMaterialise = true
      } else {
        renseignerContexteAudit(base, MOTIF_AJUSTEMENT, versCentimes(ecartCentimes))
        const resultat = base
          .prepare(
            `INSERT INTO lignes_facture (
               facture_id, designation, unite, quantite_milliemes, pu_ht_centimes,
               remise_bps, montant_ht_brut_centimes, montant_ht_remise_centimes,
               rabais_marche_bps, montant_rabais_marche_centimes, montant_ht_net_centimes,
               type_ligne
             ) VALUES (?, ?, 'U', 0, 0, 0, 0, 0, 0, 0, ?, ?)`,
          )
          .run(factureId, DESIGNATION_AJUSTEMENT, versCentimes(ecartCentimes), TYPE_LIGNE_AJUSTEMENT)
        viderContexteAudit(base)
        ligneCibleId = Number(resultat.lastInsertRowid)
        idLignesInserees.push(ligneCibleId)
        ajustementMaterialise = true
      }
    }

    // Totaux de la facture. Invariant au centime près : la somme des montants
    // nets de ligne (après matérialisation de l'écart) = net commercial HT.
    // - Marché public : le pied intègre déjà l'écart (ligne éligible ajustée).
    // - Document privé : le pied ne l'intègre pas (décision 15/08/2026) ; la
    //   ligne AJUSTEMENT_ARRONDI absorbe l'écart, la chaîne net commercial →
    //   retenue → total HT → TVA → TTC est donc recalculée sur le net
    //   commercial corrigé, avec les mêmes arrondis que le domaine. Le droit
    //   de timbre ne figure plus dans le pied ni ici (§4.7.3) ; le champ
    //   droit_timbre_centimes de la facture est déprécié et laissé tel quel.
    let netCommercial = pied.net_commercial_ht_centimes
    let retenueGarantie = pied.retenue_garantie_centimes
    let totalHt = pied.total_ht_centimes
    let totalTva = pied.total_tva_centimes
    let totalTtc = pied.total_ttc_centimes
    let netAPayer = pied.net_a_payer_centimes
    if (!parametres.marche_public && ecartCentimes !== 0) {
      netCommercial = versCentimes(netCommercial + ecartCentimes)
      retenueGarantie = versCentimes(
        Montant.depuisCentimes(netCommercial).appliquerTauxBps(parametres.retenue_garantie_bps).centimes,
      )
      totalHt = versCentimes(netCommercial - parametres.remboursement_avance_centimes - retenueGarantie)
      const tauxTvaBps = parametres.taux_tva_bps ?? TAUX_TVA_DEFAUT_BPS
      totalTva = versCentimes(Montant.depuisCentimes(totalHt).appliquerTauxBps(tauxTvaBps).centimes)
      totalTtc = versCentimes(totalHt + totalTva)
      netAPayer = versCentimes(totalTtc)
    }

    const miseAJour = base
      .prepare(
        `UPDATE factures SET
           total_ht_lignes_centimes = ?, total_remises_centimes = ?,
           net_commercial_ht_centimes = ?, retenue_garantie_centimes = ?,
           total_ht_centimes = ?, total_tva_centimes = ?,
           total_ttc_centimes = ?, net_a_payer_centimes = ?,
           modifie_le = datetime('now')
         WHERE id = ?`,
      )
      .run(
        versCentimes(pied.total_ht_lignes_centimes),
        versCentimes(pied.total_remises_centimes),
        versCentimes(netCommercial),
        versCentimes(retenueGarantie),
        versCentimes(totalHt),
        versCentimes(totalTva),
        versCentimes(totalTtc),
        versCentimes(netAPayer),
        factureId,
      )
    if (miseAJour.changes !== 1) {
      throw new Error('Matérialisation impossible : la mise à jour des totaux a échoué.')
    }

    // Contexte d'audit laissé propre en fin de transaction.
    viderContexteAudit(base)

    return {
      pied,
      ecart_centimes: ecartCentimes,
      ajustement_materialise: ajustementMaterialise,
      ligne_cible_id: ligneCibleId,
      id_lignes_inserees: idLignesInserees,
    }
  })

  return executer()
}

export interface LigneFactureLue {
  id: number
  facture_id: number
  produit_id: number | null
  designation: string
  unite: string | null
  quantite_milliemes: number
  pu_ht_centimes: number
  remise_bps: number
  montant_ht_brut_centimes: number
  montant_ht_remise_centimes: number
  rabais_marche_bps: number
  montant_rabais_marche_centimes: number
  montant_ht_net_centimes: number
  type_ligne: string | null
  famille_id: number | null
  sous_famille_id: number | null
  classification: string | null
}

export const lireLignesFacture = (base: Base, factureId: number): LigneFactureLue[] =>
  base
    .prepare('SELECT * FROM lignes_facture WHERE facture_id = ? AND supprime_le IS NULL ORDER BY id')
    .all(factureId) as LigneFactureLue[]
