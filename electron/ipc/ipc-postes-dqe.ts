import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerPosteDqe,
  listerPostesDqeParAffaire,
  modifierPosteDqe,
  supprimerLogiquementPosteDqe,
} from '../depots/depot-postes-dqe'
import type { PosteDqeDepot, DonneesPosteDqeDepot } from '../depots/depot-postes-dqe'
import type { PosteDqeVue, DonneesCreationPosteDqe } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const mapperPosteEnVue = (poste: PosteDqeDepot): PosteDqeVue => ({
  id: poste.id,
  affaireId: poste.affaire_id,
  numero: poste.numero,
  designation: poste.designation,
  unite: poste.unite,
  quantiteMilliemes: poste.quantite_milliemes,
  puHtCentimes: poste.pu_ht_centimes,
  montantHtCentimes: poste.montant_ht_centimes,
  familleId: poste.famille_id,
  sousFamilleId: poste.sous_famille_id,
  classification: poste.classification,
  origine: poste.origine,
  ligneDevisId: poste.ligne_devis_id,
  dateCreation: poste.cree_le,
  dateModification: poste.modifie_le,
})

const mapperDonneesCreationVersDepot = (donnees: DonneesCreationPosteDqe): DonneesPosteDqeDepot => ({
  affaire_id: donnees.affaireId,
  numero: donnees.numero,
  designation: donnees.designation,
  unite: donnees.unite,
  quantite_milliemes: donnees.quantiteMilliemes,
  pu_ht_centimes: donnees.puHtCentimes,
  famille_id: donnees.familleId,
  sous_famille_id: donnees.sousFamilleId,
  classification: donnees.classification,
  origine: donnees.origine,
  ligne_devis_id: donnees.ligneDevisId,
})

const verifierDonneesCreation = (donnees: unknown): DonneesCreationPosteDqe => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de poste DQE.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.affaireId !== 'number' || !Number.isSafeInteger(source.affaireId) || source.affaireId < 1) {
    throw new TypeError('« affaireId » doit être un entier strictement positif.')
  }
  if (typeof source.designation !== 'string' || source.designation.trim() === '') {
    throw new TypeError('« designation » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationPosteDqe
}

export const enregistrerHandlersPostesDqe = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.postesDqe.listerParAffaire, (_evenement, affaireId) => {
    if (typeof affaireId !== 'number' || !Number.isSafeInteger(affaireId) || affaireId < 1) {
      throw new TypeError('« affaireId » doit être un entier strictement positif.')
    }
    return listerPostesDqeParAffaire(obtenirBase(), affaireId).map(mapperPosteEnVue)
  })
  enregistreur.handle(CANAUX.postesDqe.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreation(donnees)
    return { id: creerPosteDqe(obtenirBase(), mapperDonneesCreationVersDepot(validees)) }
  })
  enregistreur.handle(CANAUX.postesDqe.modifier, (_evenement, id, donnees) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return modifierPosteDqe(obtenirBase(), id, donnees as Partial<DonneesPosteDqeDepot>)
  })
  enregistreur.handle(CANAUX.postesDqe.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementPosteDqe(obtenirBase(), id)
  })
}
