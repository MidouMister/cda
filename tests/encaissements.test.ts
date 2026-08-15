import { describe, expect, it } from 'vitest'
import { Encaissement, STATUTS_TIMBRE, type DonneesEncaissement } from '../domaine/encaissements'
import {
  MODES_REGLEMENT_EFFECTIFS,
  type ModeReglementEffectif,
} from '../domaine/entites-referentielles'

const donneesValides = (): DonneesEncaissement => ({
  id: 1,
  facture_id: 10,
  numero: 'ENC-2026-00001',
  montant_encaisse_centimes: 150000,
  date_encaissement: '2026-08-15',
  mode_reglement_effectif: 'CHEQUE',
})

const construire = (partiel: Partial<DonneesEncaissement> = {}): Encaissement =>
  Encaissement.depuisDonnees({ ...donneesValides(), ...partiel })

describe('Encaissement — champs obligatoires', () => {
  it('construit un encaissement valide minimal', () => {
    const encaissement = construire()
    expect(encaissement.id).toBe(1)
    expect(encaissement.facture_id).toBe(10)
    expect(encaissement.numero).toBe('ENC-2026-00001')
    expect(encaissement.montant_encaisse_centimes).toBe(150000)
    expect(encaissement.date_encaissement).toBe('2026-08-15')
    expect(encaissement.mode_reglement_effectif).toBe('CHEQUE')
    expect(encaissement.timbre_statut).toBe('A_VERIFIER')
  })

  it('rejette un montant encaissé nul ou négatif', () => {
    expect(() => construire({ montant_encaisse_centimes: 0 })).toThrow()
    expect(() => construire({ montant_encaisse_centimes: -5 })).toThrow()
  })

  it('rejette un numéro vide et des identifiants non positifs', () => {
    expect(() => construire({ numero: '' })).toThrow()
    expect(() => construire({ id: 0 })).toThrow()
    expect(() => construire({ facture_id: 0 })).toThrow()
  })
})

describe('Encaissement — date d’encaissement', () => {
  it('accepte une date ISO AAAA-MM-JJ valide', () => {
    expect(construire({ date_encaissement: '2026-08-15' }).date_encaissement).toBe('2026-08-15')
  })

  it.each([
    '2026-02-30',
    '2026-99-99',
    '2026-13-01',
    '15/08/2026',
    '2026-8-5',
    '',
  ])('rejette la date impossible ou mal formée %s', (dateInvalide) => {
    expect(() => construire({ date_encaissement: dateInvalide })).toThrow()
  })

  it('rejette un jour inexistant en tenant compte du calendrier', () => {
    expect(() => construire({ date_encaissement: '2026-04-31' })).toThrow()
  })
})

describe('Encaissement — mode de règlement effectif', () => {
  it.each(MODES_REGLEMENT_EFFECTIFS)('accepte le mode effectif %s', (mode) => {
    expect(construire({ mode_reglement_effectif: mode }).mode_reglement_effectif).toBe(mode)
  })

  it.each(['VIREMENT', 'TRAITE', 'LCN'] as const)('refuse le mode %s comme mode effectif', (mode) => {
    expect(() => construire({ mode_reglement_effectif: mode as ModeReglementEffectif })).toThrow(
      /mode de règlement effectif/,
    )
  })
})

describe('Encaissement — statut du timbre', () => {
  it('par défaut, le timbre est A_VERIFIER', () => {
    expect(construire().timbre_statut).toBe('A_VERIFIER')
  })

  it.each(STATUTS_TIMBRE)('accepte le statut %s', (statut) => {
    const complement = statut === 'TRAITE'
      ? { montant_timbre_saisi_centimes: 500, timbre_traite_le: '2026-08-16', timbre_traite_par: 'Sami' }
      : {}
    expect(construire({ timbre_statut: statut, ...complement }).timbre_statut).toBe(statut)
  })

  it('refuse un statut de timbre inconnu', () => {
    expect(() => construire({ timbre_statut: 'VALIDE' as 'A_VERIFIER' })).toThrow(/statut du timbre/)
  })

  it('refuse un montant de timbre négatif', () => {
    expect(() => construire({ montant_timbre_saisi_centimes: -1 })).toThrow()
  })
})

