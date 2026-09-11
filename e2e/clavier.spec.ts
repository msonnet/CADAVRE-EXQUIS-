import { test, expect, type Page } from '@playwright/test'

/**
 * Les attributs du clavier logiciel — lot 5 de l'audit du 10 septembre.
 *
 * Relevé avant, sur le champ de vers de l'atelier, et identique partout :
 *
 *     autocapitalize: null   autocorrect: null
 *     enterkeyhint: null     inputmode: null     spellcheck: true
 *
 * Sur iOS, l'absence d'`autocapitalize` vaut `sentences` : chaque fragment
 * saisi commence par une majuscule. Or un fragment est presque toujours un
 * MILIEU de vers — d'où les « Vacille », « Calcaire », « La cire durcit »
 * plantés au milieu d'une phrase dans toute la galerie de production.
 *
 * Deux régimes, parce qu'il y a deux gestes : le fragment ne prend pas de
 * majuscule, le vers entier en prend une. Voir `src/lib/clavier.ts`.
 */

/** Ce qu'on demande à un champ de fragment. */
const FRAGMENT = { autocapitalize: 'none', autocorrect: 'off', enterkeyhint: 'done' }
/** Ce qu'on demande à un champ de vers entier. */
const VERS = { autocapitalize: 'sentences', autocorrect: 'off', enterkeyhint: 'send' }

const attributs = (champ: ReturnType<Page['locator']>) => champ.evaluate(e => ({
  autocapitalize: e.getAttribute('autocapitalize'),
  autocorrect: e.getAttribute('autocorrect'),
  enterkeyhint: e.getAttribute('enterkeyhint'),
  spellcheck: (e as HTMLInputElement | HTMLTextAreaElement).spellcheck,
  fontSize: getComputedStyle(e).fontSize,
}))

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

test("le vers entier de l'atelier prend la majuscule, le fragment non", async ({ page }) => {
  test.setTimeout(60_000)
  const plan = {
    totalVers: 11,
    toursJoueur: Array.from({ length: 11 }, (_, i) => i),
    toursFragmentJoueur: [],
    voixPool: [], echo: false, voixParVers: {},
  }
  await page.addInitScript(p => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('coach-atelier', '1')
    localStorage.setItem('atelier-en-cours', JSON.stringify({ plan: p, vers: [] }))
  }, plan)
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))

  await page.goto('/jeu-atelier')
  await page.waitForLoadState('networkidle')
  await franchir(page)

  const champ = page.locator('textarea').last()
  await champ.waitFor({ state: 'visible', timeout: 20_000 })
  const a = await attributs(champ)
  expect(a).toMatchObject(VERS)
  expect(a.spellcheck, 'la correction orthographique reste utile').toBe(true)
  // Sous 16 px, iOS zoome à la mise au point et le feuillet part de travers.
  expect(parseFloat(a.fontSize), 'taille du champ').toBeGreaterThanOrEqual(16)
})

test('la case du cadavre écrit ne met pas de majuscule', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    sessionStorage.setItem('config-partie', JSON.stringify({
      structureId: 'phrase-simple', visibilite: 'aveugle', premierJoueur: 'humain',
      mode: 'standard', joueursHumains: 1, voixIA: 0,
    }))
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '{}' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  await page.goto('/jeu')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  const passer = page.locator('button', { hasText: "C'est parti" })
  await passer.waitFor({ timeout: 10_000 })
  await passer.dispatchEvent('click')

  const champ = page.locator('textarea[aria-label="Ta contribution"]')
  await champ.waitFor({ timeout: 10_000 })
  const a = await attributs(champ)
  expect(a).toMatchObject(FRAGMENT)
  expect(a.spellcheck).toBe(true)
  expect(parseFloat(a.fontSize)).toBeGreaterThanOrEqual(16)
})

/**
 * Le champ de fragment de l'atelier et celui du salon en ligne demandent
 * chacun un contexte lourd — une table de voix qui répond, ou deux
 * appareils. On vérifie donc à la source qu'ils tirent du même réglage
 * partagé, ce qui est exactement ce qui les empêche de diverger.
 */
test('les quatre champs d’écriture tirent du réglage partagé', async () => {
  const { readFileSync } = await import('node:fs')
  const lire = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

  expect(lire('src/pages/Jeu.tsx'), 'Jeu').toContain('{...CLAVIER_FRAGMENT}')
  expect(lire('src/pages/JeuOnline.tsx'), 'JeuOnline').toContain('{...CLAVIER_FRAGMENT}')
  const atelier = lire('src/pages/JeuAtelier.tsx')
  expect(atelier, 'Atelier · fragment').toContain('{...CLAVIER_FRAGMENT}')
  expect(atelier, 'Atelier · vers entier').toContain('{...CLAVIER_VERS}')
})
