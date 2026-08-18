import type { Diagnostic } from './diagnostic'
import type { TrancheTimbreVue } from './bareme'
import type { ExerciceVue } from './exercices'
import type { FamilleVue } from './familles'
import type { ParametreVue, SeuilEspecesVue } from './parametres'
import type { ClientVue, DonneesCreationClient } from './clients'
import type {
  ContactVue,
  DonneesCreationContactVue,
  InteractionVue,
  DonneesCreationInteractionVue,
  ResultatScoreVue,
} from './clients-extension'
import type {
  EncaissementVue,
  DonneesCreationEncaissement,
  DonneesModificationTimbreEncaissementVue,
} from './encaissements'
import type {
  SauvegardeVue,
  ArchiverDonneesParams,
  ResultatExportSauvegarde,
  RestaurerDonneesParams,
  ResultatRestaurationSauvegarde,
  RetentionParams,
  ResultatRetention,
} from './sauvegarde'
import type {
  EcrireLogParams,
  LireLogsParams,
  ResultatLectureJournal,
  ResultatExportJournal,
} from './journal'
import type {
  ProduitVue,
  DonneesCreationProduitVue,
  SousFamilleVue,
  DonneesCreationSousFamilleVue,
  ClassificationVue,
  DonneesCreationClassificationVue,
} from './produits'
import type { TarifVue, DonneesCreationTarifVue } from './tarifs'
import type {
  LigneExcel,
  ResultatLectureExcel,
  LigneImporteeVue,
  DefinitionImportVue,
  RapportImport,
} from './import'

export interface ApiEgto {
  diagnostic: () => Promise<Diagnostic>
  parametres: {
    lire: (cle: string) => Promise<ParametreVue | null>
    lireSeuilEspeces: () => Promise<SeuilEspecesVue>
  }
  bareme: {
    lister: () => Promise<TrancheTimbreVue[]>
  }
  exercices: {
    courant: () => Promise<ExerciceVue | null>
  }
  familles: {
    lister: () => Promise<FamilleVue[]>
  }
  clients: {
    lister: () => Promise<ClientVue[]>
    creer: (donnees: DonneesCreationClient) => Promise<{ id: number }>
    lire: (id: number) => Promise<ClientVue | null>
    modifier: (id: number, donnees: Partial<DonneesCreationClient>) => Promise<boolean>
    supprimer: (id: number) => Promise<boolean>
    creerContact: (donnees: DonneesCreationContactVue) => Promise<{ id: number }>
    listerContacts: (clientId: number) => Promise<ContactVue[]>
    modifierContact: (id: number, donnees: Partial<DonneesCreationContactVue>) => Promise<boolean>
    supprimerContact: (id: number) => Promise<boolean>
    creerInteraction: (donnees: DonneesCreationInteractionVue) => Promise<{ id: number }>
    listerInteractions: (clientId: number) => Promise<InteractionVue[]>
    supprimerInteraction: (id: number) => Promise<boolean>
    calculerScore: (clientId: number) => Promise<ResultatScoreVue>
  }
  encaissements: {
    lister: (factureId?: number) => Promise<EncaissementVue[]>
    creer: (donnees: DonneesCreationEncaissement) => Promise<EncaissementVue>
    supprimer: (id: number) => Promise<boolean>
    modifierEncaissement: (donnees: DonneesModificationTimbreEncaissementVue) => Promise<EncaissementVue>
  }
  tarifs: {
    creer: (donnees: DonneesCreationTarifVue) => Promise<{ id: number }>
    lister: () => Promise<TarifVue[]>
    listerParProduit: (produitId: number) => Promise<TarifVue[]>
    listerParClient: (clientId: number) => Promise<TarifVue[]>
    listerParAffaire: (affaireId: number) => Promise<TarifVue[]>
    supprimer: (id: number) => Promise<boolean>
  }
  session: {
    etat: () => Promise<{ verrouillee: boolean; premierDemarrage: boolean }>
    premierDemarrage: (d: { motDePasse: string }) => Promise<{ phrase: string }>
    deverrouiller: (d: { motDePasse: string }) => Promise<void>
    verrouiller: () => Promise<void>
    changerMotDePasse: (d: { ancienMotDePasse: string; nouveauMotDePasse: string }) => Promise<void>
    activite: () => Promise<void>
  }
  sauvegarde: {
    archiver: (params: ArchiverDonneesParams) => Promise<ResultatExportSauvegarde>
    restaurer: (params: RestaurerDonneesParams) => Promise<ResultatRestaurationSauvegarde>
    lister: () => Promise<SauvegardeVue[]>
    appliquerRetention: (params?: RetentionParams) => Promise<ResultatRetention>
    nommer: (typeBackup: 'quotidienne' | 'mensuelle' | 'manuelle') => Promise<string>
  }
  journal: {
    ecrire: (params: EcrireLogParams) => Promise<void>
    lire: (params?: LireLogsParams) => Promise<ResultatLectureJournal>
    exporter: (chemin: string) => Promise<ResultatExportJournal>
  }
  produits: {
    creer: (donnees: DonneesCreationProduitVue) => Promise<{ id: number }>
    lister: () => Promise<ProduitVue[]>
    lire: (id: number) => Promise<ProduitVue | null>
    modifier: (id: number, donnees: Partial<DonneesCreationProduitVue>) => Promise<boolean>
    supprimer: (id: number) => Promise<boolean>
    listerParFamille: (familleId: number) => Promise<ProduitVue[]>
  }
  sousFamilles: {
    creer: (donnees: DonneesCreationSousFamilleVue) => Promise<{ id: number }>
    lister: () => Promise<SousFamilleVue[]>
    listerParFamille: (familleId: number) => Promise<SousFamilleVue[]>
    supprimer: (id: number) => Promise<boolean>
  }
  classifications: {
    creer: (donnees: DonneesCreationClassificationVue) => Promise<{ id: number }>
    lister: () => Promise<ClassificationVue[]>
    modifier: (id: number, categorie: string) => Promise<boolean>
  }
  import: {
    lireFichier: (chemin: string) => Promise<ResultatLectureExcel>
    validerLignes: (lignes: LigneExcel[], type: 'CLIENTS' | 'PRODUITS') => Promise<LigneImporteeVue[]>
    executer: (definition: DefinitionImportVue, lignes: LigneExcel[]) => Promise<RapportImport>
  }
}

