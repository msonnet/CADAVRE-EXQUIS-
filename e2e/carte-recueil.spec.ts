import { test, expect, type Page } from '@playwright/test'

/**
 * La carte du Recueil — lot 11 de l'audit du 10 septembre.
 *
 * Le rapport la désigne comme le point faible du produit : une ligne de
 * texte nu, un titre qui n'est que le PREMIER FRAGMENT et non le vers,
 * l'illustration générée juste avant absente, aucun accès aux coutures.
 *
 * Relevé avant :
 *     « le vernis · PHRASE ÉTOFFÉE · 5 voix · 14 SEPTEMBRE 2026 »
 * là où le poème dit « le vernis craquelé avale une lampe sourde ».
 */

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function ouvrirLeRecueil(page: Page) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(700)
}

async function preparer(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
  await ouvrirLeRecueil(page)
  await page.evaluate(async (px) => {
    const mk = (id: string, structureId: string, cases: string[], illus: boolean, t: number) => ({
      id, titre: null, structureId, mode: 'standard', visibilite: 'aveugle',
      cases: cases.map((texte, i) => ({
        numero: i + 1, texte, auteur: i % 2 ? 'ia' : 'humain', fonction: 'x', consigne: 'x', ts: 1,
      })),
      ...(illus ? { illustration: { url: px, style: 'encre', promptUtilise: '', dateGeneration: 1 } } : {}),
      dateCreation: Date.now() - t, dateModification: Date.now(),
    })
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes'); st.clear()
      st.put(mk('a', 'phrase-etoffee', ['le vernis', 'craquelé', 'avale', 'une lampe', 'sourde'], true, 0))
      st.put(mk('b', 'atelier', ['Je marche', 'la paille ronge un rochet'], false, 1000))
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  }, PIXEL)
  await ouvrirLeRecueil(page)
}

test('la carte montre le premier VERS, pas le premier fragment', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)

  // Le poème entier, et non « le vernis » tout seul.
  await expect(page.getByText('le vernis craquelé avale une lampe sourde')).toBeVisible()
})

test('la carte porte la vignette quand l’illustration existe', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)

  const vignettes = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter(i => i.src.startsWith('data:image'))
      .map(i => ({ w: Math.round(i.getBoundingClientRect().width), alt: i.alt })))
  expect(vignettes.length, 'une vignette, pour le seul poème illustré').toBe(1)
  expect(vignettes[0].w).toBeGreaterThan(20)
  // Décorative : le nom du poème est juste à côté.
  expect(vignettes[0].alt).toBe('')
})

test('le compte dit ce qu’il compte, selon la structure', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  const texte = await page.locator('body').innerText()

  expect(texte, 'plus jamais « voix » pour compter des cases').not.toMatch(/\d+ voix/i)
  expect(texte, 'une phrase étoffée compte des fragments').toContain('5 FRAGMENTS')
  expect(texte, 'un poème d’atelier compte des vers').toContain('2 VERS')
})

test('les coutures s’ouvrent d’un seul geste depuis la carte', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)

  await page.getByLabel(/Ouvrir les coutures|Open this poem/).first().click()
  await expect(page).toHaveURL(/\/bibliotheque\/[^/?]+\?coutures/)

  // Et le panneau est déjà ouvert, sans second geste.
  await expect(page.getByText(/craquelé/).first()).toBeVisible({ timeout: 10_000 })
  const ouvert = await page.evaluate(() =>
    /FONCTION|SYNTAGME|ADJECTIF|toi|voix|COUTURES/i.test(document.body.innerText))
  expect(ouvert, 'le panneau des coutures est déplié à l’arrivée').toBe(true)
})
