import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  _electron,
  expect,
  test as base,
  type ElectronApplication,
  type Page,
} from '@playwright/test'

export const MOT_DE_PASSE_E2E = 'Test1234!'

export interface FenetreEgto {
  applicationElectron: ElectronApplication
  fenetre: Page
  dossierTemporaire: string
}

const CHEM_APP = join(process.cwd(), 'out', 'main')

const lancerApplication = async (dossierUserData: string): Promise<{ application: ElectronApplication; fenetre: Page }> => {
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
        throw new Error('window.egto est indisponible — le preload n\'a pas été chargé.')
      }
      let cible: unknown = hote.egto
      for (const segment of canal.split('.')) {
        if (cible === null || typeof cible !== 'object' || !(segment in cible)) {
          throw new Error(`Canal introuvable : « ${canal} »`)
        }
        cible = (cible as Record<string, unknown>)[segment]
      }
      if (typeof cible !== 'function') {
        throw new Error(`« ${canal} » n'est pas une fonction IPC.`)
      }
      return (await (cible as (...a: unknown[]) => Promise<unknown>)(...argumentsAppel)) as T
    },
    { canal, argumentsAppel },
  )

const attendreInterfacePrincipale = async (fenetre: Page): Promise<void> => {
  await expect(fenetre.locator('.sidebar')).toBeVisible({ timeout: 20_000 })
  await expect(fenetre.getByRole('link', { name: 'Clients' })).toBeVisible()
}

export const test = base.extend<{ fenetreEgto: FenetreEgto }>({
  fenetreEgto: [
    async ({}, utiliser) => {
      const dossierTemporaire = mkdtempSync(join(tmpdir(), 'egto-e2e-'))

      const { application: app1, fenetre: fen1 } = await lancerApplication(dossierTemporaire)

      const etatInitial = await appelerIpc<{ verrouillee: boolean; premierDemarrage: boolean }>(
        fen1,
        'session.etat',
      )

      if (etatInitial.premierDemarrage) {
        await appelerIpc(fen1, 'session.premierDemarrage', { motDePasse: MOT_DE_PASSE_E2E })
        await app1.close()

        const { application: app2, fenetre: fen2 } = await lancerApplication(dossierTemporaire)

        const champMotDePasse = fen2.locator('#mdp-connexion')
        await champMotDePasse.waitFor({ state: 'visible', timeout: 15_000 })
        await champMotDePasse.fill(MOT_DE_PASSE_E2E)
        await fen2.getByRole('button', { name: 'Déverrouiller' }).click()

        await attendreInterfacePrincipale(fen2)

        await utiliser({ applicationElectron: app2, fenetre: fen2, dossierTemporaire })

        await app2.close()
      } else {
        const champMotDePasse = fen1.locator('#mdp-connexion')
        await champMotDePasse.fill(MOT_DE_PASSE_E2E)
        await fen1.getByRole('button', { name: 'Déverrouiller' }).click()

        await attendreInterfacePrincipale(fen1)

        await utiliser({ applicationElectron: app1, fenetre: fen1, dossierTemporaire })

        await app1.close()
      }

      rmSync(dossierTemporaire, { recursive: true, force: true })
    },
    { scope: 'test' },
  ],
})

export { expect }
