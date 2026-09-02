import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { deballerDekParPhrase } from '../electron/securite/session'

const MOT_DE_PASSE = 'Test1234!'
const CHEM_APP = join(process.cwd(), 'out', 'main')

interface EtatSession {
  verrouillee: boolean
  premierDemarrage: boolean
}

const lancerApp = async (dossierUserData: string): Promise<{ application: ElectronApplication; fenetre: Page }> => {
  const application = await _electron.launch({
    args: [CHEM_APP],
    env: {
      ...process.env,
      EGTO_E2E: '1',
      EGTO_E2E_USER_DATA_DIR: dossierUserData,
    },
  })
  const fenetre = await application.firstWindow()
  await fenetre.waitForLoadState('domcontentloaded')
  return { application, fenetre }
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

test.describe('Q19 — Sauvegarde → restauration par phrase de récupération', () => {
  test('restaure sur un profil vierge les données du poste source', async () => {
    const profilSource = mkdtempSync(join(tmpdir(), 'egto-e2e-src-'))
    const dossierArchives = mkdtempSync(join(tmpdir(), 'egto-e2e-archives-'))
    const profilCible = mkdtempSync(join(tmpdir(), 'egto-e2e-cible-'))

    try {
      // ---- Poste source : premier démarrage + données ----
      const source = await lancerApp(profilSource)
      const fenetreSource = source.fenetre
      const etatSource = await appelerIpc<EtatSession>(fenetreSource, 'session.etat')
      expect(etatSource.premierDemarrage).toBe(true)

      const { phrase } = await appelerIpc<{ phrase: string }>(
        fenetreSource,
        'session.premierDemarrage',
        { motDePasse: MOT_DE_PASSE },
      )
      await appelerIpc(fenetreSource, 'session.deverrouiller', { motDePasse: MOT_DE_PASSE })

      const crees = await appelerIpc<{ id: number }>(fenetreSource, 'clients.creer', {
        codeClient: 'CLT-REST-001',
        typeClient: 'SARL',
        raisonSociale: 'Client Restauration SARL',
        categorie: 'PRIVE',
      })
      expect(crees.id).toBeGreaterThan(0)

      // Export via sauvegarde.archiver, avec la DEK déballée par la phrase
      // (équivalent du flux `--recuperation` : clé unique = DEK).
      const dek = await deballerDekParPhrase(profilSource, phrase)
      const cheminArchive = join(dossierArchives, 'manuelle.zip')
      const exportResultat = await appelerIpc<{ succes: boolean; erreur?: string }>(
        fenetreSource,
        'sauvegarde.archiver',
        {
          dossierSource: profilSource,
          destination: cheminArchive,
          motDePasse: dek.toString('hex'),
          typeBackup: 'manuelle',
        },
      )
      expect(exportResultat.succes).toBe(true)
      // Le recours.bin (déballeur de DEK) est écrit à côté de l'archive.
      expect(existsSync(join(dossierArchives, 'recours.bin'))).toBe(true)
      await source.application.close()

      // ---- Poste cible vierge : restauration ----
      const cible = await lancerApp(profilCible)
      const fenetreCible = cible.fenetre
      const etatCible = await appelerIpc<EtatSession>(fenetreCible, 'session.etat')
      expect(etatCible.premierDemarrage).toBe(true)

      const restaurer = await appelerIpc<{ succes: boolean; erreur?: string }>(
        fenetreCible,
        'sauvegarde.restaurer',
        {
          archive: cheminArchive,
          dossierDestination: profilCible,
          phraseRecuperation: phrase,
        },
      )
      expect(restaurer.succes).toBe(true)

      // Le poste cible contient désormais les enveloppes et la base restaurée.
      expect(existsSync(join(profilCible, 'egto.db'))).toBe(true)
      await appelerIpc(fenetreCible, 'session.deverrouiller', { motDePasse: MOT_DE_PASSE })
      const clients = await appelerIpc<Array<{ codeClient: string; raisonSociale: string }>>(
        fenetreCible,
        'clients.lister',
      )
      expect(clients.some((c) => c.codeClient === 'CLT-REST-001')).toBe(true)
      await cible.application.close()
    } finally {
      for (const dossier of [profilSource, dossierArchives, profilCible]) {
        for (let tentative = 0; tentative < 10; tentative++) {
          try {
            rmSync(dossier, { recursive: true, force: true })
            break
          } catch {
            await new Promise((resoudre) => setTimeout(resoudre, 300))
          }
        }
      }
    }
  })
})
