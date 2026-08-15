// Modes de règlement EFFECTIFS de la version courante — copie littérale des
// valeurs du domaine (décision 15/08/2026) : TRAITE/LCN/VIREMENT sont refusés
// comme modes effectifs. Les unions de valeurs sont dupliquées ici (jamais
// importées depuis domaine/) pour préserver la frontière contrats/ → renderer.
export type ModeReglementEffectifVue =
  | 'ESPECES'
  | 'CHEQUE'
  | 'VIREMENT_BANCAIRE'
  | 'DEPOT_ESPECES_BANQUE'

export type StatutTimbreVue = 'A_VERIFIER' | 'TRAITE' | 'NON_APPLICABLE'

// Les montants transitent en centimes entiers (INTEGER, jamais REAL) : la
// conversion en DA relève de l'affichage côté renderer, pas du contrat.
export interface EncaissementVue {
  id: number
  factureId: number
  numero: string
  montantEncaisseCentimes: number
  dateEncaissement: string
  modeReglementEffectif: ModeReglementEffectifVue
  timbreStatut: StatutTimbreVue
  montantTimbreSaisiCentimes: number | null
  timbreTraiteLe: string | null
  timbreTraitePar: string | null
  referenceTimbreOuQuittance: string | null
  commentaireTimbre: string | null
  creeLe: string
  modifieLe: string
  supprimeLe: string | null
}

export interface DonneesCreationEncaissement {
  factureId: number
  montantEncaisseCentimes: number
  dateEncaissement: string
  modeReglementEffectif: ModeReglementEffectifVue
  timbreStatut?: StatutTimbreVue
  montantTimbreSaisiCentimes?: number
  timbreTraiteLe?: string
  timbreTraitePar?: string
  referenceTimbreOuQuittance?: string
  commentaireTimbre?: string
}

// La modification ne concerne QUE le traitement du timbre (décision
// 16/08/2026) : le montant encaissé, le mode effectif, la facture et la date
// d'encaissement ne sont pas modifiables via ce canal (correction = annulation
// + nouvel encaissement). timbreTraiteLe est au format JJ/MM/AAAA (UI) ; la
// conversion ISO relève de la couche IPC.
export interface DonneesModificationTimbreEncaissementVue {
  id: number
  timbreStatut: StatutTimbreVue
  montantTimbreSaisiCentimes?: number
  timbreTraiteLe?: string
  timbreTraitePar?: string
  referenceTimbreOuQuittance?: string
  commentaireTimbre?: string
}
