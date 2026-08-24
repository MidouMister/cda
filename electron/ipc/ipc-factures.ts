import type { Base } from '../db/connexion'
import { obtenirBase as obtenirBaseParDefaut } from '../db/connexion'
import { machineEtatsFacture, transiter } from '../../domaine/machines-etats'
import { calculerPiedFacture, type ParametresPiedFacture } from '../../domaine/pied-facture'
import { type Unite } from '../../domaine/entites-referentielles'
import {
  creerFacture,
  listerFactures,
  lireFactureParId,
  modifierFacture,
  supprimerLogiquementFacture,
  validerFacture,
  creerLigneFacture,
  lireLignesFacture,
  modifierLigneFacture,
  supprimerLigneFacture,
  creerAvoir,
  listerAvoirs,
  type DonneesCreationFactureDepot,
  type LigneFactureAInserer,
  type FactureDepot,
  type LigneFactureLue,
} from '../depots/depot-factures'
import { lireClientParId } from '../depots/depot-clients'
import { lireAffaireParId } from '../depots/depot-affaires'
import { lireParametre } from '../depots/depot-parametres'
import type {
  FactureVue,
  LigneFactureVue,
  DonneesCreationFacture,
  DonneesCreationLigneFacture,
  ParametresPiedPreview,
  PiedCalcule,
  DonneesAvoir,
} from '../../contrats'
import { CANAUX } from '../../contrats'
import type { EnregistreurIpc } from './enregistrer-ipc'
import { construireGabaritFacture } from '../pdf/gabarit-facture'
import { genererPdfBuffer } from '../pdf/generer-pdf'
import type { DonneesPdfFacture, DonneesLignePdf, DonneesPiedPdf, DonneesEntreprisePdf } from '../pdf/types'

const mapperFactureEnVue = (f: FactureDepot): FactureVue => ({
  id: f.id,
  statut: f.statut,
  typeDocument: f.type_document,
  numero: f.numero,
  dateFacture: f.date_facture,
  dateEcheance: f.date_echeance,
  affaireId: f.affaire_id,
  clientId: f.client_id,
  adresseFacturation: f.adresse_facturation,
  adresseFacturationType: f.adresse_facturation_type as 'SIEGE' | 'CHANTIER' | null,
  nifClient: f.nif_client,
  numeroBcClient: f.numero_bc_client,
  retenueGarantieBps: f.retenue_garantie_bps,
  remboursementAvanceCentimes: f.remboursement_avance_centimes,
  modeReglementPrevu: f.mode_reglement_prevu,
  totalHtLignesCentimes: f.total_ht_lignes_centimes,
  totalRemisesCentimes: f.total_remises_centimes,
  netCommercialHtCentimes: f.net_commercial_ht_centimes,
  retenueGarantieCentimes: f.retenue_garantie_centimes,
  totalHtCentimes: f.total_ht_centimes,
  totalTvaCentimes: f.total_tva_centimes,
  totalTtcCentimes: f.total_ttc_centimes,
  netAPayerCentimes: f.net_a_payer_centimes,
  factureOrigineId: f.facture_origine_id,
  motifAvoir: f.motif_avoir,
  dateValidation: f.date_validation,
  nombreImpressions: f.nombre_impressions,
  exerciceId: f.exercice_id,
  dateCreation: f.cree_le,
  dateModification: f.modifie_le,
})

const mapperLigneEnVue = (ligne: LigneFactureLue): LigneFactureVue => ({
  id: ligne.id,
  factureId: ligne.facture_id,
  produitId: ligne.produit_id,
  designation: ligne.designation,
  unite: ligne.unite ?? 'U',
  quantiteMilliemes: ligne.quantite_milliemes,
  puHtCentimes: ligne.pu_ht_centimes,
  remiseBps: ligne.remise_bps,
  rabaisMarcheBps: ligne.rabais_marche_bps,
  montantHtBrutCentimes: ligne.montant_ht_brut_centimes,
  montantHtRemiseCentimes: ligne.montant_ht_remise_centimes,
  montantRabaisMarcheCentimes: ligne.montant_rabais_marche_centimes,
  montantHtNetCentimes: ligne.montant_ht_net_centimes,
  typeLigne: ligne.type_ligne,
  familleId: ligne.famille_id,
  sousFamilleId: ligne.sous_famille_id,
  classification: ligne.classification,
})

