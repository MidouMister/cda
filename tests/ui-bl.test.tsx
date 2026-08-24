// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const mockListerBl = vi.fn()
const mockLireBl = vi.fn()
const mockListerLignesBl = vi.fn()
const mockCreerLigneBl = vi.fn()
const mockGenererFacture = vi.fn()

vi.stubGlobal('egto', {
  bonsLivraison: {
    lister: mockListerBl,
    lire: mockLireBl,
    listerLignes: mockListerLignesBl,
    creer: vi.fn(),
    modifier: vi.fn(),
    supprimer: vi.fn(),
    creerLigne: mockCreerLigneBl,
    modifierLigne: vi.fn(),
    supprimerLigne: vi.fn(),
    genererFacture: mockGenererFacture,
  },
  factures: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null), creer: vi.fn() },
  clients: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  affaires: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  session: { etat: vi.fn().mockResolvedValue({ verrouillee: true, premierDemarrage: true }) },
  diagnostic: vi.fn().mockResolvedValue({}),
})

const naviguerMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => naviguerMock, useParams: () => ({ id: '1' }) }
})

const BL_MOCK = [
  {
    id: 1, statut: 'EMIS', numeroBl: 'BL-2026-00001', dateLivraison: '2026-08-21',
    affaireId: 1, clientId: 1, poidsPeseeKg: 1500, signatureClient: 1,
    factureId: null, exerciceId: 1, dateCreation: '2026-08-21', dateModification: '2026-08-21',
  },
  {
    id: 2, statut: 'FACTURE', numeroBl: 'BL-2026-00002', dateLivraison: '2026-08-20',
    affaireId: null, clientId: 2, poidsPeseeKg: null, signatureClient: 1,
    factureId: 1, exerciceId: 1, dateCreation: '2026-08-20', dateModification: '2026-08-20',
  },
]

const LIGNE_BL_MOCK = {
  id: 1, bonLivraisonId: 1, produitId: null, designation: 'Sable 0/5',
  unite: 't', quantiteMilliemes: 50000, puHtCentimes: 200000, montantHtCentimes: 1000000,
}

beforeEach(() => {
  vi.clearAllMocks()
  naviguerMock.mockReset()
  mockListerLignesBl.mockResolvedValue([])
})

afterEach(() => { cleanup() })

async function afficherBonsLivraison() {
  const { BonsLivraison } = await import('../src/ecrans/BonsLivraison')
  render(<BonsLivraison />)
}

async function afficherFicheBL() {
  const { FicheBonLivraison } = await import('../src/ecrans/FicheBonLivraison')
  render(<FicheBonLivraison />)
}

describe('R17 - Liste Bons de livraison', () => {
  it('affiche l\u00e9tat de chargement', async () => {
    mockListerBl.mockReturnValue(new Promise(() => {}))
    await afficherBonsLivraison()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche l\u00e9tat vide', async () => {
    mockListerBl.mockResolvedValue([])
    await afficherBonsLivraison()
    await waitFor(() => {
      expect(screen.getByText(/Aucun bon de livraison/)).toBeInTheDocument()
    })
  })

  it('affiche les BL dans le tableau', async () => {
    mockListerBl.mockResolvedValue(BL_MOCK)
    await afficherBonsLivraison()
    await waitFor(() => {
      expect(screen.getByText('BL-2026-00001')).toBeInTheDocument()
      expect(screen.getByText('BL-2026-00002')).toBeInTheDocument()
    })
  })

  it('affiche les en-t\u00eates', async () => {
    mockListerBl.mockResolvedValue(BL_MOCK)
    await afficherBonsLivraison()
    await waitFor(() => {
      expect(screen.getByText('N\u00b0 BL')).toBeInTheDocument()
      expect(screen.getByText('Statut')).toBeInTheDocument()
      expect(screen.getByText('Date livraison')).toBeInTheDocument()
    })
  })

  it('affiche les badges statut', async () => {
    mockListerBl.mockResolvedValue(BL_MOCK)
    await afficherBonsLivraison()
    await waitFor(() => {
      const badges = screen.getAllByText('EMIS')
      const badge = badges.find((el) => el.tagName === 'SPAN')
      expect(badge).toHaveClass('badge-statut')
    })
  })

  it('filtre par statut', async () => {
    mockListerBl.mockResolvedValue(BL_MOCK)
    const user = userEvent.setup()
    await afficherBonsLivraison()
    await waitFor(() => {
      expect(screen.getByText('BL-2026-00001')).toBeInTheDocument()
    })
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'FACTURE')
    expect(screen.queryByText('BL-2026-00001')).not.toBeInTheDocument()
    expect(screen.getByText('BL-2026-00002')).toBeInTheDocument()
  })

  it('navigue vers la fiche au clic', async () => {
    mockListerBl.mockResolvedValue(BL_MOCK)
    await afficherBonsLivraison()
    await waitFor(() => {
      expect(screen.getByText('BL-2026-00001')).toBeInTheDocument()
    })
    const lignes = screen.getAllByRole('row')
    const ligneBl = lignes.find((l) => l.textContent?.includes('BL-2026-00001'))
    ligneBl?.click()
    expect(naviguerMock).toHaveBeenCalledWith('/bons-livraison/1')
  })

  it('affiche le bouton Nouveau BL', async () => {
    mockListerBl.mockResolvedValue([])
    await afficherBonsLivraison()
    await waitFor(() => {
      expect(screen.getByText(/Aucun bon de livraison/)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /Nouveau BL/ })).toBeInTheDocument()
  })
})

describe('R17 - Fiche Bon de livraison', () => {
  it('affiche l\u00e9tat de chargement', async () => {
    mockLireBl.mockReturnValue(new Promise(() => {}))
    await afficherFicheBL()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche les onglets G\u00e9n\u00e9ral et Lignes', async () => {
    mockLireBl.mockResolvedValue(BL_MOCK[0])
    await afficherFicheBL()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'G\u00e9n\u00e9ral' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
  })

  it('affiche les champs g\u00e9n\u00e9raux', async () => {
    mockLireBl.mockResolvedValue(BL_MOCK[0])
    await afficherFicheBL()
    await waitFor(() => {
      expect(screen.getByText('BL-2026-00001')).toBeInTheDocument()
    })
  })

  it('affiche les lignes du BL', async () => {
    mockLireBl.mockResolvedValue(BL_MOCK[0])
    mockListerLignesBl.mockResolvedValue([LIGNE_BL_MOCK])
    const user = userEvent.setup()
    await afficherFicheBL()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await waitFor(() => {
      expect(screen.getByText('Sable 0/5')).toBeInTheDocument()
    })
  })

  it('affiche Ajouter ligne pour EMIS', async () => {
    mockLireBl.mockResolvedValue(BL_MOCK[0])
    const user = userEvent.setup()
    await afficherFicheBL()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    expect(screen.getByRole('button', { name: 'Ajouter ligne' })).toBeInTheDocument()
  })

  it('n\u00e9affiche pas Ajouter ligne pour FACTURE', async () => {
    mockLireBl.mockResolvedValue(BL_MOCK[1])
    const user = userEvent.setup()
    await afficherFicheBL()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    expect(screen.queryByRole('button', { name: 'Ajouter ligne' })).not.toBeInTheDocument()
  })

  it('retourne \u00e0 la liste', async () => {
    mockLireBl.mockResolvedValue(BL_MOCK[0])
    await afficherFicheBL()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retour/ })).toBeInTheDocument()
    })
    screen.getByRole('button', { name: /Retour/ }).click()
    expect(naviguerMock).toHaveBeenCalledWith('/bons-livraison')
  })
})