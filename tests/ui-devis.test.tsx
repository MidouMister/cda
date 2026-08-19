// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const mockListerDevis = vi.fn()
const mockLireDevis = vi.fn()
const mockListerLignes = vi.fn()
const mockCreerLigne = vi.fn()

vi.stubGlobal('egto', {
  devis: {
    lister: mockListerDevis,
    lire: mockLireDevis,
    listerLignes: mockListerLignes,
    creer: vi.fn(),
    creerLigne: mockCreerLigne,
    modifier: vi.fn(),
    supprimer: vi.fn(),
    supprimerLigne: vi.fn(),
  },
  affaires: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  avenants: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), supprimer: vi.fn() },
  postesDqe: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
  evenementsDelais: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), supprimer: vi.fn() },
  clients: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  session: { etat: vi.fn().mockResolvedValue({ verrouillee: true, premierDemarrage: true }) },
  diagnostic: vi.fn().mockResolvedValue({}),
})

const naviguerMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => naviguerMock,
    useParams: () => ({ id: '1' }),
  }
})

const DEVIS_MOCK = [
  {
    id: 1,
    statut: 'BROUILLON',
    numeroDevis: 'DEV-2026-00001',
    clientId: 1,
    dateDevis: '2026-01-15',
    dateValidite: '2026-02-15',
    rabaisGlobalBps: 0,
    affaireId: null,
    exerciceId: 1,
    dateCreation: '2026-01-15',
    dateModification: '2026-01-15',
  },
  {
    id: 2,
    statut: 'ENVOYE',
    numeroDevis: 'DEV-2026-00002',
    clientId: 2,
    dateDevis: '2026-02-01',
    dateValidite: '2026-03-01',
    rabaisGlobalBps: 50,
    affaireId: null,
    exerciceId: 1,
    dateCreation: '2026-02-01',
    dateModification: '2026-02-01',
  },
]

const LIGNES_DEVIS_MOCK = [
  {
    id: 1,
    devisId: 1,
    produitId: null,
    designation: 'Béton armé C25/30',
    unite: 'm³',
    quantiteMilliemes: 100000,
    puHtCentimes: 850000,
    montantHtCentimes: 850000,
    familleId: null,
    sousFamilleId: null,
  },
  {
    id: 2,
    devisId: 1,
    produitId: null,
    designation: 'Ferraillage HA',
    unite: 'kg',
    quantiteMilliemes: 500000,
    puHtCentimes: 12000,
    montantHtCentimes: 600000,
    familleId: null,
    sousFamilleId: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  naviguerMock.mockReset()
  mockListerLignes.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

async function afficherListeDevis() {
  const { Devis } = await import('../src/ecrans/Devis')
  render(<Devis />)
}

async function afficherFicheDevis() {
  const { FicheDevis } = await import('../src/ecrans/FicheDevis')
  render(<FicheDevis />)
}

describe('R11 - Liste Devis', () => {
  it('affiche l\'état de chargement', async () => {
    mockListerDevis.mockReturnValue(new Promise(() => {}))
    await afficherListeDevis()
    expect(screen.getByText('Chargement\u2026')).toBeInTheDocument()
  })

  it('affiche l\'état vide quand aucun devis', async () => {
    mockListerDevis.mockResolvedValue([])
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('Aucun devis enregistré.')).toBeInTheDocument()
    })
  })

  it('affiche les devis dans le tableau', async () => {
    mockListerDevis.mockResolvedValue(DEVIS_MOCK)
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
      expect(screen.getByText('DEV-2026-00002')).toBeInTheDocument()
    })
  })

  it('affiche les en-têtes de colonnes', async () => {
    mockListerDevis.mockResolvedValue(DEVIS_MOCK)
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
    })
    expect(screen.getByText('N° Devis')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText('Validité')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
  })

  it('affiche les badges statut avec les bonnes classes CSS', async () => {
    mockListerDevis.mockResolvedValue(DEVIS_MOCK)
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
    })

    const badgesBrouillon = screen.getAllByText('BROUILLON')
    const badgeBrouillon = badgesBrouillon.find((el) => el.tagName === 'SPAN')
    expect(badgeBrouillon).toHaveClass('badge-statut', 'badge-brouillon')

    const badgesEnvoye = screen.getAllByText('ENVOYE')
    const badgeEnvoye = badgesEnvoye.find((el) => el.tagName === 'SPAN')
    expect(badgeEnvoye).toHaveClass('badge-statut', 'badge-envoye')
  })

  it('filtre les devis par statut', async () => {
    mockListerDevis.mockResolvedValue(DEVIS_MOCK)
    const user = userEvent.setup()
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'ENVOYE')

    expect(screen.queryByText('DEV-2026-00001')).not.toBeInTheDocument()
    expect(screen.getByText('DEV-2026-00002')).toBeInTheDocument()
  })

  it('réinitialise le filtre quand on sélectionne "Tous les statuts"', async () => {
    mockListerDevis.mockResolvedValue(DEVIS_MOCK)
    const user = userEvent.setup()
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'ENVOYE')
    expect(screen.queryByText('DEV-2026-00001')).not.toBeInTheDocument()

    await user.selectOptions(select, '')
    expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
    expect(screen.getByText('DEV-2026-00002')).toBeInTheDocument()
  })

  it('navigue vers la fiche devis au clic sur une ligne', async () => {
    mockListerDevis.mockResolvedValue(DEVIS_MOCK)
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('DEV-2026-00001')).toBeInTheDocument()
    })

    const lignes = screen.getAllByRole('row')
    const ligneDevis = lignes.find((l) => l.textContent?.includes('DEV-2026-00001'))
    ligneDevis?.click()

    expect(naviguerMock).toHaveBeenCalledWith('/devis/1')
  })

  it('affiche le bouton "Nouveau devis"', async () => {
    mockListerDevis.mockResolvedValue([])
    await afficherListeDevis()
    await waitFor(() => {
      expect(screen.getByText('Aucun devis enregistré.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Nouveau devis' })).toBeInTheDocument()
  })
})

