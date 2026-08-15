import { Nif, Nis } from './identites'

export const STATUTS_CLIENT = ['PROSPECT', 'ACTIF', 'INACTIF', 'EN_VIGILANCE', 'ARCHIVE'] as const
export type StatutClient = (typeof STATUTS_CLIENT)[number]

export const TYPES_CLIENT = ['EPE_SPA', 'SARL', 'EURL', 'ETP', 'ETBH', 'PARTICULIER'] as const
export type TypeClient = (typeof TYPES_CLIENT)[number]

export const CATEGORIES_CLIENT = ['PUBLIC', 'PRIVE'] as const
export type CategorieClient = (typeof CATEGORIES_CLIENT)[number]

export const SECTEURS_CLIENT = ['BTP', 'ENERGIE', 'PORTUAIRE', 'HYDRAULIQUE', 'VRD', 'AUTRE'] as const
export type SecteurClient = (typeof SECTEURS_CLIENT)[number]

// DÉPRÉCIÉ (15/08/2026) : TRAITE et LCN ne sont plus des modes actifs — à ne
// PAS utiliser comme modes effectifs. Ce type reste utilisé pour
// `clients.mode_reglement_prefere` et `factures.mode_reglement_prevu`
// (valeurs historiques, colonnes verrouillées de la migration 1).
export const MODES_REGLEMENT = ['VIREMENT', 'CHEQUE', 'ESPECES', 'TRAITE', 'LCN'] as const
export type ModeReglement = (typeof MODES_REGLEMENT)[number]

// Modes de règlement EFFECTIFS de la version courante (décision 15/08/2026) —
// uniquement ces 4 valeurs ; TRAITE/LCN/VIREMENT refusés comme modes effectifs.
export const MODES_REGLEMENT_EFFECTIFS = [
  'ESPECES',
  'CHEQUE',
  'VIREMENT_BANCAIRE',
  'DEPOT_ESPECES_BANQUE',
] as const
export type ModeReglementEffectif = (typeof MODES_REGLEMENT_EFFECTIFS)[number]

export const SCORES_CLIENT = ['A', 'B', 'C', 'D'] as const
export type ScoreClient = (typeof SCORES_CLIENT)[number]

export const TYPES_INTERACTION = ['APPEL', 'VISITE', 'RELANCE', 'AUTRE'] as const
export type TypeInteraction = (typeof TYPES_INTERACTION)[number]

export const UNITES_PRODUIT = ['T', 'M2', 'M3', 'FORFAIT', 'H', 'J', 'KM', 'U', 'L'] as const
export type Unite = (typeof UNITES_PRODUIT)[number]

export const TYPES_TARIFICATION = ['FIXE', 'PAR_CLIENT', 'PAR_AFFAIRE', 'FORFAIT'] as const
export type TypeTarification = (typeof TYPES_TARIFICATION)[number]

export const TYPES_NIVEAU_TARIF = ['CATALOGUE', 'CLIENT', 'AFFAIRE'] as const
export type TypeNiveauTarif = (typeof TYPES_NIVEAU_TARIF)[number]

export const CODES_FAMILLE = ['VTE', 'LOC', 'REA', 'ST'] as const
export type CodeFamille = (typeof CODES_FAMILLE)[number]

export const STATUTS_FAMILLE = ['ACTIF', 'INACTIF'] as const
export type StatutFamille = (typeof STATUTS_FAMILLE)[number]

export const verifierEntierPositif = (valeur: number, libelle: string): void => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur) || valeur < 1) {
    throw new TypeError(`« ${libelle} » doit être un entier strictement positif (reçu : ${String(valeur)}).`)
  }
}

export const verifierEntierNonNegatif = (valeur: number, libelle: string): void => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur) || valeur < 0) {
    throw new TypeError(`« ${libelle} » doit être un entier positif ou nul (reçu : ${String(valeur)}).`)
  }
}

export const verifierChaineNonVide = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new TypeError(`« ${libelle} » doit être une chaîne non vide (reçu : ${String(valeur)}).`)
  }
}

export const verifierBinaire = (valeur: number, libelle: string): void => {
  if (valeur !== 0 && valeur !== 1) {
    throw new Error(`« ${libelle} » doit valoir 0 ou 1 (reçu : ${String(valeur)}).`)
  }
}

