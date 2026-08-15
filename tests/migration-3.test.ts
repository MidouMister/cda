import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'

const CLE_VALIDE = 'clé-de-test-migration-3-egto'
const CHEMIN_ESSAI = join(tmpdir(), `egto-migration-3-${randomUUID()}.db`)

const MOTIF_AJUSTEMENT = "ajustement d'arrondi rabais marché"

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

let compteurClient = 0
let compteurEncaissement = 0

const creerFacture = (base: Base, montantDuCentimes = 100000): number => {
  compteurClient += 1
  const insertionClient = base
    .prepare(
      `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
       VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
    )
    .run(`CLI-M3-${compteurClient}`, `Client Migration 3 n°${compteurClient}`)
  const idClient = Number(insertionClient.lastInsertRowid)
  const insertionFacture = base
    .prepare(
      `INSERT INTO factures (type_document, date_facture, client_id, net_a_payer_centimes)
       VALUES ('FA', '2026-08-15', ?, ?)`,
    )
    .run(idClient, montantDuCentimes)
  return Number(insertionFacture.lastInsertRowid)
}

interface LigneSaisie {
  netCentimes?: number
  typeLigne?: string | null
}

const insererLigne = (
  base: Base,
  factureId: number,
  designation: string,
  saisi: LigneSaisie = {},
): number => {
  const insertion = base
    .prepare(
      `INSERT INTO lignes_facture
         (facture_id, designation, quantite_milliemes, pu_ht_centimes,
          montant_ht_brut_centimes, montant_ht_remise_centimes, montant_ht_net_centimes, type_ligne)
       VALUES (?, ?, 1000, 10000, 10000, 10000, ?, ?)`,
    )
    .run(factureId, designation, saisi.netCentimes ?? 10000, saisi.typeLigne ?? null)
  return Number(insertion.lastInsertRowid)
}

const renseignerContexte = (base: Base, motif: string | null, ecartCentimes: number | null): void => {
  base
    .prepare('INSERT INTO contexte_audit (id, motif, ecart_centimes) VALUES (1, ?, ?)')
    .run(motif, ecartCentimes)
}

const viderContexte = (base: Base): void => {
  base.prepare('DELETE FROM contexte_audit').run()
}

interface Colonne {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
}

const colonnesDe = (base: Base, table: string): Colonne[] =>
  base.prepare('SELECT name, type, "notnull", dflt_value FROM pragma_table_info(?)').all(table) as Colonne[]

const nomColonnes = (base: Base, table: string): string[] => colonnesDe(base, table).map((colonne) => colonne.name)

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

describe('Migration 3 — ajustement d’arrondi (type_ligne, journal_audit, contexte_audit)', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  it('applique les migrations 1, 2 puis 3 et passe user_version à 3', () => {
    const base = obtenirBase()
    expect(base.pragma('user_version', { simple: true })).toBe(3)
    const historique = base.prepare('SELECT version, nom FROM migrations_history ORDER BY version').all()
    expect(historique).toEqual([
      { version: 1, nom: 'schema-initial-j0' },
      { version: 2, nom: '002_rabais-marche-et-encaissements' },
      { version: 3, nom: '003_ajustement-arrondi-lignes' },
    ])
  })

  it('est idempotente au niveau du runner : rien ne se ré-exécute', () => {
    appliquerMigrations(obtenirBase())
    const base = obtenirBase()
    expect(base.pragma('user_version', { simple: true })).toBe(3)
    const nombre = base.prepare('SELECT COUNT(*) AS n FROM migrations_history').get() as { n: number }
    expect(nombre.n).toBe(3)
  })

  it('ajoute la colonne type_ligne sur lignes_facture (NULL ou AJUSTEMENT_ARRONDI uniquement)', () => {
    const base = obtenirBase()
    const colonnes = colonnesDe(base, 'lignes_facture')
    const colonne = colonnes.find((c) => c.name === 'type_ligne')
    expect(colonne).toMatchObject({ name: 'type_ligne', type: 'TEXT', notnull: 0, dflt_value: null })

    const factureId = creerFacture(base)

    const idNormale = insererLigne(base, factureId, 'Ligne normale', { typeLigne: null })
    expect(idNormale).toBeGreaterThan(0)

    const idAjustement = insererLigne(base, factureId, 'Ligne ajustement', { typeLigne: 'AJUSTEMENT_ARRONDI' })
    expect(idAjustement).toBeGreaterThan(0)

    expect(() => insererLigne(base, factureId, 'Ligne invalide', { typeLigne: 'AUTRE' })).toThrow(/CHECK/)
  })

  it('ajoute motif (TEXT) et ecart_centimes (INTEGER) sur journal_audit, sans défaut', () => {
    const base = obtenirBase()
    const colonnes = colonnesDe(base, 'journal_audit')
    const motif = colonnes.find((c) => c.name === 'motif')
    expect(motif).toMatchObject({ name: 'motif', type: 'TEXT', notnull: 0, dflt_value: null })
    const ecart = colonnes.find((c) => c.name === 'ecart_centimes')
    expect(ecart).toMatchObject({ name: 'ecart_centimes', type: 'INTEGER', notnull: 0, dflt_value: null })
  })

  it('crée la table contexte_audit avec une unique ligne id = 1 (CHECK)', () => {
    const base = obtenirBase()
    expect(nomColonnes(base, 'contexte_audit')).toEqual(['id', 'motif', 'ecart_centimes'])
    for (const colonne of colonnesDe(base, 'contexte_audit')) {
      expect(colonne.type.toUpperCase()).not.toBe('REAL')
    }

    renseignerContexte(base, MOTIF_AJUSTEMENT, 2)
    expect(() => renseignerContexte(base, 'second', 1)).toThrow(/UNIQUE/)
    expect(() => base.prepare('INSERT INTO contexte_audit (id, motif) VALUES (2, ?)').run('hors')).toThrow(/CHECK/)
    viderContexte(base)
  })

  it('journalise l’INSERT d’une ligne normale sans contexte : motif NULL, écart NULL, JSON complet', () => {
    const base = obtenirBase()
    viderContexte(base)
    const factureId = creerFacture(base)
    const idLigne = insererLigne(base, factureId, 'Prestation normale', { netCentimes: 123456 })

    const audits = lireAudits(base, idLigne)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ action: 'INSERT', motif: null, ecart_centimes: null })
    const nouvelEtat = etatsJson(audits[0].nouvel_etat)
    expect(nouvelEtat).toMatchObject({
      facture_id: factureId,
      designation: 'Prestation normale',
      montant_ht_net_centimes: 123456,
      type_ligne: null,
    })
    expect(nouvelEtat).toHaveProperty('cree_le')
    expect(etatsJson(audits[0].ancien_etat)).toBeNull()
  })

  it('journalise l’INSERT d’une ligne AJUSTEMENT_ARRONDI avec contexte : motif et écart corrects', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base)
    renseignerContexte(base, MOTIF_AJUSTEMENT, 2)

    const idLigne = insererLigne(base, factureId, 'Ajustement d’arrondi', {
      typeLigne: 'AJUSTEMENT_ARRONDI',
      netCentimes: 2,
    })
    const audits = lireAudits(base, idLigne)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'INSERT',
      motif: MOTIF_AJUSTEMENT,
      ecart_centimes: 2,
    })
    const nouvelEtat = etatsJson(audits[0].nouvel_etat)
    expect(nouvelEtat).toMatchObject({ type_ligne: 'AJUSTEMENT_ARRONDI', montant_ht_net_centimes: 2 })
    viderContexte(base)
  })

  it('INSERT avec contexte motif seul : l’écart est dérivé du net de la ligne', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base)
    renseignerContexte(base, MOTIF_AJUSTEMENT, null)

    const idLigne = insererLigne(base, factureId, 'Ajustement dérivé', {
      typeLigne: 'AJUSTEMENT_ARRONDI',
      netCentimes: 5,
    })
    const audits = lireAudits(base, idLigne)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({
      action: 'INSERT',
      motif: MOTIF_AJUSTEMENT,
      ecart_centimes: 5,
    })
    viderContexte(base)
  })

  it('contexte_audit vide : l’INSERT reste audité sans motif', () => {
    const base = obtenirBase()
    viderContexte(base)
    const factureId = creerFacture(base)
    const idLigne = insererLigne(base, factureId, 'Ligne sans contexte')

    const audits = lireAudits(base, idLigne)
    expect(audits).toHaveLength(1)
    expect(audits[0]).toMatchObject({ action: 'INSERT', motif: null, ecart_centimes: null })
  })

  it('journalise l’UPDATE avec contexte : motif, écart = delta net, ancien/nouvel états JSON complets', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base)
    const idLigne = insererLigne(base, factureId, 'Ligne marchée', { netCentimes: 100 })
    viderContexte(base)

    renseignerContexte(base, MOTIF_AJUSTEMENT, 2)
    base
      .prepare('UPDATE lignes_facture SET montant_ht_net_centimes = 102 WHERE id = ?')
      .run(idLigne)

    const audits = lireAudits(base, idLigne)
    expect(audits.map((audit) => audit.action)).toEqual(['INSERT', 'UPDATE'])
    const miseAJour = audits[1]
    expect(miseAJour).toMatchObject({
      action: 'UPDATE',
      motif: MOTIF_AJUSTEMENT,
      ecart_centimes: 2,
    })
    const ancienEtat = etatsJson(miseAJour.ancien_etat)
    const nouvelEtat = etatsJson(miseAJour.nouvel_etat)
    expect(ancienEtat).toMatchObject({ designation: 'Ligne marchée', montant_ht_net_centimes: 100 })
    expect(nouvelEtat).toMatchObject({ designation: 'Ligne marchée', montant_ht_net_centimes: 102 })
    expect(ancienEtat).toHaveProperty('type_ligne')
    expect(nouvelEtat).toHaveProperty('type_ligne')
    viderContexte(base)
  })

  it('journalise l’UPDATE sans contexte : motif NULL, écart = delta net', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base)
    const idLigne = insererLigne(base, factureId, 'Ligne simple', { netCentimes: 1000 })
    viderContexte(base)

    base
      .prepare('UPDATE lignes_facture SET designation = ?, montant_ht_net_centimes = 1003 WHERE id = ?')
      .run('Ligne simple modifiée', idLigne)

    const audits = lireAudits(base, idLigne)
    const miseAJour = audits[audits.length - 1]
    expect(miseAJour).toMatchObject({ action: 'UPDATE', motif: null, ecart_centimes: 3 })
  })

  it('journalise le DELETE : ancien_etat complet, motif du contexte sinon NULL, écart NULL', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base)
    const idLigne = insererLigne(base, factureId, 'Ligne à supprimer', { netCentimes: 777 })
    viderContexte(base)

    renseignerContexte(base, MOTIF_AJUSTEMENT, 7)
    base.prepare('DELETE FROM lignes_facture WHERE id = ?').run(idLigne)

    const audits = lireAudits(base, idLigne)
    const suppression = audits[audits.length - 1]
    expect(suppression).toMatchObject({
      action: 'DELETE',
      motif: MOTIF_AJUSTEMENT,
      ecart_centimes: null,
    })
    expect(etatsJson(suppression.ancien_etat)).toMatchObject({
      designation: 'Ligne à supprimer',
      montant_ht_net_centimes: 777,
    })
    expect(etatsJson(suppression.nouvel_etat)).toBeNull()
    viderContexte(base)

    const idLigneSimple = insererLigne(base, factureId, 'Ligne simple')
    base.prepare('DELETE FROM lignes_facture WHERE id = ?').run(idLigneSimple)
    const auditsSimple = lireAudits(base, idLigneSimple)
    expect(auditsSimple[auditsSimple.length - 1]).toMatchObject({
      action: 'DELETE',
      motif: null,
      ecart_centimes: null,
    })
  })

  it('conserve les triggers d’audit existants : factures et encaissements', () => {
    const base = obtenirBase()
    const idClient = (base
      .prepare(
        `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
         VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
      )
      .run('CLI-M3-AUDIT', 'Client Audit Existant').lastInsertRowid) as number
    const insertionFacture = base
      .prepare(
        `INSERT INTO factures (type_document, date_facture, client_id, net_a_payer_centimes)
         VALUES ('FA', '2026-08-15', ?, 100000)`,
      )
      .run(idClient)
    const idFacture = Number(insertionFacture.lastInsertRowid)

    const auditFacture = base
      .prepare("SELECT action FROM journal_audit WHERE table_affectee = 'factures' AND ligne_id = ?")
      .all(idFacture) as { action: string }[]
    expect(auditFacture.map((ligne) => ligne.action)).toEqual(['INSERT'])

    compteurEncaissement += 1
    const numero = `ENC-M3-${String(compteurEncaissement).padStart(5, '0')}`
    const insertionEncaissement = base
      .prepare(
        `INSERT INTO encaissements (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif)
         VALUES (?, ?, 100000, '2026-08-15', 'CHEQUE')`,
      )
      .run(idFacture, numero)
    const idEncaissement = Number(insertionEncaissement.lastInsertRowid)

    const auditEncaissement = base
      .prepare("SELECT action FROM journal_audit WHERE table_affectee = 'encaissements' AND ligne_id = ?")
      .all(idEncaissement) as { action: string }[]
    expect(auditEncaissement.map((ligne) => ligne.action)).toEqual(['INSERT'])
    const ligneAudit = base
      .prepare('SELECT motif, ecart_centimes FROM journal_audit WHERE table_affectee = ? AND ligne_id = ?')
      .get('encaissements', idEncaissement) as { motif: string | null; ecart_centimes: number | null }
    expect(ligneAudit).toEqual({ motif: null, ecart_centimes: null })
  })
})
