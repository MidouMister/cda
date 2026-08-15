import type { Base } from '../db/connexion'
import { Encaissement, type StatutTimbre } from '../../domaine/encaissements'
import type { ModeReglementEffectif } from '../../domaine/entites-referentielles'
import type { StatutFacture } from '../../domaine/entites-facturation'
import { machineEtatsFacture, transiter } from '../../domaine/machines-etats'
import { attribuerNumero } from '../../domaine/numerotation'
import { calculerSoldeFacture, estSoldeNul } from '../../domaine/solde-facture'
import { incrementerCompteur, lireCompteur } from './depot-compteurs'
import { versCentimes } from './conversion-centimes'

// Valeurs provisoires uniquement pour traverser la validation du domaine à la
// création : l'identifiant et le numéro définitifs sont inconnus à la saisie —
// l'id est attribué par la base (AUTOINCREMENT), le numéro par la numérotation
// ENC ci-dessous. Seuls les invariants métier sont contrôlés ici : montant > 0,
// date ISO, mode parmi MODES_REGLEMENT_EFFECTIFS et contraintes
// conditionnelles du timbre (miroir des CHECK de la migration 2).
const ID_PROVISOIRE = 1
const NUMERO_PROVISOIRE = 'ENC-0000-0000'

// Décision utilisateur 16/08/2026 : un encaissement n'est accepté que sur une
// facture ENVOYEE — total comme partiel. Tous les autres statuts (BROUILLON,
// VALIDE, IMPRIMEE, PAYEE, ARCHIVEE) interdisent toute insertion, même
// partielle. Si un statut PARTIELLEMENT_PAYEE est introduit un jour, il devra
// rejoindre cette liste blanche.
const STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT = new Set<StatutFacture>(['ENVOYEE'])

export interface DonneesSaisieEncaissement {
  facture_id: number
  montant_encaisse_centimes: number
  date_encaissement: string
  mode_reglement_effectif: ModeReglementEffectif
  timbre_statut?: StatutTimbre
  montant_timbre_saisi_centimes?: number
  timbre_traite_le?: string
  timbre_traite_par?: string
  reference_timbre_ou_quittance?: string
  commentaire_timbre?: string
}

export interface EnregistrementEncaissement {
  id: number
  cree_le: string
  modifie_le: string
  supprime_le: string | null
  facture_id: number
  numero: string
  montant_encaisse_centimes: number
  date_encaissement: string
  mode_reglement_effectif: ModeReglementEffectif
  timbre_statut: StatutTimbre
  montant_timbre_saisi_centimes: number | null
  timbre_traite_le: string | null
  timbre_traite_par: string | null
  reference_timbre_ou_quittance: string | null
  commentaire_timbre: string | null
}

interface FacturePourEncaissement {
  id: number
  statut: StatutFacture
  net_a_payer_centimes: number
}

const lireFacturePourEncaissement = (base: Base, factureId: number): FacturePourEncaissement | null => {
  const ligne = base
    .prepare('SELECT id, statut, net_a_payer_centimes FROM factures WHERE id = ? AND supprime_le IS NULL')
    .get(factureId) as FacturePourEncaissement | undefined
  return ligne ?? null
}

const listerMontantsEncaissesActifs = (base: Base, factureId: number): number[] => {
  const lignes = base
    .prepare('SELECT montant_encaisse_centimes FROM encaissements WHERE facture_id = ? AND supprime_le IS NULL')
    .all(factureId) as { montant_encaisse_centimes: number }[]
  return lignes.map((ligne) => ligne.montant_encaisse_centimes)
}

export const listerEncaissements = (base: Base, factureId?: number): EnregistrementEncaissement[] => {
  if (factureId === undefined) {
    return base
      .prepare('SELECT * FROM encaissements WHERE supprime_le IS NULL ORDER BY date_encaissement, numero')
      .all() as EnregistrementEncaissement[]
  }
  return base
    .prepare(
      `SELECT * FROM encaissements
        WHERE supprime_le IS NULL AND facture_id = ?
        ORDER BY date_encaissement, numero`,
    )
    .all(factureId) as EnregistrementEncaissement[]
}

