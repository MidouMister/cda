import type { Base } from './connexion'

export const CLE_MARQUEUR_DEMO = 'demo.chargee'
export const VALEUR_MARQUEUR_DEMO = '1'

const tva19 = (ht: number): number => Math.round(ht * 0.19)

const CLIENTS = [
  {
    codeClient: 'CLI-EPE-SOUTH',
    typeClient: 'EPE_SPA',
    raisonSociale: 'Entreprise Publique du Sud',
    categorie: 'PUBLIC',
    secteur: 'BTP',
    nif: '099917500012345',
    nis: '199917500123456',
    rc: 'RC 12-345-01',
    ai: 'AI 09991750001',
    adresse: 'Zone industrielle Es-Sénia, Oran',
    wilaya: 'Oran',
    commune: 'Es-Sénia',
    modeReglementPrefere: 'VIREMENT',
    delaiPaiementJours: 60,
  },
  {
    codeClient: 'CLI-SARL-BAT',
    typeClient: 'SARL',
    raisonSociale: 'SARL Bâtiments Modernes',
    categorie: 'PRIVE',
    secteur: 'BTP',
    nif: '558002170014567',
    nis: '558002170123456',
    rc: 'RC 22-345-02',
    ai: 'AI 55800217002',
    adresse: 'Cité Akid Lotfi, Oran',
    wilaya: 'Oran',
    commune: 'Oran',
    modeReglementPrefere: 'CHEQUE',
    delaiPaiementJours: 30,
  },
  {
    codeClient: 'CLI-SARL-LITT',
    typeClient: 'SARL',
    raisonSociale: 'SARL Travaux du Littoral',
    categorie: 'PRIVE',
    secteur: 'ENERGIE',
    nif: '558002170025678',
    nis: '558002170234567',
    rc: 'RC 22-346-03',
    ai: 'AI 55800217003',
    adresse: 'Boulevard Front de Mer, Oran',
    wilaya: 'Oran',
    commune: 'Oran',
    modeReglementPrefere: 'VIREMENT',
    delaiPaiementJours: 45,
  },
  {
    codeClient: 'CLI-ETP-OUEST',
    typeClient: 'ETP',
    raisonSociale: 'ETP Ouest Réalisation',
    categorie: 'PRIVE',
    secteur: 'VRD',
    nif: '558002170036789',
    nis: '558002170345678',
    rc: 'RC 32-347-04',
    ai: 'AI 55800217004',
    adresse: 'Haï Es-Sabah, Oran',
    wilaya: 'Oran',
    commune: 'Oran',
    modeReglementPrefere: 'CHEQUE',
    delaiPaiementJours: 30,
  },
  {
    codeClient: 'CLI-EPE-PORT',
    typeClient: 'EPE_SPA',
    raisonSociale: 'EPE Port d\'Oran',
    categorie: 'PUBLIC',
    secteur: 'PORTUAIRE',
    nif: '099917500047890',
    nis: '199917500456789',
    rc: 'RC 12-348-05',
    ai: 'AI 09991750005',
    adresse: 'Port d\'Oran, Oran',
    wilaya: 'Oran',
    commune: 'Oran',
    modeReglementPrefere: 'VIREMENT',
    delaiPaiementJours: 60,
  },
  {
    codeClient: 'CLI-SARL-HYDRO',
    typeClient: 'SARL',
    raisonSociale: 'SARL Hydrau Constructions',
    categorie: 'PRIVE',
    secteur: 'HYDRAULIQUE',
    nif: '558002170058901',
    nis: '558002170567891',
    rc: 'RC 22-349-06',
    ai: 'AI 55800217006',
    adresse: 'Route de Canastel, Oran',
    wilaya: 'Oran',
    commune: 'Bir El Djir',
    modeReglementPrefere: 'VIREMENT',
    delaiPaiementJours: 45,
  },
] as const

