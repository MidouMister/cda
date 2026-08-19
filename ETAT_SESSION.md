# État de la session — EGTO Gestion Commerciale

## Dernière session : 19/08/2026 — Jalon 4 Phase 3 (UI: R11, R12, R13, R14)

**Jalon 4 complet.** 
npm run verifier (typecheck node+web + lint + garde-domaine + vitest) : **42 fichiers / 917 tests, tout vert**.

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

### En cours / bloqué

- **Rien de bloqué.** Jalon 4 complet (Phase 1 + 2 + 3).

### Prochaine étape prévue

- **Jalon 5** : numérotation, facturation, PDF, impression.

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
