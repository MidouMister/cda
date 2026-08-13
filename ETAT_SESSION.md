# État de la session — EGTO Gestion Commerciale

## Dernière session : 13/08/2026

### Fait — Jalon 1 clôturé (DoD J1 ✅)

Socle & cœur de calcul livrés et vérifiés : **15 fichiers de tests, 358 tests verts, `npm run verifier` vert en une commande** (typecheck node+web, eslint, garde-domaine, vitest).

**Socle (M1, M10, D16, Q1, Q15, Q21, Q23)** : scaffold Electron 43 + React 19 + TS 5.9 + Vite (electron-vite), config tri-cible, ESLint flat config + règle garde-fou `domaine/` ; renderer durci (contextIsolation, sandbox, nodeIntegration=false, CSP `default-src 'self'`, refus de navigation externe — vérifié en CI, Q21) ; `npm run verifier` = typecheck && lint && garde && vitest.

**Base chiffrée (M2-M5)** : `electron/db/connexion.ts` (SQLCipher via `better-sqlite3-multiple-ciphers`, PRAGMA key échappée, WAL, foreign_keys ON, singleton) ; `migrations.ts` (PRAGMA user_version + migrations_history, migration 1 = `schema.sql` J0 verrouillé non modifié) ; `seeds.ts` (familles VTE/LOC/REA/ST, exercice 2026, barème du timbre 4 tranches avec plancher 500 / plafond 1 000 000, seuil espèces 100 000 000 centimes) ; **DoD : base illisible par un client SQLite standard sans la clé (testé)**. Ouverture au démarrage avec clé de dev générée au 1er lancement dans `userData/egto.cle` (hors dépôt, jamais versionnée) — **mécanisme provisoire, remplacé par l'enveloppe DEK en J2**.

**Dépôts (M6, Q13)** : `electron/depots/` — conversion-centimes, parametres, bareme-timbre (tranches actives), compteurs (incrément transactionnel, unicité doc+année+affaire), exercices, familles, clients. SQL 100 % en requêtes préparées, aucun canal SQL générique.

**Cœur de calcul (D2-D11) — TypeScript pur dans `domaine/`, zéro import externe (garde-fou)** : D2 `Montant` (centimes, half-up, refus de construction depuis un flottant) ; D3 identités (NumeroDocument, Nif, Nis, Periode) ; D4 référentiels (Client, Contact, Interaction, Produit, Tarif, Famille, SousFamille) ; D5 commerciales (Devis, LigneDevis, Affaire, PosteDqe, Avenant, Reception) ; D6 facturation (Facture, LigneFacture, BonLivraison, PiedFacture) ; D7 machines à états (facture/affaire/devis, transition illégale = erreur) ; D8 classification NOIR/BLANC + snapshot au moment de la saisie ; D9 `calculerPiedFacture` (enchaînement §4.4.6, arrondi ligne par ligne puis au total) ; D10 `calculerDroitTimbre` (barème reçu en paramètre, déclenché uniquement en espèces, seuil paramétré, plancher/plafond) ; D11 `attribuerNumero` (numéro à la validation seule, PRÉFIXE-AAAA-SEQ, brouillon sans consommation).

**Tests** : Q2 (48 tests Montant/identités), Q3 (**10 cas types du pied de facture** — avec/sans retenue × avec/sans timbre — au centime près, recalculés par revue indépendante sans écart), Q4 (28 tests timbre dont barème modifié à chaud = preuve DoD), Q5 (27 tests numérotation), Q13 (16 tests dépôts), Q15/Q21 (garde CI), durcissement, IPC mapping.

**Contrats & IPC (M7, M8, M9)** : `contrats/` (vues par domaine : parametres, bareme, exercices, familles, clients, diagnostic + constante `CANAUX`) — le renderer ne connaît que ces types, aucun import du domaine ; `electron/preload.ts` (contextBridge `egto` : API métier typée, jamais d'`invoke` générique exposé) ; `electron/ipc/` (handlers par domaine : diagnostic, parametres, bareme, exercices, familles, clients + `enregistrer-ipc.ts` — validation d'entrée, orchestration des dépôts, mapping en vue ; AUCUN SQL).

**Revue indépendante** (reviewer calculs D9/D10/D11) : **CONFORME** — recalcul manuel des 10 cas + timbre + numérotation, zéro écart au centime ; aucun taux en dur dans `domaine/` ; `npm run verifier` et `npm run build` verts.

