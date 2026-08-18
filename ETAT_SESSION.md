# État de la session — EGTO Gestion Commerciale

## Dernière session : 19/08/2026 — Phase 4 UI (R5, R8, R9, R10)

**Phase 4 — couche UI Clients, Catalogue, Import.** `npm run verifier` (typecheck node+web + lint + garde-domaine + vitest) : **34 fichiers / 785 tests, tout vert**.

### Fait — Phase 4 : UI layer (R5, R8, R9, R10)

- **`@tanstack/react-table@8.21.3` ajouté** (dependency production) — tableaux generiques avec tri, filtre global, pagination, selection.
- **`src/composants/Liste.tsx` (NOUVEAU)** : composant tableau generique — colonnes via props `ColumnDef<T>`, barre de recherche, tri cliquable, selection par checkbox, pagination `«‹›»`, etat vide, `onLigneClique` pour navigation, `onSelectionChange`.
- **`src/composants/FicheAOnglets.tsx` (NOUVEAU)** : onglets tabulés — barre d'onglets avec etat actif (accent), navigation clavier `←→`, `role="tablist"` / `role="tab"`.
- **`src/composants/Formulaire.tsx` (NOUVEAU)** : formulaire vertical — champs texte/nombre/email/select/date/textarea, labels avec obligatoire `*`, messages d'erreur, bouton soumettre conditionnel.
- **`src/ecrans/Clients.tsx` (NOUVEAU, R8)** : ecran liste clients — `Liste<ClientVue>` avec colonnes code/raisonSociale/categorie/secteur/score(statut)+badge colore, navigation au clic, bouton "Nouveau client".
- **`src/ecrans/FicheClient.tsx` (NOUVEAU, R8)** : fiche client avec `FicheAOnglets` — 4 onglets : General (lecture + edition via `Formulaire`), Contacts (`Liste` + ajout modal), Interactions (`Liste` + ajout modal), Score (bouton Calculer → `calculerScore` IPC). `window.egto.clients.*` pour toutes les operations.
- **`src/ecrans/Catalogue.tsx` (NOUVEAU, R9)** : ecran liste produits — `Liste<ProduitVue>` avec resolution famille par `familles.lister()`, formatage centimes→DA, navigation au clic.
- **`src/ecrans/FicheProduit.tsx` (NOUVEAU, R9)** : fiche produit avec `FicheAOnglets` — 2 onglets : General (lecture + edition), Tarifs (`Liste<TarifVue>` + ajout modal). `window.egto.produits.*` + `window.egto.tarifs.*`.
- **`src/ecrans/Import.tsx` (NOUVEAU, R10)** : assistant 3 etapes — Etape 1 (selection type + fichier via `lireFichier`), Etape 2 (previsualisation `validerLignes`, badges erreurs), Etape 3 (rapport `executer` avec chiffres). Bouton importer conditionnel sur lignes valides.
- **`src/Shell.tsx` (MODIFIE)** : navigation `NavLink` react-router-dom au lieu de `<a href>`, import section "Données / Import", `<Outlet>` pour routes imbriquees.
- **`src/App.tsx` (MODIFIE)** : `BrowserRouter` + `Routes` — `/` → redirect `/clients`, `/clients`, `/clients/:id`, `/catalogue`, `/catalogue/:id`, `/import`. `AppInterne` interne avec session check.
- **`src/styles.css` (MODIFIE)** : 250+ lignes CSS — `.liste-container`, `.tableau`, `.onglet-barre`/`.onglet-actif`, `.formulaire`, `.champ-lecture`, `.badge-score-{a,b,c,d}`, `.modal-superposition`, `.import-barre-etapes`/`.import-etape-active`, `.bouton`/`.bouton-secondaire`, `.bandeau-erreur`. Toutes les couleurs via variables CSS, dark mode media query existant.
- **`src/__tests__/session-flow.test.tsx` (MODIFIE)** : mock etendu avec `window.egto.clients` (lister, contacts, interactions) pour eviter crash au chargement Client.

### Décisions — Phase 4

- **`@tanstack/react-table` v8** (pas v9) : v9 a une API complètement differente (hooks differently named, TableFeatures constraint). v8 stable et documentee.
- **Pas de calcul financier dans React** : formatage centimes→DA fait dans les colonnes de la table, aucun montant calcule dans le renderer.
- **Navigation via `NavLink`** : etat actif gere par react-router-dom (pas de state local pour la sidebar).
- **Modales simples** : overlay fixe + conteneur card, pas de library externe (shadcn/ui prevu en Jalon 2).

