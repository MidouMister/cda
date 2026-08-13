# Dictionnaire de données — EGTO Gestion Commerciale

Jalon 0 — livrable du cadrage. Correspond à `electron/db/schema.sql`. Source de vérité produit : [prd-cda.md](../prd-cda.md) (PRD v2.1). Périmètre : **MVP uniquement** (voir `matrice-tracabilite-champs.md` pour le tracé champ → colonne et le statut des entités hors MVP).

## Conventions générales

| Aspect | Convention | Justification PRD |
|---|---|---|
| Colonnes transversales | `id`, `cree_le`, `modifie_le`, `supprime_le`, `statut` | §10.2 (adapté en français), plan-mvp J0 |
| Montants | `INTEGER` en **centimes**, suffixe de colonne `_centimes` | §10.3 📌, §4.4.6 |
| Pourcentages / taux | `INTEGER` en **points de base** (bps), suffixe `_bps` — 1,5 % = `150`, 19 % = `1900` | §4.7.3, §4.1.4 (aucun taux en dur, calcul en entiers) |
| Quantités | `INTEGER` en **millièmes d'unité**, suffixe `_milliemes` — 12,5 t = `12500` | §4.3.2 (unités T/m²/m³…), arrondi sans flottant |
| Dates métier | `TEXT` ISO `AAAA-MM-JJ` (affichage `JJ/MM/AAAA`) | §5.5.1 date-fns |
| Horodatages | `TEXT` ISO `datetime('now')` | — |
| Booléens | `INTEGER` `0/1` avec `CHECK (x IN (0,1))` | — |
| Monnaie | Uniquement des `INTEGER` ; **aucune colonne `REAL`** | §10.3, DoD J0 |
| Suppression logique | `supprime_le` horodaté ; jamais de `DELETE` en application | §5.3, plan-mvp |
| Audit | Triggers SQLite uniquement, table `journal_audit` | §4.7.8, §5.3 |
| Listes de valeurs | Codes majuscules français (`SARL`, `VIREMENT`, `NOIR`…) en `CHECK` | nommage français, §4 |

---

## Tables

### 1. `familles` — Familles de produits (4) — §4.3.1

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le | TEXT | non | now | horodatage | §10.2 |
| supprime_le | TEXT | oui | — | suppression logique | §10.2 |
| statut | TEXT | non | `actif` | | §10.2 |
| code | TEXT | non | — | `UNIQUE` — `VTE`, `LOC`, `REA`, `ST` | §4.3.1 |
| libelle | TEXT | non | — | `VENTES`, `LOCATIONS`, `RÉALISATIONS`, `SOUS-TRAITANCE` | §4.3.1 |
| ordre | INTEGER | non | 0 | ordre d'affichage | — |

### 2. `sous_familles` — Sous-familles des produits — §4.3.2, §4.1.8

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales (§10.2) | §10.2 |
| famille_id | INTEGER | non | — | `FK → familles.id` | §4.3.1 |
| code | TEXT | non | — | `UNIQUE` (ex. `BB`, `GB`, `BETON_ARME`…) | §4.3.2 |
| libelle | TEXT | non | — | | §4.3.2 |

### 3. `classifications` — Sous-famille → Noir / Blanc / Autre — §4.1.8, §4.3.4

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| sous_famille_id | INTEGER | non | — | `FK → sous_familles.id`, `UNIQUE` | §4.3.4 |
| categorie | TEXT | non | — | `CHECK IN ('NOIR','BLANC','AUTRE')` | §4.1.8 |

La classification est **figée en snapshot** sur chaque ligne (DQE, facture) au moment de la saisie ; un changement de la table `classifications` ne réécrit pas l'historique (📌 §4.1.8).

