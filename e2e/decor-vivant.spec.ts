import { test, expect, type Page } from '@playwright/test'

/**
 * Le décor vivant — `docs/direction-artistique.md`.
 *
 * Premier élément : le symbole du jour peut être un vrai disque de
 * phénakistiscope (Vienne, vers 1830), qui tourne d'un douzième de tour par
 * image. En couleurs d'origine sur les ambiances claires ; sur les sombres,
 * sa lumière baisse jusqu'à 6,5:1 au plus contre le fond (choix de l'auteur,
 * 7 novembre).
 *
 * Relevé avant : un rotorelief dessiné au trait, immobile — un objet fait
 * pour tourner, qui ne tournait pas.
 */

// Deux graines dont le symbole du jour est le disque (relevées par
// `composerSeance`) : Lin écru, claire ; Encre profonde, la plus sombre.
const LIN = { graine: 274, fond: '#f2ede2' }
const ENCRE = { graine: 74, fond: '#080604' }
const PAPIER = '#eddbba'

async function accueil(page: Page, graine: number) {
  await page.addInitScript(g => {
    const d = new Date()
    const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('cadavre-ambiance', JSON.stringify({ graine: g, jour }))
    localStorage.setItem('cadavre-onboarding-done', '1')
  }, graine)
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
  await page.goto('/')
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

const disque = (page: Page) => page.locator('img.phenakistiscope')

/** L'image est chargée, et le cartel la nomme. */
async function present(page: Page) {
  await expect(disque(page)).toBeVisible({ timeout: 8000 })
  await expect.poll(() => disque(page).evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByText('Le Phénakistiscope', { exact: true })).toBeVisible()
}

/** Le filtre posé par le décor sur le cadre du disque. */
const filtre = (page: Page) => disque(page).evaluate(i => getComputedStyle(i.parentElement!).filter)

/** Ratio WCAG du papier assombri par `brightness(f)` contre le fond. */
function ratio(hex: string, f: number, fond: string) {
  const lum = (h: string, k = 1) => {
    const c = [1, 3, 5].map(i => {
      const v = (parseInt(h.slice(i, i + 2), 16) * k) / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  }
  const [a, b] = [lum(hex, f), lum(fond)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

test('sur une ambiance claire, le disque tourne dans ses couleurs d\'origine', async ({ page }) => {
  await accueil(page, LIN.graine)
  await present(page)
  // Il tourne : deux relevés de sa rotation diffèrent.
  const angle = () => disque(page).evaluate(i => getComputedStyle(i).transform)
  const a = await angle()
  await page.waitForTimeout(250)
  expect(await angle()).not.toBe(a)
  expect(await disque(page).evaluate(i => getComputedStyle(i).animationName)).toBe('phenakistiscope')
  // Ni inversé ni assombri : seulement son ombre portée.
  const f = await filtre(page)
  expect(f).not.toMatch(/invert|brightness/)
  expect(f).toMatch(/drop-shadow/)
})

test('sur une ambiance sombre, sa lumière baisse jusqu\'au plafond — jamais inversé', async ({ page }) => {
  await accueil(page, ENCRE.graine)
  await present(page)
  const f = await filtre(page)
  expect(f).not.toMatch(/invert/)
  const m = /brightness\(([\d.]+)\)/.exec(f)
  expect(m, `filtre : ${f}`).not.toBeNull()
  const facteur = Number(m![1])
  expect(facteur).toBeLessThan(1)
  // Le plafond tient : au plus 6,5:1 contre le fond…
  expect(ratio(PAPIER, facteur, ENCRE.fond)).toBeLessThanOrEqual(6.5)
  // … et il n'est pas plus sombre qu'il ne faut (brut, il ferait 15:1).
  expect(ratio(PAPIER, facteur, ENCRE.fond)).toBeGreaterThan(6)
})

test('sur les autres pages, rien ne change : le rotorelief dessiné, sans disque', async ({ page }) => {
  // Décision de l'auteur : le disque vit sur l'accueil seulement.
  await accueil(page, LIN.graine)
  await present(page)
  await page.goto('/config')
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await expect(page.getByRole('heading', { name: /Choisir la structure/ })).toBeVisible()
  await expect(disque(page)).toHaveCount(0)
  // Le symbole du jour y est toujours — dessiné, en SVG (les cercles du rotorelief).
  await expect(page.locator('svg circle[r="52"]')).toHaveCount(1)
})

test('sous mouvement réduit, le disque reste posé, immobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await accueil(page, LIN.graine)
  await present(page)
  expect(await disque(page).evaluate(i => getComputedStyle(i).animationName)).toBe('none')
  expect(await disque(page).evaluate(i => getComputedStyle(i).transform)).toBe('none')
})
