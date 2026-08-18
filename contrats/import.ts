export interface ColonneImportee {
  entete: string
  index: number
}

export interface LigneExcel {
  numeroLigne: number
  valeurs: Record<string, unknown>
}

export interface ResultatLectureExcel {
  colonnes: ColonneImportee[]
  lignes: LigneExcel[]
  lignesIgnorees: number
}

export interface ErreurImport {
  ligne: number
  colonne: string
  valeur: unknown
  erreur: string
}

export interface RapportImport {
  totalLignes: number
  lignesImportees: number
  lignesIgnorees: number
  erreurs: ErreurImport[]
  succes: boolean
  messageErreurTechnique?: string
}

export interface LigneImporteeVue {
  donnees: Record<string, unknown>
  valide: boolean
  erreurs: ErreurImport[]
}

export interface DefinitionImportVue {
  type: 'CLIENTS' | 'PRODUITS'
  correspondances: Record<string, string>
}
