import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { fermerBase, ouvrirBase, type Base } from '../electron/db/connexion'
import { appliquerMigrations } from '../electron/db/migrations'
import { correspondreColonnes, nettoyerValeur, lireExcel } from '../electron/excel/lecteur-excel'
import {
  validerLigneClient,
  validerLigneProduit,
  detecterDoublons,
  executerImport,
  type DefinitionImport,
} from '../electron/import/moteur-import'
import { creerClient } from '../electron/depots/depot-clients'
import { creerProduit } from '../electron/depots/depot-produits'

const CLE_VALIDE = 'clé-de-test-import-egto'
const DOSSIER_ESSAI = join(tmpdir(), `egto-import-${randomUUID()}`)

const nettoyerDossier = (chemin: string): void => {
  if (existsSync(chemin)) {
    rmSync(chemin, { recursive: true })
  }
}

const creerFeuilleExcel = async (
  entetes: string[],
  donnees: (string | number | null)[][],
  chemin: string,
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  const feuille = workbook.addWorksheet('Import')
  feuille.addRow(entetes)
  for (const ligne of donnees) {
    feuille.addRow(ligne)
  }
  await workbook.xlsx.writeFile(chemin)
}

beforeAll(() => {
  if (!existsSync(DOSSIER_ESSAI)) {
    mkdirSync(DOSSIER_ESSAI, { recursive: true })
  }
})

afterAll(() => {
  nettoyerDossier(DOSSIER_ESSAI)
})

describe('correspondreColonnes', () => {
  it('trouve une correspondance exacte', () => {
    const resultat = correspondreColonnes(['code_client', 'raison_sociale'], ['code_client', 'raison_sociale'])
    expect(resultat.size).toBe(2)
    expect(resultat.get('code_client')).toBe('code_client')
    expect(resultat.get('raison_sociale')).toBe('raison_sociale')
  })

  it('trouve une correspondance partielle (sous-chaîne)', () => {
    const resultat = correspondreColonnes(['Code Client', 'Raison Sociale Complète'], ['code_client', 'raison_sociale'])
    expect(resultat.size).toBe(2)
    expect(resultat.get('Code Client')).toBe('code_client')
    expect(resultat.get('Raison Sociale Complète')).toBe('raison_sociale')
  })

  it('ne trouve aucune correspondance pour un entête inconnu', () => {
    const resultat = correspondreColonnes(['champ_inconnu', 'autre_champ'], ['code_client'])
    expect(resultat.size).toBe(0)
  })

  it('gère la casse insensible', () => {
    const resultat = correspondreColonnes(['CODE_CLIENT', 'RAISON_SOCIALE'], ['code_client', 'raison_sociale'])
    expect(resultat.size).toBe(2)
  })

  it('gère les accents et caractères spéciaux', () => {
    const resultat = correspondreColonnes(['raïson sociale', 'code cliënt'], ['raison_sociale', 'code_client'])
    expect(resultat.size).toBe(2)
  })

  it('retourne un Map vide pour des listes vides', () => {
    const resultat = correspondreColonnes([], [])
    expect(resultat.size).toBe(0)
  })
})

