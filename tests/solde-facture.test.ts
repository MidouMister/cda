import { describe, expect, it } from 'vitest'
import { calculerSoldeFacture, estSoldeNul } from '../domaine/solde-facture'

describe('calculerSoldeFacture (D17)', () => {
  it('solde exact : montant dû − Σ encaissements', () => {
    expect(calculerSoldeFacture(100000, [40000, 35000])).toBe(25000)
  })

  it('solde nul : les encaissements couvrent exactement le montant dû', () => {
    expect(calculerSoldeFacture(75000, [25000, 50000])).toBe(0)
  })

  it('aucun encaissement → le solde reste le montant dû', () => {
    expect(calculerSoldeFacture(50000, [])).toBe(50000)
  })

  it('refuse un montant dû négatif', () => {
    expect(() => calculerSoldeFacture(-1, [])).toThrow(TypeError)
  })

  it('refuse un montant dû flottant', () => {
    expect(() => calculerSoldeFacture(100.5, [])).toThrow(TypeError)
  })

  it('refuse un encaissement nul', () => {
    expect(() => calculerSoldeFacture(1000, [0])).toThrow(TypeError)
  })

  it('refuse un encaissement négatif', () => {
    expect(() => calculerSoldeFacture(1000, [-500])).toThrow(TypeError)
  })

  it('refuse un encaissement flottant', () => {
    expect(() => calculerSoldeFacture(1000, [100.5])).toThrow(TypeError)
  })
})

describe('estSoldeNul (D17 — Phase D : facture → PAYEE au solde nul)', () => {
  it('vrai au solde nul', () => {
    expect(estSoldeNul(0)).toBe(true)
  })

  it('faux au solde positif restant', () => {
    expect(estSoldeNul(25000)).toBe(false)
  })

  it('refuse un solde négatif (sur-encaissement interdit par la base)', () => {
    expect(() => estSoldeNul(-1)).toThrow(TypeError)
  })
})
