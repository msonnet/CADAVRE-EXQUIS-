import { test, expect, type Page } from '@playwright/test'

/**
 * Le registre des voix, de la bibliothèque à la fiche, et retour par les
 * coutures. Les voix n'avaient aucune trace hors de la partie : aucune page
 * ne les recensait, `/voix` retombait sur l'accueil.
 */

async function entrer(page: Page) {
  await page.getByLabel(/Entrer dans le jeu|Enter the game/).click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(300)
}

const t0 = Date.UTC(2026, 8, 14, 18)
const J = 86_400_000
const POEMES = [
  { id: 'p-cadavre', titre: null, structureId: 'phrase-simple', mode: 'standard', visibilite: 'aveugle',
    dateCreation: t0, dateModification: t0, cases: [
      { numero: 1, fonction: 'Sujet', consigne: '', auteur: 'humain', texte: 'le vernis craquelé', ts: t0 },
      { numero: 2, fonction: 'Verbe', consigne: '', auteur: 'ia', voixSlot: 1, voixNom: 'meteorologue', texte: 'avale', ts: t0 },
      { numero: 3, fonction: 'Complément', consigne: '', auteur: 'humain', texte: 'une lampe sourde', ts: t0 },
    ] },
  { id: 'p-atelier', titre: 'Le givre', structureId: 'atelier', mode: 'standard', visibilite: 'aveugle',
    dateCreation: t0 + 2 * J, dateModification: t0 + 2 * J, cases: [
      { numero: 1, fonction: 'Vers I', consigne: '', auteur: 'mixte', nbVoix: 1, voixNom: 'Le météorologue',
        texte: 'la pluie tombe sur le seuil', ts: t0,
        mains: [
          { role: 'SUJET', texte: 'la pluie tombe' },
          { role: 'LIEU', texte: 'sur le seuil', voixNom: 'Le météorologue' },
        ] },
    ] },
]

async function semer(page: Page, poemes: unknown[]) {
  await page.evaluate(async (ps) => {
    const bdd: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result)
      r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = bdd.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes')
      st.clear()
      for (const p of ps) st.put(p)
      tx.oncomplete = () => ok()
      tx.onerror = () => ko(tx.error)
    })
    bdd.close()
  }, poemes)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 503, body: '{}' }))
})

test("sans voix au recueil, la bibliothèque ne montre pas d'entrée", async ({ page }) => {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await semer(page, [{ ...POEMES[0], cases: [POEMES[0].cases[0]] }])
  await page.reload()
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await expect(page.getByText(/1 POÈME|1 POEM/)).toBeVisible()
  await expect(page.getByRole('button', { name: /REGISTRE DES VOIX|REGISTER OF VOICES/ })).toHaveCount(0)
})

test('le registre, de la bibliothèque à la fiche, et retour par les coutures', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', e => erreurs.push(String(e)))

  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await semer(page, POEMES)
  await page.reload()
  await page.waitForLoadState('networkidle')
  await entrer(page)

  // ── L'entrée, discrète, comme celle du carnet ──
  await page.getByRole('button', { name: /REGISTRE DES VOIX|REGISTER OF VOICES/ }).click()
  await expect(page).toHaveURL(/\/voix$/)
  await expect(page.getByText(/une voix rencontrée|one voice met/)).toBeVisible()

  // Quarante-six places, une seule nommée.
  await expect(page.locator('ol > li')).toHaveCount(46)
  await expect(page.getByText(/N° 03/)).toBeVisible()
  await expect(page.getByText('Tient des bulletins pour une radio rurale.')).toBeVisible()
  await expect(page.getByText(/2 SÉANCES/)).toBeVisible()
  // Les places en blanc ne nomment personne.
  await expect(page.getByText('Le chimiste')).toHaveCount(0)

  // ── La fiche ──
  await page.getByRole('button', { name: /Le météorologue/ }).click()
  await expect(page).toHaveURL(/\/voix\/meteorologue$/)
  await expect(page.getByRole('heading', { name: 'Le météorologue' })).toBeVisible()
  await expect(page.getByText(/PREMIÈRE SÉANCE/)).toBeVisible()
  await expect(page.getByText('avale', { exact: true })).toBeVisible()

  // ── Vers le poème, coutures ouvertes ──
  await page.getByRole('button', { name: /sur le seuil/ }).click()
  await expect(page).toHaveURL(/\/bibliotheque\/p-atelier\?coutures/)

  // ── Et retour par le nom de la voix, dans les coutures ──
  await page.getByRole('link', { name: /Le météorologue/ }).first().click()
  await expect(page).toHaveURL(/\/voix\/meteorologue$/)

  // Aucun débordement horizontal à la plus petite largeur tenue.
  await page.setViewportSize({ width: 320, height: 700 })
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(largeur).toBeLessThanOrEqual(320)

  expect(erreurs).toEqual([])
})

test("les coutures du cadavre écrit nomment la voix, et non son identifiant", async ({ page }) => {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await semer(page, POEMES)
  await page.goto('/bibliotheque/p-cadavre?coutures')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await expect(page.getByRole('link', { name: /Le météorologue/ })).toBeVisible()
  await expect(page.getByText(/voix · meteorologue/)).toHaveCount(0)
})

/** Même mesure que `cibles-tactiles.spec.ts` : la zone d'appui réelle,
 *  pseudo-élément `::after` compris. */
const tropPetites = (page: Page) => page.evaluate((seuil: number) => {
  const zone = (e: Element) => {
    const r = e.getBoundingClientRect()
    const ap = getComputedStyle(e, '::after')
    let w = r.width, h = r.height
    if (ap.content && ap.content !== 'none') {
      w = Math.max(w, parseFloat(ap.width) || 0)
      h = Math.max(h, parseFloat(ap.height) || 0)
    }
    return { w, h }
  }
  return [...document.querySelectorAll('button, a[href], [role="button"]')]
    .filter(e => {
      const r = e.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return false
      const cs = getComputedStyle(e)
      return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none'
    })
    .map(e => ({ ...zone(e), t: (e.textContent || e.getAttribute('aria-label') || '?').trim().slice(0, 34) }))
    .filter(x => x.w < seuil - 0.5 || x.h < seuil - 0.5)
    .map(x => `${x.t} [${Math.round(x.w)}×${Math.round(x.h)}]`)
}, 44)

test('aucune cible sous 44 px au registre ni dans les coutures liées', async ({ page }) => {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await semer(page, POEMES)
  const fautes: string[] = []
  for (const url of ['/voix', '/voix/meteorologue', '/bibliotheque/p-atelier?coutures']) {
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    await entrer(page)
    await page.waitForTimeout(800)
    const petites = await tropPetites(page)
    if (petites.length) fautes.push(`${url} → ${petites.join(' · ')}`)
  }
  expect(fautes.join('\n'), 'cibles sous le seuil').toBe('')
})
