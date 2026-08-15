# Message final à transmettre à l’agent de code

Bonjour,

Après arbitrage avec le chef du département Commercial, voici les décisions métier définitives à intégrer dans CDA. Ces cinq points doivent être considérés comme validés pour la suite du développement.

## 1. Rabais des marchés publics : application ligne par ligne

Pour un marché public, le rabais global doit être appliqué à chaque article ou ligne de travaux, et non uniquement affiché au pied de la facture.

Exemple de référence :

```text
Montant brut du marché : 100 000 000 DA HT
Rabais contractuel : 5 %
Montant du rabais : 5 000 000 DA
Montant net attendu : 95 000 000 DA HT
```

Chaque ligne doit donc être calculée ainsi :

```text
montant_net_ligne = montant_brut_ligne - montant_rabais_ligne
montant_rabais_ligne = montant_brut_ligne × taux_rabais_marche
```

Le total HT doit être la somme des montants nets de toutes les lignes. Le résultat doit correspondre au montant net contractuel du marché.

### Instructions techniques

Le taux du marché doit être conservé au niveau du marché ou de l’affaire, puis appliqué et figé sur chaque ligne de document. Il faut distinguer :

```text
rabais_marche_bps
montant_rabais_marche_centimes
montant_ht_brut_centimes
montant_ht_net_centimes
```

Le champ de remise propre à une ligne ne doit pas être confondu avec le rabais contractuel du marché. Les calculs doivent être effectués en centimes avec une règle d’arrondi déterministe. Une éventuelle différence d’arrondi doit être traitée par une ligne d’ajustement explicitement tracée, jamais par une modification silencieuse d’une ligne.

## 2. Droit de timbre : supprimer le calcul automatique

Le droit de timbre ne doit plus être calculé automatiquement dans le moteur de facturation. La facture CDA doit calculer uniquement :

```text
total_ht
TVA
total_ttc
```

Le droit de timbre ne doit pas être ajouté au total TTC ni au net à payer de la facture. Le montant TTC doit rester le montant commercial et fiscal de la facture.

Le timbre sera vérifié et traité manuellement par le caissier ou le comptable au moment de l’encaissement, selon la réglementation en vigueur à la date du paiement et la nature exacte du document.

### Instructions techniques

Ne pas afficher automatiquement `timbre = 0 DA`, car cela pourrait signifier à tort que l’exonération a été calculée. Prévoir plutôt une gestion manuelle et traçable :

```text
timbre_statut : A_VERIFIER | TRAITE | NON_APPLICABLE
montant_timbre_saisi_centimes : nullable
timbre_traite_le : nullable
timbre_traite_par : nullable
reference_timbre_ou_quittance : nullable
commentaire_timbre : nullable
mode_reglement_prevu
mode_reglement_effectif
```

Le montant saisi manuellement ne doit jamais modifier `total_ht`, `TVA` ou `total_ttc`.

La clôture de caisse doit produire ou permettre de produire un état des encaissements nécessitant une vérification du timbre. Le statut `A_VERIFIER` doit être distingué de `NON_APPLICABLE` et de `TRAITE`.

Le module automatique de calcul du timbre peut être désactivé, isolé ou conservé temporairement pour l’historique, mais il ne doit plus être appelé par le calcul principal des factures. Ne pas supprimer immédiatement les anciennes colonnes sans migration et sans vérifier les données existantes.

## 3. Familles commerciales : nomenclature validée

Les familles initiales validées sont les suivantes :

```text
VTE → Vente
LOC → Location
REA → Réalisation
ST  → Sous-traitance
```

Les codes internes doivent être stables, uniques et utilisés pour les relations, filtres, rapports et traitements techniques. Les libellés sont uniquement destinés à l’affichage.

Utiliser une présentation uniforme au singulier avec première lettre majuscule : `Vente`, `Location`, `Réalisation`, `Sous-traitance`.

### Définitions métier

```text
Vente          : vente de produits ou marchandises.
Location       : location d’engins, de matériel ou d’équipements.
Réalisation    : travaux ou prestations exécutés directement par l’entreprise.
Sous-traitance : travaux ou prestations exécutés par une autre entreprise ou dans le cadre d’une activité sous-traitée.
```

