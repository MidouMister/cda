import type { Reference } from './identites'
import { transiter, machineEtatsDevis } from './machines-etats'

export interface LigneDevisPourConversion {
  readonly id: number
  readonly designation: string
  readonly unite: string
  readonly quantite_milliemes: number
  readonly pu_ht_centimes: number
  readonly montant_ht_centimes: number
  readonly produit_id: number | null
  readonly famille_id: number | null
  readonly sous_famille_id: number | null
}

export interface DonneesConversionDevis {
  readonly devis_id: number
  readonly statut_devis: string
  readonly client_id: number
  readonly date_devis: string
  readonly exercice_id: number | null
  readonly rabais_global_bps: number
  readonly lignes: readonly LigneDevisPourConversion[]
  readonly reference_affaire: Reference
}

export interface ResultatConversion {
  readonly nouveau_statut_devis: string
  readonly affaire: {
    readonly type_affaire: 'CONTRAT_PRIVE'
    readonly statut: 'SIGNE'
    readonly client_id: number
    readonly montant_initial_ht_centimes: number
    readonly taux_tva_bps: number
    readonly rabais_global_bps: number
  }
  readonly postes_dqe: readonly {
    readonly numero: number
    readonly designation: string
    readonly unite: string
    readonly quantite_milliemes: number
    readonly pu_ht_centimes: number
    readonly montant_ht_centimes: number
    readonly produit_id: number | null
    readonly famille_id: number | null
    readonly sous_famille_id: number | null
    readonly origine: 'DEVIS'
    readonly ligne_devis_id: number
  }[]
}

export function convertirDevisEnAffaire(donnees: DonneesConversionDevis): ResultatConversion {
  if (donnees.statut_devis !== 'ENVOYE') {
    throw new Error(
      `Conversion impossible : le devis doit être au statut « ENVOYE » (reçu : « ${donnees.statut_devis} »).`,
    )
  }

  const nouveauStatut = transiter(machineEtatsDevis, 'ENVOYE', 'ACCEPTER')

  const montantInitialHtCentimes = donnees.lignes.reduce(
    (somme, ligne) => somme + ligne.montant_ht_centimes,
    0,
  )

  const postesDqe = donnees.lignes.map((ligne, index) => ({
    numero: index + 1,
    designation: ligne.designation,
    unite: ligne.unite,
    quantite_milliemes: ligne.quantite_milliemes,
    pu_ht_centimes: ligne.pu_ht_centimes,
    montant_ht_centimes: ligne.montant_ht_centimes,
    produit_id: ligne.produit_id,
    famille_id: ligne.famille_id,
    sous_famille_id: ligne.sous_famille_id,
    origine: 'DEVIS' as const,
    ligne_devis_id: ligne.id,
  }))

  return {
    nouveau_statut_devis: nouveauStatut,
    affaire: {
      type_affaire: 'CONTRAT_PRIVE',
      statut: 'SIGNE',
      client_id: donnees.client_id,
      montant_initial_ht_centimes: montantInitialHtCentimes,
      taux_tva_bps: 1900,
      rabais_global_bps: donnees.rabais_global_bps,
    },
    postes_dqe: postesDqe,
  }
}
