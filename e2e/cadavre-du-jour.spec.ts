import { test, expect, type Page } from '@playwright/test'

/**
 * Le cadavre du jour — le rituel quotidien.
 *
 * Avant : `/poeme-du-jour` ressortait une publication de la galerie par
 * `dayOfYear() % n`, sur un stock qui ne bougeait plus depuis juillet. Un
 * musée, atteignable par un seul bouton perdu dans la Galerie.
 *
 * Ce test vérifie la chaîne entière, parce que c'est elle qui compte : la
 * contrainte s'affiche, elle ouvre une partie DÉJÀ AMORCÉE au bon nombre de
 * cases, et la série ne bouge pas tant que le poème n'est pas fini.
 */

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function ouvrir(page: Page, url = '/') {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(900)
}

test('l’accueil mène au cadavre du jour, et la contrainte y est écrite', async ({ page }) => {
  test.setTimeout(60_000)
  await ouvrir(page)

  await page.getByRole('button', { name: /cadavre du jour|cadavre of the day/i }).click()
  await page.waitForTimeout(900)

  await expect(page.getByText(/— LA CONTRAINTE —|— TODAY’S CONSTRAINT —/)).toBeVisible()
  // Rien n'est décompté : c'est la promesse qui rend le rituel tenable tous
  // les jours, et elle doit être écrite, pas seulement vraie.
  await expect(page.getByText(/RIEN N’EST DÉCOMPTÉ|NOTHING IS COUNTED/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Écrire le cadavre du jour|Write today’s cadavre/i })).toBeVisible()
})

test('la contrainte ouvre une partie déjà amorcée, au bon compte', async ({ page }) => {
  test.setTimeout(60_000)
  await ouvrir(page, '/poeme-du-jour')

  // Ce que la page annonce…
  const attendu = await page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s+(vers|fragments?|parts?)/i)
    return m ? Number(m[1]) : null
  })
  expect(attendu, 'la page annonce un nombre de morceaux').toBeGreaterThan(1)

  await page.getByRole('button', { name: /Écrire le cadavre du jour|Write today’s cadavre/i }).click()
  await page.waitForURL('**/jeu', { timeout: 10_000 })
  await page.waitForTimeout(1200)

  // …doit être ce que la partie joue. L'amorce occupe la case 1, donc le
  // joueur entre en scène au deuxième acte : c'est toute la mécanique.
  const entete = await page.evaluate(() => document.body.innerText)
  expect(entete, 'la partie s’ouvre au deuxième acte, pas au premier')
    .toMatch(new RegExp(`ACTE\\s+II\\s*/\\s*\\S+`, 'i'))

  const brouillon = await page.evaluate(() => JSON.parse(localStorage.getItem('brouillon-actuel') ?? 'null'))
  expect(brouillon, 'un brouillon amorcé a été posé').toBeTruthy()
  expect(brouillon.total, 'le total vient de la contrainte, pas d’un tirage').toBe(attendu)
  expect(brouillon.cases, 'une seule case est déjà remplie').toHaveLength(1)
  expect(brouillon.cases[0].donne, 'elle est marquée comme donnée, pas écrite').toBe(true)
  expect(brouillon.config.voixIA, 'aucune voix IA — rien ne se décompte').toBe(0)
})

test('la série ne compte plus les ouvertures', async ({ page }) => {
  test.setTimeout(60_000)
  // Elle comptait les jours où l'on poussait la porte. Ouvrir l'accueil
  // trois fois ne doit rien inscrire : c'est le poème qui compte.
  await ouvrir(page)
  for (const _ of [1, 2]) {
    await page.reload()
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.waitForTimeout(600)
  }
  const serie = await page.evaluate(() => localStorage.getItem('cadavre-serie'))
  expect(serie, 'aucune série n’est inscrite par la seule ouverture').toBeNull()
})
