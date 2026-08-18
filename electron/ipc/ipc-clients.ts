import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { creerClient, listerClients, lireClientParId, modifierClient, supprimerLogiquementClient } from '../depots/depot-clients'
import type { Client, DonneesClient } from '../depots/depot-clients'
import type { ClientVue, DonneesCreationClient } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperClientEnVue = (client: Client): ClientVue => ({
  id: client.id,
  statut: client.statut,
  codeClient: client.code_client,
  typeClient: client.type_client,
  raisonSociale: client.raison_sociale,
  sigle: client.sigle,
  categorie: client.categorie,
  secteur: client.secteur,
  clientGroupe: client.client_groupe,
  nomGroupe: client.nom_groupe,
  nif: client.nif,
  nis: client.nis,
  modeReglementPrefere: client.mode_reglement_prefere,
  scoreClient: client.score_client,
})

export const mapperDonneesCreationVersDepot = (donnees: DonneesCreationClient): DonneesClient => ({
  code_client: donnees.codeClient,
  type_client: donnees.typeClient,
  raison_sociale: donnees.raisonSociale,
  categorie: donnees.categorie,
  statut: donnees.statut,
  sigle: donnees.sigle,
  secteur: donnees.secteur,
  nom_groupe: donnees.nomGroupe,
  adresse: donnees.adresse,
  wilaya: donnees.wilaya,
  commune: donnees.commune,
  tel_mobile: donnees.telMobile,
  email: donnees.email,
  nif: donnees.nif,
  nis: donnees.nis,
  rc: donnees.rc,
  mode_reglement_prefere: donnees.modeReglementPrefere,
  plafond_credit_centimes: donnees.plafondCreditCentimes,
})

const verifierDonneesCreation = (donnees: unknown): DonneesCreationClient => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de client.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.codeClient !== 'string' || source.codeClient.trim() === '') {
    throw new TypeError('« codeClient » doit être une chaîne non vide.')
  }
  if (typeof source.raisonSociale !== 'string' || source.raisonSociale.trim() === '') {
    throw new TypeError('« raisonSociale » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationClient
}

export const enregistrerHandlersClients = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.clients.lister, () =>
    listerClients(obtenirBase()).map(mapperClientEnVue),
  )
  enregistreur.handle(CANAUX.clients.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreation(donnees)
    return { id: creerClient(obtenirBase(), mapperDonneesCreationVersDepot(validees)) }
  })

  enregistreur.handle(CANAUX.clients.lire, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    const client = lireClientParId(obtenirBase(), id)
    return client === null ? null : mapperClientEnVue(client)
  })

  enregistreur.handle(CANAUX.clients.modifier, (_evenement, id, donnees) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    if (donnees !== undefined && donnees !== null) {
      const source = donnees as Record<string, unknown>
      if (source.codeClient !== undefined && (typeof source.codeClient !== 'string' || (source.codeClient as string).trim() === '')) {
        throw new TypeError('« codeClient » doit être une chaîne non vide.')
      }
      if (source.raisonSociale !== undefined && (typeof source.raisonSociale !== 'string' || (source.raisonSociale as string).trim() === '')) {
        throw new TypeError('« raisonSociale » doit être une chaîne non vide.')
      }
    }
    return modifierClient(obtenirBase(), id, donnees as Partial<DonneesClient>)
  })

  enregistreur.handle(CANAUX.clients.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementClient(obtenirBase(), id)
  })
}