describe('R11 - Fiche Devis', () => {
  it('affiche l\'état de chargement', async () => {
    mockLireDevis.mockReturnValue(new Promise(() => {}))
    mockListerLignes.mockReturnValue(new Promise(() => {}))
    await afficherFicheDevis()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche les champs du devis', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getAllByText(/DEV-2026-00001/).length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('BROUILLON').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('2026-01-15')).toBeInTheDocument()
    expect(screen.getByText('2026-02-15')).toBeInTheDocument()
  })

  it('affiche les onglets Général, Lignes, Aperçu PDF', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Général' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Aperçu PDF' })).toBeInTheDocument()
    })
  })

  it('affiche l\'onglet Lignes avec les lignes du devis', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue(LIGNES_DEVIS_MOCK)
    const user = userEvent.setup()
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Lignes' }))

    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
      expect(screen.getByText('Ferraillage HA')).toBeInTheDocument()
    })
  })

  it('ouvre le modal d\'ajout de ligne et vérifie le formulaire', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    const user = userEvent.setup()
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await user.click(screen.getByRole('button', { name: 'Ajouter ligne' }))

    await waitFor(() => {
      expect(screen.getByText('Nouvelle ligne de devis')).toBeInTheDocument()
      expect(screen.getByLabelText(/Désignation/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Quantité/)).toBeInTheDocument()
      expect(screen.getByLabelText(/PU HT/)).toBeInTheDocument()
    })
  })

  it('ajoute une ligne et ferme le modal', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    mockCreerLigne.mockResolvedValue({ id: 3 })
    const user = userEvent.setup()
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await user.click(screen.getByRole('button', { name: 'Ajouter ligne' }))

    await waitFor(() => {
      expect(screen.getByText('Nouvelle ligne de devis')).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/Désignation/), 'Nouveau poste')
    await user.type(screen.getByLabelText(/Quantité/), '50')
    await user.type(screen.getByLabelText(/PU HT/), '1000')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => {
      expect(mockCreerLigne).toHaveBeenCalledWith(
        expect.objectContaining({
          designation: 'Nouveau poste',
          quantiteMilliemes: 50,
          puHtCentimes: 1000,
        })
      )
    })
  })

  it('annule l\'ajout de ligne et ferme le modal', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    const user = userEvent.setup()
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Lignes' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('tab', { name: 'Lignes' }))
    await user.click(screen.getByRole('button', { name: 'Ajouter ligne' }))

    await waitFor(() => {
      expect(screen.getByText('Nouvelle ligne de devis')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    await waitFor(() => {
      expect(screen.queryByText('Nouvelle ligne de devis')).not.toBeInTheDocument()
    })
  })

  it('affiche le bouton retour vers la liste', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getAllByText(/DEV-2026-00001/).length).toBeGreaterThanOrEqual(1)
    })

    const boutonRetour = screen.getByRole('button', { name: /Retour/ })
    boutonRetour.click()

    expect(naviguerMock).toHaveBeenCalledWith('/devis')
  })

  it('affiche le bouton "Convertir en affaire" pour un devis ENVOYÉ', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[1])
    mockListerLignes.mockResolvedValue([])
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getAllByText(/DEV-2026-00002/).length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByRole('button', { name: 'Convertir en affaire' })).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton "Convertir en affaire" pour un devis BROUILLON', async () => {
    mockLireDevis.mockResolvedValue(DEVIS_MOCK[0])
    mockListerLignes.mockResolvedValue([])
    await afficherFicheDevis()
    await waitFor(() => {
      expect(screen.getAllByText(/DEV-2026-00001/).length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.queryByRole('button', { name: 'Convertir en affaire' })).not.toBeInTheDocument()
  })
})
