import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { construireGabaritFacture } from '../electron/pdf/gabarit-facture'
import { chargerPolices, POLICE_PAR_DEFAUT, POLICE_ARABE } from '../electron/pdf/polices'
import type {
  DonneesPdfFacture,
  DonneesEntreprisePdf,
  DonneesLignePdf,
  DonneesPiedPdf,
} from '../electron/pdf/types'

const ENTREPRISE_DEFAUT: DonneesEntreprisePdf = {
  raisonSociale: 'EGTO SARL',
  formeJuridique: 'SARL',
  capital: '5000000.00 DA',
  rc: '16/00-12345',
  nif: '1234567890',
  nis: '001234567890123',
  ai: '001234',
  adresse: 'Bd front de mer, Oran',
  telephone: '041 23 45 67',
}

const CLIENT_DEFAUT = {
  raisonSociale: 'Client Test',
  adresse: '123 rue Principale, Oran',
  nif: '9876543210',
}

const LIGNE_DEFAUT: DonneesLignePdf = {
  designation: 'Fourniture matériel électrique',
  unite: 'U',
  quantiteMilliemes: 1000000,
  puHtCentimes: 15000000,
  remiseBps: 0,
  rabaisMarcheBps: 0,
  montantHtBrutCentimes: 15000000,
  montantHtRemiseCentimes: 0,
  montantRabaisMarcheCentimes: 0,
  montantHtNetCentimes: 15000000,
  typeLigne: null,
}

const PIED_DEFAUT: DonneesPiedPdf = {
  totalHtLignesCentimes: 15000000,
  totalRemisesCentimes: 0,
  netCommercialHtCentimes: 15000000,
  retenueGarantieCentimes: 750000,
  totalHtCentimes: 14250000,
  totalTvaCentimes: 2707500,
  totalTtcCentimes: 16957500,
  netAPayerCentimes: 16957500,
}

const donneesDefaut = (overrides?: Partial<DonneesPdfFacture>): DonneesPdfFacture => ({
  facture: {
    numero: 'FA-2026-0001',
    typeDocument: 'FA',
    dateFacture: '2026-08-20',
    dateEcheance: '2026-09-20',
    statut: 'VALIDE',
    nombreImpressions: 0,
    nifClient: null,
    numeroBcClient: 'BC-001',
    adresseFacturation: null,
    modeReglementPrevu: null,
    retenueGarantieBps: 500,
    remboursementAvanceCentimes: 0,
  },
  client: CLIENT_DEFAUT,
  affaire: { reference: 'AFF-2026-001', objet: 'Travaux électriques' },
  entreprise: ENTREPRISE_DEFAUT,
  lignes: [LIGNE_DEFAUT],
  pied: PIED_DEFAUT,
  estDuplicata: false,
  ...overrides,
})

const MENTIONS_LEGALES_OBLIGATOIRES = [
  'EGTO SARL',
  'Capital',
  'RC',
  'NIF',
  'NIS',
  'AI',
  'Bd front de mer',
  'Tél',
  'Mode de règlement',
  'TVA',
] as const

