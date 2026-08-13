# Plan d'exécution MVP — EGTO Gestion Commerciale

Plan d'exécution dérivé de [prd-cda.md](../prd-cda.md) (PRD v2.1, source de vérité unique) et d'une revue du premier plan ([plans.md](../plans.md)). Il reprend les décisions utiles de ce premier plan — jalons, chemin critique, arbitrages — et simplifie l'architecture : **pas de Clean Architecture complète**, une seule frontière digne de ce nom (logique pure vs le reste), vérifiée par une garde-fou automatique.

---

## 1. Préambule

### 1.1 Périmètre du MVP

Identique au premier plan : **Phase 1** du PRD ([prd-cda.md:84](../prd-cda.md#L84)), précédée du livrable de cadrage. M7 paramétrage/sécurité/sauvegarde, M2 clients, M3 catalogue, M9 devis, M1 affaires **sans déclarations mensuelles**, M4 facturation FA/AC/AV/BL + PDF, M13 import initial. Objectif : **être capable de facturer au plus tôt**.

Hors MVP (à replanifier après recette) : déclarations mensuelles et ST, révision de prix, rapport mensuel GITRA (**bloqué** par l'absence de template, [prd-cda.md:1357](../prd-cda.md#L1357)), créances, cautions, retenues de garantie, sous-traitance, dashboards, rapports personnalisables.

### 1.2 Décisions verrouillées en entrée

| Sujet | Décision | Conséquence |
|---|---|---|
| Point de départ | Modèle de données d'abord | J0 produit l'ERD, le dictionnaire et le schéma avant toute ligne de code applicatif |
| Chiffrement | `better-sqlite3-multiple-ciphers` | API synchrone conservée, cipher compatible SQLCipher, pas de compilation OpenSSL |
| Pied de facture | §4.4.6 appliqué à la lettre | La retenue de garantie réduit la base taxable. Décision assumée du client ; le calcul est isolé dans un seul fichier (`calculerPiedFacture`) pour qu'un arbitrage comptable ultérieur ne touche qu'un fichier et ses tests |
| Nommage | Tout en français | Entités, tables, fichiers, fonctions, variables, messages. Seules les APIs tierces gardent leur langue |
| Plateforme | Windows 10/11 x64, Electron, NSIS | Conventions Windows (`Ctrl`), design sobre adapté au BTP |
| Monnaie | Centimes (`INTEGER`), arrondi 2 décimales half-up, ligne par ligne puis au total (§10.3) | Objet `Montant` construit uniquement depuis des entiers |

### 1.3 Architecture — une frontière, pas cinq

Le premier plan superposait cinq couches (domaine / applicatif / infrastructure / contrats / presentation) avec ports et dépôts interfaces pour chaque table. Pour un poste mono-utilisateur, ~200 factures/an et une base qui ne changera jamais de moteur, cette cérémonie coûte plus qu'elle ne rapporte. **On garde l'idée juste — isoler ce qui doit être testé sans Electron — et on abandonne le reste.**

```
src/                 Renderer React — ne connaît que contrats/ (aucun calcul financier)
contrats/            types partagés des commandes IPC et des vues (preload ↔ renderer)
electron/            Processus Main
  ├── ipc/           handlers par domaine — validation d'entrée, orchestration, mappage en vue
  ├── depots/        SEUL endroit avec du SQL (requêtes préparées) + conversion centimes
  ├── db/            connexion chiffrée, schema.sql, migrations/, seeds/
  ├── pdf/           gabarits pdfmake (factureA4, devisA4, bonLivraisonA4)
  ├── excel/         gabarits exceljs
  └── securite/      chiffrement enveloppe, phrase de récupération, egto-admin-reset
domaine/             TypeScript PUR — aucun import externe (ni electron, ni sqlite, ni react, ni fs, ni date-fns)
  ├── montant.ts     objet Montant (centimes, half-up, refus des flottants)
  ├── pied-facture.ts  enchaînement §4.4.6
  ├── droit-timbre.ts  barème à tranches reçu en paramètre (jamais en dur)
  ├── numerotation.ts  attribution à la validation, séquence sans trou
  ├── tarifs.ts      cascade affaire → client → catalogue
  ├── score.ts       formules §4.2.4, protection GITRA/Groupe
  ├── delais.ts      ODS, suspensions, reprises, prorogations (horloge passée en paramètre)
  ├── classification.ts  Noir/Blanc/Autre + snapshot
  └── etats.ts       machines à états — une transition illégale est une erreur, pas un `if` oublié
```

**Règles, réduites à l'essentiel :**

1. `domaine/` n'importe **rien** de l'extérieur. C'est du TypeScript pur, testable par `vitest` sans Electron, sans base, sans navigateur. Les dépendances sont **passées en paramètres** (données en entrée, résultat en sortie). L'horloge est un paramètre (`Date`), pas un service injecté : les tests de délais sont déterministes sans architecture.
2. `electron/` peut importer `domaine/`. Le SQL vit **uniquement** dans `depots/` (requêtes préparées, aucune concaténation). Les handlers IPC ne contiennent pas de SQL : ils valident l'entrée, orchestrent dépôts et fonctions de `domaine/`, et mappent le résultat en objet de vue.
3. `src/` (renderer) ne connaît que `contrats/`. Il n'exécute **aucun** calcul financier — il affiche des montants déjà calculés côté Main. Toute règle métier qui apparaîtrait dans un composant est un défaut, pas un raccourci.
4. **Garde-fou mécanique** : une règle ESLint interdit tout import sortant depuis `domaine/` ; le build échoue en cas de violation. Cette seule règle remplace tout le dispositif de vérification d'architecture du premier plan — c'est elle qui garantit que les tests de calcul tournent hors Electron.

**Divergence assumée avec le PRD.** L'arborescence [prd-cda.md:1040](../prd-cda.md#L1040) place la logique métier dans `src/services/`. Ce plan la déplace dans `domaine/` (côté Main). À reporter d'une ligne dans le PRD pour que la source de vérité ne contredise pas le plan.

---

## 2. Jalons (Milestones)

Sept jalons, chacun livrable et démontrable seul.

### Jalon 0 — Cadrage & Modèle de données

**Objectif** : figer la structure des données avant d'écrire du code applicatif. Préalable bloquant du PRD ([prd-cda.md:83](../prd-cda.md#L83)).

**Livrables**
- ERD des entités de [prd-cda.md:1289](../prd-cda.md#L1289), en français, périmètre MVP.
- Dictionnaire de données : colonne par colonne, type SQLite, nullabilité, défaut, contrainte, unité (**centimes** pour tout montant), renvoi vers la section du PRD qui la justifie.
- `schema.sql` : tables + colonnes transversales [prd-cda.md:1292](../prd-cda.md#L1292) (`id`, `cree_le`, `modifie_le`, `supprime_le`, `statut`) + triggers d'audit.
- Wireframes basse fidélité des 4 écrans structurants (liste affaires, fiche affaire, fiche facture, fiche client) — validation de l'ERD, pas de maquette finale.
- Décision documentée sur les points de l'annexe §16 qui touchent le schéma : longueurs NIF/NIS, structure du barème du timbre, base de la retenue de garantie, mot de passe des exports ZIP.
- **T0 : demande officielle du template Excel GITRA** rédigée et adressée (cf. §5.3) — la seule dépendance externe capable de bloquer la Phase 2.

**Definition of Done**
- Chaque champ des tableaux PRD (§4.1 à §4.13, périmètre MVP) est tracé vers une colonne ou explicitement marqué hors MVP avec sa phase cible.
- `schema.sql` s'exécute sur base vierge sans erreur ; les triggers d'audit produisent une ligne dans `journal_audit` pour un `INSERT`, un `UPDATE` et un `DELETE` sur les tables sensibles.
- Aucune colonne monétaire déclarée `REAL` — vérifié par requête sur `pragma_table_info`.
- ERD relu et validé par le service commercial EGTO.

### Jalon 1 — Socle & Cœur de calcul

**Objectif** : le socle technique et les règles de calcul financier, sans interface métier.

**Livrables**
- Scaffold Electron + React + TypeScript + Vite, arborescence §1.3.
- Connexion `better-sqlite3-multiple-ciphers`, WAL, cipher compatible SQLCipher ; moteur de migrations (`PRAGMA user_version`, dossier `migrations/`, table `migrations_history`).
- `domaine/` : `Montant`, identités, entités, machines à états, classification + snapshot.
- Fonctions de calcul : `calculerPiedFacture`, `calculerDroitTimbre`, `attribuerNumero`.
- Garde-fou ESLint : échec du build si `domaine/` importe l'extérieur.
- Fenêtre Electron durcie (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP `default-src 'self'`) affichant un écran de diagnostic.

**Definition of Done**
- Les 10 cas types de contrôle du pied de facture ([prd-cda.md:1304](../prd-cda.md#L1304)) passent au centime près, avec et sans retenue, avec et sans droit de timbre.
- Le barème du timbre est lu depuis les paramètres, jamais d'une constante ; un test le prouve en modifiant les tranches à chaud. Déclencheur : **uniquement si le règlement prévu est en espèces** (versement en caisse), plafonné au seuil paramétré (défaut 1 000 000 DA) — chèque, traite, virement et LCN ne génèrent jamais de timbre.
- `npm run verifier` (typage + lint + garde + tests) vert en une commande.
- Les tests de calcul tournent sans lancer Electron ni ouvrir de base réelle.
- La base créée est illisible par un client SQLite standard sans la clé.

### Jalon 2 — Sécurité, Session & Coquille

**Objectif** : entrer dans l'application, la paramétrer, la sauvegarder, la restaurer.

**Livrables**
- Chiffrement en enveloppe complet ([prd-cda.md:1264-1280](../prd-cda.md#L1264-L1280)) : DEK 256 bits, enveloppe utilisateur (argon2id, sel distinct du hachage), enveloppe de recours (phrase de 6 groupes de 4 caractères, affichage unique).
- Assistant de premier démarrage, changement de mot de passe par remballage de la seule enveloppe, `egto-admin-reset` autonome exigeant la phrase.
- Sauvegarde automatique quotidienne vers destination externe, rétention 30 quotidiennes + 12 mensuelles, export ZIP chiffré embarquant le blob d'enveloppe de recours, jamais l'enveloppe utilisateur ni la DEK.
- Journal applicatif rotatif (5 × 5 Mo), lecture du journal d'audit.
- Verrouillage de session après 30 min d'inactivité : purge de la DEK, fermeture de la connexion, retour à l'écran de connexion.
- Coquille : sidebar, barre d'outils, zone de contenu, notifications, tokens de design, clair/sombre. Écrans Connexion et Paramétrage.

**Definition of Done**
- `egto-admin-reset` restaure l'accès **avec** la phrase et échoue proprement **sans** elle ([prd-cda.md:1307](../prd-cda.md#L1307)).
- Une sauvegarde est restaurée sur un poste vierge avec la seule phrase de récupération, sans l'ancien mot de passe ; procédure écrite pas à pas.
- Le mode sombre suit la préférence système sans rechargement ; aucun texte sous un contraste 4,5:1 dans les deux thèmes.
- L'inspection du renderer montre `window.require` indéfini et aucun canal IPC générique exposé.

### Jalon 3 — Référentiels : Clients, Catalogue, Import

**Objectif** : la base de travail commerciale est peuplée, y compris depuis les fichiers Excel existants.

**Livrables**
- M2 : création/modification clients, unicité du NIF hors particuliers, contacts, interactions, `calculerScoreClient` (§4.2.4), protection GITRA/Groupe.
- M3 : produits, 4 familles, classification Noir/Blanc/Autre, tarification à trois niveaux (`resoudreTarif`, période englobante).
- M13 : assistant d'import en 3 étapes, détection de doublons (NIF / code produit), rapport d'anomalies téléchargeable, import partiel des lignes valides, rollback total sur échec technique.
- UI : liste/fiche client (score, badge de vigilance), liste/fiche produit + historique des tarifs, assistant d'import.

**Definition of Done**
- Un import de 300 lignes avec 10 doublons volontaires exclut les 10 et importe les 290 ([prd-cda.md:1309](../prd-cda.md#L1309)).
- Un client en score D affiche un badge de vigilance et **reste pleinement utilisable** : création d'affaire et facturation non entravées ([prd-cda.md:355](../prd-cda.md#L355)).
- `resoudreTarif` renvoie affaire → client → catalogue, en respectant la date de la ligne facturée.
- Un échec technique en cours d'import laisse la base dans son état initial.

### Jalon 4 — Cycle commercial : Devis & Affaires

**Objectif** : le pipeline amont, du devis à l'affaire signée avec son DQE.

**Livrables**
- M9 : devis, lignes, statuts, expiration automatique à la date de validité.
- `convertirDevisEnAffaire` : affaire contrat privé « Signé », reprise des lignes dans le DQE, devis → « Accepté », lien de traçabilité.
- M1 : affaires, champs communs et spécifiques, avenants avec impact DQE détaillé, postes DQE avec import de masse.
- `calculerDelaisAffaire` : fin contractuelle depuis l'ODS, suspensions, reprises, prorogations, dépassement. Alertes 50 %, 80 %, J-15, dépassé — **informatives, jamais bloquantes**.
- UI : liste/fiche devis + aperçu PDF + conversion ; liste/fiche affaire (onglets, DQE en AG Grid avec collage Excel), suivi des délais, bandeau d'alertes.

**Definition of Done**
- Une affaire marché public avec ODS calcule sa date de fin contractuelle et déclenche ses alertes de délai ([prd-cda.md:1303](../prd-cda.md#L1303)).
- Une suspension de 20 jours puis reprise décale la date de fin révisée de 20 jours exactement.
- La conversion d'un devis de 40 lignes produit un DQE de 40 postes, montants identiques au centime.
- Un DQE de 300 lignes se saisit et s'enregistre sans dégradation perceptible de la réactivité.

### Jalon 5 — Facturation & Documents

**Objectif** : émettre des documents fiscalement conformes. Le jalon qui rend le MVP utile.

**Livrables**
- M4 : FA, AC, AV totaux et partiels, BL.
- Numérotation attribuée **à la validation uniquement** ([prd-cda.md:424](../prd-cda.md#L424)) : brouillon supprimé sans consommation, séquence sans trou, numéro verrouillé.
- Pied de facture §4.4.6 : remboursement d'avance au prorata, retenue de garantie, TVA 19 %, droit de timbre selon barème et mode de règlement prévu.
- `genererFactureDepuisBons` : BL sélectionnés → FA, les BL passent en « Facturé ».
- PDF côté Main (pdfmake, Roboto + Noto Naskh Arabic), 9 mentions légales de [prd-cda.md:956](../prd-cda.md#L956), filigrane « DUPLICATA » à toute réimpression, comptage dans l'audit.
- Cycle de vie Brouillon → Validée → Imprimée → Envoyée → Payée → Archivée, suppression logique.
- UI : liste/fiche facture (pied recalculé en direct), aperçu avant impression, liste/fiche BL + génération groupée, écran avoir.

**Definition of Done**
- Les 10 cas types produisent un total identique au centime au calcul manuel, avec et sans retenue, avec et sans droit de timbre.
- Seul un règlement prévu **en espèces** (versement en caisse) génère le timbre, selon les tranches paramétrées et plafonné au seuil (défaut 1 000 000 DA) ; chèque, traite, virement et LCN ne génèrent **jamais** de timbre.
- La suppression de 3 brouillons consécutifs ne crée aucun trou dans la séquence des factures validées.
- Le PDF contient les 9 mentions légales et affiche correctement un texte arabe.
- Un avoir partiel sur 2 lignes d'une facture de 5 lignes référence la facture d'origine et son motif.

### Jalon 6 — Durcissement & Livraison

**Objectif** : rendre le MVP installable et défendable chez le client.

**Livrables**
- Suite Vitest complète sur tous les calculs, e2e Playwright sur les parcours critiques.
- `electron-builder` NSIS x64, installateur non signé (SmartScreen documenté), restauration testée de bout en bout (voie phrase de récupération), manuel utilisateur PDF, seeds de démonstration et jeu de données de recette, revue d'accessibilité.

**Definition of Done**
- L'installateur `.exe` s'installe sur un Windows 11 vierge et l'application démarre.
- Les deux parcours e2e passent : devis → affaire → facture, et BL → facture.
- Restauration réussie sur un second poste avec la seule phrase de récupération, procédure rejouée par une personne d'EGTO.
- Recette formelle signée par le service commercial sur le jeu de données de test.

---

## 3. Plan des Tâches (Backlog)

Une tâche n'est prête que si **toutes** ses dépendances sont terminées. `—` = rien ne la bloque. Les tâches marquées ⟳ sont reprises sur plusieurs jalons (mises à jour incrémentales).

### D — Domaine (TypeScript pur)

| # | Tâche | Dépend de | Jalon |
|---|---|---|---|
| D1 | ERD et dictionnaire de données complets, en français | — | J0 |
| D2 | `Montant` : centimes, arithmétique sûre, half-up, refus de construction depuis un flottant | D1 | J1 |
| D3 | Identités : `NumeroDocument`, `Reference`, `Nif`, `Nis`, `Periode` — impossible d'exister invalide | D1 | J1 |
| D4 | Entités référentielles : `Client`, `Contact`, `Interaction`, `Produit`, `Tarif` | D2, D3 | J1 |
| D5 | Entités commerciales : `Devis`, `LigneDevis`, `Affaire`, `PosteDqe`, `Avenant`, `Reception` | D2, D3 | J1 |
| D6 | Entités de facturation : `Facture`, `LigneFacture`, `BonLivraison`, `PiedFacture` | D2, D3 | J1 |
| D7 | Machines à états : cycle de vie facture, statut affaire, statut devis — transition illégale = erreur | D5, D6 | J1 |
| D8 | Classification Noir/Blanc/Autre + mécanisme de snapshot | D4 | J1 |
| D9 | `calculerPiedFacture` — enchaînement §4.4.6, arrondi ligne par ligne puis au total | D2, D6 | J1 |
| D10 | `calculerDroitTimbre` — barème à tranches reçu en paramètre, plancher/plafond, jamais de taux en dur ; **déclenché uniquement si règlement en espèces** (mode = ESPECES, seuil paramétré) | D2 | J1 |
| D11 | `attribuerNumero` — validation seule, séquence sans trou, verrouillage, format ST par marché prévu | D3 | J1 |
| D12 | `resoudreTarif` — cascade affaire → client → catalogue, période englobante | D4 | J3 |
| D13 | `calculerScoreClient` — les 4 formules §4.2.4, protection GITRA/Groupe | D4 | J3 |
| D14 | `calculerDelaisAffaire` — ODS, suspensions, reprises, prorogations ; horloge en paramètre | D5 | J4 |
| D15 | `evaluerAlertes` — délais, validité devis, échéances. Informatives, aucune ne bloque | D14 | J4 |
| D16 | Garde-fou ESLint : interdiction de tout import sortant depuis `domaine/`, échec du build | D2 | J1 |

### M — Main process (Electron, SQL, PDF, Excel, sécurité)

| # | Tâche | Dépend de | Jalon |
|---|---|---|---|
| M1 | Scaffold Electron + React + TS + Vite, arborescence §1.3, config tri-cible | — | J1 |
| M2 | Connexion `better-sqlite3-multiple-ciphers` : ouverture par clé, WAL, instance unique, fermeture propre au verrouillage | — | J1 |
| M3 | Moteur de migrations : `PRAGMA user_version`, exécution séquentielle, `migrations_history`, refus si base plus récente que le binaire | M2 | J1 |
| M4 | `schema.sql` : tables, contraintes, index, colonnes transversales + **triggers d'audit** (par trigger, jamais par appel applicatif) | D1, M2 | J1 |
| M5 | Seeds : paramètres entreprise, compteurs, exercice courant, barème du timbre, familles produits | M4 | J1 |
| M6 | Dépôts SQLite : requêtes **préparées**, aucune concaténation, conversion centimes centralisée en un point | M2, M4 | J1→J5 ⟳ |
| M7 | Contrats `contrats/` : types des commandes IPC et des vues — seule chose que le renderer connaît | D4, D5, D6 | J1 |
| M8 | Preload `contextBridge` exposant une API **par domaine métier** | M7 | J1 |
| M9 | Handlers IPC par domaine : validation d'entrée, orchestration, mappage en vue. Aucun canal SQL générique | M6, M8 | J1→J5 ⟳ |
| M10 | Durcissement renderer : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP, refus de navigation externe | M1 | J1 |
| M11 | Chiffrement en enveloppe : DEK 256 bits, argon2id avec sels distincts, enveloppes utilisateur et de recours | M2 | J2 |
| M12 | Phrase de récupération (6 groupes de 4 caractères), affichage unique, jamais persistée en clair | M11 | J2 |
| M13 | `egto-admin-reset` autonome : exige la phrase, ne réinitialise rien sans elle | M11, M12 | J2 |
| M14 | Sauvegarde : ordonnanceur quotidien, destination externe, rétention 30 + 12, export ZIP chiffré (blob de recours, jamais l'enveloppe utilisateur), alerte sur échec | M11 | J2 |
| M15 | Journal applicatif rotatif 5 × 5 Mo dans `userData/logs/`, niveau configurable | M1 | J2 |
| M16 | Assistant de premier démarrage et changement de mot de passe (remballage de la seule enveloppe) | M11, M12 | J2 |
| M17 | Adaptateurs exceljs + système de fichiers (arborescence `Documents/EGTO/`, dialogues natifs) | M1 | J3 |
| M18 | Lecteur Excel pour l'import (mapping de colonnes, tolérance aux entêtes approximatives) | M17 | J3 |
| M19 | Adaptateur pdfmake + polices Roboto et Noto Naskh Arabic embarquées | M1 | J5 |
| M20 | Gabarits PDF `factureA4`, `devisA4`, `bonLivraisonA4` : 9 mentions légales, filigrane duplicata | M19 | J5 |

### R — Renderer (React)

Le renderer n'effectue aucun calcul financier : il affiche des montants déjà calculés par `domaine/`. Toute règle métier dans un composant est un défaut d'architecture.

| # | Tâche | Dépend de | Jalon |
|---|---|---|---|
| R1 | Tokens de design : palette sémantique, typographie, échelle 4 px, rayons, élévations. Clair et sombre définis ensemble | — | J2 |
| R2 | Coquille applicative : sidebar (repliable sous 1100 px), barre d'outils contextuelle, zone de contenu, fil d'Ariane | R1, M8 | J2 |
| R3 | Raccourcis clavier (`Ctrl`, convention Windows), registre unique, menus contextuels natifs via IPC | R2, M9 | J2 |
| R4 | Notifications transitoires + états transversaux (chargement, vide, erreur — chaque état vide propose l'action qui le résout) | R1 | J2 |
| R5 | Composants : `Liste` générique (TanStack Table : tri, filtres, pagination, sélection, largeurs persistées), formulaires, `FicheAOnglets` | R1, M7 | J3 |
| R6 | Écrans Connexion et premier démarrage, affichage unique et imprimable de la phrase | R2, M16 | J2 |
| R7 | Écran Paramétrage : entreprise, barème du timbre, numérotation, exercices, alertes, sauvegardes, journaux | R5, M9 | J2 |
| R8 | Liste + fiche client à onglets, badge de vigilance, score | R5, D13 | J3 |
| R9 | Liste + fiche produit, consultation de l'historique des tarifs | R5, D12 | J3 |
| R10 | Assistant d'import en 3 étapes : mapping, prévisualisation, rapport d'anomalies | R5, M18 | J3 |
| R11 | Liste + fiche devis, aperçu PDF, conversion en affaire | R5, M20 | J4 |
| R12 | Liste affaires avec indicateurs de délai + fiche à onglets (Général, DQE, Réceptions, Avenants, Documents, Factures) | R5 | J4 |
| R13 | Grille de saisie DQE (AG Grid, **seul emplacement autorisé** avec la déclaration mensuelle) : clavier, collage Excel, validation à la volée | R5 | J4 |
| R14 | Onglet Suivi des délais (chronologie ODS/suspensions/reprises/prorogations) + bandeau d'alertes informatives | R5, D15 | J4 |
| R15 | Liste factures (statut, échéance, jours de retard) + fiche facture (saisie rapide clavier, pied recalculé en direct) | R5, D9 | J5 |
| R16 | Aperçu PDF avant impression, impression directe, mention duplicata | R15, M20 | J5 |
| R17 | Liste/fiche BL + écran de génération groupée de facture | R5, D11 | J5 |
| R18 | Écran avoir : total, par lignes, partiel ; motif obligatoire, référence à la facture d'origine | R15 | J5 |

### Q — Qualité & Intégration

Les tests des calculs s'exécutent sans Electron, sans base réelle, sans navigateur : les fonctions de `domaine/` sont pures, aucune doublure de port n'est nécessaire.

| # | Tâche | Dépend de | Jalon |
|---|---|---|---|
| Q1 | Harnais Vitest | D2 | J1 |
| Q2 | Tests `Montant` : half-up, absence de dérive de flottant, refus des non-entiers | D2, Q1 | J1 |
| Q3 | **Les 10 cas types du pied de facture**, avec et sans retenue, avec et sans timbre — critère §11 | D9, Q1 | J1 |
| Q4 | Tests du timbre : chaque tranche, plancher 5 DA, plafond 10 000 DA, exonération ≤ 300 DA, aucun timbre en chèque/traite/virement/LCN, seuil espèces (1 M DA) | D10, Q1 | J1 |
| Q5 | Tests de numérotation : validation seule, brouillon sans consommation, séquence sans trou, verrouillage | D11, Q1 | J1 |
| Q6 | Tests du scoring : 4 seuils, protection GITRA, score D qui ne bloque rien | D13, Q1 | J3 |
| Q7 | Tests de résolution de tarif : cascade 3 niveaux et périodes limitrophes | D12, Q1 | J3 |
| Q8 | Tests de délais avec horloge injectée : ODS, suspension, reprise, prorogation, dépassement | D14, Q1 | J4 |
| Q9 | Tests des machines à états : chaque transition illégale lève une erreur | D7, Q1 | J4 |
| Q10 | Tests d'import : 300 lignes, 10 doublons, 290 importées, rapport conforme, rollback sur échec technique | M18, Q1 | J3 |
| Q11 | Tests de conversion devis → affaire : intégrité des lignes et des montants | D5, Q1 | J4 |
| Q12 | Tests d'avoirs total, par lignes et partiel | D6, Q1 | J5 |
| Q13 | Tests d'intégration des dépôts sur base chiffrée temporaire : requêtes préparées, suppression logique, triggers d'audit effectifs | M6, M4 | J1→J5 ⟳ |
| Q14 | Tests du chiffrement en enveloppe : ouverture par mot de passe, par phrase, échec sans l'un ni l'autre, changement de mot de passe sans rechiffrement de la base | M11, Q1 | J2 |
| Q15 | Vérification de la garde architecturale en CI : le build échoue si `domaine/` importe l'extérieur | D16 | J1 |
| Q16 | Harnais Playwright pour Electron, base jetable par exécution | J1 livré | J5 |
| Q17 | Parcours **devis → affaire → facture validée → PDF** | Q16, R16 | J5 |
| Q18 | Parcours **BL → facture groupée → PDF** | Q16, R17 | J5 |
| Q19 | Parcours **sauvegarde → restauration par phrase de récupération** sur profil vierge | Q16, M14 | J6 |
| Q20 | Parcours import : fichier réel, rapport d'anomalies, données en base | Q16, R10 | J5 |
| Q21 | Durcissement vérifié en CI : le build échoue si une option de sécurité régresse (M10) | M10 | J1 |
| Q22 | `electron-builder.yml` NSIS x64, icône, raccourcis, `extraResources` (schéma, polices) | M1 | J6 |
| Q23 | `npm run verifier` : typage + lint + garde + tests unitaires, en une commande | Q1, D16 | J1 |
| Q24 | Procédure de restauration pas à pas, rejouée par une personne d'EGTO | Q19 | J6 |
| Q25 | Manuel utilisateur PDF : phrase de récupération, alerte SmartScreen, écarts de mode de règlement | J5 livré | J6 |
| Q26 | Seeds de démonstration et jeu de données de recette | M5 | J6 |
| Q27 | Revue d'accessibilité : navigation clavier intégrale, focus visible, contrastes dans les deux thèmes | R1→R18 | J6 |

### Chemin critique

`D1 → D2 → D9 → M6/M9 → R15 → Q17`

Le calcul monétaire conditionne la facturation, qui conditionne l'utilité du MVP. Tout retard sur D2 ou D9 se propage intégralement. À l'inverse, **M1/M11 (socle et chiffrement) et R1/R2 (design et coquille) se parallélisent dès J1 sans bloquer ce chemin** — leur dépendance de jalon (J2) porte sur le périmètre livré, pas sur leur démarrage.

---

## 4. Directives de Design

La cible est Windows : **conventions Windows**, pas macOS. Les principes du premier plan sont repris, reformulés pour la plateforme cible. (Si [design.md](../design.md) est conservé, ses références AppKit/HIG doivent être lues comme une source d'inspiration de densité et de profondeur, jamais comme une prescription de composants.)

1. **Le contenu porte l'interface, pas le chrome.** Une fiche facture se lit comme un document, pas comme un formulaire d'administration. Toute bordure, tout fond gris, toute ombre justifie son existence par une séparation que l'espacement ne rend pas.
2. **Une seule action primaire par écran**, visuellement dominante, à droite de la barre d'outils. Le reste est secondaire ou tertiaire.
3. **Mode sombre par couleurs sémantiques.** Aucune couleur littérale dans un composant (`fond-eleve`, `texte-secondaire`, `bordure-discrete`). Thème suivant la préférence système, bascule sans rechargement, les deux variantes définies dans le même geste.
4. **Espacement sur une échelle de 4 px**, sans exception. La respiration remplace les séparateurs.
5. **La densité est un choix explicite.** Un DQE atteint 300 postes : trois densités (compacte, normale, confortable), préférence persistée, aucune ligne sous 28 px en compacte.
6. **Le clavier est un chemin de premier ordre.** Raccourcis `Ctrl`, tabulation suivant l'ordre de lecture, focus toujours visible.
7. **Recherche à gauche des actions, dans la barre d'outils.** Filtrage incrémental différé de 200 ms, `Échap` efface et rend le focus à la liste.
8. **Modales pour interrompre, panneaux pour éditer.** Une sheet sert à une décision courte ou une création rapide ; une édition riche va dans une vue pleine. `Échap` ferme ; une action destructive n'est jamais l'action par défaut.
9. **Animations courtes et utiles** : 150 à 200 ms, sortie douce, `prefers-reduced-motion` respecté.
10. **Alerter sans bloquer.** Badge ou bandeau avec un libellé qui dit quoi faire. Jamais de bouton désactivé sans explication. Seules exceptions fiscales : numérotation attribuée et exercice clôturé.

---

## 5. Annexe

### 5.1 Hors périmètre MVP (à replanifier après recette)

Déclarations mensuelles et ST, révision de prix, rapport mensuel GITRA, créances et encaissements, cautions, retenues de garantie, sous-traitance, dashboards, rapports personnalisables.

### 5.2 Points ouverts §16

Valeurs du barème du timbre, statut de la TAP, longueurs exactes NIF/NIS, mot de passe des exports ZIP. **Sans effet bloquant sur le développement** : toutes ces valeurs vivent en table de paramétrage. (Timbre et intérêts moratoires : mécanique tranchée le 09/08/2026 — espèces uniquement + seuil 1 M DA ; montant direct sur ND.)

### 5.3 Suivi de la dépendance bloquante GITRA

Le template Excel du rapport mensuel n'existe pas encore ([prd-cda.md:1357](../prd-cda.md#L1357)) et M4.9 (Phase 2) ne peut pas être développé avant sa validation. Ce n'est pas une tâche de développement mais un **suivi à activer dès J0** :

- J0 : demande officielle rédigée (structure, 5 feuilles de départ, responsable côté GITRA/comptabilité, date limite de réponse).
- Point de contrôle à chaque jalon : statut du template reporté en ouverture de revue.
- Si non reçu à la fin du Jalon 5, anticiper dans le plan Phase 2 : l'enchaînement des jalons Phase 2 commence par M4.9, pas par les déclarations.

### 5.4 Éléments à réclamer avant le Jalon 5

Logo EGTO et icône `.ico`, ainsi qu'un exemplaire réel de facture pour caler le gabarit PDF. À défaut, le gabarit est construit sur les seules mentions légales de [prd-cda.md:956](../prd-cda.md#L956).

### 5.5 Réserve technique consignée

Le pied de facture retenu place la retenue de garantie **avant** la TVA, conformément à la lettre de §4.4.6. Le traitement fiscal usuel ne réduit pas la base taxable. Décision du client, appliquée telle quelle ; le calcul est isolé dans `calculerPiedFacture` (D9) de sorte qu'un arbitrage comptable ultérieur ne touche qu'un fichier et sa suite de tests.
