export interface TarifVue {
  id: number
  produitId: number
  typeNiveau: string
  clientId: number | null
  affaireId: number | null
  prixCentimes: number
  debutPeriode: string
  finPeriode: string | null
}

export interface DonneesCreationTarifVue {
  produitId: number
  typeNiveau: string
  clientId?: number | null
  affaireId?: number | null
  prixCentimes: number
  debutPeriode: string
  finPeriode?: string | null
}
