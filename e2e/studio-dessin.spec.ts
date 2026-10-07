import { test, expect, type Page } from '@playwright/test'

/**
 * Le studio du cadavre dessiné — la trousse, le trait, la règle, les formes.
 *
 * Relevé avant : chaque segment d'un trait était posé à part, si bien qu'un
 * outil translucide (le feutre) foncait à chaque jointure et partout où il
 * repassait sur lui-même — le « chapelet de perles ». Les outils n'avaient ni
 * réglage fin, ni règle, ni redressement des formes.
 */

test.use({ viewport: { width: 390, height: 844 } })

async function ouvrirStudio(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('langue', 'fr')
    localStorage.setItem('coach-dessin', '1')
    localStorage.removeItem('studio-reglages')
    sessionStorage.setItem('config-dessin', JSON.stringify({ nbBandes: 3, joueurs: 3, visibilite: 'raccord' }))
  })
  await page.route(u => u.hostname.endsWith('supabase.co'), r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.goto('/jeu-dessin')
  const seuil = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await seuil.click({ timeout: 4000 }).catch(() => {})
  await seuil.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.getByText('TOUCHER POUR COMMENCER').first().click()
  await page.getByText('TOUCHER POUR COMMENCER').first().waitFor({ state: 'detached' })
}

/** Les pixels de la feuille (le premier canvas), en RVB, sur une bande horizontale. */
async function pixels(page: Page, y0: number, y1: number) {
  return page.evaluate(([a, b]) => {
    const c = document.querySelector('canvas') as HTMLCanvasElement
    const k = c.width / c.getBoundingClientRect().width
    const d = c.getContext('2d')!.getImageData(0, Math.round(a * k), c.width, Math.round((b - a) * k)).data
    return { largeur: c.width, k, d: Array.from(d) }
  }, [y0, y1])
}

async function tracer(page: Page, pts: [number, number][], tenir = 0) {
  await page.mouse.move(...pts[0]); await page.mouse.down()
  for (const p of pts.slice(1)) await page.mouse.move(...p)
  if (tenir) await page.waitForTimeout(tenir)
  await page.mouse.up()
}

