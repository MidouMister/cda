import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

interface Props<T> {
  donnees: T[]
  colonnes: ColumnDef<T, unknown>[]
  hauteurLigne?: number
  actions?: ReactNode
  onSelectionChange?: (selectionnes: T[]) => void
  onLigneClique?: (ligne: T) => void
  etiquettesVide?: string
}

export function Liste<T>({
  donnees,
  colonnes,
  hauteurLigne = 38,
  actions,
  onSelectionChange,
  onLigneClique,
  etiquettesVide = 'Aucune donnée',
}: Props<T>) {
  const [tri, setTri] = useState<SortingState>([])
  const [filtre, setFiltre] = useState('')
  const [page, setPage] = useState(0)
  const lignesParPage = 20

  const colonnesAvecSelection = useMemo<ColumnDef<T, unknown>[]>(() => {
    const selection: ColumnDef<T, unknown> = {
      id: 'selection',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
        />
      ),
      size: 36,
      enableSorting: false,
      enableColumnFilter: false,
    }
    return [selection, ...colonnes]
  }, [colonnes])

  const table = useReactTable({
    data: donnees,
    columns: colonnesAvecSelection,
    state: { sorting: tri, globalFilter: filtre, pagination: { pageIndex: page, pageSize: lignesParPage } },
    onSortingChange: setTri,
    onGlobalFilterChange: setFiltre,
    onPaginationChange: (etat) => {
      if (typeof etat === 'function') {
        const nouveau = etat({ pageIndex: page, pageSize: lignesParPage })
        setPage(nouveau.pageIndex)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  useEffect(() => {
    if (onSelectionChange) {
      const selectionnes = table.getSelectedRowModel().flatRows.map((r) => r.original)
      onSelectionChange(selectionnes)
    }
  }, [table.getState().rowSelection])

  const pageCourant = table.getPageCount()

  return (
    <div className="liste-container">
      <div className="liste-barre">
        <input
          className="liste-recherche"
          type="text"
          placeholder="Rechercher…"
          value={filtre}
          onChange={(e) => {
            setFiltre(e.target.value)
            setPage(0)
          }}
        />
        {actions && <div className="liste-actions">{actions}</div>}
      </div>

      <div className="liste-tableau-wrapper">
        <table className="tableau" role="grid">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((entete) => (
                  <th
                    key={entete.id}
                    style={{ height: hauteurLigne, width: entete.getSize() }}
                    className={entete.column.getCanSort() ? 'triable' : undefined}
                    onClick={entete.column.getToggleSortingHandler()}
                  >
                    <span className="contenu-en-tete">
                      {flexRender(entete.column.columnDef.header, entete.getContext())}
                      {entete.column.getCanSort() && (
                        <span className="indicateur-tri">
                          {entete.column.getIsSorted() === 'asc'
                            ? ' ↑'
                            : entete.column.getIsSorted() === 'desc'
                              ? ' ↓'
                              : ''}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={colonnesAvecSelection.length} className="liste-vide">
                  {filtre ? 'Aucun résultat pour cette recherche.' : etiquettesVide}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((ligne) => (
                <tr
                  key={ligne.id}
                  data-selected={ligne.getIsSelected() || undefined}
                  style={{ height: hauteurLigne }}
                  className={onLigneClique ? 'ligne-cliquable' : undefined}
                  onClick={onLigneClique ? () => onLigneClique(ligne.original) : undefined}
                >
                  {ligne.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ height: hauteurLigne }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCourant > 1 && (
        <div className="liste-pagination">
          <span className="pagination-info">
            Page {page + 1} sur {pageCourant}
          </span>
          <div className="pagination-boutons">
            <button
              className="bouton-pagination"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              «
            </button>
            <button
              className="bouton-pagination"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
            <button
              className="bouton-pagination"
              disabled={page >= pageCourant - 1}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
            <button
              className="bouton-pagination"
              disabled={page >= pageCourant - 1}
              onClick={() => setPage(pageCourant - 1)}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
