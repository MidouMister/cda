export interface EvenementDelaiVue {
  id: number
  affaireId: number
  typeEvenement: string
  dateDebut: string | null
  dateFin: string | null
  dureeJours: number | null
  motif: string | null
  impactDelaiJours: number
  dateCreation: string
}

export interface DonneesCreationEvenementDelai {
  affaireId: number
  typeEvenement: 'ODS' | 'SUSPENSION' | 'REPRISE' | 'PROROGATION'
  dateDebut?: string
  dateFin?: string
  dureeJours?: number
  motif?: string
  impactDelaiJours?: number
}
