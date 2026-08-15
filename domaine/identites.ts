export const CODES_DOCUMENT = ['FA', 'AC', 'AV', 'FS', 'ND', 'BL', 'DEV', 'ST', 'ENC'] as const
export type CodeDocument = (typeof CODES_DOCUMENT)[number]

export const PREFIXES_AFFAIRE = ['AFG', 'AVT'] as const

const MOTIF_NUMERO = /^([A-Z]{2,3})-(\d{4})-(\d{4,})$/
const MOTIF_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const MOTIF_NIF = /^\d{15}$/
const MOTIF_NIS = /^\d{15}$/

const JOURS_PAR_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

const estBissextile = (annee: number): boolean =>
  (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0

const joursDansLeMois = (annee: number, mois: number): number =>
  mois === 2 && estBissextile(annee) ? 29 : JOURS_PAR_MOIS[mois - 1]

const verifierChaine = (valeur: string, libelle: string): void => {
  if (typeof valeur !== 'string') {
    throw new TypeError(`« ${libelle} » doit être une chaîne (reçu : ${String(valeur)}).`)
  }
}

const prefixeValide = (prefixe: string, liste: readonly string[]): boolean =>
  liste.includes(prefixe)

const decouperNumero = (
  valeur: string,
  libelle: string,
): { prefixe: string; annee: string; sequence: string } => {
  verifierChaine(valeur, libelle)
  const correspondance = MOTIF_NUMERO.exec(valeur)
  if (correspondance === null) {
    throw new Error(`« ${libelle} » : format invalide « ${valeur} » (attendu : PRÉFIXE-AAAA-SÉQUENCE).`)
  }
  return { prefixe: correspondance[1], annee: correspondance[2], sequence: correspondance[3] }
}

export class NumeroDocument {
  private constructor(
    private readonly _prefixe: string,
    private readonly _annee: number,
    private readonly _sequence: string,
  ) {}

  static depuisValeur(valeur: string): NumeroDocument {
    const { prefixe, annee, sequence } = decouperNumero(valeur, 'numéro de document')
    if (!prefixeValide(prefixe, CODES_DOCUMENT)) {
      throw new Error(`« numéro de document » : préfixe « ${prefixe} » inconnu (attendu parmi : ${CODES_DOCUMENT.join(', ')}).`)
    }
    return new NumeroDocument(prefixe, Number(annee), sequence)
  }

  get valeur(): string {
    return `${this._prefixe}-${String(this._annee).padStart(4, '0')}-${this._sequence}`
  }

  get prefixe(): string {
    return this._prefixe
  }

  get annee(): number {
    return this._annee
  }

  get sequence(): string {
    return this._sequence
  }
}

export class Reference {
  private constructor(
    private readonly _prefixe: string,
    private readonly _annee: number,
    private readonly _sequence: string,
  ) {}

  static depuisValeur(valeur: string): Reference {
    const { prefixe, annee, sequence } = decouperNumero(valeur, 'référence d’affaire')
    if (!prefixeValide(prefixe, PREFIXES_AFFAIRE)) {
      throw new Error(`« référence d’affaire » : préfixe « ${prefixe} » inconnu (attendu parmi : ${PREFIXES_AFFAIRE.join(', ')}).`)
    }
    return new Reference(prefixe, Number(annee), sequence)
  }

  get valeur(): string {
    return `${this._prefixe}-${String(this._annee).padStart(4, '0')}-${this._sequence}`
  }

  get prefixe(): string {
    return this._prefixe
  }

  get annee(): number {
    return this._annee
  }

  get sequence(): string {
    return this._sequence
  }
}

export class Nif {
  private constructor(private readonly _valeur: string) {}

  static depuisValeur(valeur: string): Nif {
    verifierChaine(valeur, 'NIF')
    if (!MOTIF_NIF.test(valeur)) {
      throw new Error('« NIF » doit contenir exactement 15 chiffres, sans séparateur.')
    }
    return new Nif(valeur)
  }

  get valeur(): string {
    return this._valeur
  }
}

export class Nis {
  private constructor(private readonly _valeur: string) {}

  static depuisValeur(valeur: string): Nis {
    verifierChaine(valeur, 'NIS')
    if (!MOTIF_NIS.test(valeur)) {
      throw new Error('« NIS » doit contenir exactement 15 chiffres, sans séparateur.')
    }
    return new Nis(valeur)
  }

  get valeur(): string {
    return this._valeur
  }
}

const analyserDate = (
  valeur: string,
  libelle: string,
): { annee: number; mois: number; jour: number } => {
  verifierChaine(valeur, libelle)
  const correspondance = MOTIF_DATE.exec(valeur)
  if (correspondance === null) {
    throw new Error(`« ${libelle} » : format invalide « ${valeur} » (attendu : AAAA-MM-JJ).`)
  }
  const annee = Number(correspondance[1])
  const mois = Number(correspondance[2])
  const jour = Number(correspondance[3])
  if (mois < 1 || mois > 12) {
    throw new Error(`« ${libelle} » : mois invalide (${mois}).`)
  }
  if (jour < 1 || jour > joursDansLeMois(annee, mois)) {
    throw new Error(`« ${libelle} » : jour invalide (${jour}) pour le mois indiqué.`)
  }
  return { annee, mois, jour }
}

export class Periode {
  private constructor(
    private readonly _debut: string,
    private readonly _fin: string,
  ) {}

  static depuisValeurs(debut: string, fin: string): Periode {
    analyserDate(debut, 'date de début')
    analyserDate(fin, 'date de fin')
    if (fin < debut) {
      throw new Error('La date de fin est antérieure à la date de début.')
    }
    return new Periode(debut, fin)
  }

  static deMois(annee: number, mois: number): Periode {
    if (!Number.isSafeInteger(annee) || !Number.isSafeInteger(mois)) {
      throw new TypeError('Periode.deMois : l’année et le mois doivent être des entiers.')
    }
    if (annee < 0 || annee > 9999) {
      throw new Error(`Periode.deMois : année invalide (${annee}).`)
    }
    if (mois < 1 || mois > 12) {
      throw new Error(`Periode.deMois : mois invalide (${mois}).`)
    }
    const debut = `${String(annee).padStart(4, '0')}-${String(mois).padStart(2, '0')}-01`
    const fin = `${String(annee).padStart(4, '0')}-${String(mois).padStart(2, '0')}-${String(joursDansLeMois(annee, mois)).padStart(2, '0')}`
    return new Periode(debut, fin)
  }

  get debut(): string {
    return this._debut
  }

  get fin(): string {
    return this._fin
  }
}
