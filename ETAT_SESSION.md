## Session : 03/09/2026 — Jalon 6 Phase 4 : manuel utilisateur PDF + données de démonstration — COMMITTÉE 36d892a

Phase 4 du Jalon 6 (branche `jalon-6-prep`, **COMMITTÉE - aucun push**) : manuel utilisateur généré en PDF embarqué dans l'installeur + jeu de données de démonstration chargeable au premier démarrage. **Commit `36d892a`** « Jalon 6 Phase 4 : Manuel utilisateur PDF et données de démonstration » (11 fichiers, +2330/-54). Worktree propre. Pas de migration SQL, pas de Phase 5.

### Fait - Manuel utilisateur (EX-6)
- `docs/manuel-utilisateur.md` (NOUVEAU, 230 l.) : 10 sections (Introduction, Premier démarrage, Gestion de session, Phrase de récupération, Alerte SmartScreen, Sauvegarde, Restauration -> renvoie `procedure-restauration.md`, Cycles de facturation, Import de données, Dépannage & support). Contenu factuel conforme (numéro à la validation, encaissement hors `ENVOYEE` interdit, sauvegarde auto 03:00/30 j/12 mois, `recours.bin` à côté du ZIP, restauration phrase seule, `egto-admin-reset` exige la phrase).
- `md-to-pdf@5.2.5` (devDependency) + script npm `manuel:pdf` ; `docs/manuel-utilisateur.pdf` (216 Ko, `%PDF-1.4`, 24 objets Font dont 8 Type0/CID Unicode embarqués) - généré réellement (Chromium).
- `electron-builder.yml` : extraResource `docs/manuel-utilisateur.pdf -> docs/manuel-utilisateur.pdf` (après `assets/fonts`).

### Fait - Données de démonstration (EX-7)
- `electron/db/seeds-demo.ts` (NOUVEAU, 400 l.) : `insererSeedsDemo(base): {insere:boolean}` **idempotent** (marqueur `parametres.cle='demo.chargee'`), 6 clients BTP, 9 produits, 3 affaires (1 marché public rabais 10 % + retenue 5 % + facture calculée au centime, 1 contrat privé facture `ENVOYEE`, 1 affaire signée + devis envoyé non facturé). Montants en centimes, requêtes préparées, schémas réels.
- `electron/securite/session.ts` : `premierDemarrage(options?: {chargerDemo})` - ouvre base, migrations, seeds, `insererSeedsDemo` (import `../db/seeds-demo`).
- `electron/ipc/ipc-session.ts` : handler `session.premierDemarrage` gère `chargerDemo?: boolean`.
- `contrats/index.ts` : `premierDemarrage(d: {motDePasse; chargerDemo?})`.
- `src/ecrans/PremierDemarrage.tsx` : **case à cocher** « Charger les données de démonstration » (visible base vierge -> irréversible par nature) + `window.confirm` + message de succès à l'étape phrase. `src/styles.css` : `.option-demo`, `.confirmation-demo`.

### Conformités revues
- 10 mentions légales PRD §5.2 dans le footer `gabarit-facture.ts` intactes (incl. `Tél`, sur-édition approuvée) ; filigrane DUPLICATA -45° toujours présent facture/devis/BL et documenté dans le manuel.
- Aucun commit/push non demandé, aucun module Phase 5 (dashboards/déclarations/révisions).

### Vérifications - tout vert
- **`npm run verifier` : 53 fichiers / 1072 tests passés** ✓ (typecheck + lint + garde-domaine + vitest). PDF généré lisible (polices embarquées).

### Bloqué / à valider
- **PO-1** : icône Windows absente (`electron-builder.yml` sans `win.icon`) - en attente.
- **AC-1** : chunk `out/main/egto-admin-reset.js` vs asar -> à valider au packaging NSIS installé (fin de Jalon 6 / Phase 5).
- Prochaine étape : **Phase 5** (packaging NSIS installé, icône PO-1, recette/accessibilité) - sur validation explicite utilisateur.

---


## Session : 02/09/2026 ÔÇö Jalon 6 Phase 3 : restauration poste vierge (phrase seule, V3) ÔÇö complet et v├®rifi├®

Phase 3 du Jalon 6 (branche `jalon-6-prep`) : la restauration d'archive fonctionne avec la **phrase de r├®cup├®ration seule**, y compris sur poste vierge. Aucun commit. Pas de migration SQL, pas de Phase 4.

### Fait ÔÇö Moteur (`electron/sauvegarde.ts`)
- `FORMAT_VERSION = 3` ; `dechiffrer()` accepte `version === 2` dans le m├¬me bloc Argon2id (`version === FORMAT_VERSION || version === 2`) ÔÇö archives V2 toujours lisibles.
- `restaurerDonnees` : `motDePasse` supprim├® du param, `phraseRecuperation` et `deballerDekParPhrase` obligatoires. Flow : cherche `recours.bin` **├á c├┤t├® du ZIP** ÔåÆ d├®ballage DEK via phrase ÔåÆ `dechiffrer(fichierChiffre, dek.toString('hex'))` ÔåÆ extraction ÔåÆ validation manifeste ÔåÆ copie. Sans `recours.bin` ├á c├┤t├®, la phrase est utilis├®e telle quelle comme mot de passe (retro-compat).
- `archiverDonnees` : copie `recours.bin` de `dossierSource/enveloppes/` vers le r├®pertoire parent de la destination (├á c├┤t├® du ZIP) ÔÇö import `dirname`.

### Fait ÔÇö Handler IPC (`electron/ipc/ipc-sauvegarde.ts`)
- Garde `baseEstOuverte()` ÔåÆ ┬½ La restauration est interdite pendant une session active. ┬╗
- `donnees.archive` absent ÔåÆ `dialog.showOpenDialog({openFile, zip|enc})` ; annul├® ÔåÆ `{succes:false, erreur:'S├®lection annul├®e.'}`.
- `restaurerDonnees` appel├® avec phrase seule (pas de motDePasse) ; parser phrase non vide.

### Fait ÔÇö Contrats & export
- `contrats/sauvegarde.ts` : `RestaurerDonneesParams = { archive?, dossierDestination?, phraseRecuperation: string }`.
- `electron/securite/recuperation.ts` : inchang├® (logique (C) ÔÇö `archiverDonnees` copie d├®sormais `recours.bin` ; le `dossierSource` contient `enveloppes/recours.bin`).

### Fait ÔÇö UI
- `src/etat-session.ts` : `EcranSession` + `'restauration'`.
- `src/App.tsx` : `if (ecran === 'restauration') return <Restauration />` + import.
- `src/ecrans/Restauration.tsx` (NOUVEAU) : champ phrase (password), ┬½ S├®lectionner et restaurer ┬╗ ÔåÆ `window.egto.sauvegarde.restaurer({phraseRecuperation})`, bandeau erreur/succ├¿s, barre de progression ind├®termin├®e, apr├¿s succ├¿s ┬½ Aller ├á la connexion ┬╗.
- `src/ecrans/Connexion.tsx` : lien ┬½ Restaurer une sauvegarde ? ┬╗ ; `src/ecrans/PremierDemarrage.tsx` : lien ┬½ Restaurer une sauvegarde existante ┬╗ ÔÇö tous deux ÔåÆ `definirEcran('restauration')`.
- `src/styles.css` : bloc ┬½ Restauration (J6 Phase 3) ┬╗ ÔÇö `.barre-progression` + animation ind├®termin├®e.

### Fait ÔÇö Tests & docs
- `tests/ipc-sauvegarde.test.ts` : ┬½ restaurer avec base ouverte ÔåÆ rejette ┬╗ + ┬½ restaurer sans archive valide ÔåÆ ├®chec propre (poste vierge) ┬╗ ; 8 canaux inchang├®s.
- `tests/sauvegarde.test.ts` : restaurer adapt├® aux nouveaux params (phrase, deballerDek), phrase manquante, mauvaise cl├®, archive sans recours.bin ├á c├┤t├®.
- `docs/procedure-restauration.md` (NOUVEAU) : guide pas ├á pas en fran├ºais.
- `docs/decisions-j0.md` : ┬º2.13 ┬½ Restauration phrase seule ┬╗.
- `AGENTS.md` : point ┬½ **Restauration phrase seule (28/08/2026)** ┬╗ ajout├® aux d├®cisions d├®finitives.

### V├®rifications ÔÇö tout vert
- `npm run typecheck` Ô£ô (node + web)
- **`npm run verifier` : 53 fichiers / 1072 tests pass├®s** Ô£ô (typecheck + lint + garde-domaine + vitest)

### Bloqu├® / points d'attention
- Rien de bloquant. Aucun commit/push/tag/fusion (conforme consigne). Pas de Phase 4.
- Note : l'├®cran Restauration et le handler IPC ├®taient d├®j├á partiellement r├®dig├®s en working tree (travail non commit├®) ÔÇö cette session les a align├®s sur le cahier des charges Phase 3, compl├®t├® UI/barre de progression, docs et AGENTS/decisions.

---

## Session : 02/09/2026 ÔÇö Jalon 6 Phase 2 : param├®trage & sauvegardes automatiques (R7 + ordonnanceur) ÔÇö complet et v├®rifi├®

Phase 2 du Jalon 6 (branche `jalon-6-prep`) : **R7 ├®cran Param├®trage + sauvegarde quotidienne automatique responsable avec ordonnanceur**. Aucun commit. Pas de Phase 3 (restauration) ÔÇö hors p├®rim├¿tre, `egto-admin-reset` existant g├¿re la restauration ; aucune migration SQL ; `FORMAT_VERSION`/chiffrement inchang├®s ; aucun SQL dans le renderer.

