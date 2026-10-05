import { test, expect, type Page } from '@playwright/test'

/**
 * La fin de partie — le poème parle avant tout le reste.
 *
 * Relevé avant, sur un atelier de onze vers :
 *   — « SCELLER AU RECUEIL » plein à 1,5 s, sous le rideau encore levé ; le
 *     dernier mot du poème à 15,8 s ;
 *   — le titre du rideau qui traverse la carte pendant 400 ms ;
 *   — au premier lancement, le guide ouvert pendant que l'encre écrit ;
 *   — un appui en cours de séquence qui figeait les mots à mi-masque ;
 *   — « J e marche » au lecteur d'écran, aucun titre sur la page ;
 *   — les coutures qui recopiaient les onze vers sous la carte.
 */

const VERS = [
  'Je marche',
  'le plomb chante obliquement dans la cave',
  'cave où dorment les sextants',
  'il reste du givre sur la vitre du couloir',
  'un athanor',
  'elle pousse la lampe et le drap se froisse encore',
  'sans nom',
  'la cire des horloges coule vers le nord',
  'une échelle de sel monte dans la gorge',
  'les cerises comptent les noyés du canal',
  'Parfaitement inutile',
]

async function entrer(page: Page) {
  const splash = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await splash.click({ timeout: 4000 }).catch(() => {})
  await splash.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function preparer(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
}

/** Sème un poème dans IndexedDB, et arme le guide si demandé. */
async function semer(page: Page, opts: { structure?: string; vers?: string[]; tuto?: boolean } = {}) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await page.waitForTimeout(500)
  await page.evaluate(async ({ structure, vers, tuto }) => {
    const poeme = {
      id: 'fin', titre: null, structureId: structure, mode: 'standard', visibilite: 'aveugle',
      cases: vers.map((texte, i) => ({
        numero: i + 1, texte, fonction: `vers ${i + 1}`, ts: Date.now(),
        ...(i % 2 ? { auteur: 'ia', voixSlot: (i + 1) / 2, voixNom: 'greffier' } : { auteur: 'humain', moi: true }),
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
    if (tuto) {
      sessionStorage.setItem('tutoriel-actif', '1')
      sessionStorage.setItem('tutoriel-etape', '3')
    }
  }, { structure: opts.structure ?? 'atelier', vers: opts.vers ?? VERS, tuto: !!opts.tuto })
}

/** Les mots dessinés du poème, et combien sont découverts. */
async function motsEcrits(page: Page) {
  return page.evaluate(() => {
    const mots = [...document.querySelectorAll<HTMLElement>('#feuillet-fin span[style*="clip-path"]')]
    const ecrits = mots.filter(m => parseFloat(getComputedStyle(m).opacity) > 0.95
      && /none|inset\(0px\)|0%/.test(getComputedStyle(m).clipPath))
    return { total: mots.length, ecrits: ecrits.length }
  })
}

const sceller = (page: Page) => page.getByRole('button', { name: /Sceller au recueil/i })

test('le poème parle avant les actions, et le rideau sort avant la page', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)

  // Un relevé à chaque image : le rideau et le titre de la page ne doivent
  // jamais être visibles en même temps.
  await page.evaluate(() => {
    const w = window as unknown as { __croise: number }
    w.__croise = 0
    const op = (el: Element | null) => {
      let o = 1
      while (el && el.nodeType === 1) { o *= parseFloat(getComputedStyle(el).opacity); el = el.parentElement }
      return o
    }
    const tick = () => {
      const rideau = document.querySelector('[aria-label="Passer la révélation"]')
      const titre = document.querySelector('h1')
      if (rideau && titre && op(rideau) > 0.05 && op(titre) > 0.05) w.__croise++
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  // Sous le rideau, puis pendant l'encre : aucune action.
  const debut = Date.now()
  let vuPendant = false
  while (Date.now() - debut < 25_000) {
    const { total, ecrits } = await motsEcrits(page)
    if (total > 0 && ecrits === total) break
    if (await sceller(page).count()) vuPendant = true
    await page.waitForTimeout(150)
  }
  expect(vuPendant, 'aucune action ne paraît avant le dernier mot').toBe(false)
  // Puis elles montent.
  await expect(sceller(page)).toBeVisible({ timeout: 2000 })
  expect(await page.evaluate(() => (window as unknown as { __croise: number }).__croise),
    'le titre du rideau ne croise pas la page').toBe(0)
})

test('un appui EN COURS de séquence pose tout le poème', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await rideau.click({ timeout: 6000 })
  await rideau.waitFor({ state: 'detached', timeout: 4000 })

  // Attendre que l'encre ait commencé — c'est l'appui du milieu qui figeait.
  await expect.poll(async () => (await motsEcrits(page)).ecrits, { timeout: 8000 }).toBeGreaterThan(3)
  const avant = await motsEcrits(page)
  expect(avant.ecrits).toBeLessThan(avant.total)

  await page.mouse.click(195, 700)
  await page.waitForTimeout(300)
  const apres = await motsEcrits(page)
  expect(apres.ecrits, 'tous les mots sont découverts').toBe(apres.total)
  await expect(sceller(page)).toBeVisible()
})

test('à l’oreille : un titre qui reçoit le focus, et le premier mot entier', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, { structure: 'atelier', vers: VERS.slice(0, 3) })

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)

  const titre = page.getByRole('heading', { level: 1, name: /Le cadavre est exquis/ })
  await expect(titre).toBeFocused({ timeout: 10_000 })

  const poeme = page.getByRole('article', { name: 'Le poème' })
  const arbre = await poeme.ariaSnapshot()
  expect(arbre).toContain('Je marche')
  expect(arbre).not.toMatch(/\bJ e marche/)
  // Les mots dessinés un à un ne sont pas dans l'arbre : le vers y est d'un tenant.
  expect(arbre).toContain('le plomb chante obliquement dans la cave')
})

test('le guide attend le poème, puis propose de rejouer — à plusieurs', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, { tuto: true })

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)

  const guide = page.getByRole('dialog', { name: /Guide tutoriel/ })
  // Pendant l'écriture, pas de panneau.
  await expect.poll(async () => (await motsEcrits(page)).ecrits, { timeout: 10_000 }).toBeGreaterThan(0)
  await expect(guide).toHaveCount(0)
  // Il vient après le dernier mot.
  await expect(guide).toBeVisible({ timeout: 20_000 })
  const { total, ecrits } = await motsEcrits(page)
  expect(ecrits).toBe(total)
  await expect(guide).toContainText('La révélation')

  await guide.getByRole('button', { name: /Compris/i }).click()
  const suite = page.getByRole('dialog', { name: /étape 5 \/ 7/ })
  await expect(suite).toContainText('La suite')
  await expect(suite.getByRole('button', { name: 'ENCORE UNE' })).toBeVisible()
  // Plus de visite de l'image ni du partage.
  await expect(suite).not.toContainText(/Donne-lui une image|Partage-le/)

  await suite.getByRole('button', { name: 'À PLUSIEURS, SUR CE TÉLÉPHONE' }).click()
  await expect(page.getByText(/^2 mains — la séance peut commencer\.$/)).toBeVisible({ timeout: 8000 })
  // La demande se lit une fois, puis quitte l'adresse : elle y restait, et
  // un rechargement réimposait deux mains sans voix par-dessus les sièges
  // que le joueur venait de régler.
  await expect(page).toHaveURL(/\/config$/)
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await expect(page.getByText(/la séance peut commencer\.$/)).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(/^2 mains — la séance peut commencer\.$/)).toHaveCount(0)
})

