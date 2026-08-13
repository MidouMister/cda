import { describe, expect, it } from 'vitest'
import { NumeroDocument, type CodeDocument } from '../domaine/identites'
import {
  attribuerNumero,
  formaterNumero,
  numeroEstVerrouille,
  validerNumeroDocument,
} from '../domaine/numerotation'

describe('formaterNumero', () => {
  it('formate avec une séquence à quatre chiffres minimum', () => {
    expect(formaterNumero('FA', 2026, 1)).toBe('FA-2026-0001')
    expect(formaterNumero('FA', 2026, 12345)).toBe('FA-2026-12345')
  })

  it('formate un préfixe à trois lettres', () => {
    expect(formaterNumero('DEV', 2026, 42)).toBe('DEV-2026-0042')
  })
})

describe('attribuerNumero', () => {
  it('retourne le numéro suivant quand le compteur existe', () => {
    const attribution = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: 5 })
    expect(attribution.numero).toBe('FA-2026-0006')
    expect(attribution.prochainDernierNumero).toBe(6)
  })

  it('démarre à 0001 quand aucun compteur n’existe', () => {
    expect(attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: null })).toEqual({
      numero: 'FA-2026-0001',
      prochainDernierNumero: 1,
    })
  })

  it('démarre à 0001 avec un compteur à zéro (défaut du schéma)', () => {
    expect(attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: 0 }).numero).toBe('FA-2026-0001')
  })

  it('formate le numéro avec une séquence d’au moins quatre chiffres, lisible par NumeroDocument', () => {
    const attribution = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: null })
    expect(attribution.numero).toMatch(/^[A-Z]{2,3}-\d{4}-\d{4,}$/)
    const numero = NumeroDocument.depuisValeur(attribution.numero)
    expect(numero.valeur).toBe(attribution.numero)
    expect(numero.sequence).toBe('0001')
    expect(numero.sequence.length).toBeGreaterThanOrEqual(4)
    expect(validerNumeroDocument(attribution.numero)).toBe(true)
  })

  it('produit une séquence sans trou sur trois attributions successives', () => {
    let dernierNumero: number | null = null
    const numeros: string[] = []
    for (let i = 0; i < 3; i++) {
      const attribution = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero })
      numeros.push(attribution.numero)
      dernierNumero = attribution.prochainDernierNumero
    }
    expect(numeros).toEqual(['FA-2026-0001', 'FA-2026-0002', 'FA-2026-0003'])
    expect(dernierNumero).toBe(3)
  })

  it('n’avance pas le compteur par effet de bord (fonction pure)', () => {
    const premier = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: 4 })
    const second = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: 4 })
    expect(premier).toEqual(second)
    expect(premier.numero).toBe('FA-2026-0005')
  })

  it('un brouillon ne consomme pas de numéro', () => {
    const compteur = 7
    const brouillon = { numero: null as string | null, compteur }
    expect(numeroEstVerrouille(brouillon.numero)).toBe(false)
    const attribution = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: compteur })
    expect(attribution.numero).toBe('FA-2026-0008')
    expect(brouillon.compteur).toBe(7)
  })

  it('numérote une facture FA', () => {
    const attribution = attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: 6 })
    expect(attribution.numero).toBe('FA-2026-0007')
    expect(validerNumeroDocument(attribution.numero)).toBe(true)
  })

  it('numérote un bon de livraison BL', () => {
    const attribution = attribuerNumero({ codeDocument: 'BL', annee: 2026, dernierNumero: null })
    expect(attribution.numero).toBe('BL-2026-0001')
    expect(validerNumeroDocument(attribution.numero)).toBe(true)
  })

  it('numérote un devis DEV (préfixe à trois lettres)', () => {
    const attribution = attribuerNumero({ codeDocument: 'DEV', annee: 2026, dernierNumero: 2 })
    expect(attribution.numero).toBe('DEV-2026-0003')
    expect(validerNumeroDocument(attribution.numero)).toBe(true)
  })
})

