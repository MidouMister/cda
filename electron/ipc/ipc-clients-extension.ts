import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { lireClientParId } from '../depots/depot-clients'
import {
  creerContact,
  listerContactsParClient,
  modifierContact,
  supprimerLogiquementContact,
  type Contact,
  type DonneesCreationContact,
} from '../depots/depot-contacts'
import {
  creerInteraction,
  listerInteractionsParClient,
  supprimerLogiquementInteraction,
  TYPES_INTERACTION,
  type Interaction,
  type DonneesCreationInteraction,
  type TypeInteraction,
} from '../depots/depot-interactions'
import { calculerScoreClient } from '../../domaine/score'
import type {
  ContactVue,
  DonneesCreationContactVue,
  DonneesCreationInteractionVue,
  InteractionVue,
  ResultatScoreVue,
} from '../../contrats/clients-extension'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const TYPES_INTERACTION_SET = new Set<string>(TYPES_INTERACTION)

export const mapperContactEnVue = (contact: Contact): ContactVue => ({
  id: contact.id,
  clientId: contact.client_id,
  nom: contact.nom,
  fonction: contact.fonction,
  telephone: contact.telephone,
  email: contact.email,
  contactPrincipal: contact.contact_principal,
})

export const mapperInteractionEnVue = (interaction: Interaction): InteractionVue => ({
  id: interaction.id,
  clientId: interaction.client_id,
  dateInteraction: interaction.date_interaction,
  typeInteraction: interaction.type_interaction,
  note: interaction.note,
})

export const mapperDonneesCreationContactVersDepot = (
  donnees: DonneesCreationContactVue,
): DonneesCreationContact => ({
  client_id: donnees.clientId,
  nom: donnees.nom,
  fonction: donnees.fonction,
  telephone: donnees.telephone,
  email: donnees.email,
  contact_principal: donnees.contactPrincipal as 0 | 1 | undefined,
})

export const mapperDonneesCreationInteractionVersDepot = (
  donnees: DonneesCreationInteractionVue,
): DonneesCreationInteraction => ({
  client_id: donnees.clientId,
  date_interaction: donnees.dateInteraction,
  type_interaction: donnees.typeInteraction as TypeInteraction,
  note: donnees.note,
})

const verifierDonneesCreationContact = (donnees: unknown): DonneesCreationContactVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de contact.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  if (typeof source.nom !== 'string' || source.nom.trim() === '') {
    throw new TypeError('« nom » doit être une chaîne non vide.')
  }
  if (source.fonction !== undefined && source.fonction !== null && typeof source.fonction !== 'string') {
    throw new TypeError('« fonction » doit être une chaîne.')
  }
  if (source.telephone !== undefined && source.telephone !== null && typeof source.telephone !== 'string') {
    throw new TypeError('« telephone » doit être une chaîne.')
  }
  if (source.email !== undefined && source.email !== null && typeof source.email !== 'string') {
    throw new TypeError('« email » doit être une chaîne.')
  }
  if (source.contactPrincipal !== undefined && source.contactPrincipal !== null) {
    if (typeof source.contactPrincipal !== 'number' || (source.contactPrincipal !== 0 && source.contactPrincipal !== 1)) {
      throw new TypeError('« contactPrincipal » doit être 0 ou 1.')
    }
  }
  return donnees as DonneesCreationContactVue
}

const verifierDonneesCreationInteraction = (donnees: unknown): DonneesCreationInteractionVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création d\'interaction.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  if (typeof source.dateInteraction !== 'string' || source.dateInteraction.trim() === '') {
    throw new TypeError('« dateInteraction » doit être une chaîne non vide.')
  }
  if (typeof source.typeInteraction !== 'string' || !TYPES_INTERACTION_SET.has(source.typeInteraction)) {
    throw new Error(
      `« typeInteraction » : valeur inconnue « ${String(source.typeInteraction)} » (attendu parmi : ${TYPES_INTERACTION.join(', ')}).`,
    )
  }
  if (source.note !== undefined && source.note !== null && typeof source.note !== 'string') {
    throw new TypeError('« note » doit être une chaîne.')
  }
  return donnees as DonneesCreationInteractionVue
}

