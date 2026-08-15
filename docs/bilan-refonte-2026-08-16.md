# Bilan de refonte — Cœur métier EGTO (15-16/08/2026)

Document de clôture de la refonte transversale du cœur métier (pied de facture, solde, encaissements, NIS, modes de règlement). Destiné à l'utilisateur et aux agents futurs. Phase E du plan — voir `docs/plan-mvp.md` et `ETAT_SESSION.md`.

---

## 1. Résumé exécutif

La refonte du cœur métier du 15-16/08/2026 est **validée**. Elle couvre, dans l'ordre : Phase A (documentation), Phase B (schéma), Phase C (domaine), Phase D (dépôts / IPC / contrats), corrections du 16/08 (3 décisions définitives), Phase E (revue transversale de clôture).

État de sortie :

- `npm run verifier` **vert en une commande** : **22 fichiers / 541 tests** (typecheck node+web, ESLint, garde-domaine, Vitest) — relancé intégralement le 16/08/2026.
- Chaîne **domaine → dépôts → IPC → preload → renderer complète et cohérente** pour le périmètre livré (socle J1) : 12 canaux IPC déclarés, 12 handlers correspondants (1-1), zéro canal SQL générique, renderer sans aucun calcul financier.
- Migrations 1→3 appliquées (`VERSION_MAXIMALE = 3`), base chiffrée (SQLCipher) illisible sans clé.
- Jalons J2, J3, J4 : **non atteints** (non démarré / fondations partielles) — voir §4.

---

## 2. Périmètre livré par phase

### Phase A — Documentation

9 fichiers mis à jour :

| Fichier | Contenu |
|---|---|
| `prd-cda.md` (v2.2, août 2026) | Nouveaux §4.4.5bis, §4.4.6 sans timbre, §4.5.1, §4.7.3 déprécié, §5.2 (10 mentions légales, l.995), annexe §16 sous-sections 10/11/12 |
| `docs/decisions-j0.md` | §1.16.2 déprécié, §1.16.3 révoqué, §16.4 TAP, §16.5 NIS 15, nouveaux §1.16.10/11/12 |
| `docs/plan-mvp.md` | DoD J1 réécrite, tâches D17/M21/M22/Q28, §5.2/§5.5 (décisions 15/08) |
| `docs/dictionnaire-donnees.md` | Base de calcul du rabais = brut, fin du rabais global (l.362/391/401) |
| `docs/matrice-tracabilite-champs.md` | Alignement champs ↔ colonnes/calculs |
| `docs/wireframes/wireframe-fiche-facture.html`, `wireframe-fiche-client.html` | NIS 15 chiffres, pied sans timbre |
| `design.md`, `CLAUDE.md`, `.opencode/agent/orchestrator.md` | Alignement des consignes agents |

### Phase B — Schéma (migration 2)

`electron/db/migrations/002_rabais-marche-et-encaissements.sql` :

- table `encaissements` (FK `facture_id`, index partiel `ux_encaissements_numero`, `ix_encaissements_facture`, triggers anti-dépassement + audit) ;
- ALTER `affaires` / `lignes_facture` (rabais marché) ;
- `encaissements.timbre_statut TEXT NOT NULL DEFAULT 'A_VERIFIER'` + 3 CHECK conditionnels renforcés ;
- `VERSION_MAXIMALE = 2` (puis 3 en Phase D). `schema.sql` (migration 1) intouché.

### Phase C — Domaine (`domaine/`)

