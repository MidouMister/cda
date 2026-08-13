import { Montant } from './montant'
import { NumeroDocument, Reference } from './identites'
import type { CategorieClassification } from './classification'
import {
  UNITES_PRODUIT,
  verifierChaineNonVide,
  verifierDateIso,
  verifierEntierNonNegatif,
  verifierEntierPositif,
  verifierParmi,
  type Unite,
} from './entites-referentielles'

export const STATUTS_AFFAIRE = ['SIGNE', 'ODS_RECU', 'EN_COURS', 'FACTURE', 'SOLDE', 'ARCHIVE', 'RESILIE'] as const
export type StatutAffaire = (typeof STATUTS_AFFAIRE)[number]

export const TYPES_AFFAIRE = ['MARCHE_PUBLIC', 'CONTRAT_PRIVE', 'BC', 'AVENANT'] as const
export type TypeAffaire = (typeof TYPES_AFFAIRE)[number]

export const MOTIFS_DEPASSEMENT = ['FORCE_MAJEURE', 'AVENANT', 'RETARD_CLIENT', 'RETARD_APPRO', 'AUTRE'] as const
export type MotifDepassement = (typeof MOTIFS_DEPASSEMENT)[number]

export const TYPES_PROCEDURE = ['AO_OUVERT', 'AO_RESTREINT', 'CONSULTATION', 'GRE_A_GRE'] as const
export type TypeProcedure = (typeof TYPES_PROCEDURE)[number]

export const TYPES_REVISION = ['FERME', 'REVISABLE'] as const
export type TypeRevision = (typeof TYPES_REVISION)[number]

export const SORTS_RETENUE = ['A_RESTITUER', 'RETENUE'] as const
export type SortRetenue = (typeof SORTS_RETENUE)[number]

export const ORIGINES_POSTE_DQE = ['DEVIS', 'IMPORT', 'AVENANT', 'MANUEL'] as const
export type OriginePosteDqe = (typeof ORIGINES_POSTE_DQE)[number]

export const STATUTS_DEVIS = ['BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'EXPIRE'] as const
export type StatutDevis = (typeof STATUTS_DEVIS)[number]

export const STATUTS_AVENANT = ['BROUILLON', 'VALIDE'] as const
export type StatutAvenant = (typeof STATUTS_AVENANT)[number]

export const TYPES_RECEPTION = ['PROVISOIRE', 'DEFINITIVE'] as const
export type TypeReception = (typeof TYPES_RECEPTION)[number]

const verifierEntier = (valeur: number, libelle: string): void => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur)) {
    throw new TypeError(`« ${libelle} » doit être un entier (reçu : ${String(valeur)}).`)
  }
}

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

export const calculerMontantLigne = (puCentimes: number, quantiteMilliemes: number): number =>
  Montant.depuisCentimes(puCentimes).foisQuantiteMilliemes(quantiteMilliemes).centimes

export interface DonneesAffaire {
  id: number
  statut?: StatutAffaire
  reference: Reference
  type_affaire: TypeAffaire
  affaire_mere_id?: number
  client_id: number
  objet?: string
  montant_initial_ht_centimes?: number
  taux_tva_bps?: number
  date_signature?: string
  date_notification?: string
  numero_ods?: string
  date_ods?: string
  date_demarrage_effectif?: string
  delai_execution_jours?: number
  date_fin_contractuelle?: string
  date_fin_revisee?: string
  date_fin_reelle?: string
  motif_depassement?: MotifDepassement
  rabais_global_bps?: number
  responsable?: string
  numero_marche?: string
  service_contractant?: string
  type_procedure?: TypeProcedure
  avance_forfaitaire_bps?: number
  avance_approvisionnement_bps?: number
  retenue_garantie_bps?: number
  delai_garantie_mois?: number
  type_revision?: TypeRevision
  formule_revision?: string
  penalite_retard_taux_bps?: number
  penalite_retard_base_centimes?: number
  penalite_retard_plafond_bps?: number
  date_decompte_provisoire?: string
  date_decompte_definitif?: string
  numero_contrat?: string
  modalites_paiement?: string
  avance_contractuelle_centimes?: number
  motif_resiliation?: string
  date_resiliation?: string
  decompte_resiliation_centimes?: number
  sort_cautions?: SortRetenue
  sort_retenue_garantie?: SortRetenue
}

