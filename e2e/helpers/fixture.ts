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

const attendreInterfacePrincipale = async (fenetre: Page): Promise<void> => {
  await expect(fenetre.locator('.sidebar')).toBeVisible({ timeout: 20_000 })
  await expect(fenetre.getByRole('link', { name: 'Clients' })).toBeVisible()
}

export const test = base.extend<{ fenetreEgto: FenetreEgto }>({
  fenetreEgto: [
    async ({}, utiliser) => {
      const dossierTemporaire = mkdtempSync(join(tmpdir(), 'egto-e2e-'))
      const cheminApplication = join(process.cwd(), 'out', 'main')

      const applicationElectron = await _electron.launch({
        args: [cheminApplication],
        env: {
          ...process.env,
          EGTO_E2E: '1',
          EGTO_E2E_USER_DATA_DIR: dossierTemporaire,
        },
      })

      const fenetre = await applicationElectron.firstWindow()
      await fenetre.waitForLoadState('domcontentloaded')

      const etatInitial = await fenetre.evaluate(async () => {
        const hote = window as unknown as {
          egto?: { session: { etat: () => Promise<{ verrouillee: boolean; premierDemarrage: boolean }> } }
        }
        if (!hote.egto) {
          throw new Error('window.egto est indisponible — le preload n’a pas été chargé.')
        }
        return hote.egto.session.etat()
      })

      if (etatInitial.premierDemarrage) {
        await fenetre.evaluate(async (motDePasse) => {
          const hote = window as unknown as {
            egto: {
              session: {
                premierDemarrage: (d: { motDePasse: string }) => Promise<{ phrase: string }>
              }
            }
          }
          await hote.egto.session.premierDemarrage({ motDePasse })
        }, MOT_DE_PASSE_E2E)
      }

      const champMotDePasse = fenetre.locator('#mdp-connexion')
      const formulaireConnexionPresent = await champMotDePasse
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false)

      if (formulaireConnexionPresent) {
        await champMotDePasse.fill(MOT_DE_PASSE_E2E)
        await fenetre.getByRole('button', { name: 'Déverrouiller' }).click()
      } else if (etatInitial.verrouillee) {
        await fenetre.evaluate(async (motDePasse) => {
          const hote = window as unknown as {
            egto: {
              session: { deverrouiller: (d: { motDePasse: string }) => Promise<void> }
            }
          }
          await hote.egto.session.deverrouiller({ motDePasse })
        }, MOT_DE_PASSE_E2E)
      }

      await attendreInterfacePrincipale(fenetre)

      await utiliser({ applicationElectron, fenetre, dossierTemporaire })

      await applicationElectron.close()
      rmSync(dossierTemporaire, { recursive: true, force: true })
    },
    { scope: 'test' },
  ],
})

export { expect }
