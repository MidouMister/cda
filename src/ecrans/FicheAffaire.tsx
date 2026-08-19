import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BandeauAlertes } from '../composants/BandeauAlertes'
import { FicheAOnglets } from '../composants/FicheAOnglets'
import { Liste } from '../composants/Liste'
import { GrilleDqe } from '../composants/GrilleDqe'
import { SuiviDelais } from '../composants/SuiviDelais'

import type { AffaireVue, AvenantVue } from '../../contrats'
import type { ColumnDef } from '@tanstack/react-table'

function formatterCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2) + ' DA'
}

function champLigne(label: string, valeur: string | number | null) {
  return (
    <div className="champ-lecture">
      <dt>{label}</dt>
      <dd>{valeur ?? '—'}</dd>
    </div>
  )
}

function calculerAlertesAffaire(affaire: AffaireVue): { categorie: string; niveau: string; message: string }[] {
  const alertes: { categorie: string; niveau: string; message: string }[] = []
  const aujourd = new Date()
  aujourd.setHours(0, 0, 0, 0)

  const dateFinStr = affaire.dateFinRevisee ?? affaire.dateFinContractuelle
  if (dateFinStr && affaire.delaiExecutionJours) {
    const dateFin = new Date(dateFinStr)
    const diffMs = dateFin.getTime() - aujourd.getTime()
    const joursRestants = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (joursRestants < 0) {
      alertes.push({
        categorie: 'DELAI_DEPASSE',
        niveau: 'CRITIQUE',
        message: `Délai dépassé de ${Math.abs(joursRestants)} jours`,
      })
    } else if (joursRestants <= 15) {
      alertes.push({
        categorie: 'DELAI_J_15',
        niveau: 'AVERTISSEMENT',
        message: `Plus que ${joursRestants} jours avant la fin contractuelle`,
      })
    } else if (joursRestants <= affaire.delaiExecutionJours * 0.2) {
      alertes.push({
        categorie: 'DELAI_80_POURCENT',
        niveau: 'AVERTISSEMENT',
        message: `Délai consommé à plus de 80 % — ${joursRestants} jours restants`,
      })
    } else if (joursRestants <= affaire.delaiExecutionJours * 0.5) {
      alertes.push({
        categorie: 'DELAI_50_POURCENT',
        niveau: 'INFO',
        message: `Délai consommé à plus de 50 % — ${joursRestants} jours restants`,
      })
    }
  }

  return alertes
}

const colonnesAvenants: ColumnDef<AvenantVue, unknown>[] = [
  { accessorKey: 'numero', header: 'N°', size: 80 },
  {
    accessorKey: 'objet',
    header: 'Objet',
    size: 220,
    cell: (info) => info.getValue() ?? '—',
  },
  {
    accessorKey: 'dateAvenant',
    header: 'Date',
    size: 110,
    cell: (info) => info.getValue() ?? '—',
  },
  {
    accessorKey: 'impactDelaiJours',
    header: 'Impact délai',
    size: 100,
    cell: (info) => {
      const val = info.getValue() as number
      return val !== 0 ? `${val > 0 ? '+' : ''}${val}j` : '—'
    },
  },
  {
    accessorKey: 'impactMontantHtCentimes',
    header: 'Impact montant',
    size: 130,
    cell: (info) => {
      const val = info.getValue() as number
      return val !== 0 ? formatterCentimes(val) : '—'
    },
  },
  { accessorKey: 'statut', header: 'Statut', size: 100 },
]