### 4. `clients` — Fiche client — §4.2.1

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `PROSPECT` | `CHECK IN ('PROSPECT','ACTIF','INACTIF','EN_VIGILANCE','ARCHIVE')` | §4.2.1 |
| code_client | TEXT | non | — | `UNIQUE` — `CLI-YYYY-NNNNN` | §4.2.1 |
| type_client | TEXT | non | — | `CHECK IN ('EPE_SPA','SARL','EURL','ETP','ETBH','PARTICULIER')` | §4.2.1 |
| raison_sociale | TEXT | non | — | nom / raison sociale | §4.2.1 |
| sigle | TEXT | oui | — | | §4.2.1 |
| categorie | TEXT | non | — | `CHECK IN ('PUBLIC','PRIVE')` | §4.2.1 |
| secteur | TEXT | oui | — | `CHECK IN ('BTP','ENERGIE','PORTUAIRE','HYDRAULIQUE','VRD','AUTRE')` | §4.2.1 |
| client_groupe | INTEGER | non | 0 | `CHECK IN (0,1)` — client GITRA/Groupe | §4.2.1 |
| nom_groupe | TEXT | oui | — | requis si `client_groupe = 1` | §4.2.1 |
| responsable_commercial | TEXT | oui | — | | §4.2.1 |
| contentieux_declare | INTEGER | non | 0 | `CHECK IN (0,1)` — coché manuellement ou auto à relance n°4 | §4.2.1, §4.5.5 |
| adresse / wilaya / commune | TEXT | oui | — | coordonnées | §4.2.1 |
| tel_fixe / tel_mobile / fax / email | TEXT | oui | — | coordonnées | §4.2.1 |
| adresse_chantier | TEXT | oui | — | | §4.2.1 |
| nif | TEXT | oui | — | 15 chiffres attendus (à vérifier §16.5) ; **unicité partielle hors particuliers** (`ux_clients_nif`) | §4.2.1, §4.2.6 |
| nis | TEXT | oui | — | 11 ou 15 chiffres selon sources (§16.5) | §4.2.1 |
| rc / ai | TEXT | oui | — | registre de commerce / identifiant fiscal | §4.2.1 |
| rib / banque / agence | TEXT | oui | — | | §4.2.1 |
| mode_reglement_prefere | TEXT | oui | — | `CHECK IN ('VIREMENT','CHEQUE','ESPECES','TRAITE','LCN')` | §4.2.1, §4.4.4 |
| delai_paiement_jours | INTEGER | oui | — | sert au calcul de `date_echeance` | §4.4.4 |
| plafond_credit_centimes | INTEGER | oui | — | centimes — non bloquant, informatif | §4.2.1, §4.2.4 |
| score_client | TEXT | oui | — | `CHECK IN ('A','B','C','D')` — recalculé (auto) | §4.2.4 |
| derniere_evaluation_score_le | TEXT | oui | — | date du dernier calcul du score | §4.2.4 |

### 5. `contacts` — Contacts client — §4.2.2

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| client_id | INTEGER | non | — | `FK → clients.id` | §4.2.2 |
| nom | TEXT | non | — | | §4.2.2 |
| fonction | TEXT | oui | — | | §4.2.2 |
| telephone | TEXT | oui | — | | §4.2.2 |
| email | TEXT | oui | — | | §4.2.2 |
| contact_principal | INTEGER | non | 0 | `CHECK IN (0,1)` | §4.2.2 |

### 6. `interactions` — Historique d'interactions — §4.2.3

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| client_id | INTEGER | non | — | `FK → clients.id` | §4.2.3 |
| date_interaction | TEXT | non | — | date métier | §4.2.3 |
| type_interaction | TEXT | non | — | `CHECK IN ('APPEL','VISITE','RELANCE','AUTRE')` | §4.2.3 |
| note | TEXT | oui | — | texte libre | §4.2.3 |

### 7. `produits` — Catalogue — §4.3.2

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| code_produit | TEXT | non | — | `UNIQUE` — détection doublons à l'import | §4.3.2, §4.3.4 |
| libelle | TEXT | non | — | | §4.3.2 |
| famille_id | INTEGER | non | — | `FK → familles.id` | §4.3.1 |
| sous_famille_id | INTEGER | oui | — | `FK → sous_familles.id` | §4.3.2 |
| unite | TEXT | non | `U` | `CHECK IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')` | §4.3.2 |
| pu_reference_centimes | INTEGER | non | 0 | PU de référence catalogue, centimes | §4.3.2 |
| type_tarification | TEXT | non | `FIXE` | `CHECK IN ('FIXE','PAR_CLIENT','PAR_AFFAIRE','FORFAIT')` | §4.3.2 |
| actif | INTEGER | non | 1 | `CHECK IN (0,1)` | §4.3.2 |

Le taux TVA 19 % est **verrouillé au niveau produit** (non modifiable, pas de colonne) — 📌 §4.3.2.

