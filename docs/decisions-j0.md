# Décisions Jalon 0 — points de schéma

Document de décision du cadrage, répondant au livrable « Décision documentée sur les points de l'annexe §16 qui touchent le schéma » (plan-mvp J0) et à la DoD associée. S'appuie sur [prd-cda.md](../prd-cda.md) §16, §9.1, §4.7.3.

## 1. Résolutions des points ouverts §16 (impact schéma)

### §16.1 — Template Excel GITRA
**Statut** : inexistant. Dépendance bloquante uniquement pour M4.9 (Phase 2) — **sans impact sur le schéma MVP**. La demande officielle (T0) est rédigée dans `demande-template-gitra.md` et adressée en J0. Point de contrôle à chaque jalon (§5.3 du plan).

### §16.2 — Droit de timbre : structure du barème
**Décision (15/08/2026 — chef du département Commercial) : l'ensemble du barème est DÉPRÉCIÉ.** La table `bareme_timbre` (tranches `borne_min_ttc_centimes` / `borne_max_ttc_centimes` / `taux_bps`, plancher, plafond) est **conservée pour compatibilité/historique** mais **retirée du chemin de calcul** : plus aucun calcul automatique de timbre dans le pied de facture (TTC = HT + TVA strictement). Écran R7 (Paramétrage) **désactivé** pour ce module. Aucun taux en dur dans le code.

**Valeurs de départ (seeds, J1/M5 — conservées en référence historique)** :

| Tranche TTC | Taux |
|---|---|
| ≤ 300 DA (30 000 centimes) | Exonéré (`taux_bps = 0`) |
| 300 – 30 000 DA | 1 % (`100`) |
| 30 000 – 100 000 DA | 1,5 % (`150`) |
| > 100 000 DA | 2 % (`200`) |
| Plancher | 5 DA (500 centimes) |
| Plafond | 10 000 DA (1 000 000 centimes) |

**Paramétrage (historique, décision client du 09/08/2026 révoquée)** : le barème était **éditable dans l'onglet Paramétrage (M7, écran R7)** — table `bareme_timbre` gérée en CRUD, jamais de taux en dur. **Révoqué le 15/08/2026** : l'écran R7 est désactivé pour le timbre, le CRUD est archivé.

**Déclencheur (historique, confirmé par le comptable le 09/08/2026 — RÉVOQUÉ le 15/08/2026)** : l'ancienne règle — le droit de timbre s'applique **uniquement** lorsque le client verse un montant en **espèces** directement dans la caisse de l'entreprise (`mode_reglement_prevu = 'ESPECES'`), seuil maximum des espèces **1 000 000 DA** paramétré (`parametres.timbre.seuil_max_especes_centimes`, défaut 100 000 000 centimes), **jamais** pour chèque, traite, virement ou LCN — est **archivée en référence historique**.

**Nouvelle décision (validée le 15/08/2026) — Droit de timbre : traitement manuel à l'encaissement**
- La facture ne calcule que total HT, TVA, total TTC (**TTC = HT + TVA strictement**) ; **NET À PAYER = total TTC** ; le timbre n'y figure plus et n'est **jamais** affiché (« timbre = 0 DA » interdit).
- Le timbre est **traité manuellement à l'encaissement** (caissier/comptable) : statuts `A_VERIFIER | TRAITE | NON_APPLICABLE`, montant saisi `montant_timbre_saisi_centimes` (nullable), traçabilité `timbre_traite_le`, `timbre_traite_par`, `reference_timbre_ou_quittance`, `commentaire_timbre`.
- Le montant de timbre saisi **ne modifie jamais** `total_ht`, la TVA ni `total_ttc` de la facture.
- **Distinction conservée** : espèces remises à la **caisse** (`ESPECES`) ≠ **dépôt d'espèces en banque** (`DEPOT_ESPECES_BANQUE`) — la vérification du timbre se fait à la remise en caisse.
- Anciens champs conservés pour l'historique : `factures.droit_timbre_centimes`, table `bareme_timbre`, clé `parametres.timbre.seuil_max_especes_centimes` — **dépréciés, hors du chemin de calcul**.

### §16.3 — Intérêts moratoires
**Décision (client, 09/08/2026)** : **pas de taux** — un champ `factures.interets_moratoires_centimes` permet de **saisir directement le montant** des intérêts lorsqu'il y a lieu, sur une **Note de Débit** (`type_document = 'ND'`) proposée en validation manuelle. Suppression de `affaires.taux_interets_moratoires_bps` et de la clé `taux.interets_moratoires_bps` de `parametres`. Les références réglementaires (§7.1) servent uniquement d'évaluation indicative du montant à saisir — sans calcul automatique.

### §16.4 — TAP
**Décision définitive (validée le 15/08/2026, chef du département Commercial)** : **TAP supprimée** (LF 2024, toujours abolie LF 2026), **aucune logique ni libellé conservé**, **aucun remplacement par la TLS**. Non implémentée dans le schéma — confirmation finale clôturée, plus aucune action en attente.

