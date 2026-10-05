import { test, expect, type Page } from '@playwright/test'

/**
 * Le carnet récolte au salon.
 *
 * Le salon est la table où l'on écrit avec de vraies autres mains — ce sont
 * leurs vers qui font les meilleurs assemblages — et ses coutures n'offraient
 * aucun ◇ GARDER : il fallait sortir au recueil pour garder un vers lu ici.
 * On mesure qu'un vers gardé à la fin d'un salon arrive au carnet avec la
 * signature de la main qui l'a écrit.
 */

const CODE = 'KX7Q'
const ROOM = {
  code: CODE, host_id: 'moi', mode: 'ecrit', structure_id: 'phrase-simple',
  nb_joueurs: 3, status: 'finished', turn_seconds: null, langue: 'fr',
}
const JOUEURS = [
  { room_code: CODE, player_id: 'moi', pseudo: 'Moi', avatar_url: null, order_index: 0 },
  { room_code: CODE, player_id: 'autre-1', pseudo: 'Nadja', avatar_url: null, order_index: 1 },
  { room_code: CODE, player_id: 'autre-2', pseudo: 'Desnos', avatar_url: null, order_index: 2 },
]
const CONTRIBUTIONS = [
  { room_code: CODE, case_index: 0, texte: 'la porte du grenier', player_id: 'moi', voice_name: null },
  { room_code: CODE, case_index: 1, texte: 'avale', player_id: 'autre-1', voice_name: null },
  { room_code: CODE, case_index: 2, texte: 'une lampe sourde', player_id: 'autre-2', voice_name: null },
]

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function salonFini(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
      access_token: 'jeton-test', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: 'moi', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  })
  const json = (corps: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(corps) })
  // Un prédicat et non « **/supabase.co/** » : l'hôte est
  // placeholder.supabase.co, et le motif exige une barre avant « supabase ».
  await page.route(u => u.hostname.endsWith('supabase.co'), r => {
    const url = r.request().url()
    if (url.includes('/rest/v1/rooms')) return r.fulfill(json(ROOM))
    if (url.includes('/rest/v1/room_players')) return r.fulfill(json(JOUEURS))
    if (url.includes('/rest/v1/contributions')) return r.fulfill(json(CONTRIBUTIONS))
    if (url.includes('/rest/v1/profiles')) return r.fulfill(json({ id: 'moi', pseudo: 'Moi', avatar_url: null, avatar_prompt: null }))
    return r.fulfill(json([]))
  })
  // La correction d'accord n'a pas à répondre : le poème brut suffit.
  await page.route('**/api/**', r => r.fulfill({ status: 503, body: '' }))
}

test('un vers d’une autre main se garde depuis les coutures du salon', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', e => erreurs.push(String(e)))
  await salonFini(page)

  await page.goto(`/fin-online/${CODE}`)
  await page.waitForLoadState('networkidle')
  await franchir(page)
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await rideau.click({ timeout: 4000 }).catch(() => {})
  await rideau.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {})

  await page.getByRole('button', { name: /LES COUTURES|THE SEAMS/ }).click()
  const garder = page.getByRole('button', { name: /Garder ce vers dans le carnet|Keep this line in the notebook/ })
  await expect(garder).toHaveCount(3)

  // Le vers de Nadja — la deuxième case.
  await garder.nth(1).click()
  await expect(page.getByRole('button', { name: /Retirer ce vers du carnet|Remove this line from the notebook/ })).toHaveCount(1)

  // Au carnet, avec sa signature : le nom de la main, pas « toi ».
  await page.goto('/recolte')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await expect(page.getByText('avale', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /SOURCES/ }).click()
  await expect(page.getByText(/Nadja/)).toBeVisible()

  expect(erreurs, erreurs.join(' | ')).toHaveLength(0)
})
