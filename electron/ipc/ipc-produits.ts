import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import {
  creerProduit,
  lireProduitParId,
  listerProduits,
  listerProduitsParFamille,
  modifierProduit,
  supprimerLogiquementProduit,
  type DonneesCreationProduit,
  type Produit,
} from '../depots/depot-produits'
import {
  creerSousFamille,
  listerSousFamilles,
  listerSousFamillesParFamille,
  supprimerLogiquementSousFamille,
  type DonneesCreationSousFamille,
  type SousFamille,
} from '../depots/depot-sous-familles'
import {
  creerClassification,
  listerClassifications,
  modifierClassification,
  type CategorieClassification,
  type DonneesCreationClassification,
  type Classification,
} from '../depots/depot-classifications'
import type {
  DonneesCreationClassificationVue,
  DonneesCreationProduitVue,
  DonneesCreationSousFamilleVue,
  ClassificationVue,
  ProduitVue,
  SousFamilleVue,
} from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperProduitEnVue = (produit: Produit): ProduitVue => ({
  id: produit.id,
  codeProduit: produit.code_produit,
  libelle: produit.libelle,
  familleId: produit.famille_id,
  sousFamilleId: produit.sous_famille_id,
  unite: produit.unite,
  puReferenceCentimes: produit.pu_reference_centimes,
  typeTarification: produit.type_tarification,
  actif: produit.actif,
})

export const mapperSousFamilleEnVue = (sousFamille: SousFamille): SousFamilleVue => ({
  id: sousFamille.id,
  familleId: sousFamille.famille_id,
  code: sousFamille.code,
  libelle: sousFamille.libelle,
})

export const mapperClassificationEnVue = (classification: Classification): ClassificationVue => ({
  id: classification.id,
  sousFamilleId: classification.sous_famille_id,
  categorie: classification.categorie,
})

export const mapperDonneesCreationProduitVersDepot = (donnees: DonneesCreationProduitVue): DonneesCreationProduit => ({
  code_produit: donnees.codeProduit,
  libelle: donnees.libelle,
  famille_id: donnees.familleId,
  sous_famille_id: donnees.sousFamilleId,
  unite: donnees.unite as DonneesCreationProduit['unite'] | undefined,
  pu_reference_centimes: donnees.puReferenceCentimes,
  type_tarification: donnees.typeTarification as DonneesCreationProduit['type_tarification'] | undefined,
})

export const mapperDonneesCreationSousFamilleVersDepot = (
  donnees: DonneesCreationSousFamilleVue,
): DonneesCreationSousFamille => ({
  famille_id: donnees.familleId,
  code: donnees.code,
  libelle: donnees.libelle,
})

export const mapperDonneesCreationClassificationVersDepot = (
  donnees: DonneesCreationClassificationVue,
): DonneesCreationClassification => ({
  sous_famille_id: donnees.sousFamilleId,
  categorie: donnees.categorie as CategorieClassification,
})

const verifierDonneesCreationProduit = (donnees: unknown): DonneesCreationProduitVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de produit.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.codeProduit !== 'string' || source.codeProduit.trim() === '') {
    throw new TypeError('« codeProduit » doit être une chaîne non vide.')
  }
  if (typeof source.libelle !== 'string' || source.libelle.trim() === '') {
    throw new TypeError('« libelle » doit être une chaîne non vide.')
  }
  if (typeof source.familleId !== 'number' || !Number.isSafeInteger(source.familleId) || source.familleId < 1) {
    throw new TypeError('« familleId » doit être un entier strictement positif.')
  }
  return donnees as DonneesCreationProduitVue
}

