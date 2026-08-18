import { describe, expect, it } from 'vitest'
import { resoudreTarif, type ParametresResolutionTarif } from '../domaine/tarifs'
import { Tarif } from '../domaine/entites-referentielles'

const tarifAffaire = (opts: Partial<{ id: number; produitId: number; affaireId: number; prix: number; debut: string; fin: string | undefined }> = {}) =>
  Tarif.depuisDonnees({
    id: opts.id ?? 1,
    produit_id: opts.produitId ?? 1,
    type_niveau: 'AFFAIRE',
    affaire_id: opts.affaireId ?? 10,
    prix_centimes: opts.prix ?? 50000,
    debut_periode: opts.debut ?? '2026-01-01',
    fin_periode: opts.fin,
  })

const tarifClient = (opts: Partial<{ id: number; produitId: number; clientId: number; prix: number; debut: string; fin: string | undefined }> = {}) =>
  Tarif.depuisDonnees({
    id: opts.id ?? 2,
    produit_id: opts.produitId ?? 1,
    type_niveau: 'CLIENT',
    client_id: opts.clientId ?? 20,
    prix_centimes: opts.prix ?? 45000,
    debut_periode: opts.debut ?? '2026-01-01',
    fin_periode: opts.fin,
  })

const tarifCatalogue = (opts: Partial<{ id: number; produitId: number; prix: number; debut: string; fin: string | undefined }> = {}) =>
  Tarif.depuisDonnees({
    id: opts.id ?? 3,
    produit_id: opts.produitId ?? 1,
    type_niveau: 'CATALOGUE',
    prix_centimes: opts.prix ?? 40000,
    debut_periode: opts.debut ?? '2026-01-01',
    fin_periode: opts.fin,
  })

const paramsBase: Omit<ParametresResolutionTarif, 'tarifs'> = {
  produitId: 1,
  puReferenceCentimes: 35000,
  clientId: 20,
  affaireId: 10,
  dateLigne: '2026-06-15',
}

describe('resoudreTarif', () => {
  it('cascade : affaire > client > catalogue > reference', () => {
    const tarifs = [tarifCatalogue(), tarifClient(), tarifAffaire()]
    const resultat = resoudreTarif({ ...paramsBase, tarifs })
    expect(resultat.source).toBe('AFFAIRE')
    expect(resultat.prixUnitaire.centimes).toBe(50000)
    expect(resultat.tarifId).toBe(1)
  })

  it('retourne le tarif catalogue quand seul le catalogue existe', () => {
    const tarifs = [tarifCatalogue()]
    const resultat = resoudreTarif({ ...paramsBase, tarifs })
    expect(resultat.source).toBe('CATALOGUE')
    expect(resultat.prixUnitaire.centimes).toBe(40000)
    expect(resultat.tarifId).toBe(3)
  })

  it('retourne la reference quand aucun tarif nexiste', () => {
    const resultat = resoudreTarif({ ...paramsBase, tarifs: [] })
    expect(resultat.source).toBe('REFERENCE')
    expect(resultat.prixUnitaire.centimes).toBe(35000)
    expect(resultat.tarifId).toBeNull()
  })

  it('tarif affaire sans affaireId correspondant descend au client', () => {
    const tarifs = [tarifClient(), tarifAffaire({ affaireId: 99 })]
    const resultat = resoudreTarif({ ...paramsBase, tarifs })
    expect(resultat.source).toBe('CLIENT')
    expect(resultat.prixUnitaire.centimes).toBe(45000)
    expect(resultat.tarifId).toBe(2)
  })

  it('tarif client sans clientId correspondant descend au catalogue', () => {
    const tarifs = [tarifCatalogue(), tarifClient({ clientId: 99 })]
    const resultat = resoudreTarif({ ...paramsBase, tarifs })
    expect(resultat.source).toBe('CATALOGUE')
    expect(resultat.prixUnitaire.centimes).toBe(40000)
    expect(resultat.tarifId).toBe(3)
  })

  it('periode englobante : date dans la periode correspondance', () => {
    const tarifs = [tarifCatalogue({ debut: '2026-01-01', fin: '2026-12-31' })]
    const resultat = resoudreTarif({ ...paramsBase, tarifs, dateLigne: '2026-06-15' })
    expect(resultat.source).toBe('CATALOGUE')
    expect(resultat.tarifId).toBe(3)
  })

  it('date avant debut_periode pas de correspondance a ce niveau', () => {
    const tarifs = [tarifCatalogue({ debut: '2026-07-01', fin: '2026-12-31' })]
    const resultat = resoudreTarif({ ...paramsBase, tarifs, dateLigne: '2026-06-15' })
    expect(resultat.source).toBe('REFERENCE')
    expect(resultat.tarifId).toBeNull()
  })

  it('date apres fin_periode pas de correspondance a ce niveau', () => {
    const tarifs = [tarifCatalogue({ debut: '2026-01-01', fin: '2026-05-31' })]
    const resultat = resoudreTarif({ ...paramsBase, tarifs, dateLigne: '2026-06-15' })
    expect(resultat.source).toBe('REFERENCE')
    expect(resultat.tarifId).toBeNull()
  })

  it('fin_periode null ouverte : debut_periode <= dateLigne toujours valide', () => {
    const tarifs = [tarifCatalogue({ debut: '2026-01-01', fin: undefined })]
    const resultat = resoudreTarif({ ...paramsBase, tarifs, dateLigne: '2030-12-31' })
    expect(resultat.source).toBe('CATALOGUE')
    expect(resultat.prixUnitaire.centimes).toBe(40000)
  })

  it('plusieurs tarifs au meme niveau : le plus recent debut_periode gagne', () => {
    const ancien = tarifCatalogue({ id: 10, prix: 30000, debut: '2025-01-01', fin: '2026-12-31' })
    const recent = tarifCatalogue({ id: 11, prix: 42000, debut: '2026-06-01', fin: '2026-12-31' })
    const resultat = resoudreTarif({ ...paramsBase, tarifs: [ancien, recent], dateLigne: '2026-06-15' })
    expect(resultat.source).toBe('CATALOGUE')
    expect(resultat.prixUnitaire.centimes).toBe(42000)
    expect(resultat.tarifId).toBe(11)
  })

  it('tarif affaire present mais affaireId non fourni : niveau affaire saute', () => {
    const tarifs = [tarifAffaire(), tarifClient()]
    const resultat = resoudreTarif({ ...paramsBase, affaireId: undefined, tarifs })
    expect(resultat.source).toBe('CLIENT')
    expect(resultat.tarifId).toBe(2)
  })

  it('tarif client present mais clientId non fourni : niveau client saute', () => {
    const tarifs = [tarifClient(), tarifCatalogue()]
    const resultat = resoudreTarif({ ...paramsBase, clientId: undefined, tarifs })
    expect(resultat.source).toBe('CATALOGUE')
    expect(resultat.tarifId).toBe(3)
  })

  it('erreur : produitId pas un entier positif', () => {
    expect(() => resoudreTarif({ ...paramsBase, tarifs: [], produitId: 0 })).toThrow(TypeError)
  })

  it('erreur : dateLigne format invalide', () => {
    expect(() => resoudreTarif({ ...paramsBase, tarifs: [], dateLigne: '15/06/2026' })).toThrow(Error)
  })

  it('erreur : puReferenceCentimes negatif', () => {
    expect(() => resoudreTarif({ ...paramsBase, tarifs: [], puReferenceCentimes: -100 })).toThrow(TypeError)
  })
})
