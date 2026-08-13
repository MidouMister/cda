import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { lireExerciceCourant } from '../depots/depot-exercices'
import type { Exercice } from '../depots/depot-exercices'
import type { ExerciceVue } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperExerciceEnVue = (exercice: Exercice | null): ExerciceVue | null =>
  exercice === null
    ? null
    : {
        id: exercice.id,
        annee: exercice.annee,
        dateDebut: exercice.date_debut,
        dateFin: exercice.date_fin,
        statut: exercice.statut,
      }

export const enregistrerHandlersExercices = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.exercices.courant, () =>
    mapperExerciceEnVue(lireExerciceCourant(obtenirBase())),
  )
}
