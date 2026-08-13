import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3-multiple-ciphers'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { insererSeeds, SEUIL_ESPECES_CENTIMES, SEUIL_ESPECES_CLE } from '../electron/db/seeds'

const CLE_VALIDE = 'clé-de-test-integration-egto-j1'
const CHEMIN_ESSAI = join(tmpdir(), `egto-base-integration-${randomUUID()}.db`)

const nettoyerFichiers = (chemin: string): void => {
  for (const suffixe of ['', '-wal', '-shm']) {
    const fichier = `${chemin}${suffixe}`
    if (existsSync(fichier)) {
      rmSync(fichier)
    }
  }
}

describe('Base chiffrée EGTO — connexion, migrations, schéma, seeds', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
    insererSeeds(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  it('exécute la migration 1 et l’enregistre dans migrations_history', () => {
    const base = obtenirBase()
    expect(base.pragma('user_version', { simple: true })).toBe(1)
    const historique = base.prepare('SELECT version, nom FROM migrations_history ORDER BY version').all()
    expect(historique).toEqual([{ version: 1, nom: 'schema-initial-j0' }])
  })

  it('est idempotente : une base à jour ne ré-exécute rien', () => {
    appliquerMigrations(obtenirBase())
    const base = obtenirBase()
    expect(base.pragma('user_version', { simple: true })).toBe(1)
    const nombre = base.prepare('SELECT COUNT(*) AS n FROM migrations_history').get() as { n: number }
    expect(nombre.n).toBe(1)
  })

  it('crée les 29 tables du schéma J0', () => {
    const tables = obtenirBase()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[]
    expect(tables).toHaveLength(29)
  })

  it('ne contient aucune colonne REAL', () => {
    const base = obtenirBase()
    const tables = base
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
    const requeteColonnes = base.prepare('SELECT type FROM pragma_table_info(?)')
    for (const table of tables) {
      const colonnes = requeteColonnes.all(table.name) as { type: string }[]
      for (const colonne of colonnes) {
        expect(colonne.type.toUpperCase()).not.toBe('REAL')
      }
    }
  })

  it('installe les 18 triggers d’audit', () => {
    const triggers = obtenirBase()
      .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name")
      .all() as { name: string }[]
    expect(triggers).toHaveLength(18)
    const noms = triggers.map((trigger) => trigger.name)
    for (const attendu of [
      'trg_clients_audit_insert',
      'trg_clients_audit_update',
      'trg_clients_audit_delete',
      'trg_factures_audit_insert',
      'trg_bons_livraison_audit_delete',
    ]) {
      expect(noms).toContain(attendu)
    }
  })

  it('active le mode WAL et les clés étrangères', () => {
    const base = obtenirBase()
    expect(base.pragma('journal_mode', { simple: true })).toBe('wal')
    expect(base.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('alimente journal_audit sur INSERT/UPDATE/DELETE de clients', () => {
    const base = obtenirBase()
    const insertion = base
      .prepare(
        `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
         VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
      )
      .run('CLI-2026-00001', 'Entreprise Test')
    const idClient = Number(insertion.lastInsertRowid)

    base.prepare('UPDATE clients SET raison_sociale = ? WHERE id = ?').run('Entreprise Test Modifiée', idClient)
    base.prepare('DELETE FROM clients WHERE id = ?').run(idClient)

    const compterLignes = (action: string): number =>
      (base
        .prepare(
          "SELECT COUNT(*) AS n FROM journal_audit WHERE table_affectee = 'clients' AND action = ? AND ligne_id = ?",
        )
        .get(action, idClient) as { n: number }).n

    expect(compterLignes('INSERT')).toBe(1)
    expect(compterLignes('UPDATE')).toBe(1)
    expect(compterLignes('DELETE')).toBe(1)
  })

  it('ré-exécute les seeds sans créer de doublons', () => {
    insererSeeds(obtenirBase())
    const base = obtenirBase()
    expect(base.prepare('SELECT COUNT(*) AS n FROM familles').get() as { n: number }).toEqual({ n: 4 })
    expect(base.prepare('SELECT COUNT(*) AS n FROM exercices').get() as { n: number }).toEqual({ n: 1 })
    expect(base.prepare('SELECT COUNT(*) AS n FROM bareme_timbre').get() as { n: number }).toEqual({ n: 4 })
  })

  it('insère les seeds : familles, exercice 2026, barème du timbre, seuil espèces', () => {
    const base = obtenirBase()

    const familles = base.prepare('SELECT code, libelle, ordre, statut FROM familles ORDER BY ordre').all() as {
      code: string
      libelle: string
      ordre: number
      statut: string
    }[]
    expect(familles).toHaveLength(4)
    expect(familles.map((famille) => famille.code)).toEqual(['VTE', 'LOC', 'REA', 'ST'])
    expect(familles.map((famille) => famille.ordre)).toEqual([1, 2, 3, 4])
    expect(familles.map((famille) => famille.statut)).toEqual(['ACTIF', 'ACTIF', 'ACTIF', 'ACTIF'])

    const exercice = base
      .prepare('SELECT annee, date_debut, date_fin, statut FROM exercices WHERE annee = 2026')
      .get() as { annee: number; date_debut: string; date_fin: string; statut: string }
    expect(exercice).toEqual({ annee: 2026, date_debut: '2026-01-01', date_fin: '2026-12-31', statut: 'OUVERT' })

    const tranches = base
      .prepare(
        `SELECT borne_min_ttc_centimes AS borneMin, borne_max_ttc_centimes AS borneMax, taux_bps AS taux,
                plancher_centimes AS plancher, plafond_centimes AS plafond, actif
         FROM bareme_timbre ORDER BY borne_min_ttc_centimes`,
      )
      .all() as {
      borneMin: number
      borneMax: number | null
      taux: number
      plancher: number
      plafond: number
      actif: number
    }[]
    expect(tranches).toHaveLength(4)
    expect(
      tranches.map((tranche) => [
        tranche.borneMin,
        tranche.borneMax,
        tranche.taux,
        tranche.plancher,
        tranche.plafond,
        tranche.actif,
      ]),
    ).toEqual([
      [0, 30000, 0, 500, 1000000, 1],
      [30000, 3000000, 100, 500, 1000000, 1],
      [3000000, 10000000, 150, 500, 1000000, 1],
      [10000000, null, 200, 500, 1000000, 1],
    ])

    const seuil = base.prepare('SELECT valeur FROM parametres WHERE cle = ?').get(SEUIL_ESPECES_CLE) as {
      valeur: string
    }
    expect(seuil.valeur).toBe(SEUIL_ESPECES_CENTIMES)

    const parametresEntreprise = base.prepare("SELECT cle FROM parametres WHERE cle LIKE 'entreprise.%'").all() as {
      cle: string
    }[]
    expect(parametresEntreprise).toHaveLength(11)
  })

  it('refuse une base plus récente que le binaire sans rien écrire', () => {
    const chemin = join(tmpdir(), `egto-plus-recente-${randomUUID()}.db`)
    const ouvrir = (cle: string): Base => {
      const base = new Database(chemin)
      base.pragma("cipher='sqlcipher'")
      base.pragma('legacy=0')
      base.pragma(`key='${cle}'`)
      return base
    }

    let base = ouvrir(CLE_VALIDE)
    base.exec('CREATE TABLE essai_plus_recente (id INTEGER PRIMARY KEY)')
    base.pragma('user_version = 2')
    base.close()

    base = ouvrir(CLE_VALIDE)
    expect(() => appliquerMigrations(base)).toThrow(/plus récente/)
    expect(base.pragma('user_version', { simple: true })).toBe(2)
    const table = base
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'essai_plus_recente'")
      .get() as { n: number }
    expect(table.n).toBe(1)
    base.close()
    nettoyerFichiers(chemin)
  })

  it('rend la base illisible par un client sans la clé (DoD J1)', () => {
    fermerBase()
    expect(() => ouvrirBase(CHEMIN_ESSAI, 'clé-incorrecte')).toThrow(/file is not a database/i)
    fermerBase()
  })
})