### 8. `affaires` — Fiche affaire — §4.1.3 à §4.1.5, §4.1.12

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `SIGNE` | `CHECK IN ('SIGNE','ODS_RECU','EN_COURS','FACTURE','SOLDE','ARCHIVE','RESILIE')` — 📌 pas de statut pré-signature | §4.1.3 |
| reference | TEXT | non | — | `UNIQUE` — `AFG-YYYY-NNNNN` | §4.1.3 |
| type_affaire | TEXT | non | — | `CHECK IN ('MARCHE_PUBLIC','CONTRAT_PRIVE','BC','AVENANT')` | §4.1.1 |
| affaire_mere_id | INTEGER | oui | — | `FK → affaires.id` (si avenant) | §4.1.1, §4.1.9 |
| client_id | INTEGER | non | — | `FK → clients.id` | §4.1.3 |
| objet | TEXT | oui | — | descriptif | §4.1.3 |
| montant_initial_ht_centimes | INTEGER | non | 0 | centimes | §4.1.3 |
| taux_tva_bps | INTEGER | non | 1900 | 19 % — bps | §4.1.3 |
| date_signature | TEXT | oui | — | | §4.1.3 |
| date_notification | TEXT | oui | — | (public) | §4.1.3 |
| numero_ods | TEXT | oui | — | | §4.1.3 |
| date_ods | TEXT | oui | — | déclenche le délai d'exécution | §4.1.3, §4.1.7 |
| date_demarrage_effectif | TEXT | oui | — | | §4.1.3 |
| delai_execution_jours | INTEGER | oui | — | | §4.1.3 |
| date_fin_contractuelle | TEXT | oui | — | calculé = ODS + délai | §4.1.3 |
| date_fin_revisee | TEXT | oui | — | si avenant prolongation | §4.1.3 |
| date_fin_reelle | TEXT | oui | — | | §4.1.3 |
| motif_depassement | TEXT | oui | — | `CHECK IN ('FORCE_MAJEURE','AVENANT','RETARD_CLIENT','RETARD_APPRO','AUTRE')` | §4.1.3 |
| rabais_global_bps | INTEGER | non | 0 | bps | §4.1.3 |
| responsable | TEXT | oui | — | texte libre (mono-utilisateur 📌) | §4.1.3 |
| numero_marche | TEXT | oui | — | (public) attribué par le MO | §4.1.4 |
| service_contractant | TEXT | oui | — | administration / EPE | §4.1.4 |
| type_procedure | TEXT | oui | — | `CHECK IN ('AO_OUVERT','AO_RESTREINT','CONSULTATION','GRE_A_GRE')` | §4.1.4 |
| avance_forfaitaire_bps | INTEGER | oui | — | max 15 % = 1500 bps | §4.1.4 |
| avance_approvisionnement_bps | INTEGER | oui | — | cumul max 50 % | §4.1.4 |
| retenue_garantie_bps | INTEGER | non | 500 | 5 % base HT par défaut, surchargeable par affaire 📌 | §4.1.4, §4.1.5 |
| delai_garantie_mois | INTEGER | oui | — | 13 (public) / 12 (privé) | §4.1.4, §4.1.5 |
| type_revision | TEXT | oui | — | `CHECK IN ('FERME','REVISABLE')` | §4.1.4 |
| formule_revision | TEXT | oui | — | coefficients JSON (fixe/salaires/matériaux/bitume/gasoil) | §4.1.4, §4.4.7bis |
| penalite_retard_taux_bps | INTEGER | oui | — | %/jour, **paramétrable par affaire** (CCAP) | §4.1.4, §16.7 |
| penalite_retard_base_centimes | INTEGER | oui | — | base, modifiable (défaut = montant marché) | §4.1.4 |
| penalite_retard_plafond_bps | INTEGER | oui | — | % du montant marché | §4.1.4 |
| date_decompte_provisoire | TEXT | oui | — | | §4.1.4 |
| date_decompte_definitif | TEXT | oui | — | | §4.1.4 |
| numero_contrat | TEXT | oui | — | (privé) | §4.1.5 |
| modalites_paiement | TEXT | oui | — | (privé) texte libre | §4.1.5 |
| avance_contractuelle_centimes | INTEGER | oui | — | (privé) | §4.1.5 |
| motif_resiliation | TEXT | oui | — | | §4.1.12 |
| date_resiliation | TEXT | oui | — | | §4.1.12 |
| decompte_resiliation_centimes | INTEGER | oui | — | | §4.1.12 |
| sort_cautions | TEXT | oui | — | `CHECK IN ('A_RESTITUER','RETENUE')` | §4.1.12 |
| sort_retenue_garantie | TEXT | oui | — | `CHECK IN ('A_RESTITUER','RETENUE')` | §4.1.12 |