Ne pas créer de doublons tels que `Vente` / `VENTES` ou `Location` / `LOCATIONS`. Si des variantes existent déjà, les rattacher aux codes canoniques lors d’une migration.

Une famille ne doit pas déterminer automatiquement la TVA, le droit de timbre, le rabais ou le prix. Ces règles doivent dépendre des paramètres fiscaux, du document et du mode de règlement, et non uniquement du nom de la famille.

## 4. NIS : stockage comme identifiant texte

Le NIS est le Numéro d’Identification Statistique de l’entreprise. Il doit être traité comme un identifiant administratif, et non comme un nombre ou une donnée calculable.

### Instructions techniques obligatoires

```text
Type : texte
Format : exactement 15 chiffres
Conversion numérique : interdite
Zéros initiaux : à conserver
```

Exemple :

```text
001234567890123
```

Ce NIS doit rester exactement identique après sauvegarde et réaffichage. Ne pas le convertir en entier, sinon les zéros initiaux peuvent disparaître.

Le NIS doit être stocké dans un champ séparé du NIF, du registre de commerce et de l’article d’imposition. Il doit être validé à la saisie, mais CDA ne doit pas tenter de le recalculer ou de le corriger automatiquement.

Pour les établissements secondaires, conserver également le NIS complet de 15 chiffres correspondant à l’établissement concerné.

## 5. TAP : supprimer cette idée du projet

La TAP ne doit pas faire partie du périmètre fonctionnel de CDA. Supprimer l’idée d’une TAP calculée ou ajoutée automatiquement dans les factures, devis, situations, décomptes ou règlements.

### Actions demandées

Retirer du projet :

```text
calcul TAP
ligne TAP dans les factures
paramètres TAP
champs TAP inutilisés
seeds TAP
handlers ou contrats IPC liés uniquement à la TAP
tests TAP
libellés TAP dans l’interface et la documentation
```

Ne pas remplacer automatiquement la TAP par la TLS dans cette étape. La TLS n’est pas la TAP et ne doit pas être ajoutée sans une décision métier et comptable séparée.

Si une future obligation fiscale doit être gérée, elle devra être introduite par un mécanisme fiscal séparé, versionné et validé par la comptabilité. Pour le périmètre actuel, CDA calcule seulement les éléments explicitement validés, notamment HT, TVA et TTC.

## Critères d’acceptation avant clôture

La mise en œuvre sera considérée comme correcte lorsque les conditions suivantes seront remplies :

1. Un marché de 100 000 000 DA HT avec 5 % de rabais produit des montants nets par ligne et un total HT de 95 000 000 DA.
2. Le timbre ne modifie jamais le total TTC et ne fait plus l’objet d’un calcul automatique dans la facture.
3. Un encaissement en espèces peut être marqué `A_VERIFIER`, `TRAITE` ou `NON_APPLICABLE`, avec traçabilité du montant saisi, de la date et du responsable.
4. Les familles utilisent les codes `VTE`, `LOC`, `REA` et `ST`, sans doublons de libellés.
5. Le NIS est conservé comme texte de 15 chiffres, y compris les zéros initiaux.
6. Aucune logique TAP ne reste dans le calcul, les seeds, les contrats IPC, l’interface ou les tests actifs.
7. Les tests de compilation, lint, build et tests métier sont mis à jour et passent après migration.

Merci de commencer par présenter les fichiers qui seront modifiés, la migration prévue et les tests à ajouter. Ne pas supprimer de données historiques sans migration explicite et sauvegarde préalable.

### Références métier et réglementaires

- [Code du timbre 2026 — DGI](https://www.mfdgi.gov.dz/files/803/2026/3724/CodedeTimbre2026fr)
- [NIS — Office national des statistiques](https://www.ons.dz/spip.php?rubrique294)
- [Circulaire DGI relative à la suppression de la TAP](https://www.mfdgi.gov.dz/fr/a-propos/actu-fr/circulaire-relative-a-la-suppression-de-la-taxe-sur-l-lactivite-professionnelle-tap)
