# Procédure de packaging — EGTO Gestion Commerciale (Windows / NSIS)

Procédure de build et de packaging de l'application EGTO pour Windows (installeur NSIS x64). À exécuter avant toute livraison à un poste client.

## 1. Prérequis

- Node.js (version LTS actuelle) et npm installés.
- Dépendances installées : `npm install` (déclenche aussi `postinstall` → `electron-builder install-app-deps` pour recompiler les modules natifs `better-sqlite3-multiple-ciphers` et `argon2`).
- Branche cible à jour (ex. `jalon-6-prep`).
- L'icône Windows doit exister : `assets/icon.ico` (voir § 3).

## 2. Build de l'application

Compile le code main, preload et renderer dans `out/` :

```powershell
npm run build
```

Résultat de `out/` :
- `main/index.js` — processus principal de l'application,
- `main/egto-admin-reset.js` — outil autonome de réinitialisation,
- `main/chunks/recuperation-*.js` — chunk partagé (déchiffrement/restauration),
- `preload/`, `renderer/`.

Le chunk partagé est dépaqueté de l'asar (`asarUnpack`) afin que `egto-admin-reset.js` puisse le requérir en app installée. Après toute modification de `electron/securite/`, relancer `npm run build` (le hash du chunk peut changer).

## 3. Génération de l'icône Windows

L'icône Windows est générée par script déterministe (aucun fichier source image au dépôt) — véritable fichier ICO multi-tailles :

```powershell
npm run icone:generer
```

Produit `assets/icon.ico` (aux alentours de 280 Ko), contenant les tailles **16, 32, 48 et 256 px** en 32 bits. En-tête ICO vérifiable : les 2 premiers octets `00 00` (réservé), `01 00` (type ICO), puis le nombre d'images (`04 00`). Vérification rapide :

```powershell
node -e "const b=require('fs').readFileSync('assets/icon.ico');console.log('taille',b.length,'octets, en-tete',b.subarray(0,6).toString('hex'),'images',b.readUInt16LE(4))"
```

## 4. Build de l'installeur NSIS

```powershell
npx electron-builder --win nsis
```

Ou via les scripts déjà définis dans `package.json` :

```powershell
npm run dist        # = build puis electron-builder --win
npm run electron:build   # = build puis electron-builder
```

Le ciblage NSIS x64, le `productName`, `shortcutName`, les options d'installation (`oneClick: false`, `allowToChangeInstallationDirectory: true`, raccourcis Bureau + Menu Démarrer) sont définis dans `electron-builder.yml`. `npmRebuild: false` est défini à la racine : les modules natifs (`better-sqlite3-multiple-ciphers`, `argon2`) sont déjà pré-compilés via le `postinstall` (`electron-builder install-app-deps`) pour la bonne ABI Electron, on évite donc une recompilation node-gyp au packaging. `win.icon: assets/icon.ico` embarqué dans l'installeur. Les ressources externes (schéma SQL, migrations, polices PDF, manuel utilisateur) sont embarquées via `extraResources`. Le chunk partagé `out/main/chunks/**/*` est dépaqueté de l'asar (`asarUnpack`) aux côtés de `out/main/egto-admin-reset.js` (AC-1).

## 5. Structure des sorties

Le répertoire `release/` (configuré dans `electron-builder.yml`) contient après le build :

- `EGTO - Gestion Commerciale Setup 0.1.0.exe` — installeur NSIS x64 autonome (à distribuer),
- `win-unpacked/` — l'application déballée sur disque (utilisable directement, né du build),
- `builder-effective-config.yaml` — configuration effective appliquée par electron-builder.

L'installeur porte l'icône `icon.ico` à la fois pour l'installeur, le fichier `.exe` de l'application et les raccourcis créés (§ 6).

## 6. Smoke test sur machine installée

Une fois l'installeur généré (`release/*.exe`), installer sur un poste Windows 10/11 x64 de référence :

1. **Installation** : lancer l'installeur — vérifier que le chemin d'installation est modifiable, que le raccourci Bureau et le raccourci Menu Démarrer (« EGTO Gestion Commerciale ») sont créés.
2. **Icône** : vérifier que l'icône bleue EGTO apparaît sur le .exe et les raccourcis (Bureau + Menu Démarrer). Une icône générique/blanche signale un échec d'embarquement.
3. **Démarrage** : lancer l'application via le raccourci Bureau — la fenêtre principale (connexion / premier démarrage) doit s'afficher sans erreur.
4. **SmartScreen** : en raison de l'absence de signature certifiée, Windows peut afficher « Windows a protégé votre PC » → passer via « Informations complémentaires » → « Exécuter quand même » (documenté dans le manuel utilisateur).
5. **Vérification AC-1 — outil de réinitialisation** : dans le dossier installé (par défaut `C:\Program Files\EGTO - Gestion Commerciale\resources\app.asar.unpacked\out\main\`), lancer l'utilitaire autonome dépaqueté et vérifier qu'il démarre correctement (il exige la phrase de récupération et ne réinitialise rien sans elle) :

   ```powershell
   & "C:\Program Files\EGTO - Gestion Commerciale\resources\app.asar.unpacked\out\main\egto-admin-reset.js"
   ```

   L'utilitaire doit s'exécuter sans erreur `MODULE_NOT_FOUND`. Ceci confirme que son chunk partagé `chunks/recuperation-*.js` est bien dépaqueté de l'asar (`asarUnpack`) et résout correctement. Une erreur de module signale un défaut de packaging à corriger avant livraison.

   *(Le chemin exact d'installation peut varier selon le répertoire choisi à l'installation.)*

## 7. Notes finales

- L'icône Windows (`assets/icon.ico`, PO-1) est désormais **embarquée** dans l'installeur et les raccourcis via `win.icon` dans `electron-builder.yml`.
- Le chunk partagé de `egto-admin-reset.js` (`out/main/chunks/**/*`) est dépaqueté de l'asar pour permettre son exécution en app installée (AC-1).
- Ne pas committer ni pousser les artefacts de build (`out/`, `release/`) — ils sont hors versionnage.