// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

const mockListerAffaires = vi.fn()
const mockLireAffaire = vi.fn()
const mockListerAvenants = vi.fn()
const mockListerEvenements = vi.fn()
const mockListerPostesDqe = vi.fn()

vi.stubGlobal('egto', {
  affaires: {
    lister: mockListerAffaires,
    lire: mockLireAffaire,
    creer: vi.fn(),
    modifier: vi.fn(),
    supprimer: vi.fn(),
  },
  avenants: {
    listerParAffaire: mockListerAvenants,
    creer: vi.fn(),
    supprimer: vi.fn(),
  },
  postesDqe: {
    listerParAffaire: mockListerPostesDqe,
    creer: vi.fn(),
    modifier: vi.fn(),
    supprimer: vi.fn(),
  },
  evenementsDelais: {
    listerParAffaire: mockListerEvenements,
    creer: vi.fn(),
    supprimer: vi.fn(),
  },
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

const naviguerMock = vi.fn()
const useParamsMock = vi.fn().mockReturnValue({ id: '1' })

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => naviguerMock,
    useParams: () => useParamsMock(),
  }
})

const AFFAIRE_MOCK = [
  {
    id: 1,
    statut: 'SIGNE',
    reference: 'MP-2026-001',
    typeAffaire: 'MARCHE_PUBLIC',
    affaireMereId: null,
    clientId: 1,
    objet: 'Construction hangar',
    montantInitialHtCentimes: 50000000,
    tauxTvaBps: 1900,
    dateSignature: '2026-01-10',
    dateNotification: null,
    numeroOds: 'ODS-001',
    dateOds: '2026-01-15',
    dateDemarrageEffectif: '2026-01-20',
    delaiExecutionJours: 180,
    dateFinContractuelle: '2026-12-31',
    dateFinRevisee: null,
    dateFinReelle: null,
    motifDepassement: null,
    rabaisGlobalBps: 0,
    rabaisMarcheBps: 100,
    responsable: 'M. Dupont',
    numeroMarche: null,
    serviceContractant: null,
    typeProcedure: null,
    avanceForfaitaireBps: null,
    avanceApprovisionnementBps: null,
    retenueGarantieBps: 500,
    delaiGarantieMois: 12,
    typeRevision: null,
    formuleRevision: null,
    penaliteRetardTauxBps: null,
    penaliteRetardBaseCentimes: null,
    penaliteRetardPlafondBps: null,
    dateDecompteProvisoire: null,
    dateDecompteDefinitif: null,
    numeroContrat: null,
    modalitesPaiement: null,
    avanceContractuelleCentimes: null,
    motifResiliation: null,
    dateResiliation: null,
    decompteResiliationCentimes: null,
    sortCautions: null,
    sortRetenueGarantie: null,
    dateCreation: '2026-01-10',
    dateModification: '2026-01-10',
  },
  {
    id: 2,
    statut: 'BROUILLON',
    reference: 'CP-2026-001',
    typeAffaire: 'CONTRAT_PRIVE',
    affaireMereId: null,
    clientId: 2,
    objet: 'Étude terrain',
    montantInitialHtCentimes: 2000000,
    tauxTvaBps: 1900,
    dateSignature: null,
    dateNotification: null,
    numeroOds: null,
    dateOds: null,
    dateDemarrageEffectif: null,
    delaiExecutionJours: 90,
    dateFinContractuelle: '2026-12-31',
    dateFinRevisee: null,
    dateFinReelle: null,
    motifDepassement: null,
    rabaisGlobalBps: 0,
    rabaisMarcheBps: 0,
    responsable: null,
    numeroMarche: null,
    serviceContractant: null,
    typeProcedure: null,
    avanceForfaitaireBps: null,
    avanceApprovisionnementBps: null,
    retenueGarantieBps: 0,
    delaiGarantieMois: null,
    typeRevision: null,
    formuleRevision: null,
    penaliteRetardTauxBps: null,
    penaliteRetardBaseCentimes: null,
    penaliteRetardPlafondBps: null,
    dateDecompteProvisoire: null,
    dateDecompteDefinitif: null,
    numeroContrat: null,
    modalitesPaiement: null,
    avanceContractuelleCentimes: null,
    motifResiliation: null,
    dateResiliation: null,
    decompteResiliationCentimes: null,
    sortCautions: null,
    sortRetenueGarantie: null,
    dateCreation: '2026-02-01',
    dateModification: '2026-02-01',
  },
]

