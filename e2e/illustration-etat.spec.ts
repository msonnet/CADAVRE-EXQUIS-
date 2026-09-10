import { test, expect, type Page } from '@playwright/test'

/**
 * L'état « en cours » de l'illustration — lot 2 de l'audit du 10 septembre.
 *
 * L'audit relevait « ENCRE DE CHINE EN COURS… » encore affiché alors que
 * l'image était déjà dans le DOM. Reproduit, mais la cause n'était pas celle
 * supposée : le drapeau se lève au bon moment, c'est le fondu de sortie du
 * bloc — laissé à la valeur par défaut de framer-motion — qui laissait
 * l'étiquette un demi-tour de seconde au-dessus de l'image finie.
 *
 * Deux exigences tenues ici : l'étiquette s'efface vite une fois l'image
 * peinte, et un échec laisse de quoi réessayer.
 */

const SESSION = {
  access_token: 'faux-jeton', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
  user: {
    id: 'u1', aud: 'authenticated', role: 'authenticated',
    app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
    is_anonymous: true,
  },
}

/** Un pixel — on mesure la boucle d'état, pas le rendu de fal.ai. */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function preparer(page: Page, mode: 'succes' | 'echec') {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/auth/v1/**', r => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(SESSION),
  }))
  await page.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  // Le fourre-tout d'abord : Playwright donne la priorité à la dernière route posée.
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
  await page.route('**/api/illustration**', async r => {
    await new Promise(ok => setTimeout(ok, 400))
    if (mode === 'echec') return r.fulfill({ status: 500, body: '{}' })
    r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: PIXEL, promptVisuel: 'un prompt' }),
    })
  })
}

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Un poème en base, puis la page de fin, rideau écarté. */
async function allerALaFin(page: Page) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(600)
  await page.evaluate(async () => {
    const p = {
      id: 'illu', titre: null, structureId: 'vers-libre', mode: 'standard', visibilite: 'aveugle',
      cases: [{ numero: 1, texte: 'le vernis craque', auteur: 'humain', fonction: 'vers', ts: Date.now() }],
      dateCreation: Date.now(), dateModification: Date.now(),
    }
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes')
      st.clear(); st.put(p)
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  })
  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await franchir(page)
  await page.getByLabel(/Passer la révélation|Skip the reveal/).click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(500)
}

async function demanderUneIllustration(page: Page) {
  await page.getByRole('button', { name: /^IMAGE$/ }).click().catch(() => {})
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Encre de Chine|India ink/i }).click({ timeout: 8000 })
}

const etat = (page: Page) => page.evaluate(() => {
  const img = document.querySelector('img[alt*="Illustration du poème"]') as HTMLImageElement | null
  return {
    enCours: /EN COURS/.test(document.body.innerText),
    peinte: !!img && img.complete && img.naturalWidth > 0,
    relancer: [...document.querySelectorAll('button')].some(b => /RELANCER|RETRY/.test(b.textContent ?? '')),
  }
})

test("l'étiquette « en cours » ne survit pas à l'image", async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page, 'succes')
  await allerALaFin(page)
  await demanderUneIllustration(page)

  await expect.poll(async () => (await etat(page)).peinte, { timeout: 20_000 }).toBe(true)

  // ── Sur ce que ce test garde, et ce qu'il ne garde pas ──
  //
  // Il garde l'état BLOQUÉ : une étiquette « en cours » qui ne s'en va plus,
  // ce que l'audit a cru voir. La borne est large exprès.
  //
  // Il ne garde PAS la longueur du fondu. J'ai essayé — relevé à la frame
  // dans la page — et la mesure s'est révélée inutilisable : lire
  // `document.body.innerText` à chaque frame force un calcul de mise en page
  // et perturbe le temps qu'on mesure. Deux exécutions ont rendu 481 ms avec
  // le correctif et 314 ms sans, c'est-à-dire du bruit. Le raccourcissement
  // du fondu (0,18 s au lieu du défaut de framer-motion) est vérifié par
  // l'opacité relevée au fil du temps, pas ici. Un test de temps auquel on
  // ne peut pas se fier est pire que pas de test — la leçon est déjà écrite
  // dans ce dépôt, au sujet des séries métriques.
  await expect.poll(async () => (await etat(page)).enCours, { timeout: 1_200 }).toBe(false)
})

test('un échec laisse une erreur et de quoi relancer', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page, 'echec')
  await allerALaFin(page)
  await demanderUneIllustration(page)

  await expect.poll(async () => (await etat(page)).enCours, { timeout: 20_000 }).toBe(false)
  const apres = await etat(page)
  expect(apres.peinte, 'aucune image').toBe(false)
  expect(apres.relancer, 'le bouton relancer').toBe(true)
  await expect(page.getByText(/Illustration indisponible|Illustration unavailable/)).toBeVisible()

  // Et il relance pour de bon : le style est perdu par l'échec, la relance
  // doit le retrouver dans la référence.
  await page.getByRole('button', { name: /RELANCER|RETRY/ }).click()
  await expect.poll(async () => (await etat(page)).enCours, { timeout: 3_000 }).toBe(true)
})
