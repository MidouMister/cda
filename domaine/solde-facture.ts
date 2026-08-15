import { Montant } from './montant'
import { verifierEntierNonNegatif, verifierEntierPositif } from './entites-referentielles'

// D17 — Solde de facture (décision 15/08/2026, §4.5.2) : une facture passe à
// PAYEE uniquement au solde nul (Σ encaissements = montant dû). Le dépôt
// (Phase D) appliquera cette règle à l'écriture des encaissements.
export const calculerSoldeFacture = (montantDuCentimes: number, encaissements: number[]): number => {
  verifierEntierNonNegatif(montantDuCentimes, 'montant dû en centimes')
  let totalEncaisse = Montant.depuisCentimes(0)
  for (const encaissement of encaissements) {
    verifierEntierPositif(encaissement, 'encaissement en centimes')
    totalEncaisse = totalEncaisse.additionner(Montant.depuisCentimes(encaissement))
  }
  return Montant.depuisCentimes(montantDuCentimes).soustraire(totalEncaisse).centimes
}

// Prédicat pour la Phase D : facture → PAYEE au solde nul. Un solde négatif est
// un sur-encaissement (interdit par les triggers de la base, migration 2).
export const estSoldeNul = (solde: number): boolean => {
  verifierEntierNonNegatif(solde, 'solde en centimes')
  return solde === 0
}
