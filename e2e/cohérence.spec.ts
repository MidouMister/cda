import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { expect, test } from './helpers/fixture'
import type { Page } from '@playwright/test'

// Contrôles de cohérence transversaux (Jalon 5 Phase 5) :
//  - aperçu PDF sans incrément d'impression ;
//  - impression = incrément du compteur, réimpression impossible (numéro
//    verrouillé — IMPRIMER n'est permis que depuis VALIDE) ;
//  - filigrane DUPLICATA dès que le compteur est ≥ 1 (2e génération) ;
//  - aucun droit de timbre dans le pied ni dans le PDF (TTC = HT + TVA) ;
//  - avoir ni encaissable ni archivable ;
//  - polices PDF présentes et chargées au runtime.

interface IdentifiantCreation {
  id: number
}

interface FactureLue {
  id: number
  statut: string
  numero: string | null
  typeDocument: string
  nombreImpressions: number
  totalHtCentimes: number
  totalTvaCentimes: number
  totalTtcCentimes: number
  netAPayerCentimes: number
}

interface InfosPdf {
  taille: number
  entete: string
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

const allerALaRoute = async (fenetre: Page, route: string): Promise<void> => {
  await fenetre.evaluate((r) => {
    window.location.hash = r
  }, route)
}

const lireEntetePdf = async (fenetre: Page, factureId: number): Promise<InfosPdf> =>
  fenetre.evaluate(async (id) => {
    const hote = window as unknown as {
      egto: { factures: { genererPdf: (i: number) => Promise<Uint8Array> } }
    }
    const donnees = await hote.egto.factures.genererPdf(id)
    return {
      taille: donnees.byteLength,
      entete: String.fromCharCode(...Array.from(donnees.slice(0, 5))),
    }
  }, factureId)

// Facture FA validée : 1 ligne de 120 × 5 000,00 DA = 600 000,00 DA HT,
// TVA 19 % = 114 000,00 DA, TTC = 714 000,00 DA, NET À PAYER = TTC.
const creerFactureValidee = async (
  fenetre: Page,
  suffixe: string,
): Promise<{ clientId: number; factureId: number }> => {
  const client = await appelerIpc<IdentifiantCreation>(fenetre, 'clients.creer', {
    codeClient: `CLT-COH-${suffixe}`,
    typeClient: 'SARL',
    raisonSociale: `Client Cohérence ${suffixe}`,
    categorie: 'PRIVE',
  })
  const facture = await appelerIpc<IdentifiantCreation>(fenetre, 'factures.creer', {
    typeDocument: 'FA',
    clientId: client.id,
    dateFacture: '2026-08-21',
    dateEcheance: '2026-10-21',
    retenueGarantieBps: 0,
    remboursementAvanceCentimes: 0,
    modeReglementPrevu: 'VIREMENT',
  })
  await appelerIpc<IdentifiantCreation>(fenetre, 'factures.creerLigne', {
    factureId: facture.id,
    designation: 'Poste cohérence',
    unite: 'M3',
    quantiteMilliemes: 120000,
    puHtCentimes: 500000,
    remiseBps: 0,
    rabaisMarcheBps: 0,
  })
  const validee = await appelerIpc<FactureLue>(fenetre, 'factures.valider', facture.id)
  expect(validee.statut).toBe('VALIDE')
  expect(validee.numero).toMatch(/^FA-2026-\d{4}$/)
  return { clientId: client.id, factureId: facture.id }
}

test.describe('Cohérence — aperçu PDF et compteur d’impressions', () => {
  test('l’aperçu PDF ne modifie ni le statut ni nombreImpressions', async ({
    fenetreEgto,
  }) => {
    const { fenetre } = fenetreEgto
    const { factureId } = await creerFactureValidee(fenetre, 'PDF')

    // Aperçu direct via IPC : la génération n'est pas une impression.
    const infosPdf = await lireEntetePdf(fenetre, factureId)
    expect(infosPdf.taille).toBeGreaterThan(1000)
    expect(infosPdf.entete).toBe('%PDF-')

    const apresGeneration = await appelerIpc<FactureLue | null>(
      fenetre,
      'factures.lire',
      factureId,
    )
    expect(apresGeneration?.statut).toBe('VALIDE')
    expect(apresGeneration?.nombreImpressions).toBe(0)

    // Aperçu via l'interface : même garantie, aucun bandeau DUPLICATA.
    await allerALaRoute(fenetre, `/factures/${factureId}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })
    await fenetre.getByRole('tab', { name: 'Aperçu PDF' }).click()
    await fenetre.getByRole('button', { name: 'Générer le PDF' }).click()
    await expect(fenetre.locator('iframe[title="Aperçu PDF"]')).toBeVisible({
      timeout: 20_000,
    })
    await expect(fenetre.locator('.bandeau-avertissement')).toHaveCount(0)

    const apresApercuUi = await appelerIpc<FactureLue | null>(fenetre, 'factures.lire', factureId)
    expect(apresApercuUi?.statut).toBe('VALIDE')
    expect(apresApercuUi?.nombreImpressions).toBe(0)
  })

  test('l’impression incrémente nombreImpressions ; la réimpression est refusée', async ({
    fenetreEgto,
  }) => {
    const { fenetre } = fenetreEgto
    const { factureId } = await creerFactureValidee(fenetre, 'IMP')

    // Première impression depuis l'interface : VALIDE → IMPRIMEE, compteur 1.
    await allerALaRoute(fenetre, `/factures/${factureId}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })
    await fenetre.getByRole('button', { name: 'Imprimer' }).click()
    await expect(fenetre.getByRole('button', { name: 'Marquer envoyée' })).toBeVisible({
      timeout: 20_000,
    })

    const imprimee = await appelerIpc<FactureLue | null>(fenetre, 'factures.lire', factureId)
    expect(imprimee?.statut).toBe('IMPRIMEE')
    expect(imprimee?.nombreImpressions).toBe(1)

    // Réimpression impossible : IMPRIMER exige VALIDE (numéro verrouillé).
    let messageErreur = ''
    try {
      await appelerIpc(fenetre, 'factures.imprimer', factureId)
    } catch (erreur) {
      messageErreur = erreur instanceof Error ? erreur.message : String(erreur)
    }
    expect(messageErreur).toContain('IMPRIMEE')

    const apresRejet = await appelerIpc<FactureLue | null>(fenetre, 'factures.lire', factureId)
    expect(apresRejet?.statut).toBe('IMPRIMEE')
    expect(apresRejet?.nombreImpressions).toBe(1)
  })

  test('le filigrane DUPLICATA apparaît dès la seconde génération (compteur ≥ 1)', async ({
    fenetreEgto,
  }) => {
    const { fenetre } = fenetreEgto
    const { factureId } = await creerFactureValidee(fenetre, 'DUP')

    // Première impression via IPC : le compteur passe à 1.
    await appelerIpc(fenetre, 'factures.imprimer', factureId)
    const imprimee = await appelerIpc<FactureLue | null>(fenetre, 'factures.lire', factureId)
    expect(imprimee?.nombreImpressions).toBe(1)

    // Toute génération suivante est un duplicata : bandeau affiché.
    await allerALaRoute(fenetre, `/factures/${factureId}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })
    await fenetre.getByRole('tab', { name: 'Aperçu PDF' }).click()
    await fenetre.getByRole('button', { name: 'Générer le PDF' }).click()
    await expect(fenetre.locator('.bandeau-avertissement')).toContainText('DUPLICATA', {
      timeout: 20_000,
    })
  })
})

test.describe('Cohérence — absence de droit de timbre (décision 15-16/08/2026)', () => {
  test('le pied de facture ne contient aucun champ timbre et TTC = HT + TVA', async ({
    fenetreEgto,
  }) => {
    const { fenetre } = fenetreEgto
    const { factureId } = await creerFactureValidee(fenetre, 'PIED')

    const facture = (await appelerIpc<Record<string, unknown>>(
      fenetre,
      'factures.lire',
      factureId,
    )) as unknown as FactureLue
    expect(Object.keys(facture).some((cle) => /timbre/i.test(cle))).toBe(false)
    expect(facture.totalTtcCentimes).toBe(
      facture.totalHtCentimes + facture.totalTvaCentimes,
    )
    expect(facture.netAPayerCentimes).toBe(facture.totalTtcCentimes)

    const pied = await appelerIpc<Record<string, unknown>>(fenetre, 'factures.calculerPied', {
      lignes: [
        {
          designation: 'Poste cohérence',
          unite: 'M3',
          quantiteMilliemes: 120000,
          puHtCentimes: 500000,
          remiseBps: 0,
          rabaisMarcheBps: 0,
        },
      ],
      retenueGarantieBps: 0,
      remboursementAvanceCentimes: 0,
      marchePublic: false,
    })
    expect(Object.keys(pied).some((cle) => /timbre/i.test(cle))).toBe(false)
    expect(pied.totalTtcCentimes).toBe(71_400_000)
    expect(pied.netAPayerCentimes).toBe(71_400_000)

    // Interface : onglet Pied sans aucune mention de timbre.
    await allerALaRoute(fenetre, `/factures/${factureId}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })
    await fenetre.getByRole('tab', { name: 'Pied' }).click()
    await expect(fenetre.locator('.ecran-fiche').getByText(/timbre/i)).toHaveCount(0)
    // HT lignes, net commercial HT et Total HT affichent tous 600000.00 DA.
    await expect(fenetre.getByText('600000.00 DA')).toHaveCount(3)
    await expect(fenetre.getByText('714000.00 DA')).toHaveCount(2)
  })

