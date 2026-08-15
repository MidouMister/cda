import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, obtenirBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'

const CLE_VALIDE = 'clé-de-test-migration-2-egto'
const CHEMIN_ESSAI = join(tmpdir(), `egto-migration-2-${randomUUID()}.db`)

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

const creerFacture = (base: Base, montantDuCentimes: number): number => {
  compteurClient += 1
  const insertionClient = base
    .prepare(
      `INSERT INTO clients (code_client, type_client, raison_sociale, categorie, statut)
       VALUES (?, 'SARL', ?, 'PRIVE', 'ACTIF')`,
    )
    .run(`CLI-M2-${compteurClient}`, `Client Migration 2 n°${compteurClient}`)
  const idClient = Number(insertionClient.lastInsertRowid)
  const insertionFacture = base
    .prepare(
      `INSERT INTO factures (type_document, date_facture, client_id, net_a_payer_centimes)
       VALUES ('FA', '2026-08-15', ?, ?)`,
    )
    .run(idClient, montantDuCentimes)
  return Number(insertionFacture.lastInsertRowid)
}

interface EncaissementSaisi {
  mode?: string
  date?: string
  timbreStatut?: string | null
  montantTimbre?: number | null
  referenceTimbre?: string | null
  timbreTraiteLe?: string | null
  timbreTraitePar?: string | null
}

