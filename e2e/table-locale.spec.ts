import { test, expect, type Page } from '@playwright/test'

/**
 * La table locale — plusieurs mains sur un seul téléphone.
 *
 * Relevé avant : le rideau annonçait « Passe le téléphone à Joueur 2 », les
 * coutures signaient « joueur 1 », « joueur 3 » — et « joueur 1 » même en
 * solo, où il n'y a que toi. Après une partie à trois mains, les préparatifs
 * revenaient à « 1 main, 1 voix » : la table était à recomposer siège par
 * siège, à chaque partie de la soirée.
 */

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function preparer(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 500, body: '{}' }))
}

/**
 * Chaque ligne de pixels d'un lien mène à CE lien.
 *
 * Les liens empilés du bas de la fin de partie mesuraient 20 px à 4 px
 * d'écart : la zone d'appui globale de 44 px (::after) débordait sur le
 * voisin, et la moitié basse de « VOIR AU RECUEIL » menait aux préparatifs.
 * `cibles-tactiles` mesure la taille des zones, pas leurs recouvrements :
 * on demande donc au navigateur qui reçoit l'appui, ligne par ligne.
 */
async function appuisPropres(page: Page, nom: RegExp) {
  const lien = page.getByRole('button', { name: nom })
  await lien.scrollIntoViewIfNeeded()
  const voles = await lien.evaluate(el => {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2
    const fautes: number[] = []
    for (let y = Math.ceil(r.top) + 1; y < r.bottom - 1; y += 1) {
      const cible = document.elementFromPoint(x, y)
      if (!cible || !el.contains(cible)) fautes.push(Math.round(y - r.top))
    }
    return fautes
  })
  expect(voles, `${nom} : lignes dont l'appui part ailleurs`).toEqual([])
}

const champ = (page: Page) => page.locator('textarea[aria-label="Ta contribution"]')

