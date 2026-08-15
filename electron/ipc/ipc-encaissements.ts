import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { Encaissement, STATUTS_TIMBRE, type StatutTimbre } from '../../domaine/encaissements'
import {
  MODES_REGLEMENT_EFFECTIFS,
  verifierDateIso,
  type ModeReglementEffectif,
} from '../../domaine/entites-referentielles'
import {
  creerEncaissement,
  lireEncaissement,
  listerEncaissements,
  modifierTraitementTimbreEncaissement,
  supprimerEncaissement,
  type DonneesModificationTimbreEncaissement,
  type DonneesSaisieEncaissement,
  type EnregistrementEncaissement,
} from '../depots/depot-encaissements'
import type {
  DonneesCreationEncaissement,
  DonneesModificationTimbreEncaissementVue,
  EncaissementVue,
} from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

const MOTIF_JJMMAAAA = /^(\d{2})\/(\d{2})\/(\d{4})$/
const MOTIF_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

// Le renderer manipule les dates au format JJ/MM/AAAA (UI) ; la base stocke
// les dates métier en ISO 'AAAA-MM-JJ'. La validation calendaire (mois, jours
// par mois, années bissextiles) est déléguée au domaine via verifierDateIso —
// aucune logique de calendrier dupliquée ici.
export const versDateIso = (valeur: string, libelle = 'date'): string => {
  if (typeof valeur !== 'string') {
    throw new TypeError(`« ${libelle} » doit être une chaîne au format JJ/MM/AAAA (reçu : ${String(valeur)}).`)
  }
  const correspondance = MOTIF_JJMMAAAA.exec(valeur)
  if (correspondance === null) {
    throw new Error(`« ${libelle} » : format invalide « ${valeur} » (attendu : JJ/MM/AAAA).`)
  }
  const iso = `${correspondance[3]}-${correspondance[2]}-${correspondance[1]}`
  verifierDateIso(iso, libelle)
  return iso
}

export const versDateAffichage = (iso: string, libelle = 'date'): string => {
  if (typeof iso !== 'string') {
    throw new TypeError(`« ${libelle} » doit être une chaîne au format AAAA-MM-JJ (reçu : ${String(iso)}).`)
  }
  verifierDateIso(iso, libelle)
  const correspondance = MOTIF_ISO.exec(iso)
  if (correspondance === null) {
    throw new Error(`« ${libelle} » : format invalide « ${iso} » (attendu : AAAA-MM-JJ).`)
  }
  return `${correspondance[3]}/${correspondance[2]}/${correspondance[1]}`
}

export const mapperEncaissementEnVue = (enregistrement: EnregistrementEncaissement): EncaissementVue => ({
  id: enregistrement.id,
  factureId: enregistrement.facture_id,
  numero: enregistrement.numero,
  montantEncaisseCentimes: enregistrement.montant_encaisse_centimes,
  dateEncaissement: versDateAffichage(enregistrement.date_encaissement, 'date d’encaissement'),
  modeReglementEffectif: enregistrement.mode_reglement_effectif,
  timbreStatut: enregistrement.timbre_statut,
  montantTimbreSaisiCentimes: enregistrement.montant_timbre_saisi_centimes,
  timbreTraiteLe:
    enregistrement.timbre_traite_le === null
      ? null
      : versDateAffichage(enregistrement.timbre_traite_le, 'date de traitement du timbre'),
  timbreTraitePar: enregistrement.timbre_traite_par,
  referenceTimbreOuQuittance: enregistrement.reference_timbre_ou_quittance,
  commentaireTimbre: enregistrement.commentaire_timbre,
  creeLe: enregistrement.cree_le,
  modifieLe: enregistrement.modifie_le,
  supprimeLe: enregistrement.supprime_le,
})

