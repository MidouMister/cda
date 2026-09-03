# Manuel Utilisateur EGTO

## 1. Introduction

**EGTO** est une application de **gestion commerciale** destinée aux entreprises du secteur **BTP** dont le siège est à **Oran** (filiale du groupe GITRA). Elle permet de gérer l'ensemble du cycle commercial : clients, devis, affaires, facturation, bons de livraison, avoirs et encaissements.

Ce manuel s'adresse aux **utilisateurs de l'application** : responsables commerciaux, gestionnaires de facturation et tout collaborateur amené à créer des documents, suivre des affaires ou gérer les données de l'entreprise. Il décrit le comportement réel de l'application et vous guide pas à pas dans son utilisation au quotidien.

> L'application est **mono-poste et mono-utilisateur** : elle est installée sur un seul ordinateur et protégée par un mot de passe applicatif. Toutes les données sont stockées localement, dans une base chiffrée.

---

## 2. Premier démarrage

La première fois que vous lancez EGTO, l'application vous accueille sur l'écran **« Bienvenue dans EGTO »**. Vous devez :

1. **Créer un mot de passe** : saisissez un mot de passe d'au moins **8 caractères**, puis confirmez-le dans le champ « Confirmer le mot de passe ». Les deux saisies doivent être identiques.
2. Cliquer sur **« Créer mon mot de passe »**.

> Lors de ce premier démarrage, vous pouvez également cliquer sur **« Charger les données de démonstration »** pour pré-remplir la base avec un jeu de données BTP réaliste (clients, produits, affaires, factures). Cette action est **irréversible** : elle est proposée uniquement lorsque la base est encore vierge.

Une fois le mot de passe créé, l'application génère votre **phrase de récupération** (voir section 4). La base de données chiffrée est créée et initialisée automatiquement.

### Statut du poste

À tout moment, l'écran de connexion indique l'état du poste via l'onglet **Session** :

| État | Signification |
|---|---|
| Premier démarrage | Aucun compte n'existe encore sur ce poste |
| Session verrouillée | Un compte existe, mais vous devez vous connecter |
| Session ouverte | La base est déverrouillée et accessible |

---

## 3. Gestion de la session

### Déverrouillage (connexion)

À chaque lancement (ou après un verrouillage), vous arrivez sur l'écran de connexion. Saisissez votre **mot de passe** pour déverrouiller la base et accéder à vos données.

### Verrouillage automatique par inactivité

Pour protéger vos données, EGTO **verrouille automatiquement la session après 30 minutes d'inactivité**. Dès que le verrouillage intervient, la base est fermée et vous devez ressaisir votre mot de passe pour continuer. Toute activité à l'écran réinitialise le compte à rebours.

### Verrouillage manuel

