import {
  CODES_DOCUMENT,
  NumeroDocument,
  Reference,
  type CodeDocument,
} from './identites'

const ANNEE_MIN = 2000
const ANNEE_MAX = 2100
const LARGEUR_SEQUENCE = 4
const LARGEUR_SEQUENCE_ST_PAR_MARCHE = 3

export interface AttribuerNumeroParams {
  codeDocument: CodeDocument
  annee: number
  dernierNumero: number | null
  affaireId?: number | null
  formatStParMarche?: boolean
  referenceAffaire?: string
}

export interface ResultatAttribution {
  numero: string
  prochainDernierNumero: number
}

const verifierEntier = (valeur: number, libelle: string): void => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur)) {
    throw new TypeError(`« ${libelle} » doit être un entier (reçu : ${String(valeur)}).`)
  }
}

const verifierAnnee = (annee: number): void => {
  verifierEntier(annee, 'année')
  if (annee < ANNEE_MIN || annee > ANNEE_MAX) {
    throw new Error(`Année invalide (${annee}) — attendue entre ${ANNEE_MIN} et ${ANNEE_MAX}.`)
  }
}

const verifierCompteur = (dernierNumero: number): void => {
  verifierEntier(dernierNumero, 'dernier numéro')
  if (dernierNumero < 0) {
    throw new Error(`Dernier numéro négatif (${dernierNumero}) — le compteur ne peut pas être négatif.`)
  }
}

export const formaterNumero = (prefixe: string, annee: number, sequence: number): string =>
  `${prefixe}-${String(annee).padStart(4, '0')}-${String(sequence).padStart(LARGEUR_SEQUENCE, '0')}`

export const attribuerNumero = (params: AttribuerNumeroParams): ResultatAttribution => {
  const { codeDocument, annee, dernierNumero, affaireId, formatStParMarche, referenceAffaire } = params

  if (!CODES_DOCUMENT.includes(codeDocument)) {
    throw new Error(`Code de document « ${codeDocument} » inconnu (attendu parmi : ${CODES_DOCUMENT.join(', ')}).`)
  }
  verifierAnnee(annee)
  if (dernierNumero !== null) {
    verifierCompteur(dernierNumero)
  }

  if (formatStParMarche) {
    if (codeDocument !== 'ST') {
      throw new Error('Le format par marché n’est applicable qu’aux situations de travaux (code « ST »).')
    }
    if (affaireId === null || affaireId === undefined) {
      throw new Error('Un identifiant d’affaire est requis pour la numérotation ST par marché.')
    }
    if (referenceAffaire === null || referenceAffaire === undefined || referenceAffaire === '') {
      throw new Error('Une référence d’affaire est requise pour la numérotation ST par marché.')
    }
    Reference.depuisValeur(referenceAffaire)
    const sequence = (dernierNumero ?? 0) + 1
    return {
      numero: `ST-${referenceAffaire}-${String(sequence).padStart(LARGEUR_SEQUENCE_ST_PAR_MARCHE, '0')}`,
      prochainDernierNumero: sequence,
    }
  }

  const sequence = (dernierNumero ?? 0) + 1
  const numeroDocument = NumeroDocument.depuisValeur(formaterNumero(codeDocument, annee, sequence))
  return { numero: numeroDocument.valeur, prochainDernierNumero: sequence }
}

export const validerNumeroDocument = (valeur: string): boolean => {
  if (typeof valeur !== 'string') {
    return false
  }
  try {
    NumeroDocument.depuisValeur(valeur)
    return true
  } catch {
    return false
  }
}

export const numeroEstVerrouille = (numero: string | null): boolean => numero !== null
