import { ipcMain } from 'electron'
import type { Base } from '../db/connexion'
import { enregistrerHandlersBareme } from './ipc-bareme'
import { enregistrerHandlersClients } from './ipc-clients'
import { enregistrerHandlersDiagnostic } from './ipc-diagnostic'
import { enregistrerHandlersExercices } from './ipc-exercices'
import { enregistrerHandlersFamilles } from './ipc-familles'
import { enregistrerHandlersParametres } from './ipc-parametres'

export interface EnregistreurIpc {
  handle(canal: string, appel: (evenement: unknown, ...args: unknown[]) => unknown): void
}

export const creerEnregistreurIpc = (): EnregistreurIpc => ({
  handle(canal, appel) {
    ipcMain.handle(canal, (evenement, ...args) => appel(evenement, ...args))
  },
})

export const enregistrerHandlersIpc = (obtenirBase?: () => Base): void => {
  const enregistreur = creerEnregistreurIpc()
  enregistrerHandlersParametres(enregistreur, obtenirBase)
  enregistrerHandlersBareme(enregistreur, obtenirBase)
  enregistrerHandlersExercices(enregistreur, obtenirBase)
  enregistrerHandlersFamilles(enregistreur, obtenirBase)
  enregistrerHandlersClients(enregistreur, obtenirBase)
  enregistrerHandlersDiagnostic(enregistreur)
}
