# Procédure de restauration d'une sauvegarde

Guide pas à pas pour restaurer les données EGTO à partir d'une archive, y compris sur un poste vierge (avant toute session). La restauration s'effectue avec la **phrase de récupération seule** — aucun mot de passe applicatif n'est requis.

## Prérequis

- Une **archive EGTO** (`*.zip`) et son fichier `recours.bin` situé **à côté** de l'archive (copiés automatiquement lors de l'export, format V3).
- La **phrase de récupération** associée (12 mots en 6 groupes, ex. `AAAA-BBBB-CCCC-DDDD-EEEE-FFFF`).
- **Aucune session ouverte** : la restauration est interdite pendant qu'une base est déverrouillée.

> **Compatibilité** : les archives plus anciennes (format V2) restent lisibles. Pour une archive sans `recours.bin` à côté, la phrase saisie est utilisée directement comme mot de passe de l'archive.

## Étapes

### 1. Lancer EGTO

Démarrez l'application EGTO. Vous arrivez sur l'écran de bienvenue (premier démarrage) ou l'écran de connexion.

### 2. Ouvrir la restauration

Cliquez sur le lien **« Restaurer une sauvegarde existante »** (écran de premier démarrage) ou **« Restaurer une sauvegarde ? »** (écran de connexion).

### 3. Saisir la phrase de récupération

Dans l'écran « Restaurer une sauvegarde », saisissez votre **phrase de récupération** dans le champ prévu.

### 4. Sélectionner l'archive

Cliquez sur **« Sélectionner et restaurer »**. La fenêtre de sélection de fichier s'ouvre ; choisissez l'archive EGTO (`*.zip` ou `*.enc`). L'archive et son `recours.bin` doivent être ensemble.

> Si vous annulez la sélection, une erreur « Sélection annulée. » s'affiche. Aucune modification n'est faite.

### 5. Patienter

Une barre de progression indéterminée s'affiche pendant le traitement (déballage de la clé, déchiffrement, extraction et validation). Ne fermez pas l'application pendant cette phase.

### 6. Confirmation du succès

En cas de succès, l'écran « Restauration réussie » s'affiche. Cliquez sur **« Aller à la connexion »** (ou « Retour à la connexion »).

### 7. Se connecter

Sur l'écran de connexion, saisissez le **mot de passe applicatif** de l'archive restaurée pour déverrouiller votre base et accéder à vos données.

## En cas d'erreur

| Message | Cause / action |
|---|---|
| Phrase de récupération incorrecte. | Phrase erronée ou `recours.bin` absent/illisible. Vérifiez la phrase et la présence du `recours.bin`. |
| Le dossier de destination n'est pas vide. | Des données existent déjà. La restauration n'écrase pas une base existante. |
| Archive invalide : manifeste manquant. | Fichier non reconnu comme archive EGTO valide. |
| Mot de passe incorrect ou fichier corrompu. | Archive endommagée ou clé incohérente. |
