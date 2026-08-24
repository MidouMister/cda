// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const mockListerFactures = vi.fn()
const mockLireFacture = vi.fn()
const mockListerLignes = vi.fn()
const mockValiderFacture = vi.fn()
const mockCalculerPied = vi.fn()
const mockCreerLigne = vi.fn()
const mockGenererPdf = vi.fn()

vi.stubGlobal('egto', {
  factures: {
    lister: mockListerFactures,
    lire: mockLireFacture,
    listerLignes: mockListerLignes,
    creer: vi.fn(),
    modifier: vi.fn(),
    supprimer: vi.fn(),
    valider: mockValiderFacture,
    calculerPied: mockCalculerPied,
    creerLigne: mockCreerLigne,
    modifierLigne: vi.fn(),
    supprimerLigne: vi.fn(),
    genererPdf: mockGenererPdf,
    imprimer: vi.fn(),
    marquerEnvoyee: vi.fn(),
    creerAvoir: vi.fn(),
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

const FACTURE_BROUILLON = {
  id: 1, statut: 'BROUILLON', typeDocument: 'FA', numero: null,
  dateFacture: '2026-08-21', dateEcheance: '2026-09-21', affaireId: 1, clientId: 1,
  adresseFacturation: null, adresseFacturationType: null, nifClient: null, numeroBcClient: null,
  retenueGarantieBps: 500, remboursementAvanceCentimes: 0, modeReglementPrevu: null,
  totalHtLignesCentimes: 15000000, totalRemisesCentimes: 0, netCommercialHtCentimes: 15000000,
  retenueGarantieCentimes: 750000, totalHtCentimes: 14250000, totalTvaCentimes: 2707500,
  totalTtcCentimes: 16957500, netAPayerCentimes: 16957500, factureOrigineId: null,
  motifAvoir: null, dateValidation: null, nombreImpressions: 0, exerciceId: 1,
  dateCreation: '2026-08-21', dateModification: '2026-08-21',
}

const FACTURE_VALIDEE = {
  ...FACTURE_BROUILLON, id: 2, statut: 'VALIDE', numero: 'FA-2026-00001',
  dateFacture: '2026-08-20', clientId: 2, affaireId: null,
  totalHtLignesCentimes: 5000000, totalTvaCentimes: 950000, totalTtcCentimes: 5950000,
  netAPayerCentimes: 5950000, retenueGarantieCentimes: 0, retenueGarantieBps: 0,
  dateValidation: '2026-08-20', nombreImpressions: 1,
}

const LIGNE_MOCK = {
  id: 1, factureId: 1, produitId: null, designation: 'Beton arm\u00e9 C25/30',
  unite: 'm\u00b3', quantiteMilliemes: 100000, puHtCentimes: 850000,
  remiseBps: 0, rabaisMarcheBps: 0, montantHtBrutCentimes: 8500000,
  montantHtRemiseCentimes: 0, montantRabaisMarcheCentimes: 0, montantHtNetCentimes: 8500000,
  typeLigne: null, familleId: null, sousFamilleId: null, classification: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  naviguerMock.mockReset()
  mockListerLignes.mockResolvedValue([])
  mockCalculerPied.mockResolvedValue({
    totalHtLignesCentimes: 15000000, totalRemisesCentimes: 0,
    netCommercialHtCentimes: 15000000, remboursementAvanceCentimes: 0,
    retenueGarantieCentimes: 750000, totalHtCentimes: 14250000,
    totalTvaCentimes: 2707500, totalTtcCentimes: 16957500,
    netAPayerCentimes: 16957500, ajustementEcartAudit: null,
  })
  mockGenererPdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
})

afterEach(() => { cleanup() })

async function afficherFactures() {
  const { Factures } = await import('../src/ecrans/Factures')
  render(<Factures />)
}

async function afficherFicheFacture() {
  const { FicheFacture } = await import('../src/ecrans/FicheFacture')
  render(<FicheFacture />)
}

describe('R15 - Liste Factures', () => {
  it('affiche l\u00e9tat de chargement', async () => {
    mockListerFactures.mockReturnValue(new Promise(() => {}))
    await afficherFactures()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche l\u00e9tat vide', async () => {
    mockListerFactures.mockResolvedValue([])
    await afficherFactures()
    await waitFor(() => {
      expect(screen.getByText(/Aucune facture enregistr/i)).toBeInTheDocument()
    })
  })

  it('affiche les factures dans le tableau', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_BROUILLON, FACTURE_VALIDEE])
    await afficherFactures()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
  })

  it('affiche les en-t\u00eates de colonnes', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_VALIDEE])
    await afficherFactures()
    await waitFor(() => {
      expect(screen.getByText('N\u00b0')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('\u00c9ch\u00e9ance')).toBeInTheDocument()
      expect(screen.getByText('Statut')).toBeInTheDocument()
    })
  })

  it('affiche les badges statut', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_BROUILLON])
    await afficherFactures()
    await waitFor(() => {
      const badges = screen.getAllByText('BROUILLON')
      const badge = badges.find((el) => el.tagName === 'SPAN')
      expect(badge).toHaveClass('badge-statut', 'badge-brouillon')
    })
  })

  it('affiche les badges type document', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_VALIDEE])
    await afficherFactures()
    await waitFor(() => {
      const badges = screen.getAllByText('FA')
      const badge = badges.find((el) => el.tagName === 'SPAN')
      expect(badge).toHaveClass('badge-statut', 'badge-fa')
    })
  })

  it('filtre les factures par statut', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_BROUILLON, FACTURE_VALIDEE])
    const user = userEvent.setup()
    await afficherFactures()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'VALIDE')
    expect(screen.queryByText('FA-2026-00001')).toBeInTheDocument()
    expect(screen.queryByText('Brouillon')).not.toBeInTheDocument()
  })

  it('navigue vers la fiche au clic', async () => {
    mockListerFactures.mockResolvedValue([FACTURE_VALIDEE])
    await afficherFactures()
    await waitFor(() => {
      expect(screen.getByText('FA-2026-00001')).toBeInTheDocument()
    })
    const lignes = screen.getAllByRole('row')
    const ligneFacture = lignes.find((l) => l.textContent?.includes('FA-2026-00001'))
    ligneFacture?.click()
    expect(naviguerMock).toHaveBeenCalledWith('/factures/2')
  })

  it('affiche le bouton Nouvelle facture', async () => {
    mockListerFactures.mockResolvedValue([])
    await afficherFactures()
    await waitFor(() => {
      expect(screen.getByText(/Aucune facture enregistr/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Nouvelle facture' })).toBeInTheDocument()
  })
})

describe('R15 - Fiche Facture', () => {
  it('affiche l\u00e9tat de chargement', async () => {
    mockLireFacture.mockReturnValue(new Promise(() => {}))
    await afficherFicheFacture()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche les onglets', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'G\u00e9n\u00e9ral' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Pied' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Historique encaissements' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Aper\u00e7u PDF' })).toBeInTheDocument()
    })
  })

  it('affiche les champs g\u00e9n\u00e9raux', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getAllByText('BROUILLON').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('FA').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('affiche le bouton Valider pour BROUILLON', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Valider' })).toBeInTheDocument()
    })
  })

  it('affiche le bouton Imprimer pour VALIDEE', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_VALIDEE)
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Imprimer' })).toBeInTheDocument()
    })
  })

  it('affiche les lignes dans l\u00e9onglet Lignes', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    mockListerLignes.mockResolvedValue([LIGNE_MOCK])
    const user = userEvent.setup()
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await waitFor(() => {
      expect(screen.getByText('Beton arm\u00e9 C25/30')).toBeInTheDocument()
    })
  })

  it('ouvre le modal d\u00e9ajout de ligne', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    const user = userEvent.setup()
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await user.click(screen.getByRole('button', { name: 'Ajouter ligne' }))
    await waitFor(() => {
      expect(screen.getByText('Nouvelle ligne de facture')).toBeInTheDocument()
    })
  })

  it('ajoute une ligne et ferme le modal', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    mockCreerLigne.mockResolvedValue({ id: 3 })
    const user = userEvent.setup()
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await user.click(screen.getByRole('button', { name: 'Ajouter ligne' }))
    await waitFor(() => {
      expect(screen.getByText('Nouvelle ligne de facture')).toBeInTheDocument()
    })
    await user.type(screen.getByLabelText(/D\u00e9signation/), 'Nouveau poste')
    await user.type(screen.getByLabelText(/Quantit/), '50')
    await user.type(screen.getByLabelText(/PU HT/), '1000')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    await waitFor(() => {
      expect(mockCreerLigne).toHaveBeenCalledWith(
        expect.objectContaining({ designation: 'Nouveau poste', quantiteMilliemes: 50, puHtCentimes: 1000 })
      )
    })
  })

  it('retourne \u00e0 la liste', async () => {
    mockLireFacture.mockResolvedValue(FACTURE_BROUILLON)
    await afficherFicheFacture()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retour/ })).toBeInTheDocument()
    })
    screen.getByRole('button', { name: /Retour/ }).click()
    expect(naviguerMock).toHaveBeenCalledWith('/factures')
  })
})