### §16.5 — Longueurs NIF / NIS
**Décision (validée le 15/08/2026)** : stockage `TEXT` **sans conversion numérique** :
- **NIF** : 15 chiffres attendus — index partiel d'unicité hors particuliers (`ux_clients_nif`).
- **NIS** : **texte de 15 chiffres exactement** (jamais converti en nombre — les zéros initiaux seraient perdus, ex. `001234567890123`), stocké dans un champ séparé du NIF/RC/AI, validé à la saisie sans recalcul automatique. **Fin de l'option 11/15** : la longueur est désormais verrouillée à 15 (11 chiffres refusés).

### §16.6 — Saisie déclaration avant le 5 — hors MVP (Phase 2), avertissement non bloquant.
### §16.7 — Pénalités de retard : **paramétrable par affaire** (`affaires.penalite_retard_*`), jamais de taux unique. 📌 §16.7.
### §16.8 — Retenue à la source sous-traitants — hors périmètre (M8, Phase 2).

### §16.9 — Mot de passe des exports ZIP
**Décision (validée le 09/08/2026)** : **mot de passe distinct du mot de passe applicatif**, conservé par la direction au même titre que la phrase de récupération (§9.1, §4.7.7). Non dérivé de la phrase de récupération. Sans impact schéma (politique de chiffrement, J2/M14).

