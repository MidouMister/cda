import type { IpcRenderer } from 'electron'
import type { ApiEgto } from '../contrats'
import { CANAUX } from '../contrats'

export const construireApiEgto = (ipcRenderer: IpcRenderer): ApiEgto => ({
  diagnostic: () => ipcRenderer.invoke(CANAUX.diagnostic.obtenirVersions),
  parametres: {
    lire: (cle) => ipcRenderer.invoke(CANAUX.parametres.lire, cle),
    lireSeuilEspeces: () => ipcRenderer.invoke(CANAUX.parametres.lireSeuilEspeces),
  },
  bareme: {
    lister: () => ipcRenderer.invoke(CANAUX.bareme.lister),
  },
  exercices: {
    courant: () => ipcRenderer.invoke(CANAUX.exercices.courant),
  },
  familles: {
    lister: () => ipcRenderer.invoke(CANAUX.familles.lister),
  },
  clients: {
    lister: () => ipcRenderer.invoke(CANAUX.clients.lister),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.clients.creer, donnees),
  },
  encaissements: {
    lister: (factureId) =>
      factureId === undefined
        ? ipcRenderer.invoke(CANAUX.encaissements.lister)
        : ipcRenderer.invoke(CANAUX.encaissements.lister, factureId),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.encaissements.creer, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.encaissements.supprimer, id),
    modifierEncaissement: (donnees) => ipcRenderer.invoke(CANAUX.encaissements.modifierTimbre, donnees),
  },
  session: {
    etat: () => ipcRenderer.invoke(CANAUX.session.etat),
    premierDemarrage: (donnees) => ipcRenderer.invoke(CANAUX.session.premierDemarrage, donnees),
    deverrouiller: (donnees) => ipcRenderer.invoke(CANAUX.session.deverrouiller, donnees),
    verrouiller: () => ipcRenderer.invoke(CANAUX.session.verrouiller),
    changerMotDePasse: (donnees) => ipcRenderer.invoke(CANAUX.session.changerMotDePasse, donnees),
    activite: () => ipcRenderer.invoke(CANAUX.session.activite),
  },
  sauvegarde: {
    archiver: (params) => ipcRenderer.invoke(CANAUX.sauvegarde.archiver, params),
    restaurer: (params) => ipcRenderer.invoke(CANAUX.sauvegarde.restaurer, params),
    lister: () => ipcRenderer.invoke(CANAUX.sauvegarde.lister),
    appliquerRetention: (params) => ipcRenderer.invoke(CANAUX.sauvegarde.appliquerRetention, params),
    nommer: (typeBackup) => ipcRenderer.invoke(CANAUX.sauvegarde.nommer, typeBackup),
  },
  journal: {
    ecrire: (params) => ipcRenderer.invoke(CANAUX.journal.ecrire, params),
    lire: (params) => ipcRenderer.invoke(CANAUX.journal.lire, params),
    exporter: (chemin) => ipcRenderer.invoke(CANAUX.journal.exporter, chemin),
  },
})