### 9. `evenements_delais` — Suivi des délais & suspensions — §4.1.7

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| affaire_id | INTEGER | non | — | `FK → affaires.id` | §4.1.7 |
| type_evenement | TEXT | non | — | `CHECK IN ('ODS','SUSPENSION','REPRISE','PROROGATION')` | §4.1.7 |
| date_debut | TEXT | oui | — | | §4.1.7 |
| date_fin | TEXT | oui | — | (suspension) | §4.1.7 |
| duree_jours | INTEGER | oui | — | | §4.1.7 |
| motif | TEXT | oui | — | | §4.1.7 |
| impact_delai_jours | INTEGER | non | 0 | +X jours (prorogation) | §4.1.7 |

Calcul : `date_fin_revisee = date_ods + delai_initial + Σ suspensions + Σ prorogations` (§4.1.7).

### 10. `avenants` — Avenants d'affaire — §4.1.9

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `BROUILLON` | `CHECK IN ('BROUILLON','VALIDE')` — workflow avant impact sur l'affaire mère | §4.1.9 |
| numero | TEXT | non | — | `UNIQUE` — `AVT-YYYY-NNNNN` | §4.1.9 |
| affaire_id | INTEGER | non | — | `FK → affaires.id` (affaire mère) | §4.1.9 |
| objet | TEXT | oui | — | | §4.1.9 |
| date_avenant | TEXT | oui | — | | §4.1.9 |
| impact_delai_jours | INTEGER | non | 0 | jours ajoutés | §4.1.9 |
| impact_montant_ht_centimes | INTEGER | non | 0 | delta HT, centimes | §4.1.9 |

### 11. `avenants_postes` — Impact DQE détaillé de l'avenant — §4.1.9

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| avenant_id | INTEGER | non | — | `FK → avenants.id` | §4.1.9 |
| action | TEXT | non | — | `CHECK IN ('AJOUT','MODIFICATION','SUPPRESSION')` | §4.1.9 |
| poste_dqe_id | INTEGER | oui | — | `FK → postes_dqe.id` (pour modif/suppression) | §4.1.9 |
| designation | TEXT | oui | — | | §4.1.9 |
| unite | TEXT | oui | — | | §4.1.9 |
| quantite_milliemes | INTEGER | oui | — | | §4.1.9 |
| pu_ht_centimes | INTEGER | oui | — | | §4.1.9 |

### 12. `postes_dqe` — DQE de l'affaire — §4.1.6, §4.1.10

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| affaire_id | INTEGER | non | — | `FK → affaires.id` | §4.1.6 |
| numero | INTEGER | non | — | N° de poste — `UNIQUE(affaire_id, numero)` via `ux_postes_dqe_affaire_numero` | §4.1.6 |
| designation | TEXT | non | — | | §4.1.6 |
| unite | TEXT | oui | — | `CHECK IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')` | §4.1.6 |
| quantite_milliemes | INTEGER | non | 0 | | §4.1.6 |
| pu_ht_centimes | INTEGER | non | 0 | | §4.1.6 |
| montant_ht_centimes | INTEGER | non | 0 | calculé (qte × PU, half-up) | §10.3 |
| famille_id | INTEGER | oui | — | `FK → familles.id` | §4.1.6 |
| sous_famille_id | INTEGER | oui | — | `FK → sous_familles.id` | §4.1.6 |
| classification | TEXT | oui | — | `CHECK IN ('NOIR','BLANC','AUTRE')` — **snapshot** à la saisie 📌 | §4.1.6, §4.1.8 |
| origine | TEXT | non | `MANUEL` | `CHECK IN ('DEVIS','IMPORT','AVENANT','MANUEL')` — traçabilité | §4.9.3, M13 |
| ligne_devis_id | INTEGER | oui | — | `FK → lignes_devis.id` (conversion devis) | §4.9.3 |

### 13. `attachements` — Attachements d'affaire — §4.1.13bis

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `BROUILLON` | `CHECK IN ('BROUILLON','SIGNE','REPORTE_DECLARATION')` | §4.1.13bis |
| numero_attachement | TEXT | non | — | `UNIQUE` — `ATT-<N°affaire>-NNN` | §4.1.13bis |
| affaire_id | INTEGER | non | — | `FK → affaires.id` | §4.1.13bis |
| date_attachement | TEXT | non | — | métré contradictoire | §4.1.13bis |
| etabli_par | TEXT | oui | — | | §4.1.13bis |
| piece_jointe | TEXT | oui | — | chemin fichier (scan), sous `Documents/EGTO/` | §4.1.13bis |

