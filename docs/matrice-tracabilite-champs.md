# Matrice de traçabilité des champs PRD → Schéma — Jalon 0

Livrable du DoD J0 : **chaque champ des tableaux §4.1 à §4.13 (périmètre MVP) est tracé vers une colonne, ou explicitement marqué hors MVP avec sa phase cible.** Convention de lecture : `table.colonne` renvoie à [dictionnaire-donnees.md](dictionnaire-donnees.md) et `electron/db/schema.sql`. « calculé » = non stocké, recalculé par `domaine/` à la demande.

---

## M1 — Gestion des Affaires

### §4.1.3 Champs communs (fiche affaire)

| Champ PRD | Trace | Statut |
|---|---|---|
| Référence | `affaires.reference` | ✅ |
| Type | `affaires.type_affaire` | ✅ |
| Affaire mère | `affaires.affaire_mere_id` | ✅ |
| Client | `affaires.client_id` | ✅ |
| Objet | `affaires.objet` | ✅ |
| Montant initial HT | `affaires.montant_initial_ht_centimes` | ✅ |
| Taux TVA | `affaires.taux_tva_bps` (19 % verrouillé) | ✅ |
| Date signature | `affaires.date_signature` | ✅ |
| Date notification | `affaires.date_notification` | ✅ |
| N° ODS | `affaires.numero_ods` | ✅ |
| Date ODS | `affaires.date_ods` | ✅ |
| Date démarrage effectif | `affaires.date_demarrage_effectif` | ✅ |
| Délai exécution (jours) | `affaires.delai_execution_jours` | ✅ |
| Date fin contractuelle | `affaires.date_fin_contractuelle` (calculé, cache) | ✅ |
| Date fin révisée | `affaires.date_fin_revisee` | ✅ |
| Date fin réelle | `affaires.date_fin_reelle` | ✅ |
| Dépassement (jours) | calculé (`date_fin_reelle − date_fin_contractuelle`) | ✅ calculé |
| Motif dépassement | `affaires.motif_depassement` | ✅ |
| Rabais global | `affaires.rabais_global_bps` | ✅ |
| Statut | `affaires.statut` (7 valeurs) | ✅ |
| Responsable | `affaires.responsable` (texte, mono-utilisateur 📌) | ✅ |

### §4.1.4 Champs spécifiques Marché Public

| Champ PRD | Trace | Statut |
|---|---|---|
| N° marché | `affaires.numero_marche` | ✅ |
| Service contractant | `affaires.service_contractant` | ✅ |
| Type procédure | `affaires.type_procedure` | ✅ |
| Avance forfaitaire | `affaires.avance_forfaitaire_bps` | ✅ |
| Avance approvisionnement | `affaires.avance_approvisionnement_bps` | ✅ |
| Caution restitution avance | hors MVP — M11, Phase 2 (lien vers table `cautions`) | ⏸ Phase 2 |
| Caution bonne exécution | hors MVP — M11, Phase 2 | ⏸ Phase 2 |
| Retenue de garantie | `affaires.retenue_garantie_bps` (5 % base HT 📌) | ✅ |
| Délai garantie | `affaires.delai_garantie_mois` (13) | ✅ |
| Type de révision | `affaires.type_revision` | ✅ |
| Formule de révision | `affaires.formule_revision` (coefficients JSON) | ✅ |
| Pénalités — taux | `affaires.penalite_retard_taux_bps` (paramétrable par affaire) | ✅ |
| Pénalités — base | `affaires.penalite_retard_base_centimes` | ✅ |
| Pénalités — plafond | `affaires.penalite_retard_plafond_bps` | ✅ |
| Intérêts moratoires | `factures.interets_moratoires_centimes` (montant saisi sur la ND, pas de taux 📌) | ✅ |
| Réceptions | `receptions` (table, par lot/tranche) | ✅ |
| Décompte provisoire | `affaires.date_decompte_provisoire` | ✅ |
| Décompte définitif | `affaires.date_decompte_definitif` | ✅ |

