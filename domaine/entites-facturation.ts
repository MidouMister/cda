import { Montant } from './montant'
import { Nif, NumeroDocument } from './identites'
import type { CategorieClassification } from './classification'
import {
  MODES_REGLEMENT,
  MODES_REGLEMENT_EFFECTIFS,
  UNITES_PRODUIT,
  verifierBinaire,
  verifierChaineNonVide,
  verifierDateIso,
  verifierEntierNonNegatif,
  verifierEntierPositif,
  verifierParmi,
  type ModeReglement,
  type ModeReglementEffectif,
  type Unite,
} from './entites-referentielles'
import { calculerMontantLigne } from './entites-commerciales'

export const TYPES_DOCUMENT_FACTURE = ['FA', 'AC', 'AV', 'FS', 'ND'] as const
export type TypeDocumentFacture = (typeof TYPES_DOCUMENT_FACTURE)[number]

export const STATUTS_FACTURE = ['BROUILLON', 'VALIDE', 'IMPRIMEE', 'ENVOYEE', 'PAYEE', 'ARCHIVEE'] as const
export type StatutFacture = (typeof STATUTS_FACTURE)[number]

export const TYPES_ADRESSE_FACTURATION = ['SIEGE', 'CHANTIER'] as const
export type TypeAdresseFacturation = (typeof TYPES_ADRESSE_FACTURATION)[number]

export const STATUTS_BON_LIVRAISON = ['EMIS', 'FACTURE'] as const
export type StatutBonLivraison = (typeof STATUTS_BON_LIVRAISON)[number]

const verifierIdOptionnel = (valeur: number | undefined, libelle: string): void => {
  if (valeur !== undefined) {
    verifierEntierPositif(valeur, libelle)
  }
}

const verifierNonNegatifOptionnel = (valeur: number | undefined, libelle: string): void => {
  if (valeur !== undefined) {
    verifierEntierNonNegatif(valeur, libelle)
  }
}

const verifierDateOptionnelle = (valeur: string | undefined, libelle: string): string | null => {
  if (valeur === undefined) {
    return null
  }
  verifierDateIso(valeur, libelle)
  return valeur
}

const chaineOuNulle = (valeur: string | undefined): string | null => valeur ?? null

// Enchaînement §4.4.6 : HT lignes − remises (ligne + rabais marché ligne) =
// net commercial ; puis remboursement d'avance et retenue de garantie (base HT,
// avant TVA) ; TVA ; TTC. NET À PAYER = total TTC : le droit de timbre ne
// figure plus dans le pied (décision 15/08/2026) ; l'écart d'arrondi du rabais
// marché est tracé dans `ajustement_ecart_audit` (chaîne pour le journal d'audit,
// écrite par le dépôt en Phase D).
export interface PiedFacture {
  readonly total_ht_lignes_centimes: number
  readonly total_remises_centimes: number
  readonly net_commercial_ht_centimes: number
  readonly remboursement_avance_centimes: number
  readonly retenue_garantie_centimes: number
  readonly total_ht_centimes: number
  readonly total_tva_centimes: number
  readonly total_ttc_centimes: number
  readonly net_a_payer_centimes: number
  readonly ajustement_ecart_audit: string | null
}

export interface DonneesFacture {
  id: number
  statut?: StatutFacture
  type_document: TypeDocumentFacture
  numero?: NumeroDocument
  date_facture: string
  date_echeance?: string
  affaire_id?: number
  client_id: number
  adresse_facturation?: string
  adresse_facturation_type?: TypeAdresseFacturation
  nif_client?: Nif
  numero_bc_client?: string
  rabais_global_bps?: number
  retenue_garantie_bps?: number
  remboursement_avance_centimes?: number
  // mode_reglement_prevu : historique (MODES_REGLEMENT complet), valeur de
  // référence au moment de l'émission — conservé tel quel.
  mode_reglement_prevu?: ModeReglement
  // mode_reglement_effectif : mode réellement utilisé à l'encaissement — limité
  // aux modes EFFECTIFS de la version courante (décision 15/08/2026).
  mode_reglement_effectif?: ModeReglementEffectif
  total_ht_lignes_centimes?: number
  total_remises_centimes?: number
  net_commercial_ht_centimes?: number
  retenue_garantie_centimes?: number
  total_ht_centimes?: number
  total_tva_centimes?: number
  total_ttc_centimes?: number
  // DÉPRÉCIÉ (15/08/2026) : conservé pour l'historique/compatibilité de la base,
  // plus alimenté par le moteur de facturation (timbre manuel à l'encaissement).
  droit_timbre_centimes?: number
  interets_moratoires_centimes?: number
  net_a_payer_centimes?: number
  facture_origine_id?: number
  motif_avoir?: string
  date_validation?: string
  nombre_impressions?: number
  exercice_id?: number
}