📌 L'attachement est une pièce justificative **sans impact financier direct** — seule la Déclaration Mensuelle validée déclenche la facturation (§4.1.13bis). L'attachement ne pré-remplit la déclaration qu'en Phase 2.

### 14. `attachements_postes` — Postes concernés par un attachement — §4.1.13bis

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| attachement_id | INTEGER | non | — | `FK → attachements.id` | §4.1.13bis |
| poste_dqe_id | INTEGER | non | — | `FK → postes_dqe.id` — `UNIQUE(attachement_id, poste_dqe_id)` | §4.1.13bis |
| quantite_constatee_milliemes | INTEGER | non | 0 | | §4.1.13bis |

### 15. `receptions` — Réceptions (lots/tranches) — §4.1.7bis, §4.1.4

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| affaire_id | INTEGER | non | — | `FK → affaires.id` | §4.1.7bis |
| lot_tranche | TEXT | non | `Global` | | §4.1.7bis |
| type_reception | TEXT | non | — | `CHECK IN ('PROVISOIRE','DEFINITIVE')` | §4.1.7bis |
| date_reception | TEXT | non | — | | §4.1.7bis |
| numero_pv | TEXT | oui | — | | §4.1.7bis |
| montant_concerne_centimes | INTEGER | oui | — | réception partielle | §4.1.7bis |

### 16. `correspondances` — Courriers avec le MO — §4.1.11

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| affaire_id | INTEGER | non | — | `FK → affaires.id` | §4.1.11 |
| date_correspondance | TEXT | non | — | | §4.1.11 |
| type_correspondance | TEXT | non | — | `CHECK IN ('COURRIER_SORTANT','COURRIER_ENTRANT','DEMANDE_PROROGATION','RECLAMATION','MISE_EN_DEMEURE','AUTRE')` | §4.1.11 |
| objet | TEXT | oui | — | | §4.1.11 |
| reference | TEXT | oui | — | | §4.1.11 |
| piece_jointe | TEXT | oui | — | chemin fichier | §4.1.11 |

### 17. `exercices` — Exercices & périodes — §4.7.4

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `OUVERT` | `CHECK IN ('OUVERT','CLOTURE')` — clôturé = figé | §4.7.4, §5.3 |
| annee | INTEGER | non | — | `UNIQUE` | §4.7.4 |
| date_debut | TEXT | non | — | | §4.7.4 |
| date_fin | TEXT | non | — | | §4.7.4 |
| cloture_le | TEXT | oui | — | horodatage | §4.7.4 |

### 18. `devis` — Devis / Proforma — §4.9.2, §4.9.3

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `BROUILLON` | `CHECK IN ('BROUILLON','ENVOYE','ACCEPTE','REFUSE','EXPIRE')` | §4.9.2 |
| numero_devis | TEXT | non | — | `UNIQUE` — `DEV-YYYY-NNNNN` | §4.9.2 |
| client_id | INTEGER | non | — | `FK → clients.id` (client ou prospect) | §4.9.2 |
| date_devis | TEXT | non | — | | §4.9.2 |
| date_validite | TEXT | oui | — | expiration automatique à cette date | §4.9.2, D15 |
| rabais_global_bps | INTEGER | non | 0 | bps | §4.9.2 |
| affaire_id | INTEGER | oui | — | `FK → affaires.id` — renseigné à la conversion (traçabilité) | §4.9.3 |
| exercice_id | INTEGER | oui | — | `FK → exercices.id` | §4.7.4 |

### 19. `lignes_devis` — Lignes de devis — §4.9.2

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| devis_id | INTEGER | non | — | `FK → devis.id` | §4.9.2 |
| produit_id | INTEGER | oui | — | `FK → produits.id` | §4.9.2 |
| designation | TEXT | non | — | | §4.9.2 |
| unite | TEXT | oui | — | `CHECK IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')` | §4.9.2 |
| quantite_milliemes | INTEGER | non | 0 | | §4.9.2 |
| pu_ht_centimes | INTEGER | non | 0 | | §4.9.2 |
| montant_ht_centimes | INTEGER | non | 0 | calculé | §10.3 |
| famille_id / sous_famille_id | INTEGER | oui | — | `FK` — snapshot héritée du produit | §4.3.4 |

