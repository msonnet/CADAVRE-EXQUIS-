import { test, expect, type Page } from '@playwright/test'
import { ESSAI_OFFERT, RATION_HEBDO } from '../src/lib/reserves'

/**
 * L'encrier, expliqué avant le refus et non pendant.
 *
 * Ce que ces tests gardent : qu'un joueur puisse apprendre CE QUI EST
 * COMPTÉ sans avoir à se le faire refuser. La réserve d'essai n'était
 * lisible que dans les Réglages (lot 13, corrigé sous les boutons) ; le
 * dispositif entier — essai, ration, flacon, abonnement — ne l'était nulle
 * part.
 *
 * Et une chose qu'aucun autre test ne peut garder : que les nombres
 * annoncés dans les Règles soient CEUX du code. Écrits en toutes lettres
 * dans la prose, ils promettaient encore cinq illustrations le jour où la
 * réserve est passée à deux.
 */

async function ouvrirAide(page: Page) {
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.goto('/aide')
  await page.waitForLoadState('networkidle')
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /encrier|inkwell/i }).first().click()
  await page.waitForTimeout(700)
}

test('les Règles disent ce qui est compté, et ce qui ne l’est pas', async ({ page }) => {
  await ouvrirAide(page)

  // L'ordre compte : le gratuit d'abord. C'est l'essentiel du jeu.
  await expect(page.getByText(/CE QUI NE COÛTE RIEN/)).toBeVisible()
  await expect(page.getByText(/CE QUI EST COMPTÉ/)).toBeVisible()

  const vu = await page.evaluate(() => document.body.innerText)
  const rien = vu.indexOf('CE QUI NE COÛTE RIEN')
  const compte = vu.indexOf('CE QUI EST COMPTÉ')
  expect(rien, 'le gratuit s’annonce avant le payant').toBeLessThan(compte)
})

test('les quatre réserves y sont, et le flacon avec', async ({ page }) => {
  await ouvrirAide(page)
  // L'apostrophe est DROITE dans la source et typographique ailleurs dans
  // l'app : on accepte les deux plutôt que de figer un caractère qui se
  // corrigera un jour.
  for (const titre of [/L['’]ESSAI, UNE FOIS/, /LA RATION, CHAQUE SEMAINE/, /LE FLACON/, /L['’]ABONNEMENT/]) {
    await expect(page.getByText(titre)).toBeVisible()
  }
})

test('les nombres annoncés sont ceux du code', async ({ page }) => {
  await ouvrirAide(page)
  const vu = await page.evaluate(() => document.body.innerText)

  expect(vu).toContain(
    `${ESSAI_OFFERT.images} illustrations, ${ESSAI_OFFERT.parties} parties avec les voix, ${ESSAI_OFFERT.lectures} lectures`,
  )
  expect(vu).toContain(`${RATION_HEBDO.parties} partie avec les voix te revient chaque semaine`)
})

test('aucun prix n’est cité — le magasin seul les connaît', async ({ page }) => {
  // Un prix écrit en dur vieillit mal et ment à qui vit ailleurs : la devise
  // et le montant viennent du magasin, au moment de l'achat.
  await ouvrirAide(page)
  const vu = await page.evaluate(() => document.body.innerText)
  const section = vu.slice(vu.indexOf('CE QUI NE COÛTE RIEN'))
  expect(section, 'pas de montant dans les Règles').not.toMatch(/\d+[,.]\d{2}\s*[€$£]/)
})

test('la voix de la revue tient — pas d’emoji, pas d’exclamation', async ({ page }) => {
  await ouvrirAide(page)
  const vu = await page.evaluate(() => document.body.innerText)
  const section = vu.slice(vu.indexOf('CE QUI NE COÛTE RIEN'))
  expect(section).not.toMatch(/[!\u{1F300}-\u{1FAFF}]/u)
})
