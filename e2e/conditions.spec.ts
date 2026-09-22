import { test, expect, type Page } from '@playwright/test'

/**
 * Les conditions d'utilisation — ce que trois textes exigent.
 *
 * Le jeu n'en avait aucune : seulement `/privacy`, et un lien vers l'EULA
 * STANDARD d'Apple, qui est une licence logicielle et ne dit rien du
 * contenu. Ce que ces mesures gardent, ce n'est pas la prose — c'est la
 * présence des clauses sans lesquelles la soumission est refusée :
 *
 *   · Apple 1.2 — « aucune tolérance » pour le contenu répréhensible, et
 *     l'exclusion des auteurs abusifs ;
 *   · DSA art. 14 et 16 — des conditions claires et un point de contact
 *     joignable, quelle que soit la taille de l'éditeur ;
 *   · AI Act art. 50 — dire qu'une machine écrit une partie du texte.
 */

async function ouvrir(page: Page, url: string) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({
    status: 200, contentType: 'application/json', body: '[]',
  }))
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(800)
}

test('la tolérance zéro y est écrite — Apple 1.2', async ({ page }) => {
  await ouvrir(page, '/conditions')
  const vu = await page.evaluate(() => document.body.innerText)
  expect(vu).toMatch(/AUCUNE TOLÉRANCE|NO TOLERANCE/)
  expect(vu, 'les auteurs abusifs sont exclus').toMatch(/exclusion immédiate|permanent exclusion/)
  expect(vu, 'les mineurs sont nommés').toMatch(/mineurs|minors/)
})

test('le point de contact est joignable — DSA art. 16', async ({ page }) => {
  await ouvrir(page, '/conditions')
  const vu = await page.evaluate(() => document.body.innerText)
  expect(vu, 'une adresse, pas un formulaire').toMatch(/[\w.+-]+@[\w-]+\.\w+/)
  expect(vu).toMatch(/services numériques|Digital Services Act/)
  // Le canal ouvert : une notification de contenu illicite ne doit exiger
  // aucun compte, et il faut que les conditions le disent.
  expect(vu).toMatch(/sans compte|no account/)
})

test('la machine est nommée — AI Act art. 50', async ({ page }) => {
  await ouvrir(page, '/conditions')
  const vu = await page.evaluate(() => document.body.innerText)
  expect(vu).toMatch(/intelligence artificielle|artificial intelligence/)
  expect(vu, 'le modèle et son éditeur').toMatch(/Claude/)
  expect(vu).toMatch(/Anthropic/)
})

test('le retrait s’explique, et la limite est dite — DSA art. 17', async ({ page }) => {
  // Le poème du jour est pseudonyme et sans adresse : on ne peut pas
  // prévenir son auteur. Le taire serait pire que l'écrire.
  await ouvrir(page, '/conditions')
  const vu = await page.evaluate(() => document.body.innerText)
  expect(vu).toMatch(/nous ne pouvons pas vous prévenir|we cannot notify you/)
  expect(vu, 'et un recours existe').toMatch(/contester|contest/)
})

test('on y arrive depuis les Réglages, à côté de la confidentialité', async ({ page }) => {
  await ouvrir(page, '/reglages')
  await expect(page.getByRole('link', { name: /Confidentialité|Privacy/ })).toBeVisible()
  await page.getByRole('link', { name: /Conditions d’utilisation|Terms of use/ }).click()
  await expect(page).toHaveURL(/\/conditions$/, { timeout: 5000 })
})

test('et depuis le mur, où Apple les attend', async ({ page }) => {
  await ouvrir(page, '/reglages')
  await page.getByRole('button', { name: /REMPLIR L’ENCRIER|FILL THE INKWELL/ }).click()
  await page.waitForTimeout(700)
  // Trois liens : les conditions, la licence d'Apple (3.1.2), la
  // confidentialité. La licence ne remplace pas les conditions.
  const mur = page.getByRole('dialog')
  await expect(mur.getByRole('link', { name: /Conditions d’utilisation|Terms of use/ })).toBeVisible()
  await expect(mur.getByRole('link', { name: /Licence/ })).toBeVisible()
})
