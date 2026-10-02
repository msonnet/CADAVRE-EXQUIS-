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

// ── Composer ─────────────────────────────────────────────────────────────
// Le carnet ramassait des vers sans permettre d'en faire un poème : deux
// flèches d'un rang, un .txt pour toute sortie. On choisit ici trois vers
// dans le désordre du carnet, on relit, on relie — et l'on vérifie que le
// feuillet est au recueil, avec ses provenances pour coutures, et que le
// carnet n'a rien perdu.
test('le carnet compose un feuillet du recueil', async ({ page }) => {
  const erreurs: string[] = []
  page.on('pageerror', e => erreurs.push(String(e)))
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 503, body: '{}' }))

  await page.goto('/recolte')
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    const t = Date.UTC(2026, 8, 14, 12)
    const vers = [
      { id: 'r1', texte: "l'abbé presse ma main", ordre: 1, dateRecolte: t, signature: "voix 2 · L'enlumineur", poemeTitre: 'Le vernis', datePoeme: t, auteur: 'ia' },
      { id: 'r2', texte: 'la lampe du couloir reste allumée', ordre: 2, dateRecolte: t, signature: 'toi', auteur: 'humain' },
      { id: 'r3', texte: 'le tablier sèche mal', ordre: 3, dateRecolte: t, signature: 'toi', datePoeme: t, auteur: 'humain' },
    ]
    const bdd: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result)
      r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = bdd.transaction(['recolte', 'poemes'], 'readwrite')
      tx.objectStore('poemes').clear()
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

  await page.getByRole('button', { name: /^(COMPOSER|COMPOSE)$/ }).click()
  // On touche dans l'ordre du poème, qui n'est pas celui du carnet.
  await page.getByRole('button', { name: /le tablier sèche mal/ }).click()
  await page.getByRole('button', { name: /abbé presse ma main/ }).click()
  await expect(page.getByRole('button', { name: /le tablier sèche mal/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/2 vers choisis|2 lines chosen/)).toBeVisible()

  await page.getByRole('button', { name: /RELIRE|READ OVER/ }).click()
  await expect(page.getByText(/LE FEUILLET|THE PAGE/)).toBeVisible()
  // La provenance qui deviendra la couture se lit avant de relier.
  await expect(page.getByText(/Le vernis — voix 2/)).toBeVisible()
  // Puis on se ravise : le second vers ouvrira le poème, d'un seul appui.
  const enTete = page.getByRole('button', { name: /Mettre ce vers en tête|Move this line to the top/ })
  await expect(enTete.first()).toBeDisabled()
  await enTete.nth(1).click()

  await page.getByRole('button', { name: /RELIER EN FEUILLET|BIND INTO A PAGE/ }).click()
  await page.waitForURL(/\/bibliotheque\/carnet-/)
  await expect(page.getByText(/RECUEILLI PAR TOI|GATHERED BY YOU/)).toBeVisible()

  // Le poème est dans l'ordre du toucher, corrigé à la relecture.
  const poeme = await page.evaluate(async () => {
    const bdd: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result)
      r.onerror = () => ko(r.error)
    })
    const lire = <T,>(store: string) => new Promise<T[]>((ok, ko) => {
      const rq = bdd.transaction(store).objectStore(store).getAll()
      rq.onsuccess = () => ok(rq.result as T[])
      rq.onerror = () => ko(rq.error)
    })
    const poemes = await lire<{ cases: { texte: string; fonction: string }[]; origine: string }>('poemes')
    const recolte = await lire<{ id: string }>('recolte')
    bdd.close()
    return { poemes, recolte: recolte.length }
  })
  expect(poeme.poemes).toHaveLength(1)
  expect(poeme.poemes[0].origine).toBe('carnet')
  expect(poeme.poemes[0].cases.map(c => c.texte)).toEqual(["l'abbé presse ma main", 'le tablier sèche mal'])
  // Relier copie : les trois vers sont toujours au carnet.
  expect(poeme.recolte).toBe(3)

  // Les coutures disent d'où vient chaque vers.
  await page.getByLabel('Voir case par case').click()
  await expect(page.getByText(/14 SEPTEMBRE 2026 · LE VERNIS|14 SEPTEMBER 2026 · LE VERNIS/)).toBeVisible()
  // Ses vers sont au carnet par construction : un « ◆ GARDÉ » sous chacun
  // invitait à les en retirer, et le second appui perdait leur provenance.
  await expect(page.getByRole('button', { name: /ce vers (dans le|du) carnet|this line (in|from) the notebook/ })).toHaveCount(0)

  expect(erreurs, erreurs.join(' | ')).toHaveLength(0)
})