interface AffaireNormalise {
  readonly id: number
  readonly statut: StatutAffaire
  readonly reference: Reference
  readonly type_affaire: TypeAffaire
  readonly affaire_mere_id: number | null
  readonly client_id: number
  readonly objet: string | null
  readonly montant_initial_ht_centimes: number
  readonly taux_tva_bps: number
  readonly date_signature: string | null
  readonly date_notification: string | null
  readonly numero_ods: string | null
  readonly date_ods: string | null
  readonly date_demarrage_effectif: string | null
  readonly delai_execution_jours: number | null
  readonly date_fin_contractuelle: string | null
  readonly date_fin_revisee: string | null
  readonly date_fin_reelle: string | null
  readonly motif_depassement: MotifDepassement | null
  readonly rabais_global_bps: number
  readonly responsable: string | null
  readonly numero_marche: string | null
  readonly service_contractant: string | null
  readonly type_procedure: TypeProcedure | null
  readonly avance_forfaitaire_bps: number | null
  readonly avance_approvisionnement_bps: number | null
  readonly retenue_garantie_bps: number
  readonly delai_garantie_mois: number | null
  readonly type_revision: TypeRevision | null
  readonly formule_revision: string | null
  readonly penalite_retard_taux_bps: number | null
  readonly penalite_retard_base_centimes: number | null
  readonly penalite_retard_plafond_bps: number | null
  readonly date_decompte_provisoire: string | null
  readonly date_decompte_definitif: string | null
  readonly numero_contrat: string | null
  readonly modalites_paiement: string | null
  readonly avance_contractuelle_centimes: number | null
  readonly motif_resiliation: string | null
  readonly date_resiliation: string | null
  readonly decompte_resiliation_centimes: number | null
  readonly sort_cautions: SortRetenue | null
  readonly sort_retenue_garantie: SortRetenue | null
}

export class Affaire {
  private constructor(private readonly _donnees: AffaireNormalise) {}

