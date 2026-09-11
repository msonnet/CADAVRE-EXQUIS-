import { test, expect, type Page } from '@playwright/test'

/**
 * Les polices tiennent sans réseau — lot 4 de l'audit du 10 septembre.
 *
 * Pendant l'audit, le chargement depuis `fonts.googleapis.com` a échoué et
 * `document.fonts` est resté VIDE : l'application est tombée en police
 * système, et toute l'identité visuelle avec. Sur une PWA installable, c'est
 * l'état normal du jeu dans un train.
 *
 * Les quatre familles sont désormais servies depuis `/fonts`. Ce test coupe
 * tout ce qui n'est pas l'origine du site et vérifie qu'elles s'affichent
 * quand même.
 */

const FAMILLES = ['Playfair Display', 'Bodoni Moda', 'Raleway']

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

test('aucune requête ne part vers un tiers', async ({ page }) => {
  test.setTimeout(60_000)
  const tiers: string[] = []
  page.on('request', r => {
    const u = new URL(r.url())
    if (u.hostname !== 'localhost' && u.protocol !== 'data:') tiers.push(u.hostname)
  })
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(1200)

  expect([...new Set(tiers)].filter(h => /google|gstatic/.test(h)), 'appels à Google').toEqual([])
})

test('hors réseau, Playfair et Bodoni s’affichent quand même', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))

  // Mode avion : tout ce qui sort de l'origine est coupé net. C'est plus
  // sévère que le vrai hors-ligne, où le service worker répondrait aussi.
  await page.route('**/*', route => {
    const u = new URL(route.request().url())
    return u.hostname === 'localhost' ? route.continue() : route.abort()
  })

  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await franchir(page)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)

  const chargees = await page.evaluate(() => {
    const vues: string[] = []
    document.fonts.forEach(f => { if (f.status === 'loaded') vues.push(f.family.replace(/["']/g, '')) })
    return [...new Set(vues)]
  })
  for (const f of FAMILLES) expect(chargees, `${f} chargée`).toContain(f)

  // Et le navigateur sait vraiment les rendre — pas seulement les déclarer.
  for (const f of FAMILLES) {
    expect(await page.evaluate(n => document.fonts.check(`16px "${n}"`), f), `${f} utilisable`).toBe(true)
  }
})

test('le texte est réellement composé en Bodoni, pas en repli', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/*', route => {
    const u = new URL(route.request().url())
    return u.hostname === 'localhost' ? route.continue() : route.abort()
  })
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => document.fonts.ready)

  // On MESURE au lieu de lire la déclaration : `getComputedStyle` rend la
  // famille demandée, qu'elle soit chargée ou non — un test là-dessus
  // passerait même avec la police système, ce qui est précisément le défaut
  // qu'on prétend garder.
  const { avec, sans } = await page.evaluate(async () => {
    // On DEMANDE la fonte avant de mesurer. `document.fonts.ready` ne
    // garantit rien ici : il se résout dès qu'il n'y a plus de chargement en
    // cours, or tant qu'aucun texte de la page n'a réclamé Bodoni, il n'y en
    // a aucun. Mesurer à ce moment-là compare deux replis identiques et rend
    // zéro — ce test échouait ainsi une fois sur quatre.
    await document.fonts.load('64px "Bodoni Moda"')
    const mesurer = (famille: string) => {
      const n = document.createElement('span')
      n.textContent = 'Le cadavre est exquis'
      n.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-size:64px;font-family:${famille}`
      document.body.appendChild(n)
      const l = n.getBoundingClientRect().width
      n.remove()
      return l
    }
    return { avec: mesurer("'Bodoni Moda', serif"), sans: mesurer('serif') }
  })
  expect(avec, 'largeur en Bodoni').toBeGreaterThan(0)
  expect(Math.abs(avec - sans), 'Bodoni doit composer autrement que le serif système').toBeGreaterThan(4)
})
