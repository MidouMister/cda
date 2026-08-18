import { useState, useEffect, useCallback, type ReactNode } from 'react'

interface Onglet {
  id: string
  label: string
  contenu: ReactNode
}

interface Props {
  onglets: Onglet[]
  ongletDefaut?: string
}

export function FicheAOnglets({ onglets, ongletDefaut }: Props) {
  const [ongletActif, setOngletActif] = useState(ongletDefaut ?? onglets[0]?.id ?? '')

  useEffect(() => {
    if (!onglets.find((o) => o.id === ongletActif)) {
      setOngletActif(onglets[0]?.id ?? '')
    }
  }, [onglets])

  const ongletIndex = onglets.findIndex((o) => o.id === ongletActif)

  const gererClavier = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setOngletActif(onglets[(ongletIndex + 1) % onglets.length].id)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setOngletActif(onglets[(ongletIndex - 1 + onglets.length) % onglets.length].id)
      }
    },
    [onglets, ongletIndex],
  )

  return (
    <div className="fiche-onglets">
      <div className="onglet-barre" role="tablist" onKeyDown={gererClavier}>
        {onglets.map((onglet) => (
          <button
            key={onglet.id}
            role="tab"
            aria-selected={onglet.id === ongletActif}
            className={`onglet ${onglet.id === ongletActif ? 'onglet-actif' : ''}`}
            onClick={() => setOngletActif(onglet.id)}
          >
            {onglet.label}
          </button>
        ))}
      </div>
      <div className="onglet-contenu" role="tabpanel">
        {onglets.find((o) => o.id === ongletActif)?.contenu}
      </div>
    </div>
  )
}