### §4.1.5 Champs spécifiques Contrat Privé

| Champ PRD | Trace | Statut |
|---|---|---|
| N° contrat/devis | `affaires.numero_contrat` + lien `devis.affaire_id` | ✅ |
| Type client | `clients.type_client` | ✅ |
| Avance contractuelle | `affaires.avance_contractuelle_centimes` | ✅ |
| Modalités paiement | `affaires.modalites_paiement` | ✅ |
| Retenue garantie | `affaires.retenue_garantie_bps` (surcharge possible 📌) | ✅ |
| Délai garantie | `affaires.delai_garantie_mois` (12) | ✅ |
| Réceptions | `receptions` | ✅ |

### §4.1.6 DQE / Postes

| Champ PRD | Trace | Statut |
|---|---|---|
| N° | `postes_dqe.numero` | ✅ |
| Désignation | `postes_dqe.designation` | ✅ |
| Unité | `postes_dqe.unite` | ✅ |
| Qté | `postes_dqe.quantite_milliemes` | ✅ |
| PU HT | `postes_dqe.pu_ht_centimes` | ✅ |
| Montant HT | `postes_dqe.montant_ht_centimes` (calculé) | ✅ |
| Famille | `postes_dqe.famille_id` / `sous_famille_id` | ✅ |
| Classification auto | `postes_dqe.classification` (snapshot 📌) | ✅ |

### §4.1.7 Suivi des délais & suspensions

| Champ PRD | Trace | Statut |
|---|---|---|
| ODS / Suspension / Reprise / Prorogation | `evenements_delais.type_evenement` | ✅ |
| Date début / fin | `evenements_delais.date_debut` / `date_fin` | ✅ |
| Durée | `evenements_delais.duree_jours` | ✅ |
| Motif | `evenements_delais.motif` | ✅ |
| Impact délai | `evenements_delais.impact_delai_jours` | ✅ |

### §4.1.7bis Réceptions

| Champ PRD | Trace | Statut |
|---|---|---|
| Lot / Tranche | `receptions.lot_tranche` | ✅ |
| Type | `receptions.type_reception` | ✅ |
| Date | `receptions.date_reception` | ✅ |
| N° PV | `receptions.numero_pv` | ✅ |
| Montant concerné | `receptions.montant_concerne_centimes` | ✅ |

### §4.1.8 Déclaration mensuelle

| Champ PRD | Trace | Statut |
|---|---|---|
| Tous (Mois/Année, tableau de saisie global, classification, statut) | hors MVP — table `declarations` + `declaration_lignes`, **Phase 2** | ⏸ Phase 2 |

### §4.1.9 Avenants

| Champ PRD | Trace | Statut |
|---|---|---|
| Numérotation `AVT-YYYY-NNNNN` | `avenants.numero` | ✅ |
| Liaison affaire mère | `avenants.affaire_id` | ✅ |
| Statut Brouillon/Validé | `avenants.statut` | ✅ |
| Impact DQE détaillé | `avenants_postes` (`action`, `poste_dqe_id`, nouvelle désignation/qté/PU) | ✅ |
| Impact délai / montant | `avenants.impact_delai_jours` / `impact_montant_ht_centimes` | ✅ |

### §4.1.10 Liaison facturation

| Champ PRD | Trace | Statut |
|---|---|---|
| Affaire → plusieurs factures | `factures.affaire_id` | ✅ |
| Suivi % facturé / montant | calculé (agrégation `factures` par affaire) | ✅ calculé |
| Génération ST/FA depuis déclaration | hors MVP — Phase 2 | ⏸ Phase 2 |

### §4.1.11 Correspondances

| Champ PRD | Trace | Statut |
|---|---|---|
| Date / Type / Objet / Référence / PJ | `correspondances` | ✅ |

### §4.1.12 Résiliation