const mapperDonneesCreationVersDepot = (donnees: DonneesCreationFacture): DonneesCreationFactureDepot => ({
  statut: 'BROUILLON',
  type_document: donnees.typeDocument,
  date_facture: donnees.dateFacture,
  client_id: donnees.clientId,
  affaire_id: donnees.affaireId,
  date_echeance: donnees.dateEcheance,
  adresse_facturation: donnees.adresseFacturation,
  adresse_facturation_type: donnees.adresseFacturationType,
  numero_bc_client: donnees.numeroBcClient,
  retenue_garantie_bps: donnees.retenueGarantieBps,
  remboursement_avance_centimes: donnees.remboursementAvanceCentimes,
  mode_reglement_prevu: donnees.modeReglementPrevu,
})

const mapperDonneesCreationLigneVersDepot = (
  factureId: number,
  donnees: DonneesCreationLigneFacture,
): LigneFactureAInserer & { facture_id: number } => ({
  facture_id: factureId,
  designation: donnees.designation,
  unite: donnees.unite as Unite,
  quantite_milliemes: donnees.quantiteMilliemes,
  pu_ht_centimes: donnees.puHtCentimes,
  remise_bps: donnees.remiseBps,
  rabais_marche_bps: donnees.rabaisMarcheBps,
  produit_id: donnees.produitId,
  famille_id: donnees.familleId,
  sous_famille_id: donnees.sousFamilleId,
  classification: donnees.classification as LigneFactureAInserer['classification'],
})

const versPiedCalcule = (pied: ReturnType<typeof calculerPiedFacture>): PiedCalcule => ({
  totalHtLignesCentimes: pied.total_ht_lignes_centimes,
  totalRemisesCentimes: pied.total_remises_centimes,
  netCommercialHtCentimes: pied.net_commercial_ht_centimes,
  remboursementAvanceCentimes: pied.remboursement_avance_centimes,
  retenueGarantieCentimes: pied.retenue_garantie_centimes,
  totalHtCentimes: pied.total_ht_centimes,
  totalTvaCentimes: pied.total_tva_centimes,
  totalTtcCentimes: pied.total_ttc_centimes,
  netAPayerCentimes: pied.net_a_payer_centimes,
  ajustementEcartAudit: pied.ajustement_ecart_audit,
})

const verifierId = (id: unknown): number => {
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) {
    throw new TypeError('« id » doit être un entier strictement positif.')
  }
  return id
}

const verifierDonneesCreationFacture = (donnees: unknown): DonneesCreationFacture => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de facture.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  if (typeof source.dateFacture !== 'string' || source.dateFacture.trim() === '') {
    throw new TypeError('« dateFacture » doit être une chaîne non vide.')
  }
  if (typeof source.typeDocument !== 'string' || source.typeDocument.trim() === '') {
    throw new TypeError('« typeDocument » doit être une chaîne non vide.')
  }
  return donnees as DonneesCreationFacture
}

const verifierDonneesCreationLigneFacture = (donnees: unknown): DonneesCreationLigneFacture => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création de ligne de facture.')
  }
  const source = donnees as Record<string, unknown>
  if (typeof source.designation !== 'string' || source.designation.trim() === '') {
    throw new TypeError('« designation » doit être une chaîne non vide.')
  }
  if (typeof source.unite !== 'string' || source.unite.trim() === '') {
    throw new TypeError('« unite » doit être une chaîne non vide.')
  }
  if (source.quantiteMilliemes !== undefined && typeof source.quantiteMilliemes !== 'number') {
    throw new TypeError('« quantiteMilliemes » doit être un nombre.')
  }
  if (source.puHtCentimes !== undefined && typeof source.puHtCentimes !== 'number') {
    throw new TypeError('« puHtCentimes » doit être un nombre.')
  }
  return donnees as DonneesCreationLigneFacture
}

