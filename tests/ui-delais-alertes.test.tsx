// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mockListerEvenements = vi.fn()

vi.stubGlobal('egto', {
  evenementsDelais: {
    listerParAffaire: mockListerEvenements,
    creer: vi.fn(),
    supprimer: vi.fn(),
  },
  affaires: { lister: vi.fn().mockResolvedValue([]), lire: vi.fn().mockResolvedValue(null) },
  avenants: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), supprimer: vi.fn() },
  postesDqe: { listerParAffaire: vi.fn().mockResolvedValue([]), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
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

const EVENEMENTS_DELAI_MOCK = [
  {
    id: 1,
    affaireId: 1,
    typeEvenement: 'ODS',
    dateDebut: '2026-01-15',
    dateFin: null,
    dureeJours: null,
    motif: 'Ordre de Service',
    impactDelaiJours: 0,
    dateCreation: '2026-01-15',
  },
  {
    id: 2,
    affaireId: 1,
    typeEvenement: 'SUSPENSION',
    dateDebut: '2026-03-01',
    dateFin: '2026-03-20',
    dureeJours: 20,
    motif: 'Météo',
    impactDelaiJours: 20,
    dateCreation: '2026-03-01',
  },
  {
    id: 3,
    affaireId: 1,
    typeEvenement: 'REPRISE',
    dateDebut: '2026-03-21',
    dateFin: null,
    dureeJours: null,
    motif: null,
    impactDelaiJours: 0,
    dateCreation: '2026-03-21',
  },
  {
    id: 4,
    affaireId: 1,
    typeEvenement: 'PROROGATION',
    dateDebut: '2026-05-01',
    dateFin: '2026-06-01',
    dureeJours: 31,
    motif: 'Demande client',
    impactDelaiJours: 31,
    dateCreation: '2026-05-01',
  },
]

async function afficherSuiviDelais() {
  const { SuiviDelais } = await import('../src/composants/SuiviDelais')
  render(<SuiviDelais affaireId={1} />)
}

describe('R14 - Suivi Délais', () => {
  it('affiche l\'état de chargement', async () => {
    mockListerEvenements.mockReturnValue(new Promise(() => {}))
    await afficherSuiviDelais()
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
  })

  it('affiche l\'état vide', async () => {
    mockListerEvenements.mockResolvedValue([])
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Aucun événement de délai enregistré.')).toBeInTheDocument()
    })
  })

  it('affiche les événements avec type et dates', async () => {
    mockListerEvenements.mockResolvedValue(EVENEMENTS_DELAI_MOCK)
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Ordre de Service')).toBeInTheDocument()
      expect(screen.getByText('Météo')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/2026-01-15/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/2026-03-01/).length).toBeGreaterThanOrEqual(1)
  })

  it('affiche les badges type avec les bonnes classes CSS', async () => {
    mockListerEvenements.mockResolvedValue(EVENEMENTS_DELAI_MOCK)
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Ordre de Service')).toBeInTheDocument()
    })

    const badgeODS = screen.getByText('ODS')
    expect(badgeODS).toHaveClass('timeline-type-badge', 'timeline-type-ods')

    const badgeSuspension = screen.getByText('Suspension')
    expect(badgeSuspension).toHaveClass('timeline-type-badge', 'timeline-type-suspension')

    const badgeReprise = screen.getByText('Reprise')
    expect(badgeReprise).toHaveClass('timeline-type-badge', 'timeline-type-reprise')

    const badgeProrogation = screen.getByText('Prorogation')
    expect(badgeProrogation).toHaveClass('timeline-type-badge', 'timeline-type-prorogation')
  })

  it('affiche la durée en jours', async () => {
    mockListerEvenements.mockResolvedValue(EVENEMENTS_DELAI_MOCK)
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Météo')).toBeInTheDocument()
    })

    expect(screen.getByText(/\(20j\)/)).toBeInTheDocument()
  })

  it('affiche le motif', async () => {
    mockListerEvenements.mockResolvedValue(EVENEMENTS_DELAI_MOCK)
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Ordre de Service')).toBeInTheDocument()
    })

    expect(screen.getByText('Ordre de Service')).toBeInTheDocument()
    expect(screen.getByText('Météo')).toBeInTheDocument()
  })

  it('affiche l\'impact en jours', async () => {
    mockListerEvenements.mockResolvedValue(EVENEMENTS_DELAI_MOCK)
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Météo')).toBeInTheDocument()
    })

    expect(screen.getByText('Impact : +20 jours')).toBeInTheDocument()
    expect(screen.getByText('Impact : +31 jours')).toBeInTheDocument()
  })

  it('n\'affiche pas l\'impact quand il est nul', async () => {
    mockListerEvenements.mockResolvedValue([EVENEMENTS_DELAI_MOCK[0]])
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Ordre de Service')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Impact/)).not.toBeInTheDocument()
  })

  it('affiche les dates de fin avec flèche', async () => {
    mockListerEvenements.mockResolvedValue([EVENEMENTS_DELAI_MOCK[1]])
    await afficherSuiviDelais()
    await waitFor(() => {
      expect(screen.getByText('Météo')).toBeInTheDocument()
    })

    expect(screen.getByText(/→/)).toBeInTheDocument()
    expect(screen.getByText(/2026-03-20/)).toBeInTheDocument()
  })
})

