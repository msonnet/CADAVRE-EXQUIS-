import { test, expect, type Page } from '@playwright/test'

/**
 * La galerie se lit comme le sommaire d'une revue, et l'auteur publié
 * apprend qu'il a été lu — audit du 30 septembre.
 *
 * Relevé avant, à l'écran :
 * - titre « le vernis · craquelé · avale · une lampe… », corps sur cinq
 *   lignes, un fragment par ligne ;
 * - réactions 🌙 ✦ ❀ 🜔 et 👁 4, en couleur sur iOS ;
 * - coutures absentes, quoique présentes dans la publication ;
 * - « ✓ PUBLIÉ » redevenait « PUBLIER » deux secondes plus tard, et rien ne
 *   reliait le feuillet du recueil à sa publication.
 */

const c = (texte: string, extra: Record<string, unknown> = {}) => ({
  numero: 0, fonction: '', consigne: '', auteur: 'humain', texte, ts: 0, ...extra,
})

const VERNIS = {
  id: 'g-vernis', type: 'poeme', titre: null, image_url: null,
  author_pseudo: 'Mireille', author_avatar: null, author_id: 'u-mireille',
  created_at: '2026-09-29T10:00:00Z', views_count: 14,
  payload: JSON.stringify({ structureId: 'phrase-etoffee', titre: null, langue: 'fr', cases: [
    c('le vernis', { fonction: 'sujet' }),
    c('craquelé', { fonction: 'adjectif du sujet', auteur: 'ia', voixNom: 'greffier' }),
    c('avale', { fonction: 'verbe' }),
    c('une lampe', { fonction: 'complément' }),
    c('sourde', { fonction: 'adjectif du complément' }),
  ] }),
}

