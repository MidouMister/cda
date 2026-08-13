# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## État du dépôt

Dépôt **de spécification, pas encore de code**. Contenu actuel :

- [prd-cda.md](prd-cda.md) — PRD v2.1 (~1370 lignes), **source de vérité unique** du projet. Toute décision produit, fiscale ou d'architecture s'y trouve déjà tranchée ; ne pas réinventer, aller lire la section concernée.
- [opencode.json](opencode.json) — config opencode (provider AgentRouter, MCP context7).
- [.agents/skills/](.agents/skills/) + [skills-lock.json](skills-lock.json) — skills installées : `electron` (architecture main/renderer/preload, IPC, packaging), `frontend-design`, `find-skills`.

Il n'y a **ni `package.json`, ni `tsconfig.json`, ni source, ni test, ni build**. Aucune commande npm n'est exécutable aujourd'hui. Le premier travail de code consiste à scaffolder le projet décrit en §5.5 du PRD.

## Projet

Application desktop Windows de gestion commerciale pour **E.G.T.O** (travaux publics, Oran — enrobés, VRD, génie civil), filiale de GITRA.

Contraintes structurantes qui expliquent presque tous les choix techniques :

- **Mono-poste, mono-utilisateur.** Un seul login, pas de table Utilisateurs, pas de rôles. Aucune évolution multi-utilisateur prévue — ne pas introduire d'abstraction « au cas où ».
- **Hors ligne.** Aucune dépendance réseau au fonctionnement courant, pas de serveur HTTP interne, pas d'API externe. Communication exclusivement par IPC Electron.
- **Faible volumétrie** : < 50 affaires/an, < 200 factures/an. Privilégier la simplicité et la lisibilité sur l'optimisation.
- **Français exclusif** à l'interface et aux documents. Dates `JJ/MM/AAAA`, monnaie DA, TVA 19 % (taux unique).

## Commandes (à créer — PRD §5.5.4)

Scripts attendus dans le `package.json` à scaffolder :

```json
"dev": "vite",
"build": "tsc && vite build",
"electron:dev": "npm run build && electron .",
"electron:build": "npm run build && electron-builder",
"dist": "npm run build && electron-builder --win --x64",
"postinstall": "electron-builder install-app-deps",
"test": "vitest",
"test:e2e": "playwright test"
```

Un test unitaire ciblé : `npx vitest run src/services/facture.service.test.ts`, ou `npx vitest -t "droit de timbre"` pour un cas nommé. Un parcours e2e ciblé : `npx playwright test tests/e2e/facturation.spec.ts`.

Politique de versions (§5.5.1) : **aucune version figée** — installer les dernières stables au démarrage du projet, revue trimestrielle des dépendances.

## Phasage — savoir quoi construire

Le PRD §3 impose 5 phases. Ne pas anticiper une phase ultérieure sans demander.

| Phase | Périmètre |
|---|---|
| 0 — Cadrage | ERD + dictionnaire de données, wireframes, **validation du template Excel GITRA** (dépendance bloquante), réponses à l'annexe §16 |
| 1 — MVP | M7 paramétrage/sécurité/sauvegarde, M2 clients, M3 catalogue, M9 devis, M1 affaires (sans déclarations), M4 FA/AC/AV/BL + PDF, M13 import |
| 2 — Cœur BTP | Déclarations mensuelles, ST, révision de prix, rapport mensuel PDF+Excel, M5 créances, M11 cautions, M12 retenues |
| 3 — Pilotage | M8 sous-traitance, M6 dashboards, relances, correspondances, registre des consultations |
| 4 — Durcissement | Rapports personnalisables, provisions, e2e, manuel utilisateur, restauration testée |

Modules : M1 affaires, M2 clients/CRM, M3 catalogue, M4 facturation (BL inclus en §4.4.11), M5 créances, M6 dashboards, M7 paramétrage, M8 sous-traitance, M9 devis, M11 cautions, M12 retenues de garantie, M13 import. **Il n'existe pas de M10** — saut volontaire dans la numérotation.

## Architecture cible (PRD §5.5)

Electron + React + TypeScript + Vite, packagé NSIS x64 par electron-builder. Trois processus, séparation stricte :

```
Main (Node)      better-sqlite3 + SQLCipher (WAL) · pdfmake · exceljs · fs
   ↑ IPC typé par domaine
Preload          contextBridge → window.electronAPI (affaires.*, factures.*, pdf.*, …)
   ↑
Renderer         React · Tailwind · shadcn/ui · React Router · Zustand · TanStack Query · Recharts
```

Règles non négociables :

- **Zéro Node.js dans le renderer.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP `default-src 'self'`.
- **Aucun canal SQL générique** exposé au renderer. L'IPC est typé **par domaine métier** (`affaires.create`, `factures.validate`, `devis.convertToAffaire`…), chaque requête étant une fonction préparée côté Main. Un canal `db.query(sql)` serait une régression de sécurité.
- **PDF et Excel se génèrent côté Main.** Le renderer envoie une définition JSON (document pdfmake, workbook exceljs), le Main écrit dans `Documents/EGTO/`.
- **Polices pdfmake** : Roboto **+ Noto Naskh Arabic ou Amiri** — Roboto seul ne contient aucun glyphe arabe et les documents EGTO en ont besoin.
- **Migrations** : `PRAGMA user_version` + `electron/db/migrations/` exécuté séquentiellement au démarrage, table `migrations_history`.

