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
} as const
