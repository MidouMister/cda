import { describe, expect, it } from 'vitest'
import {
  creerMachineEtats,
  machineEtatsAffaire,
  machineEtatsDevis,
  machineEtatsFacture,
  transiter,
  type ActionAffaire,
  type ActionDevis,
  type ActionFacture,
} from '../domaine/machines-etats'
import type { StatutAffaire, StatutDevis } from '../domaine/entites-commerciales'
import type { StatutFacture } from '../domaine/entites-facturation'

describe('creerMachineEtats', () => {
  it('refuse un état source non déclaré dans la table de transitions', () => {
    expect(() => creerMachineEtats(['A', 'B'] as const, { C: { X: 'B' } } as never)).toThrow(/État source inconnu/)
  })

  it('refuse une transition vers un état non déclaré', () => {
    expect(() => creerMachineEtats(['A', 'B'] as const, { A: { X: 'C' } } as never)).toThrow(/état non déclaré/)
  })
})

describe('machineEtatsFacture', () => {
  it.each([
    ['BROUILLON', 'VALIDER', 'VALIDE'],
    ['VALIDE', 'IMPRIMER', 'IMPRIMEE'],
    ['IMPRIMEE', 'ENVOYER', 'ENVOYEE'],
    ['ENVOYEE', 'ENCAISSER', 'PAYEE'],
    ['PAYEE', 'ARCHIVER', 'ARCHIVEE'],
  ] as const)('accepte %s — %s → %s', (depuis, action, vers) => {
    expect(transiter(machineEtatsFacture, depuis, action)).toBe(vers)
  })

  it('enchaîne le cycle complet BROUILLON → ARCHIVEE', () => {
    const statut: StatutFacture = transiter(machineEtatsFacture, 'BROUILLON', 'VALIDER')
    expect(statut).toBe('VALIDE')
    const imprimée = transiter(machineEtatsFacture, statut, 'IMPRIMER')
    expect(imprimée).toBe('IMPRIMEE')
    const envoyée = transiter(machineEtatsFacture, imprimée, 'ENVOYER')
    const payée = transiter(machineEtatsFacture, envoyée, 'ENCAISSER')
    expect(payée).toBe('PAYEE')
    expect(transiter(machineEtatsFacture, payée, 'ARCHIVER')).toBe('ARCHIVEE')
  })

  it('ENCAISSER mène à PAYEE, le contrôle de solde nul restant externe à la machine', () => {
    // La machine autorise ENCAISSER → PAYEE ; la condition « solde nul
    // (Σ encaissements = montant dû) » est appliquée par le dépôt en Phase D
    // (D17), pas par la machine à états.
    expect(transiter(machineEtatsFacture, 'ENVOYEE', 'ENCAISSER')).toBe('PAYEE')
  })

  it.each([
    ['BROUILLON', 'ENCAISSER'],
    ['BROUILLON', 'ARCHIVER'],
    ['BROUILLON', 'IMPRIMER'],
    ['VALIDE', 'VALIDER'],
    ['VALIDE', 'ENVOYER'],
    ['IMPRIMEE', 'ENCAISSER'],
    ['IMPRIMEE', 'VALIDER'],
    ['ENVOYEE', 'ARCHIVER'],
    ['ENVOYEE', 'IMPRIMER'],
    ['PAYEE', 'IMPRIMER'],
    ['PAYEE', 'ENCAISSER'],
    ['ARCHIVEE', 'VALIDER'],
  ] as const)('refuse %s — %s', (depuis, action) => {
    expect(() => transiter(machineEtatsFacture, depuis, action)).toThrow(/Transition impossible/)
  })
})

