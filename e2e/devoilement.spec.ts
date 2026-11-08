import { test, expect, type Page } from '@playwright/test'

/**
 * Le dévoilement du poème — le dépli et l'encre.
 *
 * Trois promesses, et elles se vérifient à l'écran : le poème entier finit par
 * être là, un appui le pose d'un coup, et `prefers-reduced-motion` supprime la
 * séquence au lieu de la jouer plus vite.
 *
 * Et deux de plus depuis le 8 novembre, la feuille de papier validée par
 * l'auteur : le mot est DÉJÀ sur son volet quand celui-ci se déplie, et la
 * feuille s'allonge d'un volet à chaque pli pendant que ses tranches s'en vont.
 */

const VERS = [
  'Je marche',
  'la paille ronge un rochet',
  'il reste du givre sur la vitre du couloir',
  'Parfaitement inutile',
  'le tablier sèche mal contre la porte du fond',
  'un athanor',
  'elle pousse la lampe et le drap se froisse encore',
  'sans nom',
]

/**
 * L'écran d'entrée intercepte les clics tant qu'on ne l'a pas franchi — il
 * attend un geste pour pouvoir démarrer le son. On attend qu'il ait vraiment
 * quitté le DOM : le cliquer ne suffit pas, il s'en va en fondu.
 */
async function entrer(page: Page) {
  const splash = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await splash.click({ timeout: 4000 }).catch(() => {})
  await splash.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

/** Passe le rideau d'assemblage, qu'il faille l'écarter ou qu'il soit déjà parti. */
async function passerLeRideau(page: Page) {
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await rideau.click({ timeout: 4000 }).catch(() => {})
  await rideau.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {})
}

/**
 * Sème un poème d'atelier dans IndexedDB.
 *
 * On écrit dans la base directement : l'aperçu sert le bundle construit, les
 * modules du dépôt n'y sont pas importables.
 */
async function semer(page: Page, n: number) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await entrer(page)
  await page.waitForTimeout(600)
  await page.evaluate(async ({ nn, vers }) => {
    const poeme = {
      id: 'devoilement', titre: null, structureId: 'atelier',
      mode: 'standard', visibilite: 'aveugle',
      cases: Array.from({ length: nn }, (_, i) => ({
        numero: i + 1, texte: vers[i % vers.length],
        auteur: 'ia', fonction: `vers ${i + 1}`, ts: Date.now(),
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
  }, { nn: n, vers: VERS })
}

/** Chaque volet de la feuille : pas encore parti, en train de se coucher, ou à plat. */
async function volets(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-volet-papier]')].map(v => {
    const cs = getComputedStyle(v)
    if (parseFloat(cs.opacity) < 0.05) return 'ferme'
    return cs.transform === 'none' ? 'plat' : 'mouvement'
  }))
}

async function preparer(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
}

test('le poème entier finit par être écrit, et le rideau se saute', async ({ page }) => {
  test.setTimeout(90_000)
  const erreurs: string[] = []
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text())
  })
  page.on('pageerror', e => erreurs.push(String(e)))

  await preparer(page)
  await semer(page, 24)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)

  // ── L'assemblage se saute d'un appui ──
  const rideau = page.getByLabel(/Passer la révélation|Skip the reveal/)
  await expect(rideau).toBeVisible({ timeout: 5000 })
  await rideau.click()
  await expect(rideau).toBeHidden({ timeout: 4000 })

  // ── Le poème s'écrit, puis il est là en entier ──
  const carte = page.locator('.page-carnet')
  await expect.poll(async () => {
    const v = await volets(page)
    return v.length > 0 && v.every(e => e === 'plat')
  }, { timeout: 12_000 }).toBe(true)
  const texte = await carte.innerText()
  for (const v of VERS.slice(1)) expect(texte).toContain(v)
  // La lettrine a bien pris la première lettre du premier vers.
  expect(texte).toContain('e marche')

  expect(erreurs).toEqual([])
})

