import { test, expect, type Page } from '@playwright/test'

/**
 * La révélation d'un cadavre dessiné : le dessin arrive PLIÉ et se déplie au
 * doigt (maquette validée le 11 novembre, `RevealDessin`, `FeuillePliee`),
 * puis la lecture surréaliste vient dessous.
 *
 * Relevé avant : quand la lecture arrivait APRÈS que l'écran eut affiché
 * « LA LECTURE SE FAIT » — le cas ordinaire, le modèle met plusieurs
 * secondes —, elle ne s'affichait jamais. La sortie de l'attente héritait de
 * sa pulsation infinie ; sous `AnimatePresence mode="wait"`, une sortie qui
 * ne finit pas retient l'entrée suivante. Le joueur restait devant « LA
 * LECTURE SE FAIT » jusqu'à ce qu'il touche l'écran.
 */

const LECTURE = 'Un monsieur en haut-de-forme a pris une théière pour corps.'

/** Une bande dessinée à la main : un trait noir sur papier clair. */
function bande(i: number) {
  return { joueurIdx: i, joueurNumero: i + 1, width: 360, height: 420, lowestDrawnFraction: 0.97, dpr: 1, ts: Date.now() }
}

async function semerEtOuvrir(page: Page, delaiLecture: number, texte = LECTURE, noms: string[] = []) {
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    // La lecture demande une identité : celle du client de la version de test.
    localStorage.setItem('sb-placeholder-auth-token', JSON.stringify({
      access_token: 'jeton-test', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: 'moi', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
    }))
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/interpreter-dessin**', async r => {
    await new Promise(ok => setTimeout(ok, delaiLecture))
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ texte }) })
  })
  await page.goto('/bibliotheque')
  const seuil = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await seuil.click({ timeout: 4000 }).catch(() => {})
  await seuil.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.evaluate(async (meta) => {
    const bandes = meta.map((b: Record<string, unknown>, i: number) => {
      const c = document.createElement('canvas'); c.width = 360; c.height = 420
      const g = c.getContext('2d')!
      g.fillStyle = '#fdf8f2'; g.fillRect(0, 0, 360, 420)
      g.strokeStyle = '#1a1410'; g.lineWidth = 6
      g.beginPath(); g.moveTo(150 + i * 10, 0); g.lineTo(150, 400); g.moveTo(210, 0); g.lineTo(210 - i * 10, 400); g.stroke()
      return { ...b, imageDataUrl: c.toDataURL() }
    })
    await new Promise<void>((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => {
        const tx = r.result.transaction('bandesDessin', 'readwrite')
        tx.objectStore('bandesDessin').put({ id: 'courant', bandes, paper: 'creme', ts: Date.now() })
        tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
      }
      r.onerror = () => ko(r.error)
    })
  }, [0, 1, 2].map(i => ({ ...bande(i), ...(noms[i] ? { nom: noms[i] } : {}) })))
  // Navigation dans l'application : pas de second seuil d'entrée.
  await page.evaluate(() => { history.pushState({}, '', '/fin-dessin'); dispatchEvent(new PopStateEvent('popstate')) })
}

const invite = (page: Page) => page.getByText(/TIRER POUR DÉPLIER|PULL TO UNFOLD/)
const volet = (page: Page, i: number) => page.locator(`[data-volet-papier="${i}"]`)

/** Le dessin arrive plié : un appui à côté du paquet le pose entier. */
async function poserLeDessin(page: Page) {
  await expect(invite(page)).toBeVisible({ timeout: 8000 })
  const { height } = page.viewportSize()!
  await page.mouse.click(6, height - 6)
}

test('une lecture qui arrive après l’attente s’affiche sur la révélation', async ({ page }) => {
  await semerEtOuvrir(page, 6000)
  await poserLeDessin(page)
  // L'attente est bien montrée d'abord : c'est elle qui retenait la lecture.
  // (La page de fin, dessous, a la sienne : la révélation vient d'abord.)
  await expect(page.getByText(/LA LECTURE SE FAIT|THE READING IS UNDER WAY/).first()).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(LECTURE, { exact: false }).first()).toBeVisible({ timeout: 9000 })
  await expect(page.getByText(/LA LECTURE SE FAIT|THE READING IS UNDER WAY/)).toHaveCount(0)
})

test('une lecture déjà là se montre dès que le dessin est découvert', async ({ page }) => {
  await semerEtOuvrir(page, 50)
  await poserLeDessin(page)
  await expect(page.getByText(LECTURE, { exact: false }).first()).toBeVisible({ timeout: 9000 })
})

// Relevé avant : quatre lignes au plus. La vraie lecture d'un dessin de la
// vidéo — trois vers — s'arrêtait sur « qu'ils… ».
const LONGUE = "le cyclope en haut-de-forme digère son propre regard\nle cœur tambourine dans l'anneau bleu sans raison\nses pieds de violette ne touchent jamais le sol qu'ils inventent"

