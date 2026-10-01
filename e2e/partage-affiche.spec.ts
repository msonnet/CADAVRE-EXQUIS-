import { test, expect, type Page } from '@playwright/test'

/**
 * L'affiche et la vidéo de partage, générées pour de vrai dans Chromium —
 * et ce que la feuille de partage emporte avec elles.
 *
 * Mesuré avant correction :
 * - l'invitation de l'affiche illustrée tracée à 1888, sur l'adresse à
 *   1882 ; la marque « CADAVRE EXQUIS » posée sur l'illustration ;
 * - l'en-tête à 192 et la marque dans 1770–1882 : sous l'interface d'une
 *   story Instagram, qui couvre environ 250 px en haut et en bas ;
 * - la vidéo calculait l'invitation sans jamais la dessiner ;
 * - la feuille ne recevait qu'un fichier et un titre, aucun lien.
 *
 * On relève chaque `fillText` sur le canevas 1080 × 1920 avec sa boîte
 * d'encre réelle (`actualBoundingBox*`), et chaque image posée : la
 * géométrie se vérifie sur ce que le navigateur a vraiment tracé.
 */

interface Trace { c: number; frame: number; texte: string; alpha: number; x0: number; y0: number; x1: number; y1: number }
interface Image { c: number; x0: number; y0: number; x1: number; y1: number }

const HAUT_SUR = 250
const BAS_SUR = 1920 - 250

async function franchir(page: Page) {
  const s = page.getByLabel(/Entrer dans le jeu|Enter the game/)
  await s.click({ timeout: 4000 }).catch(() => {})
  await s.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
}

async function preparer(page: Page, langue: 'fr' | 'en', sansVideo: boolean) {
  await page.addInitScript(({ langue, sansVideo }) => {
    localStorage.setItem('cadavre-onboarding-done', '1')
    localStorage.setItem('langue', langue)
    const w = window as unknown as Record<string, unknown>
    if (sansVideo) w.MediaRecorder = undefined
    const traces: unknown[] = []
    const images: unknown[] = []
    w.__traces = traces
    w.__images = images
    let frame = 0
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = cb => raf(t => { frame++; cb(t) })
    const ids = new WeakMap<HTMLCanvasElement, number>()
    let n = 0
    const idDe = (c: HTMLCanvasElement) => { if (!ids.has(c)) ids.set(c, ++n); return ids.get(c)! }
    const story = (c: HTMLCanvasElement) => c.width === 1080 && c.height === 1920
    const boite = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
      const m = ctx.getTransform()
      const p = (x: number, y: number) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
      const [ax, ay] = p(x0, y0), [bx, by] = p(x1, y1)
      return { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) }
    }
    const fillText = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (texte: string, x: number, y: number, max?: number) {
      if (story(this.canvas) && String(texte).trim()) {
        const t = this.measureText(texte)
        traces.push({
          c: idDe(this.canvas), frame, texte: String(texte), alpha: this.globalAlpha,
          ...boite(this, x - t.actualBoundingBoxLeft, y - t.actualBoundingBoxAscent, x + t.actualBoundingBoxRight, y + t.actualBoundingBoxDescent),
        })
      }
      return max === undefined ? fillText.call(this, texte, x, y) : fillText.call(this, texte, x, y, max)
    }
    const drawImage = CanvasRenderingContext2D.prototype.drawImage as (...a: unknown[]) => void
    CanvasRenderingContext2D.prototype.drawImage = function (...a: unknown[]) {
      if (story(this.canvas) && a[0] instanceof HTMLImageElement && a.length === 5) {
        const [, x, y, w, h] = a as number[]
        images.push({ c: idDe(this.canvas), ...boite(this, x, y, x + w, y + h) })
      }
      return drawImage.apply(this, a)
    } as typeof CanvasRenderingContext2D.prototype.drawImage
    // La feuille de partage : on relève ce qu'elle aurait reçu.
    const nav = navigator as unknown as Record<string, unknown>
    nav.canShare = () => true
    nav.share = async (d: ShareData) => {
      w.__partage = { title: d.title, text: d.text, fichiers: (d.files ?? []).map(f => f.name) }
    }
  }, { langue, sansVideo })
  await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
}