/** Un tour de main à plusieurs : le rideau, le geste, la case. */
async function tourDe(page: Page, nom: string, texte: string) {
  await expect(page.getByText('Passe le téléphone à', { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(nom, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /C'est à moi/ }).click()
  await expect(champ(page)).toBeVisible({ timeout: 8000 })
  await expect(champ(page)).toHaveValue('', { timeout: 4000 })
  await champ(page).fill(texte)
  await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').click()
}

test('les mains portent leur prénom, et la table se retrouve', async ({ page }) => {
  test.setTimeout(120_000)
  await preparer(page)
  await page.goto('/config')
  await page.waitForLoadState('networkidle')
  await franchir(page)

  // Phrase courte : trois fragments, donc Nadja, Léa, Nadja.
  await page.getByRole('radio', { name: /Phrase courte/ }).click()
  // Sièges par défaut : une main, une voix. La voix part, une main arrive.
  await page.getByRole('button', { name: /Voix IA — changer/ }).click()
  await page.getByRole('button', { name: /Ajouter un joueur/ }).first().click()

  await page.getByLabel('Nom de plume de la main 1').fill('Nadja')
  await page.getByLabel('Nom de plume de la main 2').fill('Léa')
  await page.getByRole('button', { name: /Commencer la séance/ }).click()

  await expect(page).toHaveURL(/\/jeu$/)
  await tourDe(page, 'Nadja', 'le vernis craquelé')
  await tourDe(page, 'Léa', 'avale')
  await tourDe(page, 'Nadja', 'une lampe sourde')

  await expect(page).toHaveURL(/\/fin$/, { timeout: 10000 })
  await page.getByRole('button', { name: /^COUTURES$/ }).click()
  const coutures = page.locator('#panneau-coutures')
  // À plusieurs, on devine avant de savoir : les coutures sont voilées, et
  // se dévoilent une à une, dans l'ordre des cases.
  await expect(coutures).not.toContainText('Nadja')
  await expect(coutures).not.toContainText('Léa')
  await coutures.getByRole('button', { name: /fragment 1/ }).click()
  await expect(coutures).toContainText('Nadja')
  await expect(coutures).not.toContainText('Léa')
  // Le focus passe à la couture suivante, pas dans le vide.
  await expect(coutures.getByRole('button', { name: /fragment 2/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(coutures).toContainText('Léa')
  await coutures.getByRole('button', { name: /Tout dévoiler/i }).click()
  await expect(coutures.getByRole('button', { name: /QUI/ })).toHaveCount(0)
  await expect(coutures).not.toContainText(/joueur \d/)

  // Les liens du bas ne se volent pas leurs appuis.
  await appuisPropres(page, /Voir au recueil/i)
  await appuisPropres(page, /Changer de table/i)

  // La même table, d'un seul geste : les mêmes mains, dans le même ordre.
  await page.getByRole('button', { name: /Une autre, à la même table/i }).click()
  await expect(page).toHaveURL(/\/jeu$/)
  await expect(page.getByText('Nadja', { exact: true })).toBeVisible({ timeout: 8000 })

  // Et les préparatifs se souviennent de la dernière table.
  await page.goto('/config')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await expect(page.getByLabel('Nom de plume de la main 1')).toHaveValue('Nadja')
  await expect(page.getByLabel('Nom de plume de la main 2')).toHaveValue('Léa')
  await expect(page.getByText(/2 mains — la séance peut commencer/)).toBeVisible()
})

test('seul, la couture dit « toi » et non « joueur 1 »', async ({ page }) => {
  test.setTimeout(60_000)
  await preparer(page)
  await page.addInitScript(() => sessionStorage.setItem('config-partie', JSON.stringify({
    structureId: 'phrase-simple', visibilite: 'aveugle', premierJoueur: 'humain',
    mode: 'standard', joueursHumains: 1, voixIA: 0,
  })))
  await page.goto('/jeu')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  for (const t of ['le vent froid', 'dévore', 'la nuit épaisse']) {
    await expect(champ(page)).toBeVisible({ timeout: 8000 })
    await expect(champ(page)).toHaveValue('', { timeout: 8000 })
    await champ(page).fill(t)
    await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').dispatchEvent('click')
  }
  await expect(page).toHaveURL(/\/fin$/, { timeout: 10000 })
  await page.getByRole('button', { name: /^COUTURES$/ }).click()
  const coutures = page.locator('#panneau-coutures')
  await expect(coutures).toContainText('toi')
  await expect(coutures).not.toContainText(/joueur 1/)
  await appuisPropres(page, /Une autre, à la même table/i)
  await appuisPropres(page, /Changer de table/i)
})

test('hors ligne, la voix puise dans SA réserve, et le dit', async ({ page, context }) => {
  test.setTimeout(60_000)
  await preparer(page)
  await page.addInitScript(() => sessionStorage.setItem('config-partie', JSON.stringify({
    structureId: 'phrase-simple', visibilite: 'aveugle', premierJoueur: 'humain',
    mode: 'standard', joueursHumains: 1, voixIA: 1,
  })))
  await page.goto('/jeu')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await expect(champ(page)).toBeVisible({ timeout: 8000 })
  // Le train entre dans le tunnel : la case suivante est celle de la voix.
  await context.setOffline(true)
  await champ(page).fill('le vernis craquelé')
  await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').click()
  await expect(page.getByText(/RÉSERVE (DU|DE LA|DE L’|DE L')/)).toBeVisible({ timeout: 8000 })
  await context.setOffline(false)
})

test('la case dit ce qu’elle demande, et le tour de la voix s’entend', async ({ page }) => {
  test.setTimeout(60_000)
  await preparer(page)
  await page.addInitScript(() => sessionStorage.setItem('config-partie', JSON.stringify({
    structureId: 'phrase-etoffee', visibilite: 'aveugle', premierJoueur: 'humain',
    mode: 'standard', joueursHumains: 1, voixIA: 1,
  })))
  await page.goto('/jeu')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await expect(champ(page)).toBeVisible({ timeout: 8000 })

  // La consigne et l'acte sont rattachés au champ.
  const description = await champ(page).evaluate(el => (el.getAttribute('aria-describedby') ?? '')
    .split(/\s+/).filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '').join(' '))
  expect(description).toMatch(/Acte 1 sur 5/)
  expect(description).toMatch(/nom/i)

  // Le tour de la voix s'annonce dans une zone vivante, et l'invite à
  // passer est une vraie commande.
  // La voix tarde : douze secondes au pire en ligne. Pendant ce temps le
  // focus tombait sur BODY — le bouton de continuation n'existe qu'après.
  await page.unroute('**/api/**')
  await page.route('**/api/**', async r => {
    await new Promise(ok => setTimeout(ok, 2500))
    await r.fulfill({ status: 500, body: '{}' }).catch(() => {})
  })
  await champ(page).fill('le cadavre')
  await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').click()
  await expect(page.getByText('— NE PAS LA DÉRANGER —')).toBeVisible({ timeout: 4000 })
  // Le rideau de l'écran précédent a fini de tomber : le focus tient sur
  // le nom de la voix, qui écrit.
  await page.waitForTimeout(800)
  const focus = await page.evaluate(() => {
    const a = document.activeElement
    return !a || a === document.body ? 'BODY' : (a.textContent ?? '').trim()
  })
  expect(focus).not.toBe('BODY')
  expect(focus).not.toMatch(/Sceller/)
  // La voix répond vite quand l'appel échoue : on accepte l'annonce de son
  // écriture comme celle de son dépôt — l'une des deux doit être dite.
  const annonce = page.locator('p.sr-only[aria-live="polite"]')
  await expect(annonce).toContainText(/ écrit\.| a déposé son fragment/, { timeout: 8000 })
  await expect(page.getByRole('button', { name: /TOUCHER POUR CONTINUER/ })).toBeVisible({ timeout: 8000 })
})

test('au dessiné aussi, l’écran de passage appelle la main par son prénom', async ({ page }) => {
  test.setTimeout(60_000)
  await preparer(page)
  await page.goto('/config-dessin')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  // Deux dessinateurs par défaut : on les nomme.
  await page.getByLabel('Nom de plume de la main 1').fill('Nadja')
  await page.getByLabel('Nom de plume de la main 2').fill('Léa')
  await page.getByRole('button', { name: /Commencer le dessin/ }).click()
  await expect(page).toHaveURL(/\/jeu-dessin$/)
  await expect(page.getByText('Nadja', { exact: true })).toBeVisible({ timeout: 8000 })

  // Et l'écran de fin dit qui a dessiné quoi : il ne nommait aucune bande.
  // Les bandes restent blanches — on ne mesure que les noms.
  for (let i = 0; i < 6; i++) {
    if (/\/fin-dessin$/.test(page.url())) break
    await page.getByText('TOUCHER POUR COMMENCER').last().click({ timeout: 6000 }).catch(() => {})
    // Le geste d'un joueur pressé : il pose le crayon pendant que le rideau
    // s'efface encore. Ce second appui relevait le rideau une seconde fois.
    await page.mouse.click(195, 420)
    await page.getByRole('button', { name: /VALIDER →|RÉVÉLER →/ }).click({ timeout: 6000 }).catch(() => {})
    await page.waitForTimeout(400)
  }
  await expect(page).toHaveURL(/\/fin-dessin$/, { timeout: 10000 })
  const mains = page.getByRole('list', { name: 'Les mains, bande par bande' })
  await expect(mains).toBeVisible({ timeout: 10000 })
  await expect(mains.getByRole('listitem')).toHaveCount(3)
  await expect(mains.getByRole('listitem').nth(0)).toContainText(/TÊTE.*Nadja/)
  await expect(mains.getByRole('listitem').nth(1)).toContainText('Léa')
  await expect(mains.getByRole('listitem').nth(2)).toContainText('Nadja')
})

test('au recueil aussi, un fragment de réserve dit de quelle voix', async ({ page }) => {
  test.setTimeout(60_000)
  await preparer(page)
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.evaluate(async () => {
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes'); st.clear()
      st.put({
        id: 'r1', titre: null, structureId: 'phrase-simple', mode: 'standard', visibilite: 'aveugle',
        cases: [
          { numero: 1, texte: 'le vernis', auteur: 'humain', joueurNumero: 1, moi: true, fonction: 'sujet', consigne: 'x', ts: 1 },
          { numero: 2, texte: 'longe le méandre', auteur: 'ia', voixSlot: 1, voixNom: 'cartographe', fallback: true, fonction: 'verbe', consigne: 'x', ts: 2 },
          { numero: 3, texte: 'une lampe', auteur: 'humain', joueurNumero: 1, moi: true, fonction: 'complément', consigne: 'x', ts: 3 },
        ],
        dateCreation: Date.now(), dateModification: Date.now(),
      })
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  })
  await page.goto('/bibliotheque/r1?coutures')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await expect(page.getByText('RÉSERVE DU CARTOGRAPHE')).toBeVisible({ timeout: 8000 })
})
