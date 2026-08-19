import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type { DevisVue } from '../../contrats'

const CLASSE_STATUT: Record<string, string> = {
  BROUILLON: 'badge-brouillon',
  ENVOYE: 'badge-envoye',
  ACCEPTE: 'badge-accepte',
  REFUSE: 'badge-refuse',
  EXPIRE: 'badge-expire',
}

function BadgeStatut({ statut }: { statut: string }) {
  const classe = CLASSE_STATUT[statut] ?? 'badge-brouillon'
  return <span className={`badge-statut ${classe}`}>{statut}</span>
}

export function Devis() {
  const [devis, setDevis] = useState<DevisVue[]>([])
  const [chargement, setChargement] = useState(true)
  const [filtrageStatut, setFiltrageStatut] = useState('')
  const naviguer = useNavigate()

  useEffect(() => {
    window.egto.devis
      .lister()
      .then(setDevis)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  const statutsDisponibles = useMemo(() => {
    const ensemble = new Set(devis.map((d) => d.statut))
    return Array.from(ensemble).sort()
  }, [devis])

  const donneesFiltrees = useMemo(() => {
    if (!filtrageStatut) return devis
    return devis.filter((d) => d.statut === filtrageStatut)
  }, [devis, filtrageStatut])

  const colonnes: ColumnDef<DevisVue, unknown>[] = [
    { accessorKey: 'numeroDevis', header: 'N° Devis', size: 120 },
    { accessorKey: 'clientId', header: 'Client', size: 100 },
    { accessorKey: 'dateDevis', header: 'Date', size: 110 },
    {
      accessorKey: 'dateValidite',
      header: 'Validité',
      size: 110,
      cell: (info) => info.getValue() ?? '—',
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      size: 110,
      cell: (info) => <BadgeStatut statut={info.getValue() as string} />,
    },
    {
      accessorKey: 'rabaisGlobalBps',
      header: 'Rabais (bps)',
      size: 100,
      cell: (info) => {
        const val = info.getValue() as number
        return val !== 0 ? `${val} bps` : '—'
      },
    },
    {
      accessorKey: 'affaireId',
      header: 'Affaire',
      size: 100,
      cell: (info) => {
        const val = info.getValue() as number | null
        return val != null ? `#${val}` : '—'
      },
    },
  ]

  if (chargement) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  return (
    <div className="ecran-liste">
      <div className="en-tete-ecran">
        <h1>Devis</h1>
        <button
          className="bouton"
          onClick={() => naviguer('/devis/nouveau')}
        >
          Nouveau devis
        </button>
      </div>
      <Liste<DevisVue>
        donnees={donneesFiltrees}
        colonnes={colonnes}
        etiquettesVide="Aucun devis enregistré."
        onLigneClique={(d) => naviguer(`/devis/${d.id}`)}
        actions={
          <select
            className="bouton-secondaire"
            value={filtrageStatut}
            onChange={(e) => setFiltrageStatut(e.target.value)}
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            <option value="">Tous les statuts</option>
            {statutsDisponibles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      />
    </div>
  )
}
