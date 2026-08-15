import {
  MODES_REGLEMENT_EFFECTIFS,
  verifierChaineNonVide,
  verifierDateIso,
  verifierEntierNonNegatif,
  verifierEntierPositif,
  verifierParmi,
  type ModeReglementEffectif,
} from './entites-referentielles'

export const STATUTS_TIMBRE = ['A_VERIFIER', 'TRAITE', 'NON_APPLICABLE'] as const
export type StatutTimbre = (typeof STATUTS_TIMBRE)[number]

const chaineOuNulle = (valeur: string | undefined): string | null => valeur ?? null

const chaineFacultative = (valeur: string | undefined, libelle: string): string | null => {
  if (valeur === undefined || valeur.trim() === '') {
    return null
  }
  if (typeof valeur !== 'string') {
    throw new TypeError(`« ${libelle} » doit être une chaîne (reçu : ${String(valeur)}).`)
  }
  return valeur
}

const verifierChaineFacultative = (valeur: string | undefined, libelle: string): string | null => {
  if (valeur === undefined || valeur.trim() === '') {
    return null
  }
  verifierChaineNonVide(valeur, libelle)
  return valeur
}

const verifierDateFacultative = (valeur: string | undefined, libelle: string): string | null => {
  if (valeur === undefined) {
    return null
  }
  verifierDateIso(valeur, libelle)
  return valeur
}

export interface DonneesEncaissement {
  id: number
  facture_id: number
  numero: string
  montant_encaisse_centimes: number
  date_encaissement: string
  mode_reglement_effectif: ModeReglementEffectif
  timbre_statut?: StatutTimbre
  montant_timbre_saisi_centimes?: number
  timbre_traite_le?: string
  timbre_traite_par?: string
  reference_timbre_ou_quittance?: string
  commentaire_timbre?: string
  cree_le?: string
  modifie_le?: string
  supprime_le?: string
}

interface EncaissementNormalise {
  readonly id: number
  readonly facture_id: number
  readonly numero: string
  readonly montant_encaisse_centimes: number
  readonly date_encaissement: string
  readonly mode_reglement_effectif: ModeReglementEffectif
  readonly timbre_statut: StatutTimbre
  readonly montant_timbre_saisi_centimes: number | null
  readonly timbre_traite_le: string | null
  readonly timbre_traite_par: string | null
  readonly reference_timbre_ou_quittance: string | null
  readonly commentaire_timbre: string | null
  readonly cree_le: string | null
  readonly modifie_le: string | null
  readonly supprime_le: string | null
}

export class Encaissement {
  private constructor(private readonly _donnees: EncaissementNormalise) {}

  static depuisDonnees(donnees: DonneesEncaissement): Encaissement {
    verifierEntierPositif(donnees.id, 'identifiant encaissement')
    verifierEntierPositif(donnees.facture_id, 'identifiant facture')
    verifierChaineNonVide(donnees.numero, 'numéro d’encaissement')
    verifierEntierPositif(donnees.montant_encaisse_centimes, 'montant encaissé en centimes')
    verifierDateIso(donnees.date_encaissement, 'date d’encaissement')
    verifierParmi(donnees.mode_reglement_effectif, MODES_REGLEMENT_EFFECTIFS, 'mode de règlement effectif')

    const timbreStatut = donnees.timbre_statut ?? 'A_VERIFIER'
    verifierParmi(timbreStatut, STATUTS_TIMBRE, 'statut du timbre')

    if (donnees.montant_timbre_saisi_centimes !== undefined) {
      verifierEntierNonNegatif(donnees.montant_timbre_saisi_centimes, 'montant du timbre saisi en centimes')
    }

    const montantTimbre = donnees.montant_timbre_saisi_centimes ?? null
    const timbreTraiteLe = verifierDateFacultative(donnees.timbre_traite_le, 'date de traitement du timbre')
    const timbreTraitePar = verifierChaineFacultative(donnees.timbre_traite_par, 'responsable du traitement du timbre')
    const referenceTimbre = chaineFacultative(donnees.reference_timbre_ou_quittance, 'référence du timbre ou de la quittance')
    const commentaireTimbre = chaineFacultative(donnees.commentaire_timbre, 'commentaire du timbre')

    if (timbreStatut === 'NON_APPLICABLE') {
      if (
        montantTimbre !== null ||
        referenceTimbre !== null ||
        timbreTraiteLe !== null ||
        timbreTraitePar !== null
      ) {
        throw new Error(
          '« timbre NON_APPLICABLE » : montant, référence, date et responsable du timbre doivent rester vides.',
        )
      }
    } else if (timbreStatut === 'TRAITE') {
      if (montantTimbre === null || montantTimbre < 1) {
        throw new Error('« timbre TRAITE » : le montant du timbre est obligatoire et doit être strictement positif.')
      }
      if (timbreTraiteLe === null) {
        throw new Error('« timbre TRAITE » : la date de traitement du timbre est obligatoire.')
      }
      if (timbreTraitePar === null) {
        throw new Error('« timbre TRAITE » : le responsable du traitement du timbre est obligatoire.')
      }
    } else {
      if (montantTimbre !== null && montantTimbre === 0) {
        throw new Error('« timbre A_VERIFIER » : le montant du timbre doit être nul ou strictement positif.')
      }
      if (timbreTraiteLe !== null || timbreTraitePar !== null) {
        throw new Error('« timbre A_VERIFIER » : la date et le responsable du traitement doivent rester vides.')
      }
    }

    return new Encaissement({
      id: donnees.id,
      facture_id: donnees.facture_id,
      numero: donnees.numero,
      montant_encaisse_centimes: donnees.montant_encaisse_centimes,
      date_encaissement: donnees.date_encaissement,
      mode_reglement_effectif: donnees.mode_reglement_effectif,
      timbre_statut: timbreStatut,
      montant_timbre_saisi_centimes: montantTimbre,
      timbre_traite_le: timbreTraiteLe,
      timbre_traite_par: timbreTraitePar,
      reference_timbre_ou_quittance: referenceTimbre,
      commentaire_timbre: commentaireTimbre,
      cree_le: chaineOuNulle(donnees.cree_le),
      modifie_le: chaineOuNulle(donnees.modifie_le),
      supprime_le: chaineOuNulle(donnees.supprime_le),
    })
  }

  get id(): number {
    return this._donnees.id
  }

  get facture_id(): number {
    return this._donnees.facture_id
  }

  get numero(): string {
    return this._donnees.numero
  }

  get montant_encaisse_centimes(): number {
    return this._donnees.montant_encaisse_centimes
  }

  get date_encaissement(): string {
    return this._donnees.date_encaissement
  }

  get mode_reglement_effectif(): ModeReglementEffectif {
    return this._donnees.mode_reglement_effectif
  }

  get timbre_statut(): StatutTimbre {
    return this._donnees.timbre_statut
  }

  get montant_timbre_saisi_centimes(): number | null {
    return this._donnees.montant_timbre_saisi_centimes
  }

  get timbre_traite_le(): string | null {
    return this._donnees.timbre_traite_le
  }

  get timbre_traite_par(): string | null {
    return this._donnees.timbre_traite_par
  }

  get reference_timbre_ou_quittance(): string | null {
    return this._donnees.reference_timbre_ou_quittance
  }

  get commentaire_timbre(): string | null {
    return this._donnees.commentaire_timbre
  }

  get cree_le(): string | null {
    return this._donnees.cree_le
  }

  get modifie_le(): string | null {
    return this._donnees.modifie_le
  }

  get supprime_le(): string | null {
    return this._donnees.supprime_le
  }
}
