import { test, expect } from '@playwright/test'

/** L'écran d'entrée couvre la page et intercepte les clics tant qu'on ne l'a
 *  pas franchi — il attend un geste pour pouvoir démarrer le son. */
async function entrer(page: import('@playwright/test').Page) {
  await page.getByLabel(/Entrer dans le jeu|Enter the game/).click({ timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(300)
}

test('le carnet, de bout en bout', async ({ page }) => {
  const erreurs: string[] = []
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
  page.on('pageerror', e => erreurs.push(String(e)))
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))

  // ── Le carnet vide ──
  await page.goto('/recolte')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await expect(page.getByText(/LE CARNET|THE NOTEBOOK/)).toBeVisible()
  await expect(page.getByText(/aucun vers gardé|no line kept/)).toBeVisible()

  // ── On y met trois vers par l'API du dépôt ──
  // On écrit dans IndexedDB directement : l'aperçu sert le bundle construit,
  // les modules du dépôt n'y sont pas importables.
  await page.evaluate(async () => {
    const vers = [
      { id: 'r1', texte: "l'abbé presse ma main", ordre: 1, dateRecolte: Date.now(), signature: "L'enlumineur", poemeTitre: 'Sans titre', datePoeme: Date.now() },
      { id: 'r2', texte: 'la lampe du couloir reste allumée', ordre: 2, dateRecolte: Date.now(), signature: "L'insomniaque" },
      { id: 'r3', texte: 'le tablier sèche mal', ordre: 3, dateRecolte: Date.now(), signature: 'Le boucher' },
    ]
    const bdd: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result)
      r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = bdd.transaction('recolte', 'readwrite')
      const st = tx.objectStore('recolte')
      st.clear()
      for (const v of vers) st.put(v)
      tx.oncomplete = () => ok()
      tx.onerror = () => ko(tx.error)
    })
    bdd.close()
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await entrer(page)

  await expect(page.getByText(/3 vers gardés|3 lines kept/)).toBeVisible()
  await expect(page.getByText("l'abbé presse ma main")).toBeVisible()
  await expect(page.getByText('le tablier sèche mal')).toBeVisible()

  // ── On descend le premier vers ──
  const lignes = () => page.locator('p').filter({ hasText: /abbé|lampe|tablier/ })
  await page.getByLabel(/Descendre ce vers|Move this line down/).first().click()
  await page.waitForTimeout(400)
  const ordre = await lignes().allInnerTexts()
  expect(ordre[0]).toContain('lampe')
  expect(ordre[1]).toContain('abbé')

  // ── Les sources ──
  await page.getByRole('button', { name: /SOURCES/ }).click()
  await expect(page.getByText("L'insomniaque")).toBeVisible()

  // ── On en retire un ──
  await page.getByLabel(/Retirer ce vers du carnet|Remove this line/).first().click()
  await expect(page.getByText(/2 vers gardés|2 lines kept/)).toBeVisible()

  // On ignore les échecs de chargement de ressources : ce sont les requêtes
  // Supabase que ce test bloque lui-même, plus les icônes absentes de
  // l'aperçu. Ce qu'on vérifie, c'est qu'aucun code du carnet n'a levé.
  const duCarnet = erreurs.filter(e => !/Failed to load resource/i.test(e))
  expect(duCarnet, `erreurs console : ${duCarnet.join(' | ')}`).toHaveLength(0)
})
