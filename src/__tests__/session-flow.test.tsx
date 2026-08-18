// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { utiliserSession } from '../etat-session'

const mockSession = {
  etat: vi.fn(),
  premierDemarrage: vi.fn(),
  deverrouiller: vi.fn(),
  verrouiller: vi.fn(),
  changerMotDePasse: vi.fn(),
  activite: vi.fn(),
}

const mockClients = {
  lister: vi.fn().mockResolvedValue([]),
  creer: vi.fn(),
  lire: vi.fn(),
  modifier: vi.fn(),
  supprimer: vi.fn(),
  creerContact: vi.fn(),
  listerContacts: vi.fn().mockResolvedValue([]),
  modifierContact: vi.fn(),
  supprimerContact: vi.fn(),
  creerInteraction: vi.fn(),
  listerInteractions: vi.fn().mockResolvedValue([]),
  supprimerInteraction: vi.fn(),
  calculerScore: vi.fn(),
}

vi.stubGlobal('egto', { session: mockSession, diagnostic: vi.fn(), clients: mockClients })

function reinitialiserStore() {
  utiliserSession.setState({
    ecran: 'chargement',
    motDePasseTemporaire: null,
    phraseRecuperation: null,
    premierDemarrageEffectue: false,
    erreur: null,
  })
}

beforeEach(() => {
  reinitialiserStore()
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

const APRES_CHARGEMENT = { verrouillee: true, premierDemarrage: true }
const PREMIER_DMARRAGE = { verrouillee: true, premierDemarrage: false }

async function afficherApp() {
  const { App } = await import('../App')
  render(<App />)
}

describe('Flux de session - ecran initial', () => {
  it('affiche le chargement au demarrage', async () => {
    mockSession.etat.mockReturnValue(new Promise(() => {}))
    await afficherApp()
    expect(screen.getByText('Chargement\u2026')).toBeInTheDocument()
  })

  it('affiche PremierDemarrage si aucune enveloppe', async () => {
    mockSession.etat.mockResolvedValue(PREMIER_DMARRAGE)
    await afficherApp()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bienvenue dans EGTO' })).toBeInTheDocument()
    })
  })

  it('affiche Connexion si enveloppes existent', async () => {
    mockSession.etat.mockResolvedValue(APRES_CHARGEMENT)
    await afficherApp()
    await waitFor(() => {
      expect(screen.getByText(/Connectez-vous/)).toBeInTheDocument()
    })
  })
})

describe('Ecran PremierDemarrage', () => {
  beforeEach(() => {
    mockSession.etat.mockResolvedValue(PREMIER_DMARRAGE)
  })

  it('affiche erreur si mot de passe trop court', async () => {
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    await user.type(screen.getByLabelText('Mot de passe'), 'court')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'court')
    await user.click(screen.getByRole('button'))

    expect(screen.getByText(/au moins 8 caract/)).toBeInTheDocument()
  })

  it('affiche erreur si mots de passe ne correspondent pas', async () => {
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    await user.type(screen.getByLabelText('Mot de passe'), 'monMotDePasse123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'autreMotDePasse123')
    await user.click(screen.getByRole('button'))

    expect(screen.getByText('Les mots de passe ne correspondent pas.')).toBeInTheDocument()
  })

  it('appelle premierDemarrage IPC avec le bon mot de passe', async () => {
    mockSession.premierDemarrage.mockResolvedValue({ phrase: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF' })
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    const mdp = 'monMotDePasse123'
    await user.type(screen.getByLabelText('Mot de passe'), mdp)
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), mdp)
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockSession.premierDemarrage).toHaveBeenCalledWith({ motDePasse: mdp })
    })
  })

  it('affiche la phrase apres premierDemarrage reussi', async () => {
    mockSession.premierDemarrage.mockResolvedValue({ phrase: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF' })
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    await user.type(screen.getByLabelText('Mot de passe'), 'monMotDePasse123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'monMotDePasse123')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /r.cup/ })).toBeInTheDocument()
    })
    expect(screen.getByText('AAAA')).toBeInTheDocument()
    expect(screen.getByText('FFFF')).toBeInTheDocument()
  })

  it('affiche erreur du backend', async () => {
    mockSession.premierDemarrage.mockRejectedValue(new Error('Erreur interne'))
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    await user.type(screen.getByLabelText('Mot de passe'), 'monMotDePasse123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'monMotDePasse123')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Erreur interne')).toBeInTheDocument()
    })
  })
})

describe('Ecran Connexion', () => {
  beforeEach(() => {
    mockSession.etat.mockResolvedValue(APRES_CHARGEMENT)
  })

  it('affiche erreur du backend si deverrouiller echoue', async () => {
    mockSession.deverrouiller.mockRejectedValue(
      new Error('Enveloppe invalide ou secret incorrect.')
    )
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByText(/Connectez-vous/))

    await user.type(screen.getByLabelText('Mot de passe'), 'mauvaisMdp123')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Enveloppe invalide ou secret incorrect.')).toBeInTheDocument()
    })
  })

  it('appelle deverrouiller IPC', async () => {
    mockSession.deverrouiller.mockResolvedValue(undefined)
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByText(/Connectez-vous/))

    await user.type(screen.getByLabelText('Mot de passe'), 'bonMdp1234')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockSession.deverrouiller).toHaveBeenCalledWith({ motDePasse: 'bonMdp1234' })
    })
  })
})

describe('Regles de securite', () => {
  it('aucun stockage persistant utilise pour la phrase ou le mdp', async () => {
    mockSession.etat.mockResolvedValue(PREMIER_DMARRAGE)
    mockSession.premierDemarrage.mockResolvedValue({ phrase: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF' })
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    await user.type(screen.getByLabelText('Mot de passe'), 'monMotDePasse123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'monMotDePasse123')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /r.cup/ })).toBeInTheDocument()
    })

    expect(screen.queryByText('monMotDePasse123')).not.toBeInTheDocument()
  })

  it('la phrase disparait apres confirmation', async () => {
    mockSession.etat.mockResolvedValue(PREMIER_DMARRAGE)
    mockSession.premierDemarrage.mockResolvedValue({ phrase: 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF' })
    const user = userEvent.setup()
    await afficherApp()
    await waitFor(() => screen.getByRole('heading', { name: 'Bienvenue dans EGTO' }))

    await user.type(screen.getByLabelText('Mot de passe'), 'monMotDePasse123')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'monMotDePasse123')
    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /r.cup/ })).toBeInTheDocument()
    })

    const boutonConservation = screen.getByRole('button', { name: /conserv/i })
    await user.click(boutonConservation)
    await user.click(boutonConservation)

    await waitFor(() => {
      expect(screen.queryByText('AAAA')).not.toBeInTheDocument()
    })
  })
})