async function semerEtPartager(page: Page, p: { titre: string | null; vers: string[]; illustre: boolean }) {
  await page.goto('/bibliotheque')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.evaluate(async ({ titre, vers, illustre }) => {
    let url: string | undefined
    if (illustre) {
      // Une illustration 3:4, le format des images du jeu.
      const cv = document.createElement('canvas')
      cv.width = 768; cv.height = 1024
      const x = cv.getContext('2d')!
      x.fillStyle = '#2a3550'; x.fillRect(0, 0, 768, 1024)
      x.fillStyle = '#d9a441'
      for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(120 + (i % 3) * 260, 200 + Math.floor(i / 3) * 300, 60, 0, 7); x.fill() }
      url = cv.toDataURL('image/png')
    }
    const maintenant = Date.now()
    const poeme = {
      id: 'affiche', titre, structureId: 'vers-libre', mode: 'standard', visibilite: 'aveugle',
      cases: vers.map((texte, i) => ({ numero: i + 1, texte, auteur: 'humain', fonction: 'vers', ts: maintenant })),
      illustration: url ? { url, style: 'gravure', promptUtilise: '', dateGeneration: maintenant } : undefined,
      dateCreation: maintenant, dateModification: maintenant,
    }
    const b: IDBDatabase = await new Promise((ok, ko) => {
      const r = indexedDB.open('cadavre-exquis')
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error)
    })
    await new Promise<void>((ok, ko) => {
      const tx = b.transaction('poemes', 'readwrite')
      const st = tx.objectStore('poemes')
      st.clear(); st.put(poeme)
      tx.oncomplete = () => ok(); tx.onerror = () => ko(tx.error)
    })
    b.close()
  }, p)
  await page.goto('/bibliotheque/affiche')
  await page.waitForLoadState('networkidle')
  await franchir(page)
  await page.getByLabel('Partager le poème en vidéo').click()
  await page.waitForFunction(() => !!(window as unknown as { __partage?: unknown }).__partage, null, { timeout: 30_000 })
  return page.evaluate(() => {
    const w = window as unknown as { __traces: Trace[]; __images: Image[]; __partage: { text?: string; fichiers: string[] } }
    return { traces: w.__traces, images: w.__images, partage: w.__partage }
  })
}

/** Les traces de la DERNIÈRE image tracée sur le canevas le plus animé. */
function derniereImage(traces: Trace[]): Trace[] {
  const parCanevas = new Map<number, Set<number>>()
  for (const t of traces) {
    if (!parCanevas.has(t.c)) parCanevas.set(t.c, new Set())
    parCanevas.get(t.c)!.add(t.frame)
  }
  const [c] = [...parCanevas.entries()].sort((a, b) => b[1].size - a[1].size)[0]
  const dernier = Math.max(...traces.filter(t => t.c === c).map(t => t.frame))
  return traces.filter(t => t.c === c && t.frame === dernier && t.alpha > 0.05)
}

function verifierGeometrie(traces: Trace[], cas: string) {
  for (const t of traces) {
    expect(t.y0, `${cas} · « ${t.texte} » passe sous l'interface du haut`).toBeGreaterThanOrEqual(HAUT_SUR)
    expect(t.y1, `${cas} · « ${t.texte} » passe sous le champ de réponse`).toBeLessThanOrEqual(BAS_SUR)
  }
  // Aucune boîte d'encre n'en recouvre une autre (les fantômes d'une même
  // lettre, la bavure, ne comptent pas : c'est le même signe).
  for (let i = 0; i < traces.length; i++) for (let j = i + 1; j < traces.length; j++) {
    const a = traces[i], b = traces[j]
    if (a.texte === b.texte) continue
    const recouvre = a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1
    expect(recouvre, `${cas} · « ${a.texte} » recouvre « ${b.texte} »`).toBe(false)
  }
}

const MOYEN = ['le vernis craquelé avale une lampe sourde', 'sous la paupière du fleuve', 'un horloger compte les noyés']
const LONG = Array.from({ length: 22 }, (_, i) => [
  'le vernis craquelé avale une lampe sourde',
  'sous la paupière du fleuve une cuillère',
  'un horloger compte les noyés à rebours',
  'la baleine infirme écrit au crayon',
][i % 4])