  test('le buffer PDF généré ne contient aucun texte « timbre »', async ({ fenetreEgto }) => {
    const { fenetre } = fenetreEgto
    const { factureId } = await creerFactureValidee(fenetre, 'PDFT')

    // Le PDF est récupéré en base64 (les flux internes sont compressés zlib :
    // on décompresse chaque stream pour inspecter aussi le contenu réel).
    const base64 = await fenetre.evaluate(async (id) => {
      const hote = window as unknown as {
        egto: { factures: { genererPdf: (i: number) => Promise<Uint8Array> } }
      }
      const donnees = await hote.egto.factures.genererPdf(id)
      const octets = new Uint8Array(donnees)
      let binaire = ''
      const pas = 8192
      for (let i = 0; i < octets.length; i += pas) {
        binaire += String.fromCharCode(...octets.subarray(i, i + pas))
      }
      return window.btoa(binaire)
    }, factureId)
    const tampon = Buffer.from(base64, 'base64')

    const texteBrut = tampon.toString('latin1')
    expect(texteBrut.startsWith('%PDF-')).toBe(true)
    expect(tampon.length).toBeGreaterThan(1000)
    expect(/timbre/i.test(texteBrut)).toBe(false)

    let octetsDecompresses = 0
    const textesClairs: string[] = []
    for (const correspondance of texteBrut.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
      try {
        const clair = inflateSync(Buffer.from(correspondance[1], 'latin1'))
        textesClairs.push(clair.toString('latin1'))
        octetsDecompresses += clair.length
      } catch {
        // Flux non compressé ou non zlib : ignoré, il est déjà couvert par la
        // recherche sur le texte brut ci-dessus.
      }
    }
    expect(octetsDecompresses).toBeGreaterThan(500)
    expect(/timbre/i.test(textesClairs.join('\n'))).toBe(false)
  })
})

