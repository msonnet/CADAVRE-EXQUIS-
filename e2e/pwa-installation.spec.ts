import { test, expect } from '@playwright/test'

/**
 * La fiche d'installation — lot 18 de l'audit du 10 septembre.
 *
 * Vérifié avant correction : le manifeste n'avait ni `id`, ni `shortcuts`,
 * ni `screenshots`. Android affichait donc l'invite minimale — une ligne et
 * un bouton — pour une application dont c'est le seul étalage avant
 * l'installation.
 *
 * Ce test vérifie surtout ce qu'une relecture ne voit pas : que chaque
 * fichier annoncé existe VRAIMENT. Un manifeste qui pointe vers une capture
 * absente donne une fiche cassée, ce qui est pire qu'une fiche minimale.
 */

test('le manifeste tient sa fiche, et tous ses fichiers existent', async ({ page, request }) => {
  test.setTimeout(60_000)
  const r = await request.get('/manifest.webmanifest')
  expect(r.status(), 'le manifeste est servi').toBe(200)
  const m = await r.json()

  // ── L'identité, pour qu'une installation reste la même ──
  expect(m.id, 'le manifeste porte une identité stable').toBeTruthy()

  // ── Les captures ──
  expect(Array.isArray(m.screenshots) && m.screenshots.length >= 1,
    'au moins une capture, sinon l’invite reste minimale').toBe(true)
  const etroites = m.screenshots.filter((s: any) => s.form_factor === 'narrow')
  expect(etroites.length, 'des captures pour le téléphone').toBeGreaterThan(0)
  // Android exige un rapport constant entre les captures étroites : une
  // seule d'un autre format et il les écarte TOUTES, en silence.
  const rapports = new Set(etroites.map((s: any) => {
    const [l, h] = String(s.sizes).split('x').map(Number)
    return (l / h).toFixed(3)
  }))
  expect(rapports.size, 'toutes les captures étroites au même format').toBe(1)
  for (const s of m.screenshots) {
    expect(s.label, `${s.src} porte une légende`).toBeTruthy()
  }

  // ── Les raccourcis ──
  expect(Array.isArray(m.shortcuts) && m.shortcuts.length >= 1, 'des raccourcis').toBe(true)
  // Au plus quatre : au-delà, Android tronque sans prévenir.
  expect(m.shortcuts.length).toBeLessThanOrEqual(4)

  // ── Rien ne pointe dans le vide ──
  const chemins: string[] = [
    ...m.icons.map((i: any) => i.src),
    ...m.screenshots.map((s: any) => s.src),
    ...m.shortcuts.flatMap((s: any) => (s.icons ?? []).map((i: any) => i.src)),
  ]
  for (const c of chemins) {
    expect((await request.get(c)).status(), `${c} est servi`).toBe(200)
  }

  // ── Et chaque raccourci mène quelque part ──
  for (const s of m.shortcuts) {
    await page.goto(s.url)
    await page.waitForLoadState('networkidle')
    expect(page.url(), `${s.url} n’est pas renvoyé à l’accueil`).toContain(s.url)
  }
})

test('le document ne rebondit plus', async ({ page }) => {
  test.setTimeout(30_000)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const mesure = await page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).overscrollBehaviorY,
    body: getComputedStyle(document.body).overscrollBehaviorY,
  }))
  // Le rebond découvre le fond blanc de la webvue sous les ambiances
  // sombres ; il emporte au passage le « tirer pour recharger », qui
  // effaçait un fragment saisi.
  expect(mesure.html).toBe('none')
  expect(mesure.body).toBe('none')
})
