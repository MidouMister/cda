import { ipcMain } from 'electron'
import type { Base } from '../db/connexion'
import { enregistrerHandlersBareme } from './ipc-bareme'
import { enregistrerHandlersClients } from './ipc-clients'
import { enregistrerHandlersClientsExtension } from './ipc-clients-extension'
import { enregistrerHandlersDiagnostic } from './ipc-diagnostic'
import { enregistrerHandlersEncaissements } from './ipc-encaissements'
import { enregistrerHandlersExercices } from './ipc-exercices'
import { enregistrerHandlersFamilles } from './ipc-familles'
import { enregistrerHandlersParametres } from './ipc-parametres'
import { enregistrerHandlersProduits } from './ipc-produits'
import { enregistrerHandlersSession } from './ipc-session'
import { enregistrerHandlersSauvegarde } from './ipc-sauvegarde'
import { enregistrerHandlersTarifs } from './ipc-tarifs'
import { enregistrerHandlersJournal } from './ipc-journal'
import { enregistrerHandlersImport } from './ipc-import'
import type { EtatSessionGere } from './ipc-session'
import type { CompteurInactivite, DepsSession } from '../securite/session'

export interface EnregistreurIpc {
  handle(canal: string, appel: (evenement: unknown, ...args: unknown[]) => unknown): void
}

export const creerEnregistreurIpc = (): EnregistreurIpc => ({
  handle(canal, appel) {
    ipcMain.handle(canal, (evenement, ...args) => appel(evenement, ...args))
  },
})

export const enregistrerHandlersIpc = (
  obtenirBase?: () => Base,
  depsSession?: DepsSession,
  etatSession?: () => EtatSessionGere,
  compteurActivite?: CompteurInactivite,
  obtenirDossierUserData?: () => string,
): void => {
  const enregistreur = creerEnregistreurIpc()
  enregistrerHandlersParametres(enregistreur, obtenirBase)
  enregistrerHandlersBareme(enregistreur, obtenirBase)
  enregistrerHandlersExercices(enregistreur, obtenirBase)
  enregistrerHandlersFamilles(enregistreur, obtenirBase)
  enregistrerHandlersClients(enregistreur, obtenirBase)
  enregistrerHandlersClientsExtension(enregistreur, obtenirBase)
  enregistrerHandlersTarifs(enregistreur, obtenirBase)
  enregistrerHandlersEncaissements(enregistreur, obtenirBase)
  enregistrerHandlersProduits(enregistreur, obtenirBase)
  enregistrerHandlersImport(enregistreur, obtenirBase)
  enregistrerHandlersDiagnostic(enregistreur)
  if (depsSession && etatSession && compteurActivite && obtenirDossierUserData) {
    enregistrerHandlersSession(enregistreur, obtenirDossierUserData, etatSession, depsSession, compteurActivite)
  }
  if (obtenirDossierUserData) {
    enregistrerHandlersSauvegarde(enregistreur, obtenirDossierUserData)
    enregistrerHandlersJournal(enregistreur, obtenirDossierUserData)
  }
}
