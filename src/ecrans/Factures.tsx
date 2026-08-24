import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type { FactureVue } from '../../contrats'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

function formaterDate(iso: string | null): string {
  if (!iso) return '\u2014'
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

const CLASSE_STATUT: Record<string, string> = {
  BROUILLON: 'badge-brouillon',
  VALIDE: 'badge-valide',
  IMPRIMEE: 'badge-imprimee',
  ENVOYEE: 'badge-envoyee',
  PAYEE: 'badge-payee',
  ARCHIVEE: 'badge-archivee',
}

const CLASSE_TYPE: Record<string, string> = {
  FA: 'badge-fa',
  AC: 'badge-ac',
  AV: 'badge-av',
}

function BadgeStatut({ statut }: { statut: string }) {
  const classe = CLASSE_STATUT[statut] ?? 'badge-brouillon'
  return <span className={`badge-statut ${classe}`}>{statut}</span>
}

function BadgeType({ type }: { type: string }) {
  const classe = CLASSE_TYPE[type] ?? 'badge-brouillon'
  return <span className={`badge-statut ${classe}`}>{type}</span>
}

export function Factures() {
  const [factures, setFactures] = useState<FactureVue[]>([])
  const [chargement, setChargement] = useState(true)
  const [filtrageStatut, setFiltrageStatut] = useState('')
  const naviguer = useNavigate()

  useEffect(() => {
    window.egto.factures
      .lister()
      .then(setFactures)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  const statutsDisponibles = useMemo(() => {
    const ensemble = new Set(factures.map((f) => f.statut))
    return Array.from(ensemble).sort()
  }, [factures])

  const donneesFiltrees = useMemo(() => {
    if (!filtrageStatut) return factures
    return factures.filter((f) => f.statut === filtrageStatut)
  }, [factures, filtrageStatut])

  const colonnes: ColumnDef<FactureVue, unknown>[] = [
    {
      accessorKey: 'numero',
      header: 'N\u00b0',
      size: 130,
      cell: (info) => (info.getValue() as string | null) ?? '\u2014',
    },
    {
      accessorKey: 'typeDocument',
      header: 'Type',
      size: 70,
      cell: (info) => <BadgeType type={info.getValue() as string} />,
    },
    {
      accessorKey: 'clientId',
      header: 'Client',
      size: 80,
      cell: (info) => {
        const val = info.getValue() as number
        return `#${val}`
      },
    },
    {
      accessorKey: 'affaireId',
      header: 'Affaire',
      size: 80,
      cell: (info) => {
        const val = info.getValue() as number | null
        return val != null ? `#${val}` : '\u2014'
      },
    },
    {
      accessorKey: 'dateFacture',
      header: 'Date',
      size: 110,
      cell: (info) => formaterDate(info.getValue() as string),
    },
    {
      accessorKey: 'dateEcheance',
      header: '\u00c9ch\u00e9ance',
      size: 110,
      cell: (info) => formaterDate(info.getValue() as string | null),
    },
    {
      accessorKey: 'totalTtcCentimes',
      header: 'Total TTC',
      size: 120,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
    {
      accessorKey: 'netAPayerCentimes',
      header: 'Solde',
      size: 120,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      size: 110,
      cell: (info) => <BadgeStatut statut={info.getValue() as string} />,
    },
  ]

  if (chargement) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  return (
    <div className="ecran-liste">
      <div className="en-tete-ecran">
        <h1>Factures</h1>
        <button
          className="bouton"
          onClick={() => naviguer('/factures/nouveau')}
        >
          Nouvelle facture
        </button>
      </div>
      <Liste<FactureVue>
        donnees={donneesFiltrees}
        colonnes={colonnes}
        etiquettesVide="Aucune facture enregistr\u00e9e."
        onLigneClique={(f) => naviguer(`/factures/${f.id}`)}
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
