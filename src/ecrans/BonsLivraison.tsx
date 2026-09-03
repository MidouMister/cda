import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type { BonLivraisonVue } from '../../contrats'

function formaterDate(iso: string | null): string {
  if (!iso) return '—'
  const parties = iso.split('-')
  if (parties.length < 3) return iso
  return `${parties[2]}/${parties[1]}/${parties[0]}`
}

const CLASSE_STATUT: Record<string, string> = {
  EMIS: 'badge-accepte',
  FACTURE: 'badge-envoye',
}

function BadgeStatut({ statut }: { statut: string }) {
  const classe = CLASSE_STATUT[statut] ?? 'badge-brouillon'
  return <span className={`badge-statut ${classe}`}>{statut}</span>
}

const VALEURS_FACTURE_INITIALES: Record<string, string> = {
  clientId: '',
  affaireId: '',
  dateFacture: '',
  dateEcheance: '',
  retenueGarantieBps: '0',
  remboursementAvanceCentimes: '0',
  marchePublic: 'false',
}

export function BonsLivraison() {
  const [bls, setBls] = useState<BonLivraisonVue[]>([])
  const [chargement, setChargement] = useState(true)
  const [filtrageStatut, setFiltrageStatut] = useState('')
  const [selectionnes, setSelectionnes] = useState<BonLivraisonVue[]>([])
  const [modalFacture, setModalFacture] = useState(false)
  const [valeursFacture, setValeursFacture] = useState<Record<string, string>>(
    VALEURS_FACTURE_INITIALES,
  )
  const naviguer = useNavigate()

  useEffect(() => {
    window.egto.bonsLivraison
      .lister()
      .then(setBls)
      .catch(() => {})
      .finally(() => setChargement(false))
  }, [])

  const statutsDisponibles = useMemo(() => {
    const ensemble = new Set(bls.map((b) => b.statut))
    return Array.from(ensemble).sort()
  }, [bls])

  const donneesFiltrees = useMemo(() => {
    if (!filtrageStatut) return bls
    return bls.filter((b) => b.statut === filtrageStatut)
  }, [bls, filtrageStatut])

  const toutEmis =
    selectionnes.length > 0 && selectionnes.every((b) => b.statut === 'EMIS')

  async function genererFacture() {
    try {
      await window.egto.bonsLivraison.genererFacture({
        blIds: selectionnes.map((b) => b.id),
        clientId: Number(valeursFacture.clientId),
        affaireId: valeursFacture.affaireId
          ? Number(valeursFacture.affaireId)
          : undefined,
        dateFacture: valeursFacture.dateFacture,
        dateEcheance: valeursFacture.dateEcheance || undefined,
        retenueGarantieBps: Number(valeursFacture.retenueGarantieBps) || 0,
        remboursementAvanceCentimes:
          Number(valeursFacture.remboursementAvanceCentimes) || 0,
        marchePublic: valeursFacture.marchePublic === 'true',
      })
      setModalFacture(false)
      setValeursFacture(VALEURS_FACTURE_INITIALES)
      setSelectionnes([])
      window.egto.bonsLivraison.lister().then(setBls).catch(() => {})
    } catch {
      setModalFacture(false)
    }
  }

  const colonnes: ColumnDef<BonLivraisonVue, unknown>[] = [
    { accessorKey: 'numeroBl', header: 'N° BL', size: 120 },
    {
      accessorKey: 'statut',
      header: 'Statut',
      size: 110,
      cell: (info) => <BadgeStatut statut={info.getValue() as string} />,
    },
    {
      accessorKey: 'clientId',
      header: 'Client',
      size: 100,
      cell: (info) => `#${info.getValue() as number}`,
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
    {
      accessorKey: 'dateLivraison',
      header: 'Date livraison',
      size: 120,
      cell: (info) => formaterDate(info.getValue() as string | null),
    },
    {
      accessorKey: 'poidsPeseeKg',
      header: 'Poids (kg)',
      size: 100,
      cell: (info) => {
        const val = info.getValue() as number | null
        return val != null ? String(val) : '—'
      },
    },
  ]

  if (chargement) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  return (
    <div className="ecran-liste">
      <div className="en-tete-ecran">
        <h1>Bons de livraison</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {toutEmis && (
            <button className="bouton" onClick={() => setModalFacture(true)}>
              Générer facture
            </button>
          )}
          <button
            className="bouton"
            onClick={() => naviguer('/bons-livraison/nouveau')}
          >
            Nouveau BL
          </button>
        </div>
      </div>
      <Liste<BonLivraisonVue>
        donnees={donneesFiltrees}
        colonnes={colonnes}
        etiquettesVide="Aucun bon de livraison enregistré."
        onSelectionChange={setSelectionnes}
        onLigneClique={(b) => naviguer(`/bons-livraison/${b.id}`)}
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
      {modalFacture && (
        <div className="modal-superposition" role="dialog" aria-modal="true" aria-label="Générer une facture">
          <div className="modal-contenu">
            <h3>
              Générer une facture ({selectionnes.length} BL sélectionnés)
            </h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <label>
                Client ID *
                <input
                  type="number"
                  required
                  value={valeursFacture.clientId}
                  onChange={(e) =>
                    setValeursFacture((p) => ({ ...p, clientId: e.target.value }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Affaire ID
                <input
                  type="number"
                  value={valeursFacture.affaireId}
                  onChange={(e) =>
                    setValeursFacture((p) => ({ ...p, affaireId: e.target.value }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Date facture *
                <input
                  type="date"
                  required
                  value={valeursFacture.dateFacture}
                  onChange={(e) =>
                    setValeursFacture((p) => ({ ...p, dateFacture: e.target.value }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Date échéance
                <input
                  type="date"
                  value={valeursFacture.dateEcheance}
                  onChange={(e) =>
                    setValeursFacture((p) => ({ ...p, dateEcheance: e.target.value }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Retenue de garantie (bps)
                <input
                  type="number"
                  value={valeursFacture.retenueGarantieBps}
                  onChange={(e) =>
                    setValeursFacture((p) => ({
                      ...p,
                      retenueGarantieBps: e.target.value,
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Remboursement avance (centimes)
                <input
                  type="number"
                  value={valeursFacture.remboursementAvanceCentimes}
                  onChange={(e) =>
                    setValeursFacture((p) => ({
                      ...p,
                      remboursementAvanceCentimes: e.target.value,
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={valeursFacture.marchePublic === 'true'}
                  onChange={(e) =>
                    setValeursFacture((p) => ({
                      ...p,
                      marchePublic: e.target.checked ? 'true' : 'false',
                    }))
                  }
                />
                Marché public
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                className="bouton"
                disabled={!valeursFacture.clientId || !valeursFacture.dateFacture}
                onClick={() => {
                  void genererFacture()
                }}
              >
                Valider
              </button>
              <button
                className="bouton-secondaire"
                onClick={() => {
                  setModalFacture(false)
                  setValeursFacture(VALEURS_FACTURE_INITIALES)
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}