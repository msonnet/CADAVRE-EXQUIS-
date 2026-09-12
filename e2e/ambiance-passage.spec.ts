import { test, expect, type Page } from '@playwright/test'

/**
 * Lots 10, 12 et 14 de l'audit du 10 septembre.
 *
 * 12 · L'ambiance était retirée à chaque rechargement — N° 935 puis N° 767 —
 *      sous un écran de Réglages qui annonce « Chaque jour, une ambiance est
 *      tirée au sort ».
 * 10 · L'écran « Joueur 1. — C'EST PARTI → » s'intercalait avant chaque acte
 *      même à une seule main.
 * 14 · La préparation promettait qu'on ne saurait JAMAIS quelles voix
 *      parlent, et les coutures les nomment toutes.
 */

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Le numéro du feuillet et le nom de la couleur — la signature de l'ambiance. */
const signature = (page: Page) => page.evaluate(() => {
  const t = document.body.innerText
  return (t.match(/N° ?\d+/) ?? ['?'])[0]
})

test('l’ambiance tient d’un rechargement à l’autre', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(700)
  const avant = await signature(page)
  expect(avant, 'un numéro de feuillet est affiché').toMatch(/N° \d+/)

  for (const _ of [1, 2]) {
    await page.reload()
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.waitForTimeout(700)
    expect(await signature(page), 'le feuillet change de numéro au rechargement').toBe(avant)
  }

  // Et la graine est bien datée : c'est le jour qui commande, pas la session.
  const stocke = await page.evaluate(() => localStorage.getItem('cadavre-ambiance'))
  expect(stocke, 'la graine est stockée').toBeTruthy()
  const { jour } = JSON.parse(stocke as string)
  const aujourdhui = await page.evaluate(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  expect(jour, 'la graine porte la date du jour').toBe(aujourdhui)
})

test('une graine d’hier est remplacée', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('cadavre-ambiance', JSON.stringify({ graine: 12345, jour: '2020-01-01' }))
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(700)

  const { graine, jour } = JSON.parse(await page.evaluate(() => localStorage.getItem('cadavre-ambiance')) as string)
  expect(graine, 'la graine périmée est remplacée').not.toBe(12345)
  expect(jour).not.toBe('2020-01-01')
})

test('en solo, aucun écran de passage à taper', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    sessionStorage.setItem('config-partie', JSON.stringify({
      structureId: 'phrase-simple', visibilite: 'aveugle', premierJoueur: 'humain',
      mode: 'standard', joueursHumains: 1, voixIA: 0,
    }))
    // Le rideau se lève seul au bout de 1,1 s : le regarder à un instant
    // donné est fatalement instable. On enregistre donc TOUT ce qui est
    // passé à l'écran, et on interroge le registre à la fin.
    const vu: string[] = []
    ;(window as unknown as { __vu: string[] }).__vu = vu
    const noter = () => { const t = document.body.innerText; if (t && vu[vu.length - 1] !== t) vu.push(t) }
    // Sur `document` et non `documentElement` : au moment où le script
    // s'injecte, <html> n'existe pas encore et `observe(null)` jette en
    // silence — le registre restait vide et le test échouait sans raison.
    new MutationObserver(noter).observe(document, { childList: true, subtree: true, characterData: true })
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  await page.goto('/jeu')
  await page.waitForLoadState('networkidle')
  await franchir(page)

  // Sans rien toucher, le champ de saisie arrive : c'est le critère du lot.
  const champ = page.locator('textarea[aria-label="Ta contribution"]')
  await expect(champ).toBeVisible({ timeout: 8000 })

  // Et cela vaut pour l'acte suivant : on scelle, l'acte II s'ouvre seul.
  await champ.fill('le vernis craque')
  await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').click()
  await expect(champ).toBeVisible({ timeout: 8000 })
  await expect(champ).toHaveValue('', { timeout: 4000 })

  const vu = (await page.evaluate(() => (window as unknown as { __vu: string[] }).__vu)).join('\n')
  expect(vu, 'aucun bouton de passage n’a été proposé').not.toMatch(/C'est parti|Let's go|C'est à moi|My turn/)
  expect(vu, 'le rideau a bien annoncé les actes').toMatch(/Acte I\.|Act I\./)
  expect(vu, 'et l’acte suivant aussi').toMatch(/Acte II\.|Act II\./)
})

test('la promesse d’anonymat ne contredit plus les coutures', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/atelier')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(600)

  const texte = await page.locator('body').innerText()
  expect(texte, 'la promesse impossible a disparu').not.toMatch(/ne sauras jamais|never know which/i)
  expect(texte, 'la révélation est annoncée').toMatch(/rendus qu’au dernier vers|given back to you at the last line/i)
})
