export interface DonneesFacturePdf {
  numero: string | null
  typeDocument: string
  dateFacture: string
  dateEcheance: string | null
  statut: string
  nombreImpressions: number
  nifClient: string | null
  numeroBcClient: string | null
  adresseFacturation: string | null
  modeReglementPrevu: string | null
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
}

export interface DonneesLignePdf {
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
}

export interface DonneesPiedPdf {
  totalHtLignesCentimes: number
  totalRemisesCentimes: number
  netCommercialHtCentimes: number
  retenueGarantieCentimes: number
  totalHtCentimes: number
  totalTvaCentimes: number
  totalTtcCentimes: number
  netAPayerCentimes: number
}

export interface DonneesClientPdf {
  raisonSociale: string
  nif: string | null
  adresse: string | null
}

export interface DonneesAffairePdf {
  reference: string
  objet: string
}

export interface DonneesEntreprisePdf {
  raisonSociale: string
  formeJuridique: string
  capital: string
  rc: string
  nif: string
  nis: string
  ai: string
  adresse: string
  telephone: string
}

export interface DonneesPdfFacture {
  facture: DonneesFacturePdf
  lignes: DonneesLignePdf[]
  pied: DonneesPiedPdf
  client: DonneesClientPdf
  affaire?: DonneesAffairePdf
  entreprise: DonneesEntreprisePdf
  estDuplicata: boolean
}

export interface DonneesPdfDevis {
  numero: string
  dateDevis: string
  dateValidite: string | null
  client: DonneesClientPdf
  affaire?: DonneesAffairePdf
  entreprise: DonneesEntreprisePdf
  lignes: DonneesLignePdf[]
  totalHtCentimes: number
  estDuplicata: boolean
}

export interface DonneesPdfBl {
  numero: string
  dateLivraison: string
  client: DonneesClientPdf
  affaire?: DonneesAffairePdf
  entreprise: DonneesEntreprisePdf
  lignes: { designation: string; unite: string; quantiteMilliemes: number }[]
  poidsPeseeKg: number | null
  estDuplicata: boolean
}