Vous pouvez verrouiller la session à tout moment (bouton de verrouillage de l'interface) avant de quitter votre poste, afin de protéger vos données.

### Changement de mot de passe

Depuis les paramètres de session, vous pouvez changer votre mot de passe en fournissant :
1. **l'ancien mot de passe** (pour la vérification) ;
2. le **nouveau mot de passe** (au moins 8 caractères) ;
3. la **confirmation** du nouveau mot de passe.

Le changement est immédiat. Conservez précieusement votre **phrase de récupération** : elle ne change jamais et reste le seul moyen de récupérer la base si vous oubliez le mot de passe.

---

## 4. Phrase de récupération

La **phrase de récupération** est composée de **12 mots répartis en 6 groupes** (par exemple `AAAA-BBBB-CCCC-DDDD-EEEE-FFFF`). Elle est **générée automatiquement** et affichée **une seule fois** lors du premier démarrage.

### Son importance vitale

L'accès à vos données repose sur la clé de chiffrement (DEK) de la base. Cette clé est déchiffrée :
- avec votre **mot de passe**, et
- avec votre **phrase de récupération**.

Si vous oubliez votre mot de passe **et** perdez votre phrase, **il est impossible de récupérer vos données** — elles sont chiffrées et définitivement inaccessibles.

### Conservation

- **Imprimez** la phrase (bouton « Imprimer ») et **conservez-la en lieu sûr, hors de ce poste**.
- Ne la notez pas sur un fichier stocké sur le même ordinateur que vos données.
- Elle n'est **jamais réaffichée** : une fois validée, elle ne réapparaît plus à l'écran.

### Ce qu'elle permet

La phrase de récupération est le seul sésame pour :
- **Restaurer une sauvegarde** (voir section 7) sur ce poste ou sur un poste vierge ;
- **Exécuter l'utilitaire administrateur** `egto-admin-reset` pour réinitialiser le mot de passe (voir section 10).

---

## 5. Alerte Windows SmartScreen

EGTO est distribué sous forme d'exécutable Windows (`.exe`, installeur NSIS). Comme l'application n'est **pas signée numériquement** par une autorité de certification reconnue, Windows peut afficher l'alerte **« Windows a protégé votre PC »** (SmartScreen) lors de l'installation.

### Que se passe-t-il ?

Windows SmartScreen bloque par précaution le lancement de tout programme non signé, afin de protéger contre les logiciels inconnus. C'est un comportement **normal** pour une application non signée.

### Que faire ?

1. Sur l'écran de l'alerte, cliquez sur **« Plus d'informations »**.
2. Cliquez ensuite sur **« Exécuter quand même »**.
3. L'installation se poursuit normalement.

> **Pourquoi ?** L'application n'est pas signée, Windows ne peut donc pas vérifier son éditeur. Cette étape permet d'autoriser explicitement l'installation. Seule une **signature numérique** (certificat d'éditeur) ferait disparaître ce message à l'avenir.

---

## 6. Sauvegarde des données

EGTO protège vos données contre la perte grâce à un système de sauvegarde en deux volets.

### Sauvegarde automatique quotidienne

- **Fréquence** : une vérification est effectuée chaque heure ; la sauvegarde se déclenche à l'heure configurée (par défaut **03:00**).
- **Destination** : dossier que vous configurez dans l'écran **Paramétrage → Sauvegardes** (sur un disque externe ou un autre emplacement de préférence).
- **Rétention** : les anciennes sauvegardes sont automatiquement purgées (**30 sauvegardes quotidiennes**, **12 sauvegardes mensuelles**).
- La sauvegarde ne se déclenche pas si la session est verrouillée ou si la destination n'est pas configurée.

### Sauvegarde manuelle

Vous pouvez lancer une sauvegarde à tout moment :
- depuis l'écran **Paramétrage → Sauvegardes** (planification manuelle), ou
- via l'utilitaire de secours en ligne de commande : `egto --recuperation`.

### Contenu de l'archive

Chaque sauvegarde produit une **archive `.zip`** contenant vos données chiffrées, accompagnée d'un fichier **`recours.bin`** placé **à côté de l'archive**. Ce fichier contient la clé de déchiffrement enveloppée par la phrase de récupération, et est indispensable à la restauration.

> Conservez **ensemble** l'archive et son `recours.bin`, et notez l'emplacement de la sauvegarde.

---

## 7. Restauration

La restauration permet de récupérer vos données à partir d'une archive de sauvegarde (après une perte, un changement de poste ou une réinstallation). Pour une procédure complète, reportez-vous au guide détaillé **`docs/procedure-restauration.md`**.

### Principe

- La restauration s'effectue avec la **phrase de récupération seule** — aucun mot de passe applicatif n'est nécessaire pour lancer l'opération.
- Elle peut être réalisée sur un **poste vierge** (avant toute création de compte) : l'écran « Restauration » est accessible depuis le premier démarrage ou l'écran de connexion.
- La restauration est **interdite pendant une session active** : la base doit être verrouillée.

### Définir un nouveau mot de passe

Lors de la restauration, l'écran vous demande de saisir :

1. votre **phrase de récupération** (format `AAAA-BBBB-CCCC-DDDD-EEEE-FFFF`) ;
2. un **nouveau mot de passe** (au moins **8 caractères**) ;
3. la **confirmation** de ce nouveau mot de passe (les deux saisies doivent être identiques).

> **Pourquoi un nouveau mot de passe ?** La phrase de récupération déchiffre la clé de chiffrement (DEK) de la base, mais le mot de passe applicatif d'origine n'est **pas conservé** dans l'archive. Il est donc impossible de réutiliser l'ancien mot de passe : vous devez en définir un nouveau.

### Déroulement

1. Cliquez sur **« Restaurer une sauvegarde ? »** (écran de connexion) ou **« Restaurer une sauvegarde existante »** (premier démarrage).
2. Saisissez votre **phrase de récupération**, puis votre **nouveau mot de passe** et sa **confirmation**.
3. Cliquez sur **« Sélectionner et restaurer »** et choisissez l'archive (`*.zip` ou `*.enc`) dans la fenêtre qui s'ouvre. L'archive et son fichier `recours.bin` doivent se trouver au même emplacement.
4. **Ne fermez pas l'application** pendant la restauration : une barre de progression s'affiche.
5. En cas de succès, cliquez sur **« Aller à la connexion »**.

### Se connecter après la restauration

Sur l'écran de connexion, saisissez votre **nouveau mot de passe** pour déverrouiller la base et accéder à vos données restaurées. La phrase de récupération reste nécessaire uniquement pour déverrouiller la clé lors de la restauration ; elle n'est pas utilisée pour la connexion quotidienne.

---

## 8. Cycles de facturation

### Du devis à l'affaire

1. **Devis** : créez un devis pour un client, ajoutez des lignes (désignation, quantité, PU HT). Statuts : `BROUILLON` → `ENVOYE` → `ACCEPTE` / `REFUSE` / `EXPIRE`.
2. **Affaire** : lorsqu'un devis est accepté (`ENVOYE`), convertissez-le en affaire. L'affaire reprend les lignes du devis et suit son propre cycle (SIGNE → ODS_REÇU → EN COURS → FACTURÉ → SOLDÉ).

### La facture

Une facture suit le cycle : **BROUILLON → VALIDE → IMPRIMEE → ENVOYEE → PAYEE → ARCHIVEE**.

| Étape | Action |
|---|---|
| BROUILLON | Création et saisie des lignes ; pas encore de numéro |
| VALIDE | Validation : le **numéro** est attribué à ce moment (jamais au brouillon) |
| IMPRIMEE | Première impression du PDF ; compteur d'impressions incrémenté |
| ENVOYEE | Transmission au client ; c'est le statut permettant l'encaissement |
| PAYEE | Atteinte lorsque le solde est totalement réglé (aucun encaissement hors statut `ENVOYEE`) |
| ARCHIVEE | Facture clôturée |

### Avoirs

Les avoirs (type `AV`) corrigent une facture d'origine :
- **Avoir total** : annule toute la facture.
- **Avoir partiel** : annule une partie (par ligne ou avec quantités partielles), avec un **motif** obligatoire.

Un avoir suit la même machine à états qu'une facture. **Un avoir ne peut jamais être encaissé.**

### Bons de livraison

Les bons de livraison (BL) documentent les livraisons réelles. Statuts : `EMIS` → `FACTURE`. Lorsque plusieurs BL sont émis, vous pouvez **générer une facture groupée** à partir d'eux ; les BL passent alors à l'état `FACTURE` et sont liés à la facture créée.

### Mention DUPLICATA

À partir de la **deuxième génération** (réimpression) d'un document, le PDF porte un **filigrane « DUPLICATA »**. L'aperçu du document n'incrémente pas le compteur d'impressions ; seule l'**impression** le fait.

---

## 9. Import de données

L'assistant d'import permet de charger en masse des **clients** ou des **produits** à partir d'un fichier Excel.

L'import se déroule en **3 étapes** :

1. **Lecture & mapping** : sélectionnez le fichier ; l'application lit les colonnes et vous permet de faire correspondre les colonnes du fichier avec les champs EGTO.
2. **Prévisualisation** : les lignes sont validées et affichées ; les erreurs éventuelles sont signalées.
3. **Rapport d'anomalies** : à l'exécution, un rapport liste les lignes importées et les anomalies (champs manquants, formats invalides…). Seules les lignes valides sont insérées.

### Types d'import

| Type | Contenu |
|---|---|
| **Clients** | fiches clients (raison sociale, NIF, adresse, catégorie…) |
| **Produits** | catalogue produits (code, libellé, famille, prix) |

---

## 10. Dépannage & support

### Erreurs courantes

| Message / symptôme | Cause / action |
|---|---|
| « Le mot de passe doit comporter au moins 8 caractères » | Mot de passe trop court à la création ou au changement |
| « Mot de passe incorrect » | Saisie erronée à la connexion ; réessayez ou utilisez la phrase de récupération |
| « Phrase de récupération incorrecte » | Phrase erronée ou fichier `recours.bin` absent/illisible |
| « La restauration est interdite pendant une session active » | Verrouillez la session avant de restaurer |
| « Le dossier de destination n'est pas vide » | Une base existe déjà ; la restauration n'écrase pas des données existantes |
| Alerte Windows SmartScreen | Application non signée : « Plus d'infos » → « Exécuter quand même » (voir section 5) |

### Journal applicatif

EGTO consulte et écrit un **journal** (fichiers de logs). Depuis l'écran **Paramétrage → Journaux**, vous pouvez lire les dernières entrées (20 dernières par défaut) et les **exporter** pour les transmettre au support en cas de problème.

### Réinitialisation administrateur (egto-admin-reset)

En cas d'oubli du mot de passe applicatif, l'utilitaire autonome **`egto-admin-reset`** permet de réinitialiser le mot de passe :

1. Exécutez l'utilitaire `egto-admin-reset` avec le dossier des données en argument.
2. Saisissez la **phrase de récupération** (elle est obligatoire : sans elle, aucune réinitialisation n'est possible).
3. Saisissez et confirmez le **nouveau mot de passe** (au moins 8 caractères).

> La phrase de récupération **ne change jamais** : elle reste valide après la réinitialisation. Conservez-la toujours précieusement.

---

*Documentation EGTO — Gestion Commerciale BTP (Oran). Pour toute question, contactez le support technique.*
