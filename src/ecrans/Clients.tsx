import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type { ClientVue } from '../../contrats'

function badgeScore(score: string | null) {
  if (!score) return null
  const classes: Record<string, string> = {
    A: 'badge-score badge-score-a',
    B: 'badge-score badge-score-b',
    C: 'badge-score badge-score-c',
    D: 'badge-score badge-score-d',
  }
  return <span className={classes[score] ?? 'badge-score'}>{score}</span>
}

const colonnes: ColumnDef<ClientVue, unknown>[] = [
  { accessorKey: 'codeClient', header: 'Code', size: 100 },
  { accessorKey: 'raisonSociale', header: 'Raison sociale', size: 220 },
  { accessorKey: 'categorie', header: 'Catégorie', size: 90 },
  { accessorKey: 'secteur', header: 'Secteur', size: 110, cell: (info) => info.getValue() ?? '—' },
  {
    accessorKey: 'scoreClient',
    header: 'Score',
    size: 70,
    cell: (info) => badgeScore(info.getValue() as string | null),
  },
  { accessorKey: 'statut', header: 'Statut', size: 100 },
]

export function Clients() {
  const [clients, setClients] = useState<ClientVue[]>([])
  const [chargement, setChargement] = useState(true)
  const naviguer = useNavigate()

  useEffect(() => {
    window.egto.clients
      .lister()
      .then(setClients)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  if (chargement) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  return (
    <div className="ecran-liste">
      <div className="en-tete-ecran">
        <h1>Clients</h1>
        <button
          className="bouton"
          onClick={() => naviguer('/clients/nouveau')}
        >
          Nouveau client
        </button>
      </div>
      <Liste<ClientVue>
        donnees={clients}
        colonnes={colonnes}
       
        etiquettesVide="Aucun client enregistré."
        onLigneClique={(c) => naviguer(`/clients/${c.id}`)}
      />
    </div>
  )
}
