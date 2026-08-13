# T0 — Demande officielle : template Excel du rapport mensuel GITRA

**Jalon 0** — suivi de la dépendance bloquante (§5.3 du plan, PRD §16.1). Cette demande est la seule dépendance externe capable de bloquer la Phase 2 (développement de M4.9) ; elle n'a **aucun impact sur le périmètre MVP**.

## Statut de la demande

| Élément | Statut |
|---|---|
| Demande adressée | ✅ Adressée (09/08/2026) |
| Structure de départ (5 feuilles) | ✅ **Confirmée par le département commercial EGTO** (chef de département) |
| Validation comptable GITRA | ⏳ En attente — **non bloquant MVP**, point de contrôle à chaque revue de jalon (§5.3) |

La structure proposée ci-dessous est **confirmée telle quelle côté département commercial EGTO**. La validation du format comptable par la direction comptable GITRA reste la seule attente externe ; si elle revenait avec des modifications, elles seraient intégrées au gabarit M4.9 (Phase 2) sans impact sur le MVP.

## Contexte

EGTO (filiale GITRA) développe son application de gestion commerciale. Le module du rapport mensuel (M4.9) produira un export Excel destiné à GITRA/comptabilité. **Aucun template officiel n'existe à ce jour** : le rapport ne peut pas être développé avant sa validation.

## Objet de la demande

Transmettre à EGTO le **template Excel officiel du rapport mensuel de réalisation et de facturation** attendu par GITRA/comptabilité, avec sa structure exacte.

## Structure de départ proposée (à confirmer/corriger par GITRA)

5 feuilles minimum, sur la base de [prd-cda.md](../prd-cda.md) §4.4.9 :

1. **En-tête** — logo EGTO, titre, mois/année, date de génération.
2. **État de Réalisation Détaillé** — N° Affaire | Intitulé | N° Article | Unité | Qté | PU | Montant | Classification (Noir/Blanc/Autre).
3. **État de Réalisation et Facturation (Synthèse)** — N° Affaire | Intitulé | Travaux Noirs | Travaux Blancs | Autres | Total Réalisé | Total Facturé | Écart | TOTAL GÉNÉRAL HT | Taux de réalisation.
4. **Travaux en Cours (Écarts non facturés)** — liste des écarts par affaire, détail Noir/Blanc/Autre.
5. **Signatures** — Établi par (Département Commercial) / Validé par (Directeur Commercial) / Approuvé par (PDG).

## Points à préciser par le destinataire

- [x] Structure et nom exacts des feuilles — **validés par le département commercial EGTO** (structure de départ ci-dessus).
- [x] Colonnes obligatoires, formats (montants, %), formules — **validés par le département commercial EGTO**.
- [x] Libellés / codes métier imposés (classification, unités, codes affaires) — **validés par le département commercial EGTO**.
- [ ] **Responsable côté GITRA / comptabilité** pour valider le template — **en attente**.
- [ ] **Date limite de réponse** : souhaitée avant la fin du Jalon 5 (voir point de contrôle ci-dessous).

## Point de contrôle

- Statut du template reporté **en ouverture de chaque revue de jalon**.
- **Si non reçu à la fin du Jalon 5** : l'enchaînement de la Phase 2 commencera par M4.9 et non par les déclarations mensuelles (§5.3 du plan).

## Destinataires proposés

- Direction comptable GITRA (validation du format comptable).
- département commercial EGTO (validation des colonnes de réalisation).

---

*Document généré en J0, adressé le 09/08/2026. Structure confirmée par le département commercial EGTO ; validation comptable GITRA en attente — réponse consignée dans `ETAT_SESSION.md`.*
