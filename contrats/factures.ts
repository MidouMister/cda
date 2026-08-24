// Les types métier sont dupliqués ici (jamais importés depuis domaine/)
// pour préserver la frontière contrats/ → renderer.
export type StatutFactureVue =
  | 'BROUILLON'
  | 'VALIDE'
  | 'IMPRIMEE'
  | 'ENVOYEE'
  | 'PAYEE'
  | 'ARCHIVEE'

export type TypeDocumentFactureVue = 'FA' | 'AC' | 'AV' | 'FS' | 'ND'

export interface FactureVue {
  id: number
  statut: StatutFactureVue
  typeDocument: TypeDocumentFactureVue
  numero: string | null
  dateFacture: string
  dateEcheance: string | null
  affaireId: number | null
  clientId: number
  adresseFacturation: string | null
  adresseFacturationType: 'SIEGE' | 'CHANTIER' | null
  nifClient: string | null
  numeroBcClient: string | null
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  modeReglementPrevu: string | null
  totalHtLignesCentimes: number
  totalRemisesCentimes: number
  netCommercialHtCentimes: number
  retenueGarantieCentimes: number
  totalHtCentimes: number
  totalTvaCentimes: number
  totalTtcCentimes: number
  netAPayerCentimes: number
  factureOrigineId: number | null
  motifAvoir: string | null
  dateValidation: string | null
  nombreImpressions: number
  exerciceId: number | null
  dateCreation: string
  dateModification: string
}

export interface LigneFactureVue {
  id: number
  factureId: number
  produitId: number | null
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
  rabaisMarcheBps: number
  montantHtBrutCentimes: number
  montantHtRemiseCentimes: number
  montantRabaisMarcheCentimes: number
  montantHtNetCentimes: number
  typeLigne: string | null
  familleId: number | null
  sousFamilleId: number | null
  classification: string | null
}

export type ActionFactureVue = 'VALIDER' | 'IMPRIMER' | 'ENVOYER' | 'ENCAISSER' | 'ARCHIVER'

export interface ParametreLignePied {
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
  rabaisMarcheBps: number
}

export interface ParametresPiedPreview {
  lignes: ParametreLignePied[]
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  marchePublic: boolean
  tauxTvaBps?: number
}

export interface PiedCalcule {
  totalHtLignesCentimes: number
  totalRemisesCentimes: number
  netCommercialHtCentimes: number
  remboursementAvanceCentimes: number
  retenueGarantieCentimes: number
  totalHtCentimes: number
  totalTvaCentimes: number
  totalTtcCentimes: number
  netAPayerCentimes: number
  ajustementEcartAudit: string | null
}

export interface DonneesCreationFacture {
  typeDocument: TypeDocumentFactureVue
  dateFacture: string
  dateEcheance?: string
  affaireId?: number
  clientId: number
  adresseFacturation?: string
  adresseFacturationType?: 'SIEGE' | 'CHANTIER'
  numeroBcClient?: string
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  modeReglementPrevu?: string
}

export interface DonneesCreationLigneFacture {
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
  rabaisMarcheBps: number
  produitId?: number
  familleId?: number
  sousFamilleId?: number
  classification?: string
}

export interface SelectionLigneAvoir {
  ligneOrigineId: number
  quantiteMilliemes: number
}

export type ModeAvoir = 'TOTAL' | 'PAR_LIGNES' | 'PARTIEL'

export interface DonneesAvoir {
  factureOrigineId: number
  motifAvoir: string
  dateAvoir: string
  modeAvoir: ModeAvoir
  selections?: SelectionLigneAvoir[]
}
