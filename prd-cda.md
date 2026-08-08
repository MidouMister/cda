# PRD — Product Requirements Document (VERSION FINALE)

## Application Desktop de Gestion Commerciale
### E.G.T.O — Entreprise des Grands Travaux de l'Ouest
#### Oran, Algérie

**Version 2.1 FINALE — Août 2026**
*Document consolidé et autonome. Fusionne le PRD v1.1, la refonte v2.0 et les correctifs v2.1. Ce document seul suffit au développement — aucune référence externe n'est requise.*

**Conventions utilisées dans ce document :**
- 📌 = décision tranchée, non négociable
- 🆕 = ajout par rapport à la version initiale
- ⚠️ = point à valider avec un tiers (comptable, fiscaliste, GITRA) — voir Annexe §16

---

## 0. Historique et sommaire des changements

| Version | Contenu |
|---|---|
| v1.1 | Version initiale (8 modules M1–M8, stack Electron/React/TypeScript) |
| v2.0 | Refonte suite à audit : phasage 5 étapes, nouveaux modules, fiscalité, sécurité, glossaire, NFR, critères d'acceptation |
| v2.1 | Correction de 5 erreurs bloquantes + spécifications complémentaires (attachements, révision de prix, clé SQLCipher, barème timbre) |

**Modules de la version finale :**

| Module | Intitulé | Phase |
|---|---|---|
| M1 | Gestion des Affaires | 1 puis 2 |
| M2 | Clients & CRM | 1 |
| M3 | Catalogue Produits/Services | 1 |
| M4 | Facturation (FA, ST, AV, AC, FS, ND + Bons de Livraison intégrés en §4.4.11) | 1 puis 2 |
| M5 | Créances & Encaissements | 2 |
| M6 | Tableau de Bord & Reporting | 3 |
| M7 | Paramétrage & Administration | 1 |
| M8 | Sous-traitants / Achats | 3 |
| M9 | Devis / Proforma | 1 |
| M11 | Cautions & Garanties Bancaires | 2 |
| M12 | Échéancier des Retenues de Garantie | 2 |
| M13 | Import assisté | 1 |

> Note : il n'existe pas de module « M10 » — les Bons de Livraison sont intégrés au sein de M4 (§4.4.11). La numérotation des modules conserve ce saut volontairement.

---

## 1. Introduction & Contexte

**Client** : E.G.T.O (EPE/SPA), filiale de GITRA, capital 388 900 000 DA, ~256 agents.
**Secteur** : Travaux Publics — production d'enrobés à chaud, revêtements en béton bitumineux, travaux de VRD et génie civil.
**Localisation** : Zone Industrielle d'Arbal, Route Nationale n°4, Oran.
**Usage** : Poste unique (desktop Windows) au service commercial, authentification simple (1 login / 1 mot de passe), **strictement mono-utilisateur** (aucune évolution multi-utilisateur prévue).
**Volumétrie cible** : < 50 affaires/an, < 200 factures/an (voir §8 Exigences non fonctionnelles).
**Langue** : Français (interface + documents). **Monnaie** : Dinar Algérien (DA). **TVA** : 19 % (taux unique). **Format date** : JJ/MM/AAAA.

---

## 2. Objectifs

Centraliser et digitaliser l'ensemble de la gestion commerciale du département commercial d'EGTO :