test.describe("l'affiche fixe", () => {
  for (const cas of [
    { nom: 'illustrée, avec titre, en français', langue: 'fr' as const, titre: 'Le vernis', vers: MOYEN, illustre: true, invitation: 'Ajoute ta main au poème du jour.' },
    { nom: 'longue, sans image, en anglais', langue: 'en' as const, titre: null, vers: LONG, illustre: false, invitation: "Add your hand to today's poem." },
  ]) {
    test(cas.nom, async ({ page }) => {
      test.setTimeout(90_000)
      await preparer(page, cas.langue, true)
      const { traces, images, partage } = await semerEtPartager(page, cas)

      expect(partage.fichiers[0]).toMatch(/\.png$/)
      const c = traces[traces.length - 1].c
      const affiche = traces.filter(t => t.c === c && t.alpha > 0.05)
      verifierGeometrie(affiche, cas.nom)
      expect(affiche.map(t => t.texte)).toContain(cas.invitation)

      // L'illustration ne porte aucun texte : ni la marque, ni l'invitation.
      for (const im of images.filter(i => i.c === c)) {
        expect(im.y0).toBeGreaterThanOrEqual(HAUT_SUR)
        expect(im.y1).toBeLessThanOrEqual(BAS_SUR)
        for (const t of affiche) {
          const dessus = t.x0 < im.x1 && im.x0 < t.x1 && t.y0 < im.y1 && im.y0 < t.y1
          expect(dessus, `« ${t.texte} » est imprimé sur l'illustration`).toBe(false)
        }
      }
      if (cas.illustre) expect(images.some(i => i.c === c)).toBe(true)

      // La feuille emporte l'invitation et un lien vers le poème du jour.
      expect(partage.text).toContain(cas.invitation)
      expect(partage.text).toMatch(/https?:\/\/\S+\/poeme-du-jour$/)
    })
  }
})

test.describe('la vidéo', () => {
  for (const cas of [
    { nom: 'sur papier, en anglais', langue: 'en' as const, titre: 'The varnish', vers: MOYEN, illustre: false, invitation: "Add your hand to today's poem." },
    { nom: 'illustrée plein cadre, en français', langue: 'fr' as const, titre: null, vers: LONG, illustre: true, invitation: 'Ajoute ta main au poème du jour.' },
  ]) {
    test(cas.nom, async ({ page }) => {
      test.setTimeout(90_000)
      await preparer(page, cas.langue, false)
      const { traces, partage } = await semerEtPartager(page, cas)

      expect(partage.fichiers[0]).toMatch(/\.(webm|mp4)$/)
      const fin = derniereImage(traces)
      // L'invitation était calculée et jamais dessinée.
      expect(fin.map(t => t.texte)).toContain(cas.invitation)
      verifierGeometrie(fin, cas.nom)
      expect(partage.text).toContain(cas.invitation)
      expect(partage.text).toMatch(/https?:\/\/\S+\/poeme-du-jour$/)
    })
  }
})

test.describe("l'écran d'entrée d'un lien partagé", () => {
  for (const cas of [
    { chemin: '/poeme-du-jour', langue: 'fr', attendu: /^Le poème du jour$/i },
    { chemin: '/salon/KX7Q', langue: 'en', attendu: /^Room KX7Q$/i },
  ]) {
    test(`annonce sa destination : ${cas.chemin}`, async ({ page }) => {
      await page.addInitScript(l => {
        localStorage.setItem('cadavre-onboarding-done', '1')
        localStorage.setItem('langue', l)
      }, cas.langue)
      await page.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
      await page.route('**/api/**', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }))
      const t0 = Date.now()
      await page.goto(cas.chemin)
      const rideau = page.getByLabel(/Entrer dans le jeu|Enter the game/)
      await expect(rideau.locator('[data-destination]')).toHaveText(cas.attendu, { timeout: 3000 })
      // Et il se lève seul, plus tôt que le rideau ordinaire : mesuré 5,3 s
      // après la navigation pour celui-ci, 4,1 s pour celui d'un lien.
      await rideau.waitFor({ state: 'detached', timeout: 6000 })
      expect(Date.now() - t0).toBeLessThan(4700)
    })
  }
})
