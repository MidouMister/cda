-- =============================================================================
-- EGTO — Gestion Commerciale (Oran, filiale GITRA)
-- electron/db/schema.sql — Schéma Jalon 0 (verrouillé)
--
-- Source : docs/erd.md et docs/dictionnaire-donnees.md (J0)
-- Conventions :
--   * Montants en centimes (INTEGER), taux en points de base (_bps),
--     quantités en millièmes (_milliemes). Aucune colonne REAL.
--   * Dates métier en TEXT 'AAAA-MM-JJ' ; horodatages en TEXT datetime('now').
--   * Suppression logique via supprime_le — jamais de DELETE en application.
--   * Colonnes transversales : id, cree_le, modifie_le, supprime_le.
--     statut seulement sur les tables où il a une valeur métier (décision J0).
--   * Audit par triggers SQLite uniquement (journal_audit).
-- =============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- 1. familles — Familles de produits (4) — PRD §4.3.1
-- ---------------------------------------------------------------------------
CREATE TABLE familles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le  TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le TEXT,
    statut      TEXT NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF','INACTIF')),
    code        TEXT NOT NULL UNIQUE CHECK (code IN ('VTE','LOC','REA','ST')),
    libelle     TEXT NOT NULL,
    ordre       INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 2. sous_familles — Sous-familles des produits — PRD §4.3.2, §4.1.8
-- ---------------------------------------------------------------------------
CREATE TABLE sous_familles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le  TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le TEXT,
    famille_id  INTEGER NOT NULL REFERENCES familles(id),
    code        TEXT NOT NULL UNIQUE,
    libelle     TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- 3. classifications — Sous-famille → Noir / Blanc / Autre — PRD §4.1.8, §4.3.4
--    La valeur est figée en snapshot sur chaque ligne au moment de la saisie.
-- ---------------------------------------------------------------------------
CREATE TABLE classifications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le        TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le     TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le    TEXT,
    sous_famille_id INTEGER NOT NULL UNIQUE REFERENCES sous_familles(id),
    categorie      TEXT NOT NULL CHECK (categorie IN ('NOIR','BLANC','AUTRE'))
);

-- ---------------------------------------------------------------------------
-- 4. clients — Fiche client — PRD §4.2.1
-- ---------------------------------------------------------------------------
CREATE TABLE clients (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le               TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le            TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le           TEXT,
    statut                TEXT NOT NULL DEFAULT 'PROSPECT'
                          CHECK (statut IN ('PROSPECT','ACTIF','INACTIF','EN_VIGILANCE','ARCHIVE')),
    code_client           TEXT NOT NULL UNIQUE,
    type_client           TEXT NOT NULL
                          CHECK (type_client IN ('EPE_SPA','SARL','EURL','ETP','ETBH','PARTICULIER')),
    raison_sociale        TEXT NOT NULL,
    sigle                 TEXT,
    categorie             TEXT NOT NULL CHECK (categorie IN ('PUBLIC','PRIVE')),
    secteur               TEXT CHECK (secteur IN ('BTP','ENERGIE','PORTUAIRE','HYDRAULIQUE','VRD','AUTRE')),
    client_groupe         INTEGER NOT NULL DEFAULT 0 CHECK (client_groupe IN (0,1)),
    nom_groupe            TEXT,
    responsable_commercial TEXT,
    contentieux_declare   INTEGER NOT NULL DEFAULT 0 CHECK (contentieux_declare IN (0,1)),
    adresse               TEXT,
    wilaya                TEXT,
    commune               TEXT,
    tel_fixe              TEXT,
    tel_mobile            TEXT,
    fax                   TEXT,
    email                 TEXT,
    adresse_chantier      TEXT,
    nif                   TEXT,
    nis                   TEXT,
    rc                    TEXT,
    ai                    TEXT,
    rib                   TEXT,
    banque                TEXT,
    agence                TEXT,
    mode_reglement_prefere TEXT CHECK (mode_reglement_prefere IN ('VIREMENT','CHEQUE','ESPECES','TRAITE','LCN')),
    delai_paiement_jours  INTEGER,
    plafond_credit_centimes INTEGER,
    score_client          TEXT CHECK (score_client IN ('A','B','C','D')),
    derniere_evaluation_score_le TEXT,
    CHECK (client_groupe = 0 OR (nom_groupe IS NOT NULL AND nom_groupe <> ''))
);

CREATE UNIQUE INDEX ux_clients_nif
    ON clients (nif)
    WHERE nif IS NOT NULL
      AND type_client <> 'PARTICULIER'
      AND supprime_le IS NULL;

-- ---------------------------------------------------------------------------
-- 5. contacts — Contacts client — PRD §4.2.2
-- ---------------------------------------------------------------------------
CREATE TABLE contacts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le         TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le      TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le     TEXT,
    client_id       INTEGER NOT NULL REFERENCES clients(id),
    nom             TEXT NOT NULL,
    fonction        TEXT,
    telephone       TEXT,
    email           TEXT,
    contact_principal INTEGER NOT NULL DEFAULT 0 CHECK (contact_principal IN (0,1))
);

-- ---------------------------------------------------------------------------
-- 6. interactions — Historique d'interactions — PRD §4.2.3
-- ---------------------------------------------------------------------------
CREATE TABLE interactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le         TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le      TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le     TEXT,
    client_id       INTEGER NOT NULL REFERENCES clients(id),
    date_interaction TEXT NOT NULL,
    type_interaction TEXT NOT NULL CHECK (type_interaction IN ('APPEL','VISITE','RELANCE','AUTRE')),
    note            TEXT
);

-- ---------------------------------------------------------------------------
-- 7. produits — Catalogue — PRD §4.3.2 (TVA 19 % verrouillée, pas de colonne)
-- ---------------------------------------------------------------------------
CREATE TABLE produits (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le            TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le         TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le        TEXT,
    code_produit       TEXT NOT NULL UNIQUE,
    libelle            TEXT NOT NULL,
    famille_id         INTEGER NOT NULL REFERENCES familles(id),
    sous_famille_id    INTEGER REFERENCES sous_familles(id),
    unite              TEXT NOT NULL DEFAULT 'U'
                       CHECK (unite IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')),
    pu_reference_centimes INTEGER NOT NULL DEFAULT 0,
    type_tarification  TEXT NOT NULL DEFAULT 'FIXE'
                       CHECK (type_tarification IN ('FIXE','PAR_CLIENT','PAR_AFFAIRE','FORFAIT')),
    actif              INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1))
);

-- ---------------------------------------------------------------------------
-- 8. exercices — Exercices & périodes — PRD §4.7.4
-- ---------------------------------------------------------------------------
CREATE TABLE exercices (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le  TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le TEXT,
    statut      TEXT NOT NULL DEFAULT 'OUVERT' CHECK (statut IN ('OUVERT','CLOTURE')),
    annee       INTEGER NOT NULL UNIQUE,
    date_debut  TEXT NOT NULL,
    date_fin    TEXT NOT NULL,
    cloture_le  TEXT
);