describe('R14 - BandeauAlertes', () => {
  async function afficherBandeau(alertes: { categorie: string; niveau: string; message: string }[]) {
    const { BandeauAlertes } = await import('../src/composants/BandeauAlertes')
    render(<BandeauAlertes alertes={alertes} />)
  }

  it('ne rend rien quand il n\'y a pas d\'alertes', async () => {
    await afficherBandeau([])
    expect(document.querySelector('.bandeau-alertes')).not.toBeInTheDocument()
  })

  it('affiche les messages avec les bonnes classes CSS', async () => {
    const alertes = [
      { categorie: 'DELAI_DEPASSE', niveau: 'CRITIQUE', message: 'Délai dépassé de 10 jours' },
      { categorie: 'DELAI_J_15', niveau: 'AVERTISSEMENT', message: 'Plus que 5 jours' },
      { categorie: 'DELAI_50_POURCENT', niveau: 'INFO', message: 'Délai consommé à 50%' },
    ]
    await afficherBandeau(alertes)

    const lignes = screen.getAllByText(/Délai|Plus que|consommé/)
    expect(lignes).toHaveLength(3)

    const critiqueEl = screen.getByText('Délai dépassé de 10 jours')
    expect(critiqueEl.closest('.alerte-ligne')).toHaveClass('alerte-critique')

    const avertissementEl = screen.getByText('Plus que 5 jours')
    expect(avertissementEl.closest('.alerte-ligne')).toHaveClass('alerte-avertissement')

    const infoEl = screen.getByText('Délai consommé à 50%')
    expect(infoEl.closest('.alerte-ligne')).toHaveClass('alerte-info')
  })

  it('affiche les icônes par niveau', async () => {
    const alertes = [
      { categorie: 'DELAI_DEPASSE', niveau: 'CRITIQUE', message: 'Critique' },
      { categorie: 'DELAI_J_15', niveau: 'AVERTISSEMENT', message: 'Avertissement' },
      { categorie: 'DELAI_50_POURCENT', niveau: 'INFO', message: 'Info' },
    ]
    await afficherBandeau(alertes)

    const icones = screen.getAllByText(/⚠|⚡|ℹ/)
    expect(icones.length).toBeGreaterThanOrEqual(3)
  })

  it('affiche un message sans icône pour un niveau inconnu', async () => {
    const alertes = [
      { categorie: 'TEST', niveau: 'INCONNU', message: 'Message test' },
    ]
    await afficherBandeau(alertes)

    expect(screen.getByText('Message test')).toBeInTheDocument()
  })

  it('affiche le bandeau avec la classe CSS correcte', async () => {
    const alertes = [
      { categorie: 'TEST', niveau: 'CRITIQUE', message: 'Alerte critique' },
    ]
    await afficherBandeau(alertes)

    const bandeau = document.querySelector('.bandeau-alertes')
    expect(bandeau).toBeInTheDocument()
    expect(bandeau).toContainElement(screen.getByText('Alerte critique'))
  })
})
