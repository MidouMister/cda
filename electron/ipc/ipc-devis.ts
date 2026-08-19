import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerDevis,
  listerDevis,
  lireDevisParId,
  modifierDevis,
  supprimerLogiquementDevis,
  creerLigneDevis,
  listerLignesDevis,
  supprimerLogiquementLigneDevis,
} from '../depots/depot-devis'
import type { DevisDepot, DonneesDevisDepot, LigneDevisDepot, DonneesLigneDevisDepot } from '../depots/depot-devis'
import type { DevisVue, LigneDevisVue, DonneesCreationDevis, DonneesCreationLigneDevis } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const mapperDevisEnVue = (devis: DevisDepot): DevisVue => ({
  id: devis.id,
  statut: devis.statut,
  numeroDevis: devis.numero_devis,
  clientId: devis.client_id,
  dateDevis: devis.date_devis,
  dateValidite: devis.date_validite,
  rabaisGlobalBps: devis.rabais_global_bps,
  affaireId: devis.affaire_id,
  exerciceId: devis.exercice_id,
  dateCreation: devis.cree_le,
  dateModification: devis.modifie_le,
})

const mapperLigneEnVue = (ligne: LigneDevisDepot): LigneDevisVue => ({
  id: ligne.id,
  devisId: ligne.devis_id,
  produitId: ligne.produit_id,
  designation: ligne.designation,
  unite: ligne.unite,
  quantiteMilliemes: ligne.quantite_milliemes,
  puHtCentimes: ligne.pu_ht_centimes,
  montantHtCentimes: ligne.montant_ht_centimes,
  familleId: ligne.famille_id,
  sousFamilleId: ligne.sous_famille_id,
})

const mapperDonneesCreationVersDepot = (donnees: DonneesCreationDevis): DonneesDevisDepot => ({
  statut: 'BROUILLON',
  numero_devis: '',
  client_id: donnees.clientId,
  date_devis: donnees.dateDevis,
  date_validite: donnees.dateValidite,
  rabais_global_bps: donnees.rabaisGlobalBps,
  exercice_id: donnees.exerciceId,
})

const mapperDonneesCreationLigneVersDepot = (
  devisId: number,
  donnees: DonneesCreationLigneDevis,
): DonneesLigneDevisDepot => ({
  devis_id: devisId,
  designation: donnees.designation,
  produit_id: donnees.produitId,
  unite: donnees.unite,
  quantite_milliemes: donnees.quantiteMilliemes,
  pu_ht_centimes: donnees.puHtCentimes,
  famille_id: donnees.familleId,
  sous_famille_id: donnees.sousFamilleId,
})

const verifierDonneesCreation = (donnees: unknown): DonneesCreationDevis => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de devis.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  if (typeof source.dateDevis !== 'string' || source.dateDevis.trim() === '') {
    throw new TypeError('« dateDevis » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationDevis
}

const verifierDonneesCreationLigne = (donnees: unknown): DonneesCreationLigneDevis => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de ligne de devis.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.designation !== 'string' || source.designation.trim() === '') {
    throw new TypeError('« designation » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationLigneDevis
}

export const enregistrerHandlersDevis = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.devis.lister, () =>
    listerDevis(obtenirBase()).map(mapperDevisEnVue),
  )
  enregistreur.handle(CANAUX.devis.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreation(donnees)
    return { id: creerDevis(obtenirBase(), mapperDonneesCreationVersDepot(validees)) }
  })
  enregistreur.handle(CANAUX.devis.lire, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    const devis = lireDevisParId(obtenirBase(), id)
    return devis === null ? null : mapperDevisEnVue(devis)
  })
  enregistreur.handle(CANAUX.devis.modifier, (_evenement, id, donnees) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return modifierDevis(obtenirBase(), id, donnees as Partial<DonneesDevisDepot>)
  })
  enregistreur.handle(CANAUX.devis.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementDevis(obtenirBase(), id)
  })
  enregistreur.handle(CANAUX.devis.creerLigne, (_evenement, devisId, donnees) => {
    if (typeof devisId !== 'number' || !Number.isSafeInteger(devisId) || devisId < 1) {
      throw new TypeError('« devisId » doit être un entier strictement positif.')
    }
    const validees = verifierDonneesCreationLigne(donnees)
    return { id: creerLigneDevis(obtenirBase(), mapperDonneesCreationLigneVersDepot(devisId, validees)) }
  })
  enregistreur.handle(CANAUX.devis.listerLignes, (_evenement, devisId) => {
    if (typeof devisId !== 'number' || !Number.isSafeInteger(devisId) || devisId < 1) {
      throw new TypeError('« devisId » doit être un entier strictement positif.')
    }
    return listerLignesDevis(obtenirBase(), devisId).map(mapperLigneEnVue)
  })
  enregistreur.handle(CANAUX.devis.supprimerLigne, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementLigneDevis(obtenirBase(), id)
  })
}
