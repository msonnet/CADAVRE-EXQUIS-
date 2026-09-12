import { test, expect, type Page } from '@playwright/test'

/**
 * Ce que l'interface dit à qui ne la voit pas — lots 17 et 16 de l'audit.
 *
 * Relevé avant, sur six écrans : ZÉRO groupe sémantique dans toute
 * l'application, et cinq boutons sans aucun nom. Les sélecteurs de
 * structure, de visibilité, de mode, de papier, de validation sont des
 * suites de boutons dont l'un est teinté — à l'œil on voit lequel est
 * choisi, au lecteur d'écran on entend sept boutons sans rapport.
 */

const ECRANS: [string, string, number][] = [
  // url, nom, nombre de groupes de choix attendus
  ['/config', 'préparatifs', 3],
  ['/atelier', 'atelier · préparatifs', 1],
  ['/config-dessin', 'dessin · préparatifs', 1],
  ['/reglages', 'réglages', 1],
  ['/jeu-dessin', 'studio de dessin', 1],
]

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function preparer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('coach-atelier', '1')
    localStorage.setItem('atelier-en-cours', JSON.stringify({
      plan: {
        totalVers: 11, toursJoueur: Array.from({ length: 11 }, (_, i) => i),
        toursFragmentJoueur: [], voixPool: [], echo: false, voixParVers: {},
      },
      vers: [],
    }))
    sessionStorage.setItem('config-dessin', JSON.stringify({ nbBandes: 3, joueurs: 2, visibilite: 'raccord' }))
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
}

/** Tout ce qui se clique et n'a aucun nom dans l'arbre d'accessibilité. */
const sansNom = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll('button, a[href], [role="button"], [role="radio"], input, textarea')]
    .filter(e => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'
    })
    .filter(e => !(
      e.getAttribute('aria-label') || e.getAttribute('title') || (e as HTMLElement).innerText.trim()
    ))
    .map(e => {
      const r = e.getBoundingClientRect()
      return `${e.tagName}[${Math.round(r.left)},${Math.round(r.top)}]`
    }))

test('aucun élément interactif sans nom', async ({ page }) => {
  test.setTimeout(180_000)
  await preparer(page)
  const fautes: string[] = []
  for (const [url, nom] of ECRANS) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.waitForTimeout(1200)
    const muets = await sansNom(page)
    if (muets.length) fautes.push(`${nom} → ${muets.join(' · ')}`)
  }
  expect(fautes.join('\n'), 'éléments sans nom accessible').toBe('')
})

test('chaque choix exclusif est un groupe, et dit lequel est actif', async ({ page }) => {
  test.setTimeout(180_000)
  await preparer(page)
  for (const [url, nom, attendus] of ECRANS) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await franchir(page)
    await page.waitForTimeout(1200)

    const bilan = await page.evaluate(() => {
      const groupes = [...document.querySelectorAll('[role="radiogroup"]')]
      return {
        nb: groupes.length,
        // Un groupe sans nom, ou sans option cochée, ne sert à rien.
        sansLibelle: groupes.filter(g => !g.getAttribute('aria-label')).length,
        sansCoche: groupes.filter(g => !g.querySelector('[role="radio"][aria-checked="true"]')).length,
      }
    })
    expect(bilan.nb, `${nom} — groupes de choix`).toBeGreaterThanOrEqual(attendus)
    expect(bilan.sansLibelle, `${nom} — groupe sans libellé`).toBe(0)
    expect(bilan.sansCoche, `${nom} — groupe dont aucune option n’est cochée`).toBe(0)
  }
})

test('les zones qui changent seules s’annoncent', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await page.goto('/jeu-atelier')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(1200)

  // Le compteur de vers est la seule chose qui dise qu'un tour est passé.
  const live = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]')].map(e => (e as HTMLElement).innerText.replace(/\n/g, ' ').trim()))
  expect(live.join(' | '), 'le compteur de vers est annoncé').toMatch(/VERS|LINE/)
})

test('chaque bascule dit quel panneau elle ouvre', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(600)
  await page.evaluate(async () => {
    const p = {
      id: 'a11y', titre: null, structureId: 'phrase-simple', mode: 'standard', visibilite: 'aveugle',
      cases: [1, 2, 3].map(i => ({ numero: i, texte: `bout ${i}`, auteur: 'humain', fonction: 'x', ts: Date.now() })),
      dateCreation: Date.now(), dateModification: Date.now(),
    }
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes'); st.clear(); st.put(p)
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  })

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await franchir(page)
  await page.getByLabel(/Passer la révélation|Skip the reveal/).click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(900)
  await page.mouse.click(195, 300)
  await page.waitForTimeout(400)

  const coutures = page.getByRole('button', { name: /^COUTURES$|^SEAMS$/ })
  await expect(coutures).toHaveAttribute('aria-controls', 'panneau-coutures')
  await expect(coutures).toHaveAttribute('aria-expanded', 'false')

  await coutures.click()
  await expect(coutures).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#panneau-coutures')).toBeVisible()

  // Et les deux panneaux restent exclusifs — ce que l'audit croyait cassé.
  const image = page.getByRole('button', { name: /^IMAGE$/ })
  await image.click()
  await expect(page.locator('#panneau-image')).toBeVisible()
  await expect(page.locator('#panneau-coutures')).toHaveCount(0)
  await expect(coutures).toHaveAttribute('aria-expanded', 'false')
})
