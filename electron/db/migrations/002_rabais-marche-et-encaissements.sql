-- =============================================================================
-- EGTO — Gestion Commerciale (Oran, filiale GITRA)
-- electron/db/migrations/002_rabais-marche-et-encaissements.sql — Migration 2
--
-- Décisions validées le 15/08/2026 (chef du département Commercial) :
--   1. Rabais des marchés publics appliqué ligne par ligne : taux contractuel
--      porté au niveau affaire (`affaires.rabais_marche_bps`), copié et figé sur
--      chaque ligne de facture (`lignes_facture.rabais_marche_bps`,
--      `montant_rabais_marche_centimes`, `montant_ht_net_centimes`). La formule
--      (net ligne = brut ligne − rabais ligne) relève de la Phase C (D9).
--   2. Droit de timbre retiré du pied de facture : TTC = HT + TVA strictement.
--      Les anciens champs (`factures.droit_timbre_centimes`, table
--      `bareme_timbre`, clé `timbre.seuil_max_especes_centimes`) sont conservés
--      pour compatibilité/historique, marqués dépréciés et retirés du chemin de
--      calcul — ils ne sont ni supprimés ni modifiés ici (PRD §4.7.3, §4.4.6).
--   3. Table `encaissements` (structure minimale MVP, §4.5.1-§4.5.2) : une
--      facture a 0..N encaissements ; passage à `PAYEE` uniquement au solde nul
--      (règle appliquée en Phase C, D17). Table sensible : audit par triggers.
--      `timbre_statut` est NOT NULL DEFAULT 'A_VERIFIER' avec contraintes
--      conditionnelles renforcées (décision utilisateur) : NON_APPLICABLE sans
--      aucun champ de traitement, TRAITE = montant + date + responsable (la
--      référence reste facultative, y compris pour TRAITE), A_VERIFIER sans
--      date ni responsable de traitement.
--
-- Conventions identiques au schéma J0 : montants en centimes (INTEGER),
-- dates ISO 'AAAA-MM-JJ' en base, suppression logique via `supprime_le`,
-- audit par triggers SQLite uniquement.
--
-- Réversibilité : migration NON réversible (ALTER TABLE ADD COLUMN). Protégée
-- par le runner (user_version 1 → 2) — elle n'est exécutée qu'une seule fois.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. affaires — taux contractuel du rabais marché (décision 15/08/2026)
-- ---------------------------------------------------------------------------
ALTER TABLE affaires ADD COLUMN rabais_marche_bps INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. lignes_facture — rabais marché figé ligne par ligne (décision 15/08/2026)
--    Le taux est copié depuis affaires.rabais_marche_bps au moment de la
--    facturation ; une modification ultérieure du taux d'affaire ne réécrit
--    pas les lignes déjà facturées (PRD §4.4.5bis).
-- ---------------------------------------------------------------------------
ALTER TABLE lignes_facture ADD COLUMN rabais_marche_bps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lignes_facture ADD COLUMN montant_rabais_marche_centimes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lignes_facture ADD COLUMN montant_ht_net_centimes INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. encaissements — Encaissements (structure minimale MVP) — PRD §4.5.1, §4.5.2
--    Table sensible : triggers d'audit INSERT/UPDATE/DELETE (voir plus bas).
--    Le droit de timbre est traité manuellement ici (timbre_statut) et ne
--    modifie jamais les montants de la facture (PRD §4.7.3).
-- ---------------------------------------------------------------------------
CREATE TABLE encaissements (
    id                            INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                       TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le                    TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le                   TEXT,
    facture_id                    INTEGER NOT NULL REFERENCES factures(id),
    numero                        TEXT NOT NULL,
    montant_encaisse_centimes     INTEGER NOT NULL
                                  CHECK (montant_encaisse_centimes > 0),
    date_encaissement             TEXT NOT NULL
                                  CHECK (date_encaissement GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    mode_reglement_effectif       TEXT NOT NULL
                                  CHECK (mode_reglement_effectif IN
                                         ('ESPECES','CHEQUE','VIREMENT_BANCAIRE','DEPOT_ESPECES_BANQUE')),
    timbre_statut                 TEXT NOT NULL DEFAULT 'A_VERIFIER'
                                  CHECK (timbre_statut IN ('A_VERIFIER','TRAITE','NON_APPLICABLE')),
    montant_timbre_saisi_centimes INTEGER,
    timbre_traite_le              TEXT,
    timbre_traite_par             TEXT,
    reference_timbre_ou_quittance TEXT,
    commentaire_timbre            TEXT,
    CHECK (
        timbre_statut <> 'NON_APPLICABLE'
        OR (montant_timbre_saisi_centimes IS NULL
            AND reference_timbre_ou_quittance IS NULL
            AND timbre_traite_le IS NULL
            AND timbre_traite_par IS NULL)
    ),
    CHECK (
        timbre_statut <> 'TRAITE'
        OR (montant_timbre_saisi_centimes IS NOT NULL
            AND montant_timbre_saisi_centimes > 0
            AND timbre_traite_le IS NOT NULL
            AND timbre_traite_par IS NOT NULL)
    ),
    CHECK (
        timbre_statut <> 'A_VERIFIER'
        OR ((montant_timbre_saisi_centimes IS NULL OR montant_timbre_saisi_centimes > 0)
            AND timbre_traite_le IS NULL
            AND timbre_traite_par IS NULL)
    )
);

CREATE UNIQUE INDEX ux_encaissements_numero
    ON encaissements (numero)
    WHERE supprime_le IS NULL;

CREATE INDEX ix_encaissements_facture
    ON encaissements (facture_id);

-- ---------------------------------------------------------------------------
-- Anti-dépassement : un encaissement actif ne dépasse jamais le montant dû de
-- la facture (factures.net_a_payer_centimes). Somme des encaissements actifs
-- de la même facture, hors ligne en cours de mise à jour. La règle « solde nul
-- → PAYEE » et l'affectation sont appliquées en Phase C (D17).
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_encaissements_pas_depassement_insert
BEFORE INSERT ON encaissements
FOR EACH ROW
WHEN NEW.supprime_le IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Encaissement interdit : dépassement du montant dû de la facture.')
    WHERE (
        (SELECT COALESCE(SUM(montant_encaisse_centimes), 0)
           FROM encaissements
          WHERE facture_id = NEW.facture_id
            AND supprime_le IS NULL)
        + NEW.montant_encaisse_centimes
    ) > (SELECT net_a_payer_centimes FROM factures WHERE id = NEW.facture_id);
END;

CREATE TRIGGER trg_encaissements_pas_depassement_update
BEFORE UPDATE ON encaissements
FOR EACH ROW
WHEN NEW.supprime_le IS NULL
BEGIN
    SELECT RAISE(ABORT, 'Encaissement interdit : dépassement du montant dû de la facture.')
    WHERE (
        (SELECT COALESCE(SUM(montant_encaisse_centimes), 0)
           FROM encaissements
          WHERE facture_id = NEW.facture_id
            AND supprime_le IS NULL
            AND id <> NEW.id)
        + NEW.montant_encaisse_centimes
    ) > (SELECT net_a_payer_centimes FROM factures WHERE id = NEW.facture_id);
END;

-- ---------------------------------------------------------------------------
-- Triggers d'audit — encaissements (table sensible, décision 15/08/2026).
-- Même pattern que le schéma J0 : table journal_audit, auteur fixe 'egto'.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_encaissements_audit_insert AFTER INSERT ON encaissements
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('encaissements', 'INSERT', NEW.id, NULL,
        json_object(
            'facture_id', NEW.facture_id, 'numero', NEW.numero,
            'montant_encaisse_centimes', NEW.montant_encaisse_centimes,
            'date_encaissement', NEW.date_encaissement,
            'mode_reglement_effectif', NEW.mode_reglement_effectif,
            'timbre_statut', NEW.timbre_statut,
            'montant_timbre_saisi_centimes', NEW.montant_timbre_saisi_centimes,
            'timbre_traite_le', NEW.timbre_traite_le,
            'timbre_traite_par', NEW.timbre_traite_par,
            'reference_timbre_ou_quittance', NEW.reference_timbre_ou_quittance,
            'commentaire_timbre', NEW.commentaire_timbre,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_encaissements_audit_update AFTER UPDATE ON encaissements
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('encaissements', 'UPDATE', NEW.id,
        json_object(
            'facture_id', OLD.facture_id, 'numero', OLD.numero,
            'montant_encaisse_centimes', OLD.montant_encaisse_centimes,
            'date_encaissement', OLD.date_encaissement,
            'mode_reglement_effectif', OLD.mode_reglement_effectif,
            'timbre_statut', OLD.timbre_statut,
            'montant_timbre_saisi_centimes', OLD.montant_timbre_saisi_centimes,
            'timbre_traite_le', OLD.timbre_traite_le,
            'timbre_traite_par', OLD.timbre_traite_par,
            'reference_timbre_ou_quittance', OLD.reference_timbre_ou_quittance,
            'commentaire_timbre', OLD.commentaire_timbre,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        json_object(
            'facture_id', NEW.facture_id, 'numero', NEW.numero,
            'montant_encaisse_centimes', NEW.montant_encaisse_centimes,
            'date_encaissement', NEW.date_encaissement,
            'mode_reglement_effectif', NEW.mode_reglement_effectif,
            'timbre_statut', NEW.timbre_statut,
            'montant_timbre_saisi_centimes', NEW.montant_timbre_saisi_centimes,
            'timbre_traite_le', NEW.timbre_traite_le,
            'timbre_traite_par', NEW.timbre_traite_par,
            'reference_timbre_ou_quittance', NEW.reference_timbre_ou_quittance,
            'commentaire_timbre', NEW.commentaire_timbre,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_encaissements_audit_delete AFTER DELETE ON encaissements
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('encaissements', 'DELETE', OLD.id,
        json_object(
            'facture_id', OLD.facture_id, 'numero', OLD.numero,
            'montant_encaisse_centimes', OLD.montant_encaisse_centimes,
            'date_encaissement', OLD.date_encaissement,
            'mode_reglement_effectif', OLD.mode_reglement_effectif,
            'timbre_statut', OLD.timbre_statut,
            'montant_timbre_saisi_centimes', OLD.montant_timbre_saisi_centimes,
            'timbre_traite_le', OLD.timbre_traite_le,
            'timbre_traite_par', OLD.timbre_traite_par,
            'reference_timbre_ou_quittance', OLD.reference_timbre_ou_quittance,
            'commentaire_timbre', OLD.commentaire_timbre,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        NULL);
END;