Répartition des libs de tableaux (§5.5.4bis, arbitrage déjà tranché) : **TanStack Table** pour toutes les listes métier ; **AG Grid Community** réservé exclusivement à la saisie de masse (DQE, déclaration mensuelle) ; **shadcn/ui** pour les primitives seules (Dialog, Form, Tabs, Calendar, Select) — jamais pour afficher un tableau.

L'arborescence cible complète est en §5.5.3 du PRD (`electron/{main,preload,ipc,db}` + `src/{components,hooks,stores,routes,lib,types,services}`). La logique métier vit dans `src/services/` (calculs délais, pied de facture, scoring, assemblage rapport), pas dans les composants.

## Invariants métier

Ces règles traversent tout le code ; les enfreindre casse la conformité fiscale ou la cohérence comptable.

- **Montants en centimes (`INTEGER`), jamais en `REAL`.** Arrondi 2 décimales half-up, appliqué **ligne par ligne puis au total** du document (§10.3). L'ordre compte : arrondir seulement au total donne un résultat différent.
- **Numéro attribué à la validation, jamais au brouillon** (§4.4.2). Un brouillon supprimé ne consomme pas de numéro — aucun trou dans la séquence des documents validés. Numéro verrouillé après attribution.
- **Numérotation ST par marché** : `ST-<N°affaire>-NNN` (ex. `ST-AFG-2026-00012-003`), pas par année comme les autres documents (`FA-YYYY-NNNNN`, `AV-`, `AC-`, `FS-`, `ND-`, `DEV-`, `BL-`, `CLI-`, `ENC-`, `AFG-`, `AVT-`, `BCST-`, `DCS-`, `PAY-SST-`).
- **Alerter plutôt que bloquer** (§5.3) — principe transversal. Client en vigilance, plafond de crédit dépassé, déclaration saisie en retard : badge visuel, jamais d'action empêchée. Le concept de « client bloqué » a été explicitement retiré. Seules exceptions : les verrous strictement fiscaux (numérotation, exercice clôturé figé).
- **Pas de suppression physique** : suppression logique (`deleted_at`, statut). Chaque table métier porte `id`, `created_at`, `updated_at`, `deleted_at`, `statut`.
- **Pas de modification rétroactive** d'une déclaration mensuelle ou d'une ST validée — régularisation par lignes négatives sur la période suivante.
- **Classification Noir/Blanc/Autre figée en snapshot** sur chaque ligne de déclaration au moment de la saisie : un changement de sous-famille catalogue ne doit pas réécrire l'historique.
- **Journal d'audit par triggers SQLite** (§5.5.9), pas par appels explicites dans les handlers — un handler oublié laisserait un trou, un trigger non. Table `audit_log`, lecture seule, rétention illimitée.
- **TVA 19 % verrouillée au niveau produit.** Le pied de facture suppose un taux unique ; le multi-taux est hors périmètre et exigerait une refonte de la ventilation HT.
- **Retenue de garantie 5 % sur base HT**, public comme privé (surcharge possible par affaire).

Pied de facture (§4.4.6), dans cet ordre exact :

```
Total HT lignes − remises lignes − rabais global
= Net commercial HT
− remboursement avance (prorata auto) − retenue de garantie (base HT)
= Total HT facture  + TVA 19 %  = Total TTC
+ droit de timbre (barème §4.7.3, uniquement si règlement prévu en espèces, seuil paramétré)
= NET À PAYER
```

Le **droit de timbre** suit un barème à tranches **paramétrable en base** (§4.7.3) — jamais de taux en dur dans le code. Il ne s'applique **jamais** au virement ni au LCN.

## Chiffrement (§9.1) — à lire avant de toucher à l'auth ou aux sauvegardes

Chiffrement en enveloppe. Une **DEK** aléatoire 256 bits chiffre la base SQLCipher et n'est jamais stockée en clair. Elle est enveloppée deux fois indépendamment : par une clé dérivée du **mot de passe** (argon2id, sel distinct du hachage) et par une clé dérivée d'une **phrase de récupération** générée à l'installation, affichée une seule fois, conservée hors du poste par la direction.

Conséquences pratiques : un changement de mot de passe ne rechiffre **que l'enveloppe**, jamais la base. L'utilitaire `egto-admin-reset` exige la phrase de récupération et ne réinitialise rien sans elle — l'accès physique au poste ne doit pas suffire à contourner le chiffrement. Chaque sauvegarde embarque le blob d'enveloppe **de recours** uniquement, jamais l'enveloppe utilisateur ni la DEK.

## Points ouverts (annexe §16) — ne pas trancher seul

Le template Excel GITRA du rapport mensuel **n'existe pas encore** : développer M4.9 avant sa validation expose à une reprise complète. Décisions déjà tranchées (09/08/2026) : timbre = espèces uniquement (seuil 1 M DA paramétré), intérêts moratoires = montant saisi sur la ND. Restent à confirmer par le comptable/fiscaliste EGTO : **valeurs** du barème du droit de timbre, statut de la TAP, longueurs NIF/NIS, mot de passe des exports ZIP. Les valeurs présentes au PRD sont des **valeurs de départ paramétrables**, pas des constantes validées — d'où l'exigence de les stocker en table de paramétrage.

## Convention de lecture du PRD

Dans [prd-cda.md](prd-cda.md) : 📌 = décision tranchée, non négociable — la respecter telle quelle. 🆕 = ajout v2.1. ⚠️ = à valider avec un tiers, voir §16.

