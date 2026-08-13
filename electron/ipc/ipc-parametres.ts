import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { lireParametre, lireSeuilEspecesCentimes } from '../depots/depot-parametres'
import type { ParametreVue, SeuilEspecesVue } from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'

export const mapperParametreEnVue = (cle: string, valeur: string | null): ParametreVue | null =>
  valeur === null ? null : { cle, valeur, description: null }

export const mapperSeuilEspecesEnVue = (seuilCentimes: number): SeuilEspecesVue => ({
  seuilMaxEspecesCentimes: seuilCentimes,
})

export const enregistrerHandlersParametres = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.parametres.lire, (_evenement, cle) => {
    if (typeof cle !== 'string' || cle.trim() === '') {
      throw new TypeError('« clé » doit être une chaîne non vide.')
    }
    return mapperParametreEnVue(cle, lireParametre(obtenirBase(), cle))
  })
  enregistreur.handle(CANAUX.parametres.lireSeuilEspeces, () =>
    mapperSeuilEspecesEnVue(lireSeuilEspecesCentimes(obtenirBase())),
  )
}
