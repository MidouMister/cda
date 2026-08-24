import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerBonLivraisonEmis,
  listerBonsLivraison,
  lireBonLivraisonParId,
  modifierBonLivraison,
  supprimerLogiquementBonLivraison,
  creerLigneBonLivraison,
  listerLignesBonLivraison,
  modifierLigneBonLivraison,
  supprimerLigneBonLivraison,
  genererFactureDepuisBons,
} from '../depots/depot-bons-livraison'
import type {
  BonLivraisonDepot,
  DonneesCreationBonLivraisonDepot,
  DonneesCreationBonLivraisonEmisDepot,
  LigneBonLivraisonDepot,
  DonneesCreationLigneBonLivraisonDepot,
} from '../depots/depot-bons-livraison'
import type {
  BonLivraisonVue,
  LigneBonLivraisonVue,
  DonneesCreationBonLivraison,
  DonneesCreationLigneBonLivraison,
  StatutBonLivraisonVue,
} from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperBonLivraisonEnVue = (bl: BonLivraisonDepot): BonLivraisonVue => ({
  id: bl.id,
  statut: bl.statut as StatutBonLivraisonVue,
  numeroBl: bl.numero_bl,
  dateLivraison: bl.date_livraison,
  affaireId: bl.affaire_id,
  clientId: bl.client_id,
  poidsPeseeKg: bl.poids_pesee_kg,
  signatureClient: bl.signature_client,
  factureId: bl.facture_id,
  exerciceId: bl.exercice_id,
  dateCreation: bl.cree_le,
  dateModification: bl.modifie_le,
})

const mapperLigneEnVue = (ligne: LigneBonLivraisonDepot): LigneBonLivraisonVue => ({
  id: ligne.id,
  bonLivraisonId: ligne.bon_livraison_id,
  produitId: ligne.produit_id,
  designation: ligne.designation,
  unite: ligne.unite ?? 'U',
  quantiteMilliemes: ligne.quantite_milliemes,
  puHtCentimes: ligne.pu_ht_centimes,
  montantHtCentimes: ligne.montant_ht_centimes,
})

const mapperDonneesCreationBLEmis = (
  donnees: DonneesCreationBonLivraison,
): DonneesCreationBonLivraisonEmisDepot => ({
  date_livraison: donnees.dateLivraison,
  affaire_id: donnees.affaireId ?? null,
  client_id: donnees.clientId,
  poids_pesee_kg: donnees.poidsPeseeKg ?? null,
  signature_client: donnees.signatureClient,
})

const mapperDonneesCreationLigneBL = (
  blId: number,
  donnees: DonneesCreationLigneBonLivraison,
): DonneesCreationLigneBonLivraisonDepot => ({
  bon_livraison_id: blId,
  designation: donnees.designation,
  unite: donnees.unite,
  quantite_milliemes: donnees.quantiteMilliemes,
  pu_ht_centimes: donnees.puHtCentimes,
  produit_id: donnees.produitId,
})

const verifierId = (id: unknown): number => {
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new TypeError('« id » doit être un entier strictement positif.')
  }
  return id
}

const verifierDonneesCreationBL = (donnees: unknown): DonneesCreationBonLivraison => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de bon de livraison.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  if (typeof source.dateLivraison !== 'string' || source.dateLivraison.trim() === '') {
    throw new TypeError('« dateLivraison » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationBonLivraison
}

const verifierDonneesCreationLigneBL = (donnees: unknown): DonneesCreationLigneBonLivraison => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de ligne de bon de livraison.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.designation !== 'string' || source.designation.trim() === '') {
    throw new TypeError('« designation » doit être une chaîne non vide.')
  }
  if (typeof source.unite !== 'string' || source.unite.trim() === '') {
    throw new TypeError('« unite » doit être une chaîne non vide.')
  }
  if (source.quantiteMilliemes !== undefined && typeof source.quantiteMilliemes !== 'number') {
    throw new TypeError('« quantiteMilliemes » doit être un nombre.')
  }
  if (source.puHtCentimes !== undefined && typeof source.puHtCentimes !== 'number') {
    throw new TypeError('« puHtCentimes » doit être un nombre.')
  }
  return donnees as DonneesCreationLigneBonLivraison
}

