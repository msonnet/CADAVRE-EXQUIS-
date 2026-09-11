import { test, expect, type Page } from '@playwright/test'

/**
 * Le retour visible du bouton PARTAGER — lot 3 de l'audit du 10 septembre.
 *
 * L'audit notait « ni feuille de partage, ni toast, ni changement d'état ».
 * Reproduit, et c'est plus précis que ça : le bouton travaillait, mais
 * l'encodage de la vidéo prend 6,2 s pendant lesquelles il ne disait que
 * « EN COURS… ». Personne n'attend six secondes devant un libellé muet — on
 * conclut que le bouton est cassé, et on a raison de le conclure.
 *
 * Le poème est donc copié dans le presse-papiers TOUT DE SUITE, avant
 * l'encodage : le droit d'écrire dans le presse-papiers tient à l'activation
 * par le geste, et six secondes plus tard le navigateur l'aurait refusé.
 */

const POEME = 'le vernis craque sous la lampe'

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function allerALaFin(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(600)
  await page.evaluate(async (texte) => {
    const p = {
      id: 'partage', titre: null, structureId: 'vers-libre', mode: 'standard', visibilite: 'aveugle',
      cases: [{ numero: 1, texte, auteur: 'humain', fonction: 'vers', ts: Date.now() }],
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
  }, POEME)
  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await franchir(page)
  await page.getByLabel(/Passer la révélation|Skip the reveal/).click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(600)
}

test('sans feuille de partage, le poème est copié et le bouton le dit', async ({ page }) => {
  test.setTimeout(120_000)
  await allerALaFin(page)

  // Chromium de bureau n'expose pas `navigator.share` : c'est exactement la
  // condition de l'audit, rien à simuler.
  expect(await page.evaluate(() => typeof (navigator as unknown as { share?: unknown }).share)).toBe('undefined')

  const bouton = page.getByRole('button', { name: /PARTAGER|SHARE|EN COURS|COPIÉ|COPIED|PARTAGÉ|SHARED|IMPOSSIBLE|FAILED/ })
  await bouton.click()

  // Le retour arrive bien avant la fin de l'encodage — mesuré à 240 ms,
  // contre 6,2 s pour la vidéo. La borne est large, c'est l'ordre de
  // grandeur qu'on garde : un retour, pas une attente muette.
  await expect(bouton).toHaveText(/COPIÉ|COPIED/, { timeout: 2_500 })

  // Et il dit vrai : le poème est réellement dans le presse-papiers.
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(POEME)
})

test("le partage va jusqu'au bout et l'annonce", async ({ page }) => {
  test.setTimeout(120_000)
  await allerALaFin(page)

  const telechargements: string[] = []
  page.on('download', d => telechargements.push(d.suggestedFilename()))

  const bouton = page.getByRole('button', { name: /PARTAGER|SHARE|EN COURS|COPIÉ|COPIED|PARTAGÉ|SHARED|IMPOSSIBLE|FAILED/ })
  await bouton.click()
  await expect(bouton).toHaveText(/PARTAGÉ|SHARED/, { timeout: 30_000 })
  expect(telechargements, 'le fichier emporté').not.toHaveLength(0)
})

/**
 * La feuille refermée n'est pas un partage.
 *
 * `DessinDetail` annonçait « ✓ PARTAGÉ » même quand l'utilisateur avait
 * refermé la feuille de partage sans rien envoyer — seul des trois boutons à
 * ne pas traiter l'annulation. C'est le genre d'écart qui naît de trois
 * copies d'une même logique ; elles n'en font plus qu'une.
 */
test('une feuille de partage refermée ne se dit pas partagée', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    // Une feuille de partage qui existe et que l'utilisateur referme.
    const nav = navigator as unknown as Record<string, unknown>
    nav.share = () => Promise.reject(Object.assign(new Error('annulé'), { name: 'AbortError' }))
    nav.canShare = () => true
  })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))

  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(600)
  const id = await page.evaluate(async () => {
    const d = {
      id: 'dessin-test', titre: 'Le monstre', nbBandes: 2,
      imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      texteVision: 'un chapeau qui se souvient',
      dateCreation: Date.now(), dateModification: Date.now(),
    }
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('dessins', 'readwrite')
      tx.objectStore('dessins').put(d)
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
    return d.id
  })

  await page.goto(`/bibliotheque/dessin/${id}`)
  await page.waitForLoadState('domcontentloaded')
  await franchir(page)
  await page.waitForTimeout(800)

  const bouton = page.getByRole('button', { name: /PARTAGER CE DESSIN|SHARE THIS DRAWING|COMPOSITION|EN COURS|PARTAGÉ|SHARED|COPIÉ/ })
  await expect(bouton).toBeVisible({ timeout: 10_000 })
  await bouton.click()

  // On SURVEILLE au lieu de regarder une fois. L'ancien code annonçait
  // « ✓ PARTAGÉ » de la sixième à la huitième seconde — un instantané pris
  // avant ou après passait sans rien voir, et le test aurait été vert pour
  // de mauvaises raisons.
  const vus: string[] = []
  const t0 = Date.now()
  while (Date.now() - t0 < 11_000) {
    const l = (await bouton.innerText().catch(() => '')).trim()
    if (l && vus[vus.length - 1] !== l) vus.push(l)
    await page.waitForTimeout(200)
  }

  // Rien n'a été envoyé : à aucun moment le bouton ne doit s'en vanter.
  expect(vus.join(' | '), 'ce que le bouton a dit').not.toMatch(/PARTAGÉ|SHARED/)
})
