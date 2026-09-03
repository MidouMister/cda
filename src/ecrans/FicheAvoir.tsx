import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Liste } from '../composants/Liste'
import type {
  DonneesAvoir,
  FactureVue,
  LigneFactureVue,
  ModeAvoir,
  SelectionLigneAvoir,
} from '../../contrats'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

function formaterDate(iso: string | null): string {
  if (!iso) return '\u2014'
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

function champLigne(label: string, valeur: string | number | null | undefined) {
  return (
    <div className="champ-lecture">
      <dt>{label}</dt>
      <dd>{valeur != null ? String(valeur) : '\u2014'}</dd>
    </div>
  )
}

const STATUTS_AUTORISES: readonly string[] = ['VALIDE', 'IMPRIMEE', 'ENVOYEE']

const LIBELLES_MODE: Record<ModeAvoir, string> = {
  TOTAL: 'Total',
  PAR_LIGNES: 'Par lignes',
  PARTIEL: 'Partiel',
}

const DESCRIPTIONS_MODE: Record<ModeAvoir, string> = {
  TOTAL: 'Avoir sur la totalit\u00e9 de la facture',
  PAR_LIGNES: 'S\u00e9lection de lignes enti\u00e8res',
  PARTIEL: 'Quantit\u00e9s partielles par ligne',
}

const MODES_AVOIR: readonly ModeAvoir[] = ['TOTAL', 'PAR_LIGNES', 'PARTIEL']

export function FicheAvoir() {
  const naviguer = useNavigate()
  const [etape, setEtape] = useState<'selection' | 'mode' | 'details'>('selection')
  const [factures, setFactures] = useState<FactureVue[]>([])
  const [factureSelectionnee, setFactureSelectionnee] = useState<FactureVue | null>(null)
  const [lignes, setLignes] = useState<LigneFactureVue[]>([])
  const [mode, setMode] = useState<ModeAvoir>('TOTAL')
  const [selections, setSelections] = useState<SelectionLigneAvoir[]>([])
  const [motif, setMotif] = useState('')
  const [dateAvoir, setDateAvoir] = useState(() => new Date().toISOString().slice(0, 10))
  const [chargement, setChargement] = useState(true)
  const [soumission, setSoumission] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    window.egto.factures
      .lister()
      .then((toutes) => setFactures(toutes.filter((f) => STATUTS_AUTORISES.includes(f.statut))))
      .catch(() => setErreur('Impossible de charger les factures.'))
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => {
    if (!factureSelectionnee) return
    setLignes([])
    setSelections([])
    window.egto.factures
      .listerLignes(factureSelectionnee.id)
      .then(setLignes)
      .catch(() => setErreur('Impossible de charger les lignes de la facture.'))
  }, [factureSelectionnee])

  const choisirMode = (choix: ModeAvoir) => {
    setMode(choix)
    setSelections([])
    setErreur(null)
    setEtape('details')
  }

  const estLigneSelectionnee = (ligneId: number) =>
    selections.some((s) => s.ligneOrigineId === ligneId)

  const basculerLigne = (ligne: LigneFactureVue) => {
    setSelections((precedente) =>
      precedente.some((s) => s.ligneOrigineId === ligne.id)
        ? precedente.filter((s) => s.ligneOrigineId !== ligne.id)
        : [...precedente, { ligneOrigineId: ligne.id, quantiteMilliemes: ligne.quantiteMilliemes }],
    )
  }

  const modifierQuantite = (ligne: LigneFactureVue, valeur: number) => {
    if (!Number.isFinite(valeur)) return
    const bornee = Math.max(0, Math.min(Math.trunc(valeur), ligne.quantiteMilliemes))
    setSelections((precedente) =>
      precedente.map((s) => (s.ligneOrigineId === ligne.id ? { ...s, quantiteMilliemes: bornee } : s)),
    )
  }

  const peutSoumettre = motif.trim().length >= 3 && (mode === 'TOTAL' || selections.length > 0)

  const validerAvoir = async () => {
    if (!factureSelectionnee || !peutSoumettre || soumission) return
    setErreur(null)
    setSoumission(true)
    try {
      const donnees: DonneesAvoir = {
        factureOrigineId: factureSelectionnee.id,
        motifAvoir: motif.trim(),
        dateAvoir,
        modeAvoir: mode,
        ...(mode === 'TOTAL' ? {} : { selections }),
      }
      const resultat = await window.egto.factures.creerAvoir(donnees)
      naviguer('/factures/' + resultat.id)
    } catch {
      setErreur("Erreur lors de la cr\u00e9ation de l\u2019avoir.")
      setSoumission(false)
    }
  }

  const colonnesFactures: ColumnDef<FactureVue, unknown>[] = [
    {
      accessorKey: 'numero',
      header: 'N\u00b0',
      size: 130,
      cell: (info) => (info.getValue() as string | null) ?? '\u2014',
    },
    { accessorKey: 'typeDocument', header: 'Type', size: 70 },
    {
      accessorKey: 'dateFacture',
      header: 'Date',
      size: 110,
      cell: (info) => formaterDate(info.getValue() as string),
    },
    {
      accessorKey: 'clientId',
      header: 'Client',
      size: 90,
      cell: (info) => `#${info.getValue() as number}`,
    },
    {
      accessorKey: 'totalTtcCentimes',
      header: 'Total TTC',
      size: 140,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
    { accessorKey: 'statut', header: 'Statut', size: 110 },
  ]

  if (chargement) {
    return <div className="ecran-chargement">{'Chargement\u2026'}</div>
  }

  return (
    <div className="ecran-fiche">
      <div className="en-tete-ecran">
        <h1>Nouvel Avoir</h1>
        <button className="bouton-secondaire" onClick={() => naviguer('/factures')}>
          Retour
        </button>
      </div>

      <div
        className="bandeau-avoir"
        role="note"
        style={{
          border: '1px solid #d4d4d8',
          background: '#fafafa',
          padding: '8px 12px',
          borderRadius: 6,
          marginBottom: 16,
        }}
      >
        {'Un avoir ne peut pas \u00eatre encaiss\u00e9 ni archiv\u00e9.'}
      </div>

      {erreur && (
        <p style={{ color: 'var(--red)', marginTop: 0 }} role="alert">
          {erreur}
        </p>
      )}

      {etape === 'selection' && (
        <section>
          <h2>{'\u00c9tape 1/3 \u2014 S\u00e9lection de la facture d\u2019origine'}</h2>
          <Liste<FactureVue>
            donnees={factures}
            colonnes={colonnesFactures}
            etiquettesVide={'Aucune facture \u00e9ligible (statuts VALIDE, IMPRIMEE ou ENVOYEE requis).'}
            onLigneClique={(f) => {
              setErreur(null)
              setFactureSelectionnee(f)
              setEtape('mode')
            }}
          />
        </section>
      )}

      {etape === 'mode' && factureSelectionnee && (
        <section>
          <h2>{'\u00c9tape 2/3 \u2014 Mode de l\u2019avoir'}</h2>
          <p className="resume-avoir">
            {'Facture '}
            <strong>{factureSelectionnee.numero ?? `#${factureSelectionnee.id}`}</strong>
            {` \u2014 Total TTC : ${formatterCentimes(factureSelectionnee.totalTtcCentimes)}`}
          </p>
          <button
            className="bouton-secondaire"
            onClick={() => {
              setFactureSelectionnee(null)
              setEtape('selection')
            }}
          >
            Changer de facture
          </button>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {MODES_AVOIR.map((valeurMode) => (
              <button
                key={valeurMode}
                className="bouton"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
                onClick={() => choisirMode(valeurMode)}
              >
                <strong>{LIBELLES_MODE[valeurMode]}</strong>
                <small>{DESCRIPTIONS_MODE[valeurMode]}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {etape === 'details' && factureSelectionnee && (
        <section>
          <h2>{'\u00c9tape 3/3 \u2014 D\u00e9tail de l\u2019avoir'}</h2>
          <dl className="fiche-champs">
            {champLigne('Facture d\u2019origine', factureSelectionnee.numero ?? factureSelectionnee.id)}
            {champLigne('Mode d\u2019avoir', LIBELLES_MODE[mode])}
            {mode !== 'TOTAL' && champLigne('Lignes s\u00e9lectionn\u00e9es', selections.length)}
          </dl>

          {(mode === 'PAR_LIGNES' || mode === 'PARTIEL') && (
            <table className="tableau" style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }} />
                  <th>{'D\u00e9signation'}</th>
                  <th style={{ width: 70 }}>{'Unit\u00e9'}</th>
                  <th style={{ width: 110 }}>{'Qt\u00e9 origin.'}</th>
                  {mode === 'PARTIEL' && (
                    <th style={{ width: 180 }}>{'Qt\u00e9 \u00e0 avoir (milli\u00e8mes)'}</th>
                  )}
                  <th style={{ width: 120 }}>{'PU HT'}</th>
                  <th style={{ width: 120 }}>{'Net HT'}</th>
                </tr>
              </thead>
              <tbody>
                {lignes.length === 0 ? (
                  <tr>
                    <td colSpan={mode === 'PARTIEL' ? 7 : 6}>{'Chargement des lignes\u2026'}</td>
                  </tr>
                ) : (
                  lignes.map((ligne) => {
                    const cochee = estLigneSelectionnee(ligne.id)
                    const quantiteChoisie = selections.find(
                      (s) => s.ligneOrigineId === ligne.id,
                    )?.quantiteMilliemes
                    return (
                      <tr key={ligne.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={cochee}
                            onChange={() => basculerLigne(ligne)}
                            aria-label={`Ligne ${ligne.designation}`}
                          />
                        </td>
                        <td>{ligne.designation}</td>
                        <td>{ligne.unite ?? '\u2014'}</td>
                        <td>{ligne.quantiteMilliemes}</td>
                        {mode === 'PARTIEL' && (
                          <td>
                            {cochee ? (
                              <input
                                type="number"
                                min={0}
                                max={ligne.quantiteMilliemes}
                                value={quantiteChoisie ?? ''}
                                onChange={(e) => modifierQuantite(ligne, Number(e.target.value))}
                                style={{ width: 120 }}
                              />
                            ) : (
                              '\u2014'
                            )}
                          </td>
                        )}
                        <td>{formatterCentimes(ligne.puHtCentimes)}</td>
                        <td>{formatterCentimes(ligne.montantHtNetCentimes)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}

          <div style={{ display: 'flex', gap: 24, marginTop: 24, maxWidth: 560 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 2 }}>
              {'Motif de l\u2019avoir *'}
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={'Minimum 3 caract\u00e8res'}
                required
                minLength={3}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {'Date de l\u2019avoir'}
              <input type="date" value={dateAvoir} onChange={(e) => setDateAvoir(e.target.value)} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button className="bouton-secondaire" onClick={() => setEtape('mode')}>
              Retour
            </button>
            <button
              className="bouton"
              disabled={!peutSoumettre || soumission}
              onClick={validerAvoir}
            >
              {soumission ? 'Cr\u00e9ation\u2026' : 'Valider l\u2019avoir'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}