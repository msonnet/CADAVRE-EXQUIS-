import { test, expect } from '@playwright/test'

async function setConfig(page: import('@playwright/test').Page, overrides: Record<string, unknown> = {}) {
  const config = {
    structureId: 'phrase-simple',
    visibilite: 'aveugle',
    premierJoueur: 'humain',
    mode: 'standard',
    joueursHumains: 1,
    voixIA: 0,
    ...overrides,
  }
  await page.addInitScript((cfg) => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    sessionStorage.setItem('config-partie', JSON.stringify(cfg))
  }, config)
}

// Play through one human case: passage screen → type → submit
async function joueurContribue(page: import('@playwright/test').Page, texte: string) {
  // Plus d'écran de passage à taper en solo depuis le lot 10 : le rideau
  // annonce l'acte et se lève de lui-même au bout de 1,1 s.
  //
  // On attend un champ VIDE et pas seulement présent : entre deux actes, le
  // champ de l'acte précédent reste monté le temps d'une frame, et le
  // remplir à cet instant écrivait dans une case sur le point de
  // disparaître — la partie n'avançait plus.
  const textarea = page.locator('textarea[aria-label="Ta contribution"]')
  await textarea.waitFor({ timeout: 10000 })
  await expect(textarea).toHaveValue('', { timeout: 8000 })
  await textarea.fill(texte)

  const sceller = page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]')
  await expect(sceller).toBeEnabled({ timeout: 3000 })
  await sceller.dispatchEvent('click')
}

test.describe('Solo poem flow (human-only, phrase-simple)', () => {
  test.setTimeout(30000)

  test('completes 3 human cases and reaches /fin with poem text', async ({ page }) => {
    await setConfig(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '{}' }))

    await page.goto('/jeu')

    await joueurContribue(page, 'le vent froid')
    await joueurContribue(page, 'dévore')
    await joueurContribue(page, 'la nuit épaisse')

    await expect(page).toHaveURL(/\/fin$/, { timeout: 10000 })
    await expect(page.locator('text=le vent froid')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Solo poem flow with AI voice (phrase-simple)', () => {
  test.setTimeout(40000)

  test('AI fills first and third cases, human fills second', async ({ page }) => {
    await page.route('**/api/claude**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ texte: 'une ombre blanche', source: 'ia', voixNom: 'Écho' }),
      }),
    )
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '{}' }))

    await setConfig(page, { voixIA: 1, premierJoueur: 'ia' })
    await page.goto('/jeu')

    // La voix traite la case 0 toute seule (révélation de 2600 ms), puis le
    // rideau d'acte se lève sans qu'on tape quoi que ce soit — lot 10.
    const textarea = page.locator('textarea[aria-label="Ta contribution"]')
    await textarea.waitFor({ timeout: 20000 })
    await expect(textarea).toHaveValue('', { timeout: 8000 })
    await textarea.fill('embrasse')
    await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').dispatchEvent('click')

    // AI handles case 2 then navigates to /fin
    await expect(page).toHaveURL(/\/fin$/, { timeout: 15000 })
  })
})