export const verifierParmi = <T extends readonly string[]>(
  valeur: string,
  liste: T,
  libelle: string,
): void => {
  if (!liste.includes(valeur as T[number])) {
    throw new Error(`« ${libelle} » : valeur inconnue « ${valeur} » (attendu parmi : ${liste.join(', ')}).`)
  }
}

const MOTIF_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const JOURS_PAR_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

const estBissextile = (annee: number): boolean =>
  (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0

const joursDansLeMois = (annee: number, mois: number): number =>
  mois === 2 && estBissextile(annee) ? 29 : JOURS_PAR_MOIS[mois - 1]

export const verifierDateIso = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string') {
    throw new TypeError(`« ${libelle} » doit être une chaîne (reçu : ${String(valeur)}).`)
  }
  const correspondance = MOTIF_DATE.exec(valeur)
  if (correspondance === null) {
    throw new Error(`« ${libelle} » : format invalide « ${valeur} » (attendu : AAAA-MM-JJ).`)
  }
  const mois = Number(correspondance[2])
  const jour = Number(correspondance[3])
  if (mois < 1 || mois > 12) {
    throw new Error(`« ${libelle} » : mois invalide (${mois}).`)
  }
  if (jour < 1 || jour > joursDansLeMois(Number(correspondance[1]), mois)) {
    throw new Error(`« ${libelle} » : jour invalide (${jour}) pour le mois indiqué.`)
  }
}

const chaineOuNulle = (valeur: string | undefined): string | null => valeur ?? null

export interface DonneesClient {
  id: number
  statut?: StatutClient
  code_client: string
  type_client: TypeClient
  raison_sociale: string
  sigle?: string
  categorie: CategorieClient
  secteur?: SecteurClient
  client_groupe?: 0 | 1
  nom_groupe?: string
  responsable_commercial?: string
  contentieux_declare?: 0 | 1
  adresse?: string
  wilaya?: string
  commune?: string
  tel_fixe?: string
  tel_mobile?: string
  fax?: string
  email?: string
  adresse_chantier?: string
  nif?: Nif
  nis?: Nis
  rc?: string
  ai?: string
  rib?: string
  banque?: string
  agence?: string
  mode_reglement_prefere?: ModeReglement
  delai_paiement_jours?: number
  plafond_credit_centimes?: number
  score_client?: ScoreClient
  derniere_evaluation_score_le?: string
}

interface ClientNormalise {
  readonly id: number
  readonly statut: StatutClient
  readonly code_client: string
  readonly type_client: TypeClient
  readonly raison_sociale: string
  readonly sigle: string | null
  readonly categorie: CategorieClient
  readonly secteur: SecteurClient | null
  readonly client_groupe: 0 | 1
  readonly nom_groupe: string | null
  readonly responsable_commercial: string | null
  readonly contentieux_declare: 0 | 1
  readonly adresse: string | null
  readonly wilaya: string | null
  readonly commune: string | null
  readonly tel_fixe: string | null
  readonly tel_mobile: string | null
  readonly fax: string | null
  readonly email: string | null
  readonly adresse_chantier: string | null
  readonly nif: Nif | null
  readonly nis: Nis | null
  readonly rc: string | null
  readonly ai: string | null
  readonly rib: string | null
  readonly banque: string | null
  readonly agence: string | null
  readonly mode_reglement_prefere: ModeReglement | null
  readonly delai_paiement_jours: number | null
  readonly plafond_credit_centimes: number | null
  readonly score_client: ScoreClient | null
  readonly derniere_evaluation_score_le: string | null
}

export class Client {
  private constructor(private readonly _donnees: ClientNormalise) {}

