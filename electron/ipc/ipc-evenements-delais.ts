import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerEvenementDelai,
  listerEvenementsDelaiParAffaire,
  supprimerLogiquementEvenementDelai,
} from '../depots/depot-evenements-delais'
import type { EvenementDepot, DonneesEvenementDepot } from '../depots/depot-evenements-delais'
import type { EvenementDelaiVue, DonneesCreationEvenementDelai } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const mapperEvenementEnVue = (evenement: EvenementDepot): EvenementDelaiVue => ({
  id: evenement.id,
  affaireId: evenement.affaire_id,
  typeEvenement: evenement.type_evenement,
  dateDebut: evenement.date_debut,
  dateFin: evenement.date_fin,
  dureeJours: evenement.duree_jours,
  motif: evenement.motif,
  impactDelaiJours: evenement.impact_delai_jours,
  dateCreation: evenement.cree_le,
})

const mapperDonneesCreationVersDepot = (
  donnees: DonneesCreationEvenementDelai,
  affaireId: number,
): DonneesEvenementDepot => ({
  affaire_id: affaireId,
  type_evenement: donnees.typeEvenement,
  date_debut: donnees.dateDebut,
  date_fin: donnees.dateFin,
  duree_jours: donnees.dureeJours,
  motif: donnees.motif,
  impact_delai_jours: donnees.impactDelaiJours,
})

const verifierDonneesCreation = (donnees: unknown): DonneesCreationEvenementDelai => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création d\'événement de délai.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.affaireId !== 'number' || !Number.isSafeInteger(source.affaireId) || source.affaireId < 1) {
    throw new TypeError('« affaireId » doit être un entier strictement positif.')
  }
  if (typeof source.typeEvenement !== 'string' || source.typeEvenement.trim() === '') {
    throw new TypeError('« typeEvenement » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationEvenementDelai
}

export const enregistrerHandlersEvenementsDelais = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.evenementsDelais.listerParAffaire, (_evenement, affaireId) => {
    if (typeof affaireId !== 'number' || !Number.isSafeInteger(affaireId) || affaireId < 1) {
      throw new TypeError('« affaireId » doit être un entier strictement positif.')
    }
    return listerEvenementsDelaiParAffaire(obtenirBase(), affaireId).map(mapperEvenementEnVue)
  })
  enregistreur.handle(CANAUX.evenementsDelais.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreation(donnees)
    return { id: creerEvenementDelai(obtenirBase(), mapperDonneesCreationVersDepot(validees, validees.affaireId)) }
  })
  enregistreur.handle(CANAUX.evenementsDelais.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementEvenementDelai(obtenirBase(), id)
  })
}