const AVENANTS_MOCK = [
  {
    id: 1,
    statut: 'BROUILLON',
    numero: 'AV-001',
    affaireId: 1,
    objet: 'Extension délai',
    dateAvenant: '2026-04-01',
    impactDelaiJours: 30,
    impactMontantHtCentimes: 0,
    dateCreation: '2026-04-01',
    dateModification: '2026-04-01',
  },
]

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
]

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
]

beforeEach(() => {
  vi.clearAllMocks()
  naviguerMock.mockReset()
  useParamsMock.mockReturnValue({ id: '1' })
  mockListerAvenants.mockResolvedValue([])
  mockListerEvenements.mockResolvedValue([])
  mockListerPostesDqe.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

async function afficherListeAffaires() {
  const { Affaires } = await import('../src/ecrans/Affaires')
  render(<Affaires />)
}

async function afficherFicheAffaire() {
  const { FicheAffaire } = await import('../src/ecrans/FicheAffaire')
  render(<FicheAffaire />)
}

describe('R12 - Liste Affaires', () => {
  it('affiche l\'état de chargement', async () => {
    mockListerAffaires.mockReturnValue(new Promise(() => {}))
    await afficherListeAffaires()
    expect(screen.getByText('Chargement\u2026')).toBeInTheDocument()
  })

  it('affiche l\'état vide', async () => {
    mockListerAffaires.mockResolvedValue([])
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText('Aucune affaire enregistrée.')).toBeInTheDocument()
    })
  })

  it('affiche les affaires avec référence et objet', async () => {
    mockListerAffaires.mockResolvedValue(AFFAIRE_MOCK)
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText('MP-2026-001')).toBeInTheDocument()
      expect(screen.getByText('CP-2026-001')).toBeInTheDocument()
      expect(screen.getByText('Construction hangar')).toBeInTheDocument()
      expect(screen.getByText('Étude terrain')).toBeInTheDocument()
    })
  })

  it('affiche les en-têtes de colonnes', async () => {
    mockListerAffaires.mockResolvedValue(AFFAIRE_MOCK)
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText('MP-2026-001')).toBeInTheDocument()
    })
    expect(screen.getByText('Référence')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Client')).toBeInTheDocument()
    expect(screen.getByText('Objet')).toBeInTheDocument()
    expect(screen.getByText('Statut')).toBeInTheDocument()
    expect(screen.getByText('Échéance')).toBeInTheDocument()
    expect(screen.getByText('Délai')).toBeInTheDocument()
  })

  it('affiche les badges type avec les bonnes classes CSS', async () => {
    mockListerAffaires.mockResolvedValue(AFFAIRE_MOCK)
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText('MP-2026-001')).toBeInTheDocument()
    })

    const badgeMarche = screen.getByText('Marché public')
    expect(badgeMarche).toHaveClass('badge-statut', 'badge-marche-public')

    const badgePrive = screen.getByText('Contrat privé')
    expect(badgePrive).toHaveClass('badge-statut', 'badge-contrat-prive')
  })

  it('affiche les badges délai (dépassé, alerte, ok)', async () => {
    const affaireDepassee = {
      ...AFFAIRE_MOCK[0],
      id: 10,
      dateFinContractuelle: '2025-01-01',
    }
    const affaireAlerte = {
      ...AFFAIRE_MOCK[0],
      id: 11,
      dateFinContractuelle: (() => {
        const d = new Date()
        d.setDate(d.getDate() + 5)
        return d.toISOString().split('T')[0]
      })(),
    }
    const affaireOk = {
      ...AFFAIRE_MOCK[0],
      id: 12,
      dateFinContractuelle: (() => {
        const d = new Date()
        d.setDate(d.getDate() + 60)
        return d.toISOString().split('T')[0]
      })(),
    }

    mockListerAffaires.mockResolvedValue([affaireDepassee, affaireAlerte, affaireOk])
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText(/Dépassé de/)).toBeInTheDocument()
    })

    const badgesRestants = screen.getAllByText(/\dj restants/)
    expect(badgesRestants.length).toBeGreaterThanOrEqual(1)
    badgesRestants.forEach((badge) => {
      expect(badge.className).toMatch(/badge-delai/)
    })
  })

  it('navigue vers la fiche affaire au clic', async () => {
    mockListerAffaires.mockResolvedValue(AFFAIRE_MOCK)
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText('MP-2026-001')).toBeInTheDocument()
    })

    const lignes = screen.getAllByRole('row')
    const ligneAffaire = lignes.find((l) => l.textContent?.includes('MP-2026-001'))
    ligneAffaire?.click()

    expect(naviguerMock).toHaveBeenCalledWith('/affaires/1')
  })

  it('affiche le bouton "Nouvelle affaire"', async () => {
    mockListerAffaires.mockResolvedValue([])
    await afficherListeAffaires()
    await waitFor(() => {
      expect(screen.getByText('Aucune affaire enregistrée.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Nouvelle affaire' })).toBeInTheDocument()
  })
})

