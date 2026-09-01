
## Session : 02/09/2026 — Jalon 6 Phase 2 : paramétrage & sauvegardes automatiques (R7 + ordonnanceur) — complet et vérifié

Phase 2 du Jalon 6 (branche `jalon-6-prep`) : **R7 écran Paramétrage + sauvegarde quotidienne automatique responsable avec ordonnanceur**. Aucun commit. Pas de Phase 3 (restauration) — hors périmètre, `egto-admin-reset` existant gère la restauration ; aucune migration SQL ; `FORMAT_VERSION`/chiffrement inchangés ; aucun SQL dans le renderer.

### Fait — Étape 1 : paramètres de sauvegarde + seeds
- `electron/depots/depot-parametres.ts` : constantes `SAUVEGARDE_ACTIVEE`/`SAUVEGARDE_HORAIRE_QUOTIDIENNE`/`SAUVEGARDE_DESTINATION`/`SAUVEGARDE_DERNIERE_EXECUTION`/`SAUVEGARDE_DERNIERE_ERREUR` ; `HORAIRE_QUOTIDIENNE_PAR_DEFAUT='03:00'` ; `MOTIF_HORAIRE_QUOTIDIENNE = /^([01]\d|2[0-3]):([0-5]\d)$/` (2 groupes de capture) ; interface `ConfigSauvegarde` ; `lireConfigSauvegarde` (`activee !== '0'`, `horaire ?? défaut`, `destination ?? ''`) ; `configurerSauvegarde(base, dossierRepertoireBase, params)` — validations (horaire invalide, destination non existante, destination = répertoire de la base) + persistance `'1'`/`'0'`.
- `electron/db/seeds.ts` : `PARAMETRES_SAUVEGARDE` (3 clés en littéraux, évite le cycle d'import `depot-parametres.ts`↔`seeds.ts`) insérées dans la transaction après `PARAMETRES_ENTREPRISE`.

### Fait — Étape 2 : ordonnanceur de sauvegarde
- `electron/ordonnanceur-sauvegarde.ts` (NOUVEAU) : `INTERVALLE_VERIFICATION_MS=60*60*1000` ; `estSauvegardeDue` (pure — échéance locale à HH:MM, due si `maintenant >= échéance` ET (`derniereExecutionIso` null OU `Date(iso) < échéance`)) ; `creerOrdonnanceurSauvegarde` (base verrouillée → `{skippee:true}` ; destination vide/inexistante → `{skippee:true}` + log avertissement ; succès → rétention + persistance dernière exécution + log info « Sauvegarde quotidienne automatique réussie : <nom> » ; échec → erreur mémorisée + persistée + log erreur générique, jamais `resultat.erreur` (secret « enveloppe »)) ; `demarrer`/`arreter`/`derniereErreur` ; `creerIntervalleReel` setInterval/clearInterval ; `deps.creerIntervalle` **optionnel** (tests) — pas de wrapper `creerOrdonnanceurSauvegardeReel`. Rétention : `appliquerRetention` (30 quotidiennes / 12 mensuelles).

### Fait — Étape 3 : contrats + IPC
- `contrats/canaux.ts` (+ `configurer`/`etat`/`choisirDestination`), `contrats/sauvegarde.ts` (`ConfigurerSauvegardeParams`, `EtatSauvegardeVue`, `ResultatChoixDestination`), `contrats/index.ts` + `electron/construire-api-egto.ts` (3 méthodes).
- `electron/ipc/ipc-sauvegarde.ts` : signature étendue (5e param `ordonnanceur`) ; garde session « Session verrouillée : la base n'est pas ouverte. » sur les 3 handlers ; `configurer` (validations + `void ordonnanceur?.verifierEcheance()` = rattrapage au déverrouillage) ; `etat` (inclut `derniereErreur` : mémoire ordonnanceur sinon clé persistée) ; `choisirDestination` (`dialog.showOpenDialog({properties:['openDirectory','createDirectory']})`).
- `electron/ipc/ipc-session.ts` : 6e param optionnel `apresDeverrouillage`, `await apresDeverrouillage?.()` après déverrouillage. `electron/ipc/enregistrer-ipc.ts` : params optionnels `ordonnanceur`/`apresDeverrouillage` transmis.

### Fait — Étape 4 : `electron/main.ts`
- imports `ecrireLog`/`DOSSIER_JOURNAL`/`creerOrdonnanceurSauvegarde`/type `Base` ; `let ordonnanceur: OrdonnanceurSauvegarde | null` ; `apresDeverrouillage` → `void ordonnanceur?.verifierEcheance()` ; création dans `whenReady` (ecrireLog vers `join(userData, DOSSIER_JOURNAL)`) ; `demarrer()` après `creerFenetreDiagnostic()` ; `before-quit` → `ordonnanceur?.arreter()` en premier.

### Fait — Étape 5 : UI (R7)
- `src/ecrans/Sauvegardes.tsx` (NOUVEAU) : option activer, horaire (input `time`), planification manuelle, destination + « Parcourir… » + sélection dossier, « Enregistrer la configuration », bandeau erreur, bandeau « Échec de la dernière sauvegarde automatique : … », dernière exécution `JJ/MM/AAAA HH:MM` sinon « Aucune sauvegarde automatique effectuée. ».
- `src/ecrans/Parametrage.tsx` (NOUVEAU) : sections Entreprise / Sauvegardes / Journaux (`journal.lire({nombre:20})`) / Barème du timbre (libellé exact « Module désactivé — le droit de timbre est traité manuellement à l'encaissement (décision du 15/08/2026). ») / Exercices / Numérotation / Alertes (« disponible dans une version ultérieure »).
- `src/App.tsx` : route `/parametrage` ; `src/styles.css` : bloc « Paramétrage (J6 R7) » ajouté en fin de fichier.

### Fait — Étape 6 : tests (34 nouveaux)
- `tests/ordonnanceur-sauvegarde.test.ts` (16) : 8 `estSauvegardeDue` purs + 8 intégration réelle sur base temporaire chiffrée (horloge simulée, verrouillage, destination vide/inexistante, échec réel d'archivage, rattrapage au déverrouillage, pas de double exécution, désactivation, demarrer/arreter/redémarrer avec `creerIntervalle` simulé).
- `tests/depot-parametres-sauvegarde.test.ts` (8) : défauts seeds, rejets horaire (`25:00`/`3:05`/`10h30`) et destination (vide, inexistante, = répertoire de la base — `DOSSIER_BASE` créé en `beforeAll`), persistance, idempotence.
- `tests/ipc-sauvegarde.test.ts` (10) : 8 canaux enregistrés (aucun canal SQL), verrouillage, `etat` défauts, `nommer` opérationnel, `configurer` invalide/valide, erreur persistée, hooks ordonnanceur mockés.

### Vérifications — tout vert
- `npm run typecheck` ✓ · `npm run lint` ✓ · `npm run garde` (aucun import externe dans domaine/) ✓
- **`npm run verifier` : 53 fichiers / 1069 tests passés** ✓
- `npm run build` : out/main (index.js, egto-admin-reset.js, chunks/), out/preload, out/renderer ✓

### Bugs corrigés pendant le debug (échecs vitest ciblés)
1. **`MOTIF_HORAIRE_QUOTIDIENNE` sans groupe sur les minutes** → `correspondance[2]` = `undefined` → `Number` = NaN → `new Date(..., NaN, ...)` = Date invalide → `estSauvegardeDue` se comportait à l'envers (les 4 échecs ordonnanceur au premier passage). Corrigé : `/^([01]\d|2[0-3]):([0-5]\d)$/` (2 groupes).
2. **handler IPC `etat`** : throw synchrone propagé tel quel par le mock (pas de conversion en rejet comme `ipcMain.handle`) → handler marqué `async` (parité avec le comportement Electron).
3. **test `nommer`** : regex `/^egto-quotidienne-\d{8}-…/` invalide — le format réel porte des tirets : `egto-quotidienne-AAAA-MM-JJ-HHmm.zip` → `/^egto-quotidienne-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/`.

### Bloqué / points d'attention
- Rien de bloquant. Aucun commit/push/tag/fusion (conforme consigne).
- **Phase 3 (restauration) NON implémentée** : décision 28/08/2026 — la restauration s'appuie sur `egto-admin-reset` ; l'écran de restauration reste hors périmètre de cette session.
- 3 nouvelles clés de paramétrage en base (`parametres`) : `sauvegarde_activee`, `sauvegarde_horaire_quotidienne`, `sauvegarde_destination`.
- Timer actif toutes les heures (vérification d'échéance) — penser aux tests e2e/verrouillage éventuels.
- Ordinateur de dev en UTC+1 : comportement d'échéance local confirmé par debug (échéance 03:00, UTC+1).

---

## Session : 28/08/2026 — Jalon 6 Phase 1 : fondations environnement & packaging (branche jalon-6-prep)

Phase 1 du Jalon 6 sur branche `jalon-6-prep` (HEAD `4655af6`, aucun commit). Pas d'implémentation des phases 2-4 du Jalon 6 : aucune UI, aucun canal IPC `--recuperation`, aucun ordonnanceur, 0 migration SQL.

### Fait — DC-6 : nettoyage documentaire
- `ETAT_SESSION.md` : entrée de session en tête (celle-ci). Correction du libellé « Q30 — Import clients Excel » → **Q20**. Correction de la ligne J2 : « J2 ❌ non démarré » → **« J2 livré de fait »** (enveloppe DEK chiffrée, egto-admin-reset, tests chiffrement — Jalon 1 Phase 2-3), appellation **[PÉRIMÉ le 28/08/2026]**.
- Suppression par index (lignes corrompues : suppression regex impossible) de la note obsolète « genererFactureDepuisBons : la facture BROUILLON est créée avec numéro FA… trous de séquence à arbitrer » (ligne ~69/72). Restent 2 mentions historiques « trous de séquence » (l.83 bloc Arbitrage, l.115 Décisions) — conservées.
- `debug-launch.js` supprimé.
- `tests/base.integration.test.ts` : titre reformulé → « crée les 31 tables : 29 du schéma initial J0 + encaissements (migration 2) + contexte_audit (migration 3) ». Compte vérifié par grep : 29 CREATE TABLE dans `schema.sql` + 1 `encaissements` (002) + 1 `contexte_audit` (003) = 31.
- `docs/decisions-j0.md` §16.9 : décision 09/08/2026 **RÉVOQUÉE le 28/08/2026** (règle archivée) ; nouvelle décision : **format archive V3 auto-chiffrée, clé unique = DEK** (déballée via la phrase de récupération), phrase seule, pas de mot de passe ZIP séparé.
- `AGENTS.md` : ajout du point « **Restauration & sauvegarde (28/08/2026)** » dans Décisions métier définitives.

### Fait — DC-3 : polices PDF dans assets/fonts
- `assets/fonts/` créé : `Roboto-Regular.ttf` (157 208 o), `Roboto-Medium.ttf` (157 392 o), `NotoNaskhArabic-Regular.ttf` (307 592 o). `electron/pdf/polices/` supprimé.
- `electron/pdf/polices.ts` réécrit : API préservée (`POLICE_PAR_DEFAUT='Roboto'`, `POLICE_ARABE='NotoNaskhArabic'`, `PolicesPdfmake`, `chargerPolices()` singleton) + **`resoudreDossierFontes()` exporté** (4 candidats : `process.resourcesPath/assets/fonts` si défini, `__dirname/assets/fonts`, `__dirname/../assets/fonts`, `__dirname/../../assets/fonts` ; erreur listant les chemins essayés ; aucun `any`).
- `electron.vite.config.ts` : le plugin `copierAssetsSql` copie `assets/fonts` → `out/main/assets/fonts` (garde schema.sql + migrations).
- Chemins mis à jour dans `tests/pdf-generation.test.ts` (l.160-161) et `e2e/cohérence.spec.ts` (l.386-388). Grep : plus aucune référence au dossier `pdf/polices/` dans le code source.
- Build vérifié : `out/main/schema.sql` ✓, `out/main/migrations/{002_rabais-marche-et-encaissements,003_ajustement-arrondi-lignes}.sql` + README ✓, `out/main/assets/fonts/` (3 ttf) ✓, `electron/pdf/polices` inexistant ✓.

### Fait — DC-5 partiel : fondations packaging + sauvegarde de secours
- `electron-builder` installé en devDependency (**warnings allow-scripts** : argon2, electron-winstaller — scripts d'install non couverts ; better-sqlite3 allowScripts=false).
- `electron-builder.yml` créé : appId `com.egto.gestion-commerciale`, productName « EGTO - Gestion Commerciale », files `out/**/*` + package.json, asarUnpack `node_modules/better-sqlite3-multiple-ciphers/**/*`, **`node_modules/argon2/**/*` (ajouté : natif déverrouillage/sauvegarde)** et `out/main/egto-admin-reset.js`, extraResources `db/schema.sql`, `db/migrations`, `assets/fonts` (double sécu prod), win nsis x64, publisherName « E.G.T.O », icône commentée (**PO-1** en attente).
- Scripts package.json : `electron:build`, `dist`, `postinstall = electron-builder install-app-deps`.
- `electron/securite/recuperation.ts` (nouveau) : `masquerEntree` (saisie masquée via raw mode, exporté et désormais importé par `egto-admin-reset.ts` — une seule source de vérité) ; `executerExportSecours(dossierUserData, phrase)` → `deballerDekParPhrase` puis `archiverDonnees` manuelle avec `motDePasse = dek.toString('hex')` (archive V3 auto-chiffrée, décision 28/08), retour `{succes, chemin}` / `{succes, erreur}`.
- `electron/main.ts` : détection `process.argv.includes('--recuperation')` (constante `MODE_RECUPERATION`), dans `app.whenReady` → `executerRecuperation()` (masquerEntree → executerExportSecours → `app.exit(0)` succès / `app.exit(1)` échec), **aucune fenêtre ni IPC ni base ouverte en mode récupération** ; hook `EGTO_E2E`/`EGTO_E2E_USER_DATA_DIR` préservé. `egto-admin-reset.ts` : wrapper autonome conservé (2e input de build inchangé), `masquerEntree` local supprimé au profit de l'import.
- Vérification build : `out/main/egto-admin-reset.js` autonome (2,93 kB) + chunk `chunks/recuperation-*.js` généré. **Point de vigilance AC-1** : en app installée, `out/main/egto-admin-reset.js` est dépaqueté mais son chunk reste dans l'asar — l'exécution de l'utilitaire depuis l'app installée est à valider (non exercée ici). Usage nominal depuis le projet : OK.

### Fait — Tests ajoutés (Étapes 3, 4, 5, 6)
- `tests/polices.test.ts` (3 tests) : résolution racine Vitest (`assets/fonts`), priorité `process.resourcesPath` (mkdtemp + restauration propre), 3 entrées de `chargerPolices`. Correction TS nécessaire : `Omit<NodeJS.Process,'resourcesPath'>` pour autoriser `delete`.
- `tests/recuperation.test.ts` (4 tests) : archive manuelle créée chiffrée dans `sauvegardes/` (`egto-manuelle-*.zip`), phrase trimée acceptée, phrase fausse sans création, phrase vide/espaces refusée.
- `tests/depots-factures-bl-integration.test.ts` : **test rabais marché ligne par ligne** — affaire `MARCHE_PUBLIC` `rabais_marche_bps=1000`, 2 BL EMIS chacun 1 ligne (50 000 c brut) → `genererFactureDepuisBons` : lignes `rabais_marche_bps=1000`, brut 50 000 c, rabais 5 000 c, net 45 000 c ; pieds `total_ht_lignes=100 000`, `net_commercial=90 000`, TTC 107 100. (Valeurs ajustées auprès de l'exécution : le dépôt recalculé la ligne depuis PU×qté, le `montant_ht_centimes` du BL n'est pas repris ; `montant_ht_remise_centimes` stocke brut−remise, pas le montant de remise.)
- `electron/depots/depot-encaissements.ts` : **garde AV** — `type_document` ajouté au SELECT facture, erreur **« Un avoir ne peut pas être encaissé. »** déclenchée avant les contrôles de statut et d'insertion.
- `tests/depot-encaissements.test.ts` : nouveau describe « garde : un avoir ne peut jamais être encaissé » — refus sur AV quel que soit le statut (6 statuts) + démonstration que la machine autorise `ENVOYEE→ENCAISSER→PAYEE` (donc la garde dépôt est nécessaire pour empêcher l'avoir d'atteindre PAYEE puis ARCHIVEE).

### Vérifications (Étape 7) — tout vert
- `npm run typecheck` (node + web) ✓ · `npm run lint` ✓ · `npm run garde` (aucun import externe dans domaine/) ✓
- `npm run verifier` : **50 fichiers / 1035 tests passés** ✓
- `npm run build` : out/main (index.js, egto-admin-reset.js, chunks/), out/preload, out/renderer + ressources copiées ✓

### Bloqué / points d'attention
- Rien de bloquant.
- **AC-1** (ci-dessus) : chunk de `egto-admin-reset.js` vs. asar en app installée — à trancher en phase packaging complet.
- **PO-1** : icône Windows manquante (`icon` commenté dans electron-builder.yml).
- **31 vs 29 tables** : le test « 31 tables » est volontaire (schema J0 + migrations 002/003) ; la phrase « 29 tables » du PRD réfère au schéma initial uniquement.
- `allow-scripts` : argon2 & electron-winstaller non couverts — à revoir si un build final s'appuie sur leurs scripts d'install (npm install a fonctionné).
- Aucun commit/push/tag/fusion effectué (conforme consigne).

---

## Session : 24/08/2026 — Correctifs numérotation avoir (branche jalon-5-phase5)

**Jalon 5 complet (Phase 1 + 2 + 3 + 4 + 5).** Tous les livrables livrés et vérifiés. Corrections post-Phase 5 appliquées.

### Fait — Phase 5 : Tests E2E Playwright

**Q16 — Harnais Playwright** :
- playwright.config.ts (testDir: ./e2e, timeout: 60s, workers: 1, projects: chromium)
- e2e/helpers/fixture.ts : fixture Electron (lancement app, session auto-unlock, temp DB, cleanup)
- e2e/smoke.spec.ts : fumée (fenêtre, session, page Factures) — vert en 2.8s
- electron/main.ts : hook EGTO_E2E + EGTO_E2E_USER_DATA_DIR (34-35)
- package.json : script "test:e2e": "npx playwright test"
- Corrections infrastructure : electron.vite.config.ts (exclude pdfmake + copierAssetsSql plugin + copie polices), src/App.tsx (BrowserRouter → HashRouter)

**Q17 — Parcours devis→affaire→facture→PDF** (10 étapes, vert en 3.9s) :
- Client → devis + 2 lignes → ENVOYE (IPC) → conversion affaire → facture BROUILLON → 2 lignes → validation FA-2026-XXXX → PDF direct → aperçu UI → impression (VALIDE→IMPRIMEE, DUPLICATA) → Marquer envoyée → ENVOYEE
- **Correctifs production découverts** : signatures IPC lignes (4 handlers), affaire statut CHECK, pdfmake API singleton, fonts/polices copie build, JSX \uXXXX littéraux, ESLint artifacts

**Q18 — Parcours BL→facture groupée→PDF** (8 étapes, vert en 3.5s) :
- 2 BL EMIS avec lignes → génération facture groupée → lignes reprises + montants vérifiés → BL FACTURE/liés → validation FA → PDF (mentions légales vérifiées via décodage CMap) → rabais marché transféré (1000 bps)
- **Correctif rabais marché** : genererFactureDepuisBons lit désormais abais_marche_bps depuis ffaires via lireAffaireParId (au lieu de hardcoder 0)

**Q20 — Import clients Excel** (vert en 2.8s) :
- e2e/parcours-import.spec.ts : lecture Excel via IPC, validation avec anomalie, exécution, vérification lignes importées

**Cohérence — 8 vérifications transversales** (8 tests, tous verts) :
1. Aperçu PDF sans incrément nombreImpressions
2. Impression avec incrément (1→2) ; réimpression refusée (VALIDE requise)
3. DUPLICATA filigrane dès 2ème génération
4. Absence droit de timbre dans le pied (TTC = HT + TVA)
5. Absence timbre dans le PDF (décompression zlib + recherche CMap)
6. Avoir non encaissable (refus IPC + absence bouton UI)
7. Avoir non archivable (absence bouton + canal)
8. Polices PDF présentes et fonctionnelles

### Commandes obligatoires — 6/6 vertes

| # | Commande | Résultat |
|---|---|---|
| 1 | 	sc --noEmit -p tsconfig.node.json | ✅ Vert |
| 2 | 	sc --noEmit -p tsconfig.web.json | ✅ Vert |
| 3 | eslint . | ✅ Vert |
| 4 | 
ode scripts/garde-domaine.mjs | ✅ Vert |
| 5 | 
px vitest run | ✅ 48 fichiers / 1010 tests |
| 6 | 
px playwright test | ✅ 12 tests / 12 passés (48.9s) |

### Corrections production (Phase 5)

| Fichier | Correction |
|---|---|
| electron/depots/depot-bons-livraison.ts | BL query sélectionne ffaire_id, abais_marche_bps lu depuis ffaires via lireAffaireParId |
| electron/depots/ipc-devis.ts, ipc-factures.ts, ipc-bons-livraison.ts, ipc-avenants.ts | Signatures IPC lignes alignées sur contrat (payload unique au lieu de (event, parentId, data)) |
| electron/ipc/ipc-affaires.ts | Statut création affaire = SIGNE (au lieu de BROUILLON rejeté par CHECK) |
| electron/pdf/generer-pdf.ts | Réécrit sur API singleton officielle pdfmake (createPdf + getBuffer()) |
| electron.vite.config.ts | exclude pdfmake (ESM), plugin copie SQL + polices, ignore artifacts ESLint |
| src/App.tsx | BrowserRouter → HashRouter (compatibilité file:// Electron) |
| src/ecrans/FicheFacture.tsx, FicheDevis.tsx, Factures.tsx | JSX \uXXXX → accents réels |

### Notes techniques

- e2e/smoke.spec.ts : ses 2 blocages documentés (assets SQL + HashRouter) sont levés
- e2e/parcours-bl-facturation.spec.ts : ÉTAPE 7 documente la lacune rabais (désormais corrigée)
- e2e/cohérence.spec.ts : interface PiedCalculeE2E supprimée (lint fix)
- Tests UI R15-R18 (40 tests) : inchangés depuis Phase 4, tous verts

### Bloqué : rien

### Prochaine étape

- **Arbitrage** : trous de séquence FA sur factures issues de BL (numéro attribué au BROUILLON puis ré-attribué à la validation)
- **Jalon 6** : ne pas enchaîner sans validation utilisateur explicite de la Phase 5

---
# État de la session — EGTO Gestion Commerciale

## Dernière session : 23/08/2026 — Correctif transfert rabais marché BL → FA (branche jalon-5-phase5)

**Fait** :
- **`electron/depots/depot-bons-livraison.ts` — lacune Phase 2 corrigée** : `genererFactureDepuisBons` ne hardcode plus `rabais_marche_bps: 0`. La requête BL sélectionne désormais `affaire_id` (interface `BLValide` enrichie) ; le taux est lu depuis `affaires.rabais_marche_bps` via `lireAffaireParId` (import ajouté, réutilisé comme dans depot-factures) sur l'`affaire_id` du premier BL (tous les BL du lot partagent le même client, contrôle ligne 327 ; affaire absente/supprimée ou NULL → 0). Le taux est figé sur **chaque ligne** de la facture générée (décision 15/08/2026 §4.4.5bis).
- **`e2e/cohérence.spec.ts`** : suppression de l'interface inutilisée `PiedCalculeE2E` (lint KO documenté en session précédente, fichier d'une session parallèle — correction minimale type-only pour verdir `npm run verifier`, aucun comportement modifié).
- **Rebuild `out/` requis** : l'e2e lance le bundle compilé (`out/main`) — un `npm run build` est nécessaire après toute modification des sources avant `npx playwright test`.

**Vérifications** : `npx playwright test e2e/parcours-bl-facturation.spec.ts` **Q18 vert** (8 étapes, y compris ÉTAPE 7 rabais marché : 1000 bps repris depuis l'affaire, rabais ligne 5 000 000 c, net 45 000 000 c) ; `npx vitest run` 48 fichiers / 1010 tests verts ; `npm run verifier` vert (typecheck node+web, ESLint, garde-domaine, tests).

**Bloqué** : rien.

**Décisions** : aucune décision produit/fiscale. **Résolu** (24/08/2026) : `genererFactureDepuisBons` crée désormais en BROUILLON avec numero=NULL ; le compteur n'est consommé qu'à la validation.

**Prochaine étape** : relancer `npx playwright test e2e/smoke.spec.ts`.

## Session précédente : 23/08/2026 — Jalon 5 Phase 5 : e2e parcours BL → facture groupée (branche jalon-5-phase5)

**Fait** :
- **`e2e/parcours-bl-facturation.spec.ts` (NOUVEAU)** — Q18, parcours en 7 étapes via IPC (`window.egto.*`) + contrôles UI HashRouter : 2 BL EMIS avec lignes → `bonsLivraison.genererFacture` groupée → lignes reprises et montants nets vérifiés → BL passés FACTURE + liés (`facture_id`) → validation VALIDE + numéro `FA-AAAA-NNNN` → **PDF** (en-tête %PDF-, extraction textuelle réelle du buffer par décodage des CMap ToUnicode glyphe→caractère avec suivi de police courante `/Fn Tf` — les flux pdfmake sont en Identity-H/glyph IDs, une recherche de chaîne brute est impossible) vérifiant les **10 mentions légales** du pied + numéro + client + absence de « timbre », aperçu UI iframe — puis **ÉTAPE 7 rabais marché**.
- **Correctif production découvert par l'e2e** : `bonsLivraison.creer` écrivait `statut: 'BROUILLON'` + `numero_bl: ''` → violait le CHECK du schéma (`EMIS|FACTURE`) et l'UNIQUE de `numero_bl`. Nouveau `creerBonLivraisonEmis` dans `electron/depots/depot-bons-livraison.ts` (transaction : compteur `BL-AAAA-NNNN` via `lireCompteur`/`attribuerNumero`/`incrementerCompteur`, statut EMIS) branché dans `ipc-bons-livraison.ts`. Le schéma BL n'a pas d'état BROUILLON ; `modifier` ne permet pas le changement de statut (champs limités).
- **Vérifications** : `npm run typecheck` vert ; lint vert sur les fichiers modifiés ; `tests/depots-factures-bl-integration.test.ts` 20/20 ; `npx playwright test e2e/parcours-facturation.spec.ts` (Q17) toujours vert.

**Bloqué** :
- **ÉTAPE 7 du nouvel e2e échoue VOLONTAIREMENT** avec le message attendu : « BLOCAGE: genererFactureDepuisBons ne transfère pas rabais_marche_bps » — lacune documentée depuis la Phase 2 (`electron/depots/depot-bons-livraison.ts` hardcode `rabais_marche_bps: 0` au lieu de lire `affaires.rabais_marche_bps`). À corriger sur décision utilisateur (lecture du rabais depuis l'affaire + reprise ligne par ligne).
- Lint KO sur `e2e/cohérence.spec.ts` (type inutilisé) — fichier créé par une session parallèle le 23/08 soir, non touché.

**Décisions** : aucune décision produit/fiscale. Notes techniques : numérotation BL attribuée à la création (pas d'état BROUILLON dans le schéma BL) ; constat non corrigé signalé : `genererFactureDepuisBons` insère la facture BROUILLON **avec** numéro FA déjà attribué (compteur avancé), puis `validerFacture` ré-attribue un second numéro → trous de séquence à arbitrer.

**Prochaine étape** : arbitrage utilisateur sur le transfert `rabais_marche_bps` (débloque ÉTAPE 7), puis arbitrage sur la double attribution de numéro FA des factures issues de BL ; relancer `npx playwright test e2e/smoke.spec.ts`.

## Session précédente : 23/08/2026 — Jalon 5 Phase 5 : e2e parcours facturation (branche jalon-5-phase5)

**Fait** :
- **`e2e/parcours-facturation.spec.ts` (NOUVEAU)** — parcours complet en 10 étapes, vert en ~4 s : client → devis + ligne → ENVOYE → conversion affaire (dialog « Conversion » capturé) → facture BROUILLON (numéro null) → 2 lignes + pied calculé via IPC (HT 600 000 / TVA 114 000 / TTC 714 000 DA) → validation `FA-2026-XXXX` → PDF direct (%PDF-, statut VALIDE conservé, impressions = 0) → aperçu UI (« Générer le PDF » → iframe + Télécharger) → impression (VALIDE→IMPRIMEE, impressions = 1, bandeau DUPLICATA) → Marquer envoyée → ENVOYEE visible dans la liste.
- **Correctifs production découverts par l'e2e** :
  1. **Signatures IPC des lignes** : 4 handlers attendaient `(evenement, parentId, donnees)` alors que contrat/preload/renderer envoient un payload unique — alignés sur le contrat : `ipc-devis.ts` (devis.creerLigne), `ipc-factures.ts` (factures.creerLigne), `ipc-bons-livraison.ts` (bonsLivraison.creerLigne), `ipc-avenants.ts` (avenants.creerPoste).
  2. **`ipc-affaires.ts`** : le mapper de création forçait `statut: 'BROUILLON'`, rejeté par le CHECK du schéma (`SIGNE|ODS_RECU|…`) → `'SIGNE'`.
  3. **`electron/pdf/generer-pdf.ts` réécrit** : la classe `pdfmake/src/printer` de pdfmake 0.3 n'a **pas** de `createPdf` (seulement `createPdfKitDocument`) → bascule sur l'API singleton officielle (`import { createPdf, setFonts } from 'pdfmake'` + `getBuffer()`). Suppression de `electron/pdf/pdfmake-printer.d.ts` (déclaration obsolète et erronée). Les tests unitaires PDF ne couvraient que gabarits/polices — d'où la non-détection.
  4. **`electron.vite.config.ts`** : le plugin copie désormais aussi `electron/pdf/polices/` vers `out/main/polices` (en plus de schema.sql/migrations).
  5. **Bug JSX `\uXXXX` littéraux** : échappements unicode en position texte JSX rendus tels quels à l'écran (interface illisible) — corrigés avec accents réels dans `FicheFacture.tsx` («Générer le PDF», «Marquer envoyée», «← Retour», «Aucun PDF généré», «Chargement…»), `FicheDevis.tsx` (3 occurrences), `Factures.tsx` (1). Les échappements en chaînes JS (interprétés) sont inchangés.
  6. **Lint** : `eslint.config.js` ignore désormais `playwright-report/` + `test-results/` (+ `.gitignore`) — les artefacts Playwright faisaient échouer `npm run verifier` (2845 erreurs sur des bundles minifiés) ; `debug-launch.js` : `catch(e){}` → `catch {}`.

**Vérification** : `npm run verifier` vert (typecheck node+web, ESLint, garde-domaine, 48 fichiers / 1010 tests Vitest) ; `npx playwright test e2e/parcours-facturation.spec.ts` vert.

**Décisions** : aucune décision produit/fiscale. Notes techniques : unités e2e en majuscules (`'M3'`, `'U'`) conformes au CHECK du schéma ; format numéro `FA-2026-0001` ; `HashRouter` déjà en place dans `src/App.tsx` (compatible `file://`).

**Bloqué** : rien.

**Prochaine étape** : relancer `npx playwright test e2e/smoke.spec.ts` (ses 2 blocages documentés le 23/08 matin sont levés : assets SQL copiés par plugin, HashRouter présent), puis validation utilisateur avant tout commit.

## Session précédente : 23/08/2026 — Correctif lancement (pdfmake) + diagnostic e2e (branche jalon-5-phase5)

**Correctif appliqué** : `electron.vite.config.ts` — `externalizeDepsPlugin({ exclude: ['pdfmake'] })` dans la section **main uniquement** (preload inchangé). Cause : `pdfmake/src/printer.js` est en ESM et plantait en CJS (`ERR_MODULE_NOT_FOUND … PDFDocument`) quand externalisé. Build OK ; lancement vérifié sans crash (stderr vide).

**Diagnostic e2e (smoke.spec.ts toujours KO — 2 blocages résiduels découverts une fois le crash levé)** :
1. **Assets SQL absents de `out/main`** : `electron/db/migrations.ts` résout `schema.sql` + `migrations/*.sql` relativement au module compilé, mais electron-vite ne les copie pas → `ENOENT … out\main\schema.sql` au déverrouillage. Confirmé par copie manuelle dans `out/main` (artefact de build, non versionné — sera écrasé au prochain build) : le déverrouillage passe ensuite.
2. **BrowserRouter incompatible avec `file://`** : en build, le renderer est chargé via `loadFile` → `location.pathname = /C:/…/index.html`, aucune route ne matche (« No routes matched location »), `<main>` vide → l'écran Factures ne s'affiche jamais. Correction candidate (non appliquée, hors périmètre autorisé) : `HashRouter` ou `MemoryRouter` dans `src/App.tsx`.

**Fait** :
- `electron.vite.config.ts` : exclusion pdfmake de l'externalisation (section main) — 1 ligne.
- Scripts temporaires de diagnostic créés puis supprimés ; copies `schema.sql`/`migrations/` laissées dans `out/main` (artefacts).

**Décisions** : aucune décision produit/fiscale ; strictement infrastructure.

**Bloqué** : smoke e2e dépend des 2 correctifs ci-dessus (à valider par l'utilisateur avant application).

**Prochaine étape** : sur validation — copier les assets SQL vers `out/main` (plugin vite ou script) et basculer `src/App.tsx` sur un routeur compatible `file://` ; relancer `npx playwright test e2e/smoke.spec.ts`.

## Session précédente : 21/08/2026 — Jalon 5 Phase 4 (UI R15–R18 — complet)

**Jalon 5 Phase 1 + 2 + 3 + 4 complets.** 
npm run verifier (typecheck node+web + lint + garde-domaine + vitest) : **48 fichiers / 1010 tests, tout vert**.

### Fait — Jalon 5 Phase 4 : écrans UI R15–R18 (21/08/2026)

**R15 — Factures (liste + fiche) :**
- **src/ecrans/Factures.tsx** : liste avec colonnes N°/Type/Client/Affaire/Date/Échéance/Total TTC/Solde/Statut. Badges statut (BROUILLON/VALIDE/IMPRIMEE/ENVOYEE/PAYEE/ARCHIVEE) et type (FA/AC/AV). Filtrage par statut. Bouton « Nouvelle facture ».
- **src/ecrans/FicheFacture.tsx** : fiche avec 5 onglets — Général (champs lecture seule + boutons Valider/Imprimer/Envoyer/Avoir selon statut), Lignes (tableau + ajout ligne via modal), Pied (appel calculerPied + affichage totaux), Historique encaissements (liste ENC), Aperçu PDF (composant ApercuPdf).

**R16 — Aperçu PDF :**
- **src/composants/ApercuPdf.tsx** : composant réutilisable — reçoit un Uint8Array depuis genererPdf, crée un Blob → iframe inline pour visualisation. Boutons Télécharger et Imprimer.

**R17 — Bons de livraison (liste + fiche) :**
- **src/ecrans/BonsLivraison.tsx** : liste avec colonnes N° BL/Client/Affaire/Date livraison/Poids/Statut. Badges statut (EMIS/FACTURE). Sélection multiple + bouton « Générer facture » conditionné à toutEmis + au moins 2 BL.
- **src/ecrans/FicheBonLivraison.tsx** : fiche avec 2 onglets — Général et Lignes.

**R18 — Avoirs :**
- **src/ecrans/FicheAvoir.tsx** : assistant 3 étapes — sélection facture d’origine (VALIDE/IMPRIMEE/ENVOYEE) → mode (Total/Par lignes/Partiel) → détail (cases à cocher, quantité partielle bornée, motif ≥ 3 car., date AAAA-MM-JJ).

**Câblage :**
- **src/App.tsx** : 7 routes ajoutées (factures, factures/nouveau, factures/:id, factures/avoir/nouveau, bons-livraison, bons-livraison/nouveau, bons-livraison/:id).
- **src/Shell.tsx** : section Facturation (Factures + Bons de livraison).
- **src/styles.css** : classes badge (valide/imprimee/envoyee/payee/archivee/fa/ac/av).

**Tests UI R15–R18 (40 tests, 3 fichiers) :**
- tests/ui-factures.test.tsx (18 tests) : liste + fiche facture.
- tests/ui-bl.test.tsx (15 tests) : liste + fiche BL.
- tests/ui-avoirs.test.tsx (7 tests) : création avoir.

### Fait — Jalon 5 Phase 1 : types contrats + domaine avoir + tests purs

- **contrats/factures.ts** : StatutFacture, TypeDocumentFacture, FactureVue, LigneFactureVue, DonneesCreationFacture, DonneesCreationLigneFacture, DonneesAvoir
- **contrats/bons-livraison.ts** : StatutBonLivraisonVue, BonLivraisonVue, LigneBonLivraisonVue, DonneesCreationBonLivraison
- **contrats/canaux.ts** : 26 canaux IPC (16 factures + 10 BL)
- **domaine/avoir.ts** : genererLignesAvoir (3 modes), validerDonneesAvoir
- **tests/avoirs-domaine.test.ts** : 21 tests purs

### Fait — Jalon 5 Phase 2 : depots SQLite + handlers IPC

**Depots SQLite** (2 fichiers) :
- depot-factures.ts (829 lignes) : 17 fonctions (CRUD factures + lignes + validation + avoirs)
- depot-bons-livraison.ts (374 lignes) : 10 fonctions (CRUD BL + lignes + genererFacture)

**IPC Handlers** (2 fichiers) :
- ipc-factures.ts (330 lignes) : 16 handlers (CRUD + validation + avoirs + impression)
- ipc-bons-livraison.ts (229 lignes) : 10 handlers (CRUD + generation facture)

**Wiring** : enregistrer-ipc.ts + construire-api-egto.ts + contrats/index.ts mis a jour


**Corrections architecture** :
- domaine/pied-facture.ts : drapeau `autoriserQuantitesNegatives` sur `ParametresPiedFacture` (seul `creerAvoir` l'active) ; `verifierLigne` conditionne la validation selon le drapeau.
- depot-factures.ts : drapeau propage dans `ParametresMaterialisationFacture`, `materialiserLignesEtPiedFacture` et `calculerEcartCentimes` ; `creerAvoir` definit le drapeau a true.
- depot-bons-livraison.ts : remise_bps/rabais_marche_bps = 0 (colonnes absentes du schema BL — lacune documentee)
- tests/pied-facture.test.ts : split du test quantite negative en 2 — generique rejette, AV accepte via drapeau

**Tests integration** (20 tests) :
- tests/depots-factures-bl-integration.test.ts : factures CRUD, lignes, validation, avoirs, BL CRUD, BL lignes, generation facture

### Fait — Jalon 4 Phase 1 : domaine pur (D14, D15, conversion devis→affaire)

- **domaine/delais.ts (D14)** : jouterJoursDateIso, calculerDelaisAffaire (ODS, suspensions, reprises, prorogations, dépassement, % consommé, est_en_cours). Horloge injectée (Date), déterministe.
- **domaine/alertes.ts (D15)** : evaluerAlertesAffaire (5 catégories : DELAI_50/80/J-15/DEPASSE/SUSPENSION), evaluerAlertesDevis (VALIDITE_EXPIREE/BIENTOT_EXPIREE). Toutes informatives, jamais bloquantes.
- **domaine/conversion-devis.ts** : convertirDevisEnAffaire — valide statut ENVOYÉ, transite vers ACCEPTE, crée affaire CONTRAT_PRIVE/SIGNE, reprend lignes dans DQE (origine DEVIS, ligne_devis_id).
- **Tests Q8** : 23 tests délais. **Tests Q11** : 10 tests conversion.

### Fait — Jalon 4 Phase 2 : dépôts, contrats et IPC (affaires, devis, DQE, avenants, événements délai)

**Contrats** (types IPC, 5 fichiers) :
- contrats/affaires.ts : AffaireVue, DonneesCreationAffaire, DonneesModificationAffaire
- contrats/devis.ts : DevisVue, LigneDevisVue, DonneesCreationDevis, DonneesCreationLigneDevis
- contrats/postes-dqe.ts : PosteDqeVue, DonneesCreationPosteDqe, DonneesModificationPosteDqe
- contrats/avenants.ts : AvenantVue, AvenantPosteVue, DonneesCreationAvenant, DonneesCreationAvenantPoste
- contrats/evenements-delais.ts : EvenementDelaiVue, DonneesCreationEvenementDelai
- canaux.ts mis à jour : 5 groupes de canaux ajoutés (28 canaux IPC au total)
- index.ts mis à jour : ApiEgto enrichi + exports des 5 nouveaux types

**Dépôts SQLite** (requêtes préparées, 5 fichiers, 28 fonctions) :
- depot-affaires.ts : CRUD complet (creer, lire, lister, modifier, supprimer logiquement)
- depot-devis.ts : CRUD devis + lignes_devis (8 fonctions)
- depot-postes-dqe.ts : CRUD postes DQE par affaire
- depot-avenants.ts : CRUD avenants + avenants_postes (7 fonctions)
- depot-evenements-delais.ts : CRUD événements délai (3 fonctions)

**IPC Handlers** (5 fichiers, 26 handlers) :
- ipc-affaires.ts : lister, creer, lire, modifier, supprimer + mappers snake_case→camelCase
- ipc-devis.ts : CRUD devis + creerLigne, listerLignes, supprimerLigne (8 handlers)
- ipc-postes-dqe.ts : listerParAffaire, creer, modifier, supprimer
- ipc-avenants.ts : listerParAffaire, creer, modifierStatut, supprimer, creerPoste, listerPostes
- ipc-evenements-delais.ts : listerParAffaire, creer, supprimer

**Wiring** :
- enregistrer-ipc.ts : 5 enregistrerHandlers* ajoutés
- construire-api-egto.ts : 5 sections ajoutées (affaires, devis, postesDqe, avenants, evenementsDelais)

**Tests Q13** (intégration dépôts sur base chiffrée, 26 tests) :
- 	ests/depots-affaires-devis-integration.test.ts : affaires (7), devis (6), postes DQE (6), avenants (4), événements délai (4)

### Décisions — Jalon 4

- **Horloge injectée** pour calculerDelaisAffaire (tests déterministes).
- **Alertes = fonctions pures** : reçoivent données pré-calculées + dateCourante.
- **Conversion = fonction pure** : retourne données normalisées, dépôt IPC orchestre la transaction.
- **Dépendances domaine→domaine uniquement** : aucune extension externe dans domaine/.
- **Contrats partagés** : contrats/ au root (hors electron/), importés par main ET renderer.
- **Dépôts = requêtes préparées** : SQL dans electron/depots/, zero concaténation, suppression logique.
- **vitest.config.ts** : ajout `esbuild: { jsx: 'automatic' }` pour supporter JSX dans les fichiers `tests/` (hors `tsconfig.web.json` include).

### Fait — Jalon 4 Phase 3 : écrans UI (R11, R12, R13, R14)

**Screens R11 (Devis) :**
- `src/ecrans/Devis.tsx` (liste) : colonnes numeroDevis/clientId/dateDevis/dateValidite/statut/rabaisGlobalBps/affaireId, badge statut (BROUILLON/ENVOYE/ACCEPTE/REFUSE/EXPIRE), filtrage par statut, bouton « Nouveau devis ».
- `src/ecrans/FicheDevis.tsx` (fiche) : onglets Général/Lignes/Aperçu PDF. Lignes via `Liste` + modal `Formulaire` (ajout ligne). Bouton « Convertir en affaire » conditionné au statut ENVOYE (placeholder alert — IPC non encore câblé).

**Screens R12 (Affaires) :**
- `src/ecrans/Affaires.tsx` (liste) : colonnes reference/typeAffaire(clientId)/objet/statut/dateFin/délai restant. Badges type (MARCHE_PUBLIC/CONTRAT_PRIVE/BC), badges délai (ok/alerte/dépassé), calcul jours restants via dateFinRevisee/dateFinContractuelle.
- `src/ecrans/FicheAffaire.tsx` (fiche) : onglets Général/DQE/Avenants/Délais. Fiche complète avec tous les champs AffaireVue en lecture seule.

**Composant R13 (Grille DQE) :**
- `src/composants/GrilleDqe.tsx` : table HTML éditable (double-clic → inline edit), colonnes numéro/désignation/unite/quantité/PU HT/montant HT/famille/classification. Persistance via `window.egto.postesDqe.modifier()` au blur. Navigation Tab/Enter. Total HT en pied.

**Composants R14 (Délais + Alertes) :**
- `src/composants/SuiviDelais.tsx` : timeline événements délai (ODS/SUSPENSION/REPRISE/PROROGATION) avec badges couleur, dates, durée, motif, impact.
- `src/composants/BandeauAlertes.tsx` : bannière alertes niveaux CRITIQUE/AVERTISSEMENT/INFO, icônes, couleurs CSS customisées.

**CSS et routes :**
- `src/styles.css` : 160+ lignes ajoutées (bandeau alertes, badges statut/délai, timeline, grille DQE éditable).
- `src/App.tsx` : 4 routes ajoutées (`/devis`, `/devis/:id`, `/affaires`, `/affaires/:id`).
- AG Grid community installé (`ag-grid-community` + `@ag-grid-community/styles`). Utilisé comme fallback possible, la grille DQE actuelle est une table HTML éditable pour simplicité et fiabilité.

**Tests UI R11-R14 (59 tests, 4 fichiers) :**
- `tests/ui-devis.test.tsx` (19 tests) : liste Devis (filtrage, navigation, badges statut), fiche Devis (onglets Général/Lignes/Aperçu PDF, modal ajout ligne).
- `tests/ui-affaires.test.tsx` (17 tests) : liste Affaires (badges type/délai, navigation), fiche Affaire (onglets Général/DQE/Avenants/Délais, bandeau alertes).
- `tests/ui-dqe.test.tsx` (9 tests) : grille DQE (chargement, état vide, colonnes, total HT, double-clic édition, Enter sauvegarde, Escape annulation).
- `tests/ui-delais-alertes.test.tsx` (14 tests) : SuiviDelais (chargement, état vide, timeline, badges type, durée, impact), BandeauAlertes (CSS niveaux, icônes, absence sans alerte).

### Validation Phase 2 — rapport 20/08/2026

Les 8 points de validation ont été vérifiés et rapportés :
1. ETAT_SESSION.md corrigé (Phase 3 = PDF, pas UI)
2. Fichiers exacts avec statistiques de lignes
3. verifierEntier remplacé par drapeau autoriserQuantitesNegatives (architecture propre)
4. BL→FA rabais marché = lacune documentée (voir ci-dessous)
5. DonneesAvoirDepot = type de mapping SQL pur, validations 100% dans domaine/avoir.ts
6. Transactions vérifiées : validerFacture, creerAvoir, genererFactureDepuisBons — toutes avec base.transaction()
7. Tests : 69/69 ciblés verts ; typecheck+lint+garde-domaine verts ; 2 timeouts pré-existants Jalon 2
8. Aucun commit ni Phase 3 démarrés

### Fait — Jalon 5 Phase 3 : PDF (complet — 21/08/2026)

**Infrastructure PDF** :
- `electron/pdf/types.ts` (95 lignes) : interfaces `DonneesPdfFacture` (imbriquée `DonneesFacturePdf`), `DonneesPdfDevis`, `DonneesPdfBl`, `DonneesLignePdf`, `DonneesPiedPdf`, `DonneesClientPdf`, `DonneesAffairePdf`, `DonneesEntreprisePdf`
- `electron/pdf/polices.ts` (36 lignes) : singleton `chargerPolices()` — Roboto (pdfmake build) + NotoNaskhArabic (polices/)
- `electron/pdf/polices/NotoNaskhArabic-Regular.ttf` : police arabe (308 Ko)
- `electron/pdf/pdfmake-printer.d.ts` (12 lignes) : déclaration de type pour `pdfmake/src/printer`

**Gabarits A4** :
- `electron/pdf/gabarit-facture.ts` (298 lignes) : en-tête entreprise + numéro, infos document (date, échéance, BC), bloc client (raison sociale, NIF, adresse), bloc affaire, tableau lignes (7 colonnes : Désignation/Unité/Qté/PU HT/Remise/Rabais/Net HT), pied facture (HT lignes → remises → net commercial → retenue → HT → TVA → TTC → NET À PAYER), mentions légales footer, filigrane DUPLICATA SVG
- `electron/pdf/gabarit-devis.ts` (135 lignes) : DEVIS, tableau 5 colonnes, Total HT, mentions légales dans content, DUPLICATA
- `electron/pdf/gabarit-bl.ts` (134 lignes) : BON DE LIVRAISON, tableau 3 colonnes (Désignation/Unité/Qté), poids, mentions légales, DUPLICATA

**Orchestrateur** :
- `electron/pdf/generer-pdf.ts` (36 lignes) : `genererPdfBuffer()` singleton PdfPrinter, `genererPdfFacture/Devis/Bl` (wrappers)

**Handlers IPC (wiring)** :
- `electron/ipc/ipc-factures.ts` (510 lignes) : handlers `genererPdf` (lecture dépôt → mapping entreprise/client/affaire → gabarit → buffer) et `imprimer` (VALIDE→IMPRIMEE + increment impressions) — données lues depuis dépôt, zéro re-calcul

**Tests** :
- `tests/pdf-generation.test.ts` (197 lignes, 11 tests) :
  - A4 + content non vide
  - 10 mentions légales obligatoires (PRD §5.2)
  - Aucun timbre dans le document
  - Formatage montants HT/TVA/TTC/NET À PAYER
  - Police Roboto par défaut + NotoNaskhArabic
  - DUPLICATA absent/présent selon nombre_impressions
  - Désignations dans le tableau
  - Vérification : aucun calcul financier dans electron/pdf/

### Corrections appliquées lors de la revue Phase 3

1. ipc-factures.ts : `donneesPdf` restructurée avec `facture: {}` imbriqué (conforme `DonneesPdfFacture`)
2. ipc-factures.ts : `entreprise` corrigée (`raisonSociale`/`capital`/`telephone` au lieu de `denomination`/`capitalCentimes`)
3. ipc-factures.ts : `typeLigne` ajouté au mapping des lignes
4. ipc-factures.ts : `affaire: null` → `affaire: undefined` (conforme `DonneesAffairePdf | undefined`)
5. ipc-factures.ts : import `DonneesEntreprisePdf` ajouté
6. tests/pdf-generation.test.ts : `ENTREPRISE_DEFAUT` alignée avec `DonneesEntreprisePdf`
7. tests/pdf-generation.test.ts : `donneesDefaut()` restructurée avec `facture: {}` imbriqué + dates ISO
8. tests/pdf-generation.test.ts : `background()` appelé avec `ContextPageSize` complet (width/height/orientation)
9. tests/pdf-generation.test.ts : mentions légales testées via `gabarit.footer()` (le footer est une fonction, JSON.stringify la skip)

### Lacunes connues

- **BL→FA rabais marché** : `genererFactureDepuisBons` hardcode `rabais_marche_bps: 0` au lieu de lire `affaires.rabais_marche_bps`. Documenté en Phase 2, hors périmètre Phase 3.
- **Avoir PDF** : `gabarit-facture.ts` gère `typeDocument='AVOIR'` via `libelleTypeDocument()`, mais le handler `creerAvoir` n'appelle pas encore `genererPdf`. Le gabarit est prêt.

### En cours / bloqué

- **Rien de bloqué.** Phase 4 complète et validée. Diff à commiter sur jalon-5-phase4.

### Prochaine étape prévue

- **Jalon 5 Phase 5** : Tests e2e Playwright — ne pas enchaîner sans validation utilisateur explicite de la Phase 4.

## Historique — Phase E (clôturée le 16/08/2026, bilan refonte validé)

**Refonte 15-16/08/2026 clôturée et documentée.** `npm run verifier` : **22 fichiers / 541 tests, tout vert** (typecheck node+web, ESLint, garde-domaine, Vitest).

### Fait — Phase E (revue transversale de clôture, terminée le 16/08/2026)

- **Revue de cohérence domaine → dépôts → IPC → preload → renderer** (sous-agent explore) : **CONFORME** — 12 canaux IPC déclarés ↔ 12 handlers (correspondance 1-1 via `enregistrerHandlersIpc`, unique `ipcMain.handle`), aucun canal SQL générique, preload `window.egto` = API `ApiEgto` 100 % `CANAUX.*`, renderer `src/` minimal n'importe que `contrats/` et ne contient aucun calcul financier, `domaine/` TypeScript pur (double garde ESLint + scripts/garde-domaine.mjs), sécurité fenêtre (contextIsolation/nodeIntegration/sandbox/CSP/will-navigate/windowOpenHandler deny) testée. Nuances non bloquantes : SQL dans migrations.ts/seeds.ts (couche base), CSP dev `style-src 'unsafe-inline'` neutralisée en prod, `electron-builder.yml` absent, canaux affaires/factures absents (modules futurs).
- **Vérification des DoD J1→J4** : **J1 ✅ 5/5** (10 cas pied, timbre manuel testé, verifier vert 541 tests, tests sans Electron, base illisible sans clé testée l.229 base.integration) ; **J2 livré de fait** (enveloppe DEK chiffrée, egto-admin-reset, tests chiffrement — Jalon 1 Phase 2-3) ; appellation « ❌ non démarré » **[PÉRIMÉ le 28/08/2026]** ; **J3 ❌ fondations partielles** (dépôt clients + IPC, entités produit/tarif ; calculerScoreClient/resoudreTarif/import absents) ; **J4 ❌ fondations partielles** (entités commerciales + machines à états ; calculerDelaisAffaire/evaluerAlertes/convertirDevisEnAffaire/UI absents).
- **AGENTS.md mis à jour** : sous-section « Décisions métier définitives (15-16/08/2026) » (6 règles : encaissement ENVOYEE, 4 modes effectifs, timbre manuel hors TTC, rabais marché ligne par ligne, NIS 15, TAP supprimée) + « Limites assumées » + 5 lignes nouvelles dans la table des interdits.
- **Bilan final créé** : `docs/bilan-refonte-2026-08-16.md` — document de clôture complet (résumé exécutif, périmètre par phase, revue transversale, DoD J1-J4, règles définitives, limites assumées, vigilance/prochaines étapes, métriques 22 fichiers/541 tests, source du bilan).

### Décisions — Phase E

- Les 3 décisions du 16/08/2026 restent **définitives et closes** (pas de migration 4, blocage ENVOYEE, canal modifierTimbre périmètre timbre). La Phase E n'introduit **aucune nouvelle décision** — elle **clôt** la refonte.
- Le bilan final consigne les limites assumées : colonnes mode de règlement de `factures` historiques/dépréciées, `PARTIELLEMENT_PAYEE` inerte (anticipé), `TRAITE`/`LCN`/carte/virement postal/paiement électronique hors périmètre.

### En cours / bloqué

- **Rien de bloqué.** La refonte 15-16/08/2026 est **clôturée** et documentée. Note de vérification : `tests/ipc-encaissements.test.ts` compte **26 cas** (23 it + it.each×3) vs 25 indiqué précédemment — écart mineur signalé dans le bilan (non bloquant).

### Prochaine étape prévue

- **Jalon 2** (sécurité enveloppe, sauvegarde/restauration, coquille) — **ne pas enchaîner sans validation utilisateur explicite** du bilan final de la refonte. Rappel : template GITRA toujours en attente (§5.3 plan-mvp).

---

## Historique — Phase D (clôturée le 16/08/2026, 3 décisions utilisateur définitives)

**Corrections Phase D clôturées (3 décisions utilisateur 16/08/2026, définitives).** `npm run verifier` : **22 fichiers / 541 tests, tout vert** (typecheck node+web, ESLint, garde-domaine, Vitest).

### Fait — Corrections Phase D (3 décisions utilisateur, validées le 16/08/2026)

- **Pas de migration 4** : les colonnes de mode de règlement de `factures` (migration 1) restent **historiques/dépréciées** ; le mode effectif est exclusivement `encaissements.mode_reglement_effectif` (4 valeurs `ESPECES, CHEQUE, VIREMENT_BANCAIRE, DEPOT_ESPECES_BANQUE`).
- **Blocage des encaissements par statut de facture** (`electron/depots/depot-encaissements.ts`) : `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT = new Set(['ENVOYEE'])`, vérifié dans `creerEncaissement` avant validation/insertion (rollback transaction). Uniquement `ENVOYEE` encaissable, total **ou partiel** ; `BROUILLON`, `VALIDE`, `IMPRIMEE`, `PAYEE`, `ARCHIVEE` bloqués (message : « Encaissement interdit : la facture est au statut « X ». Seule une facture ENVOYEE peut être encaissée. ») ; un futur `PARTIELLEMENT_PAYEE` rejoindrait la liste blanche (commentaire l.~25).
- **Canal `encaissements.modifierTimbre`** (périmètre timbre uniquement) : ne modifie que `timbre_statut`, `montant_timbre_saisi_centimes`, `timbre_traite_le`, `timbre_traite_par`, `reference_timbre_ou_quittance`, `commentaire_timbre` — **jamais** le montant encaissé, le mode effectif, la facture, la date d'encaissement ni le numéro (correction = annulation + nouvel encaissement) ; ne touche pas `factures.statut` (une facture PAYEE reste PAYEE). Validation via `Encaissement.depuisDonnees` (contraintes conditionnelles du timbre), audit par le trigger UPDATE existant de la migration 2.
  - `electron/depots/depot-encaissements.ts` : `DonneesModificationTimbreEncaissement` + `modifierTraitementTimbreEncaissement(base, donnees)` — lecture existant → fusion → `Encaissement.depuisDonnees` → UPDATE 6 colonnes timbre + `modifie_le` → relit et retourne `EnregistrementEncaissement | null` (introuvable ou supprimé).
  - `electron/ipc/ipc-encaissements.ts` : `verifierDonneesModificationTimbreEncaissement` (forme), `mapperDonneesModificationVersDepot` (camelCase → snake, JJ/MM/AAAA → ISO via `versDateIso`), handler `encaissements.modifierTimbre` (→ dépôt → null ⇒ « Encaissement introuvable ou supprimé. » → vue).
  - `contrats/encaissements.ts` : `DonneesModificationTimbreEncaissementVue` (6 champs timbre + id, dates JJ/MM/AAAA UI) avec commentaire de périmètre ; `contrats/canaux.ts` : `encaissements.modifierTimbre` ; `contrats/index.ts` : `ApiEgto.encaissements.modifierEncaissement` + re-export ; `electron/construire-api-egto.ts` : branchement invoke.
  - **Tests** : `tests/depot-encaissements.test.ts` (22 → 39 cas : blocage 5 statuts via `it.each`, PAYEE rejeté avant anti-dépassement, modifierTimbre 11 cas dont champs financiers inchangés en base, introuvable/supprimé → null, audit UPDATE, PAYEE inchangé), `tests/ipc-encaissements.test.ts` (17 → 25 cas : chemin renderer → domaine → dépôt → vue, rejets forme + domaine, champs protégés inchangés en base, 4 canaux enregistrés), `tests/ipc-mapping.test.ts` (+4 : mappers aller, champs protégés absents de `DonneesModificationTimbreEncaissement`).

### Fait — Phase D, vague 3 (M22 contrats + IPC, terminée)

- **`contrats/encaissements.ts` (NOUVEAU)** : `ModeReglementEffectifVue` (4 littéraux), `StatutTimbreVue` (3), `EncaissementVue` (dates JJ/MM/AAAA), `DonneesCreationEncaissement`, montants en centimes.
- **`contrats/canaux.ts`** : canaux `encaissements.lister` / `encaissements.creer` / `encaissements.supprimer`.
- **`contrats/index.ts`** : `ApiEgto` + re-exports.
- **`electron/construire-api-egto.ts`** : assemblage de l'API IPC.
- **`electron/ipc/ipc-encaissements.ts` (NOUVEAU)** : `versDateIso`/`versDateAffichage` (le calendrier reste du domaine), `verifierDonneesCreationEncaissement`, mappers purs, handlers typés (payload → `Encaissement.depuisDonnees` → dépôt → vue) ; aucun canal SQL générique.
- **`electron/ipc/enregistrer-ipc.ts`** : enregistrement des handlers.
- **`tests/ipc-mapping.test.ts`** : conversions, mappers, garde `contrats/` sans import domaine étendue.
- **`tests/ipc-encaissements.test.ts` (NOUVEAU)** : 17 tests — chemin renderer → domaine → dépôt → vue, rejets modes/montants/dates/timbre/dépassement.

### Fait — Phase D, vague 2 (dépôt factures, matérialisation de l'écart)

- **`electron/depots/depot-factures.ts` (NOUVEAU)** : `materialiserLignesEtPiedFacture(base, factureId, parametres)` + `lireLignesFacture`. Premier consommateur production de `calculerPiedFacture`. Transaction better-sqlite3 : vérif facture → pied domaine (D9) → INSERT lignes commerciales (montants brut/remise/net ligne par ligne via `Montant`, identiques au domaine) → matérialisation de l'écart d'arrondi → UPDATE totaux factures → contexte d'audit vidé.
- **Écart d'arrondi** (|écart| ≤ 2, signé) déduit par double appel domaine : `pied(marchePublic=true).net_commercial − pied(marchePublic=false).net_commercial` — sans extension du domaine ni parse de la chaîne. Garde interne : `pied.ajustement_ecart_audit === null ⇔ écart === 0`.
- **Marché public** : écart porté par `UPDATE` sur la ligne éligible (argmax net parmi rabais > 0, égalité → première, même critère que le domaine), contexte_audit (motif « ajustement d'arrondi rabais marché ») → trigger audit (motif + delta). **Document privé** : ligne `AJUSTEMENT_ARRONDI` (net = écart signé, `type_ligne='AJUSTEMENT_ARRONDI'`, désignation « Ajustement d'arrondi », `unite 'U'`), jamais si écart nul.
- **Totaux (décision) : la ligne AJUSTEMENT_ARRONDI contribue au total.** Marché public et privé écart nul → totaux strictement du pied. Privé avec écart ≠ 0 → `net_commercial = pied.net_commercial + écart`, chaîne net → retenue → HT → TVA → TTC recalculée avec les arrondis du domaine (la ligne absorbe l'écart, la somme des nets = net commercial au centime). `droit_timbre_centimes` déprécié laissé tel quel (jamais recalculé), timbre jamais calculé.
- **Audit** : le dépôt n'écrit jamais dans `journal_audit` (grep de contrôle ✓) ; il renseigne `contexte_audit` (id=1) dans sa transaction avant l'INSERT/UPDATE de ligne puis le vide (vidé en fin de transaction).
- **`tests/depot-factures.test.ts` (NOUVEAU)** : 6 tests — marché +1 (cas 5, égalité → première, audit UPDATE ecart=+1), marché −1 (ligne de net le plus élevé = 2e, audit ecart=−1), marché écart nul (aucun ajustement, totaux = pied), privé +1 (ligne AJUSTEMENT_ARRONDI net=1, retenue 500 bps, chaîne recalculée 19/1/18/3/21), privé écart nul (aucune ligne d'ajustement), erreurs (facture introuvable, désignation vide, contexte laissé vide).

### Fait — Phase D, vague 1 (dépôt encaissements + migration 3)

- **Migration 3** `electron/db/migrations/003_ajustement-arrondi-lignes.sql` : `lignes_facture.type_ligne` (NULL / 'AJUSTEMENT_ARRONDI'), `journal_audit.motif` + `journal_audit.ecart_centimes`, table `contexte_audit` (id=1, motif, ecart_centimes), triggers `trg_lignes_facture_audit_insert/update/delete` (lecture du contexte → motif/écart ; ligne normale sans contexte → motif NULL) ; `electron/db/migrations.ts` `VERSION_MAXIMALE = 3` ; `tests/migration-3.test.ts` (13 tests) ; `tests/base.integration.test.ts` (user_version 3, 31 tables, 26 triggers) ; `tests/migration-2.test.ts` mis à jour (user_version 3, 3 entrées historique).
- **M21 — dépôt encaissements** `electron/depots/depot-encaissements.ts` (NOUVEAU) : `listerEncaissements`, `lireEncaissement`, `creerEncaissement` (transaction : validation `Encaissement.depuisDonnees`, anti-dépassement via `calculerSoldeFacture` en ceinture-bretelles avec triggers migration 2, numérotation ENC verrouillée via `lireCompteur`/`incrementerCompteur`/`attribuerNumero` + garde de séquence, passage PAYEE au solde nul via `transiter(machineEtatsFacture, statut, 'ENCAISSER')`), `supprimerEncaissement` (logique, ne retire jamais PAYEE — décision documentée) ; `domaine/identites.ts` : 'ENC' ajouté à `CODES_DOCUMENT` ; `tests/depot-encaissements.test.ts` (22 tests).

### Fait — Phase A (documentation, validée)

9 fichiers mis à jour : `prd-cda.md` v2.2 (nouveau §4.4.5bis, §4.4.6 sans timbre, §4.5.1, §4.7.3 déprécié, §5.2 = 10 mentions légales l.995, §16 l.10/11/12) ; `docs/decisions-j0.md` (§1.16.2 déprécié, §1.16.3 révoqué, §16.4 TAP, §16.5 NIS 15, nouveaux §1.16.10/11/12) ; `docs/plan-mvp.md` (DoD J1 réécrite, D17/M21/M22/Q28) ; `docs/dictionnaire-donnees.md` ; `docs/matrice-tracabilite-champs.md` ; `docs/wireframes/wireframe-fiche-facture.html` ; `design.md` ; `CLAUDE.md` ; `.opencode/agent/orchestrator.md`.

### Fait — Phase B (schéma, validée)

Migration 2 `electron/db/migrations/002_rabais-marche-et-encaissements.sql` : table `encaissements`, ALTER `affaires`/`lignes_facture` (rabais marché), index partiel `ux_encaissements_numero`, `ix_encaissements_facture`, triggers anti-dépassement + audit ; `encaissements.timbre_statut TEXT NOT NULL DEFAULT 'A_VERIFIER'` + 3 CHECK conditionnels renforcés. `electron/db/migrations.ts` `VERSION_MAXIMALE = 2` ; `tests/migration-2.test.ts` (20 tests) ; `tests/base.integration.test.ts` mis à jour. `schema.sql` (migration 1) intouché. **Correction appliquée directement dans la migration 2, sans migration 3.**

### Fait — Phase C (domaine, validée)

- **D9 `domaine/pied-facture.ts` réécrit** : base = **BRUT** (rabais marché = brut × bps), net ligne = brut − remise − rabais marché, **plus de timbre ni de rabais global**, `net_a_payer = total_ttc` ; écart d'arrondi (≤ 2 centimes) appliqué à la ligne éligible la plus élevée avec trace audit (marchés publics) / tracé sans ajustement (privé, `AJUSTEMENT_ARRONDI` optionnelle, jamais si écart nul) → champ `ajustement_ecart_audit`.
- **D17 `domaine/solde-facture.ts` (NOUVEAU)** : `calculerSoldeFacture` + `estSoldeNul`.
- **D10 `domaine/droit-timbre.ts`** : déprécié isolé (fonctions conservées, tests inchangés).
- **`domaine/entites-facturation.ts`** : `PiedFacture` sans `droit_timbre_centimes`, + `ajustement_ecart_audit` ; `mode_reglement_effectif` validé contre `MODES_REGLEMENT_EFFECTIFS` ; `DonneesFacture`/`FactureNormalise` conservent `droit_timbre_centimes` déprécié ; `LigneFacture` + champs rabais marché.
- **`domaine/identites.ts`** : `MOTIF_NIS = /^\d{15}$/`.
- **`domaine/entites-referentielles.ts`** : `MODES_REGLEMENT` (5 valeurs) conservé déprécié partiel ; **`MODES_REGLEMENT_EFFECTIFS` = ['ESPECES','CHEQUE','VIREMENT_BANCAIRE','DEPOT_ESPECES_BANQUE']** + type `ModeReglementEffectif`.
- **`domaine/encaissements.ts` (NOUVEAU)** : entité domaine avec validations (montant > 0, `verifierDateIso`, mode parmi les 4 effectifs, `timbre_statut` défaut `A_VERIFIER`, contraintes conditionnelles miroir des CHECK).
- **`domaine/machines-etats.ts`** : commentaire sur ENCAISSER→PAYEE (contrôle de solde externe, Phase D) ; transitions inchangées.
- **Tests** : `pied-facture.test.ts` (10 cas types réécrits), `solde-facture.test.ts`, `encaissements.test.ts` (41), `identites.test.ts` (NIS 15), `machines-etats.test.ts`, `entites-referentielles.test.ts` (NIS 11→15, l.14/74/~260).
- **Corrections doc** : `docs/dictionnaire-donnees.md` l.401 (base = brut explicite) et l.362/l.391 (total_remises, remise ligne sur brut, plus de rabais global) ; `docs/wireframes/wireframe-fiche-client.html` l.83 (NIS 15 chiffres).

### Décisions — Phase D

- **Migration 3** : `contexte_audit` pour audit par triggers uniquement (le dépôt n'écrit jamais dans `journal_audit`) ; motif/écart tracés.
- **Dépôt encaissements** : numéro ENC verrouillé à la création ; anti-dépassement double (domaine + triggers) ; PAYEE uniquement au solde nul via machine à états ; suppression logique **ne retire jamais PAYEE** (une facture payée reste payée, corrections = régularisations ultérieures).
- **Écart d'arrondi** : marché public → UPDATE de la ligne éligible (audit ligne cible/ancien montant/écart/motif) ; privé → `AJUSTEMENT_ARRONDI` si écart ≠ 0, jamais si nul ; la ligne d'ajustement contribue au total.
- **Dates** : ISO en base, JJ/MM/AAAA en UI (conversion du calendrier déléguée au domaine).
- **Montants en centimes entiers dans le contrat** ; conversion DA = affichage renderer.

### Décisions utilisateur 16/08/2026 (définitives — clôturent les 3 points d'arbitrage du bilan Phase D)

- **Pas de migration 4** : les anciennes colonnes de mode de règlement de `factures` (migration 1) restent historiques/dépréciées ; le mode effectif est exclusivement `encaissements.mode_reglement_effectif` (4 valeurs `ESPECES, CHEQUE, VIREMENT_BANCAIRE, DEPOT_ESPECES_BANQUE`). [arbitrage 1 clos]
- **Blocage des encaissements selon le statut de la facture** : autorisés uniquement sur une facture `ENVOYEE` (tout encaissement, même partiel) ; `BROUILLON`, `VALIDE`, `IMPRIMEE`, `PAYEE`, `ARCHIVEE` bloqués ; un éventuel futur `PARTIELLEMENT_PAYEE` rejoindrait la liste blanche. [arbitrage 2 clos]
- **Canal `modifierEncaissement` au périmètre timbre uniquement** : `encaissements.modifierTimbre` ne modifie que les 6 colonnes du timbre — jamais le montant encaissé, le mode effectif, la facture, la date d'encaissement ni le numéro (correction = annulation + nouvel encaissement) ; `factures.statut` intact (une facture PAYEE reste PAYEE). [arbitrage 3 clos]

---

## Historique — Jalon 1 (clôturé le 13/08/2026, DoD J1 ✅)

Socle & cœur de calcul livrés et vérifiés : 15 fichiers de tests, 358 tests verts, `npm run verifier` vert. Socle (M1/M10/D16/Q1/Q15/Q21/Q23), base chiffrée (M2-M5, SQLCipher, migration 1 = `schema.sql` J0 verrouillé), dépôts (M6/Q13), cœur de calcul D2-D11 (Montant, identités, référentiels, commerciales, facturation, machines à états, classification, D9/D10/D11), contrats & IPC (M7/M8/M9), revue indépendante CONFORME (zéro écart au centime).

### Décisions J1 conservées (historique)

- Base du rabais global = total HT avant remises lignes (arbitrage §4.4.6, **déprécié par la refonte 15/08**) ; bornes des tranches du timbre borneMin incluse / borneMax exclue ; machines à états sans `ARCHIVER_SANS_ENVOI` ; clé de dev provisoire `userData/egto.cle` (remplacée par l'enveloppe DEK en J2).
- Architecture : frontière unique `domaine/` (TypeScript pur) + garde-fou ESLint ; retenue de garantie avant TVA (décision 📌, isolée dans `calculerPiedFacture`) ; chiffrement SQLCipher + phrase de récupération, mot de passe ZIP distinct (09/08/2026, §16.9) ; numéro à la validation seule, TVA 19 %, timbre espèces seul (seuil 1 M DA paramétré) ; centimes INTEGER, suppression logique, audit par triggers, NIF/NIS TEXT sans CHECK, pas de table Avoirs, intérêts moratoires en montant direct.
- Décisions 09/08/2026 implémentées le 12/08/2026 : déclencheur timbre espèces confirmé comptable ; barème paramétrable (table `bareme_timbre`) ; intérêts moratoires = montant saisi ; propagation complète dans PRD/décisions/erd/dictionnaire/matrice/plan/CLAUDE/AGENTS/orchestrator.
- Ouverts J1 : valeurs du barème du timbre, convention des bornes de tranches, base du rabais global (tranché 15/08), libellés des familles seeds, statut de la TAP (supprimée 15/08), longueur NIS (tranché 15 : 15 chiffres).
