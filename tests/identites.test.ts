import { describe, expect, it } from 'vitest'
import { Nif, Nis, NumeroDocument, Periode, Reference } from '../domaine/identites'

describe('NumeroDocument', () => {
  it('accepte un format générique valide', () => {
    const numero = NumeroDocument.depuisValeur('FA-2026-00001')
    expect(numero.valeur).toBe('FA-2026-00001')
    expect(numero.prefixe).toBe('FA')
    expect(numero.annee).toBe(2026)
    expect(numero.sequence).toBe('00001')
  })

  it('accepte un préfixe à trois lettres et des séquences plus longues', () => {
    expect(NumeroDocument.depuisValeur('DEV-2026-00042').prefixe).toBe('DEV')
    expect(NumeroDocument.depuisValeur('FA-2026-123456').sequence).toBe('123456')
    expect(NumeroDocument.depuisValeur('ST-2026-0001').valeur).toBe('ST-2026-0001')
  })

  it('refuse un préfixe de document inconnu', () => {
    expect(() => NumeroDocument.depuisValeur('ZZ-2026-00001')).toThrow(Error)
    expect(() => NumeroDocument.depuisValeur('CLI-2026-00001')).toThrow(Error)
  })

  it('refuse un format invalide', () => {
    expect(() => NumeroDocument.depuisValeur('fa-2026-00001')).toThrow()
    expect(() => NumeroDocument.depuisValeur('FA-26-00001')).toThrow()
    expect(() => NumeroDocument.depuisValeur('FA-2026-001')).toThrow()
    expect(() => NumeroDocument.depuisValeur('FA-2026-00001-EXTRA')).toThrow()
    expect(() => NumeroDocument.depuisValeur('FA202600001')).toThrow()
    expect(() => NumeroDocument.depuisValeur('')).toThrow()
  })

  it('refuse null et les non-chaînes', () => {
    expect(() => NumeroDocument.depuisValeur(null as unknown as string)).toThrow(TypeError)
    expect(() => NumeroDocument.depuisValeur(42 as unknown as string)).toThrow(TypeError)
  })
})

describe('Reference', () => {
  it('accepte les préfixes d’affaire AFG et AVT', () => {
    const reference = Reference.depuisValeur('AFG-2026-00012')
    expect(reference.valeur).toBe('AFG-2026-00012')
    expect(reference.prefixe).toBe('AFG')
    expect(reference.annee).toBe(2026)
    expect(reference.sequence).toBe('00012')
    expect(Reference.depuisValeur('AVT-2026-00003').prefixe).toBe('AVT')
  })

  it('refuse un préfixe d’affaire inconnu, y compris un code document', () => {
    expect(() => Reference.depuisValeur('XFG-2026-00001')).toThrow()
    expect(() => Reference.depuisValeur('DEV-2026-00001')).toThrow()
  })

  it('refuse un format invalide', () => {
    expect(() => Reference.depuisValeur('AFG-2026-1')).toThrow()
    expect(() => Reference.depuisValeur('afg-2026-00001')).toThrow()
    expect(() => Reference.depuisValeur('')).toThrow()
  })
})

describe('Nif', () => {
  it('accepte exactement 15 chiffres', () => {
    const nif = Nif.depuisValeur('099916012345678')
    expect(nif.valeur).toBe('099916012345678')
  })

  it('refuse 14 ou 16 chiffres', () => {
    expect(() => Nif.depuisValeur('09991601234567')).toThrow()
    expect(() => Nif.depuisValeur('0999160123456789')).toThrow()
  })

  it('refuse les lettres et les séparateurs', () => {
    expect(() => Nif.depuisValeur('09991601234567A')).toThrow()
    expect(() => Nif.depuisValeur('09991601 2345678')).toThrow()
    expect(() => Nif.depuisValeur('')).toThrow()
  })

  it('refuse null et les non-chaînes', () => {
    expect(() => Nif.depuisValeur(null as unknown as string)).toThrow(TypeError)
    expect(() => Nif.depuisValeur(9916012345678 as unknown as string)).toThrow(TypeError)
  })
})

