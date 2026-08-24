import { expect, test } from './helpers/fixture'
import type { Dialog, Page } from '@playwright/test'

interface IdentifiantCreation {
  id: number
}

interface DevisLu {
  statut: string
  numeroDevis: string
}

interface AffaireLue {
  reference: string
  typeAffaire: string
}

interface FactureLue {
  statut: string
  numero: string | null
  clientId: number
  affaireId: number | null
  nombreImpressions: number
}

interface ParametresLignePied {
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
  rabaisMarcheBps: number
}

interface PiedCalculeE2E {
  totalHtLignesCentimes: number
  totalRemisesCentimes: number
  netCommercialHtCentimes: number
  retenueGarantieCentimes: number
  totalHtCentimes: number
  totalTvaCentimes: number
  totalTtcCentimes: number
  netAPayerCentimes: number
}

interface InfosPdf {
  taille: number
  entete: number[]
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
    return { taille: donnees.byteLength, entete: Array.from(donnees.slice(0, 5)) }
  }, factureId)

test.describe('Q17 — Parcours devis → affaire → facture → PDF', () => {
  test('parcours complet de facturation', async ({ fenetreEgto }) => {
    const { fenetre } = fenetreEgto

    // Préparation — les seeds ne créent aucun client.
    const client = await appelerIpc<IdentifiantCreation>(fenetre, 'clients.creer', {
      codeClient: 'CLT-E2E-001',
      typeClient: 'SARL',
      raisonSociale: 'Client E2E SARL',
      categorie: 'PRIVE',
    })
    expect(client.id).toBeGreaterThan(0)

    // ÉTAPE 1 — Création d’un devis avec 2 lignes, vérification de la fiche.
    const devis = await appelerIpc<IdentifiantCreation>(fenetre, 'devis.creer', {
      clientId: client.id,
      dateDevis: '2026-08-21',
      dateValidite: '2026-09-21',
    })
    expect(devis.id).toBeGreaterThan(0)

    const ligne1 = await appelerIpc<IdentifiantCreation>(fenetre, 'devis.creerLigne', {
      devisId: devis.id,
      designation: 'Poste 1',
      unite: 'M3',
      quantiteMilliemes: 100000,
      puHtCentimes: 500000,
    })
    const ligne2 = await appelerIpc<IdentifiantCreation>(fenetre, 'devis.creerLigne', {
      devisId: devis.id,
      designation: 'Poste 2',
      unite: 'U',
      quantiteMilliemes: 50000,
      puHtCentimes: 200000,
    })
    expect(ligne1.id).toBeGreaterThan(0)
    expect(ligne2.id).toBeGreaterThan(0)

    await allerALaRoute(fenetre, `/devis/${devis.id}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })
    await expect(fenetre.getByText('BROUILLON')).toBeVisible()

    // ÉTAPE 2 — Envoi du devis (changement de statut par IPC ; aucun bouton UI).
    const modifie = await appelerIpc<boolean>(fenetre, 'devis.modifier', devis.id, {
      statut: 'ENVOYE',
    })
    expect(modifie).toBe(true)

    const devisRelu = await appelerIpc<DevisLu | null>(fenetre, 'devis.lire', devis.id)
    expect(devisRelu).not.toBeNull()
    expect(devisRelu?.statut).toBe('ENVOYE')

    await allerALaRoute(fenetre, '/devis')
    await expect(fenetre.locator('.badge-statut', { hasText: 'ENVOYE' })).toBeVisible()

    // ÉTAPE 3a — Le bouton « Convertir en affaire » reste un placeholder (alerte).
    await allerALaRoute(fenetre, `/devis/${devis.id}`)
    const boutonConvertir = fenetre.getByRole('button', { name: 'Convertir en affaire' })
    await expect(boutonConvertir).toBeVisible()

    let messageDialogue = ''
    fenetre.on('dialog', (dialog: Dialog) => {
      messageDialogue = dialog.message()
      void dialog.dismiss()
    })
    await boutonConvertir.click()
    await expect.poll(() => messageDialogue, { timeout: 5_000 }).toContain('Conversion')

    // ÉTAPE 3b — Conversion en affaire via IPC (aucun canal conversion.* câblé).
    const affaire = await appelerIpc<IdentifiantCreation>(fenetre, 'affaires.creer', {
      clientId: client.id,
      typeAffaire: 'CONTRAT_PRIVE',
      reference: 'AFF-E2E-001',
      objet: 'Travaux issus du devis E2E',
    })
    expect(affaire.id).toBeGreaterThan(0)

    await allerALaRoute(fenetre, `/affaires/${affaire.id}`)
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText('AFF-E2E-001', {
      timeout: 10_000,
    })
    const affaireRelue = await appelerIpc<AffaireLue | null>(fenetre, 'affaires.lire', affaire.id)
    expect(affaireRelue?.typeAffaire).toBe('CONTRAT_PRIVE')

    // ÉTAPE 4 — Création de la facture rattachée à l’affaire (statut BROUILLON, sans numéro).
    const facture = await appelerIpc<IdentifiantCreation>(fenetre, 'factures.creer', {
      typeDocument: 'FA',
      clientId: client.id,
      affaireId: affaire.id,
      dateFacture: '2026-08-21',
      dateEcheance: '2026-10-21',
      retenueGarantieBps: 0,
      remboursementAvanceCentimes: 0,
      modeReglementPrevu: 'VIREMENT',
    })
    expect(facture.id).toBeGreaterThan(0)

    const factureBrouillon = await appelerIpc<FactureLue | null>(
      fenetre,
      'factures.lire',
      facture.id,
    )
    expect(factureBrouillon?.statut).toBe('BROUILLON')
    expect(factureBrouillon?.numero).toBeNull()

    // ÉTAPE 5 — Lignes de facture et pied calculé (HT 600 000,00 DA ; TVA 19 % ; TTC 714 000,00 DA).
    await appelerIpc<IdentifiantCreation>(fenetre, 'factures.creerLigne', {
      factureId: facture.id,
      designation: 'Poste 1',
      unite: 'M3',
      quantiteMilliemes: 100000,
      puHtCentimes: 500000,
      remiseBps: 0,
      rabaisMarcheBps: 0,
    })
    await appelerIpc<IdentifiantCreation>(fenetre, 'factures.creerLigne', {
      factureId: facture.id,
      designation: 'Poste 2',
      unite: 'U',
      quantiteMilliemes: 50000,
      puHtCentimes: 200000,
      remiseBps: 0,
      rabaisMarcheBps: 0,
    })

    const lignesParametres: ParametresLignePied[] = [
      {
        designation: 'Poste 1',
        unite: 'M3',
        quantiteMilliemes: 100000,
        puHtCentimes: 500000,
        remiseBps: 0,
        rabaisMarcheBps: 0,
      },
      {
        designation: 'Poste 2',
        unite: 'U',
        quantiteMilliemes: 50000,
        puHtCentimes: 200000,
        remiseBps: 0,
        rabaisMarcheBps: 0,
      },
    ]
    const pied = await appelerIpc<PiedCalculeE2E>(fenetre, 'factures.calculerPied', {
      lignes: lignesParametres,
      retenueGarantieBps: 0,
      remboursementAvanceCentimes: 0,
      marchePublic: false,
    })
    expect(pied.totalHtLignesCentimes).toBe(60_000_000)
    expect(pied.totalRemisesCentimes).toBe(0)
    expect(pied.netCommercialHtCentimes).toBe(60_000_000)
    expect(pied.totalHtCentimes).toBe(60_000_000)
    expect(pied.totalTvaCentimes).toBe(11_400_000)
    expect(pied.totalTtcCentimes).toBe(71_400_000)
    expect(pied.netAPayerCentimes).toBe(71_400_000)

    await allerALaRoute(fenetre, `/factures/${facture.id}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })
    await fenetre.getByRole('tab', { name: 'Pied' }).click()
    await expect(fenetre.getByText('600000.00 DA')).toHaveCount(3)
    await expect(fenetre.getByText('114000.00 DA')).toBeVisible()
    await expect(fenetre.getByText('714000.00 DA')).toBeVisible()

    // ÉTAPE 6 — Validation : numéro attribué (et verrouillé), BROUILLON → VALIDE.
    const factureValidee = await appelerIpc<FactureLue>(fenetre, 'factures.valider', facture.id)
    expect(factureValidee.statut).toBe('VALIDE')
    expect(factureValidee.numero).toMatch(/^FA-2026-\d{4}$/)

    await allerALaRoute(fenetre, '/factures')
    await allerALaRoute(fenetre, `/factures/${facture.id}`)
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText(
      `Facture ${factureValidee.numero}`,
      { timeout: 10_000 },
    )
    await expect(fenetre.getByRole('button', { name: 'Valider' })).toHaveCount(0)
    await expect(fenetre.getByRole('button', { name: 'Imprimer' })).toBeVisible()

    // ÉTAPE 7 — Aperçu PDF sans impression : VALIDE conservé, zéro impression.
    const infosPdf = await lireEntetePdf(fenetre, facture.id)
    expect(infosPdf.taille).toBeGreaterThan(1000)
    expect(String.fromCharCode(...infosPdf.entete)).toBe('%PDF-')

    const apresGeneration = await appelerIpc<FactureLue | null>(
      fenetre,
      'factures.lire',
      facture.id,
    )
    expect(apresGeneration?.statut).toBe('VALIDE')
    expect(apresGeneration?.nombreImpressions).toBe(0)

    await fenetre.getByRole('tab', { name: 'Aperçu PDF' }).click()
    await fenetre.getByRole('button', { name: 'Générer le PDF' }).click()
    await expect(fenetre.locator('iframe[title="Aperçu PDF"]')).toBeVisible({ timeout: 20_000 })
    await expect(fenetre.getByRole('button', { name: 'Télécharger' })).toBeVisible()

    // ÉTAPE 8 — Impression : VALIDE → IMPRIMEE, compteur incrémenté, bandeau DUPLICATA.
    await fenetre.getByRole('tab', { name: 'Général' }).click()
    await fenetre.getByRole('button', { name: 'Imprimer' }).click()
    await expect(
      fenetre.getByRole('button', { name: 'Marquer envoyée' }),
    ).toBeVisible({ timeout: 20_000 })

    const factureImprimee = await appelerIpc<FactureLue | null>(
      fenetre,
      'factures.lire',
      facture.id,
    )
    expect(factureImprimee?.statut).toBe('IMPRIMEE')
    expect(factureImprimee?.nombreImpressions).toBe(1)

    await fenetre.getByRole('tab', { name: 'Aperçu PDF' }).click()
    await expect(fenetre.locator('.bandeau-avertissement')).toContainText('DUPLICATA', {
      timeout: 20_000,
    })

    // ÉTAPE 9 — Envoi : IMPRIMEE → ENVOYEE.
    await fenetre.getByRole('tab', { name: 'Général' }).click()
    await fenetre.getByRole('button', { name: 'Marquer envoyée' }).click()
    await expect(fenetre.getByRole('button', { name: 'Marquer envoyée' })).toHaveCount(0, {
      timeout: 20_000,
    })

    const factureEnvoyee = await appelerIpc<FactureLue | null>(
      fenetre,
      'factures.lire',
      facture.id,
    )
    expect(factureEnvoyee?.statut).toBe('ENVOYEE')

    // ÉTAPE 10 — Contrôle final de bout en bout (liste + cohérence de la fiche).
    await allerALaRoute(fenetre, '/factures')
    await expect(fenetre.locator('.badge-statut', { hasText: 'ENVOYEE' })).toBeVisible()

    const factureFinale = await appelerIpc<FactureLue | null>(fenetre, 'factures.lire', facture.id)
    expect(factureFinale).not.toBeNull()
    expect(factureFinale?.numero).toMatch(/^FA-2026-\d{4}$/)
    expect(factureFinale?.statut).toBe('ENVOYEE')
    expect(factureFinale?.nombreImpressions).toBe(1)
    expect(factureFinale?.clientId).toBe(client.id)
    expect(factureFinale?.affaireId).toBe(affaire.id)
  })
})
