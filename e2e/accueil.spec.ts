import { test, expect } from '@playwright/test'

// Dismiss the first-run onboarding modal by marking it done in localStorage
async function skipOnboarding(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
}

test.describe('Accueil', () => {
  test('page loads with Exquis title and CTA buttons', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // The large "Exquis" typographic title should be visible. The word
    // carries no full stop: at 106px the Bodoni period reads as a red disc.
    await expect(page.locator('text=Exquis')).toBeVisible({ timeout: 5000 })

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
    await expect(page.locator('button', { hasText: 'Réglages' })).toBeVisible()
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

  // Les quatre modes de jeu sont une seule famille de boutons. Relevé avant :
  // « Mode en ligne » et « L'Atelier » étaient des cadres vides, d'un autre
  // corps (17 et 15 px) et d'un autre espacement que les deux cadavres — on
  // lisait deux boutons de jeu suivis de deux liens d'une autre application.
  test('les quatre modes de jeu sont quatre pavés de la même famille', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const styles = await page.evaluate(() => {
      const noms = [/Cadavre Écrit/, /Cadavre Dessiné/, /Mode en ligne/, /Atelier/]
      const boutons = [...document.querySelectorAll('button')]
      return noms.map(n => {
        const b = boutons.find(x => n.test(x.textContent || ''))!
        const cs = getComputedStyle(b)
        return { texte: b.textContent, corps: cs.fontSize, espacement: cs.letterSpacing, graisse: cs.fontWeight,
          casse: cs.textTransform, rayon: cs.borderTopLeftRadius, bordure: cs.borderTopStyle, fond: cs.backgroundColor, largeur: b.offsetWidth }  // la largeur de mise en page : le pied se déplie en 3D à l'ouverture, la boîte projetée change
      })
    })
    const typo = (x: typeof styles[number]) => [x.corps, x.espacement, x.graisse, x.casse, x.rayon, x.largeur].join(' ')
    for (const st of styles) {
      expect(typo(st), st.texte ?? '').toBe(typo(styles[0]))
      // Plein, sans cadre : plus de bouton « vide ».
      expect(st.bordure, st.texte ?? '').toBe('none')
      expect(st.fond, st.texte ?? '').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
    }
    // Quatre couleurs pour quatre modes, et plus d'étoiles qui mettaient l'Atelier à part.
    expect(new Set(styles.map(st => st.fond)).size).toBe(4)
    expect(styles[3].texte).not.toContain('✧')
  })

  test('Mode en ligne et L’Atelier mènent à leur mode', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('button', { hasText: 'Mode en ligne' }).dispatchEvent('click')
    await expect(page).toHaveURL(/\/online$/, { timeout: 5000 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.locator('button', { hasText: "L'Atelier" }).dispatchEvent('click')
    await expect(page).toHaveURL(/\/atelier$/, { timeout: 5000 })
  })

  test('le poème du jour est accessible depuis la galerie', async ({ page }) => {
    await skipOnboarding(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')

    await page.locator('button', { hasText: 'POÈME DU JOUR' }).dispatchEvent('click')
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
