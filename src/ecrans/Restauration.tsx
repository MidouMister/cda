import { useState, type FormEvent } from 'react'
import { utiliserSession } from '../etat-session'

export function Restauration() {
  const [phraseRecuperation, setPhraseRecuperation] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const { definirEcran } = utiliserSession()

  const restaurer = async (e: FormEvent) => {
    e.preventDefault()
    if (!phraseRecuperation.trim() || enCours) return
    if (nouveauMotDePasse.trim().length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }
    setErreur(null)
    setEnCours(true)
    try {
      const resultat = await window.egto.sauvegarde.restaurer({
        phraseRecuperation: phraseRecuperation.trim(),
        nouveauMotDePasseApplicatif: nouveauMotDePasse,
      })
      if (!resultat.succes) {
        setErreur(resultat.erreur ?? 'Échec de la restauration.')
        return
      }
      setSucces(true)
    } catch (err) {
      setErreur(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la restauration.',
      )
    } finally {
      setEnCours(false)
    }
  }

  if (succes) {
    return (
      <div className="ecran-connexion">
        <div className="carte-connexion">
          <h1>Restauration réussie</h1>
          <p className="sous-titre">
            Les données ont été restaurées avec succès.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <button
            className="bouton"
            type="button"
            onClick={() => definirEcran('connexion')}
          >
            Aller à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ecran-connexion">
      <form className="carte-connexion" onSubmit={restaurer}>
        <h1>Restaurer une sauvegarde</h1>
        <p className="sous-titre">
          Saisissez votre phrase de récupération, un nouveau mot de passe, puis sélectionnez l&apos;archive.
        </p>
        {enCours && <div className="barre-progression" style={{ marginBottom: 16 }} />}
        {erreur && <p className="erreur">{erreur}</p>}
        <div className="champ">
          <label htmlFor="phrase-restauration">Phrase de récupération</label>
          <input
            id="phrase-restauration"
            type="password"
            autoFocus
            placeholder="AAAA-BBBB-CCCC-DDDD-EEEE-FFFF"
            value={phraseRecuperation}
            onChange={(e) => setPhraseRecuperation(e.target.value)}
          />
        </div>
        <div className="champ">
          <label htmlFor="nouveau-mot-de-passe">Nouveau mot de passe</label>
          <input
            id="nouveau-mot-de-passe"
            type="password"
            autoComplete="new-password"
            value={nouveauMotDePasse}
            onChange={(e) => setNouveauMotDePasse(e.target.value)}
          />
        </div>
        <div className="champ">
          <label htmlFor="confirmation-mot-de-passe">Confirmer le mot de passe</label>
          <input
            id="confirmation-mot-de-passe"
            type="password"
            autoComplete="new-password"
            value={confirmationMotDePasse}
            onChange={(e) => setConfirmationMotDePasse(e.target.value)}
          />
        </div>
        <button
          className="bouton"
          type="submit"
          disabled={enCours || !phraseRecuperation.trim()}
        >
          {enCours ? 'Restauration…' : 'Sélectionner et restaurer'}
        </button>
        <p style={{ marginTop: 16 }}>
          <button
            type="button"
            className="bouton-link"
            onClick={() => definirEcran('connexion')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            Retour à la connexion
          </button>
        </p>
      </form>
    </div>
  )
}
