import { test, expect } from '@playwright/test'

const MOCK_POEM = {
  id: 'test-poem-1',
  type: 'poeme',
  titre: 'Le Ciel Brisé',
  payload: JSON.stringify({
    structureId: 'phrase-simple',
    cases: [
      { texte: 'le ciel pèse' },
      { texte: 'dévore' },
      { texte: 'une main ouverte' },
    ],
  }),
  image_url: null,
  author_pseudo: 'Auteur Test',
  author_avatar: null,
  created_at: new Date().toISOString(),
}

function skipOnboarding(page: import('@playwright/test').Page) {
  return page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
}

test.describe('Poème du jour', () => {
  test('shows poem when gallery has entries', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/rest/v1/gallery**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_POEM]),
      }),
    )

    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=POÈME DU JOUR')).toBeVisible({ timeout: 5000 })

    await expect(page.locator('text=le ciel pèse')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('text=dévore')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('text=une main ouverte')).toBeVisible({ timeout: 6000 })

    await expect(page.locator('text=Auteur Test')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button', { hasText: 'PARTAGER' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'GALERIE' })).toBeVisible()
  })

  test('shows empty state when gallery has no poems', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/rest/v1/gallery**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=La galerie est encore vide')).toBeVisible({ timeout: 5000 })
  })

  test('back button navigates away from the page', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/rest/v1/gallery**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    // Navigate from homepage first so there is history to go back to
    await page.goto('/')
    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')

    const currentUrl = page.url()
    await page.locator('button', { hasText: '← RETOUR' }).dispatchEvent('click')

    // URL should change after navigate(-1)
    await page.waitForFunction(
      (url) => window.location.href !== url,
      currentUrl,
      { timeout: 5000 },
    )
  })

  test('GALERIE button navigates to /galerie', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/rest/v1/gallery**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_POEM]),
      }),
    )
    await page.route('**/supabase.co/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await page.goto('/poeme-du-jour')
    await page.locator('button', { hasText: 'GALERIE' }).waitFor({ timeout: 10000 })
    await page.locator('button', { hasText: 'GALERIE' }).dispatchEvent('click')

    await expect(page).toHaveURL(/\/galerie$/, { timeout: 5000 })
  })
})
