export const CANAUX = {
  diagnostic: {
    obtenirVersions: 'diagnostic.obtenirVersions',
  },
  parametres: {
    lire: 'parametres.lire',
    lireSeuilEspeces: 'parametres.lireSeuilEspeces',
  },
  bareme: {
    lister: 'bareme.lister',
  },
  exercices: {
    courant: 'exercices.courant',
  },
  familles: {
    lister: 'familles.lister',
  },
  clients: {
    lister: 'clients.lister',
    creer: 'clients.creer',
  },
  encaissements: {
    lister: 'encaissements.lister',
    creer: 'encaissements.creer',
    supprimer: 'encaissements.supprimer',
    modifierTimbre: 'encaissements.modifierTimbre',
  },
  session: {
    etat: 'session.etat',
    premierDemarrage: 'session.premierDemarrage',
    deverrouiller: 'session.deverrouiller',
    verrouiller: 'session.verrouiller',
    changerMotDePasse: 'session.changerMotDePasse',
    activite: 'session.activite',
  },
  sauvegarde: {
    archiver: 'sauvegarde.archiver',
    restaurer: 'sauvegarde.restaurer',
    lister: 'sauvegarde.lister',
    appliquerRetention: 'sauvegarde.appliquerRetention',
    nommer: 'sauvegarde.nommer',
  },
  journal: {
    ecrire: 'journal.ecrire',
    lire: 'journal.lire',
    exporter: 'journal.exporter',
  },
} as const
