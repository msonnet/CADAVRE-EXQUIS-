import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * Le salon avant le lancement : privé par défaut, l'hôte peut retirer une
 * main, une main revient par son code, et « ✦ IA » répond enfin.
 *
 * Supabase est bouchonné par un prédicat d'hôte (`placeholder.supabase.co`),
 * et chaque écriture est relevée pour être lue : on mesure ce que l'écran
 * ENVOIE, pas seulement ce qu'il affiche.
 */

const CODE = 'LOUP-42'
type Ecriture = { methode: string; url: string; corps: unknown; entetes: Record<string, string> }

async function identite(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('coach-salon', '1')
    localStorage.setItem('coach-jeu-online', '1')
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
      access_token: 'jeton-test', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: 'moi', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  })
}

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Bouchonne Supabase ; `tables` rend la réponse de chaque table pour une lecture. */
async function supabase(page: Page, tables: Record<string, unknown>, ecritures: Ecriture[]) {
  const json = (r: Route, corps: unknown) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corps) })
  await page.route(u => u.hostname.endsWith('supabase.co'), r => {
    const req = r.request()
    const url = req.url()
    const table = Object.keys(tables).find(t => url.includes(`/rest/v1/${t}`))
    if (req.method() !== 'GET' && req.method() !== 'HEAD') {
      ecritures.push({ methode: req.method(), url, corps: req.postDataJSON?.() ?? null, entetes: req.headers() })
      // Un DELETE suivi d'un select rend les lignes levées.
      if (req.method() === 'DELETE') return json(r, [{ id: 'ligne' }])
      return json(r, [])
    }
    if (url.includes('/rest/v1/profiles')) return json(r, { id: 'moi', pseudo: 'Mireille', avatar_url: null, avatar_prompt: null })
    if (table) return json(r, tables[table])
    return json(r, [])
  })
}

test('l’hôte retire une main : d’abord inscrite parmi les exclus, puis sa chaise levée', async ({ page }) => {
  const ecritures: Ecriture[] = []
  await identite(page)
  await supabase(page, {
    rooms: { code: CODE, host_id: 'moi', mode: 'ecrit', structure_id: 'phrase-simple', nb_joueurs: 3, status: 'waiting', turn_seconds: null, is_public: false, nb_cases: null, langue: 'fr', exclus: [] },
    room_players: [
      { id: 'p1', room_code: CODE, player_id: 'moi', pseudo: 'Mireille', avatar_url: null, order_index: null, is_ready: false },
      { id: 'p2', room_code: CODE, player_id: 'autre-1', pseudo: 'Nadja', avatar_url: null, order_index: null, is_ready: true },
    ],
  }, ecritures)

  await page.goto(`/salon/${CODE}`)
  await franchir(page)
  await expect(page.getByText('Nadja')).toBeVisible()
  // Le salon est privé : c'est l'option choisie.
  await expect(page.getByRole('button', { name: /^PRIVÉ$/ })).toHaveCSS('color', /.+/)
  await expect(page.getByText(/Accessible uniquement par code/)).toBeVisible()

  // L'hôte ne peut pas se retirer lui-même : un seul ✕, celui de Nadja.
  await expect(page.getByRole('button', { name: /^Retirer / })).toHaveCount(1)
  await page.getByRole('button', { name: 'Retirer Nadja' }).click()
  await page.getByRole('button', { name: /Retirer Nadja de la table/ }).click()

  await expect.poll(() => ecritures.filter(e => e.methode === 'DELETE').length).toBe(1)
  const patch = ecritures.find(e => e.methode === 'PATCH' && e.url.includes('/rooms'))
  const del = ecritures.find(e => e.methode === 'DELETE')!
  expect(patch, 'la liste des exclus est écrite').toBeTruthy()
  expect((patch!.corps as { exclus: string[] }).exclus).toEqual(['autre-1'])
  expect(del.url).toContain('player_id=eq.autre-1')
  // Dans cet ordre : l'exclusion avant la chaise.
  expect(ecritures.indexOf(patch!)).toBeLessThan(ecritures.indexOf(del))
})