describe('Encaissement — contraintes conditionnelles du timbre', () => {
  it('NON_APPLICABLE : accepte sans aucun champ de traitement', () => {
    expect(
      construire({ timbre_statut: 'NON_APPLICABLE' }).timbre_statut,
    ).toBe('NON_APPLICABLE')
  })

  it.each([
    { montant_timbre_saisi_centimes: 500 },
    { reference_timbre_ou_quittance: 'QUIT-2026-0001' },
    { timbre_traite_le: '2026-08-16' },
    { timbre_traite_par: 'Sami' },
  ])('NON_APPLICABLE : rejette un champ de traitement renseigné', (champ) => {
    expect(() => construire({ timbre_statut: 'NON_APPLICABLE', ...champ })).toThrow(/NON_APPLICABLE/)
  })

  it('TRAITE : accepte un traitement complet sans référence (référence facultative)', () => {
    const encaissement = construire({
      timbre_statut: 'TRAITE',
      montant_timbre_saisi_centimes: 500,
      timbre_traite_le: '2026-08-16',
      timbre_traite_par: 'Sami',
    })
    expect(encaissement.montant_timbre_saisi_centimes).toBe(500)
    expect(encaissement.timbre_traite_le).toBe('2026-08-16')
    expect(encaissement.timbre_traite_par).toBe('Sami')
    expect(encaissement.reference_timbre_ou_quittance).toBeNull()
  })

  it('TRAITE : accepte la référence de quittance lorsqu’elle est fournie', () => {
    const encaissement = construire({
      timbre_statut: 'TRAITE',
      montant_timbre_saisi_centimes: 500,
      timbre_traite_le: '2026-08-16',
      timbre_traite_par: 'Sami',
      reference_timbre_ou_quittance: 'QUIT-2026-0001',
    })
    expect(encaissement.reference_timbre_ou_quittance).toBe('QUIT-2026-0001')
  })

  it.each([
    { montant_timbre_saisi_centimes: 0 },
    { montant_timbre_saisi_centimes: undefined },
  ])('TRAITE : rejette un montant manquant ou nul', (champ) => {
    expect(() =>
      construire({
        timbre_statut: 'TRAITE',
        timbre_traite_le: '2026-08-16',
        timbre_traite_par: 'Sami',
        ...champ,
      }),
    ).toThrow(/montant du timbre/)
  })

  it('TRAITE : rejette sans date de traitement', () => {
    expect(() =>
      construire({
        timbre_statut: 'TRAITE',
        montant_timbre_saisi_centimes: 500,
        timbre_traite_par: 'Sami',
      }),
    ).toThrow(/date de traitement/)
  })

  it('TRAITE : rejette sans responsable de traitement', () => {
    expect(() =>
      construire({
        timbre_statut: 'TRAITE',
        montant_timbre_saisi_centimes: 500,
        timbre_traite_le: '2026-08-16',
      }),
    ).toThrow(/responsable/)
  })

  it('A_VERIFIER : accepte sans champ, ou avec un montant strictement positif', () => {
    expect(construire({ timbre_statut: 'A_VERIFIER' }).timbre_statut).toBe('A_VERIFIER')
    expect(
      construire({ timbre_statut: 'A_VERIFIER', montant_timbre_saisi_centimes: 500 }).montant_timbre_saisi_centimes,
    ).toBe(500)
  })

  it('A_VERIFIER : rejette un montant nul', () => {
    expect(() =>
      construire({ timbre_statut: 'A_VERIFIER', montant_timbre_saisi_centimes: 0 }),
    ).toThrow(/strictement positif/)
  })

  it.each([
    { timbre_traite_le: '2026-08-16' },
    { timbre_traite_par: 'Sami' },
  ])('A_VERIFIER : rejette une date ou un responsable de traitement', (champ) => {
    expect(() => construire({ timbre_statut: 'A_VERIFIER', ...champ })).toThrow(/A_VERIFIER/)
  })
})

describe('Encaissement — champs transverses', () => {
  it('normalise les champs facultatifs absents à null', () => {
    const encaissement = construire()
    expect(encaissement.cree_le).toBeNull()
    expect(encaissement.modifie_le).toBeNull()
    expect(encaissement.supprime_le).toBeNull()
    expect(encaissement.commentaire_timbre).toBeNull()
  })

  it('normalise une référence ou un responsable vide à null', () => {
    const encaissement = construire({
      timbre_statut: 'TRAITE',
      montant_timbre_saisi_centimes: 500,
      timbre_traite_le: '2026-08-16',
      timbre_traite_par: 'Sami',
      reference_timbre_ou_quittance: '   ',
    })
    expect(encaissement.reference_timbre_ou_quittance).toBeNull()
  })
})
