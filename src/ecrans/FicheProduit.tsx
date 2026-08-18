import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FicheAOnglets } from '../composants/FicheAOnglets'
import { Liste } from '../composants/Liste'
import { Formulaire } from '../composants/Formulaire'
import type { ProduitVue, TarifVue } from '../../contrats'
import type { ColumnDef } from '@tanstack/react-table'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

const colonnesTarifs: ColumnDef<TarifVue, unknown>[] = [
  { accessorKey: 'typeNiveau', header: 'Type / Niveau', size: 140 },
  {
    accessorKey: 'prixCentimes',
    header: 'Prix',
    size: 120,
    cell: (info) => formatterCentimes(info.getValue() as number),
  },
  { accessorKey: 'debutPeriode', header: 'Début', size: 100 },
  { accessorKey: 'finPeriode', header: 'Fin', size: 100, cell: (info) => info.getValue() ?? '—' },
]

function champLigne(label: string, valeur: string | number | null) {
  return (
    <div className="champ-lecture">
      <dt>{label}</dt>
      <dd>{valeur ?? '—'}</dd>
    </div>
  )
}

export function FicheProduit() {
  const { id } = useParams<{ id: string }>()
  const naviguer = useNavigate()
  const [produit, setProduit] = useState<ProduitVue | null>(null)
  const [tarifs, setTarifs] = useState<TarifVue[]>([])
  const [edition, setEdition] = useState(false)
  const [valeursEdit, setValeursEdit] = useState<Record<string, string | number>>({})
  const [ajoutTarif, setAjoutTarif] = useState(false)
  const [valeursTarif, setValeursTarif] = useState<Record<string, string | number>>({})

  const produitId = Number(id)

  const chargerProduit = () => {
    window.egto.produits.lire(produitId).then(setProduit).catch(() => {})
  }

  const chargerTarifs = () => {
    window.egto.tarifs.listerParProduit(produitId).then(setTarifs).catch(() => {})
  }

  useEffect(() => {
    if (!produitId) return
    chargerProduit()
    chargerTarifs()
  }, [produitId])

  const demarrerEdition = () => {
    if (!produit) return
    setValeursEdit({
      codeProduit: produit.codeProduit,
      libelle: produit.libelle,
      unite: produit.unite,
      puReferenceCentimes: produit.puReferenceCentimes,
      typeTarification: produit.typeTarification,
    })
    setEdition(true)
  }

  const sauvegarderEdition = async () => {
    const ok = await window.egto.produits.modifier(produitId, {
      codeProduit: String(valeursEdit.codeProduit),
      libelle: String(valeursEdit.libelle),
      unite: String(valeursEdit.unite),
      puReferenceCentimes: Number(valeursEdit.puReferenceCentimes),
      typeTarification: String(valeursEdit.typeTarification),
    })
    if (ok) {
      setEdition(false)
      chargerProduit()
    }
  }

  const ajouterTarif = async () => {
    await window.egto.tarifs.creer({
      produitId,
      typeNiveau: String(valeursTarif.typeNiveau),
      prixCentimes: Number(valeursTarif.prixCentimes),
      debutPeriode: String(valeursTarif.debutPeriode),
    })
    setAjoutTarif(false)
    setValeursTarif({})
    chargerTarifs()
  }

  if (!produit) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  const ongletGeneral = edition ? (
    <Formulaire
      champs={[
        { id: 'codeProduit', label: 'Code produit', type: 'texte', obligatoire: true },
        { id: 'libelle', label: 'Libellé', type: 'texte', obligatoire: true },
        { id: 'unite', label: 'Unité', type: 'texte', obligatoire: true },
        { id: 'puReferenceCentimes', label: 'Prix unitaire (centimes)', type: 'nombre', obligatoire: true },
        {
          id: 'typeTarification',
          label: 'Tarification',
          type: 'select',
          obligatoire: true,
          options: [
            { valeur: 'UNITAIRE', libelle: 'Unitaire' },
            { valeur: 'FORFAITAIRE', libelle: 'Forfaitaire' },
          ],
        },
      ]}
      valeurs={valeursEdit}
      onChange={(cle, val) => setValeursEdit((p) => ({ ...p, [cle]: val }))}
      soumettre={sauvegarderEdition}
      labelBouton="Enregistrer"
    />
  ) : (
    <div className="fiche-champs">
      {champLigne('Code produit', produit.codeProduit)}
      {champLigne('Libellé', produit.libelle)}
      {champLigne('Unité', produit.unite)}
      {champLigne('Prix unitaire', formatterCentimes(produit.puReferenceCentimes))}
      {champLigne('Tarification', produit.typeTarification)}
      {champLigne('Actif', produit.actif ? 'Oui' : 'Non')}
      <button className="bouton" onClick={demarrerEdition}>
        Modifier
      </button>
    </div>
  )

  const ongletTarifs = (
    <div>
      <Liste<TarifVue>
        donnees={tarifs}
        colonnes={colonnesTarifs}
       
        etiquettesVide="Aucun tarif enregistré."
        actions={
          <button className="bouton" onClick={() => setAjoutTarif(true)}>
            Nouveau tarif
          </button>
        }
      />
      {ajoutTarif && (
        <div className="modal-superposition">
          <div className="modal-contenu">
            <h3>Nouveau tarif</h3>
            <Formulaire
              champs={[
                {
                  id: 'typeNiveau',
                  label: 'Type / Niveau',
                  type: 'select',
                  obligatoire: true,
                  options: [
                    { valeur: 'REFERENTIEL', libelle: 'Référentiel' },
                    { valeur: 'CLIENT', libelle: 'Client' },
                    { valeur: 'AFFAIRE', libelle: 'Affaire' },
                  ],
                },
                { id: 'prixCentimes', label: 'Prix (centimes)', type: 'nombre', obligatoire: true },
                { id: 'debutPeriode', label: 'Date début', type: 'date', obligatoire: true },
              ]}
              valeurs={valeursTarif}
              onChange={(cle, val) => setValeursTarif((p) => ({ ...p, [cle]: val }))}
              soumettre={ajouterTarif}
              labelBouton="Ajouter"
            />
            <button
              className="bouton-secondaire"
              style={{ marginTop: 8 }}
              onClick={() => {
                setAjoutTarif(false)
                setValeursTarif({})
              }}
            >
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
        <h1>{produit.libelle}</h1>
        <button className="bouton-secondaire" onClick={() => naviguer('/catalogue')}>
          ← Retour
        </button>
      </div>
      <FicheAOnglets
        onglets={[
          { id: 'general', label: 'Général', contenu: ongletGeneral },
          { id: 'tarifs', label: 'Tarifs', contenu: ongletTarifs },
        ]}
      />
    </div>
  )
}
