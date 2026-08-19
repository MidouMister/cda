import type { Base } from '../db/connexion'

export interface DonneesAffaireDepot {
  statut: string
  reference: string
  type_affaire: string
  affaire_mere_id?: number | null
  client_id: number
  objet?: string | null
  montant_initial_ht_centimes?: number
  taux_tva_bps?: number
  date_signature?: string | null
  date_notification?: string | null
  numero_ods?: string | null
  date_ods?: string | null
  date_demarrage_effectif?: string | null
  delai_execution_jours?: number | null
  date_fin_contractuelle?: string | null
  date_fin_revisee?: string | null
  date_fin_reelle?: string | null
  motif_depassement?: string | null
  rabais_global_bps?: number
  rabais_marche_bps?: number
  responsable?: string | null
  numero_marche?: string | null
  service_contractant?: string | null
  type_procedure?: string | null
  avance_forfaitaire_bps?: number | null
  avance_approvisionnement_bps?: number | null
  retenue_garantie_bps?: number
  delai_garantie_mois?: number | null
  type_revision?: string | null
  formule_revision?: string | null
  penalite_retard_taux_bps?: number | null
  penalite_retard_base_centimes?: number | null
  penalite_retard_plafond_bps?: number | null
  date_decompte_provisoire?: string | null
  date_decompte_definitif?: string | null
  numero_contrat?: string | null
  modalites_paiement?: string | null
  avance_contractuelle_centimes?: number | null
  motif_resiliation?: string | null
  date_resiliation?: string | null
  decompte_resiliation_centimes?: number | null
  sort_cautions?: string | null
  sort_retenue_garantie?: string | null
}

export interface AffaireDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  statut: string
  reference: string
  type_affaire: string
  affaire_mere_id: number | null
  client_id: number
  objet: string | null
  montant_initial_ht_centimes: number
  taux_tva_bps: number
  date_signature: string | null
  date_notification: string | null
  numero_ods: string | null
  date_ods: string | null
  date_demarrage_effectif: string | null
  delai_execution_jours: number | null
  date_fin_contractuelle: string | null
  date_fin_revisee: string | null
  date_fin_reelle: string | null
  motif_depassement: string | null
  rabais_global_bps: number
  rabais_marche_bps: number
  responsable: string | null
  numero_marche: string | null
  service_contractant: string | null
  type_procedure: string | null
  avance_forfaitaire_bps: number | null
  avance_approvisionnement_bps: number | null
  retenue_garantie_bps: number
  delai_garantie_mois: number | null
  type_revision: string | null
  formule_revision: string | null
  penalite_retard_taux_bps: number | null
  penalite_retard_base_centimes: number | null
  penalite_retard_plafond_bps: number | null
  date_decompte_provisoire: string | null
  date_decompte_definitif: string | null
  numero_contrat: string | null
  modalites_paiement: string | null
  avance_contractuelle_centimes: number | null
  motif_resiliation: string | null
  date_resiliation: string | null
  decompte_resiliation_centimes: number | null
  sort_cautions: string | null
  sort_retenue_garantie: string | null
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerAffaire = (base: Base, donnees: DonneesAffaireDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO affaires (
         statut, reference, type_affaire, affaire_mere_id, client_id, objet,
         montant_initial_ht_centimes, taux_tva_bps, date_signature, date_notification,
         numero_ods, date_ods, date_demarrage_effectif, delai_execution_jours,
         date_fin_contractuelle, date_fin_revisee, date_fin_reelle, motif_depassement,
         rabais_global_bps, rabais_marche_bps, responsable, numero_marche,
         service_contractant, type_procedure, avance_forfaitaire_bps,
         avance_approvisionnement_bps, retenue_garantie_bps, delai_garantie_mois,
         type_revision, formule_revision, penalite_retard_taux_bps,
         penalite_retard_base_centimes, penalite_retard_plafond_bps,
         date_decompte_provisoire, date_decompte_definitif, numero_contrat,
         modalites_paiement, avance_contractuelle_centimes, motif_resiliation,
         date_resiliation, decompte_resiliation_centimes, sort_cautions,
         sort_retenue_garantie
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.statut,
      donnees.reference,
      donnees.type_affaire,
      normaliser(donnees.affaire_mere_id),
      donnees.client_id,
      normaliser(donnees.objet),
      donnees.montant_initial_ht_centimes ?? 0,
      donnees.taux_tva_bps ?? 1900,
      normaliser(donnees.date_signature),
      normaliser(donnees.date_notification),
      normaliser(donnees.numero_ods),
      normaliser(donnees.date_ods),
      normaliser(donnees.date_demarrage_effectif),
      normaliser(donnees.delai_execution_jours),
      normaliser(donnees.date_fin_contractuelle),
      normaliser(donnees.date_fin_revisee),
      normaliser(donnees.date_fin_reelle),
      normaliser(donnees.motif_depassement),
      donnees.rabais_global_bps ?? 0,
      donnees.rabais_marche_bps ?? 0,
      normaliser(donnees.responsable),
      normaliser(donnees.numero_marche),
      normaliser(donnees.service_contractant),
      normaliser(donnees.type_procedure),
      normaliser(donnees.avance_forfaitaire_bps),
      normaliser(donnees.avance_approvisionnement_bps),
      donnees.retenue_garantie_bps ?? 500,
      normaliser(donnees.delai_garantie_mois),
      normaliser(donnees.type_revision),
      normaliser(donnees.formule_revision),
      normaliser(donnees.penalite_retard_taux_bps),
      normaliser(donnees.penalite_retard_base_centimes),
      normaliser(donnees.penalite_retard_plafond_bps),
      normaliser(donnees.date_decompte_provisoire),
      normaliser(donnees.date_decompte_definitif),
      normaliser(donnees.numero_contrat),
      normaliser(donnees.modalites_paiement),
      normaliser(donnees.avance_contractuelle_centimes),
      normaliser(donnees.motif_resiliation),
      normaliser(donnees.date_resiliation),
      normaliser(donnees.decompte_resiliation_centimes),
      normaliser(donnees.sort_cautions),
      normaliser(donnees.sort_retenue_garantie),
    )
  return Number(resultat.lastInsertRowid)
}

