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

  test('« Anonyme » n’a pas de page', async ({ page }) => {
    await bouchonner(page, () => [VERNIS])
    await page.goto('/u/Anonyme')
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await expect(page.getByText(/Les anonymes n’ont pas de page/)).toBeVisible({ timeout: 5000 })
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
