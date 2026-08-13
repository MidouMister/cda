import type { ApiEgto } from '../contrats'

declare global {
  interface Window {
    egto: ApiEgto
  }
}

export {}