test('la trousse : huit instruments, le second toucher ouvre leurs réglages', async ({ page }) => {
  await ouvrirStudio(page)
  const trousse = page.getByRole('radiogroup', { name: 'Instruments' })
  await expect(trousse.getByRole('radio')).toHaveCount(8)
  await trousse.getByRole('radio', { name: 'Feutre' }).click()
  await expect(trousse.getByRole('radio', { name: 'Feutre' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Second toucher sur l'instrument levé : ses réglages.
  await trousse.getByRole('radio', { name: 'Feutre' }).click()
  const reglages = page.getByRole('dialog', { name: /Réglages — Feutre/ })
  await expect(reglages).toBeVisible()
  await reglages.getByRole('slider').first().fill('30')
  await expect(reglages).toContainText('30 px')
  await reglages.getByRole('button', { name: 'OK' }).click()
  await expect(reglages).toHaveCount(0)
})

test('un feutre qui repasse sur lui-même garde une seule teinte — plus de chapelet', async ({ page }) => {
  await ouvrirStudio(page)
  await page.getByRole('radiogroup', { name: 'Instruments' }).getByRole('radio', { name: 'Feutre' }).click()
  // Un aller horizontal, puis un retour sur la même ligne : un seul trait.
  const aller = Array.from({ length: 40 }, (_, i) => [40 + i * 8, 300] as [number, number])
  await tracer(page, [...aller, ...aller.slice().reverse().slice(0, 25)])
  const { largeur, k, d } = await pixels(page, 296, 304)
  // Le rouge (= le gris de l'encre noire à 55 %) le long de la ligne, hors des bouts arrondis.
  const ligne = Math.round(4 * k) * largeur
  const valeurs: number[] = []
  for (let x = Math.round(70 * k); x < Math.round(330 * k); x += 3) valeurs.push(d[(ligne + x) * 4])
  const ecart = Math.max(...valeurs) - Math.min(...valeurs)
  // L'ancien moteur variait de plusieurs dizaines de niveaux à chaque jointure.
  expect(ecart).toBeLessThanOrEqual(3)
  expect(Math.min(...valeurs)).toBeLessThan(200) // il y a bien un trait
})

test('un cercle tenu à la fin devient une ellipse, et le dit', async ({ page }) => {
  await ouvrirStudio(page)
  await page.getByRole('radiogroup', { name: 'Instruments' }).getByRole('radio', { name: 'Stylo' }).click()
  const cercle = Array.from({ length: 61 }, (_, i) => {
    const t = (i / 60) * Math.PI * 2, b = Math.sin(i * 2.3) * 2.5
    return [195 + 70 * Math.cos(t) + b, 260 + 60 * Math.sin(t) - b] as [number, number]
  })
  await tracer(page, cercle, 900)
  await expect(page.getByRole('status').filter({ hasText: 'ELLIPSE' })).toBeVisible()
  // Un gribouillis tenu, lui, reste un gribouillis.
  const gribouillis = Array.from({ length: 40 }, (_, i) => [80 + 50 * Math.sin(i * 1.7), 470 + 40 * Math.cos(i * 2.9) + i] as [number, number])
  await page.waitForTimeout(1300)
  await tracer(page, gribouillis, 900)
  await expect(page.getByRole('status').filter({ hasText: /ELLIPSE|DROITE|RECTANGLE|TRIANGLE/ })).toHaveCount(0)
})

test('la règle : un trait qui part de son bord le suit, droit', async ({ page }) => {
  await ouvrirStudio(page)
  await page.getByRole('radiogroup', { name: 'Instruments' }).getByRole('radio', { name: 'Stylo' }).click()
  await page.getByRole('button', { name: 'Règle' }).click()
  const regle = page.getByRole('img', { name: /Règle, 0 degrés/ })
  const r = (await regle.boundingBox())!
  // Un geste qui ondule de ±9 px, à 12 px au-dessus du bord haut.
  await tracer(page, Array.from({ length: 30 }, (_, k) => [100 + k * 8, r.y - 12 - Math.sin(k) * 9] as [number, number]))
  const { largeur, k, d } = await pixels(page, r.y - 40, r.y + 2)
  const lignes = new Set<number>()
  for (let y = 0; y < d.length / 4 / largeur; y++) {
    let n = 0
    for (let x = 0; x < largeur; x++) if (d[(y * largeur + x) * 4] < 120) n++
    if (n > 100) lignes.add(y)
  }
  // Toute l'encre tient dans l'épaisseur du trait (≈ 2,5 px), pas dans ±9 px.
  expect(lignes.size).toBeGreaterThan(0)
  expect(lignes.size / k).toBeLessThan(5)
})

test('le nuancier : une encre du jeu passe dans l’instrument et dans le trait', async ({ page }) => {
  await ouvrirStudio(page)
  await page.getByRole('radiogroup', { name: 'Instruments' }).getByRole('radio', { name: 'Stylo' }).click()
  await page.getByRole('button', { name: 'Choisir une couleur' }).click()
  const nuancier = page.getByRole('dialog', { name: 'Couleurs' })
  await expect(nuancier.getByRole('tab')).toHaveCount(3)
  await nuancier.getByRole('tab', { name: 'Curseurs' }).click()
  await expect(nuancier.getByRole('slider')).toHaveCount(3)
  await nuancier.getByRole('button', { name: 'Bleu de Prusse' }).click()
  await nuancier.getByRole('button', { name: 'Fermer' }).click()
  // Le premier trait après la fermeture n'est pas avalé par le voile qui s'efface.
  await tracer(page, Array.from({ length: 30 }, (_, i) => [60 + i * 9, 360] as [number, number]))
  const { largeur, k, d } = await pixels(page, 355, 365)
  const y = Math.round(5 * k), x = Math.round(190 * k), i = (y * largeur + x) * 4
  // #1f3a5f : plus de bleu que de rouge.
  expect(d[i + 2] - d[i]).toBeGreaterThan(40)
})