### En cours / bloqué

- **Rien de bloqué.** Phase 4 UI terminee.

### Prochaine étape prévue

- **Jalon 2** (securite enveloppe, sauvegarde/restauration, coquille) — ou poursuite modules commerciaux.

### Fait — Couche produits + sous-familles + classifications (complète)

- **`electron/depots/depot-produits.ts` (NOUVEAU)** : CRUD produits — `creerProduit`, `lireProduitParId`, `listerProduits`, `modifierProduit` (UPDATE dynamique), `supprimerLogiquementProduit`, `listerProduitsParFamille`. Types : `Unite`, `TypeTarification`, `DonneesCreationProduit`, `Produit`, `DonneesPartiellesProduit`.
- **`electron/depots/depot-sous-familles.ts` (NOUVEAU)** : CRUD sous-familles — `creerSousFamille`, `lireSousFamilleParId`, `listerSousFamilles`, `listerSousFamillesParFamille`, `supprimerLogiquementSousFamille`.
- **`electron/depots/depot-classifications.ts` (NOUVEAU)** : CRUD classifications — `creerClassification`, `lireClassificationParSousFamille`, `listerClassifications`, `modifierClassification`. Type : `CategorieClassification`.
- **`contrats/produits.ts` (NOUVEAU)** : types Vue — `ProduitVue`, `DonneesCreationProduitVue`, `SousFamilleVue`, `DonneesCreationSousFamilleVue`, `ClassificationVue`, `DonneesCreationClassificationVue`.
- **`contrats/canaux.ts` (ÉTENDU)** : 13 canaux — produits.{creer,lister,lire,modifier,supprimer,listerParFamille} + sousFamilles.{creer,lister,listerParFamille,supprimer} + classifications.{creer,lister,modifier}.
- **`contrats/index.ts` (ÉTENDU)** : `ApiEgto.produits` + `ApiEgto.sousFamilles` + `ApiEgto.classifications` + re-exports types.
- **`electron/ipc/ipc-produits.ts` (NOUVEAU)** : 13 handlers IPC — validate, map, call depot. Mappers : `mapperProduitEnVue`, `mapperSousFamilleEnVue`, `mapperClassificationEnVue`, `mapperDonneesCreationProduitVersDepot`, `mapperDonneesCreationSousFamilleVersDepot`, `mapperDonneesCreationClassificationVersDepot`.
- **`electron/ipc/enregistrer-ipc.ts` (ÉTENDU)** : import + enregistrement `enregistrerHandlersProduits`.
- **`electron/construire-api-egto.ts` (ÉTENDU)** : 13 méthodes produits/sousFamilles/classifications branchées via `ipcRenderer.invoke`.

### Fait — Extension clients (contacts + scoring)

- **`electron/depots/depot-contacts.ts` (NOUVEAU)** : table `contacts` — `creerContact`, `lireContactParId`, `listerContactsParClient`, `modifierContact` (UPDATE dynamique avec MAPPAGE fixe), `supprimerLogiquementContact`.
- **`electron/depots/depot-interactions.ts` (NOUVEAU)** : table `interactions` — `creerInteraction` (validation type par `TYPES_INTERACTION`), `lireInteractionParId`, `listerInteractionsParClient`, `supprimerLogiquementInteraction`.
- **`electron/depots/depot-clients.ts` (ÉTENDU)** : ajout `modifierClient` (UPDATE dynamique, MAPPAGE fixe, pas de concaténation de colonnes utilisateur).
- **`contrats/clients-extension.ts` (NOUVEAU)** : types Vue — `ContactVue`, `DonneesCreationContactVue`, `InteractionVue`, `DonneesCreationInteractionVue`, `ResultatScoreVue`.
- **`contrats/canaux.ts` (ÉTENDU)** : 11 canaux clients ajoutés — `lire`, `modifier`, `supprimer`, `creerContact`, `listerContacts`, `modifierContact`, `supprimerContact`, `creerInteraction`, `listerInteractions`, `supprimerInteraction`, `calculerScore`.
- **`contrats/index.ts` (ÉTENDU)** : `ApiEgto.clients` étendu (11 méthodes) + re-exports types contacts/interactions/score.
- **`electron/ipc/ipc-clients.ts` (ÉTENDU)** : 3 handlers ajoutés — `lire`, `modifier`, `supprimer`.
- **`electron/ipc/ipc-clients-extension.ts` (NOUVEAU)** : 8 handlers IPC — contacts CRUD, interactions CRUD, `calculerScore` (lit client → appelle `calculerScoreClient` du domaine → écrit `score_client` + `derniere_evaluation_score_le` → retourne `ResultatScoreVue`).
- **`electron/ipc/enregistrer-ipc.ts` (ÉTENDU)** : import + enregistrement `enregistrerHandlersClientsExtension` + import manquant `enregistrerHandlersTarifs`/`enregistrerHandlersProduits` (correction pré-existante).
- **`electron/construire-api-egto.ts` (ÉTENDU)** : 11 méthodes clients branchées via `ipcRenderer.invoke`.