### Décisions prises (J1)
- **Base du rabais global = total HT des lignes, avant déduction des remises lignes** (arbitrage §4.4.6 — le PRD liste « − Remises lignes − Rabais global » sans base ; documenté dans `pied-facture.ts`, fichier isolé exprès, à valider par le service commercial).
- **Bornes des tranches du timbre** : borneMin incluse / borneMax exclue (à acter avec l'expert-comptable pour 300 / 30 000 / 100 000 DA exactement).
- **Machines à états** : cycle facture BROUILLON→VALIDER→IMPRIMER→ENVOYER→ENCAISSER→ARCHIVER sans chemin `ARCHIVER_SANS_ENVOI` (traçabilité fiscale d'un document numéroté ; l'annulation passe par un avoir) ; affaire et devis minimaux conformes §4.1.3/§4.9.3.
- **Clé de dev J1** dans `userData/egto.cle` (générée au 1er lancement, jamais versionnée) — provisoire.

### Décisions prises (antérieures — conservées)
- **Architecture** : pas de Clean Architecture complète — une seule frontière `domaine/` (TypeScript pur) + garde-fou ESLint, le reste vit dans le Main Electron.
- **Pied de facture** : retenue de garantie appliquée avant la TVA (lettre de §4.4.6, décision 📌 client) — isolée dans `calculerPiedFacture` pour un arbitrage ultérieur sans refonte.
- **Chiffrement** : `better-sqlite3-multiple-ciphers` (SQLCipher compatible), chiffrement en enveloppe avec phrase de récupération ; **mot de passe ZIP des exports distinct du mot de passe applicatif** (validé le 09/08/2026, §16.9).
- **Règles fiscales verrouillées** : numéro attribué à la validation seule ; TVA 19 % unique ; **timbre selon barème paramétré, déclenché uniquement si règlement prévu en espèces (seuil 1 M DA paramétré)** ; montants en centimes.
- **Schéma J0** : unités toutes en `INTEGER` (`_centimes`, `_bps`, `_milliemes`), zéro colonne `REAL` ; suppression logique `supprime_le` + index d'unicité partiels `WHERE supprime_le IS NULL` ; audit par triggers SQLite ; NIF/NIS en `TEXT` sans CHECK de longueur (validation app, NIS 11/15 à confirmer CNRC) ; pas de table Avoirs (type `AV` + `facture_origine_id`) ; statut affaire démarre à `SIGNE` ; conversions devis→affaire tracées (`ligne_devis_id`, `origine`, `devis.affaire_id`) ; **intérêts moratoires en montant direct (`factures.interets_moratoires_centimes`), plus aucun taux en base**.
- **Décisions 09/08/2026 implémentées le 12/08/2026** :
  - **Droit de timbre — déclencheur confirmé par le comptable** : **uniquement si versement en espèces dans la caisse** (`mode_reglement_prevu = 'ESPECES'`) ; seuil max **1 000 000 DA** paramétré (`parametres.timbre.seuil_max_especes_centimes`, défaut 100 000 000 centimes) ; **jamais** pour chèque, traite, virement, LCN (révocation de l'ancienne règle {Espèces, Chèque, Traite}).
  - **Barème du timbre paramétrable** dans l'onglet Paramétrage (écran R7, table `bareme_timbre` en CRUD) — jamais de taux en dur.
  - **Intérêts moratoires = montant saisi** sur une ND proposée ; suppression de `affaires.taux_interets_moratoires_bps` et de `parametres.taux.interets_moratoires_bps`.
  - **Propagation effectuée** : `electron/db/schema.sql` (colonne + triggers d'audit, **revalidé par exécution** : base vierge, zéro REAL, triggers, valeur audités), `prd-cda.md` (§4.1.4, §4.4.4, §4.7.3, §7.1, §13, §16.2-§16.3), `docs/decisions-j0.md` (§1.16.2, §1.16.3, §2.12, §3), `docs/erd.md`, `docs/dictionnaire-donnees.md`, `docs/matrice-tracabilite-champs.md`, `docs/plan-mvp.md` (DoD J1, D10, Q4, jalons), `CLAUDE.md`, `AGENTS.md`, `.opencode/agent/orchestrator.md`.
- **À reporter dans le PRD** : colonnes transversales françaises (`cree_le`/`modifie_le`/`supprime_le`) §10.2, et suppression logique §5.3 (le PRD mentionne un statut « Supprimé »).

### En cours / bloqué
- **Jalon 1 entièrement clôturé (DoD J1 ✅)** — tous les livrables du jalon sont en place ; point de contrôle GITRA à chaque revue de jalon (§5.3).
- **Bloqué** : validation comptable GITRA du template du rapport mensuel (structure confirmée côté commercial EGTO) — non bloquant pour le MVP.
- **Ouverts (validation comptable / métier avant production)** : valeurs du barème du timbre (seeds `decisions-j0.md` §1.16.2 — le déclencheur espèces et le seuil 1 M DA sont confirmés) ; convention des bornes de tranches (300 / 30 000 / 100 000 DA exactement) ; **base du rabais global** (choix J1 : total HT lignes avant remises lignes) ; **libellés des familles seeds** (« Vente/Location/Réalisation/Sous-traitance » vs « VENTES/LOCATIONS/RÉALISATIONS/SOUS-TRAITANCE » du dictionnaire — codes identiques, à aligner avant J3) ; statut de la TAP (confirmation finale) ; longueur NIS (11 vs 15).
- **Corrections documentaires** : coquille `docs/decisions-j0.md:25` corrigée (défaut seuil = 100 000 000 centimes).

### Prochaine étape prévue
- **Jalon 2** : chiffrement en enveloppe (M11 DEK 256 bits + argon2id, M12 phrase de récupération, M13 egto-admin-reset, M14 sauvegarde/export ZIP, M16 assistant premier démarrage), écrans Connexion et premier démarrage (R2), journal applicatif (M15), tests Q14/Q16. **Ne démarre pas sans confirmation explicite** — 5 points d'arbitrage ouverts à trancher d'abord (barème, bornes timbre, rabais global, libellés familles, TAP/NIS).
