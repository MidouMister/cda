export interface AvenantVue {
  id: number
  statut: string
  numero: string
  affaireId: number
  objet: string | null
  dateAvenant: string | null
  impactDelaiJours: number
  impactMontantHtCentimes: number
  dateCreation: string
  dateModification: string
}

export interface AvenantPosteVue {
  id: number
  avenantId: number
  action: string
  posteDqeId: number | null
  designation: string | null
  unite: string | null
  quantiteMilliemes: number | null
  puHtCentimes: number | null
}

export interface DonneesCreationAvenant {
  affaireId: number
  objet?: string
  dateAvenant?: string
}

export interface DonneesCreationAvenantPoste {
  action: 'AJOUT' | 'MODIFICATION' | 'SUPPRESSION'
  posteDqeId?: number
  designation?: string
  unite?: string
  quantiteMilliemes?: number
  puHtCentimes?: number
}