interface FactureNormalise {
  readonly id: number
  readonly statut: StatutFacture
  readonly type_document: TypeDocumentFacture
  readonly numero: NumeroDocument | null
  readonly date_facture: string
  readonly date_echeance: string | null
  readonly affaire_id: number | null
  readonly client_id: number
  readonly adresse_facturation: string | null
  readonly adresse_facturation_type: TypeAdresseFacturation | null
  readonly nif_client: Nif | null
  readonly numero_bc_client: string | null
  readonly rabais_global_bps: number
  readonly retenue_garantie_bps: number
  readonly remboursement_avance_centimes: number
  readonly mode_reglement_prevu: ModeReglement | null
  readonly mode_reglement_effectif: ModeReglementEffectif | null
  readonly total_ht_lignes_centimes: number
  readonly total_remises_centimes: number
  readonly net_commercial_ht_centimes: number
  readonly retenue_garantie_centimes: number
  readonly total_ht_centimes: number
  readonly total_tva_centimes: number
  readonly total_ttc_centimes: number
  readonly droit_timbre_centimes: number
  readonly interets_moratoires_centimes: number
  readonly net_a_payer_centimes: number
  readonly facture_origine_id: number | null
  readonly motif_avoir: string | null
  readonly date_validation: string | null
  readonly nombre_impressions: number
  readonly exercice_id: number | null
}

export class Facture {
  private constructor(private readonly _donnees: FactureNormalise) {}

