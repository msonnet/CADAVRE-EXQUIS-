import { test, expect, type Page } from '@playwright/test'

/**
 * Les animations du chantier EffectCraft — `docs/chantier-effectcraft.md`.
 *
 * Étape 2 : la couture remplace l'étoile qui battait aux douze attentes
 * courtes. Les mesures unitaires disent qu'elle est posée aux douze
 * endroits ; celles-ci la regardent à l'écran, dans la galerie — la seule
 * attente qu'on puisse tenir ouverte aussi longtemps qu'on veut, en
 * retenant la réponse de Supabase.
 *
 * Relevé avant : une étoile ✦ qui bat, la même aux douze endroits, de la
 * couleur de l'accent. Après : une aiguille pique, tend un point, l'étoffe
 * avance — le fil à l'accent de l'ambiance, l'aiguille à son encre.
 */

/**
 * Deux séances fixées par leur graine — relevées par `composerSeance` le
 * 7 novembre. Si les ambiances changent, ces couleurs aussi : relever.
 */
const AMBIANCES = [
  { nom: 'Lin écru, claire', graine: 6, accent: '#c01c14', encre: '#0c0a06' },
  { nom: 'Minuit, sombre', graine: 7, accent: '#f06840', encre: '#f0e4cc' },
]

const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function preparer(page: Page, graine: number) {
  await page.addInitScript(g => {
    const d = new Date()
    const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    localStorage.setItem('cadavre-ambiance', JSON.stringify({ graine: g, jour }))
    localStorage.setItem('cadavre-onboarding-done', '1')
  }, graine)
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
}

/** Supabase ne répond qu'au signal : l'attente reste ouverte jusque-là. */
async function retenirSupabase(page: Page): Promise<() => void> {
  let lacher!: () => void
  const porte = new Promise<void>(ok => { lacher = ok })
  await page.route('**/supabase.co/**', async r => {
    await porte
    await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {})
  })
  return lacher
}

/**
 * Le nœud de la pose est-il visible ? C'est le seul APLAT à l'accent de la
 * couture (le fil est un trait) ; pendant la boucle, son groupe est à
 * opacité nulle.
 */
const noeudVisible = (page: Page, accent: string) =>
  page.locator('[data-animation="couture"] >> nth=0').evaluate((el, acc) =>
    [...el.querySelectorAll('svg path')].some(p => {
      if (getComputedStyle(p).fill !== acc) return false
      for (let n: Element | null = p; n && n.tagName !== 'svg'; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (n.getAttribute('opacity') === '0' || cs.opacity === '0' || cs.display === 'none') return false
      }
      return true
    }), rgb(accent))

/** Les traits du SVG de l'animation, en couleurs calculées. */
const traitsDe = (page: Page, sel: string) => page.locator(sel).evaluate(el =>
  [...el.querySelectorAll('svg path')]
    .map(p => getComputedStyle(p).stroke)
    .filter(s => s && s !== 'none'))

for (const a of AMBIANCES) {
  for (const largeur of [320, 390]) {
    test(`la galerie attend en cousant — ${a.nom}, ${largeur} points`, async ({ page }) => {
      test.setTimeout(45_000)
      await page.setViewportSize({ width: largeur, height: 760 })
      await preparer(page, a.graine)
      const lacher = await retenirSupabase(page)
      await page.goto('/galerie')
      await franchir(page)

      const couture = page.locator('[data-animation="couture"]').first()
      await expect(couture).toHaveAttribute('data-etat', 'pret', { timeout: 8000 })
      // Seule sur la page : elle se nomme.
      await expect(couture).toHaveAttribute('role', 'img')
      await expect(couture).toHaveAttribute('aria-label', 'Chargement…')

      // Le fil est l'accent de l'ambiance, l'aiguille son encre — relus dans
      // le SVG. Aucune couleur repère (rouge, vert, bleu purs) ne reste.
      const traits = await traitsDe(page, '[data-animation="couture"] >> nth=0')
      expect(traits).toContain(rgb(a.accent))
      expect(traits).toContain(rgb(a.encre))
      expect(traits.filter(t => t !== rgb(a.accent) && t !== rgb(a.encre))).toEqual([])

      // Elle tient sa place, et dans l'écran.
      const boite = (await couture.boundingBox())!
      expect(Math.round(boite.width)).toBe(84)
      expect(Math.round(boite.height)).toBe(28)
      expect(boite.x).toBeGreaterThanOrEqual(0)
      expect(boite.x + boite.width).toBeLessThanOrEqual(largeur)

      // Elle coud : deux images à 250 ms d'écart diffèrent (aucun repos de
      // la boucle ne dure plus de 133 ms).
      const avant = await couture.screenshot()
      await page.waitForTimeout(250)
      expect((await couture.screenshot()).equals(avant)).toBe(false)
      // Le nœud n'appartient qu'à la pose.
      expect(await noeudVisible(page, a.accent)).toBe(false)

      // La réponse arrive : la couture s'en va.
      lacher()
      await expect(page.locator('[data-animation="couture"]')).toHaveCount(0, { timeout: 8000 })
    })
  }
}