const PRODUITS = [
  { codeProduit: 'PRD-CIM-CPJ', libelle: 'Ciment CPJ 42.5', famille: 'VTE', unite: 'T', puReferenceCentimes: 850000 },
  { codeProduit: 'PRD-FER-D12', libelle: 'Fer à béton D12', famille: 'VTE', unite: 'T', puReferenceCentimes: 11500000 },
  { codeProduit: 'PRD-SAB-003', libelle: 'Sable lavé 0/3', famille: 'VTE', unite: 'M3', puReferenceCentimes: 210000 },
  { codeProduit: 'PRD-PELLE', libelle: 'Pelleteuse 30 tonnes', famille: 'LOC', unite: 'H', puReferenceCentimes: 1450000 },
  { codeProduit: 'PRD-BETON', libelle: 'Bétonnière 350 litres', famille: 'LOC', unite: 'J', puReferenceCentimes: 350000 },
  { codeProduit: 'PRD-MO-GO', libelle: 'Main d\'œuvre gros œuvre', famille: 'REA', unite: 'J', puReferenceCentimes: 12000000 },
  { codeProduit: 'PRD-ENROB', libelle: 'Enrobé bitumineux', famille: 'REA', unite: 'T', puReferenceCentimes: 24000000 },
  { codeProduit: 'PRD-FORAGE', libelle: 'Forage horizontal', famille: 'ST', unite: 'M3', puReferenceCentimes: 8500000 },
  { codeProduit: 'PRD-TERR', libelle: 'Terrassement et remblai', famille: 'ST', unite: 'M3', puReferenceCentimes: 650000 },
] as const

const AN_2026 = 2026

