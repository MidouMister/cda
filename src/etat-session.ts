import { create } from 'zustand'

export type EcranSession = 'chargement' | 'premier_demarrage' | 'connexion' | 'phrase' | 'app'

interface EtatSession {
  ecran: EcranSession
  motDePasseTemporaire: string | null
  phraseRecuperation: string | null
  premierDemarrageEffectue: boolean
  erreur: string | null
  definirEcran: (ecran: EcranSession) => void
  definirMotDePasseTemporaire: (mdp: string | null) => void
  definirPhraseRecuperation: (phrase: string | null) => void
  definirErreur: (erreur: string | null) => void
  reinitialiser: () => void
}

const ETAT_INITIAL = {
  ecran: 'chargement' as EcranSession,
  motDePasseTemporaire: null,
  phraseRecuperation: null,
  premierDemarrageEffectue: false,
  erreur: null,
}

export const utiliserSession = create<EtatSession>((set) => ({
  ...ETAT_INITIAL,
  definirEcran: (ecran) => set({ ecran }),
  definirMotDePasseTemporaire: (motDePasseTemporaire) => set({ motDePasseTemporaire }),
  definirPhraseRecuperation: (phraseRecuperation) => set({ phraseRecuperation }),
  definirErreur: (erreur) => set({ erreur }),
  reinitialiser: () => set(ETAT_INITIAL),
}))
