import { test, expect, type Page } from '@playwright/test'

/**
 * Le décor vivant — `docs/direction-artistique.md`.
 *
 * Le motif du jour, sur l'accueil seulement — ici le premier, un vrai disque de
 * phénakistiscope (Vienne, vers 1830), qui tourne d'un douzième de tour par
 * image. En couleurs d'origine sur les ambiances claires ; sur les sombres,
 * sa lumière baisse jusqu'à 6,5:1 au plus contre le fond (choix de l'auteur,
 * 7 novembre).
 *
 * Relevé avant : un rotorelief dessiné au trait, immobile — un objet fait
 * pour tourner, qui ne tournait pas.
 */

// Deux graines (relevées par `composerSeance`) : Lin écru, claire ; Encre
// profonde, la plus sombre.
const LIN = { graine: 274, fond: '#f2ede2' }
const ENCRE = { graine: 74, fond: '#080604' }
/** Le papier du bord découpé des motifs : le plafond de contraste le lit. */
const PAPIER = '#f6f0e2'

/**
 * Un motif par jour de la semaine : la date est FIXÉE, sinon le motif
 * changerait selon le jour où l'on lance les mesures. La semaine du
 * 9 novembre 2026 : lundi le disque, jeudi la lune, vendredi le poisson,
 * dimanche la clef.
 */
const JOURS = {
  lundi: new Date('2026-11-09T10:00:00'),
  jeudi: new Date('2026-11-12T10:00:00'),
  vendredi: new Date('2026-11-13T10:00:00'),
  dimanche: new Date('2026-11-15T10:00:00'),
}

async function accueil(page: Page, graine: number, date: Date = JOURS.lundi) {
  await page.clock.setFixedTime(date)
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

test('les autres pages n\'ont plus de symbole : ni disque, ni dessin', async ({ page }) => {
  // Décisions de l'auteur : les motifs vivent sur l'accueil seulement, et
  // les dessins au trait d'avant sont supprimés.
  await accueil(page, LIN.graine)
  await present(page)
  await page.goto('/config')
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await expect(page.getByRole('heading', { name: /Choisir la structure/ })).toBeVisible()
  await expect(disque(page)).toHaveCount(0)
  await expect(page.locator('svg circle[r="52"]')).toHaveCount(0)   // l'ancien rotorelief
})

test('au toucher, le disque s\'emballe un instant, puis retrouve son pas', async ({ page }) => {
  await accueil(page, LIN.graine)
  await present(page)
  await page.waitForTimeout(1200)   // la chute du symbole est finie
  const vitesse = () => disque(page).evaluate(i => i.getAnimations()[0]?.playbackRate ?? 0)
  expect(await vitesse()).toBe(1)
  await disque(page).dispatchEvent('pointerdown')
  await page.waitForTimeout(150)
  expect(await vitesse()).toBeGreaterThan(1.8)
  await page.waitForTimeout(1800)
  expect(await vitesse()).toBe(1)
})

/** L'animation en cours d'un élément, et sa réaction au toucher. */
const anim = (page: Page, sel: string) => page.locator(sel).first().evaluate(e => getComputedStyle(e).animationName)

test('jeudi, la lune : le nuage la traverse ; au toucher, il passe vite', async ({ page }) => {
  await accueil(page, LIN.graine, JOURS.jeudi)
  await expect(page.getByText('La Lune et le nuage', { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.motif-lune .lune-astre')).toBeVisible()
  expect(await anim(page, '.motif-lune .lune-nuage')).toBe('lune-nuage')
  await expect(page.getByText(/chien andalou/)).toBeVisible()
  await page.waitForTimeout(1200)
  await page.locator('.motif-lune').dispatchEvent('pointerdown')
  await expect(page.locator('.motif-lune')).toHaveClass(/touche/)
  // La traversée rapide finie, le nuage reprend son pas lent.
  await expect(page.locator('.motif-lune')).not.toHaveClass(/touche/, { timeout: 4000 })
})

test('vendredi, le poisson soluble : il nage ; au toucher, il se dissout', async ({ page }) => {
  await accueil(page, LIN.graine, JOURS.vendredi)
  await expect(page.getByText('Le Poisson soluble', { exact: true })).toBeVisible({ timeout: 8000 })
  expect(await anim(page, '.motif-carpe')).toBe('carpe-nage')
  await page.waitForTimeout(1200)
  await page.locator('.motif-carpe').dispatchEvent('pointerdown')
  expect(await anim(page, '.motif-carpe')).toBe('carpe-dissout')
  await page.waitForTimeout(800)
  // Au plus fort, presque transparent.
  expect(Number(await page.locator('.motif-carpe').evaluate(e => getComputedStyle(e).opacity))).toBeLessThan(0.5)
  await expect.poll(() => anim(page, '.motif-carpe'), { timeout: 4000 }).toBe('carpe-nage')
})

test('dimanche, la clef des songes : elle se balance ; au toucher, un quart de tour', async ({ page }) => {
  await accueil(page, ENCRE.graine, JOURS.dimanche)
  await expect(page.getByText('La Clef des songes', { exact: true })).toBeVisible({ timeout: 8000 })
  expect(await anim(page, '.motif-clef')).toBe('clef-balance')
  await page.waitForTimeout(1200)
  await page.locator('.motif-clef').dispatchEvent('pointerdown')
  expect(await anim(page, '.motif-clef')).toBe('clef-tourne')
  await expect.poll(() => anim(page, '.motif-clef'), { timeout: 4000 }).toBe('clef-balance')
})

test('sous mouvement réduit, chaque motif est posé', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [date, sel] of [[JOURS.jeudi, '.motif-lune .lune-nuage'], [JOURS.vendredi, '.motif-carpe'], [JOURS.dimanche, '.motif-clef']] as const) {
    await accueil(page, LIN.graine, date)
    await expect(page.locator(sel).first()).toBeVisible({ timeout: 8000 })
    expect(await anim(page, sel), sel).toBe('none')
  }
})

test('sous mouvement réduit, le disque reste posé, immobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await accueil(page, LIN.graine)
  await present(page)
  expect(await disque(page).evaluate(i => getComputedStyle(i).animationName)).toBe('none')
  expect(await disque(page).evaluate(i => getComputedStyle(i).transform)).toBe('none')
})