const insererEncaissement = (
  base: Base,
  factureId: number,
  numero: string,
  montant: number,
  saisi: EncaissementSaisi = {},
): void => {
  base
    .prepare(
      `INSERT INTO encaissements
         (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif,
          timbre_statut, montant_timbre_saisi_centimes, reference_timbre_ou_quittance,
          timbre_traite_le, timbre_traite_par)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      factureId,
      numero,
      montant,
      saisi.date ?? '2026-08-15',
      saisi.mode ?? 'CHEQUE',
      saisi.timbreStatut ?? 'A_VERIFIER',
      saisi.montantTimbre ?? null,
      saisi.referenceTimbre ?? null,
      saisi.timbreTraiteLe ?? null,
      saisi.timbreTraitePar ?? null,
    )
}

const prochainNumero = (): string => {
  compteurEncaissement += 1
  return `ENC-2026-${String(compteurEncaissement).padStart(5, '0')}`
}

const colonnesDe = (
  base: Base,
  table: string,
): { name: string; type: string; notnull: number; dflt_value: string | null }[] =>
  base.prepare('SELECT name, type, "notnull", dflt_value FROM pragma_table_info(?)').all(table) as {
    name: string
    type: string
    notnull: number
    dflt_value: string | null
  }[]

const nomColonnes = (base: Base, table: string): string[] => colonnesDe(base, table).map((colonne) => colonne.name)

describe('Migration 2 — rabais marché ligne par ligne + encaissements', () => {
  beforeAll(() => {
    ouvrirBase(CHEMIN_ESSAI, CLE_VALIDE)
    appliquerMigrations(obtenirBase())
  })

  afterAll(() => {
    fermerBase()
    nettoyerFichiers(CHEMIN_ESSAI)
  })

  it('applique les migrations 1 puis 2 puis 3 et passe user_version à 3', () => {
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

  it('ajoute la colonne rabais_marche_bps sur affaires', () => {
    const colonnes = colonnesDe(obtenirBase(), 'affaires')
    const colonne = colonnes.find((c) => c.name === 'rabais_marche_bps')
    expect(colonne).toMatchObject({ name: 'rabais_marche_bps', type: 'INTEGER', notnull: 1, dflt_value: '0' })
  })

  it('ajoute les colonnes rabais marché et net sur lignes_facture', () => {
    const colonnes = colonnesDe(obtenirBase(), 'lignes_facture')
    for (const attendu of ['rabais_marche_bps', 'montant_rabais_marche_centimes', 'montant_ht_net_centimes']) {
      const colonne = colonnes.find((c) => c.name === attendu)
      expect(colonne, `colonne ${attendu} présente`).toBeDefined()
      expect(colonne).toMatchObject({ type: 'INTEGER', notnull: 1, dflt_value: '0' })
    }
  })

  it('crée la table encaissements avec ses colonnes (aucune REAL)', () => {
    const base = obtenirBase()
    const colonnes = colonnesDe(base, 'encaissements')
    const attendues = [
      'id',
      'cree_le',
      'modifie_le',
      'supprime_le',
      'facture_id',
      'numero',
      'montant_encaisse_centimes',
      'date_encaissement',
      'mode_reglement_effectif',
      'timbre_statut',
      'montant_timbre_saisi_centimes',
      'timbre_traite_le',
      'timbre_traite_par',
      'reference_timbre_ou_quittance',
      'commentaire_timbre',
    ]
    expect(nomColonnes(base, 'encaissements')).toEqual(attendues)
    for (const colonne of colonnes) {
      expect(colonne.type.toUpperCase()).not.toBe('REAL')
    }
    const obligatoires = ['facture_id', 'numero', 'montant_encaisse_centimes', 'date_encaissement', 'mode_reglement_effectif']
    for (const nom of obligatoires) {
      expect(colonnes.find((colonne) => colonne.name === nom)?.notnull).toBe(1)
    }
  })

  it('rejette un montant encaissé nul ou négatif', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 100000)
    expect(() => insererEncaissement(base, factureId, prochainNumero(), 0)).toThrow(/CHECK/)
    expect(() => insererEncaissement(base, factureId, prochainNumero(), -5)).toThrow(/CHECK/)
  })

  it('accepte uniquement les 4 modes de règlement autorisés', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    for (const mode of ['ESPECES', 'CHEQUE', 'VIREMENT_BANCAIRE', 'DEPOT_ESPECES_BANQUE']) {
      expect(() => insererEncaissement(base, factureId, prochainNumero(), 100000, { mode })).not.toThrow()
    }
    for (const mode of ['VIREMENT', 'TRAITE', 'LCN']) {
      expect(() => insererEncaissement(base, factureId, prochainNumero(), 100000, { mode })).toThrow(/CHECK/)
    }
  })

  it('applique les contraintes conditionnelles du statut timbre', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)

    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, { timbreStatut: 'NON_APPLICABLE' }),
    ).not.toThrow()
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'NON_APPLICABLE',
        montantTimbre: 500,
      }),
    ).toThrow(/CHECK/)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'NON_APPLICABLE',
        referenceTimbre: 'QUIT-2026-0001',
      }),
    ).toThrow(/CHECK/)

    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, { timbreStatut: 'TRAITE' }),
    ).toThrow(/CHECK/)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'TRAITE',
        montantTimbre: 500,
      }),
    ).toThrow(/CHECK/)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'TRAITE',
        montantTimbre: 500,
        timbreTraiteLe: '2026-08-16',
        timbreTraitePar: 'Sami',
      }),
    ).not.toThrow()

    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, { timbreStatut: 'A_VERIFIER' }),
    ).not.toThrow()
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'A_VERIFIER',
        montantTimbre: 500,
      }),
    ).not.toThrow()
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'A_VERIFIER',
        montantTimbre: 0,
      }),
    ).toThrow(/CHECK/)
  })

  it('applique le défaut A_VERIFIER quand timbre_statut est omis (helper et INSERT direct)', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)

    const numeroHelper = prochainNumero()
    insererEncaissement(base, factureId, numeroHelper, 100000)
    const ligneHelper = base
      .prepare('SELECT timbre_statut FROM encaissements WHERE numero = ?')
      .get(numeroHelper) as { timbre_statut: string }
    expect(ligneHelper.timbre_statut).toBe('A_VERIFIER')

    const numeroDirect = prochainNumero()
    base
      .prepare(
        `INSERT INTO encaissements (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif)
         VALUES (?, ?, 100000, '2026-08-15', 'CHEQUE')`,
      )
      .run(factureId, numeroDirect)
    const ligneDirect = base
      .prepare('SELECT timbre_statut FROM encaissements WHERE numero = ?')
      .get(numeroDirect) as { timbre_statut: string }
    expect(ligneDirect.timbre_statut).toBe('A_VERIFIER')
  })

  it('rejette un timbre_statut explicitement NULL (NOT NULL)', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    expect(() =>
      base
        .prepare(
          `INSERT INTO encaissements
             (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif, timbre_statut)
           VALUES (?, ?, 100000, '2026-08-15', 'CHEQUE', NULL)`,
        )
        .run(factureId, prochainNumero()),
    ).toThrow(/NOT NULL|CHECK/)
  })

  it('rejette NON_APPLICABLE avec une date ou un responsable de traitement', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'NON_APPLICABLE',
        timbreTraiteLe: '2026-08-16',
      }),
    ).toThrow(/CHECK/)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'NON_APPLICABLE',
        timbreTraitePar: 'Sami',
      }),
    ).toThrow(/CHECK/)
  })

  it('rejette A_VERIFIER avec une date ou un responsable de traitement', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'A_VERIFIER',
        timbreTraiteLe: '2026-08-16',
      }),
    ).toThrow(/CHECK/)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'A_VERIFIER',
        timbreTraitePar: 'Sami',
      }),
    ).toThrow(/CHECK/)
  })

  it('accepte TRAITE complet avec ou sans référence de quittance (référence facultative)', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'TRAITE',
        montantTimbre: 500,
        timbreTraiteLe: '2026-08-16',
        timbreTraitePar: 'Sami',
        referenceTimbre: 'QUIT-2026-0001',
      }),
    ).not.toThrow()
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'TRAITE',
        montantTimbre: 500,
        timbreTraiteLe: '2026-08-16',
        timbreTraitePar: 'Sami',
      }),
    ).not.toThrow()
  })

  it('rejette A_VERIFIER avec un montant de timbre nul (zéro)', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, {
        timbreStatut: 'A_VERIFIER',
        montantTimbre: 0,
      }),
    ).toThrow(/CHECK/)
  })

  it('accepte une date ISO AAAA-MM-JJ et rejette les autres formats', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, { date: '2026-08-15' }),
    ).not.toThrow()
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, { date: '15/08/2026' }),
    ).toThrow(/CHECK/)
    expect(() =>
      insererEncaissement(base, factureId, prochainNumero(), 100000, { date: '2026-8-5' }),
    ).toThrow(/CHECK/)
  })

  it('alimente journal_audit sur INSERT/UPDATE/DELETE des encaissements', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    const numero = prochainNumero()
    const insertion = base
      .prepare(
        `INSERT INTO encaissements (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif)
         VALUES (?, ?, 100000, '2026-08-15', 'CHEQUE')`,
      )
      .run(factureId, numero)
    const idEncaissement = Number(insertion.lastInsertRowid)

    base
      .prepare('UPDATE encaissements SET commentaire_timbre = ? WHERE id = ?')
      .run('Encaissement vérifié', idEncaissement)
    base.prepare('DELETE FROM encaissements WHERE id = ?').run(idEncaissement)

    const actions = (
      base
        .prepare(
          "SELECT action FROM journal_audit WHERE table_affectee = 'encaissements' AND ligne_id = ? ORDER BY id",
        )
        .all(idEncaissement) as { action: string }[]
    ).map((ligne) => ligne.action)
    expect(actions).toEqual(['INSERT', 'UPDATE', 'DELETE'])
  })

  it('interdit un encaissement qui dépasse le montant dû de la facture', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 100000)
    expect(() => insererEncaissement(base, factureId, prochainNumero(), 100000)).not.toThrow()
    expect(() => insererEncaissement(base, factureId, prochainNumero(), 1)).toThrow(/dépassement/)
  })

  it('permet d’encaisser exactement le montant dû et interdit de le dépasser par cumul', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 100000)
    const premier = prochainNumero()
    const second = prochainNumero()
    expect(() => insererEncaissement(base, factureId, premier, 60000)).not.toThrow()
    expect(() => insererEncaissement(base, factureId, second, 40000)).not.toThrow()
    const somme = base
      .prepare(
        'SELECT COALESCE(SUM(montant_encaisse_centimes), 0) AS n FROM encaissements WHERE facture_id = ? AND supprime_le IS NULL',
      )
      .get(factureId) as { n: number }
    expect(somme.n).toBe(100000)
  })

  it('interdit une mise à jour qui dépasserait le montant dû', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 100000)
    const insertion = base
      .prepare(
        `INSERT INTO encaissements (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif)
         VALUES (?, ?, 30000, '2026-08-15', 'CHEQUE')`,
      )
      .run(factureId, prochainNumero())
    const idEncaissement = Number(insertion.lastInsertRowid)
    expect(() => insererEncaissement(base, factureId, prochainNumero(), 60000)).not.toThrow()

    expect(() =>
      base
        .prepare('UPDATE encaissements SET montant_encaisse_centimes = 50000 WHERE id = ?')
        .run(idEncaissement),
    ).toThrow(/dépassement/)

    base.prepare('UPDATE encaissements SET montant_encaisse_centimes = 40000 WHERE id = ?').run(idEncaissement)
    const somme = base
      .prepare(
        'SELECT COALESCE(SUM(montant_encaisse_centimes), 0) AS n FROM encaissements WHERE facture_id = ? AND supprime_le IS NULL',
      )
      .get(factureId) as { n: number }
    expect(somme.n).toBe(100000)
  })

  it('impose l’unicité partielle du numéro sur les encaissements actifs', () => {
    const base = obtenirBase()
    const factureId = creerFacture(base, 1000000000000)
    const numero = prochainNumero()
    const insertion = base
      .prepare(
        `INSERT INTO encaissements (facture_id, numero, montant_encaisse_centimes, date_encaissement, mode_reglement_effectif)
         VALUES (?, ?, 100000, '2026-08-15', 'CHEQUE')`,
      )
      .run(factureId, numero)
    const idEncaissement = Number(insertion.lastInsertRowid)

    expect(() => insererEncaissement(base, factureId, numero, 100000)).toThrow(/UNIQUE/)

    base.prepare('UPDATE encaissements SET supprime_le = datetime(\'now\') WHERE id = ?').run(idEncaissement)
    expect(() => insererEncaissement(base, factureId, numero, 100000)).not.toThrow()
  })
})
