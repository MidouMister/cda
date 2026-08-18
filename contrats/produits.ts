export interface ProduitVue {
  id: number
  codeProduit: string
  libelle: string
  familleId: number
  sousFamilleId: number | null
  unite: string
  puReferenceCentimes: number
  typeTarification: string
  actif: number
}

export interface DonneesCreationProduitVue {
  codeProduit: string
  libelle: string
  familleId: number
  sousFamilleId?: number | null
  unite?: string
  puReferenceCentimes?: number
  typeTarification?: string
}

export interface SousFamilleVue {
  id: number
  familleId: number
  code: string
  libelle: string
}

export interface DonneesCreationSousFamilleVue {
  familleId: number
  code: string
  libelle: string
}

export interface ClassificationVue {
  id: number
  sousFamilleId: number
  categorie: string
}

export interface DonneesCreationClassificationVue {
  sousFamilleId: number
  categorie: string
}