describe('machineEtatsAffaire', () => {
  it.each([
    ['SIGNE', 'RECEVOIR_ODS', 'ODS_RECU'],
    ['SIGNE', 'DEMARRER', 'EN_COURS'],
    ['ODS_RECU', 'DEMARRER', 'EN_COURS'],
    ['EN_COURS', 'FACTURER', 'FACTURE'],
    ['EN_COURS', 'RESILIER', 'RESILIE'],
    ['FACTURE', 'SOLDER', 'SOLDE'],
    ['SOLDE', 'ARCHIVER', 'ARCHIVE'],
  ] as const)('accepte %s — %s → %s', (depuis, action, vers) => {
    expect(transiter(machineEtatsAffaire, depuis, action)).toBe(vers)
  })

  it('enchaîne le cycle complet d’un marché public SIGNE → ARCHIVE', () => {
    let statut: StatutAffaire = transiter(machineEtatsAffaire, 'SIGNE', 'RECEVOIR_ODS')
    expect(statut).toBe('ODS_RECU')
    statut = transiter(machineEtatsAffaire, statut, 'DEMARRER')
    expect(statut).toBe('EN_COURS')
    statut = transiter(machineEtatsAffaire, statut, 'FACTURER')
    expect(statut).toBe('FACTURE')
    statut = transiter(machineEtatsAffaire, statut, 'SOLDER')
    expect(statut).toBe('SOLDE')
    expect(transiter(machineEtatsAffaire, statut, 'ARCHIVER')).toBe('ARCHIVE')
  })

  it('enchaîne le cycle complet d’un contrat privé résilié SIGNE → RESILIE', () => {
    const statut: StatutAffaire = transiter(machineEtatsAffaire, 'SIGNE', 'DEMARRER')
    expect(statut).toBe('EN_COURS')
    expect(transiter(machineEtatsAffaire, statut, 'RESILIER')).toBe('RESILIE')
  })

  it.each([
    ['SIGNE', 'SOLDER'],
    ['SIGNE', 'FACTURER'],
    ['ODS_RECU', 'FACTURER'],
    ['ODS_RECU', 'RECEVOIR_ODS'],
    ['ODS_RECU', 'RESILIER'],
    ['EN_COURS', 'ARCHIVER'],
    ['EN_COURS', 'DEMARRER'],
    ['FACTURE', 'RESILIER'],
    ['FACTURE', 'FACTURER'],
    ['SOLDE', 'RESILIER'],
    ['SOLDE', 'SOLDER'],
    ['RESILIE', 'ARCHIVER'],
    ['RESILIE', 'DEMARRER'],
    ['ARCHIVE', 'DEMARRER'],
  ] as const)('refuse %s — %s', (depuis, action) => {
    expect(() => transiter(machineEtatsAffaire, depuis, action)).toThrow(/Transition impossible/)
  })
})

describe('machineEtatsDevis', () => {
  it.each([
    ['BROUILLON', 'ENVOYER', 'ENVOYE'],
    ['ENVOYE', 'ACCEPTER', 'ACCEPTE'],
    ['ENVOYE', 'REFUSER', 'REFUSE'],
    ['ENVOYE', 'EXPIRER', 'EXPIRE'],
  ] as const)('accepte %s — %s → %s', (depuis, action, vers) => {
    expect(transiter(machineEtatsDevis, depuis, action)).toBe(vers)
  })

  it('enchaîne le cycle complet BROUILLON → ACCEPTE', () => {
    const statut: StatutDevis = transiter(machineEtatsDevis, 'BROUILLON', 'ENVOYER')
    expect(statut).toBe('ENVOYE')
    expect(transiter(machineEtatsDevis, statut, 'ACCEPTER')).toBe('ACCEPTE')
  })

  it.each([
    ['BROUILLON', 'ACCEPTER'],
    ['BROUILLON', 'REFUSER'],
    ['BROUILLON', 'EXPIRER'],
    ['ENVOYE', 'ENVOYER'],
    ['ACCEPTE', 'REFUSER'],
    ['ACCEPTE', 'ENVOYER'],
    ['ACCEPTE', 'EXPIRER'],
    ['REFUSE', 'ENVOYER'],
    ['REFUSE', 'ACCEPTER'],
    ['EXPIRE', 'ACCEPTER'],
    ['EXPIRE', 'ENVOYER'],
  ] as const)('refuse %s — %s', (depuis, action) => {
    expect(() => transiter(machineEtatsDevis, depuis, action)).toThrow(/Transition impossible/)
  })
})

describe('cas d’erreur transverses', () => {
  it('refuse un état inconnu', () => {
    expect(() => transiter(machineEtatsFacture, 'INCONNU' as StatutFacture, 'VALIDER')).toThrow(/État inconnu/)
    expect(() => transiter(machineEtatsAffaire, 'INCONNU' as StatutAffaire, 'DEMARRER')).toThrow(/État inconnu/)
    expect(() => transiter(machineEtatsDevis, 'INCONNU' as StatutDevis, 'ENVOYER')).toThrow(/État inconnu/)
  })

  it('refuse une action inconnue', () => {
    expect(() => transiter(machineEtatsFacture, 'BROUILLON', 'SUPPRIMER' as ActionFacture)).toThrow(/Action inconnue/)
    expect(() => transiter(machineEtatsAffaire, 'SIGNE', 'VALIDER' as ActionAffaire)).toThrow(/Action inconnue/)
    expect(() => transiter(machineEtatsDevis, 'BROUILLON', 'VALIDER' as ActionDevis)).toThrow(/Action inconnue/)
  })
})