### Décisions

- **Scores placeholders** : `caAnnuelTtcCentimes`, `nombreAffairesAnnee`, `nombreFacturesEnRetard12Mois`, `creanceImpayeeEcheancePlus90Jours` = 0/false — calculés en J4/J5.
- **MAPPAGE fixe** : `modifierClient` et `modifierContact` utilisent un dictionnaire de colonnes fixes (pas de concaténation SQL), validé par les garde-fous de types.

### En cours / bloqué

- **Rien de bloqué.**

### Prochaine étape prévue

- **Jalon 2** (sécurité enveloppe, sauvegarde/restauration, coquille) — ou poursuite modules commerciaux.

### Fait — V2b-1 IPC session + contrats + main.ts bascule (validé par l'utilisateur)

- **`contrats/canaux.ts`** : 6 canaux session (`session.etat`, `session.premierDemarrage`, `session.deverrouiller`, `session.verrouiller`, `session.changerMotDePasse`, `session.activite`).
- **`contrats/index.ts`** : `ApiEgto.session` interface.
- **`electron/ipc/ipc-session.ts`** : 6 handlers IPC session + `etat.base = base` (bug fix).
- **`electron/ipc/enregistrer-ipc.ts`** : enregistrement conditionnel session.
- **`electron/construire-api-egto.ts`** : branche session conditionnelle.
- **`electron/main.ts`** : `depsSession` câblée, `DUREE_INACTIVITE_MS=30min` exporté, `before-quit` verrouille la session.
- **`electron/securite/session.ts`** : `deverrouiller` retourne `{ dekCourante, base }` (bug fix).
- **Tests (36 tests)** : `tests/ipc-session.test.ts` (27) + `tests/integration-demarrage.test.ts` (9). `npm run verifier` : 28 fichiers / 640 tests, tout vert.

### Fait — V2b-2 Coquille UI + Shell + tests (sous-agent code, branche jalon-2-securite)

- **Dépendances ajoutées** : `react-router-dom`, `zustand` (prod) ; `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` (dev).
- **`vitest.config.ts`** : `include` étendu à `**/*.test.tsx` (`environmentMatchGlobs` retiré — Vitest 4.x utilise le directive `// @vitest-environment jsdom` par fichier).
- **`tsconfig.vitest.json`** (NOUVEAU) : étend `tsconfig.web.json`, types `node` + `vitest/globals`.
- **`src/styles.css`** (RÉÉCRIT) : tokens de design (40+ variables CSS light/dark), styles de base, styles session, shell grid layout, media query impression.
- **`src/etat-session.ts`** (NOUVEAU) : store Zustand (`EcranSession` type, 5 états, actions).
- **`src/ecrans/Connexion.tsx`** (NOUVEAU) : formulaire connexion, appel `deverrouiller` IPC, gestion erreurs.
- **`src/ecrans/PremierDemarrage.tsx`** (NOUVEAU) : flux 2 étapes (création mdp + affichage phrase), support impression.
- **`src/Shell.tsx`** (NOUVEAU) : grille CSS (sidebar 250px + topbar 52px + statusbar 26px + contenu), navigation 6 sections.
- **`src/App.tsx`** (RÉÉCRIT) : routage session (`chargement` → `premier_demarrage`/`connexion` → `app`).
- **`src/egto.d.ts`** (NOUVEAU) : type ambiant `window.egto`.
- **`index.html`** : titre « EGTO — Gestion Commerciale ».
- **`src/__tests__/session-flow.test.tsx`** (NOUVEAU) : 12 tests UI jsdom — flux initial (3), PremierDemarrage (5), Connexion (2), règles sécurité (2).
- **`npm run verifier` final** : **29 fichiers / 652 tests, tout vert**.

### Décisions — V2b-1

- **Bug fix `etat.base`** : `deverrouiller` stocke la base dans `etat` pour les handlers IPC.
- **`DUREE_INACTIVITE_MS` exporté** depuis `main.ts` pour les tests d'intégration.
- **Enregistrement conditionnel** : handlers session enregistrés uniquement si `api.session` existe.

