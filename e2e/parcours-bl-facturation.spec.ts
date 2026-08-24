import { expect, test } from './helpers/fixture'
import type { Page } from '@playwright/test'
import { inflateSync, inflateRawSync } from 'node:zlib'

interface IdentifiantCreation {
  id: number
}

interface BonLivraisonLue {
  id: number
  statut: string
  numeroBl: string
  clientId: number
  affaireId: number | null
  factureId: number | null
}

interface LigneBonLivraisonLue {
  designation: string
  unite: string
  quantiteMilliemes: number
  puHtCentimes: number
  montantHtCentimes: number
}

interface FactureLue {
  statut: string
  numero: string | null
  clientId: number
  affaireId: number | null
}

interface LigneFactureLue {
  designation: string
  quantiteMilliemes: number
  puHtCentimes: number
  remiseBps: number
  rabaisMarcheBps: number
  montantHtBrutCentimes: number
  montantRabaisMarcheCentimes: number
  montantHtNetCentimes: number
  typeLigne: string | null
}

interface AffaireLue {
  rabaisMarcheBps: number
}

interface InfosPdf {
  taille: number
  entete: number[]
  base64: string
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

const lirePdfFacture = async (fenetre: Page, factureId: number): Promise<{ infos: InfosPdf; buffer: Buffer }> => {
  const infos = await fenetre.evaluate(async (id) => {
    const hote = window as unknown as {
      egto: { factures: { genererPdf: (i: number) => Promise<Uint8Array> } }
    }
    const donnees = new Uint8Array(await hote.egto.factures.genererPdf(id))
    let binaire = ''
    const TAILLE_TRANCHE = 0x8000
    for (let i = 0; i < donnees.length; i += TAILLE_TRANCHE) {
      binaire += String.fromCharCode(...donnees.subarray(i, i + TAILLE_TRANCHE))
    }
    return {
      taille: donnees.byteLength,
      entete: Array.from(donnees.slice(0, 5)),
      base64: btoa(binaire),
    }
  }, factureId)
  return { infos, buffer: Buffer.from(infos.base64, 'base64') }
}

const extraireTextePdf = (donnees: Buffer): string => {
  const brut = donnees.toString('latin1')

  const corpsFlux = new Map<number, string>()
  const reObjet = /(\d+) 0 obj([\s\S]*?)endobj/g
  let correspondance
  while ((correspondance = reObjet.exec(brut)) !== null) {
    const numeroObjet = Number(correspondance[1])
    const corps = correspondance[2]
    const positionStream = corps.indexOf('stream')
    if (positionStream === -1) continue
    let debut = positionStream + 'stream'.length
    if (corps[debut] === '\r') debut += 1
    if (corps[debut] === '\n') debut += 1
    const fin = corps.indexOf('endstream', debut)
    if (fin === -1) continue
    const donneesFlux = Buffer.from(corps.slice(debut, fin), 'latin1')
    try {
      corpsFlux.set(numeroObjet, inflateSync(donneesFlux).toString('latin1'))
    } catch {
      try {
        corpsFlux.set(numeroObjet, inflateRawSync(donneesFlux).toString('latin1'))
      } catch {
        corpsFlux.set(numeroObjet, donneesFlux.toString('latin1'))
      }
    }
  }

  const decoderCmap = (contenuCmap: string): Map<number, string> => {
    const table = new Map<number, string>()
    let zone: 'bfchar' | 'bfrange' | null = null
    for (const ligneBrute of contenuCmap.split(/\r?\n/)) {
      const ligne = ligneBrute.trim()
      if (ligne.includes('beginbfchar')) {
        zone = 'bfchar'
        continue
      }
      if (ligne.includes('beginbfrange')) {
        zone = 'bfrange'
        continue
      }
      if (ligne.includes('endcodespacerange')) {
        zone = null
        continue
      }
      if (ligne === 'endbfchar' || ligne === 'endbfrange') {
        zone = null
        continue
      }
      if (zone === null) continue
      if (zone === 'bfchar') {
        const m = ligne.match(/^<([0-9A-Fa-f]{4})>\s*<((?:[0-9A-Fa-f]{4})+)>$/)
        if (m) {
          let unicode = ''
          for (let i = 0; i < m[2].length; i += 4) {
            unicode += String.fromCharCode(parseInt(m[2].slice(i, i + 4), 16))
          }
          table.set(parseInt(m[1], 16), unicode)
        }
      } else {
        const formeTableau = ligne.match(/^<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>\s*\[(.*)\]$/)
        if (formeTableau) {
          const debutGid = parseInt(formeTableau[1], 16)
          const valeurs = formeTableau[3].match(/<([0-9A-Fa-f]{4})>/g) ?? []
          valeurs.forEach((v, index) => {
            table.set(debutGid + index, String.fromCharCode(parseInt(v.slice(1, -1), 16)))
          })
          continue
        }
        const formeSimple = ligne.match(/^<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>$/)
        if (formeSimple) {
          const debutGid = parseInt(formeSimple[1], 16)
          const finGid = parseInt(formeSimple[2], 16)
          const baseUnicode = parseInt(formeSimple[3], 16)
          for (let g = debutGid; g <= finGid; g += 1) {
            table.set(g, String.fromCharCode(baseUnicode + (g - debutGid)))
          }
        }
      }
    }
    return table
  }

  const cmapsParPolice = new Map<number, Map<number, string>>()
  const reRefToUnicode = /\/ToUnicode\s+(\d+)\s+0\s+R/
  for (const [numeroObjet, contenuFlux] of corpsFlux) {
    if (!contenuFlux.includes('beginbfrange') && !contenuFlux.includes('beginbfchar')) continue
    const rePolices = /(\d+) 0 obj([\s\S]*?)endobj/g
    let police
    while ((police = rePolices.exec(brut)) !== null) {
      if (Number(police[1]) === numeroObjet) continue
      const corpsPolice = police[2].replace(/stream[\s\S]*?endstream/, 'stream')
      if (!corpsPolice.includes('/Type /Font')) continue
      const reference = corpsPolice.match(reRefToUnicode)
      if (reference && Number(reference[1]) === numeroObjet) {
        cmapsParPolice.set(Number(police[1]), decoderCmap(contenuFlux))
      }
    }
  }

  const ressourcesFontes = new Map<string, number>()
  const reBlocFontes = /\/Font\s*<<([\s\S]*?)>>/g
  const reNomFonte = /\/(F\d+)\s+(\d+)\s+0\s+R/g
  let blocFontes
  while ((blocFontes = reBlocFontes.exec(brut)) !== null) {
    let nom
    while ((nom = reNomFonte.exec(blocFontes[1])) !== null) {
      ressourcesFontes.set(nom[1], Number(nom[2]))
    }
  }

  const morceaux: string[] = []
  for (const [, contenuFlux] of corpsFlux) {
    if (contenuFlux.includes('begincmap')) continue
    if (!contenuFlux.includes('BT')) continue
    let sortie = ''
    const cmapParDefaut =
      cmapsParPolice.get([...ressourcesFontes.values()][0] ?? -1) ?? new Map<number, string>()
    let cmapCourante = cmapParDefaut
    const reJetons = /\/(F\d+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>/g
    let jeton
    while ((jeton = reJetons.exec(contenuFlux)) !== null) {
      if (jeton[1] !== undefined) {
        cmapCourante = cmapsParPolice.get(ressourcesFontes.get(jeton[1]) ?? -1) ?? cmapCourante
      } else if (jeton[2] !== undefined) {
        const suite = jeton[2]
        for (let i = 0; i + 4 <= suite.length; i += 4) {
          sortie += cmapCourante.get(parseInt(suite.slice(i, i + 4), 16)) ?? ''
        }
      }
    }
    morceaux.push(sortie)
  }
  return morceaux.join('\n')
}

// Les 10 mentions légales obligatoires du pied de facture (PRD §5.2).
// Raison sociale et adresse sont vides dans les seeds (paramètres entreprise non
// renseignés), seuls leurs libellés de bloc sont donc vérifiables côté e2e.
const MENTIONS_LEGALES_PDF = [
  'Capital',
  'RC',
  'NIF',
  'NIS',
  'AI :',
  'Tél',
  'Mode de règlement',
  'TVA : 19 %',
  'FACTURE',
  'NET À PAYER',
] as const

test.describe('Q18 — Parcours BL → facture groupée → PDF', () => {
  test('parcours complet BL vers facture groupée, validation et PDF', async ({ fenetreEgto }) => {
    test.setTimeout(120_000)
    const { fenetre } = fenetreEgto

    // Préparation — les seeds ne créent aucun client.
    const client = await appelerIpc<IdentifiantCreation>(fenetre, 'clients.creer', {
      codeClient: 'CLT-E2E-BL',
      typeClient: 'SARL',
      raisonSociale: 'Client E2E BonsLivraison',
      categorie: 'PRIVE',
    })
    expect(client.id).toBeGreaterThan(0)

    // ÉTAPE 1 — Création de 2 bons de livraison EMIS avec lignes.
    // Le schéma ne connaît que EMIS|FACTURE pour un BL (pas d'état BROUILLON) :
    // la création IPC attribue directement le numéro BL-AAAA-NNNN et le statut EMIS,
    // `modifier` ne permet pas de changer le statut (champs modifiables limités).
    const bl1 = await appelerIpc<IdentifiantCreation>(fenetre, 'bonsLivraison.creer', {
      dateLivraison: '2026-08-10',
      clientId: client.id,
      poidsPeseeKg: 1200,
      signatureClient: 1,
    })
    expect(bl1.id).toBeGreaterThan(0)
    const bl2 = await appelerIpc<IdentifiantCreation>(fenetre, 'bonsLivraison.creer', {
      dateLivraison: '2026-08-12',
      clientId: client.id,
    })
    expect(bl2.id).toBeGreaterThan(0)

    const bl1Relu = await appelerIpc<BonLivraisonLue | null>(fenetre, 'bonsLivraison.lire', bl1.id)
    expect(bl1Relu).not.toBeNull()
    expect(bl1Relu?.statut).toBe('EMIS')
    expect(bl1Relu?.numeroBl).toMatch(/^BL-2026-\d{4}$/)
    expect(bl1Relu?.factureId).toBeNull()

    const ligneBL1a = await appelerIpc<IdentifiantCreation>(fenetre, 'bonsLivraison.creerLigne', {
      blId: bl1.id,
      designation: 'Ciment CPJ 45 — tas 1',
      unite: 'T',
      quantiteMilliemes: 100000,
      puHtCentimes: 500000,
    })
    expect(ligneBL1a.id).toBeGreaterThan(0)
    const lignesBL1 = await appelerIpc<LigneBonLivraisonLue[]>(fenetre, 'bonsLivraison.listerLignes', bl1.id)
    expect(lignesBL1).toHaveLength(1)
    expect(lignesBL1[0].montantHtCentimes).toBe(50_000_000)

    const ligneBL2a = await appelerIpc<IdentifiantCreation>(fenetre, 'bonsLivraison.creerLigne', {
      blId: bl2.id,
      designation: 'Rond à béton Ø10',
      unite: 'U',
      quantiteMilliemes: 50000,
      puHtCentimes: 200000,
    })
    expect(ligneBL2a.id).toBeGreaterThan(0)
    const lignesBL2 = await appelerIpc<LigneBonLivraisonLue[]>(fenetre, 'bonsLivraison.listerLignes', bl2.id)
    expect(lignesBL2).toHaveLength(1)
    expect(lignesBL2[0].montantHtCentimes).toBe(10_000_000)

    // Vérification UI : les 2 BL apparaissent EMIS dans la liste.
    await allerALaRoute(fenetre, '/bons-livraison')
    await expect(fenetre.locator('.badge-statut', { hasText: 'EMIS' })).toHaveCount(2, {
      timeout: 10_000,
    })

    await allerALaRoute(fenetre, `/bons-livraison/${bl1.id}`)
    await expect(fenetre.locator('.ecran-fiche')).toBeVisible({ timeout: 10_000 })

    // ÉTAPE 2 — Génération de la facture groupée depuis les 2 BL.
    const generation = await appelerIpc<{ factureId: number }>(fenetre, 'bonsLivraison.genererFacture', {
      blIds: [bl1.id, bl2.id],
      clientId: client.id,
      dateFacture: '2026-08-21',
      retenueGarantieBps: 0,
      remboursementAvanceCentimes: 0,
      marchePublic: false,
    })
    expect(generation.factureId).toBeGreaterThan(0)
    const factureId = generation.factureId

    // ÉTAPE 3 — Les lignes des 2 BL sont reprises dans la facture groupée,
    // avec les montants HT nets recalculés par le moteur (rabais nul ici).
    const lignesFacture = await appelerIpc<LigneFactureLue[]>(fenetre, 'factures.listerLignes', factureId)
    expect(lignesFacture).toHaveLength(2)
    const designations = lignesFacture.map((l) => l.designation)
    expect(designations).toContain('Ciment CPJ 45 — tas 1')
    expect(designations).toContain('Rond à béton Ø10')
    for (const ligne of lignesFacture) {
      expect(ligne.quantiteMilliemes * ligne.puHtCentimes / 1000).toBe(ligne.montantHtNetCentimes)
      expect(ligne.rabaisMarcheBps).toBe(0)
      expect(ligne.montantRabaisMarcheCentimes).toBe(0)
    }

    const factureGeneree = await appelerIpc<FactureLue | null>(fenetre, 'factures.lire', factureId)
    expect(factureGeneree).not.toBeNull()
    expect(factureGeneree?.statut).toBe('BROUILLON')
    expect(factureGeneree?.numero).toBeNull()
    expect(factureGeneree?.clientId).toBe(client.id)

    // ÉTAPE 4 — Les BL facturés passent au statut FACTURE et sont liés à la facture.
    const bl1Apres = await appelerIpc<BonLivraisonLue | null>(fenetre, 'bonsLivraison.lire', bl1.id)
    const bl2Apres = await appelerIpc<BonLivraisonLue | null>(fenetre, 'bonsLivraison.lire', bl2.id)
    expect(bl1Apres?.statut).toBe('FACTURE')
    expect(bl2Apres?.statut).toBe('FACTURE')
    expect(bl1Apres?.factureId).toBe(factureId)
    expect(bl2Apres?.factureId).toBe(factureId)

    await allerALaRoute(fenetre, '/bons-livraison')
    await expect(fenetre.locator('.badge-statut', { hasText: 'FACTURE' })).toHaveCount(2, {
      timeout: 10_000,
    })

    // ÉTAPE 5 — Validation de la facture groupée : VALIDE + numéro FA-2026-NNNN.
    const factureValidee = await appelerIpc<FactureLue>(fenetre, 'factures.valider', factureId)
    expect(factureValidee.statut).toBe('VALIDE')
    expect(factureValidee.numero).toMatch(/^FA-\d{4}-\d{4}$/)

    await allerALaRoute(fenetre, '/factures')
    await allerALaRoute(fenetre, `/factures/${factureId}`)
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText(
      `Facture ${factureValidee.numero}`,
      { timeout: 10_000 },
    )

    // ÉTAPE 6 — PDF : en-tête %PDF-, contenu textuel porteur des 10 mentions légales,
    // aperçu UI visible.
    const { infos, buffer } = await lirePdfFacture(fenetre, factureId)
    expect(infos.taille).toBeGreaterThan(1000)
    expect(String.fromCharCode(...infos.entete)).toBe('%PDF-')

    const textePdf = extraireTextePdf(buffer)
    expect(textePdf.length).toBeGreaterThan(100)
    for (const mention of MENTIONS_LEGALES_PDF) {
      expect(textePdf, `Mention légale manquante dans le PDF : « ${mention} »`).toContain(mention)
    }
    expect(textePdf).toContain(factureValidee.numero ?? '')
    expect(textePdf).toContain('Client E2E BonsLivraison')
    expect(textePdf).not.toContain('timbre')

    await fenetre.getByRole('tab', { name: 'Aperçu PDF' }).click()
    await fenetre.getByRole('button', { name: 'Générer le PDF' }).click()
    await expect(fenetre.locator('iframe[title="Aperçu PDF"]')).toBeVisible({ timeout: 20_000 })
    await expect(fenetre.getByRole('button', { name: 'Télécharger' })).toBeVisible()

    // ÉTAPE 7 — Rabais marché : l'affaire porte rabaisMarcheBps = 1000 (10 %),
    // la génération depuis BL doit reprendre ce taux sur chaque ligne facturée.
    const affaireRabais = await appelerIpc<IdentifiantCreation>(fenetre, 'affaires.creer', {
      clientId: client.id,
      typeAffaire: 'MARCHE_PUBLIC',
      reference: 'AFF-E2E-RABAIS',
      objet: 'Travaux avec rabais marché E2E',
      rabaisMarcheBps: 1000,
    })
    expect(affaireRabais.id).toBeGreaterThan(0)
    const affaireRelue = await appelerIpc<AffaireLue | null>(fenetre, 'affaires.lire', affaireRabais.id)
    expect(affaireRelue?.rabaisMarcheBps).toBe(1000)

    const bl3 = await appelerIpc<IdentifiantCreation>(fenetre, 'bonsLivraison.creer', {
      dateLivraison: '2026-08-15',
      clientId: client.id,
      affaireId: affaireRabais.id,
    })
    expect(bl3.id).toBeGreaterThan(0)
    await appelerIpc<IdentifiantCreation>(fenetre, 'bonsLivraison.creerLigne', {
      blId: bl3.id,
      designation: 'Terrassement rabais marché',
      unite: 'M3',
      quantiteMilliemes: 100000,
      puHtCentimes: 500000,
    })

    const generationRabais = await appelerIpc<{ factureId: number }>(
      fenetre,
      'bonsLivraison.genererFacture',
      {
        blIds: [bl3.id],
        clientId: client.id,
        affaireId: affaireRabais.id,
        dateFacture: '2026-08-22',
        retenueGarantieBps: 0,
        remboursementAvanceCentimes: 0,
        marchePublic: true,
      },
    )
    expect(generationRabais.factureId).toBeGreaterThan(0)

    const lignesRabais = await appelerIpc<LigneFactureLue[]>(
      fenetre,
      'factures.listerLignes',
      generationRabais.factureId,
    )
    const ligneMetier = lignesRabais.find((l) => l.designation === 'Terrassement rabais marché')
    expect(ligneMetier).toBeDefined()
    if ((ligneMetier?.rabaisMarcheBps ?? 0) <= 0) {
      throw new Error(
        `BLOCAGE: genererFactureDepuisBons ne transfère pas rabais_marche_bps ` +
          `(attendu 1000 bps depuis l'affaire ${String(affaireRabais.id)}, obtenu ` +
          `${String(ligneMetier?.rabaisMarcheBps ?? 'ligne absente')} ; ` +
          `electron/depots/depot-bons-livraison.ts hardcode rabais_marche_bps: 0)`,
      )
    }
    expect(ligneMetier?.montantHtBrutCentimes).toBe(50_000_000)
    expect(ligneMetier?.montantRabaisMarcheCentimes).toBe(5_000_000)
    expect(ligneMetier?.montantHtNetCentimes).toBe(45_000_000)
  })
})
