import { join } from 'node:path'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'
import { ecrireLog, lireLogs, exporterLogs, initialiserJournal, DOSSIER_JOURNAL } from '../journal'
import type { NiveauJournal } from '../journal'

export const enregistrerHandlersJournal = (
  enregistreur: EnregistreurIpc,
  obtenirDossierUserData: () => string,
): void => {
  enregistreur.handle(CANAUX.journal.ecrire, async (_evenement, donnees: unknown) => {
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object'
    ) {
      throw new TypeError('« donnees » doit être un objet valide.')
    }
    const d = donnees as { entree: { niveau: string; module: string; message: string; stack?: string } }
    if (!d?.entree?.niveau || !d?.entree?.module || !d?.entree?.message) {
      throw new TypeError('Paramètres de journal invalides.')
    }
    const dossierJournal = join(obtenirDossierUserData(), DOSSIER_JOURNAL)
    initialiserJournal({ dossierJournal })
    ecrireLog({ dossierJournal, entree: { ...d.entree, niveau: d.entree.niveau as NiveauJournal, horodatage: new Date().toISOString() } })
  })

  enregistreur.handle(CANAUX.journal.lire, async (_evenement, donnees: unknown) => {
    const dossierJournal = join(obtenirDossierUserData(), DOSSIER_JOURNAL)
    const params = (typeof donnees === 'object' && donnees !== null) ? donnees as Record<string, unknown> : {}
    return lireLogs({
      dossierJournal,
      nombre: typeof params.nombre === 'number' ? params.nombre : undefined,
      niveau: typeof params.niveau === 'string' ? params.niveau as NiveauJournal : undefined,
    })
  })

  enregistreur.handle(CANAUX.journal.exporter, async (_evenement, chemin: unknown) => {
    if (typeof chemin !== 'string') throw new TypeError('Chemin invalide.')
    const dossierJournal = join(obtenirDossierUserData(), DOSSIER_JOURNAL)
    return exporterLogs({ dossierJournal, destination: chemin })
  })
}
