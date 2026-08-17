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
  archive: string
  motDePasse: string
  dossierDestination: string
  phraseRecuperation?: string
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
