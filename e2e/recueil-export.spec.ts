import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * Emporter le recueil, et le remettre — lot 20 de l'audit.
 *
 * Les poèmes ne quittent jamais l'appareil : `sauvegarderPoeme` écrit dans
 * Dexie et rien ne les envoie ailleurs. Vider le navigateur, changer de
 * téléphone ou réinstaller la PWA les efface tous, et il n'existe nulle part
 * une seule copie.
 *
 * Ce test fait l'aller-retour en entier : on emporte, on EFFACE, on remet.
 * Vérifier l'export seul ne prouverait rien — un fichier qu'on ne sait pas
 * relire n'est pas une sauvegarde, c'est un souvenir.
 */

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

const POEMES = [
  { id: 'p1', vers: ['le vernis craque sous la lampe'] },
  { id: 'p2', vers: ['il pleut des clous sur le toit'] },
]

async function semer(page: Page) {
  await page.evaluate(async (ps) => {
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction(['poemes', 'recolte'], 'readwrite')
      const st = tx.objectStore('poemes')
      st.clear()
      ps.forEach((p, i) => st.put({
        id: p.id, titre: null, structureId: 'vers-libre', mode: 'standard', visibilite: 'aveugle',
        cases: p.vers.map((texte, k) => ({ numero: k + 1, texte, auteur: 'humain', fonction: 'vers', ts: 1 })),
        dateCreation: Date.now() - i * 1000, dateModification: Date.now(),
      }))
      const rc = tx.objectStore('recolte')
      rc.clear()
      rc.put({ id: 'r1', texte: 'la paille ronge un rochet', ordre: 1, dateRecolte: Date.now() })
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  }, POEMES)
}

async function ouvrirLeRecueil(page: Page) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.waitForTimeout(800)
}

test('le recueil s’emporte, en lisible et en sauvegarde', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await ouvrirLeRecueil(page)
  await semer(page)
  await ouvrirLeRecueil(page)

  // La phrase honnête est là : on doit l'avoir su AVANT de changer de téléphone.
  await expect(page.getByText(/ne vit que sur cet appareil|lives only on this device/)).toBeVisible()

  const lisible = page.waitForEvent('download')
  await page.getByRole('button', { name: /À LIRE|READABLE/ }).click()
  const txt = await lisible
  const contenu = readFileSync(await txt.path(), 'utf8')
  expect(contenu, 'les poèmes sont dedans').toContain('le vernis craque sous la lampe')
  expect(contenu, 'le carnet aussi').toContain('la paille ronge un rochet')
  expect(txt.suggestedFilename()).toMatch(/\.txt$/)

  const sauvegarde = page.waitForEvent('download')
  await page.getByRole('button', { name: /SAUVEGARDE|BACKUP/ }).click()
  expect((await sauvegarde).suggestedFilename()).toMatch(/\.json$/)
})

test('une bibliothèque effacée se remet à partir du fichier', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await ouvrirLeRecueil(page)
  await semer(page)
  await ouvrirLeRecueil(page)
  await expect(page.getByText('le vernis craque sous la lampe')).toBeVisible()

  const attendu = page.waitForEvent('download')
  await page.getByRole('button', { name: /SAUVEGARDE|BACKUP/ }).click()
  const chemin = await (await attendu).path()

  // ── On efface tout, comme le ferait un navigateur vidé ──
  await page.evaluate(async () => {
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction(['poemes', 'recolte'], 'readwrite')
      tx.objectStore('poemes').clear()
      tx.objectStore('recolte').clear()
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  })
  await ouvrirLeRecueil(page)
  await expect(page.getByText('le vernis craque sous la lampe')).toHaveCount(0)

  // ── On remet ──
  await page.setInputFiles('input[type="file"]', chemin)
  await expect(page.getByText(/poèmes? remis|poems? restored/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('le vernis craque sous la lampe')).toBeVisible({ timeout: 10_000 })

  // Et le carnet est revenu lui aussi.
  await page.goto('/recolte')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await expect(page.getByText('la paille ronge un rochet')).toBeVisible({ timeout: 10_000 })
})

test('un fichier qui n’est pas une sauvegarde est refusé, sans rien casser', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => localStorage.setItem('cadavre-onboarding-done', '1'))
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))

  await ouvrirLeRecueil(page)
  await semer(page)
  await ouvrirLeRecueil(page)

  await page.setInputFiles('input[type="file"]', {
    name: 'pas-une-sauvegarde.json',
    mimeType: 'application/json',
    buffer: Buffer.from('ceci n’est pas du JSON'),
  })
  await expect(page.getByText(/n’est pas une sauvegarde|not a backup/)).toBeVisible({ timeout: 8000 })
  // La bibliothèque est intacte.
  await expect(page.getByText('le vernis craque sous la lampe')).toBeVisible()
})