- Gestion des affaires (marchés publics, contrats privés, bons de commande, avenants)
- Devis / proforma en amont des contrats privés
- Gestion des clients & CRM (contacts, historique d'interactions, scoring)
- Catalogue produits/services (4 familles d'activité)
- Facturation (FA, ST, AV, AC, FS, ND) + Bons de Livraison (activité Ventes)
- Registre des cautions & garanties bancaires
- Échéancier dédié des retenues de garantie
- Gestion des créances & encaissements
- Déclaration mensuelle des réalisations (saisie depuis papier direction)
- Génération automatique du rapport mensuel complet (PDF + Excel, format GITRA)
- Gestion des sous-traitants/achats avec marge commerciale simplifiée
- Tableaux de bord & reporting
- Import assisté (clients, produits, DQE)

---

## 3. Phasage du projet

> 📌 Décision EGTO : le phasage en 5 étapes est retenu tel quel.

| Phase | Contenu | Objectif |
|---|---|---|
| **0 — Cadrage** (préalable au dev) | Glossaire validé (§6), ERD + dictionnaire de données, wireframes des écrans principaux, **validation du template Excel GITRA** (aucun template existant à ce jour — dépendance bloquante), réponses aux hypothèses de l'Annexe (§16) | Verrouiller le socle avant de coder |
| **1 — MVP** | M7 Paramétrage/Sécurité/Sauvegarde, M2 Clients, M3 Catalogue, M9 Devis, M1 Affaires (sans déclarations mensuelles), M4 Facturation FA/AC/AV/BL + PDF, M13 Import initial | Être capable de facturer au plus tôt |
| **2 — Cœur BTP** | Déclarations mensuelles, ST (numérotées par marché), révision de prix, **Rapport mensuel PDF+Excel** (selon template validé en phase 0), M5 Créances & encaissements, M11 Cautions & Garanties, M12 Retenues de garantie | Couvrir le cycle marchés publics |
| **3 — Pilotage** | M8 Sous-traitance (marge simplifiée), M6 Dashboards, rapports standards, relances, correspondances MO, registre des consultations (pipeline AO) | Pilotage & recouvrement |
| **4 — Durcissement** | Rapports personnalisables, provisions, tests e2e, manuel utilisateur, procédure de restauration testée | Fiabilisation avant généralisation |

---

## 4. Modules Fonctionnels

---

### M1 — Gestion des Affaires

#### 4.1.1 Concept central : l'Affaire
Une affaire = un engagement commercial avec un client. Types :
- **Marché public** (procédure GITRA/DNC, DQE, situations de travaux, réception provisoire/définitive, décompte définitif)
- **Contrat privé** (devis, négociation, réception unique)
- **Bon de commande ponctuel**
- **Avenant** (modification d'une affaire existante)

#### 4.1.2 Cycle de vie
**Marché public** : Consultation → Attribution → Notification → ODS → Avance → Exécution → ST mensuelles → Réception provisoire (13 mois) → Réception définitive → Décompte définitif → Soldé

**Contrat privé** : Devis (M9) → Négociation → Signature → Avance → Exécution → Facturation → Réception (12 mois) → Soldé

#### 4.1.3 Champs communs (Fiche Affaire)
| Champ | Type | Règle |
|-------|------|-------|
| Référence | Auto | `AFG-YYYY-NNNNN` |
| Type | Liste | Marché public / Contrat privé / BC / Avenant |
| Affaire mère | Liaison | Si avenant |
| Client | Liaison | Module M2 |
| Objet | Texte | Descriptif |
| Montant initial HT | Nombre | Stocké en centimes (§10.3) |
| Taux TVA | Nombre | 19 % (taux unique EGTO, verrouillé) |
| Date signature | Date | |
| Date notification | Date | (public) |
| N° ODS | Texte | Ordre de Service de démarrage |
| Date ODS | Date | Déclenche le délai d'exécution |
| Date démarrage effectif | Date | |
| Délai exécution (jours) | Nombre | |
| Date fin contractuelle | Calculé | `Date ODS + Délai` |
| Date fin révisée | Date | Si avenant prolongation |
| Date fin réelle | Date | |
| Dépassement (jours) | Calculé | `Fin réelle − Fin contractuelle` |
| Motif dépassement | Liste | Force majeure / Avenant / Retard client / Retard appro / Autre |
| Rabais global | % | |
| Statut | Liste | **Signé / ODS reçu / En cours / Facturé / Soldé / Archivé / Résilié** — 📌 *« Prospect / Devis envoyé / Négociation » retirés : ces étapes pré-signature sont portées exclusivement par le Devis (M9) pour le contrat privé, et par le Registre des consultations (Phase 3) pour le marché public. Une Affaire n'est jamais créée avant d'être gagnée — cohérent avec §4.9.3.* |
| Responsable | Texte libre | 📌 Champ texte simple assumé (mono-utilisateur, pas de table Utilisateurs) |

#### 4.1.4 Champs spécifiques Marché Public
| Champ | Description |
|-------|-------------|
| N° marché | Attribué par le MO |
| Service contractant | Administration / EPE publique |
| Type procédure | AO ouvert / Restreint / Consultation / Gré à gré |
| Avance forfaitaire | Max 15 % |
| Avance approvisionnement | Complémentaire, cumul max 50 % |
| Caution restitution avance | Liaison → M11 Cautions & Garanties |
| Caution bonne exécution | Liaison → M11 Cautions & Garanties |
| Retenue de garantie | 5 %, **calculée sur le montant HT** (📌 tranché) |
| Délai garantie | 13 mois |
| Type de révision | Ferme / Révisable |
| Formule de révision (si révisable) | Coefficients paramétriques par poste de coût (salaires / matériaux / bitume / gasoil), indices de référence à la date ODS saisis manuellement — mécanique de calcul en §4.4.7bis |
| Pénalités de retard — taux | % par jour de retard, **paramétrable par affaire** selon le CCAP du marché (pas de taux unique imposé) |
| Pénalités de retard — base | Montant du marché (modifiable si le CCAP prévoit une autre base) |
| Pénalités de retard — plafond | % du montant du marché |
| Intérêts moratoires | Si retard paiement > 30 j — taux paramétrable en M7, génère une **ND proposée** (validation manuelle) |
| Réceptions | 📌 Table (voir §4.1.7bis) — permet réceptions par lot/tranche |
| Décompte provisoire | Date |
| Décompte définitif | Date |

#### 4.1.5 Champs spécifiques Contrat Privé
| Champ | Description |
|-------|-------------|
| N° contrat/devis | Lié au devis M9 si conversion |
| Type client | SARL / EURL / ETP / Particulier |
| Avance contractuelle | Libre (souvent 30-50 %) |
| Modalités paiement | Texte libre |
| Retenue garantie | **5 % sur base HT par défaut** (uniformisé avec le marché public) — surcharge possible par affaire si le contrat prévoit explicitement une autre base ou un autre taux 📌 |
| Délai garantie | 12 mois |
| Réceptions | Table (comme marché public, cardinalité 1 en pratique) |

#### 4.1.6 DQE / Postes de l'affaire
Table des postes attachée. Chaque ligne :
- N°, Désignation, Unité, Qté, PU HT, Montant HT, Famille (Vente/Location/Réalisation/Sous-traitance), Classification auto (Noir/Blanc/Autre)

**Règles** :
- Une affaire peut contenir des postes de plusieurs familles.
- **Import DQE** : voir M13 — un DQE peut contenir plusieurs centaines de lignes, saisie manuelle exclue.

#### 4.1.7 Suivi des délais & suspensions
Onglet dédié avec événements :

| Type événement | Date début | Date fin | Durée | Motif | Impact délai |
|---|---|---|---|---|---|
| ODS | | | | Démarrage | Délai commence |
| Suspension | | | | | Délai gelé |
| Reprise | | | | | |
| Avenant prorogation | | | | | +X jours |

Calcul auto : `Date fin révisée = Date ODS + Délai initial + Σ suspensions + Σ prorogations`

#### 4.1.7bis Réceptions
Table permettant une ou plusieurs réceptions par affaire (lots/tranches) :

| Champ | Type |
|-------|------|
| Lot / Tranche | Texte (optionnel, « Global » par défaut) |
| Type | Provisoire / Définitive |
| Date | Date |
| N° PV | Texte |
| Montant concerné | Nombre (optionnel, si réception partielle) |

En usage courant (1 seule réception), une ligne unique reproduit le comportement simple — la structure permet l'extension sans refonte.

#### 4.1.8 Déclaration Mensuelle des Réalisations
Chaque mois, création d'une déclaration globale regroupant toutes les affaires en cours.

| Champ | Type | Règle |
|-------|------|-------|
| Mois/Année | Liste | Ex : Janvier 2026 |
| Date saisie | Date | Auto |
| Statut | Liste | Brouillon / Validée / Clôturée |

**Tableau de saisie global** (écran unique) :

| N° Aff. | Intitulé | Poste DQE | Unité | Qté réalisée mois | PU HT | Montant HT | Classif. auto (figée à la saisie 📌) | Statut facturation | Motif (si non facturable) |
|---|---|---|---|---|---|---|---|---|---|

**Classification auto** (non modifiable, **figée en snapshot sur chaque ligne au moment de la saisie** 📌 — un changement ultérieur de sous-famille catalogue ne réécrit pas l'historique) :
- **NOIR** : VENTES (tous) + RÉALISATIONS enrobés/bitume (BB, GB, Cut Back, Émulsion, Fraisage, Mise en œuvre BB/GB)
- **BLANC** : RÉALISATIONS génie civil / terrassement / VRD (Béton armé, Bordure T2, Terrassement, Fondation, Électricité, Plomberie)
- **AUTRE** : LOCATIONS + SOUS-TRAITANCE (Location engin, Porte-engin, Personnel, Études)

**Règles métier** :
- Une seule déclaration par mois
- Saisie avant le 5 du mois N+1 : **avertissement, pas de blocage** (📌 cohérent avec le principe « alerter plutôt que bloquer » — voir Annexe §16 pour confirmation)
- Quantité cumulée auto (Σ mois précédents + mois en cours)
- % avancement auto (Cumulé / Qté DQE)
- **Validation explicite tracée** : confirmation obligatoire avant passage en statut « Validée », tracée dans le journal d'audit (contexte mono-utilisateur : pas de second valideur, mais trace horodatée)
- **Correction après validation** : jamais de modification rétroactive d'une déclaration validée — régularisation par ligne(s) négative(s) sur la déclaration du mois suivant

#### 4.1.9 Avenants
- Numérotation : `AVT-YYYY-NNNNN`
- Liaison vers affaire mère
- **Statut** : Brouillon / Validé (workflow explicite avant impact sur l'affaire mère)
- **Impact DQE détaillé** : Postes ajoutés (nouvelles lignes) / Postes modifiés (nouveau PU ou quantité) / Postes retirés
- Impact délai (jours ajoutés) et impact montant (delta HT), calculés depuis le détail ci-dessus

#### 4.1.10 Liaison facturation
- Une affaire → plusieurs factures
- Suivi % facturé / montant affaire
- Génération de ST/FA depuis les lignes « Facturables » de la déclaration mensuelle

#### 4.1.11 Correspondances
Onglet listant les courriers échangés avec le maître d'ouvrage :

| Champ | Type |
|-------|------|
| Date | Date |
| Type | Courrier sortant / entrant, Demande de prorogation, Réclamation, Mise en demeure, Autre |
| Objet | Texte |
| Référence | Texte |
| Pièce jointe | Fichier |

Utile en cas de contentieux (retards, résiliation).

#### 4.1.12 Résiliation
Si Statut = Résilié :

| Champ | Type |
|-------|------|
| Motif résiliation | Texte |
| Date résiliation | Date |
| Décompte de résiliation | Montant |
| Sort des cautions | À restituer / Retenue (liaison M11) |
| Sort de la retenue de garantie | À restituer / Retenue |

#### 4.1.13 Écrans
1. Liste des affaires (filtres, indicateurs délai)
2. Fiche affaire (onglets : Général / DQE / Attachements / Situations / Factures / Avenants / Cautions & Garanties / Réceptions / Déclarations mensuelles / Correspondances / Documents)
3. Déclaration mensuelle (saisie globale)
4. Registre des consultations (pipeline AO, Phase 3) — objet, MO, date limite dépôt, caution de soumission, résultat (converti en affaire / perdu / sans suite)

#### 4.1.13bis 🆕 Spécification des Attachements
Onglet « Attachements » de la fiche affaire :

| Champ | Type | Règle |
|-------|------|-------|
| N° attachement | Auto | `ATT-<N°affaire>-NNN`, numéroté par affaire |
| Date | Date | Date du métré contradictoire terrain |
| Poste(s) DQE concerné(s) | Multi-liaison | |
| Quantité constatée | Nombre | Par poste |
| Établi par | Texte libre | Représentant EGTO/MO ayant contresigné |
| Pièce jointe | Fichier | Scan du document signé — pièce contradictoire opposable en cas de litige |
| Statut | Liste | Brouillon / Signé / Reporté en déclaration |

**Cycle** : Attachement (terrain) → pré-remplissage de la Déclaration Mensuelle (§4.1.8) → ST (§4.4.7).

📌 **Décision retenue** : l'attachement reste une pièce justificative rattachée à l'affaire, sans impact financier direct — seule la Déclaration Mensuelle validée déclenche la facturation.

#### 4.1.14 Alertes (informatives, jamais bloquantes)
- Délai à 50 %, 80 %, J-15, dépassé
- Suspension à lever
- Prorogation nécessaire
- ST à établir (fin de mois)
- Réception provisoire à programmer
- Délai garantie expiré
- Caution proche expiration (J-30/J-15) — voir M11
- Retenue de garantie à réclamer — voir M12

---

### M2 — Clients & CRM

#### 4.2.1 Fiche Client
| Champ | Type | Obligatoire |
|-------|------|-------------|
| Code client | Auto `CLI-YYYY-NNNNN` | Oui |
| Type | EPE/SPA publique / SARL / EURL / ETP / ETBH / Particulier | Oui |
| Raison sociale / Nom | Texte | Oui |
| Sigle | Texte | Non |
| Catégorie | Client public / Client privé | Oui |
| Secteur | BTP / Énergie / Portuaire / Hydraulique / VRD / Autre | Non |
| Client GITRA / Groupe | Oui/Non | Oui |
| Nom du groupe / tutelle | Texte | Si Oui |
| Statut | Prospect / Actif / Inactif / **En vigilance** 📌 / Archivé | Oui |
| Responsable commercial | Texte | Non |
| 🆕 Contentieux déclaré | Oui/Non — coché manuellement par le service commercial, ou automatiquement dès qu'une relance atteint le niveau 4 (Contentieux, §4.5.5). Utilisé par le scoring (§4.2.4) | Non |

**Coordonnées** : Adresse, Wilaya, Commune, Tél fixe, Tél mobile, Fax, Email, Adresse chantier

**Informations juridiques** : NIF (15 chiffres ⚠️ à vérifier sur documents réels), NIS (11 chiffres ⚠️ à vérifier), RC, AI, RIB, Banque, Agence

**Conditions commerciales** : Mode règlement préféré, Délai paiement habituel (jours), Plafond crédit autorisé

#### 4.2.2 Contacts
Table liée au client (un client peut avoir plusieurs contacts) :

| Champ | Type |
|-------|------|
| Nom | Texte |
| Fonction | Texte |
| Téléphone | Texte |
| Email | Texte |
| Contact principal | Oui/Non |

#### 4.2.3 Historique des interactions
Journal chronologique léger, adapté au contexte mono-utilisateur :

| Champ | Type |
|-------|------|
| Date | Date |
| Type | Appel / Visite / Relance / Autre |
| Note | Texte libre |

#### 4.2.4 Scoring client (auto) — 📌 formules précisées
| Score | Critères (formules explicites) |
|-------|----------|
| 🟢 A — Excellent | Délai moyen paiement ≤ 30 j (12 derniers mois glissants) ET CA facturé TTC > 10 M/an ET ≥ 3 affaires signées/an |
| 🟡 B — Bon | Délai moyen ≤ 60 j ET CA 2-10 M ET 1-2 affaires/an |
| 🟠 C — À surveiller | Délai moyen > 60 j OU CA < 2 M OU ≥ 2 factures en retard sur les 12 derniers mois |
| 🔴 D — En vigilance | Délai moyen > 90 j OU créance impayée > échéance+90 j OU contentieux déclaré (§4.2.1) |

**Recalcul** : à chaque validation de facture, à chaque encaissement, et en tâche de fond mensuelle.

**Règles spéciales GITRA/Groupe** :
- Pas de plafond de crédit auto
- Score protégé (n'affiche pas D automatiquement)

**📌 Concept « client bloqué » retiré.** Un client en score D ou en dépassement de plafond de crédit n'est **jamais bloqué** : il apparaît en **liste de vigilance** (badge visuel sur sa fiche et sur le tableau de bord), à titre purement informatif. Aucune restriction sur la création d'affaires ou la facturation.

#### 4.2.5 Historique commercial (auto)
- Nombre d'affaires, Montant total affaires HT, Montant total facturé TTC, Montant total encaissé, Créance nette, Dernier CA annuel, Évolution CA, Délai moyen de paiement, Nombre de retards

#### 4.2.6 Règles métier
- Unicité NIF (sauf particuliers)
- Mise à jour auto du score à chaque facture/encaissement

#### 4.2.7 Écrans
1. Liste clients (filtres, score, groupe GITRA, liste de vigilance)
2. Fiche client (onglets : Général / Contacts / Historique interactions / Affaires / Factures / Encaissements / Créances / Documents)
3. Tableau de bord CRM (répartition, top clients, clients en vigilance)

---

### M3 — Catalogue Produits / Services

#### 4.3.1 Architecture (4 familles)
| Famille | Code | Description |
|---------|------|-------------|
| **VENTES** | `VTE` | Enrobés sous trémie, bitumes, granulats |
| **LOCATIONS** | `LOC` | Engins, porte-engin, terrain, équipements |
| **RÉALISATIONS** | `REA` | Fourniture + pose, mise en œuvre, préparation terrain, VRD |
| **SOUS-TRAITANCE (CA)** | `ST` | Personnel, études, prestations spécifiques |

#### 4.3.2 Fiche Produit
| Champ | Type |
|-------|------|
| Code produit | Texte (unique) |
| Libellé | Texte |
| Famille | Liste |
| Sous-famille | Liste |
| Unité | T / m² / m³ / Forfait / h / j / km / U / L |
| PU référence HT | Nombre |
| Taux TVA | 19 % — **champ non modifiable au niveau produit** 📌 (taux unique ; une évolution multi-taux nécessiterait une refonte de la ventilation HT, explicitement hors périmètre) |
| Type tarification | Fixe / Variable par client / Variable par affaire / Forfait |
| Actif | Oui/Non |

#### 4.3.3 Niveaux de tarification
1. **Tarif catalogue** (défaut)
2. **Tarif client** (prioritaire sur catalogue)
3. **Tarif affaire** (prioritaire sur client)

Historique des tarifs par période — écran de consultation dédié, règle explicite : le tarif applicable est celui dont la période englobe la date de la ligne facturée.

#### 4.3.4 Règles métier
- Pas de gestion de stock (production sur commande)
- Classification auto Noir/Blanc/Autre selon famille/sous-famille (figée en snapshot à la déclaration — voir §4.1.8)
- Code produit unique (détection doublons à l'import)
- **Prix de revient / marge produit : hors périmètre** (décision EGTO — pas de données de coût interne disponibles). Le calcul de marge par affaire reste simplifié (voir §4.8.7).

---

### M4 — Facturation

#### 4.4.1 Types de documents
| Type | Code | Usage |
|------|------|-------|
| Facture | `FA` | Contrat privé, vente ponctuelle, location, **Bon de Livraison converti** |
| Situation Travaux | `ST` | Marché public mensuel, **numérotée par marché** 📌 |
| Avoir | `AV` | Annulation totale ou **partielle** |
| Facture d'acompte | `AC` | Avance sur affaire |
| Facture de Solde | `FS` | Clôture affaire + levée retenue garantie |
| Note de débit | `ND` | Pénalités, intérêts moratoires |

#### 4.4.2 Numérotation
`FA-YYYY-NNNNN`, `ST-<N°affaire>-NNN` (📌 numérotation par marché, ex. `ST-AFG-2026-00012-003`), `AV-YYYY-NNNNN`, `AC-YYYY-NNNNN`, `FS-YYYY-NNNNN`, `ND-YYYY-NNNNN`

**📌 Règle fiscale** : le numéro est **attribué uniquement à la validation**, jamais au brouillon. Un brouillon supprimé ne consomme pas de numéro (trace conservée dans le journal d'audit, mais aucun trou dans la séquence des documents validés). Séquentiel par année (sauf ST par marché), verrouillé après validation.

#### 4.4.3 Cycle de vie
Brouillon → Validée → Imprimée → Envoyée → Payée → Archivée
(Annulation par avoir si déjà validée)

#### 4.4.4 En-tête facture
| Champ | Règle |
|-------|-------|
| N° facture | Auto, attribué à la validation |
| Date | Saisie |
| Date échéance | `Date facture + Délai paiement client` |
| Affaire | Liaison obligatoire (sauf BL Ventes ponctuel, §4.4.11) |
| Client | Auto (depuis affaire) si Affaire renseignée ; **sélection directe obligatoire sinon** (cas BL Ventes ponctuel sans affaire) |
| Adresse facturation | Siège ou chantier |
| NIF client | Auto |
| N° BC client | Texte libre |
| Rabais global | % |
| Remise par ligne | % (en plus du rabais global) |
| Retenue de garantie | % sur montant **HT** (selon affaire, 📌 tranché) |
| Remboursement avance | 📌 **Calculé automatiquement au prorata** de l'avance sur chaque ST (ajustable manuellement si besoin) |
| TVA | 19 % (taux unique) |
| 🆕 **Mode de règlement prévu** | Virement / Chèque / Espèces / Traite / LCN — saisi à la création, modifiable jusqu'à validation. Détermine l'assujettissement au droit de timbre (voir §7.1). Si le règlement effectif diffère (constaté à l'encaissement M5), traité par écart en ND — cas rare, à documenter au manuel utilisateur |
| Droit de timbre | Calculé automatiquement selon le barème en vigueur (§4.7.3) si Mode de règlement prévu ∈ {Espèces, Chèque, Traite} — **jamais si Virement ou LCN** (règlement dématérialisé, exonéré) ⚠️ *périmètre exact (chèque remis en main propre vs déposé en banque) à confirmer avec le comptable* |

#### 4.4.5 Lignes de facturation
- Code produit (charge libellé, unité, PU auto)
- Quantité, PU HT (modifiable), Montant HT
- Remise ligne (%)
- Famille et Classification auto héritées du produit

#### 4.4.6 Calcul pied de facture
```
Total HT lignes
− Remises lignes
− Rabais global
= Net commercial HT
− Remboursement avance (calcul automatique au prorata)
− Retenue de garantie (base HT)
= Total HT facture
+ TVA 19 %
= Total TTC
+ Droit de timbre (calculé selon barème §4.7.3 et mode de règlement prévu — voir §7.1)
= NET À PAYER
```
📌 Tous les montants sont stockés et calculés en **centimes (INTEGER)**, arrondi 2 décimales half-up appliqué ligne par ligne puis au total (voir §10.3).

#### 4.4.7 Spécificités ST (Situation Travaux)
- Générée depuis la déclaration mensuelle (postes « Facturables »)
- **Numérotée par marché** (ST n°1, n°2… de l'affaire concernée) 📌
- Contient : cumul antérieur / quantités du mois / cumul général / % réalisé
- Retenue garantie 5 % sur base HT, sur chaque ST
- Remboursement avance par retenues progressives automatiques
- **Correction d'une ST déjà validée** : jamais de modification rétroactive — régularisation (lignes négatives/positives) sur la ST du mois suivant

#### 4.4.7bis 🆕 Mécanique de calcul de la révision de prix
Applicable uniquement si Affaire.Type de révision = « Révisable ». Sur chaque ST, une ligne complémentaire automatique est ajoutée :

```
Montant de révision du mois = Montant HT du mois × (P / P0 − 1)
```

- **P0** = formule paramétrique (§4.1.4 : coefficients par poste — salaires / matériaux / bitume / gasoil) évaluée aux indices à la **date ODS**.
- **P** = même formule évaluée aux indices **du mois de la ST**, saisis manuellement en Paramétrage (indices BTPH non disponibles via API exploitable — saisie manuelle assumée, cohérent avec le contexte mono-poste).
- Si négatif, la ligne de révision est négative (répercutée sauf clause contraire du marché — à vérifier au cas par cas).
- Ligne distincte sur la ST (« Révision de prix du mois »), incluse dans la base HT de calcul de la retenue de garantie comme toute autre ligne.

**Exemple chiffré** (à reprendre tel quel dans le plan de recette, §11) :
Montant HT du mois = 5 000 000 DA. Coefficients marché : 15 % fixe + 40 % salaires + 30 % matériaux + 15 % bitume. Indices à date ODS (P0) : tous à 100 → P0 = 1. Indices du mois (P) : Salaires 108 / Matériaux 112 / Bitume 105 → P = 0,15 + 0,40×1,08 + 0,30×1,12 + 0,15×1,05 = 1,0755.
**Révision = 5 000 000 × (1,0755 − 1) = 377 500 DA.**

#### 4.4.8 Facture de Solde (FS) — 📌 formulation corrigée
Émise à la clôture définitive :
- Récapitulatif affaire (contractuel + avenants)
- Total déjà facturé
- Ajustements (plus/moins-values)
- **Levée de la retenue de garantie** : il s'agit d'une **récupération par EGTO auprès du client** (le montant retenu redevient exigible au profit d'EGTO), et non d'un remboursement au client
- **Caution de bonne exécution** : traitée par une **mainlevée bancaire** auprès de la banque émettrice (liaison M11), **jamais** une ligne de facture
- Solde net à payer par le client

#### 4.4.9 Rapport Mensuel Complet (Génération auto)
Bouton unique : **« Générer le Rapport de [Mois/Année] »**
Produit **2 fichiers simultanés** : PDF (signature) + Excel (comptabilité/GITRA)

⚠️ **Dépendance de cadrage (Phase 0)** : EGTO ne dispose pas encore du template Excel attendu par GITRA/comptabilité — à faire valider avant tout développement de ce module (risque de reprise sinon).

**Contenu (5 pages, structure de départ à confirmer en Phase 0)** :
1. **En-tête** (logo EGTO, titre, mois, date)
2. **État de Réalisation Détaillé** : N° Aff. | Intitulé | N° Article | Unité | Qté | PU | Montant | Classif.
3. **État de Réalisation et Facturation (Synthèse)** : N° Affaire | Intitulé | Travaux Noirs | Travaux Blancs | Autres | Total Réalisé | Total Facturé | Écart + TOTAL GÉNÉRAL HT + Taux de réalisation (Noirs %, Blancs %, Total %)
4. **Travaux en Cours (Écarts non facturés)** : Liste des écarts par affaire avec détail Noir/Blanc/Autre
5. **Signatures** : Établi par (Service Commercial) / Validé par (Directeur Commercial) / Approuvé par (PDG)

> Règle : le rapport ne peut être généré que si la Déclaration Mensuelle est au statut « Validée ».

#### 4.4.10 Liaison Déclaration Mensuelle → Facturation
- Sélection des lignes « Facturables » de la déclaration
- Génération ST (marché public) ou FA (contrat privé) en un clic
- Une ligne déclarée « Facturée » disparaît du pool « À facturer »

#### 4.4.11 Bons de Livraison (activité VENTES)
Décision EGTO : la facturation VENTES se fait **à chaque livraison** (pas de récapitulatif mensuel).

| Champ | Type |
|-------|------|
| N° BL | Auto `BL-YYYY-NNNNN` |
| Date livraison | Date |
| Affaire / Client | Liaison |
| Lignes produits | Code, désignation, unité, quantité livrée |
| Poids pesée (optionnel) | Nombre (référence pont-bascule) |
| Signature client | Case à cocher / pièce jointe scan |
| Statut | Émis / Facturé |

**Génération FA** : un ou plusieurs BL sélectionnés → génération directe d'une facture FA (les BL facturés passent au statut « Facturé » et sortent du pool « À facturer »).

#### 4.4.12 Avoirs partiels
Un avoir (AV) peut être émis sur :
- La totalité d'une facture (annulation complète)
- Une ou plusieurs lignes spécifiques
- Un montant partiel sur une ligne (quantité ou valeur)

Chaque avoir référence la facture d'origine et le motif.

#### 4.4.13 Duplicata
Toute réimpression d'une facture déjà imprimée porte la mention **« DUPLICATA »** en filigrane/en-tête, journalisée dans l'audit (date, nombre de réimpressions).

#### 4.4.14 Suivi Réalisation vs Facturation (par affaire)
Onglet dans fiche affaire :

| | Montant HT |
|---|---|
| Total Réalisé (cumulé) | |
| └─ Dont Noirs | |
| └─ Dont Blancs | |
| └─ Dont Autres | |
| Total Facturé (cumulé) | |
| Écart (À facturer) | |

#### 4.4.15 Écrans
1. Liste factures (filtres, statut, échéance, jours retard)
2. Fiche facture (en-tête / lignes / pied / **aperçu PDF avant impression** / historique)
3. Génération depuis déclaration mensuelle ou depuis BL
4. Aperçu rapport mensuel avant export

---

### M5 — Gestion des Créances & Encaissements

#### 4.5.1 Fiche Encaissement
| Champ | Type |
|-------|------|
| N° encaissement | Auto `ENC-YYYY-NNNNN` |
| Date | Date |
| Client | Liaison |
| Mode règlement | Virement / Chèque / Espèces / Traite / LCN |
| N° pièce | Texte (n° chèque, virement) |
| Banque émettrice | Liste |
| Date valeur | Date |
| Montant TTC | Nombre |
| Affectation | Libre / Sur facture(s) / Acompte |
| Facture(s) concernée(s) | Multi-liaison |
| Montant affecté | Nombre |
| Solde non affecté | Calculé — **reste disponible pour affectation ultérieure** sur toute facture future du même client |
| 🆕 Retenue à l'encaissement (pénalités MO, etc.) | Nombre, optionnel — montant formellement déduit par le maître d'ouvrage. Traité comme un règlement légitime du solde, **distinct d'un impayé** : la facture passe en « Soldée » si Montant affecté + Retenue = Montant TTC, sans apparaître en retard dans l'échéancier (§4.5.4) |
| Statut | 📌 **À affecter / Affecté / Impayé** (pas de rapprochement bancaire prévu dans le périmètre) |

#### 4.5.2 Affectation
- Répartition **FIFO** par défaut (plus ancienne facture d'abord)
- Répartition manuelle possible
- Scénarios : montant exact, partiel, excédent (acompte réutilisable), sans facture

#### 4.5.3 Chèques impayés / effets rejetés
Processus :
1. Encaissement passé en statut **« Impayé »**
2. Contre-passation automatique : la/les facture(s) affectées repassent en statut « Non réglée » dans l'échéancier
3. Possibilité de générer une ND pour pénalités de rejet

#### 4.5.4 Échéancier des créances
Tableau global filtrable :

| Client | N° Facture | Date | Échéance | Montant TTC | Encaissé | Solde | Jours retard | Âge |
|---|---|---|---|---|---|---|---|---|

**Classification âge** :
- 0-30 j 🟢 | 31-60 j 🟡 | 61-90 j 🟠 | > 90 j 🔴

#### 4.5.5 Relances & Recouvrement
| Niveau | Délai | Action |
|--------|-------|--------|
| 1 — Rappel amical | J+5 | Appel téléphonique |
| 2 — Relance écrite | J+15 | Email + lettre |
| 3 — Mise en demeure | J+30 | LRAR |
| 4 — Contentieux | J+60 | Direction + avocat |

Fiche de relance : Date, Type, Interlocuteur, Résultat, Date promesse, Montant promis.
→ Une relance de niveau 4 coche automatiquement « Contentieux déclaré » sur la fiche client (§4.2.1).

#### 4.5.6 Provisions (selon procédure GITRA)
| Situation | Provision |
|-----------|-----------|
| Créance > 90 j sans relance | 20 % |
| Créance > 180 j | 50 % |
| Contentieux en cours | 80 % |
| Jugement défavorable | 100 % |

> Décision manuelle (validation direction), le système alerte seulement.

#### 4.5.7 Dépassement de plafond de crédit
📌 **Alerte visuelle uniquement**, jamais de blocage (cohérent avec §4.2.4).

#### 4.5.8 Écrans
1. Échéancier créances (global, groupage par client, export)
2. Fiche encaissement (saisie + affectation)
3. Tableau de bord recouvrement (créances, DMP, taux recouvrement, prévisions)

---

### M6 — Tableau de Bord & Reporting

#### 4.6.1 Tableaux de bord par thème

**A) Commercial — CA & Activité**
- CA du mois, CA cumulé année, CA par famille (Noir/Blanc/Autre)
- Nombre affaires actives, **Panier moyen** = CA cumulé / nombre d'affaires facturées
- **Taux de transformation** — 📌 calculé au niveau pré-affaire (Devis + Consultations), jamais au niveau Affaire :

```
Taux de transformation =
    (Devis Acceptés + Consultations converties en affaire)
  ÷ (Devis Acceptés + Devis Refusés + Devis Expirés
     + Consultations converties en affaire + Consultations perdues + Consultations sans suite)
  sur la période
```
> Cohérent en Phase 1 (Devis seul disponible, taux calculé sur le seul volet contrat privé) et complet à partir de la Phase 3 (Registre des consultations disponible, les deux volets se combinent).

- Évolution vs N-1 (📌 généralisé à tous les KPI de cette section)
- Graphiques : courbe CA mensuel, répartition par famille, top 10 clients

**B) Créances & Recouvrement**
- Créances totales, Créances en retard, **DMP** (Délai Moyen de Paiement) = moyenne pondérée (montant × jours réels de règlement) sur les factures soldées de la période, **Taux de recouvrement** = montant encaissé / montant facturé sur la période
- Créances > 90 j, Encaissements du mois
- Graphiques : pyramide des âges, top débiteurs, prévisions encaissement

**C) Affaires & Déclarations**
- Affaires par statut, Montant affaires en cours
- Taux avancement facturation, Affaires en retard
- Affaires sans déclaration mensuelle
- Situations de travaux à établir

**D) Sous-traitance & Marge commerciale** 📌 (voir §4.8.7)
- Montant total sous-traité par mois
- Top sous-traitants
- Affaires avec sous-traitance > seuil d'alerte (alerte visuelle uniquement)
- Marge commerciale par affaire (CA − Coût sous-traitance, hors coûts internes)

#### 4.6.2 Rapports standards (prêts à imprimer)
- État des créances (mensuel)
- Relevé de compte client
- Journal des ventes
- Balance clients
- CA par produit
- État des provisions
- État mensuel de TVA collectée (voir §7.1)

#### 4.6.3 Rapports personnalisables (Phase 4)
Constructeur : période, filtres (client, famille, type affaire, wilaya), colonnes, regroupements, tris. Export PDF / Excel / CSV.

#### 4.6.4 Export des tableaux de bord
Chaque tableau de bord est exportable en PDF/PNG pour partage ou archivage.

---

### M7 — Paramétrage & Administration (Single User)

#### 4.7.1 Sécurité
- **Un seul compte** : Nom d'utilisateur + Mot de passe
- **Hachage** : argon2id (ou bcrypt à défaut), aucun stockage en clair
- Déconnexion auto après 30 min d'inactivité
- **Procédure de récupération de mot de passe** : utilitaire d'administration séparé (`egto-admin-reset`), livré hors application — **fonctionne avec la phrase de récupération, voir §9.1** (📌 procédure révisée : l'utilitaire ne réinitialise rien sans la phrase de récupération ; un accès physique seul au poste ne suffit pas à contourner le chiffrement)
- Pas de gestion multi-utilisateurs, pas de rôles, pas de journal de connexion

#### 4.7.2 Premier démarrage (assistant)
Au tout premier lancement : création du mot de passe, **génération et affichage unique de la phrase de récupération** (§9.1 — à imprimer et conserver par la direction, hors du poste), saisie des paramètres entreprise, proposition d'import initial (M13).

#### 4.7.3 Paramètres entreprise
Dénomination, forme juridique, capital, RC, NIF, NIS, AI, adresse, téléphone, fax, email, logo, mention légale pied de page, taux des intérêts moratoires.

**🆕 Barème du droit de timbre** *(valeurs de départ ci-dessous, issues du barème 2025/2026 en vigueur au moment de la rédaction — table éditable en Paramétrage, jamais figée en dur dans le code — 📌 à valider une dernière fois avec l'expert-comptable EGTO avant mise en production)* :

| Tranche (montant TTC) | Taux |
|---|---|
| ≤ 300 DA | Exonéré |
| 300 DA – 30 000 DA | 1 % |
| 30 000 DA – 100 000 DA | 1,5 % |
| > 100 000 DA | 2 % |
| Plancher | 5 DA |
| Plafond | 10 000 DA |

#### 4.7.4 Exercices & Périodes
- Exercice en cours (début/fin)
- Exercices clôturés (lecture seule)
- Période comptable active

#### 4.7.5 Numérotation
Paramétrage des formats et compteurs : AFG, AVT, DEV, BL, FA, ST (par marché), FS, AV, AC, ND, CLI, ENC, BCST, DCS, PAY-SST.

#### 4.7.6 Alertes paramétrables
Activation/désactivation, délai, canal (in-app uniquement, pas d'email). Toutes les alertes sont **informatives**, aucune n'est bloquante.

#### 4.7.7 Sauvegardes — 📌 politique détaillée
- **Automatique quotidienne** vers une **destination externe au poste** (dossier réseau ou disque externe configurable — une sauvegarde sur le même disque que la base n'est pas suffisante)
- **Rétention** : 30 sauvegardes quotidiennes + 12 mensuelles
- **Manuelle** (bouton « Exporter la base ») avec **chiffrement de l'export ZIP** par mot de passe distinct du login applicatif, conservé par la direction au même titre que la phrase de récupération (ou dérivé de celle-ci — à trancher en Phase 0)
- **Contenu de chaque export** (auto ou manuel) : fichier SQLite chiffré + dossier pièces jointes + **blob d'enveloppe de recours** (§9.1 — jamais l'enveloppe utilisateur ni la DEK en clair)
- **Archivage légal** : au moins une sauvegarde annuelle conservée 10 ans (conservation légale des documents commerciaux)
- **Test de restauration** documenté et recommandé trimestriellement (voir §12), incluant explicitement la **vérification de la restauration via la phrase de récupération** 🆕
- **Alerte si échec** de la sauvegarde automatique

#### 4.7.8 Journal d'audit
Trace des actions critiques (création/modification/suppression des affaires, clients, factures, encaissements, devis, BL, cautions). Lecture seule. **Rétention illimitée** compte tenu du faible volume (< 200 factures/an) — export annuel possible pour archivage. Implémentation par triggers SQLite (§5.5.9).

#### 4.7.9 🆕 Journal applicatif (technique)
*Distinct du Journal d'audit métier (§4.7.8, qui trace les actions CRUD utilisateur).*

Couvre les événements techniques : démarrages/arrêts, erreurs non gérées, échecs de sauvegarde automatique, échecs de migration.

- Fichier rotatif (5 fichiers de 5 Mo), stocké dans `app.getPath('userData')/logs/`
- Consultable en lecture seule depuis Paramétrage, avec bouton « Exporter les logs » — indispensable pour le support à distance d'une application mono-poste
- Niveau configurable (Erreur / Avertissement / Info), Erreur par défaut

---

### M8 — Gestion des Sous-traitants / Achats (Coûts)

#### 4.8.1 Concept
Gestion des sous-traitants externes engagés pour exécuter des postes d'un marché principal. Permet de calculer une **marge commerciale simplifiée** par affaire.

#### 4.8.2 Fiche Sous-traitant
| Champ | Type |
|-------|------|
| Code | Auto `SST-YYYY-NNNN` |
| Raison sociale | Texte |
| Type | SARL / EURL / ETP / ETBH / Particulier |
| Spécialité | Électricité / Plomberie / Génie civil / Terrassement / Signalisation / Autre |
| NIF, RC, NIS | Texte |
| Adresse, Wilaya, Téléphone, Email | |
| Contact principal | Texte |
| RIB, Banque | |
| Plafond d'engagement | Nombre |
| Statut | Actif / Inactif |

> 📌 Le suivi des attestations CNAS/CASNOS/régularité fiscale des sous-traitants **n'est pas retenu** (décision EGTO).

#### 4.8.3 Bon de Commande Sous-traitance (BCST)
Rattaché obligatoirement à une **Affaire principale**.

| Champ | Type |
|-------|------|
| N° BCST | Auto `BCST-YYYY-NNNNN` |
| Date | Date |
| Affaire principale | Liaison |
| Sous-traitant | Liaison |
| Objet | Texte |
| Poste(s) DQE concerné(s) | Multi-liaison |
| Montant initial HT | Nombre |
| Taux TVA | 19 % |
| Taux avance | % |
| Retenue de garantie | % (souvent 5 %) |
| Délai exécution | Nombre (jours) |
| Date début / Date fin prévue | |
| Statut | En cours / En attente / Terminé / Clôturé |

**Lignes BCST** : Désignation, Unité, Qté, PU HT, Montant HT, Poste DQE affaire mère.

#### 4.8.4 Décomptes Sous-traitant
| Champ | Description |
|-------|-------------|
| N° décompte | `DCS-YYYY-NNNNN` |
| BCST | Liaison |
| Date / Période | |
| Montant HT réalisé | Travaux exécutés par le sous-traitant |
| Retenue de garantie | Calculé (Montant × %) |
| Avance remboursée | Si remboursement par retenues |
| Montant net HT | Réalisé − Retenue − Remb. avance |
| TVA / Montant TTC | Calculés |
| Statut | Proposé / Validé par EGTO / Payé |

#### 4.8.5 Facture Sous-traitant
Saisie des factures reçues des sous-traitants : N° facture, Date, Sous-traitant, BCST, Décompte(s), Montant HT, TVA, TTC, Date échéance, Statut.

#### 4.8.6 Paiement Sous-traitant
| Champ | Description |
|-------|-------------|
| N° paiement | `PAY-SST-YYYY-NNNNN` |
| Date, Sous-traitant, Facture | |
| Mode | Virement / Chèque |
| Montant TTC | |
| Retenue de garantie (mainlevée) | Déclenchée à la **réception définitive de l'affaire mère**, sauf mention contraire au BCST |
| Statut | Programmé / Effectué |

#### 4.8.7 Marge commerciale par affaire (Vue synthétique) — 📌 nommage honnête
```
A. CHIFFRE D'AFFAIRES (facturé au client)
B. COÛT DE SOUS-TRAITANCE (payé aux sous-traitants)
   └─ Détail par BCST
C. MARGE COMMERCIALE (A − B) — hors coûts internes de production
D. TAUX DE MARGE COMMERCIALE (C / A × 100)
E. SOUS-TRAITANCE / CA (B / A × 100)
```
⚠️ Cet indicateur **n'intègre pas** les coûts internes (enrobés produits en centrale EGTO, main-d'œuvre propre, engins propres) — décision EGTO de rester sur cette vue simplifiée, faute de données de coût de revient disponibles.

**Seuil d'alerte paramétrable** : si % sous-traitance > seuil (ex : 30 %), **alerte visuelle uniquement** sur l'affaire et le tableau de bord.

#### 4.8.8 Écrans
1. Liste sous-traitants (filtres, solde dû, affaires en cours)
2. Fiche sous-traitant (Infos / BCST / Décomptes / Factures / Paiements / Marge)
3. Fiche BCST (en-tête + lignes + suivi + bouton « Nouveau décompte »)
4. Tableau de bord sous-traitance (montant sous-traité, top sous-traitants, alertes seuil, factures en attente, retenues à libérer)

---

### M9 — Devis / Proforma

#### 4.9.1 Concept
Couvre l'étape « Devis » du cycle contrat privé (§4.1.2).

#### 4.9.2 Fiche Devis
| Champ | Type |
|-------|------|
| N° devis | Auto `DEV-YYYY-NNNNN` |
| Client / Prospect | Liaison |
| Date | Date |
| Validité (date limite offre) | Date |
| Lignes | Code produit, désignation, quantité, PU HT, montant HT |
| Rabais global | % |
| Statut | Brouillon / Envoyé / Accepté / Refusé / Expiré |

#### 4.9.3 Conversion en affaire
Bouton **« Convertir en affaire »** : crée automatiquement un Contrat privé (M1) avec les lignes du devis reprises dans le DQE, statut initial « Signé ». Le devis passe en statut « Accepté » et reste lié à l'affaire créée (traçabilité).

#### 4.9.4 Écrans
1. Liste devis (filtres, statut, échéance de validité)
2. Fiche devis (lignes / aperçu PDF / conversion)

---

### M11 — Cautions & Garanties Bancaires

#### 4.11.1 Concept
Registre de suivi des cautions liées aux affaires.

#### 4.11.2 Fiche Caution
| Champ | Type |
|-------|------|
| N° caution | Auto |
| Type | Caution de soumission / Restitution d'avance / Bonne exécution |
| Affaire liée | Liaison **obligatoire pour Restitution d'avance et Bonne exécution**. Pour Caution de soumission : **texte libre** (référence de la consultation/AO) en Phase 2 ; lien basculé automatiquement vers le Registre des consultations dès la Phase 3 📌 |
| Banque émettrice | Liste |
| Montant | Nombre |
| Date d'émission | Date |
| Date d'expiration | Date |
| Statut | Active / Expirée / Mainlevée obtenue |
| Date mainlevée | Date (si obtenue) |

#### 4.11.3 Alertes
Échéance à J-30 et J-15 avant expiration (informatives).

#### 4.11.4 Écrans
1. Registre des cautions (filtres : affaire, banque, statut, échéance proche)
2. Onglet « Cautions & Garanties » dans la fiche affaire

---

### M12 — Échéancier des Retenues de Garantie

#### 4.12.1 Concept
Les retenues de garantie sont des créances sur le client, distinctes de l'échéancier des factures (M5). Échéancier dédié.

#### 4.12.2 Vue par affaire — 📌 formule corrigée
| Champ | Description |
|-------|-------------|
| Montant retenu cumulé | Calculé automatiquement (Σ retenues sur ST/factures de l'affaire) |
| Date réception provisoire (réelle ou prévue) | Reprise depuis la table Réceptions (§4.1.7bis) ; si aucune réception provisoire saisie, calculée à titre indicatif = Date fin contractuelle |
| **Date de libération prévue** | = **Date réception provisoire** + délai de garantie contractuel *(= date de réception définitive prévue — cohérent avec le glossaire §6 : le délai de garantie s'écoule entre les deux réceptions, il ne s'ajoute pas après la seconde)* |
| Date de réception définitive (réelle) | Reprise automatiquement dès qu'une ligne Type = « Définitive » existe dans la table Réceptions |
| Statut | En cours / Mainlevée demandée / Libérée |

📌 Si l'affaire comporte plusieurs réceptions par lot/tranche (§4.1.7bis), l'échéancier de retenue affiche une ligne par lot, chacune avec sa propre date de libération.

#### 4.12.3 Alertes
« Retenue à réclamer » à la date de libération prévue (informative).

#### 4.12.4 Écrans
1. Échéancier global des retenues (toutes affaires, filtrable)
2. Onglet dans la fiche affaire

---

### M13 — Import

#### 4.13.1 Objectif
Spécifier l'import initial (clients, produits, DQE) mentionné dans les livrables.

#### 4.13.2 Import Clients / Produits
Assistant en 3 étapes :
1. **Mapping des colonnes** (fichier Excel → champs de la fiche client/produit)
2. **Prévisualisation** avec détection des doublons (NIF pour les clients, code produit pour le catalogue)
3. **Rapport d'anomalies** téléchargeable + import des lignes valides uniquement (les lignes en erreur sont exclues et listées, pas de blocage global — rollback uniquement en cas d'échec technique en cours d'import)

#### 4.13.3 Import DQE
Un DQE de marché peut contenir plusieurs centaines de postes — la saisie manuelle est exclue. Même principe d'assistant (mapping N°/Désignation/Unité/Qté/PU HT), rattaché à une affaire existante.

#### 4.13.4 Écrans
1. Assistant d'import (3 étapes ci-dessus), accessible depuis M2, M3 et la fiche affaire (DQE)

---

## 5. Spécifications Techniques Générales

### 5.1 Interface Utilisateur (UI)
- Design professionnel, sobre, adapté au BTP
- Navigation par menu latéral (Modules)
- Tableaux avec tri, filtre, pagination
- Formulaires avec validation en temps réel
- Indicateurs visuels : couleurs statut, alertes, badges — **jamais de blocage d'action, uniquement des alertes visuelles** 📌 (principe transversal)
- Langue française exclusive à l'interface

### 5.2 Impressions & Exports
- Factures / ST / Avoirs / Devis / BL : PDF A4 avec en-tête EGTO (logo, coordonnées, NIF/RC/AI)
- **Aperçu avant impression** systématique + impression directe possible depuis l'aperçu
- Rapport mensuel : PDF (signature) + Excel (comptabilité/GITRA, format à valider en Phase 0)
- Rapports : PDF / Excel / CSV
- **Mentions légales obligatoires** (liste exhaustive) : dénomination, forme juridique, capital, RC, NIF, NIS, AI, adresse, mode de règlement, **mention du droit de timbre si assujetti**, taux de TVA (19 %)
- **Duplicata** : mention « DUPLICATA » à toute réimpression d'un document déjà imprimé

### 5.3 Règles de gestion transversales
- **Pas de suppression physique** : suppression logique uniquement (statut « Supprimé »)
- **Numérotation attribuée à la validation**, jamais au brouillon (📌 règle fiscale — voir §7.1)
- **Numérotation verrouillée** : impossible de modifier un numéro attribué
- **Exercice clôturé = figé** : aucune modification
- **Audit obligatoire** : trace non modifiable des actions critiques, implémentée par **triggers SQLite** (📌 non contournables, préférés aux appels explicites)
- **Alerter plutôt que bloquer** : principe transversal (client en vigilance, plafond dépassé, saisie tardive de la déclaration) — sauf verrous strictement fiscaux (numérotation, exercice clôturé)
- **Données temps réel** : tableaux de bord basés sur données validées

### 5.4 Sauvegarde & Restauration
Voir détail en §4.7.7 et §9.1.

### 5.5 Stack Technique & Build

#### 5.5.1 Stack Applicative

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| **Runtime Desktop** | Electron | 📌 Dernière stable au démarrage du projet | Conteneur d'application native Windows |
| **Framework UI** | React | 📌 Dernière stable | Rendu déclaratif de l'interface |
| **Langage** | TypeScript | 📌 Dernière stable | Typage fort (main + renderer) |
| **Styling** | Tailwind CSS | 📌 Dernière stable | Design system sobre, adapté au BTP |
| **Composants UI** | shadcn/ui | Dernière | Primitives uniquement (Dialog, Form, Tabs, Calendar, Select) — 📌 plus de tableaux via shadcn (voir §5.5.4bis) |
| **Tableaux (listes)** | TanStack Table | Dernière | Toutes les listes métier (Affaires, Clients, Factures…) — 📌 rationalisé |
| **Grille de saisie de masse** | AG Grid Community | Dernière | **Réservé exclusivement** à la saisie DQE et à la déclaration mensuelle — 📌 rationalisé |
| **Base de données** | better-sqlite3 **+ SQLCipher** | Dernière | Moteur SQLite synchrone **chiffré**, exécuté dans le Main process via IPC |
| **Génération PDF** | pdfmake | Dernière | Factures, devis, BL, rapports, documents de signature |
| **Génération Excel** | exceljs | Dernière | Export des rapports mensuels, états, balance clients |
| **Graphiques** | Recharts | Dernière | Visualisations tableaux de bord |
| **Routing** | React Router (DOM) | Dernière | Navigation SPA |
| **State Management** | Zustand | Dernière | Session, sélection, filtres globaux |
| **Build & Package** | electron-builder | Dernière | Packaging NSIS `.exe` Windows |
| **Bundler** | Vite | Dernière | Build renderer/main/preload |
| **Gestion dates** | date-fns | Dernière | Format JJ/MM/AAAA |
| **Validation formulaires** | Zod | Dernière | Schémas type-safe |
| **Requêtes async** | TanStack Query | Dernière | Cache et état de chargement des appels IPC |
| **Tests unitaires** | Vitest | Dernière | Calculs (pied de facture, retenues, scoring, délais, révision de prix, pénalités, droit de timbre) |
| **Tests e2e** | Playwright | Dernière | Parcours critiques (affaire → déclaration → ST → encaissement ; devis → affaire → facture) |

> 📌 **Politique de versions** : pas de versions figées — utiliser les dernières versions stables au démarrage effectif du projet, avec une revue trimestrielle des dépendances.

#### 5.5.2 Architecture Processus Electron

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSUS MAIN (Node.js)                 │
│  ┌──────────────────┐ ┌─────────────┐ ┌────────────────────┐│
│  │ better-sqlite3    │ │  pdfmake    │ │  electron-builder  ││
│  │ + SQLCipher (chif.)│ │  (factures) │ │  (packaging .exe)  ││
│  └──────────────────┘ └─────────────┘ └────────────────────┘│
│  ┌─────────────┐  ┌─────────────┐                           │
│  │   exceljs   │  │  fs / path  │                           │
│  │  (rapports) │  │  (fichiers) │                           │
│  └─────────────┘  └─────────────┘                           │
│         ↑ IPC typé par domaine (contextBridge)               │
├─────────────────────────┬───────────────────────────────────┤
│                    PRELOAD SCRIPT                            │
│  Exposition sécurisée : window.electronAPI                   │
│  📌 Commandes typées par domaine (PAS de canal SQL générique)│
│  • affaires.create(data) / affaires.update(id, data)         │
│  • factures.validate(id) / factures.generateFromDeclaration  │
│  • clients.updateScore(id) / devis.convertToAffaire(id)      │
│  • pdf.generate(definition, path) / excel.generate(wb, path) │
│  • fs.saveDialog / openDialog / app.getPath('userData')      │
├─────────────────────────┬───────────────────────────────────┤
│              PROCESSUS RENDERER (Chromium + React)           │
│  React • Tailwind • shadcn/ui (primitives)                   │
│  React Router • Zustand • TanStack Query                     │
│  Recharts • AG Grid (saisie masse uniquement) • TanStack Table│
└─────────────────────────────────────────────────────────────┘
```

**Règles d'architecture :**
- **Zero Node.js dans le renderer** : tout accès système (DB, fichiers, impression) passe par le `preload` exposé via `contextBridge`.
- **SQLite synchrone chiffré côté Main** : `better-sqlite3` + SQLCipher, mode WAL.
- **`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`**, et une **CSP restrictive** (`default-src 'self'`).
- **IPC typé par domaine** (`affaires.create`, `factures.validate`…) — **aucun canal SQL générique** exposé au renderer : toute requête est une fonction préparée côté Main.
- **Pas de serveur HTTP interne** : communication exclusivement par IPC Electron.

#### 5.5.3 Structure du Projet

```
egto-gestion-commerciale/
├── electron/
│   ├── main.ts                 # Point d'entrée Electron (BrowserWindow, IPC handlers)
│   ├── preload.ts              # Script de préchargement (contextBridge API)
│   ├── ipc/
│   │   ├── affaires.handlers.ts# Handlers IPC par domaine métier
│   │   ├── clients.handlers.ts
│   │   ├── factures.handlers.ts
│   │   ├── pdf.handlers.ts     # Handlers IPC pour pdfmake
│   │   ├── excel.handlers.ts   # Handlers IPC pour exceljs
│   │   └── fs.handlers.ts      # Handlers IPC pour dialogues fichiers
│   └── db/
│       ├── connection.ts       # Instance better-sqlite3 + SQLCipher + chemins
│       ├── schema.sql          # Script de création des tables (+ triggers audit)
│       ├── migrations/         # Scripts de migration versionnés (PRAGMA user_version)
│       └── seeds/              # Données initiales (paramètres, numérotation, exercice)
├── src/
│   ├── main.tsx                # Point d'entrée React
│   ├── App.tsx                 # Router principal + layout
│   ├── index.css               # Tailwind directives + variables EGTO
│   ├── components/
│   │   ├── ui/                 # Composants shadcn/ui (Button, Input, Dialog, Tabs...)
│   │   ├── layout/             # Sidebar, Header, Breadcrumb, PageContainer
│   │   ├── forms/              # Composants formulaires réutilisables (FormField, DatePicker)
│   │   └── charts/             # Wrappers Recharts (BarChart, LineChart, PieChart)
│   ├── hooks/
│   │   ├── useDatabase.ts      # Hook TanStack Query pour appels IPC
│   │   ├── usePdfGenerator.ts  # Hook pour génération PDF
│   │   └── useExcelGenerator.ts# Hook pour génération Excel
│   ├── stores/
│   │   ├── useAppStore.ts      # Zustand : session, période active
│   │   ├── useAffaireStore.ts  # Zustand : affaire sélectionnée, filtres liste
│   │   └── useUiStore.ts       # Zustand : toasts, modales, thème
│   ├── routes/
│   │   ├── Dashboard.tsx
│   │   ├── Affaires/
│   │   ├── Clients/
│   │   ├── Catalogue/
│   │   ├── Devis/
│   │   ├── Facturation/
│   │   ├── Creances/
│   │   ├── SousTraitance/
│   │   ├── Cautions/
│   │   ├── Parametrage/
│   │   └── Rapports/
│   ├── lib/
│   │   ├── utils.ts            # Helpers (cn, formatDate, formatCurrency)
│   │   ├── constants.ts        # TVA, formats numérotation, seuils alertes
│   │   ├── validators.ts       # Schémas Zod pour chaque entité métier
│   │   └── pdf-templates/      # factureA4.ts, situationTravauxA4.ts, rapportMensuelSign.ts
│   ├── types/
│   │   ├── database.ts         # Types générés depuis le schéma SQLite
│   │   ├── ipc.ts              # Types des canaux IPC (contrat Main↔Renderer)
│   │   └── entities.ts         # Types métier (Affaire, Client, Facture, etc.)
│   └── services/
│       ├── affaire.service.ts  # Logique métier affaires (calculs délais, statuts)
│       ├── facture.service.ts  # Calculs pied de facture, numérotation, timbre
│       ├── client.service.ts   # Scoring auto, règles vigilance
│       └── rapport.service.ts  # Assemblage données rapport mensuel
├── assets/
│   ├── logo-egto.png           # Logo en-tête factures et rapports
│   └── fonts/                  # Polices pdfmake (Roboto + Noto Naskh Arabic/Amiri)
├── dist/                       # Build Vite (renderer)
├── release/                    # Artifacts electron-builder (.exe, .zip)
├── package.json
├── electron-builder.yml        # Config packaging NSIS Windows
├── vite.config.ts              # Config Vite (renderer + main + preload)
├── tsconfig.json
├── tsconfig.node.json
└── tailwind.config.ts          # Thème EGTO (couleurs BTP)
```

#### 5.5.4 Configuration Build & Packaging

**electron-builder.yml** (cible unique Windows x64) :
```yaml
appId: com.egto.gestion-commerciale
productName: "EGTO - Gestion Commerciale"
copyright: "© 2026 E.G.T.O - Entreprise des Grands Travaux de l'Ouest"
files:
  - dist/**/*
  - electron/**/*
  - assets/**/*
  - package.json
extraResources:
  - from: "./electron/db/schema.sql"
    to: "db/schema.sql"
  - from: "./assets/"
    to: "assets/"
win:
  target:
    - target: nsis
      arch: x64
  icon: assets/icon.ico
  publisherName: "E.G.T.O"
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: assets/icon.ico
  uninstallerIcon: assets/icon.ico
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "EGTO Gestion Commerciale"
```

**Scripts package.json** :
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "npm run build && electron .",
    "electron:build": "npm run build && electron-builder",
    "dist": "npm run build && electron-builder --win --x64",
    "postinstall": "electron-builder install-app-deps",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

**Décisions packaging :**
- 🆕 **Signature de code** : non retenue (pas de budget côté EGTO). Conséquence assumée : alerte Windows SmartScreen au premier lancement — procédure documentée dans le manuel utilisateur (« Informations complémentaires → Exécuter quand même »). À reconsidérer si distribution plus large.
- 🆕 **Mises à jour** : **manuelles** (pas d'`autoUpdater`) — poste unique interne, infrastructure de mise à jour disproportionnée pour ce périmètre.
- Compatibilité : Windows 10/11 64 bits, droits administrateur requis à l'installation.

#### 5.5.4bis Rationalisation des tableaux
📌 Règle retenue : **TanStack Table** pour toutes les listes métier ; **AG Grid Community** réservé exclusivement à la saisie de masse (DQE, déclaration mensuelle) ; **shadcn/ui** conservé uniquement pour les primitives (Dialog, Form, Tabs, Calendar, Select), plus pour l'affichage de tableaux.

#### 5.5.5 Gestion de la Base de Données
- **Initialisation** : au premier lancement, création du fichier SQLite chiffré dans `app.getPath('userData')/egto_data.db`, génération de la DEK et des enveloppes (§9.1), exécution du schéma + seeds (paramètres entreprise, compteurs de numérotation, exercice en cours).
- **Connexion** : instance unique, mode WAL (`journal_mode = WAL`).
- **Migrations** : `PRAGMA user_version` + dossier `migrations/` versionné, exécuté séquentiellement au démarrage, table `migrations_history`.
- **Sécurité** : pas de SQL dynamique concaténé côté renderer ; IPC typé exclusivement (voir §5.5.2).

#### 5.5.6 Génération des Documents (PDF & Excel)
- **PDF (pdfmake)**, exécuté côté Main via IPC. Le renderer envoie la définition du document (objet JSON pdfmake), le Main génère et écrit dans `Documents/EGTO/...`. **Polices embarquées** : Roboto (latin) **+ Noto Naskh Arabic ou Amiri** (📌 Roboto seul ne contient aucun glyphe arabe).
- **Excel (exceljs)**, exécuté côté Main via IPC. Le renderer envoie un Workbook JSON (feuilles, colonnes, lignes, styles), le Main construit le `.xlsx`. Template clé : `rapportMensuelExcel.ts` (5 onglets correspondant aux 5 pages du rapport mensuel).

#### 5.5.7 Gestion des Fichiers & Pièces Jointes
- Dossier utilisateur `app.getPath('documents')/EGTO/`, sous-dossiers auto-créés : `Factures/`, `Devis/`, `BonsDeLivraison/`, `Rapports/`, `PiecesJointes/`, `Sauvegardes/`.
- Dialogues natifs (`dialog.showSaveDialog` / `showOpenDialog`) pour import/export manuels.

#### 5.5.8 Déconnexion Auto & Sécurité Session
Timer 30 min d'inactivité (pas d'événement clavier/souris) → IPC `session:lock` → store Zustand session vidé, redirection React Router vers `/login`, application non fermée.

#### 5.5.9 Journal d'Audit (Implémentation Technique)
```sql
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE
  old_values JSON,
  new_values JSON,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
📌 Alimentée par **triggers SQLite** (non contournables), pas par appels explicites dans les handlers. Lecture via une route dédiée dans le module Paramétrage. Rétention illimitée. Pas de modification possible depuis l'UI.

---

## 6. Glossaire

| Terme | Définition |
|---|---|
| **ODS** | Ordre de Service — document officiel qui déclenche le démarrage (ou une suspension/reprise) de l'exécution d'un marché |
| **DQE** | Devis Quantitatif Estimatif — liste détaillée des postes/quantités/prix unitaires d'un marché |
| **ST** | Situation de Travaux — décompte mensuel des travaux réalisés sur un marché public, sert de base à la facturation intermédiaire |
| **Attachement** | Métré contradictoire intermédiaire des quantités réellement exécutées sur le terrain, établi avant la ST — pièce justificative entre le terrain et la facturation (spec : §4.1.13bis) |
| **Mainlevée** | Acte par lequel une banque libère une caution ou une garantie, ou par lequel un maître d'ouvrage restitue une retenue |
| **Décompte** | Document chiffrant les travaux exécutés à un instant donné (provisoire en cours d'exécution, définitif à la clôture) |
| **Réception provisoire** | Constat contradictoire de fin des travaux, ouvrant le délai de garantie |
| **Réception définitive** | Constat en fin de délai de garantie, purge les réserves, déclenche la libération de la retenue de garantie |
| **Retenue de garantie** | Pourcentage (5 %, base HT) retenu sur chaque paiement, restitué à la réception définitive, garantit la bonne exécution |
| **Caution de bonne exécution** | Garantie bancaire (5-10 %) exigée à la signature, mobilisable en cas de défaillance de l'entreprise |
| **Avance forfaitaire** | Avance de trésorerie (max 15 %) versée au démarrage, remboursée par retenues progressives sur les ST |
| **CCAG / CCAP** | Cahier des Clauses Administratives Générales / Particulières — cadre réglementaire (CCAG) et clauses spécifiques au marché (CCAP), notamment pour les pénalités de retard |
| **DEK** | Data Encryption Key — clé de chiffrement de la base SQLCipher (voir §9.1) |
| **DMP** | Délai Moyen de Paiement (formule : §4.6.1.B) |

---

## 7. Fiscalité algérienne — Conformité

### 7.1 Synthèse des règles retenues
| Sujet | Décision finale |
|---|---|
| **Droit de timbre** | **Barème à tranches paramétrable en M7 (§4.7.3)** ; déclencheur = mode de règlement prévu ∈ {Espèces, Chèque, Traite} (champ en-tête facture §4.4.4) ; jamais si Virement ou LCN ⚠️ périmètre exact et valeurs à valider en Phase 0 avec l'expert-comptable |
| **TVA** | Taux unique 19 %, **champ verrouillé au niveau produit** 📌 — le pied de facture (§4.4.6) suppose un taux unique ; une évolution multi-taux nécessiterait une refonte de la ventilation HT, explicitement hors périmètre |
| **État TVA collectée** | Rapport mensuel simple (Total HT vendu / TVA collectée), scope limité aux ventes — la TVA déductible sur achats reste hors périmètre (gérée par la comptabilité générale) |
| **Numérotation** | Attribuée uniquement à la validation, jamais au brouillon (§5.3) |
| **Conservation légale** | ~10 ans — exercices clôturés en lecture seule + au moins une sauvegarde annuelle conservée 10 ans (§4.7.7) |
| **Mentions légales facture** | Liste exhaustive définie en §5.2 |
| **TAP** (Taxe sur l'Activité Professionnelle) | Supprimée depuis la loi de finances 2024, toujours abolie sous la LF 2026 — **📌 quasi tranché**, confirmation finale de l'expert-comptable recommandée pour clôturer formellement le point pour la situation spécifique d'EGTO (EPE/SPA, filiale GITRA). Non implémentée par défaut. |
| **Révision de prix** | Gérée au cas par cas (champ Type de révision par affaire §4.1.4, mécanique de calcul §4.4.7bis) |
| **Intérêts moratoires** | Pour marché public : taux directeur Banque d'Algérie + 1 point, déclenché après 30 j suivant certification du service fait (base réglementaire à faire confirmer par le fiscaliste). Pour contrat privé sans taux contractuel : taux légal par défaut de l'ordre de 3,5 % — **à faire trancher par le fiscaliste EGTO** avant mise en production. Taux paramétrable en M7, génère une ND proposée (validation manuelle) |
| **Pénalités de retard** | Pas de taux unique — paramétrable par affaire selon le CCAP du marché concerné (§4.1.4) |
| **Retenue à la source sur paiements sous-traitants** | Non traitée, aucun mécanisme prévu dans M8 — à confirmer avec le fiscaliste si applicable aux paiements EGTO → sous-traitants ⚠️ |

---

## 8. Exigences Non Fonctionnelles

| Catégorie | Exigence |
|---|---|
| **Volumétrie cible** | < 50 affaires/an, < 200 factures/an — l'application doit rester fluide même après 10 ans de données cumulées (~500 affaires, ~2 000 factures) |
| **Temps de réponse** | Listes < 1 s, génération PDF/Excel < 3 s |
| **OS supporté** | Windows 10/11, 64 bits |
| **Poste minimum recommandé** | 8 Go RAM, SSD recommandé, résolution minimum 1366×768 |
| **Disponibilité** | Application locale, pas de dépendance réseau pour le fonctionnement courant (hors sauvegarde externe) |

---

## 9. Sécurité

- Mot de passe haché (argon2id), jamais stocké en clair
- Base de données chiffrée (SQLCipher) — gestion de la clé : voir §9.1 📌
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP restrictive
- IPC typé par domaine, aucun canal SQL générique exposé au renderer
- Procédure de récupération de mot de passe via utilitaire d'administration séparé — voir §9.1
- Sauvegardes chiffrées, destination externe au poste — restaurabilité : voir §9.1

### 9.1 Gestion de la clé de chiffrement (📌 tranché)

**Principe : chiffrement en enveloppe (envelope encryption), avec clé de recours.**

- Au premier lancement (§4.7.2), l'application génère une **clé de chiffrement de données (DEK)** aléatoire (256 bits). C'est cette DEK, et uniquement elle, qui chiffre la base SQLCipher. Elle n'est jamais stockée en clair.
- La DEK est enveloppée (chiffrée) deux fois, indépendamment :
  1. **Enveloppe utilisateur** — par une clé dérivée du mot de passe via argon2id (même primitive que le hachage, utilisée ici comme fonction de dérivation de clé, avec un sel distinct). Utilisée à chaque connexion normale.
  2. **Enveloppe de recours** — par une clé dérivée d'une **phrase de récupération** générée aléatoirement à l'installation (ex. 6 groupes de 4 caractères), affichée une seule fois à l'écran, à **imprimer et conserver par la direction, hors du poste**.
- Les deux enveloppes (blobs chiffrés) sont stockées dans une table de contrôle non chiffrée : leur exposition ne révèle rien sans le mot de passe ou la phrase correspondante.

**Changement de mot de passe (utilisateur connecté)** : déballe l'enveloppe utilisateur avec l'ancien mot de passe, obtient la DEK, la remballe avec une clé dérivée du nouveau mot de passe. La base SQLCipher elle-même n'est jamais rechiffrée — seule l'enveloppe change, opération quasi instantanée.

**`egto-admin-reset` — procédure** : demande la phrase de récupération (et non un accès direct à la base). Déballe l'enveloppe de recours → obtient la DEK → invite à saisir un nouveau mot de passe → reconstruit l'enveloppe utilisateur. Sans la phrase de récupération, l'utilitaire ne réinitialise rien : un accès physique seul au poste ne suffit pas à contourner le chiffrement — c'est le but recherché.

**Conséquence sur les sauvegardes (§4.7.7)** : chaque export (auto ou manuel) inclut le fichier SQLite chiffré **et** le blob d'enveloppe de recours (jamais l'enveloppe utilisateur ni la DEK en clair). Restaurer sur un nouveau poste (portable HS, remplacement) ne nécessite que la phrase de récupération conservée par la direction, pas l'ancien mot de passe. Le test de restauration trimestriel (§4.7.7) vérifie explicitement la restauration via la phrase de récupération.

**Mot de passe des exports ZIP manuels (§4.7.7)** : distinct du mot de passe applicatif, conservé par la direction au même titre que la phrase de récupération (ou dérivé de celle-ci — à trancher en Phase 0).

---

## 10. Modèle de données (aperçu)

> Un ERD complet et un dictionnaire de données détaillé sont un **livrable de la Phase 0** (voir §3). Cette section liste les entités principales et leurs relations pour cadrer le développement.

### 10.1 Entités principales
`Client` (1—N) `Contact`, `Client` (1—N) `InteractionHistorique`, `Client` (1—N) `Affaire`, `Affaire` (1—N) `Avenant` (auto-référence vers affaire mère), `Affaire` (1—N) `PosteDQE`, `Affaire` (1—N) `Attachement`, `Affaire` (1—N) `DeclarationLigne`, `Affaire` (1—N) `Facture`, `Affaire` (1—N) `Caution`, `Affaire` (1—N) `Reception`, `Affaire` (1—N) `Correspondance`, `Affaire` (1—N) `RetenueGarantieEcheance` (une ligne par lot de réception), `Devis` (0—1) `Affaire` (conversion), `Facture` (1—N) `LigneFacture`, `Facture` (0—N) `Encaissement` (via affectation N—N), `Facture` (0—N) `Avoir`, `BonDeLivraison` (0—1) `Facture`, `SousTraitant` (1—N) `BCST`, `BCST` (1—N) `DecompteSST`, `Produit` (1—N) `TarifHistorique`.

### 10.2 Colonnes transversales
Chaque table métier porte : `id`, `created_at`, `updated_at`, `deleted_at` (suppression logique), `statut`.

### 10.3 📌 Stockage monétaire
Tous les montants sont stockés en **INTEGER (centimes)**, jamais en `REAL`/flottant (source d'erreurs d'arrondi inacceptable en facturation). Règle d'arrondi : **2 décimales, half-up**, appliquée d'abord au niveau de chaque ligne, puis au total du document.

---

## 11. Critères d'acceptation & Plan de recette

Un plan de recette détaillé sera co-construit avec le service commercial en Phase 0/1. Critères d'acceptation par module :

- **M1** : une affaire marché public créée avec ODS génère correctement sa date de fin contractuelle et ses alertes de délai
- **M4** : le pied de facture (§4.4.6) produit un total identique, au centime près, à un calcul manuel de contrôle sur 10 cas types (avec/sans retenue, avec/sans droit de timbre selon le barème §4.7.3)
- **M4 (révision de prix)** : l'exemple chiffré de §4.4.7bis est reproduit exactement (5 000 000 DA × 0,0755 = 377 500 DA)
- **M4.9** : la génération du rapport mensuel PDF+Excel correspond ligne à ligne au template GITRA validé en Phase 0
- **M7** : la procédure de récupération de mot de passe via `egto-admin-reset` fonctionne **avec la phrase de récupération**, sans accès à l'application, et échoue sans elle
- **M11/M12** : une caution de type « Soumission » peut être créée et suivie (alertes J-30/J-15) **sans qu'aucune affaire n'existe encore**
- **M13** : un import de 300 lignes de DQE avec 10 doublons volontaires exclut correctement les doublons et importe les 290 lignes valides

---

## 12. Sauvegarde, restauration & qualité — récapitulatif technique

Voir §4.7.7 (politique fonctionnelle), §9.1 (clés et restaurabilité) et §5.5 (implémentation). Points de contrôle Phase 4 :
1. Test de restauration complet documenté (procédure pas-à-pas), **incluant la restauration via la phrase de récupération**
2. Tests unitaires sur tous les calculs financiers (couverture cible : pied de facture, retenues, droit de timbre, scoring, révision de prix, pénalités, intérêts moratoires)
3. Tests e2e sur les parcours critiques (affaire → déclaration → ST → encaissement ; devis → affaire → facture)

---

## 13. Registre des risques projet

| Risque | Impact | Mitigation |
|---|---|---|
| Template Excel GITRA non validé avant développement du rapport mensuel | Reprise coûteuse du module M4.9 | Verrouiller en Phase 0 (dépendance bloquante) |
| Qualité des données à l'import initial (clients/produits/DQE existants) | Doublons, erreurs de facturation | Assistant d'import avec rapport d'anomalies (M13) |
| Disponibilité du service commercial pour la recette | Retard de livraison | Planifier les créneaux de recette dès la Phase 0 |
| Taux réglementaires non confirmés (barème droit de timbre, intérêts moratoires, TAP) | Non-conformité fiscale au lancement | Validation avec le comptable/fiscaliste EGTO avant mise en production (voir §16) |
| Perte de la phrase de récupération par la direction | Impossibilité de récupérer l'accès en cas d'oubli du mot de passe ou de panne du poste | Consignation écrite à l'installation (§4.7.2), rappel dans le manuel utilisateur |

---

## 14. Livrables

1. **Application Desktop** exécutable (Windows), livrée phase par phase (§3)
2. **Base de données** SQLite chiffrée préconfigurée
3. **Import initial** : clients, produits, DQE (via M13)
4. **Manuel utilisateur** (PDF), incluant la procédure de récupération de mot de passe (phrase de récupération), la gestion de l'alerte SmartScreen, et le traitement des écarts de mode de règlement (ND, §4.4.4)
5. **ERD + dictionnaire de données**, **wireframes des écrans principaux** (livrables de Phase 0)
6. **Utilitaire d'administration** `egto-admin-reset` (récupération mot de passe via phrase de récupération)

---

## 15. Sections restant à produire (hors texte du PRD)

- Wireframes des écrans principaux (fiche affaire, déclaration mensuelle, facture, devis)
- ERD détaillé et dictionnaire de données complet
- Plan de recette détaillé avec le service commercial

---

## 16. Annexe — Hypothèses retenues, à confirmer avant/pendant la Phase 0 ⚠️

| # | Point ouvert | Statut |
|---|---|---|
| 1 | Template Excel du rapport mensuel GITRA | **N'existe pas encore** — à faire produire et valider par GITRA/comptabilité avant le développement de M4.9 |
| 2 | Droit de timbre | Barème à tranches (1 % / 1,5 % / 2 %, plancher 5 DA, plafond 10 000 DA) proposé en §4.7.3 comme valeur de départ — **à valider définitivement avec le comptable EGTO avant mise en production** |
| 3 | Intérêts moratoires | Pour marché public : taux directeur Banque d'Algérie + 1 point, déclenché après 30 j suivant certification du service fait (base réglementaire à faire confirmer par le fiscaliste). Pour contrat privé sans taux contractuel : taux légal par défaut de l'ordre de 3,5 % — **à faire trancher par le fiscaliste EGTO** avant mise en production |
| 4 | TAP | Supprimée depuis la loi de finances 2024, toujours abolie sous la LF 2026 — **📌 quasi tranché**, confirmation finale de l'expert-comptable recommandée pour clôturer formellement le point pour la situation spécifique d'EGTO (EPE/SPA, filiale GITRA) |
| 5 | Longueur exacte NIF (15) / NIS (11) | À vérifier sur documents réels CNRC d'EGTO (le NIS est parfois annoncé à 15 chiffres selon les sources) |
| 6 | « Saisie de la déclaration avant le 5 du mois » | Retenu par défaut comme avertissement (non bloquant), cohérent avec le principe général « alerter plutôt que bloquer » — à confirmer explicitement avec le service commercial |
| 7 | Formule exacte des pénalités de retard | Variable par marché (CCAP) — le champ est paramétrable par affaire plutôt que figé dans le PRD |
| 8 | Retenue à la source sur paiements sous-traitants | Non traitée, aucun mécanisme prévu dans M8 — à confirmer avec le fiscaliste si applicable aux paiements EGTO → sous-traitants |
| 9 | Mot de passe des exports ZIP manuels | Distinct du mot de passe applicatif, ou dérivé de la phrase de récupération — à trancher en Phase 0 (§9.1) |

---

*Document PRD FINAL — E.G.T.O Gestion Commerciale*
*Version 2.1 — Août 2026*
*Consolidation des versions 1.1, 2.0 et des correctifs 2.1 — document autonome destiné au développement*