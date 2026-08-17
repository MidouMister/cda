# electron/securite/

Chiffrement en enveloppe, phrase de recuperation, session, egto-admin-reset — livre au jalon 2.

## Architecture des fichiers

| Fichier | Role | Frontiere |
|---|---|---|
| `chiffrement-enveloppe.ts` | Primitive crypto **pure** : DEK, KDF argon2id, enveloppes AES-256-GCM, phrase de recuperation, mesure du temps de derivation | Aucun import Electron ni `fs` — les donnees circulent en parametres/retours |
| `gestionnaire-enveloppes.ts` | Acces fichiers des blobs sous `userData/enveloppes/`, ecriture atomique, modes 0o600 | `fs` uniquement, pas d'Electron |
| `session.ts` | Controleur de session : premier demarrage, deverrouillage, verrouillage, changement de mot de passe, compteur d'inactivite | `fs` (via gestionnaire) + deps injectees (base) |
| `egto-admin-reset.ts` | Utilitaire d'administration reinitialisation mot de passe via phrase de recuperation | `fs` (via gestionnaire/session) + deps injectees |

Les blobs d'enveloppe vivent dans des **fichiers hors base** (`userData/enveloppes/utilisateur.bin`,
`userData/enveloppes/recours.bin`), conformement a `docs/matrice-tracabilite-champs.md` (§4.7.1,
§4.7.7 : **aucune table, aucune migration SQL**).

- `utilisateur.bin` : DEK enveloppee par la cle derivee du mot de passe (argon2id, sel distinct).
- `recours.bin` : la **meme DEK** enveloppee par la cle derivee de la phrase de recuperation.
- La DEK (32 octets aleatoires) n'est **jamais stockee en clair** ; un changement de mot de passe
  ne remballe que l'enveloppe utilisateur, la base SQLCipher n'est jamais rechiffree.

## Format de blob (versionne, V2)

Enveloppe AES-256-GCM : `magic + version + sel + IV + tag + donnees`.

| Champ | Taille | Valeur |
|---|---|---|
| Magic | 7 octets | ASCII `EGTOENV` |
| Version | 4 octets | u32 **big-endian** = 1 |
| Sel KDF | 16 octets | sel argon2id (stocke pour re-derivation) |
| IV | 12 octets | aleatoire par enveloppement |
| Tag GCM | 16 octets | authentification AES-GCM |
| Donnees | n octets | DEK chiffree (32 octets) |

Soit **87 octets** pour une DEK (header 55 octets + 32 octets de donnees).
Toute erreur de dechiffrement (mauvaise secret, blob corrompu, magic ou
version inconnue) leve un message **unique** — « Enveloppe invalide ou secret incorrect. » — qui ne
contient jamais le secret saisi et ne distingue pas les causes (anti-oracle).

`lireSelDepuisBlob(blob)` extrait le sel d'un blob (valide magic/version, retourne un Buffer de 16 octets).

## Phrase de recuperation

- **Format** : 6 groupes de 4 caracteres, separes par `-` (ex. `ABCD-EFGH-JKMN-PQRS-TUVW-2345`).
- **Alphabet** sans ambiguïte : `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 caracteres — **exclut** `0/O`,
  `1/I/l`, `L`). Entropie ≈ 2^119.
- **Normalisation a la validation** : insensible a la casse ; les separateurs (tirets, espaces,
  points, soulignes) sont ignores — seuls les 24 caracteres comptent. Coherente entre
  `genererPhraseRecuperation` et `validerPhraseRecuperation`.
- La phrase n'est **jamais** persistee en clair, jamais loggee, jamais passee en argument de processus.

## Session

- `premierDemarrage(dossierUserData, motDePasse, deps)` : genere DEK, phrase, 2 sels distincts,
  derive 2 cles, ecrit les 2 enveloppes. Retourne la phrase.
- `deverrouiller(dossierUserData, motDePasse, deps)` : lit enveloppe user → sel → derive → deballe
  → DEK → ouvre base → migrations + seeds.
- `verrouiller(etat, deps)` : purge DEK (fill(0)), ferme base, etat verrouille.
- `changerMotDePasse(ancien, nouveau)` : deballe user (ancien) → DEK → derive nouveau → remballe.
  DEK identique, base jamais rechiffee.
- `deballerDekParPhrase(dossierUserData, phrase)` : lit recours → sel → derive → deballe → DEK
  (pour reset et restauration).
- `CompteurInactivite(horloge, dureeMs, callback)` : compteur testable avec fausse horloge.
  `noterActivite()` reset, `arreter()` arrete.
- `deps` = `{ ouvrirBase, fermerBase, appliquerMigrations, insererSeeds }` — injectees, jamais
  importees directement de electron/ ou electron/db/.

## egto-admin-reset

Utilitaire CLI autonome (sans fenetre Electron) pour reinitialiser le mot de passe via la phrase
de recuperation. **Jamais regenere la DEK** — remballe uniquement l'enveloppe utilisateur.

- `executerReset(dossierUserData, phrase, nouveauMotDePasse)` : fonction testable.
- CLI : saisie interactive masquee de la phrase puis du mot de passe (2x verification egalite),
  messages francais, exit code 0/1.
- Script : `npm run admin-reset -- <dossier-user-data>`

## Parametres argon2id (OWASP imposes, non surchargables)

`{ type: argon2id, memoryCost: 65536 (64 MiB), timeCost: 3, parallelism: 4, hashLength: 32 }`
— utilises avec `raw: true` (KDF, pas un digest de verification). Sels **distincts et separes** :
sel du KDF utilisateur ≠ sel du KDF recours (16 octets chacuns, `randomBytes`).

## Temps de derivation mesure

`mesurerTempsDerivation(secret?, iterations = 3)` renvoie `{ dureeMs (moyenne), dureeMinMs, dureeMaxMs,
iterations, parametres }`.

- **Ordre de grandeur observe** (machine de dev, Node 26 / Windows, argon2 0.45.1) : **≈ 70 a 95 ms par
  derivation** en moyenne selon la charge (extremes observes : 72 a 127 ms). Sur les postes cibles
  Windows 10/11 x64 (8 Go RAM), attendre un ordre de grandeur identique, 60 a 130 ms selon le CPU et la
  bande passante memoire.
- **Seuil plancher** : `SEUIL_MIN_DUREE_DERIVATION_MS = 30` — une derivation sous ce seuil signale un
  affaiblissement des parametres (le test de timing le detecte).
- Le test de timing reste court (3 derivations, ≈ 0,25 s) et n'alourdit pas le reste de la suite.

## Limites documentees

- **Windows** : le mode `0o600` est une intention (permissions POSIX) ; sous NTFS la securite relève des
  ACL. L'ecriture atomique (fichier temporaire du meme dossier puis `rename`) reste effective partout.
- Nom de fichier des enveloppes garde simple (`[a-z0-9-]+.bin`, anti-traversée) ; les deux noms officiels
  sont `utilisateur.bin` et `recours.bin`.
