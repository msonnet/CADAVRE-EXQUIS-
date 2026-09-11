import { test, expect, type Page } from '@playwright/test'

/**
 * Aucune cible interactive sous 44 × 44 — lot 8 de l'audit du 10 septembre.
 *
 * Relevé avant : les liens de navigation et de sortie faisaient 20 px de
 * haut, les boutons d'option 39 à 40, les petits ✦ 31 à 33.
 *
 * On agrandit la ZONE et non le dessin : la classe `.cible` pose un
 * pseudo-élément centré, étiré au plus grand des deux — la taille réelle ou
 * 44 px. Rien ne bouge dans le flux, la finesse du carnet reste intacte.
 * Ce test mesure donc la zone d'appui réelle, pas la boîte de l'élément.
 */

const SEUIL = 44

const ECRANS: [string, string][] = [
  ['/', 'accueil'],
  ['/config', 'préparatifs'],
  ['/atelier', 'atelier · préparatifs'],
  ['/config-dessin', 'dessin · préparatifs'],
  ['/bibliotheque', 'recueil'],
  ['/galerie', 'galerie'],
  ['/aide', 'règles'],
  ['/reglages', 'réglages'],
  ['/online', 'salons'],
  ['/recolte', 'carnet'],
]

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/**
 * Les cibles trop petites, zone d'appui comprise.
 *
 * La zone réelle est l'union de la boîte de l'élément et de son
 * pseudo-élément `::after` quand il en porte un — c'est lui qui reçoit
 * l'appui. `getBoundingClientRect` seul mesurerait le dessin et rendrait un
 * verdict faux dans les deux sens.
 */
const tropPetites = (page: Page) => page.evaluate((seuil: number) => {
  const zone = (e: Element) => {
    const r = e.getBoundingClientRect()
    const ap = getComputedStyle(e, '::after')
    let w = r.width, h = r.height
    if (ap.content && ap.content !== 'none') {
      w = Math.max(w, parseFloat(ap.width) || 0)
      h = Math.max(h, parseFloat(ap.height) || 0)
    }
    return { w, h }
  }
  return [...document.querySelectorAll('button, a[href], input:not([type="range"]):not([type="color"]), textarea, [role="button"]')]
    .filter(e => {
      const r = e.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return false
      const cs = getComputedStyle(e)
      return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none'
    })
    .map(e => ({ ...zone(e), t: (e.textContent || e.getAttribute('aria-label') || '?').trim().slice(0, 34) }))
    .filter(x => x.w < seuil - 0.5 || x.h < seuil - 0.5)
    .map(x => `${x.t} [${Math.round(x.w)}×${Math.round(x.h)}]`)
}, SEUIL)

test('aucune cible sous 44 px, sur dix écrans', async ({ page }) => {
  test.setTimeout(180_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  const fautes: string[] = []
  for (const [url, nom] of ECRANS) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.waitForTimeout(1200)
    const petites = await tropPetites(page)
    if (petites.length) fautes.push(`${nom} → ${petites.join(' · ')}`)
  }
  expect(fautes.join('\n'), 'cibles sous le seuil').toBe('')
})
