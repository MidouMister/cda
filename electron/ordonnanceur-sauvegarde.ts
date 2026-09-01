import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Base } from './db/connexion'
import {
  lireConfigSauvegarde,
  mettreAJourParametre,
  SAUVEGARDE_DERNIERE_EXECUTION,
  SAUVEGARDE_DERNIERE_ERREUR,
  MOTIF_HORAIRE_QUOTIDIENNE,
} from './depots/depot-parametres'
import { appliquerRetention, archiverDonnees, nommerSauvegarde } from './sauvegarde'

export const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000

export type NiveauJournalOrdonnanceur = 'erreur' | 'avertissement' | 'info'

export interface EntreeLogOrdonnanceur {
  horodatage: string
  niveau: NiveauJournalOrdonnanceur
  module: string
  message: string
}

export interface DepsOrdonnanceurSauvegarde {
  obtenirDossierUserData: () => string
  obtenirDek: () => Buffer | null
  obtenirBase: () => Base | null
  ecrireLog: (entree: EntreeLogOrdonnanceur) => unknown
  maintenant: () => Date
  creerIntervalle?: (fn: () => void, ms: number) => { arreter: () => void }
}

export interface ResultatVerificationSauvegarde {
  executee: boolean
  skippee: boolean
  erreur?: string
}

export interface OrdonnanceurSauvegarde {
  verifierEcheance: () => Promise<ResultatVerificationSauvegarde>
  demarrer: () => void
  arreter: () => void
  derniereErreur: () => string | null
}

export interface ConcernesSauvegarde {
  activee: boolean
  horaireQuotidienne: string
  maintenant: Date
  derniereExecutionIso: string | null
}

export const estSauvegardeDue = (concerne: ConcernesSauvegarde): boolean => {
  if (!concerne.activee) return false
  const correspondance = MOTIF_HORAIRE_QUOTIDIENNE.exec(concerne.horaireQuotidienne)
  if (!correspondance) return false
  const heures = Number(correspondance[1])
  const minutes = Number(correspondance[2])
  const echeance = new Date(
    concerne.maintenant.getFullYear(),
    concerne.maintenant.getMonth(),
    concerne.maintenant.getDate(),
    heures,
    minutes,
    0,
    0,
  )
  if (concerne.maintenant.getTime() < echeance.getTime()) return false
  if (concerne.derniereExecutionIso === null) return true
  return new Date(concerne.derniereExecutionIso).getTime() < echeance.getTime()
}

const creerIntervalleReel = (fn: () => void, ms: number): { arreter: () => void } => {
  const id = setInterval(fn, ms)
  return { arreter: () => clearInterval(id) }
}

export const creerOrdonnanceurSauvegarde = (deps: DepsOrdonnanceurSauvegarde): OrdonnanceurSauvegarde => {
  const creerIntervalle = deps.creerIntervalle ?? creerIntervalleReel
  let memoireDerniereErreur: string | null = null
  let intervalle: { arreter: () => void } | null = null

  const horodatageCourant = (): string => deps.maintenant().toISOString()

  const verifierEcheance = async (): Promise<ResultatVerificationSauvegarde> => {
    const base = deps.obtenirBase()
    const dek = deps.obtenirDek()
    if (base === null || dek === null) {
      return { executee: false, skippee: true }
    }

    const config = lireConfigSauvegarde(base)
    if (config.destination === '' || !existsSync(config.destination) || !statSync(config.destination).isDirectory()) {
      deps.ecrireLog({
        horodatage: horodatageCourant(),
        niveau: 'avertissement',
        module: 'ordonnanceur',
        message: 'Sauvegarde quotidienne ignorée : destination non configurée.',
      })
      return { executee: false, skippee: true }
    }

    const maintenant = deps.maintenant()
    if (!estSauvegardeDue({
      activee: config.activee,
      horaireQuotidienne: config.horaireQuotidienne,
      maintenant,
      derniereExecutionIso: config.derniereExecution,
    })) {
      return { executee: false, skippee: false }
    }

    const nom = nommerSauvegarde({ typeBackup: 'quotidienne', date: maintenant })
    try {
      const resultat = await archiverDonnees({
        dossierSource: deps.obtenirDossierUserData(),
        destination: join(config.destination, nom),
        motDePasse: dek.toString('hex'),
        typeBackup: 'quotidienne',
      })
      if (!resultat.succes) {
        memoireDerniereErreur = resultat.erreur ?? 'Échec de la sauvegarde quotidienne automatique.'
        mettreAJourParametre(base, SAUVEGARDE_DERNIERE_ERREUR, memoireDerniereErreur)
        deps.ecrireLog({
          horodatage: horodatageCourant(),
          niveau: 'erreur',
          module: 'ordonnanceur',
          message: 'Échec de la sauvegarde quotidienne automatique.',
        })
        return { executee: false, skippee: false, erreur: resultat.erreur }
      }

      memoireDerniereErreur = null
      mettreAJourParametre(base, SAUVEGARDE_DERNIERE_ERREUR, '')
      appliquerRetention({ dossierSauvegardes: config.destination })
      mettreAJourParametre(base, SAUVEGARDE_DERNIERE_EXECUTION, maintenant.toISOString())
      deps.ecrireLog({
        horodatage: maintenant.toISOString(),
        niveau: 'info',
        module: 'ordonnanceur',
        message: `Sauvegarde quotidienne automatique réussie : ${nom}`,
      })
      return { executee: true, skippee: false }
    } catch (erreur) {
      memoireDerniereErreur = erreur instanceof Error ? erreur.message : String(erreur)
      deps.ecrireLog({
        horodatage: horodatageCourant(),
        niveau: 'erreur',
        module: 'ordonnanceur',
        message: 'Échec de la sauvegarde quotidienne automatique.',
      })
      return { executee: false, skippee: false, erreur: memoireDerniereErreur }
    }
  }

  const demarrer = (): void => {
    if (intervalle !== null) return
    intervalle = creerIntervalle(() => {
      void verifierEcheance()
    }, INTERVALLE_VERIFICATION_MS)
  }

  const arreter = (): void => {
    if (intervalle !== null) {
      intervalle.arreter()
      intervalle = null
    }
  }

  const derniereErreur = (): string | null => memoireDerniereErreur

  return { verifierEcheance, demarrer, arreter, derniereErreur }
}