### Décisions — V2b-2

- **`environmentMatchGlobs` retiré** (Vitest 4.x) : directive `// @vitest-environment jsdom` par fichier suffit.
- **Zustand pour la session** : store externe au React tree, jamais en stockage persistant (règle sécurité).
- **Tests UI sans localStorage** : assertions DOM plutôt que localStorage (absent dans jsdom).

### Fait — V2b-3 Sauvegarde chiffrée + journal rotatif (17/08/2026)

- **electron/journal.ts (NOUVEAU)** : journal applicatif rotatif — écriture avec formaterEntree (niveau UPPERCASE), rotation tous les 5 Mo (5 fichiers max), lecteur lireLogs (tri par horodatage décroissant, filtre par niveau), export exporterLogs, détection de secrets dans les messages/stacks (estSecretDansLog), TAILLE_MAXIMO_OCTETS = 5 242 880, ROTATIONS_MAX = 5. Types : EntreeJournal, NiveauJournal ('erreur' | 'avertissement' | 'info'), ResultatEcriture, ResultatLecture, ResultatExportJournal.
- **electron/sauvegarde.ts (REWRITTEN)** : export de données chiffré — architecture en 2 couches : ZIP standard (archiver v7) + chiffrement AES-256-GCM du fichier entier via crypto natif. En-tête v2 (83 octets) : MAGIC(4) + version(2) + KDF_ALGO_ID(1) + KDF_PARAMS_LEN(2) + KDF_PARAMS memoryCost/timeCost/parallelism/hashLength(14) + salt(32) + IV(12) + tag(16). Argon2id (memoryCost 65536, timeCost 3, parallelism 4, hashLength 32) au lieu de PBKDF2. `chiffrer`/`dechiffrer` devenues `async` (retournent `Promise<Buffer>`). Compatibilité arrière v1 (PBKDF2 legacy 100K) pour lecture. `deballerDekParPhrase` câblée (type async, validation DEK 32 octets, validation phrase incorrecte). Protection anti-path-traversal (vérification `relative()` sur chaque entrée ZIP avant extraction). Mot de passe obligatoire (rejet chaîne vide dans `archiverDonnees`). Fonctions : archiverDonnees, restaurerDonnees (déchiffrement + extraction ZIP + validation manifeste + phrase de récupération), listerSauvegardes, appliquerRetention (30 quotidiennes + 12 mensuelles), nommerSauvegarde, chiffrer/dechiffrer (exportés pour tests). DEK et utilisateur.bin jamais inclus dans l'archive.
- **contrats/sauvegarde.ts (NOUVEAU)** : types IPC — SauvegardeVue, ArchiverDonneesParams, ResultatExportSauvegarde, RestaurerDonneesParams, ResultatRestaurationSauvegarde, RetentionParams, ResultatRetention.
- **contrats/journal.ts (NOUVEAU)** : types IPC — EntreeJournalVue, EcrireLogParams, LireLogsParams, ResultatLectureJournal, ResultatExportJournal.
- **contrats/canaux.ts** : 8 nouveaux canaux — sauvegarde.{archiver,restaurer,lister,appliquerRetention,nommer} + journal.{ecrire,lire,exporter}.
- **contrats/index.ts** : ApiEgto.sauvegarde + ApiEgto.journal + re-exports types.
- **electron/ipc/ipc-sauvegarde.ts (NOUVEAU)** : 5 handlers IPC — validation des entrées, déléguations aux fonctions métier, chemins construits via obtenirDossierUserData(). `deballerDekParPhrase` importée depuis `../securite/session` et câblée dans le handler `restaurer` — suppression du TODO.
- **electron/ipc/ipc-journal.ts (NOUVEAU)** : 3 handlers IPC — ecrire (horodatage auto-généré), lire (filtres optionnels), exporter (chemin validation).
- **electron/ipc/enregistrer-ipc.ts** : import + enregistrement des handlers sauvegarde + journal (conditionnel sur obtenirDossierUserData).
- **electron/construire-api-egto.ts** : branches sauvegarde + journal (8 IPC invokes).
- **Dépendances** : archiver v7, unzipper v0.12, @types/archiver, @types/unzipper. Retiré archiver-zip-encrypted (incompatible avec unzipper pour AES-256).
- **Tests tests/journal.test.ts (NOUVEAU)** : 20 tests — écriture basique, niveaux, lecture triée, filtre par niveau, limite, rotation, export, détection secrets (5 patterns : mot de passe, clé, token, bearer, phrase de récupération), nettoyage anciens logs, initialisation.
- **Tests tests/sauvegarde.test.ts (NOUVEAU/REWRITTEN)** : 32 tests — chiffrement 10 tests (header validation v1/v2, nonce/tag/salt/version tampering, déchiffrement bon/mdp, rejet tronqué, rejet mauvais magic) ; archivage 6 tests (base manquante, enveloppe manquante, utilisateur.bin exclu, mdp vide, archive corrompue) ; restauration 9 tests (inexistante, mauvais mdp, vierge, non vide, phrase récupération, tronquée, path traversal, phrase récupération success/failure/skip) ; rétention ; listing.

