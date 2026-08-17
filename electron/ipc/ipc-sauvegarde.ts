import { join } from 'node:path'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'
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

export const enregistrerHandlersSauvegarde = (
  enregistreur: EnregistreurIpc,
  obtenirDossierUserData: () => string,
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
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object'
    ) {
      throw new TypeError('« donnees » doit être un objet valide.')
    }
    const d = donnees as Record<string, unknown>
    if (typeof d.archive !== 'string') {
      throw new TypeError('« archive » doit être une chaîne.')
    }
    if (typeof d.motDePasse !== 'string') {
      throw new TypeError('« motDePasse » doit être une chaîne.')
    }
    if (typeof d.dossierDestination !== 'string') {
      throw new TypeError('« dossierDestination » doit être une chaîne.')
    }
    return restaurerDonnees({
      archive: d.archive,
      motDePasse: d.motDePasse,
      dossierDestination: d.dossierDestination,
      phraseRecuperation: typeof d.phraseRecuperation === 'string' ? d.phraseRecuperation : undefined,
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
}