export { CANAUX } from './canaux'
export type { Diagnostic } from './diagnostic'
export type { TrancheTimbreVue } from './bareme'
export type { ExerciceVue } from './exercices'
export type { FamilleVue } from './familles'
export type { ParametreVue, SeuilEspecesVue } from './parametres'
export type { ClientVue, DonneesCreationClient } from './clients'
export type {
  ContactVue,
  DonneesCreationContactVue,
  InteractionVue,
  DonneesCreationInteractionVue,
  ResultatScoreVue,
} from './clients-extension'
export type { EncaissementVue, DonneesCreationEncaissement, DonneesModificationTimbreEncaissementVue } from './encaissements'
export type {
  SauvegardeVue,
  ArchiverDonneesParams,
  ResultatExportSauvegarde,
  RestaurerDonneesParams,
  ResultatRestaurationSauvegarde,
  RetentionParams,
  ResultatRetention,
} from './sauvegarde'
export type {
  EntreeJournalVue,
  EcrireLogParams,
  LireLogsParams,
  ResultatLectureJournal,
  ResultatExportJournal,
} from './journal'
export type {
  ProduitVue,
  DonneesCreationProduitVue,
  SousFamilleVue,
  DonneesCreationSousFamilleVue,
  ClassificationVue,
  DonneesCreationClassificationVue,
} from './produits'
export type { TarifVue, DonneesCreationTarifVue } from './tarifs'
export type {
  ColonneImportee,
  LigneExcel,
  ResultatLectureExcel,
  ErreurImport,
  RapportImport,
  LigneImporteeVue,
  DefinitionImportVue,
} from './import'
