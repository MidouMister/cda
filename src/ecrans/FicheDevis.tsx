import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FicheAOnglets } from '../composants/FicheAOnglets'
import { Liste } from '../composants/Liste'
import { Formulaire } from '../composants/Formulaire'
import type { DevisVue, LigneDevisVue } from '../../contrats'
import type { ColumnDef } from '@tanstack/react-table'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

function champLigne(label: string, valeur: string | number | null) {
  return (
    <div className="champ-lecture">
      <dt>{label}</dt>
      <dd>{valeur ?? '\u2014'}</dd>
    </div>
  )
}

const CHAMPS_LIGNE = [
  { id: 'designation', label: 'D\u00e9signation', type: 'texte' as const, obligatoire: true },
  { id: 'unite', label: 'Unit\u00e9', type: 'texte' as const },
  { id: 'quantiteMilliemes', label: 'Quantit\u00e9 (milli\u00e8mes)', type: 'nombre' as const, obligatoire: true },
  { id: 'puHtCentimes', label: 'PU HT (centimes)', type: 'nombre' as const, obligatoire: true },
]

export function FicheDevis() {
  const { id } = useParams<{ id: string }>()
  const naviguer = useNavigate()
  const [devis, setDevis] = useState<DevisVue | null>(null)
  const [lignes, setLignes] = useState<LigneDevisVue[]>([])
  const [ajoutLigne, setAjoutLigne] = useState(false)
  const [valeursLigne, setValeursLigne] = useState<Record<string, string | number>>({})

  const devisId = Number(id)

  const chargerDevis = () => {
    window.egto.devis.lire(devisId).then(setDevis).catch(() => {})
  }

  const chargerLignes = () => {
    window.egto.devis.listerLignes(devisId).then(setLignes).catch(() => {})
  }

  useEffect(() => {
    if (!devisId) return
    chargerDevis()
    chargerLignes()
  }, [devisId])

  const ajouterLigne = async () => {
    await window.egto.devis.creerLigne({
      devisId,
      designation: String(valeursLigne.designation),
      unite: String(valeursLigne.unite) || undefined,
      quantiteMilliemes: Number(valeursLigne.quantiteMilliemes),
      puHtCentimes: Number(valeursLigne.puHtCentimes),
    })
    setAjoutLigne(false)
    setValeursLigne({})
    chargerLignes()
  }

  if (!devis) {
    return <div className="ecran-chargement">Chargement\u2026</div>
  }

  const colonnesLignes: ColumnDef<LigneDevisVue, unknown>[] = [
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
      accessorKey: 'montantHtCentimes',
      header: 'Montant HT',
      size: 120,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
  ]

  const ongletGeneral = (
    <div className="fiche-champs">
      {champLigne('N\u00b0 Devis', devis.numeroDevis)}
      {champLigne('Statut', devis.statut)}
      {champLigne('Date du devis', devis.dateDevis)}
      {champLigne('Date de validit\u00e9', devis.dateValidite)}
      {champLigne('Client', devis.clientId)}
      {champLigne('Rabais global', devis.rabaisGlobalBps !== 0 ? `${devis.rabaisGlobalBps} bps` : null)}
      {champLigne('Affaire li\u00e9e', devis.affaireId != null ? `#${devis.affaireId}` : null)}
      {champLigne('Exercice', devis.exerciceId != null ? `#${devis.exerciceId}` : null)}
    </div>
  )

  const ongletLignes = (
    <div>
      <Liste<LigneDevisVue>
        donnees={lignes}
        colonnes={colonnesLignes}
        etiquettesVide="Aucune ligne de devis."
        actions={
          <button className="bouton" onClick={() => setAjoutLigne(true)}>
            Ajouter ligne
          </button>
        }
      />
      {ajoutLigne && (
        <div className="modal-superposition">
          <div className="modal-contenu">
            <h3>Nouvelle ligne de devis</h3>
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

  const ongletPdf = (
    <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
      Aper\u00e7u PDF \u2014 \u00e0 venir en Jalon 5
    </p>
  )

  return (
    <div className="ecran-fiche">
      <div className="en-tete-ecran">
        <h1>Devis {devis.numeroDevis}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {devis.statut === 'ENVOYE' && (
            <button
              className="bouton"
              onClick={() => alert('Conversion \u2014 \u00e0 impl\u00e9menter avec l\u2019IPC d\u00e9di\u00e9')}
            >
              Convertir en affaire
            </button>
          )}
          <button className="bouton-secondaire" onClick={() => naviguer('/devis')}>
            \u2190 Retour
          </button>
        </div>
      </div>
      <FicheAOnglets
        onglets={[
          { id: 'general', label: 'G\u00e9n\u00e9ral', contenu: ongletGeneral },
          { id: 'lignes', label: 'Lignes', contenu: ongletLignes },
          { id: 'pdf', label: 'Aper\u00e7u PDF', contenu: ongletPdf },
        ]}
      />
    </div>
  )
}