| Champ PRD | Trace | Statut |
|---|---|---|
| Motif / date résiliation | `affaires.motif_resiliation` / `date_resiliation` | ✅ |
| Décompte de résiliation | `affaires.decompte_resiliation_centimes` | ✅ |
| Sort cautions / retenue | `affaires.sort_cautions` / `sort_retenue_garantie` | ✅ |

### §4.1.13bis Attachements

| Champ PRD | Trace | Statut |
|---|---|---|
| N° attachement | `attachements.numero_attachement` | ✅ |
| Date / Établi par / PJ | `attachements.date_attachement` / `etabli_par` / `piece_jointe` | ✅ |
| Poste(s) DQE concerné(s) + quantité constatée | `attachements_postes` | ✅ |
| Statut | `attachements.statut` | ✅ |

### §4.1.14 Alertes (informatives)

| Champ PRD | Trace | Statut |
|---|---|---|
| 50 % / 80 % / J-15 / dépassé / suspensions / prorogations / ST / réception / garantie / caution / retenue | calculé par `evaluerAlertes` (D15, J4) depuis `affaires`, `evenements_delais`, `receptions` — aucune table dédiée | ✅ calculé |

---

## M2 — Clients & CRM

### §4.2.1 Fiche client

| Champ PRD | Trace | Statut |
|---|---|---|
| Code client | `clients.code_client` | ✅ |
| Type | `clients.type_client` | ✅ |
| Raison sociale / Nom | `clients.raison_sociale` | ✅ |
| Sigle | `clients.sigle` | ✅ |
| Catégorie | `clients.categorie` | ✅ |
| Secteur | `clients.secteur` | ✅ |
| Client GITRA / Groupe | `clients.client_groupe` | ✅ |
| Nom du groupe / tutelle | `clients.nom_groupe` | ✅ |
| Statut | `clients.statut` (5 valeurs) | ✅ |
| Responsable commercial | `clients.responsable_commercial` | ✅ |
| Contentieux déclaré | `clients.contentieux_declare` | ✅ |
| Coordonnées (adresse, wilaya, commune, tél, fax, email, chantier) | `clients.adresse` / `wilaya` / `commune` / `tel_fixe` / `tel_mobile` / `fax` / `email` / `adresse_chantier` | ✅ |
| NIF / NIS / RC / AI | `clients.nif` / `nis` / `rc` / `ai` | ✅ |
| RIB / Banque / Agence | `clients.rib` / `banque` / `agence` | ✅ |
| Mode règlement préféré | `clients.mode_reglement_prefere` | ✅ |
| Délai paiement habituel | `clients.delai_paiement_jours` | ✅ |
| Plafond crédit autorisé | `clients.plafond_credit_centimes` | ✅ |

### §4.2.2 Contacts

| Champ PRD | Trace | Statut |
|---|---|---|
| Nom / Fonction / Tél / Email / Contact principal | `contacts` | ✅ |

### §4.2.3 Historique des interactions

| Champ PRD | Trace | Statut |
|---|---|---|
| Date / Type / Note | `interactions` | ✅ |

### §4.2.4 Scoring

| Champ PRD | Trace | Statut |
|---|---|---|
| Scores A/B/C/D (formules) | calculé par `calculerScoreClient` (D13, J3) ; cache `clients.score_client` + `derniere_evaluation_score_le` | ✅ calculé |
| Protection GITRA / Groupe | `clients.client_groupe` (règle dans D13) | ✅ |
| Client en score D **jamais bloqué** | badge via `score_client`, aucune restriction | ✅ |

### §4.2.5 Historique commercial

| Champ PRD | Trace | Statut |
|---|---|---|
| Nombre d'affaires, montants, créance nette, délai moyen… | calculé (agrégation `affaires`/`factures`/`encaissements`) — pas de table dédiée | ✅ calculé |

### §4.2.6 Règles métier

