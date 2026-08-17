import { useState, type FormEvent } from 'react'
import { utiliserSession } from '../etat-session'

const LONGUEUR_MIN_MDP = 8

export function PremierDemarrage() {
  const [etape, setEtape] = useState<'mot_de_passe' | 'phrase'>('mot_de_passe')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [phrase, setPhrase] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirmationPhrase, setConfirmationPhrase] = useState(false)
  const { definirEcran } = utiliserSession()

  const validerMdp = (e: FormEvent) => {
    e.preventDefault()
    setErreur(null)

    if (motDePasse.length < LONGUEUR_MIN_MDP) {
      setErreur(`Le mot de passe doit comporter au moins ${LONGUEUR_MIN_MDP} caractères.`)
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les mots de passe ne correspondent pas.')
      return
    }
    creerCompte()
  }

  const creerCompte = async () => {
    setEnCours(true)
    try {
      const resultat = await window.egto.session.premierDemarrage({ motDePasse })
      setPhrase(resultat.phrase)
      setMotDePasse('')
      setConfirmation('')
      setEtape('phrase')
    } catch (err) {
      setErreur(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la création du compte.'
      )
    } finally {
      setEnCours(false)
    }
  }

  const imprimer = () => {
    window.print()
  }

  const confirmerPhrase = () => {
    if (!confirmationPhrase) {
      setConfirmationPhrase(true)
      return
    }
    setPhrase(null)
    definirEcran('app')
  }

  if (etape === 'phrase' && phrase) {
    const groupes = phrase.split('-')
    return (
      <div className="ecran-premier-demarrage">
        <div className="carte-premier">
          <h1>Votre phrase de récupération</h1>
          <p className="sous-titre">
            Conservez cette phrase en lieu sûr, hors de ce poste.
          </p>
          <div className="bandeau-avertissement">
            <span className="icone">⚠️</span>
            <span>
              Cette phrase sera affichée une seule fois. Imprimez-la et
              conservez-la en lieu sûr, hors de ce poste.
            </span>
          </div>
          <div className="phrase-a-imprimer">
            <div className="carte-phrase">
              <div className="groupes-phrase">
                {groupes.map((groupe, i) => (
                  <span key={i} className="groupe-phrase">{groupe}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="actions-phrase">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={imprimer}
            >
              Imprimer
            </button>
            <button
              type="button"
              className="bouton"
              onClick={confirmerPhrase}
            >
              {confirmationPhrase ? 'Confirmer' : 'J\'ai conservé ma phrase'}
            </button>
          </div>
          {confirmationPhrase && (
            <p className="erreur" style={{ marginTop: 12 }}>
              Êtes-vous sûr ? Cette phrase ne sera plus jamais affichée.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ecran-premier-demarrage">
      <form className="carte-premier" onSubmit={validerMdp}>
        <h1>Bienvenue dans EGTO</h1>
        <p className="sous-titre">
          Créez votre mot de passe pour commencer
        </p>
        {erreur && <p className="erreur">{erreur}</p>}
        <div className="champ">
          <label htmlFor="mdp-premier">Mot de passe</label>
          <input
            id="mdp-premier"
            type="password"
            autoFocus
            placeholder="Au moins 8 caractères"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        <div className="champ">
          <label htmlFor="mdp-confirmation">Confirmer le mot de passe</label>
          <input
            id="mdp-confirmation"
            type="password"
            placeholder="Retapez le mot de passe"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        <button
          className="bouton"
          type="submit"
          disabled={enCours || !motDePasse || !confirmation}
        >
          {enCours ? 'Création…' : 'Créer mon mot de passe'}
        </button>
      </form>
    </div>
  )
}
