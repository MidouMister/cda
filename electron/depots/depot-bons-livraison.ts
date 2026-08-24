import { attribuerNumero } from '../../domaine/numerotation'
import type { Base } from '../db/connexion'
import { versCentimes } from './conversion-centimes'
import { lireAffaireParId } from './depot-affaires'
import { incrementerCompteur, lireCompteur } from './depot-compteurs'
import { materialiserLignesEtPiedFacture, type LigneFactureAInserer } from './depot-factures'
export interface BonLivraisonDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  statut: string
  numero_bl: string
  date_livraison: string
  affaire_id: number | null
  client_id: number
  poids_pesee_kg: number | null
  signature_client: number
  facture_id: number | null
  exercice_id: number | null
}

export interface DonneesCreationBonLivraisonDepot {
  statut: string
  numero_bl: string
  date_livraison: string
  affaire_id?: number | null
  client_id: number
  poids_pesee_kg?: number | null
  signature_client?: number
  facture_id?: number | null
  exercice_id?: number | null
}

export interface LigneBonLivraisonDepot {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  bon_livraison_id: number
  produit_id: number | null
  designation: string
  unite: string | null
  quantite_milliemes: number
  pu_ht_centimes: number
  montant_ht_centimes: number
}

export interface DonneesCreationLigneBonLivraisonDepot {
  bon_livraison_id: number
  produit_id?: number | null
  designation: string
  unite?: string | null
  quantite_milliemes?: number
  pu_ht_centimes?: number
  montant_ht_centimes?: number
}

const normaliser = <T>(valeur: T | null | undefined): T | null => (valeur === undefined ? null : valeur)

