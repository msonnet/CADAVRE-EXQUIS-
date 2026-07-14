import { test, expect } from '@playwright/test'

// Parcours anglais : garantit qu'aucune modification future ne casse
// silencieusement l'une des deux langues.

async function enAnglais(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('langue', 'en')
  })
}

const ITEM_EN = {
  id: 'e2e-en-1',
  type: 'poeme',
  titre: 'Moonlit Salt',
  payload: JSON.stringify({
    cases: [{ texte: 'the husk of memory' }, { texte: 'persists' }, { texte: 'a crumpled receipt' }],
    structureId: 'phrase-simple',
    titre: 'Moonlit Salt',
    langue: 'en',
  }),
  image_url: null,
  author_pseudo: 'The Sleepwalker',
  author_avatar: null,
  author_id: null,
  created_at: '2026-07-14T10:00:00Z',
  views_count: 3,
}

const ITEM_FR = {
  ...ITEM_EN,
  id: 'e2e-fr-1',
  titre: 'Le Sel Nocturne',
  payload: JSON.stringify({
    cases: [{ texte: "l'ombre du sel" }, { texte: 'demeure' }, { texte: 'un reçu froissé' }],
    structureId: 'phrase-simple',
    titre: 'Le Sel Nocturne',
    // pas de champ langue : l'historique est français
  }),
  author_pseudo: 'Anonyme',
}

test.describe('Parcours anglais', () => {
  test("l'accueil s'affiche en anglais", async ({ page }) => {
    await enAnglais(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('button', { hasText: 'Written Cadavre' })).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button', { hasText: 'Drawn Cadavre' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Online mode' })).toBeVisible()
  })

  test('les règles sont en anglais', async ({ page }) => {
    await enAnglais(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/aide')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=— RULES —')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=How to')).toBeVisible()
  })

  test('la configuration propose les structures anglaises', async ({ page }) => {
    await enAnglais(page)
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/config')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=Short sentence')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Free verse')).toBeVisible()
  })

  test('la galerie ne montre que les publications anglaises', async ({ page }) => {
    await enAnglais(page)
    await page.route('**/rest/v1/gallery?*', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([ITEM_EN, ITEM_FR]),
    }))
    await page.route('**/rest/v1/gallery_reactions*', route => route.fulfill({
      status: 200, contentType: 'application/json', body: '[]',
    }))
    await page.route('**/supabase.co/auth/**', route => route.fulfill({ status: 200, body: '{}' }))

    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')

    // La publication anglaise est visible, la française filtrée
    await expect(page.locator('text=Moonlit Salt')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Le Sel Nocturne')).toHaveCount(0)
    // L'interface elle-même est anglaise
    await expect(page.locator('text=POEMS')).toBeVisible()
  })

  test('le changement de langue depuis les réglages fonctionne', async ({ page }) => {
    // Départ en français (pas de clé langue) — bascule vers l'anglais
    await page.addInitScript(() => {
      localStorage.setItem('cadavre-onboarding-done', '1')
      // Ne pas écraser la langue à chaque chargement : le test clique ENGLISH,
      // ce qui recharge la page — l'init doit laisser ce choix survivre.
      if (!localStorage.getItem('langue')) localStorage.setItem('langue', 'fr')
    })
    await page.route('**/supabase.co/**', route => route.fulfill({ status: 200, body: '[]' }))

    await page.goto('/reglages')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=— LANGUE —')).toBeVisible({ timeout: 5000 })

    // dispatchEvent : l'écran d'entrée (splash) intercepte les clics réels
    await page.locator('button', { hasText: 'ENGLISH' }).dispatchEvent('click')
    // Le choix est persisté puis la page se recharge (window.location.reload) —
    // on navigue explicitement pour rester déterministe sous service worker.
    await page.waitForFunction(() => localStorage.getItem('langue') === 'en')
    await page.goto('/reglages')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=— LANGUAGE —')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=— SETTINGS —')).toBeVisible()
  })
})