### §16.10 — Rabais des marchés publics : application ligne par ligne
**Décision (validée le 15/08/2026, chef du département Commercial)** :
- Taux contractuel porté au niveau affaire/marché (`affaires.rabais_marche_bps`), **copié et figé sur chaque ligne** au moment de la facturation (`lignes_facture.rabais_marche_bps`, `montant_rabais_marche_centimes`). L'ancien champ `rabais_global_bps` reste pour l'historique.
- Formule par ligne : `montant_rabais_ligne = montant_brut_ligne × taux` ; `montant_net_ligne = montant_brut_ligne − montant_rabais_ligne` (arrondi 2 décimales half-up, ligne par ligne, §10.3). Total HT facture = somme des montants nets de ligne. La remise de ligne (`remise_bps`) reste distincte.
- **Règle d'arrondi** : écart ≤ 2 centimes (positif ou négatif) entre la somme des rabais de lignes et le rabais théorique sur le total :
  - **Marchés publics** : aucune ligne `AJUSTEMENT_ARRONDI` obligatoire — l'écart est appliqué à la **ligne éligible de montant le plus élevé**, avec **trace dans le journal d'audit** (motif « ajustement d'arrondi rabais marché »).
  - **Documents privés** : type de ligne `AJUSTEMENT_ARRONDI` **optionnel**, à la main (écart positif ou négatif).

### §16.11 — Encaissements : structure minimale
**Décision (validée le 15/08/2026, chef du département Commercial)** : pas de comptabilité complète — créances/relances/échéancier hors MVP (M5, Phase 2). Structure minimale :
- Une facture a **0..N encaissements** (FK directe `encaissements.facture_id`) ; passage à **`PAYEE` uniquement au solde nul** (Σ encaissements = montant dû). Affectation multi-factures (N—N) hors MVP.
- Champs : `facture_id`, `numero` (compteur `ENC`, §4.7.5), `montant_encaisse_centimes`, `date_encaissement`, `mode_reglement_effectif`, `timbre_statut`, `montant_timbre_saisi_centimes`, `timbre_traite_le`, `timbre_traite_par`, `reference_timbre_ou_quittance`, `commentaire_timbre` + colonnes transversales (`cree_le`, `modifie_le`, `supprime_le`, `statut`).
- **Modes de règlement effectif** : `VIREMENT`, `CHEQUE`, `ESPECES`, `TRAITE`, `LCN` + `VIREMENT_BANCAIRE`, `DEPOT_ESPECES_BANQUE` (dépôt espèces en banque ≠ espèces remises à la caisse).
- `date_encaissement` **stockée `AAAA-MM-JJ`** en base ; **affichée `JJ/MM/AAAA` uniquement dans l'interface**.
- **Contrôles** : `montant_encaisse_centimes > 0` ; un encaissement validé **ne dépasse jamais le montant dû** ; contraintes conditionnelles du statut timbre (`A_VERIFIER | TRAITE | NON_APPLICABLE`, §1.16.2).
- **Audit** : `encaissements` = table sensible, triggers INSERT/UPDATE/DELETE sur `journal_audit`.

### §16.12 — Familles du catalogue
**Décision (validée le 15/08/2026, chef du département Commercial)** : codes `VTE`, `LOC`, `REA`, `ST` ; libellés singuliers `Vente`, `Location`, `Réalisation`, `Sous-traitance`. **Une famille ne détermine ni TVA, ni timbre, ni rabais, ni prix** — elle organise le catalogue (§4.3.1) et alimente la classification Noir/Blanc/Autre (§4.3.4).

## 2. Décisions de schéma J0 (conventions et arbitrages)

### 2.1 Colonnes transversales en français
`id`, `cree_le`, `modifie_le`, `supprime_le`, `statut` — adaptation française de `created_at`/`updated_at`/`deleted_at` du PRD §10.2. **À reporter dans le PRD** (une ligne, §10.2) pour que la source de vérité ne contredise pas le schéma.

### 2.2 Unités de stockage (toutes en INTEGER)
| Type de donnée | Unité | Suffixe | Exemple |
|---|---|---|---|
| Montants | centimes | `_centimes` | 150 000 DA = `15000000` |
| Taux / pourcentages | points de base (1 = 0,01 %) | `_bps` | 1,5 % = `150`, 19 % = `1900` |
| Quantités | millièmes d'unité | `_milliemes` | 12,5 t = `12500` |
| Poids pesée | kg | `_kg` | |

Aucune colonne `REAL` (DoD vérifié par `pragma_table_info`). L'arrondi half-up ligne par ligne puis au total est l'affaire de `domaine/` (D2/D9), jamais du SQL.

### 2.3 Retenue de garantie : base HT, avant TVA
`affaires.retenue_garantie_bps` (défaut 500 = 5 %), surchargeable par affaire (§4.1.5 📌). Appliquée **sur le net commercial HT**, **avant la TVA**, conformément à la lettre de §4.4.6. Décision client isolée dans `domaine/calculerPiedFacture` (D9) — voir réserve §5.5 du plan.

### 2.4 Numéro attribué à la validation
`factures.numero` est `NULL` au brouillon, renseigné et **verrouillé** à la validation (D11, J1). Compteurs séquentiels par année dans `compteurs_numerotation` (avec `affaire_id` pour les ST par marché en Phase 2). Un brouillon supprimé ne consomme pas de numéro (règle dans D11, traçabilité audit).

### 2.5 Suppression logique
`supprime_le` (horodatage) plutôt qu'un statut « Supprimé » : les index d'unicité partiels (`ux_clients_nif`, `ux_factures_numero`, `ux_postes_dqe_affaire_numero`) portent `WHERE supprime_le IS NULL` pour laisser un même numéro être réutilisable après suppression logique. **À reporter dans le PRD** (§5.3 parle d'un statut « Supprimé »).

### 2.6 Audit par triggers
`journal_audit` alimenté exclusivement par des triggers SQLite (INSERT/UPDATE/DELETE) sur les 7 tables sensibles MVP : `clients`, `affaires`, `avenants`, `devis`, `factures`, `bons_livraison`, **`encaissements`** (table sensible depuis le 15/08/2026, §16.11). Cautions : triggers en Phase 2. Auteur fixe `egto` (mono-utilisateur, §4.7.1).

### 2.7 Classification Noir/Blanc/Autre
Table `classifications` (sous-famille → catégorie) **en paramétrage** (seeds), jamais en dur. La valeur est **figée en snapshot** sur les lignes (DQE, facture) au moment de la saisie (📌 §4.1.8) : un changement de mapping ne réécrit pas l'historique.

### 2.8 Avoirs
Pas de table dédiée : `factures.type_document = 'AV'` + `factures.facture_origine_id` + `motif_avoir` (obligatoire), lignes dans `lignes_facture` (§4.4.12). L'avoir partiel référence la facture d'origine.

### 2.9 Conversion devis → affaire
Traçabilité : `postes_dqe.ligne_devis_id` + `origine = 'DEVIS'`, et `devis.affaire_id` renseigné à la conversion (devis → « Accepté », §4.9.3).

### 2.10 Réceptions par lot
Table `receptions` (une ligne par lot/tranche, §4.1.7bis) — sert de base à l'échéancier des retenues en Phase 2 et à la date de libération (M12).

### 2.11 Statut initial de l'affaire
`affaires.statut` démarre à `SIGNE` : une affaire n'est jamais créée avant d'être gagnée (📌 §4.1.3 — les étapes pré-signature vivent sur le devis, pas sur l'affaire).

### 2.12 Intérêts moratoires : montant saisi, pas de taux
Champ `factures.interets_moratoires_centimes` sur les ND (décision §1.16.3) ; aucun taux en base ni par affaire.

## 3. Points laissés ouverts (sans impact schéma)
- Les points §16.2 (barème/declencheur du timbre), §16.4 (TAP), §16.5 (NIS) et les nouvelles décisions 15/08/2026 (§16.10–§16.12) sont **tranchés** — rien en attente côté timbre, TAP, NIS, rabais marché ou familles.
- Traduction dans le PRD des divergences 2.1 (colonnes transversales) et 2.5 (suppression logique) — les décisions du timbre manuel et des encaissements (15/08/2026) sont traduites dans le PRD (§4.4.4-§4.4.6, §4.7.3, §4.5.1, §7.1, §16).
