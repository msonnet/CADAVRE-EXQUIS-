import { test, expect, type Page } from '@playwright/test'

/**
 * Le pli à l'écriture — le papier de l'écran d'écriture, et le rabat de
 * « SCELLER ».
 *
 * Relevé avant : la case s'écrasait (`scaleY: 0`, `brightness(0.7)`) en
 * 400 ms puis l'écran était coupé — l'écran suivant arrivait 460 à 600 ms
 * après l'appui, MÊME sous `prefers-reduced-motion`, et rien ne disait ce
 * que la visibilité transmettait. L'écho des autres mains était une citation
 * de 17 px ; la feuille ne s'épaississait jamais ; l'écran de passage à
 * plusieurs n'était que du texte.
 *
 * On reprend la partie au milieu grâce au brouillon : deux cases déjà
 * scellées, l'acte III à écrire.
 */

const CASES = [
  { numero: 1, fonction: 'sujet', consigne: 'c', auteur: 'humain', moi: true, texte: 'le cadavre', ts: 1 },
  { numero: 2, fonction: 'adjectif', consigne: 'c', auteur: 'humain', moi: true, texte: 'exquis', ts: 1 },
]

async function reprendre(page: Page, visibilite: string, joueursHumains = 1) {
  await page.addInitScript(([visibilite, joueursHumains, cases]) => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('brouillon-actuel', JSON.stringify({
      poemeId: 'rabat', total: 5, caseIndex: 2, voixParSlot: {}, cases,
      config: {
        structureId: 'phrase-etoffee', visibilite, premierJoueur: 'humain', mode: 'standard',
        joueursHumains, voixIA: 0, ...(joueursHumains > 1 ? { noms: ['Nadja', 'Léa'] } : {}),
      },
    }))
    // La sonde : dès l'appui sur SCELLER (phase de capture, avant React),
    // on relève à chaque trame l'angle de la bande, ses filtres, ce qui
    // reste sur la tranche, et l'instant où l'écran suivant arrive.
    const w = window as unknown as { __rabat: Record<string, unknown> }
    document.addEventListener('click', e => {
      const b = (e.target as Element).closest?.('button[aria-label^="Sceller"]')
      if (!b || w.__rabat) return
      const t0 = performance.now()
      const r: Record<string, unknown> = { angleMax: 0, filtres: [] as string[], restes: [] as string[], suivant: null }
      w.__rabat = r
      const tic = () => {
        const t = performance.now() - t0
        const bande = document.querySelector('[data-rabat]') as HTMLElement | null
        if (bande) {
          const cs = getComputedStyle(bande)
          if (cs.filter !== 'none') (r.filtres as string[]).push(cs.filter)
          const m = cs.transform.match(/matrix3d\(([^)]+)\)/)
          if (m) {
            const cos = Number(m[1].split(',')[5])
            r.angleMax = Math.max(r.angleMax as number, Math.acos(Math.min(1, Math.abs(cos))) * 180 / Math.PI)
          }
        }
        const reste = document.querySelector('[data-reste]') as HTMLElement | null
        if (reste && Number(getComputedStyle(reste).opacity) > 0.3) (r.restes as string[]).push(reste.innerText.trim())
        if (r.suivant === null && !document.querySelector('textarea')) r.suivant = Math.round(t)
        if (t < 2000) requestAnimationFrame(tic)
      }
      requestAnimationFrame(tic)
    }, true)
  }, [visibilite, joueursHumains, CASES] as const)
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 503, body: '{}' }))
  await page.goto('/jeu')
  const seuil = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await seuil.click({ timeout: 4000 }).catch(() => {})
  if (joueursHumains > 1) await page.getByRole('button', { name: /C'est à moi/ }).click({ timeout: 8000 })
  const champ = page.locator('textarea[aria-label="Ta contribution"]')
  await expect(champ).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(700)
  return champ
}

type Sonde = { angleMax: number; filtres: string[]; restes: string[]; suivant: number | null }
/** Le relevé, une fois que la sonde a vu l'écran suivant — pas avant : le
 *  texte du rideau peut paraître une trame avant qu'elle ne le note. */
async function sonde(page: Page): Promise<Sonde> {
  await page.waitForFunction(() => (window as unknown as { __rabat?: Sonde }).__rabat?.suivant != null, null, { timeout: 4000 })
  return page.evaluate(() => (window as unknown as { __rabat: Sonde }).__rabat)
}

test('la feuille s’épaissit, et l’écho est en vedette sur la lèvre du pli', async ({ page }) => {
  await reprendre(page, 'dernier-mot')
  // Deux cases scellées : deux tranches au-dessus de la bande.
  await expect(page.locator('[data-feuillet="2"] [data-tranches="2"]')).toHaveCount(1)
  const echo = page.locator('[data-levre] [data-echo]')
  await expect(echo).toHaveText('exquis')
  const corps = await echo.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  // C'était une citation de 17 px.
  expect(corps).toBeGreaterThanOrEqual(30)
  // Le champ lit le pli : une main aveugle sait ce qu'on lui laisse voir.
  const decrit = await page.locator('textarea').getAttribute('aria-describedby')
  expect(decrit).toContain('jeu-echo')
})

test('SCELLER rabat la bande, et ne laisse que le dernier mot sur la tranche', async ({ page }) => {
  const champ = await reprendre(page, 'dernier-mot')
  await champ.fill('le vin rouge')
  await page.locator('button[aria-label^="Sceller"]').click()
  await expect(page.getByText('Acte IV', { exact: true })).toBeVisible({ timeout: 4000 })
  const r = await sonde(page)
  expect(r.angleMax, 'la bande tourne sur sa charnière').toBeGreaterThan(45)
  expect(r.filtres, 'aucun filtre animé').toEqual([])
  expect(r.restes.length, 'le dernier mot est resté visible').toBeGreaterThan(0)
  for (const t of r.restes) expect(t).toBe('rouge')
  // Pas plus tard qu'avant : l'écrasement amenait l'écran suivant en 460 à
  // 600 ms ; le rabat dure 400 ms et ne doit rien y ajouter.
  expect(r.suivant).not.toBeNull()
  expect(r.suivant!).toBeLessThan(650)

  // L'acte IV : trois tranches, et sur la lèvre, le mot resté sur la tranche.
  await expect(page.locator('textarea')).toHaveValue('', { timeout: 6000 })
  await expect(page.locator('[data-feuillet="3"]')).toHaveCount(1)
  await expect(page.locator('[data-levre] [data-echo]')).toHaveText('rouge')
})

test('en aveugle, le pli ne laisse rien', async ({ page }) => {
  const champ = await reprendre(page, 'aveugle')
  await expect(page.locator('[data-levre]')).toHaveCount(0)
  await champ.fill('le vin rouge')
  await page.locator('button[aria-label^="Sceller"]').click()
  await expect(page.getByText('Acte IV', { exact: true })).toBeVisible({ timeout: 4000 })
  const r = await sonde(page)
  expect(r.angleMax).toBeGreaterThan(45)
  for (const t of r.restes) expect(t).toBe('')
  await expect(page.locator('textarea')).toHaveValue('', { timeout: 6000 })
  await expect(page.locator('[data-feuillet="3"]')).toHaveCount(1)
  await expect(page.locator('[data-levre]')).toHaveCount(0)
})

test('en dernière case, la case entière reste', async ({ page }) => {
  const champ = await reprendre(page, 'derniere-case')
  await champ.fill('le vin rouge')
  await page.locator('button[aria-label^="Sceller"]').click()
  await expect(page.getByText('Acte IV', { exact: true })).toBeVisible({ timeout: 4000 })
  const r = await sonde(page)
  expect(r.restes.length).toBeGreaterThan(0)
  for (const t of r.restes) expect(t).toBe('le vin rouge')
})

test('un appui abrège le rabat : la suite vient tout de suite', async ({ page }) => {
  const champ = await reprendre(page, 'dernier-mot')
  await champ.fill('le vin rouge')
  await page.locator('button[aria-label^="Sceller"]').click()
  await page.mouse.click(20, 600)
  await expect(page.getByText('Acte IV', { exact: true })).toBeVisible({ timeout: 4000 })
  const r = await sonde(page)
  expect(r.suivant!).toBeLessThan(250)
})

test.describe('sous mouvement réduit', () => {
  test('l’écran suivant arrive à l’appui même', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const champ = await reprendre(page, 'dernier-mot')
    await champ.fill('le vin rouge')
    await page.locator('button[aria-label^="Sceller"]').click()
    await expect(page.getByText('Acte IV', { exact: true })).toBeVisible({ timeout: 4000 })
    const r = await sonde(page)
    // L'écrasement, lui, ne lisait pas le réglage : 460 ms quand même.
    expect(r.suivant!).toBeLessThan(200)
    expect(r.angleMax).toBeLessThan(1)
  })
})

