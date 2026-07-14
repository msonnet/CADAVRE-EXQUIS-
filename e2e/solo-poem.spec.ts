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
  const passerBtn = page.locator('button', { hasText: "C'est parti" })
  await passerBtn.waitFor({ timeout: 8000 })
  await passerBtn.dispatchEvent('click')

  const textarea = page.locator('textarea[aria-label="Ta contribution"]')
  await textarea.waitFor({ timeout: 6000 })
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

    // AI handles case 0 automatically (2600ms reveal timer hardcoded)
    // Wait for the passage screen for the human's turn
    const passerBtn = page.locator('button', { hasText: "C'est parti" })
    await passerBtn.waitFor({ timeout: 15000 })
    await passerBtn.dispatchEvent('click')

    const textarea = page.locator('textarea[aria-label="Ta contribution"]')
    await textarea.waitFor({ timeout: 6000 })
    await textarea.fill('embrasse')
    await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').dispatchEvent('click')

    // AI handles case 2 then navigates to /fin
    await expect(page).toHaveURL(/\/fin$/, { timeout: 15000 })
  })
})
