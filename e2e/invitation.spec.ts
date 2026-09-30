import { test, expect } from '@playwright/test'

/**
 * L'invité arrive au salon par un lien — même sans identité.
 *
 * Avant : ouvrir `/salon/KX7Q` sans identité renvoyait vers `/online` tout
 * court. Le code se perdait, l'invité arrivait sur un écran générique et
 * devait se faire DICTER le code par quelqu'un.
 */
test('un lien de salon ouvert sans identité garde le code et le dit', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))

  await page.goto('/salon/KX7Q')
  await page.waitForLoadState('networkidle')
  const seuil = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await seuil.click({ timeout: 4000 }).catch(() => {})

  await expect(page).toHaveURL(/\/online\?salon=KX7Q$/, { timeout: 5000 })
  await expect(page.getByText(/ON T'ATTEND AU SALON KX7Q|YOU ARE EXPECTED AT ROOM KX7Q/)).toBeVisible()

  // Le code est retenu pendant qu'on passe ailleurs (le profil, par exemple).
  const retenu = await page.evaluate(() => sessionStorage.getItem('cadavre-salon-attendu'))
  expect(retenu).toBe('KX7Q')
})
