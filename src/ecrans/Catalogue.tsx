import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type { ProduitVue, FamilleVue } from '../../contrats'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

const colonnes: ColumnDef<ProduitVue, unknown>[] = [
  { accessorKey: 'codeProduit', header: 'Code', size: 110 },
  { accessorKey: 'libelle', header: 'Libellé', size: 250 },
  { accessorKey: 'familleId', header: 'Famille', size: 130 },
  { accessorKey: 'unite', header: 'Unité', size: 80 },
  {
    accessorKey: 'puReferenceCentimes',
    header: 'Prix unitaire',
    size: 120,
    cell: (info) => formatterCentimes(info.getValue() as number),
  },
  { accessorKey: 'typeTarification', header: 'Tarification', size: 120 },
]

export function Catalogue() {
  const [produits, setProduits] = useState<ProduitVue[]>([])
  const [familles, setFamilles] = useState<FamilleVue[]>([])
  const [chargement, setChargement] = useState(true)
  const naviguer = useNavigate()

  useEffect(() => {
    Promise.all([window.egto.produits.lister(), window.egto.familles.lister()])
      .then(([p, f]) => {
        setProduits(p)
        setFamilles(f)
      })
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  const resolutionFamille = (id: number) => familles.find((f) => f.id === id)?.libelle ?? String(id)

  const colonnesResolues: ColumnDef<ProduitVue, unknown>[] = colonnes.map((col) => {
    if ('accessorKey' in col && col.accessorKey === 'familleId') {
      return {
        ...col,
        cell: (info) => resolutionFamille(info.getValue() as number),
      }
    }
    return col
  })

  if (chargement) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  return (
    <div className="ecran-liste">
      <div className="en-tete-ecran">
        <h1>Catalogue</h1>
        <button
          className="bouton"
          onClick={() => naviguer('/catalogue/nouveau')}
        >
          Nouveau produit
        </button>
      </div>
      <Liste<ProduitVue>
        donnees={produits}
        colonnes={colonnesResolues}
       
        etiquettesVide="Aucun produit enregistré."
        onLigneClique={(p) => naviguer(`/catalogue/${p.id}`)}
      />
    </div>
  )
}
