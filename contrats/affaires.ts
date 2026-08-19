export interface AffaireVue {
  id: number
  statut: string
  reference: string
  typeAffaire: string
  affaireMereId: number | null
  clientId: number
  objet: string | null
  montantInitialHtCentimes: number
  tauxTvaBps: number
  dateSignature: string | null
  dateNotification: string | null
  numeroOds: string | null
  dateOds: string | null
  dateDemarrageEffectif: string | null
  delaiExecutionJours: number | null
  dateFinContractuelle: string | null
  dateFinRevisee: string | null
  dateFinReelle: string | null
  motifDepassement: string | null
  rabaisGlobalBps: number
  rabaisMarcheBps: number
  responsable: string | null
  numeroMarche: string | null
  serviceContractant: string | null
  typeProcedure: string | null
  avanceForfaitaireBps: number | null
  avanceApprovisionnementBps: number | null
  retenueGarantieBps: number
  delaiGarantieMois: number | null
  typeRevision: string | null
  formuleRevision: string | null
  penaliteRetardTauxBps: number | null
  penaliteRetardBaseCentimes: number | null
  penaliteRetardPlafondBps: number | null
  dateDecompteProvisoire: string | null
  dateDecompteDefinitif: string | null
  numeroContrat: string | null
  modalitesPaiement: string | null
  avanceContractuelleCentimes: number | null
  motifResiliation: string | null
  dateResiliation: string | null
  decompteResiliationCentimes: number | null
  sortCautions: string | null
  sortRetenueGarantie: string | null
  dateCreation: string
  dateModification: string
}

export interface DonneesCreationAffaire {
  reference: string
  typeAffaire: 'MARCHE_PUBLIC' | 'CONTRAT_PRIVE' | 'BC' | 'AVENANT'
  clientId: number
  affaireMereId?: number
  objet?: string
  montantInitialHtCentimes?: number
  tauxTvaBps?: number
  dateSignature?: string
  dateNotification?: string
  numeroOds?: string
  dateOds?: string
  dateDemarrageEffectif?: string
  delaiExecutionJours?: number
  dateFinContractuelle?: string
  rabaisGlobalBps?: number
  rabaisMarcheBps?: number
  responsable?: string
  numeroMarche?: string
  serviceContractant?: string
  typeProcedure?: string
  retenueGarantieBps?: number
  delaiGarantieMois?: number
}

export interface DonneesModificationAffaire {
  statut?: string
  objet?: string
  dateSignature?: string
  dateNotification?: string
  numeroOds?: string
  dateOds?: string
  dateDemarrageEffectif?: string
  delaiExecutionJours?: number
  dateFinContractuelle?: string
  dateFinRevisee?: string
  dateFinReelle?: string
  motifDepassement?: string
  responsable?: string
  numeroMarche?: string
  serviceContractant?: string
  dateDecompteProvisoire?: string
  dateDecompteDefinitif?: string
  numeroContrat?: string
  modalitesPaiement?: string
  motifResiliation?: string
  dateResiliation?: string
}