  static depuisDonnees(donnees: DonneesClient): Client {
    verifierEntierPositif(donnees.id, 'identifiant client')
    verifierChaineNonVide(donnees.code_client, 'code client')
    verifierChaineNonVide(donnees.raison_sociale, 'raison sociale')
    verifierParmi(donnees.type_client, TYPES_CLIENT, 'type client')
    verifierParmi(donnees.categorie, CATEGORIES_CLIENT, 'catégorie client')

    const statut = donnees.statut ?? 'PROSPECT'
    verifierParmi(statut, STATUTS_CLIENT, 'statut client')

    const secteur = donnees.secteur
    if (secteur !== undefined) {
      verifierParmi(secteur, SECTEURS_CLIENT, 'secteur client')
    }

    const client_groupe = donnees.client_groupe ?? 0
    verifierBinaire(client_groupe, 'client groupe')

    const nom_groupe = chaineOuNulle(donnees.nom_groupe)
    if (client_groupe === 1) {
      if (nom_groupe === null || nom_groupe.trim() === '') {
        throw new Error('« nom du groupe » est requis lorsqu’un client est rattaché à un groupe.')
      }
    }

    const contentieux_declare = donnees.contentieux_declare ?? 0
    verifierBinaire(contentieux_declare, 'contentieux déclaré')

    if (donnees.mode_reglement_prefere !== undefined) {
      verifierParmi(donnees.mode_reglement_prefere, MODES_REGLEMENT, 'mode de règlement préféré')
    }

    if (donnees.delai_paiement_jours !== undefined) {
      verifierEntierNonNegatif(donnees.delai_paiement_jours, 'délai de paiement en jours')
    }

    if (donnees.plafond_credit_centimes !== undefined) {
      verifierEntierNonNegatif(donnees.plafond_credit_centimes, 'plafond de crédit en centimes')
    }

    if (donnees.score_client !== undefined) {
      verifierParmi(donnees.score_client, SCORES_CLIENT, 'score client')
    }

    if (donnees.derniere_evaluation_score_le !== undefined) {
      verifierDateIso(donnees.derniere_evaluation_score_le, 'date de la dernière évaluation du score')
    }

    const nif = donnees.nif
    if (nif !== undefined && !(nif instanceof Nif)) {
      throw new TypeError('« NIF » doit être une instance de Nif.')
    }
    if (donnees.type_client !== 'PARTICULIER' && nif === undefined) {
      throw new Error('« NIF » est requis pour un client hors particulier (décision-j0 §1.16.5).')
    }

    const nis = donnees.nis
    if (nis !== undefined && !(nis instanceof Nis)) {
      throw new TypeError('« NIS » doit être une instance de Nis.')
    }

    return new Client({
      id: donnees.id,
      statut,
      code_client: donnees.code_client,
      type_client: donnees.type_client,
      raison_sociale: donnees.raison_sociale,
      sigle: chaineOuNulle(donnees.sigle),
      categorie: donnees.categorie,
      secteur: secteur ?? null,
      client_groupe,
      nom_groupe,
      responsable_commercial: chaineOuNulle(donnees.responsable_commercial),
      contentieux_declare,
      adresse: chaineOuNulle(donnees.adresse),
      wilaya: chaineOuNulle(donnees.wilaya),
      commune: chaineOuNulle(donnees.commune),
      tel_fixe: chaineOuNulle(donnees.tel_fixe),
      tel_mobile: chaineOuNulle(donnees.tel_mobile),
      fax: chaineOuNulle(donnees.fax),
      email: chaineOuNulle(donnees.email),
      adresse_chantier: chaineOuNulle(donnees.adresse_chantier),
      nif: nif ?? null,
      nis: nis ?? null,
      rc: chaineOuNulle(donnees.rc),
      ai: chaineOuNulle(donnees.ai),
      rib: chaineOuNulle(donnees.rib),
      banque: chaineOuNulle(donnees.banque),
      agence: chaineOuNulle(donnees.agence),
      mode_reglement_prefere: donnees.mode_reglement_prefere ?? null,
      delai_paiement_jours: donnees.delai_paiement_jours ?? null,
      plafond_credit_centimes: donnees.plafond_credit_centimes ?? null,
      score_client: donnees.score_client ?? null,
      derniere_evaluation_score_le: donnees.derniere_evaluation_score_le ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get statut(): StatutClient {
    return this._donnees.statut
  }

  get code_client(): string {
    return this._donnees.code_client
  }

  get type_client(): TypeClient {
    return this._donnees.type_client
  }

  get raison_sociale(): string {
    return this._donnees.raison_sociale
  }

  get sigle(): string | null {
    return this._donnees.sigle
  }

  get categorie(): CategorieClient {
    return this._donnees.categorie
  }

  get secteur(): SecteurClient | null {
    return this._donnees.secteur
  }

  get client_groupe(): 0 | 1 {
    return this._donnees.client_groupe
  }

  get nom_groupe(): string | null {
    return this._donnees.nom_groupe
  }

  get responsable_commercial(): string | null {
    return this._donnees.responsable_commercial
  }

  get contentieux_declare(): 0 | 1 {
    return this._donnees.contentieux_declare
  }

  get adresse(): string | null {
    return this._donnees.adresse
  }

  get wilaya(): string | null {
    return this._donnees.wilaya
  }

  get commune(): string | null {
    return this._donnees.commune
  }

  get tel_fixe(): string | null {
    return this._donnees.tel_fixe
  }

  get tel_mobile(): string | null {
    return this._donnees.tel_mobile
  }

  get fax(): string | null {
    return this._donnees.fax
  }

  get email(): string | null {
    return this._donnees.email
  }

  get adresse_chantier(): string | null {
    return this._donnees.adresse_chantier
  }

  get nif(): Nif | null {
    return this._donnees.nif
  }

  get nis(): Nis | null {
    return this._donnees.nis
  }

  get rc(): string | null {
    return this._donnees.rc
  }

  get ai(): string | null {
    return this._donnees.ai
  }

  get rib(): string | null {
    return this._donnees.rib
  }

  get banque(): string | null {
    return this._donnees.banque
  }

  get agence(): string | null {
    return this._donnees.agence
  }

  get mode_reglement_prefere(): ModeReglement | null {
    return this._donnees.mode_reglement_prefere
  }

  get delai_paiement_jours(): number | null {
    return this._donnees.delai_paiement_jours
  }

  get plafond_credit_centimes(): number | null {
    return this._donnees.plafond_credit_centimes
  }

  get score_client(): ScoreClient | null {
    return this._donnees.score_client
  }

  get derniere_evaluation_score_le(): string | null {
    return this._donnees.derniere_evaluation_score_le
  }
}

export interface DonneesContact {
  id: number
  client_id: number
  nom: string
  fonction?: string
  telephone?: string
  email?: string
  contact_principal?: 0 | 1
}

interface ContactNormalise {
  readonly id: number
  readonly client_id: number
  readonly nom: string
  readonly fonction: string | null
  readonly telephone: string | null
  readonly email: string | null
  readonly contact_principal: 0 | 1
}

export class Contact {
  private constructor(private readonly _donnees: ContactNormalise) {}

  static depuisDonnees(donnees: DonneesContact): Contact {
    verifierEntierPositif(donnees.id, 'identifiant contact')
    verifierEntierPositif(donnees.client_id, 'identifiant client')
    verifierChaineNonVide(donnees.nom, 'nom du contact')

    const contact_principal = donnees.contact_principal ?? 0
    verifierBinaire(contact_principal, 'contact principal')

    return new Contact({
      id: donnees.id,
      client_id: donnees.client_id,
      nom: donnees.nom,
      fonction: chaineOuNulle(donnees.fonction),
      telephone: chaineOuNulle(donnees.telephone),
      email: chaineOuNulle(donnees.email),
      contact_principal,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get client_id(): number {
    return this._donnees.client_id
  }

  get nom(): string {
    return this._donnees.nom
  }

  get fonction(): string | null {
    return this._donnees.fonction
  }

  get telephone(): string | null {
    return this._donnees.telephone
  }

  get email(): string | null {
    return this._donnees.email
  }

  get contact_principal(): 0 | 1 {
    return this._donnees.contact_principal
  }
}

export interface DonneesInteraction {
  id: number
  client_id: number
  date_interaction: string
  type_interaction: TypeInteraction
  note?: string
}

interface InteractionNormalise {
  readonly id: number
  readonly client_id: number
  readonly date_interaction: string
  readonly type_interaction: TypeInteraction
  readonly note: string | null
}

export class Interaction {
  private constructor(private readonly _donnees: InteractionNormalise) {}

  static depuisDonnees(donnees: DonneesInteraction): Interaction {
    verifierEntierPositif(donnees.id, 'identifiant interaction')
    verifierEntierPositif(donnees.client_id, 'identifiant client')
    verifierDateIso(donnees.date_interaction, 'date de l’interaction')
    verifierParmi(donnees.type_interaction, TYPES_INTERACTION, 'type d’interaction')

    return new Interaction({
      id: donnees.id,
      client_id: donnees.client_id,
      date_interaction: donnees.date_interaction,
      type_interaction: donnees.type_interaction,
      note: chaineOuNulle(donnees.note),
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get client_id(): number {
    return this._donnees.client_id
  }

  get date_interaction(): string {
    return this._donnees.date_interaction
  }

  get type_interaction(): TypeInteraction {
    return this._donnees.type_interaction
  }

  get note(): string | null {
    return this._donnees.note
  }
}

export interface DonneesProduit {
  id: number
  code_produit: string
  libelle: string
  famille_id: number
  sous_famille_id?: number
  unite?: Unite
  pu_reference_centimes?: number
  type_tarification?: TypeTarification
  actif?: 0 | 1
}

interface ProduitNormalise {
  readonly id: number
  readonly code_produit: string
  readonly libelle: string
  readonly famille_id: number
  readonly sous_famille_id: number | null
  readonly unite: Unite
  readonly pu_reference_centimes: number
  readonly type_tarification: TypeTarification
  readonly actif: 0 | 1
}

export class Produit {
  private constructor(private readonly _donnees: ProduitNormalise) {}

  static depuisDonnees(donnees: DonneesProduit): Produit {
    verifierEntierPositif(donnees.id, 'identifiant produit')
    verifierChaineNonVide(donnees.code_produit, 'code produit')
    verifierChaineNonVide(donnees.libelle, 'libellé produit')
    verifierEntierPositif(donnees.famille_id, 'identifiant famille')

    if (donnees.sous_famille_id !== undefined) {
      verifierEntierPositif(donnees.sous_famille_id, 'identifiant sous-famille')
    }

    const unite = donnees.unite ?? 'U'
    verifierParmi(unite, UNITES_PRODUIT, 'unité')

    const pu_reference_centimes = donnees.pu_reference_centimes ?? 0
    verifierEntierNonNegatif(pu_reference_centimes, 'PU de référence en centimes')

    const type_tarification = donnees.type_tarification ?? 'FIXE'
    verifierParmi(type_tarification, TYPES_TARIFICATION, 'type de tarification')

    const actif = donnees.actif ?? 1
    verifierBinaire(actif, 'produit actif')

    return new Produit({
      id: donnees.id,
      code_produit: donnees.code_produit,
      libelle: donnees.libelle,
      famille_id: donnees.famille_id,
      sous_famille_id: donnees.sous_famille_id ?? null,
      unite,
      pu_reference_centimes,
      type_tarification,
      actif,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get code_produit(): string {
    return this._donnees.code_produit
  }

  get libelle(): string {
    return this._donnees.libelle
  }

  get famille_id(): number {
    return this._donnees.famille_id
  }

  get sous_famille_id(): number | null {
    return this._donnees.sous_famille_id
  }

  get unite(): Unite {
    return this._donnees.unite
  }

  get pu_reference_centimes(): number {
    return this._donnees.pu_reference_centimes
  }

  get type_tarification(): TypeTarification {
    return this._donnees.type_tarification
  }

  get actif(): 0 | 1 {
    return this._donnees.actif
  }
}

export interface DonneesTarif {
  id: number
  produit_id: number
  type_niveau: TypeNiveauTarif
  client_id?: number
  affaire_id?: number
  prix_centimes: number
  debut_periode: string
  fin_periode?: string
}

interface TarifNormalise {
  readonly id: number
  readonly produit_id: number
  readonly type_niveau: TypeNiveauTarif
  readonly client_id: number | null
  readonly affaire_id: number | null
  readonly prix_centimes: number
  readonly debut_periode: string
  readonly fin_periode: string | null
}

export class Tarif {
  private constructor(private readonly _donnees: TarifNormalise) {}

  static depuisDonnees(donnees: DonneesTarif): Tarif {
    verifierEntierPositif(donnees.id, 'identifiant tarif')
    verifierEntierPositif(donnees.produit_id, 'identifiant produit')
    verifierParmi(donnees.type_niveau, TYPES_NIVEAU_TARIF, 'niveau de tarif')
    verifierEntierNonNegatif(donnees.prix_centimes, 'prix en centimes')
    verifierDateIso(donnees.debut_periode, 'date de début de période')

    if (donnees.fin_periode !== undefined) {
      verifierDateIso(donnees.fin_periode, 'date de fin de période')
      if (donnees.fin_periode < donnees.debut_periode) {
        throw new Error('La date de fin de période est antérieure à la date de début.')
      }
    }

    if (donnees.client_id !== undefined) {
      verifierEntierPositif(donnees.client_id, 'identifiant client')
    }
    if (donnees.affaire_id !== undefined) {
      verifierEntierPositif(donnees.affaire_id, 'identifiant affaire')
    }

    const { type_niveau, client_id, affaire_id } = donnees
    if (type_niveau === 'CATALOGUE' && (client_id !== undefined || affaire_id !== undefined)) {
      throw new Error('Un tarif CATALOGUE ne peut référencer ni un client ni une affaire.')
    }
    if (type_niveau === 'CLIENT' && (client_id === undefined || affaire_id !== undefined)) {
      throw new Error('Un tarif CLIENT exige un client et ne peut référencer une affaire.')
    }
    if (type_niveau === 'AFFAIRE' && (affaire_id === undefined || client_id !== undefined)) {
      throw new Error('Un tarif AFFAIRE exige une affaire et ne peut référencer un client.')
    }

    return new Tarif({
      id: donnees.id,
      produit_id: donnees.produit_id,
      type_niveau,
      client_id: client_id ?? null,
      affaire_id: affaire_id ?? null,
      prix_centimes: donnees.prix_centimes,
      debut_periode: donnees.debut_periode,
      fin_periode: donnees.fin_periode ?? null,
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get produit_id(): number {
    return this._donnees.produit_id
  }

  get type_niveau(): TypeNiveauTarif {
    return this._donnees.type_niveau
  }

  get client_id(): number | null {
    return this._donnees.client_id
  }

  get affaire_id(): number | null {
    return this._donnees.affaire_id
  }

  get prix_centimes(): number {
    return this._donnees.prix_centimes
  }

  get debut_periode(): string {
    return this._donnees.debut_periode
  }

  get fin_periode(): string | null {
    return this._donnees.fin_periode
  }
}

export interface DonneesFamille {
  id: number
  code: CodeFamille
  libelle: string
  statut?: StatutFamille
}

export class Famille {
  private constructor(
    private readonly _id: number,
    private readonly _code: CodeFamille,
    private readonly _libelle: string,
    private readonly _statut: StatutFamille,
  ) {}

  static depuisDonnees(donnees: DonneesFamille): Famille {
    verifierEntierPositif(donnees.id, 'identifiant famille')
    verifierParmi(donnees.code, CODES_FAMILLE, 'code famille')
    verifierChaineNonVide(donnees.libelle, 'libellé famille')

    const statut = donnees.statut ?? 'ACTIF'
    verifierParmi(statut, STATUTS_FAMILLE, 'statut famille')

    return new Famille(donnees.id, donnees.code, donnees.libelle, statut)
  }

  get id(): number {
    return this._id
  }

  get code(): CodeFamille {
    return this._code
  }

  get libelle(): string {
    return this._libelle
  }

  get statut(): StatutFamille {
    return this._statut
  }
}

export interface DonneesSousFamille {
  id: number
  famille_id: number
  code: string
  libelle: string
}

export class SousFamille {
  private constructor(
    private readonly _id: number,
    private readonly _famille_id: number,
    private readonly _code: string,
    private readonly _libelle: string,
  ) {}

  static depuisDonnees(donnees: DonneesSousFamille): SousFamille {
    verifierEntierPositif(donnees.id, 'identifiant sous-famille')
    verifierEntierPositif(donnees.famille_id, 'identifiant famille')
    verifierChaineNonVide(donnees.code, 'code sous-famille')
    verifierChaineNonVide(donnees.libelle, 'libellé sous-famille')

    return new SousFamille(donnees.id, donnees.famille_id, donnees.code, donnees.libelle)
  }

  get id(): number {
    return this._id
  }

  get famille_id(): number {
    return this._famille_id
  }

  get code(): string {
    return this._code
  }

  get libelle(): string {
    return this._libelle
  }
}
