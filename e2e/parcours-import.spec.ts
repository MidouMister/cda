import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { expect, test } from './helpers/fixture'
import type { Page } from '@playwright/test'

// L'écran Import utilise un <input type="file"> créé dynamiquement : son clic
// ouvre une boîte de dialogue native qu'Electron/Playwright ne peut pas
// piloter. La sélection du fichier se fait donc directement par IPC
// (import.lireFichier avec un chemin absolu), puis les étapes 2 et 3
// (validation des lignes, rapport d'exécution) suivent exactement le contrat
// de l'écran (src/ecrans/Import.tsx).

interface ColonneImportee {
  entete: string
  index: number
}

interface LigneExcel {
  numeroLigne: number
  valeurs: Record<string, unknown>
}

interface ResultatLectureExcel {
  colonnes: ColonneImportee[]
  lignes: LigneExcel[]
  lignesIgnorees: number
}

interface ErreurImport {
  ligne: number
  colonne: string
  valeur: unknown
  erreur: string
}

interface LigneImporteeVue {
  donnees: Record<string, unknown>
  valide: boolean
  erreurs: ErreurImport[]
}

interface RapportImport {
  totalLignes: number
  lignesImportees: number
  lignesIgnorees: number
  erreurs: ErreurImport[]
  succes: boolean
}

interface ClientListe {
  codeClient: string
}

const appelerIpc = async <T>(
  fenetre: Page,
  canal: string,
  ...argumentsAppel: unknown[]
): Promise<T> =>
  fenetre.evaluate(
    async ({ canal, argumentsAppel }) => {
      const hote = window as unknown as { egto?: Record<string, unknown> }
      if (!hote.egto) {
        throw new Error('window.egto est indisponible — le preload n’a pas été chargé.')
      }
      let cible: unknown = hote.egto
      for (const segment of canal.split('.')) {
        if (cible === null || typeof cible !== 'object' || !(segment in cible)) {
          throw new Error(`Canal introuvable : « ${canal} »`)
        }
        cible = (cible as Record<string, unknown>)[segment]
      }
      if (typeof cible !== 'function') {
        throw new Error(`« ${canal} » n’est pas une fonction IPC.`)
      }
      return (await (cible as (...a: unknown[]) => Promise<unknown>)(...argumentsAppel)) as T
    },
    { canal, argumentsAppel },
  )

test.describe('Q30 — Parcours d’import de clients depuis Excel', () => {
  test('lecture du fichier, validation avec anomalie, exécution et vérification des lignes importées', async ({
    fenetreEgto,
  }) => {
    const { fenetre, dossierTemporaire } = fenetreEgto

    // Préparation — classeur Excel : entêtes canoniques, 2 lignes valides,
    // 1 ligne porteuse d'une anomalie (NIF de 4 caractères au lieu de 15).
    const classeur = new ExcelJS.Workbook()
    const feuille = classeur.addWorksheet('Clients')
    feuille.addRow(['code_client', 'raison_sociale', 'type_client', 'categorie', 'nif', 'nis'])
    feuille.addRow([
      'CLT-IMP-001',
      'Client Import Un SARL',
      'SARL',
      'PRIVE',
      '000123456789012',
      null,
    ])
    feuille.addRow([
      'CLT-IMP-002',
      'Client Import Deux EPE',
      'EPE_SPA',
      'PUBLIC',
      '987654321012345',
      '123456789012345',
    ])
    feuille.addRow([
      'CLT-IMP-KO',
      'Client Import Invalide',
      'SARL',
      'PRIVE',
      '12AB',
      null,
    ])
    const cheminFichier = join(dossierTemporaire, 'clients-e2e.xlsx')
    await classeur.xlsx.writeFile(cheminFichier)

    // ÉTAPE 1 — Navigation vers l'écran Import (barre latérale).
    await fenetre.getByRole('link', { name: 'Import' }).click()
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText('Import de données', {
      timeout: 10_000,
    })
    await expect(fenetre.getByRole('button', { name: 'Choisir le fichier' })).toBeVisible()

    // ÉTAPE 2 — Lecture du fichier via IPC (remplace la boîte de dialogue native).
    const lecture = await appelerIpc<ResultatLectureExcel>(
      fenetre,
      'import.lireFichier',
      cheminFichier,
    )
    expect(lecture.colonnes).toHaveLength(6)
    expect(lecture.colonnes.map((c) => c.entete)).toEqual([
      'code_client',
      'raison_sociale',
      'type_client',
      'categorie',
      'nif',
      'nis',
    ])
    expect(lecture.lignes).toHaveLength(3)
    expect(lecture.lignesIgnorees).toBe(0)

    // ÉTAPE 3 — Prévisualisation : validation ligne par ligne.
    const lignesValidees = await appelerIpc<LigneImporteeVue[]>(
      fenetre,
      'import.validerLignes',
      lecture.lignes,
      'CLIENTS',
    )
    expect(lignesValidees.filter((l) => l.valide)).toHaveLength(2)
    const lignesInvalides = lignesValidees.filter((l) => !l.valide)
    expect(lignesInvalides).toHaveLength(1)
    expect(
      lignesInvalides[0].erreurs.some(
        (e) => e.colonne === 'nif' && /15 chiffres/.test(e.erreur),
      ),
    ).toBe(true)

    // ÉTAPE 4 — Exécution : correspondances identité (comme l'écran Import).
    const correspondances: Record<string, string> = {}
    for (const col of lecture.colonnes) {
      correspondances[col.entete] = col.entete
    }
    const rapport = await appelerIpc<RapportImport>(
      fenetre,
      'import.executer',
      { type: 'CLIENTS', correspondances },
      lecture.lignes,
    )
    expect(rapport.succes).toBe(true)
    expect(rapport.totalLignes).toBe(3)
    expect(rapport.lignesImportees).toBe(2)
    expect(rapport.erreurs).toHaveLength(1)
    expect(rapport.erreurs[0].colonne).toBe('nif')

    // ÉTAPE 5 — Vérification des lignes réellement importées (via IPC).
    const clients = await appelerIpc<ClientListe[]>(fenetre, 'clients.lister')
    const codes = clients.map((c) => c.codeClient)
    expect(codes).toContain('CLT-IMP-001')
    expect(codes).toContain('CLT-IMP-002')
    expect(codes).not.toContain('CLT-IMP-KO')

    // ÉTAPE 6 — Vérification dans l'interface : les clients importés figurent
    // dans la liste, la ligne rejetée n'y apparaît jamais.
    await fenetre.getByRole('link', { name: 'Clients' }).click()
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText('Clients', {
      timeout: 10_000,
    })
    await expect(fenetre.getByText('Client Import Un SARL')).toBeVisible()
    await expect(fenetre.getByText('Client Import Deux EPE')).toBeVisible()
    await expect(fenetre.getByText('Client Import Invalide')).toHaveCount(0)
  })
})
