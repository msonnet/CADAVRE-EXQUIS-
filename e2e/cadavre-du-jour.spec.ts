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

  // Le sceau tient la colonne du milieu, entre les quatre entrées du pied.
  await page.getByRole('button', { name: /cadavre du jour|cadavre of the day/i }).click()
  await page.waitForTimeout(900)

  await expect(page.getByText(/— LA CONTRAINTE —|— TODAY’S CONSTRAINT —/)).toBeVisible()
  // Les voix sont annoncées : le rendez-vous est un cadavre exquis, pas un
  // exercice d'écriture en solitaire.
  await expect(page.getByText(/VOIX T’ACCOMPAGNE|VOICES? JOINS? YOU/)).toBeVisible()
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
  // La partie se règle à son ouverture : le passage par l'encrier précède la
  // navigation. Registre injoignable ici (Supabase bouchonné) — on passe.
  await page.waitForURL('**/jeu', { timeout: 15_000 })
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
  expect(brouillon.config.voixIA, 'des voix accompagnent le joueur').toBeGreaterThanOrEqual(1)
  expect(brouillon.config.voixIA, 'mais jamais au point de lui prendre la plume').toBeLessThanOrEqual(3)
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

const AMORCE_MOCK = 'une amorce de ce jour'
function jourLocalTest(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function poemeDuJour(pseudo: string, suite: string[]) {
  return {
    id: 'p' + pseudo, type: 'poeme', titre: null,
    payload: JSON.stringify({
      structureId: 'vers-libre', langue: 'fr',
      rituel: { jour: jourLocalTest(), amorce: AMORCE_MOCK },
      cases: [{ texte: AMORCE_MOCK }, ...suite.map(t => ({ texte: t }))],
    }),
    image_url: null, author_pseudo: pseudo, author_avatar: null,
    created_at: new Date().toISOString(),
  }
}

test('la colonne ne montre que la MÊME base, et rien d’autre', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/rest/v1/gallery**', r => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([
      poemeDuJour('Nadja', ['un chien traverse le vestibule']),
      poemeDuJour('Desnos', ['le sel dort dans les poches']),
      // Publié aujourd'hui, mais SANS la marque : une séance d'Atelier, une
      // partie libre. C'est exactement ce que l'ancienne requête ramassait.
      {
        id: 'intrus', type: 'poeme', titre: null,
        payload: JSON.stringify({ structureId: 'atelier', langue: 'fr', cases: [{ texte: 'un poème sans rapport' }] }),
        image_url: null, author_pseudo: 'Intrus', author_avatar: null,
        created_at: new Date().toISOString(),
      },
    ]),
  }))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await page.goto('/poeme-du-jour')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(1200)

  await expect(page.getByText('NADJA')).toBeVisible()
  await expect(page.getByText('DESNOS')).toBeVisible()
  await expect(page.getByText('INTRUS'), 'un poème sans la marque n’est pas du rendez-vous').toHaveCount(0)
  await expect(page.getByText('un poème sans rapport')).toHaveCount(0)

  // L'amorce est hissée UNE fois et retirée de chaque suite : c'est la
  // divergence qu'on vient lire, pas dix fois le même tronc.
  await expect(page.getByText('un chien traverse le vestibule')).toBeVisible()
  expect(
    await page.evaluate(t => (document.body.innerText.match(new RegExp(t, 'g')) ?? []).length, AMORCE_MOCK),
    'l’amorce n’apparaît qu’une fois dans la colonne',
  ).toBeLessThanOrEqual(1)
})

test('la même table est servie à tout le monde', async ({ page }) => {
  test.setTimeout(120_000)

  // `voixParSlot` n'est écrit au brouillon qu'une fois un tour joué : on
  // ouvre donc le rituel et on scelle un fragment, deux fois, le même jour.
  async function tableApresUnTour(): Promise<Record<string, string>> {
    await page.evaluate(() => {
      localStorage.removeItem('brouillon-actuel')
      localStorage.removeItem('cadavre-rituel-fait')
      sessionStorage.clear()
    })
    await page.goto('/poeme-du-jour')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /Écrire le cadavre du jour|Write today’s cadavre/i }).click()
    await page.waitForURL('**/jeu', { timeout: 15_000 })
    const champ = page.locator('textarea, input[type="text"]').first()
    await champ.waitFor({ timeout: 15_000 })
    await champ.fill('le vernis craque')
    await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').click()
    await page.waitForTimeout(1500)
    return page.evaluate(() =>
      JSON.parse(localStorage.getItem('brouillon-actuel') ?? 'null')?.voixParSlot ?? {})
  }

  await ouvrir(page, '/poeme-du-jour')
  const a = await tableApresUnTour()
  const b = await tableApresUnTour()

  expect(Object.keys(a).length, 'des voix ont été attribuées').toBeGreaterThan(0)
  // Les personas étaient tirées par joueur, fenêtre glissante : deux parties
  // du même jour convoquaient deux tables. On comparait des tirages, pas des
  // mains.
  expect(b, 'la table du jour ne dépend pas du tirage du joueur').toEqual(a)
})
