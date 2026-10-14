import { test, expect, type Page } from '@playwright/test'

/**
 * La Découverte — la première partie — et l'écran de la voix.
 *
 * Relevé avant, le 14 octobre : la voix écrivait deux fragments sur trois et
 * le joueur un seul ; et sous « Le cartographe », l'écran imprimait « elle
 * dépose son fragment ». Le joueur écrit désormais le premier et le
 * dernier, la voix celui du milieu, et le pronom s'accorde au nom affiché.
 */

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function preparer(page: Page, appels: string[]) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route(u => u.hostname.endsWith('supabase.co'), r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/claude', r => {
    appels.push('claude')
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ texte: 'avale' }) })
  })
  await page.route('**/api/acces', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
}

const champ = (page: Page) => page.locator('textarea[aria-label="Ta contribution"]')
const sceller = (page: Page) => page.locator('button[aria-label="Sceller cette voix et passer à la suivante"]')

test('le joueur écrit le premier et le dernier fragment, la voix celui du milieu', async ({ page }) => {
  const appels: string[] = []
  await preparer(page, appels)
  await page.goto('/decouverte')
  await franchir(page)
  await page.getByRole('button', { name: /Écrire le premier mot/ }).click()

  // Premier fragment : le joueur.
  await expect(champ(page)).toBeVisible({ timeout: 8000 })
  await champ(page).fill('la lampe sourde')
  await sceller(page).click()

  // Deuxième : la voix, et une seule fois.
  await expect(page.getByText(/dépose son fragment/)).toBeVisible({ timeout: 10000 })
  const guide = page.getByRole('dialog', { name: /Guide tutoriel/ })
  await expect(guide.getByText('La voix écrit en secret')).toBeVisible()
  await guide.getByRole('button', { name: /Écrire la suite/ }).click()

  // Troisième : le joueur encore — c'est lui qui ferme.
  await expect(champ(page)).toBeVisible({ timeout: 8000 })
  await expect(page.getByRole('dialog', { name: /Guide tutoriel/ }).getByText('Le dernier fragment')).toBeVisible()
  await champ(page).fill('sous la pluie')
  await sceller(page).click()

  await expect(page).toHaveURL(/\/fin/, { timeout: 10000 })
  expect(appels, 'une seule case pour la voix').toHaveLength(1)
})

/**
 * Une partie ouverte au tour de la voix, avec la voix qu'on choisit : le
 * tirage est aléatoire, le brouillon le fixe. `muette` : la voix ne répond
 * jamais, l'écran reste sur l'attente.
 */
async function tourDeLaVoix(page: Page, voix: string, langue: 'fr' | 'en', muette = false) {
  await page.addInitScript(([v, l]) => {
    localStorage.setItem('langue', l)
    localStorage.setItem('brouillon-actuel', JSON.stringify({
      poemeId: `essai-${v}-${l}`,
      config: { structureId: 'phrase-simple', visibilite: 'aveugle', premierJoueur: 'humain', mode: 'standard', joueursHumains: 1, voixIA: 1 },
      cases: [{ id: 'c0', auteur: 'humain', texte: 'la lampe sourde', joueurNumero: 1 }],
      caseIndex: 1,
      voixParSlot: { 1: v },
      total: 3,
    }))
  }, [voix, langue])
  if (muette) await page.route('**/api/claude', () => {})
  await page.goto('/jeu')
  await franchir(page)
}

test('la cartographe : on ne LA dérange pas, et elle dépose son fragment', async ({ page }) => {
  await preparer(page, [])
  await tourDeLaVoix(page, 'cartographe', 'fr', true)
  await expect(page.getByText('La cartographe', { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.getByText('— NE PAS LA DÉRANGER —')).toBeVisible()
})

test('le fossoyeur se dit au masculin, de l’attente au dépôt', async ({ page }) => {
  await preparer(page, [])
  await tourDeLaVoix(page, 'fossoyeur', 'fr')
  await expect(page.getByText('Le fossoyeur', { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(/il dépose son fragment/)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(/elle dépose/)).toHaveCount(0)
})

test('en anglais, « she lays down her fragment » sous la cartographe', async ({ page }) => {
  await preparer(page, [])
  await tourDeLaVoix(page, 'cartographe', 'en')
  await expect(page.getByText('The cartographer', { exact: true })).toBeVisible({ timeout: 8000 })
  await expect(page.getByText(/she lays down her fragment/)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('— HER WORDS REMAIN SEALED —')).toBeVisible()
})