-- ---------------------------------------------------------------------------
-- 9. affaires — Fiche affaire — PRD §4.1.3 à §4.1.5, §4.1.12
-- ---------------------------------------------------------------------------
CREATE TABLE affaires (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                   TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le                TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le               TEXT,
    statut                    TEXT NOT NULL DEFAULT 'SIGNE'
                              CHECK (statut IN ('SIGNE','ODS_RECU','EN_COURS','FACTURE','SOLDE','ARCHIVE','RESILIE')),
    reference                 TEXT NOT NULL UNIQUE,
    type_affaire              TEXT NOT NULL
                              CHECK (type_affaire IN ('MARCHE_PUBLIC','CONTRAT_PRIVE','BC','AVENANT')),
    affaire_mere_id           INTEGER REFERENCES affaires(id),
    client_id                 INTEGER NOT NULL REFERENCES clients(id),
    objet                     TEXT,
    montant_initial_ht_centimes INTEGER NOT NULL DEFAULT 0,
    taux_tva_bps              INTEGER NOT NULL DEFAULT 1900,
    date_signature            TEXT,
    date_notification         TEXT,
    numero_ods                TEXT,
    date_ods                  TEXT,
    date_demarrage_effectif   TEXT,
    delai_execution_jours     INTEGER,
    date_fin_contractuelle    TEXT,
    date_fin_revisee          TEXT,
    date_fin_reelle           TEXT,
    motif_depassement         TEXT CHECK (motif_depassement IN ('FORCE_MAJEURE','AVENANT','RETARD_CLIENT','RETARD_APPRO','AUTRE')),
    rabais_global_bps         INTEGER NOT NULL DEFAULT 0,
    responsable               TEXT,
    numero_marche             TEXT,
    service_contractant       TEXT,
    type_procedure            TEXT CHECK (type_procedure IN ('AO_OUVERT','AO_RESTREINT','CONSULTATION','GRE_A_GRE')),
    avance_forfaitaire_bps    INTEGER,
    avance_approvisionnement_bps INTEGER,
    retenue_garantie_bps      INTEGER NOT NULL DEFAULT 500,
    delai_garantie_mois       INTEGER,
    type_revision             TEXT CHECK (type_revision IN ('FERME','REVISABLE')),
    formule_revision          TEXT,
    penalite_retard_taux_bps  INTEGER,
    penalite_retard_base_centimes INTEGER,
    penalite_retard_plafond_bps INTEGER,
    date_decompte_provisoire  TEXT,
    date_decompte_definitif   TEXT,
    numero_contrat            TEXT,
    modalites_paiement        TEXT,
    avance_contractuelle_centimes INTEGER,
    motif_resiliation         TEXT,
    date_resiliation          TEXT,
    decompte_resiliation_centimes INTEGER,
    sort_cautions             TEXT CHECK (sort_cautions IN ('A_RESTITUER','RETENUE')),
    sort_retenue_garantie     TEXT CHECK (sort_retenue_garantie IN ('A_RESTITUER','RETENUE')),
    CHECK (type_affaire <> 'AVENANT' OR affaire_mere_id IS NOT NULL)
);

