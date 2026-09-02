import { join } from 'node:path'
import { dialog } from 'electron'
import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut, baseEstOuverte as baseEstOuverteParDefaut } from '../db/connexion'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'
import type { OrdonnanceurSauvegarde } from '../ordonnanceur-sauvegarde'
import { configurerSauvegarde, lireConfigSauvegarde, lireParametre, SAUVEGARDE_DERNIERE_ERREUR } from '../depots/depot-parametres'
import {
  archiverDonnees,
  restaurerDonnees,
  listerSauvegardes,
  appliquerRetention,
  nommerSauvegarde,
  RETENTION_QUOTIDIENNE,
  RETENTION_MENSUELLE,
  DOSSIER_SAUVEGARDES_DEFAUT,
} from '../sauvegarde'
import { deballerDekParPhrase } from '../securite/session'

const ERREUR_SESSION_VERROUILLEE = 'Session verrouillée : la base n\'est pas ouverte.'

export const enregistrerHandlersSauvegarde = (
  enregistreur: EnregistreurIpc,
  obtenirDossierUserData: () => string,
  obtenirBase: () => Base = obtenirBaseParDefaut,
  baseEstOuverte: () => boolean = baseEstOuverteParDefaut,
  ordonnanceur?: OrdonnanceurSauvegarde,
): void => {
  enregistreur.handle(CANAUX.sauvegarde.archiver, async (_evenement, donnees: unknown) => {
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object'
    ) {
      throw new TypeError('« donnees » doit être un objet valide.')
    }
    const d = donnees as Record<string, unknown>
    if (typeof d.dossierSource !== 'string') {
      throw new TypeError('« dossierSource » doit être une chaîne.')
    }
    if (typeof d.destination !== 'string') {
      throw new TypeError('« destination » doit être une chaîne.')
    }
    if (typeof d.motDePasse !== 'string') {
      throw new TypeError('« motDePasse » doit être une chaîne.')
    }
    if (d.typeBackup !== 'quotidienne' && d.typeBackup !== 'mensuelle' && d.typeBackup !== 'manuelle') {
      throw new TypeError('« typeBackup » doit être quotidienne, mensuelle ou manuelle.')
    }
    return archiverDonnees({
      dossierSource: d.dossierSource,
      destination: d.destination,
      motDePasse: d.motDePasse,
      typeBackup: d.typeBackup,
    })
  })

  enregistreur.handle(CANAUX.sauvegarde.restaurer, async (_evenement, donnees: unknown) => {
    if (baseEstOuverte()) {
      throw new Error('La restauration est interdite pendant une session active.')
    }
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object'
    ) {
      throw new TypeError('« donnees » doit être un objet valide.')
    }
    const d = donnees as Record<string, unknown>
    if (typeof d.phraseRecuperation !== 'string' || d.phraseRecuperation.trim().length === 0) {
      throw new TypeError('« phraseRecuperation » est obligatoire.')
    }
    let archive = typeof d.archive === 'string' ? d.archive : ''
    let dossierDestination = typeof d.dossierDestination === 'string' ? d.dossierDestination : ''
    if (!archive) {
      const resultat = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Archives EGTO', extensions: ['zip', 'enc'] }],
      })
      if (resultat.canceled || resultat.filePaths.length === 0) {
        return { succes: false, erreur: 'Sélection annulée.' }
      }
      archive = resultat.filePaths[0]
    }
    if (!dossierDestination) {
      dossierDestination = obtenirDossierUserData()
    }
    return restaurerDonnees({
      archive,
      dossierDestination,
      phraseRecuperation: d.phraseRecuperation.trim(),
      deballerDekParPhrase: (dossierUserData, phrase) => deballerDekParPhrase(dossierUserData, phrase),
    })
  })

  enregistreur.handle(CANAUX.sauvegarde.lister, async () => {
    const dossierSauvegardes = join(obtenirDossierUserData(), DOSSIER_SAUVEGARDES_DEFAUT)
    const liste = listerSauvegardes({ dossierSauvegardes })
    return liste.map(s => ({ nom: s.nom, date: s.date.toISOString(), type: s.type }))
  })

  enregistreur.handle(CANAUX.sauvegarde.appliquerRetention, async (_evenement, donnees: unknown) => {
    const dossierSauvegardes = join(obtenirDossierUserData(), DOSSIER_SAUVEGARDES_DEFAUT)
    const params = (typeof donnees === 'object' && donnees !== null) ? donnees as Record<string, unknown> : {}
    return appliquerRetention({
      dossierSauvegardes,
      retentionQuotidienne: typeof params.retentionQuotidienne === 'number' ? params.retentionQuotidienne : RETENTION_QUOTIDIENNE,
      retentionMensuelle: typeof params.retentionMensuelle === 'number' ? params.retentionMensuelle : RETENTION_MENSUELLE,
    })
  })

  enregistreur.handle(CANAUX.sauvegarde.nommer, (_evenement, typeBackup: unknown) => {
    if (typeBackup !== 'quotidienne' && typeBackup !== 'mensuelle' && typeBackup !== 'manuelle') {
      throw new TypeError('Type de backup invalide.')
    }
    return nommerSauvegarde({ typeBackup })
  })

  enregistreur.handle(CANAUX.sauvegarde.configurer, async (_evenement, donnees: unknown) => {
    if (!baseEstOuverte()) {
      throw new Error(ERREUR_SESSION_VERROUILLEE)
    }
    if (donnees === null || donnees === undefined || typeof donnees !== 'object') {
      throw new TypeError('« donnees » doit être un objet valide.')
    }
    const d = donnees as Record<string, unknown>
    if (typeof d.activee !== 'boolean') {
      throw new TypeError('« activee » doit être un booléen.')
    }
    if (typeof d.horaireQuotidienne !== 'string') {
      throw new TypeError('« horaireQuotidienne » doit être une chaîne.')
    }
    if (typeof d.destination !== 'string') {
      throw new TypeError('« destination » doit être une chaîne.')
    }
    configurerSauvegarde(obtenirBase(), obtenirDossierUserData(), {
      activee: d.activee,
      horaireQuotidienne: d.horaireQuotidienne,
      destination: d.destination,
    })
    if (ordonnanceur) {
      void ordonnanceur.verifierEcheance()
    }
  })

  enregistreur.handle(CANAUX.sauvegarde.etat, async () => {
    if (!baseEstOuverte()) {
      throw new Error(ERREUR_SESSION_VERROUILLEE)
    }
    const base = obtenirBase()
    const config = lireConfigSauvegarde(base)
    const erreurPersistee = lireParametre(base, SAUVEGARDE_DERNIERE_ERREUR)
    return {
      activee: config.activee,
      horaireQuotidienne: config.horaireQuotidienne,
      destination: config.destination,
      derniereExecution: config.derniereExecution,
      derniereErreur: ordonnanceur?.derniereErreur() ?? erreurPersistee,
    }
  })

  enregistreur.handle(CANAUX.sauvegarde.choisirDestination, async () => {
    if (!baseEstOuverte()) {
      throw new Error(ERREUR_SESSION_VERROUILLEE)
    }
    const resultat = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    })
    if (resultat.canceled || resultat.filePaths.length === 0) {
      return { annule: true }
    }
    return { annule: false, destination: resultat.filePaths[0] }
  })
}
