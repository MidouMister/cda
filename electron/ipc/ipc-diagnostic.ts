import type { Diagnostic } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const enregistrerHandlersDiagnostic = (enregistreur: EnregistreurIpc): void => {
  enregistreur.handle(CANAUX.diagnostic.obtenirVersions, (): Diagnostic => ({
    versions: {
      electron: process.versions.electron ?? 'inconnue',
      chromium: process.versions.chrome ?? 'inconnue',
      node: process.versions.node ?? 'inconnue',
    },
    plateforme: process.platform,
  }))
}
