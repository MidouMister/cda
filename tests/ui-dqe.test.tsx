// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const mockListerPostesDqe = vi.fn()
const mockModifierPoste = vi.fn()

vi.stubGlobal('egto', {
  postesDqe: {
    listerParAffaire: mockListerPostesDqe,
    creer: vi.fn(),
    modifier: mockModifierPoste,
    supprimer: vi.fn(),
  },
  affaires: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  avenants: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), supprimer: vi.fn() },
  evenementsDelais: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), supprimer: vi.fn() },
  devis: {
    lister: vi.fn().mockResolvedValue([]),
    lire: vi.fn().mockResolvedValue(null),
    listerLignes: vi.fn().mockResolvedValue([]),
    creer: vi.fn(),
    creerLigne: vi.fn(),
    modifier: vi.fn(),
    supprimer: vi.fn(),
    supprimerLigne: vi.fn(),
  },
  clients: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  session: { etat: vi.fn().mockResolvedValue({ verrouillee: true, premierDemarrage: true }) },
  diagnostic: vi.fn().mockResolvedValue({}),
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

const POSTES_DQE_MOCK = [
  {
    id: 1,
    affaireId: 1,
    numero: 1,
    designation: 'Béton armé C25/30',
    unite: 'm³',
    quantiteMilliemes: 100000,
    puHtCentimes: 850000,
    montantHtCentimes: 850000,
    familleId: null,
    sousFamilleId: null,
    classification: null,
    origine: 'DEVIS',
    ligneDevisId: 1,
    dateCreation: '2026-01-20',
    dateModification: '2026-01-20',
  },
  {
    id: 2,
    affaireId: 1,
    numero: 2,
    designation: 'Ferraillage HA',
    unite: 'kg',
    quantiteMilliemes: 500000,
    puHtCentimes: 12000,
    montantHtCentimes: 600000,
    familleId: null,
    sousFamilleId: null,
    classification: null,
    origine: 'DEVIS',
    ligneDevisId: 2,
    dateCreation: '2026-01-20',
    dateModification: '2026-01-20',
  },
]

async function afficherGrilleDqe() {
  const { GrilleDqe } = await import('../src/composants/GrilleDqe')
  render(<GrilleDqe affaireId={1} />)
}

describe('R13 - Grille DQE', () => {
  it('affiche l\'état de chargement', async () => {
    mockListerPostesDqe.mockReturnValue(new Promise(() => {}))
    await afficherGrilleDqe()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche l\'état vide', async () => {
    mockListerPostesDqe.mockResolvedValue([])
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Aucun poste DQE.')).toBeInTheDocument()
    })
  })

  it('affiche les postes dans un tableau', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
      expect(screen.getByText('Ferraillage HA')).toBeInTheDocument()
    })
  })

  it('affiche les en-têtes de colonnes', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })
    expect(screen.getByText('N°')).toBeInTheDocument()
    expect(screen.getByText('Désignation')).toBeInTheDocument()
    expect(screen.getByText('Unité')).toBeInTheDocument()
    expect(screen.getByText('Quantité')).toBeInTheDocument()
    expect(screen.getByText('PU HT')).toBeInTheDocument()
    expect(screen.getByText('Montant HT')).toBeInTheDocument()
    expect(screen.getByText('Famille')).toBeInTheDocument()
    expect(screen.getByText('Classification')).toBeInTheDocument()
  })

  it('affiche le total HT', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })
    const totalHt = (850000 + 600000) / 100
    expect(screen.getByText(`Total HT : ${totalHt.toFixed(2)} DA`)).toBeInTheDocument()
  })

  it('active l\'édition au double-clic sur une cellule', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    const user = userEvent.setup()
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })

    const celluleDesignation = screen.getByText('Béton armé C25/30')
    await user.dblClick(celluleDesignation)

    await waitFor(() => {
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('Béton armé C25/30')
    })
  })

  it('sauvegarde la valeur au Enter', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    mockModifierPoste.mockResolvedValue(true)
    mockListerPostesDqe.mockResolvedValueOnce(POSTES_DQE_MOCK).mockResolvedValueOnce(POSTES_DQE_MOCK)
    const user = userEvent.setup()
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })

    const celluleDesignation = screen.getByText('Béton armé C25/30')
    await user.dblClick(celluleDesignation)

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('Béton armé C25/30')
    })

    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Béton C30/37')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockModifierPoste).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ designation: 'Béton C30/37' })
      )
    })
  })

  it('annule l\'édition au Escape', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    const user = userEvent.setup()
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })

    const celluleDesignation = screen.getByText('Béton armé C25/30')
    await user.dblClick(celluleDesignation)

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('Béton armé C25/30')
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    expect(mockModifierPoste).not.toHaveBeenCalled()
  })

  it('appelle postesDqe.modifier après édition', async () => {
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    mockModifierPoste.mockResolvedValue(true)
    mockListerPostesDqe.mockResolvedValueOnce(POSTES_DQE_MOCK).mockResolvedValueOnce(POSTES_DQE_MOCK)
    const user = userEvent.setup()
    await afficherGrilleDqe()
    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })

    const cellulePu = screen.getAllByText('8500.00 DA').find(el => el.classList.contains('editable'))!
    await user.dblClick(cellulePu)

    await waitFor(() => {
      expect(screen.getByDisplayValue('850000')).toBeInTheDocument()
    })

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockModifierPoste).toHaveBeenCalledWith(1, { puHtCentimes: 850000 })
    })
  })
})
