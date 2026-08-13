# Directives de design — EGTO Gestion Commerciale

Référentiel de design de l'application. Minimalisme fonctionnel, principes des Human Interface Guidelines d'Apple, appliqués au stack imposé par le PRD (Electron, React, Tailwind).

Document normatif : ce qui est écrit ici s'applique. La **référence visuelle exécutable** est [mockup.html](mockup.html) — toute valeur de ce document y est vérifiable, et toute divergence entre les deux est un défaut à corriger dans l'un ou l'autre. Les tâches d'implémentation correspondantes sont en section B de [plans.md](plans.md).

## Note de plateforme

Le PRD verrouille la cible de déploiement sur Windows ([prd-cda.md:1249](prd-cda.md#L1249)), mais **le langage visuel retenu est celui de macOS**, sans transposition ni compromis. La coquille est entièrement dessinée par l'application : `BrowserWindow` sans cadre natif, feux tricolores rendus en HTML, zones de glissement par `-webkit-app-region: drag`. Rien de ce qui suit ne dépend d'AppKit — `NSToolbar`, `NSSplitView` et les sheets système sont reproduits dans leur **comportement**, qui est la partie qui compte pour l'utilisateur.

Une seule adaptation à l'exécution :

| Sujet | Référence | Implémentation |
|---|---|---|
| Modificateur des raccourcis | `⌘` | `⌘` affiché sur macOS, `Ctrl` sur Windows. Le gestionnaire accepte les deux (`metaKey \|\| ctrlKey`) et le libellé est produit par le registre des raccourcis, jamais écrit en dur |
| Contrôles de fenêtre | Feux tricolores à gauche | Identiques, dessinés par l'application, câblés sur `minimize` / `maximize` / `close` via IPC |
| Barre de menus | Globale en haut de l'écran | Menu applicatif Electron ; les actions utiles restent toutes atteignables au clavier et depuis la barre d'outils |

Un arbitrage antérieur retenait un accent vert profond et les conventions Windows. Il est **caduc** : l'accent est le bleu système, le vert redevient une couleur d'état — succès, soldé, payé.

## Intention

Un poste, un utilisateur, un usage quotidien et répétitif : émettre des factures, suivre des affaires, retrouver un client. Une application utilisée tous les jours par la même personne doit disparaître derrière son contenu. Elle ne cherche pas à impressionner, elle cherche à ne jamais gêner.

Ce qui en découle, et qui guide chaque arbitrage :

- **Le document prime sur le formulaire.** Une facture à l'écran doit ressembler à la facture imprimée. C'est ce que l'utilisateur a en tête, c'est ce qu'il vérifiera au centime.
- **La vitesse au clavier prime sur la découvrabilité.** L'utilisateur connaîtra l'application par cœur en deux semaines. Optimiser pour lui, pas pour le premier contact.
- **La retenue prime sur la démonstration.** Pas de dégradés décoratifs, pas d'icônes colorées, pas d'animation qui célèbre un enregistrement.

---

# 1. Tokens

Aucune valeur littérale dans un composant. Tout passe par une variable CSS, ce qui rend le mode sombre correct par construction et non par rattrapage.

## 1.1 Surfaces

Les noms décrivent un **rôle**. Un composant qui écrit `bg-zinc-800` est un défaut : il sera faux dans l'un des deux thèmes.

| Token | Rôle | Clair | Sombre |
|---|---|---|---|
| `--bg-window` | Fond de fenêtre, perçu au travers des surfaces translucides | `#EDEDEF` | `#151517` |
| `--bg-sidebar` | Base de la barre latérale, avant vibrance | `#F6F6F8` | `#232326` |
| `--bg-topbar` | Base de la barre d'outils, avant vibrance | `#F6F6F8` | `#232326` |
| `--bg-content` | Zone de contenu, panneau coulissant | `#FFFFFF` | `#1C1C1E` |
| `--bg-card` | Cartes, tableaux, modale, toast | `#FFFFFF` | `#2A2A2D` |
| `--bg-input` | Champ de saisie | `#FFFFFF` | `#313134` |
| `--bg-hover` | Survol, bouton discret, pied de tableau | `rgba(0,0,0,.045)` | `rgba(255,255,255,.07)` |
| `--bg-active-row` | Ligne sélectionnée | `rgba(0,113,227,.08)` | `rgba(10,132,255,.16)` |

**La vibrance n'est pas décorative, elle sépare le chrome du contenu.** Les trois surfaces de chrome — barre d'outils, barre latérale, barre d'état — sont translucides et floutées, uniformément :

```css
background: color-mix(in srgb, var(--bg-sidebar) 80%, transparent);
backdrop-filter: saturate(180%) blur(30px);
```

Aucune autre surface n'est translucide. Une carte translucide sur un fond translucide devient illisible et coûte cher à composer.

## 1.2 Texte et séparateurs

| Token | Rôle | Clair | Sombre |
|---|---|---|---|
| `--text-primary` | Titres, montants, données | `#1D1D1F` | `#F5F5F7` |
| `--text-secondary` | Libellés, métadonnées, texte de bouton discret | `#6E6E73` | `#A1A1A6` |
| `--text-tertiary` | Indications, en-têtes de colonne, barre d'état | `#A1A1A6` | `#75757A` |
| `--separator` | Séparateur de ligne, bordure de carte | `rgba(0,0,0,.09)` | `rgba(255,255,255,.09)` |
| `--separator-strong` | Contour de champ, survol de bouton discret | `rgba(0,0,0,.14)` | `rgba(255,255,255,.16)` |

`--text-tertiary` porte du texte réellement lu et **ne satisfait pas les seuils de contraste** — voir la correction chiffrée en §7.1.

## 1.3 Accent et couleurs d'état

| Token | Rôle | Clair | Sombre |
|---|---|---|---|
| `--accent` | Action primaire, entrée active, onglet actif, focus | `#0071E3` | `#0A84FF` |
| `--accent-hover` | Survol de l'action primaire | `#0077ED` | `#3399FF` |
| `--accent-soft` | Badge, puce active, encadré, anneau de focus | `rgba(0,113,227,.1)` | `rgba(10,132,255,.18)` |

L'accent ne sert **qu'**à l'action primaire, à la sélection et au focus. Un accent employé partout n'accentue plus rien.

| Token | Usage métier | Clair | Sombre | Fond associé — clair / sombre |
|---|---|---|---|---|
| `--green` | Payé, soldé, accepté, mainlevée obtenue, actif | `#248A3D` | `#32D74B` | `rgba(52,199,89,.15)` / `rgba(50,215,75,.18)` |
| `--orange` | Échéance proche, en cours, mainlevée demandée, à affecter | `#C76A00` | `#FF9F0A` | `rgba(255,149,0,.16)` / `rgba(255,159,10,.18)` |
| `--red` | Retard, impayé, résilié, client en vigilance | `#D70015` | `#FF453A` | `rgba(255,59,48,.13)` / `rgba(255,69,58,.18)` |
| `--purple` | Facturé, client protégé GITRA / Groupe | `#8E44C9` | `#BF5AF2` | `rgba(175,82,222,.14)` / `rgba(191,90,242,.18)` |
| `--gray-soft` | Neutre : brouillon, archivé, inactif, expiré | — | — | `rgba(110,110,115,.12)` / `rgba(161,161,166,.16)` |

Chaque état s'écrit **fond très désaturé + texte à teinte pleine**. La teinte claire ne sert jamais de fond, la teinte pleine jamais de remplissage large.

**La couleur ne porte jamais seule une information.** Chaque état s'accompagne de son libellé écrit. Un daltonien doit lire l'échéancier aussi bien qu'un autre — et une facture en retard n'est pas une nuance esthétique.

Feux tricolores : `--tl-red #FF5F57`, `--tl-yellow #FEBC2E`, `--tl-green #28C840`, identiques dans les deux thèmes, cerclés d'un `inset 0 0 0 .5px rgba(0,0,0,.15)`.

## 1.4 Typographie

`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`, lissage `antialiased`, corps de base **13 px**.

| Rôle | Taille / graisse | Emplacement |
|---|---|---|
| Corps | 13 / 400 | Texte courant, entrées de barre latérale, valeurs de fiche |
| Titre de vue | 15 / 600, `-.01em` | Barre d'outils |
| Titre de fiche | 16 / 700, `-.01em` | En-tête du panneau coulissant |
| Valeur d'indicateur | 21 / 700, `-.015em` | Cartes KPI |
| Net à payer | 16 / 700 | Pied de facture |
| Titre de section | 11 / 600 majuscules, `+.04em` | Séparateurs de bloc dans une vue |
| En-tête de colonne | 11 / 600 majuscules, `+.03em` | `thead` |
| Cellule | 12,5 / 400 — 12 en densité compacte | `tbody` |
| Libellé de champ en lecture | 11 / 500 | Fiches |
| Libellé de champ en saisie | 12 / 600 | Formulaires |
| Bouton | 12,5 / 500 | Toutes tailles |
| Badge | 11 / 600 | Statuts, scores, classifications |
| Indication, note de pied, sous-titre | 11 / 400 | Partout |
| Barre d'état | 11 / 400 | Bas de fenêtre |

Quatre tailles réellement distinctes. Le poids et la couleur font le reste — c'est moins bruyant que d'empiler sept tailles.

**Tous les montants, quantités, dates en tableau et numéros de document sont en `font-variant-numeric: tabular-nums`**, valeurs numériques alignées à droite, séparateur de milliers **espace insécable fine**, deux décimales toujours affichées sur les documents. Une colonne de montants doit se vérifier à la verticale sans que les chiffres dansent.

Deux formats de montant, jamais interchangeables :

| Format | Sortie | Usage |
|---|---|---|
| Document | `5 965 886,38 DA` | Pied de facture, lignes, tableaux, champs |
| Pilotage | `5 965 886 DA` | Indicateurs du tableau de bord, étiquettes de graphique |

Un montant de pilotage arrondi au dinar ne sert jamais de base à un contrôle comptable ; un montant de document ne s'arrondit jamais au dinar.

## 1.5 Rythme

L'échelle réellement pratiquée, à respecter plutôt qu'à improviser :

| Contexte | Valeur |
|---|---|
| Icône ↔ texte | 6 px, 9 px dans la barre latérale |
| Gouttière de grille d'indicateurs | 12 px |
| Gouttière de grille de contenu, écart entre blocs | 14 px |
| Écart entre champs | 14 px vertical, 16 à 20 px horizontal |
| Padding de carte | 14 à 18 px |
| Padding de cellule | `10px 14px` en densité normale, `5px 14px` en compacte |
| Marge de contenu d'écran | `22px 26px`, 60 px de garde en bas |
| Padding du panneau coulissant | en-tête `16px 22px`, corps `20px 22px`, pied `12px 22px` |
| Séparation de grandes régions | 28 px, marge haute d'un titre de section |

**L'espacement remplace les traits.** Deux blocs séparés de 28 px n'ont pas besoin d'une bordure entre eux. Un séparateur ne se justifie que là où l'espace manque — dans une liste dense, typiquement.

## 1.6 Rayons et élévation

| Token | Valeur | Usage |
|---|---|---|
| `--radius-window` | 12 px | Fenêtre, modale |
| `--radius-panel` | 10 px | Cartes, tableaux, graphiques |
| `--radius-ctl` | 7 px | Boutons, champs, entrées de barre latérale, boutons d'icône, recherche |
| — | 9 px | Bandeaux, encadrés, toasts, bloc « net à payer » |
| — | 6 px | Badges, vignettes de ligne |
| — | 20 px | Puces de filtre — **seul** emploi de la forme pilule |

Les puces de filtre sont des pilules ; les **onglets ne le sont jamais** — ils restent soulignés d'un filet accent de 2 px.

Trois niveaux d'ombre, et pas un de plus :

| Token | Clair | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` | Cartes, tableaux, indicateurs, segment actif |
| `--shadow-md` | `0 6px 20px rgba(0,0,0,.10)` | Toasts |
| `--shadow-lg` | `0 20px 60px rgba(0,0,0,.22)` | Panneau coulissant, modale |

En sombre, les mêmes tokens passent à `.3` / `.4` / `.55` d'opacité — l'ombre y sépare moins bien que la luminosité de la surface, elle ne fait qu'ancrer.

Bordures : `1 px`, toujours, jamais plus.

---

# 2. Coquille applicative

## 2.1 Grille de fenêtre

Une seule grille CSS porte toute la coquille — pas de position absolue, pas de calcul de hauteur en JavaScript :

```css
.app{
  display:grid;
  grid-template-columns:250px 1fr;
  grid-template-rows:52px 1fr 26px;
  transition:grid-template-columns .22s cubic-bezier(.32,.72,0,1);
}
.app.sidebar-collapsed{grid-template-columns:74px 1fr;}
```

```
┌──────────────┬───────────────────────────────────────────────┐
│ ● ● ●        │  Titre d'écran      [Recherche ⌘F] [Nouveau…] │  52 px
├──────────────┼───────────────────────────────────────────────┤
│ Barre        │                                               │
│ latérale     │  Contenu — marge 22 / 26 px                   │
│ 250 px       │  1400 px au maximum, 980 px en mode étroit    │
│ (vibrance)   │                                               │
├──────────────┴───────────────────────────────────────────────┤
│ Exercice · chiffrement · hors ligne       Densité    Date     │  26 px
└──────────────────────────────────────────────────────────────┘
```

La barre d'outils est **coupée en deux zones** par la grille : celle de gauche appartient à la colonne de la barre latérale et n'accueille que les feux tricolores ; celle de droite porte le titre et les actions. C'est ce découpage qui produit l'alignement macOS sans superposition ni marge magique.

Le contenu d'une vue est plafonné à **1400 px**, et à **980 px** en mode étroit — employé par le Paramétrage. Au-delà, l'œil parcourt une distance inutile entre le libellé et sa valeur.

## 2.2 Barre d'outils

Hauteur 52 px, vibrance, filet bas `--separator`. Zone gauche : trois pastilles de 12 px espacées de 8 px, région de glissement. Zone droite, de gauche à droite : titre de l'écran en 15 / 600 tronqué à l'ellipse, puis la recherche, l'action primaire, et trois boutons d'icône de 28 px — barre latérale, raccourcis, thème.

**Une seule action primaire par écran**, en bouton accentué plein, libellée « Nouveau … » et contextuelle à la vue. Les neuf écrans de saisie en ont une ; le tableau de bord, les retenues de garantie et le Paramétrage n'en ont pas — un écran sans création n'affiche pas de bouton grisé.

## 2.3 Barre latérale

250 px, vibrance, filet droit. Six sections en titres discrets — 11 / 600 majuscules, `--text-tertiary` — et **onze entrées** :

| Section | Entrées |
|---|---|
| Pilotage | Tableau de bord |
| Commercial | Clients · Devis · Affaires |
| Facturation | Facturation · Encaissements |
| Garanties | Cautions · Retenues de garantie |
| Ressources | Sous-traitants · Catalogue |
| Système | Paramétrage |

**Les bons de livraison ne sont pas une entrée de navigation.** Le PRD les rattache au module M4 (§4.4.11) : ils vivent en sous-vue de Facturation, atteints par un groupe de puces « Factures et avoirs » / « Bons de livraison », et référencés depuis la fiche facture comme depuis la fiche affaire.

Chaque entrée : icône 16 px en trait, libellé 13 px, hauteur 30 px, rayon 7 px. L'entrée active reçoit **le fond accent plein et un libellé blanc**, icône comprise — c'est le seul aplat d'accent de l'interface hors bouton primaire, et il suffit à localiser l'écran courant d'un coup d'œil.

Compteur aligné à droite, pilule rouge 10,5 / 600, **masqué à zéro**, translucide blanc sur l'entrée active. Six entrées sur onze en portent un : clients en vigilance, devis envoyés, affaires en cours, factures au brouillon, factures échues, cautions à moins de 30 jours. Les cinq autres n'en ont pas et n'en auront pas — un compteur qui n'appelle aucune décision est du bruit.

Pied de barre latérale : vignette d'identité, nom, et la mention « Poste unique — session locale » qui rappelle en permanence le modèle mono-utilisateur du PRD.

Repli manuel par `⌘B` : la grille passe à 74 px et la barre s'efface en 160 ms.

## 2.4 Barre d'état

26 px, vibrance, filet haut, texte 11 px `--text-tertiary`. Elle porte en permanence ce qu'un utilisateur seul, hors ligne, avec une base chiffrée, doit pouvoir vérifier sans ouvrir un écran :

- exercice courant et son état, ouvert ou clôturé ;
- pastille verte et « Base chiffrée (SQLCipher) », suivies de **l'horodatage de la dernière sauvegarde** ;
- pastille neutre et « Hors ligne — poste unique » ;
- à droite : contrôle segmenté de densité, puis la date du jour en toutes lettres.

Une sauvegarde en échec fait passer la pastille au rouge et le texte à `--red`. C'est la seule alerte de cette barre, et elle n'interrompt rien.

## 2.5 Recherche

Champ de 230 px dans la barre d'outils, fond `--bg-hover`, rayon 7 px, loupe à gauche et **rappel `⌘F` en `<kbd>` à droite** — le raccourci s'apprend en le voyant, pas en ouvrant l'aide. Jamais flottant dans le contenu, jamais au-dessus d'une liste.

Placeholder spécifique à la vue — « Rechercher un client, un NIF… » —, filtrage incrémental sur les colonnes utiles, `⌘F` donne le focus et sélectionne, `⎋` efface. Le résultat vide n'est jamais une page blanche : le conteneur de tableau affiche « Aucun résultat » et rappelle que la recherche ou les filtres sont actifs.

---

# 3. Composants

## 3.1 Cartes et indicateurs

Carte : `--bg-card`, filet `--separator`, rayon 10 px, `--shadow-sm`. Contrairement à une doctrine du tout-à-plat, l'ombre d'un pixel est conservée : sur `--bg-content` blanc, le filet seul ne détache pas suffisamment une carte, et en sombre elle ancre la surface claire.

Indicateur : libellé 11,5 / 500 en `--text-secondary`, valeur 21 / 700 en chiffres tabulaires, tendance en 11,5 / 600 colorée vert ou rouge avec sa période de comparaison en `--text-tertiary`. Quatre par ligne, deux sous 1000 px.

## 3.2 Listes

Composant unique, sur TanStack Table, pour **toutes** les listes métier. AG Grid est **exclusivement** réservé à la saisie de masse — DQE et déclaration mensuelle — conformément à [prd-cda.md:1168](prd-cda.md#L1168).

En-tête collant au défilement, 11 px majuscules `--text-tertiary`, fond `--bg-card`, filet bas. Lignes séparées d'un filet `--separator`, **sans zébrure** : l'alternance de fonds est un bruit que le filet rend inutile. Survol `--bg-hover`, sélection `--bg-active-row`, dernière ligne sans filet.

Ligne de totaux en `tfoot` dès que la liste porte des montants : 12 / 600, fond `--bg-hover`, filet haut.

Alignements : texte à gauche, **montants et quantités à droite en chiffres tabulaires**, dates à droite, badges dans le flux. Une colonne de montants alignée à gauche est une faute — elle empêche la vérification verticale.

Deux densités seulement, préférence persistée, basculables par `⌘D` ou par le contrôle segmenté de la barre d'état :

| Densité | Padding de cellule | Corps | Usage |
|---|---|---|---|
| Normale | `10px 14px` | 12,5 px | Par défaut |
| Compacte | `5px 14px` | 12 px | Échéanciers, DQE, longues listes |

**Le clic simple sur une ligne ouvre le panneau de détail.** Pas de colonne de boutons d'action : une colonne d'icônes répétée sur 300 lignes ajoute 300 fois le même bruit. Les actions secondaires vivent dans le pied du panneau, les actions de masse dans un menu contextuel natif.

## 3.3 Badges

Fond à teinte douce, texte à teinte pleine, 11 / 600, padding `2.5px 8px`, rayon 6 px. **Aucune pastille, aucun point, aucun contour** — la couleur de fond et le libellé suffisent.

La correspondance statut → couleur est fixe et déclarée en un seul point du code. Elle fait autorité :

| Couleur | Statuts |
|---|---|
| Vert | Payée · Soldé · Accepté · Actif · Mainlevée obtenue · Libérée · Affecté |
| Bleu | Validée · Imprimée · Envoyée · Envoyé · Signé · ODS reçu · Prospect · Active · Livré |
| Orange | En cours · Mainlevée demandée · À affecter · Facturé partiellement · Non facturé |
| Rouge | Résilié · Refusé · Impayé · En vigilance |
| Violet | Facturé · Client protégé GITRA / Groupe |
| Gris | Brouillon · Archivé · Archivée · Inactif · Expiré |

Deux échelles dérivées suivent la même mécanique : score client — A vert, B bleu, C orange, D rouge, Protégé violet — et classification catalogue — Noir gris, Blanc bleu, Autre violet.

## 3.4 Bandeaux d'alerte

Pleine largeur, en tête du contenu, **avant** tout le reste. Fond à teinte douce, icône, titre en gras, texte explicatif, lien d'action facultatif, bouton de fermeture. Rayon 9 px, pas de filet latéral.

Ils sont déclarés dans un **registre unique**, chaque entrée nommant les vues où elle apparaît, son ton, son texte et son action. C'est ce registre qui rend le principe « alerter plutôt que bloquer » de [prd-cda.md:965](prd-cda.md#L965) mécanique plutôt que déclaratif : n'importe quelle vue peut recevoir une alerte sans qu'aucun composant de vue ne soit modifié.

Le lien d'action navigue vers la vue concernée **et** ouvre la fiche visée — un bandeau qui décrit un problème sans y conduire fait perdre le temps qu'il prétend faire gagner. La fermeture est mémorisée pour la session.

Trois au maximum sur un même écran. Un client en vigilance affiche un badge sur sa fiche et dans la liste, un bandeau sur trois vues, et **reste intégralement utilisable** : aucun bouton désactivé, aucune création empêchée. Les seuls verrous de l'application sont fiscaux — un numéro attribué, un exercice clôturé.

## 3.5 Panneau de détail — pattern unique

**Toute consultation de fiche se fait dans un panneau coulissant droit.** Sans exception, y compris la facture, qui était auparavant une vue pleine page à onglets. Dix types d'entité l'utilisent : client, affaire, devis, facture, bon de livraison, encaissement, caution, retenue, sous-traitant, article.

Un pattern unique vaut mieux qu'un pattern optimal par écran : l'utilisateur apprend une fois où apparaît le détail, comment il se ferme, où sont les actions.

| Propriété | Valeur |
|---|---|
| Largeur | 660 px, plafonnée à 92 vw |
| Entrée | `translateX(100%)` → `0`, 280 ms `cubic-bezier(.32,.72,0,1)` |
| Voile | `rgba(0,0,0,.22)`, 220 ms, fermeture au clic |
| Fond | `--bg-content`, `--shadow-lg` |

Structure invariable : en-tête — identifiant en 16 / 700, désignation en dessous, bouton de fermeture rond —, onglets soulignés **affichés seulement s'il y en a plus d'un**, corps défilant, pied d'actions collé en bas sur `--bg-card`.

L'onglet actif est mémorisé **par fiche** : rouvrir une facture la rouvre sur l'onglet qu'on y consultait. `⎋` ferme.

Deux cas restent hors du panneau : la **saisie de masse** — DQE, déclaration mensuelle — qui exige la pleine largeur, et l'**assistant d'import** en trois étapes.

## 3.6 Modale de confirmation

Réservée aux **actions irréversibles** et à l'aide clavier. 480 px, centrée, rayon 12 px, `--shadow-lg`, entrée en 220 ms de `scale(.96)` à `1`, voile `rgba(0,0,0,.28)`, fermeture au clic hors cadre et à `⎋`.

Composition : pastille d'icône ronde de 44 px teintée du ton de l'action, titre 15 / 700, texte explicatif, **encadré de détail** rappelant les données concrètes, deux boutons de largeur égale — annulation à gauche, confirmation à droite.

La confirmation nomme l'objet et sa conséquence, et les deux boutons sont des phrases, pas « OK » et « Annuler ». Modèle de référence, la validation de facture :

> **Valider définitivement cette facture ?**
> La validation attribue le numéro de série et **le verrouille définitivement**. Le document ne pourra plus être modifié ni supprimé : toute correction passera par un avoir.
> › Numéro qui sera attribué : `FA-2026-00044` — Client : DTP Oran — Net à payer : 5 965 886,38 DA
> › Tant que la facture reste au brouillon, aucun numéro n'est consommé.
> `[ Rester en brouillon ]` `[ Valider et attribuer le numéro ]`

L'encadré affiche le numéro **avant** qu'il soit consommé : c'est la seule façon de rendre visible l'invariant de numérotation du §4.4.2. La suppression d'un brouillon suit la même forme, en rappelant qu'elle ne laisse aucun trou dans la séquence.

**Une action destructive n'est jamais l'action par défaut** et n'a jamais le focus initial ; elle emprunte le bouton rouge — `--red-soft` au repos, `--red` plein au survol.

## 3.7 Notifications transitoires

Toast centré en bas, au-dessus de la barre d'état : `--bg-card`, filet, `--shadow-md`, rayon 9 px, icône verte. Entrée 200 ms, persistance 3,2 s, sortie en fondu et translation de 6 px sur 300 ms. Empilables, jamais cliquables, jamais porteurs d'une information qu'on ne peut pas retrouver ailleurs.

Ils confirment ce qui vient d'être fait — « Facture FA-2026-00044 validée — numéro attribué définitivement ». Aucune animation ne célèbre un enregistrement au-delà de ça.

## 3.8 Formulaires et validation

Champ : `--bg-input`, filet `--separator-strong`, rayon 7 px, padding `7px 10px`, corps 13 px. Au focus, bordure `--accent` **et** anneau `0 0 0 3px var(--accent-soft)`. Libellé au-dessus, 12 / 600 en `--text-secondary`. Deux colonnes au-delà de 1000 px, une seule en dessous.

Trois états de ligne de formulaire, portés par une classe sur le conteneur et non sur le champ :

| État | Rendu |
|---|---|
| Neutre | Filet discret, indication d'aide visible sous le champ |
| `.valid` | Bordure verte, indication conservée |
| `.invalid` | Bordure rouge et anneau rouge, **indication masquée et remplacée par le message d'erreur** |

Le message ne s'ajoute jamais à l'indication d'aide : les deux occuperaient la même ligne et feraient sauter la mise en page à chaque frappe.

**Le message dit comment corriger, et il compte.** « Le NIF doit comporter exactement 15 chiffres — 12 saisis » plutôt que « Champ invalide ». Deux régimes de déclenchement :

- **Identifiants de longueur fixe** — NIF 15 chiffres, NIS 13, RC : validation à la frappe, parce que le message est un compteur qui guide la saisie au lieu de la sanctionner. Champ vide : aucun état, ni erreur ni succès.
- **Tout le reste** : validation à la sortie du champ. Signaler une erreur de format d'adresse au troisième caractère est agressif et inutile.

Une erreur ne désactive pas le bouton d'enregistrement : on clique, on obtient le focus sur le premier champ fautif. Un bouton grisé sans explication laisse l'utilisateur bloqué sans indice.

Saisie monétaire : affichage formaté avec séparateurs, **stockage en centimes**, alignement à droite, sélection intégrale au focus. Dates en `JJ/MM/AAAA` à la saisie comme à l'affichage, calendrier accessible mais frappe directe toujours possible — un utilisateur qui connaît la date la tape plus vite qu'il ne la clique.

Interrupteur : 36 × 21 px, gris au repos, **vert** actif, pastille blanche translatée en 150 ms. Il ne sert qu'aux réglages booléens du Paramétrage, jamais dans un formulaire de saisie métier.

## 3.9 Pied de facture

L'écran le plus utilisé, et celui où l'exigence de fidélité au document est la plus forte. Aligné à droite, largeur 420 px, chaque intitulé face à son montant en chiffres tabulaires. Il se recalcule à chaque frappe, sans bouton de recalcul.

L'ordre est celui de [prd-cda.md:456-468](prd-cda.md#L456-L468), **sans exception ni raccourci** :

```
  Total HT des lignes
− Remises sur lignes        (accordées ligne par ligne)
− Rabais global             (pourcentage du document)
──────────────────────────────────────────────────────
= Net commercial HT
− Remboursement d'avance    (prorata)
− Retenue de garantie       (% sur base HT)
──────────────────────────────────────────────────────
= Total HT facture
+ TVA 19 %
──────────────────────────────────────────────────────
= Total TTC
+ Droit de timbre           (mode de règlement, plafond)
══════════════════════════════════════════════════════
  NET À PAYER
```

**La remise sur lignes et le rabais global sont deux lignes distinctes**, toutes deux affichées même à zéro. Les confondre — ou n'en montrer qu'une — rend le net commercial invérifiable, puisque l'une s'applique poste par poste et l'autre au document entier.

Trois filets seulement, sur les trois sous-totaux `= Net commercial HT`, `= Total HT facture` et `= Total TTC`, qui passent en `--text-primary` gras. Les déductions restent en `--text-secondary` préfixées d'un signe moins : ce n'est pas une anomalie, c'est un mécanisme normal — jamais de rouge.

Le **NET À PAYER** occupe un bloc `--bg-hover` à rayon 9 px, coiffé d'un filet de 2 px en `--text-primary`, libellé en 11 px majuscules espacées, montant en 16 / 700.

Chaque ligne conditionnelle porte **la raison de sa valeur** en indication grise : le pourcentage du rabais, la base de la retenue, et pour le timbre le mode de règlement qui l'a déclenché — ou la mention « non applicable au virement » quand il ne s'applique pas. La ligne de timbre reste affichée à zéro avec son motif : son absence pure ferait douter d'un oubli. Une note de bas de pied rappelle l'arrondi ligne par ligne puis au total, et le caractère paramétrable du barème (§4.7.3).

Saisie des lignes entièrement au clavier : `Tab` avance de cellule en cellule, `⏎` en fin de ligne crée la suivante, `⌘D` duplique la ligne courante. Le code produit ouvre un sélecteur à recherche incrémentale qui renseigne libellé, unité et prix unitaire.

## 3.10 Filtres, encadrés, états vides

**Puces de filtre** : pilules 12 / 500 sur `--bg-hover`, actives en `--accent-soft` et texte accent. Elles servent au filtrage par statut, et à la bascule entre sous-vues d'un même module — « Factures et avoirs » / « Bons de livraison ». Une puce « Tous » ouvre toujours le groupe.

**Encadrés** : même grammaire que les bandeaux — fond doux, texte teinté, icône, rayon 9 px — mais **dans le flux du contenu**, pour expliquer une règle métier au point où elle s'applique : pourquoi une classification est figée en instantané, pourquoi un article désactivé reste lisible sur l'historique, pourquoi un barème est paramétrable.

**État vide** : icône en trait à 50 % d'opacité, titre 13,5 / 600, phrase de 320 px expliquant ce qui viendra là. Deux variantes à ne pas confondre — le vide initial propose l'action qui le résout, le résultat de recherche vide rappelle le terme cherché et propose de l'effacer.

## 3.11 Paramétrage

Mode étroit à 980 px, disposition à deux colonnes : navigation collante de 190 px à gauche, contenu à droite. Cinq sections — Société, Fiscalité, Numérotation, Sécurité et sauvegarde, Apparence.

Chaque section s'ouvre sur un titre 15 / 700 et une phrase qui dit **où le réglage produit son effet** : « Ces informations alimentent l'en-tête et les mentions légales de tous les documents imprimés ». Les réglages simples sont des lignes libellé / sous-libellé / contrôle séparées d'un filet ; les données structurées — barème du timbre, séries de numérotation — sont des tableaux, pas des empilements de champs.

Toute valeur signalée comme à confirmer dans l'annexe §16 du PRD porte son avertissement **à côté d'elle**, pas dans une note de bas de page.

---

# 4. Mouvement

Le mouvement explique une provenance ou une disparition. Il ne récompense pas, ne célèbre pas, n'attire pas l'attention.

| Transition | Durée | Courbe |
|---|---|---|
| Survol de ligne de tableau | 80 ms | `ease` |
| Survol d'entrée de barre latérale | 100 ms | `ease` |
| Survol de bouton, focus de champ | 120 ms | `ease` |
| Barre latérale — repli / effacement | 220 ms / 160 ms | `cubic-bezier(.32,.72,0,1)` |
| Voile | 220 ms | `ease` |
| Modale | 220 ms | `cubic-bezier(.32,.72,0,1)` |
| Panneau coulissant | 280 ms | `cubic-bezier(.32,.72,0,1)` |
| Toast — entrée / sortie | 200 ms / 300 ms | `ease` |
| Bascule de thème | 250 ms | `ease` |
| Croissance des barres d'un graphique | 500 ms | `cubic-bezier(.4,0,.2,1)` |

La courbe `cubic-bezier(.32,.72,0,1)` — départ franc, arrivée longuement amortie — est celle de toutes les surfaces qui entrent. C'est la signature de mouvement de l'application ; les micro-transitions d'état se contentent d'`ease`.

Les modales entrent de `scale(.96)` à `1` avec l'opacité ; les panneaux glissent depuis leur bord d'ancrage ; rien n'entre depuis un point qui n'est pas le sien.

Interdits : rebonds, rotations, pulsations, apparition en cascade des lignes d'un tableau, animation sur enregistrement réussi.

`prefers-reduced-motion: reduce` ramène **toutes** les durées d'animation et de transition à `.01ms`. La préférence est catégorique : elle ne se négocie pas par une réduction partielle.

---

# 5. Clavier

L'utilisateur cible connaîtra l'application par cœur. Le clavier est un chemin de premier ordre, pas une commodité d'accessibilité.

## 5.1 Raccourcis globaux

| Raccourci | Action | État |
|---|---|---|
| `⌘1` … `⌘9` | Aller à la Ne entrée de la barre latérale | Maquette |
| `⌘F` | Focus et sélection dans la recherche | Maquette |
| `⌘N` | Créer, contextuel à l'écran actif | Maquette |
| `⌘B` | Replier ou déplier la barre latérale | Maquette |
| `⌘D` | Basculer la densité normale / compacte | Maquette |
| `⌘⇧L` | Basculer le thème clair / sombre | Maquette |
| `⌘/` | Afficher la liste des raccourcis | Maquette |
| `⎋` | Fermer la modale, sinon la fiche, sinon vider la recherche | Maquette |
| `⌘S` | Enregistrer | À implémenter |
| `⌘⏎` | Valider le document courant | À implémenter |
| `⌘P` | Aperçu avant impression | À implémenter |
| `⌘K` | Palette de navigation rapide | À implémenter |
| `⌘⇧V` | Verrouiller la session | À implémenter |

Le thème prend `⌘⇧L` et **`⌘L` reste libre** : la combinaison est trop associée à la barre d'adresse pour porter le verrouillage de session, d'où `⌘⇧V`.

`⎋` est une **cascade, pas un interrupteur** : elle traite la couche la plus récente, et une seule à la fois. Fermer d'un coup la modale, la fiche et la recherche ferait perdre le contexte que l'utilisateur voulait conserver.

## 5.2 Dans les listes

`↑` `↓` déplacent la sélection, `⏎` ouvre le panneau de détail, `Espace` sélectionne en multiple, `⌘A` sélectionne tout, `⌫` déclenche la suppression logique avec confirmation, `⌃F10` ouvre le menu contextuel natif.

## 5.3 Dans les grilles de saisie

`Tab` et `⇧Tab` de cellule en cellule, `⏎` valide et descend, `⌘D` duplique la ligne au-dessus, `⌘V` colle un bloc depuis Excel — indispensable pour un DQE de 300 lignes, où la saisie manuelle est explicitement exclue par [prd-cda.md:173](prd-cda.md#L173).

## 5.4 Règles

**Registre unique des raccourcis dans le code**, source de vérité pour la feuille `⌘/` et pour le libellé affiché selon la plateforme. Un raccourci qui existe sans y figurer n'existe pas ; un libellé écrit en dur dans un composant est un défaut.

Le raccourci est rappelé **là où il s'applique** : `⌘F` dans le champ de recherche, `⌘B` et `⌘/` en infobulle des boutons d'icône, `⌘D` dans le libellé du réglage de densité.

Tout écran est atteignable sans souris. L'ordre de tabulation suit l'ordre de lecture. Le focus est **toujours** visible — `outline: 2px solid var(--accent); outline-offset: 2px` sur `:focus-visible`, jamais d'`outline: none` sans anneau de remplacement. Aucun piège au clavier hors modale, et une modale rend le focus à son origine en se fermant.

---

# 6. Thème sombre

Le mode sombre suit la préférence système, bascule sans rechargement par un attribut `data-theme` sur `<html>`, et un réglage du Paramétrage force clair, sombre ou système.

Règles qui distinguent un mode sombre conçu d'un mode sombre inversé :

- **Jamais de noir pur ni de blanc pur.** `#1C1C1E` et `#F5F5F7`. Le contraste maximal fatigue et fait vibrer le texte.
- **La hiérarchie s'inverse.** Le fond de fenêtre est le plus sombre (`#151517`), le contenu au-dessus (`#1C1C1E`), les cartes au-dessus encore (`#2A2A2D`), les champs au sommet (`#313134`). Une carte plus sombre que son fond disparaît.
- **Les ombres perdent leur rôle** : la séparation passe par la luminosité de la surface et le filet `--separator`. Les tokens d'ombre existent quand même, plus opaques, pour ancrer les surfaces flottantes.
- **Les couleurs d'état s'éclaircissent.** `#248A3D` → `#32D74B`, `#D70015` → `#FF453A`. Un rouge sombre saturé sur fond sombre halote et devient illisible.
- **L'accent s'éclaircit** — `#0071E3` → `#0A84FF` — pour conserver son contraste sous du texte blanc.
- **Les fonds doux s'opacifient** : `.1` → `.18` sur l'accent, `.15` → `.18` sur le vert. Un voile trop transparent sur fond sombre ne se distingue plus de la surface.
- **Les ascenseurs s'inversent** : `rgba(0,0,0,.18)` → `rgba(255,255,255,.18)`.

Contrôle : basculer le thème sans recharger, sur chaque écran, et vérifier qu'aucun élément ne disparaît, qu'aucun texte ne descend sous 4,5:1, qu'aucune bordure ne devient invisible. C'est une tâche de recette — C30 dans [plans.md](plans.md) — pas une inspection à l'œil.

---

# 7. Accessibilité

Seuils non négociables : **4,5:1** pour le texte courant, **3:1** pour le texte large et les éléments d'interface, dans les deux thèmes.

## 7.1 Correction à appliquer sur `--text-tertiary`

Contrastes effectifs des couples de texte de la maquette :

| Couple | Contraste | Verdict |
|---|---|---|
| `--text-secondary #6E6E73` sur `#FFFFFF` | 5,1:1 | Conforme |
| `--text-tertiary #A1A1A6` sur `#FFFFFF` | **2,6:1** | **Non conforme** |
| `--text-tertiary #75757A` sur `#1C1C1E` | **3,7:1** | **Non conforme** |

Le token tertiaire ne porte pas de décoration : il porte les en-têtes de colonne, les libellés de champ en lecture, les indications de formulaire, les sous-titres de graphique et toute la barre d'état — du texte de 11 px, précisément le cas où le seuil de 4,5:1 s'applique sans indulgence.

Valeurs à retenir en implémentation : **`#73737A` en clair** (4,7:1) et **`#8E8E93` en sombre** (5,2:1). L'écart visuel avec le token secondaire reste perceptible, la hiérarchie est préservée, et la maquette doit être corrigée en conséquence.

## 7.2 Le reste

Cibles cliquables de 28 px minimum en hauteur — c'est la dimension des boutons d'icône de la barre d'outils et le plancher de la densité normale. La densité compacte descend une ligne de tableau sous ce seuil : elle reste un **choix explicite** de l'utilisateur, jamais la valeur par défaut, et n'affecte aucun contrôle.

L'information n'est jamais portée par la seule couleur : libellé systématique sur chaque badge, chaque bandeau, chaque état.

Sémantique HTML réelle — `<table>` pour un tableau, `<button>` pour un bouton, `<label for>` associé à son champ, `role="dialog"` et `aria-modal` sur le panneau comme sur la modale. Les composants shadcn/ui reposent sur Radix, qui fournit les rôles ARIA et la gestion du focus : ne pas les contourner.

Le zoom à 125 % et 150 % ne doit produire ni chevauchement ni troncature. Résolution plancher 1366 × 768 ([prd-cda.md:1250](prd-cda.md#L1250)) : chaque écran est vérifié à cette taille. Sous 1000 px de largeur utile, la grille d'indicateurs passe à deux colonnes et **toutes** les grilles à deux colonnes — contenu, champs, fiches, aide clavier, paramétrage — passent à une seule.

---

# 8. Documents imprimés

Les PDF sont le livrable visible d'EGTO chez ses clients. Ils ne suivent pas les règles de l'écran : sobriété maximale, densité assumée, aucune couleur décorative, **aucun token d'interface**.

Format A4 portrait, marges 20 mm en haut et en bas, 18 mm sur les côtés. Corps en 9,5 pt, en-têtes de tableau en 8,5 pt, titre du document en 16 pt.

En-tête : logo EGTO à gauche, coordonnées et identifiants légaux à droite en 8 pt. Le titre du document et son numéro sont l'élément le plus visible de la page — c'est ce qu'on cherche en manipulant une liasse.

Les 9 mentions légales obligatoires de [prd-cda.md:956](prd-cda.md#L956) figurent en pied de page en 7,5 pt : dénomination, forme juridique, capital, RC, NIF, NIS, AI, adresse, mode de règlement, mention du droit de timbre le cas échéant, taux de TVA.

Le tableau des lignes utilise un filet de séparation fin, sans fond alterné. **Le pied reproduit exactement l'enchaînement de §3.9**, rabais global compris, avec le NET À PAYER encadré d'un filet. L'écran et le papier ne peuvent pas diverger d'une ligne : c'est le seul moyen pour l'utilisateur de contrôler avant d'imprimer.

Duplicata : mention « DUPLICATA » en filigrane diagonal gris 20 %, sur toute réimpression d'un document déjà imprimé ([prd-cda.md:548](prd-cda.md#L548)).

Polices embarquées : Roboto pour le latin, **Noto Naskh Arabic** pour l'arabe. Roboto seul ne contient aucun glyphe arabe ([prd-cda.md:1177](prd-cda.md#L1177)) et un glyphe manquant produit un carré vide sur un document envoyé à un client. Le périmètre exact de l'arabe — dénomination sociale seule, ou document bilingue complet — reste à confirmer avec EGTO avant le jalon 5, car un document réellement bilingue demande une gestion du sens d'écriture que pdfmake supporte mal.

---

# 9. Liste de contrôle avant livraison d'un écran

- Une seule action primaire, identifiable sans hésitation.
- Le détail s'ouvre dans le panneau coulissant droit, jamais en vue pleine page ni en modale.
- Les quatre états sont implémentés : chargement, vide initial, recherche sans résultat, erreur.
- Atteignable et utilisable au clavier de bout en bout, focus visible partout, `⎋` correctement en cascade.
- Correct en clair et en sombre, sans élément disparu ni bordure évanouie.
- Correct à 1366 × 768, à 150 % de zoom, et sous 1000 px de largeur utile.
- Aucune couleur littérale, aucun rayon ni ombre hors tokens.
- Tous les montants en chiffres tabulaires, alignés à droite, au bon format — deux décimales sur un document, dinar entier sur un indicateur.
- Aucune information portée par la seule couleur ; chaque badge porte son libellé.
- Aucun blocage sans explication : rien de désactivé sans motif affiché, alerte plutôt que blocage.
- Aucun calcul financier dans un composant — les montants viennent du domaine, en centimes.
- Terminologie conforme au glossaire de [prd-cda.md:1203](prd-cda.md#L1203) : ODS, DQE, situation de travaux, mainlevée, attachement, réception provisoire.

---

# 10. Écarts connus entre la maquette et la cible

[mockup.html](mockup.html) est une maquette statique : ce qu'elle ne montre pas reste dû, et ne doit pas être lu comme un arbitrage de design.

| Sujet | État de la maquette | Attendu |
|---|---|---|
| États de chargement | Absents — les données sont en mémoire | Squelettes gris aux dimensions du contenu, rien sous 200 ms |
| États d'erreur | Absents | Cause en langage clair, bouton « Réessayer », détail technique replié |
| Écrans de saisie | Absents — un toast tient lieu de création | Formulaires complets, §3.8 |
| Saisie de masse | Absente | Grille AG Grid pleine largeur, DQE et déclaration mensuelle uniquement |
| Menus contextuels | Absents | Menus natifs Electron déclenchés par IPC |
| Connexion et premier démarrage | Absents | Écran de session et assistant avec affichage unique de la phrase de récupération |
| Largeur de barre latérale | Fixe à 250 px | Redimensionnable de 200 à 320 px, largeur persistée |
| Préférences | En mémoire de session | Persistées : thème, densité, repli, largeurs de colonnes |
| `--text-tertiary` | 2,6:1 en clair | Corrigé à `#73737A` / `#8E8E93` — voir §7.1 |