test('à plusieurs, on se passe une feuille pliée, une tranche par case', async ({ page }) => {
  const champ = await reprendre(page, 'aveugle', 2)
  await champ.fill('le vin rouge')
  await page.locator('button[aria-label^="Sceller"]').click()
  await expect(page.getByText('Passe le téléphone à', { exact: true })).toBeVisible({ timeout: 4000 })
  const feuille = page.locator('[data-feuillet-ferme="3"]')
  await expect(feuille).toBeVisible()
  await expect(feuille).toHaveText('3 FRAGMENTS SOUS LE PLI')
  // Et jamais un mot de ce qui est dessous.
  await expect(feuille).not.toContainText('rouge')
})

/**
 * Un vrai toucher : le doigt reste posé quelques dizaines de millisecondes.
 * `touchscreen.tap` envoie le toucher et le relâcher d'un seul tenant, si
 * bien que l'écran n'a pas le temps de changer entre les deux — et le défaut
 * qu'on cherche vit exactement dans cet intervalle.
 *
 * Le doigt se prépare AVANT le geste mesuré : ouvrir la session CDP coûte des
 * dizaines de millisecondes sous charge, et ce retard, compté dans la mesure,
 * la faussait.
 */
async function doigt(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  return async (x: number, y: number, tenue = 80) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await page.waitForTimeout(tenue)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
}