test('un appui pose le poème sans attendre la fin de la séquence', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, 37)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  // Le dernier volet ne s'ouvre pas avant plusieurs secondes ; un appui
  // immédiat doit tout poser bien avant.
  await page.waitForTimeout(400)
  await page.mouse.click(195, 300)
  await page.waitForTimeout(350)

  const dernier = page.locator('.page-carnet').getByText('sans nom').last()
  await expect(dernier).toBeVisible()
  const clip = await dernier.evaluate(el => {
    const mots = el.querySelectorAll('span')
    return Array.from(mots).map(m => getComputedStyle(m).clipPath)
  })
  // Plus aucun masque : tous les mots sont découverts.
  for (const c of clip) expect(c === 'none' || /inset\(0px\)|0%/.test(c)).toBeTruthy()
})

test('mouvement réduit : le poème est posé sans séquence', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await preparer(page)
  await semer(page, 24)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  // Aucune attente au-delà du rendu : tout doit déjà être lisible.
  await page.waitForTimeout(250)
  const texte = await page.locator('.page-carnet').innerText()
  for (const v of VERS.slice(1)) expect(texte).toContain(v)
})

test('le mot est déjà sur son volet : il arrive avec le pli, pas après', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, 5)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  // Saisir un volet EN TRAIN de se coucher — pas le premier, déjà parti au
  // lever du rideau — et regarder son vers à cet instant. Le relevé se fait
  // DANS la page, à chaque image : depuis Node, sous charge, l'échantillonnage
  // pouvait manquer tout le dépli.
  const vu = await page.evaluate(() => new Promise<null | { mots: Record<string, unknown>[] }>(ok => {
    const fin = performance.now() + 10_000
    const regarder = () => {
      const v = [...document.querySelectorAll<HTMLElement>('[data-volet-papier]')].slice(1).find(el => {
        const cs = getComputedStyle(el)
        // Déjà visiblement descendu : de champ, un volet ne fait qu'un ou
        // deux pixels de haut.
        return parseFloat(cs.opacity) > 0.95 && cs.transform !== 'none' && el.getBoundingClientRect().height > 8
      })
      if (v) {
        ok({ mots: [...v.querySelectorAll<HTMLElement>('span[style*="clip-path"]')].map(m => ({
          opacite: parseFloat(getComputedStyle(m).opacity), clip: getComputedStyle(m).clipPath,
          texte: m.textContent, style: m.getAttribute('style'),
        })) })
        return
      }
      if (performance.now() > fin) { ok(null); return }
      requestAnimationFrame(regarder)
    }
    requestAnimationFrame(regarder)
  }))
  expect(vu, 'un volet a été vu en train de se déplier').not.toBeNull()
  expect(vu!.mots.length).toBeGreaterThan(0)
  for (const m of vu!.mots) {
    expect(m.opacite as number, 'le mot est déjà là ' + JSON.stringify(m)).toBeGreaterThan(0.95)
    expect(m.clip === 'none' || /inset\(0px\)|0%/.test(m.clip as string), 'aucun masque d’encre').toBe(true)
  }
})

test('la feuille s’allonge d’un volet à chaque pli, et ses tranches s’en vont', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, 5)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  const releves: { hauteur: number; tranches: number }[] = []
  const debut = Date.now()
  while (Date.now() - debut < 12_000) {
    releves.push(await page.evaluate(() => {
      const f = document.querySelector<HTMLElement>('#feuillet-fin')!
      const t = f.querySelector<HTMLElement>('[data-tranches]')
      return { hauteur: f.getBoundingClientRect().height, tranches: t ? Number(t.dataset.tranches) : 0 }
    }))
    const v = await volets(page)
    if (v.length && v.every(e => e === 'plat')) break
    await page.waitForTimeout(80)
  }
  const premier = releves[0], dernier = releves[releves.length - 1]
  // Elle arrive courte, en paquet, et finit cinq volets plus longue.
  expect(dernier.hauteur - premier.hauteur).toBeGreaterThan(120)
  for (let i = 1; i < releves.length; i++) {
    expect(releves[i].hauteur, `relevé ${i}`).toBeGreaterThanOrEqual(releves[i - 1].hauteur - 1)
    expect(releves[i].tranches, `relevé ${i}`).toBeLessThanOrEqual(releves[i - 1].tranches)
  }
  // Des tranches au départ, aucune quand tout est ouvert.
  expect(premier.tranches).toBeGreaterThan(0)
  expect(dernier.tranches).toBe(0)
})