test('les coutures se posent sous chaque vers, sans recopier le poème', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await rideau.click({ timeout: 6000 }).catch(() => {})
  await rideau.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {})
  await page.mouse.click(195, 700)

  await page.getByRole('button', { name: /^COUTURES$/ }).click()
  const carte = page.locator('#feuillet-fin')
  await expect(carte.locator('[data-couture]')).toHaveCount(VERS.length)
  await expect(page.getByRole('button', { name: 'Garder ce vers dans le carnet' })).toHaveCount(VERS.length)

  // Chaque vers n'est dessiné qu'une fois sur la page. La copie pour le
  // lecteur d'écran (`.sr-only`) ne se voit pas : on la retire du compte.
  const texte = await page.evaluate(() => {
    const copie = document.querySelector('.page-carnet')!.cloneNode(true) as HTMLElement
    copie.querySelectorAll('.sr-only').forEach(n => n.remove())
    return copie.textContent ?? ''
  })
  for (const v of VERS.slice(1)) {
    expect(texte.split(v).length - 1, `« ${v} » une seule fois`).toBe(1)
  }
  // Et la couture dit qui, sous le vers : la voix et son rang.
  await expect(carte).toContainText(/voix 1 · Le greffier/i)
})

test('composition : lettrine droite, débords en retrait, surface tirée de l’encre', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await semer(page)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await page.getByLabel(/Passer la révélation|Skip the reveal/).click({ timeout: 6000 }).catch(() => {})
  await expect(sceller(page)).toBeVisible({ timeout: 8000 })

  const mesure = await page.evaluate(() => {
    const carte = document.querySelector<HTMLElement>('#feuillet-fin')!
    const lettrine = [...carte.querySelectorAll<HTMLElement>('span')].find(s => s.textContent === 'J' && getComputedStyle(s).fontFamily.includes('Bodoni'))
    // Un vers qui déborde : la première ligne et la suivante.
    const vers = [...carte.querySelectorAll<HTMLElement>('span[aria-hidden="true"]')]
      .find(s => s.textContent?.includes('elle pousse la lampe'))!
    const mots = [...vers.querySelectorAll<HTMLElement>('span')].map(m => m.getBoundingClientRect())
    const lignes = [...new Set(mots.map(r => Math.round(r.top)))]
    const gauche = (top: number) => Math.min(...mots.filter(r => Math.round(r.top) === top).map(r => r.left))
    return {
      lettrineStyle: lettrine ? getComputedStyle(lettrine).fontStyle : null,
      lignes: lignes.length,
      retrait: lignes.length > 1 ? gauche(lignes[1]) - gauche(lignes[0]) : 0,
      fond: getComputedStyle(carte).backgroundColor,
    }
  })
  expect(mesure.lettrineStyle).toBe('normal')
  expect(mesure.lignes, 'le vers déborde à 390 points').toBeGreaterThan(1)
  expect(mesure.retrait, 'la suite du vers rentre sous son début').toBeGreaterThan(15)
  expect(mesure.fond).not.toBe('rgba(240, 228, 204, 0.25)')
})