| Règle | Trace | Statut |
|---|---|---|
| Unicité NIF (sauf particuliers) | index partiel `ux_clients_nif` | ✅ |
| Mise à jour auto du score | `clients.score_client` (recalcul) | ✅ |

---

## M3 — Catalogue Produits / Services

### §4.3.1 Architecture (4 familles)

| Champ PRD | Trace | Statut |
|---|---|---|
| VENTES / LOCATIONS / RÉALISATIONS / SOUS-TRAITANCE | `familles` (+ `sous_familles`) | ✅ |

### §4.3.2 Fiche produit

| Champ PRD | Trace | Statut |
|---|---|---|
| Code produit | `produits.code_produit` (unique) | ✅ |
| Libellé | `produits.libelle` | ✅ |
| Famille / Sous-famille | `produits.famille_id` / `sous_famille_id` | ✅ |
| Unité | `produits.unite` | ✅ |
| PU référence HT | `produits.pu_reference_centimes` | ✅ |
| Taux TVA (19 %, non modifiable) | verrouillé en produit (aucune colonne) 📌 | ✅ verrouillé |
| Type tarification | `produits.type_tarification` | ✅ |
| Actif | `produits.actif` | ✅ |

### §4.3.3 Niveaux de tarification

| Champ PRD | Trace | Statut |
|---|---|---|
| Tarif catalogue / client / affaire + période | `tarifs_historique` (`type_niveau`, `client_id`, `affaire_id`, `debut_periode`, `fin_periode`) | ✅ |
| Résolution période englobante | calculé par `resoudreTarif` (D12, J3) | ✅ calculé |

### §4.3.4 Règles métier

| Règle | Trace | Statut |
|---|---|---|
| Classification Noir/Blanc/Autre (snapshot) | `classifications` + snapshot `postes_dqe.classification` / `lignes_facture.classification` | ✅ |
| Pas de gestion de stock | — | ✅ hors champ |
| Prix de revient / marge produit | hors périmètre (décision EGTO) | ✅ hors champ |

---

## M4 — Facturation

### §4.4.1 Types de documents

| Champ PRD | Trace | Statut |
|---|---|---|
| FA / AC / AV / FS / ND | `factures.type_document` | ✅ |
| ST (numérotée par marché) | hors MVP — Phase 2 (ajout `ST` à `type_document` + compteur par affaire) | ⏸ Phase 2 |

### §4.4.2 Numérotation

| Champ PRD | Trace | Statut |
|---|---|---|
| Formats + compteurs | `compteurs_numerotation` (`code_document`, `annee`, `dernier_numero`) | ✅ |
| Attribuée à la validation, jamais au brouillon | `factures.numero` NULL tant que non validé ; incrément via D11 | ✅ |
| Brouillon supprimé sans consommation | séquence sans trou dans D11 (`attribuerNumero`) | ✅ |
| Numéro verrouillé | `ux_factures_numero` (unique, partiel) | ✅ |

### §4.4.3 Cycle de vie

| Champ PRD | Trace | Statut |
|---|---|---|
| Brouillon → Validée → Imprimée → Envoyée → Payée → Archivée | `factures.statut` (machine à états D7) | ✅ |

### §4.4.4 En-tête facture

| Champ PRD | Trace | Statut |
|---|---|---|
| N° facture | `factures.numero` | ✅ |
| Date / Date échéance | `factures.date_facture` / `date_echeance` | ✅ |
| Affaire | `factures.affaire_id` (nullable — BL vente ponctuelle) | ✅ |
| Client | `factures.client_id` | ✅ |
| Adresse facturation | `factures.adresse_facturation` + `adresse_facturation_type` | ✅ |
| NIF client | `factures.nif_client` (snapshot) | ✅ |
| N° BC client | `factures.numero_bc_client` | ✅ |
| Rabais global | `factures.rabais_global_bps` | ✅ |
| Remise par ligne | `lignes_facture.remise_bps` | ✅ |
| Retenue de garantie | `factures.retenue_garantie_bps` (base HT) | ✅ |
| Remboursement avance | `factures.remboursement_avance_centimes` (prorata) | ✅ |
| TVA | 19 % verrouillé (`taux_tva` sur affaire/produit) | ✅ |
| Mode de règlement prévu | `factures.mode_reglement_prevu` | ✅ |
| Droit de timbre | `factures.droit_timbre_centimes` (barème §4.7.3, **uniquement si règlement en espèces**) | ✅ |

