export interface ContactVue {
  id: number
  clientId: number
  nom: string
  fonction: string | null
  telephone: string | null
  email: string | null
  contactPrincipal: number
}

export interface DonneesCreationContactVue {
  clientId: number
  nom: string
  fonction?: string | null
  telephone?: string | null
  email?: string | null
  contactPrincipal?: number
}

export interface InteractionVue {
  id: number
  clientId: number
  dateInteraction: string
  typeInteraction: string
  note: string | null
}

export interface DonneesCreationInteractionVue {
  clientId: number
  dateInteraction: string
  typeInteraction: string
  note?: string | null
}

export interface ResultatScoreVue {
  score: string
  motif: string
}