const verifierDonneesAvoir = (donnees: unknown): DonneesAvoir & { clientId: number; dateFacture: string } => {
  if (donnees === null || typeof donnees !== 'object') {
    throw new TypeError('« donnees » doit être un objet de création d\'avoir.')
  }
  const source = donnees as Record<string, unknown>
  if (
    typeof source.factureOrigineId !== 'number' ||
    !Number.isSafeInteger(source.factureOrigineId) ||
    source.factureOrigineId < 1
  ) {
    throw new TypeError('« factureOrigineId » doit être un entier strictement positif.')
  }
  if (typeof source.motifAvoir !== 'string' || source.motifAvoir.trim().length < 3) {
    throw new TypeError('« motifAvoir » doit contenir au moins 3 caractères.')
  }
  if (typeof source.modeAvoir !== 'string' || !['TOTAL', 'PAR_LIGNES', 'PARTIEL'].includes(source.modeAvoir)) {
    throw new TypeError('« modeAvoir » doit être TOTAL, PAR_LIGNES ou PARTIEL.')
  }
  if (typeof source.dateFacture !== 'string' || source.dateFacture.trim() === '') {
    throw new TypeError('« dateFacture » doit être une chaîne non vide.')
  }
  if (typeof source.clientId !== 'number' || !Number.isSafeInteger(source.clientId) || source.clientId < 1) {
    throw new TypeError('« clientId » doit être un entier strictement positif.')
  }
  return donnees as DonneesAvoir & { clientId: number; dateFacture: string }
}

const verrouillerFacture = (base: Base, id: number, statutRequis: string): FactureDepot => {
  const facture = lireFactureParId(base, id)
  if (facture === null) {
    throw new Error(`Facture ${String(id)} introuvable.`)
  }
  if (facture.statut !== statutRequis) {
    throw new Error(
      `Opération impossible : la facture est au statut « ${facture.statut} ». Statut requis : « ${statutRequis} ».`,
    )
  }
  return facture
}

