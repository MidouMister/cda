import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'

const CHEM_APP = join(process.cwd(), 'out', 'main')

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

test.describe('Parcours Premier démarrage — écran de création de compte', () => {
  test('crée un compte avec mot de passe valide et affiche la phrase de récupération', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-pd-'))
    try {
      const { application, fenetre } = await lancerApp(dossier)

      await expect(fenetre.locator('h1')).toHaveText('Bienvenue dans EGTO', { timeout: 15_000 })

      await fenetre.locator('#mdp-premier').fill('MotDePasse1!')
      await fenetre.locator('#mdp-confirmation').fill('MotDePasse1!')
      await fenetre.locator('button[type="submit"]').click()

      await expect(fenetre.getByText('Votre phrase de récupération')).toBeVisible({ timeout: 10_000 })
      await expect(fenetre.getByRole('button', { name: 'J\'ai conservé ma phrase' })).toBeVisible()

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })

  test('affiche une erreur pour mot de passe trop court', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-pd-'))
    try {
      const { application, fenetre } = await lancerApp(dossier)

      await fenetre.locator('h1').waitFor({ timeout: 15_000 })

      await fenetre.locator('#mdp-premier').fill('abc')
      await fenetre.locator('#mdp-confirmation').fill('abc')
      await fenetre.locator('button[type="submit"]').click()

      await expect(fenetre.getByText('Le mot de passe doit comporter au moins 8 caractères.')).toBeVisible()

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })

  test('affiche une erreur pour mots de passe non identiques', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-pd-'))
    try {
      const { application, fenetre } = await lancerApp(dossier)

      await fenetre.locator('h1').waitFor({ timeout: 15_000 })

      await fenetre.locator('#mdp-premier').fill('MotDePasse1!')
      await fenetre.locator('#mdp-confirmation').fill('AutreMotDePasse!')
      await fenetre.locator('button[type="submit"]').click()

      await expect(fenetre.getByText('Les mots de passe ne correspondent pas.')).toBeVisible()

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })

  test('charge les données de démonstration via case à cocher', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-pd-'))
    try {
      const { application, fenetre } = await lancerApp(dossier)

      await fenetre.locator('h1').waitFor({ timeout: 15_000 })

      const checkbox = fenetre.locator('.option-demo input[type="checkbox"]')
      await checkbox.check()
      await expect(checkbox).toBeChecked()

      await fenetre.locator('#mdp-premier').fill('MotDePasse1!')
      await fenetre.locator('#mdp-confirmation').fill('MotDePasse1!')

      fenetre.on('dialog', (dialog) => dialog.accept())
      await fenetre.locator('button[type="submit"]').click()

      await expect(fenetre.getByText('Les données de démonstration ont été chargées avec succès.')).toBeVisible({ timeout: 15_000 })
      await expect(fenetre.getByText('Votre phrase de récupération')).toBeVisible()

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })

  test('l\'écran premier démarrage est accessible', async () => {
    const dossier = mkdtempSync(join(tmpdir(), 'egto-e2e-pd-'))
    try {
      const { application, fenetre } = await lancerApp(dossier)

      await fenetre.locator('h1').waitFor({ timeout: 15_000 })

      const labelMdp = fenetre.locator('label[for="mdp-premier"]')
      await expect(labelMdp).toBeVisible()
      await expect(labelMdp).toHaveText('Mot de passe')

      const labelConfirmation = fenetre.locator('label[for="mdp-confirmation"]')
      await expect(labelConfirmation).toBeVisible()
      await expect(labelConfirmation).toHaveText('Confirmer le mot de passe')

      const labelDemo = fenetre.locator('.option-demo')
      await expect(labelDemo).toBeVisible()
      await expect(labelDemo).toContainText('Charger les données de démonstration')

      const champMdp = fenetre.locator('#mdp-premier')
      await expect(champMdp).toHaveAttribute('type', 'password')

      await application.close()
    } finally {
      nettoyerDossier(dossier)
    }
  })
})
