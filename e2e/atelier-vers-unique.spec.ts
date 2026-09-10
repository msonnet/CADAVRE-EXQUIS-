import { test, expect, type Page } from '@playwright/test'

/**
 * Le vers ne se dépose qu'une fois — lot 1 de l'audit du 10 septembre 2026.
 *
 * Le poème produit contenait deux fois le même vers, et le vers saisi pour le
 * tour suivant n'apparaissait nulle part. Mécanisme mesuré : deux appuis
 * rapprochés sur DÉPOSER LE VERS s'exécutent avant le re-rendu, lisent tous
 * deux le rendu d'avant, et empilent le vers deux fois. Le rang suivant se
 * trouve consommé, et le vers écrit pour lui n'a plus où se poser.
 *
 * C'est le bug le plus grave de l'audit : il corrompt silencieusement le
 * livrable du jeu. Ce test double donc DÉLIBÉRÉMENT chaque appui.
 *
 * La séance est injectée par le brouillon `atelier-en-cours` : onze vers, tous
 * au médium, aucune voix, aucun appel réseau. On n'observe que la boucle de
 * tours.
 */

const TOTAL = 11

const PLAN = {
  totalVers: TOTAL,
  toursJoueur: Array.from({ length: TOTAL }, (_, i) => i),
  toursFragmentJoueur: [],
  voixPool: [],
  echo: false,
  voixParVers: {},
}

/** Onze vers reconnaissables, et tous différents — c'est tout le test. */
const VERS = Array.from({ length: TOTAL }, (_, i) => `vers ${'zeta'}${i} du medium`)

async function ouvrirLaSeance(page: Page) {
  await page.addInitScript((p) => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('coach-atelier', '1')   // le mini-guide couvre le champ
    localStorage.setItem('atelier-en-cours', JSON.stringify({ plan: p, vers: [] }))
  }, PLAN)
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  await page.goto('/jeu-atelier')
  await page.waitForLoadState('networkidle')
  const splash = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await splash.click({ timeout: 4000 }).catch(() => {})
  await splash.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Ce que la séance a réellement retenu, lu dans le brouillon. */
const versPoses = (page: Page) => page.evaluate(() =>
  ((JSON.parse(localStorage.getItem('atelier-en-cours') ?? '{}').vers ?? []) as { texte: string }[])
    .map(v => v.texte))

test('un double appui ne dépose pas le vers deux fois', async ({ page }) => {
  test.setTimeout(60_000)
  await ouvrirLaSeance(page)

  await page.locator('textarea').last().fill(VERS[0])
  await page.getByRole('button', { name: /Déposer le vers/ }).click()
  await page.waitForTimeout(400)
  expect(await versPoses(page)).toEqual([VERS[0]])

  // Deux clics émis dans la même tâche : le « ghost tap » du tactile.
  await page.locator('textarea').last().fill(VERS[1])
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find(x => /Déposer le vers|Refermer le poème/i.test(x.textContent ?? ''))
    b?.click(); b?.click()
  })
  await page.waitForTimeout(600)

  expect(await versPoses(page)).toEqual([VERS[0], VERS[1]])
})

test('onze chaînes uniques donnent onze vers distincts', async ({ page }) => {
  test.setTimeout(180_000)
  await ouvrirLaSeance(page)

  for (let i = 0; i < TOTAL; i++) {
    const bouton = page.getByRole('button', { name: /Déposer le vers|Refermer le poème/ })
    await bouton.waitFor({ state: 'visible', timeout: 20_000 })
    await page.locator('textarea').last().fill(VERS[i])
    await page.waitForTimeout(150)
    // Chaque tour est doublé : c'est la condition qui cassait le poème.
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')]
        .find(x => /Déposer le vers|Refermer le poème/i.test(x.textContent ?? ''))
      b?.click(); b?.click()
    })
    await page.waitForTimeout(250)
    if (i < TOTAL - 1) expect(await versPoses(page), `au vers ${i + 1}`).toEqual(VERS.slice(0, i + 1))
  }

  // ── Le poème final porte bien les onze vers, chacun une fois ──
  await page.waitForURL('**/fin', { timeout: 30_000 })
  await page.getByLabel(/Passer la révélation|Skip the reveal/).click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(500)
  await page.mouse.click(195, 300)          // poser le dévoilement d'un coup
  await page.waitForTimeout(400)

  const texte = await page.locator('.page-carnet').innerText()
  for (let i = 0; i < TOTAL; i++) {
    // On compte sur la fin du vers et non sur le vers entier : la lettrine
    // détache la première lettre du premier vers dans son propre nœud —
    // « v » puis « ers zeta0 du medium ». C'est le dévoilement, pas un défaut.
    const marque = `zeta${i} du medium`
    expect(texte.split(marque).length - 1, `« ${VERS[i]} » dans le poème`).toBe(1)
  }
})
