import { test, expect, type Page } from '@playwright/test'

/**
 * Le dévoilement du poème — le dépli et l'encre.
 *
 * Trois promesses, et elles se vérifient à l'écran : le poème entier finit par
 * être là, un appui le pose d'un coup, et `prefers-reduced-motion` supprime la
 * séquence au lieu de la jouer plus vite.
 */

const VERS = [
  'Je marche',
  'la paille ronge un rochet',
  'il reste du givre sur la vitre du couloir',
  'Parfaitement inutile',
  'le tablier sèche mal contre la porte du fond',
  'un athanor',
  'elle pousse la lampe et le drap se froisse encore',
  'sans nom',
]

/**
 * L'écran d'entrée intercepte les clics tant qu'on ne l'a pas franchi — il
 * attend un geste pour pouvoir démarrer le son. On attend qu'il ait vraiment
 * quitté le DOM : le cliquer ne suffit pas, il s'en va en fondu.
 */
async function entrer(page: Page) {
  const splash = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await splash.click({ timeout: 4000 }).catch(() => {})
  await splash.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Passe le rideau d'assemblage, qu'il faille l'écarter ou qu'il soit déjà parti. */
async function passerLeRideau(page: Page) {
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await rideau.click({ timeout: 4000 }).catch(() => {})
  await rideau.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {})
}

/**
 * Sème un poème d'atelier dans IndexedDB.
 *
 * On écrit dans la base directement : l'aperçu sert le bundle construit, les
 * modules du dépôt n'y sont pas importables.
 */
async function semer(page: Page, n: number) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await page.waitForTimeout(600)
  await page.evaluate(async ({ nn, vers }) => {
    const poeme = {
      id: 'devoilement', titre: null, structureId: 'atelier',
      mode: 'standard', visibilite: 'aveugle',
      cases: Array.from({ length: nn }, (_, i) => ({
        numero: i + 1, texte: vers[i % vers.length],
        auteur: 'ia', fonction: `vers ${i + 1}`, ts: Date.now(),
      })),
      dateCreation: Date.now(), dateModification: Date.now(),
    }
    const bdd: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = bdd.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes')
      st.clear(); st.put(poeme)
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    bdd.close()
  }, { nn: n, vers: VERS })
}

async function preparer(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
}

test('le poème entier finit par être écrit, et le rideau se saute', async ({ page }) => {
  test.setTimeout(90_000)
  const erreurs: string[] = []
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text())
  })
  page.on('pageerror', e => erreurs.push(String(e)))

  await preparer(page)
  await semer(page, 24)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)

  // ── L'assemblage se saute d'un appui ──
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await expect(rideau).toBeVisible({ timeout: 5000 })
  await rideau.click()
  await expect(rideau).toBeHidden({ timeout: 4000 })

  // ── Le poème s'écrit, puis il est là en entier ──
  const carte = page.locator('.page-carnet')
  await expect(carte.getByText('un athanor').first()).toBeVisible({ timeout: 12_000 })
  const texte = await carte.innerText()
  for (const v of VERS.slice(1)) expect(texte).toContain(v)
  // La lettrine a bien pris la première lettre du premier vers.
  expect(texte).toContain('e marche')

  expect(erreurs).toEqual([])
})

test('un appui pose le poème sans attendre la fin de la séquence', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, 37)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  // Le dernier volet ne s'ouvre pas avant plusieurs secondes ; un appui
  // immédiat doit tout poser bien avant.
  await page.waitForTimeout(400)
  await page.mouse.click(195, 300)
  await page.waitForTimeout(350)

  const dernier = page.locator('.page-carnet').getByText('sans nom').last()
  await expect(dernier).toBeVisible()
  const clip = await dernier.evaluate(el => {
    const mots = el.querySelectorAll('span')
    return Array.from(mots).map(m => getComputedStyle(m).clipPath)
  })
  // Plus aucun masque : tous les mots sont découverts.
  for (const c of clip) expect(c === 'none' || /inset\(0px\)|0%/.test(c)).toBeTruthy()
})

test('mouvement réduit : le poème est posé sans séquence', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await preparer(page)
  await semer(page, 24)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  // Aucune attente au-delà du rendu : tout doit déjà être lisible.
  await page.waitForTimeout(250)
  const texte = await page.locator('.page-carnet').innerText()
  for (const v of VERS.slice(1)) expect(texte).toContain(v)
})