  static depuisDonnees(donnees: DonneesAffaire): Affaire {
    verifierEntierPositif(donnees.id, 'identifiant affaire')
    verifierEntierPositif(donnees.client_id, 'identifiant client')
    if (!(donnees.reference instanceof Reference)) {
      throw new TypeError('« référence d’affaire » doit être une instance de Reference.')
    }
    verifierParmi(donnees.type_affaire, TYPES_AFFAIRE, 'type d’affaire')

    const statut = donnees.statut ?? 'SIGNE'
    verifierParmi(statut, STATUTS_AFFAIRE, 'statut affaire')

    if (donnees.type_affaire === 'AVENANT' && donnees.affaire_mere_id === undefined) {
      throw new Error('« affaire mère » est requise pour une affaire de type AVENANT.')
    }
    verifierIdOptionnel(donnees.affaire_mere_id, 'identifiant affaire mère')

    const montant_initial_ht_centimes = donnees.montant_initial_ht_centimes ?? 0
    verifierEntierNonNegatif(montant_initial_ht_centimes, 'montant initial HT en centimes')
    const taux_tva_bps = donnees.taux_tva_bps ?? 1900
    verifierEntierNonNegatif(taux_tva_bps, 'taux de TVA en bps')
    const rabais_global_bps = donnees.rabais_global_bps ?? 0
    verifierEntierNonNegatif(rabais_global_bps, 'rabais global en bps')
    const retenue_garantie_bps = donnees.retenue_garantie_bps ?? 500
    verifierEntierNonNegatif(retenue_garantie_bps, 'retenue de garantie en bps')

    verifierNonNegatifOptionnel(donnees.delai_execution_jours, 'délai d’exécution en jours')
    verifierNonNegatifOptionnel(donnees.avance_forfaitaire_bps, 'avance forfaitaire en bps')
    verifierNonNegatifOptionnel(donnees.avance_approvisionnement_bps, 'avance approvisionnement en bps')
    verifierNonNegatifOptionnel(donnees.delai_garantie_mois, 'délai de garantie en mois')
    verifierNonNegatifOptionnel(donnees.penalite_retard_taux_bps, 'taux de pénalité de retard en bps')
    verifierNonNegatifOptionnel(donnees.penalite_retard_base_centimes, 'base des pénalités de retard en centimes')
    verifierNonNegatifOptionnel(donnees.penalite_retard_plafond_bps, 'plafond des pénalités de retard en bps')
    verifierNonNegatifOptionnel(donnees.avance_contractuelle_centimes, 'avance contractuelle en centimes')
    verifierNonNegatifOptionnel(donnees.decompte_resiliation_centimes, 'décompte de résiliation en centimes')

    if (donnees.motif_depassement !== undefined) {
      verifierParmi(donnees.motif_depassement, MOTIFS_DEPASSEMENT, 'motif de dépassement')
    }
    if (donnees.type_procedure !== undefined) {
      verifierParmi(donnees.type_procedure, TYPES_PROCEDURE, 'type de procédure')
    }
    if (donnees.type_revision !== undefined) {
      verifierParmi(donnees.type_revision, TYPES_REVISION, 'type de révision')
    }
    if (donnees.sort_cautions !== undefined) {
      verifierParmi(donnees.sort_cautions, SORTS_RETENUE, 'sort des cautions')
    }
    if (donnees.sort_retenue_garantie !== undefined) {
      verifierParmi(donnees.sort_retenue_garantie, SORTS_RETENUE, 'sort de la retenue de garantie')
    }

    return new Affaire({
      id: donnees.id,
      statut,
      reference: donnees.reference,
      type_affaire: donnees.type_affaire,
      affaire_mere_id: donnees.affaire_mere_id ?? null,
      client_id: donnees.client_id,
      objet: chaineOuNulle(donnees.objet),
      montant_initial_ht_centimes,
      taux_tva_bps,
      date_signature: verifierDateOptionnelle(donnees.date_signature, 'date de signature'),
      date_notification: verifierDateOptionnelle(donnees.date_notification, 'date de notification'),
      numero_ods: chaineOuNulle(donnees.numero_ods),
      date_ods: verifierDateOptionnelle(donnees.date_ods, 'date ODS'),
      date_demarrage_effectif: verifierDateOptionnelle(donnees.date_demarrage_effectif, 'date de démarrage effectif'),
      delai_execution_jours: donnees.delai_execution_jours ?? null,
      date_fin_contractuelle: verifierDateOptionnelle(donnees.date_fin_contractuelle, 'date de fin contractuelle'),
      date_fin_revisee: verifierDateOptionnelle(donnees.date_fin_revisee, 'date de fin révisée'),
      date_fin_reelle: verifierDateOptionnelle(donnees.date_fin_reelle, 'date de fin réelle'),
      motif_depassement: donnees.motif_depassement ?? null,
      rabais_global_bps,
      responsable: chaineOuNulle(donnees.responsable),
      numero_marche: chaineOuNulle(donnees.numero_marche),
      service_contractant: chaineOuNulle(donnees.service_contractant),
      type_procedure: donnees.type_procedure ?? null,
      avance_forfaitaire_bps: donnees.avance_forfaitaire_bps ?? null,
      avance_approvisionnement_bps: donnees.avance_approvisionnement_bps ?? null,
      retenue_garantie_bps,
      delai_garantie_mois: donnees.delai_garantie_mois ?? null,
      type_revision: donnees.type_revision ?? null,
      formule_revision: chaineOuNulle(donnees.formule_revision),
      penalite_retard_taux_bps: donnees.penalite_retard_taux_bps ?? null,
      penalite_retard_base_centimes: donnees.penalite_retard_base_centimes ?? null,
      penalite_retard_plafond_bps: donnees.penalite_retard_plafond_bps ?? null,
      date_decompte_provisoire: verifierDateOptionnelle(donnees.date_decompte_provisoire, 'date de décompte provisoire'),
      date_decompte_definitif: verifierDateOptionnelle(donnees.date_decompte_definitif, 'date de décompte définitif'),
      numero_contrat: chaineOuNulle(donnees.numero_contrat),
      modalites_paiement: chaineOuNulle(donnees.modalites_paiement),
      avance_contractuelle_centimes: donnees.avance_contractuelle_centimes ?? null,
      motif_resiliation: chaineOuNulle(donnees.motif_resiliation),
      date_resiliation: verifierDateOptionnelle(donnees.date_resiliation, 'date de résiliation'),
      decompte_resiliation_centimes: donnees.decompte_resiliation_centimes ?? null,
      sort_cautions: donnees.sort_cautions ?? null,
      sort_retenue_garantie: donnees.sort_retenue_garantie ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get statut(): StatutAffaire {
    return this._donnees.statut
  }

  get reference(): Reference {
    return this._donnees.reference
  }

  get type_affaire(): TypeAffaire {
    return this._donnees.type_affaire
  }

  get affaire_mere_id(): number | null {
    return this._donnees.affaire_mere_id
  }

  get client_id(): number {
    return this._donnees.client_id
  }

  get objet(): string | null {
    return this._donnees.objet
  }

  get montant_initial_ht_centimes(): number {
    return this._donnees.montant_initial_ht_centimes
  }

  get taux_tva_bps(): number {
    return this._donnees.taux_tva_bps
  }

  get date_signature(): string | null {
    return this._donnees.date_signature
  }

  get date_notification(): string | null {
    return this._donnees.date_notification
  }

  get numero_ods(): string | null {
    return this._donnees.numero_ods
  }

  get date_ods(): string | null {
    return this._donnees.date_ods
  }

  get date_demarrage_effectif(): string | null {
    return this._donnees.date_demarrage_effectif
  }

  get delai_execution_jours(): number | null {
    return this._donnees.delai_execution_jours
  }

  get date_fin_contractuelle(): string | null {
    return this._donnees.date_fin_contractuelle
  }

  get date_fin_revisee(): string | null {
    return this._donnees.date_fin_revisee
  }

  get date_fin_reelle(): string | null {
    return this._donnees.date_fin_reelle
  }

  get motif_depassement(): MotifDepassement | null {
    return this._donnees.motif_depassement
  }

  get rabais_global_bps(): number {
    return this._donnees.rabais_global_bps
  }

  get responsable(): string | null {
    return this._donnees.responsable
  }

  get numero_marche(): string | null {
    return this._donnees.numero_marche
  }

  get service_contractant(): string | null {
    return this._donnees.service_contractant
  }

  get type_procedure(): TypeProcedure | null {
    return this._donnees.type_procedure
  }

  get avance_forfaitaire_bps(): number | null {
    return this._donnees.avance_forfaitaire_bps
  }

  get avance_approvisionnement_bps(): number | null {
    return this._donnees.avance_approvisionnement_bps
  }

  get retenue_garantie_bps(): number {
    return this._donnees.retenue_garantie_bps
  }

  get delai_garantie_mois(): number | null {
    return this._donnees.delai_garantie_mois
  }

  get type_revision(): TypeRevision | null {
    return this._donnees.type_revision
  }

  get formule_revision(): string | null {
    return this._donnees.formule_revision
  }

  get penalite_retard_taux_bps(): number | null {
    return this._donnees.penalite_retard_taux_bps
  }

  get penalite_retard_base_centimes(): number | null {
    return this._donnees.penalite_retard_base_centimes
  }

  get penalite_retard_plafond_bps(): number | null {
    return this._donnees.penalite_retard_plafond_bps
  }

  get date_decompte_provisoire(): string | null {
    return this._donnees.date_decompte_provisoire
  }

  get date_decompte_definitif(): string | null {
    return this._donnees.date_decompte_definitif
  }

  get numero_contrat(): string | null {
    return this._donnees.numero_contrat
  }

  get modalites_paiement(): string | null {
    return this._donnees.modalites_paiement
  }

  get avance_contractuelle_centimes(): number | null {
    return this._donnees.avance_contractuelle_centimes
  }

  get motif_resiliation(): string | null {
    return this._donnees.motif_resiliation
  }

  get date_resiliation(): string | null {
    return this._donnees.date_resiliation
  }

  get decompte_resiliation_centimes(): number | null {
    return this._donnees.decompte_resiliation_centimes
  }

  get sort_cautions(): SortRetenue | null {
    return this._donnees.sort_cautions
  }

  get sort_retenue_garantie(): SortRetenue | null {
    return this._donnees.sort_retenue_garantie
  }
}

export interface DonneesPosteDqe {
  id: number
  affaire_id: number
  numero: number
  designation: string
  unite: Unite
  quantite_milliemes?: number
  pu_ht_centimes?: number
  famille_id?: number
  sous_famille_id?: number
  classification?: CategorieClassification
  origine?: OriginePosteDqe
  ligne_devis_id?: number
}

interface PosteDqeNormalise {
  readonly id: number
  readonly affaire_id: number
  readonly numero: number
  readonly designation: string
  readonly unite: Unite
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly montant_ht_centimes: number
  readonly famille_id: number | null
  readonly sous_famille_id: number | null
  readonly classification: CategorieClassification | null
  readonly origine: OriginePosteDqe
  readonly ligne_devis_id: number | null
}

export class PosteDqe {
  private constructor(private readonly _donnees: PosteDqeNormalise) {}

  static depuisDonnees(donnees: DonneesPosteDqe): PosteDqe {
    verifierEntierPositif(donnees.id, 'identifiant poste DQE')
    verifierEntierPositif(donnees.affaire_id, 'identifiant affaire')
    verifierEntierPositif(donnees.numero, 'numéro de poste DQE')
    verifierChaineNonVide(donnees.designation, 'désignation du poste')
    verifierParmi(donnees.unite, UNITES_PRODUIT, 'unité')

    const quantite_milliemes = donnees.quantite_milliemes ?? 0
    verifierEntierNonNegatif(quantite_milliemes, 'quantité en millièmes')
    const pu_ht_centimes = donnees.pu_ht_centimes ?? 0
    verifierEntierNonNegatif(pu_ht_centimes, 'PU HT en centimes')

    if (donnees.classification !== undefined) {
      verifierParmi(donnees.classification, ['NOIR', 'BLANC', 'AUTRE'], 'classification')
    }
    verifierParmi(donnees.origine ?? 'MANUEL', ORIGINES_POSTE_DQE, 'origine')

    verifierIdOptionnel(donnees.famille_id, 'identifiant famille')
    verifierIdOptionnel(donnees.sous_famille_id, 'identifiant sous-famille')
    verifierIdOptionnel(donnees.ligne_devis_id, 'identifiant ligne de devis')

    return new PosteDqe({
      id: donnees.id,
      affaire_id: donnees.affaire_id,
      numero: donnees.numero,
      designation: donnees.designation,
      unite: donnees.unite,
      quantite_milliemes,
      pu_ht_centimes,
      montant_ht_centimes: calculerMontantLigne(pu_ht_centimes, quantite_milliemes),
      famille_id: donnees.famille_id ?? null,
      sous_famille_id: donnees.sous_famille_id ?? null,
      classification: donnees.classification ?? null,
      origine: donnees.origine ?? 'MANUEL',
      ligne_devis_id: donnees.ligne_devis_id ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get affaire_id(): number {
    return this._donnees.affaire_id
  }

  get numero(): number {
    return this._donnees.numero
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

  get famille_id(): number | null {
    return this._donnees.famille_id
  }

  get sous_famille_id(): number | null {
    return this._donnees.sous_famille_id
  }

  get classification(): CategorieClassification | null {
    return this._donnees.classification
  }

  get origine(): OriginePosteDqe {
    return this._donnees.origine
  }

  get ligne_devis_id(): number | null {
    return this._donnees.ligne_devis_id
  }
}

export interface DonneesDevis {
  id: number
  statut?: StatutDevis
  numero_devis: NumeroDocument
  client_id: number
  date_devis: string
  date_validite?: string
  rabais_global_bps?: number
  affaire_id?: number
  exercice_id?: number
}

interface DevisNormalise {
  readonly id: number
  readonly statut: StatutDevis
  readonly numero_devis: NumeroDocument
  readonly client_id: number
  readonly date_devis: string
  readonly date_validite: string | null
  readonly rabais_global_bps: number
  readonly affaire_id: number | null
  readonly exercice_id: number | null
}

export class Devis {
  private constructor(private readonly _donnees: DevisNormalise) {}

  static depuisDonnees(donnees: DonneesDevis): Devis {
    verifierEntierPositif(donnees.id, 'identifiant devis')
    verifierEntierPositif(donnees.client_id, 'identifiant client')
    if (!(donnees.numero_devis instanceof NumeroDocument)) {
      throw new TypeError('« numéro de devis » doit être une instance de NumeroDocument.')
    }
    verifierDateIso(donnees.date_devis, 'date du devis')

    const statut = donnees.statut ?? 'BROUILLON'
    verifierParmi(statut, STATUTS_DEVIS, 'statut devis')

    if (donnees.date_validite !== undefined) {
      verifierDateIso(donnees.date_validite, 'date de validité')
    }
    const rabais_global_bps = donnees.rabais_global_bps ?? 0
    verifierEntierNonNegatif(rabais_global_bps, 'rabais global en bps')
    verifierIdOptionnel(donnees.affaire_id, 'identifiant affaire')
    verifierIdOptionnel(donnees.exercice_id, 'identifiant exercice')

    return new Devis({
      id: donnees.id,
      statut,
      numero_devis: donnees.numero_devis,
      client_id: donnees.client_id,
      date_devis: donnees.date_devis,
      date_validite: donnees.date_validite ?? null,
      rabais_global_bps,
      affaire_id: donnees.affaire_id ?? null,
      exercice_id: donnees.exercice_id ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get statut(): StatutDevis {
    return this._donnees.statut
  }

  get numero_devis(): NumeroDocument {
    return this._donnees.numero_devis
  }

  get client_id(): number {
    return this._donnees.client_id
  }

  get date_devis(): string {
    return this._donnees.date_devis
  }

  get date_validite(): string | null {
    return this._donnees.date_validite
  }

  get rabais_global_bps(): number {
    return this._donnees.rabais_global_bps
  }

  get affaire_id(): number | null {
    return this._donnees.affaire_id
  }

  get exercice_id(): number | null {
    return this._donnees.exercice_id
  }
}

export interface DonneesLigneDevis {
  id: number
  devis_id: number
  produit_id?: number
  designation: string
  unite: Unite
  quantite_milliemes?: number
  pu_ht_centimes?: number
  famille_id?: number
  sous_famille_id?: number
}

interface LigneDevisNormalise {
  readonly id: number
  readonly devis_id: number
  readonly produit_id: number | null
  readonly designation: string
  readonly unite: Unite
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly montant_ht_centimes: number
  readonly famille_id: number | null
  readonly sous_famille_id: number | null
}

export class LigneDevis {
  private constructor(private readonly _donnees: LigneDevisNormalise) {}

  static depuisDonnees(donnees: DonneesLigneDevis): LigneDevis {
    verifierEntierPositif(donnees.id, 'identifiant ligne de devis')
    verifierEntierPositif(donnees.devis_id, 'identifiant devis')
    verifierChaineNonVide(donnees.designation, 'désignation de la ligne')
    verifierParmi(donnees.unite, UNITES_PRODUIT, 'unité')

    const quantite_milliemes = donnees.quantite_milliemes ?? 0
    verifierEntierNonNegatif(quantite_milliemes, 'quantité en millièmes')
    const pu_ht_centimes = donnees.pu_ht_centimes ?? 0
    verifierEntierNonNegatif(pu_ht_centimes, 'PU HT en centimes')

    verifierIdOptionnel(donnees.produit_id, 'identifiant produit')
    verifierIdOptionnel(donnees.famille_id, 'identifiant famille')
    verifierIdOptionnel(donnees.sous_famille_id, 'identifiant sous-famille')

    return new LigneDevis({
      id: donnees.id,
      devis_id: donnees.devis_id,
      produit_id: donnees.produit_id ?? null,
      designation: donnees.designation,
      unite: donnees.unite,
      quantite_milliemes,
      pu_ht_centimes,
      montant_ht_centimes: calculerMontantLigne(pu_ht_centimes, quantite_milliemes),
      famille_id: donnees.famille_id ?? null,
      sous_famille_id: donnees.sous_famille_id ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get devis_id(): number {
    return this._donnees.devis_id
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

  get famille_id(): number | null {
    return this._donnees.famille_id
  }

  get sous_famille_id(): number | null {
    return this._donnees.sous_famille_id
  }
}

export interface DonneesAvenant {
  id: number
  statut?: StatutAvenant
  numero: string
  affaire_id: number
  objet?: string
  date_avenant?: string
  impact_delai_jours?: number
  impact_montant_ht_centimes?: number
}

interface AvenantNormalise {
  readonly id: number
  readonly statut: StatutAvenant
  readonly numero: string
  readonly affaire_id: number
  readonly objet: string | null
  readonly date_avenant: string | null
  readonly impact_delai_jours: number
  readonly impact_montant_ht_centimes: number
}

export class Avenant {
  private constructor(private readonly _donnees: AvenantNormalise) {}

  static depuisDonnees(donnees: DonneesAvenant): Avenant {
    verifierEntierPositif(donnees.id, 'identifiant avenant')
    verifierEntierPositif(donnees.affaire_id, 'identifiant affaire')
    verifierChaineNonVide(donnees.numero, 'numéro d’avenant')

    const statut = donnees.statut ?? 'BROUILLON'
    verifierParmi(statut, STATUTS_AVENANT, 'statut avenant')

    const impact_delai_jours = donnees.impact_delai_jours ?? 0
    verifierEntier(impact_delai_jours, 'impact sur le délai en jours')
    const impact_montant_ht_centimes = donnees.impact_montant_ht_centimes ?? 0
    verifierEntier(impact_montant_ht_centimes, 'impact sur le montant HT en centimes')

    if (donnees.date_avenant !== undefined) {
      verifierDateIso(donnees.date_avenant, 'date de l’avenant')
    }

    return new Avenant({
      id: donnees.id,
      statut,
      numero: donnees.numero,
      affaire_id: donnees.affaire_id,
      objet: chaineOuNulle(donnees.objet),
      date_avenant: donnees.date_avenant ?? null,
      impact_delai_jours,
      impact_montant_ht_centimes,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get statut(): StatutAvenant {
    return this._donnees.statut
  }

  get numero(): string {
    return this._donnees.numero
  }

  get affaire_id(): number {
    return this._donnees.affaire_id
  }

  get objet(): string | null {
    return this._donnees.objet
  }

  get date_avenant(): string | null {
    return this._donnees.date_avenant
  }

  get impact_delai_jours(): number {
    return this._donnees.impact_delai_jours
  }

  get impact_montant_ht_centimes(): number {
    return this._donnees.impact_montant_ht_centimes
  }
}

export interface DonneesReception {
  id: number
  affaire_id: number
  lot_tranche?: string
  type_reception: TypeReception
  date_reception: string
  numero_pv?: string
  montant_concerne_centimes?: number
}

interface ReceptionNormalise {
  readonly id: number
  readonly affaire_id: number
  readonly lot_tranche: string
  readonly type_reception: TypeReception
  readonly date_reception: string
  readonly numero_pv: string | null
  readonly montant_concerne_centimes: number | null
}

export class Reception {
  private constructor(private readonly _donnees: ReceptionNormalise) {}

  static depuisDonnees(donnees: DonneesReception): Reception {
    verifierEntierPositif(donnees.id, 'identifiant réception')
    verifierEntierPositif(donnees.affaire_id, 'identifiant affaire')
    verifierParmi(donnees.type_reception, TYPES_RECEPTION, 'type de réception')
    verifierDateIso(donnees.date_reception, 'date de réception')

    const lot_tranche = donnees.lot_tranche ?? 'Global'
    verifierChaineNonVide(lot_tranche, 'lot / tranche')

    verifierNonNegatifOptionnel(donnees.montant_concerne_centimes, 'montant concerné en centimes')

    return new Reception({
      id: donnees.id,
      affaire_id: donnees.affaire_id,
      lot_tranche,
      type_reception: donnees.type_reception,
      date_reception: donnees.date_reception,
      numero_pv: chaineOuNulle(donnees.numero_pv),
      montant_concerne_centimes: donnees.montant_concerne_centimes ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get affaire_id(): number {
    return this._donnees.affaire_id
  }

  get lot_tranche(): string {
    return this._donnees.lot_tranche
  }

  get type_reception(): TypeReception {
    return this._donnees.type_reception
  }

  get date_reception(): string {
    return this._donnees.date_reception
  }

  get numero_pv(): string | null {
    return this._donnees.numero_pv
  }

  get montant_concerne_centimes(): number | null {
    return this._donnees.montant_concerne_centimes
  }
}