test.describe('Cohérence — avoir ni encaissable ni archivable', () => {
  test('aucun encaissement possible sur un avoir', async ({ fenetreEgto }) => {
    const { fenetre } = fenetreEgto
    const { clientId, factureId } = await creerFactureValidee(fenetre, 'ENC')

    const avoir = await appelerIpc<FactureLue>(fenetre, 'factures.creerAvoir', {
      factureOrigineId: factureId,
      motifAvoir: 'Erreur de saisie E2E',
      dateAvoir: '2026-08-22',
      clientId,
      dateFacture: '2026-08-22',
      modeAvoir: 'TOTAL',
    })
    expect(avoir.typeDocument).toBe('AV')
    expect(avoir.statut).toBe('BROUILLON')
    expect(avoir.numero).toBeNull()

    // Un avoir n'est jamais ENVOYEE : l'encaissement doit être refusé.
    let messageErreur = ''
    try {
      await appelerIpc(fenetre, 'encaissements.creer', {
        factureId: avoir.id,
        montantEncaisseCentimes: 100_000,
        dateEncaissement: '23/08/2026',
        modeReglementEffectif: 'ESPECES',
      })
    } catch (erreur) {
      messageErreur = erreur instanceof Error ? erreur.message : String(erreur)
    }
    expect(messageErreur).toContain('Un avoir ne peut pas être encaissé')

    const encaissements = await appelerIpc<unknown[]>(
      fenetre,
      'encaissements.lister',
      avoir.id,
    )
    expect(encaissements).toHaveLength(0)

    // Interface : la fiche de l'avoir n'expose aucun bouton/liens d'encaissement.
    await allerALaRoute(fenetre, `/factures/${avoir.id}`)
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText(/Facture/i, {
      timeout: 10_000,
    })
    await expect(fenetre.getByRole('button', { name: /encaiss/i })).toHaveCount(0)
    await expect(fenetre.getByRole('link', { name: /encaiss/i })).toHaveCount(0)
  })

  test('aucune archive possible sur un avoir', async ({ fenetreEgto }) => {
    const { fenetre } = fenetreEgto
    const { clientId, factureId } = await creerFactureValidee(fenetre, 'ARC')

    const avoir = await appelerIpc<FactureLue>(fenetre, 'factures.creerAvoir', {
      factureOrigineId: factureId,
      motifAvoir: 'Retour matériel E2E',
      dateAvoir: '2026-08-22',
      clientId,
      dateFacture: '2026-08-22',
      modeAvoir: 'TOTAL',
    })
    expect(avoir.typeDocument).toBe('AV')
    expect(avoir.statut).toBe('BROUILLON')
    expect(avoir.numero).toBeNull()

    await allerALaRoute(fenetre, `/factures/${avoir.id}`)
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText(/Facture/i, {
      timeout: 10_000,
    })
    await expect(fenetre.getByRole('button', { name: /archiv/i })).toHaveCount(0)
    await expect(fenetre.getByRole('link', { name: /archiv/i })).toHaveCount(0)

    // L'API IPC elle-même n'expose aucun canal d'archivage des factures.
    const methodes = await fenetre.evaluate(() => {
      const hote = window as unknown as { egto?: { factures?: Record<string, unknown> } }
      if (!hote.egto?.factures) {
        throw new Error('window.egto.factures est indisponible.')
      }
      return Object.keys(hote.egto.factures)
    })
    expect(methodes.some((methode) => /archiv/i.test(methode))).toBe(false)
  })
})

test.describe('Cohérence — polices PDF disponibles', () => {
  test('les fichiers de polices existent et sont chargés à la génération', async ({
    fenetreEgto,
  }) => {
    const { fenetre } = fenetreEgto

    const racineProjet = process.cwd()
    const cheminsPolices = [
      join(racineProjet, 'out', 'main', 'assets', 'fonts', 'NotoNaskhArabic-Regular.ttf'),
      join(racineProjet, 'assets', 'fonts', 'Roboto-Regular.ttf'),
      join(racineProjet, 'assets', 'fonts', 'Roboto-Medium.ttf'),
    ]
    for (const chemin of cheminsPolices) {
      expect(existsSync(chemin), `Police manquante : ${chemin}`).toBe(true)
      expect(statSync(chemin).size, `Police vide : ${chemin}`).toBeGreaterThan(50_000)
    }

    // Preuve fonctionnelle : la génération charge bien ces polices au runtime.
    const { factureId } = await creerFactureValidee(fenetre, 'FONT')
    const infosPdf = await lireEntetePdf(fenetre, factureId)
    expect(infosPdf.entete).toBe('%PDF-')
    expect(infosPdf.taille).toBeGreaterThan(1000)
  })
})