export const enregistrerHandlersClientsExtension = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.clients.creerContact, (_evenement, donnees) => {
    const validees = verifierDonneesCreationContact(donnees)
    const depot = mapperDonneesCreationContactVersDepot(validees)
    const base = obtenirBase()
    const clientExiste = lireClientParId(base, depot.client_id)
    if (clientExiste === null) {
      throw new Error('Client introuvable ou supprimé.')
    }
    return { id: creerContact(base, depot) }
  })

  enregistreur.handle(CANAUX.clients.listerContacts, (_evenement, clientId) => {
    if (typeof clientId !== 'number' || !Number.isSafeInteger(clientId) || clientId < 1) {
      throw new TypeError('« clientId » doit être un entier strictement positif.')
    }
    return listerContactsParClient(obtenirBase(), clientId).map(mapperContactEnVue)
  })

  enregistreur.handle(CANAUX.clients.modifierContact, (_evenement, id, donnees) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    if (donnees !== undefined && donnees !== null) {
      const source = donnees as Record<string, unknown>
      if (source.nom !== undefined && (typeof source.nom !== 'string' || (source.nom as string).trim() === '')) {
        throw new TypeError('« nom » doit être une chaîne non vide.')
      }
    }
    return modifierContact(obtenirBase(), id, donnees as Partial<DonneesCreationContact>)
  })

  enregistreur.handle(CANAUX.clients.supprimerContact, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementContact(obtenirBase(), id)
  })

  enregistreur.handle(CANAUX.clients.creerInteraction, (_evenement, donnees) => {
    const validees = verifierDonneesCreationInteraction(donnees)
    const depot = mapperDonneesCreationInteractionVersDepot(validees)
    const base = obtenirBase()
    const clientExiste = lireClientParId(base, depot.client_id)
    if (clientExiste === null) {
      throw new Error('Client introuvable ou supprimé.')
    }
    return { id: creerInteraction(base, depot) }
  })

  enregistreur.handle(CANAUX.clients.listerInteractions, (_evenement, clientId) => {
    if (typeof clientId !== 'number' || !Number.isSafeInteger(clientId) || clientId < 1) {
      throw new TypeError('« clientId » doit être un entier strictement positif.')
    }
    return listerInteractionsParClient(obtenirBase(), clientId).map(mapperInteractionEnVue)
  })

  enregistreur.handle(CANAUX.clients.supprimerInteraction, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementInteraction(obtenirBase(), id)
  })

  enregistreur.handle(CANAUX.clients.calculerScore, (_evenement, clientId) => {
    if (typeof clientId !== 'number' || !Number.isSafeInteger(clientId) || clientId < 1) {
      throw new TypeError('« clientId » doit être un entier strictement positif.')
    }
    const base = obtenirBase()
    const client = lireClientParId(base, clientId)
    if (client === null) {
      throw new Error('Client introuvable ou supprimé.')
    }
    const resultat = calculerScoreClient({
      delaiMoyenPaiementJours: client.delai_paiement_jours ?? 0,
      caAnnuelTtcCentimes: 0,
      nombreAffairesAnnee: 0,
      nombreFacturesEnRetard12Mois: 0,
      creanceImpayeeEcheancePlus90Jours: false,
      contentieuxDeclare: client.contentieux_declare === 1,
      estGroupeOuGitra: client.client_groupe === 1,
    })
    base
      .prepare(
        `UPDATE clients
            SET score_client = ?, derniere_evaluation_score_le = datetime('now'), modifie_le = datetime('now')
          WHERE id = ?`,
      )
      .run(resultat.score, clientId)
    const score: ResultatScoreVue = { score: resultat.score, motif: resultat.motif }
    return score
  })
}
