import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerTarif,
  listerTarifs,
  listerTarifsParAffaire,
  listerTarifsParClient,
  listerTarifsParProduit,
  supprimerLogiquementTarif,
  type DonneesCreationTarif,
  type Tarif,
} from '../depots/depot-tarifs'
import type { DonneesCreationTarifVue, TarifVue } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const TYPES_NIVEAU_VALIDES = new Set(['CATALOGUE', 'CLIENT', 'AFFAIRE'])

export const mapperTarifEnVue = (tarif: Tarif): TarifVue => ({
  id: tarif.id,
  produitId: tarif.produit_id,
  typeNiveau: tarif.type_niveau,
  clientId: tarif.client_id,
  affaireId: tarif.affaire_id,
  prixCentimes: tarif.prix_centimes,
  debutPeriode: tarif.debut_periode,
  finPeriode: tarif.fin_periode,
})

export const mapperDonneesCreationVersDepot = (donnees: DonneesCreationTarifVue): DonneesCreationTarif => ({
  produit_id: donnees.produitId,
  type_niveau: donnees.typeNiveau as DonneesCreationTarif['type_niveau'],
  client_id: donnees.clientId,
  affaire_id: donnees.affaireId,
  prix_centimes: donnees.prixCentimes,
  debut_periode: donnees.debutPeriode,
  fin_periode: donnees.finPeriode,
})

export const verifierDonneesCreationTarif = (donnees: unknown): DonneesCreationTarifVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de tarif.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.produitId !== 'number' || !Number.isSafeInteger(source.produitId) || source.produitId < 1) {
    throw new TypeError('« produitId » doit être un entier strictement positif.')
  }
  if (typeof source.typeNiveau !== 'string' || !TYPES_NIVEAU_VALIDES.has(source.typeNiveau)) {
    throw new Error(
      `« typeNiveau » : valeur inconnue « ${String(source.typeNiveau)} » (attendu parmi : CATALOGUE, CLIENT, AFFAIRE).`,
    )
  }
  if (
    typeof source.prixCentimes !== 'number' ||
    !Number.isSafeInteger(source.prixCentimes) ||
    source.prixCentimes < 1
  ) {
    throw new TypeError('« prixCentimes » doit être un entier strictement positif.')
  }
  if (typeof source.debutPeriode !== 'string' || source.debutPeriode.trim() === '') {
    throw new TypeError('« debutPeriode » doit être une chaîne non vide.')
  }
  const typeNiveau = source.typeNiveau as string
  if (typeNiveau === 'CATALOGUE') {
    if (source.clientId !== undefined && source.clientId !== null) {
      throw new TypeError('« clientId » doit être null pour un tarif de type CATALOGUE.')
    }
    if (source.affaireId !== undefined && source.affaireId !== null) {
      throw new TypeError('« affaireId » doit être null pour un tarif de type CATALOGUE.')
    }
  }
  if (typeNiveau === 'CLIENT') {
    if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
      throw new TypeError('« clientId » doit être un entier strictement positif pour un tarif de type CLIENT.')
    }
    if (source.affaireId !== undefined && source.affaireId !== null) {
      throw new TypeError('« affaireId » doit être null pour un tarif de type CLIENT.')
    }
  }
  if (typeNiveau === 'AFFAIRE') {
    if (source.clientId !== undefined && source.clientId !== null) {
      throw new TypeError('« clientId » doit être null pour un tarif de type AFFAIRE.')
    }
    if (typeof source.affaireId !== 'number' || !Number.isSafeInteger(source.affaireId) || source.affaireId < 1) {
      throw new TypeError('« affaireId » doit être un entier strictement positif pour un tarif de type AFFAIRE.')
    }
  }
  if (source.finPeriode !== undefined && source.finPeriode !== null && typeof source.finPeriode !== 'string') {
    throw new TypeError('« finPeriode » doit être une chaîne ou null.')
  }
  return donnees as DonneesCreationTarifVue
}

export const enregistrerHandlersTarifs = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.tarifs.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationTarif(donnees)
    const donneesDepot = mapperDonneesCreationVersDepot(validees)
    const id = creerTarif(obtenirBase(), donneesDepot)
    return { id }
  })

  enregistreur.handle(CANAUX.tarifs.lister, () =>
    listerTarifs(obtenirBase()).map(mapperTarifEnVue),
  )

  enregistreur.handle(CANAUX.tarifs.listerParProduit, (_evenement, produitId) => {
    if (typeof produitId !== 'number' || !Number.isSafeInteger(produitId) || produitId < 1) {
      throw new TypeError('« produitId » doit être un entier strictement positif.')
    }
    return listerTarifsParProduit(obtenirBase(), produitId).map(mapperTarifEnVue)
  })

  enregistreur.handle(CANAUX.tarifs.listerParClient, (_evenement, clientId) => {
    if (typeof clientId !== 'number' || !Number.isSafeInteger(clientId) || clientId < 1) {
      throw new TypeError('« clientId » doit être un entier strictement positif.')
    }
    return listerTarifsParClient(obtenirBase(), clientId).map(mapperTarifEnVue)
  })

  enregistreur.handle(CANAUX.tarifs.listerParAffaire, (_evenement, affaireId) => {
    if (typeof affaireId !== 'number' || !Number.isSafeInteger(affaireId) || affaireId < 1) {
      throw new TypeError('« affaireId » doit être un entier strictement positif.')
    }
    return listerTarifsParAffaire(obtenirBase(), affaireId).map(mapperTarifEnVue)
  })

  enregistreur.handle(CANAUX.tarifs.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerLogiquementTarif(obtenirBase(), id)
  })
}