describe('numérotation ST par marché (Phase 2, interface préparée)', () => {
  it('numérote une situation de travaux par référence d’affaire', () => {
    const attribution = attribuerNumero({
      codeDocument: 'ST',
      annee: 2026,
      dernierNumero: 2,
      affaireId: 12,
      formatStParMarche: true,
      referenceAffaire: 'AFG-2026-00012',
    })
    expect(attribution.numero).toBe('ST-AFG-2026-00012-003')
    expect(attribution.prochainDernierNumero).toBe(3)
  })

  it('exige une référence d’affaire', () => {
    expect(() =>
      attribuerNumero({
        codeDocument: 'ST',
        annee: 2026,
        dernierNumero: null,
        affaireId: 12,
        formatStParMarche: true,
      }),
    ).toThrowError(/référence d’affaire/)
  })

  it('exige un identifiant d’affaire', () => {
    expect(() =>
      attribuerNumero({
        codeDocument: 'ST',
        annee: 2026,
        dernierNumero: null,
        formatStParMarche: true,
        referenceAffaire: 'AFG-2026-00012',
      }),
    ).toThrowError(/identifiant d’affaire/)
  })

  it('refuse le format par marché hors ST', () => {
    expect(() =>
      attribuerNumero({
        codeDocument: 'FA',
        annee: 2026,
        dernierNumero: null,
        affaireId: 12,
        formatStParMarche: true,
        referenceAffaire: 'AFG-2026-00012',
      }),
    ).toThrowError(/situations de travaux/)
  })

  it('refuse une référence d’affaire invalide', () => {
    expect(() =>
      attribuerNumero({
        codeDocument: 'ST',
        annee: 2026,
        dernierNumero: null,
        affaireId: 12,
        formatStParMarche: true,
        referenceAffaire: 'XFG-2026-00012',
      }),
    ).toThrow(Error)
  })
})

describe('verrouillage', () => {
  it('un numéro non nul est verrouillé', () => {
    expect(numeroEstVerrouille('FA-2026-0001')).toBe(true)
  })

  it('un numéro nul (brouillon) n’est pas verrouillé', () => {
    expect(numeroEstVerrouille(null)).toBe(false)
  })
})

describe('erreurs', () => {
  it('refuse une année hors 2000-2100', () => {
    expect(() => attribuerNumero({ codeDocument: 'FA', annee: 1999, dernierNumero: null })).toThrowError(
      /Année invalide/,
    )
    expect(() => attribuerNumero({ codeDocument: 'FA', annee: 2101, dernierNumero: null })).toThrowError(
      /Année invalide/,
    )
  })

  it('refuse une année non entière', () => {
    expect(() => attribuerNumero({ codeDocument: 'FA', annee: 2026.5, dernierNumero: null })).toThrow(TypeError)
  })

  it('refuse un dernier numéro négatif', () => {
    expect(() => attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: -1 })).toThrowError(
      /Dernier numéro négatif/,
    )
  })

  it('refuse un dernier numéro non entier', () => {
    expect(() => attribuerNumero({ codeDocument: 'FA', annee: 2026, dernierNumero: 1.5 })).toThrow(TypeError)
  })

  it('refuse un code de document inconnu', () => {
    expect(() =>
      attribuerNumero({ codeDocument: 'ZZ' as CodeDocument, annee: 2026, dernierNumero: null }),
    ).toThrowError(/inconnu/)
  })
})

describe('validerNumeroDocument', () => {
  it('valide un numéro générique', () => {
    expect(validerNumeroDocument('FA-2026-0001')).toBe(true)
    expect(validerNumeroDocument('DEV-2026-0042')).toBe(true)
  })

  it('n’accepte pas le format ST par marché (format spécifique, Phase 2)', () => {
    expect(validerNumeroDocument('ST-AFG-2026-00012-003')).toBe(false)
  })

  it('refuse un préfixe inconnu, un format invalide ou une non-chaîne', () => {
    expect(validerNumeroDocument('ZZ-2026-0001')).toBe(false)
    expect(validerNumeroDocument('FA-2026-1')).toBe(false)
    expect(validerNumeroDocument('')).toBe(false)
    expect(validerNumeroDocument(null as unknown as string)).toBe(false)
    expect(validerNumeroDocument(42 as unknown as string)).toBe(false)
  })
})
