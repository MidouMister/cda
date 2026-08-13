import type { Diagnostic } from './diagnostic'
import type { TrancheTimbreVue } from './bareme'
import type { ExerciceVue } from './exercices'
import type { FamilleVue } from './familles'
import type { ParametreVue, SeuilEspecesVue } from './parametres'
import type { ClientVue, DonneesCreationClient } from './clients'

export interface ApiEgto {
  diagnostic: () => Promise<Diagnostic>
  parametres: {
    lire: (cle: string) => Promise<ParametreVue | null>
    lireSeuilEspeces: () => Promise<SeuilEspecesVue>
  }
  bareme: {
    lister: () => Promise<TrancheTimbreVue[]>
  }
  exercices: {
    courant: () => Promise<ExerciceVue | null>
  }
  familles: {
    lister: () => Promise<FamilleVue[]>
  }
  clients: {
    lister: () => Promise<ClientVue[]>
    creer: (donnees: DonneesCreationClient) => Promise<{ id: number }>
  }
}

export { CANAUX } from './canaux'
export type { Diagnostic } from './diagnostic'
export type { TrancheTimbreVue } from './bareme'
export type { ExerciceVue } from './exercices'
export type { FamilleVue } from './familles'
export type { ParametreVue, SeuilEspecesVue } from './parametres'
export type { ClientVue, DonneesCreationClient } from './clients'