const verifierDonneesCreationSousFamille = (donnees: unknown): DonneesCreationSousFamilleVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de sous-famille.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.familleId !== 'number' || !Number.isSafeInteger(source.familleId) || source.familleId < 1) {
    throw new TypeError('« familleId » doit être un entier strictement positif.')
  }
  if (typeof source.code !== 'string' || source.code.trim() === '') {
    throw new TypeError('« code » doit être une chaîne non vide.')
  }
  if (typeof source.libelle !== 'string' || source.libelle.trim() === '') {
    throw new TypeError('« libelle » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationSousFamilleVue
}

const verifierDonneesCreationClassification = (donnees: unknown): DonneesCreationClassificationVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de classification.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.sousFamilleId !== 'number' || !Number.isSafeInteger(source.sousFamilleId) || source.sousFamilleId < 1) {
    throw new TypeError('« sousFamilleId » doit être un entier strictement positif.')
  }
  if (typeof source.categorie !== 'string' || !['NOIR', 'BLANC', 'AUTRE'].includes(source.categorie)) {
    throw new TypeError('« categorie » doit être « NOIR », « BLANC » ou « AUTRE ».')
  }
  return donnees as DonneesCreationClassificationVue
}

const verifierId = (id: unknown, libelle = 'id'): number => {
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new TypeError(`« ${libelle} » doit être un entier strictement positif.`)
  }
  return id
}

export const enregistrerHandlersProduits = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.produits.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationProduit(donnees)
    const donneesDepot = mapperDonneesCreationProduitVersDepot(validees)
    const id = creerProduit(obtenirBase(), donneesDepot)
    return { id }
  })

  enregistreur.handle(CANAUX.produits.lister, () =>
    listerProduits(obtenirBase()).map(mapperProduitEnVue),
  )

  enregistreur.handle(CANAUX.produits.lire, (_evenement, id) => {
    const idValide = verifierId(id)
    const produit = lireProduitParId(obtenirBase(), idValide)
    return produit === null ? null : mapperProduitEnVue(produit)
  })

  enregistreur.handle(CANAUX.produits.modifier, (_evenement, id, donnees) => {
    const idValide = verifierId(id)
    if (donnees === null || typeof donnees !== 'object') {
      throw new TypeError('« donnees » doit être un objet de modification de produit.')
    }
    return modifierProduit(obtenirBase(), idValide, donnees as Record<string, unknown>)
  })

  enregistreur.handle(CANAUX.produits.supprimer, (_evenement, id) => {
    const idValide = verifierId(id)
    return supprimerLogiquementProduit(obtenirBase(), idValide)
  })

  enregistreur.handle(CANAUX.produits.listerParFamille, (_evenement, familleId) => {
    const familleIdValide = verifierId(familleId, 'familleId')
    return listerProduitsParFamille(obtenirBase(), familleIdValide).map(mapperProduitEnVue)
  })

  enregistreur.handle(CANAUX.sousFamilles.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationSousFamille(donnees)
    const donneesDepot = mapperDonneesCreationSousFamilleVersDepot(validees)
    const id = creerSousFamille(obtenirBase(), donneesDepot)
    return { id }
  })

  enregistreur.handle(CANAUX.sousFamilles.lister, () =>
    listerSousFamilles(obtenirBase()).map(mapperSousFamilleEnVue),
  )

  enregistreur.handle(CANAUX.sousFamilles.listerParFamille, (_evenement, familleId) => {
    const familleIdValide = verifierId(familleId, 'familleId')
    return listerSousFamillesParFamille(obtenirBase(), familleIdValide).map(mapperSousFamilleEnVue)
  })

  enregistreur.handle(CANAUX.sousFamilles.supprimer, (_evenement, id) => {
    const idValide = verifierId(id)
    return supprimerLogiquementSousFamille(obtenirBase(), idValide)
  })

  enregistreur.handle(CANAUX.classifications.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationClassification(donnees)
    const donneesDepot = mapperDonneesCreationClassificationVersDepot(validees)
    const id = creerClassification(obtenirBase(), donneesDepot)
    return { id }
  })

  enregistreur.handle(CANAUX.classifications.lister, () =>
    listerClassifications(obtenirBase()).map(mapperClassificationEnVue),
  )

  enregistreur.handle(CANAUX.classifications.modifier, (_evenement, id, categorie) => {
    const idValide = verifierId(id)
    if (typeof categorie !== 'string' || !['NOIR', 'BLANC', 'AUTRE'].includes(categorie)) {
      throw new TypeError('« categorie » doit être « NOIR », « BLANC » ou « AUTRE ».')
    }
    return modifierClassification(obtenirBase(), idValide, categorie as CategorieClassification)
  })
}