  static depuisDonnees(donnees: DonneesFacture): Facture {
    verifierEntierPositif(donnees.id, 'identifiant facture')
    verifierEntierPositif(donnees.client_id, 'identifiant client')
    verifierParmi(donnees.type_document, TYPES_DOCUMENT_FACTURE, 'type de document')
    verifierDateIso(donnees.date_facture, 'date de facture')

    const statut = donnees.statut ?? 'BROUILLON'
    verifierParmi(statut, STATUTS_FACTURE, 'statut facture')

    if (donnees.numero !== undefined && !(donnees.numero instanceof NumeroDocument)) {
      throw new TypeError('« numéro de facture » doit être une instance de NumeroDocument (ou absent au brouillon).')
    }

    if (donnees.nif_client !== undefined && !(donnees.nif_client instanceof Nif)) {
      throw new TypeError('« NIF client » doit être une instance de Nif.')
    }
    if (donnees.adresse_facturation_type !== undefined) {
      verifierParmi(donnees.adresse_facturation_type, TYPES_ADRESSE_FACTURATION, 'type d’adresse de facturation')
    }
    if (donnees.mode_reglement_prevu !== undefined) {
      verifierParmi(donnees.mode_reglement_prevu, MODES_REGLEMENT, 'mode de règlement prévu')
    }
    if (donnees.mode_reglement_effectif !== undefined) {
      verifierParmi(donnees.mode_reglement_effectif, MODES_REGLEMENT_EFFECTIFS, 'mode de règlement effectif')
    }

    const rabais_global_bps = donnees.rabais_global_bps ?? 0
    verifierEntierNonNegatif(rabais_global_bps, 'rabais global en bps')
    const retenue_garantie_bps = donnees.retenue_garantie_bps ?? 0
    verifierEntierNonNegatif(retenue_garantie_bps, 'retenue de garantie en bps')
    const remboursement_avance_centimes = donnees.remboursement_avance_centimes ?? 0
    verifierEntierNonNegatif(remboursement_avance_centimes, 'remboursement d’avance en centimes')

    const montants = {
      total_ht_lignes_centimes: donnees.total_ht_lignes_centimes ?? 0,
      total_remises_centimes: donnees.total_remises_centimes ?? 0,
      net_commercial_ht_centimes: donnees.net_commercial_ht_centimes ?? 0,
      retenue_garantie_centimes: donnees.retenue_garantie_centimes ?? 0,
      total_ht_centimes: donnees.total_ht_centimes ?? 0,
      total_tva_centimes: donnees.total_tva_centimes ?? 0,
      total_ttc_centimes: donnees.total_ttc_centimes ?? 0,
      // DÉPRÉCIÉ (15/08/2026) : conservé pour l'historique, plus alimenté par le
      // moteur de facturation (timbre manuel à l'encaissement).
      droit_timbre_centimes: donnees.droit_timbre_centimes ?? 0,
      interets_moratoires_centimes: donnees.interets_moratoires_centimes ?? 0,
      net_a_payer_centimes: donnees.net_a_payer_centimes ?? 0,
    }
    for (const [libelle, valeur] of Object.entries(montants)) {
      verifierEntierNonNegatif(valeur, libelle)
    }

    const nombre_impressions = donnees.nombre_impressions ?? 0
    verifierEntierNonNegatif(nombre_impressions, 'nombre d’impressions')

    verifierIdOptionnel(donnees.affaire_id, 'identifiant affaire')
    verifierIdOptionnel(donnees.facture_origine_id, 'identifiant facture d’origine')
    verifierIdOptionnel(donnees.exercice_id, 'identifiant exercice')

    return new Facture({
      id: donnees.id,
      statut,
      type_document: donnees.type_document,
      numero: donnees.numero ?? null,
      date_facture: donnees.date_facture,
      date_echeance: verifierDateOptionnelle(donnees.date_echeance, 'date d’échéance'),
      affaire_id: donnees.affaire_id ?? null,
      client_id: donnees.client_id,
      adresse_facturation: chaineOuNulle(donnees.adresse_facturation),
      adresse_facturation_type: donnees.adresse_facturation_type ?? null,
      nif_client: donnees.nif_client ?? null,
      numero_bc_client: chaineOuNulle(donnees.numero_bc_client),
      rabais_global_bps,
      retenue_garantie_bps,
      remboursement_avance_centimes,
      mode_reglement_prevu: donnees.mode_reglement_prevu ?? null,
      mode_reglement_effectif: donnees.mode_reglement_effectif ?? null,
      total_ht_lignes_centimes: montants.total_ht_lignes_centimes,
      total_remises_centimes: montants.total_remises_centimes,
      net_commercial_ht_centimes: montants.net_commercial_ht_centimes,
      retenue_garantie_centimes: montants.retenue_garantie_centimes,
      total_ht_centimes: montants.total_ht_centimes,
      total_tva_centimes: montants.total_tva_centimes,
      total_ttc_centimes: montants.total_ttc_centimes,
      droit_timbre_centimes: montants.droit_timbre_centimes,
      interets_moratoires_centimes: montants.interets_moratoires_centimes,
      net_a_payer_centimes: montants.net_a_payer_centimes,
      facture_origine_id: donnees.facture_origine_id ?? null,
      motif_avoir: chaineOuNulle(donnees.motif_avoir),
      date_validation: verifierDateOptionnelle(donnees.date_validation, 'date de validation'),
      nombre_impressions,
      exercice_id: donnees.exercice_id ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get statut(): StatutFacture {
    return this._donnees.statut
  }

  get type_document(): TypeDocumentFacture {
    return this._donnees.type_document
  }

  get numero(): NumeroDocument | null {
    return this._donnees.numero
  }

  get date_facture(): string {
    return this._donnees.date_facture
  }

  get date_echeance(): string | null {
    return this._donnees.date_echeance
  }

  get affaire_id(): number | null {
    return this._donnees.affaire_id
  }

  get client_id(): number {
    return this._donnees.client_id
  }

  get adresse_facturation(): string | null {
    return this._donnees.adresse_facturation
  }

  get adresse_facturation_type(): TypeAdresseFacturation | null {
    return this._donnees.adresse_facturation_type
  }

  get nif_client(): Nif | null {
    return this._donnees.nif_client
  }

  get numero_bc_client(): string | null {
    return this._donnees.numero_bc_client
  }

  get rabais_global_bps(): number {
    return this._donnees.rabais_global_bps
  }

  get retenue_garantie_bps(): number {
    return this._donnees.retenue_garantie_bps
  }

  get remboursement_avance_centimes(): number {
    return this._donnees.remboursement_avance_centimes
  }

  get mode_reglement_prevu(): ModeReglement | null {
    return this._donnees.mode_reglement_prevu
  }

  get mode_reglement_effectif(): ModeReglementEffectif | null {
    return this._donnees.mode_reglement_effectif
  }

  get total_ht_lignes_centimes(): number {
    return this._donnees.total_ht_lignes_centimes
  }

  get total_remises_centimes(): number {
    return this._donnees.total_remises_centimes
  }

  get net_commercial_ht_centimes(): number {
    return this._donnees.net_commercial_ht_centimes
  }

  get retenue_garantie_centimes(): number {
    return this._donnees.retenue_garantie_centimes
  }

  get total_ht_centimes(): number {
    return this._donnees.total_ht_centimes
  }

  get total_tva_centimes(): number {
    return this._donnees.total_tva_centimes
  }

  get total_ttc_centimes(): number {
    return this._donnees.total_ttc_centimes
  }

  get droit_timbre_centimes(): number {
    return this._donnees.droit_timbre_centimes
  }

  get interets_moratoires_centimes(): number {
    return this._donnees.interets_moratoires_centimes
  }

  get net_a_payer_centimes(): number {
    return this._donnees.net_a_payer_centimes
  }

  get facture_origine_id(): number | null {
    return this._donnees.facture_origine_id
  }

  get motif_avoir(): string | null {
    return this._donnees.motif_avoir
  }

  get date_validation(): string | null {
    return this._donnees.date_validation
  }

  get nombre_impressions(): number {
    return this._donnees.nombre_impressions
  }

  get exercice_id(): number | null {
    return this._donnees.exercice_id
  }
}

export interface DonneesLigneFacture {
  id: number
  facture_id: number
  produit_id?: number
  designation: string
  unite: Unite
  quantite_milliemes?: number
  pu_ht_centimes?: number
  remise_bps?: number
  // Rabais marché contractuel, figé sur la ligne au moment de la facturation
  // (copié de `affaires.rabais_marche_bps`, décision 15/08/2026 — §4.4.5bis).
  rabais_marche_bps?: number
  famille_id?: number
  sous_famille_id?: number
  classification?: CategorieClassification
}

interface LigneFactureNormalise {
  readonly id: number
  readonly facture_id: number
  readonly produit_id: number | null
  readonly designation: string
  readonly unite: Unite
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly remise_bps: number
  readonly rabais_marche_bps: number
  readonly montant_ht_brut_centimes: number
  readonly montant_ht_remise_centimes: number
  readonly montant_rabais_marche_centimes: number
  readonly montant_ht_net_centimes: number
  readonly famille_id: number | null
  readonly sous_famille_id: number | null
  readonly classification: CategorieClassification | null
}

export class LigneFacture {
  private constructor(private readonly _donnees: LigneFactureNormalise) {}

  static depuisDonnees(donnees: DonneesLigneFacture): LigneFacture {
    verifierEntierPositif(donnees.id, 'identifiant ligne de facture')
    verifierEntierPositif(donnees.facture_id, 'identifiant facture')
    verifierChaineNonVide(donnees.designation, 'désignation de la ligne')
    verifierParmi(donnees.unite, UNITES_PRODUIT, 'unité')

    const quantite_milliemes = donnees.quantite_milliemes ?? 0
    verifierEntierNonNegatif(quantite_milliemes, 'quantité en millièmes')
    const pu_ht_centimes = donnees.pu_ht_centimes ?? 0
    verifierEntierNonNegatif(pu_ht_centimes, 'PU HT en centimes')
    const remise_bps = donnees.remise_bps ?? 0
    verifierEntierNonNegatif(remise_bps, 'remise de ligne en bps')
    const rabais_marche_bps = donnees.rabais_marche_bps ?? 0
    verifierEntierNonNegatif(rabais_marche_bps, 'rabais marché de ligne en bps')

    if (donnees.classification !== undefined) {
      verifierParmi(donnees.classification, ['NOIR', 'BLANC', 'AUTRE'], 'classification')
    }

    verifierIdOptionnel(donnees.produit_id, 'identifiant produit')
    verifierIdOptionnel(donnees.famille_id, 'identifiant famille')
    verifierIdOptionnel(donnees.sous_famille_id, 'identifiant sous-famille')

    const montant_ht_brut_centimes = calculerMontantLigne(pu_ht_centimes, quantite_milliemes)
    const remise_centimes = Montant.depuisCentimes(montant_ht_brut_centimes).appliquerTauxBps(remise_bps).centimes
    // §4.4.5bis : rabais marché sur la base = BRUT (décision 15/08/2026), distinct
    // de la remise de ligne ; net ligne = brut − remise − rabais marché.
    const rabais_marche_centimes = Montant.depuisCentimes(montant_ht_brut_centimes)
      .appliquerTauxBps(rabais_marche_bps)
      .centimes
    const montant_ht_net_centimes = montant_ht_brut_centimes - remise_centimes - rabais_marche_centimes

    return new LigneFacture({
      id: donnees.id,
      facture_id: donnees.facture_id,
      produit_id: donnees.produit_id ?? null,
      designation: donnees.designation,
      unite: donnees.unite,
      quantite_milliemes,
      pu_ht_centimes,
      remise_bps,
      rabais_marche_bps,
      montant_ht_brut_centimes,
      montant_ht_remise_centimes: montant_ht_brut_centimes - remise_centimes,
      montant_rabais_marche_centimes: rabais_marche_centimes,
      montant_ht_net_centimes,
      famille_id: donnees.famille_id ?? null,
      sous_famille_id: donnees.sous_famille_id ?? null,
      classification: donnees.classification ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get facture_id(): number {
    return this._donnees.facture_id
  }

  get produit_id(): number | null {
    return this._donnees.produit_id
  }

  get designation(): string {
    return this._donnees.designation
  }

  get unite(): Unite {
    return this._donnees.unite
  }

  get quantite_milliemes(): number {
    return this._donnees.quantite_milliemes
  }

  get pu_ht_centimes(): number {
    return this._donnees.pu_ht_centimes
  }

  get remise_bps(): number {
    return this._donnees.remise_bps
  }

  get rabais_marche_bps(): number {
    return this._donnees.rabais_marche_bps
  }

  get montant_ht_brut_centimes(): number {
    return this._donnees.montant_ht_brut_centimes
  }

  get montant_ht_remise_centimes(): number {
    return this._donnees.montant_ht_remise_centimes
  }

  get montant_rabais_marche_centimes(): number {
    return this._donnees.montant_rabais_marche_centimes
  }

  get montant_ht_net_centimes(): number {
    return this._donnees.montant_ht_net_centimes
  }

  get famille_id(): number | null {
    return this._donnees.famille_id
  }

  get sous_famille_id(): number | null {
    return this._donnees.sous_famille_id
  }

  get classification(): CategorieClassification | null {
    return this._donnees.classification
  }
}

export interface DonneesBonLivraison {
  id: number
  statut?: StatutBonLivraison
  numero_bl: NumeroDocument
  date_livraison: string
  affaire_id?: number
  client_id: number
  poids_pesee_kg?: number
  signature_client?: 0 | 1
  facture_id?: number
  exercice_id?: number
}

interface BonLivraisonNormalise {
  readonly id: number
  readonly statut: StatutBonLivraison
  readonly numero_bl: NumeroDocument
  readonly date_livraison: string
  readonly affaire_id: number | null
  readonly client_id: number
  readonly poids_pesee_kg: number | null
  readonly signature_client: 0 | 1
  readonly facture_id: number | null
  readonly exercice_id: number | null
}

export class BonLivraison {
  private constructor(private readonly _donnees: BonLivraisonNormalise) {}

  static depuisDonnees(donnees: DonneesBonLivraison): BonLivraison {
    verifierEntierPositif(donnees.id, 'identifiant bon de livraison')
    verifierEntierPositif(donnees.client_id, 'identifiant client')
    if (!(donnees.numero_bl instanceof NumeroDocument)) {
      throw new TypeError('« numéro de bon de livraison » doit être une instance de NumeroDocument.')
    }
    verifierDateIso(donnees.date_livraison, 'date de livraison')

    const statut = donnees.statut ?? 'EMIS'
    verifierParmi(statut, STATUTS_BON_LIVRAISON, 'statut bon de livraison')

    const signature_client = donnees.signature_client ?? 0
    verifierBinaire(signature_client, 'signature client')

    verifierNonNegatifOptionnel(donnees.poids_pesee_kg, 'poids pesé en kg')
    verifierIdOptionnel(donnees.affaire_id, 'identifiant affaire')
    verifierIdOptionnel(donnees.facture_id, 'identifiant facture')
    verifierIdOptionnel(donnees.exercice_id, 'identifiant exercice')

    return new BonLivraison({
      id: donnees.id,
      statut,
      numero_bl: donnees.numero_bl,
      date_livraison: donnees.date_livraison,
      affaire_id: donnees.affaire_id ?? null,
      client_id: donnees.client_id,
      poids_pesee_kg: donnees.poids_pesee_kg ?? null,
      signature_client,
      facture_id: donnees.facture_id ?? null,
      exercice_id: donnees.exercice_id ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get statut(): StatutBonLivraison {
    return this._donnees.statut
  }

  get numero_bl(): NumeroDocument {
    return this._donnees.numero_bl
  }

  get date_livraison(): string {
    return this._donnees.date_livraison
  }

  get affaire_id(): number | null {
    return this._donnees.affaire_id
  }

  get client_id(): number {
    return this._donnees.client_id
  }

  get poids_pesee_kg(): number | null {
    return this._donnees.poids_pesee_kg
  }

  get signature_client(): 0 | 1 {
    return this._donnees.signature_client
  }

  get facture_id(): number | null {
    return this._donnees.facture_id
  }

  get exercice_id(): number | null {
    return this._donnees.exercice_id
  }
}

export interface DonneesLigneBonLivraison {
  id: number
  bon_livraison_id: number
  produit_id?: number
  designation: string
  unite: Unite
  quantite_milliemes?: number
  pu_ht_centimes?: number
}

interface LigneBonLivraisonNormalise {
  readonly id: number
  readonly bon_livraison_id: number
  readonly produit_id: number | null
  readonly designation: string
  readonly unite: Unite
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly montant_ht_centimes: number
}

export class LigneBonLivraison {
  private constructor(private readonly _donnees: LigneBonLivraisonNormalise) {}

  static depuisDonnees(donnees: DonneesLigneBonLivraison): LigneBonLivraison {
    verifierEntierPositif(donnees.id, 'identifiant ligne de bon de livraison')
    verifierEntierPositif(donnees.bon_livraison_id, 'identifiant bon de livraison')
    verifierChaineNonVide(donnees.designation, 'désignation de la ligne')
    verifierParmi(donnees.unite, UNITES_PRODUIT, 'unité')

    const quantite_milliemes = donnees.quantite_milliemes ?? 0
    verifierEntierNonNegatif(quantite_milliemes, 'quantité en millièmes')
    const pu_ht_centimes = donnees.pu_ht_centimes ?? 0
    verifierEntierNonNegatif(pu_ht_centimes, 'PU HT en centimes')

    verifierIdOptionnel(donnees.produit_id, 'identifiant produit')

    return new LigneBonLivraison({
      id: donnees.id,
      bon_livraison_id: donnees.bon_livraison_id,
      produit_id: donnees.produit_id ?? null,
      designation: donnees.designation,
      unite: donnees.unite,
      quantite_milliemes,
      pu_ht_centimes,
      montant_ht_centimes: calculerMontantLigne(pu_ht_centimes, quantite_milliemes),
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get bon_livraison_id(): number {
    return this._donnees.bon_livraison_id
  }

  get produit_id(): number | null {
    return this._donnees.produit_id
  }

  get designation(): string {
    return this._donnees.designation
  }

  get unite(): Unite {
    return this._donnees.unite
  }

  get quantite_milliemes(): number {
    return this._donnees.quantite_milliemes
  }

  get pu_ht_centimes(): number {
    return this._donnees.pu_ht_centimes
  }

  get montant_ht_centimes(): number {
    return this._donnees.montant_ht_centimes
  }
}