test('une main retirée voit qu’elle l’a été, et ne se rassoit pas', async ({ page }) => {
  const ecritures: Ecriture[] = []
  await identite(page)
  await supabase(page, {
    rooms: { code: CODE, host_id: 'autre-1', mode: 'ecrit', structure_id: 'phrase-simple', nb_joueurs: 3, status: 'waiting', turn_seconds: null, is_public: true, nb_cases: null, langue: 'fr', exclus: ['moi'] },
    room_players: [{ id: 'p2', room_code: CODE, player_id: 'autre-1', pseudo: 'Nadja', avatar_url: null, order_index: null, is_ready: false }],
  }, ecritures)

  await page.goto(`/salon/${CODE}`)
  await franchir(page)
  await expect(page.getByText(/L'hôte t'a retiré de cette table/)).toBeVisible()
  await page.waitForTimeout(600)
  expect(ecritures.filter(e => e.url.includes('/room_players')), 'aucune chaise reprise').toHaveLength(0)
})

test('« Créer un salon privé » crée un salon privé', async ({ page }) => {
  const ecritures: Ecriture[] = []
  await identite(page)
  await supabase(page, { rooms: [], room_players: [] }, ecritures)
  await page.goto('/online')
  await franchir(page)
  await page.getByRole('button', { name: /CRÉER UN SALON PRIVÉ/ }).click()
  await expect.poll(() => ecritures.find(e => e.methode === 'POST' && e.url.includes('/rooms'))).toBeTruthy()
  const creation = ecritures.find(e => e.methode === 'POST' && e.url.includes('/rooms'))!
  expect((creation.corps as { is_public: boolean }).is_public).toBe(false)
})

test('une main revient par son code dans une partie commencée', async ({ page }) => {
  await identite(page)
  await supabase(page, {
    rooms: { code: CODE, host_id: 'autre-1', mode: 'ecrit', structure_id: 'phrase-simple', nb_joueurs: 2, status: 'playing', turn_seconds: null, is_public: false, nb_cases: 3, langue: 'fr', exclus: [] },
    room_players: { id: 'p1' },
  }, [])
  await page.goto('/online')
  await franchir(page)
  await page.getByLabel(/Code du salon/).fill(CODE)
  await page.getByRole('button', { name: /^REJOINDRE$/ }).click()
  await expect(page).toHaveURL(new RegExp(`/jeu-online/${CODE}$`), { timeout: 5000 })
})

test('« ✦ IA » règle la partie, présente son reçu et remplit la case', async ({ page }) => {
  const ecritures: Ecriture[] = []
  await identite(page)
  await supabase(page, {
    rooms: { code: CODE, host_id: 'moi', mode: 'ecrit', structure_id: 'phrase-simple', nb_joueurs: 2, status: 'playing', turn_seconds: null, is_public: false, nb_cases: 3, langue: 'fr', started_at: new Date().toISOString() },
    room_players: [
      { id: 'p1', room_code: CODE, player_id: 'moi', pseudo: 'Mireille', avatar_url: null, order_index: 0, joined_at: '2026-10-14T10:00:00Z' },
      { id: 'p2', room_code: CODE, player_id: 'autre-1', pseudo: 'Nadja', avatar_url: null, order_index: 1, joined_at: '2026-10-14T10:00:01Z' },
    ],
    contributions: [],
  }, ecritures)
  const appels: Ecriture[] = []
  await page.route('**/api/acces', r => { const q = r.request(); appels.push({ methode: q.method(), url: q.url(), corps: q.postDataJSON(), entetes: q.headers() }); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }) })
  await page.route('**/api/claude', r => { const q = r.request(); appels.push({ methode: q.method(), url: q.url(), corps: q.postDataJSON(), entetes: q.headers() }); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ texte: 'la lampe sourde', voixNom: 'le cartographe' }) }) })

  await page.goto(`/jeu-online/${CODE}`)
  await franchir(page)
  await page.getByText(/TOUCHER POUR COMMENCER/).click()
  await page.getByRole('button', { name: '✦ IA' }).click()
  await expect(page.getByRole('textbox')).toHaveValue('la lampe sourde')

  const acces = appels.find(a => a.url.includes('/api/acces'))!
  const claude = appels.find(a => a.url.includes('/api/claude'))!
  const recu = (acces.corps as { partieId: string }).partieId
  expect(recu).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  expect((claude.corps as { partieId: string }).partieId, 'le reçu présenté est celui de la partie réglée').toBe(recu)
  expect(claude.entetes.authorization).toBe('Bearer jeton-test')

  // Un second appel ne règle pas une seconde partie : le même reçu.
  await page.getByRole('button', { name: '✦ IA' }).click()
  await expect.poll(() => appels.filter(a => a.url.includes('/api/claude')).length).toBe(2)
  const recus = appels.filter(a => a.url.includes('/api/acces')).map(a => (a.corps as { partieId: string }).partieId)
  expect(new Set(recus).size).toBe(1)
})
