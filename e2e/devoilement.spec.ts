import { test, expect, type Page } from '@playwright/test'

/**
 * Le dévoilement du poème — le dépli et l'encre.
 *
 * Trois promesses, et elles se vérifient à l'écran : le poème entier finit par
 * être là, un appui le pose d'un coup, et `prefers-reduced-motion` supprime la
 * séquence au lieu de la jouer plus vite.
 *
 * Depuis le 8 novembre, la feuille de papier validée par l'auteur : le mot est
 * DÉJÀ sur son volet quand celui-ci se déplie.
 *
 * Depuis le 11 novembre, la feuille PLIÉE (`FeuillePliee`, maquette validée) :
 * elle arrive fermée, rien n'en est lisible ; on la déplie au doigt, pli par
 * pli — un pli à peine tiré se referme, un pli tiré franchement découvre sa
 * bande — ou d'un toucher. Si personne n'y touche, elle s'ouvre d'elle-même.
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

test('le mot est déjà sur sa bande : il est là quand le pli la découvre', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, 5)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)

  // Un toucher sur le paquet : les plis tombent l'un après l'autre. On saisit,
  // DANS la page, une bande à l'instant où elle vient d'être découverte — la
  // suivante encore pliée — et on regarde ses mots.
  const vu = page.evaluate(() => new Promise<null | { mots: { opacite: number; clip: string }[] }>(ok => {
    const fin = performance.now() + 12_000
    const regarder = () => {
      const b = [...document.querySelectorAll<HTMLElement>('[data-volet-papier]')]
      const i = b.findIndex((el, j) => j > 0 && parseFloat(getComputedStyle(el).opacity) > 0.95
        && b[j + 1] && parseFloat(getComputedStyle(b[j + 1]).opacity) < 0.05)
      if (i > 0) {
        ok({ mots: [...b[i].querySelectorAll<HTMLElement>('span[style*="clip-path"]')].map(m => ({
          opacite: parseFloat(getComputedStyle(m).opacity), clip: getComputedStyle(m).clipPath,
        })) })
        return
      }
      if (performance.now() > fin) { ok(null); return }
      requestAnimationFrame(regarder)
    }
    requestAnimationFrame(regarder)
  }))
  const feuille = await page.locator('#feuillet-fin').boundingBox()
  await page.mouse.click(feuille!.x + feuille!.width / 2, feuille!.y + 30)
  const releve = await vu
  expect(releve, 'une bande a été vue juste découverte').not.toBeNull()
  expect(releve!.mots.length).toBeGreaterThan(0)
  for (const m of releve!.mots) {
    expect(m.opacite, 'le mot est déjà là').toBeGreaterThan(0.95)
    expect(m.clip === 'none' || /inset\(0px\)|0%/.test(m.clip), 'aucun masque d’encre').toBe(true)
  }
})

test('la feuille arrive fermée, et le doigt la déplie pli par pli', async ({ page }) => {
  test.setTimeout(90_000)
  await preparer(page)
  await semer(page, 5)

  await page.goto('/fin')
  await page.waitForLoadState('domcontentloaded')
  await entrer(page)
  await passerLeRideau(page)
  await page.waitForTimeout(400)

  const ouvertes = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-volet-papier]')]
    .filter(el => parseFloat(getComputedStyle(el).opacity) > 0.95).length)
  // Fermée : la première bande seulement, et le paquet couché dessus — le dos
  // du papier la couvre entière. (Le rabat laisse passer le doigt : c'est la
  // feuille dessous qui reçoit le geste ; on compare donc les places.)
  expect(await ouvertes()).toBe(1)
  const feuille = (await page.locator('#feuillet-fin').boundingBox())!
  const x = feuille.x + feuille.width / 2, y = feuille.y + 30
  const couvre = await page.evaluate(() => {
    const bande = document.querySelector<HTMLElement>('[data-volet-papier="0"]')!.getBoundingClientRect()
    const l = [...document.querySelectorAll<HTMLElement>('#feuillet-fin [style*="preserve-3d"]')].map(e => e.getBoundingClientRect())
    if (l.length === 0) return false
    const haut = Math.min(...l.map(r => r.top)), bas = Math.max(...l.map(r => r.bottom))
    const gauche = Math.min(...l.map(r => r.left)), droite = Math.max(...l.map(r => r.right))
    return haut <= bande.top + 2 && bas >= bande.bottom - 2 && gauche <= bande.left + 2 && droite >= bande.right - 2
  })
  expect(couvre, 'le paquet couvre la première bande').toBe(true)
  await expect(page.getByText(/^TIRER POUR DÉPLIER|— TIRER POUR DÉPLIER —/)).toBeVisible()

  const tirer = async (distance: number) => {
    await page.mouse.move(x, y); await page.mouse.down()
    for (let i = 1; i <= 12; i++) { await page.mouse.move(x, y + distance * i / 12); await page.waitForTimeout(30) }
    await page.waitForTimeout(150)
    await page.mouse.up()
    await page.waitForTimeout(1600)
  }
  // Tiré à peine, lâché doucement : le pli se referme.
  await tirer(20)
  expect(await ouvertes(), 'le pli s’est refermé').toBe(1)
  // Tiré franchement : il passe la verticale, tombe, et découvre la bande suivante.
  await tirer(110)
  expect(await ouvertes(), 'un pli de plus').toBe(2)
  // Un toucher : tout le reste se déplie, puis les actions arrivent.
  await page.mouse.click(x, y + 10)
  await expect(page.getByRole('button', { name: /Sceller au recueil/i })).toBeVisible({ timeout: 12_000 })
  expect(await ouvertes()).toBe(5)
  // Ouverte, la feuille n'a plus de paquet par-dessus.
  expect(await page.evaluate(() => document.querySelectorAll('#feuillet-fin [style*="preserve-3d"]').length)).toBe(0)
})
