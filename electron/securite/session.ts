import { randomBytes } from 'node:crypto'
import {
  deriverCle,
  envelopperDek,
  deballerDek,
  genererDek,
  genererPhraseRecuperation,
  TAILLE_SEL_OCTETS,
  lireSelDepuisBlob,
} from './chiffrement-enveloppe'
import {
  NOM_ENVELOPPE_UTILISATEUR,
  NOM_ENVELOPPE_RECOURS,
  ecrireEnveloppe,
  lireEnveloppe,
} from './gestionnaire-enveloppes'

export type DepsSession = {
  ouvrirBase: (chemin: string, cle: string) => { close: () => void }
  fermerBase: () => void
  appliquerMigrations: (base: { close: () => void }) => void
  insererSeeds: (base: { close: () => void }) => void
}

export type EtatSession = 'verrouille' | 'ouvert'

const ERREUR_SESSION_VERROUILLEE = 'Session verrouillee.'
const ERREUR_MDP_INCORRECT = 'Mot de passe incorrect.'
const ERREUR_PHRASE_INCORRECTE = 'Phrase de recuperation incorrecte.'
const ERREUR_MDP_TROP_COURT = 'Le mot de passe doit contenir au moins 8 caracteres.'

export const MINIMUM_CARACTERES_MDP = 8

const validerMotDePasse = (motDePasse: string): void => {
  if (typeof motDePasse !== 'string' || motDePasse.length < MINIMUM_CARACTERES_MDP) {
    throw new Error(ERREUR_MDP_TROP_COURT)
  }
}

export const premierDemarrage = async (
  dossierUserData: string,
  motDePasse: string,
  _deps: DepsSession,
): Promise<string> => {
  void _deps
  validerMotDePasse(motDePasse)
  const dek = genererDek()
  const phrase = genererPhraseRecuperation()

  const selUser = randomBytes(TAILLE_SEL_OCTETS)
  const selRecours = randomBytes(TAILLE_SEL_OCTETS)

  const cleUser = await deriverCle(motDePasse, selUser)
  const cleRecours = await deriverCle(phrase, selRecours)

  const blobUser = envelopperDek(dek, cleUser, selUser)
  const blobRecours = envelopperDek(dek, cleRecours, selRecours)

  ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, blobUser)
  ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS, blobRecours)

  return phrase
}

export const deverrouiller = async (
  dossierUserData: string,
  motDePasse: string,
  deps: DepsSession,
): Promise<{ dekCourante: Buffer; base: { close: () => void } }> => {
  validerMotDePasse(motDePasse)
  const blobUser = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
  const sel = lireSelDepuisBlob(blobUser)
  const cle = await deriverCle(motDePasse, sel)

  let dek: Buffer
  try {
    dek = deballerDek(blobUser, cle)
  } catch {
    throw new Error(ERREUR_MDP_INCORRECT)
  }

  const base = deps.ouvrirBase(`${dossierUserData}/egto.db`, dek.toString('hex'))
  deps.appliquerMigrations(base)
  deps.insererSeeds(base)

  return { dekCourante: dek, base }
}

export const verrouiller = (
  etat: { dekCourante: Buffer | null; base: { close: () => void } | null },
  deps: DepsSession,
): void => {
  if (etat.dekCourante === null) {
    throw new Error(ERREUR_SESSION_VERROUILLEE)
  }
  etat.dekCourante.fill(0)
  etat.dekCourante = null
  if (etat.base !== null) {
    deps.fermerBase()
    etat.base = null
  }
}

export const changerMotDePasse = async (
  dossierUserData: string,
  ancienMotDePasse: string,
  nouveauMotDePasse: string,
): Promise<void> => {
  validerMotDePasse(nouveauMotDePasse)
  const blobUser = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR)
  const sel = lireSelDepuisBlob(blobUser)
  const ancienneCle = await deriverCle(ancienMotDePasse, sel)

  let dek: Buffer
  try {
    dek = deballerDek(blobUser, ancienneCle)
  } catch {
    throw new Error(ERREUR_MDP_INCORRECT)
  }

  const nouveauSel = randomBytes(TAILLE_SEL_OCTETS)
  const nouvelleCle = await deriverCle(nouveauMotDePasse, nouveauSel)
  const nouveauBlob = envelopperDek(dek, nouvelleCle, nouveauSel)
  ecrireEnveloppe(dossierUserData, NOM_ENVELOPPE_UTILISATEUR, nouveauBlob)
}

export const deballerDekParPhrase = async (
  dossierUserData: string,
  phrase: string,
): Promise<Buffer> => {
  const blobRecours = lireEnveloppe(dossierUserData, NOM_ENVELOPPE_RECOURS)
  const sel = lireSelDepuisBlob(blobRecours)
  const cle = await deriverCle(phrase, sel)

  try {
    return deballerDek(blobRecours, cle)
  } catch {
    throw new Error(ERREUR_PHRASE_INCORRECTE)
  }
}

export type CallbackInactivite = () => void

export class CompteurInactivite {
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly dureeMs: number
  private readonly callback: CallbackInactivite

  constructor(dureeMs: number, callback: CallbackInactivite) {
    this.dureeMs = dureeMs
    this.callback = callback
  }

  noterActivite(): void {
    this.arreter()
    this.timer = setTimeout(() => {
      this.timer = null
      this.callback()
    }, this.dureeMs)
  }

  arreter(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
