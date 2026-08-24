// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const mockListerFactures = vi.fn()
const mockCreerAvoir = vi.fn()

vi.stubGlobal('egto', {
  factures: {
    lister: mockListerFactures,
    lire: vi.fn().mockResolvedValue(null),
    listerLignes: vi.fn().mockResolvedValue([]),
    creer: vi.fn(),
    modifier: vi.fn(),
    supprimer: vi.fn(),
    valider: vi.fn(),
    calculerPied: vi.fn(),
    creerLigne: vi.fn(),
    modifierLigne: vi.fn(),
    supprimerLigne: vi.fn(),
    genererPdf: vi.fn(),
    imprimer: vi.fn(),
    marquerEnvoyee: vi.fn(),
    creerAvoir: mockCreerAvoir,
    listerAvoirs: vi.fn().mockResolvedValue([]),
  },
  clients: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  affaires: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  encaissements: { lister: vi.fn().mockResolvedValue([]), creer: vi.fn(), supprimer: vi.fn(), modifierEncaissement: vi.fn() },
  session: { etat: vi.fn().mockResolvedValue({ verrouillee: true, premierDemarrage: true }) },
  diagnostic: vi.fn().mockResolvedValue({}),
})

const naviguerMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => naviguerMock, useParams: () => ({ id: '1' }) }
})

const FACTURE_ELIGIBLE = {
  id: 1, statut: 'VALIDE', typeDocument: 'FA', numero: 'FA-2026-00001',
  dateFacture: '2026-08-20', dateEcheance: '2026-09-20', affaireId: null, clientId: 1,
  adresseFacturation: null, adresseFacturationType: null, nifClient: null, numeroBcClient: null,
  retenueGarantieBps: 0, remboursementAvanceCentimes: 0, modeReglementPrevu: null,
  totalHtLignesCentimes: 5000000, totalRemisesCentimes: 0, netCommercialHtCentimes: 5000000,
  retenueGarantieCentimes: 0, totalHtCentimes: 5000000, totalTvaCentimes: 950000,
  totalTtcCentimes: 5950000, netAPayerCentimes: 5950000, factureOrigineId: null,
  motifAvoir: null, dateValidation: '2026-08-20', nombreImpressions: 1, exerciceId: 1,
  dateCreation: '2026-08-20', dateModification: '2026-08-20',
}

const FACTURE_BROUILLON = {
  ...FACTURE_ELIGIBLE, id: 2, statut: 'BROUILLON', numero: null,
  dateValidation: null, nombreImpressions: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  naviguerMock.mockReset()
  mockCreerAvoir.mockResolvedValue({ id: 3 })
})

afterEach(() => { cleanup() })

async function afficherFicheAvoir() {
  const { FicheAvoir } = await import('../src/ecrans/FicheAvoir')
  render(<FicheAvoir />)
}

describe('R18 - Fiche Avoir', () => {
  it('affiche la liste des factures \u00e9ligibles', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE, FACTURE_BROUILLON])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
  })

  it('n\u00e9affiche pas les factures BROUILLON', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE, FACTURE_BROUILLON])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    const lignes = screen.getAllByRole('row')
    const ligneBrouillon = lignes.find((l) => l.textContent?.includes('BROUILLON'))
    expect(ligneBrouillon).toBeUndefined()
  })

  it('affiche l\u00e9nigme avoir', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText(/avoir ne peut pas/)).toBeInTheDocument()
    })
  })

  it('affiche le bouton Retour vers factures', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    screen.getByRole('button', { name: /Retour/ }).click()
    expect(naviguerMock).toHaveBeenCalledWith('/factures')
  })

  it('s\u00e9lectionne une facture et affiche les modes', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    const lignes = screen.getAllByRole('row')
    const ligneFacture = lignes.find((l) => l.textContent?.includes('FA-2026-00001'))
    ligneFacture?.click()
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText(/Par lignes/)).toBeInTheDocument()
      expect(screen.getByText('Partiel')).toBeInTheDocument()
    })
  })

  it('s\u00e9lectionne le mode TOTAL et affiche le formulaire', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    const lignes = screen.getAllByRole('row')
    lignes.find((l) => l.textContent?.includes('FA-2026-00001'))?.click()
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(screen.getByText('Total'))
    await waitFor(() => {
      expect(screen.getByLabelText(/Motif/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Date/)).toBeInTheDocument()
    })
  })

  it('valide et cr\u00e9e l\u00e9avoir', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_ELIGIBLE])
    await afficherFicheAvoir()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    const lignes = screen.getAllByRole('row')
    lignes.find((l) => l.textContent?.includes('FA-2026-00001'))?.click()
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
    })
    const user = userEvent.setup()
    await user.click(screen.getByText('Total'))
    await waitFor(() => {
      expect(screen.getByLabelText(/Motif/)).toBeInTheDocument()
    })
    await user.type(screen.getByLabelText(/Motif/), 'Erreur de facturation')
    await user.click(screen.getByRole('button', { name: /Valider/ }))
    await waitFor(() => {
      expect(mockCreerAvoir).toHaveBeenCalledWith(
        expect.objectContaining({ factureOrigineId: 1, modeAvoir: 'TOTAL', motifAvoir: 'Erreur de facturation' })
      )
    })
  })
})