test.describe('au doigt', () => {
  test.use({ hasTouch: true })

  // L'appui qui abrège le rabat ne doit pas traverser l'écran de passage.
  // On l'abrégeait sur `pointerdown` : l'écran changeait entre le toucher et
  // le relâcher, et le clic que le navigateur synthétise ensuite tombait sur
  // « C'EST À MOI → », déjà sous le doigt. La main qui venait d'écrire
  // ouvrait la case de la suivante. À la souris rien de tel — la cible du
  // clic est alors l'ancêtre commun —, d'où ce test au toucher.
  /** Deux tours à deux mains ; au second, on touche là où « C'EST À MOI »
   *  va paraître, `apres` ms après SCELLER — ou dès que l'écran de passage
   *  est monté —, le doigt posé `tenue` ms. */
  async function toucherLePassage(page: Page, apres: number | 'au-passage', tenue: number) {
    const champ = await reprendre(page, 'aveugle', 2)
    await champ.fill('le vin rouge')
    await page.locator('button[aria-label^="Sceller"]').click()
    const passage = page.getByText('Passe le téléphone à', { exact: true })
    await expect(passage).toBeVisible({ timeout: 4000 })
    const moi = page.getByRole('button', { name: /C'est à moi/ })
    await page.waitForTimeout(900)
    const box = (await moi.boundingBox())!
    await moi.click()
    await expect(page.locator('textarea')).toBeVisible({ timeout: 4000 })
    await page.waitForTimeout(700)

    await page.locator('textarea').fill('la cire tiède')
    const poser = await doigt(page)
    await page.locator('button[aria-label^="Sceller"]').click()
    if (apres === 'au-passage') await expect(moi).toHaveCount(1, { timeout: 4000 })
    else await page.waitForTimeout(apres)
    await poser(box.x + box.width / 2, box.y + box.height / 2, tenue)
    await expect(passage).toBeVisible({ timeout: 4000 })
    await page.waitForTimeout(1200)
    await expect(passage).toBeVisible()
    await expect(page.locator('textarea')).toHaveCount(0)
  }

  test('un appui qui abrège le rabat ne saute pas l’écran de passage', async ({ page }) => {
    await toucherLePassage(page, 80, 80)
  })

  // Le doigt posé à 330 ms et relâché après l'horloge de 0,4 s : l'écran a
  // changé SANS l'appui, et le clic du relâcher tombait quand même sur le
  // bouton de la main suivante.
  test('ni un doigt resté posé quand l’horloge passe la main', async ({ page }) => {
    await toucherLePassage(page, 330, 150)
  })

  // Le doigt posé APRÈS que l'horloge a passé la main : le rabat n'est plus
  // là pour avaler quoi que ce soit, et « C'EST À MOI → » est déjà monté,
  // encore invisible (il paraît à 0,7 s). Un joueur qui tape pour abréger
  // un rabat déjà fini ouvrait la case de la suivante. Sous charge, c'est
  // aussi ce que devenait le test précédent quand son doigt arrivait tard.
  test('ni un appui impatient sur le bouton encore invisible', async ({ page }) => {
    await toucherLePassage(page, 'au-passage', 60)
  })

  test('un appui abrège toujours le rabat', async ({ page }) => {
    const champ = await reprendre(page, 'dernier-mot')
    await champ.fill('le vin rouge')
    await page.locator('button[aria-label^="Sceller"]').click()
    // Ici le doigt n'a pas à rester posé : on mesure l'abrègement, pas la
    // traversée. Un toucher tenu, sous charge, arrivait après l'horloge de
    // 0,4 s (441 et 531 ms relevés) et ne mesurait plus rien.
    await page.touchscreen.tap(20, 600)
    await expect(page.getByText('Acte IV', { exact: true })).toBeVisible({ timeout: 4000 })
    const r = await sonde(page)
    expect(r.suivant!).toBeLessThan(250)
  })
})