### 20. `factures` — Documents de facturation — §4.4.2 à §4.4.6, §4.4.12, §4.4.13

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `BROUILLON` | `CHECK IN ('BROUILLON','VALIDE','IMPRIMEE','ENVOYEE','PAYEE','ARCHIVEE')` | §4.4.3 |
| type_document | TEXT | non | — | `CHECK IN ('FA','AC','AV','FS','ND')` — ST en Phase 2 (par marché) | §4.4.1 |
| numero | TEXT | oui | — | **attribué à la validation uniquement** (NULL au brouillon) — `UNIQUE` partiel (`ux_factures_numero`), verrouillé | §4.4.2 📌, §5.3 |
| date_facture | TEXT | non | — | | §4.4.4 |
| date_echeance | TEXT | oui | — | = date + délai client | §4.4.4 |
| affaire_id | INTEGER | oui | — | `FK → affaires.id` — obligatoire sauf BL vente ponctuelle | §4.4.4 |
| client_id | INTEGER | non | — | `FK → clients.id` — auto depuis l'affaire, sinon sélection directe obligatoire | §4.4.4 |
| adresse_facturation | TEXT | oui | — | siège ou chantier | §4.4.4 |
| adresse_facturation_type | TEXT | oui | — | `CHECK IN ('SIEGE','CHANTIER')` | §4.4.4 |
| nif_client | TEXT | oui | — | snapshot à l'émission | §4.4.4 |
| numero_bc_client | TEXT | oui | — | | §4.4.4 |
| rabais_global_bps | INTEGER | non | 0 | % | §4.4.4 |
| retenue_garantie_bps | INTEGER | non | 0 | % sur HT — repris de l'affaire | §4.4.4 |
| remboursement_avance_centimes | INTEGER | non | 0 | au prorata, ajustable | §4.4.4, §4.4.6 |
| mode_reglement_prevu | TEXT | oui | — | `CHECK IN ('VIREMENT','CHEQUE','ESPECES','TRAITE','LCN')` — **le timbre ne s'applique que si `ESPECES`** (versement en caisse, §16.2) | §4.4.4, §7.1 |
| mode_reglement_effectif | TEXT | oui | — | constaté à l'encaissement (M5, hors MVP) | §4.4.4 |
| total_ht_lignes_centimes | INTEGER | non | 0 | Σ HT lignes avant remises | §4.4.6 |
| total_remises_centimes | INTEGER | non | 0 | remises lignes + rabais global | §4.4.6 |
| net_commercial_ht_centimes | INTEGER | non | 0 | = total HT lignes − remises | §4.4.6 |
| retenue_garantie_centimes | INTEGER | non | 0 | base HT | §4.4.6 |
| total_ht_centimes | INTEGER | non | 0 | = net commercial − remb. avance − retenue | §4.4.6 |
| total_tva_centimes | INTEGER | non | 0 | 19 % | §4.4.6 |
| total_ttc_centimes | INTEGER | non | 0 | = total HT + TVA | §4.4.6 |
| droit_timbre_centimes | INTEGER | non | 0 | barème §4.7.3, **uniquement si règlement prévu en espèces** (§16.2) | §4.4.6, §7.1 |
| interets_moratoires_centimes | INTEGER | non | 0 | **montant saisi directement** sur une ND (pas de taux) 📌 | §16.3, §4.4.1 |
| net_a_payer_centimes | INTEGER | non | 0 | = total TTC + timbre | §4.4.6 |
| facture_origine_id | INTEGER | oui | — | `FK → factures.id` (pour AV) | §4.4.12 |
| motif_avoir | TEXT | oui | — | obligatoire pour AV | §4.4.12 |
| date_validation | TEXT | oui | — | horodatage attribution du numéro | §4.4.2 |
| nombre_impressions | INTEGER | non | 0 | comptage duplicata | §4.4.13 |
| exercice_id | INTEGER | oui | — | `FK → exercices.id` | §4.7.4 |

