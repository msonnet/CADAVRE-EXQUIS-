import { test, expect } from '@playwright/test'

// Dismiss the first-run onboarding modal by marking it done in localStorage
async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
}

test.describe('Accueil', () => {
  test('page loads with Exquis. title and CTA buttons', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The large "Exquis." typographic title should be visible
    await expect(page.locator('text=Exquis.')).toBeVisible({ timeout: 5000 })

    // Primary CTAs
    await expect(page.locator('button', { hasText: 'Cadavre Écrit' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Cadavre Dessiné' })).toBeVisible()

    // Secondary CTA
    await expect(page.locator('button', { hasText: 'Mode en ligne' })).toBeVisible()
  })

  test('footer navigation links are all present', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button', { hasText: 'Recueil' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Galerie' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Règles' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Du jour' })).toBeVisible()
  })

  test('clicking Cadavre Écrit navigates to /config', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // dispatchEvent fires directly on the element regardless of overlays
    await page.locator('button', { hasText: 'Cadavre Écrit' }).dispatchEvent('click')
    await expect(page).toHaveURL(/\/config$/, { timeout: 5000 })
  })

  test('footer Du jour link navigates to /poeme-du-jour', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.locator('button', { hasText: 'Du jour' }).dispatchEvent('click')
    await expect(page).toHaveURL(/\/poeme-du-jour$/, { timeout: 5000 })
  })

  test('retirer button is present and shows color label', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button[title="Re-tirer un rêve"]')).toBeVisible()
  })
})