test('une longue lecture se lit entière sur la révélation', async ({ page }) => {
  // Au format d'un téléphone : en largeur de bureau, quatre lignes suffisaient.
  await page.setViewportSize({ width: 390, height: 693 })
  await semerEtOuvrir(page, 50, LONGUE)
  await poserLeDessin(page)
  // La lecture de la révélation — la page de fin, dessous, la répète en entier.
  const bloc = page.getByRole('status').filter({ hasText: 'qu\'ils inventent' }).locator('div').last()
  await expect(bloc).toBeVisible({ timeout: 12000 })
  // Rien de rogné : le bloc montre toute sa hauteur, et sa fin est à l'écran.
  // Le dessin remonte en 0,9 s pour céder sa place : on mesure une fois posé.
  await expect.poll(() => bloc.evaluate(el => el.getBoundingClientRect().bottom), { timeout: 5000 }).toBeLessThanOrEqual(693)
  expect(await bloc.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
})

// ── Le dessin plié ──────────────────────────────────────────────────────────

test('le dessin arrive plié ; un toucher le déplie main après main, puis la lecture vient dessous', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await semerEtOuvrir(page, 50, LECTURE, ['Nadja', 'Léa', 'Nadja'])
  await expect(invite(page)).toBeVisible({ timeout: 8000 })
  // Fermé : les bandes ont leur place, transparentes, sous le paquet. La
  // lecture attend que le dessin soit ouvert.
  await expect(volet(page, 1)).toHaveCSS('opacity', '0')
  await expect(page.getByText(/— LECTURE —|— READING —/)).toHaveCount(0)
  // Chaque main est nommée dans le coin de sa bande, déjà écrite.
  await expect(volet(page, 0)).toContainText(/TÊTE — NADJA|HEAD — NADJA/)
  await expect(volet(page, 1)).toContainText(/LÉA/)
  // Trois mains, puis le bas de la feuille : trois plis.
  await expect(page.locator('[data-volet-papier]')).toHaveCount(4)
  await expect(volet(page, 3)).toContainText(/CADAVRE DESSINÉ · 3 MAINS|DRAWN CADAVRE · 3 HANDS/)

  // Un toucher sur le paquet : tout se déplie, pli après pli.
  const b = (await volet(page, 0).boundingBox())!
  await page.mouse.click(195, b.y + Math.min(b.height / 2, 200))
  await expect(volet(page, 1)).toHaveCSS('opacity', '1', { timeout: 4000 })
  await expect(volet(page, 3)).toHaveCSS('opacity', '1', { timeout: 8000 })
  // On regarde les jambes, puis la vue recule ; la lecture arrive dessous.
  await expect(page.getByText(/— LECTURE —|— READING —/)).toBeVisible({ timeout: 6000 })
  await expect(page.getByText(/TOUCHER POUR CONTINUER|TAP TO CONTINUE/)).toBeVisible({ timeout: 5000 })
  // Le dessin entier tient au-dessus de la lecture.
  const dessin = (await page.getByRole('img', { name: /Cadavre exquis dessiné — TÊTE/ }).boundingBox())!
  const lecture = (await page.getByText(/— LECTURE —|— READING —/).boundingBox())!
  expect(dessin.y + dessin.height).toBeLessThanOrEqual(lecture.y)
  // Un appui, et l'on quitte la révélation.
  await page.mouse.click(195, 420)
  await expect(invite(page)).toHaveCount(0)
  await expect(page.locator('[data-volet-papier]')).toHaveCount(0, { timeout: 3000 })
})

test('tiré à peine, le pli se referme ; un appui à côté pose le dessin entier sans quitter la révélation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await semerEtOuvrir(page, 50)
  await expect(invite(page)).toBeVisible({ timeout: 8000 })
  const b = (await volet(page, 0).boundingBox())!
  const x = 195, y = b.y + 80
  await page.mouse.move(x, y); await page.mouse.down()
  for (let k = 1; k <= 4; k++) { await page.mouse.move(x, y + k * 5); await page.waitForTimeout(16) }
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(1500)
  await expect(volet(page, 1)).toHaveCSS('opacity', '0')
  // L'appui à côté : le dessin entier, d'un coup.
  await page.mouse.click(6, 838)
  await expect(volet(page, 3)).toHaveCSS('opacity', '1', { timeout: 1000 })
  // L'appui qui abrège ne quitte pas la révélation dans la foulée.
  await page.waitForTimeout(600)
  await expect(page.locator('[data-volet-papier]')).toHaveCount(4)
  await expect(page.getByText(/— LECTURE —|— READING —/)).toBeVisible({ timeout: 4000 })
})

test('mouvement réduit : rien à déplier, le dessin et sa lecture sont là', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await semerEtOuvrir(page, 50)
  await expect(page.getByText(/— LECTURE —|— READING —/)).toBeVisible({ timeout: 8000 })
  await expect(invite(page)).toHaveCount(0)
  await expect(volet(page, 2)).toHaveCSS('opacity', '1')
})
