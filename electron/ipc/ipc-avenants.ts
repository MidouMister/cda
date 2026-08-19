import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerAvenant,
  listerAvenantsParAffaire,
  modifierStatutAvenant,
  supprimerLogiquementAvenant,
  creerAvenantPoste,
  listerAvenantsPostes,
} from '../depots/depot-avenants'
import type { AvenantDepot, DonneesAvenantDepot, AvenantPosteDepot, DonneesAvenantPosteDepot } from '../depots/depot-avenants'
import type { AvenantVue, AvenantPosteVue, DonneesCreationAvenant, DonneesCreationAvenantPoste } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const mapperAvenantEnVue = (avenant: AvenantDepot): AvenantVue => ({
  id: avenant.id,
  statut: avenant.statut,
  numero: avenant.numero,
  affaireId: avenant.affaire_id,
  objet: avenant.objet,
  dateAvenant: avenant.date_avenant,
  impactDelaiJours: avenant.impact_delai_jours,
  impactMontantHtCentimes: avenant.impact_montant_ht_centimes,
  dateCreation: avenant.cree_le,
  dateModification: avenant.modifie_le,
})

const mapperAvenantPosteEnVue = (poste: AvenantPosteDepot): AvenantPosteVue => ({
  id: poste.id,
  avenantId: poste.avenant_id,
  action: poste.action,
  posteDqeId: poste.poste_dqe_id,
  designation: poste.designation,
  unite: poste.unite,
  quantiteMilliemes: poste.quantite_milliemes,
  puHtCentimes: poste.pu_ht_centimes,
})

const mapperDonneesCreationVersDepot = (donnees: DonneesCreationAvenant, affaireId: number): DonneesAvenantDepot => ({
  statut: 'BROUILLON',
  numero: '',
  affaire_id: affaireId,
  objet: donnees.objet,
  date_avenant: donnees.dateAvenant,
})

const mapperDonneesCreationPosteVersDepot = (
  avenantId: number,
  donnees: DonneesCreationAvenantPoste,
): DonneesAvenantPosteDepot => ({
  avenant_id: avenantId,
  action: donnees.action,
  poste_dqe_id: donnees.posteDqeId,
  designation: donnees.designation,
  unite: donnees.unite,
  quantite_milliemes: donnees.quantiteMilliemes,
  pu_ht_centimes: donnees.puHtCentimes,
})

const verifierDonneesCreation = (donnees: unknown): DonneesCreationAvenant => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création d\'avenant.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.affaireId !== 'number' || !Number.isSafeInteger(source.affaireId) || source.affaireId < 1) {
    throw new TypeError('« affaireId » doit être un entier strictement positif.')
  }
  return donnees as DonneesCreationAvenant
}

const verifierDonneesCreationPoste = (donnees: unknown): DonneesCreationAvenantPoste => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de poste d\'avenant.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.action !== 'string' || source.action.trim() === '') {
    throw new TypeError('« action » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationAvenantPoste
}

export const enregistrerHandlersAvenants = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.avenants.listerParAffaire, (_evenement, affaireId) => {
    if (typeof affaireId !== 'number' || !Number.isSafeInteger(affaireId) || affaireId < 1) {
      throw new TypeError('« affaireId » doit être un entier strictement positif.')
    }
    return listerAvenantsParAffaire(obtenirBase(), affaireId).map(mapperAvenantEnVue)
  })
  enregistreur.handle(CANAUX.avenants.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreation(donnees)
    return { id: creerAvenant(obtenirBase(), mapperDonneesCreationVersDepot(validees, validees.affaireId)) }
  })
  enregistreur.handle(CANAUX.avenants.modifierStatut, (_evenement, id, statut) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    if (typeof statut !== 'string' || statut.trim() === '') {
      throw new TypeError('« statut » doit être une chaîne non vide.')
    }
    return modifierStatutAvenant(obtenirBase(), id, statut)
  })
  enregistreur.handle(CANAUX.avenants.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementAvenant(obtenirBase(), id)
  })
  enregistreur.handle(CANAUX.avenants.creerPoste, (_evenement, avenantId, donnees) => {
    if (typeof avenantId !== 'number' || !Number.isSafeInteger(avenantId) || avenantId < 1) {
      throw new TypeError('« avenantId » doit être un entier strictement positif.')
    }
    const validees = verifierDonneesCreationPoste(donnees)
    return { id: creerAvenantPoste(obtenirBase(), mapperDonneesCreationPosteVersDepot(avenantId, validees)) }
  })
  enregistreur.handle(CANAUX.avenants.listerPostes, (_evenement, avenantId) => {
    if (typeof avenantId !== 'number' || !Number.isSafeInteger(avenantId) || avenantId < 1) {
      throw new TypeError('« avenantId » doit être un entier strictement positif.')
    }
    return listerAvenantsPostes(obtenirBase(), avenantId).map(mapperAvenantPosteEnVue)
  })
}