- **D9 `domaine/pied-facture.ts` réécrit** : base = **brut** ; net ligne = brut − remise ligne − rabais marché (taux bps figé depuis l'affaire) ; **plus de timbre ni de rabais global** ; `net_a_payer = total_ttc` ; écart d'arrondi (≤ 2 centimes, signé) ajusté sur la **ligne éligible de montant net le plus élevé** (marchés publics, trace d'audit) ou via une ligne `AJUSTEMENT_ARRONDI` optionnelle (documents privés, jamais si écart nul) — champ `ajustement_ecart_audit`.
- **D17 `domaine/solde-facture.ts`** : `calculerSoldeFacture` + `estSoldeNul`.
- **D10 `domaine/droit-timbre.ts`** : déprécié/isolé (jamais appelé par le moteur, tests conservés).
- **`domaine/encaissements.ts`** : entité domaine, contraintes conditionnelles du timbre, montant > 0, mode parmi les 4 effectifs.
- **`domaine/identites.ts`** : `MOTIF_NIS = /^\d{15}$/` (identites.ts:9), `CODES_DOCUMENT` + `'ENC'` (identites.ts:1).
- **`domaine/entites-referentielles.ts`** : `MODES_REGLEMENT_EFFECTIFS = ['ESPECES','CHEQUE','VIREMENT_BANCAIRE','DEPOT_ESPECES_BANQUE']` (l.24-29) ; `MODES_REGLEMENT` (5 valeurs) conservé déprécié partiel.

### Phase D — Dépôts / IPC / contrats

- **Migration 3** `electron/db/migrations/003_ajustement-arrondi-lignes.sql` : `lignes_facture.type_ligne` (NULL / `'AJUSTEMENT_ARRONDI'`), `journal_audit.motif` + `journal_audit.ecart_centimes`, table `contexte_audit` (id=1), triggers d'audit `lignes_facture` INSERT/UPDATE/DELETE. `VERSION_MAXIMALE = 3` (`electron/db/migrations.ts:10`).
- **`electron/depots/depot-encaissements.ts`** : `creerEncaissement` (numérotation `ENC` verrouillée via compteurs + garde de séquence, anti-dépassement double domaine + triggers, `PAYEE` au solde nul via machine à états, suppression logique ne retire jamais `PAYEE`, **blocage hors `ENVOYEE`** via `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT = new Set(['ENVOYEE'])` l.25), `modifierTraitementTimbreEncaissement` (6 colonnes timbre seulement).
- **`electron/depots/depot-factures.ts`** : `materialiserLignesEtPiedFacture` — premier consommateur production de `calculerPiedFacture` ; écart d'arrondi matérialisé (UPDATE ligne éligible marché public / ligne `AJUSTEMENT_ARRONDI` privé, jamais si nul), audit par `contexte_audit`, jamais d'écriture directe dans `journal_audit`.
- **`contrats/encaissements.ts`** : `EncaissementVue` (dates JJ/MM/AAAA), `DonneesCreationEncaissement`, `DonneesModificationTimbreEncaissementVue`, 4 modes effectifs, 3 statuts de timbre.
- **`contrats/canaux.ts`** : 4 canaux encaissements (`lister`, `creer`, `supprimer`, `modifierTimbre`).
- **`electron/ipc/ipc-encaissements.ts`** : validation d'entrée → mappage (`versDateIso`/`versDateAffichage`) → domaine → dépôt → vue ; 4 handlers.
- **`electron/construire-api-egto.ts`** : assemblage de l'API preload.

Tests associés : `tests/depot-encaissements.test.ts` (39), `tests/depot-factures.test.ts` (6), `tests/ipc-encaissements.test.ts` (26), `tests/ipc-mapping.test.ts` (38), `tests/migration-3.test.ts` (13).

---

## 3. Revue transversale — cohérence domaine → dépôts → IPC → preload → renderer

| Couche | Résultat de la revue |
|---|---|
| `domaine/` | TypeScript pur, **21 imports relatifs**, aucun import externe. Double garde : règle ESLint custom + `scripts/garde-domaine.mjs` (vérifié par `tests/garde.test.ts`). |
| `contrats/` | **9 fichiers**, **zéro import depuis `domaine/`** (unions dupliquées volontairement), camelCase, montants en centimes entiers, dates JJ/MM/AAAA en UI. **12 canaux déclarés** dans `contrats/canaux.ts`. |
| IPC (`electron/ipc/`) | **12 handlers ↔ 12 canaux, correspondance 1-1 vérifiée**, tous enregistrés via `enregistrerHandlersIpc` (unique `ipcMain.handle` dans `electron/ipc/enregistrer-ipc.ts:17`), aucun canal SQL générique. Chemin systématique : validation → mappage → domaine → dépôt → vue. |
| Preload (`electron/preload.ts`) | Expose `window.egto` via `contextBridge` ; API `ApiEgto` (contrats/index.ts) **100 % `CANAUX.*`**, zéro `ipcRenderer.send/on`. Seul écart de nommage, délibéré : méthode `modifierEncaissement` mappée sur le canal `encaissements.modifierTimbre` (périmètre timbre, décision 16/08). |
| Renderer (`src/`) | Minimal (écran diagnostic J1 : `App.tsx`, `main.tsx`, `styles.css`, `egto.d.ts`), n'importe que `contrats/`, zéro calcul financier. `tsconfig.web.json` n'inclut que `src/**/*.ts(x)` + `contrats/**/*.ts`. |
| Sécurité | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` (`electron/main.ts:32-34`) ; CSP `default-src 'self'` en production (dev : `style-src 'unsafe-inline'` pour Vite + `connect-src ws://localhost:5173`, neutralisé en prod par `electron.vite.config.ts`) ; `will-navigate` + `setWindowOpenHandler` deny. Testé par `tests/durcissement.test.ts` (6). |

### Nuances remontées (non bloquantes)

- SQL dans `electron/db/migrations.ts` et `electron/db/seeds.ts` **hors `electron/depots/`** — couche base légitime, conforme au découpage §1.3 de `docs/plan-mvp.md` (la règle « SQL uniquement dans depots/ » vise le code applicatif).
- `electron-builder.yml` **absent** — packaging NSIS à venir (Jalon 6, Q22).
- Canaux `affaires.*` / `factures.*` **absents** — modules des jalons 4/5, pas un oubli de J1.

---

## 4. Vérification des DoD J1 → J4 (résultats de la revue)

### Jalon 1 — ✅ DoD satisfaite 5/5

| # | Critère (DoD J1) | Résultat |
|---|---|---|
| 1 | Les 10 cas types révisés du pied passent au centime : avec/sans retenue, rabais marché **ligne par ligne**, écarts d'arrondi +/− (ligne éligible la plus élevée pour les marchés publics), **aucun droit de timbre** (TTC = HT + TVA) | ✅ `tests/pied-facture.test.ts` (21) + `tests/depot-factures.test.ts` (6) |
| 2 | Timbre **plus calculé par le moteur** ; encaissement manuel testé (`A_VERIFIER`/`TRAITE`/`NON_APPLICABLE`, montant nullable, **solde nul requis pour `PAYEE`**, aucun dépassement, montant > 0) | ✅ `tests/encaissements.test.ts` (41), `tests/depot-encaissements.test.ts` (39), `tests/solde-facture.test.ts` (11) |
| 3 | `npm run verifier` vert en une commande | ✅ relancé 16/08/2026 : 22 fichiers / 541 tests |
| 4 | Tests de calcul sans Electron ni base réelle | ✅ fonctions pures de `domaine/`, harnais Vitest sans doublure de port |
| 5 | Base illisible par un client SQLite standard sans la clé | ✅ `tests/base.integration.test.ts` l.229 (`file is not a database`) |

### Jalon 2 — ❌ non satisfait (non démarré)

Acquis transversaux : fenêtre durcie (`contextIsolation`/`nodeIntegration`/`sandbox`) et IPC typés. **Absents** : `egto-admin-reset` (M13), sauvegarde/restauration (M14), journal rotatif (M15), verrouillage de session, coquille (R1-R7), contraste 4,5:1 et inspection du renderer. Placeholder seul : `electron/securite/README.md`.

### Jalon 3 — ❌ non satisfait (fondations partielles)

Livré : dépôt clients + IPC `clients.lister`/`clients.creer`, entités produit/tarif/famille dans `domaine/entites-referentielles.ts`. **Absents** : `calculerScoreClient` (D13) et `resoudreTarif` (D12) — référencés uniquement dans la documentation, import M13, aucune UI.

### Jalon 4 — ❌ non satisfait (fondations partielles)

Livré : entités commerciales (`Affaire`, `Devis`, `Avenant`, `PosteDqe` — `domaine/entites-commerciales.ts`, 56 tests) + machines à états (`domaine/machines-etats.ts`, 62 tests). **Absents** : `calculerDelaisAffaire` (D14), `evaluerAlertes` (D15), `convertirDevisEnAffaire`, aucun dépôt devis/affaires ni UI AG Grid.

---

## 5. Règles définitives de la refonte

Consignées dans `AGENTS.md` §4 (« Décisions métier définitives (15-16/08/2026) ») et §5 (opérations interdites). Résumé :

1. **Encaissement réservé aux factures `ENVOYEE`** (total ou partiel) ; `BROUILLON`, `VALIDE`, `IMPRIMEE`, `PAYEE`, `ARCHIVEE` bloqués — liste blanche `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT` dans `electron/depots/depot-encaissements.ts` ; `PAYEE` atteint uniquement au solde nul.
2. **Quatre modes de règlement effectifs uniquement** : `ESPECES`, `CHEQUE`, `VIREMENT_BANCAIRE`, `DEPOT_ESPECES_BANQUE` ; `TRAITE`, `LCN`, `VIREMENT` refusés comme modes effectifs. Mode effectif exclusivement dans `encaissements.mode_reglement_effectif` (colonnes de `factures` historiques).
3. **Timbre manuel hors calcul TTC** : `total TTC = total HT + TVA` strictement ; `calculerDroitTimbre` déprécié/isolé ; timbre traité à l'encaissement (`A_VERIFIER`/`TRAITE`/`NON_APPLICABLE`, montant saisi nullable) ; aucune ligne de timbre dans le pied ni le PDF.
4. **Rabais marché appliqué ligne par ligne** : net ligne = brut − remise ligne − rabais marché (base = **brut**, taux figé depuis l'affaire, bps) ; écart d'arrondi (≤ 2 centimes) sur la ligne éligible la plus élevée (marchés publics, trace d'audit) ou ligne `AJUSTEMENT_ARRONDI` optionnelle (documents privés, jamais si nul) — isolé dans `calculerPiedFacture` (D9) et `calculerSoldeFacture` (D17).
5. **NIS à 15 chiffres** : `MOTIF_NIS = /^\d{15}$/` (zéros initiaux conservés, champ texte).
6. **TAP supprimée définitivement** (aucun remplacement TLS) — ne pas réintroduire.

---

## 6. Limites assumées

Limites explicites, citées telles quelles dans `AGENTS.md` §4 :

- Anciennes colonnes de mode de règlement de `factures` **conservées pour compatibilité** (historique, dépréciées) — aucune écriture, **pas de migration 4 prévue**.
- État `PARTIELLEMENT_PAYEE` **non encore actif** (anticipé dans le code, inerte) — devra rejoindre `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT` lors de son activation.
- Modes `TRAITE`, `LCN`, **carte**, **virement postal**, **paiement électronique** : **hors périmètre** (refusés comme modes effectifs).

---

## 7. Points de vigilance / prochaines étapes

- **Prochain jalon prévu : Jalon 2** (sécurité enveloppe, sauvegarde/restauration, coquille) — **ne pas enchaîner sans validation utilisateur** (cf. `ETAT_SESSION.md`).
- **Dépendance bloquante** : template Excel GITRA du rapport mensuel (M4.9, Phase 2) toujours **en attente** — point de contrôle à chaque jalon (§5.3 de `docs/plan-mvp.md`).
- **Nuances techniques non bloquantes** à intégrer dans les jalons suivants : SQL de `electron/db/migrations.ts`/`seeds.ts` hors `depots/` (à acter explicitement dans les conventions), CSP de développement (`style-src 'unsafe-inline'`, neutralisé en prod), packaging `electron-builder.yml` (Jalon 6).

---

## 8. Métriques

- **Tests** : 22 fichiers, **541 tests verts**, tout vert au `npm run verifier` du 16/08/2026.

| Fichier de tests | Cas |
|---|---|
| `machines-etats.test.ts` | 62 |
| `entites-referentielles.test.ts` | 57 |
| `entites-commerciales.test.ts` | 56 |
| `encaissements.test.ts` | 41 |
| `depot-encaissements.test.ts` | 39 |
| `ipc-mapping.test.ts` | 38 |
| `droit-timbre.test.ts` | 28 |
| `numerotation.test.ts` | 27 |
| `identites.test.ts` | 26 |
| `ipc-encaissements.test.ts` | 26 |
| `montant.test.ts` | 23 |
| `pied-facture.test.ts` | 21 |
| `migration-2.test.ts` | 20 |
| `depots.integration.test.ts` | 16 |
| `migration-3.test.ts` | 13 |
| `base.integration.test.ts` | 11 |
| `solde-facture.test.ts` | 11 |
| `classification.test.ts` | 10 |
| `depot-factures.test.ts` | 6 |
| `durcissement.test.ts` | 6 |
| `garde.test.ts` | 2 |
| `smoke.test.ts` | 2 |
| **Total** | **541** |

- **Migrations** : 1 → 2 → 3 (`VERSION_MAXIMALE = 3` ; base testée à `user_version` 3, 31 tables, 26 triggers).
- **Canaux IPC** : **12** (diagnostic 1, paramètres 2, barème 1, exercices 1, familles 1, clients 2, encaissements 4) — 12 handlers en regard.
- **`npm run verifier`** : `typecheck` (node + web) → `lint` (ESLint) → `garde` (`scripts/garde-domaine.mjs`) → `test` (Vitest).

---

## Source du bilan

Revue de clôture du **16/08/2026** (Phase E), appuyée sur `ETAT_SESSION.md`, `AGENTS.md` §4, `docs/plan-mvp.md` et `docs/decisions-j0.md` ; **`npm run verifier` relancé intégralement** : 22 fichiers / 541 tests verts.

> Note de vérification : `tests/ipc-encaissements.test.ts` compte **26** cas à la relance (23 `it` + `it.each` × 3 modes), contre « 25 » indiqué dans `ETAT_SESSION.md` — écart relevé, non bloquant.