export const mapperDonneesCreationVersDepot = (
  donnees: DonneesCreationEncaissement,
): DonneesSaisieEncaissement => ({
  facture_id: donnees.factureId,
  montant_encaisse_centimes: donnees.montantEncaisseCentimes,
  date_encaissement: versDateIso(donnees.dateEncaissement, 'date d’encaissement'),
  mode_reglement_effectif: donnees.modeReglementEffectif,
  timbre_statut: donnees.timbreStatut,
  montant_timbre_saisi_centimes: donnees.montantTimbreSaisiCentimes,
  timbre_traite_le:
    donnees.timbreTraiteLe === undefined ? undefined : versDateIso(donnees.timbreTraiteLe, 'date de traitement du timbre'),
  timbre_traite_par: donnees.timbreTraitePar,
  reference_timbre_ou_quittance: donnees.referenceTimbreOuQuittance,
  commentaire_timbre: donnees.commentaireTimbre,
})

export const mapperDonneesModificationVersDepot = (
  donnees: DonneesModificationTimbreEncaissementVue,
): DonneesModificationTimbreEncaissement => ({
  id: donnees.id,
  timbre_statut: donnees.timbreStatut,
  montant_timbre_saisi_centimes: donnees.montantTimbreSaisiCentimes,
  timbre_traite_le:
    donnees.timbreTraiteLe === undefined
      ? undefined
      : versDateIso(donnees.timbreTraiteLe, 'timbreTraiteLe'),
  timbre_traite_par: donnees.timbreTraitePar,
  reference_timbre_ou_quittance: donnees.referenceTimbreOuQuittance,
  commentaire_timbre: donnees.commentaireTimbre,
})

const verifierChaineFacultative = (source: Record<string, unknown>, champ: string): void => {
  if (source[champ] !== undefined && typeof source[champ] !== 'string') {
    throw new TypeError(`« ${champ} » doit être une chaîne.`)
  }
}

export const verifierDonneesCreationEncaissement = (donnees: unknown): DonneesCreationEncaissement => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création d’encaissement.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.factureId !== 'number' || !Number.isSafeInteger(source.factureId) || source.factureId < 1) {
    throw new TypeError('« factureId » doit être un entier strictement positif.')
  }
  if (
    typeof source.montantEncaisseCentimes !== 'number' ||
    !Number.isSafeInteger(source.montantEncaisseCentimes) ||
    source.montantEncaisseCentimes < 1
  ) {
    throw new TypeError('« montantEncaisseCentimes » doit être un entier strictement positif.')
  }
  if (typeof source.dateEncaissement !== 'string') {
    throw new TypeError('« dateEncaissement » doit être une chaîne au format JJ/MM/AAAA.')
  }
  versDateIso(source.dateEncaissement, 'dateEncaissement')
  const mode = source.modeReglementEffectif
  if (typeof mode !== 'string' || !MODES_REGLEMENT_EFFECTIFS.includes(mode as ModeReglementEffectif)) {
    throw new Error(
      `« modeReglementEffectif » : valeur inconnue « ${String(mode)} » (attendu parmi : ${MODES_REGLEMENT_EFFECTIFS.join(', ')}).`,
    )
  }
  if (source.timbreStatut !== undefined) {
    if (typeof source.timbreStatut !== 'string' || !STATUTS_TIMBRE.includes(source.timbreStatut as StatutTimbre)) {
      throw new Error(
        `« timbreStatut » : valeur inconnue « ${String(source.timbreStatut)} » (attendu parmi : ${STATUTS_TIMBRE.join(', ')}).`,
      )
    }
  }
  if (source.montantTimbreSaisiCentimes !== undefined) {
    if (
      typeof source.montantTimbreSaisiCentimes !== 'number' ||
      !Number.isSafeInteger(source.montantTimbreSaisiCentimes) ||
      source.montantTimbreSaisiCentimes < 0
    ) {
      throw new TypeError('« montantTimbreSaisiCentimes » doit être un entier positif ou nul.')
    }
  }
  if (source.timbreTraiteLe !== undefined) {
    if (typeof source.timbreTraiteLe !== 'string') {
      throw new TypeError('« timbreTraiteLe » doit être une chaîne au format JJ/MM/AAAA.')
    }
    versDateIso(source.timbreTraiteLe, 'timbreTraiteLe')
  }
  for (const champ of ['timbreTraitePar', 'referenceTimbreOuQuittance', 'commentaireTimbre'] as const) {
    verifierChaineFacultative(source, champ)
  }
  return donnees as DonneesCreationEncaissement
}