-- ---------------------------------------------------------------------------
-- 10. evenements_delais — Suivi des délais & suspensions — PRD §4.1.7
-- ---------------------------------------------------------------------------
CREATE TABLE evenements_delais (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le           TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le        TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le       TEXT,
    affaire_id        INTEGER NOT NULL REFERENCES affaires(id),
    type_evenement    TEXT NOT NULL CHECK (type_evenement IN ('ODS','SUSPENSION','REPRISE','PROROGATION')),
    date_debut        TEXT,
    date_fin          TEXT,
    duree_jours       INTEGER,
    motif             TEXT,
    impact_delai_jours INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 11. avenants — Avenants d'affaire — PRD §4.1.9
-- ---------------------------------------------------------------------------
CREATE TABLE avenants (
    id                         INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                    TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le                 TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le                TEXT,
    statut                     TEXT NOT NULL DEFAULT 'BROUILLON'
                               CHECK (statut IN ('BROUILLON','VALIDE')),
    numero                     TEXT NOT NULL UNIQUE,
    affaire_id                 INTEGER NOT NULL REFERENCES affaires(id),
    objet                      TEXT,
    date_avenant               TEXT,
    impact_delai_jours         INTEGER NOT NULL DEFAULT 0,
    impact_montant_ht_centimes INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 12. avenants_postes — Impact DQE détaillé de l'avenant — PRD §4.1.9
-- ---------------------------------------------------------------------------
CREATE TABLE avenants_postes (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le           TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le        TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le       TEXT,
    avenant_id        INTEGER NOT NULL REFERENCES avenants(id),
    action            TEXT NOT NULL CHECK (action IN ('AJOUT','MODIFICATION','SUPPRESSION')),
    poste_dqe_id      INTEGER REFERENCES postes_dqe(id),
    designation       TEXT,
    unite             TEXT CHECK (unite IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')),
    quantite_milliemes INTEGER,
    pu_ht_centimes    INTEGER
);

-- ---------------------------------------------------------------------------
-- 13. postes_dqe — DQE de l'affaire — PRD §4.1.6, §4.1.10
-- ---------------------------------------------------------------------------
CREATE TABLE postes_dqe (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le             TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le          TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le         TEXT,
    affaire_id          INTEGER NOT NULL REFERENCES affaires(id),
    numero              INTEGER NOT NULL,
    designation         TEXT NOT NULL,
    unite               TEXT CHECK (unite IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')),
    quantite_milliemes  INTEGER NOT NULL DEFAULT 0,
    pu_ht_centimes      INTEGER NOT NULL DEFAULT 0,
    montant_ht_centimes INTEGER NOT NULL DEFAULT 0,
    famille_id          INTEGER REFERENCES familles(id),
    sous_famille_id     INTEGER REFERENCES sous_familles(id),
    classification      TEXT CHECK (classification IN ('NOIR','BLANC','AUTRE')),
    origine             TEXT NOT NULL DEFAULT 'MANUEL'
                        CHECK (origine IN ('DEVIS','IMPORT','AVENANT','MANUEL')),
    ligne_devis_id      INTEGER REFERENCES lignes_devis(id)
);

CREATE UNIQUE INDEX ux_postes_dqe_affaire_numero
    ON postes_dqe (affaire_id, numero)
    WHERE supprime_le IS NULL;

-- ---------------------------------------------------------------------------
-- 14. attachements — Attachements d'affaire — PRD §4.1.13bis
-- ---------------------------------------------------------------------------
CREATE TABLE attachements (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le           TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le        TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le       TEXT,
    statut            TEXT NOT NULL DEFAULT 'BROUILLON'
                      CHECK (statut IN ('BROUILLON','SIGNE','REPORTE_DECLARATION')),
    numero_attachement TEXT NOT NULL UNIQUE,
    affaire_id        INTEGER NOT NULL REFERENCES affaires(id),
    date_attachement  TEXT NOT NULL,
    etabli_par        TEXT,
    piece_jointe      TEXT
);

-- ---------------------------------------------------------------------------
-- 15. attachements_postes — Postes concernés par un attachement — PRD §4.1.13bis
-- ---------------------------------------------------------------------------
CREATE TABLE attachements_postes (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                  TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le               TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le              TEXT,
    attachement_id           INTEGER NOT NULL REFERENCES attachements(id),
    poste_dqe_id             INTEGER NOT NULL REFERENCES postes_dqe(id),
    quantite_constatee_milliemes INTEGER NOT NULL DEFAULT 0,
    UNIQUE (attachement_id, poste_dqe_id)
);

-- ---------------------------------------------------------------------------
-- 16. receptions — Réceptions (lots/tranches) — PRD §4.1.7bis
-- ---------------------------------------------------------------------------
CREATE TABLE receptions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                 TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le              TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le             TEXT,
    affaire_id              INTEGER NOT NULL REFERENCES affaires(id),
    lot_tranche             TEXT NOT NULL DEFAULT 'Global',
    type_reception          TEXT NOT NULL CHECK (type_reception IN ('PROVISOIRE','DEFINITIVE')),
    date_reception          TEXT NOT NULL,
    numero_pv               TEXT,
    montant_concerne_centimes INTEGER
);

-- ---------------------------------------------------------------------------
-- 17. correspondances — Courriers avec le MO — PRD §4.1.11
-- ---------------------------------------------------------------------------
CREATE TABLE correspondances (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le            TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le         TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le        TEXT,
    affaire_id         INTEGER NOT NULL REFERENCES affaires(id),
    date_correspondance TEXT NOT NULL,
    type_correspondance TEXT NOT NULL
                       CHECK (type_correspondance IN ('COURRIER_SORTANT','COURRIER_ENTRANT',
                                                       'DEMANDE_PROROGATION','RECLAMATION',
                                                       'MISE_EN_DEMEURE','AUTRE')),
    objet              TEXT,
    reference          TEXT,
    piece_jointe       TEXT
);

-- ---------------------------------------------------------------------------
-- 18. devis — Devis / Proforma — PRD §4.9.2, §4.9.3
-- ---------------------------------------------------------------------------
CREATE TABLE devis (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le       TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le    TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le   TEXT,
    statut        TEXT NOT NULL DEFAULT 'BROUILLON'
                  CHECK (statut IN ('BROUILLON','ENVOYE','ACCEPTE','REFUSE','EXPIRE')),
    numero_devis  TEXT NOT NULL UNIQUE,
    client_id     INTEGER NOT NULL REFERENCES clients(id),
    date_devis    TEXT NOT NULL,
    date_validite TEXT,
    rabais_global_bps INTEGER NOT NULL DEFAULT 0,
    affaire_id    INTEGER REFERENCES affaires(id),
    exercice_id   INTEGER REFERENCES exercices(id)
);

-- ---------------------------------------------------------------------------
-- 19. lignes_devis — Lignes de devis — PRD §4.9.2
-- ---------------------------------------------------------------------------
CREATE TABLE lignes_devis (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le            TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le         TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le        TEXT,
    devis_id           INTEGER NOT NULL REFERENCES devis(id),
    produit_id         INTEGER REFERENCES produits(id),
    designation        TEXT NOT NULL,
    unite              TEXT CHECK (unite IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')),
    quantite_milliemes INTEGER NOT NULL DEFAULT 0,
    pu_ht_centimes     INTEGER NOT NULL DEFAULT 0,
    montant_ht_centimes INTEGER NOT NULL DEFAULT 0,
    famille_id         INTEGER REFERENCES familles(id),
    sous_famille_id    INTEGER REFERENCES sous_familles(id)
);

-- ---------------------------------------------------------------------------
-- 20. factures — Documents de facturation — PRD §4.4.2 à §4.4.6, §4.4.12
-- ---------------------------------------------------------------------------
CREATE TABLE factures (
    id                         INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                    TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le                 TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le                TEXT,
    statut                     TEXT NOT NULL DEFAULT 'BROUILLON'
                               CHECK (statut IN ('BROUILLON','VALIDE','IMPRIMEE','ENVOYEE','PAYEE','ARCHIVEE')),
    type_document              TEXT NOT NULL
                               CHECK (type_document IN ('FA','AC','AV','FS','ND')),
    numero                     TEXT,
    date_facture               TEXT NOT NULL,
    date_echeance              TEXT,
    affaire_id                 INTEGER REFERENCES affaires(id),
    client_id                  INTEGER NOT NULL REFERENCES clients(id),
    adresse_facturation        TEXT,
    adresse_facturation_type   TEXT CHECK (adresse_facturation_type IN ('SIEGE','CHANTIER')),
    nif_client                 TEXT,
    numero_bc_client           TEXT,
    rabais_global_bps          INTEGER NOT NULL DEFAULT 0,
    retenue_garantie_bps       INTEGER NOT NULL DEFAULT 0,
    remboursement_avance_centimes INTEGER NOT NULL DEFAULT 0,
    mode_reglement_prevu       TEXT CHECK (mode_reglement_prevu IN ('VIREMENT','CHEQUE','ESPECES','TRAITE','LCN')),
    mode_reglement_effectif    TEXT CHECK (mode_reglement_effectif IN ('VIREMENT','CHEQUE','ESPECES','TRAITE','LCN')),
    total_ht_lignes_centimes   INTEGER NOT NULL DEFAULT 0,
    total_remises_centimes     INTEGER NOT NULL DEFAULT 0,
    net_commercial_ht_centimes INTEGER NOT NULL DEFAULT 0,
    retenue_garantie_centimes  INTEGER NOT NULL DEFAULT 0,
    total_ht_centimes          INTEGER NOT NULL DEFAULT 0,
    total_tva_centimes         INTEGER NOT NULL DEFAULT 0,
    total_ttc_centimes         INTEGER NOT NULL DEFAULT 0,
    droit_timbre_centimes      INTEGER NOT NULL DEFAULT 0,
    interets_moratoires_centimes INTEGER NOT NULL DEFAULT 0,
    net_a_payer_centimes       INTEGER NOT NULL DEFAULT 0,
    facture_origine_id         INTEGER REFERENCES factures(id),
    motif_avoir                TEXT,
    date_validation            TEXT,
    nombre_impressions         INTEGER NOT NULL DEFAULT 0,
    exercice_id                INTEGER REFERENCES exercices(id)
);

CREATE UNIQUE INDEX ux_factures_numero
    ON factures (numero)
    WHERE numero IS NOT NULL
      AND supprime_le IS NULL;

-- ---------------------------------------------------------------------------
-- 21. lignes_facture — Lignes de facture — PRD §4.4.5, §4.4.6
-- ---------------------------------------------------------------------------
CREATE TABLE lignes_facture (
    id                         INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le                    TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le                 TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le                TEXT,
    facture_id                 INTEGER NOT NULL REFERENCES factures(id),
    produit_id                 INTEGER REFERENCES produits(id),
    designation                TEXT NOT NULL,
    unite                      TEXT CHECK (unite IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')),
    quantite_milliemes         INTEGER NOT NULL DEFAULT 0,
    pu_ht_centimes             INTEGER NOT NULL DEFAULT 0,
    remise_bps                 INTEGER NOT NULL DEFAULT 0,
    montant_ht_brut_centimes   INTEGER NOT NULL DEFAULT 0,
    montant_ht_remise_centimes INTEGER NOT NULL DEFAULT 0,
    famille_id                 INTEGER REFERENCES familles(id),
    sous_famille_id            INTEGER REFERENCES sous_familles(id),
    classification             TEXT CHECK (classification IN ('NOIR','BLANC','AUTRE'))
);

-- ---------------------------------------------------------------------------
-- 22. bons_livraison — Bons de livraison (activité VENTES) — PRD §4.4.11
-- ---------------------------------------------------------------------------
CREATE TABLE bons_livraison (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le         TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le      TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le     TEXT,
    statut          TEXT NOT NULL DEFAULT 'EMIS' CHECK (statut IN ('EMIS','FACTURE')),
    numero_bl       TEXT NOT NULL UNIQUE,
    date_livraison  TEXT NOT NULL,
    affaire_id      INTEGER REFERENCES affaires(id),
    client_id       INTEGER NOT NULL REFERENCES clients(id),
    poids_pesee_kg  INTEGER,
    signature_client INTEGER NOT NULL DEFAULT 0 CHECK (signature_client IN (0,1)),
    facture_id      INTEGER REFERENCES factures(id),
    exercice_id     INTEGER REFERENCES exercices(id)
);

-- ---------------------------------------------------------------------------
-- 23. lignes_bon_livraison — Lignes de BL — PRD §4.4.11
-- ---------------------------------------------------------------------------
CREATE TABLE lignes_bon_livraison (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le            TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le         TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le        TEXT,
    bon_livraison_id   INTEGER NOT NULL REFERENCES bons_livraison(id),
    produit_id         INTEGER REFERENCES produits(id),
    designation        TEXT NOT NULL,
    unite              TEXT CHECK (unite IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')),
    quantite_milliemes INTEGER NOT NULL DEFAULT 0,
    pu_ht_centimes     INTEGER NOT NULL DEFAULT 0,
    montant_ht_centimes INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 24. tarifs_historique — Tarifs à trois niveaux — PRD §4.3.3
-- ---------------------------------------------------------------------------
CREATE TABLE tarifs_historique (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le       TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le    TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le   TEXT,
    produit_id    INTEGER NOT NULL REFERENCES produits(id),
    type_niveau   TEXT NOT NULL CHECK (type_niveau IN ('CATALOGUE','CLIENT','AFFAIRE')),
    client_id     INTEGER REFERENCES clients(id),
    affaire_id    INTEGER REFERENCES affaires(id),
    prix_centimes INTEGER NOT NULL,
    debut_periode TEXT NOT NULL,
    fin_periode   TEXT,
    CHECK (
        (type_niveau = 'CATALOGUE' AND client_id IS NULL AND affaire_id IS NULL) OR
        (type_niveau = 'CLIENT'    AND client_id IS NOT NULL AND affaire_id IS NULL) OR
        (type_niveau = 'AFFAIRE'   AND client_id IS NULL AND affaire_id IS NOT NULL)
    ),
    CHECK (fin_periode IS NULL OR fin_periode >= debut_periode)
);

-- ---------------------------------------------------------------------------
-- 25. parametres — Paramètres entreprise & divers — PRD §4.7.3, §4.7.5, §4.7.6
-- ---------------------------------------------------------------------------
CREATE TABLE parametres (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le  TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le TEXT,
    cle         TEXT NOT NULL UNIQUE,
    valeur      TEXT NOT NULL,
    description TEXT
);

-- ---------------------------------------------------------------------------
-- 26. compteurs_numerotation — Compteurs par document et année — PRD §4.7.5, §4.4.2
--     COALESCE(affaire_id, 0) : SQLite traite les NULL comme distincts dans un
--     index UNIQUE, l'expression garantit un seul compteur par document+année.
-- ---------------------------------------------------------------------------
CREATE TABLE compteurs_numerotation (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le       TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le    TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le   TEXT,
    code_document TEXT NOT NULL,
    annee         INTEGER NOT NULL,
    affaire_id    INTEGER REFERENCES affaires(id),
    dernier_numero INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX ux_compteurs_numerotation
    ON compteurs_numerotation (code_document, annee, COALESCE(affaire_id, 0))
    WHERE supprime_le IS NULL;

-- ---------------------------------------------------------------------------
-- 27. bareme_timbre — Barème du droit de timbre — PRD §4.7.3, §7.1
-- ---------------------------------------------------------------------------
CREATE TABLE bareme_timbre (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    cree_le              TEXT NOT NULL DEFAULT (datetime('now')),
    modifie_le           TEXT NOT NULL DEFAULT (datetime('now')),
    supprime_le          TEXT,
    borne_min_ttc_centimes INTEGER NOT NULL DEFAULT 0,
    borne_max_ttc_centimes INTEGER,
    taux_bps             INTEGER NOT NULL,
    plancher_centimes    INTEGER NOT NULL DEFAULT 500,
    plafond_centimes     INTEGER NOT NULL DEFAULT 1000000,
    actif                INTEGER NOT NULL DEFAULT 1 CHECK (actif IN (0,1)),
    CHECK (borne_max_ttc_centimes IS NULL OR borne_max_ttc_centimes > borne_min_ttc_centimes)
);

-- ---------------------------------------------------------------------------
-- 28. journal_audit — Journal d'audit (triggers uniquement) — PRD §4.7.8
--     Lecture seule en application. Auteur fixe 'egto' (mono-utilisateur).
-- ---------------------------------------------------------------------------
CREATE TABLE journal_audit (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    table_affectee TEXT NOT NULL,
    action        TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    ligne_id      INTEGER,
    ancien_etat   TEXT,
    nouvel_etat   TEXT,
    auteur        TEXT NOT NULL DEFAULT 'egto',
    date_action   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- 29. migrations_history — Historique des migrations — plan-mvp J1/M3
-- ---------------------------------------------------------------------------
CREATE TABLE migrations_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    version     INTEGER NOT NULL UNIQUE,
    nom         TEXT NOT NULL,
    appliquee_le TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===========================================================================
-- TRIGGERS D'AUDIT — tables sensibles MVP : clients, affaires, avenants,
-- devis, factures, bons_livraison (décision J0 §2.6).
-- ===========================================================================

CREATE TRIGGER trg_clients_audit_insert AFTER INSERT ON clients
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('clients', 'INSERT', NEW.id, NULL,
        json_object(
            'statut', NEW.statut, 'code_client', NEW.code_client, 'type_client', NEW.type_client,
            'raison_sociale', NEW.raison_sociale, 'sigle', NEW.sigle, 'categorie', NEW.categorie,
            'secteur', NEW.secteur, 'client_groupe', NEW.client_groupe, 'nom_groupe', NEW.nom_groupe,
            'responsable_commercial', NEW.responsable_commercial, 'contentieux_declare', NEW.contentieux_declare,
            'adresse', NEW.adresse, 'wilaya', NEW.wilaya, 'commune', NEW.commune,
            'tel_fixe', NEW.tel_fixe, 'tel_mobile', NEW.tel_mobile, 'fax', NEW.fax, 'email', NEW.email,
            'adresse_chantier', NEW.adresse_chantier, 'nif', NEW.nif, 'nis', NEW.nis,
            'rc', NEW.rc, 'ai', NEW.ai, 'rib', NEW.rib, 'banque', NEW.banque, 'agence', NEW.agence,
            'mode_reglement_prefere', NEW.mode_reglement_prefere, 'delai_paiement_jours', NEW.delai_paiement_jours,
            'plafond_credit_centimes', NEW.plafond_credit_centimes, 'score_client', NEW.score_client,
            'derniere_evaluation_score_le', NEW.derniere_evaluation_score_le,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_clients_audit_update AFTER UPDATE ON clients
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('clients', 'UPDATE', NEW.id,
        json_object(
            'statut', OLD.statut, 'code_client', OLD.code_client, 'type_client', OLD.type_client,
            'raison_sociale', OLD.raison_sociale, 'sigle', OLD.sigle, 'categorie', OLD.categorie,
            'secteur', OLD.secteur, 'client_groupe', OLD.client_groupe, 'nom_groupe', OLD.nom_groupe,
            'responsable_commercial', OLD.responsable_commercial, 'contentieux_declare', OLD.contentieux_declare,
            'adresse', OLD.adresse, 'wilaya', OLD.wilaya, 'commune', OLD.commune,
            'tel_fixe', OLD.tel_fixe, 'tel_mobile', OLD.tel_mobile, 'fax', OLD.fax, 'email', OLD.email,
            'adresse_chantier', OLD.adresse_chantier, 'nif', OLD.nif, 'nis', OLD.nis,
            'rc', OLD.rc, 'ai', OLD.ai, 'rib', OLD.rib, 'banque', OLD.banque, 'agence', OLD.agence,
            'mode_reglement_prefere', OLD.mode_reglement_prefere, 'delai_paiement_jours', OLD.delai_paiement_jours,
            'plafond_credit_centimes', OLD.plafond_credit_centimes, 'score_client', OLD.score_client,
            'derniere_evaluation_score_le', OLD.derniere_evaluation_score_le,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        json_object(
            'statut', NEW.statut, 'code_client', NEW.code_client, 'type_client', NEW.type_client,
            'raison_sociale', NEW.raison_sociale, 'sigle', NEW.sigle, 'categorie', NEW.categorie,
            'secteur', NEW.secteur, 'client_groupe', NEW.client_groupe, 'nom_groupe', NEW.nom_groupe,
            'responsable_commercial', NEW.responsable_commercial, 'contentieux_declare', NEW.contentieux_declare,
            'adresse', NEW.adresse, 'wilaya', NEW.wilaya, 'commune', NEW.commune,
            'tel_fixe', NEW.tel_fixe, 'tel_mobile', NEW.tel_mobile, 'fax', NEW.fax, 'email', NEW.email,
            'adresse_chantier', NEW.adresse_chantier, 'nif', NEW.nif, 'nis', NEW.nis,
            'rc', NEW.rc, 'ai', NEW.ai, 'rib', NEW.rib, 'banque', NEW.banque, 'agence', NEW.agence,
            'mode_reglement_prefere', NEW.mode_reglement_prefere, 'delai_paiement_jours', NEW.delai_paiement_jours,
            'plafond_credit_centimes', NEW.plafond_credit_centimes, 'score_client', NEW.score_client,
            'derniere_evaluation_score_le', NEW.derniere_evaluation_score_le,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_clients_audit_delete AFTER DELETE ON clients
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('clients', 'DELETE', OLD.id,
        json_object(
            'statut', OLD.statut, 'code_client', OLD.code_client, 'type_client', OLD.type_client,
            'raison_sociale', OLD.raison_sociale, 'sigle', OLD.sigle, 'categorie', OLD.categorie,
            'secteur', OLD.secteur, 'client_groupe', OLD.client_groupe, 'nom_groupe', OLD.nom_groupe,
            'responsable_commercial', OLD.responsable_commercial, 'contentieux_declare', OLD.contentieux_declare,
            'adresse', OLD.adresse, 'wilaya', OLD.wilaya, 'commune', OLD.commune,
            'tel_fixe', OLD.tel_fixe, 'tel_mobile', OLD.tel_mobile, 'fax', OLD.fax, 'email', OLD.email,
            'adresse_chantier', OLD.adresse_chantier, 'nif', OLD.nif, 'nis', OLD.nis,
            'rc', OLD.rc, 'ai', OLD.ai, 'rib', OLD.rib, 'banque', OLD.banque, 'agence', OLD.agence,
            'mode_reglement_prefere', OLD.mode_reglement_prefere, 'delai_paiement_jours', OLD.delai_paiement_jours,
            'plafond_credit_centimes', OLD.plafond_credit_centimes, 'score_client', OLD.score_client,
            'derniere_evaluation_score_le', OLD.derniere_evaluation_score_le,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ), NULL);
END;

CREATE TRIGGER trg_affaires_audit_insert AFTER INSERT ON affaires
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('affaires', 'INSERT', NEW.id, NULL,
        json_object(
            'statut', NEW.statut, 'reference', NEW.reference, 'type_affaire', NEW.type_affaire,
            'affaire_mere_id', NEW.affaire_mere_id, 'client_id', NEW.client_id, 'objet', NEW.objet,
            'montant_initial_ht_centimes', NEW.montant_initial_ht_centimes, 'taux_tva_bps', NEW.taux_tva_bps,
            'date_signature', NEW.date_signature, 'date_notification', NEW.date_notification,
            'numero_ods', NEW.numero_ods, 'date_ods', NEW.date_ods,
            'date_demarrage_effectif', NEW.date_demarrage_effectif, 'delai_execution_jours', NEW.delai_execution_jours,
            'date_fin_contractuelle', NEW.date_fin_contractuelle, 'date_fin_revisee', NEW.date_fin_revisee,
            'date_fin_reelle', NEW.date_fin_reelle, 'motif_depassement', NEW.motif_depassement,
            'rabais_global_bps', NEW.rabais_global_bps, 'responsable', NEW.responsable,
            'numero_marche', NEW.numero_marche, 'service_contractant', NEW.service_contractant,
            'type_procedure', NEW.type_procedure, 'avance_forfaitaire_bps', NEW.avance_forfaitaire_bps,
            'avance_approvisionnement_bps', NEW.avance_approvisionnement_bps,
            'retenue_garantie_bps', NEW.retenue_garantie_bps, 'delai_garantie_mois', NEW.delai_garantie_mois,
            'type_revision', NEW.type_revision, 'formule_revision', NEW.formule_revision,
            'penalite_retard_taux_bps', NEW.penalite_retard_taux_bps,
            'penalite_retard_base_centimes', NEW.penalite_retard_base_centimes,
            'penalite_retard_plafond_bps', NEW.penalite_retard_plafond_bps,
            'date_decompte_provisoire', NEW.date_decompte_provisoire,
            'date_decompte_definitif', NEW.date_decompte_definitif,
            'numero_contrat', NEW.numero_contrat, 'modalites_paiement', NEW.modalites_paiement,
            'avance_contractuelle_centimes', NEW.avance_contractuelle_centimes,
            'motif_resiliation', NEW.motif_resiliation, 'date_resiliation', NEW.date_resiliation,
            'decompte_resiliation_centimes', NEW.decompte_resiliation_centimes,
            'sort_cautions', NEW.sort_cautions, 'sort_retenue_garantie', NEW.sort_retenue_garantie,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_affaires_audit_update AFTER UPDATE ON affaires
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('affaires', 'UPDATE', NEW.id,
        json_object(
            'statut', OLD.statut, 'reference', OLD.reference, 'type_affaire', OLD.type_affaire,
            'affaire_mere_id', OLD.affaire_mere_id, 'client_id', OLD.client_id, 'objet', OLD.objet,
            'montant_initial_ht_centimes', OLD.montant_initial_ht_centimes, 'taux_tva_bps', OLD.taux_tva_bps,
            'date_signature', OLD.date_signature, 'date_notification', OLD.date_notification,
            'numero_ods', OLD.numero_ods, 'date_ods', OLD.date_ods,
            'date_demarrage_effectif', OLD.date_demarrage_effectif, 'delai_execution_jours', OLD.delai_execution_jours,
            'date_fin_contractuelle', OLD.date_fin_contractuelle, 'date_fin_revisee', OLD.date_fin_revisee,
            'date_fin_reelle', OLD.date_fin_reelle, 'motif_depassement', OLD.motif_depassement,
            'rabais_global_bps', OLD.rabais_global_bps, 'responsable', OLD.responsable,
            'numero_marche', OLD.numero_marche, 'service_contractant', OLD.service_contractant,
            'type_procedure', OLD.type_procedure, 'avance_forfaitaire_bps', OLD.avance_forfaitaire_bps,
            'avance_approvisionnement_bps', OLD.avance_approvisionnement_bps,
            'retenue_garantie_bps', OLD.retenue_garantie_bps, 'delai_garantie_mois', OLD.delai_garantie_mois,
            'type_revision', OLD.type_revision, 'formule_revision', OLD.formule_revision,
            'penalite_retard_taux_bps', OLD.penalite_retard_taux_bps,
            'penalite_retard_base_centimes', OLD.penalite_retard_base_centimes,
            'penalite_retard_plafond_bps', OLD.penalite_retard_plafond_bps,
            'date_decompte_provisoire', OLD.date_decompte_provisoire,
            'date_decompte_definitif', OLD.date_decompte_definitif,
            'numero_contrat', OLD.numero_contrat, 'modalites_paiement', OLD.modalites_paiement,
            'avance_contractuelle_centimes', OLD.avance_contractuelle_centimes,
            'motif_resiliation', OLD.motif_resiliation, 'date_resiliation', OLD.date_resiliation,
            'decompte_resiliation_centimes', OLD.decompte_resiliation_centimes,
            'sort_cautions', OLD.sort_cautions, 'sort_retenue_garantie', OLD.sort_retenue_garantie,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        json_object(
            'statut', NEW.statut, 'reference', NEW.reference, 'type_affaire', NEW.type_affaire,
            'affaire_mere_id', NEW.affaire_mere_id, 'client_id', NEW.client_id, 'objet', NEW.objet,
            'montant_initial_ht_centimes', NEW.montant_initial_ht_centimes, 'taux_tva_bps', NEW.taux_tva_bps,
            'date_signature', NEW.date_signature, 'date_notification', NEW.date_notification,
            'numero_ods', NEW.numero_ods, 'date_ods', NEW.date_ods,
            'date_demarrage_effectif', NEW.date_demarrage_effectif, 'delai_execution_jours', NEW.delai_execution_jours,
            'date_fin_contractuelle', NEW.date_fin_contractuelle, 'date_fin_revisee', NEW.date_fin_revisee,
            'date_fin_reelle', NEW.date_fin_reelle, 'motif_depassement', NEW.motif_depassement,
            'rabais_global_bps', NEW.rabais_global_bps, 'responsable', NEW.responsable,
            'numero_marche', NEW.numero_marche, 'service_contractant', NEW.service_contractant,
            'type_procedure', NEW.type_procedure, 'avance_forfaitaire_bps', NEW.avance_forfaitaire_bps,
            'avance_approvisionnement_bps', NEW.avance_approvisionnement_bps,
            'retenue_garantie_bps', NEW.retenue_garantie_bps, 'delai_garantie_mois', NEW.delai_garantie_mois,
            'type_revision', NEW.type_revision, 'formule_revision', NEW.formule_revision,
            'penalite_retard_taux_bps', NEW.penalite_retard_taux_bps,
            'penalite_retard_base_centimes', NEW.penalite_retard_base_centimes,
            'penalite_retard_plafond_bps', NEW.penalite_retard_plafond_bps,
            'date_decompte_provisoire', NEW.date_decompte_provisoire,
            'date_decompte_definitif', NEW.date_decompte_definitif,
            'numero_contrat', NEW.numero_contrat, 'modalites_paiement', NEW.modalites_paiement,
            'avance_contractuelle_centimes', NEW.avance_contractuelle_centimes,
            'motif_resiliation', NEW.motif_resiliation, 'date_resiliation', NEW.date_resiliation,
            'decompte_resiliation_centimes', NEW.decompte_resiliation_centimes,
            'sort_cautions', NEW.sort_cautions, 'sort_retenue_garantie', NEW.sort_retenue_garantie,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_affaires_audit_delete AFTER DELETE ON affaires
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('affaires', 'DELETE', OLD.id,
        json_object(
            'statut', OLD.statut, 'reference', OLD.reference, 'type_affaire', OLD.type_affaire,
            'affaire_mere_id', OLD.affaire_mere_id, 'client_id', OLD.client_id, 'objet', OLD.objet,
            'montant_initial_ht_centimes', OLD.montant_initial_ht_centimes, 'taux_tva_bps', OLD.taux_tva_bps,
            'date_signature', OLD.date_signature, 'date_notification', OLD.date_notification,
            'numero_ods', OLD.numero_ods, 'date_ods', OLD.date_ods,
            'date_demarrage_effectif', OLD.date_demarrage_effectif, 'delai_execution_jours', OLD.delai_execution_jours,
            'date_fin_contractuelle', OLD.date_fin_contractuelle, 'date_fin_revisee', OLD.date_fin_revisee,
            'date_fin_reelle', OLD.date_fin_reelle, 'motif_depassement', OLD.motif_depassement,
            'rabais_global_bps', OLD.rabais_global_bps, 'responsable', OLD.responsable,
            'numero_marche', OLD.numero_marche, 'service_contractant', OLD.service_contractant,
            'type_procedure', OLD.type_procedure, 'avance_forfaitaire_bps', OLD.avance_forfaitaire_bps,
            'avance_approvisionnement_bps', OLD.avance_approvisionnement_bps,
            'retenue_garantie_bps', OLD.retenue_garantie_bps, 'delai_garantie_mois', OLD.delai_garantie_mois,
            'type_revision', OLD.type_revision, 'formule_revision', OLD.formule_revision,
            'penalite_retard_taux_bps', OLD.penalite_retard_taux_bps,
            'penalite_retard_base_centimes', OLD.penalite_retard_base_centimes,
            'penalite_retard_plafond_bps', OLD.penalite_retard_plafond_bps,
            'date_decompte_provisoire', OLD.date_decompte_provisoire,
            'date_decompte_definitif', OLD.date_decompte_definitif,
            'numero_contrat', OLD.numero_contrat, 'modalites_paiement', OLD.modalites_paiement,
            'avance_contractuelle_centimes', OLD.avance_contractuelle_centimes,
            'motif_resiliation', OLD.motif_resiliation, 'date_resiliation', OLD.date_resiliation,
            'decompte_resiliation_centimes', OLD.decompte_resiliation_centimes,
            'sort_cautions', OLD.sort_cautions, 'sort_retenue_garantie', OLD.sort_retenue_garantie,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ), NULL);
END;

CREATE TRIGGER trg_avenants_audit_insert AFTER INSERT ON avenants
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('avenants', 'INSERT', NEW.id, NULL,
        json_object('statut', NEW.statut, 'numero', NEW.numero, 'affaire_id', NEW.affaire_id,
                    'objet', NEW.objet, 'date_avenant', NEW.date_avenant,
                    'impact_delai_jours', NEW.impact_delai_jours,
                    'impact_montant_ht_centimes', NEW.impact_montant_ht_centimes,
                    'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le));
END;

CREATE TRIGGER trg_avenants_audit_update AFTER UPDATE ON avenants
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('avenants', 'UPDATE', NEW.id,
        json_object('statut', OLD.statut, 'numero', OLD.numero, 'affaire_id', OLD.affaire_id,
                    'objet', OLD.objet, 'date_avenant', OLD.date_avenant,
                    'impact_delai_jours', OLD.impact_delai_jours,
                    'impact_montant_ht_centimes', OLD.impact_montant_ht_centimes,
                    'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le),
        json_object('statut', NEW.statut, 'numero', NEW.numero, 'affaire_id', NEW.affaire_id,
                    'objet', NEW.objet, 'date_avenant', NEW.date_avenant,
                    'impact_delai_jours', NEW.impact_delai_jours,
                    'impact_montant_ht_centimes', NEW.impact_montant_ht_centimes,
                    'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le));
END;

CREATE TRIGGER trg_avenants_audit_delete AFTER DELETE ON avenants
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('avenants', 'DELETE', OLD.id,
        json_object('statut', OLD.statut, 'numero', OLD.numero, 'affaire_id', OLD.affaire_id,
                    'objet', OLD.objet, 'date_avenant', OLD.date_avenant,
                    'impact_delai_jours', OLD.impact_delai_jours,
                    'impact_montant_ht_centimes', OLD.impact_montant_ht_centimes,
                    'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le),
        NULL);
END;

CREATE TRIGGER trg_devis_audit_insert AFTER INSERT ON devis
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('devis', 'INSERT', NEW.id, NULL,
        json_object('statut', NEW.statut, 'numero_devis', NEW.numero_devis, 'client_id', NEW.client_id,
                    'date_devis', NEW.date_devis, 'date_validite', NEW.date_validite,
                    'rabais_global_bps', NEW.rabais_global_bps, 'affaire_id', NEW.affaire_id,
                    'exercice_id', NEW.exercice_id,
                    'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le));
END;

CREATE TRIGGER trg_devis_audit_update AFTER UPDATE ON devis
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('devis', 'UPDATE', NEW.id,
        json_object('statut', OLD.statut, 'numero_devis', OLD.numero_devis, 'client_id', OLD.client_id,
                    'date_devis', OLD.date_devis, 'date_validite', OLD.date_validite,
                    'rabais_global_bps', OLD.rabais_global_bps, 'affaire_id', OLD.affaire_id,
                    'exercice_id', OLD.exercice_id,
                    'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le),
        json_object('statut', NEW.statut, 'numero_devis', NEW.numero_devis, 'client_id', NEW.client_id,
                    'date_devis', NEW.date_devis, 'date_validite', NEW.date_validite,
                    'rabais_global_bps', NEW.rabais_global_bps, 'affaire_id', NEW.affaire_id,
                    'exercice_id', NEW.exercice_id,
                    'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le));
END;

CREATE TRIGGER trg_devis_audit_delete AFTER DELETE ON devis
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('devis', 'DELETE', OLD.id,
        json_object('statut', OLD.statut, 'numero_devis', OLD.numero_devis, 'client_id', OLD.client_id,
                    'date_devis', OLD.date_devis, 'date_validite', OLD.date_validite,
                    'rabais_global_bps', OLD.rabais_global_bps, 'affaire_id', OLD.affaire_id,
                    'exercice_id', OLD.exercice_id,
                    'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le),
        NULL);
END;

CREATE TRIGGER trg_factures_audit_insert AFTER INSERT ON factures
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('factures', 'INSERT', NEW.id, NULL,
        json_object(
            'statut', NEW.statut, 'type_document', NEW.type_document, 'numero', NEW.numero,
            'date_facture', NEW.date_facture, 'date_echeance', NEW.date_echeance,
            'affaire_id', NEW.affaire_id, 'client_id', NEW.client_id,
            'adresse_facturation', NEW.adresse_facturation, 'adresse_facturation_type', NEW.adresse_facturation_type,
            'nif_client', NEW.nif_client, 'numero_bc_client', NEW.numero_bc_client,
            'rabais_global_bps', NEW.rabais_global_bps, 'retenue_garantie_bps', NEW.retenue_garantie_bps,
            'remboursement_avance_centimes', NEW.remboursement_avance_centimes,
            'mode_reglement_prevu', NEW.mode_reglement_prevu, 'mode_reglement_effectif', NEW.mode_reglement_effectif,
            'total_ht_lignes_centimes', NEW.total_ht_lignes_centimes,
            'total_remises_centimes', NEW.total_remises_centimes,
            'net_commercial_ht_centimes', NEW.net_commercial_ht_centimes,
            'retenue_garantie_centimes', NEW.retenue_garantie_centimes,
            'total_ht_centimes', NEW.total_ht_centimes,
            'total_tva_centimes', NEW.total_tva_centimes,
            'total_ttc_centimes', NEW.total_ttc_centimes,
            'droit_timbre_centimes', NEW.droit_timbre_centimes,
            'interets_moratoires_centimes', NEW.interets_moratoires_centimes,
            'net_a_payer_centimes', NEW.net_a_payer_centimes,
            'facture_origine_id', NEW.facture_origine_id, 'motif_avoir', NEW.motif_avoir,
            'date_validation', NEW.date_validation, 'nombre_impressions', NEW.nombre_impressions,
            'exercice_id', NEW.exercice_id,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_factures_audit_update AFTER UPDATE ON factures
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('factures', 'UPDATE', NEW.id,
        json_object(
            'statut', OLD.statut, 'type_document', OLD.type_document, 'numero', OLD.numero,
            'date_facture', OLD.date_facture, 'date_echeance', OLD.date_echeance,
            'affaire_id', OLD.affaire_id, 'client_id', OLD.client_id,
            'adresse_facturation', OLD.adresse_facturation, 'adresse_facturation_type', OLD.adresse_facturation_type,
            'nif_client', OLD.nif_client, 'numero_bc_client', OLD.numero_bc_client,
            'rabais_global_bps', OLD.rabais_global_bps, 'retenue_garantie_bps', OLD.retenue_garantie_bps,
            'remboursement_avance_centimes', OLD.remboursement_avance_centimes,
            'mode_reglement_prevu', OLD.mode_reglement_prevu, 'mode_reglement_effectif', OLD.mode_reglement_effectif,
            'total_ht_lignes_centimes', OLD.total_ht_lignes_centimes,
            'total_remises_centimes', OLD.total_remises_centimes,
            'net_commercial_ht_centimes', OLD.net_commercial_ht_centimes,
            'retenue_garantie_centimes', OLD.retenue_garantie_centimes,
            'total_ht_centimes', OLD.total_ht_centimes,
            'total_tva_centimes', OLD.total_tva_centimes,
            'total_ttc_centimes', OLD.total_ttc_centimes,
            'droit_timbre_centimes', OLD.droit_timbre_centimes,
            'interets_moratoires_centimes', OLD.interets_moratoires_centimes,
            'net_a_payer_centimes', OLD.net_a_payer_centimes,
            'facture_origine_id', OLD.facture_origine_id, 'motif_avoir', OLD.motif_avoir,
            'date_validation', OLD.date_validation, 'nombre_impressions', OLD.nombre_impressions,
            'exercice_id', OLD.exercice_id,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ),
        json_object(
            'statut', NEW.statut, 'type_document', NEW.type_document, 'numero', NEW.numero,
            'date_facture', NEW.date_facture, 'date_echeance', NEW.date_echeance,
            'affaire_id', NEW.affaire_id, 'client_id', NEW.client_id,
            'adresse_facturation', NEW.adresse_facturation, 'adresse_facturation_type', NEW.adresse_facturation_type,
            'nif_client', NEW.nif_client, 'numero_bc_client', NEW.numero_bc_client,
            'rabais_global_bps', NEW.rabais_global_bps, 'retenue_garantie_bps', NEW.retenue_garantie_bps,
            'remboursement_avance_centimes', NEW.remboursement_avance_centimes,
            'mode_reglement_prevu', NEW.mode_reglement_prevu, 'mode_reglement_effectif', NEW.mode_reglement_effectif,
            'total_ht_lignes_centimes', NEW.total_ht_lignes_centimes,
            'total_remises_centimes', NEW.total_remises_centimes,
            'net_commercial_ht_centimes', NEW.net_commercial_ht_centimes,
            'retenue_garantie_centimes', NEW.retenue_garantie_centimes,
            'total_ht_centimes', NEW.total_ht_centimes,
            'total_tva_centimes', NEW.total_tva_centimes,
            'total_ttc_centimes', NEW.total_ttc_centimes,
            'droit_timbre_centimes', NEW.droit_timbre_centimes,
            'interets_moratoires_centimes', NEW.interets_moratoires_centimes,
            'net_a_payer_centimes', NEW.net_a_payer_centimes,
            'facture_origine_id', NEW.facture_origine_id, 'motif_avoir', NEW.motif_avoir,
            'date_validation', NEW.date_validation, 'nombre_impressions', NEW.nombre_impressions,
            'exercice_id', NEW.exercice_id,
            'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le
        ));
END;

CREATE TRIGGER trg_factures_audit_delete AFTER DELETE ON factures
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('factures', 'DELETE', OLD.id,
        json_object(
            'statut', OLD.statut, 'type_document', OLD.type_document, 'numero', OLD.numero,
            'date_facture', OLD.date_facture, 'date_echeance', OLD.date_echeance,
            'affaire_id', OLD.affaire_id, 'client_id', OLD.client_id,
            'adresse_facturation', OLD.adresse_facturation, 'adresse_facturation_type', OLD.adresse_facturation_type,
            'nif_client', OLD.nif_client, 'numero_bc_client', OLD.numero_bc_client,
            'rabais_global_bps', OLD.rabais_global_bps, 'retenue_garantie_bps', OLD.retenue_garantie_bps,
            'remboursement_avance_centimes', OLD.remboursement_avance_centimes,
            'mode_reglement_prevu', OLD.mode_reglement_prevu, 'mode_reglement_effectif', OLD.mode_reglement_effectif,
            'total_ht_lignes_centimes', OLD.total_ht_lignes_centimes,
            'total_remises_centimes', OLD.total_remises_centimes,
            'net_commercial_ht_centimes', OLD.net_commercial_ht_centimes,
            'retenue_garantie_centimes', OLD.retenue_garantie_centimes,
            'total_ht_centimes', OLD.total_ht_centimes,
            'total_tva_centimes', OLD.total_tva_centimes,
            'total_ttc_centimes', OLD.total_ttc_centimes,
            'droit_timbre_centimes', OLD.droit_timbre_centimes,
            'interets_moratoires_centimes', OLD.interets_moratoires_centimes,
            'net_a_payer_centimes', OLD.net_a_payer_centimes,
            'facture_origine_id', OLD.facture_origine_id, 'motif_avoir', OLD.motif_avoir,
            'date_validation', OLD.date_validation, 'nombre_impressions', OLD.nombre_impressions,
            'exercice_id', OLD.exercice_id,
            'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le
        ), NULL);
END;

CREATE TRIGGER trg_bons_livraison_audit_insert AFTER INSERT ON bons_livraison
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('bons_livraison', 'INSERT', NEW.id, NULL,
        json_object('statut', NEW.statut, 'numero_bl', NEW.numero_bl, 'date_livraison', NEW.date_livraison,
                    'affaire_id', NEW.affaire_id, 'client_id', NEW.client_id,
                    'poids_pesee_kg', NEW.poids_pesee_kg, 'signature_client', NEW.signature_client,
                    'facture_id', NEW.facture_id, 'exercice_id', NEW.exercice_id,
                    'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le));
END;

CREATE TRIGGER trg_bons_livraison_audit_update AFTER UPDATE ON bons_livraison
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('bons_livraison', 'UPDATE', NEW.id,
        json_object('statut', OLD.statut, 'numero_bl', OLD.numero_bl, 'date_livraison', OLD.date_livraison,
                    'affaire_id', OLD.affaire_id, 'client_id', OLD.client_id,
                    'poids_pesee_kg', OLD.poids_pesee_kg, 'signature_client', OLD.signature_client,
                    'facture_id', OLD.facture_id, 'exercice_id', OLD.exercice_id,
                    'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le),
        json_object('statut', NEW.statut, 'numero_bl', NEW.numero_bl, 'date_livraison', NEW.date_livraison,
                    'affaire_id', NEW.affaire_id, 'client_id', NEW.client_id,
                    'poids_pesee_kg', NEW.poids_pesee_kg, 'signature_client', NEW.signature_client,
                    'facture_id', NEW.facture_id, 'exercice_id', NEW.exercice_id,
                    'cree_le', NEW.cree_le, 'modifie_le', NEW.modifie_le, 'supprime_le', NEW.supprime_le));
END;

CREATE TRIGGER trg_bons_livraison_audit_delete AFTER DELETE ON bons_livraison
BEGIN
    INSERT INTO journal_audit (table_affectee, action, ligne_id, ancien_etat, nouvel_etat)
    VALUES ('bons_livraison', 'DELETE', OLD.id,
        json_object('statut', OLD.statut, 'numero_bl', OLD.numero_bl, 'date_livraison', OLD.date_livraison,
                    'affaire_id', OLD.affaire_id, 'client_id', OLD.client_id,
                    'poids_pesee_kg', OLD.poids_pesee_kg, 'signature_client', OLD.signature_client,
                    'facture_id', OLD.facture_id, 'exercice_id', OLD.exercice_id,
                    'cree_le', OLD.cree_le, 'modifie_le', OLD.modifie_le, 'supprime_le', OLD.supprime_le),
        NULL);
END;
