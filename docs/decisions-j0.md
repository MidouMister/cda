# Décisions Jalon 0 — points de schéma

Document de décision du cadrage, répondant au livrable « Décision documentée sur les points de l'annexe §16 qui touchent le schéma » (plan-mvp J0) et à la DoD associée. S'appuie sur [prd-cda.md](../prd-cda.md) §16, §9.1, §4.7.3.

## 1. Résolutions des points ouverts §16 (impact schéma)

### §16.1 — Template Excel GITRA
**Statut** : inexistant. Dépendance bloquante uniquement pour M4.9 (Phase 2) — **sans impact sur le schéma MVP**. La demande officielle (T0) est rédigée dans `demande-template-gitra.md` et adressée en J0. Point de contrôle à chaque jalon (§5.3 du plan).

### §16.2 — Droit de timbre : structure du barème
**Décision** : table `bareme_timbre` (tranches `borne_min_ttc_centimes` / `borne_max_ttc_centimes` / `taux_bps`, plancher, plafond), **jamais de taux en dur** dans le code.
**Valeurs de départ (seeds, J1/M5)** — à valider par l'expert-comptable avant mise en production :

| Tranche TTC | Taux |
|---|---|
| ≤ 300 DA (30 000 centimes) | Exonéré (`taux_bps = 0`) |
| 300 – 30 000 DA | 1 % (`100`) |
| 30 000 – 100 000 DA | 1,5 % (`150`) |
| > 100 000 DA | 2 % (`200`) |
| Plancher | 5 DA (500 centimes) |
| Plafond | 10 000 DA (1 000 000 centimes) |

**Paramétrage (décision client, 09/08/2026)** : le barème est **éditable dans l'onglet Paramétrage (M7, écran R7)** — table `bareme_timbre` gérée en CRUD, jamais de taux en dur.

**Déclencheur (confirmé par le comptable, 09/08/2026)** : le droit de timbre s'applique **uniquement** lorsque le client verse un montant en **espèces** directement dans la caisse de l'entreprise (`mode_reglement_prevu = 'ESPECES'`). Seuil maximum des espèces : **1 000 000 DA**, paramétré (`parametres.timbre.seuil_max_especes_centimes`, défaut 100 000 000 centimes). **Chèque, traite, virement et LCN : jamais de timbre.**

### §16.3 — Intérêts moratoires
**Décision (client, 09/08/2026)** : **pas de taux** — un champ `factures.interets_moratoires_centimes` permet de **saisir directement le montant** des intérêts lorsqu'il y a lieu, sur une **Note de Débit** (`type_document = 'ND'`) proposée en validation manuelle. Suppression de `affaires.taux_interets_moratoires_bps` et de la clé `taux.interets_moratoires_bps` de `parametres`. Les références réglementaires (§7.1) servent uniquement d'évaluation indicative du montant à saisir — sans calcul automatique.

### §16.4 — TAP
**Décision** : supprimée (LF 2024, toujours abolie LF 2026), **non implémentée** dans le schéma. Confirmation finale de l'expert-comptable recommandée — sans impact structurel.

### §16.5 — Longueurs NIF / NIS
**Décision** : stockage `TEXT` **sans CHECK de longueur**, validation au niveau application (`domaine/` D3) :
- **NIF** : 15 chiffres attendus — index partiel d'unicité hors particuliers (`ux_clients_nif`).
- **NIS** : 11 chiffres annoncés, parfois 15 selon les sources CNRC → accepte 11 ou 15, à confirmer sur documents réels EGTO.
Un `CHECK` de longueur serait prématuré tant que la source CNRC n'est pas vérifiée ; il sera ajouté par migration en J3 si confirmé.

### §16.6 — Saisie déclaration avant le 5 — hors MVP (Phase 2), avertissement non bloquant.
### §16.7 — Pénalités de retard : **paramétrable par affaire** (`affaires.penalite_retard_*`), jamais de taux unique. 📌 §16.7.
### §16.8 — Retenue à la source sous-traitants — hors périmètre (M8, Phase 2).

### §16.9 — Mot de passe des exports ZIP
**Décision (validée le 09/08/2026)** : **mot de passe distinct du mot de passe applicatif**, conservé par la direction au même titre que la phrase de récupération (§9.1, §4.7.7). Non dérivé de la phrase de récupération. Sans impact schéma (politique de chiffrement, J2/M14).

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
`journal_audit` alimenté exclusivement par des triggers SQLite (INSERT/UPDATE/DELETE) sur les 6 tables sensibles MVP : `clients`, `affaires`, `avenants`, `devis`, `factures`, `bons_livraison`. Encaissements et cautions recevront leurs triggers en Phase 2. Auteur fixe `egto` (mono-utilisateur, §4.7.1).

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
- **Valeurs du barème du timbre** (les tranches §1.16.2 restent des valeurs de départ) — validation de l'expert-comptable avant mise en production (déclencheur espèces et seuil 1 M DA, eux, sont **confirmés**).
- Longueur réelle du NIS (documents CNRC EGTO).
- Traduction dans le PRD des divergences 2.1 (colonnes transversales) et 2.5 (suppression logique) — la règle du timbre et les intérêts moratoires ont été traduits directement dans le PRD le 09/08/2026.