export const lireEncaissement = (base: Base, id: number): EnregistrementEncaissement | null => {
  const ligne = base
    .prepare('SELECT * FROM encaissements WHERE id = ? AND supprime_le IS NULL')
    .get(id) as EnregistrementEncaissement | undefined
  return ligne ?? null
}

export const creerEncaissement = (base: Base, donnees: DonneesSaisieEncaissement): number => {
  const executer = base.transaction((): number => {
    const facture = lireFacturePourEncaissement(base, donnees.facture_id)
    if (facture === null) {
      throw new Error('Impossible d’encaisser : la facture est introuvable ou a été supprimée.')
    }

    // Décision utilisateur 16/08/2026 : tout encaissement (total ou partiel)
    // est interdit hors statut ENVOYEE — vérifié avant validation et insertion,
    // le rollback est assuré par la transaction courante.
    if (!STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT.has(facture.statut)) {
      throw new Error(
        `Encaissement interdit : la facture est au statut « ${facture.statut} ». Seule une facture ENVOYEE peut être encaissée.`,
      )
    }

    // 1. Validation métier (montant > 0, date ISO, mode effectif, timbre) —
    //    contrôlée par le domaine, avant toute écriture.
    const valide = Encaissement.depuisDonnees({
      id: ID_PROVISOIRE,
      numero: NUMERO_PROVISOIRE,
      ...donnees,
    })

    // 2. Ceinture-bretelles avec les triggers de la migration 2 : le total des
    //    encaissements actifs (y compris le nouveau) ne dépasse jamais le
    //    montant dû de la facture.
    const montantsActifs = listerMontantsEncaissesActifs(base, facture.id)
    const soldeApresInsertion = calculerSoldeFacture(
      facture.net_a_payer_centimes,
      [...montantsActifs, versCentimes(valide.montant_encaisse_centimes)],
    )
    if (soldeApresInsertion < 0) {
      throw new Error('Encaissement interdit : dépassement du montant dû de la facture.')
    }

    // 3. Numérotation ENC, dans la même transaction (numéro verrouillé) :
    //    compteur par année issue de la date d'encaissement.
    const annee = Number(valide.date_encaissement.slice(0, 4))
    const dernierNumero = lireCompteur(base, 'ENC', annee)?.dernierNumero ?? null
    const attribution = attribuerNumero({ codeDocument: 'ENC', annee, dernierNumero })
    const sequenceVerrouillee = incrementerCompteur(base, 'ENC', annee)
    if (sequenceVerrouillee !== attribution.prochainDernierNumero) {
      throw new Error('Incohérence de numérotation ENC : le compteur n’a pas avancé comme attendu.')
    }

    const resultat = base
      .prepare(
        `INSERT INTO encaissements (
           facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif,
           timbre_statut, montant_timbre_saisi_centimes, timbre_traite_le, timbre_traite_par,
           reference_timbre_ou_quittance, commentaire_timbre
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        facture.id,
        attribution.numero,
        versCentimes(valide.montant_encaisse_centimes),
        valide.date_encaissement,
        valide.mode_reglement_effectif,
        valide.timbre_statut,
        valide.montant_timbre_saisi_centimes === null ? null : versCentimes(valide.montant_timbre_saisi_centimes),
        valide.timbre_traite_le,
        valide.timbre_traite_par,
        valide.reference_timbre_ou_quittance,
        valide.commentaire_timbre,
      )
    const idEncaissement = Number(resultat.lastInsertRowid)

    // 4. Passage à PAYEE uniquement au solde nul (D17) : après insertion, si
    //    Σ encaissements = montant dû, la transition ENCAISSER doit être
    //    légale dans la machine à états (ENVOYEE → PAYEE), sinon la facture
    //    est dans un état qui interdit l'encaissement (ex. ARCHIVEE).
    const montantsApres = listerMontantsEncaissesActifs(base, facture.id)
    const soldeApres = calculerSoldeFacture(facture.net_a_payer_centimes, montantsApres)
    if (estSoldeNul(soldeApres)) {
      let statutCible: StatutFacture
      try {
        statutCible = transiter(machineEtatsFacture, facture.statut, 'ENCAISSER')
      } catch {
        throw new Error(
          `Impossible de régler la facture : la transition « ENCAISSER » est interdite depuis le statut « ${facture.statut} ».`,
        )
      }
      base
        .prepare("UPDATE factures SET statut = ?, modifie_le = datetime('now') WHERE id = ?")
        .run(statutCible, facture.id)
    }

    return idEncaissement
  })
  return executer()
}

// Décision Phase D : la suppression logique d'un encaissement ne recalcule pas
// le statut PAYEE de la facture. Une facture passée PAYEE ne redevient jamais
// non-PAYEE automatiquement (règle fiscale : une facture payée reste payée,
// les corrections passent par des régularisations ultérieures). La suppression
// est purement logique (supprime_le) et reste auditée par les triggers de la
// migration 2 — le dépôt n'écrit jamais dans journal_audit.
export const supprimerEncaissement = (base: Base, id: number): boolean => {
  const resultat = base
    .prepare(
      `UPDATE encaissements
          SET supprime_le = datetime('now'), modifie_le = datetime('now')
        WHERE id = ? AND supprime_le IS NULL`,
    )
    .run(id)
  return resultat.changes === 1
}

export interface DonneesModificationTimbreEncaissement {
  id: number
  timbre_statut: StatutTimbre
  montant_timbre_saisi_centimes?: number
  timbre_traite_le?: string
  timbre_traite_par?: string
  reference_timbre_ou_quittance?: string
  commentaire_timbre?: string
}

// Décision utilisateur 16/08/2026 : seule la gestion du timbre d'un encaissement
// existant est modifiable — jamais montant_encaisse_centimes, mode de règlement
// effectif, facture, date d'encaissement ou numéro (les corrections de ces
// champs passent par une annulation suivie d'un nouvel encaissement). La
// modification ne touche pas le statut de la facture : une facture PAYEE reste
// PAYEE. Validation via le domaine (contraintes conditionnelles du timbre,
// miroir des CHECK de la migration 2), audit par le trigger UPDATE existant.
export const modifierTraitementTimbreEncaissement = (
  base: Base,
  donnees: DonneesModificationTimbreEncaissement,
): EnregistrementEncaissement | null => {
  const executer = base.transaction((): EnregistrementEncaissement | null => {
    const existant = lireEncaissement(base, donnees.id)
    if (existant === null) {
      return null
    }

    // Fusion complète : tous les champs existants conservés, seuls les 6
    // champs de traitement du timbre remplacés. « undefined » sur un champ
    // optionnel signifie « absent » → null en base selon le type.
    const valide = Encaissement.depuisDonnees({
      ...existant,
      supprime_le: existant.supprime_le ?? undefined,
      timbre_statut: donnees.timbre_statut,
      montant_timbre_saisi_centimes: donnees.montant_timbre_saisi_centimes,
      timbre_traite_le: donnees.timbre_traite_le,
      timbre_traite_par: donnees.timbre_traite_par,
      reference_timbre_ou_quittance: donnees.reference_timbre_ou_quittance,
      commentaire_timbre: donnees.commentaire_timbre,
    })

    base
      .prepare(
        `UPDATE encaissements
            SET timbre_statut = ?,
                montant_timbre_saisi_centimes = ?,
                timbre_traite_le = ?,
                timbre_traite_par = ?,
                reference_timbre_ou_quittance = ?,
                commentaire_timbre = ?,
                modifie_le = datetime('now')
          WHERE id = ?`,
      )
      .run(
        valide.timbre_statut,
        valide.montant_timbre_saisi_centimes === null ? null : versCentimes(valide.montant_timbre_saisi_centimes),
        valide.timbre_traite_le,
        valide.timbre_traite_par,
        valide.reference_timbre_ou_quittance,
        valide.commentaire_timbre,
        donnees.id,
      )

    return lireEncaissement(base, donnees.id)
  })
  return executer()
}
