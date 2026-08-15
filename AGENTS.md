# AGENTS.md

Instructions pour les agents IA travaillant dans ce dépôt. **À lire en premier, à respecter en toutes circonstances.**

## 1. Commencer et finir par ETAT_SESSION.md

- **Au démarrage de toute session** : lire `ETAT_SESSION.md` en premier pour connaître l'état du projet.
- **En fin de session** : mettre à jour `ETAT_SESSION.md` en dernier (fait / décisions / bloqué / prochaine étape).
- Ne jamais travailler sur une partie du projet sans avoir lu son état courant.

## 2. Contexte projet

Dépôt de **spécification, pas encore de code** pour EGTO (gestion commerciale BTP, Oran — filiale GITRA).

- **Source de vérité** : `prd-cda.md` (PRD v2.1). Toute décision produit/fiscale/architecture y est tranchée — lire la section concernée avant d'agir, ne rien réinventer.
- **Plan d'exécution** : `docs/plan-mvp.md` (jalons J0→J6, backlog, chemin critique). Ne pas anticiper une phase ultérieure sans demande.
- **Contexte de travail des agents** : `CLAUDE.md` (équivalent pour Claude Code).

## 3. Stack technique

Electron + React + TypeScript + Vite · Tailwind · shadcn/ui (primitives seules) · TanStack Table (listes) · AG Grid (saisie de masse DQE/déclaration uniquement) · Zustand · TanStack Query · React Router · Recharts · `better-sqlite3-multiple-ciphers` · pdfmake · exceljs · date-fns · Zod · Vitest · Playwright · electron-builder (NSIS x64).

Dernières versions stables, **aucune version figée**. Revue trimestrielle des dépendances.

## 4. Conventions de code

- **Nommage 100 % français** (entités, tables, fichiers, fonctions, variables). Seules les APIs tierces gardent leur langue.
- **Montants en centimes (`INTEGER`), jamais en `REAL`** ; arrondi 2 décimales half-up ligne par ligne puis au total (§10.3).
- **Frontière stricte** : `domaine/` = TypeScript pur, aucun import externe (ni Electron, ni SQLite, ni React, ni fs). Interdit par garde-fou ESLint.
- SQL uniquement dans `electron/depots/`, en **requêtes préparées** (aucune concaténation).
- IPC **typé par domaine métier** (`affaires.create`, `factures.validate`…). Jamais de canal SQL générique.
- Le renderer ne connaît que `contrats/` : aucun calcul financier côté React.
- **Numéro attribué à la validation, jamais au brouillon** ; numéro verrouillé après attribution.
- **Pas de suppression physique** : suppression logique (`deleted_at`, `statut`).
- **Journal d'audit par triggers SQLite**, jamais par appels explicites.
- **Alerter plutôt que bloquer** (badges, bandeaux). Seules exceptions fiscales : numérotation, exercice clôturé.
- Interface et documents **en français exclusivement** ; dates `JJ/MM/AAAA` ; TVA 19 % verrouillée au niveau produit.
- Pas de commentaires inutiles dans le code.

### Décisions métier définitives (15-16/08/2026)