export const enregistrerHandlersFactures = (
  enregistreur: EnregistreurIpc,
  obtenirBase: () => Base = obtenirBaseParDefaut,
): void => {
  enregistreur.handle(CANAUX.factures.lister, (_evenement, filtres) => {
    const f = filtres as { statut?: string; clientId?: number; affaireId?: number } | undefined
    return listerFactures(obtenirBase(), f).map(mapperFactureEnVue)
  })

  enregistreur.handle(CANAUX.factures.creer, (_evenement, donnees) => {
    const validees = verifierDonneesCreationFacture(donnees)
    return { id: creerFacture(obtenirBase(), mapperDonneesCreationVersDepot(validees)) }
  })

  enregistreur.handle(CANAUX.factures.lire, (_evenement, id) => {
    const valideId = verifierId(id)
    const facture = lireFactureParId(obtenirBase(), valideId)
    return facture === null ? null : mapperFactureEnVue(facture)
  })

  enregistreur.handle(CANAUX.factures.modifier, (_evenement, id, donnees) => {
    const valideId = verifierId(id)
    return modifierFacture(obtenirBase(), valideId, donnees as Partial<DonneesCreationFactureDepot>)
  })

  enregistreur.handle(CANAUX.factures.supprimer, (_evenement, id) => {
    const valideId = verifierId(id)
    return supprimerLogiquementFacture(obtenirBase(), valideId)
  })

  enregistreur.handle(CANAUX.factures.valider, (_evenement, id) => {
    const valideId = verifierId(id)
    const facture = validerFacture(obtenirBase(), valideId)
    return mapperFactureEnVue(facture)
  })

  enregistreur.handle(CANAUX.factures.calculerPied, (_evenement, parametres) => {
    const source = parametres as ParametresPiedPreview
    const paramDomaine: ParametresPiedFacture = {
      lignes: source.lignes.map((l) => ({
        quantiteMilliemes: l.quantiteMilliemes,
        puHtCentimes: l.puHtCentimes,
        remiseBps: l.remiseBps,
        rabaisMarcheBps: l.rabaisMarcheBps,
      })),
      retenueGarantieBps: source.retenueGarantieBps,
      remboursementAvanceCentimes: source.remboursementAvanceCentimes,
      marchePublic: source.marchePublic,
      tauxTvaBps: source.tauxTvaBps,
    }
    const pied = calculerPiedFacture(paramDomaine)
    return versPiedCalcule(pied)
  })

  enregistreur.handle(CANAUX.factures.listerLignes, (_evenement, factureId) => {
    const valideId = verifierId(factureId)
    return lireLignesFacture(obtenirBase(), valideId).map(mapperLigneEnVue)
  })

  enregistreur.handle(CANAUX.factures.creerLigne, (_evenement, donnees) => {
    const source = donnees as DonneesCreationLigneFacture & { factureId: number }
    verifierId(source?.factureId)
    const validees = verifierDonneesCreationLigneFacture(donnees)
    return {
      id: creerLigneFacture(
        obtenirBase(),
        mapperDonneesCreationLigneVersDepot(source.factureId, validees),
      ),
    }
  })

  enregistreur.handle(CANAUX.factures.modifierLigne, (_evenement, id, donnees) => {
    const valideId = verifierId(id)
    return modifierLigneFacture(obtenirBase(), valideId, donnees as Partial<LigneFactureAInserer>)
  })

  enregistreur.handle(CANAUX.factures.supprimerLigne, (_evenement, id) => {
    const valideId = verifierId(id)
    return supprimerLigneFacture(obtenirBase(), valideId)
  })

  enregistreur.handle(CANAUX.factures.genererPdf, async (_evenement, id) => {
    const valideId = verifierId(id)
    const base = obtenirBase()
    const facture = lireFactureParId(base, valideId)
    if (facture === null) {
      throw new Error(`Facture ${String(valideId)} introuvable.`)
    }
    if (facture.statut === 'BROUILLON') {
      throw new Error('Génération PDF impossible : la facture est au statut « BROUILLON ».')
    }
    const lignes = lireLignesFacture(base, valideId)
    const client = lireClientParId(base, facture.client_id)
    if (client === null) {
      throw new Error('Client introuvable pour la facture.')
    }
    const capitalStr = lireParametre(base, 'entreprise.capital_centimes')
    const capitalDa = capitalStr !== null ? (Number(capitalStr) / 100).toFixed(2) + ' DA' : 'Non renseigné'
    const entreprise: DonneesEntreprisePdf = {
      raisonSociale: lireParametre(base, 'entreprise.denomination') ?? '',
      formeJuridique: lireParametre(base, 'entreprise.forme_juridique') ?? 'SARL',
      capital: capitalDa,
      rc: lireParametre(base, 'entreprise.rc') ?? '',
      nif: lireParametre(base, 'entreprise.nif') ?? '',
      nis: lireParametre(base, 'entreprise.nis') ?? '',
      ai: lireParametre(base, 'entreprise.ai') ?? '',
      adresse: lireParametre(base, 'entreprise.adresse') ?? '',
      telephone: lireParametre(base, 'entreprise.telephone') ?? '',
    }
    const affaireDepot = facture.affaire_id !== null ? lireAffaireParId(base, facture.affaire_id) : null

    const donneesLignes: DonneesLignePdf[] = lignes.map((l) => ({
      designation: l.designation,
      unite: l.unite ?? 'U',
      quantiteMilliemes: l.quantite_milliemes,
      puHtCentimes: l.pu_ht_centimes,
      remiseBps: l.remise_bps,
      rabaisMarcheBps: l.rabais_marche_bps,
      montantHtBrutCentimes: l.montant_ht_brut_centimes,
      montantHtRemiseCentimes: l.montant_ht_remise_centimes,
      montantRabaisMarcheCentimes: l.montant_rabais_marche_centimes,
      montantHtNetCentimes: l.montant_ht_net_centimes,
      typeLigne: l.type_ligne,
    }))

    const pied: DonneesPiedPdf = {
      totalHtLignesCentimes: facture.total_ht_lignes_centimes,
      totalRemisesCentimes: facture.total_remises_centimes,
      netCommercialHtCentimes: facture.net_commercial_ht_centimes,
      retenueGarantieCentimes: facture.retenue_garantie_centimes,
      totalHtCentimes: facture.total_ht_centimes,
      totalTvaCentimes: facture.total_tva_centimes,
      totalTtcCentimes: facture.total_ttc_centimes,
      netAPayerCentimes: facture.net_a_payer_centimes,
    }

    const donneesPdf: DonneesPdfFacture = {
      facture: {
        numero: facture.numero,
        typeDocument: facture.type_document,
        dateFacture: facture.date_facture,
        dateEcheance: facture.date_echeance,
        statut: facture.statut,
        nombreImpressions: facture.nombre_impressions,
        nifClient: facture.nif_client,
        numeroBcClient: facture.numero_bc_client,
        adresseFacturation: facture.adresse_facturation,
        modeReglementPrevu: facture.mode_reglement_prevu,
        retenueGarantieBps: facture.retenue_garantie_bps,
        remboursementAvanceCentimes: facture.remboursement_avance_centimes,
      },
      client: {
        raisonSociale: client.raison_sociale,
        adresse: client.adresse,
        nif: client.nif,
      },
      affaire: affaireDepot !== null ? { reference: affaireDepot.reference, objet: affaireDepot.objet ?? '' } : undefined,
      entreprise,
      lignes: donneesLignes,
      pied,
      estDuplicata: facture.nombre_impressions > 0,
    }

    const gabarit = construireGabaritFacture(donneesPdf)
    return genererPdfBuffer(gabarit)
  })

  enregistreur.handle(CANAUX.factures.imprimer, async (_evenement, id) => {
    const valideId = verifierId(id)
    const base = obtenirBase()
    verrouillerFacture(base, valideId, 'VALIDE')
    const facture = lireFactureParId(base, valideId)
    if (facture === null) {
      throw new Error(`Facture ${String(valideId)} introuvable.`)
    }
    const lignes = lireLignesFacture(base, valideId)
    const client = lireClientParId(base, facture.client_id)
    if (client === null) {
      throw new Error('Client introuvable pour la facture.')
    }
    const capitalStr = lireParametre(base, 'entreprise.capital_centimes')
    const capitalDa = capitalStr !== null ? (Number(capitalStr) / 100).toFixed(2) + ' DA' : 'Non renseigné'
    const entreprise: DonneesEntreprisePdf = {
      raisonSociale: lireParametre(base, 'entreprise.denomination') ?? '',
      formeJuridique: lireParametre(base, 'entreprise.forme_juridique') ?? 'SARL',
      capital: capitalDa,
      rc: lireParametre(base, 'entreprise.rc') ?? '',
      nif: lireParametre(base, 'entreprise.nif') ?? '',
      nis: lireParametre(base, 'entreprise.nis') ?? '',
      ai: lireParametre(base, 'entreprise.ai') ?? '',
      adresse: lireParametre(base, 'entreprise.adresse') ?? '',
      telephone: lireParametre(base, 'entreprise.telephone') ?? '',
    }
    const affaireDepot = facture.affaire_id !== null ? lireAffaireParId(base, facture.affaire_id) : null

    const donneesLignes: DonneesLignePdf[] = lignes.map((l) => ({
      designation: l.designation,
      unite: l.unite ?? 'U',
      quantiteMilliemes: l.quantite_milliemes,
      puHtCentimes: l.pu_ht_centimes,
      remiseBps: l.remise_bps,
      rabaisMarcheBps: l.rabais_marche_bps,
      montantHtBrutCentimes: l.montant_ht_brut_centimes,
      montantHtRemiseCentimes: l.montant_ht_remise_centimes,
      montantRabaisMarcheCentimes: l.montant_rabais_marche_centimes,
      montantHtNetCentimes: l.montant_ht_net_centimes,
      typeLigne: l.type_ligne,
    }))

    const pied: DonneesPiedPdf = {
      totalHtLignesCentimes: facture.total_ht_lignes_centimes,
      totalRemisesCentimes: facture.total_remises_centimes,
      netCommercialHtCentimes: facture.net_commercial_ht_centimes,
      retenueGarantieCentimes: facture.retenue_garantie_centimes,
      totalHtCentimes: facture.total_ht_centimes,
      totalTvaCentimes: facture.total_tva_centimes,
      totalTtcCentimes: facture.total_ttc_centimes,
      netAPayerCentimes: facture.net_a_payer_centimes,
    }

    const donneesPdf: DonneesPdfFacture = {
      facture: {
        numero: facture.numero,
        typeDocument: facture.type_document,
        dateFacture: facture.date_facture,
        dateEcheance: facture.date_echeance,
        statut: facture.statut,
        nombreImpressions: facture.nombre_impressions,
        nifClient: facture.nif_client,
        numeroBcClient: facture.numero_bc_client,
        adresseFacturation: facture.adresse_facturation,
        modeReglementPrevu: facture.mode_reglement_prevu,
        retenueGarantieBps: facture.retenue_garantie_bps,
        remboursementAvanceCentimes: facture.remboursement_avance_centimes,
      },
      client: {
        raisonSociale: client.raison_sociale,
        adresse: client.adresse,
        nif: client.nif,
      },
      affaire: affaireDepot !== null ? { reference: affaireDepot.reference, objet: affaireDepot.objet ?? '' } : undefined,
      entreprise,
      lignes: donneesLignes,
      pied,
      estDuplicata: facture.nombre_impressions > 0,
    }

    const gabarit = construireGabaritFacture(donneesPdf)
    const buffer = await genererPdfBuffer(gabarit)

    const statutCible = transiter(machineEtatsFacture, 'VALIDE', 'IMPRIMER')
    base
      .prepare(
        `UPDATE factures
           SET statut = ?, nombre_impressions = nombre_impressions + 1, modifie_le = datetime('now')
         WHERE id = ? AND supprime_le IS NULL`,
      )
      .run(statutCible, valideId)

    return new Uint8Array(buffer)
  })

  enregistreur.handle(CANAUX.factures.marquerEnvoyee, (_evenement, id) => {
    const valideId = verifierId(id)
    const base = obtenirBase()
    verrouillerFacture(base, valideId, 'IMPRIMEE')
    const statutCible = transiter(machineEtatsFacture, 'IMPRIMEE', 'ENVOYER')
    base
      .prepare("UPDATE factures SET statut = ?, modifie_le = datetime('now') WHERE id = ? AND supprime_le IS NULL")
      .run(statutCible, valideId)
    const facture = lireFactureParId(base, valideId)
    if (facture === null) {
      throw new Error('Impossible de relire la facture après transit.')
    }
    return mapperFactureEnVue(facture)
  })

  enregistreur.handle(CANAUX.factures.creerAvoir, (_evenement, donnees) => {
    const validees = verifierDonneesAvoir(donnees)
    const base = obtenirBase()
    const id = creerAvoir(base, validees)
    const facture = lireFactureParId(base, id)
    if (facture === null) {
      throw new Error('Impossible de relire l\'avoir créé.')
    }
    return mapperFactureEnVue(facture)
  })

  enregistreur.handle(CANAUX.factures.listerAvoirs, (_evenement, factureId) => {
    const valideId = verifierId(factureId)
    return listerAvoirs(obtenirBase(), valideId).map(mapperFactureEnVue)
  })
}