import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FicheAOnglets } from '../composants/FicheAOnglets'
import { Liste } from '../composants/Liste'
import { Formulaire } from '../composants/Formulaire'
import type { BonLivraisonVue, LigneBonLivraisonVue } from '../../contrats'
import type { ColumnDef } from '@tanstack/react-table'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

function formaterDate(iso: string | null): string {
  if (!iso) return '\u2014'
  const [a, m, j] = iso.split('-')
  return j + '/' + m + '/' + a
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
]

export function FicheBonLivraison() {
  const { id } = useParams<{ id: string }>()
  const naviguer = useNavigate()
  const [bl, setBl] = useState<BonLivraisonVue | null>(null)
  const [lignes, setLignes] = useState<LigneBonLivraisonVue[]>([])
  const [ajoutLigne, setAjoutLigne] = useState(false)
  const [valeursLigne, setValeursLigne] = useState<Record<string, string | number>>({})
  const [modificationLigne, setModificationLigne] = useState<number | null>(null)

  const blId = Number(id)

  const chargerBl = () => {
    window.egto.bonsLivraison.lire(blId).then(setBl).catch(() => {})
  }

  const chargerLignes = () => {
    window.egto.bonsLivraison.listerLignes(blId).then(setLignes).catch(() => {})
  }

  useEffect(() => {
    if (!blId) return
    chargerBl()
    chargerLignes()
  }, [blId])

  const estEmis = bl?.statut === 'EMIS'

  const fermerModal = () => {
    setAjoutLigne(false)
    setModificationLigne(null)
    setValeursLigne({})
  }

  const ouvrirAjout = () => {
    setValeursLigne({})
    setModificationLigne(null)
    setAjoutLigne(true)
  }

  const ouvrirModification = (ligne: LigneBonLivraisonVue) => {
    setValeursLigne({
      designation: ligne.designation,
      unite: ligne.unite,
      quantiteMilliemes: ligne.quantiteMilliemes,
      puHtCentimes: ligne.puHtCentimes,
    })
    setModificationLigne(ligne.id)
    setAjoutLigne(true)
  }

  const ajouterLigne = async () => {
    await window.egto.bonsLivraison.creerLigne({
      blId,
      designation: String(valeursLigne.designation),
      unite: String(valeursLigne.unite ?? ''),
      quantiteMilliemes: Number(valeursLigne.quantiteMilliemes),
      puHtCentimes: Number(valeursLigne.puHtCentimes),
    })
    fermerModal()
    chargerLignes()
  }

  const modifierLigne = async () => {
    if (modificationLigne === null) return
    await window.egto.bonsLivraison.modifierLigne(modificationLigne, {
      designation: String(valeursLigne.designation),
      unite: String(valeursLigne.unite ?? ''),
      quantiteMilliemes: Number(valeursLigne.quantiteMilliemes),
      puHtCentimes: Number(valeursLigne.puHtCentimes),
    })
    fermerModal()
    chargerLignes()
  }

  const supprimerLigne = async (ligneId: number) => {
    await window.egto.bonsLivraison.supprimerLigne(ligneId)
    chargerLignes()
  }

  if (!bl) {
    return <div className="ecran-chargement">{'Chargement\u2026'}</div>
  }

  const colonnesLignes: ColumnDef<LigneBonLivraisonVue, unknown>[] = [
    { accessorKey: 'designation', header: 'D\u00e9signation', size: 220 },
    { accessorKey: 'unite', header: 'Unit\u00e9', size: 80 },
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
      size: 130,
      cell: (info) => formatterCentimes(info.getValue() as number),
    },
  ]

  if (estEmis) {
    colonnesLignes.push({
      id: 'actions',
      header: 'Actions',
      size: 170,
      enableSorting: false,
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="bouton-secondaire" onClick={() => ouvrirModification(row.original)}>
            Modifier
          </button>
          <button className="bouton-secondaire" onClick={() => supprimerLigne(row.original.id)}>
            Supprimer
          </button>
        </div>
      ),
    })
  }

  const ongletGeneral = (
    <div className="fiche-champs">
      {champLigne('N\u00b0 BL', bl.numeroBl)}
      {champLigne('Statut', bl.statut)}
      {champLigne('Date de livraison', formaterDate(bl.dateLivraison))}
      {champLigne('Client', '#' + bl.clientId)}
      {champLigne('Affaire li\u00e9e', bl.affaireId != null ? '#' + bl.affaireId : null)}
      {champLigne('Poids/pes\u00e9e (kg)', bl.poidsPeseeKg)}
      {champLigne('Signature client', bl.signatureClient ? 'Oui' : 'Non')}
      {champLigne('Facture li\u00e9e', bl.factureId != null ? '#' + bl.factureId : null)}
    </div>
  )

  const ongletLignes = (
    <div>
      <Liste<LigneBonLivraisonVue>
        donnees={lignes}
        colonnes={colonnesLignes}
        etiquettesVide="Aucune ligne de bon de livraison."
        actions={
          estEmis ? (
            <button className="bouton" onClick={ouvrirAjout}>
              Ajouter ligne
            </button>
          ) : undefined
        }
      />
      {ajoutLigne && (
        <div className="modal-superposition">
          <div className="modal-contenu">
            <h3>
              {modificationLigne !== null
                ? 'Modifier la ligne'
                : 'Nouvelle ligne de bon de livraison'}
            </h3>
            <Formulaire
              champs={CHAMPS_LIGNE}
              valeurs={valeursLigne}
              onChange={(cle, val) => setValeursLigne((p) => ({ ...p, [cle]: val }))}
              soumettre={modificationLigne !== null ? modifierLigne : ajouterLigne}
              labelBouton={modificationLigne !== null ? 'Enregistrer' : 'Ajouter'}
            />
            <button className="bouton-secondaire" style={{ marginTop: 8 }} onClick={fermerModal}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="ecran-fiche">
      <div className="en-tete-ecran">
        <h1>BL {bl.numeroBl}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bouton-secondaire" onClick={() => naviguer('/bons-livraison')}>
            {'\u2190'} Retour
          </button>
        </div>
      </div>
      <FicheAOnglets
        onglets={[
          { id: 'general', label: 'G\u00e9n\u00e9ral', contenu: ongletGeneral },
          { id: 'lignes', label: 'Lignes', contenu: ongletLignes },
        ]}
      />
    </div>
  )
}