test('le poème posé de lui-même, un appui ne remonte plus le feuillet', async ({ page }) => {
  // L'écoute de l'appui qui abrège survivait à la séquence : toucher
  // COUTURES, une fois le poème écrit, « abrégeait » un poème déjà posé, et
  // le feuillet entier se remontait sous le doigt.
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, { structure: 'vers-libre', vers: VERS.slice(0, 3) })

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await expect(sceller(page)).toBeVisible({ timeout: 25_000 })

  const marquer = () => page.evaluate(() => {
    const mot = document.querySelector('#feuillet-fin span[style*="clip-path"]') as (HTMLElement & { __marque?: boolean }) | null
    if (mot) mot.__marque = true
  })
  const intact = () => page.evaluate(() => {
    const mot = document.querySelector('#feuillet-fin span[style*="clip-path"]') as (HTMLElement & { __marque?: boolean }) | null
    return mot?.__marque === true
  })
  await marquer()
  await page.getByRole('button', { name: /^COUTURES$/ }).click()
  await page.waitForTimeout(300)
  expect(await intact(), 'le feuillet n’est pas remonté').toBe(true)
  await expect(page.locator('#feuillet-fin [data-couture]')).toHaveCount(3)
})

test('au recueil, la lettrine reste dans son vers', async ({ page }) => {
  // Deux lignes de haut au corps du recueil, la lettrine débordait sur le
  // vers suivant, que son retrait négatif faisait partir à mi-chemin du
  // flottant : « cave où dorment… » commençait quinze points plus à droite
  // que les autres vers.
  test.setTimeout(60_000)
  await preparer(page)
  await semer(page, { structure: 'atelier', vers: [VERS[1], VERS[2], VERS[4], VERS[6]] })

  await page.goto('/bibliotheque/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await page.waitForTimeout(1200)

  const gauches = await page.evaluate(() => {
    const vers = [...document.querySelectorAll<HTMLElement>('#poeme-detail > div')].slice(1)
    return vers.map(v => {
      const r = document.createRange()
      r.selectNodeContents(v)
      return Math.round(r.getClientRects()[0].left)
    })
  })
  expect(gauches.length).toBe(3)
  expect(new Set(gauches).size, `les vers partent du même bord : ${gauches}`).toBe(1)
})

test('au recueil, une phrase sans titre ne se recopie pas en titre', async ({ page }) => {
  // L'incipit était la première ligne — et une phrase tient sur UNE ligne :
  // « la cire des horloges boit le vin nouveau » en titre, puis, sous
  // « — LE CADAVRE — », exactement le même texte.
  test.setTimeout(60_000)
  await preparer(page)
  await semer(page, { structure: 'phrase-etoffee', vers: ['la cire', 'exquise', 'boira', 'le vin', 'nouveau'] })

  await page.goto('/bibliotheque/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  const titre = page.getByRole('heading', { level: 1 })
  await expect(titre).toBeVisible({ timeout: 8000 })
  const corps = (await page.locator('#poeme-detail').innerText()).replace(/\s+/g, ' ').trim()
  const nom = (await titre.innerText()).replace(/TOUCHER POUR NOMMER/, '').replace(/\s+/g, ' ').trim()
  expect(corps).toContain('cire exquise boira le vin nouveau')
  expect(nom, 'le titre n’est pas le poème entier').not.toContain('le vin nouveau')
  expect(nom).toMatch(/^la cire exquise boira…$|^Sans titre$/)
})

test('au recueil, la lettrine fait une ligne, comme à la fin de partie', async ({ page }) => {
  // Deux lignes de haut au recueil, une à la fin de partie : le même poème
  // avait deux lettrines, et un premier vers court laissait un blanc sous lui.
  test.setTimeout(60_000)
  await preparer(page)
  await semer(page, { structure: 'atelier', vers: [VERS[0], VERS[2], VERS[4], VERS[6]] })

  await page.goto('/bibliotheque/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await page.waitForTimeout(1200)
  const hauteurs = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('#poeme-detail > div')].map(v => v.getBoundingClientRect().height))
  expect(hauteurs.length).toBe(4)
  // « Je marche », vers court qui porte la lettrine, contre « un athanor ».
  expect(hauteurs[0], `vers à lettrine ${hauteurs[0]} contre ${hauteurs[2]}`).toBeLessThan(hauteurs[2] * 1.2)
})

test('le poème se copie une seule fois, et se lit encore d’un tenant', async ({ page }) => {
  // La copie pour le lecteur d'écran était un second nœud de texte : un
  // « tout sélectionner, copier », une recherche dans la page rendaient
  // chaque vers deux fois — « Je marche / J / e marche ».
  test.setTimeout(90_000)
  await preparer(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await semer(page, { structure: 'atelier', vers: VERS.slice(0, 3) })

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await page.getByLabel(/Passer la révélation|Skip the reveal/).click({ timeout: 6000 }).catch(() => {})
  await expect(sceller(page)).toBeVisible({ timeout: 8000 })

  const copie = await page.evaluate(() => {
    const carte = document.querySelector('#feuillet-fin')!
    const sel = getSelection()!
    sel.removeAllRanges()
    const r = document.createRange()
    r.selectNodeContents(carte)
    sel.addRange(r)
    return { selection: sel.toString(), texte: (carte as HTMLElement).innerText }
  })
  for (const t of [copie.selection, copie.texte]) {
    expect(t.split('le plomb chante obliquement dans la cave').length - 1).toBe(1)
    expect(t.split('Je marche').length - 1, 'le premier vers une seule fois').toBeLessThanOrEqual(1)
  }
  const arbre = await page.getByRole('article', { name: 'Le poème' }).ariaSnapshot()
  expect(arbre).toContain('Je marche')
  expect(arbre).toContain('le plomb chante obliquement dans la cave')
})

test.describe('au doigt', () => {
  test.use({ hasTouch: true })

  // Abréger sous la carte, là où « SCELLER AU RECUEIL » va monter. Le bouton
  // naît à l'appui ; si la page le montait avant le relâcher, le clic que le
  // navigateur synthétise après `touchend` le presserait — le joueur se
  // retrouverait au recueil pour avoir voulu lire plus vite.
  test('l’appui qui abrège ne presse pas l’action qui monte sous le doigt', async ({ page }) => {
    test.setTimeout(90_000)
    await preparer(page)
    await semer(page)

    await page.goto('/fin')
    await page.waitForLoadState('domcontentloaded')
    await entrer(page)
    const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
    await rideau.click({ timeout: 6000 })
    await rideau.waitFor({ state: 'detached', timeout: 4000 })
    await expect.poll(async () => (await motsEcrits(page)).ecrits, { timeout: 8000 }).toBeGreaterThan(2)

    const bas = await page.locator('#feuillet-fin').evaluate(e => e.getBoundingClientRect().bottom)
    await page.evaluate(y => window.scrollBy(0, Math.max(0, y - 500)), bas)
    const y = await page.locator('#feuillet-fin').evaluate(e => e.getBoundingClientRect().bottom + 50)

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y }] })
    await page.waitForTimeout(80)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()

    await expect(sceller(page)).toBeVisible({ timeout: 2000 })
    await page.waitForTimeout(600)
    await expect(page).toHaveURL(/\/fin$/)
  })
})
