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
  await expect(coutures).toContainText('Nadja')
  await expect(coutures).toContainText('Léa')
  await expect(coutures).not.toContainText(/joueur \d/)

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
  await champ(page).fill('le cadavre')
  await page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]').click()
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
})