### Décisions — V2b-3

- **Chiffrement AES-256-GCM (pas ZIP-level)** : unzipper ne supporte pas AES-256 WinZip (seul ZipCrypto). Architecture 2 couches : ZIP standard archiver + chiffrement fichier entier par crypto natif (GCM = chiffrement authentifié, tag d'intégrité). Le fichier exporté n'est pas un .zip ouvrable nativement, mais un blob chiffré EGTO — conforme à l'exigence AES-256.
- **archiver-zip-encrypted abandonné** : incompatibilité archiver v8 + v7, unzipper incapable de déchiffrer AES-256. Solution plus robuste avec crypto natif.
- **archiver v7** (pas v8) : v8 supprime registerFormat et cassent l'API create().
- **Argon2id pour le chiffrement archive** : même KDF que l'enveloppe DEK (Argon2id, memoryCost 65536, timeCost 3, parallelism 4, hashLength 32). Les paramètres KDF sont stockés dans l'en-tête v2, rendant le format extensible (futur changement de paramètres sans casser la lecture d'anciennes archives).
- **deballerDekParPhrase câblée** : flux complet mot de passe d'archive → déchiffrement GCM → extraction ZIP → validation manifeste → phrase → déballage DEK → copie fichiers. La DEK existante est conservée, aucune nouvelle DEK générée.
- **Protection anti-path-traversal** : chaque entrée ZIP validée avant extraction via `relative()` + test `..`.

### En cours / bloqué

- **Rien de bloqué.** V2b-3 hardening terminé. **En attente de validation utilisateur** (démonstration restauration) avant de poursuivre.

### Prochaine étape prévue

- **Validation V2b-3** par l'utilisateur (démonstration restauration chiffrée) — condition avant de lancer **V2b-4** (DQE, déclarations mensuelles, facturation).

---

## Historique — Phase E (clôturée le 16/08/2026, bilan refonte validé)

**Refonte 15-16/08/2026 clôturée et documentée.** `npm run verifier` : **22 fichiers / 541 tests, tout vert** (typecheck node+web, ESLint, garde-domaine, Vitest).

### Fait — Phase E (revue transversale de clôture, terminée le 16/08/2026)

- **Revue de cohérence domaine → dépôts → IPC → preload → renderer** (sous-agent explore) : **CONFORME** — 12 canaux IPC déclarés ↔ 12 handlers (correspondance 1-1 via `enregistrerHandlersIpc`, unique `ipcMain.handle`), aucun canal SQL générique, preload `window.egto` = API `ApiEgto` 100 % `CANAUX.*`, renderer `src/` minimal n'importe que `contrats/` et ne contient aucun calcul financier, `domaine/` TypeScript pur (double garde ESLint + scripts/garde-domaine.mjs), sécurité fenêtre (contextIsolation/nodeIntegration/sandbox/CSP/will-navigate/windowOpenHandler deny) testée. Nuances non bloquantes : SQL dans migrations.ts/seeds.ts (couche base), CSP dev `style-src 'unsafe-inline'` neutralisée en prod, `electron-builder.yml` absent, canaux affaires/factures absents (modules futurs).
- **Vérification des DoD J1→J4** : **J1 ✅ 5/5** (10 cas pied, timbre manuel testé, verifier vert 541 tests, tests sans Electron, base illisible sans clé testée l.229 base.integration) ; **J2 ❌ non démarré** (securite/ = placeholder, pas d'egto-admin-reset/sauvegarde/coquille) ; **J3 ❌ fondations partielles** (dépôt clients + IPC, entités produit/tarif ; calculerScoreClient/resoudreTarif/import absents) ; **J4 ❌ fondations partielles** (entités commerciales + machines à états ; calculerDelaisAffaire/evaluerAlertes/convertirDevisEnAffaire/UI absents).
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
