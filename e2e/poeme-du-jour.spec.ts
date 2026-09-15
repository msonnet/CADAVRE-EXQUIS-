import { test, expect, type Page } from '@playwright/test'

/**
 * La page du cadavre du jour, côté lecture.
 *
 * Ces quatre tests décrivaient l'ancienne page : elle ressortait une
 * publication quelconque de la galerie par `dayOfYear() % n` et l'appelait
 * « poème du jour ». Ils sont réécrits, pas supprimés — ce qu'ils
 * vérifiaient reste utile, seule la promesse a changé : les poèmes affichés
 * sont ceux du JOUR MÊME, et ils viennent après la contrainte, jamais avant.
 *
 * La chaîne complète (contrainte → partie amorcée → série) est mesurée dans
 * `cadavre-du-jour.spec.ts`.
 */

const POEME_DU_JOUR = {
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

function passerLeSeuil(page: Page) {
  return page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
}

function galerie(page: Page, corps: unknown[]) {
  return page.route('**/rest/v1/gallery**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corps) }))
}

test.describe('Le cadavre du jour', () => {
  test('montre les poèmes écrits aujourd’hui', async ({ page }) => {
    await passerLeSeuil(page)
    await galerie(page, [POEME_DU_JOUR])

    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')

    // Exact : « cadavre du jour » se retrouve aussi dans le libellé du
    // bouton d'écriture, et un `text=` non ancré les prend tous les deux.
    await expect(page.getByText('CADAVRE DU JOUR', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/— LES AUTRES MAINS, AUJOURD’HUI —/)).toBeVisible({ timeout: 6000 })

    await expect(page.locator('text=le ciel pèse dévore une main ouverte')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('text=AUTEUR TEST')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /TOUTE LA GALERIE/ })).toBeVisible()
  })

  test('n’invente rien quand personne n’a encore écrit', async ({ page }) => {
    // L'ancienne page meublait avec un poème de juillet. Un rendez-vous vide
    // est une invitation ; un rendez-vous truqué est une déception qu'on
    // découvre plus tard.
    await passerLeSeuil(page)
    await galerie(page, [])

    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/La première main est la tienne|The first hand is yours/))
      .toBeVisible({ timeout: 6000 })
  })

  test('le retour ramène à l’accueil', async ({ page }) => {
    await passerLeSeuil(page)
    await galerie(page, [])

    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /← ACCUEIL|← HOME/ }).dispatchEvent('click')

    await expect(page).toHaveURL(/\/$/, { timeout: 5000 })
  })

  test('TOUTE LA GALERIE mène à la galerie', async ({ page }) => {
    await passerLeSeuil(page)
    await galerie(page, [POEME_DU_JOUR])
    await page.route('**/supabase.co/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

    await page.goto('/poeme-du-jour')
    const bouton = page.getByRole('button', { name: /TOUTE LA GALERIE/ })
    await bouton.waitFor({ timeout: 10_000 })
    await bouton.dispatchEvent('click')

    await expect(page).toHaveURL(/\/galerie$/, { timeout: 5000 })
  })
})
