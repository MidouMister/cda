import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FicheAOnglets } from '../composants/FicheAOnglets'
import { Liste } from '../composants/Liste'
import { Formulaire } from '../composants/Formulaire'
import { ApercuPdf } from '../composants/ApercuPdf'
import type { FactureVue, LigneFactureVue, EncaissementVue } from '../../contrats'
import type { ColumnDef } from '@tanstack/react-table'

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

const CHAMPS_LIGNE = [
  { id: 'designation', label: 'D\u00e9signation', type: 'texte' as const, obligatoire: true },
  { id: 'unite', label: 'Unit\u00e9', type: 'texte' as const },
  { id: 'quantiteMilliemes', label: 'Quantit\u00e9 (milli\u00e8mes)', type: 'nombre' as const, obligatoire: true },
  { id: 'puHtCentimes', label: 'PU HT (centimes)', type: 'nombre' as const, obligatoire: true },
  { id: 'remiseBps', label: 'Remise (bps)', type: 'nombre' as const },
  { id: 'rabaisMarcheBps', label: 'Rabais march\u00e9 (bps)', type: 'nombre' as const },
]

export function FicheFacture() {
  const { id } = useParams<{ id: string }>()
  const naviguer = useNavigate()
  const [facture, setFacture] = useState<FactureVue | null>(null)
  const [lignes, setLignes] = useState<LigneFactureVue[]>([])
  const [encaissements, setEncaissements] = useState<EncaissementVue[]>([])
  const [ajoutLigne, setAjoutLigne] = useState(false)
  const [valeursLigne, setValeursLigne] = useState<Record<string, string | number>>({})
  const [pied, setPied] = useState<FactureVue | null>(null)
  const [pdf, setPdf] = useState<Uint8Array | null>(null)
  const [chargementPdf, setChargementPdf] = useState(false)

  const factureId = Number(id)

  const chargerFacture = () => {
    window.egto.factures.lire(factureId).then((f) => {
      setFacture(f)
      setPied(f)
    }).catch(() => {})
  }

  const chargerLignes = () => {
    window.egto.factures.listerLignes(factureId).then(setLignes).catch(() => {})
  }

  const chargerEncaissements = () => {
    window.egto.encaissements.lister(factureId).then(setEncaissements).catch(() => {})
  }

  useEffect(() => {
    if (!factureId) return
    chargerFacture()
    chargerLignes()
    chargerEncaissements()
  }, [factureId])

  useEffect(() => {
    if (lignes.length > 0 && facture) {
      const parametres = {
        lignes: lignes.map((l) => ({
          designation: l.designation,
          unite: l.unite,
          quantiteMilliemes: l.quantiteMilliemes,
          puHtCentimes: l.puHtCentimes,
          remiseBps: l.remiseBps,
          rabaisMarcheBps: l.rabaisMarcheBps,
        })),
        retenueGarantieBps: facture.retenueGarantieBps,
        remboursementAvanceCentimes: facture.remboursementAvanceCentimes,
        marchePublic: facture.typeDocument === 'FS',
      }
      window.egto.factures.calculerPied(parametres).then((p) => {
        setPied({ ...facture, ...p } as FactureVue)
      }).catch(() => {})
    }
  }, [lignes, facture?.id])

  const chargerPdf = () => {
    if (pdf || chargementPdf) return
    setChargementPdf(true)
    window.egto.factures.genererPdf(factureId).then(setPdf).catch(() => {}).finally(() => setChargementPdf(false))
  }

  const ajouterLigne = async () => {
    await window.egto.factures.creerLigne({
      factureId,
      designation: String(valeursLigne.designation),
      unite: String(valeursLigne.unite || ''),
      quantiteMilliemes: Number(valeursLigne.quantiteMilliemes),
      puHtCentimes: Number(valeursLigne.puHtCentimes),
      remiseBps: Number(valeursLigne.remiseBps || 0),
      rabaisMarcheBps: Number(valeursLigne.rabaisMarcheBps || 0),
    })
    setAjoutLigne(false)
    setValeursLigne({})
    chargerLignes()
  }


  const valider = async () => {
    await window.egto.factures.valider(factureId)
    chargerFacture()
  }

  const imprimer = async () => {
    const donnees = await window.egto.factures.imprimer(factureId)
    setPdf(donnees)
    chargerFacture()
  }

  const marquerEnvoyee = async () => {
    await window.egto.factures.marquerEnvoyee(factureId)
    chargerFacture()
  }

  if (!facture) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  const estBrouillon = facture.statut === 'BROUILLON'
  const estValide = facture.statut === 'VALIDE'
  const estDuplicata = facture.nombreImpressions > 0

  const colonnesLignes: ColumnDef<LigneFactureVue, unknown>[] = [
    { accessorKey: 'designation', header: 'D\u00e9signation', size: 220 },
    {
      accessorKey: 'unite',
      header: 'Unit\u00e9',
      size: 80,
      cell: (info) => info.getValue() ?? '\u2014',
    },
    { accessorKey: 'quantiteMilliemes', header: 'Quantit\u00e9', size: 100 },
    {
      accessorKey: 'puHtCentimes',
      header: 'PU HT',
      size: 120,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
    {
      accessorKey: 'remiseBps',
      header: 'Remise',
      size: 80,
      cell: (info) => {
        const val = info.getValue() as number
        return val !== 0 ? `${val} bps` : '\u2014'
      },
    },
    {
      accessorKey: 'rabaisMarcheBps',
      header: 'Rabais march\u00e9',
      size: 100,
      cell: (info) => {
        const val = info.getValue() as number
        return val !== 0 ? `${val} bps` : '\u2014'
      },
    },
    {
      accessorKey: 'montantHtNetCentimes',
      header: 'Net HT',
      size: 120,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
  ]

  const colonnesEncaissements: ColumnDef<EncaissementVue, unknown>[] = [
    { accessorKey: 'numero', header: 'N\u00b0', size: 120 },
    {
      accessorKey: 'montantEncaisseCentimes',
      header: 'Montant',
      size: 120,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
    {
      accessorKey: 'dateEncaissement',
      header: 'Date',
      size: 110,
      cell: (info) => formaterDate(info.getValue() as string),
    },
    {
      accessorKey: 'modeReglementEffectif',
      header: 'Mode',
      size: 140,
    },
    {
      accessorKey: 'timbreStatut',
      header: 'Timbre',
      size: 100,
    },
  ]

  const ongletGeneral = (
    <div className="fiche-champs">
      {champLigne('N\u00b0', facture.numero ?? 'Brouillon')}
      {champLigne('Statut', facture.statut)}
      {champLigne('Type', facture.typeDocument)}
      {champLigne('Date facture', formaterDate(facture.dateFacture))}
      {champLigne('Date \u00e9ch\u00e9ance', formaterDate(facture.dateEcheance))}
      {champLigne('Client', `#${facture.clientId}`)}
      {champLigne('Affaire', facture.affaireId != null ? `#${facture.affaireId}` : null)}
      {champLigne('NIF', facture.nifClient)}
      {champLigne('N\u00b0 BC client', facture.numeroBcClient)}
      {champLigne('R\u00e9tention', facture.retenueGarantieBps !== 0 ? `${facture.retenueGarantieBps} bps` : null)}
      {champLigne('Remboursement avance', facture.remboursementAvanceCentimes !== 0 ? formatterCentimes(facture.remboursementAvanceCentimes) : null)}
      {champLigne('Mode r\u00e8glement', facture.modeReglementPrevu)}
      {champLigne('Impressions', facture.nombreImpressions)}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {estBrouillon && (
          <button className="bouton" onClick={valider}>Valider</button>
        )}
        {estValide && (
          <button className="bouton" onClick={imprimer}>Imprimer</button>
        )}
        {facture.statut === 'IMPRIMEE' && (
          <button className="bouton" onClick={marquerEnvoyee}>Marquer envoyée</button>
        )}
      </div>
    </div>
  )

  const ongletLignes = (
    <div>
      <Liste<LigneFactureVue>
        donnees={lignes}
        colonnes={colonnesLignes}
        etiquettesVide="Aucune ligne de facture."
        actions={
          estBrouillon ? (
            <button className="bouton" onClick={() => setAjoutLigne(true)}>
              Ajouter ligne
            </button>
          ) : undefined
        }
      />
      {ajoutLigne && (
        <div className="modal-superposition">
          <div className="modal-contenu">
            <h3>Nouvelle ligne de facture</h3>
            <Formulaire
              champs={CHAMPS_LIGNE}
              valeurs={valeursLigne}
              onChange={(cle, val) => setValeursLigne((p) => ({ ...p, [cle]: val }))}
              soumettre={ajouterLigne}
              labelBouton="Ajouter"
            />
            <button
              className="bouton-secondaire"
              style={{ marginTop: 8 }}
              onClick={() => {
                setAjoutLigne(false)
                setValeursLigne({})
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const ongletPied = (
    <div className="fiche-champs">
      {champLigne('Total HT lignes', pied?.totalHtLignesCentimes != null ? formatterCentimes(pied.totalHtLignesCentimes) : null)}
      {champLigne('Total remises', pied?.totalRemisesCentimes != null ? formatterCentimes(pied.totalRemisesCentimes) : null)}
      {champLigne('Net commercial HT', pied?.netCommercialHtCentimes != null ? formatterCentimes(pied.netCommercialHtCentimes) : null)}
      {champLigne('R\u00e9tenue garantie', facture.retenueGarantieCentimes !== 0 ? formatterCentimes(facture.retenueGarantieCentimes) : null)}
      {champLigne('Total HT', pied?.totalHtCentimes != null ? formatterCentimes(pied.totalHtCentimes) : null)}
      {champLigne('TVA 19%', pied?.totalTvaCentimes != null ? formatterCentimes(pied.totalTvaCentimes) : null)}
      {champLigne('Total TTC', pied?.totalTtcCentimes != null ? formatterCentimes(pied.totalTtcCentimes) : null)}
      {champLigne('\u00c0 payer', facture.netAPayerCentimes != null ? formatterCentimes(facture.netAPayerCentimes) : null)}
    </div>
  )

  const ongletEncaissements = (
    <Liste<EncaissementVue>
      donnees={encaissements}
      colonnes={colonnesEncaissements}
      etiquettesVide="Aucun encaissement."
    />
  )

  const ongletPdf = (
    <div>
      {chargementPdf && <p style={{ color: 'var(--text-tertiary)' }}>Chargement du PDF…</p>}
      {!chargementPdf && pdf && (
        <ApercuPdf donneesPdf={pdf} nomFichier={facture.numero ?? 'facture'} estDuplicata={estDuplicata} />
      )}
      {!chargementPdf && !pdf && (
        <div>
          <p style={{ color: 'var(--text-tertiary)' }}>Aucun PDF généré.</p>
          <button className="bouton" onClick={chargerPdf}>Générer le PDF</button>
        </div>
      )}
    </div>
  )

  return (
    <div className="ecran-fiche">
      <div className="en-tete-ecran">
        <h1>Facture {facture.numero ?? 'Brouillon'}</h1>
        <button className="bouton-secondaire" onClick={() => naviguer('/factures')}>
          ← Retour
        </button>
      </div>
      <FicheAOnglets
        onglets={[
          { id: 'general', label: 'G\u00e9n\u00e9ral', contenu: ongletGeneral },
          { id: 'lignes', label: 'Lignes', contenu: ongletLignes },
          { id: 'pied', label: 'Pied', contenu: ongletPied },
          { id: 'encaissements', label: 'Historique encaissements', contenu: ongletEncaissements },
          { id: 'pdf', label: 'Aper\u00e7u PDF', contenu: ongletPdf },
        ]}
        ongletDefaut="general"
      />
    </div>
  )
}