### §4.4.5 Lignes de facturation

| Champ PRD | Trace | Statut |
|---|---|---|
| Code produit / libellé / unité / PU | `lignes_facture` (`produit_id`, `designation`, `unite`, `pu_ht_centimes`) | ✅ |
| Quantité / Montant HT | `lignes_facture.quantite_milliemes` / `montant_ht_brut_centimes` / `montant_ht_remise_centimes` | ✅ |
| Remise ligne | `lignes_facture.remise_bps` | ✅ |
| Famille + Classification auto | `lignes_facture.famille_id` / `sous_famille_id` / `classification` | ✅ |

### §4.4.6 Pied de facture

| Champ PRD | Trace | Statut |
|---|---|---|
| Total HT lignes − remises − rabais → Net commercial | `factures.total_ht_lignes_centimes` / `total_remises_centimes` / `net_commercial_ht_centimes` | ✅ |
| − Remboursement avance − Retenue garantie → Total HT | `factures.remboursement_avance_centimes` / `retenue_garantie_centimes` / `total_ht_centimes` | ✅ |
| + TVA 19 % → TTC | `factures.total_tva_centimes` / `total_ttc_centimes` | ✅ |
| + Droit de timbre → NET À PAYER | `factures.droit_timbre_centimes` / `net_a_payer_centimes` | ✅ |
| Centimes, arrondi half-up ligne puis total | `domaine/calculerPiedFacture` (D9, J1) | ✅ |

### §4.4.7 ST — hors MVP (Phase 2), §4.4.7bis révision de prix — hors MVP (Phase 2)

### §4.4.9 Rapport mensuel — hors MVP, **bloqué** par template GITRA (§16.1) | ⏸ Phase 2

### §4.4.10 Liaison déclaration → facturation — hors MVP (Phase 2) | ⏸ Phase 2

### §4.4.11 Bons de livraison

| Champ PRD | Trace | Statut |
|---|---|---|
| N° BL | `bons_livraison.numero_bl` | ✅ |
| Date livraison | `bons_livraison.date_livraison` | ✅ |
| Affaire / Client | `bons_livraison.affaire_id` / `client_id` | ✅ |
| Lignes produits | `lignes_bon_livraison` | ✅ |
| Poids pesée | `bons_livraison.poids_pesee_kg` | ✅ |
| Signature client | `bons_livraison.signature_client` (+ PJ) | ✅ |
| Statut | `bons_livraison.statut` (Émis/Facturé) | ✅ |
| Génération FA groupée | `bons_livraison.facture_id` (passage « Facturé ») | ✅ |

### §4.4.12 Avoirs

| Champ PRD | Trace | Statut |
|---|---|---|
| Total / lignes / partiel | `factures.type_document='AV'` + `lignes_facture` | ✅ |
| Référence facture d'origine + motif | `factures.facture_origine_id` / `motif_avoir` | ✅ |

### §4.4.13 Duplicata

| Champ PRD | Trace | Statut |
|---|---|---|
| Mention DUPLICATA + journalisation | `factures.nombre_impressions` (gabarit PDF M20) | ✅ |

### §4.4.14 Suivi réalisation vs facturation — hors MVP (dépend déclarations, Phase 2) | ⏸ Phase 2

---

## M7 — Paramétrage & Administration

### §4.7.1 Sécurité — hors schéma (mot de passe, enveloppes, `egto-admin-reset`, J2)

### §4.7.3 Paramètres entreprise