// Deux autres poèmes signés, pour que chaque titre ait une signature-lien
// sous lui ; et quatre dessins de hauteurs inégales pour la planche.
const SIGNE = (id: string, pseudo: string, texte: string) => ({
  ...VERNIS, id, author_pseudo: pseudo, author_id: `u-${id}`, views_count: 0,
  payload: JSON.stringify({ structureId: 'vers-libre', titre: null, langue: 'fr', cases: [c(texte)] }),
})
const svg = (h: number) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="${h}"><rect width="300" height="${h}" fill="#eee"/></svg>`)
const DESSIN = (i: number, h: number) => ({
  id: `d-${i}`, type: 'dessin', titre: null, image_url: svg(h),
  author_pseudo: `Main${i}`, author_avatar: null, author_id: `u-d${i}`,
  created_at: '2026-09-29T10:00:00Z', views_count: 2,
  payload: JSON.stringify({ texteVision: `une lecture ${i}`, nbBandes: 3, langue: 'fr' }),
})

const REACTIONS = [
  { gallery_id: 'g-vernis', emoji: '🌙', reactor_key: 'a', created_at: new Date().toISOString() },
  { gallery_id: 'g-vernis', emoji: '🜔', reactor_key: 'b', created_at: new Date().toISOString() },
]

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function bouchonner(page: Page, galerie: (url: string, methode: string) => unknown[]) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
  await page.route('**/rest/v1/rpc/**', r => r.fulfill({ status: 204, body: '' }))
  await page.route('**/rest/v1/gallery_reactions*', r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(REACTIONS),
  }))
  await page.route('**/rest/v1/gallery?*', r => {
    const req = r.request()
    r.fulfill({
      status: req.method() === 'POST' ? 201 : 200,
      contentType: 'application/json',
      body: JSON.stringify(galerie(decodeURIComponent(req.url()), req.method())),
    })
  })
}

test.describe('le sommaire', () => {
  test('un poème entier, ses coutures, et des signes plutôt que des emoji', async ({ page }) => {
    test.setTimeout(60_000)
    await bouchonner(page, () => [VERNIS])
    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')
    await franchir(page)

    const liste = page.locator('section[aria-label="Publications"]')
    // Le titre de repli est l'incipit recousu, sans point médian.
    const tete = liste.getByRole('button', { name: 'le vernis craquelé avale une lampe sourde' })
    await expect(tete).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('le vernis · craquelé')).toHaveCount(0)

    await tete.click()
    // Pas un fragment par ligne : le corps n'empile aucune case seule.
    await expect(liste.locator('p', { hasText: /^craquelé$/ })).toHaveCount(0)

    // Les coutures, nommées : la voix et la main qui publie.
    await liste.getByRole('button', { name: /COUTURES/ }).click()
    await expect(liste.getByText(/Le greffier/)).toBeVisible()
    await expect(liste.getByText('Mireille', { exact: true }).first()).toBeVisible()

    // La modération reste à sa place, dans l'état déplié.
    await expect(liste.getByRole('button', { name: /Signaler/ })).toBeVisible()
    await expect(liste.getByRole('button', { name: /Masquer les publications de Mireille/ })).toBeVisible()

    // Aucun emoji imprimé ; les lectures en mots.
    const texte = await page.evaluate(() => document.body.innerText)
    expect(texte).not.toMatch(/\p{Emoji_Presentation}|[\u{10000}-\u{10FFFF}]/u)
    expect(texte).toMatch(/LECTURES/)
    expect(texte).toMatch(/☾/)
  })

  // La zone d'appui du nom, centrée sur une ligne posée à 4 px sous le
  // titre, remontait de treize pixels sur lui et l'emportait : toucher le
  // bas de l'incipit ouvrait /u/Mireille au lieu du poème.
  test('le bas du titre ouvre le poème, pas la page de l’auteur', async ({ page }) => {
    await bouchonner(page, () => [VERNIS, SIGNE('g-2', 'Hyacinthe', 'la rampe du sommeil'), SIGNE('g-3', 'Ondine', 'un pouce de brume')])
    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    const liste = page.locator('section[aria-label="Publications"]')
    await expect(liste.locator('article')).toHaveCount(3, { timeout: 5000 })
    const touches = await liste.evaluate(sec => [...sec.querySelectorAll('article button[aria-expanded]')].map(b => {
      const r = b.getBoundingClientRect()
      return [2, 5, 8, 12].map(d => {
        const el = document.elementFromPoint(r.left + 30, r.bottom - d)
        return el?.closest('a, button') === b ? 'titre' : (el?.closest('a, button')?.textContent ?? '—')
      })
    }))
    for (const t of touches) expect(t).toEqual(['titre', 'titre', 'titre', 'titre'])
    // Et le nom reste touchable : sous lui, sa zone d'appui tient.
    const lien = liste.getByRole('link', { name: 'HYACINTHE' })
    const r = (await lien.boundingBox())!
    const sous = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.textContent ?? null, [r.x + 10, r.y + r.height + 12])
    expect(sous).toBe('HYACINTHE')
  })

  // Ouverte, la planche passait en pleine largeur et `row dense` comblait le
  // trou : PL. II quittait sa case, PL. III remontait à sa place.
  test('une planche ouverte reste à sa place', async ({ page }) => {
    await bouchonner(page, url => url.includes('type=eq.dessin') ? [DESSIN(1, 380), DESSIN(2, 420), DESSIN(3, 460), DESSIN(4, 500)] : [])
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.getByRole('button', { name: 'DESSINS' }).click()
    const planches = page.locator('figure')
    await expect(planches).toHaveCount(4, { timeout: 5000 })
    const places = () => planches.evaluateAll(fs => fs.map(f => { const r = f.querySelector('button')!.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)] }))
    const avant = await places()
    await planches.nth(1).locator('button').first().click()
    const details = page.locator('#pub-d-2')
    await expect(details).toBeVisible()
    const apres = await places()
    // PL. I et PL. II ne bougent pas ; la rangée suivante descend, d'un bloc.
    expect(apres.slice(0, 2)).toEqual(avant.slice(0, 2))
    expect(apres[2][0]).toBe(avant[2][0])
    expect(apres[3][0]).toBe(avant[3][0])
    // Les détails viennent juste sous la rangée, et dans l'ordre du document.
    const ordre = await page.evaluate(() => [...document.querySelectorAll('figure[data-planche], [data-details-planche]')].map(e => e.getAttribute('data-planche') ?? `d${e.getAttribute('data-details-planche')}`))
    expect(ordre).toEqual(['1', '2', 'd2', '3', '4'])
    const bas = await planches.nth(1).evaluate(f => f.getBoundingClientRect().bottom)
    const haut = await details.evaluate(d => d.getBoundingClientRect().top)
    expect(haut - bas).toBeLessThan(24)
    await expect(details.getByRole('button', { name: /Signaler/ })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  })

  // Un feuillet relié au carnet, publié par Mireille. Ses coutures disaient
  // « toi » à chaque visiteur — la signature gardée avec le vers court-
  // circuitait le remplacement par le nom de qui publie. Et la galerie ne
  // laissait garder aucun vers : le carnet ne récoltait que les siens.
  test('un vers publié se garde au carnet, signé du nom de son auteur', async ({ page }) => {
    test.setTimeout(60_000)
    const t = Date.UTC(2026, 8, 14, 12)
    const RELIE = {
      ...VERNIS, id: 'g-relie',
      payload: JSON.stringify({ structureId: 'vers-libre', titre: null, langue: 'fr', cases: [
        // `fonction` telle que la reliure l'écrit aussi, en repli.
        c('un drap glisse le long du couloir', { fonction: '14 septembre 2026 · Le vernis', signature: 'toi', provenance: { date: t, titre: 'Le vernis' } }),
        c("l'abbé presse ma main", { fonction: '14 septembre 2026', auteur: 'ia', signature: "voix 2 · L'enlumineur", provenance: { date: t, titre: null } }),
      ] }),
    }
    await bouchonner(page, () => [RELIE])
    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')
    await franchir(page)

    const liste = page.locator('section[aria-label="Publications"]')
    await liste.getByRole('button', { name: /un drap glisse le long du couloir/ }).click()
    await liste.getByRole('button', { name: /COUTURES/ }).click()
    await expect(liste.getByText(/14 SEPTEMBRE 2026 · LE VERNIS/)).toBeVisible()
    await expect(liste.getByText('Mireille', { exact: true })).toBeVisible()
    await expect(liste.getByText('toi', { exact: true })).toHaveCount(0)

    const garder = liste.getByRole('button', { name: /Garder ce vers dans le carnet/ })
    await expect(garder).toHaveCount(2)
    await garder.first().click()
    await expect(liste.getByRole('button', { name: /Retirer ce vers du carnet/ })).toHaveCount(1)

    await page.goto('/recolte')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.getByText('un drap glisse le long du couloir')).toBeVisible()
    await page.getByRole('button', { name: /SOURCES/ }).click()
    await expect(page.getByText(/^Mireille · 29 septembre 2026 · un drap glisse le long du couloir$/)).toBeVisible()
  })

  test('« Anonyme » n’a pas de page', async ({ page }) => {
    await bouchonner(page, () => [VERNIS])
    await page.goto('/u/Anonyme')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.getByText(/Les anonymes n’ont pas de page/)).toBeVisible({ timeout: 5000 })
  })
})

// Le sommaire de l'audit en avait deux : la semaine des lecteurs, et les
// numéros du poème du jour. Le second manquait — la galerie ne menait au
// rendez-vous que par un lien d'en-tête, jamais à un poème scellé.
test.describe('les numéros du poème du jour', () => {
  const CHAINES = [
    { id: 'c2', jour: '2026-09-29', amorce: 'le sel' },
    { id: 'c1', jour: '2026-09-28', amorce: 'une échelle' },
    { id: 'c0', jour: '2026-09-27', amorce: 'le givre' },
    { id: 'c-1', jour: '2026-09-26', amorce: 'la cire' },
  ]
  async function chaines(page: Page, panne = false) {
    await page.route('**/api/jour**', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ jour: '2026-09-30', amorce: 'une horloge', echo: 'poches', rang: 3, mains: 2, monVers: null, scelle: false }),
    }))
    await page.route('**/rest/v1/jour_chaines**', r => {
      if (panne) return r.fulfill({ status: 500, contentType: 'application/json', body: '{}' })
      const url = r.request().url()
      const un = url.includes('limit=1&') || url.endsWith('limit=1')
      const lim = Number(/limit=(\d+)/.exec(url)?.[1] ?? 30)
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(un ? CHAINES[0] : CHAINES.slice(0, lim)) })
    })
    await page.route('**/rest/v1/jour_vers**', r => {
      const c1 = r.request().url().includes('chaine_id=eq.c1')
      return r.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ id: 'v1', rang: 1, texte: c1 ? 'une échelle monte dans le puits' : 'le sel dort sous la langue', pseudo: 'Nadja', voix: false, voix_nom: null, main_id: 'x', retire: false }]),
      })
    })
  }

  test('trois numéros en tête, et chacun ouvre SON jour', async ({ page }) => {
    test.setTimeout(60_000)
    await bouchonner(page, () => [VERNIS])
    await chaines(page)
    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')
    await franchir(page)

    const numeros = page.getByRole('navigation', { name: /Numéros du poème du jour|Poem of the day/ })
    await expect(numeros).toBeVisible({ timeout: 5000 })
    await expect(numeros.getByRole('link')).toHaveCount(3)
    // Pas un palmarès : aucun chiffre de vers ni de mains.
    expect(await numeros.innerText()).not.toMatch(/VERS|MAINS/)

    await numeros.getByRole('link', { name: /une échelle/ }).click()
    await expect(page).toHaveURL(/\/poeme-du-jour\?jour=2026-09-28/)
    await franchir(page)
    // C'est bien ce jour-là qui s'ouvre, plié, et non le dernier.
    await expect(page.getByText(/— DANS L’ALMANACH —/)).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /Déplier le poème/ }).click()
    await expect(page.getByText('une échelle monte dans le puits')).toBeVisible({ timeout: 15000 })
  })

  test('une panne du registre ne montre rien', async ({ page }) => {
    await bouchonner(page, () => [VERNIS])
    await chaines(page, true)
    await page.goto('/galerie')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.locator('section[aria-label="Publications"] article')).toHaveCount(1, { timeout: 5000 })
    await expect(page.getByRole('navigation', { name: /Numéros du poème du jour/ })).toHaveCount(0)
  })
})

async function poserFeuillet(page: Page, publication: { id: string; date: number } | null) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.evaluate(async (pub) => {
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes'); st.clear()
      st.put({
        id: 'p1', titre: null, structureId: 'phrase-etoffee', mode: 'standard', visibilite: 'aveugle',
        cases: ['le vernis', 'craquelé', 'avale', 'une lampe', 'sourde'].map((texte, i) => ({
          numero: i + 1, texte, auteur: 'humain', fonction: 'x', consigne: 'x', ts: 1,
        })),
        ...(pub ? { publication: pub } : {}),
        dateCreation: Date.now(), dateModification: Date.now(),
      })
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  }, publication)
}

test.describe('le feuillet et sa publication', () => {
  test('publié, le feuillet le reste — et dit ce qu’il a reçu', async ({ page }) => {
    test.setTimeout(90_000)
    let publications = 0
    await bouchonner(page, (url, methode) => {
      if (methode === 'POST') { publications++; return [{ id: 'g-neuf', created_at: '2026-09-22T10:00:00Z' }] }
      if (url.includes('g-neuf')) return [{ id: 'g-neuf', views_count: 12 }]
      return []
    })
    await poserFeuillet(page, null)
    await page.goto('/bibliotheque/p1')
    await page.waitForLoadState('networkidle')
    await franchir(page)

    await page.getByRole('button', { name: 'Publier ce poème dans la galerie' }).click()
    const mention = page.locator('[data-publication]')
    await expect(mention).toContainText('PUBLIÉ EN GALERIE LE 22 SEPTEMBRE', { timeout: 5000 })

    // Deux secondes plus tard, le bouton ne revient pas.
    await page.waitForTimeout(2500)
    await expect(page.getByRole('button', { name: 'Publier ce poème dans la galerie' })).toHaveCount(0)

    // Le lien survit au rechargement, et les lectures remontent.
    await page.reload()
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.locator('[data-publication]')).toContainText('12 LECTURES', { timeout: 5000 })
    expect(publications).toBe(1)

    // Au recueil, la carte porte ses lectures, et le courrier les annonce.
    await page.goto('/bibliotheque')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.locator('[data-echos]').first()).toContainText('12 LECTURES', { timeout: 5000 })
    await expect(page.locator('[data-courrier]')).toContainText('12 lectures')
  })

  test('retirée de la galerie, la publication rend son bouton', async ({ page }) => {
    test.setTimeout(60_000)
    // La base répond, et la publication n'y est plus.
    await bouchonner(page, () => [])
    await poserFeuillet(page, { id: 'g-parti', date: Date.parse('2026-09-22T10:00:00Z') })
    await page.goto('/bibliotheque/p1')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.getByRole('button', { name: 'Publier ce poème dans la galerie' })).toBeVisible({ timeout: 5000 })
  })
})
