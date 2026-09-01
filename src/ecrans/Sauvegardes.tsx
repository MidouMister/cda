import { useEffect, useState } from 'react'
import type { EtatSauvegardeVue } from '../../contrats'

const formaterHorodatage = (iso: string | null): string => {
  if (!iso) return 'Aucune sauvegarde automatique effectuée.'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const deux = (n: number): string => String(n).padStart(2, '0')
  return `${deux(date.getDate())}/${deux(date.getMonth() + 1)}/${date.getFullYear()} ${deux(date.getHours())}:${deux(date.getMinutes())}`
}

export function Sauvegardes() {
  const [activee, setActivee] = useState(true)
  const [horaireQuotidienne, setHoraireQuotidienne] = useState('03:00')
  const [destination, setDestination] = useState('')
  const [derniereExecution, setDerniereExecution] = useState<string | null>(null)
  const [derniereErreur, setDerniereErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [confirme, setConfirme] = useState<string | null>(null)

  const chargerEtat = async () => {
    let etat: EtatSauvegardeVue
    try {
      etat = await window.egto.sauvegarde.etat()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur de lecture de la configuration.')
      return
    }
    setActivee(etat.activee)
    setHoraireQuotidienne(etat.horaireQuotidienne)
    setDestination(etat.destination)
    setDerniereExecution(etat.derniereExecution)
    setDerniereErreur(etat.derniereErreur)
  }

  useEffect(() => {
    let actif = true
    window.egto.sauvegarde
      .etat()
      .then((etat) => {
        if (!actif) return
        setActivee(etat.activee)
        setHoraireQuotidienne(etat.horaireQuotidienne)
        setDestination(etat.destination)
        setDerniereExecution(etat.derniereExecution)
        setDerniereErreur(etat.derniereErreur)
      })
      .catch((err) => {
        if (actif) setErreur(err instanceof Error ? err.message : 'Erreur de lecture de la configuration.')
      })
      .finally(() => {
        if (actif) setChargement(false)
      })
    return () => {
      actif = false
    }
  }, [])

  const choisirDestination = async () => {
    setErreur(null)
    setConfirme(null)
    try {
      const resultat = await window.egto.sauvegarde.choisirDestination()
      if (!resultat.annule && resultat.destination) {
        setDestination(resultat.destination)
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur de sélection du dossier.')
    }
  }

  const enregistrer = async () => {
    setEnCours(true)
    setErreur(null)
    setConfirme(null)
    try {
      await window.egto.sauvegarde.configurer({ activee, horaireQuotidienne, destination })
      await chargerEtat()
      setConfirme('Configuration enregistrée.')
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur d’enregistrement de la configuration.')
    } finally {
      setEnCours(false)
    }
  }

  if (chargement) {
    return <p className="parametrage-notes">Chargement…</p>
  }

  return (
    <div className="parametrage-section">
      <h2>Sauvegardes</h2>

      {erreur && <div className="bandeau-erreur">{erreur}</div>}
      {confirme && <div className="parametrage-succes">{confirme}</div>}
      {derniereErreur && (
        <div className="bandeau-avertissement">
          <span className="icone">⚠</span>
          <span>Échec de la dernière sauvegarde automatique : {derniereErreur}</span>
        </div>
      )}

      <div className="formulaire">
        <label className="parametrage-champ-booleen">
          <input
            type="checkbox"
            checked={activee}
            onChange={(e) => setActivee(e.target.checked)}
          />
          <span>Sauvegarde automatique quotidienne</span>
        </label>

        <div className="champ-formulaire">
          <label htmlFor="horaire-quotidienne">Heure quotidienne</label>
          <input
            id="horaire-quotidienne"
            type="time"
            value={horaireQuotidienne}
            onChange={(e) => setHoraireQuotidienne(e.target.value)}
          />
        </div>

        <div className="champ-formulaire">
          <label htmlFor="dossier-destination">Dossier de destination</label>
          <div className="parametrage-ligne">
            <input
              id="dossier-destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Aucun dossier configuré"
            />
            <button type="button" className="bouton-secondaire" onClick={choisirDestination}>
              Parcourir…
            </button>
          </div>
        </div>

        <button type="button" className="bouton" onClick={enregistrer} disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Enregistrer la configuration'}
        </button>
      </div>

      <p className="parametrage-historique">
        Dernière sauvegarde automatique : <strong>{formaterHorodatage(derniereExecution)}</strong>
      </p>
    </div>
  )
}