import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { creerAffaire, listerAffaires, lireAffaireParId, modifierAffaire, supprimerLogiquementAffaire } from '../depots/depot-affaires'
import type { AffaireDepot, DonneesAffaireDepot } from '../depots/depot-affaires'
import type { AffaireVue, DonneesCreationAffaire } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperAffaireEnVue = (affaire: AffaireDepot): AffaireVue => ({
  id: affaire.id,
  statut: affaire.statut,
  reference: affaire.reference,
  typeAffaire: affaire.type_affaire,
  affaireMereId: affaire.affaire_mere_id,
  clientId: affaire.client_id,
  objet: affaire.objet,
  montantInitialHtCentimes: affaire.montant_initial_ht_centimes,
  tauxTvaBps: affaire.taux_tva_bps,
  dateSignature: affaire.date_signature,
  dateNotification: affaire.date_notification,
  numeroOds: affaire.numero_ods,
  dateOds: affaire.date_ods,
  dateDemarrageEffectif: affaire.date_demarrage_effectif,
  delaiExecutionJours: affaire.delai_execution_jours,
  dateFinContractuelle: affaire.date_fin_contractuelle,
  dateFinRevisee: affaire.date_fin_revisee,
  dateFinReelle: affaire.date_fin_reelle,
  motifDepassement: affaire.motif_depassement,
  rabaisGlobalBps: affaire.rabais_global_bps,
  rabaisMarcheBps: affaire.rabais_marche_bps,
  responsable: affaire.responsable,
  numeroMarche: affaire.numero_marche,
  serviceContractant: affaire.service_contractant,
  typeProcedure: affaire.type_procedure,
  avanceForfaitaireBps: affaire.avance_forfaitaire_bps,
  avanceApprovisionnementBps: affaire.avance_approvisionnement_bps,
  retenueGarantieBps: affaire.retenue_garantie_bps,
  delaiGarantieMois: affaire.delai_garantie_mois,
  typeRevision: affaire.type_revision,
  formuleRevision: affaire.formule_revision,
  penaliteRetardTauxBps: affaire.penalite_retard_taux_bps,
  penaliteRetardBaseCentimes: affaire.penalite_retard_base_centimes,
  penaliteRetardPlafondBps: affaire.penalite_retard_plafond_bps,
  dateDecompteProvisoire: affaire.date_decompte_provisoire,
  dateDecompteDefinitif: affaire.date_decompte_definitif,
  numeroContrat: affaire.numero_contrat,
  modalitesPaiement: affaire.modalites_paiement,
  avanceContractuelleCentimes: affaire.avance_contractuelle_centimes,
  motifResiliation: affaire.motif_resiliation,
  dateResiliation: affaire.date_resiliation,
  decompteResiliationCentimes: affaire.decompte_resiliation_centimes,
  sortCautions: affaire.sort_cautions,
  sortRetenueGarantie: affaire.sort_retenue_garantie,
  dateCreation: affaire.cree_le,
  dateModification: affaire.modifie_le,
})

export const mapperDonneesCreationVersDepot = (donnees: DonneesCreationAffaire): DonneesAffaireDepot => ({
  statut: 'BROUILLON',
  reference: donnees.reference,
  type_affaire: donnees.typeAffaire,
  client_id: donnees.clientId,
  affaire_mere_id: donnees.affaireMereId,
  objet: donnees.objet,
  montant_initial_ht_centimes: donnees.montantInitialHtCentimes,
  taux_tva_bps: donnees.tauxTvaBps,
  date_signature: donnees.dateSignature,
  date_notification: donnees.dateNotification,
  numero_ods: donnees.numeroOds,
  date_ods: donnees.dateOds,
  date_demarrage_effectif: donnees.dateDemarrageEffectif,
  delai_execution_jours: donnees.delaiExecutionJours,
  date_fin_contractuelle: donnees.dateFinContractuelle,
  rabais_global_bps: donnees.rabaisGlobalBps,
  rabais_marche_bps: donnees.rabaisMarcheBps,
  responsable: donnees.responsable,
  numero_marche: donnees.numeroMarche,
  service_contractant: donnees.serviceContractant,
  type_procedure: donnees.typeProcedure,
  retenue_garantie_bps: donnees.retenueGarantieBps,
  delai_garantie_mois: donnees.delaiGarantieMois,
})

const verifierDonneesCreation = (donnees: unknown): DonneesCreationAffaire => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création d\'affaire.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.reference !== 'string' || source.reference.trim() === '') {
    throw new TypeError('« reference » doit être une chaîne non vide.')
  }
  if (typeof source.typeAffaire !== 'string' || source.typeAffaire.trim() === '') {
    throw new TypeError('« typeAffaire » doit être une chaîne non vide.')
  }
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  return donnees as DonneesCreationAffaire
}

export const enregistrerHandlersAffaires = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.affaires.lister, () =>
    listerAffaires(obtenirBase()).map(mapperAffaireEnVue),
  )
  enregistreur.handle(CANAUX.affaires.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreation(donnees)
    return { id: creerAffaire(obtenirBase(), mapperDonneesCreationVersDepot(validees)) }
  })
  enregistreur.handle(CANAUX.affaires.lire, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    const affaire = lireAffaireParId(obtenirBase(), id)
    return affaire === null ? null : mapperAffaireEnVue(affaire)
  })
  enregistreur.handle(CANAUX.affaires.modifier, (_evenement, id, donnees) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return modifierAffaire(obtenirBase(), id, donnees as Partial<DonneesAffaireDepot>)
  })
  enregistreur.handle(CANAUX.affaires.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementAffaire(obtenirBase(), id)
  })
}
