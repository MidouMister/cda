export interface PosteDqeVue {
  id: number
  affaireId: number
  numero: number
  designation: string
  unite: string | null
  quantiteMilliemes: number
  puHtCentimes: number
  montantHtCentimes: number
  familleId: number | null
  sousFamilleId: number | null
  classification: string | null
  origine: string
  ligneDevisId: number | null
  dateCreation: string
  dateModification: string
}

export interface DonneesCreationPosteDqe {
  affaireId: number
  numero: number
  designation: string
  unite?: string
  quantiteMilliemes: number
  puHtCentimes: number
  familleId?: number
  sousFamilleId?: number
  classification?: string
  origine?: 'DEVIS' | 'IMPORT' | 'AVENANT' | 'MANUEL'
  ligneDevisId?: number
}

export interface DonneesModificationPosteDqe {
  designation?: string
  unite?: string
  quantiteMilliemes?: number
  puHtCentimes?: number
  familleId?: number
  sousFamilleId?: number
  classification?: string
}