const verifierDonneesGenererFacture = (donnees: unknown): {
  blIds: number[]
  clientId: number
  affaireId?: number
  dateFacture: string
  dateEcheance?: string
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  marchePublic: boolean
  modeReglementPrevu?: string
} => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de génération de facture depuis bons de livraison.')
  }
  const source = donnees as Record<string, unknown>
  if (!Array.isArray(source.blIds) || source.blIds.length === 0) {
    throw new TypeError('« blIds » doit être un tableau non vide d\'entiers positifs.')
  }
  for (const item of source.blIds) {
    if (typeof item !== 'number' || !Number.isSafeInteger(item) || item < 1) {
      throw new TypeError('Chaque identifiant de « blIds » doit être un entier strictement positif.')
    }
  }
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  if (typeof source.dateFacture !== 'string' || source.dateFacture.trim() === '') {
    throw new TypeError('« dateFacture » doit être une chaîne non vide.')
  }
  if (typeof source.retenueGarantieBps !== 'number') {
    throw new TypeError('« retenueGarantieBps » doit être un nombre.')
  }
  if (typeof source.remboursementAvanceCentimes !== 'number') {
    throw new TypeError('« remboursementAvanceCentimes » doit être un nombre.')
  }
  if (typeof source.marchePublic !== 'boolean') {
    throw new TypeError('« marchePublic » doit être un booléen.')
  }
  return donnees as {
    blIds: number[]
    clientId: number
    affaireId?: number
    dateFacture: string
    dateEcheance?: string
    retenueGarantieBps: number
    remboursementAvanceCentimes: number
    marchePublic: boolean
    modeReglementPrevu?: string
  }
}

export const enregistrerHandlersBonsLivraison = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.bonsLivraison.lister, (_evenement, filtres) => {
    const f = filtres as { statut?: string; clientId?: number; affaireId?: number } | undefined
    return listerBonsLivraison(obtenirBase(), f).map(mapperBonLivraisonEnVue)
  })

  enregistreur.handle(CANAUX.bonsLivraison.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationBL(donnees)
    return { id: creerBonLivraisonEmis(obtenirBase(), mapperDonneesCreationBLEmis(validees)) }
  })

  enregistreur.handle(CANAUX.bonsLivraison.lire, (_evenement, id) => {
    const valideId = verifierId(id)
    const bl = lireBonLivraisonParId(obtenirBase(), valideId)
    return bl === null ? null : mapperBonLivraisonEnVue(bl)
  })

  enregistreur.handle(CANAUX.bonsLivraison.modifier, (_evenement, id, donnees) => {
    const valideId = verifierId(id)
    return modifierBonLivraison(obtenirBase(), valideId, donnees as Partial<DonneesCreationBonLivraisonDepot>)
  })

  enregistreur.handle(CANAUX.bonsLivraison.supprimer, (_evenement, id) => {
    const valideId = verifierId(id)
    return supprimerLogiquementBonLivraison(obtenirBase(), valideId)
  })

  enregistreur.handle(CANAUX.bonsLivraison.listerLignes, (_evenement, blId) => {
    const valideId = verifierId(blId)
    return listerLignesBonLivraison(obtenirBase(), valideId).map(mapperLigneEnVue)
  })

  enregistreur.handle(CANAUX.bonsLivraison.creerLigne, (_evenement, donnees) => {
    const source = donnees as DonneesCreationLigneBonLivraison & { blId: number }
    const valideId = verifierId(source?.blId)
    const validees = verifierDonneesCreationLigneBL(donnees)
    return { id: creerLigneBonLivraison(obtenirBase(), mapperDonneesCreationLigneBL(valideId, validees)) }
  })

  enregistreur.handle(CANAUX.bonsLivraison.modifierLigne, (_evenement, id, donnees) => {
    const valideId = verifierId(id)
    return modifierLigneBonLivraison(
      obtenirBase(),
      valideId,
      donnees as Partial<DonneesCreationLigneBonLivraisonDepot>,
    )
  })

  enregistreur.handle(CANAUX.bonsLivraison.supprimerLigne, (_evenement, id) => {
    const valideId = verifierId(id)
    return supprimerLigneBonLivraison(obtenirBase(), valideId)
  })

  enregistreur.handle(CANAUX.bonsLivraison.genererFacture, (_evenement, donnees) => {
    const validees = verifierDonneesGenererFacture(donnees)
    return { factureId: genererFactureDepuisBons(obtenirBase(), validees) }
  })
}