export const creerBonLivraison = (base: Base, donnees: DonneesCreationBonLivraisonDepot): number => {
  const resultat = base
    .prepare(
      `INSERT INTO bons_livraison (
         statut, numero_bl, date_livraison, affaire_id, client_id,
         poids_pesee_kg, signature_client, facture_id, exercice_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.statut,
      donnees.numero_bl,
      donnees.date_livraison,
      normaliser(donnees.affaire_id),
      donnees.client_id,
      normaliser(donnees.poids_pesee_kg),
      donnees.signature_client ?? 0,
      normaliser(donnees.facture_id),
      normaliser(donnees.exercice_id),
    )
  return Number(resultat.lastInsertRowid)
}

export interface DonneesCreationBonLivraisonEmisDepot {
  date_livraison: string
  client_id: number
  affaire_id?: number | null
  poids_pesee_kg?: number | null
  signature_client?: number
}

export const creerBonLivraisonEmis = (
  base: Base,
  donnees: DonneesCreationBonLivraisonEmisDepot,
): number => {
  const executer = base.transaction((): number => {
    const annee = Number(donnees.date_livraison.slice(0, 4))
    if (!Number.isSafeInteger(annee) || annee < 2000 || annee > 2100) {
      throw new Error(`Année invalide dans la date de livraison (« ${donnees.date_livraison} »).`)
    }
    const dernierNumero = lireCompteur(base, 'BL', annee)?.dernierNumero ?? null
    const attribution = attribuerNumero({ codeDocument: 'BL', annee, dernierNumero })
    const sequenceVerrouillee = incrementerCompteur(base, 'BL', annee)
    if (sequenceVerrouillee !== attribution.prochainDernierNumero) {
      throw new Error('Incohérence de numérotation BL : le compteur n\'a pas avancé comme attendu.')
    }
    return creerBonLivraison(base, {
      statut: 'EMIS',
      numero_bl: attribution.numero,
      date_livraison: donnees.date_livraison,
      affaire_id: donnees.affaire_id ?? null,
      client_id: donnees.client_id,
      poids_pesee_kg: donnees.poids_pesee_kg ?? null,
      signature_client: donnees.signature_client,
    })
  })
  return executer()
}

export const lireBonLivraisonParId = (base: Base, id: number): BonLivraisonDepot | null => {
  const ligne = base
    .prepare('SELECT * FROM bons_livraison WHERE id = ? AND supprime_le IS NULL')
    .get(id) as BonLivraisonDepot | undefined
  return ligne ?? null
}

export const listerBonsLivraison = (
  base: Base,
  filtres?: { statut?: string; clientId?: number; affaireId?: number },
): BonLivraisonDepot[] => {
  const conditions: string[] = ['supprime_le IS NULL']
  const valeurs: unknown[] = []

  if (filtres?.statut !== undefined) {
    conditions.push('statut = ?')
    valeurs.push(filtres.statut)
  }
  if (filtres?.clientId !== undefined) {
    conditions.push('client_id = ?')
    valeurs.push(filtres.clientId)
  }
  if (filtres?.affaireId !== undefined) {
    conditions.push('affaire_id = ?')
    valeurs.push(filtres.affaireId)
  }

  return base
    .prepare(`SELECT * FROM bons_livraison WHERE ${conditions.join(' AND ')} ORDER BY numero_bl DESC`)
    .all(...valeurs) as BonLivraisonDepot[]
}

const CHAMPS_MODIFIABLES_BL: Record<string, string> = {
  poids_pesee_kg: 'poids_pesee_kg',
  signature_client: 'signature_client',
  affaire_id: 'affaire_id',
  exercice_id: 'exercice_id',
}

export const modifierBonLivraison = (
  base: Base,
  id: number,
  donneesPartielles: Partial<DonneesCreationBonLivraisonDepot>,
): boolean => {
  const existant = lireBonLivraisonParId(base, id)
  if (existant === null) {
    return false
  }
  const champs: string[] = []
  const valeurs: unknown[] = []

  for (const [cle, colonne] of Object.entries(CHAMPS_MODIFIABLES_BL)) {
    if (cle in donneesPartielles) {
      champs.push(`${colonne} = ?`)
      valeurs.push(donneesPartielles[cle as keyof DonneesCreationBonLivraisonDepot] ?? null)
    }
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE bons_livraison SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLogiquementBonLivraison = (base: Base, id: number): boolean => {
  const existant = lireBonLivraisonParId(base, id)
  if (existant === null || existant.statut === 'FACTURE') {
    return false
  }
  const resultat = base
    .prepare(
      `UPDATE bons_livraison
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}

const calculerMontantLigneBL = (puCentimes: number, quantiteMilliemes: number): number => {
  const produit = puCentimes * quantiteMilliemes
  return Math.floor((produit + 500) / 1000)
}

export const creerLigneBonLivraison = (base: Base, donnees: DonneesCreationLigneBonLivraisonDepot): number => {
  const pu = versCentimes(donnees.pu_ht_centimes ?? 0)
  const qte = versCentimes(donnees.quantite_milliemes ?? 0)
  const resultat = base
    .prepare(
      `INSERT INTO lignes_bon_livraison (
         bon_livraison_id, produit_id, designation, unite,
         quantite_milliemes, pu_ht_centimes, montant_ht_centimes
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      donnees.bon_livraison_id,
      normaliser(donnees.produit_id),
      donnees.designation,
      normaliser(donnees.unite),
      qte,
      pu,
      donnees.montant_ht_centimes ?? calculerMontantLigneBL(pu, qte),
    )
  return Number(resultat.lastInsertRowid)
}

export const listerLignesBonLivraison = (base: Base, blId: number): LigneBonLivraisonDepot[] =>
  base
    .prepare('SELECT * FROM lignes_bon_livraison WHERE bon_livraison_id = ? AND supprime_le IS NULL ORDER BY id')
    .all(blId) as LigneBonLivraisonDepot[]

export const modifierLigneBonLivraison = (
  base: Base,
  id: number,
  donnees: Partial<DonneesCreationLigneBonLivraisonDepot>,
): boolean => {
  const champs: string[] = []
  const valeurs: unknown[] = []
  const MAPPAGE: Record<string, string> = {
    produit_id: 'produit_id',
    designation: 'designation',
    unite: 'unite',
    quantite_milliemes: 'quantite_milliemes',
    pu_ht_centimes: 'pu_ht_centimes',
    montant_ht_centimes: 'montant_ht_centimes',
  }

  for (const [cle, colonne] of Object.entries(MAPPAGE)) {
    if (cle in donnees) {
      champs.push(`${colonne} = ?`)
      valeurs.push(donnees[cle as keyof DonneesCreationLigneBonLivraisonDepot] ?? null)
    }
  }

  if (champs.length === 0) {
    return true
  }

  champs.push("modifie_le = datetime('now')")
  valeurs.push(id)

  const resultat = base
    .prepare(`UPDATE lignes_bon_livraison SET ${champs.join(', ')} WHERE id = ? AND supprime_le IS NULL`)
    .run(...valeurs)
  return resultat.changes === 1
}

export const supprimerLigneBonLivraison = (base: Base, id: number): boolean => {
  const resultat = base.prepare('DELETE FROM lignes_bon_livraison WHERE id = ?').run(id)
  return resultat.changes === 1
}

interface DonneesGenererFactureDepuisBons {
  blIds: number[]
  clientId: number
  affaireId?: number
  dateFacture: string
  dateEcheance?: string
  retenueGarantieBps: number
  remboursementAvanceCentimes: number
  marchePublic: boolean
  modeReglementPrevu?: string
  tauxTvaBps?: number
}

interface BLValide {
  id: number
  client_id: number
  affaire_id: number | null
}

interface LigneBL {
  produit_id: number | null
  designation: string
  unite: string | null
  quantite_milliemes: number
  pu_ht_centimes: number
}

export const genererFactureDepuisBons = (base: Base, donnees: DonneesGenererFactureDepuisBons): number => {
  const executer = base.transaction((): number => {
    if (donnees.blIds.length === 0) {
      throw new Error('Au moins un bon de livraison doit àªtre sélectionné pour générer une facture.')
    }

    const bls: BLValide[] = []
    for (const blId of donnees.blIds) {
      const bl = base
        .prepare(
          'SELECT id, client_id, statut, affaire_id FROM bons_livraison WHERE id = ? AND supprime_le IS NULL',
        )
        .get(blId) as BLValide & { statut: string } | undefined
      if (bl === undefined) {
        throw new Error(`Le bon de livraison ${String(blId)} est introuvable ou supprimé.`)
      }
      if (bl.statut !== 'EMIS') {
        throw new Error(
          `Le bon de livraison ${String(blId)} ne peut pas àªtre facturé (statut : « ${bl.statut} »). Seuls les BL « EMIS » sont éligibles.`,
        )
      }
      if (bl.client_id !== donnees.clientId) {
        throw new Error(
          `Tous les bons de livraison doivent appartenir au màªme client. Le BL ${String(blId)} appartient au client ${String(bl.client_id)}.`,
        )
      }
      bls.push(bl)
    }

    const affairePremierBl = bls[0].affaire_id !== null ? lireAffaireParId(base, bls[0].affaire_id) : null
    const rabaisMarcheBps = affairePremierBl?.rabais_marche_bps ?? 0

    const allLignes: LigneBL[] = []
    for (const bl of bls) {
      const lignes = base
        .prepare(
          'SELECT * FROM lignes_bon_livraison WHERE bon_livraison_id = ? AND supprime_le IS NULL',
        )
        .all(bl.id) as LigneBL[]
      allLignes.push(...lignes)
    }

    if (allLignes.length === 0) {
      throw new Error('Aucune ligne trouvée dans les bons de livraison sélectionnés.')
    }

    const resultatInsertion = base
      .prepare(
        `INSERT INTO factures (
           type_document, statut, numero, date_facture, date_echeance,
           affaire_id, client_id, retenue_garantie_bps,
           remboursement_avance_centimes, mode_reglement_prevu
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'FA',
        'BROUILLON',
        null,
        donnees.dateFacture,
        normaliser(donnees.dateEcheance),
        normaliser(donnees.affaireId),
        donnees.clientId,
        donnees.retenueGarantieBps,
        donnees.remboursementAvanceCentimes,
        normaliser(donnees.modeReglementPrevu),
      )
    const factureId = Number(resultatInsertion.lastInsertRowid)

    const lignesAInserer: LigneFactureAInserer[] = allLignes.map((ligne) => ({
      designation: ligne.designation,
      unite: (ligne.unite ?? 'U') as LigneFactureAInserer['unite'],
      quantite_milliemes: ligne.quantite_milliemes,
      pu_ht_centimes: ligne.pu_ht_centimes,
      remise_bps: 0,
      rabais_marche_bps: rabaisMarcheBps,
      produit_id: ligne.produit_id,
    }))

    materialiserLignesEtPiedFacture(base, factureId, {
      lignes: lignesAInserer,
      retenue_garantie_bps: donnees.retenueGarantieBps,
      remboursement_avance_centimes: donnees.remboursementAvanceCentimes,
      marche_public: donnees.marchePublic,
      taux_tva_bps: donnees.tauxTvaBps,
    })

    for (const blId of donnees.blIds) {
      base
        .prepare(
          `UPDATE bons_livraison
              SET facture_id = ?, statut = 'FACTURE', modifie_le = datetime('now')
            WHERE id = ?`,
        )
        .run(factureId, blId)
    }

    return factureId
  })
  return executer()
}
