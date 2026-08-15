-- =============================================================================
-- EGTO — Gestion Commerciale (Oran, filiale GITRA)
-- electron/db/migrations/003_ajustement-arrondi-lignes.sql — Migration 3
--
-- Contexte (décision validée le 15/08/2026, §4.4.5bis, §16.10) :
--   L'écart d'arrondi (≤ 2 centimes, positif ou négatif) entre la somme des
--   rabais de lignes et le rabais théorique sur le total est matérialisé :
--     1. Marchés publics : appliqué à la ligne éligible de montant le plus
--        élevé, AVEC trace dans le journal d'audit (motif « ajustement
--        d'arrondi rabais marché »).
--     2. Documents privés : ligne `AJUSTEMENT_ARRONDI` OPTIONNELLE, tracée.
--   La migration 1 étant verrouillée, les colonnes manquantes sont ajoutées
--   ici en ALTER (la migration 1 n'est pas modifiée).
--
-- Contenu :
--   1. `lignes_facture.type_ligne` — NULL (ligne normale) ou
--      'AJUSTEMENT_ARRONDI' (documents privés uniquement, optionnelle).
--   2. `journal_audit.motif` / `journal_audit.ecart_centimes` — traçage de
--      l'écart d'arrondi : ligne cible (= ligne_id), ancien montant
--      (= ancien_etat), nouvel écart (= ecart_centimes), motif.
--   3. Table `contexte_audit` (une seule ligne, id = 1) : le dépôt remplit
--      motif / ecart_centimes dans sa transaction avant l'INSERT/UPDATE de
--      ligne ; les triggers d'audit les lisent pour peupler journal_audit.
--      Le dépôt n'écrit JAMAIS directement dans journal_audit.
--   4. Triggers d'audit `lignes_facture` (INSERT/UPDATE/DELETE), même pattern
--      que le schéma J0 et la migration 2. Le SELECT sur contexte_audit
--      retourne NULL si vide : les lignes normales restent auditées sans
--      motif ni écart, les triggers ne cassent aucun INSERT/UPDATE/DELETE.
--
-- Conventions identiques : montants en centimes (INTEGER), audit par
-- triggers SQLite uniquement, nommage 100 % français.
--
-- Réversibilité : migration NON réversible (ALTER TABLE ADD COLUMN). Protégée
-- par le runner (user_version 2 → 3) — elle n'est exécutée qu'une seule fois.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. lignes_facture — type de ligne (écart d'arrondi, documents privés)
--    NULL = ligne normale ; seul 'AJUSTEMENT_ARRONDI' est autorisé (PRD
--    §4.4.5bis, dictionnaire l.397). Le montant net de la ligne
--    AJUSTEMENT_ARRONDI = l'écart absorbé.
-- ---------------------------------------------------------------------------
ALTER TABLE lignes_facture
    ADD COLUMN type_ligne TEXT
    CHECK (type_ligne IS NULL OR type_ligne = 'AJUSTEMENT_ARRONDI');

-- ---------------------------------------------------------------------------
-- 2. journal_audit — traçage de la matérialisation de l'écart d'arrondi
--    motif (texte, ex. « ajustement d'arrondi rabais marché ») et
--    ecart_centimes (montant de l'écart en centimes). Les triggers
--    existants (J0, migration 2) laissent ces colonnes à NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE journal_audit ADD COLUMN motif TEXT;
ALTER TABLE journal_audit ADD COLUMN ecart_centimes INTEGER;

-- ---------------------------------------------------------------------------
-- 3. contexte_audit — contexte fourni par le dépôt pour alimenter l'audit.
--    Table à UNE seule ligne (CHECK id = 1). Le dépôt écrit ici, DANS sa
--    transaction, avant l'INSERT/UPDATE de ligne ; les triggers d'audit
--    lisent ce contexte pour peupler motif / ecart_centimes de journal_audit.
-- ---------------------------------------------------------------------------
CREATE TABLE contexte_audit (
    id             INTEGER PRIMARY KEY CHECK (id = 1),
    motif          TEXT,
    ecart_centimes INTEGER
);

-- ---------------------------------------------------------------------------
-- 4. Triggers d'audit — lignes_facture (table sensible, même pattern J0).
--    INSERT : motif = contexte s'il est renseigné, sinon NULL ; ecart =
--    contexte si fourni, sinon net de la ligne (pour une ligne
--    AJUSTEMENT_ARRONDI le net = l'écart), sinon NULL (ligne normale).
--    UPDATE : ecart = nouveau net − ancien net (delta matérialisé) ;
--    motif = contexte sinon NULL.
--    DELETE : ancien_etat complet ; motif = contexte sinon NULL ;
--    ecart_centimes NULL.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_lignes_facture_audit_insert AFTER INSERT ON lignes_facture
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat, motif, ecart_centimes)
    VALUES ('lignes_facture', 'INSERT', NEW.id, NULL,
        json_object(
            'facture_id', NEW.facture_id, 'produit_id', NEW.produit_id,
            'designation', NEW.designation, 'unite', NEW.unite,
            'quantite_milliemes', NEW.quantite_milliemes,
            'pu_ht_centimes', NEW.pu_ht_centimes, 'remise_bps', NEW.remise_bps,
            'montant_ht_brut_centimes', NEW.montant_ht_brut_centimes,
            'montant_ht_remise_centimes', NEW.montant_ht_remise_centimes,
            'rabais_marche_bps', NEW.rabais_marche_bps,
            'montant_rabais_marche_centimes', NEW.montant_rabais_marche_centimes,
            'montant_ht_net_centimes', NEW.montant_ht_net_centimes,
            'type_ligne', NEW.type_ligne,
            'famille_id', NEW.famille_id, 'sous_famille_id', NEW.sous_famille_id,
            'classification', NEW.classification,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ),
        (SELECT motif FROM contexte_audit WHERE id = 1),
        CASE
            WHEN (SELECT motif FROM contexte_audit WHERE id = 1) IS NOT NULL
            THEN COALESCE((SELECT ecart_centimes FROM contexte_audit WHERE id = 1),
                          NEW.montant_ht_net_centimes)
            ELSE NULL
        END);
END;

CREATE TRIGGER trg_lignes_facture_audit_update AFTER UPDATE ON lignes_facture
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat, motif, ecart_centimes)
    VALUES ('lignes_facture', 'UPDATE', NEW.id,
        json_object(
            'facture_id', OLD.facture_id, 'produit_id', OLD.produit_id,
            'designation', OLD.designation, 'unite', OLD.unite,
            'quantite_milliemes', OLD.quantite_milliemes,
            'pu_ht_centimes', OLD.pu_ht_centimes, 'remise_bps', OLD.remise_bps,
            'montant_ht_brut_centimes', OLD.montant_ht_brut_centimes,
            'montant_ht_remise_centimes', OLD.montant_ht_remise_centimes,
            'rabais_marche_bps', OLD.rabais_marche_bps,
            'montant_rabais_marche_centimes', OLD.montant_rabais_marche_centimes,
            'montant_ht_net_centimes', OLD.montant_ht_net_centimes,
            'type_ligne', OLD.type_ligne,
            'famille_id', OLD.famille_id, 'sous_famille_id', OLD.sous_famille_id,
            'classification', OLD.classification,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        json_object(
            'facture_id', NEW.facture_id, 'produit_id', NEW.produit_id,
            'designation', NEW.designation, 'unite', NEW.unite,
            'quantite_milliemes', NEW.quantite_milliemes,
            'pu_ht_centimes', NEW.pu_ht_centimes, 'remise_bps', NEW.remise_bps,
            'montant_ht_brut_centimes', NEW.montant_ht_brut_centimes,
            'montant_ht_remise_centimes', NEW.montant_ht_remise_centimes,
            'rabais_marche_bps', NEW.rabais_marche_bps,
            'montant_rabais_marche_centimes', NEW.montant_rabais_marche_centimes,
            'montant_ht_net_centimes', NEW.montant_ht_net_centimes,
            'type_ligne', NEW.type_ligne,
            'famille_id', NEW.famille_id, 'sous_famille_id', NEW.sous_famille_id,
            'classification', NEW.classification,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ),
        (SELECT motif FROM contexte_audit WHERE id = 1),
        NEW.montant_ht_net_centimes - OLD.montant_ht_net_centimes);
END;

CREATE TRIGGER trg_lignes_facture_audit_delete AFTER DELETE ON lignes_facture
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat, motif, ecart_centimes)
    VALUES ('lignes_facture', 'DELETE', OLD.id,
        json_object(
            'facture_id', OLD.facture_id, 'produit_id', OLD.produit_id,
            'designation', OLD.designation, 'unite', OLD.unite,
            'quantite_milliemes', OLD.quantite_milliemes,
            'pu_ht_centimes', OLD.pu_ht_centimes, 'remise_bps', OLD.remise_bps,
            'montant_ht_brut_centimes', OLD.montant_ht_brut_centimes,
            'montant_ht_remise_centimes', OLD.montant_ht_remise_centimes,
            'rabais_marche_bps', OLD.rabais_marche_bps,
            'montant_rabais_marche_centimes', OLD.montant_rabais_marche_centimes,
            'montant_ht_net_centimes', OLD.montant_ht_net_centimes,
            'type_ligne', OLD.type_ligne,
            'famille_id', OLD.famille_id, 'sous_famille_id', OLD.sous_famille_id,
            'classification', OLD.classification,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        NULL,
        (SELECT motif FROM contexte_audit WHERE id = 1),
        NULL);
END;
