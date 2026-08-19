import { useEffect, useState } from 'react'
import type { EvenementDelaiVue } from '../../contrats'

interface Props {
  affaireId: number
  onAjouter?: () => void
}

const COULEUR_TYPE: Record<string, string> = {
  ODS: 'timeline-type-ods',
  SUSPENSION: 'timeline-type-suspension',
  REPRISE: 'timeline-type-reprise',
  PROROGATION: 'timeline-type-prorogation',
}

const LABEL_TYPE: Record<string, string> = {
  ODS: 'ODS',
  SUSPENSION: 'Suspension',
  REPRISE: 'Reprise',
  PROROGATION: 'Prorogation',
}

export function SuiviDelais({ affaireId, onAjouter }: Props) {
  const [evenements, setEvenements] = useState<EvenementDelaiVue[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    window.egto.evenementsDelais
      .listerParAffaire(affaireId)
      .then(setEvenements)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [affaireId])

  if (chargement) return <div className="ecran-chargement">Chargement…</div>

  return (
    <div>
      {onAjouter && (
        <div style={{ marginBottom: 12 }}>
          <button className="bouton" onClick={onAjouter}>
            Ajouter un événement
          </button>
        </div>
      )}
      {evenements.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          Aucun événement de délai enregistré.
        </p>
      ) : (
        <div className="timeline-delais">
          {evenements.map((evt) => (
            <div key={evt.id} className="timeline-evenement">
              <span className={`timeline-type-badge ${COULEUR_TYPE[evt.typeEvenement] ?? ''}`}>
                {LABEL_TYPE[evt.typeEvenement] ?? evt.typeEvenement}
              </span>
              <div>
                <div className="timeline-dates">
                  {evt.dateDebut ?? '—'}
                  {evt.dateFin ? ` → ${evt.dateFin}` : ''}
                  {evt.dureeJours != null ? ` (${evt.dureeJours}j)` : ''}
                </div>
                {evt.motif && <div className="timeline-motif">{evt.motif}</div>}
                {evt.impactDelaiJours !== 0 && (
                  <div className="timeline-impact">
                    Impact : {evt.impactDelaiJours > 0 ? '+' : ''}
                    {evt.impactDelaiJours} jours
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
