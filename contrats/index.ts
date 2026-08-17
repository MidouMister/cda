import type { Diagnostic } from './diagnostic'
import type { TrancheTimbreVue } from './bareme'
import type { ExerciceVue } from './exercices'
import type { FamilleVue } from './familles'
import type { ParametreVue, SeuilEspecesVue } from './parametres'
import type { ClientVue, DonneesCreationClient } from './clients'
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
  }
  encaissements: {
    lister: (factureId?: number) => Promise<EncaissementVue[]>
    creer: (donnees: DonneesCreationEncaissement) => Promise<EncaissementVue>
    supprimer: (id: number) => Promise<boolean>
    modifierEncaissement: (donnees: DonneesModificationTimbreEncaissementVue) => Promise<EncaissementVue>
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
}

export { CANAUX } from './canaux'
export type { Diagnostic } from './diagnostic'
export type { TrancheTimbreVue } from './bareme'
export type { ExerciceVue } from './exercices'
export type { FamilleVue } from './familles'
export type { ParametreVue, SeuilEspecesVue } from './parametres'
export type { ClientVue, DonneesCreationClient } from './clients'
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
