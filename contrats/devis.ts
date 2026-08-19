export interface DevisVue {
  id: number
  statut: string
  numeroDevis: string
  clientId: number
  dateDevis: string
  dateValidite: string | null
  rabaisGlobalBps: number
  affaireId: number | null
  exerciceId: number | null
  dateCreation: string
  dateModification: string
}

export interface LigneDevisVue {
  id: number
  devisId: number
  produitId: number | null
  designation: string
  unite: string | null
  quantiteMilliemes: number
  puHtCentimes: number
  montantHtCentimes: number
  familleId: number | null
  sousFamilleId: number | null
}

export interface DonneesCreationDevis {
  clientId: number
  dateDevis: string
  dateValidite?: string
  rabaisGlobalBps?: number
  exerciceId?: number
}

export interface DonneesCreationLigneDevis {
  produitId?: number
  designation: string
  unite?: string
  quantiteMilliemes: number
  puHtCentimes: number
  familleId?: number
  sousFamilleId?: number
}