describe('Nis', () => {
  it('accepte exactement 15 chiffres', () => {
    const nis = Nis.depuisValeur('099916012345678')
    expect(nis.valeur).toBe('099916012345678')
  })

  it('conserve les zéros initiaux (valeur texte, jamais convertie en nombre)', () => {
    const nis = Nis.depuisValeur('001234567890123')
    expect(nis.valeur).toBe('001234567890123')
  })

  it('refuse 11, 13 ou 16 chiffres', () => {
    expect(() => Nis.depuisValeur('09991601234')).toThrow()
    expect(() => Nis.depuisValeur('0999160123456')).toThrow()
    expect(() => Nis.depuisValeur('0999160123456789')).toThrow()
  })

  it('refuse les lettres', () => {
    expect(() => Nis.depuisValeur('09991601234A')).toThrow()
    expect(() => Nis.depuisValeur('A09916012345678')).toThrow()
  })

  it('refuse une chaîne vide et les non-chaînes', () => {
    expect(() => Nis.depuisValeur('')).toThrow()
    expect(() => Nis.depuisValeur(null as unknown as string)).toThrow(TypeError)
    expect(() => Nis.depuisValeur(9916012345678 as unknown as string)).toThrow(TypeError)
  })
})

describe('Periode', () => {
  it('accepte une période valide', () => {
    const periode = Periode.depuisValeurs('2026-01-15', '2026-03-31')
    expect(periode.debut).toBe('2026-01-15')
    expect(periode.fin).toBe('2026-03-31')
  })

  it('accepte une période réduite à un jour', () => {
    const periode = Periode.depuisValeurs('2026-05-10', '2026-05-10')
    expect(periode.debut).toBe('2026-05-10')
    expect(periode.fin).toBe('2026-05-10')
  })

  it('refuse une fin antérieure au début', () => {
    expect(() => Periode.depuisValeurs('2026-03-31', '2026-01-15')).toThrow()
  })

  it('refuse une date inexistante', () => {
    expect(() => Periode.depuisValeurs('2026-02-29', '2026-03-01')).toThrow()
    expect(() => Periode.depuisValeurs('2026-04-31', '2026-05-01')).toThrow()
    expect(() => Periode.depuisValeurs('2025-13-01', '2025-14-01')).toThrow()
  })

  it('accepte le 29 février des années bissextiles', () => {
    expect(Periode.depuisValeurs('2024-02-29', '2024-03-01').debut).toBe('2024-02-29')
  })

  it('refuse un format invalide', () => {
    expect(() => Periode.depuisValeurs('2025/01/01', '2025/02/01')).toThrow()
    expect(() => Periode.depuisValeurs('2025-1-1', '2025-2-1')).toThrow()
    expect(() => Periode.depuisValeurs('2025-01-00', '2025-02-01')).toThrow()
    expect(() => Periode.depuisValeurs('', '2025-02-01')).toThrow()
  })

  it('refuse null et les non-chaînes', () => {
    expect(() => Periode.depuisValeurs(null as unknown as string, '2026-01-01')).toThrow(TypeError)
  })

  it('construit une période mensuelle via deMois', () => {
    expect(Periode.deMois(2026, 2).debut).toBe('2026-02-01')
    expect(Periode.deMois(2026, 2).fin).toBe('2026-02-28')
    expect(Periode.deMois(2024, 2).fin).toBe('2024-02-29')
    expect(Periode.deMois(2026, 12).fin).toBe('2026-12-31')
  })

  it('deMois refuse une année ou un mois invalide', () => {
    expect(() => Periode.deMois(2026, 0)).toThrow()
    expect(() => Periode.deMois(2026, 13)).toThrow()
    expect(() => Periode.deMois(2026, 2.5)).toThrow(TypeError)
    expect(() => Periode.deMois(12000, 5)).toThrow()
  })
})
