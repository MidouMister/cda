export const arrondirHalfUp = (n: number): number => {
  if (!Number.isFinite(n)) {
    throw new TypeError(`arrondirHalfUp : valeur non finie (reçue : ${String(n)}).`)
  }
  return Math.floor(n + 0.5)
}

const verifierEntier = (valeur: number, libelle: string): void => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur)) {
    throw new TypeError(`« ${libelle} » doit être un entier (reçu : ${String(valeur)}).`)
  }
}

const verifierProduitEntier = (produit: number, libelle: string): void => {
  if (!Number.isSafeInteger(produit)) {
    throw new RangeError(`Le produit ${libelle} dépasse la plage des entiers sûrs.`)
  }
}

const diviserArrondiHalfUp = (numerateur: number, denominateur: number): number => {
  const moitie = denominateur / 2
  return Math.floor((numerateur + moitie) / denominateur)
}

export class Montant {
  private constructor(private readonly _centimes: number) {}

  static depuisCentimes(entier: number): Montant {
    verifierEntier(entier, 'montant en centimes')
    return new Montant(entier)
  }

  get centimes(): number {
    return this._centimes
  }

  additionner(autre: Montant): Montant {
    return Montant.depuisCentimes(this._centimes + autre.centimes)
  }

  soustraire(autre: Montant): Montant {
    return Montant.depuisCentimes(this._centimes - autre.centimes)
  }

  appliquerTauxBps(bps: number): Montant {
    verifierEntier(bps, 'taux en points de base')
    const produit = this._centimes * bps
    verifierProduitEntier(produit, `${this._centimes} × ${bps}`)
    return Montant.depuisCentimes(diviserArrondiHalfUp(produit, 10000))
  }

  foisQuantiteMilliemes(milliemes: number): Montant {
    verifierEntier(milliemes, 'quantité en millièmes')
    const produit = this._centimes * milliemes
    verifierProduitEntier(produit, `${this._centimes} × ${milliemes}`)
    return Montant.depuisCentimes(diviserArrondiHalfUp(produit, 1000))
  }

  opposer(): Montant {
    return Montant.depuisCentimes(-this._centimes)
  }

  absolu(): Montant {
    return Montant.depuisCentimes(Math.abs(this._centimes))
  }

  estEgal(autre: Montant): boolean {
    return this._centimes === autre.centimes
  }

  estInferieurA(autre: Montant): boolean {
    return this._centimes < autre.centimes
  }

  estSuperieurA(autre: Montant): boolean {
    return this._centimes > autre.centimes
  }

  estInferieurOuEgalA(autre: Montant): boolean {
    return this._centimes <= autre.centimes
  }

  estSuperieurOuEgalA(autre: Montant): boolean {
    return this._centimes >= autre.centimes
  }

  formatEnDinars(): string {
    const signe = this._centimes < 0 ? '-' : ''
    const valeur = Math.abs(this._centimes)
    const entiers = Math.floor(valeur / 100)
    const centimes = valeur % 100
    const entiersGroupes = entiers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${signe}${entiersGroupes},${centimes.toString().padStart(2, '0')} DA`
  }
}

export const montantDepuisBps = (base: Montant, bps: number): Montant =>
  base.appliquerTauxBps(bps)
