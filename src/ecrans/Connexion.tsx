import { useState, type FormEvent } from 'react'
import { utiliserSession } from '../etat-session'

export function Connexion() {
  const [motDePasse, setMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const { erreur, definirErreur, definirEcran } = utiliserSession()

  const soumettre = async (e: FormEvent) => {
    e.preventDefault()
    if (!motDePasse || enCours) return
    definirErreur(null)
    setEnCours(true)
    try {
      await window.egto.session.deverrouiller({ motDePasse })
      setMotDePasse('')
      definirEcran('app')
    } catch (err) {
      definirErreur(
        err instanceof Error ? err.message : 'Enveloppe invalide ou secret incorrect.'
      )
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="ecran-connexion">
      <form className="carte-connexion" onSubmit={soumettre}>
        <h1>EGTO</h1>
        <p className="sous-titre">Connectez-vous à votre espace</p>
        {erreur && <p className="erreur">{erreur}</p>}
        <div className="champ">
          <label htmlFor="mdp-connexion">Mot de passe</label>
          <input
            id="mdp-connexion"
            type="password"
            autoFocus
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        <button className="bouton" type="submit" disabled={enCours || !motDePasse}>
          {enCours ? 'Déverrouillage…' : 'Déverrouiller'}
        </button>
      </form>
    </div>
  )
}