export const insererSeedsDemo = (base: Base): { insere: boolean } => {
  const marqueur = base.prepare('SELECT 1 AS trouve FROM parametres WHERE cle = ?').get(CLE_MARQUEUR_DEMO)
  if (marqueur !== undefined) {
    return { insere: false }
  }

  const transaction = base.transaction(() => {
    const idFamilleParCode = new Map<string, number>()
    const lignesFamilles = base.prepare('SELECT id, code FROM familles').all() as { id: number; code: string }[]
    for (const famille of lignesFamilles) {
      idFamilleParCode.set(famille.code, famille.id)
    }

    const idsClients: number[] = []
    const insererClient = base.prepare(
      `INSERT INTO clients
         (code_client, type_client, raison_sociale, categorie, secteur, adresse, wilaya, commune,
          nif, nis, rc, ai, mode_reglement_prefere, delai_paiement_jours, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIF')`,
    )
    for (const client of CLIENTS) {
      const resultat = insererClient.run(
        client.codeClient,
        client.typeClient,
        client.raisonSociale,
        client.categorie,
        client.secteur,
        client.adresse,
        client.wilaya,
        client.commune,
        client.nif,
        client.nis,
        client.rc,
        client.ai,
        client.modeReglementPrefere,
        client.delaiPaiementJours,
      )
      idsClients.push(Number(resultat.lastInsertRowid))
    }

    const idsProduits: number[] = []
    const insererProduit = base.prepare(
      `INSERT INTO produits
         (code_produit, libelle, famille_id, unite, pu_reference_centimes, type_tarification, actif)
       VALUES (?, ?, ?, ?, ?, 'FIXE', 1)`,
    )
    for (const produit of PRODUITS) {
      const familleId = idFamilleParCode.get(produit.famille)
      if (familleId === undefined) {
        throw new Error(`Famille « ${produit.famille} » introuvable pour le produit démo.`)
      }
      const resultat = insererProduit.run(
        produit.codeProduit,
        produit.libelle,
        familleId,
        produit.unite,
        produit.puReferenceCentimes,
      )
      idsProduits.push(Number(resultat.lastInsertRowid))
    }

    const exercice2026 = base.prepare('SELECT id FROM exercices WHERE annee = ?').get(AN_2026) as
      | { id: number }
      | undefined
    const exerciceId = exercice2026?.id ?? null

    const insererDevis = base.prepare(
      `INSERT INTO devis
         (numero_devis, client_id, date_devis, date_validite, rabais_global_bps, statut, exercice_id)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
    )

    const insererLigneDevis = base.prepare(
      `INSERT INTO lignes_devis
         (devis_id, produit_id, designation, unite, quantite_milliemes, pu_ht_centimes, montant_ht_centimes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )

    const insererAffaire = base.prepare(
      `INSERT INTO affaires
         (statut, reference, type_affaire, client_id, objet, montant_initial_ht_centimes, taux_tva_bps,
          date_signature, date_notification, date_demarrage_effectif, delai_execution_jours,
          date_fin_contractuelle, rabais_marche_bps, retenue_garantie_bps, motif_resiliation, date_resiliation)
       VALUES (?, ?, ?, ?, ?, ?, 1900, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    )

    const insererPosteDqe = base.prepare(
      `INSERT INTO postes_dqe
         (affaire_id, numero, designation, unite, quantite_milliemes, pu_ht_centimes,
          montant_ht_centimes, famille_id, origine)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DEVIS')`,
    )

    // ---- Affaire 1 : marché public (rabais marché 10 %), facturé ----
    const affaire1Id = Number(
      insererAffaire.run(
        'EN_COURS',
        'AFF-2026-001',
        'MARCHE_PUBLIC',
        idsClients[0],
        'Construction d\'un siège administratif',
        350000000,
        '2026-01-15',
        '2026-02-01',
        '2026-03-01',
        240,
        '2026-12-31',
        1000,
        500,
      ).lastInsertRowid,
    )
    const devis1Id = Number(
      insererDevis.run('DEV-2026-001', idsClients[0], '2026-01-10', '2026-02-10', 'ACCEPTE', exerciceId)
        .lastInsertRowid,
    )
    insererLigneDevis.run(devis1Id, idsProduits[0], PRODUITS[0].libelle, 'T', 50000, 850000, 42500000)
    insererLigneDevis.run(devis1Id, idsProduits[1], PRODUITS[1].libelle, 'T', 20000, 11500000, 230000000)

    const quantiteCiment1 = 50000
    const puCiment1 = 850000
    const brutCiment1 = quantiteCiment1 * puCiment1
    const rabaisMarcheBps = 1000
    const rabaisMarcheCiment1 = Math.round((brutCiment1 * rabaisMarcheBps) / 10000)
    const netCiment1 = brutCiment1 - rabaisMarcheCiment1

    const quantiteFer1 = 20000
    const puFer1 = 11500000
    const brutFer1 = quantiteFer1 * puFer1
    const rabaisMarcheFer1 = Math.round((brutFer1 * rabaisMarcheBps) / 10000)
    const netFer1 = brutFer1 - rabaisMarcheFer1

    const totalHtLignes1 = brutCiment1 + brutFer1
    const totalRemises1 = rabaisMarcheCiment1 + rabaisMarcheFer1
    const netCommercial1 = netCiment1 + netFer1
    const retenue1 = Math.round(netCommercial1 * 0.05)
    const totalHt1 = netCommercial1 - retenue1
    const totalTva1 = tva19(totalHt1)
    const totalTtc1 = totalHt1 + totalTva1

    const facture1Id = Number(
      base
        .prepare(
          `INSERT INTO factures
             (statut, type_document, numero, date_facture, date_echeance, affaire_id, client_id,
              adresse_facturation, nif_client, retenue_garantie_bps,
              total_ht_lignes_centimes, total_remises_centimes, net_commercial_ht_centimes,
              retenue_garantie_centimes, total_ht_centimes, total_tva_centimes, total_ttc_centimes,
              net_a_payer_centimes, exercice_id)
           VALUES ('VALIDE', 'FA', 'FA-2026-0001', '2026-03-15', '2026-05-14', ?, ?, 'Zone industrielle Es-Sénia, Oran', ?, ?,
                   ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          affaire1Id,
          idsClients[0],
          CLIENTS[0].nif,
          500,
          totalHtLignes1,
          totalRemises1,
          netCommercial1,
          retenue1,
          totalHt1,
          totalTva1,
          totalTtc1,
          totalTtc1,
          exerciceId,
        ).lastInsertRowid,
    )
    const insererLigneFacture = base.prepare(
      `INSERT INTO lignes_facture
         (facture_id, produit_id, designation, unite, quantite_milliemes, pu_ht_centimes,
          remise_bps, rabais_marche_bps, montant_ht_brut_centimes, montant_ht_remise_centimes,
          montant_rabais_marche_centimes, montant_ht_net_centimes)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    )
    insererLigneFacture.run(
      facture1Id, idsProduits[0], PRODUITS[0].libelle, 'T', quantiteCiment1, puCiment1,
      rabaisMarcheBps, brutCiment1, brutCiment1, rabaisMarcheCiment1, netCiment1,
    )
    insererLigneFacture.run(
      facture1Id, idsProduits[1], PRODUITS[1].libelle, 'T', quantiteFer1, puFer1,
      rabaisMarcheBps, brutFer1, brutFer1, rabaisMarcheFer1, netFer1,
    )

    // postes DQE affaire 1
    insererPosteDqe.run(affaire1Id, 1, PRODUITS[0].libelle, 'T', quantiteCiment1, puCiment1, brutCiment1, undefined)
    insererPosteDqe.run(affaire1Id, 2, PRODUITS[1].libelle, 'T', quantiteFer1, puFer1, brutFer1, undefined)

    // ---- Affaire 2 : contrat privé, facturé (sans rabais marché) ----
    const affaire2Id = Number(
      insererAffaire.run(
        'FACTURE',
        'AFF-2026-002',
        'CONTRAT_PRIVE',
        idsClients[1],
        'Réhabilitation d\'un immeuble de bureaux',
        75000000,
        '2026-02-10',
        '2026-02-20',
        '2026-03-05',
        120,
        '2026-08-30',
        0,
        0,
      ).lastInsertRowid,
    )
    const devis2Id = Number(
      insererDevis.run('DEV-2026-002', idsClients[1], '2026-02-05', '2026-03-05', 'ACCEPTE', exerciceId)
        .lastInsertRowid,
    )
    insererLigneDevis.run(devis2Id, idsProduits[5], PRODUITS[5].libelle, 'J', 60000, 12000000, 720000000)

    const quantiteMo2 = 60000
    const puMo2 = 12000000
    const brutMo2 = quantiteMo2 * puMo2
    const totalHt2 = brutMo2
    const totalTva2 = tva19(totalHt2)
    const totalTtc2 = totalHt2 + totalTva2

    const facture2Id = Number(
      base
        .prepare(
          `INSERT INTO factures
             (statut, type_document, numero, date_facture, date_echeance, affaire_id, client_id,
              adresse_facturation, nif_client,
              total_ht_lignes_centimes, total_remises_centimes, net_commercial_ht_centimes,
              total_ht_centimes, total_tva_centimes, total_ttc_centimes,
              net_a_payer_centimes, exercice_id)
           VALUES ('ENVOYEE', 'FA', 'FA-2026-0002', '2026-04-20', '2026-05-20', ?, ?, 'Cité Akid Lotfi, Oran', ?,
                   ?, 0, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          affaire2Id,
          idsClients[1],
          CLIENTS[1].nif,
          totalHt2,
          totalHt2,
          totalHt2,
          totalTva2,
          totalTtc2,
          totalTtc2,
          exerciceId,
        ).lastInsertRowid,
    )
    insererLigneFacture.run(
      facture2Id, idsProduits[5], PRODUITS[5].libelle, 'J', quantiteMo2, puMo2,
      0, brutMo2, brutMo2, 0, brutMo2,
    )

    insererPosteDqe.run(affaire2Id, 1, PRODUITS[5].libelle, 'J', quantiteMo2, puMo2, brutMo2, undefined)

    // ---- Affaire 3 : contrat privé signé, devis envoyé, pas encore facturé ----
    insererAffaire.run(
      'SIGNE',
      'AFF-2026-003',
      'CONTRAT_PRIVE',
      idsClients[3],
      'Aménagement de voiries secondaires',
      125000000,
      '2026-04-05',
      '2026-04-12',
      '2026-05-02',
      150,
      '2026-10-30',
      0,
      0,
    )
    insererDevis.run(
      'DEV-2026-003', idsClients[3], '2026-03-25', '2026-04-25', 'ENVOYE', exerciceId,
    )

    const marqueur = base.prepare(
      `INSERT INTO parametres (cle, valeur, description)
       VALUES (?, ?, 'Marqueur : données de démonstration chargées')`,
    )
    marqueur.run(CLE_MARQUEUR_DEMO, VALEUR_MARQUEUR_DEMO)
  })

  transaction()
  return { insere: true }
}
