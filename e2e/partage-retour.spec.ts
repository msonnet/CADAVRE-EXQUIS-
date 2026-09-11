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