test('dans « Charger plus », la couture prend la couleur du bouton, qui garde sa hauteur', async ({ page }) => {
  test.setTimeout(60_000)
  const minuit = { ...AMBIANCES[1], texteBouton: '#141640' }
  await page.setViewportSize({ width: 390, height: 760 })
  await preparer(page, minuit.graine)
  // Quarante poèmes — une page pleine : la galerie propose d'en charger plus.
  const poeme = (i: number) => ({
    id: `p-${i}`, type: 'poeme', titre: null, image_url: null,
    author_pseudo: `Main${i}`, author_avatar: null, author_id: `u-${i}`,
    created_at: '2026-11-01T10:00:00Z', views_count: 0,
    payload: JSON.stringify({ structureId: 'vers-libre', titre: null, langue: 'fr', cases: [
      { numero: 0, fonction: '', consigne: '', auteur: 'humain', texte: `le vers numéro ${i}`, ts: 0 },
    ] }),
  })
  let lacher!: () => void
  const porte = new Promise<void>(ok => { lacher = ok })
  let appels = 0
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/rest/v1/gallery?*', async r => {
    if (r.request().method() !== 'GET') return r.fulfill({ status: 201, body: '[]' })
    // La première page répond ; la suivante attend le signal.
    if (appels++ > 0) await porte
    await r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(appels === 1 ? Array.from({ length: 40 }, (_, i) => poeme(i)) : []),
    }).catch(() => {})
  })
  await page.goto('/galerie')
  await franchir(page)

  const bouton = page.getByRole('button', { name: /Charger plus/ })
  await bouton.scrollIntoViewIfNeeded({ timeout: 10_000 })
  const hauteurAvant = (await bouton.boundingBox())!.height
  await bouton.click()

  // Pendant l'attente, le bouton n'a plus d'autre texte : la couture le nomme.
  const enAttente = page.getByRole('button', { name: 'Chargement…' })
  await expect(enAttente).toBeVisible()
  const couture = enAttente.locator('[data-animation="couture"]')
  await expect(couture).toHaveAttribute('data-etat', 'pret', { timeout: 8000 })
  // Fil ET aiguille à la couleur du texte du bouton : l'accent y est le fond.
  const traits = await couture.evaluate(el =>
    [...el.querySelectorAll('svg path')].map(p => getComputedStyle(p).stroke).filter(s => s && s !== 'none'))
  expect(traits.length).toBeGreaterThan(0)
  expect(traits.filter(t => t !== rgb(minuit.texteBouton))).toEqual([])
  // Le bouton ne grandit pas.
  expect(Math.abs((await enAttente.boundingBox())!.height - hauteurAvant)).toBeLessThanOrEqual(1)
  lacher()
})

test.describe('sous mouvement réduit', () => {
  test('la couture est posée, et rien ne tourne', async ({ page }) => {
    test.setTimeout(45_000)
    // `emulateMedia`, comme les autres parcours du dépôt : un
    // `test.use({ reducedMotion })` n'atteint pas `matchMedia` ici.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await preparer(page, AMBIANCES[0].graine)
    const lacher = await retenirSupabase(page)
    await page.goto('/galerie')
    await franchir(page)
    const couture = page.locator('[data-animation="couture"]').first()
    await expect(couture).toHaveAttribute('data-etat', 'pret', { timeout: 8000 })
    // L'image fixe est la pose : le point est noué.
    expect(await noeudVisible(page, AMBIANCES[0].accent)).toBe(true)
    // Rien ne tourne : le SVG ne change plus. (Pas une capture de pixels —
    // la page autour peut encore finir d'apparaître.)
    const svg = () => couture.evaluate(el => el.querySelector('svg')?.innerHTML ?? '')
    const avant = await svg()
    await page.waitForTimeout(700)
    expect(await svg()).toBe(avant)
    lacher()
  })
})

test('le lecteur ne se charge pas à l\'accueil, seulement à la première attente', async ({ page }) => {
  test.setTimeout(45_000)
  const lecteur: string[] = []
  page.on('request', r => { if (/lottie_light/.test(r.url())) lecteur.push(r.url()) })
  await preparer(page, AMBIANCES[1].graine)
  const lacher = await retenirSupabase(page)

  await page.goto('/')
  await franchir(page)
  await page.waitForTimeout(800)
  expect(lecteur, 'aucun lecteur à l\'accueil').toEqual([])

  await page.goto('/galerie')
  await franchir(page)
  await expect(page.locator('[data-animation="couture"]').first()).toHaveAttribute('data-etat', 'pret', { timeout: 8000 })
  expect(lecteur.length, 'le lecteur, une fois').toBeGreaterThan(0)
  lacher()
})
