// Dupliqué depuis domaine/ pour préserver la frontière contrats/ → renderer.
export type StatutBonLivraisonVue = 'EMIS' | 'FACTURE'

export interface BonLivraisonVue {
  id: number
  statut: StatutBonLivraisonVue
  numeroBl: string
  dateLivraison: string
  affaireId: number | null
  clientId: number
  poidsPeseeKg: number | null
  signatureClient: number
  factureId: number | null
  exerciceId: number | null
  dateCreation: string
  dateModification: string
}

export interface LigneBonLivraisonVue {
  id: number
  bonLivraisonId: number
  produitId: number | null
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  montantHtCentimes: number
}

export interface DonneesCreationBonLivraison {
  dateLivraison: string
  affaireId?: number
  clientId: number
  poidsPeseeKg?: number
  signatureClient?: number
}

export interface DonneesCreationLigneBonLivraison {
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  produitId?: number
}

export interface DonneesGenerationFactureDepuisBons {
  blIds: number[]
  clientId: number
  affaireId?: number
  dateFacture: string
  dateEcheance?: string
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  marchePublic: boolean
  modeReglementPrevu?: string
}
