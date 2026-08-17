import { enveloppesExistent } from '../securite/gestionnaire-enveloppes'
import {
  premierDemarrage,
  deverrouiller,
  verrouiller,
  changerMotDePasse,
  type CompteurInactivite,
  type DepsSession,
} from '../securite/session'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export type EtatSessionGere = {
  dekCourante: Buffer | null
  base: { close: () => void } | null
}

export const enregistrerHandlersSession = (
  enregistreur: EnregistreurIpc,
  obtenirDossierUserData: () => string,
  obtenirEtatSession: () => EtatSessionGere,
  deps: DepsSession,
  compteurActivite: CompteurInactivite,
): void => {
  enregistreur.handle(CANAUX.session.etat, () => {
    const dossier = obtenirDossierUserData()
    const etat = obtenirEtatSession()
    return {
      verrouillee: etat.dekCourante === null,
      premierDemarrage: !enveloppesExistent(dossier),
    }
  })

  enregistreur.handle(CANAUX.session.premierDemarrage, async (_evenement, donnees) => {
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object' ||
      typeof (donnees as { motDePasse: unknown }).motDePasse !== 'string'
    ) {
      throw new TypeError('« motDePasse » doit être une chaîne.')
    }
    const { motDePasse } = donnees as { motDePasse: string }
    const phrase = await premierDemarrage(obtenirDossierUserData(), motDePasse, deps)
    return { phrase }
  })

  enregistreur.handle(CANAUX.session.deverrouiller, async (_evenement, donnees) => {
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object' ||
      typeof (donnees as { motDePasse: unknown }).motDePasse !== 'string'
    ) {
      throw new TypeError('« motDePasse » doit être une chaîne.')
    }
    const { motDePasse } = donnees as { motDePasse: string }
    const { dekCourante, base } = await deverrouiller(obtenirDossierUserData(), motDePasse, deps)
    const etat = obtenirEtatSession()
    etat.dekCourante = dekCourante
    etat.base = base
  })

  enregistreur.handle(CANAUX.session.verrouiller, () => {
    const etat = obtenirEtatSession()
    verrouiller(etat, deps)
  })

  enregistreur.handle(CANAUX.session.changerMotDePasse, async (_evenement, donnees) => {
    if (
      donnees === null ||
      donnees === undefined ||
      typeof donnees !== 'object' ||
      typeof (donnees as { ancienMotDePasse: unknown }).ancienMotDePasse !== 'string' ||
      typeof (donnees as { nouveauMotDePasse: unknown }).nouveauMotDePasse !== 'string'
    ) {
      throw new TypeError('« ancienMotDePasse » et « nouveauMotDePasse » doivent être des chaînes.')
    }
    const { ancienMotDePasse, nouveauMotDePasse } = donnees as {
      ancienMotDePasse: string
      nouveauMotDePasse: string
    }
    await changerMotDePasse(obtenirDossierUserData(), ancienMotDePasse, nouveauMotDePasse)
  })

  enregistreur.handle(CANAUX.session.activite, () => {
    compteurActivite.noterActivite()
  })
}
