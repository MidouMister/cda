import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type { AffaireVue } from '../../contrats'

const CLASSE_TYPE: Record<string, string> = {
  MARCHE_PUBLIC: 'badge-marche-public',
  CONTRAT_PRIVE: 'badge-contrat-prive',
  BC: 'badge-bc',
}

const LABEL_TYPE: Record<string, string> = {
  MARCHE_PUBLIC: 'Marché public',
  CONTRAT_PRIVE: 'Contrat privé',
  BC: 'Bon de commande',
}

const CLASSE_STATUT: Record<string, string> = {
  BROUILLON: 'badge-brouillon',
  SIGNE: 'badge-signe',
  EN_COURS: 'badge-envoye',
  TERMINEE: 'badge-accepte',
  RESILIEE: 'badge-refuse',
}

function BadgeType({ type }: { type: string }) {
  const classe = CLASSE_TYPE[type] ?? 'badge-bc'
  return (
    <span className={`badge-statut ${classe}`}>
      {LABEL_TYPE[type] ?? type}
    </span>
  )
}

function BadgeStatut({ statut }: { statut: string }) {
  const classe = CLASSE_STATUT[statut] ?? 'badge-brouillon'
  return <span className={`badge-statut ${classe}`}>{statut}</span>
}

function BadgeDelai({ jours }: { jours: number }) {
  if (jours <= 0) {
    return (
      <span className="badge-delai badge-delai-depasse">
        Dépassé de {Math.abs(jours)}j
      </span>
    )
  }
  if (jours < 15) {
    return (
      <span className="badge-delai badge-delai-alerte">
        {jours}j restants
      </span>
    )
  }
  return (
    <span className="badge-delai badge-delai-ok">
      {jours}j restants
    </span>
  )
}

function calculerJoursRestants(affaire: AffaireVue): number | null {
  const dateFinStr = affaire.dateFinRevisee ?? affaire.dateFinContractuelle
  if (!dateFinStr) return null
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)
  const dateFin = new Date(dateFinStr)
  const diffMs = dateFin.getTime() - aujourd.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function Affaires() {
  const [affaires, setAffaires] = useState<AffaireVue[]>([])
  const [chargement, setChargement] = useState(true)
  const naviguer = useNavigate()

  useEffect(() => {
    window.egto.affaires
      .lister()
      .then(setAffaires)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  const colonnes: ColumnDef<AffaireVue, unknown>[] = [
    { accessorKey: 'reference', header: 'Référence', size: 120 },
    {
      accessorKey: 'typeAffaire',
      header: 'Type',
      size: 130,
      cell: (info) => <BadgeType type={info.getValue() as string} />,
    },
    { accessorKey: 'clientId', header: 'Client', size: 80 },
    {
      accessorKey: 'objet',
      header: 'Objet',
      size: 220,
      cell: (info) => info.getValue() ?? '—',
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      size: 110,
      cell: (info) => <BadgeStatut statut={info.getValue() as string} />,
    },
    {
      id: 'dateFin',
      header: 'Échéance',
      size: 110,
      cell: ({ row }) => {
        const aff = row.original
        return aff.dateFinRevisee ?? aff.dateFinContractuelle ?? '—'
      },
    },
    {
      id: 'delaiRestant',
      header: 'Délai',
      size: 120,
      cell: ({ row }) => {
        const jours = calculerJoursRestants(row.original)
        if (jours == null) return '—'
        return <BadgeDelai jours={jours} />
      },
    },
  ]

  if (chargement) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  return (
    <div className="ecran-liste">
      <div className="en-tete-ecran">
        <h1>Affaires</h1>
        <button
          className="bouton"
          onClick={() => naviguer('/affaires/nouveau')}
        >
          Nouvelle affaire
        </button>
      </div>
      <Liste<AffaireVue>
        donnees={affaires}
        colonnes={colonnes}
        etiquettesVide="Aucune affaire enregistrée."
        onLigneClique={(a) => naviguer(`/affaires/${a.id}`)}
      />
    </div>
  )
}
