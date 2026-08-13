import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { listerFamillesActives } from '../depots/depot-familles'
import type { Famille } from '../depots/depot-familles'
import type { FamilleVue } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperFamilleEnVue = (famille: Famille): FamilleVue => ({
  id: famille.id,
  code: famille.code,
  libelle: famille.libelle,
  ordre: famille.ordre,
})

export const enregistrerHandlersFamilles = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.familles.lister, () =>
    listerFamillesActives(obtenirBase()).map(mapperFamilleEnVue),
  )
}
