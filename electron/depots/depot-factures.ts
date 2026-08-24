import { CATEGORIES_CLASSIFICATION, type CategorieClassification } from '../../domaine/classification'
import { validerDonneesAvoir, validerSelectionsPartielles, validerSelectionsParLignes, genererLignesAvoir, type LigneFactureOrigine } from '../../domaine/avoir'
import type { StatutFacture, TypeDocumentFacture } from '../../domaine/entites-facturation'
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
import { machineEtatsFacture, transiter } from '../../domaine/machines-etats'
import { attribuerNumero } from '../../domaine/numerotation'
import type { Base } from '../db/connexion'
import { versCentimes } from './conversion-centimes'
import { lireCompteur, incrementerCompteur } from './depot-compteurs'
import { lireAffaireParId } from './depot-affaires'

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
  autoriserQuantitesNegatives?: boolean
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
  const piedPublic = calculerPiedFacture({
    ...construireParametresPied(parametres, true),
    autoriserQuantitesNegatives: parametres.autoriserQuantitesNegatives,
  })
  const piedPrive = calculerPiedFacture({
    ...construireParametresPied(parametres, false),
    autoriserQuantitesNegatives: parametres.autoriserQuantitesNegatives,
  })
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

    const pied = calculerPiedFacture({
      ...construireParametresPied(parametres, parametres.marche_public),
      autoriserQuantitesNegatives: parametres.autoriserQuantitesNegatives,
    })
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

    const { ligneCibleId, ligneAjoutee, ajustementMaterialise } = appliquerEcartEtMaterialiserTotaux(
      base,
      factureId,
      parametres,
      lignesCalculees,
      ecartCentimes,
      idLignesInserees,
    )
    if (ligneAjoutee && ligneCibleId !== null) {
      idLignesInserees.push(ligneCibleId)
    }

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

