import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import {
  lireLignesFacture,
  materialiserLignesEtPiedFacture,
  type LigneFactureAInserer,
} from '../electron/depots/depot-factures'
import { calculerPiedFacture } from '../domaine/pied-facture'

const CLE_VALIDE = 'clé-de-test-depot-factures-egto'
const CHEMIN_ESSAI = join(tmpdir(), `egto-depot-factures-${randomUUID()}.db`)

const MOTIF_AJUSTEMENT = "ajustement d'arrondi rabais marché"
const DESIGNATION_AJUSTEMENT = "Ajustement d'arrondi"

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

let compteurClient = 0

const creerFacture = (base: Base, retenueGarantieBps = 0): number => {
  compteurClient += 1
  const idClient = Number(
    base
      .prepare(
        `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
         VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
      )
      .run(`CLI-DF-${compteurClient}`, `Client Dépôt Factures n°${compteurClient}`).lastInsertRowid,
  )
  const insertionFacture = base
    .prepare(
      `INSERT INTO factures (type_document, date_facture, client_id, retenue_garantie_bps, droit_timbre_centimes)
       VALUES ('FA', '2026-08-15', ?, ?, 999)`,
    )
    .run(idClient, retenueGarantieBps)
  return Number(insertionFacture.lastInsertRowid)
}

const ligneFacture = (
  designation: string,
  quantiteMilliemes: number,
  puHtCentimes: number,
  remiseBps = 0,
  rabaisMarcheBps = 0,
): LigneFactureAInserer => ({
  designation,
  unite: 'T',
  quantite_milliemes: quantiteMilliemes,
  pu_ht_centimes: puHtCentimes,
  remise_bps: remiseBps,
  rabais_marche_bps: rabaisMarcheBps,
})

interface FactureTotaux {
  total_ht_lignes_centimes: number
  total_remises_centimes: number
  net_commercial_ht_centimes: number
  retenue_garantie_centimes: number
  total_ht_centimes: number
  total_tva_centimes: number
  total_ttc_centimes: number
  droit_timbre_centimes: number
  net_a_payer_centimes: number
}

const lireFacture = (base: Base, factureId: number): FactureTotaux =>
  base
    .prepare(
      `SELECT total_ht_lignes_centimes, total_remises_centimes, net_commercial_ht_centimes,
              retenue_garantie_centimes, total_ht_centimes, total_tva_centimes,
              total_ttc_centimes, droit_timbre_centimes, net_a_payer_centimes
       FROM factures WHERE id = ?`,
    )
    .get(factureId) as FactureTotaux

const sommeNets = (base: Base, factureId: number): number =>
  (
    base
      .prepare(
        'SELECT COALESCE(SUM(montant_ht_net_centimes), 0) AS s FROM lignes_facture WHERE facture_id = ? AND supprime_le IS NULL',
      )
      .get(factureId) as { s: number }
  ).s

const lireContexte = (base: Base): unknown[] => base.prepare('SELECT * FROM contexte_audit').all()

interface LigneAudit {
  action: string
  motif: string | null
  ecart_centimes: number | null
  ancien_etat: string | null
  nouvel_etat: string | null
}

const lireAudits = (base: Base, ligneId: number): LigneAudit[] =>
  base
    .prepare(
      "SELECT action, motif, ecart_centimes, ancien_etat, nouvel_etat FROM journal_audit WHERE table_affectee = 'lignes_facture' AND ligne_id = ? ORDER BY id",
    )
    .all(ligneId) as LigneAudit[]

const etatsJson = (etat: string | null): Record<string, unknown> | null => (etat === null ? null : JSON.parse(etat))

describe('Dépôt factures — matérialisation des lignes et du pied', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  it('marché public, écart positif : l’écart est porté sur la ligne éligible la plus élevée (égalité → première), tracé en audit', () => {
    const base = obtenirBase()
    const idFacture = creerFacture(base)

    const resultat = materialiserLignesEtPiedFacture(base, idFacture, {
      lignes: [ligneFacture('Bitume', 1000, 10, 0, 500), ligneFacture('Gravier', 1000, 10, 0, 500)],
      retenue_garantie_bps: 0,
      remboursement_avance_centimes: 0,
      marche_public: true,
    })

    expect(resultat.ecart_centimes).toBe(1)
    expect(resultat.ajustement_materialise).toBe(true)
    expect(resultat.ligne_cible_id).toBe(resultat.id_lignes_inserees[0])
    expect(resultat.id_lignes_inserees).toHaveLength(2)

    const lignes = lireLignesFacture(base, idFacture)
    expect(lignes).toHaveLength(2)
    expect(lignes[0]).toMatchObject({
      designation: 'Bitume',
      montant_ht_brut_centimes: 10,
      montant_ht_remise_centimes: 10,
      montant_rabais_marche_centimes: 1,
      montant_ht_net_centimes: 10,
      type_ligne: null,
    })
    expect(lignes[1].montant_ht_net_centimes).toBe(9)

    const audits = lireAudits(base, resultat.ligne_cible_id as number)
    expect(audits.map((audit) => audit.action)).toEqual(['INSERT', 'UPDATE'])
    expect(audits[1]).toMatchObject({ action: 'UPDATE', motif: MOTIF_AJUSTEMENT, ecart_centimes: 1 })
    expect(etatsJson(audits[1].ancien_etat)).toMatchObject({ montant_ht_net_centimes: 9 })
    expect(etatsJson(audits[1].nouvel_etat)).toMatchObject({ montant_ht_net_centimes: 10 })

    const ligneNonCible = lireAudits(base, resultat.id_lignes_inserees[1])
    expect(ligneNonCible).toHaveLength(1)
    expect(ligneNonCible[0]).toMatchObject({ action: 'INSERT', motif: null, ecart_centimes: null })

    expect(lireFacture(base, idFacture)).toEqual({
      total_ht_lignes_centimes: 20,
      total_remises_centimes: 1,
      net_commercial_ht_centimes: 19,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 19,
      total_tva_centimes: 4,
      total_ttc_centimes: 23,
      droit_timbre_centimes: 999,
      net_a_payer_centimes: 23,
    })
    expect(sommeNets(base, idFacture)).toBe(19)
    expect(lireContexte(base)).toEqual([])
  })

  it('marché public, écart négatif : l’écart est porté sur la ligne de net le plus élevé, pas la première', () => {
    const base = obtenirBase()
    const idFacture = creerFacture(base)

    const resultat = materialiserLignesEtPiedFacture(base, idFacture, {
      lignes: [ligneFacture('Sable', 1000, 8, 0, 500), ligneFacture('Ciment', 1000, 24, 0, 500)],
      retenue_garantie_bps: 0,
      remboursement_avance_centimes: 0,
      marche_public: true,
    })

    expect(resultat.ecart_centimes).toBe(-1)
    expect(resultat.ligne_cible_id).toBe(resultat.id_lignes_inserees[1])

    const lignes = lireLignesFacture(base, idFacture)
    expect(lignes[0].montant_ht_net_centimes).toBe(8)
    expect(lignes[1].montant_ht_net_centimes).toBe(22)

    const audits = lireAudits(base, resultat.ligne_cible_id as number)
    expect(audits.map((audit) => audit.action)).toEqual(['INSERT', 'UPDATE'])
    expect(audits[1]).toMatchObject({ action: 'UPDATE', motif: MOTIF_AJUSTEMENT, ecart_centimes: -1 })
    expect(etatsJson(audits[1].ancien_etat)).toMatchObject({ montant_ht_net_centimes: 23 })
    expect(etatsJson(audits[1].nouvel_etat)).toMatchObject({ montant_ht_net_centimes: 22 })

    expect(lireFacture(base, idFacture)).toEqual({
      total_ht_lignes_centimes: 32,
      total_remises_centimes: 2,
      net_commercial_ht_centimes: 30,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 30,
      total_tva_centimes: 6,
      total_ttc_centimes: 36,
      droit_timbre_centimes: 999,
      net_a_payer_centimes: 36,
    })
    expect(sommeNets(base, idFacture)).toBe(30)
    expect(lireContexte(base)).toEqual([])
  })

  it('marché public, écart nul : aucun ajustement, les totaux sont exactement ceux du pied', () => {
    const base = obtenirBase()
    const idFacture = creerFacture(base)
    const lignesSaisies = [ligneFacture('Enrobé', 1000, 100000, 1000, 1000), ligneFacture('GC', 1000, 100000, 1500, 1000)]

    const resultat = materialiserLignesEtPiedFacture(base, idFacture, {
      lignes: lignesSaisies,
      retenue_garantie_bps: 0,
      remboursement_avance_centimes: 0,
      marche_public: true,
    })

    expect(resultat.ecart_centimes).toBe(0)
    expect(resultat.ajustement_materialise).toBe(false)
    expect(resultat.ligne_cible_id).toBeNull()

    const lignes = lireLignesFacture(base, idFacture)
    expect(lignes).toHaveLength(2)
    expect(lignes.map((ligne) => ligne.montant_ht_net_centimes)).toEqual([80000, 75000])

    for (const ligne of lignes) {
      const audits = lireAudits(base, ligne.id)
      expect(audits.map((audit) => audit.action)).toEqual(['INSERT'])
      expect(audits[0]).toMatchObject({ motif: null, ecart_centimes: null })
    }

    const pied = calculerPiedFacture({
      lignes: lignesSaisies.map((ligne) => ({
        quantiteMilliemes: ligne.quantite_milliemes,
        puHtCentimes: ligne.pu_ht_centimes,
        remiseBps: ligne.remise_bps,
        rabaisMarcheBps: ligne.rabais_marche_bps,
      })),
      retenueGarantieBps: 0,
      remboursementAvanceCentimes: 0,
      marchePublic: true,
    })

    expect(lireFacture(base, idFacture)).toEqual({
      total_ht_lignes_centimes: pied.total_ht_lignes_centimes,
      total_remises_centimes: pied.total_remises_centimes,
      net_commercial_ht_centimes: pied.net_commercial_ht_centimes,
      retenue_garantie_centimes: pied.retenue_garantie_centimes,
      total_ht_centimes: pied.total_ht_centimes,
      total_tva_centimes: pied.total_tva_centimes,
      total_ttc_centimes: pied.total_ttc_centimes,
      droit_timbre_centimes: 999,
      net_a_payer_centimes: pied.net_a_payer_centimes,
    })
    expect(sommeNets(base, idFacture)).toBe(pied.net_commercial_ht_centimes)
    expect(lireContexte(base)).toEqual([])
  })

  it('document privé, écart positif : ligne AJUSTEMENT_ARRONDI créée (net = écart), chaîne net → TTC recalculée', () => {
    const base = obtenirBase()
    const idFacture = creerFacture(base, 500)

    const resultat = materialiserLignesEtPiedFacture(base, idFacture, {
      lignes: [ligneFacture('Bitume', 1000, 10, 0, 500), ligneFacture('Gravier', 1000, 10, 0, 500)],
      retenue_garantie_bps: 500,
      remboursement_avance_centimes: 0,
      marche_public: false,
    })

    expect(resultat.ecart_centimes).toBe(1)
    expect(resultat.ajustement_materialise).toBe(true)
    expect(resultat.id_lignes_inserees).toHaveLength(3)
    expect(resultat.ligne_cible_id).toBe(resultat.id_lignes_inserees[2])

    const lignes = lireLignesFacture(base, idFacture)
    expect(lignes).toHaveLength(3)
    const ajustement = lignes.find((ligne) => ligne.type_ligne === 'AJUSTEMENT_ARRONDI')
    expect(ajustement).toMatchObject({
      designation: DESIGNATION_AJUSTEMENT,
      unite: 'U',
      quantite_milliemes: 0,
      pu_ht_centimes: 0,
      montant_ht_brut_centimes: 0,
      montant_ht_remise_centimes: 0,
      montant_rabais_marche_centimes: 0,
      montant_ht_net_centimes: 1,
      type_ligne: 'AJUSTEMENT_ARRONDI',
    })

    const audits = lireAudits(base, resultat.ligne_cible_id as number)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ action: 'INSERT', motif: MOTIF_AJUSTEMENT, ecart_centimes: 1 })
    expect(etatsJson(audits[0].nouvel_etat)).toMatchObject({
      type_ligne: 'AJUSTEMENT_ARRONDI',
      montant_ht_net_centimes: 1,
    })

    expect(lireFacture(base, idFacture)).toEqual({
      total_ht_lignes_centimes: 20,
      total_remises_centimes: 2,
      net_commercial_ht_centimes: 19,
      retenue_garantie_centimes: 1,
      total_ht_centimes: 18,
      total_tva_centimes: 3,
      total_ttc_centimes: 21,
      droit_timbre_centimes: 999,
      net_a_payer_centimes: 21,
    })
    expect(sommeNets(base, idFacture)).toBe(19)
    expect(lireContexte(base)).toEqual([])
  })

  it('document privé, écart nul : aucune ligne AJUSTEMENT_ARRONDI, totaux inchangés', () => {
    const base = obtenirBase()
    const idFacture = creerFacture(base)

    const resultat = materialiserLignesEtPiedFacture(base, idFacture, {
      lignes: [ligneFacture('Enrobé', 1000, 100000, 1000, 1000), ligneFacture('GC', 1000, 100000, 1500, 1000)],
      retenue_garantie_bps: 0,
      remboursement_avance_centimes: 0,
      marche_public: false,
    })

    expect(resultat.ecart_centimes).toBe(0)
    expect(resultat.ajustement_materialise).toBe(false)
    expect(resultat.ligne_cible_id).toBeNull()
    expect(lireLignesFacture(base, idFacture)).toHaveLength(2)
    expect(
      lireLignesFacture(base, idFacture).some((ligne) => ligne.type_ligne === 'AJUSTEMENT_ARRONDI'),
    ).toBe(false)

    expect(lireFacture(base, idFacture)).toEqual({
      total_ht_lignes_centimes: 200000,
      total_remises_centimes: 45000,
      net_commercial_ht_centimes: 155000,
      retenue_garantie_centimes: 0,
      total_ht_centimes: 155000,
      total_tva_centimes: 29450,
      total_ttc_centimes: 184450,
      droit_timbre_centimes: 999,
      net_a_payer_centimes: 184450,
    })
    expect(sommeNets(base, idFacture)).toBe(155000)
    expect(lireContexte(base)).toEqual([])
  })

  it('valide les saisies et échoue proprement : facture introuvable, désignation vide, contexte laissé vide', () => {
    const base = obtenirBase()
    const idFacture = creerFacture(base)

    expect(() =>
      materialiserLignesEtPiedFacture(base, 999999, {
        lignes: [ligneFacture('Bitume', 1000, 10, 0, 500)],
        retenue_garantie_bps: 0,
        remboursement_avance_centimes: 0,
        marche_public: true,
      }),
    ).toThrow(/introuvable/)

    expect(() =>
      materialiserLignesEtPiedFacture(base, idFacture, {
        lignes: [ligneFacture('   ', 1000, 10, 0, 500)],
        retenue_garantie_bps: 0,
        remboursement_avance_centimes: 0,
        marche_public: true,
      }),
    ).toThrow(/désignation/)

    expect(() =>
      materialiserLignesEtPiedFacture(base, 0, {
        lignes: [ligneFacture('Bitume', 1000, 10, 0, 500)],
        retenue_garantie_bps: 0,
        remboursement_avance_centimes: 0,
        marche_public: true,
      }),
    ).toThrow(/strictement positif/)

    expect(lireLignesFacture(base, idFacture)).toHaveLength(0)
    expect(lireContexte(base)).toEqual([])
  })
})