describe('nettoyerValeur', () => {
  it('nettoie une valeur texte', () => {
    expect(nettoyerValeur<string>('  Bonjour  ', 'texte')).toBe('Bonjour')
  })

  it('retourne chaîne vide pour texte null', () => {
    expect(nettoyerValeur<string>(null, 'texte')).toBe('')
  })

  it('nettoie une valeur numérique', () => {
    expect(nettoyerValeur<number>('123.45', 'nombre')).toBe(123.45)
  })

  it('retourne 0 pour nombre NaN', () => {
    expect(nettoyerValeur<number>('abc', 'nombre')).toBe(0)
  })

  it('retourne 0 pour nombre null', () => {
    expect(nettoyerValeur<number>(null, 'nombre')).toBe(0)
  })

  it('nettoie une valeur entière', () => {
    expect(nettoyerValeur<number>('42', 'entier')).toBe(42)
  })

  it('tronque les décimales pour entier', () => {
    expect(nettoyerValeur<number>(42.9, 'entier')).toBe(42)
  })

  it('retourne 0 pour entier NaN', () => {
    expect(nettoyerValeur<number>('xyz', 'entier')).toBe(0)
  })

  it('convertit un numéro de série Excel en date', () => {
    const resultat = nettoyerValeur<string>(44927, 'date')
    expect(resultat).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parse une date ISO string', () => {
    expect(nettoyerValeur<string>('2026-01-15', 'date')).toBe('2026-01-15')
  })

  it('parse une date française JJ/MM/AAAA', () => {
    expect(nettoyerValeur<string>('15/01/2026', 'date')).toBe('2026-01-15')
  })

  it('retourne chaîne vide pour date invalide', () => {
    expect(nettoyerValeur<string>('not-a-date', 'date')).toBe('')
  })

  it('retourne chaîne vide pour date null', () => {
    expect(nettoyerValeur<string>(null, 'date')).toBe('')
  })

  it('nettoie un nombre passé en number', () => {
    expect(nettoyerValeur<number>(42.7, 'nombre')).toBe(42.7)
  })

  it('nettoie un entier passé en number', () => {
    expect(nettoyerValeur<number>(7, 'entier')).toBe(7)
  })
})

