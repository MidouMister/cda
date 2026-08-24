import { expect, test } from './helpers/fixture'

test.describe('Fumée — lancement de EGTO', () => {
  test('la fenêtre s’affiche, la session s’ouvre et la page Factures se charge', async ({
    fenetreEgto,
  }) => {
    const { applicationElectron, fenetre } = fenetreEgto

    const fenetres = applicationElectron.windows()
    expect(fenetres.length).toBeGreaterThan(0)

    await expect(fenetre.locator('.topbar .titre')).toHaveText('EGTO — Gestion Commerciale')

    await expect(fenetre.getByRole('link', { name: 'Clients' })).toBeVisible()
    await expect(fenetre.getByRole('link', { name: 'Factures' })).toBeVisible()

    await fenetre.getByRole('link', { name: 'Factures' }).click()
    await expect(fenetre.locator('.en-tete-ecran h1')).toHaveText('Factures')
    await expect(fenetre.getByRole('button', { name: 'Nouvelle facture' })).toBeVisible()
  })
})
