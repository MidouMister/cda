import { useEffect, useState, useCallback } from 'react'
import type { PosteDqeVue } from '../../contrats'

interface Props {
  affaireId: number
  onAjouter?: () => void
}

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

export function GrilleDqe({ affaireId, onAjouter }: Props) {
  const [postes, setPostes] = useState<PosteDqeVue[]>([])
  const [chargement, setChargement] = useState(true)
  const [posteEnEdition, setPosteEnEdition] = useState<{
    id: number
    champ: string
  } | null>(null)
  const [valeurTemp, setValeurTemp] = useState('')

  const chargerPostes = useCallback(() => {
    window.egto.postesDqe
      .listerParAffaire(affaireId)
      .then(setPostes)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [affaireId])

  useEffect(() => {
    chargerPostes()
  }, [chargerPostes])

  const demarrerEdition = (poste: PosteDqeVue, champ: string) => {
    const valeur = String(poste[champ as keyof PosteDqeVue] ?? '')
    setPosteEnEdition({ id: poste.id, champ })
    setValeurTemp(valeur)
  }

  const sauvegarderCellule = async (posteId: number, champ: string, valeur: string) => {
    setPosteEnEdition(null)
    const donnees: Record<string, string | number> = {}
    if (champ === 'designation' || champ === 'unite' || champ === 'classification') {
      donnees[champ] = valeur
    } else if (champ === 'quantiteMilliemes' || champ === 'puHtCentimes') {
      donnees[champ] = Number(valeur)
    }
    if (Object.keys(donnees).length > 0) {
      await window.egto.postesDqe.modifier(posteId, donnees)
      chargerPostes()
    }
  }

  const gererClavier = (
    e: React.KeyboardEvent,
    posteId: number,
    champ: string,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sauvegarderCellule(posteId, champ, valeurTemp)
    } else if (e.key === 'Escape') {
      setPosteEnEdition(null)
    }
  }

  if (chargement) return <div className="ecran-chargement">Chargement…</div>

  const totalHt = postes.reduce((s, p) => s + p.montantHtCentimes, 0)

  return (
    <div>
      {onAjouter && (
        <div style={{ marginBottom: 12 }}>
          <button className="bouton" onClick={onAjouter}>
            Ajouter un poste
          </button>
        </div>
      )}
      {postes.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          Aucun poste DQE.
        </p>
      ) : (
        <div className="grille-dqe-container">
          <table className="grille-dqe-tableau">
            <thead>
              <tr>
                <th style={{ width: 50 }}>N°</th>
                <th>Désignation</th>
                <th style={{ width: 80 }}>Unité</th>
                <th style={{ width: 100 }}>Quantité</th>
                <th style={{ width: 120 }}>PU HT</th>
                <th style={{ width: 120 }}>Montant HT</th>
                <th style={{ width: 80 }}>Famille</th>
                <th style={{ width: 100 }}>Classification</th>
              </tr>
            </thead>
            <tbody>
              {postes.map((poste) => (
                <tr key={poste.id}>
                  <td>{poste.numero}</td>
                  <td
                    className="editable"
                    onDoubleClick={() => demarrerEdition(poste, 'designation')}
                  >
                    {posteEnEdition?.id === poste.id &&
                    posteEnEdition.champ === 'designation' ? (
                      <input
                        autoFocus
                        value={valeurTemp}
                        onChange={(e) => setValeurTemp(e.target.value)}
                        onBlur={() =>
                          sauvegarderCellule(poste.id, 'designation', valeurTemp)
                        }
                        onKeyDown={(e) =>
                          gererClavier(e, poste.id, 'designation')
                        }
                      />
                    ) : (
                      poste.designation
                    )}
                  </td>
                  <td
                    className="editable"
                    onDoubleClick={() => demarrerEdition(poste, 'unite')}
                  >
                    {posteEnEdition?.id === poste.id &&
                    posteEnEdition.champ === 'unite' ? (
                      <input
                        autoFocus
                        value={valeurTemp}
                        onChange={(e) => setValeurTemp(e.target.value)}
                        onBlur={() =>
                          sauvegarderCellule(poste.id, 'unite', valeurTemp)
                        }
                        onKeyDown={(e) => gererClavier(e, poste.id, 'unite')}
                      />
                    ) : (
                      poste.unite ?? '—'
                    )}
                  </td>
                  <td
                    className="editable"
                    onDoubleClick={() =>
                      demarrerEdition(poste, 'quantiteMilliemes')
                    }
                  >
                    {posteEnEdition?.id === poste.id &&
                    posteEnEdition.champ === 'quantiteMilliemes' ? (
                      <input
                        autoFocus
                        type="number"
                        value={valeurTemp}
                        onChange={(e) => setValeurTemp(e.target.value)}
                        onBlur={() =>
                          sauvegarderCellule(
                            poste.id,
                            'quantiteMilliemes',
                            valeurTemp,
                          )
                        }
                        onKeyDown={(e) =>
                          gererClavier(e, poste.id, 'quantiteMilliemes')
                        }
                      />
                    ) : (
                      poste.quantiteMilliemes
                    )}
                  </td>
                  <td
                    className="editable"
                    onDoubleClick={() =>
                      demarrerEdition(poste, 'puHtCentimes')
                    }
                  >
                    {posteEnEdition?.id === poste.id &&
                    posteEnEdition.champ === 'puHtCentimes' ? (
                      <input
                        autoFocus
                        type="number"
                        value={valeurTemp}
                        onChange={(e) => setValeurTemp(e.target.value)}
                        onBlur={() =>
                          sauvegarderCellule(
                            poste.id,
                            'puHtCentimes',
                            valeurTemp,
                          )
                        }
                        onKeyDown={(e) =>
                          gererClavier(e, poste.id, 'puHtCentimes')
                        }
                      />
                    ) : (
                      formatterCentimes(poste.puHtCentimes)
                    )}
                  </td>
                  <td>{formatterCentimes(poste.montantHtCentimes)}</td>
                  <td>{poste.familleId ?? '—'}</td>
                  <td>{poste.classification ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grille-dqe-total">
            Total HT : {formatterCentimes(totalHt)}
          </div>
        </div>
      )}
    </div>
  )
}
