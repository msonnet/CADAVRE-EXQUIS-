import { test, expect, type Page } from '@playwright/test'

/**
 * La lecture surréaliste d'un cadavre dessiné — sur l'écran de révélation.
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

async function semerEtOuvrir(page: Page, delaiLecture: number) {
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
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ texte: LECTURE }) })
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
  }, [bande(0), bande(1), bande(2)])
  // Navigation dans l'application : pas de second seuil d'entrée.
  await page.evaluate(() => { history.pushState({}, '', '/fin-dessin'); dispatchEvent(new PopStateEvent('popstate')) })
}

test('une lecture qui arrive après l’attente s’affiche sur la révélation', async ({ page }) => {
  await semerEtOuvrir(page, 6000)
  // L'attente est bien montrée d'abord : c'est elle qui retenait la lecture.
  await expect(page.getByText(/LA LECTURE SE FAIT|THE READING IS UNDER WAY/)).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(LECTURE, { exact: false }).first()).toBeVisible({ timeout: 9000 })
  await expect(page.getByText(/LA LECTURE SE FAIT|THE READING IS UNDER WAY/)).toHaveCount(0)
})

test('une lecture déjà là se montre dès que le dessin est découvert', async ({ page }) => {
  await semerEtOuvrir(page, 50)
  await expect(page.getByText(LECTURE, { exact: false }).first()).toBeVisible({ timeout: 9000 })
})
