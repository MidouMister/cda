export interface SauvegardeVue {
  nom: string
  date: string
  type: string
}

export interface ArchiverDonneesParams {
  dossierSource: string
  destination: string
  motDePasse: string
  typeBackup: 'quotidienne' | 'mensuelle' | 'manuelle'
}

export interface ResultatExportSauvegarde {
  succes: boolean
  chemin?: string
  erreur?: string
}

export interface RestaurerDonneesParams {
  archive?: string
  dossierDestination?: string
  phraseRecuperation: string
  nouveauMotDePasseApplicatif: string
}

export interface ResultatRestaurationSauvegarde {
  succes: boolean
  erreur?: string
}

export interface RetentionParams {
  retentionQuotidienne?: number
  retentionMensuelle?: number
}

export interface ResultatRetention {
  supprimees: number
}

export interface ConfigurerSauvegardeParams {
  activee: boolean
  horaireQuotidienne: string
  destination: string
}

export interface EtatSauvegardeVue {
  activee: boolean
  horaireQuotidienne: string
  destination: string
  derniereExecution: string | null
  derniereErreur: string | null
}

export interface ResultatChoixDestination {
  annule: boolean
  destination?: string
}