describe('validerLigneClient', () => {
  const ligneValide: Record<string, unknown> = {
    code_client: 'CLI-001',
    type_client: 'SARL',
    raison_sociale: 'Entreprise Test',
    categorie: 'PRIVE',
  }

  it('valide une ligne correcte', () => {
    const resultat = validerLigneClient(ligneValide)
    expect(resultat.valide).toBe(true)
    expect(resultat.erreurs).toHaveLength(0)
    expect(resultat.client).not.toBeNull()
    expect(resultat.client?.code_client).toBe('CLI-001')
  })

  it('rejette une ligne sans code_client', () => {
    const resultat = validerLigneClient({ ...ligneValide, code_client: '' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs).toHaveLength(1)
    expect(resultat.erreurs[0].colonne).toBe('code_client')
  })

  it('rejette une ligne sans raison_sociale', () => {
    const resultat = validerLigneClient({ ...ligneValide, raison_sociale: '' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs).toHaveLength(1)
    expect(resultat.erreurs[0].colonne).toBe('raison_sociale')
  })

  it('rejette un type_client invalide', () => {
    const resultat = validerLigneClient({ ...ligneValide, type_client: 'INVALIDE' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.some((e) => e.colonne === 'type_client')).toBe(true)
  })

  it('accepte type_client vide (défaut SARL)', () => {
    const resultat = validerLigneClient({ ...ligneValide, type_client: '' })
    expect(resultat.valide).toBe(true)
    expect(resultat.client?.type_client).toBe('SARL')
  })

  it('rejette un NIF de mauvais format', () => {
    const resultat = validerLigneClient({ ...ligneValide, nif: '123' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.some((e) => e.colonne === 'nif')).toBe(true)
  })

  it('accepte un NIF vide (optionnel)', () => {
    const resultat = validerLigneClient({ ...ligneValide, nif: '' })
    expect(resultat.valide).toBe(true)
    expect(resultat.client?.nif).toBeNull()
  })

  it('accepte un NIF valide à 15 chiffres', () => {
    const resultat = validerLigneClient({ ...ligneValide, nif: '123456789012345' })
    expect(resultat.valide).toBe(true)
    expect(resultat.client?.nif).toBe('123456789012345')
  })

  it('rejette un NIS de mauvais format', () => {
    const resultat = validerLigneClient({ ...ligneValide, nis: 'abc' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.some((e) => e.colonne === 'nis')).toBe(true)
  })

  it('valide plusieurs erreurs à la fois', () => {
    const resultat = validerLigneClient({
      code_client: '',
      raison_sociale: '',
      type_client: 'FAUX',
    })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.length).toBeGreaterThanOrEqual(3)
  })

  it('applique les valeurs par défaut', () => {
    const resultat = validerLigneClient({ code_client: 'CLI-DEF', raison_sociale: 'Défaut' })
    expect(resultat.valide).toBe(true)
    expect(resultat.client?.type_client).toBe('SARL')
    expect(resultat.client?.categorie).toBe('PRIVE')
    expect(resultat.client?.statut).toBe('PROSPECT')
  })
})

describe('validerLigneProduit', () => {
  const ligneValide: Record<string, unknown> = {
    code_produit: 'PRD-001',
    libelle: 'Produit Test',
    famille_id: 1,
  }

  it('valide une ligne correcte', () => {
    const resultat = validerLigneProduit(ligneValide)
    expect(resultat.valide).toBe(true)
    expect(resultat.erreurs).toHaveLength(0)
    expect(resultat.produit).not.toBeNull()
    expect(resultat.produit?.code_produit).toBe('PRD-001')
  })

  it('rejette une ligne sans code_produit', () => {
    const resultat = validerLigneProduit({ ...ligneValide, code_produit: '' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs).toHaveLength(1)
    expect(resultat.erreurs[0].colonne).toBe('code_produit')
  })

  it('rejette une ligne sans libelle', () => {
    const resultat = validerLigneProduit({ ...ligneValide, libelle: '' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs).toHaveLength(1)
    expect(resultat.erreurs[0].colonne).toBe('libelle')
  })

  it('rejette un famille_id invalide', () => {
    const resultat = validerLigneProduit({ ...ligneValide, famille_id: -1 })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.some((e) => e.colonne === 'famille_id')).toBe(true)
  })

  it('rejette un famille_id non numérique', () => {
    const resultat = validerLigneProduit({ ...ligneValide, famille_id: 'abc' })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.some((e) => e.colonne === 'famille_id')).toBe(true)
  })

  it('applique les valeurs par défaut', () => {
    const resultat = validerLigneProduit({ code_produit: 'PRD-DEF', libelle: 'Défaut', famille_id: 1 })
    expect(resultat.valide).toBe(true)
    expect(resultat.produit?.unite).toBe('U')
    expect(resultat.produit?.type_tarification).toBe('FIXE')
    expect(resultat.produit?.pu_reference_centimes).toBe(0)
  })

  it('valide plusieurs erreurs à la fois', () => {
    const resultat = validerLigneProduit({ code_produit: '', libelle: '', famille_id: -5 })
    expect(resultat.valide).toBe(false)
    expect(resultat.erreurs.length).toBeGreaterThanOrEqual(3)
  })
})

describe('detecterDoublons', () => {
  let base: Base

  beforeAll(() => {
    const chemin = join(DOSSIER_ESSAI, `doublons-${randomUUID()}.db`)
    base = ouvrirBase(chemin, CLE_VALIDE)
    appliquerMigrations(base)
  })

  afterAll(() => {
    fermerBase()
  })

  it('détecte un doublon existant en base (CLIENTS)', () => {
    creerClient(base, {
      code_client: 'DUP-EXISTANT',
      type_client: 'SARL',
      raison_sociale: 'Client Doublon',
      categorie: 'PRIVE',
    })

    const lignes = [
      { code_client: 'DUP-EXISTANT', raison_sociale: 'Doublon Import' },
      { code_client: 'DUP-NOUVEAU', raison_sociale: 'Nouveau Client' },
    ]

    const resultat = detecterDoublons(lignes, 'CLIENTS', base)
    expect(resultat.doublons).toBe(1)
    expect(resultat.indicesDoublons.has(0)).toBe(true)
  })

  it('détecte un doublon dans le batch', () => {
    const lignes = [
      { code_client: 'BATCH-001' },
      { code_client: 'BATCH-001' },
      { code_client: 'BATCH-002' },
    ]

    const resultat = detecterDoublons(lignes, 'CLIENTS', base)
    expect(resultat.doublons).toBe(1)
    expect(resultat.indicesDoublons.has(1)).toBe(true)
  })

  it('ne détecte aucun doublon', () => {
    const lignes = [
      { code_client: 'UNIQUE-A' },
      { code_client: 'UNIQUE-B' },
    ]

    const resultat = detecterDoublons(lignes, 'CLIENTS', base)
    expect(resultat.doublons).toBe(0)
  })

  it('détecte un doublon produit existant', () => {
    const familleId = base.prepare("INSERT INTO familles (code, libelle) VALUES ('VTE', 'Vente')").run().lastInsertRowid
    creerProduit(base, {
      code_produit: 'PRD-DUP',
      libelle: 'Produit Doublon',
      famille_id: Number(familleId),
    })

    const lignes = [{ code_produit: 'PRD-DUP' }]
    const resultat = detecterDoublons(lignes, 'PRODUITS', base)
    expect(resultat.doublons).toBe(1)
  })

  it('gère un tableau vide', () => {
    const resultat = detecterDoublons([], 'CLIENTS', base)
    expect(resultat.doublons).toBe(0)
    expect(resultat.indicesDoublons.size).toBe(0)
  })
})

describe('lireExcel', () => {
  it('lit un fichier Excel avec en-têtes et données', async () => {
    const chemin = join(DOSSIER_ESSAI, `lecture-${randomUUID()}.xlsx`)
    await creerFeuilleExcel(
      ['code_client', 'raison_sociale', 'type_client'],
      [
        ['CLI-001', 'Client Premier', 'SARL'],
        ['CLI-002', 'Client Deuxième', 'EURL'],
        ['CLI-003', 'Client Troisième', 'ETP'],
        ['CLI-004', 'Client Quatrième', 'SARL'],
        ['CLI-005', 'Client Cinquième', 'EPE_SPA'],
      ],
      chemin,
    )

    const resultat = await lireExcel(chemin)

    expect(resultat.colonnes).toHaveLength(3)
    expect(resultat.colonnes[0].entete).toBe('code_client')
    expect(resultat.colonnes[1].entete).toBe('raison_sociale')
    expect(resultat.colonnes[2].entete).toBe('type_client')
    expect(resultat.lignes).toHaveLength(5)
    expect(resultat.lignesIgnorees).toBe(0)
    expect(resultat.lignes[0].valeurs.code_client).toBe('CLI-001')
    expect(resultat.lignes[0].valeurs.raison_sociale).toBe('Client Premier')
    expect(resultat.lignes[4].valeurs.code_client).toBe('CLI-005')
  })

  it('retourne un résultat vide pour un fichier sans feuille', async () => {
    const workbook = new ExcelJS.Workbook()
    const chemin = join(DOSSIER_ESSAI, `vide-${randomUUID()}.xlsx`)
    await workbook.xlsx.writeFile(chemin)

    const resultat = await lireExcel(chemin)
    expect(resultat.colonnes).toHaveLength(0)
    expect(resultat.lignes).toHaveLength(0)
  })

  it('lit les numéros de ligne correctement', async () => {
    const chemin = join(DOSSIER_ESSAI, `numeros-${randomUUID()}.xlsx`)
    await creerFeuilleExcel(
      ['code', 'nom'],
      [
        ['A', 'Alpha'],
        ['B', 'Bravo'],
      ],
      chemin,
    )

    const resultat = await lireExcel(chemin)
    expect(resultat.lignes[0].numeroLigne).toBe(2)
    expect(resultat.lignes[1].numeroLigne).toBe(3)
  })
})

describe('executerImport — intégration', () => {
  let base: Base

  beforeAll(() => {
    const chemin = join(DOSSIER_ESSAI, `import-integ-${randomUUID()}.db`)
    base = ouvrirBase(chemin, CLE_VALIDE)
    appliquerMigrations(base)
  })

  afterAll(() => {
    fermerBase()
  })

  it('importe 8 clients sur 10 (2 erreurs de validation)', () => {
    const correspondances = new Map<string, string>([
      ['code_client', 'code_client'],
      ['type_client', 'type_client'],
      ['raison_sociale', 'raison_sociale'],
      ['categorie', 'categorie'],
    ])

    const definition: DefinitionImport = {
      type: 'CLIENTS',
      correspondances,
    }

    const lignes = Array.from({ length: 10 }, (_, i) => ({
      numeroLigne: i + 2,
      valeurs: {
        code_client: i >= 8 ? '' : `IMP-${String(i + 1).padStart(3, '0')}`,
        type_client: 'SARL',
        raison_sociale: i >= 8 ? '' : `Client Import ${i + 1}`,
        categorie: 'PRIVE',
      },
    }))

    const resultat = executerImport(base, definition, lignes, (b, d) =>
      creerClient(b, d as unknown as Parameters<typeof creerClient>[1]),
    )

    expect(resultat.succes).toBe(true)
    expect(resultat.totalLignes).toBe(10)
    expect(resultat.lignesImportees).toBe(8)
    expect(resultat.lignesIgnorees).toBe(2)
    expect(resultat.erreurs).toHaveLength(4)
    expect(resultat.erreurs.filter((e) => e.colonne === 'code_client')).toHaveLength(2)
    expect(resultat.erreurs.filter((e) => e.colonne === 'raison_sociale')).toHaveLength(2)
  })

  it('détecte les doublons lors de l\'import', () => {
    const correspondances = new Map<string, string>([
      ['code_client', 'code_client'],
      ['raison_sociale', 'raison_sociale'],
      ['categorie', 'categorie'],
    ])

    const definition: DefinitionImport = {
      type: 'CLIENTS',
      correspondances,
    }

    const lignes = [
      { numeroLigne: 2, valeurs: { code_client: 'DUP-IMP-NEW-001', raison_sociale: 'Doublon Import', categorie: 'PRIVE' } },
      { numeroLigne: 3, valeurs: { code_client: 'DUP-IMP-NEW-001', raison_sociale: 'Même Code', categorie: 'PRIVE' } },
    ]

    const resultat = executerImport(base, definition, lignes, (b, d) =>
      creerClient(b, d as unknown as Parameters<typeof creerClient>[1]),
    )

    expect(resultat.lignesImportees).toBe(1)
    expect(resultat.lignesIgnorees).toBe(1)
    expect(resultat.erreurs.some((e) => e.erreur.includes('doublon'))).toBe(true)
  })

  it('importe des produits avec succès', () => {
    const familleId = base.prepare("INSERT INTO familles (code, libelle) VALUES ('LOC', 'Location')").run().lastInsertRowid

    const correspondances = new Map<string, string>([
      ['code_produit', 'code_produit'],
      ['libelle', 'libelle'],
      ['famille_id', 'famille_id'],
    ])

    const definition: DefinitionImport = {
      type: 'PRODUITS',
      correspondances,
    }

    const lignes = [
      { numeroLigne: 2, valeurs: { code_produit: 'PRD-IMP-001', libelle: 'Produit Import 1', famille_id: Number(familleId) } },
      { numeroLigne: 3, valeurs: { code_produit: 'PRD-IMP-002', libelle: 'Produit Import 2', famille_id: Number(familleId) } },
    ]

    const resultat = executerImport(base, definition, lignes, (b, d) =>
      creerProduit(b, d as unknown as Parameters<typeof creerProduit>[1]),
    )

    expect(resultat.succes).toBe(true)
    expect(resultat.lignesImportees).toBe(2)
    expect(resultat.lignesIgnorees).toBe(0)
  })
})

describe('executerImport — rollback en cas d\'erreur technique', () => {
  it('arrête l\'import avec succes=false si la base lève une exception', () => {
    const chemin = join(DOSSIER_ESSAI, `import-rollback-${randomUUID()}.db`)
    const baseTest = ouvrirBase(chemin, CLE_VALIDE)
    appliquerMigrations(baseTest)

    const correspondances = new Map<string, string>([
      ['code_produit', 'code_produit'],
      ['libelle', 'libelle'],
      ['famille_id', 'famille_id'],
    ])

    const definition: DefinitionImport = {
      type: 'PRODUITS',
      correspondances,
    }

    const lignes = [
      { numeroLigne: 2, valeurs: { code_produit: 'PRD-ERR', libelle: 'Erreur', famille_id: 1 } },
      { numeroLigne: 3, valeurs: { code_produit: 'PRD-ERR2', libelle: 'Erreur 2', famille_id: 1 } },
    ]

    const fnQuiEchoue = (): number => {
      throw new Error('Erreur de base simulée')
    }

    const resultat = executerImport(baseTest, definition, lignes, fnQuiEchoue)

    expect(resultat.succes).toBe(false)
    expect(resultat.messageErreurTechnique).toBe('Erreur de base simulée')
    expect(resultat.lignesImportees).toBe(0)

    fermerBase()
  })
})