### Fait ÔÇö ├ëtape 1 : param├¿tres de sauvegarde + seeds
- `electron/depots/depot-parametres.ts` : constantes `SAUVEGARDE_ACTIVEE`/`SAUVEGARDE_HORAIRE_QUOTIDIENNE`/`SAUVEGARDE_DESTINATION`/`SAUVEGARDE_DERNIERE_EXECUTION`/`SAUVEGARDE_DERNIERE_ERREUR` ; `HORAIRE_QUOTIDIENNE_PAR_DEFAUT='03:00'` ; `MOTIF_HORAIRE_QUOTIDIENNE = /^([01]\d|2[0-3]):([0-5]\d)$/` (2 groupes de capture) ; interface `ConfigSauvegarde` ; `lireConfigSauvegarde` (`activee !== '0'`, `horaire ?? d├®faut`, `destination ?? ''`) ; `configurerSauvegarde(base, dossierRepertoireBase, params)` ÔÇö validations (horaire invalide, destination non existante, destination = r├®pertoire de la base) + persistance `'1'`/`'0'`.
- `electron/db/seeds.ts` : `PARAMETRES_SAUVEGARDE` (3 cl├®s en litt├®raux, ├®vite le cycle d'import `depot-parametres.ts`Ôåö`seeds.ts`) ins├®r├®es dans la transaction apr├¿s `PARAMETRES_ENTREPRISE`.

### Fait ÔÇö ├ëtape 2 : ordonnanceur de sauvegarde
- `electron/ordonnanceur-sauvegarde.ts` (NOUVEAU) : `INTERVALLE_VERIFICATION_MS=60*60*1000` ; `estSauvegardeDue` (pure ÔÇö ├®ch├®ance locale ├á HH:MM, due si `maintenant >= ├®ch├®ance` ET (`derniereExecutionIso` null OU `Date(iso) < ├®ch├®ance`)) ; `creerOrdonnanceurSauvegarde` (base verrouill├®e ÔåÆ `{skippee:true}` ; destination vide/inexistante ÔåÆ `{skippee:true}` + log avertissement ; succ├¿s ÔåÆ r├®tention + persistance derni├¿re ex├®cution + log info ┬½ Sauvegarde quotidienne automatique r├®ussie : <nom> ┬╗ ; ├®chec ÔåÆ erreur m├®moris├®e + persist├®e + log erreur g├®n├®rique, jamais `resultat.erreur` (secret ┬½ enveloppe ┬╗)) ; `demarrer`/`arreter`/`derniereErreur` ; `creerIntervalleReel` setInterval/clearInterval ; `deps.creerIntervalle` **optionnel** (tests) ÔÇö pas de wrapper `creerOrdonnanceurSauvegardeReel`. R├®tention : `appliquerRetention` (30 quotidiennes / 12 mensuelles).

### Fait ÔÇö ├ëtape 3 : contrats + IPC
- `contrats/canaux.ts` (+ `configurer`/`etat`/`choisirDestination`), `contrats/sauvegarde.ts` (`ConfigurerSauvegardeParams`, `EtatSauvegardeVue`, `ResultatChoixDestination`), `contrats/index.ts` + `electron/construire-api-egto.ts` (3 m├®thodes).
- `electron/ipc/ipc-sauvegarde.ts` : signature ├®tendue (5e param `ordonnanceur`) ; garde session ┬½ Session verrouill├®e : la base n'est pas ouverte. ┬╗ sur les 3 handlers ; `configurer` (validations + `void ordonnanceur?.verifierEcheance()` = rattrapage au d├®verrouillage) ; `etat` (inclut `derniereErreur` : m├®moire ordonnanceur sinon cl├® persist├®e) ; `choisirDestination` (`dialog.showOpenDialog({properties:['openDirectory','createDirectory']})`).
- `electron/ipc/ipc-session.ts` : 6e param optionnel `apresDeverrouillage`, `await apresDeverrouillage?.()` apr├¿s d├®verrouillage. `electron/ipc/enregistrer-ipc.ts` : params optionnels `ordonnanceur`/`apresDeverrouillage` transmis.

### Fait ÔÇö ├ëtape 4 : `electron/main.ts`
- imports `ecrireLog`/`DOSSIER_JOURNAL`/`creerOrdonnanceurSauvegarde`/type `Base` ; `let ordonnanceur: OrdonnanceurSauvegarde | null` ; `apresDeverrouillage` ÔåÆ `void ordonnanceur?.verifierEcheance()` ; cr├®ation dans `whenReady` (ecrireLog vers `join(userData, DOSSIER_JOURNAL)`) ; `demarrer()` apr├¿s `creerFenetreDiagnostic()` ; `before-quit` ÔåÆ `ordonnanceur?.arreter()` en premier.

### Fait ÔÇö ├ëtape 5 : UI (R7)
- `src/ecrans/Sauvegardes.tsx` (NOUVEAU) : option activer, horaire (input `time`), planification manuelle, destination + ┬½ ParcourirÔÇª ┬╗ + s├®lection dossier, ┬½ Enregistrer la configuration ┬╗, bandeau erreur, bandeau ┬½ ├ëchec de la derni├¿re sauvegarde automatique : ÔÇª ┬╗, derni├¿re ex├®cution `JJ/MM/AAAA HH:MM` sinon ┬½ Aucune sauvegarde automatique effectu├®e. ┬╗.
- `src/ecrans/Parametrage.tsx` (NOUVEAU) : sections Entreprise / Sauvegardes / Journaux (`journal.lire({nombre:20})`) / Bar├¿me du timbre (libell├® exact ┬½ Module d├®sactiv├® ÔÇö le droit de timbre est trait├® manuellement ├á l'encaissement (d├®cision du 15/08/2026). ┬╗) / Exercices / Num├®rotation / Alertes (┬½ disponible dans une version ult├®rieure ┬╗).
- `src/App.tsx` : route `/parametrage` ; `src/styles.css` : bloc ┬½ Param├®trage (J6 R7) ┬╗ ajout├® en fin de fichier.

### Fait ÔÇö ├ëtape 6 : tests (34 nouveaux)
- `tests/ordonnanceur-sauvegarde.test.ts` (16) : 8 `estSauvegardeDue` purs + 8 int├®gration r├®elle sur base temporaire chiffr├®e (horloge simul├®e, verrouillage, destination vide/inexistante, ├®chec r├®el d'archivage, rattrapage au d├®verrouillage, pas de double ex├®cution, d├®sactivation, demarrer/arreter/red├®marrer avec `creerIntervalle` simul├®).
- `tests/depot-parametres-sauvegarde.test.ts` (8) : d├®fauts seeds, rejets horaire (`25:00`/`3:05`/`10h30`) et destination (vide, inexistante, = r├®pertoire de la base ÔÇö `DOSSIER_BASE` cr├®├® en `beforeAll`), persistance, idempotence.
- `tests/ipc-sauvegarde.test.ts` (10) : 8 canaux enregistr├®s (aucun canal SQL), verrouillage, `etat` d├®fauts, `nommer` op├®rationnel, `configurer` invalide/valide, erreur persist├®e, hooks ordonnanceur mock├®s.

### V├®rifications ÔÇö tout vert
- `npm run typecheck` Ô£ô ┬À `npm run lint` Ô£ô ┬À `npm run garde` (aucun import externe dans domaine/) Ô£ô
- **`npm run verifier` : 53 fichiers / 1069 tests pass├®s** Ô£ô
- `npm run build` : out/main (index.js, egto-admin-reset.js, chunks/), out/preload, out/renderer Ô£ô

### Bugs corrig├®s pendant le debug (├®checs vitest cibl├®s)
1. **`MOTIF_HORAIRE_QUOTIDIENNE` sans groupe sur les minutes** ÔåÆ `correspondance[2]` = `undefined` ÔåÆ `Number` = NaN ÔåÆ `new Date(..., NaN, ...)` = Date invalide ÔåÆ `estSauvegardeDue` se comportait ├á l'envers (les 4 ├®checs ordonnanceur au premier passage). Corrig├® : `/^([01]\d|2[0-3]):([0-5]\d)$/` (2 groupes).
2. **handler IPC `etat`** : throw synchrone propag├® tel quel par le mock (pas de conversion en rejet comme `ipcMain.handle`) ÔåÆ handler marqu├® `async` (parit├® avec le comportement Electron).
3. **test `nommer`** : regex `/^egto-quotidienne-\d{8}-ÔÇª/` invalide ÔÇö le format r├®el porte des tirets : `egto-quotidienne-AAAA-MM-JJ-HHmm.zip` ÔåÆ `/^egto-quotidienne-\d{4}-\d{2}-\d{2}-\d{4}\.zip$/`.

### Bloqu├® / points d'attention
- Rien de bloquant. Aucun commit/push/tag/fusion (conforme consigne).
- **Phase 3 (restauration) NON impl├®ment├®e** : d├®cision 28/08/2026 ÔÇö la restauration s'appuie sur `egto-admin-reset` ; l'├®cran de restauration reste hors p├®rim├¿tre de cette session.
- 3 nouvelles cl├®s de param├®trage en base (`parametres`) : `sauvegarde_activee`, `sauvegarde_horaire_quotidienne`, `sauvegarde_destination`.
- Timer actif toutes les heures (v├®rification d'├®ch├®ance) ÔÇö penser aux tests e2e/verrouillage ├®ventuels.
- Ordinateur de dev en UTC+1 : comportement d'├®ch├®ance local confirm├® par debug (├®ch├®ance 03:00, UTC+1).

---

## Session : 28/08/2026 ÔÇö Jalon 6 Phase 1 : fondations environnement & packaging (branche jalon-6-prep)

Phase 1 du Jalon 6 sur branche `jalon-6-prep` (HEAD `4655af6`, aucun commit). Pas d'impl├®mentation des phases 2-4 du Jalon 6 : aucune UI, aucun canal IPC `--recuperation`, aucun ordonnanceur, 0 migration SQL.

### Fait ÔÇö DC-6 : nettoyage documentaire
- `ETAT_SESSION.md` : entr├®e de session en t├¬te (celle-ci). Correction du libell├® ┬½ Q30 ÔÇö Import clients Excel ┬╗ ÔåÆ **Q20**. Correction de la ligne J2 : ┬½ J2 ÔØî non d├®marr├® ┬╗ ÔåÆ **┬½ J2 livr├® de fait ┬╗** (enveloppe DEK chiffr├®e, egto-admin-reset, tests chiffrement ÔÇö Jalon 1 Phase 2-3), appellation **[P├ëRIM├ë le 28/08/2026]**.
- Suppression par index (lignes corrompues : suppression regex impossible) de la note obsol├¿te ┬½ genererFactureDepuisBons : la facture BROUILLON est cr├®├®e avec num├®ro FAÔÇª trous de s├®quence ├á arbitrer ┬╗ (ligne ~69/72). Restent 2 mentions historiques ┬½ trous de s├®quence ┬╗ (l.83 bloc Arbitrage, l.115 D├®cisions) ÔÇö conserv├®es.
- `debug-launch.js` supprim├®.
- `tests/base.integration.test.ts` : titre reformul├® ÔåÆ ┬½ cr├®e les 31 tables : 29 du sch├®ma initial J0 + encaissements (migration 2) + contexte_audit (migration 3) ┬╗. Compte v├®rifi├® par grep : 29 CREATE TABLE dans `schema.sql` + 1 `encaissements` (002) + 1 `contexte_audit` (003) = 31.
- `docs/decisions-j0.md` ┬º16.9 : d├®cision 09/08/2026 **R├ëVOQU├ëE le 28/08/2026** (r├¿gle archiv├®e) ; nouvelle d├®cision : **format archive V3 auto-chiffr├®e, cl├® unique = DEK** (d├®ball├®e via la phrase de r├®cup├®ration), phrase seule, pas de mot de passe ZIP s├®par├®.
- `AGENTS.md` : ajout du point ┬½ **Restauration & sauvegarde (28/08/2026)** ┬╗ dans D├®cisions m├®tier d├®finitives.

### Fait ÔÇö DC-3 : polices PDF dans assets/fonts
- `assets/fonts/` cr├®├® : `Roboto-Regular.ttf` (157 208 o), `Roboto-Medium.ttf` (157 392 o), `NotoNaskhArabic-Regular.ttf` (307 592 o). `electron/pdf/polices/` supprim├®.
- `electron/pdf/polices.ts` r├®├®crit : API pr├®serv├®e (`POLICE_PAR_DEFAUT='Roboto'`, `POLICE_ARABE='NotoNaskhArabic'`, `PolicesPdfmake`, `chargerPolices()` singleton) + **`resoudreDossierFontes()` export├®** (4 candidats : `process.resourcesPath/assets/fonts` si d├®fini, `__dirname/assets/fonts`, `__dirname/../assets/fonts`, `__dirname/../../assets/fonts` ; erreur listant les chemins essay├®s ; aucun `any`).
- `electron.vite.config.ts` : le plugin `copierAssetsSql` copie `assets/fonts` ÔåÆ `out/main/assets/fonts` (garde schema.sql + migrations).
- Chemins mis ├á jour dans `tests/pdf-generation.test.ts` (l.160-161) et `e2e/coh├®rence.spec.ts` (l.386-388). Grep : plus aucune r├®f├®rence au dossier `pdf/polices/` dans le code source.
- Build v├®rifi├® : `out/main/schema.sql` Ô£ô, `out/main/migrations/{002_rabais-marche-et-encaissements,003_ajustement-arrondi-lignes}.sql` + README Ô£ô, `out/main/assets/fonts/` (3 ttf) Ô£ô, `electron/pdf/polices` inexistant Ô£ô.

### Fait ÔÇö DC-5 partiel : fondations packaging + sauvegarde de secours
- `electron-builder` install├® en devDependency (**warnings allow-scripts** : argon2, electron-winstaller ÔÇö scripts d'install non couverts ; better-sqlite3 allowScripts=false).
- `electron-builder.yml` cr├®├® : appId `com.egto.gestion-commerciale`, productName ┬½ EGTO - Gestion Commerciale ┬╗, files `out/**/*` + package.json, asarUnpack `node_modules/better-sqlite3-multiple-ciphers/**/*`, **`node_modules/argon2/**/*` (ajout├® : natif d├®verrouillage/sauvegarde)** et `out/main/egto-admin-reset.js`, extraResources `db/schema.sql`, `db/migrations`, `assets/fonts` (double s├®cu prod), win nsis x64, publisherName ┬½ E.G.T.O ┬╗, ic├┤ne comment├®e (**PO-1** en attente).
- Scripts package.json : `electron:build`, `dist`, `postinstall = electron-builder install-app-deps`.
- `electron/securite/recuperation.ts` (nouveau) : `masquerEntree` (saisie masqu├®e via raw mode, export├® et d├®sormais import├® par `egto-admin-reset.ts` ÔÇö une seule source de v├®rit├®) ; `executerExportSecours(dossierUserData, phrase)` ÔåÆ `deballerDekParPhrase` puis `archiverDonnees` manuelle avec `motDePasse = dek.toString('hex')` (archive V3 auto-chiffr├®e, d├®cision 28/08), retour `{succes, chemin}` / `{succes, erreur}`.
- `electron/main.ts` : d├®tection `process.argv.includes('--recuperation')` (constante `MODE_RECUPERATION`), dans `app.whenReady` ÔåÆ `executerRecuperation()` (masquerEntree ÔåÆ executerExportSecours ÔåÆ `app.exit(0)` succ├¿s / `app.exit(1)` ├®chec), **aucune fen├¬tre ni IPC ni base ouverte en mode r├®cup├®ration** ; hook `EGTO_E2E`/`EGTO_E2E_USER_DATA_DIR` pr├®serv├®. `egto-admin-reset.ts` : wrapper autonome conserv├® (2e input de build inchang├®), `masquerEntree` local supprim├® au profit de l'import.
- V├®rification build : `out/main/egto-admin-reset.js` autonome (2,93 kB) + chunk `chunks/recuperation-*.js` g├®n├®r├®. **Point de vigilance AC-1** : en app install├®e, `out/main/egto-admin-reset.js` est d├®paquet├® mais son chunk reste dans l'asar ÔÇö l'ex├®cution de l'utilitaire depuis l'app install├®e est ├á valider (non exerc├®e ici). Usage nominal depuis le projet : OK.

### Fait ÔÇö Tests ajout├®s (├ëtapes 3, 4, 5, 6)
- `tests/polices.test.ts` (3 tests) : r├®solution racine Vitest (`assets/fonts`), priorit├® `process.resourcesPath` (mkdtemp + restauration propre), 3 entr├®es de `chargerPolices`. Correction TS n├®cessaire : `Omit<NodeJS.Process,'resourcesPath'>` pour autoriser `delete`.
- `tests/recuperation.test.ts` (4 tests) : archive manuelle cr├®├®e chiffr├®e dans `sauvegardes/` (`egto-manuelle-*.zip`), phrase trim├®e accept├®e, phrase fausse sans cr├®ation, phrase vide/espaces refus├®e.
- `tests/depots-factures-bl-integration.test.ts` : **test rabais march├® ligne par ligne** ÔÇö affaire `MARCHE_PUBLIC` `rabais_marche_bps=1000`, 2 BL EMIS chacun 1 ligne (50 000 c brut) ÔåÆ `genererFactureDepuisBons` : lignes `rabais_marche_bps=1000`, brut 50 000 c, rabais 5 000 c, net 45 000 c ; pieds `total_ht_lignes=100 000`, `net_commercial=90 000`, TTC 107 100. (Valeurs ajust├®es aupr├¿s de l'ex├®cution : le d├®p├┤t recalcul├® la ligne depuis PU├ùqt├®, le `montant_ht_centimes` du BL n'est pas repris ; `montant_ht_remise_centimes` stocke brutÔêÆremise, pas le montant de remise.)
- `electron/depots/depot-encaissements.ts` : **garde AV** ÔÇö `type_document` ajout├® au SELECT facture, erreur **┬½ Un avoir ne peut pas ├¬tre encaiss├®. ┬╗** d├®clench├®e avant les contr├┤les de statut et d'insertion.
- `tests/depot-encaissements.test.ts` : nouveau describe ┬½ garde : un avoir ne peut jamais ├¬tre encaiss├® ┬╗ ÔÇö refus sur AV quel que soit le statut (6 statuts) + d├®monstration que la machine autorise `ENVOYEEÔåÆENCAISSERÔåÆPAYEE` (donc la garde d├®p├┤t est n├®cessaire pour emp├¬cher l'avoir d'atteindre PAYEE puis ARCHIVEE).

### V├®rifications (├ëtape 7) ÔÇö tout vert
- `npm run typecheck` (node + web) Ô£ô ┬À `npm run lint` Ô£ô ┬À `npm run garde` (aucun import externe dans domaine/) Ô£ô
- `npm run verifier` : **50 fichiers / 1035 tests pass├®s** Ô£ô
- `npm run build` : out/main (index.js, egto-admin-reset.js, chunks/), out/preload, out/renderer + ressources copi├®es Ô£ô

### Bloqu├® / points d'attention
- Rien de bloquant.
- **AC-1** (ci-dessus) : chunk de `egto-admin-reset.js` vs. asar en app install├®e ÔÇö ├á trancher en phase packaging complet.
- **PO-1** : ic├┤ne Windows manquante (`icon` comment├® dans electron-builder.yml).
- **31 vs 29 tables** : le test ┬½ 31 tables ┬╗ est volontaire (schema J0 + migrations 002/003) ; la phrase ┬½ 29 tables ┬╗ du PRD r├®f├¿re au sch├®ma initial uniquement.
- `allow-scripts` : argon2 & electron-winstaller non couverts ÔÇö ├á revoir si un build final s'appuie sur leurs scripts d'install (npm install a fonctionn├®).
- Aucun commit/push/tag/fusion effectu├® (conforme consigne).

---

## Session : 24/08/2026 ÔÇö Correctifs num├®rotation avoir (branche jalon-5-phase5)

**Jalon 5 complet (Phase 1 + 2 + 3 + 4 + 5).** Tous les livrables livr├®s et v├®rifi├®s. Corrections post-Phase 5 appliqu├®es.

### Fait ÔÇö Phase 5 : Tests E2E Playwright

**Q16 ÔÇö Harnais Playwright** :
- playwright.config.ts (testDir: ./e2e, timeout: 60s, workers: 1, projects: chromium)
- e2e/helpers/fixture.ts : fixture Electron (lancement app, session auto-unlock, temp DB, cleanup)
- e2e/smoke.spec.ts : fum├®e (fen├¬tre, session, page Factures) ÔÇö vert en 2.8s
- electron/main.ts : hook EGTO_E2E + EGTO_E2E_USER_DATA_DIR (34-35)
- package.json : script "test:e2e": "npx playwright test"
- Corrections infrastructure : electron.vite.config.ts (exclude pdfmake + copierAssetsSql plugin + copie polices), src/App.tsx (BrowserRouter ÔåÆ HashRouter)

**Q17 ÔÇö Parcours devisÔåÆaffaireÔåÆfactureÔåÆPDF** (10 ├®tapes, vert en 3.9s) :
- Client ÔåÆ devis + 2 lignes ÔåÆ ENVOYE (IPC) ÔåÆ conversion affaire ÔåÆ facture BROUILLON ÔåÆ 2 lignes ÔåÆ validation FA-2026-XXXX ÔåÆ PDF direct ÔåÆ aper├ºu UI ÔåÆ impression (VALIDEÔåÆIMPRIMEE, DUPLICATA) ÔåÆ Marquer envoy├®e ÔåÆ ENVOYEE
- **Correctifs production d├®couverts** : signatures IPC lignes (4 handlers), affaire statut CHECK, pdfmake API singleton, fonts/polices copie build, JSX \uXXXX litt├®raux, ESLint artifacts

**Q18 ÔÇö Parcours BLÔåÆfacture group├®eÔåÆPDF** (8 ├®tapes, vert en 3.5s) :
- 2 BL EMIS avec lignes ÔåÆ g├®n├®ration facture group├®e ÔåÆ lignes reprises + montants v├®rifi├®s ÔåÆ BL FACTURE/li├®s ÔåÆ validation FA ÔåÆ PDF (mentions l├®gales v├®rifi├®es via d├®codage CMap) ÔåÆ rabais march├® transf├®r├® (1000 bps)
- **Correctif rabais march├®** : genererFactureDepuisBons lit d├®sormais 
abais_marche_bps depuis ffaires via lireAffaireParId (au lieu de hardcoder 0)

**Q20 ÔÇö Import clients Excel** (vert en 2.8s) :
- e2e/parcours-import.spec.ts : lecture Excel via IPC, validation avec anomalie, ex├®cution, v├®rification lignes import├®es

**Coh├®rence ÔÇö 8 v├®rifications transversales** (8 tests, tous verts) :
1. Aper├ºu PDF sans incr├®ment nombreImpressions
2. Impression avec incr├®ment (1ÔåÆ2) ; r├®impression refus├®e (VALIDE requise)
3. DUPLICATA filigrane d├¿s 2├¿me g├®n├®ration
4. Absence droit de timbre dans le pied (TTC = HT + TVA)
5. Absence timbre dans le PDF (d├®compression zlib + recherche CMap)
6. Avoir non encaissable (refus IPC + absence bouton UI)
7. Avoir non archivable (absence bouton + canal)
8. Polices PDF pr├®sentes et fonctionnelles

### Commandes obligatoires ÔÇö 6/6 vertes

| # | Commande | R├®sultat |
|---|---|---|
| 1 | 	sc --noEmit -p tsconfig.node.json | Ô£à Vert |
| 2 | 	sc --noEmit -p tsconfig.web.json | Ô£à Vert |
| 3 | eslint . | Ô£à Vert |
| 4 | 
ode scripts/garde-domaine.mjs | Ô£à Vert |
| 5 | 
px vitest run | Ô£à 48 fichiers / 1010 tests |
| 6 | 
px playwright test | Ô£à 12 tests / 12 pass├®s (48.9s) |

### Corrections production (Phase 5)

| Fichier | Correction |
|---|---|
| electron/depots/depot-bons-livraison.ts | BL query s├®lectionne ffaire_id, 
abais_marche_bps lu depuis ffaires via lireAffaireParId |
| electron/depots/ipc-devis.ts, ipc-factures.ts, ipc-bons-livraison.ts, ipc-avenants.ts | Signatures IPC lignes align├®es sur contrat (payload unique au lieu de (event, parentId, data)) |
| electron/ipc/ipc-affaires.ts | Statut cr├®ation affaire = SIGNE (au lieu de BROUILLON rejet├® par CHECK) |
| electron/pdf/generer-pdf.ts | R├®├®crit sur API singleton officielle pdfmake (createPdf + getBuffer()) |
| electron.vite.config.ts | exclude pdfmake (ESM), plugin copie SQL + polices, ignore artifacts ESLint |
| src/App.tsx | BrowserRouter ÔåÆ HashRouter (compatibilit├® file:// Electron) |
| src/ecrans/FicheFacture.tsx, FicheDevis.tsx, Factures.tsx | JSX \uXXXX ÔåÆ accents r├®els |

### Notes techniques

- e2e/smoke.spec.ts : ses 2 blocages document├®s (assets SQL + HashRouter) sont lev├®s
- e2e/parcours-bl-facturation.spec.ts : ├ëTAPE 7 documente la lacune rabais (d├®sormais corrig├®e)
- e2e/coh├®rence.spec.ts : interface PiedCalculeE2E supprim├®e (lint fix)
- Tests UI R15-R18 (40 tests) : inchang├®s depuis Phase 4, tous verts

### Bloqu├® : rien

### Prochaine ├®tape

- **Arbitrage** : trous de s├®quence FA sur factures issues de BL (num├®ro attribu├® au BROUILLON puis r├®-attribu├® ├á la validation)
- **Jalon 6** : ne pas encha├«ner sans validation utilisateur explicite de la Phase 5

---
# ├ëtat de la session ÔÇö EGTO Gestion Commerciale

## Derni├¿re session : 23/08/2026 ÔÇö Correctif transfert rabais march├® BL ÔåÆ FA (branche jalon-5-phase5)

**Fait** :
- **`electron/depots/depot-bons-livraison.ts` ÔÇö lacune Phase 2 corrig├®e** : `genererFactureDepuisBons` ne hardcode plus `rabais_marche_bps: 0`. La requ├¬te BL s├®lectionne d├®sormais `affaire_id` (interface `BLValide` enrichie) ; le taux est lu depuis `affaires.rabais_marche_bps` via `lireAffaireParId` (import ajout├®, r├®utilis├® comme dans depot-factures) sur l'`affaire_id` du premier BL (tous les BL du lot partagent le m├¬me client, contr├┤le ligne 327 ; affaire absente/supprim├®e ou NULL ÔåÆ 0). Le taux est fig├® sur **chaque ligne** de la facture g├®n├®r├®e (d├®cision 15/08/2026 ┬º4.4.5bis).
- **`e2e/coh├®rence.spec.ts`** : suppression de l'interface inutilis├®e `PiedCalculeE2E` (lint KO document├® en session pr├®c├®dente, fichier d'une session parall├¿le ÔÇö correction minimale type-only pour verdir `npm run verifier`, aucun comportement modifi├®).
- **Rebuild `out/` requis** : l'e2e lance le bundle compil├® (`out/main`) ÔÇö un `npm run build` est n├®cessaire apr├¿s toute modification des sources avant `npx playwright test`.

**V├®rifications** : `npx playwright test e2e/parcours-bl-facturation.spec.ts` **Q18 vert** (8 ├®tapes, y compris ├ëTAPE 7 rabais march├® : 1000 bps repris depuis l'affaire, rabais ligne 5 000 000 c, net 45 000 000 c) ; `npx vitest run` 48 fichiers / 1010 tests verts ; `npm run verifier` vert (typecheck node+web, ESLint, garde-domaine, tests).

**Bloqu├®** : rien.

**D├®cisions** : aucune d├®cision produit/fiscale. **R├®solu** (24/08/2026) : `genererFactureDepuisBons` cr├®e d├®sormais en BROUILLON avec numero=NULL ; le compteur n'est consomm├® qu'├á la validation.

**Prochaine ├®tape** : relancer `npx playwright test e2e/smoke.spec.ts`.

## Session pr├®c├®dente : 23/08/2026 ÔÇö Jalon 5 Phase 5 : e2e parcours BL ÔåÆ facture group├®e (branche jalon-5-phase5)

**Fait** :
- **`e2e/parcours-bl-facturation.spec.ts` (NOUVEAU)** ÔÇö Q18, parcours en 7 ├®tapes via IPC (`window.egto.*`) + contr├┤les UI HashRouter : 2 BL EMIS avec lignes ÔåÆ `bonsLivraison.genererFacture` group├®e ÔåÆ lignes reprises et montants nets v├®rifi├®s ÔåÆ BL pass├®s FACTURE + li├®s (`facture_id`) ÔåÆ validation VALIDE + num├®ro `FA-AAAA-NNNN` ÔåÆ **PDF** (en-t├¬te %PDF-, extraction textuelle r├®elle du buffer par d├®codage des CMap ToUnicode glypheÔåÆcaract├¿re avec suivi de police courante `/Fn Tf` ÔÇö les flux pdfmake sont en Identity-H/glyph IDs, une recherche de cha├«ne brute est impossible) v├®rifiant les **10 mentions l├®gales** du pied + num├®ro + client + absence de ┬½ timbre ┬╗, aper├ºu UI iframe ÔÇö puis **├ëTAPE 7 rabais march├®**.
- **Correctif production d├®couvert par l'e2e** : `bonsLivraison.creer` ├®crivait `statut: 'BROUILLON'` + `numero_bl: ''` ÔåÆ violait le CHECK du sch├®ma (`EMIS|FACTURE`) et l'UNIQUE de `numero_bl`. Nouveau `creerBonLivraisonEmis` dans `electron/depots/depot-bons-livraison.ts` (transaction : compteur `BL-AAAA-NNNN` via `lireCompteur`/`attribuerNumero`/`incrementerCompteur`, statut EMIS) branch├® dans `ipc-bons-livraison.ts`. Le sch├®ma BL n'a pas d'├®tat BROUILLON ; `modifier` ne permet pas le changement de statut (champs limit├®s).
- **V├®rifications** : `npm run typecheck` vert ; lint vert sur les fichiers modifi├®s ; `tests/depots-factures-bl-integration.test.ts` 20/20 ; `npx playwright test e2e/parcours-facturation.spec.ts` (Q17) toujours vert.

**Bloqu├®** :
- **├ëTAPE 7 du nouvel e2e ├®choue VOLONTAIREMENT** avec le message attendu : ┬½ BLOCAGE: genererFactureDepuisBons ne transf├¿re pas rabais_marche_bps ┬╗ ÔÇö lacune document├®e depuis la Phase 2 (`electron/depots/depot-bons-livraison.ts` hardcode `rabais_marche_bps: 0` au lieu de lire `affaires.rabais_marche_bps`). ├Ç corriger sur d├®cision utilisateur (lecture du rabais depuis l'affaire + reprise ligne par ligne).
- Lint KO sur `e2e/coh├®rence.spec.ts` (type inutilis├®) ÔÇö fichier cr├®├® par une session parall├¿le le 23/08 soir, non touch├®.

**D├®cisions** : aucune d├®cision produit/fiscale. Notes techniques : num├®rotation BL attribu├®e ├á la cr├®ation (pas d'├®tat BROUILLON dans le sch├®ma BL) ; constat non corrig├® signal├® : `genererFactureDepuisBons` ins├¿re la facture BROUILLON **avec** num├®ro FA d├®j├á attribu├® (compteur avanc├®), puis `validerFacture` r├®-attribue un second num├®ro ÔåÆ trous de s├®quence ├á arbitrer.

**Prochaine ├®tape** : arbitrage utilisateur sur le transfert `rabais_marche_bps` (d├®bloque ├ëTAPE 7), puis arbitrage sur la double attribution de num├®ro FA des factures issues de BL ; relancer `npx playwright test e2e/smoke.spec.ts`.

## Session pr├®c├®dente : 23/08/2026 ÔÇö Jalon 5 Phase 5 : e2e parcours facturation (branche jalon-5-phase5)

**Fait** :
- **`e2e/parcours-facturation.spec.ts` (NOUVEAU)** ÔÇö parcours complet en 10 ├®tapes, vert en ~4 s : client ÔåÆ devis + ligne ÔåÆ ENVOYE ÔåÆ conversion affaire (dialog ┬½ Conversion ┬╗ captur├®) ÔåÆ facture BROUILLON (num├®ro null) ÔåÆ 2 lignes + pied calcul├® via IPC (HT 600 000 / TVA 114 000 / TTC 714 000 DA) ÔåÆ validation `FA-2026-XXXX` ÔåÆ PDF direct (%PDF-, statut VALIDE conserv├®, impressions = 0) ÔåÆ aper├ºu UI (┬½ G├®n├®rer le PDF ┬╗ ÔåÆ iframe + T├®l├®charger) ÔåÆ impression (VALIDEÔåÆIMPRIMEE, impressions = 1, bandeau DUPLICATA) ÔåÆ Marquer envoy├®e ÔåÆ ENVOYEE visible dans la liste.
- **Correctifs production d├®couverts par l'e2e** :
  1. **Signatures IPC des lignes** : 4 handlers attendaient `(evenement, parentId, donnees)` alors que contrat/preload/renderer envoient un payload unique ÔÇö align├®s sur le contrat : `ipc-devis.ts` (devis.creerLigne), `ipc-factures.ts` (factures.creerLigne), `ipc-bons-livraison.ts` (bonsLivraison.creerLigne), `ipc-avenants.ts` (avenants.creerPoste).
  2. **`ipc-affaires.ts`** : le mapper de cr├®ation for├ºait `statut: 'BROUILLON'`, rejet├® par le CHECK du sch├®ma (`SIGNE|ODS_RECU|ÔÇª`) ÔåÆ `'SIGNE'`.
  3. **`electron/pdf/generer-pdf.ts` r├®├®crit** : la classe `pdfmake/src/printer` de pdfmake 0.3 n'a **pas** de `createPdf` (seulement `createPdfKitDocument`) ÔåÆ bascule sur l'API singleton officielle (`import { createPdf, setFonts } from 'pdfmake'` + `getBuffer()`). Suppression de `electron/pdf/pdfmake-printer.d.ts` (d├®claration obsol├¿te et erron├®e). Les tests unitaires PDF ne couvraient que gabarits/polices ÔÇö d'o├╣ la non-d├®tection.
  4. **`electron.vite.config.ts`** : le plugin copie d├®sormais aussi `electron/pdf/polices/` vers `out/main/polices` (en plus de schema.sql/migrations).
  5. **Bug JSX `\uXXXX` litt├®raux** : ├®chappements unicode en position texte JSX rendus tels quels ├á l'├®cran (interface illisible) ÔÇö corrig├®s avec accents r├®els dans `FicheFacture.tsx` (┬½G├®n├®rer le PDF┬╗, ┬½Marquer envoy├®e┬╗, ┬½ÔåÉ Retour┬╗, ┬½Aucun PDF g├®n├®r├®┬╗, ┬½ChargementÔÇª┬╗), `FicheDevis.tsx` (3 occurrences), `Factures.tsx` (1). Les ├®chappements en cha├«nes JS (interpr├®t├®s) sont inchang├®s.
  6. **Lint** : `eslint.config.js` ignore d├®sormais `playwright-report/` + `test-results/` (+ `.gitignore`) ÔÇö les artefacts Playwright faisaient ├®chouer `npm run verifier` (2845 erreurs sur des bundles minifi├®s) ; `debug-launch.js` : `catch(e){}` ÔåÆ `catch {}`.

**V├®rification** : `npm run verifier` vert (typecheck node+web, ESLint, garde-domaine, 48 fichiers / 1010 tests Vitest) ; `npx playwright test e2e/parcours-facturation.spec.ts` vert.

**D├®cisions** : aucune d├®cision produit/fiscale. Notes techniques : unit├®s e2e en majuscules (`'M3'`, `'U'`) conformes au CHECK du sch├®ma ; format num├®ro `FA-2026-0001` ; `HashRouter` d├®j├á en place dans `src/App.tsx` (compatible `file://`).

**Bloqu├®** : rien.

**Prochaine ├®tape** : relancer `npx playwright test e2e/smoke.spec.ts` (ses 2 blocages document├®s le 23/08 matin sont lev├®s : assets SQL copi├®s par plugin, HashRouter pr├®sent), puis validation utilisateur avant tout commit.

## Session pr├®c├®dente : 23/08/2026 ÔÇö Correctif lancement (pdfmake) + diagnostic e2e (branche jalon-5-phase5)

**Correctif appliqu├®** : `electron.vite.config.ts` ÔÇö `externalizeDepsPlugin({ exclude: ['pdfmake'] })` dans la section **main uniquement** (preload inchang├®). Cause : `pdfmake/src/printer.js` est en ESM et plantait en CJS (`ERR_MODULE_NOT_FOUND ÔÇª PDFDocument`) quand externalis├®. Build OK ; lancement v├®rifi├® sans crash (stderr vide).

**Diagnostic e2e (smoke.spec.ts toujours KO ÔÇö 2 blocages r├®siduels d├®couverts une fois le crash lev├®)** :
1. **Assets SQL absents de `out/main`** : `electron/db/migrations.ts` r├®sout `schema.sql` + `migrations/*.sql` relativement au module compil├®, mais electron-vite ne les copie pas ÔåÆ `ENOENT ÔÇª out\main\schema.sql` au d├®verrouillage. Confirm├® par copie manuelle dans `out/main` (artefact de build, non versionn├® ÔÇö sera ├®cras├® au prochain build) : le d├®verrouillage passe ensuite.
2. **BrowserRouter incompatible avec `file://`** : en build, le renderer est charg├® via `loadFile` ÔåÆ `location.pathname = /C:/ÔÇª/index.html`, aucune route ne matche (┬½ No routes matched location ┬╗), `<main>` vide ÔåÆ l'├®cran Factures ne s'affiche jamais. Correction candidate (non appliqu├®e, hors p├®rim├¿tre autoris├®) : `HashRouter` ou `MemoryRouter` dans `src/App.tsx`.

**Fait** :
- `electron.vite.config.ts` : exclusion pdfmake de l'externalisation (section main) ÔÇö 1 ligne.
- Scripts temporaires de diagnostic cr├®├®s puis supprim├®s ; copies `schema.sql`/`migrations/` laiss├®es dans `out/main` (artefacts).

**D├®cisions** : aucune d├®cision produit/fiscale ; strictement infrastructure.

**Bloqu├®** : smoke e2e d├®pend des 2 correctifs ci-dessus (├á valider par l'utilisateur avant application).

**Prochaine ├®tape** : sur validation ÔÇö copier les assets SQL vers `out/main` (plugin vite ou script) et basculer `src/App.tsx` sur un routeur compatible `file://` ; relancer `npx playwright test e2e/smoke.spec.ts`.

## Session pr├®c├®dente : 21/08/2026 ÔÇö Jalon 5 Phase 4 (UI R15ÔÇôR18 ÔÇö complet)

**Jalon 5 Phase 1 + 2 + 3 + 4 complets.** 
npm run verifier (typecheck node+web + lint + garde-domaine + vitest) : **48 fichiers / 1010 tests, tout vert**.

### Fait ÔÇö Jalon 5 Phase 4 : ├®crans UI R15ÔÇôR18 (21/08/2026)

**R15 ÔÇö Factures (liste + fiche) :**
- **src/ecrans/Factures.tsx** : liste avec colonnes N┬░/Type/Client/Affaire/Date/├ëch├®ance/Total TTC/Solde/Statut. Badges statut (BROUILLON/VALIDE/IMPRIMEE/ENVOYEE/PAYEE/ARCHIVEE) et type (FA/AC/AV). Filtrage par statut. Bouton ┬½ Nouvelle facture ┬╗.
- **src/ecrans/FicheFacture.tsx** : fiche avec 5 onglets ÔÇö G├®n├®ral (champs lecture seule + boutons Valider/Imprimer/Envoyer/Avoir selon statut), Lignes (tableau + ajout ligne via modal), Pied (appel calculerPied + affichage totaux), Historique encaissements (liste ENC), Aper├ºu PDF (composant ApercuPdf).

**R16 ÔÇö Aper├ºu PDF :**
- **src/composants/ApercuPdf.tsx** : composant r├®utilisable ÔÇö re├ºoit un Uint8Array depuis genererPdf, cr├®e un Blob ÔåÆ iframe inline pour visualisation. Boutons T├®l├®charger et Imprimer.

**R17 ÔÇö Bons de livraison (liste + fiche) :**
- **src/ecrans/BonsLivraison.tsx** : liste avec colonnes N┬░ BL/Client/Affaire/Date livraison/Poids/Statut. Badges statut (EMIS/FACTURE). S├®lection multiple + bouton ┬½ G├®n├®rer facture ┬╗ conditionn├® ├á toutEmis + au moins 2 BL.
- **src/ecrans/FicheBonLivraison.tsx** : fiche avec 2 onglets ÔÇö G├®n├®ral et Lignes.

**R18 ÔÇö Avoirs :**
- **src/ecrans/FicheAvoir.tsx** : assistant 3 ├®tapes ÔÇö s├®lection facture dÔÇÖorigine (VALIDE/IMPRIMEE/ENVOYEE) ÔåÆ mode (Total/Par lignes/Partiel) ÔåÆ d├®tail (cases ├á cocher, quantit├® partielle born├®e, motif ÔëÑ 3 car., date AAAA-MM-JJ).

**C├óblage :**
- **src/App.tsx** : 7 routes ajout├®es (factures, factures/nouveau, factures/:id, factures/avoir/nouveau, bons-livraison, bons-livraison/nouveau, bons-livraison/:id).
- **src/Shell.tsx** : section Facturation (Factures + Bons de livraison).
- **src/styles.css** : classes badge (valide/imprimee/envoyee/payee/archivee/fa/ac/av).

**Tests UI R15ÔÇôR18 (40 tests, 3 fichiers) :**
- tests/ui-factures.test.tsx (18 tests) : liste + fiche facture.
- tests/ui-bl.test.tsx (15 tests) : liste + fiche BL.
- tests/ui-avoirs.test.tsx (7 tests) : cr├®ation avoir.

### Fait ÔÇö Jalon 5 Phase 1 : types contrats + domaine avoir + tests purs

- **contrats/factures.ts** : StatutFacture, TypeDocumentFacture, FactureVue, LigneFactureVue, DonneesCreationFacture, DonneesCreationLigneFacture, DonneesAvoir
- **contrats/bons-livraison.ts** : StatutBonLivraisonVue, BonLivraisonVue, LigneBonLivraisonVue, DonneesCreationBonLivraison
- **contrats/canaux.ts** : 26 canaux IPC (16 factures + 10 BL)
- **domaine/avoir.ts** : genererLignesAvoir (3 modes), validerDonneesAvoir
- **tests/avoirs-domaine.test.ts** : 21 tests purs

### Fait ÔÇö Jalon 5 Phase 2 : depots SQLite + handlers IPC

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
- depot-bons-livraison.ts : remise_bps/rabais_marche_bps = 0 (colonnes absentes du schema BL ÔÇö lacune documentee)
- tests/pied-facture.test.ts : split du test quantite negative en 2 ÔÇö generique rejette, AV accepte via drapeau

**Tests integration** (20 tests) :
- tests/depots-factures-bl-integration.test.ts : factures CRUD, lignes, validation, avoirs, BL CRUD, BL lignes, generation facture

### Fait ÔÇö Jalon 4 Phase 1 : domaine pur (D14, D15, conversion devisÔåÆaffaire)

- **domaine/delais.ts (D14)** : jouterJoursDateIso, calculerDelaisAffaire (ODS, suspensions, reprises, prorogations, d├®passement, % consomm├®, est_en_cours). Horloge inject├®e (Date), d├®terministe.
- **domaine/alertes.ts (D15)** : evaluerAlertesAffaire (5 cat├®gories : DELAI_50/80/J-15/DEPASSE/SUSPENSION), evaluerAlertesDevis (VALIDITE_EXPIREE/BIENTOT_EXPIREE). Toutes informatives, jamais bloquantes.
- **domaine/conversion-devis.ts** : convertirDevisEnAffaire ÔÇö valide statut ENVOY├ë, transite vers ACCEPTE, cr├®e affaire CONTRAT_PRIVE/SIGNE, reprend lignes dans DQE (origine DEVIS, ligne_devis_id).
- **Tests Q8** : 23 tests d├®lais. **Tests Q11** : 10 tests conversion.

### Fait ÔÇö Jalon 4 Phase 2 : d├®p├┤ts, contrats et IPC (affaires, devis, DQE, avenants, ├®v├®nements d├®lai)

**Contrats** (types IPC, 5 fichiers) :
- contrats/affaires.ts : AffaireVue, DonneesCreationAffaire, DonneesModificationAffaire
- contrats/devis.ts : DevisVue, LigneDevisVue, DonneesCreationDevis, DonneesCreationLigneDevis
- contrats/postes-dqe.ts : PosteDqeVue, DonneesCreationPosteDqe, DonneesModificationPosteDqe
- contrats/avenants.ts : AvenantVue, AvenantPosteVue, DonneesCreationAvenant, DonneesCreationAvenantPoste
- contrats/evenements-delais.ts : EvenementDelaiVue, DonneesCreationEvenementDelai
- canaux.ts mis ├á jour : 5 groupes de canaux ajout├®s (28 canaux IPC au total)
- index.ts mis ├á jour : ApiEgto enrichi + exports des 5 nouveaux types

**D├®p├┤ts SQLite** (requ├¬tes pr├®par├®es, 5 fichiers, 28 fonctions) :
- depot-affaires.ts : CRUD complet (creer, lire, lister, modifier, supprimer logiquement)
- depot-devis.ts : CRUD devis + lignes_devis (8 fonctions)
- depot-postes-dqe.ts : CRUD postes DQE par affaire
- depot-avenants.ts : CRUD avenants + avenants_postes (7 fonctions)
- depot-evenements-delais.ts : CRUD ├®v├®nements d├®lai (3 fonctions)

**IPC Handlers** (5 fichiers, 26 handlers) :
- ipc-affaires.ts : lister, creer, lire, modifier, supprimer + mappers snake_caseÔåÆcamelCase
- ipc-devis.ts : CRUD devis + creerLigne, listerLignes, supprimerLigne (8 handlers)
- ipc-postes-dqe.ts : listerParAffaire, creer, modifier, supprimer
- ipc-avenants.ts : listerParAffaire, creer, modifierStatut, supprimer, creerPoste, listerPostes
- ipc-evenements-delais.ts : listerParAffaire, creer, supprimer

**Wiring** :
- enregistrer-ipc.ts : 5 enregistrerHandlers* ajout├®s
- construire-api-egto.ts : 5 sections ajout├®es (affaires, devis, postesDqe, avenants, evenementsDelais)

**Tests Q13** (int├®gration d├®p├┤ts sur base chiffr├®e, 26 tests) :
- 	ests/depots-affaires-devis-integration.test.ts : affaires (7), devis (6), postes DQE (6), avenants (4), ├®v├®nements d├®lai (4)

### D├®cisions ÔÇö Jalon 4

- **Horloge inject├®e** pour calculerDelaisAffaire (tests d├®terministes).
- **Alertes = fonctions pures** : re├ºoivent donn├®es pr├®-calcul├®es + dateCourante.
- **Conversion = fonction pure** : retourne donn├®es normalis├®es, d├®p├┤t IPC orchestre la transaction.
- **D├®pendances domaineÔåÆdomaine uniquement** : aucune extension externe dans domaine/.
- **Contrats partag├®s** : contrats/ au root (hors electron/), import├®s par main ET renderer.
- **D├®p├┤ts = requ├¬tes pr├®par├®es** : SQL dans electron/depots/, zero concat├®nation, suppression logique.
- **vitest.config.ts** : ajout `esbuild: { jsx: 'automatic' }` pour supporter JSX dans les fichiers `tests/` (hors `tsconfig.web.json` include).

### Fait ÔÇö Jalon 4 Phase 3 : ├®crans UI (R11, R12, R13, R14)

**Screens R11 (Devis) :**
- `src/ecrans/Devis.tsx` (liste) : colonnes numeroDevis/clientId/dateDevis/dateValidite/statut/rabaisGlobalBps/affaireId, badge statut (BROUILLON/ENVOYE/ACCEPTE/REFUSE/EXPIRE), filtrage par statut, bouton ┬½ Nouveau devis ┬╗.
- `src/ecrans/FicheDevis.tsx` (fiche) : onglets G├®n├®ral/Lignes/Aper├ºu PDF. Lignes via `Liste` + modal `Formulaire` (ajout ligne). Bouton ┬½ Convertir en affaire ┬╗ conditionn├® au statut ENVOYE (placeholder alert ÔÇö IPC non encore c├óbl├®).

**Screens R12 (Affaires) :**
- `src/ecrans/Affaires.tsx` (liste) : colonnes reference/typeAffaire(clientId)/objet/statut/dateFin/d├®lai restant. Badges type (MARCHE_PUBLIC/CONTRAT_PRIVE/BC), badges d├®lai (ok/alerte/d├®pass├®), calcul jours restants via dateFinRevisee/dateFinContractuelle.
- `src/ecrans/FicheAffaire.tsx` (fiche) : onglets G├®n├®ral/DQE/Avenants/D├®lais. Fiche compl├¿te avec tous les champs AffaireVue en lecture seule.

**Composant R13 (Grille DQE) :**
- `src/composants/GrilleDqe.tsx` : table HTML ├®ditable (double-clic ÔåÆ inline edit), colonnes num├®ro/d├®signation/unite/quantit├®/PU HT/montant HT/famille/classification. Persistance via `window.egto.postesDqe.modifier()` au blur. Navigation Tab/Enter. Total HT en pied.

**Composants R14 (D├®lais + Alertes) :**
- `src/composants/SuiviDelais.tsx` : timeline ├®v├®nements d├®lai (ODS/SUSPENSION/REPRISE/PROROGATION) avec badges couleur, dates, dur├®e, motif, impact.
- `src/composants/BandeauAlertes.tsx` : banni├¿re alertes niveaux CRITIQUE/AVERTISSEMENT/INFO, ic├┤nes, couleurs CSS customis├®es.

**CSS et routes :**
- `src/styles.css` : 160+ lignes ajout├®es (bandeau alertes, badges statut/d├®lai, timeline, grille DQE ├®ditable).
- `src/App.tsx` : 4 routes ajout├®es (`/devis`, `/devis/:id`, `/affaires`, `/affaires/:id`).
- AG Grid community install├® (`ag-grid-community` + `@ag-grid-community/styles`). Utilis├® comme fallback possible, la grille DQE actuelle est une table HTML ├®ditable pour simplicit├® et fiabilit├®.

**Tests UI R11-R14 (59 tests, 4 fichiers) :**
- `tests/ui-devis.test.tsx` (19 tests) : liste Devis (filtrage, navigation, badges statut), fiche Devis (onglets G├®n├®ral/Lignes/Aper├ºu PDF, modal ajout ligne).
- `tests/ui-affaires.test.tsx` (17 tests) : liste Affaires (badges type/d├®lai, navigation), fiche Affaire (onglets G├®n├®ral/DQE/Avenants/D├®lais, bandeau alertes).
- `tests/ui-dqe.test.tsx` (9 tests) : grille DQE (chargement, ├®tat vide, colonnes, total HT, double-clic ├®dition, Enter sauvegarde, Escape annulation).
- `tests/ui-delais-alertes.test.tsx` (14 tests) : SuiviDelais (chargement, ├®tat vide, timeline, badges type, dur├®e, impact), BandeauAlertes (CSS niveaux, ic├┤nes, absence sans alerte).

### Validation Phase 2 ÔÇö rapport 20/08/2026

Les 8 points de validation ont ├®t├® v├®rifi├®s et rapport├®s :
1. ETAT_SESSION.md corrig├® (Phase 3 = PDF, pas UI)
2. Fichiers exacts avec statistiques de lignes
3. verifierEntier remplac├® par drapeau autoriserQuantitesNegatives (architecture propre)
4. BLÔåÆFA rabais march├® = lacune document├®e (voir ci-dessous)
5. DonneesAvoirDepot = type de mapping SQL pur, validations 100% dans domaine/avoir.ts
6. Transactions v├®rifi├®es : validerFacture, creerAvoir, genererFactureDepuisBons ÔÇö toutes avec base.transaction()
7. Tests : 69/69 cibl├®s verts ; typecheck+lint+garde-domaine verts ; 2 timeouts pr├®-existants Jalon 2
8. Aucun commit ni Phase 3 d├®marr├®s

### Fait ÔÇö Jalon 5 Phase 3 : PDF (complet ÔÇö 21/08/2026)

**Infrastructure PDF** :
- `electron/pdf/types.ts` (95 lignes) : interfaces `DonneesPdfFacture` (imbriqu├®e `DonneesFacturePdf`), `DonneesPdfDevis`, `DonneesPdfBl`, `DonneesLignePdf`, `DonneesPiedPdf`, `DonneesClientPdf`, `DonneesAffairePdf`, `DonneesEntreprisePdf`
- `electron/pdf/polices.ts` (36 lignes) : singleton `chargerPolices()` ÔÇö Roboto (pdfmake build) + NotoNaskhArabic (polices/)
- `electron/pdf/polices/NotoNaskhArabic-Regular.ttf` : police arabe (308 Ko)
- `electron/pdf/pdfmake-printer.d.ts` (12 lignes) : d├®claration de type pour `pdfmake/src/printer`

**Gabarits A4** :
- `electron/pdf/gabarit-facture.ts` (298 lignes) : en-t├¬te entreprise + num├®ro, infos document (date, ├®ch├®ance, BC), bloc client (raison sociale, NIF, adresse), bloc affaire, tableau lignes (7 colonnes : D├®signation/Unit├®/Qt├®/PU HT/Remise/Rabais/Net HT), pied facture (HT lignes ÔåÆ remises ÔåÆ net commercial ÔåÆ retenue ÔåÆ HT ÔåÆ TVA ÔåÆ TTC ÔåÆ NET ├Ç PAYER), mentions l├®gales footer, filigrane DUPLICATA SVG
- `electron/pdf/gabarit-devis.ts` (135 lignes) : DEVIS, tableau 5 colonnes, Total HT, mentions l├®gales dans content, DUPLICATA
- `electron/pdf/gabarit-bl.ts` (134 lignes) : BON DE LIVRAISON, tableau 3 colonnes (D├®signation/Unit├®/Qt├®), poids, mentions l├®gales, DUPLICATA

**Orchestrateur** :
- `electron/pdf/generer-pdf.ts` (36 lignes) : `genererPdfBuffer()` singleton PdfPrinter, `genererPdfFacture/Devis/Bl` (wrappers)

**Handlers IPC (wiring)** :
- `electron/ipc/ipc-factures.ts` (510 lignes) : handlers `genererPdf` (lecture d├®p├┤t ÔåÆ mapping entreprise/client/affaire ÔåÆ gabarit ÔåÆ buffer) et `imprimer` (VALIDEÔåÆIMPRIMEE + increment impressions) ÔÇö donn├®es lues depuis d├®p├┤t, z├®ro re-calcul

**Tests** :
- `tests/pdf-generation.test.ts` (197 lignes, 11 tests) :
  - A4 + content non vide
  - 10 mentions l├®gales obligatoires (PRD ┬º5.2)
  - Aucun timbre dans le document
  - Formatage montants HT/TVA/TTC/NET ├Ç PAYER
  - Police Roboto par d├®faut + NotoNaskhArabic
  - DUPLICATA absent/pr├®sent selon nombre_impressions
  - D├®signations dans le tableau
  - V├®rification : aucun calcul financier dans electron/pdf/

### Corrections appliqu├®es lors de la revue Phase 3

1. ipc-factures.ts : `donneesPdf` restructur├®e avec `facture: {}` imbriqu├® (conforme `DonneesPdfFacture`)
2. ipc-factures.ts : `entreprise` corrig├®e (`raisonSociale`/`capital`/`telephone` au lieu de `denomination`/`capitalCentimes`)
3. ipc-factures.ts : `typeLigne` ajout├® au mapping des lignes
4. ipc-factures.ts : `affaire: null` ÔåÆ `affaire: undefined` (conforme `DonneesAffairePdf | undefined`)
5. ipc-factures.ts : import `DonneesEntreprisePdf` ajout├®
6. tests/pdf-generation.test.ts : `ENTREPRISE_DEFAUT` align├®e avec `DonneesEntreprisePdf`
7. tests/pdf-generation.test.ts : `donneesDefaut()` restructur├®e avec `facture: {}` imbriqu├® + dates ISO
8. tests/pdf-generation.test.ts : `background()` appel├® avec `ContextPageSize` complet (width/height/orientation)
9. tests/pdf-generation.test.ts : mentions l├®gales test├®es via `gabarit.footer()` (le footer est une fonction, JSON.stringify la skip)

### Lacunes connues

- **BLÔåÆFA rabais march├®** : `genererFactureDepuisBons` hardcode `rabais_marche_bps: 0` au lieu de lire `affaires.rabais_marche_bps`. Document├® en Phase 2, hors p├®rim├¿tre Phase 3.
- **Avoir PDF** : `gabarit-facture.ts` g├¿re `typeDocument='AVOIR'` via `libelleTypeDocument()`, mais le handler `creerAvoir` n'appelle pas encore `genererPdf`. Le gabarit est pr├¬t.

### En cours / bloqu├®

- **Rien de bloqu├®.** Phase 4 compl├¿te et valid├®e. Diff ├á commiter sur jalon-5-phase4.

### Prochaine ├®tape pr├®vue

- **Jalon 5 Phase 5** : Tests e2e Playwright ÔÇö ne pas encha├«ner sans validation utilisateur explicite de la Phase 4.

## Historique ÔÇö Phase E (cl├┤tur├®e le 16/08/2026, bilan refonte valid├®)

**Refonte 15-16/08/2026 cl├┤tur├®e et document├®e.** `npm run verifier` : **22 fichiers / 541 tests, tout vert** (typecheck node+web, ESLint, garde-domaine, Vitest).

### Fait ÔÇö Phase E (revue transversale de cl├┤ture, termin├®e le 16/08/2026)

- **Revue de coh├®rence domaine ÔåÆ d├®p├┤ts ÔåÆ IPC ÔåÆ preload ÔåÆ renderer** (sous-agent explore) : **CONFORME** ÔÇö 12 canaux IPC d├®clar├®s Ôåö 12 handlers (correspondance 1-1 via `enregistrerHandlersIpc`, unique `ipcMain.handle`), aucun canal SQL g├®n├®rique, preload `window.egto` = API `ApiEgto` 100 % `CANAUX.*`, renderer `src/` minimal n'importe que `contrats/` et ne contient aucun calcul financier, `domaine/` TypeScript pur (double garde ESLint + scripts/garde-domaine.mjs), s├®curit├® fen├¬tre (contextIsolation/nodeIntegration/sandbox/CSP/will-navigate/windowOpenHandler deny) test├®e. Nuances non bloquantes : SQL dans migrations.ts/seeds.ts (couche base), CSP dev `style-src 'unsafe-inline'` neutralis├®e en prod, `electron-builder.yml` absent, canaux affaires/factures absents (modules futurs).
- **V├®rification des DoD J1ÔåÆJ4** : **J1 Ô£à 5/5** (10 cas pied, timbre manuel test├®, verifier vert 541 tests, tests sans Electron, base illisible sans cl├® test├®e l.229 base.integration) ; **J2 livr├® de fait** (enveloppe DEK chiffr├®e, egto-admin-reset, tests chiffrement ÔÇö Jalon 1 Phase 2-3) ; appellation ┬½ ÔØî non d├®marr├® ┬╗ **[P├ëRIM├ë le 28/08/2026]** ; **J3 ÔØî fondations partielles** (d├®p├┤t clients + IPC, entit├®s produit/tarif ; calculerScoreClient/resoudreTarif/import absents) ; **J4 ÔØî fondations partielles** (entit├®s commerciales + machines ├á ├®tats ; calculerDelaisAffaire/evaluerAlertes/convertirDevisEnAffaire/UI absents).
- **AGENTS.md mis ├á jour** : sous-section ┬½ D├®cisions m├®tier d├®finitives (15-16/08/2026) ┬╗ (6 r├¿gles : encaissement ENVOYEE, 4 modes effectifs, timbre manuel hors TTC, rabais march├® ligne par ligne, NIS 15, TAP supprim├®e) + ┬½ Limites assum├®es ┬╗ + 5 lignes nouvelles dans la table des interdits.
- **Bilan final cr├®├®** : `docs/bilan-refonte-2026-08-16.md` ÔÇö document de cl├┤ture complet (r├®sum├® ex├®cutif, p├®rim├¿tre par phase, revue transversale, DoD J1-J4, r├¿gles d├®finitives, limites assum├®es, vigilance/prochaines ├®tapes, m├®triques 22 fichiers/541 tests, source du bilan).

### D├®cisions ÔÇö Phase E

- Les 3 d├®cisions du 16/08/2026 restent **d├®finitives et closes** (pas de migration 4, blocage ENVOYEE, canal modifierTimbre p├®rim├¿tre timbre). La Phase E n'introduit **aucune nouvelle d├®cision** ÔÇö elle **cl├┤t** la refonte.
- Le bilan final consigne les limites assum├®es : colonnes mode de r├¿glement de `factures` historiques/d├®pr├®ci├®es, `PARTIELLEMENT_PAYEE` inerte (anticip├®), `TRAITE`/`LCN`/carte/virement postal/paiement ├®lectronique hors p├®rim├¿tre.

### En cours / bloqu├®

- **Rien de bloqu├®.** La refonte 15-16/08/2026 est **cl├┤tur├®e** et document├®e. Note de v├®rification : `tests/ipc-encaissements.test.ts` compte **26 cas** (23 it + it.each├ù3) vs 25 indiqu├® pr├®c├®demment ÔÇö ├®cart mineur signal├® dans le bilan (non bloquant).

### Prochaine ├®tape pr├®vue

- **Jalon 2** (s├®curit├® enveloppe, sauvegarde/restauration, coquille) ÔÇö **ne pas encha├«ner sans validation utilisateur explicite** du bilan final de la refonte. Rappel : template GITRA toujours en attente (┬º5.3 plan-mvp).

---

## Historique ÔÇö Phase D (cl├┤tur├®e le 16/08/2026, 3 d├®cisions utilisateur d├®finitives)

**Corrections Phase D cl├┤tur├®es (3 d├®cisions utilisateur 16/08/2026, d├®finitives).** `npm run verifier` : **22 fichiers / 541 tests, tout vert** (typecheck node+web, ESLint, garde-domaine, Vitest).

### Fait ÔÇö Corrections Phase D (3 d├®cisions utilisateur, valid├®es le 16/08/2026)

- **Pas de migration 4** : les colonnes de mode de r├¿glement de `factures` (migration 1) restent **historiques/d├®pr├®ci├®es** ; le mode effectif est exclusivement `encaissements.mode_reglement_effectif` (4 valeurs `ESPECES, CHEQUE, VIREMENT_BANCAIRE, DEPOT_ESPECES_BANQUE`).
- **Blocage des encaissements par statut de facture** (`electron/depots/depot-encaissements.ts`) : `STATUTS_FACTURE_AUTORISANT_ENCAISSEMENT = new Set(['ENVOYEE'])`, v├®rifi├® dans `creerEncaissement` avant validation/insertion (rollback transaction). Uniquement `ENVOYEE` encaissable, total **ou partiel** ; `BROUILLON`, `VALIDE`, `IMPRIMEE`, `PAYEE`, `ARCHIVEE` bloqu├®s (message : ┬½ Encaissement interdit : la facture est au statut ┬½ X ┬╗. Seule une facture ENVOYEE peut ├¬tre encaiss├®e. ┬╗) ; un futur `PARTIELLEMENT_PAYEE` rejoindrait la liste blanche (commentaire l.~25).
- **Canal `encaissements.modifierTimbre`** (p├®rim├¿tre timbre uniquement) : ne modifie que `timbre_statut`, `montant_timbre_saisi_centimes`, `timbre_traite_le`, `timbre_traite_par`, `reference_timbre_ou_quittance`, `commentaire_timbre` ÔÇö **jamais** le montant encaiss├®, le mode effectif, la facture, la date d'encaissement ni le num├®ro (correction = annulation + nouvel encaissement) ; ne touche pas `factures.statut` (une facture PAYEE reste PAYEE). Validation via `Encaissement.depuisDonnees` (contraintes conditionnelles du timbre), audit par le trigger UPDATE existant de la migration 2.
  - `electron/depots/depot-encaissements.ts` : `DonneesModificationTimbreEncaissement` + `modifierTraitementTimbreEncaissement(base, donnees)` ÔÇö lecture existant ÔåÆ fusion ÔåÆ `Encaissement.depuisDonnees` ÔåÆ UPDATE 6 colonnes timbre + `modifie_le` ÔåÆ relit et retourne `EnregistrementEncaissement | null` (introuvable ou supprim├®).
  - `electron/ipc/ipc-encaissements.ts` : `verifierDonneesModificationTimbreEncaissement` (forme), `mapperDonneesModificationVersDepot` (camelCase ÔåÆ snake, JJ/MM/AAAA ÔåÆ ISO via `versDateIso`), handler `encaissements.modifierTimbre` (ÔåÆ d├®p├┤t ÔåÆ null ÔçÆ ┬½ Encaissement introuvable ou supprim├®. ┬╗ ÔåÆ vue).
  - `contrats/encaissements.ts` : `DonneesModificationTimbreEncaissementVue` (6 champs timbre + id, dates JJ/MM/AAAA UI) avec commentaire de p├®rim├¿tre ; `contrats/canaux.ts` : `encaissements.modifierTimbre` ; `contrats/index.ts` : `ApiEgto.encaissements.modifierEncaissement` + re-export ; `electron/construire-api-egto.ts` : branchement invoke.
  - **Tests** : `tests/depot-encaissements.test.ts` (22 ÔåÆ 39 cas : blocage 5 statuts via `it.each`, PAYEE rejet├® avant anti-d├®passement, modifierTimbre 11 cas dont champs financiers inchang├®s en base, introuvable/supprim├® ÔåÆ null, audit UPDATE, PAYEE inchang├®), `tests/ipc-encaissements.test.ts` (17 ÔåÆ 25 cas : chemin renderer ÔåÆ domaine ÔåÆ d├®p├┤t ÔåÆ vue, rejets forme + domaine, champs prot├®g├®s inchang├®s en base, 4 canaux enregistr├®s), `tests/ipc-mapping.test.ts` (+4 : mappers aller, champs prot├®g├®s absents de `DonneesModificationTimbreEncaissement`).

### Fait ÔÇö Phase D, vague 3 (M22 contrats + IPC, termin├®e)

- **`contrats/encaissements.ts` (NOUVEAU)** : `ModeReglementEffectifVue` (4 litt├®raux), `StatutTimbreVue` (3), `EncaissementVue` (dates JJ/MM/AAAA), `DonneesCreationEncaissement`, montants en centimes.
- **`contrats/canaux.ts`** : canaux `encaissements.lister` / `encaissements.creer` / `encaissements.supprimer`.
- **`contrats/index.ts`** : `ApiEgto` + re-exports.
- **`electron/construire-api-egto.ts`** : assemblage de l'API IPC.
- **`electron/ipc/ipc-encaissements.ts` (NOUVEAU)** : `versDateIso`/`versDateAffichage` (le calendrier reste du domaine), `verifierDonneesCreationEncaissement`, mappers purs, handlers typ├®s (payload ÔåÆ `Encaissement.depuisDonnees` ÔåÆ d├®p├┤t ÔåÆ vue) ; aucun canal SQL g├®n├®rique.
- **`electron/ipc/enregistrer-ipc.ts`** : enregistrement des handlers.
- **`tests/ipc-mapping.test.ts`** : conversions, mappers, garde `contrats/` sans import domaine ├®tendue.
- **`tests/ipc-encaissements.test.ts` (NOUVEAU)** : 17 tests ÔÇö chemin renderer ÔåÆ domaine ÔåÆ d├®p├┤t ÔåÆ vue, rejets modes/montants/dates/timbre/d├®passement.

### Fait ÔÇö Phase D, vague 2 (d├®p├┤t factures, mat├®rialisation de l'├®cart)

- **`electron/depots/depot-factures.ts` (NOUVEAU)** : `materialiserLignesEtPiedFacture(base, factureId, parametres)` + `lireLignesFacture`. Premier consommateur production de `calculerPiedFacture`. Transaction better-sqlite3 : v├®rif facture ÔåÆ pied domaine (D9) ÔåÆ INSERT lignes commerciales (montants brut/remise/net ligne par ligne via `Montant`, identiques au domaine) ÔåÆ mat├®rialisation de l'├®cart d'arrondi ÔåÆ UPDATE totaux factures ÔåÆ contexte d'audit vid├®.
- **├ëcart d'arrondi** (|├®cart| Ôëñ 2, sign├®) d├®duit par double appel domaine : `pied(marchePublic=true).net_commercial ÔêÆ pied(marchePublic=false).net_commercial` ÔÇö sans extension du domaine ni parse de la cha├«ne. Garde interne : `pied.ajustement_ecart_audit === null Ôçö ├®cart === 0`.
- **March├® public** : ├®cart port├® par `UPDATE` sur la ligne ├®ligible (argmax net parmi rabais > 0, ├®galit├® ÔåÆ premi├¿re, m├¬me crit├¿re que le domaine), contexte_audit (motif ┬½ ajustement d'arrondi rabais march├® ┬╗) ÔåÆ trigger audit (motif + delta). **Document priv├®** : ligne `AJUSTEMENT_ARRONDI` (net = ├®cart sign├®, `type_ligne='AJUSTEMENT_ARRONDI'`, d├®signation ┬½ Ajustement d'arrondi ┬╗, `unite 'U'`), jamais si ├®cart nul.
- **Totaux (d├®cision) : la ligne AJUSTEMENT_ARRONDI contribue au total.** March├® public et priv├® ├®cart nul ÔåÆ totaux strictement du pied. Priv├® avec ├®cart Ôëá 0 ÔåÆ `net_commercial = pied.net_commercial + ├®cart`, cha├«ne net ÔåÆ retenue ÔåÆ HT ÔåÆ TVA ÔåÆ TTC recalcul├®e avec les arrondis du domaine (la ligne absorbe l'├®cart, la somme des nets = net commercial au centime). `droit_timbre_centimes` d├®pr├®ci├® laiss├® tel quel (jamais recalcul├®), timbre jamais calcul├®.
- **Audit** : le d├®p├┤t n'├®crit jamais dans `journal_audit` (grep de contr├┤le Ô£ô) ; il renseigne `contexte_audit` (id=1) dans sa transaction avant l'INSERT/UPDATE de ligne puis le vide (vid├® en fin de transaction).
- **`tests/depot-factures.test.ts` (NOUVEAU)** : 6 tests ÔÇö march├® +1 (cas 5, ├®galit├® ÔåÆ premi├¿re, audit UPDATE ecart=+1), march├® ÔêÆ1 (ligne de net le plus ├®lev├® = 2e, audit ecart=ÔêÆ1), march├® ├®cart nul (aucun ajustement, totaux = pied), priv├® +1 (ligne AJUSTEMENT_ARRONDI net=1, retenue 500 bps, cha├«ne recalcul├®e 19/1/18/3/21), priv├® ├®cart nul (aucune ligne d'ajustement), erreurs (facture introuvable, d├®signation vide, contexte laiss├® vide).

### Fait ÔÇö Phase D, vague 1 (d├®p├┤t encaissements + migration 3)

- **Migration 3** `electron/db/migrations/003_ajustement-arrondi-lignes.sql` : `lignes_facture.type_ligne` (NULL / 'AJUSTEMENT_ARRONDI'), `journal_audit.motif` + `journal_audit.ecart_centimes`, table `contexte_audit` (id=1, motif, ecart_centimes), triggers `trg_lignes_facture_audit_insert/update/delete` (lecture du contexte ÔåÆ motif/├®cart ; ligne normale sans contexte ÔåÆ motif NULL) ; `electron/db/migrations.ts` `VERSION_MAXIMALE = 3` ; `tests/migration-3.test.ts` (13 tests) ; `tests/base.integration.test.ts` (user_version 3, 31 tables, 26 triggers) ; `tests/migration-2.test.ts` mis ├á jour (user_version 3, 3 entr├®es historique).
- **M21 ÔÇö d├®p├┤t encaissements** `electron/depots/depot-encaissements.ts` (NOUVEAU) : `listerEncaissements`, `lireEncaissement`, `creerEncaissement` (transaction : validation `Encaissement.depuisDonnees`, anti-d├®passement via `calculerSoldeFacture` en ceinture-bretelles avec triggers migration 2, num├®rotation ENC verrouill├®e via `lireCompteur`/`incrementerCompteur`/`attribuerNumero` + garde de s├®quence, passage PAYEE au solde nul via `transiter(machineEtatsFacture, statut, 'ENCAISSER')`), `supprimerEncaissement` (logique, ne retire jamais PAYEE ÔÇö d├®cision document├®e) ; `domaine/identites.ts` : 'ENC' ajout├® ├á `CODES_DOCUMENT` ; `tests/depot-encaissements.test.ts` (22 tests).

### Fait ÔÇö Phase A (documentation, valid├®e)

9 fichiers mis ├á jour : `prd-cda.md` v2.2 (nouveau ┬º4.4.5bis, ┬º4.4.6 sans timbre, ┬º4.5.1, ┬º4.7.3 d├®pr├®ci├®, ┬º5.2 = 10 mentions l├®gales l.995, ┬º16 l.10/11/12) ; `docs/decisions-j0.md` (┬º1.16.2 d├®pr├®ci├®, ┬º1.16.3 r├®voqu├®, ┬º16.4 TAP, ┬º16.5 NIS 15, nouveaux ┬º1.16.10/11/12) ; `docs/plan-mvp.md` (DoD J1 r├®├®crite, D17/M21/M22/Q28) ; `docs/dictionnaire-donnees.md` ; `docs/matrice-tracabilite-champs.md` ; `docs/wireframes/wireframe-fiche-facture.html` ; `design.md` ; `CLAUDE.md` ; `.opencode/agent/orchestrator.md`.

### Fait ÔÇö Phase B (sch├®ma, valid├®e)

Migration 2 `electron/db/migrations/002_rabais-marche-et-encaissements.sql` : table `encaissements`, ALTER `affaires`/`lignes_facture` (rabais march├®), index partiel `ux_encaissements_numero`, `ix_encaissements_facture`, triggers anti-d├®passement + audit ; `encaissements.timbre_statut TEXT NOT NULL DEFAULT 'A_VERIFIER'` + 3 CHECK conditionnels renforc├®s. `electron/db/migrations.ts` `VERSION_MAXIMALE = 2` ; `tests/migration-2.test.ts` (20 tests) ; `tests/base.integration.test.ts` mis ├á jour. `schema.sql` (migration 1) intouch├®. **Correction appliqu├®e directement dans la migration 2, sans migration 3.**

### Fait ÔÇö Phase C (domaine, valid├®e)

- **D9 `domaine/pied-facture.ts` r├®├®crit** : base = **BRUT** (rabais march├® = brut ├ù bps), net ligne = brut ÔêÆ remise ÔêÆ rabais march├®, **plus de timbre ni de rabais global**, `net_a_payer = total_ttc` ; ├®cart d'arrondi (Ôëñ 2 centimes) appliqu├® ├á la ligne ├®ligible la plus ├®lev├®e avec trace audit (march├®s publics) / trac├® sans ajustement (priv├®, `AJUSTEMENT_ARRONDI` optionnelle, jamais si ├®cart nul) ÔåÆ champ `ajustement_ecart_audit`.
- **D17 `domaine/solde-facture.ts` (NOUVEAU)** : `calculerSoldeFacture` + `estSoldeNul`.
- **D10 `domaine/droit-timbre.ts`** : d├®pr├®ci├® isol├® (fonctions conserv├®es, tests inchang├®s).
- **`domaine/entites-facturation.ts`** : `PiedFacture` sans `droit_timbre_centimes`, + `ajustement_ecart_audit` ; `mode_reglement_effectif` valid├® contre `MODES_REGLEMENT_EFFECTIFS` ; `DonneesFacture`/`FactureNormalise` conservent `droit_timbre_centimes` d├®pr├®ci├® ; `LigneFacture` + champs rabais march├®.
- **`domaine/identites.ts`** : `MOTIF_NIS = /^\d{15}$/`.
- **`domaine/entites-referentielles.ts`** : `MODES_REGLEMENT` (5 valeurs) conserv├® d├®pr├®ci├® partiel ; **`MODES_REGLEMENT_EFFECTIFS` = ['ESPECES','CHEQUE','VIREMENT_BANCAIRE','DEPOT_ESPECES_BANQUE']** + type `ModeReglementEffectif`.
- **`domaine/encaissements.ts` (NOUVEAU)** : entit├® domaine avec validations (montant > 0, `verifierDateIso`, mode parmi les 4 effectifs, `timbre_statut` d├®faut `A_VERIFIER`, contraintes conditionnelles miroir des CHECK).
- **`domaine/machines-etats.ts`** : commentaire sur ENCAISSERÔåÆPAYEE (contr├┤le de solde externe, Phase D) ; transitions inchang├®es.
- **Tests** : `pied-facture.test.ts` (10 cas types r├®├®crits), `solde-facture.test.ts`, `encaissements.test.ts` (41), `identites.test.ts` (NIS 15), `machines-etats.test.ts`, `entites-referentielles.test.ts` (NIS 11ÔåÆ15, l.14/74/~260).
- **Corrections doc** : `docs/dictionnaire-donnees.md` l.401 (base = brut explicite) et l.362/l.391 (total_remises, remise ligne sur brut, plus de rabais global) ; `docs/wireframes/wireframe-fiche-client.html` l.83 (NIS 15 chiffres).

### D├®cisions ÔÇö Phase D

- **Migration 3** : `contexte_audit` pour audit par triggers uniquement (le d├®p├┤t n'├®crit jamais dans `journal_audit`) ; motif/├®cart trac├®s.
- **D├®p├┤t encaissements** : num├®ro ENC verrouill├® ├á la cr├®ation ; anti-d├®passement double (domaine + triggers) ; PAYEE uniquement au solde nul via machine ├á ├®tats ; suppression logique **ne retire jamais PAYEE** (une facture pay├®e reste pay├®e, corrections = r├®gularisations ult├®rieures).
- **├ëcart d'arrondi** : march├® public ÔåÆ UPDATE de la ligne ├®ligible (audit ligne cible/ancien montant/├®cart/motif) ; priv├® ÔåÆ `AJUSTEMENT_ARRONDI` si ├®cart Ôëá 0, jamais si nul ; la ligne d'ajustement contribue au total.
- **Dates** : ISO en base, JJ/MM/AAAA en UI (conversion du calendrier d├®l├®gu├®e au domaine).
- **Montants en centimes entiers dans le contrat** ; conversion DA = affichage renderer.

### D├®cisions utilisateur 16/08/2026 (d├®finitives ÔÇö cl├┤turent les 3 points d'arbitrage du bilan Phase D)

- **Pas de migration 4** : les anciennes colonnes de mode de r├¿glement de `factures` (migration 1) restent historiques/d├®pr├®ci├®es ; le mode effectif est exclusivement `encaissements.mode_reglement_effectif` (4 valeurs `ESPECES, CHEQUE, VIREMENT_BANCAIRE, DEPOT_ESPECES_BANQUE`). [arbitrage 1 clos]
- **Blocage des encaissements selon le statut de la facture** : autoris├®s uniquement sur une facture `ENVOYEE` (tout encaissement, m├¬me partiel) ; `BROUILLON`, `VALIDE`, `IMPRIMEE`, `PAYEE`, `ARCHIVEE` bloqu├®s ; un ├®ventuel futur `PARTIELLEMENT_PAYEE` rejoindrait la liste blanche. [arbitrage 2 clos]
- **Canal `modifierEncaissement` au p├®rim├¿tre timbre uniquement** : `encaissements.modifierTimbre` ne modifie que les 6 colonnes du timbre ÔÇö jamais le montant encaiss├®, le mode effectif, la facture, la date d'encaissement ni le num├®ro (correction = annulation + nouvel encaissement) ; `factures.statut` intact (une facture PAYEE reste PAYEE). [arbitrage 3 clos]

---

## Historique ÔÇö Jalon 1 (cl├┤tur├® le 13/08/2026, DoD J1 Ô£à)

Socle & c┼ôur de calcul livr├®s et v├®rifi├®s : 15 fichiers de tests, 358 tests verts, `npm run verifier` vert. Socle (M1/M10/D16/Q1/Q15/Q21/Q23), base chiffr├®e (M2-M5, SQLCipher, migration 1 = `schema.sql` J0 verrouill├®), d├®p├┤ts (M6/Q13), c┼ôur de calcul D2-D11 (Montant, identit├®s, r├®f├®rentiels, commerciales, facturation, machines ├á ├®tats, classification, D9/D10/D11), contrats & IPC (M7/M8/M9), revue ind├®pendante CONFORME (z├®ro ├®cart au centime).

### D├®cisions J1 conserv├®es (historique)

- Base du rabais global = total HT avant remises lignes (arbitrage ┬º4.4.6, **d├®pr├®ci├® par la refonte 15/08**) ; bornes des tranches du timbre borneMin incluse / borneMax exclue ; machines ├á ├®tats sans `ARCHIVER_SANS_ENVOI` ; cl├® de dev provisoire `userData/egto.cle` (remplac├®e par l'enveloppe DEK en J2).
- Architecture : fronti├¿re unique `domaine/` (TypeScript pur) + garde-fou ESLint ; retenue de garantie avant TVA (d├®cision ­ƒôî, isol├®e dans `calculerPiedFacture`) ; chiffrement SQLCipher + phrase de r├®cup├®ration, mot de passe ZIP distinct (09/08/2026, ┬º16.9) ; num├®ro ├á la validation seule, TVA 19 %, timbre esp├¿ces seul (seuil 1 M DA param├®tr├®) ; centimes INTEGER, suppression logique, audit par triggers, NIF/NIS TEXT sans CHECK, pas de table Avoirs, int├®r├¬ts moratoires en montant direct.
- D├®cisions 09/08/2026 impl├®ment├®es le 12/08/2026 : d├®clencheur timbre esp├¿ces confirm├® comptable ; bar├¿me param├®trable (table `bareme_timbre`) ; int├®r├¬ts moratoires = montant saisi ; propagation compl├¿te dans PRD/d├®cisions/erd/dictionnaire/matrice/plan/CLAUDE/AGENTS/orchestrator.
- Ouverts J1 : valeurs du bar├¿me du timbre, convention des bornes de tranches, base du rabais global (tranch├® 15/08), libell├®s des familles seeds, statut de la TAP (supprim├®e 15/08), longueur NIS (tranch├® 15 : 15 chiffres).