export function FicheAffaire() {
  const { id } = useParams<{ id: string }>()
  const naviguer = useNavigate()
  const [affaire, setAffaire] = useState<AffaireVue | null>(null)
  const [avenants, setAvenants] = useState<AvenantVue[]>([])

  const affaireId = Number(id)

  const chargerAffaire = () => {
    window.egto.affaires.lire(affaireId).then(setAffaire).catch(() => {})
  }

  const chargerAvenants = () => {
    window.egto.avenants
      .listerParAffaire(affaireId)
      .then(setAvenants)
      .catch(() => {})
  }

  useEffect(() => {
    if (!affaireId) return
    chargerAffaire()
    chargerAvenants()
  }, [affaireId])

  if (!affaire) {
    return <div className="ecran-chargement">Chargement…</div>
  }

  const ongletGeneral = (
    <div className="fiche-champs">
      {champLigne('Référence', affaire.reference)}
      {champLigne('Type', affaire.typeAffaire)}
      {champLigne('Statut', affaire.statut)}
      {champLigne('Client', affaire.clientId)}
      {champLigne('Objet', affaire.objet)}
      {champLigne('Montant initial HT', formatterCentimes(affaire.montantInitialHtCentimes))}
      {champLigne('Taux TVA', affaire.tauxTvaBps !== 0 ? `${affaire.tauxTvaBps / 100} %` : null)}
      {champLigne('Date signature', affaire.dateSignature)}
      {champLigne('Date notification', affaire.dateNotification)}
      {champLigne('N° ODS', affaire.numeroOds)}
      {champLigne('Date ODS', affaire.dateOds)}
      {champLigne('Date démarrage effectif', affaire.dateDemarrageEffectif)}
      {champLigne('Délai exécution (jours)', affaire.delaiExecutionJours)}
      {champLigne('Date fin contractuelle', affaire.dateFinContractuelle)}
      {champLigne('Date fin révisée', affaire.dateFinRevisee)}
      {champLigne('Date fin réelle', affaire.dateFinReelle)}
      {champLigne('Motif dépassement', affaire.motifDepassement)}
      {champLigne('Rabais global', affaire.rabaisGlobalBps !== 0 ? `${affaire.rabaisGlobalBps} bps` : null)}
      {champLigne('Rabais marché', affaire.rabaisMarcheBps !== 0 ? `${affaire.rabaisMarcheBps} bps` : null)}
      {champLigne('Responsable', affaire.responsable)}
      {champLigne('N° marché', affaire.numeroMarche)}
      {champLigne('Service contractant', affaire.serviceContractant)}
      {champLigne('Type de procédure', affaire.typeProcedure)}
      {champLigne('Retenue de garantie', affaire.retenueGarantieBps !== 0 ? `${affaire.retenueGarantieBps} bps` : null)}
      {champLigne('Délai garantie (mois)', affaire.delaiGarantieMois)}
      {champLigne('Date décompte provisoire', affaire.dateDecompteProvisoire)}
      {champLigne('Date décompte définitif', affaire.dateDecompteDefinitif)}
      {champLigne('N° contrat', affaire.numeroContrat)}
      {champLigne('Modalités paiement', affaire.modalitesPaiement)}
      {champLigne('Motif résiliation', affaire.motifResiliation)}
      {champLigne('Date résiliation', affaire.dateResiliation)}
    </div>
  )

  const ongletDqe = <GrilleDqe affaireId={affaireId} />

  const ongletAvenants = (
    <Liste<AvenantVue>
      donnees={avenants}
      colonnes={colonnesAvenants}
      etiquettesVide="Aucun avenant."
      actions={
        <button
          className="bouton"
          onClick={() => alert('Création avenant — à implémenter')}
        >
          Nouvel avenant
        </button>
      }
    />
  )

  const ongletDelais = (
    <SuiviDelais affaireId={affaireId} />
  )

  const alertes = calculerAlertesAffaire(affaire)

  return (
    <div className="ecran-fiche">
      <div className="en-tete-ecran">
        <h1>{affaire.reference}</h1>
        <button className="bouton-secondaire" onClick={() => naviguer('/affaires')}>
          ← Retour
        </button>
      </div>
      <BandeauAlertes alertes={alertes} />
      <FicheAOnglets
        onglets={[
          { id: 'general', label: 'Général', contenu: ongletGeneral },
          { id: 'dqe', label: 'DQE', contenu: ongletDqe },
          { id: 'avenants', label: 'Avenants', contenu: ongletAvenants },
          { id: 'delais', label: 'Délais', contenu: ongletDelais },
        ]}
      />
    </div>
  )
}