// La modification du timbre ne porte QUE sur le traitement du timbre : les
// champs protégés (montant encaissé, mode effectif, facture, date
// d'encaissement, numéro) ne sont pas acceptés par ce canal. Les contraintes
// conditionnelles du timbre (TRAITE complet, NON_APPLICABLE vide…) sont
// contrôlées par le domaine (Encaissement.depuisDonnees) — la validation ici
// ne vérifie que la forme.
export const verifierDonneesModificationTimbreEncaissement = (
  donnees: unknown,
): DonneesModificationTimbreEncaissementVue => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de modification d’encaissement.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.id !== 'number' || !Number.isSafeInteger(source.id) || source.id < 1) {
    throw new TypeError('« id » doit être un entier strictement positif.')
  }
  if (typeof source.timbreStatut !== 'string' || !STATUTS_TIMBRE.includes(source.timbreStatut as StatutTimbre)) {
    throw new Error(
      `« timbreStatut » : valeur inconnue « ${String(source.timbreStatut)} » (attendu parmi : ${STATUTS_TIMBRE.join(', ')}).`,
    )
  }
  if (source.montantTimbreSaisiCentimes !== undefined) {
    if (
      typeof source.montantTimbreSaisiCentimes !== 'number' ||
      !Number.isSafeInteger(source.montantTimbreSaisiCentimes) ||
      source.montantTimbreSaisiCentimes < 0
    ) {
      throw new TypeError('« montantTimbreSaisiCentimes » doit être un entier positif ou nul.')
    }
  }
  if (source.timbreTraiteLe !== undefined) {
    if (typeof source.timbreTraiteLe !== 'string') {
      throw new TypeError('« timbreTraiteLe » doit être une chaîne au format JJ/MM/AAAA.')
    }
    versDateIso(source.timbreTraiteLe, 'timbreTraiteLe')
  }
  for (const champ of ['timbreTraitePar', 'referenceTimbreOuQuittance', 'commentaireTimbre'] as const) {
    verifierChaineFacultative(source, champ)
  }
  return donnees as DonneesModificationTimbreEncaissementVue
}

// Valeurs provisoires uniquement pour traverser la validation du domaine à la
// création : l'identifiant et le numéro définitifs sont attribués par le dépôt
// (AUTOINCREMENT + numérotation ENC) — mêmes valeurs que le dépôt.
const ID_PROVISOIRE = 1
const NUMERO_PROVISOIRE = 'ENC-0000-0000'

export const enregistrerHandlersEncaissements = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.encaissements.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationEncaissement(donnees)
    const saisie = mapperDonneesCreationVersDepot(validees)
    Encaissement.depuisDonnees({ id: ID_PROVISOIRE, numero: NUMERO_PROVISOIRE, ...saisie })
    const base = obtenirBase()
    const id = creerEncaissement(base, saisie)
    const enregistrement = lireEncaissement(base, id)
    if (enregistrement === null) {
      throw new Error('Impossible de relire l’encaissement créé.')
    }
    return mapperEncaissementEnVue(enregistrement)
  })

  enregistreur.handle(CANAUX.encaissements.lister, (_evenement, factureId) => {
    if (factureId !== undefined) {
      if (typeof factureId !== 'number' || !Number.isSafeInteger(factureId) || factureId < 1) {
        throw new TypeError('« factureId » doit être un entier strictement positif.')
      }
    }
    return listerEncaissements(obtenirBase(), factureId).map(mapperEncaissementEnVue)
  })

  enregistreur.handle(CANAUX.encaissements.supprimer, (_evenement, id) => {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
      throw new TypeError('« id » doit être un entier strictement positif.')
    }
    return supprimerEncaissement(obtenirBase(), id)
  })

  enregistreur.handle(CANAUX.encaissements.modifierTimbre, (_evenement, donnees) => {
    const validees = verifierDonneesModificationTimbreEncaissement(donnees)
    const donneesDepot = mapperDonneesModificationVersDepot(validees)
    const enregistrement = modifierTraitementTimbreEncaissement(obtenirBase(), donneesDepot)
    if (enregistrement === null) {
      throw new Error('Encaissement introuvable ou supprimé.')
    }
    return mapperEncaissementEnVue(enregistrement)
  })
}
