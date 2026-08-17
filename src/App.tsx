import { useEffect } from 'react'
import { utiliserSession } from './etat-session'
import { Connexion } from './ecrans/Connexion'
import { PremierDemarrage } from './ecrans/PremierDemarrage'
import { Shell } from './Shell'

export function App() {
  const ecran = utiliserSession((s) => s.ecran)
  const definirEcran = utiliserSession((s) => s.definirEcran)
  const definirErreur = utiliserSession((s) => s.definirErreur)

  useEffect(() => {
    let actif = true
    window.egto.session
      .etat()
      .then((etat) => {
        if (!actif) return
        if (!etat.premierDemarrage) {
          definirEcran('premier_demarrage')
        } else {
          definirEcran('connexion')
        }
      })
      .catch(() => {
        if (actif) definirErreur('Erreur de connexion au serveur.')
      })
    return () => {
      actif = false
    }
  }, [definirEcran, definirErreur])

  if (ecran === 'chargement') {
    return <div className="ecran-chargement">Chargement…</div>
  }

  if (ecran === 'premier_demarrage') return <PremierDemarrage />
  if (ecran === 'connexion') return <Connexion />
  return <Shell />
}