export const lireAffaireParId = (base: Base, id: number): AffaireDepot | null => {
  const ligne = base
    .prepare('SELECT * FROM affaires WHERE id = ? AND supprime_le IS NULL')
    .get(id) as AffaireDepot | undefined
  return ligne ?? null
}

export const listerAffaires = (base: Base): AffaireDepot[] => {
  return base.prepare('SELECT * FROM affaires WHERE supprime_le IS NULL ORDER BY reference').all() as AffaireDepot[]
}

export const modifierAffaire = (
  base: Base,
  id: number,
  donneesPartielles: Partial<DonneesAffaireDepot>,
): boolean => {
  const existant = lireAffaireParId(base, id)
  if (existant === null) {
    return false
  }
  const champs: string[] = []
  const valeurs: unknown[] = []

  const MAPPAGE: Record<string, string> = {
    statut: 'statut',
    reference: 'reference',
    type_affaire: 'type_affaire',
    affaire_mere_id: 'affaire_mere_id',
    client_id: 'client_id',
    objet: 'objet',
    montant_initial_ht_centimes: 'montant_initial_ht_centimes',
    taux_tva_bps: 'taux_tva_bps',
    date_signature: 'date_signature',
    date_notification: 'date_notification',
    numero_ods: 'numero_ods',
    date_ods: 'date_ods',
    date_demarrage_effectif: 'date_demarrage_effectif',
    delai_execution_jours: 'delai_execution_jours',
    date_fin_contractuelle: 'date_fin_contractuelle',
    date_fin_revisee: 'date_fin_revisee',
    date_fin_reelle: 'date_fin_reelle',
    motif_depassement: 'motif_depassement',
    rabais_global_bps: 'rabais_global_bps',
    rabais_marche_bps: 'rabais_marche_bps',
    responsable: 'responsable',
    numero_marche: 'numero_marche',
    service_contractant: 'service_contractant',
    type_procedure: 'type_procedure',
    avance_forfaitaire_bps: 'avance_forfaitaire_bps',
    avance_approvisionnement_bps: 'avance_approvisionnement_bps',
    retenue_garantie_bps: 'retenue_garantie_bps',
    delai_garantie_mois: 'delai_garantie_mois',
    type_revision: 'type_revision',
    formule_revision: 'formule_revision',
    penalite_retard_taux_bps: 'penalite_retard_taux_bps',
    penalite_retard_base_centimes: 'penalite_retard_base_centimes',
    penalite_retard_plafond_bps: 'penalite_retard_plafond_bps',
    date_decompte_provisoire: 'date_decompte_provisoire',
    date_decompte_definitif: 'date_decompte_definitif',
    numero_contrat: 'numero_contrat',
    modalites_paiement: 'modalites_paiement',
    avance_contractuelle_centimes: 'avance_contractuelle_centimes',
    motif_resiliation: 'motif_resiliation',
    date_resiliation: 'date_resiliation',
    decompte_resiliation_centimes: 'decompte_resiliation_centimes',
    sort_cautions: 'sort_cautions',
    sort_retenue_garantie: 'sort_retenue_garantie',
  }

  for (const [cle, colonne] of Object.entries(MAPPAGE)) {
    if (cle in donneesPartielles) {
      champs.push(`${colonne} = ?`)
      valeurs.push(donneesPartielles[cle as keyof DonneesAffaireDepot] ?? null)
    }
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE affaires SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementAffaire = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE affaires
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}