### 21. `lignes_facture` — Lignes de facture — §4.4.5, §4.4.6

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| facture_id | INTEGER | non | — | `FK → factures.id` | §4.4.5 |
| produit_id | INTEGER | oui | — | `FK → produits.id` — charge libellé, unité, PU | §4.4.5 |
| designation | TEXT | non | — | | §4.4.5 |
| unite | TEXT | oui | — | `CHECK IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')` | §4.4.5 |
| quantite_milliemes | INTEGER | non | 0 | | §4.4.5 |
| pu_ht_centimes | INTEGER | non | 0 | modifiable | §4.4.5 |
| remise_bps | INTEGER | non | 0 | remise ligne (%) en plus du rabais global | §4.4.4, §4.4.5 |
| montant_ht_brut_centimes | INTEGER | non | 0 | qte × PU avant remise | §4.4.6 |
| montant_ht_remise_centimes | INTEGER | non | 0 | après remise ligne | §4.4.6 |
| famille_id / sous_famille_id | INTEGER | oui | — | `FK` — héritées du produit | §4.4.5 |
| classification | TEXT | oui | — | `CHECK IN ('NOIR','BLANC','AUTRE')` — snapshot | §4.4.5 |

### 22. `bons_livraison` — Bons de livraison (activité VENTES) — §4.4.11

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le | TEXT | — | — | transversales | §10.2 |
| statut | TEXT | non | `EMIS` | `CHECK IN ('EMIS','FACTURE')` | §4.4.11 |
| numero_bl | TEXT | non | — | `UNIQUE` — `BL-YYYY-NNNNN` | §4.4.11 |
| date_livraison | TEXT | non | — | | §4.4.11 |
| affaire_id | INTEGER | oui | — | `FK → affaires.id` (optionnel, vente ponctuelle) | §4.4.11 |
| client_id | INTEGER | non | — | `FK → clients.id` | §4.4.11 |
| poids_pesee_kg | INTEGER | oui | — | référence pont-bascule | §4.4.11 |
| signature_client | INTEGER | non | 0 | `CHECK IN (0,1)` | §4.4.11 |
| facture_id | INTEGER | oui | — | `FK → factures.id` — renseigné quand « Facturé » | §4.4.11 |
| exercice_id | INTEGER | oui | — | `FK → exercices.id` | §4.7.4 |

### 23. `lignes_bon_livraison` — Lignes de BL — §4.4.11

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| bon_livraison_id | INTEGER | non | — | `FK → bons_livraison.id` | §4.4.11 |
| produit_id | INTEGER | oui | — | `FK → produits.id` | §4.4.11 |
| designation | TEXT | non | — | | §4.4.11 |
| unite | TEXT | oui | — | `CHECK IN ('T','M2','M3','FORFAIT','H','J','KM','U','L')` | §4.4.11 |
| quantite_milliemes | INTEGER | non | 0 | | §4.4.11 |
| pu_ht_centimes | INTEGER | non | 0 | | §4.4.11 |
| montant_ht_centimes | INTEGER | non | 0 | calculé | §10.3 |

### 24. `tarifs_historique` — Tarifs à trois niveaux — §4.3.3

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| produit_id | INTEGER | non | — | `FK → produits.id` | §4.3.3 |
| type_niveau | TEXT | non | — | `CHECK IN ('CATALOGUE','CLIENT','AFFAIRE')` | §4.3.3 |
| client_id | INTEGER | oui | — | `FK → clients.id` — requis si `CLIENT` | §4.3.3 |
| affaire_id | INTEGER | oui | — | `FK → affaires.id` — requis si `AFFAIRE` | §4.3.3 |
| prix_centimes | INTEGER | non | — | | §4.3.3 |
| debut_periode | TEXT | non | — | période englobante | §4.3.3 |
| fin_periode | TEXT | oui | — | NULL = ouverte | §4.3.3 |

Contrainte `CHECK` : cohérence niveau/client/affaire, et `fin_periode >= debut_periode`. Cascade `CATALOGUE` → `CLIENT` → `AFFAIRE` résolue en `domaine/tarifs.ts` (D12, J3).

### 25. `parametres` — Paramètres entreprise & divers — §4.7.3, §4.7.5, §4.7.6

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| cle | TEXT | non | — | `UNIQUE` — ex. `entreprise.denomination`, `entreprise.nif`, `timbre.seuil_max_especes_centimes` | §4.7.3 |
| valeur | TEXT | non | — | valeur sérialisée | §4.7.3 |
| description | TEXT | oui | — | | — |

### 26. `compteurs_numerotation` — Compteurs par document et année — §4.7.5, §4.4.2

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| code_document | TEXT | non | — | `AFG`, `AVT`, `DEV`, `BL`, `FA`, `ST`, `FS`, `AV`, `AC`, `ND`, `CLI`, `ENC`, `BCST`, `DCS`, `PAY-SST` | §4.7.5 |
| annee | INTEGER | non | — | séquence par année | §4.4.2 |
| affaire_id | INTEGER | oui | — | `FK → affaires.id` — pour ST numérotée par marché | §4.4.2 📌 |
| dernier_numero | INTEGER | non | 0 | | §4.4.2 |

