export interface ClientVue {
  id: number
  statut: string
  codeClient: string
  typeClient: string
  raisonSociale: string
  sigle: string | null
  categorie: string
  secteur: string | null
  clientGroupe: number
  nomGroupe: string | null
  nif: string | null
  nis: string | null
  modeReglementPrefere: string | null
  scoreClient: string | null
}

export interface DonneesCreationClient {
  codeClient: string
  typeClient: 'EPE_SPA' | 'SARL' | 'EURL' | 'ETP' | 'ETBH' | 'PARTICULIER'
  raisonSociale: string
  categorie: 'PUBLIC' | 'PRIVE'
  statut?: 'PROSPECT' | 'ACTIF' | 'INACTIF' | 'EN_VIGILANCE' | 'ARCHIVE'
  sigle?: string | null
  secteur?: 'BTP' | 'ENERGIE' | 'PORTUAIRE' | 'HYDRAULIQUE' | 'VRD' | 'AUTRE' | null
  nomGroupe?: string | null
  adresse?: string | null
  wilaya?: string | null
  commune?: string | null
  telMobile?: string | null
  email?: string | null
  nif?: string | null
  nis?: string | null
  rc?: string | null
  modeReglementPrefere?: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'TRAITE' | 'LCN' | null
  plafondCreditCentimes?: number | null
}
