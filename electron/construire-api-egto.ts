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
    lire: (id) => ipcRenderer.invoke(CANAUX.clients.lire, id),
    modifier: (id, donnees) => ipcRenderer.invoke(CANAUX.clients.modifier, id, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.clients.supprimer, id),
    creerContact: (donnees) => ipcRenderer.invoke(CANAUX.clients.creerContact, donnees),
    listerContacts: (clientId) => ipcRenderer.invoke(CANAUX.clients.listerContacts, clientId),
    modifierContact: (id, donnees) => ipcRenderer.invoke(CANAUX.clients.modifierContact, id, donnees),
    supprimerContact: (id) => ipcRenderer.invoke(CANAUX.clients.supprimerContact, id),
    creerInteraction: (donnees) => ipcRenderer.invoke(CANAUX.clients.creerInteraction, donnees),
    listerInteractions: (clientId) => ipcRenderer.invoke(CANAUX.clients.listerInteractions, clientId),
    supprimerInteraction: (id) => ipcRenderer.invoke(CANAUX.clients.supprimerInteraction, id),
    calculerScore: (clientId) => ipcRenderer.invoke(CANAUX.clients.calculerScore, clientId),
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
  tarifs: {
    creer: (donnees) => ipcRenderer.invoke(CANAUX.tarifs.creer, donnees),
    lister: () => ipcRenderer.invoke(CANAUX.tarifs.lister),
    listerParProduit: (produitId) => ipcRenderer.invoke(CANAUX.tarifs.listerParProduit, produitId),
    listerParClient: (clientId) => ipcRenderer.invoke(CANAUX.tarifs.listerParClient, clientId),
    listerParAffaire: (affaireId) => ipcRenderer.invoke(CANAUX.tarifs.listerParAffaire, affaireId),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.tarifs.supprimer, id),
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
  produits: {
    creer: (donnees) => ipcRenderer.invoke(CANAUX.produits.creer, donnees),
    lister: () => ipcRenderer.invoke(CANAUX.produits.lister),
    lire: (id) => ipcRenderer.invoke(CANAUX.produits.lire, id),
    modifier: (id, donnees) => ipcRenderer.invoke(CANAUX.produits.modifier, id, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.produits.supprimer, id),
    listerParFamille: (familleId) => ipcRenderer.invoke(CANAUX.produits.listerParFamille, familleId),
  },
  sousFamilles: {
    creer: (donnees) => ipcRenderer.invoke(CANAUX.sousFamilles.creer, donnees),
    lister: () => ipcRenderer.invoke(CANAUX.sousFamilles.lister),
    listerParFamille: (familleId) => ipcRenderer.invoke(CANAUX.sousFamilles.listerParFamille, familleId),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.sousFamilles.supprimer, id),
  },
  classifications: {
    creer: (donnees) => ipcRenderer.invoke(CANAUX.classifications.creer, donnees),
    lister: () => ipcRenderer.invoke(CANAUX.classifications.lister),
    modifier: (id, categorie) => ipcRenderer.invoke(CANAUX.classifications.modifier, id, categorie),
  },
  import: {
    lireFichier: (chemin) => ipcRenderer.invoke(CANAUX.import.lireFichier, chemin),
    validerLignes: (lignes, type) => ipcRenderer.invoke(CANAUX.import.validerLignes, lignes, type),
    executer: (definition, lignes) => ipcRenderer.invoke(CANAUX.import.executer, definition, lignes),
  },
  affaires: {
    lister: () => ipcRenderer.invoke(CANAUX.affaires.lister),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.affaires.creer, donnees),
    lire: (id) => ipcRenderer.invoke(CANAUX.affaires.lire, id),
    modifier: (id, donnees) => ipcRenderer.invoke(CANAUX.affaires.modifier, id, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.affaires.supprimer, id),
  },
  devis: {
    lister: () => ipcRenderer.invoke(CANAUX.devis.lister),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.devis.creer, donnees),
    lire: (id) => ipcRenderer.invoke(CANAUX.devis.lire, id),
    modifier: (id, donnees) => ipcRenderer.invoke(CANAUX.devis.modifier, id, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.devis.supprimer, id),
    creerLigne: (donnees) => ipcRenderer.invoke(CANAUX.devis.creerLigne, donnees),
    listerLignes: (devisId) => ipcRenderer.invoke(CANAUX.devis.listerLignes, devisId),
    supprimerLigne: (id) => ipcRenderer.invoke(CANAUX.devis.supprimerLigne, id),
  },
  postesDqe: {
    listerParAffaire: (affaireId) => ipcRenderer.invoke(CANAUX.postesDqe.listerParAffaire, affaireId),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.postesDqe.creer, donnees),
    modifier: (id, donnees) => ipcRenderer.invoke(CANAUX.postesDqe.modifier, id, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.postesDqe.supprimer, id),
  },
  avenants: {
    listerParAffaire: (affaireId) => ipcRenderer.invoke(CANAUX.avenants.listerParAffaire, affaireId),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.avenants.creer, donnees),
    modifierStatut: (id, statut) => ipcRenderer.invoke(CANAUX.avenants.modifierStatut, id, statut),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.avenants.supprimer, id),
    creerPoste: (donnees) => ipcRenderer.invoke(CANAUX.avenants.creerPoste, donnees),
    listerPostes: (avenantId) => ipcRenderer.invoke(CANAUX.avenants.listerPostes, avenantId),
  },
  evenementsDelais: {
    listerParAffaire: (affaireId) => ipcRenderer.invoke(CANAUX.evenementsDelais.listerParAffaire, affaireId),
    creer: (donnees) => ipcRenderer.invoke(CANAUX.evenementsDelais.creer, donnees),
    supprimer: (id) => ipcRenderer.invoke(CANAUX.evenementsDelais.supprimer, id),
  },
})