// Application de l'écart d'arrondi (§4.4.5bis) et matérialisation des totaux
// de la facture, partagée entre l'insertion complète des lignes (avoirs,
// factures issues de BL) et la validation d'une saisie manuelle.
const appliquerEcartEtMaterialiserTotaux = (
  base: Base,
  factureId: number,
  parametres: ParametresMaterialisationFacture,
  lignesCalculees: LigneCalculee[],
  ecartCentimes: number,
  idsLignes: number[],
): { ligneCibleId: number | null; ligneAjoutee: boolean; ajustementMaterialise: boolean } => {
  const pied = calculerPiedFacture({
    ...construireParametresPied(parametres, parametres.marche_public),
    autoriserQuantitesNegatives: parametres.autoriserQuantitesNegatives,
  })

  // Garde interne : la présence d'une trace d'ajustement dans le pied doit
  // correspondre exactement à un écart non nul (cohérence domaine/dépôt).
  if ((pied.ajustement_ecart_audit === null) !== (ecartCentimes === 0)) {
    throw new Error('Incohérence interne : l’écart d’arrondi du pied ne correspond pas à la trace d’audit.')
  }

  // Matérialisation de l'écart d'arrondi (§4.4.5bis) :
  // - Marché public : écart (signé) porté sur la ligne éligible de montant
  //   net le plus élevé, tracé en audit (motif + delta).
  // - Document privé : ligne AJUSTEMENT_ARRONDI optionnelle dont le net =
  //   l'écart (signé), tracée en audit ; jamais créée si l'écart est nul.
  let ligneCibleId: number | null = null
  let ligneAjoutee = false
  let ajustementMaterialise = false
  if (ecartCentimes !== 0) {
    if (parametres.marche_public) {
      const indexEligible = trouverLigneEligible(lignesCalculees, parametres.lignes)
      if (indexEligible < 0) {
        throw new Error('Écart d’arrondi non nul sans ligne éligible : incohérence.')
      }
      const idLigneCible = idsLignes[indexEligible]
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
      ligneAjoutee = true
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

  return { ligneCibleId, ligneAjoutee, ajustementMaterialise }
}

// Matérialisation des totaux d'une facture dont les lignes existent déjà en
// base (saisie manuelle), appelée à la validation : même chaîne de calcul que
// materialiserLignesEtPiedFacture, sans réinsertion des lignes commerciales.
// Le caractère marché public est déduit du type de l'affaire rattachée
// (§4.4.5bis) ; à défaut d'affaire, le document est traité comme privé.
export const materialiserTotauxFactureValidee = (base: Base, factureId: number): void => {
  verifierEntierPositif(factureId, 'identifiant de facture')

  const executer = base.transaction((): void => {
    const facture = lireFactureParId(base, factureId)
    if (facture === null) {
      throw new Error(`Matérialisation impossible : la facture ${String(factureId)} est introuvable ou supprimée.`)
    }

    const lignesDb = lireLignesFacture(base, factureId)
    if (lignesDb.length === 0) {
      throw new Error('Matérialisation impossible : la facture ne contient aucune ligne.')
    }

    const affaire = facture.affaire_id !== null ? lireAffaireParId(base, facture.affaire_id) : null
    const parametres: ParametresMaterialisationFacture = {
      lignes: lignesDb.map((ligneDb) => ({
        designation: ligneDb.designation,
        unite: (ligneDb.unite ?? 'U') as Unite,
        quantite_milliemes: ligneDb.quantite_milliemes,
        pu_ht_centimes: ligneDb.pu_ht_centimes,
        remise_bps: ligneDb.remise_bps,
        rabais_marche_bps: ligneDb.rabais_marche_bps,
      })),
      retenue_garantie_bps: facture.retenue_garantie_bps,
      remboursement_avance_centimes: facture.remboursement_avance_centimes,
      marche_public: affaire?.type_affaire === 'MARCHE_PUBLIC',
      autoriserQuantitesNegatives: facture.type_document === 'AV',
    }

    const lignesCalculees = calculerLignes(parametres.lignes)
    const ecartCentimes = calculerEcartCentimes(parametres)
    appliquerEcartEtMaterialiserTotaux(
      base,
      factureId,
      parametres,
      lignesCalculees,
      ecartCentimes,
      lignesDb.map((ligneDb) => ligneDb.id),
    )
  })
  executer()
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

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export interface FactureDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  statut: StatutFacture
  type_document: TypeDocumentFacture
  numero: string | null
  date_facture: string
  date_echeance: string | null
  affaire_id: number | null
  client_id: number
  adresse_facturation: string | null
  adresse_facturation_type: string | null
  nif_client: string | null
  numero_bc_client: string | null
  rabais_global_bps: number
  retenue_garantie_bps: number
  remboursement_avance_centimes: number
  mode_reglement_prevu: string | null
  mode_reglement_effectif: string | null
  total_ht_lignes_centimes: number
  total_remises_centimes: number
  net_commercial_ht_centimes: number
  retenue_garantie_centimes: number
  total_ht_centimes: number
  total_tva_centimes: number
  total_ttc_centimes: number
  droit_timbre_centimes: number
  interets_moratoires_centimes: number
  net_a_payer_centimes: number
  facture_origine_id: number | null
  motif_avoir: string | null
  date_validation: string | null
  nombre_impressions: number
  exercice_id: number | null
}

export interface DonneesCreationFactureDepot {
  statut: string
  type_document: string
  date_facture: string
  client_id: number
  affaire_id?: number | null
  date_echeance?: string | null
  adresse_facturation?: string | null
  adresse_facturation_type?: string | null
  nif_client?: string | null
  numero_bc_client?: string | null
  rabais_global_bps?: number
  retenue_garantie_bps?: number
  remboursement_avance_centimes?: number
  mode_reglement_prevu?: string | null
  mode_reglement_effectif?: string | null
  facture_origine_id?: number | null
  motif_avoir?: string | null
  exercice_id?: number | null
}

export interface DonneesAvoirDepot {
  factureOrigineId: number
  motifAvoir: string
  modeAvoir: 'TOTAL' | 'PAR_LIGNES' | 'PARTIEL'
  selections?: readonly { ligneOrigineId: number; quantiteMilliemes: number }[]
}

export const creerFacture = (base: Base, donnees: DonneesCreationFactureDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO factures (
         statut, type_document, date_facture, client_id, affaire_id,
         date_echeance, adresse_facturation, adresse_facturation_type,
         nif_client, numero_bc_client, rabais_global_bps,
         retenue_garantie_bps, remboursement_avance_centimes,
         mode_reglement_prevu, mode_reglement_effectif,
         facture_origine_id, motif_avoir, exercice_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.statut,
      donnees.type_document,
      donnees.date_facture,
      donnees.client_id,
      normaliser(donnees.affaire_id),
      normaliser(donnees.date_echeance),
      normaliser(donnees.adresse_facturation),
      normaliser(donnees.adresse_facturation_type),
      normaliser(donnees.nif_client),
      normaliser(donnees.numero_bc_client),
      donnees.rabais_global_bps ?? 0,
      donnees.retenue_garantie_bps ?? 0,
      donnees.remboursement_avance_centimes ?? 0,
      normaliser(donnees.mode_reglement_prevu),
      normaliser(donnees.mode_reglement_effectif),
      normaliser(donnees.facture_origine_id),
      normaliser(donnees.motif_avoir),
      normaliser(donnees.exercice_id),
    )
  return Number(resultat.lastInsertRowid)
}

export const lireFactureParId = (base: Base, id: number): FactureDepot | null => {
  const ligne = base
    .prepare('SELECT * FROM factures WHERE id = ? AND supprime_le IS NULL')
    .get(id) as FactureDepot | undefined
  return ligne ?? null
}

export const listerFactures = (
  base: Base,
  filtres?: { statut?: string; clientId?: number; affaireId?: number },
): FactureDepot[] => {
  const conditions: string[] = ['supprime_le IS NULL']
  const valeurs: unknown[] = []

  if (filtres?.statut !== undefined) {
    conditions.push('statut = ?')
    valeurs.push(filtres.statut)
  }
  if (filtres?.clientId !== undefined) {
    conditions.push('client_id = ?')
    valeurs.push(filtres.clientId)
  }
  if (filtres?.affaireId !== undefined) {
    conditions.push('affaire_id = ?')
    valeurs.push(filtres.affaireId)
  }

  return base
    .prepare(`SELECT * FROM factures WHERE ${conditions.join(' AND ')} ORDER BY date_facture DESC, numero`)
    .all(...valeurs) as FactureDepot[]
}

const CHAMPS_MODIFIABLES_FACTURE: Record<string, string> = {
  adresse_facturation: 'adresse_facturation',
  adresse_facturation_type: 'adresse_facturation_type',
  nif_client: 'nif_client',
  numero_bc_client: 'numero_bc_client',
  retenue_garantie_bps: 'retenue_garantie_bps',
  remboursement_avance_centimes: 'remboursement_avance_centimes',
  mode_reglement_prevu: 'mode_reglement_prevu',
  date_echeance: 'date_echeance',
  affaire_id: 'affaire_id',
  exercice_id: 'exercice_id',
}

export const modifierFacture = (
  base: Base,
  id: number,
  donneesPartielles: Partial<DonneesCreationFactureDepot>,
): boolean => {
  const existant = lireFactureParId(base, id)
  if (existant === null) {
    return false
  }
  const champs: string[] = []
  const valeurs: unknown[] = []

  for (const [cle, colonne] of Object.entries(CHAMPS_MODIFIABLES_FACTURE)) {
    if (cle in donneesPartielles) {
      champs.push(`${colonne} = ?`)
      valeurs.push(donneesPartielles[cle as keyof DonneesCreationFactureDepot] ?? null)
    }
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE factures SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementFacture = (base: Base, id: number): boolean => {
  const facture = lireFactureParId(base, id)
  if (facture === null) {
    return false
  }
  if (facture.statut !== 'BROUILLON') {
    throw new Error(
      `Suppression impossible : la facture est au statut « ${facture.statut} ». Seule une facture BROUILLON peut être supprimée.`,
    )
  }
  const resultat = base
    .prepare(
      `UPDATE factures
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}

export const validerFacture = (base: Base, id: number): FactureDepot => {
  const executer = base.transaction((): FactureDepot => {
    const facture = lireFactureParId(base, id)
    if (facture === null) {
      throw new Error(`Validation impossible : la facture ${String(id)} est introuvable.`)
    }
    if (facture.statut !== 'BROUILLON') {
      throw new Error(
        `Validation impossible : la facture est au statut « ${facture.statut} ». Seule une facture BROUILLON peut être validée.`,
      )
    }

    const nombreLignes = base
      .prepare('SELECT COUNT(*) AS total FROM lignes_facture WHERE facture_id = ? AND supprime_le IS NULL')
      .get(id) as { total: number }
    if (nombreLignes.total === 0) {
      throw new Error('Validation impossible : la facture doit contenir au moins une ligne.')
    }

    const annee = Number(facture.date_facture.slice(0, 4))
    const dernierNumero = lireCompteur(base, facture.type_document, annee)?.dernierNumero ?? null
    const attribution = attribuerNumero({ codeDocument: facture.type_document, annee, dernierNumero })
    incrementerCompteur(base, facture.type_document, annee)

    const statutCible = transiter(machineEtatsFacture, 'BROUILLON', 'VALIDER')

    base
      .prepare(
        `UPDATE factures
           SET statut = ?, numero = ?, date_validation = datetime('now'), modifie_le = datetime('now')
         WHERE id = ?`,
      )
      .run(statutCible, attribution.numero, id)

    materialiserTotauxFactureValidee(base, id)

    return lireFactureParId(base, id) as FactureDepot
  })
  return executer()
}

export const creerLigneFacture = (base: Base, donnees: LigneFactureAInserer & { facture_id: number }): number => {
  verifierLigneSaisie(donnees)
  const montantBrut = Montant.depuisCentimes(donnees.pu_ht_centimes)
    .foisQuantiteMilliemes(donnees.quantite_milliemes).centimes
  const remise = Montant.depuisCentimes(montantBrut).appliquerTauxBps(donnees.remise_bps).centimes
  const rabaisMarche = Montant.depuisCentimes(montantBrut).appliquerTauxBps(donnees.rabais_marche_bps).centimes
  const montantNet = montantBrut - remise - rabaisMarche

  const resultat = base
    .prepare(
      `INSERT INTO lignes_facture (
         facture_id, produit_id, designation, unite, quantite_milliemes,
         pu_ht_centimes, remise_bps, montant_ht_brut_centimes,
         montant_ht_remise_centimes, rabais_marche_bps,
         montant_rabais_marche_centimes, montant_ht_net_centimes,
         famille_id, sous_famille_id, classification
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.facture_id,
      donnees.produit_id ?? null,
      donnees.designation,
      donnees.unite,
      donnees.quantite_milliemes,
      donnees.pu_ht_centimes,
      donnees.remise_bps,
      montantBrut,
      montantBrut - remise,
      donnees.rabais_marche_bps,
      rabaisMarche,
      montantNet,
      donnees.famille_id ?? null,
      donnees.sous_famille_id ?? null,
      donnees.classification ?? null,
    )
  return Number(resultat.lastInsertRowid)
}

export const modifierLigneFacture = (
  base: Base,
  id: number,
  donnees: Partial<LigneFactureAInserer>,
): boolean => {
  const existant = base
    .prepare('SELECT * FROM lignes_facture WHERE id = ? AND supprime_le IS NULL')
    .get(id) as LigneFactureLue | undefined
  if (existant === undefined) {
    return false
  }

  const factureParente = lireFactureParId(base, existant.facture_id)
  if (factureParente === null || factureParente.statut !== 'BROUILLON') {
    throw new Error(
      'Modification impossible : la ligne appartient à une facture qui n\'est plus au statut BROUILLON.',
    )
  }

  const champs: string[] = []
  const valeurs: unknown[] = []

  if (donnees.designation !== undefined) {
    champs.push('designation = ?')
    valeurs.push(donnees.designation)
  }
  if (donnees.unite !== undefined) {
    champs.push('unite = ?')
    valeurs.push(donnees.unite)
  }
  if (donnees.quantite_milliemes !== undefined) {
    champs.push('quantite_milliemes = ?')
    valeurs.push(donnees.quantite_milliemes)
  }
  if (donnees.pu_ht_centimes !== undefined) {
    champs.push('pu_ht_centimes = ?')
    valeurs.push(donnees.pu_ht_centimes)
  }
  if (donnees.remise_bps !== undefined) {
    champs.push('remise_bps = ?')
    valeurs.push(donnees.remise_bps)
  }
  if (donnees.rabais_marche_bps !== undefined) {
    champs.push('rabais_marche_bps = ?')
    valeurs.push(donnees.rabais_marche_bps)
  }
  if (donnees.produit_id !== undefined) {
    champs.push('produit_id = ?')
    valeurs.push(donnees.produit_id)
  }
  if (donnees.famille_id !== undefined) {
    champs.push('famille_id = ?')
    valeurs.push(donnees.famille_id)
  }
  if (donnees.sous_famille_id !== undefined) {
    champs.push('sous_famille_id = ?')
    valeurs.push(donnees.sous_famille_id)
  }
  if (donnees.classification !== undefined) {
    champs.push('classification = ?')
    valeurs.push(donnees.classification)
  }

  if (champs.length === 0) {
    return true
  }

  const recalculeQuantite = donnees.quantite_milliemes ?? existant.quantite_milliemes
  const recalculePu = donnees.pu_ht_centimes ?? existant.pu_ht_centimes
  const recalculeRemise = donnees.remise_bps ?? existant.remise_bps
  const recalculeRabais = donnees.rabais_marche_bps ?? existant.rabais_marche_bps

  const montantBrut = Montant.depuisCentimes(recalculePu)
    .foisQuantiteMilliemes(recalculeQuantite).centimes
  const remise = Montant.depuisCentimes(montantBrut).appliquerTauxBps(recalculeRemise).centimes
  const rabaisMarche = Montant.depuisCentimes(montantBrut).appliquerTauxBps(recalculeRabais).centimes
  const montantNet = montantBrut - remise - rabaisMarche

  champs.push(
    'montant_ht_brut_centimes = ?',
    'montant_ht_remise_centimes = ?',
    'montant_rabais_marche_centimes = ?',
    'montant_ht_net_centimes = ?',
    "modifie_le = datetime('now')",
  )
  valeurs.push(montantBrut, montantBrut - remise, rabaisMarche, montantNet, id)

  const resultat = base
    .prepare(`UPDATE lignes_facture SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLigneFacture = (base: Base, id: number): boolean => {
  const existant = base
    .prepare('SELECT * FROM lignes_facture WHERE id = ? AND supprime_le IS NULL')
    .get(id) as LigneFactureLue | undefined
  if (existant === undefined) {
    return false
  }

  const factureParente = lireFactureParId(base, existant.facture_id)
  if (factureParente === null || factureParente.statut !== 'BROUILLON') {
    throw new Error(
      'Suppression impossible : la ligne appartient à une facture qui n\'est plus au statut BROUILLON.',
    )
  }

  const resultat = base.prepare('DELETE FROM lignes_facture WHERE id = ?').run(id)
  return resultat.changes === 1
}

export const listerAvoirs = (base: Base, factureId: number): FactureDepot[] =>
  base
    .prepare(
      `SELECT * FROM factures
        WHERE facture_origine_id = ? AND type_document = 'AV' AND supprime_le IS NULL
        ORDER BY date_facture DESC`,
    )
    .all(factureId) as FactureDepot[]

export const creerAvoir = (
  base: Base,
  donnees: DonneesAvoirDepot & { clientId: number; affaireId?: number; dateFacture: string },
): number => {
  const executer = base.transaction((): number => {
    const factureOrigine = lireFactureParId(base, donnees.factureOrigineId)
    if (factureOrigine === null) {
      throw new Error(`Facture d'origine ${String(donnees.factureOrigineId)} introuvable.`)
    }

    validerDonneesAvoir({
      factureOrigineId: donnees.factureOrigineId,
      motifAvoir: donnees.motifAvoir,
      modeAvoir: donnees.modeAvoir,
      selections: donnees.selections,
    })

    const lignesOrigineDB = lireLignesFacture(base, donnees.factureOrigineId)
    const lignesOrigine: LigneFactureOrigine[] = lignesOrigineDB.map((ligne) => ({
      id: ligne.id,
      designation: ligne.designation,
      unite: ligne.unite ?? 'U',
      quantite_milliemes: ligne.quantite_milliemes,
      pu_ht_centimes: ligne.pu_ht_centimes,
      remise_bps: ligne.remise_bps,
      rabais_marche_bps: ligne.rabais_marche_bps,
      montant_ht_net_centimes: ligne.montant_ht_net_centimes,
    }))

    if (donnees.modeAvoir === 'PARTIEL' && donnees.selections !== undefined) {
      validerSelectionsPartielles(donnees.selections, lignesOrigine)
    } else if (donnees.modeAvoir === 'PAR_LIGNES' && donnees.selections !== undefined) {
      validerSelectionsParLignes(donnees.selections, lignesOrigine)
    }

    const lignesAvoir = genererLignesAvoir(lignesOrigine, donnees.modeAvoir, donnees.selections)

    const resultatFacture = base
      .prepare(
        `INSERT INTO factures (
           statut, type_document, numero, date_facture, client_id, affaire_id,
           facture_origine_id, motif_avoir
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'BROUILLON',
        'AV',
        null,
        donnees.dateFacture,
        donnees.clientId,
        normaliser(donnees.affaireId),
        donnees.factureOrigineId,
        donnees.motifAvoir,
      )
    const idAvoir = Number(resultatFacture.lastInsertRowid)

    const parametresLignes: LigneFactureAInserer[] = lignesAvoir.map((ligne) => ({
      designation: ligne.designation,
      unite: ligne.unite as Unite,
      quantite_milliemes: ligne.quantite_milliemes,
      pu_ht_centimes: ligne.pu_ht_centimes,
      remise_bps: ligne.remise_bps,
      rabais_marche_bps: ligne.rabais_marche_bps,
    }))

    const factureOriginePourPied = lireFactureParId(base, donnees.factureOrigineId) as FactureDepot
    materialiserLignesEtPiedFacture(base, idAvoir, {
      lignes: parametresLignes,
      retenue_garantie_bps: factureOriginePourPied.retenue_garantie_bps,
      remboursement_avance_centimes: 0,
      marche_public: false,
      autoriserQuantitesNegatives: true,
    })

    return idAvoir
  })
  return executer()
}