| Champ PRD | Trace | Statut |
|---|---|---|
| Dénomination, forme, capital, RC, NIF, NIS, AI, adresse, tél, fax, email, logo, mention | `parametres` (clé-valeur) | ✅ |
| Seuil max des espèces pour le timbre (1 M DA) | `parametres.timbre.seuil_max_especes_centimes` | ✅ |
| Barème du timbre (tranches + plancher + plafond) | `bareme_timbre` | ✅ |

### §4.7.4 Exercices & périodes

| Champ PRD | Trace | Statut |
|---|---|---|
| Exercice en cours / clôturé | `exercices.statut` (+ `annee`, `date_debut`, `date_fin`, `cloture_le`) | ✅ |

### §4.7.5 Numérotation

| Champ PRD | Trace | Statut |
|---|---|---|
| Formats + compteurs | `compteurs_numerotation` | ✅ |

### §4.7.6 Alertes paramétrables — calculées (D15, J4), canal in-app — ✅ calculé

### §4.7.7 Sauvegardes — hors schéma (politique J2, M14 ; ZIP §16.9)

### §4.7.8 Journal d'audit

| Champ PRD | Trace | Statut |
|---|---|---|
| CRUD critiques tracés, lecture seule | `journal_audit` + **triggers** (clients, affaires, avenants, devis, factures, bons_livraison) | ✅ |
| Rétention illimitée, export annuel | opérationnel (fichier) | ✅ |

### §4.7.9 Journal applicatif — fichiers rotatifs `userData/logs/` (M15, J2) — hors schéma

---

## M9 — Devis / Proforma

| Champ PRD | Trace | Statut |
|---|---|---|
| N° devis | `devis.numero_devis` | ✅ |
| Client / Prospect | `devis.client_id` | ✅ |
| Date / Validité | `devis.date_devis` / `date_validite` | ✅ |
| Lignes | `lignes_devis` | ✅ |
| Rabais global | `devis.rabais_global_bps` | ✅ |
| Statut (Brouillon/Envoyé/Accepté/Refusé/Expiré) | `devis.statut` (+ expiration auto D15) | ✅ |
| Conversion en affaire | `devis.affaire_id` + `postes_dqe` (`origine='DEVIS'`, `ligne_devis_id`) | ✅ |

---

## M13 — Import (process, aucune table dédiée)

| Champ PRD | Trace | Statut |
|---|---|---|
| Mapping colonnes → fiche client/produit | mapping applicatif vers `clients` / `produits` | ✅ |
| Doublons (NIF / code produit) | `ux_clients_nif` / `produits.code_produit` UNIQUE | ✅ |
| Import DQE rattaché à une affaire | insertion dans `postes_dqe` (`origine='IMPORT'`) | ✅ |
| Rapport d'anomalies, import partiel, rollback technique | comportement applicatif (J3, M18/Q10) | ✅ |

---

## Récapitulatif des éléments hors MVP

| Élément | Phase cible | Raison |
|---|---|---|
| Déclarations mensuelles + lignes (`declarations`, `declaration_lignes`) | Phase 2 | §3.1, M1 sans déclarations |
| ST (documents, numérotés par marché) | Phase 2 | §4.4.7 |
| Révision de prix (champs `type_revision`/`formule_revision` réservés) | Phase 2 | §4.4.7bis |
| Rapport mensuel GITRA | Phase 2 (**bloqué**, template) | §16.1 |
| Créances / encaissements (`encaissements`, liaison N—N) | Phase 2 | M5 |
| Cautions / garanties (`cautions`) | Phase 2 | M11 |
| Échéancier retenues (`retenues_garantie_echeances`) | Phase 2 | M12 |
| Sous-traitance (`sous_traitants`, `bcst`, `decomptes_sst`) | Phase 2 | M8 |
| Registre des consultations (pipeline AO) | Phase 3 | §4.1.13 |
| Suivi réalisation vs facturation (§4.4.14) | Phase 2 | dépend déclarations |