describe('gabarit-facture', () => {
  it('contient pageSize A4 et content non vide', () => {
    const gabarit = construireGabaritFacture(donneesDefaut())
    expect(gabarit.pageSize).toBe('A4')
    expect(Array.isArray(gabarit.content)).toBe(true)
    expect((gabarit.content as unknown[]).length).toBeGreaterThan(0)
  })

  it('contient les 10 mentions légales obligatoires', () => {
    const gabarit = construireGabaritFacture(donneesDefaut())
    const contenuContent = JSON.stringify(gabarit.content)
    const contenuFooter = JSON.stringify(typeof gabarit.footer === 'function' ? gabarit.footer(1, 1, { width: 595, height: 842, orientation: 'portrait' }) : null)
    const contenu = contenuContent + contenuFooter
    for (const mention of MENTIONS_LEGALES_OBLIGATOIRES) {
      expect(contenu).toContain(mention)
    }
  })

  it('ne contient aucun timbre', () => {
    const gabarit = construireGabaritFacture(donneesDefaut())
    const contenu = JSON.stringify(gabarit).toLowerCase()
    expect(contenu).not.toContain('timbre')
  })

  it('formate les montants HT, TVA, TTC et net à payer', () => {
    const gabarit = construireGabaritFacture(donneesDefaut())
    const contenu = JSON.stringify(gabarit.content)
    expect(contenu).toContain('150000.00 DA')
    expect(contenu).toContain('27075.00 DA')
    expect(contenu).toContain('169575.00 DA')
    expect(contenu).toContain('142500.00 DA')
  })

  it('utilise Roboto comme police par défaut', () => {
    const gabarit = construireGabaritFacture(donneesDefaut())
    expect(gabarit.defaultStyle?.font).toBe(POLICE_PAR_DEFAUT)
  })

  it('utilise NotoNaskhArabic pour le texte arabe', () => {
    expect(POLICE_ARABE).toBe('NotoNaskhArabic')
  })

  it('estDuplicata=false : pas de filigrane DUPLICATA', () => {
    const gabarit = construireGabaritFacture(donneesDefaut({ estDuplicata: false }))
    expect(gabarit.background).toBeUndefined()
  })

  it('estDuplicata=true : filigrane DUPLICATA présent', () => {
    const gabarit = construireGabaritFacture(donneesDefaut({ estDuplicata: true }))
    expect(gabarit.background).toBeDefined()
    if (typeof gabarit.background === 'function') {
      const contenu = JSON.stringify(gabarit.background(1, { width: 595, height: 842, orientation: 'portrait' }))
      expect(contenu).toContain('DUPLICATA')
    }
  })

  it('les lignes du tableau contiennent les bonnes désignations', () => {
    const gabarit = construireGabaritFacture(donneesDefaut())
    const contenu = JSON.stringify(gabarit.content)
    expect(contenu).toContain('Fourniture matériel électrique')
    expect(contenu).toContain('Désignation')
    expect(contenu).toContain('Net HT')
  })
})

describe('polices', () => {
  it('chargerPolices retourne les clés Roboto et NotoNaskhArabic ou throw si fichiers manquants', () => {
    const policesRoboto = resolve(__dirname, '..', 'node_modules/pdfmake/build/fonts/Roboto/Roboto-Regular.ttf')
    const policesArabe = resolve(__dirname, '..', 'electron/pdf/polices/NotoNaskhArabic-Regular.ttf')
    const fichiersExistants = existsSync(policesRoboto) && existsSync(policesArabe)

    if (fichiersExistants) {
      const polices = chargerPolices()
      expect(polices[POLICE_PAR_DEFAUT]).toBeDefined()
      expect(polices[POLICE_ARABE]).toBeDefined()
    } else {
      expect(() => chargerPolices()).toThrow(/Fichier de police introuvable/)
    }
  })
})

describe('aucun calcul dans electron/pdf/', () => {
  it('ne contient aucune opération de calcul financier', () => {
    const chemins = [
      resolve(__dirname, '..', 'electron/pdf/types.ts'),
      resolve(__dirname, '..', 'electron/pdf/polices.ts'),
      resolve(__dirname, '..', 'electron/pdf/gabarit-facture.ts'),
      resolve(__dirname, '..', 'electron/pdf/gabarit-devis.ts'),
      resolve(__dirname, '..', 'electron/pdf/gabarit-bl.ts'),
      resolve(__dirname, '..', 'electron/pdf/generer-pdf.ts'),
    ]
    const motifsInterdits = [
      /calculerPied/,
      /calculerSolde/,
      /appliquerTaux/,
      /foisQuantite/,
      /calculerDroitTimbre/,
    ]
    for (const chemin of chemins) {
      if (!existsSync(chemin)) continue
      const contenu = readFileSync(chemin, 'utf8')
      for (const motif of motifsInterdits) {
        expect(contenu).not.toMatch(motif)
      }
    }
  })
})
