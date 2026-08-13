/**
 * Point unique de la sémantique des montants en centimes.
 * Au J1 les valeurs sont stockées entières en base : les deux sens de
 * conversion sont une identité validée (entier sûr, jamais REAL), ce qui
 * garantit qu'aucun montant flottant ne traverse la frontière base ↔ domaine.
 */

const verifierEntier = (valeur: number, libelle: string): number => {
  if (typeof valeur !== 'number' || !Number.isSafeInteger(valeur)) {
    throw new TypeError(`« ${libelle} » doit être un entier (reçu : ${String(valeur)}).`)
  }
  return valeur
}

export const versCentimes = (nombreEntier: number): number =>
  verifierEntier(nombreEntier, 'montant en centimes avant écriture en base')

export const depuisCentimes = (valeurDb: number): number =>
  verifierEntier(valeurDb, 'montant en centimes lu depuis la base')
