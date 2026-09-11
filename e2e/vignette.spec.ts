import { test, expect, type Page } from '@playwright/test'

/**
 * La vignette d'ambiance ne mord sur rien — lot 7 de l'audit du 10 septembre.
 *
 * Le collage est posé en absolu, à une place tirée au sort, sans rien savoir
 * de ce qu'il y a dessous. Relevé avant : il recouvrait la carte « I. Phrase
 * courte » des préparatifs et le champ de saisie du vers à l'Atelier — deux
 * écrans, pas les cinq du rapport, mais l'un des deux est le champ où l'on
 * écrit.
 *
 * On lui a gardé sa liberté de placement — c'est elle qui fait qu'aucun écran
 * ne ressemble au précédent — et retiré seulement le droit de mordre : elle
 * mesure ce qu'elle recouvre et se décale si besoin.
 */

const ECRANS: [string, string][] = [
  ['/', 'accueil'],
  ['/config', 'préparatifs'],
  ['/atelier', 'atelier · préparatifs'],
  ['/config-dessin', 'dessin · préparatifs'],
  ['/jeu-atelier', 'atelier · en jeu'],
  ['/bibliotheque', 'recueil'],
  ['/galerie', 'galerie'],
  ['/aide', 'règles'],
  ['/reglages', 'réglages'],
]

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Les éléments interactifs que la vignette recouvre, s'il y en a. */
const mordSur = (page: Page) => page.evaluate(() => {
  const vignette = [...document.querySelectorAll('div')].find(d => {
    const cs = getComputedStyle(d)
    return cs.position === 'absolute' && cs.zIndex === '3'
      && cs.pointerEvents === 'none' && !!d.querySelector('svg')
  })
  if (!vignette) return []   // certains écrans n'en portent pas
  const v = vignette.getBoundingClientRect()
  if (v.width === 0) return []
  return [...document.querySelectorAll('button, a[href], input, textarea, [role="button"]')]
    .filter(e => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0
        && r.left < v.right && v.left < r.right && r.top < v.bottom && v.top < r.bottom
    })
    .map(e => (e.textContent || e.getAttribute('aria-label') || '?').trim().slice(0, 30))
})

test('la vignette ne recouvre aucun élément interactif', async ({ page }) => {
  test.setTimeout(180_000)
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('coach-atelier', '1')
    localStorage.setItem('atelier-en-cours', JSON.stringify({
      plan: {
        totalVers: 11, toursJoueur: Array.from({ length: 11 }, (_, i) => i),
        toursFragmentJoueur: [], voixPool: [], echo: false, voixParVers: {},
      },
      vers: [],
    }))
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  const fautes: string[] = []
  for (const [url, nom] of ECRANS) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await franchir(page)
    // Le décalage attend deux frames puis s'anime sur 450 ms.
    await page.waitForTimeout(1500)
    const mordus = await mordSur(page)
    if (mordus.length) fautes.push(`${nom} → ${mordus.join(' · ')}`)
  }
  expect(fautes.join('\n'), 'ce que la vignette recouvre').toBe('')
})

test('elle reste à l’écran après s’être écartée', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  // Les préparatifs : l'écran le plus dense, celui où elle mordait.
  await page.goto('/config')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(1500)

  const dedans = await page.evaluate(() => {
    const v = [...document.querySelectorAll('div')].find(d => {
      const cs = getComputedStyle(d)
      return cs.position === 'absolute' && cs.zIndex === '3'
        && cs.pointerEvents === 'none' && !!d.querySelector('svg')
    })?.getBoundingClientRect()
    if (!v) return null
    return v.left >= -1 && v.top >= -1
      && v.right <= window.innerWidth + 1 && v.bottom <= window.innerHeight + 1
  })
  // Se pousser hors du cadre serait pire que mordre : on la perdrait.
  expect(dedans, 'la vignette reste visible').not.toBe(false)
})
