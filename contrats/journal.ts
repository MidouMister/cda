export interface EntreeJournalVue {
  horodatage: string
  niveau: string
  module: string
  message: string
  stack?: string
}

export interface EcrireLogParams {
  entree: {
    niveau: 'erreur' | 'avertissement' | 'info'
    module: string
    message: string
    stack?: string
  }
}

export interface LireLogsParams {
  nombre?: number
  niveau?: 'erreur' | 'avertissement' | 'info'
}

export interface ResultatLectureJournal {
  entrees: EntreeJournalVue[]
}

export interface ResultatExportJournal {
  succes: boolean
  erreur?: string
}