`UNIQUE(code_document, annee, affaire_id)`. Le numéro est **incrémenté à la validation** (D11/`attribuerNumero`), jamais au brouillon — §4.4.2, §5.3.

### 27. `bareme_timbre` — Barème du droit de timbre — §4.7.3, §7.1

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| cree_le / modifie_le / supprime_le / statut | — | — | — | transversales | §10.2 |
| borne_min_ttc_centimes | INTEGER | non | 0 | tranche basse (inclus) | §4.7.3 |
| borne_max_ttc_centimes | INTEGER | oui | — | tranche haute (exclus) ; `NULL` = ouvert | §4.7.3 |
| taux_bps | INTEGER | non | — | `100` (1 %), `150` (1,5 %), `200` (2 %) | §4.7.3 |
| plancher_centimes | INTEGER | non | 500 | 5 DA | §4.7.3 |
| plafond_centimes | INTEGER | non | 1000000 | 10 000 DA | §4.7.3 |
| actif | INTEGER | non | 1 | `CHECK IN (0,1)` | §4.7.3 |

Valeurs de départ (tranchées par l'expert-comptable avant mise en production) : ≤ 300 DA exonéré ; 300–30 000 DA : 1 % ; 30 000–100 000 DA : 1,5 % ; > 100 000 DA : 2 %. Jamais de taux en dur dans le code — D10 (J1). **Déclencheur (confirmé comptable, 09/08/2026)** : timbre appliqué **uniquement** si le règlement prévu est un **versement en espèces** dans la caisse de l'entreprise ; seuil maximum des espèces paramétré (`parametres.timbre.seuil_max_especes_centimes`, défaut 1 000 000 DA). Chèque, traite, virement et LCN : **jamais de timbre**.

### 28. `journal_audit` — Journal d'audit (triggers) — §4.7.8, §5.3

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| table_affectee | TEXT | non | — | `clients`, `affaires`, `avenants`, `devis`, `factures`, `bons_livraison` | §4.7.8 |
| action | TEXT | non | — | `CHECK IN ('INSERT','UPDATE','DELETE')` | §4.7.8 |
| ligne_id | INTEGER | oui | — | id de la ligne audité | §4.7.8 |
| ancien_etat | TEXT | oui | — | JSON (avant) | §4.7.8 |
| nouvel_etat | TEXT | oui | — | JSON (après) | §4.7.8 |
| auteur | TEXT | non | `egto` | mono-utilisateur | §4.7.1 |
| date_action | TEXT | non | now | horodatage | §4.7.8 |

Lecture seule, rétention illimitée (volume faible). Export annuel possible pour archivage. Encaissements et cautions (ajoutés en Phase 2) devront recevoir leurs propres triggers d'audit.

### 29. `migrations_history` — Historique des migrations — plan-mvp M3 (J1)

| Colonne | Type | Null. | Défaut | Contrainte / note | § PRD |
|---|---|---|---|---|---|
| id | INTEGER | non | auto | PK auto | — |
| version | INTEGER | non | — | `UNIQUE` — aligné sur `PRAGMA user_version` | plan-mvp M3 |
| nom | TEXT | non | — | | plan-mvp M3 |
| appliquee_le | TEXT | non | now | horodatage | plan-mvp M3 |

---

## Entités du PRD §10.1 hors MVP (non créées en J0)

| Entité PRD | Statut | Phase cible | Justification |
|---|---|---|---|
| `DeclarationLigne` | hors MVP | Phase 2 | déclarations mensuelles hors périmètre M1 |
| ST (documents `SITUATION`) | hors MVP | Phase 2 | numérotées par marché, §4.4.7 |
| `Caution`, `RetenueGarantieEcheance` | hors MVP | Phase 2 | M11/M12 |
| `Encaissement`, `Facture↔Encaissement` | hors MVP | Phase 2 | M5 créances |
| `SousTraitant`, `BCST`, `DecompteSST` | hors MVP | Phase 2 | M8 |
| `Registre consultations` | hors MVP | Phase 3 | §4.1.13 |
| `Correspondance` | **MVP** | — | M1 (§4.1.11) — voir table 16 |
| `Attachement` | **MVP** | — | M1 (§4.1.13bis) — voir table 13 |
| `Reception` | **MVP** | — | M1 (§4.1.7bis) — voir table 15 |
