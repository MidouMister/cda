import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

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

const preparerProfilAvecCompte = async (
  dossier: string,
): Promise<{ application: ElectronApplication; fenetre: Page }> => {
  const { application: app1, fenetre: fen1 } = await lancerApp(dossier)
  const etat = await appelerIpc<EtatSession>(fen1, 'session.etat')
  expect(etat.premierDemarrage).toBe(true)

  await appelerIpc(fen1, 'session.premierDemarrage', { motDePasse: MOT_DE_PASSE })
  await app1.close()

  const { application, fenetre } = await lancerApp(dossier)
  const champMdp = fenetre.locator('#mdp-connexion')
  await champMdp.waitFor({ state: 'visible', timeout: 15_000 })

  return { application, fenetre }
}

const nettoyerDossier = (dossier: string): void => {
  for (let tentative = 0; tentative < 10; tentative++) {
    try {
      rmSync(dossier, { recursive: true, force: true })
      break
    } catch {
      // Windows peut verrouiller les fichiers brièvement après la fermeture d'Electron
    }
  }
}

test.describe('Parcours Connexion — écran de déverrouillage', () => {
  test('mot de passe incorrect affiche une erreur', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-co-'))
    try {
      const { application, fenetre } = await preparerProfilAvecCompte(dossier)

      await fenetre.locator('#mdp-connexion').fill('MauvaisMotDePasse!')
      await fenetre.getByRole('button', { name: 'Déverrouiller' }).click()

      await expect(fenetre.locator('.erreur')).toBeVisible({ timeout: 5_000 })

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })

  test('bon mot de passe déverrouille l\'application', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-co-'))
    try {
      const { application, fenetre } = await preparerProfilAvecCompte(dossier)

      await fenetre.locator('#mdp-connexion').fill(MOT_DE_PASSE)
      await fenetre.getByRole('button', { name: 'Déverrouiller' }).click()

      await expect(fenetre.locator('.sidebar')).toBeVisible({ timeout: 20_000 })
      await expect(fenetre.getByRole('link', { name: 'Factures' })).toBeVisible()

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })

  test('le lien « Restaurer une sauvegarde ? » mène à l\'écran de restauration', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-co-'))
    try {
      const { application, fenetre } = await preparerProfilAvecCompte(dossier)

      const lienRestauration = fenetre.getByRole('button', { name: 'Restaurer une sauvegarde ?' })
      await expect(lienRestauration).toBeVisible()
      await lienRestauration.click()

      await expect(fenetre.getByText('Restaurer une sauvegarde')).toBeVisible({ timeout: 10_000 })
      await expect(fenetre.locator('#phrase-restauration')).toBeVisible()
      await expect(fenetre.getByRole('button', { name: 'Retour à la connexion' })).toBeVisible()

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })
})