describe('R12 - Fiche Affaire', () => {
  it('affiche l\'état de chargement', async () => {
    mockLireAffaire.mockReturnValue(new Promise(() => {}))
    await afficherFicheAffaire()
    expect(screen.getByText('Chargement\u2026')).toBeInTheDocument()
  })

  it('affiche la référence et les champs Général', async () => {
    mockLireAffaire.mockResolvedValue(AFFAIRE_MOCK[0])
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('MARCHE_PUBLIC').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('SIGNE')).toBeInTheDocument()
    expect(screen.getByText('Construction hangar')).toBeInTheDocument()
  })

  it('affiche les onglets Général, DQE, Avenants, Délais', async () => {
    mockLireAffaire.mockResolvedValue(AFFAIRE_MOCK[0])
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByRole('tab', { name: 'Général' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'DQE' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Avenants' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Délais' })).toBeInTheDocument()
  })

  it('affiche l\'onglet DQE avec la grille', async () => {
    mockLireAffaire.mockResolvedValue(AFFAIRE_MOCK[0])
    mockListerPostesDqe.mockResolvedValue(POSTES_DQE_MOCK)
    const user = userEvent.setup()
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getByRole('tab', { name: 'DQE' }))

    await waitFor(() => {
      expect(screen.getByText('Béton armé C25/30')).toBeInTheDocument()
    })
  })

  it('affiche l\'onglet Avenants avec la liste', async () => {
    mockLireAffaire.mockResolvedValue(AFFAIRE_MOCK[0])
    mockListerAvenants.mockResolvedValue(AVENANTS_MOCK)
    const user = userEvent.setup()
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getByRole('tab', { name: 'Avenants' }))

    await waitFor(() => {
      expect(screen.getByText('AV-001')).toBeInTheDocument()
      expect(screen.getByText('Extension délai')).toBeInTheDocument()
    })
  })

  it('affiche l\'onglet Délais avec le suivi', async () => {
    mockLireAffaire.mockResolvedValue(AFFAIRE_MOCK[0])
    mockListerEvenements.mockResolvedValue(EVENEMENTS_DELAI_MOCK)
    const user = userEvent.setup()
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getByRole('tab', { name: 'Délais' }))

    await waitFor(() => {
      expect(screen.getByText('Ordre de Service')).toBeInTheDocument()
      expect(screen.getByText('Météo')).toBeInTheDocument()
    })
  })

  it('affiche le bandeau alertes quand délai dépassé', async () => {
    const affaireDepassee = {
      ...AFFAIRE_MOCK[0],
      dateFinContractuelle: '2025-01-01',
    }
    mockLireAffaire.mockResolvedValue(affaireDepassee)
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })

    await waitFor(() => {
      expect(screen.getByText(/Délai dépassé/)).toBeInTheDocument()
    })
  })

  it('n\'affiche pas le bandeau alertes quand pas d\'alerte', async () => {
    const affaireOK = {
      ...AFFAIRE_MOCK[0],
      delaiExecutionJours: 180,
      dateFinContractuelle: (() => {
        const d = new Date()
        d.setDate(d.getDate() + 100)
        return d.toISOString().split('T')[0]
      })(),
    }
    mockLireAffaire.mockResolvedValue(affaireOK)
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.queryByText(/Délai dépassé/)).not.toBeInTheDocument()
  })

  it('affiche le bouton retour vers la liste', async () => {
    mockLireAffaire.mockResolvedValue(AFFAIRE_MOCK[0])
    await afficherFicheAffaire()
    await waitFor(() => {
      expect(screen.getAllByText('MP-2026-001').length).toBeGreaterThanOrEqual(1)
    })

    const boutonRetour = screen.getByRole('button', { name: /Retour/ })
    boutonRetour.click()

    expect(naviguerMock).toHaveBeenCalledWith('/affaires')
  })
})