- **Encaissement réservé aux factures `ENVOYEE`** : tout encaissement (total **ou partiel**) est interdit hors statut `ENVOYEE` ; `BROUILLON`, `VALIDE`, `IMPRIMEE`, `PAYEE`, `ARCHIVEE` bloqués. Liste blanche `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT` dans `electron/depots/depot-encaissements.ts` ; un futur état `PARTIELLEMENT_PAYEE` devra rejoindre cette liste ; `PAYEE` atteint uniquement au solde nul.
- **Quatre modes de règlement effectifs uniquement** : `ESPECES`, `CHEQUE`, `VIREMENT_BANCAIRE`, `DEPOT_ESPECES_BANQUE` (`MODES_REGLEMENT_EFFECTIFS`, type `ModeReglementEffectif`) — `TRAITE`, `LCN` et `VIREMENT` sont **refusés** comme modes effectifs. Le mode effectif vit exclusivement dans `encaissements.mode_reglement_effectif` ; les anciennes colonnes de mode de règlement de `factures` (migration 1, CHECK 5 valeurs) sont **historiques/dépréciées** (aucune écriture, pas de migration 4 prévue).
- **Timbre manuel hors calcul TTC** : le pied de facture ne contient aucun droit de timbre — `total TTC = total HT + TVA` strictement. `calculerDroitTimbre` est **déprécié/isolé** (jamais appelé par le moteur) ; le timbre est **traité manuellement à l'encaissement** (statuts `A_VERIFIER`/`TRAITE`/`NON_APPLICABLE`, montant saisi nullable) ; `droit_timbre_centimes` jamais recalculé ; barème du timbre en table de paramétrage, jamais en dur ; aucune ligne de timbre dans le pied ni le PDF.
- **Rabais marché appliqué ligne par ligne** : net ligne = brut − remise ligne − rabais marché (base = **brut**, taux figé depuis l'affaire, bps) — plus de rabais global au pied (champ `rabais_global_bps` historique). Écart d'arrondi (≤ 2 centimes, signé) ajusté sur la **ligne éligible de montant net le plus élevé** (marchés publics, avec trace d'audit) ou via une ligne `AJUSTEMENT_ARRONDI` optionnelle (documents privés, jamais si écart nul) — isolé dans `calculerPiedFacture` (D9) et `calculerSoldeFacture` (D17).
- **NIS à 15 chiffres** : `MOTIF_NIS = /^\d{15}$/` (zéros initiaux conservés, champ texte) — ni plus, ni moins.
- **TAP supprimée** : définitivement supprimée (aucun remplacement TLS) — ne rien implémenter, ne pas réintroduire.

#### Limites assumées

- Anciennes colonnes de mode de règlement de `factures` **conservées pour compatibilité** (historique, dépréciées).
- État `PARTIELLEMENT_PAYEE` **non encore actif** (anticipé dans le code, inerte).
- Modes `TRAITE`, `LCN`, **carte**, **virement postal**, **paiement électronique** : **hors périmètre** (refusés comme modes effectifs).

## 5. Opérations interdites sans validation explicite

| Interdit | Raison |
|---|---|
| Committer, pousser, créer une PR | Demande explicite de l'utilisateur uniquement |
| Créer des tables/colonnes hors ERD J0 ou hors périmètre MVP | Le modèle de données est verrouillé en Jalon 0 |
| Implémenter les modules hors MVP (déclarations mensuelles, ST, révision de prix, rapport GITRA, M5, M6, M8, M11, M12) | PRD §3, plan §1.1 |
| Construire M4.9 (rapport mensuel) avant validation du template GITRA | Dépendance bloquante, PRD §16.1 |
| Durcir en dur un taux ou un barème (droit de timbre, pénalités) | Tout est paramétrable en base, PRD §4.7 |
| Changer le pied de facture (§4.4.6) ou l'ordre retenue/TVA | Décision 📌 du client, isolée dans `calculerPiedFacture` |
| Supprimer une ligne physiquement, modifier une déclaration validée ou une ST validée | Règles fiscales (régularisation sur la période suivante) |
| Désactiver une option de sécurité (`contextIsolation`, `sandbox`, CSP) ou exposer un canal IPC générique | PRD §5.5.2, §9 |
| Insérer un secret/clé dans un fichier versionné | Sécurité |
| Introduire une abstraction « au cas où » (multi-utilisateur, multi-taux…) | Mono-poste mono-utilisateur assumé, PRD §1 |
| Encaiser une facture hors statut `ENVOYEE` (total ou partiel) | Liste blanche `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT`, décision 15-16/08/2026 |
| Introduire `TRAITE`, `LCN`, `VIREMENT`, carte, virement postal ou paiement électronique comme mode de règlement effectif | 4 modes effectifs uniquement, décision 15-16/08/2026 |
| Écrire dans les anciennes colonnes de mode de règlement de `factures` ou prévoir une migration 4 | Colonnes historiques/dépréciées, mode effectif exclusivement dans `encaissements` |
| Recalculer le droit de timbre ou l'ajouter au pied/PDF | Timbre manuel à l'encaissement, TTC = HT + TVA strictement, décision 15-16/08/2026 |
| Réintroduire le rabais global au pied ou la TAP | Remplacés/annulés définitivement, décision 15-16/08/2026 |

En cas de doute : **poser la question, ne pas trancher seul.**

## 6. Méthode de travail attendue

1. Lire `ETAT_SESSION.md`, puis la section du PRD concernée, puis le jalon correspondant de `docs/plan-mvp.md`.
2. Vérifier le découpage en couches avant toute écriture (`domaine/` pur, dépôts en Main, renderer sans calcul).
3. Après toute modification de calcul financier : tester avec Vitest (10 cas types du pied de facture, timbre, numérotation).
4. Terminer une tâche par `npm run verifier` (typage + lint + garde architecturale + tests unitaires) — commande à créer au Jalon 1.
5. Mettre à jour `ETAT_SESSION.md` en dernier.
