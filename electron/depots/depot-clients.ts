import type { Base } from '../db/connexion'
import { versCentimes } from './conversion-centimes'

export type TypeClient = 'EPE_SPA' | 'SARL' | 'EURL' | 'ETP' | 'ETBH' | 'PARTICULIER'
export type CategorieClient = 'PUBLIC' | 'PRIVE'
export type StatutClient = 'PROSPECT' | 'ACTIF' | 'INACTIF' | 'EN_VIGILANCE' | 'ARCHIVE'
export type SecteurClient = 'BTP' | 'ENERGIE' | 'PORTUAIRE' | 'HYDRAULIQUE' | 'VRD' | 'AUTRE'
export type ModeReglement = 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'TRAITE' | 'LCN'
export type ScoreClient = 'A' | 'B' | 'C' | 'D'

export interface DonneesClient {
  code_client: string
  type_client: TypeClient
  raison_sociale: string
  categorie: CategorieClient
  statut?: StatutClient
  sigle?: string | null
  secteur?: SecteurClient | null
  nom_groupe?: string | null
  adresse?: string | null
  wilaya?: string | null
  commune?: string | null
  tel_mobile?: string | null
  email?: string | null
  nif?: string | null
  nis?: string | null
  rc?: string | null
  mode_reglement_prefere?: ModeReglement | null
  plafond_credit_centimes?: number | null
}

export interface Client {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  statut: StatutClient
  code_client: string
  type_client: TypeClient
  raison_sociale: string
  sigle: string | null
  categorie: CategorieClient
  secteur: SecteurClient | null
  client_groupe: number
  nom_groupe: string | null
  responsable_commercial: string | null
  contentieux_declare: number
  adresse: string | null
  wilaya: string | null
  commune: string | null
  tel_fixe: string | null
  tel_mobile: string | null
  fax: string | null
  email: string | null
  adresse_chantier: string | null
  nif: string | null
  nis: string | null
  rc: string | null
  ai: string | null
  rib: string | null
  banque: string | null
  agence: string | null
  mode_reglement_prefere: ModeReglement | null
  delai_paiement_jours: number | null
  plafond_credit_centimes: number | null
  score_client: ScoreClient | null
  derniere_evaluation_score_le: string | null
}

const verifierObligatoire = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string' || valeur.trim() === '') {
    throw new TypeError(`« ${libelle} » est obligatoire.`)
  }
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerClient = (base: Base, donnees: DonneesClient): number => {
  verifierObligatoire(donnees.code_client, 'code_client')
  verifierObligatoire(donnees.raison_sociale, 'raison_sociale')
  const resultat = base
    .prepare(
      `INSERT INTO clients (
         code_client, type_client, raison_sociale, categorie, statut, sigle, secteur,
         nom_groupe, adresse, wilaya, commune, tel_mobile, email, nif, nis, rc,
         mode_reglement_prefere, plafond_credit_centimes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.code_client,
      donnees.type_client,
      donnees.raison_sociale,
      donnees.categorie,
      donnees.statut ?? 'PROSPECT',
      normaliser(donnees.sigle),
      normaliser(donnees.secteur),
      normaliser(donnees.nom_groupe),
      normaliser(donnees.adresse),
      normaliser(donnees.wilaya),
      normaliser(donnees.commune),
      normaliser(donnees.tel_mobile),
      normaliser(donnees.email),
      normaliser(donnees.nif),
      normaliser(donnees.nis),
      normaliser(donnees.rc),
      normaliser(donnees.mode_reglement_prefere),
      donnees.plafond_credit_centimes === undefined || donnees.plafond_credit_centimes === null
        ? null
        : versCentimes(donnees.plafond_credit_centimes),
    )
  return Number(resultat.lastInsertRowid)
}

export const lireClientParId = (base: Base, id: number): Client | null => {
  const ligne = base
    .prepare('SELECT * FROM clients WHERE id = ? AND supprime_le IS NULL')
    .get(id) as Client | undefined
  return ligne ?? null
}

export const listerClients = (base: Base): Client[] => {
  return base.prepare('SELECT * FROM clients WHERE supprime_le IS NULL ORDER BY raison_sociale').all() as Client[]
}

export const supprimerLogiquementClient = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE clients
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
