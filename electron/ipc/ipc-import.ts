import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { lireExcel, type LigneExcel } from '../excel/lecteur-excel'
import {
  executerImport,
  validerLigneClient,
  validerLigneProduit,
  type DefinitionImport,
  type LigneImportee,
  type TypeImport,
} from '../import/moteur-import'
import { creerClient } from '../depots/depot-clients'
import { creerProduit } from '../depots/depot-produits'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const ENTETES_CLIENTS = [
  'code_client', 'type_client', 'raison_sociale', 'categorie', 'statut',
  'sigle', 'secteur', 'nom_groupe', 'adresse', 'wilaya', 'commune',
  'tel_mobile', 'email', 'nif', 'nis', 'rc', 'mode_reglement_prefere',
  'plafond_credit_centimes',
]

const ENTETES_PRODUITS = [
  'code_produit', 'libelle', 'famille_id', 'sous_famille_id', 'unite',
  'pu_reference_centimes', 'type_tarification',
]

const CORRESPONDANCES_PAR_DEFAUT: Record<TypeImport, string[]> = {
  CLIENTS: ENTETES_CLIENTS,
  PRODUITS: ENTETES_PRODUITS,
}

const validerLignesImport = (lignes: LigneExcel[], type: TypeImport): LigneImportee[] => {
  const valider = type === 'CLIENTS' ? validerLigneClient : validerLigneProduit

  return lignes.map((ligne) => {
    const resultat = valider(ligne.valeurs)
    return {
      donnees: ligne.valeurs,
      valide: resultat.valide,
      erreurs: resultat.erreurs,
    }
  })
}

const verifierCheminFichier = (chemin: unknown): string => {
  if (typeof chemin !== 'string' || chemin.trim() === '') {
    throw new TypeError('« chemin » doit être une chaîne non vide.')
  }
  return chemin.trim()
}

const verifierDefinitionImport = (definition: unknown): DefinitionImport => {
  if (definition === null || typeof definition !== 'object') {
    throw new TypeError('« definition » doit être un objet DefinitionImport.')
  }
  const source = definition as Record<string, unknown>
  if (source.type !== 'CLIENTS' && source.type !== 'PRODUITS') {
    throw new TypeError('« definition.type » doit être « CLIENTS » ou « PRODUITS ».')
  }

  let correspondances: Map<string, string>
  if (source.correspondances instanceof Map) {
    correspondances = source.correspondances as Map<string, string>
  } else if (source.correspondances !== null && typeof source.correspondances === 'object') {
    correspondances = new Map(Object.entries(source.correspondances as Record<string, string>))
  } else {
    const entetes = CORRESPONDANCES_PAR_DEFAUT[source.type as TypeImport]
    correspondances = new Map(entetes.map((e) => [e, e]))
  }

  return { type: source.type as TypeImport, correspondances }
}

const creerFnParType = (type: TypeImport): ((base: Base, donnees: Record<string, unknown>) => number) => {
  if (type === 'CLIENTS') {
    return (base, donnees) => creerClient(base, donnees as unknown as Parameters<typeof creerClient>[1])
  }
  return (base, donnees) => creerProduit(base, donnees as unknown as Parameters<typeof creerProduit>[1])
}

export const enregistrerHandlersImport = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.import.lireFichier, async (_evenement, chemin) => {
    const cheminValide = verifierCheminFichier(chemin)
    return lireExcel(cheminValide)
  })

  enregistreur.handle(CANAUX.import.validerLignes, (_evenement, lignes, type) => {
    if (!Array.isArray(lignes)) {
      throw new TypeError('« lignes » doit être un tableau.')
    }
    if (type !== 'CLIENTS' && type !== 'PRODUITS') {
      throw new TypeError('« type » doit être « CLIENTS » ou « PRODUITS ».')
    }
    return validerLignesImport(lignes as LigneExcel[], type as TypeImport)
  })

  enregistreur.handle(CANAUX.import.executer, (_evenement, definition, lignes) => {
    const defValide = verifierDefinitionImport(definition)
    if (!Array.isArray(lignes)) {
      throw new TypeError('« lignes » doit être un tableau.')
    }
    const base = obtenirBase()
    const creerFn = creerFnParType(defValide.type)
    return executerImport(base, defValide, lignes as LigneExcel[], creerFn)
  })
}
