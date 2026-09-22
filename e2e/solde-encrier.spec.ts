import { test, expect, type Page } from '@playwright/test'

/**
 * Le solde au point de choix — lot 13 de l'audit du 10 septembre.
 *
 * Reproduit avant correction : la réserve d'essai n'était écrite QUE dans
 * les Réglages, écran qu'un joueur n'ouvre pas avant de jouer. Il
 * apprenait donc l'existence d'une limite au moment où elle lui était
 * opposée, ce qui fait passer un modèle annoncé pour un piège.
 *
 * Ce test ne vérifie pas un chiffre juste — il vérifie qu'un chiffre est
 * LÀ, avant le bouton, et qu'il ne s'invente pas là où rien n'est compté.
 */

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function ouvrirAtelier(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/atelier')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(700)
}

/**
 * Le libellé dit « ENCRIER » et non plus « ESSAI » depuis le 22 septembre :
 * le joueur a désormais jusqu'à trois provisions pour un même acte — l'essai
 * offert, le flacon acheté, le fond d'encrier de la semaine — et les additionner
 * sous le mot « essai » aurait fait mentir le mot.
 */
const solde = (page: Page) => page.getByText(
  /ENCRIER · \d+ PARTIES? (AVEC LES VOIX|CETTE SEMAINE)|INKWELL · \d+ GAMES? (WITH THE VOICES|THIS WEEK)|ENCRIER À SEC|INKWELL DRY/,
)

test('la préparation de l’Atelier annonce la réserve avant le bouton', async ({ page }) => {
  test.setTimeout(60_000)
  await ouvrirAtelier(page)

  const curseur = page.getByRole('slider', { name: /Nombre de voix|Number of voices/ })
  await curseur.fill('3')
  await page.waitForTimeout(400)

  await expect(solde(page), 'le solde est écrit sur l’écran de préparation').toBeVisible()

  // Et il se lit AVANT le bouton, pas après l'avoir pressé : le bouton est
  // toujours là, intact, et le mur d'abonnement n'est pas ouvert.
  await expect(page.getByRole('button', { name: /Ouvrir la séance|Open the séance/ })).toBeVisible()
})

test('« Seul » ne se voit opposer aucune réserve', async ({ page }) => {
  test.setTimeout(60_000)
  await ouvrirAtelier(page)

  // Aucune voix convoquée : la séance n'appelle rien et ne coûte rien.
  // Y annoncer un solde inventerait une limite qui n'existe pas.
  await page.getByRole('slider', { name: /Nombre de voix|Number of voices/ }).fill('0')
  await page.waitForTimeout(400)
  await expect(solde(page)).toHaveCount(0)
})
