import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Base } from '../db/connexion'
import { SEUIL_ESPECES_CLE } from '../db/seeds'
import { versCentimes } from './conversion-centimes'

export const SAUVEGARDE_ACTIVEE = 'sauvegarde.activee'
export const SAUVEGARDE_HORAIRE_QUOTIDIENNE = 'sauvegarde.horaire_quotidienne'
export const SAUVEGARDE_DESTINATION = 'sauvegarde.destination'
export const SAUVEGARDE_DERNIERE_EXECUTION = 'sauvegarde.derniere_execution'
export const SAUVEGARDE_DERNIERE_ERREUR = 'sauvegarde.derniere_erreur'
export const HORAIRE_QUOTIDIENNE_PAR_DEFAUT = '03:00'
export const MOTIF_HORAIRE_QUOTIDIENNE = /^([01]\d|2[0-3]):([0-5]\d)$/

export interface ConfigSauvegarde {
  activee: boolean
  horaireQuotidienne: string
  destination: string
  derniereExecution: string | null
}

export const lireConfigSauvegarde = (base: Base): ConfigSauvegarde => ({
  activee: lireParametre(base, SAUVEGARDE_ACTIVEE) !== '0',
  horaireQuotidienne: lireParametre(base, SAUVEGARDE_HORAIRE_QUOTIDIENNE) ?? HORAIRE_QUOTIDIENNE_PAR_DEFAUT,
  destination: lireParametre(base, SAUVEGARDE_DESTINATION) ?? '',
  derniereExecution: lireParametre(base, SAUVEGARDE_DERNIERE_EXECUTION),
})

export const configurerSauvegarde = (
  base: Base,
  dossierRepertoireBase: string,
  params: { activee: boolean; horaireQuotidienne: string; destination: string },
): void => {
  if (typeof params.activee !== 'boolean') {
    throw new TypeError('« activee » doit être un booléen.')
  }
  if (typeof params.horaireQuotidienne !== 'string' || !MOTIF_HORAIRE_QUOTIDIENNE.test(params.horaireQuotidienne)) {
    throw new TypeError('Horaire invalide : attendu un format « HH:MM » sur 24 heures (ex. 03:00).')
  }
  if (typeof params.destination !== 'string' || params.destination.trim() === '') {
    throw new TypeError('« destination » doit être une chaîne non vide.')
  }
  if (!existsSync(params.destination) || !statSync(params.destination).isDirectory()) {
    throw new Error('La destination doit être un dossier existant.')
  }
  if (resolve(params.destination) === resolve(dossierRepertoireBase)) {
    throw new Error('La destination doit être différente du répertoire de la base.')
  }
  mettreAJourParametre(base, SAUVEGARDE_ACTIVEE, params.activee ? '1' : '0')
  mettreAJourParametre(base, SAUVEGARDE_HORAIRE_QUOTIDIENNE, params.horaireQuotidienne)
  mettreAJourParametre(base, SAUVEGARDE_DESTINATION, params.destination)
}

export const lireParametre = (base: Base, cle: string): string | null => {
  const ligne = base
    .prepare('SELECT valeur FROM parametres WHERE cle = ? AND supprime_le IS NULL')
    .get(cle) as { valeur: string } | undefined
  return ligne?.valeur ?? null
}

export const lireParametreObli = (base: Base, cle: string): string => {
  const valeur = lireParametre(base, cle)
  if (valeur === null) {
    throw new Error(`Paramètre obligatoire « ${cle} » absent de la base.`)
  }
  return valeur
}

export const lireSeuilEspecesCentimes = (base: Base): number => {
  const valeur = lireParametreObli(base, SEUIL_ESPECES_CLE)
  return versCentimes(Number.parseInt(valeur, 10))
}

export const mettreAJourParametre = (base: Base, cle: string, valeur: string): void => {
  base
    .prepare(
      `INSERT INTO parametres (cle, valeur)
       VALUES (?, ?)
       ON CONFLICT (cle) DO UPDATE SET valeur = excluded.valeur, modifie_le = datetime('now')`,
    )
    .run(cle, valeur)
}
