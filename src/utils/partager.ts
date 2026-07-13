import { garantirContraste } from '../reve/contraste'
export async function partagerImage(
  dataUrl: string,
  nomFichier: string,
  texte?: string,
): Promise<void> {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `${nomFichier}.png`, { type: 'image/png' })
    const shareData: ShareData = { files: [file], title: nomFichier }
    if (texte) shareData.text = texte
    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData)
      return
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return // annulé par l'utilisateur
    /* fall through to download */
  }
  // Fallback : téléchargement + copie du texte si disponible
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${nomFichier}.png`
  a.click()
  if (texte) {
    try { await navigator.clipboard.writeText(texte) } catch { /* ignore */ }
  }
}

export async function partagerTexte(texte: string, titre: string): Promise<void> {
  try {
    if (navigator.share) {
      await navigator.share({ title: titre, text: texte })
      return
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return // annulé par l'utilisateur
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(texte)
  } catch { /* ignore */ }
}

export async function partagerImageDistante(
  imageUrl: string,
  nomFichier: string,
  texte: string,
  titre: string,
): Promise<void> {
  try {
    const resp = await fetch(imageUrl)
    const blob = await resp.blob()
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const file = new File([blob], `${nomFichier}.${ext}`, { type: blob.type })
    const shareData: ShareData = { files: [file], title: titre, text: texte }
    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData)
      return
    }
  } catch { /* fall through to text-only */ }
  await partagerTexte(texte, titre)
}

// Compose vision text below the drawing on a single canvas, then share as one image
export async function partagerDessinAvecTexte(
  imageDataUrl: string,
  texteVision: string,
  nomFichier: string,
  accentColor = '#1d3a8c',
): Promise<void> {
  const compositeUrl = await composerImageAvecTexte(imageDataUrl, texteVision, accentColor)
  await partagerImage(compositeUrl, nomFichier)
}

function composerImageAvecTexte(
  imageDataUrl: string,
  texte: string,
  accent: string,
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const pad = Math.round(img.width * 0.055)
      const fontSize = Math.round(img.width * 0.038)
      const lineH = Math.round(fontSize * 1.55)
      const lines = texte.split('\n').filter(l => l.trim())

      // Measure each line to handle wrapping
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height  // temp, will resize
      const ctx = canvas.getContext('2d')!
      ctx.font = `${fontSize}px Georgia, 'Playfair Display', serif`

      const wrappedLines: string[] = []
      const maxW = img.width - pad * 2
      for (const line of lines) {
        const words = line.split(' ')
        let current = ''
        for (const word of words) {
          const test = current ? `${current} ${word}` : word
          if (ctx.measureText(test).width > maxW && current) {
            wrappedLines.push(current)
            current = word
          } else {
            current = test
          }
        }
        if (current) wrappedLines.push(current)
      }

      const textZoneH = wrappedLines.length * lineH + pad * 2 + pad
      canvas.height = img.height + textZoneH

      // Draw background
      ctx.fillStyle = '#fdf8f2'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the drawing
      ctx.drawImage(img, 0, 0)

      // Separator line
      ctx.strokeStyle = `${accent}44`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(pad, img.height + Math.round(pad * 0.6))
      ctx.lineTo(canvas.width - pad, img.height + Math.round(pad * 0.6))
      ctx.stroke()

      // Small label
      ctx.fillStyle = accent
      ctx.globalAlpha = 0.7
      ctx.font = `${Math.round(fontSize * 0.55)}px monospace`
      ctx.textAlign = 'left'
      ctx.fillText('— VISION —', pad, img.height + Math.round(pad * 0.6) + Math.round(fontSize * 0.7))

      // Vision text
      ctx.globalAlpha = 0.88
      ctx.fillStyle = '#0f0805'
      ctx.font = `${fontSize}px Georgia, 'Playfair Display', serif`
      wrappedLines.forEach((line, i) => {
        ctx.fillText(line, pad, img.height + pad + Math.round(pad * 0.5) + (i + 1) * lineH)
      })

      resolve(canvas.toDataURL('image/png'))
    }
    img.src = imageDataUrl
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Story format (9:16, 1080×1920) generator — affiche partageable
// L'invitation virale par défaut, validée en direction artistique.
// ─────────────────────────────────────────────────────────────────────────────

export const INVITATION_DEFAUT = 'Ajoute ta main au cadavre.'
const LIEN_MARQUE = 'cadavre-exquis-beta.vercel.app'

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6)
  const aa = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')
  return `#${full}${aa}`
}

// Bruit déterministe seedé sur une chaîne — la même partie produit toujours la même affiche
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

function toRomainLocal(n: number): string {
  const map: [number, string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

function deriverNum(seed?: string): string {
  if (!seed) return '—'
  return String((hashSeed(seed) % 999) + 1).padStart(3, '0')
}

// La plume en trois tranches décalées — marque de fabrique du jeu
function drawNibMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, accent: string): void {
  const scale = size / 64
  ctx.save()
  ctx.translate(cx - 32 * scale, cy - 32 * scale)
  ctx.scale(scale, scale)
  const nib = () => {
    ctx.beginPath()
    ctx.moveTo(32, 10)
    ctx.bezierCurveTo(23, 17, 21, 25, 21, 31)
    ctx.bezierCurveTo(21, 40, 26, 47, 32, 54)
    ctx.bezierCurveTo(38, 47, 43, 40, 43, 31)
    ctx.bezierCurveTo(43, 25, 41, 17, 32, 10)
    ctx.closePath()
  }
  ctx.fillStyle = withAlpha(accent, 0.85)
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 64, 27); ctx.clip(); nib(); ctx.fill(); ctx.restore()
  ctx.save(); ctx.beginPath(); ctx.rect(0, 27, 64, 13); ctx.clip(); ctx.translate(4, 0); nib(); ctx.fill(); ctx.restore()
  ctx.save(); ctx.beginPath(); ctx.rect(0, 40, 64, 24); ctx.clip(); nib(); ctx.fill(); ctx.restore()
  ctx.restore()
}

// Filet de pli entre deux fragments de cadavre
function drawFragmentSeparator(ctx: CanvasRenderingContext2D, W: number, y: number, accent: string): void {
  ctx.save()
  ctx.strokeStyle = withAlpha(accent, 0.22)
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(W / 2 - 100, y); ctx.lineTo(W / 2 + 100, y)
  ctx.stroke()
  ctx.restore()
}

// Texte centré dessiné glyphe par glyphe avec une chasse (petites capitales espacées)
function texteEspace(
  ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacingPx: number,
): { left: number; right: number } {
  const chars = [...text]
  const widths = chars.map(c => ctx.measureText(c).width)
  const total = widths.reduce((s, w) => s + w, 0) + spacingPx * (chars.length - 1)
  let x = cx - total / 2
  const left = x
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (let i = 0; i < chars.length; i++) { ctx.fillText(chars[i], x, y); x += widths[i] + spacingPx }
  ctx.textAlign = prevAlign
  return { left, right: x - spacingPx }
}

// Bavure d'encre : fantômes translucides sous le glyphe, puis tracé net
function bavure(ctx: CanvasRenderingContext2D, draw: () => void, sharpAlpha: number) {
  const offsets = [[1.5, 1.5], [-1, 2], [2, -1]]
  ctx.save()
  ctx.globalAlpha = 0.06
  for (const [dx, dy] of offsets) { ctx.save(); ctx.translate(dx, dy); draw(); ctx.restore() }
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = sharpAlpha
  draw()
  ctx.restore()
}

function grainEtVignette(ctx: CanvasRenderingContext2D, W: number, H: number, ink: string) {
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : ink
    ctx.globalAlpha = 0.015 + Math.random() * 0.025
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1)
  }
  ctx.globalAlpha = 1
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, H * 1.05)
  g.addColorStop(0, 'transparent')
  g.addColorStop(1, withAlpha(ink, 0.07))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// Filet tiré « à la main » : segments avec déviation perpendiculaire imperceptible
function traitImparfait(
  ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, phase: number,
) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const n = Math.max(2, Math.round(len / 80))
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len
  ctx.moveTo(x1, y1)
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const dev = Math.sin((i + phase) * 12.9898) * 0.8
    ctx.lineTo(x1 + (x2 - x1) * t + nx * dev, y1 + (y2 - y1) * t + ny * dev)
  }
}

function cadreDouble(ctx: CanvasRenderingContext2D, W: number, H: number, accent: string) {
  for (const [inset, lw, alpha, phase] of [[40, 3, 0.30, 0], [52, 1, 0.55, 7]] as const) {
    ctx.strokeStyle = withAlpha(accent, alpha)
    ctx.lineWidth = lw
    ctx.beginPath()
    traitImparfait(ctx, inset, inset, W - inset, inset, phase)
    traitImparfait(ctx, W - inset, inset, W - inset, H - inset, phase + 1)
    traitImparfait(ctx, W - inset, H - inset, inset, H - inset, phase + 2)
    traitImparfait(ctx, inset, H - inset, inset, inset, phase + 3)
    ctx.stroke()
  }
}

// Filet ornemental court avec un ✦ posé au centre sur fond papier
function filetOrne(ctx: CanvasRenderingContext2D, cx: number, y: number, accent: string, bg: string) {
  ctx.strokeStyle = withAlpha(accent, 0.55)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 110, y); ctx.lineTo(cx + 110, y)
  ctx.stroke()
  ctx.fillStyle = bg
  ctx.fillRect(cx - 22, y - 15, 44, 30)
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = "22px 'Raleway', sans-serif"
  ctx.fillText('✦', cx, y + 1)
  ctx.textBaseline = 'alphabetic'
}

// En-tête commun : ✦ + numéro de séance + année en chiffres romains
function enTete(ctx: CanvasRenderingContext2D, W: number, accent: string, ink: string, date?: number, seed?: string) {
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.font = "32px 'Raleway', sans-serif"
  ctx.fillText('✦', W / 2, 192)
  const parts: string[] = []
  if (seed) parts.push(`N° ${deriverNum(seed)}`)
  if (date) parts.push(toRomainLocal(new Date(date).getFullYear()))
  if (parts.length) {
    ctx.fillStyle = withAlpha(ink, 0.42)
    ctx.font = "24px 'Raleway', sans-serif"
    texteEspace(ctx, parts.join(' · '), W / 2, 248, 24 * 0.35)
  }
}

// Signature de marque (zone F) — l'ancre mémorable, en bas
function marque(ctx: CanvasRenderingContext2D, W: number, accent: string, ink: string) {
  ctx.beginPath()
  ctx.strokeStyle = withAlpha(ink, 0.20)
  ctx.lineWidth = 1
  ctx.moveTo(W / 2 - 60, 1770); ctx.lineTo(W / 2 + 60, 1770)
  ctx.stroke()

  ctx.fillStyle = ink
  ctx.font = "600 30px 'Bodoni Moda', Georgia, serif"
  const { left, right } = texteEspace(ctx, 'CADAVRE EXQUIS', W / 2, 1822, 30 * 0.45)
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.font = "22px 'Raleway', sans-serif"
  ctx.fillText('✦', left - 26, 1820)
  ctx.fillText('✦', right + 26, 1820)

  // Le Pli — plume glitchée, marque de fabrique
  drawNibMark(ctx, W / 2, 1848, 28, accent)

  ctx.fillStyle = withAlpha(ink, 0.45)
  ctx.font = "24px 'Raleway', sans-serif"
  ctx.fillText(LIEN_MARQUE, W / 2, 1882)
}

function invitationLigne(ctx: CanvasRenderingContext2D, W: number, accent: string, y: number, texte: string) {
  ctx.fillStyle = withAlpha(accent, 0.80)
  ctx.textAlign = 'center'
  let size = 32
  ctx.font = `italic ${size}px 'Playfair Display', Georgia, serif`
  if (ctx.measureText(texte).width > W - 192) { size = 28; ctx.font = `italic ${size}px 'Playfair Display', Georgia, serif` }
  ctx.fillText(texte, W / 2, y)
}

async function prechargerPolices() {
  try {
    const fonts = [
      "italic 900 300px 'Bodoni Moda'",
      "800 italic 76px 'Bodoni Moda'",
      "600 30px 'Bodoni Moda'",
      "italic 42px 'Playfair Display'",
      "italic 36px 'Playfair Display'",
      "24px 'Raleway'",
    ]
    const d = document as any
    if (d.fonts?.load) await Promise.all(fonts.map((f: string) => d.fonts.load(f).catch(() => {})))
    if (d.fonts?.ready) await d.fonts.ready
  } catch { /* ignore */ }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? current + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = w
    } else current = test
  }
  if (current) lines.push(current)
  return lines
}

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => {
      // Retry sans CORS uniquement pour les data: URL et le same-origin :
      // une image cross-origin chargée sans CORS « tainte » le canvas et
      // fait échouer toDataURL() plus loin (SecurityError silencieuse).
      const crossOriginHttp = /^https?:/i.test(src) && !src.startsWith(location.origin)
      if (crossOriginHttp) { reject(new Error(`image CORS inaccessible : ${src.slice(0, 80)}`)); return }
      const img2 = new Image()
      img2.onload = () => resolve(img2)
      img2.onerror = reject
      img2.src = src
    }
    img.src = src
  })
}

export async function genererImageStory(opts: {
  type: 'poeme' | 'dessin'
  titre: string
  texte?: string
  imageDataUrl?: string
  accent: string
  bg: string
  ink: string
  date?: number
  invitation?: string
  seed?: string
}): Promise<string> {
  const W = 1080
  const H = 1920
  const MARGE = 96
  const ZONE_W = W - MARGE * 2
  const { accent, ink, bg } = opts
  const invitation = opts.invitation ?? INVITATION_DEFAUT
  const rng = mulberry32(hashSeed(opts.seed ?? opts.titre ?? 'cadavre'))

  await prechargerPolices()

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Fond papier + grain + vignettage + cadre tiré à la main
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  grainEtVignette(ctx, W, H, ink)
  cadreDouble(ctx, W, H, accent)
  enTete(ctx, W, accent, ink, opts.date, opts.seed)

  if (opts.type === 'poeme') {
    const avecImage = !!(opts.imageDataUrl)
    // ── Illustration (pré-chargée) ──
    let illustImg: HTMLImageElement | null = null
    if (avecImage) {
      try { illustImg = await chargerImage(opts.imageDataUrl!) } catch { /* ignore */ }
    }

    // ── Titre (optionnel : sans titre, le poème lui-même est le héros) ──
    const hasTitle = !!opts.titre?.trim()
    if (hasTitle) {
      ctx.fillStyle = ink
      ctx.textAlign = 'center'
      let titleSize = 76
      ctx.font = `800 italic ${titleSize}px 'Bodoni Moda', Georgia, serif`
      let titleLines = wrapText(ctx, opts.titre, ZONE_W)
      if (titleLines.length > 2) {
        titleSize = 64
        ctx.font = `800 italic ${titleSize}px 'Bodoni Moda', Georgia, serif`
        titleLines = wrapText(ctx, opts.titre, ZONE_W).slice(0, 2)
      }
      const titleLineH = titleSize + 12
      const titleTop = 360
      titleLines.forEach((line, i) => ctx.fillText(line, W / 2, titleTop + i * titleLineH))
      const titleBottom = titleTop + (titleLines.length - 1) * titleLineH
      filetOrne(ctx, W / 2, titleBottom + 56, accent, bg)
    }

    // ── Corps du poème ──
    const zoneTop = hasTitle ? 520 : 360, zoneBottom = illustImg ? 820 : 1560
    let bodySize = 50, bodyLineH = 74
    const sourceLines = (opts.texte ?? '').split('\n')

    const doWrapImg = (size: number) => {
      ctx.font = `italic ${size}px 'Playfair Display', Georgia, serif`
      const r: string[] = []
      for (const src of sourceLines) {
        if (!src.trim()) { r.push(''); continue }
        for (const p of wrapText(ctx, src, ZONE_W)) r.push(p)
      }
      return r
    }
    let wrapped = doWrapImg(bodySize)
    if (wrapped.length > 13) { bodySize = 40; bodyLineH = 62; wrapped = doWrapImg(bodySize) }
    if (wrapped.length > 17) { wrapped = wrapped.slice(0, 15); wrapped.push('[…]') }

    // Positions de fin de chaque fragment pour les lignes de pli
    const fragEndsImg: number[] = []
    { let wi = 0
      for (const src of sourceLines) {
        if (wi >= wrapped.length) break
        if (!src.trim()) { wi++; continue }
        const wl = wrapText(ctx, src, ZONE_W)
        fragEndsImg.push(Math.min(wi + wl.length - 1, wrapped.length - 1))
        wi += wl.length
      }
    }

    const lettrineActive = wrapped.length <= 8 && wrapped[0] && wrapped[0] !== '[…]'
    const lettrineSize = 240
    const lettrineVisual = lettrineSize * 0.72
    const gap = 28
    const blockH = wrapped.length * bodyLineH
    const totalH = (lettrineActive ? lettrineVisual + gap : 0) + blockH
    let startY = zoneTop + (zoneBottom - zoneTop - totalH) / 2 - 30
    startY = Math.max(startY, zoneTop - 40)

    let y = startY
    if (lettrineActive) {
      const lettre = wrapped[0].charAt(0).toUpperCase()
      const baseline = y + lettrineVisual
      ctx.font = `900 italic ${lettrineSize}px 'Bodoni Moda', Georgia, serif`
      ctx.fillStyle = accent
      bavure(ctx, () => ctx.fillText(lettre, W / 2, baseline), 0.92)
      // éclaboussures déterministes
      ctx.fillStyle = withAlpha(accent, 0.25)
      for (let i = 0; i < 3; i++) {
        const ang = rng() * Math.PI * 2
        const dist = 30 + rng() * 50
        const r = 2 + rng() * 2
        ctx.beginPath()
        ctx.arc(W / 2 + Math.cos(ang) * dist, baseline - lettrineVisual / 2 + Math.sin(ang) * dist, r, 0, Math.PI * 2)
        ctx.fill()
      }
      y = baseline + gap
    }

    // Vers
    ctx.font = `italic ${bodySize}px 'Playfair Display', Georgia, serif`
    ctx.fillStyle = withAlpha(ink, 0.88)
    ctx.textAlign = 'center'
    const fragEndSetImg = new Set(fragEndsImg)
    wrapped.forEach((line, i) => {
      if (!line) return
      const lineY = y + (i + 1) * bodyLineH
      ctx.fillText(line, W / 2, lineY)
      // Filet de pli entre les fragments (sauf après le dernier)
      if (fragEndSetImg.has(i) && i < wrapped.length - 1 && wrapped[i + 1]) {
        drawFragmentSeparator(ctx, W, lineY + Math.round(bodyLineH / 2), accent)
      }
    })

    // ── Illustration sous le poème ──
    if (illustImg) {
      const imgZoneTop = 880, imgZoneBottom = 1860
      const maxW = ZONE_W, maxH = imgZoneBottom - imgZoneTop - 56
      const ratio = Math.min(maxW / illustImg.width, maxH / illustImg.height)
      const dW = illustImg.width * ratio, dH = illustImg.height * ratio
      const dX = (W - dW) / 2, dY = imgZoneTop + 28 + (maxH - dH) / 2
      filetOrne(ctx, W / 2, imgZoneTop - 40, accent, bg)
      passePartout(ctx, dX, dY, dW, dH, ink)
      ctx.drawImage(illustImg, dX, dY, dW, dH)
    }

    invitationLigne(ctx, W, accent, illustImg ? 1888 : 1660, invitation)
  } else {
    // ── Variante dessin ──
    let readingTop = 1430
    if (opts.imageDataUrl) {
      try {
        const img = await chargerImage(opts.imageDataUrl)
        const r = img.width / img.height
        if (r > 1.6) {
          // Le rouleau : image très horizontale couchée verticalement
          const zoneTop = 300, zoneBottom = 1300
          const maxW = 700, maxH = zoneBottom - zoneTop
          // Après rotation 90°, la largeur de l'image devient la hauteur dessinée
          const ratio = Math.min(maxW / img.height, maxH / img.width)
          const dW = img.height * ratio, dH = img.width * ratio
          const cx = W / 2, cy = zoneTop + (zoneBottom - zoneTop) / 2
          passePartout(ctx, cx - dW / 2, cy - dH / 2, dW, dH, ink)
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(-Math.PI / 2)
          ctx.drawImage(img, -dH / 2, -dW / 2, dH, dW)
          ctx.restore()
          readingTop = 1400
        } else {
          const zoneTop = 300, zoneBottom = r < 0.9 ? 1300 : 1100
          const maxW = r < 0.9 ? 700 : ZONE_W, maxH = zoneBottom - zoneTop
          const ratio = Math.min(maxW / img.width, maxH / img.height)
          const dW = img.width * ratio, dH = img.height * ratio
          const dX = (W - dW) / 2
          const dY = r < 0.9 ? zoneTop + (maxH - dH) / 2 : 540 - dH / 2
          passePartout(ctx, dX, dY, dW, dH, ink)
          ctx.drawImage(img, dX, dY, dW, dH)
          readingTop = r < 0.9 ? 1400 : Math.max(dY + dH + 80, 1180)
        }
      } catch (e) {
        console.error('Failed to load image for story', e)
      }
    }

    // Lecture surréaliste — la notice du spécimen
    if (opts.texte && opts.texte.trim()) {
      filetOrne(ctx, W / 2, readingTop - 50, accent, bg)
      ctx.fillStyle = withAlpha(accent, 0.65)
      ctx.textAlign = 'center'
      ctx.font = "22px 'Raleway', sans-serif"
      texteEspace(ctx, '— LECTURE —', W / 2, readingTop, 22 * 0.3)

      ctx.font = "italic 36px 'Playfair Display', Georgia, serif"
      const lignes = wrapText(ctx, opts.texte.replace(/\n+/g, ' ').trim(), ZONE_W - 60).slice(0, 4)
      ctx.fillStyle = withAlpha(ink, 0.85)
      const lh = 56
      lignes.forEach((line, i) => {
        const txt = (i === 0 ? '« ' : '') + line + (i === lignes.length - 1 ? ' »' : '')
        ctx.fillText(txt, W / 2, readingTop + 56 + i * lh)
      })
    }

    invitationLigne(ctx, W, accent, 1680, invitation)
  }

  marque(ctx, W, accent, ink)
  return canvas.toDataURL('image/png')
}

// Passe-partout de gravure : fond clair débordant + filet + ombre portée
function passePartout(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ink: string) {
  const p = 28
  ctx.save()
  ctx.shadowColor = withAlpha(ink, 0.18)
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 12
  ctx.fillStyle = withAlpha('#ffffff', 0.30)
  ctx.fillRect(x - p, y - p, w + p * 2, h + p * 2)
  ctx.restore()
  ctx.strokeStyle = withAlpha(ink, 0.25)
  ctx.lineWidth = 1.5
  ctx.strokeRect(x - p, y - p, w + p * 2, h + p * 2)
}

export async function telechargerStory(dataUrl: string, nom: string): Promise<void> {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `cadavre-${nom}-story.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// Génère l'affiche 9:16 puis la partage via la feuille native (ou la télécharge en repli).
export async function partagerStory(opts: {
  type: 'poeme' | 'dessin'
  titre: string
  texte?: string
  imageDataUrl?: string
  accent: string
  bg: string
  ink: string
  date?: number
  invitation?: string
  seed?: string
}, nomFichier = 'cadavre-exquis'): Promise<void> {
  const url = await genererImageStory(opts)
  await partagerImage(url, nomFichier)
}

// ─────────────────────────────────────────────────────────────────────────────
// Vidéo verticale animée (le format viral) — révélation filmée + bande-son embarquée
// Dégradation : renvoie null si l'appareil ne sait pas encoder → l'appelant retombe sur l'affiche fixe.
// ─────────────────────────────────────────────────────────────────────────────

function pickVideoMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const cands = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  for (const m of cands) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* ignore */ }
  }
  return null
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

interface LayoutPoeme {
  fragments: { texte: string; x0: number; y0: number; rot: number }[]
  lettrine: { char: string; baselineY: number; size: number } | null
  lignes: { texte: string; y: number }[]
  bodySize: number
  bodyLineH: number
  separatorYs: number[]
  centreY: number
}

// Timing de l'animation poème (partagé entre vidéo et GIF)
const ANIM_FLASH_T = 3640
const ANIM_LIGNE_T = 3700
const ANIM_LIGNE_PAS = 260
const LETT_T = 5080
const LETT_DUR = 340

function layoutPoeme(ctx: CanvasRenderingContext2D, opts: { titre?: string; texte?: string }, W: number, ZONE_W: number, avecImage = false, avecLettrine = true): LayoutPoeme {
  const hasTitle = !!opts.titre?.trim()
  const zoneTop = hasTitle ? 520 : 360, zoneBottom = avecImage ? 820 : 1560
  let bodySize = 50, bodyLineH = 74
  const sourceLines = (opts.texte ?? '').split('\n')

  const doWrap = (size: number) => {
    ctx.font = `italic ${size}px 'Bodoni Moda', Georgia, serif`
    const result: string[] = []
    for (const src of sourceLines) {
      if (!src.trim()) { result.push(''); continue }
      for (const p of wrapText(ctx, src, ZONE_W)) result.push(p)
    }
    return result
  }

  let wrapped = doWrap(bodySize)
  if (wrapped.length > 13) {
    bodySize = 40; bodyLineH = 62
    wrapped = doWrap(bodySize)
  }
  if (wrapped.length > 17) { bodySize = 33; bodyLineH = 50; wrapped = doWrap(bodySize) }
  if (wrapped.length > 24) { bodySize = 28; bodyLineH = 42; wrapped = doWrap(bodySize) }
  if (wrapped.length > 28) { wrapped = wrapped.slice(0, 27); wrapped.push('[…]') }

  // Positions de fin de chaque fragment source dans le tableau wrapped[]
  const fragEndIndices: number[] = []
  {
    let wi = 0
    for (const src of sourceLines) {
      if (wi >= wrapped.length) break
      if (!src.trim()) { wi++; continue }
      const wlines = wrapText(ctx, src, ZONE_W)
      const endIdx = Math.min(wi + wlines.length - 1, wrapped.length - 1)
      fragEndIndices.push(endIdx)
      wi += wlines.length
    }
  }

  const lettrineActive = avecLettrine && wrapped.length <= 8 && !!wrapped[0] && wrapped[0] !== '[…]'
  const lettrineSize = 240
  const lettrineVisual = lettrineSize * 0.72
  const gap = 28
  const blockH = wrapped.length * bodyLineH
  const totalH = (lettrineActive ? lettrineVisual + gap : 0) + blockH
  let startY = zoneTop + (zoneBottom - zoneTop - totalH) / 2 - 30
  startY = Math.max(startY, zoneTop - 40)

  let y = startY
  let lettrine: LayoutPoeme['lettrine'] = null
  if (lettrineActive) {
    const baseline = y + lettrineVisual
    lettrine = { char: wrapped[0].charAt(0).toUpperCase(), baselineY: baseline, size: lettrineSize }
    y = baseline + gap
  }
  const lignes = wrapped.map((texte, i) => ({ texte, y: y + (i + 1) * bodyLineH }))

  // Lignes de pli entre les fragments
  const separatorYs: number[] = []
  for (let fi = 0; fi < fragEndIndices.length - 1; fi++) {
    const endIdx = fragEndIndices[fi]
    const nextIdx = endIdx + 1
    if (nextIdx < lignes.length && lignes[endIdx]?.texte && lignes[nextIdx]?.texte) {
      separatorYs.push(Math.round(lignes[endIdx].y + bodyLineH / 2))
    }
  }

  // Centre réel du bloc de texte — point de convergence de l'animation
  const visiblesLignes = lignes.filter(l => l.texte)
  const centreY = visiblesLignes.length > 0
    ? (visiblesLignes[0].y + visiblesLignes[visiblesLignes.length - 1].y) / 2
    : 960

  // Positions de départ des fragments (cercle autour du centre du poème, hors champ)
  const R = Math.max(W, 1920) * 0.6
  const fragments = sourceLines.filter(l => l.trim()).map((texte, i, arr) => {
    const angle = (i / Math.max(arr.length, 1)) * Math.PI * 2 + (i % 2 ? 0.6 : -0.6)
    return { texte: texte.trim(), x0: W / 2 + Math.cos(angle) * R, y0: centreY + Math.sin(angle) * R, rot: (i % 2 ? 1 : -1) * (3 + (i % 3) * 2) }
  })

  return { fragments, lettrine, lignes, bodySize, bodyLineH, separatorYs, centreY }
}

// Partition de la révélation — un rideau de théâtre qui se lève (la mineur, cohérent avec l'app)
// Partition composée en direction sonore (Fable 5) : nappe qui enfle → battement → éclosion → plume → impact → résonance.
function scoreRevelation(ac: AudioContext, dest: AudioNode, variant: 'poeme' | 'dessin' = 'poeme') {
  const t0 = ac.currentTime
  const filtre = ac.createBiquadFilter()
  filtre.type = 'lowpass'; filtre.frequency.value = 2400
  filtre.connect(dest)
  const note = (freq: number, start: number, dur: number, peak: number) => {
    const o = ac.createOscillator(), g = ac.createGain()
    o.type = 'sine'; o.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t0 + start)
    g.gain.exponentialRampToValueAtTime(peak, t0 + start + Math.min(0.04, dur * 0.2))
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur)
    o.connect(g); g.connect(filtre); o.start(t0 + start); o.stop(t0 + start + dur + 0.05)
  }

  // III. Éclosion — accord la mineur add9 arpégé
  const eclosion = (decal: number) => {
    note(220, decal, 3.2, 0.070); note(261.6, decal + 0.06, 3.0, 0.060)
    note(329.6, decal + 0.12, 2.8, 0.060); note(493.9, decal + 0.20, 2.6, 0.045)
    note(659.3, decal + 0.30, 2.2, 0.030); note(1318.5, decal + 0.41, 0.9, 0.018)
  }

  if (variant === 'dessin') {
    // Trois vagues graves aux départs de bandes
    note(110, 0.80, 1.4, 0.04); note(110, 2.15, 1.4, 0.04); note(110, 3.50, 1.4, 0.04)
    eclosion(4.62)
    note(880, 4.70, 0.06, 0.013); note(987.8, 5.06, 0.06, 0.011)
    note(220, 5.30, 1.2, 0.022)
    return
  }

  // I. La nappe qui enfle
  note(55, 0.40, 3.4, 0.050); note(110, 0.80, 3.0, 0.045); note(110.7, 1.20, 2.6, 0.035)
  note(164.8, 1.90, 2.0, 0.040); note(220, 2.60, 1.1, 0.045)
  // II. Le battement
  note(82.4, 3.42, 0.18, 0.050)
  // III. L'éclosion
  eclosion(3.64)
  // IV. La plume
  note(880, 3.72, 0.06, 0.015); note(987.8, 3.98, 0.06, 0.013); note(880, 4.24, 0.06, 0.012); note(987.8, 4.50, 0.06, 0.011)
  // V. La chute et l'impact de la lettrine
  note(659.3, 4.78, 0.12, 0.020); note(440, 4.90, 0.12, 0.025); note(293.7, 5.00, 0.10, 0.030)
  note(110, 5.08, 1.6, 0.080); note(55, 5.08, 2.0, 0.050); note(1760, 5.08, 0.05, 0.020)
  // VI. La résonance
  note(220, 5.25, 1.3, 0.022)
}

export async function genererVideoStory(opts: {
  type: 'poeme' | 'dessin'
  titre: string
  texte?: string
  imageDataUrl?: string
  accent: string
  bg: string
  ink: string
  date?: number
  invitation?: string
  seed?: string
}, dureeMs = 6000): Promise<Blob | null> {
  const mime = pickVideoMime()
  if (!mime) return null

  await prechargerPolices()
  const W = 1080, H = 1920, MARGE = 96, ZONE_W = W - MARGE * 2
  const { accent, ink, bg } = opts
  const invitation = opts.invitation ?? INVITATION_DEFAUT

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Fond fixe pré-rendu (le grain ne doit pas scintiller d'une frame à l'autre).
  // Quand une image occupe toute la page, les ornements (cadre, en-tête, marque)
  // partent sur un calque séparé dessiné PAR-DESSUS l'image à chaque frame.
  const pleinCadre = !!opts.imageDataUrl
  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = W; bgCanvas.height = H
  const bx = bgCanvas.getContext('2d')!
  bx.fillStyle = bg; bx.fillRect(0, 0, W, H)
  grainEtVignette(bx, W, H, ink)
  let ornCanvas: HTMLCanvasElement | null = null
  if (pleinCadre) {
    ornCanvas = document.createElement('canvas')
    ornCanvas.width = W; ornCanvas.height = H
    const ox = ornCanvas.getContext('2d')!
    // Pour les poèmes illustrés : image bord à bord, sans cadre ni en-tête.
    // La marque est dessinée APRÈS l'échantillonnage de l'image (plus bas),
    // sur un dégradé aux couleurs adaptatives — jamais un bandeau étranger.
    if (opts.type !== 'poeme') {
      cadreDouble(ox, W, H, accent)
      enTete(ox, W, accent, ink, opts.date, opts.seed)
      // la marque est dessinée par frame, en couleurs adaptatives, sur le voile
    }
  } else {
    cadreDouble(bx, W, H, accent)
    enTete(bx, W, accent, ink, opts.date, opts.seed)
    marque(bx, W, accent, ink)
  }

  // Layout du contenu animé
  let poemeLayout: LayoutPoeme | null = null
  let img: HTMLImageElement | null = null
  let imgBox = { x: 0, y: 0, w: 0, h: 0 }
  let poemeIllustImg: HTMLImageElement | null = null
  let illustBox = { x: 0, y: 0, w: 0, h: 0 }
  let overlay: OverlayTexte | null = null
  // Couleurs du texte en surimpression — décidées par l'IMAGE, pas par l'ambiance
  let encreTexte = bg
  let scrimTexte = ink
  if (opts.type === 'poeme') {
    if (opts.imageDataUrl) {
      try { poemeIllustImg = await chargerImage(opts.imageDataUrl) }
      catch { poemeIllustImg = null }
    }
    if (poemeIllustImg) {
      // ── Plein cadre : l'image couvre toute la page, le texte vient en surimpression ──
      const ratio = Math.max(W / poemeIllustImg.width, H / poemeIllustImg.height)
      const dW = poemeIllustImg.width * ratio, dH = poemeIllustImg.height * ratio
      illustBox = { x: (W - dW) / 2, y: (H - dH) / 2, w: dW, h: dH }
      overlay = layoutTexteOverlay(ctx, opts.titre, opts.texte, W, H, ZONE_W)
      // Luminance moyenne de la zone où le texte se posera : encre crème sur
      // image sombre, encre brune sur image claire — plus de loterie d'ambiance.
      try {
        const pw = 108, ph = 192
        const probe = document.createElement('canvas')
        probe.width = pw; probe.height = ph
        const px = probe.getContext('2d')!
        const pr = Math.max(pw / poemeIllustImg.width, ph / poemeIllustImg.height)
        px.drawImage(poemeIllustImg, (pw - poemeIllustImg.width * pr) / 2, (ph - poemeIllustImg.height * pr) / 2, poemeIllustImg.width * pr, poemeIllustImg.height * pr)
        const y0 = Math.max(0, Math.floor(((overlay.titre ? overlay.titreTop : overlay.top) - 60) / H * ph))
        const y1 = Math.min(ph, Math.ceil((overlay.top + overlay.lignes.length * overlay.lineH + 30) / H * ph))
        const d = px.getImageData(0, y0, pw, Math.max(1, y1 - y0)).data
        let lum = 0
        for (let i = 0; i < d.length; i += 4) lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        lum /= (d.length / 4) * 255
        if (lum < 0.52) { encreTexte = '#f4eddc'; scrimTexte = '#100b06' }
        else { encreTexte = '#17100a'; scrimTexte = '#f4eddc' }
      } catch { /* canvas teinté (image sans CORS) : héritage ambiance */ }
      // Marque en bas : dégradé fondu dans l'image (couleur du scrim adaptatif),
      // encre adaptative, accent ramené au contraste — se marie avec toute image
      {
        const ox = ornCanvas!.getContext('2d')!
        ox.clearRect(0, 0, W, H)
        const gs = ox.createLinearGradient(0, H - 540, 0, H)
        gs.addColorStop(0, withAlpha(scrimTexte, 0))
        gs.addColorStop(0.55, withAlpha(scrimTexte, 0.52))
        gs.addColorStop(1, withAlpha(scrimTexte, 0.92))
        ox.fillStyle = gs
        ox.fillRect(0, H - 540, W, 540)
        marque(ox, W, garantirContraste(accent, scrimTexte, 3), encreTexte)
      }
    } else {
      // ── Texte seul : mise en page et animation existantes ──
      if (opts.titre?.trim()) {
        bx.fillStyle = ink; bx.textAlign = 'center'
        bx.font = `800 italic 76px 'Bodoni Moda', Georgia, serif`
        let tl = wrapText(bx, opts.titre, ZONE_W)
        let ts = 76
        if (tl.length > 2) { ts = 64; bx.font = `800 italic 64px 'Bodoni Moda', Georgia, serif`; tl = wrapText(bx, opts.titre, ZONE_W).slice(0, 2) }
        const tlh = ts + 12
        tl.forEach((line, i) => bx.fillText(line, W / 2, 360 + i * tlh))
        filetOrne(bx, W / 2, 360 + (tl.length - 1) * tlh + 56, accent, bg)
      }
      if (pleinCadre) {
        // L'image annoncée n'a pas chargé : on rend au fond ses ornements
        cadreDouble(bx, W, H, accent)
        enTete(bx, W, accent, ink, opts.date, opts.seed)
        marque(bx, W, accent, ink)
      }
      poemeLayout = layoutPoeme(ctx, opts, W, ZONE_W, false, false)
      // Lignes de pli entre fragments — sur le fond fixe, révélées dès le début
      for (const sy of poemeLayout.separatorYs) {
        drawFragmentSeparator(bx, W, sy, accent)
      }
    }
  } else if (opts.imageDataUrl) {
    try {
      // ── Dessin plein cadre : couvre toute la page, lecture en surimpression ──
      img = await chargerImage(opts.imageDataUrl)
      const ratio = Math.max(W / img.width, H / img.height)
      const w = img.width * ratio, h = img.height * ratio
      imgBox = { x: (W - w) / 2, y: (H - h) / 2, w, h }
      // Couleurs de lecture décidées par le BAS du dessin (papier choisi) —
      // même logique adaptative que le poème illustré
      try {
        const pw = 108, ph = 192
        const probe = document.createElement('canvas')
        probe.width = pw; probe.height = ph
        const px = probe.getContext('2d')!
        const pr = Math.max(pw / img.width, ph / img.height)
        px.drawImage(img, (pw - img.width * pr) / 2, (ph - img.height * pr) / 2, img.width * pr, img.height * pr)
        const d = px.getImageData(0, Math.floor(ph * 0.55), pw, ph - Math.floor(ph * 0.55)).data
        let lum = 0
        for (let i = 0; i < d.length; i += 4) lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
        lum /= (d.length / 4) * 255
        if (lum < 0.52) { encreTexte = '#f4eddc'; scrimTexte = '#100b06' }
        else { encreTexte = '#17100a'; scrimTexte = '#f4eddc' }
      } catch { /* canvas teinté : héritage ambiance */ }
    } catch { /* ignore */ }
  }

  // Longs poèmes : la vidéo s'étire à 8 s pour laisser chaque vers s'écrire
  const nbLignesContenu = overlay?.lignes.length ?? poemeLayout?.lignes.filter(l => l.texte).length ?? 0
  const dureeEff = nbLignesContenu > 12 ? Math.max(dureeMs, 8000) : dureeMs

  // Audio embarqué dans la vidéo — seulement si la session audio démarre vraiment.
  // Sur iOS, une session interrompue peut laisser resume() en suspens pour toujours :
  // on borne l'attente, et la vidéo part muette plutôt que de ne jamais partir.
  let audioCtx: AudioContext | null = null
  let audioDest: MediaStreamAudioDestinationNode | null = null
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (AC) {
      const ctxAudio: AudioContext = new AC()
      const demarre = await Promise.race([
        ctxAudio.resume().then(() => true, () => false),
        new Promise<boolean>(r => setTimeout(() => r(false), 1200)),
      ])
      if (demarre && ctxAudio.state === 'running') {
        audioCtx = ctxAudio
        audioDest = ctxAudio.createMediaStreamDestination()
      } else {
        ctxAudio.close().catch(() => { /* ignore */ })
      }
    }
  } catch { audioCtx = null; audioDest = null }

  const videoStream = (canvas as any).captureStream(30) as MediaStream
  const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()]
  if (audioDest) tracks.push(...audioDest.stream.getAudioTracks())

  // Créer + démarrer l'enregistreur. Sur iOS, une piste audio dont la session
  // est interrompue fait échouer start() (« Failed to start the audio device ») :
  // on retente alors sans audio — une vidéo muette vaut mieux que pas de vidéo.
  const chunks: Blob[] = []
  const creerRecorder = (pistes: MediaStreamTrack[]): MediaRecorder | null => {
    try {
      const r = new MediaRecorder(new MediaStream(pistes), { mimeType: mime, videoBitsPerSecond: 8_000_000 })
      r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
      r.start()
      return r
    } catch { chunks.length = 0; return null }
  }
  let rec = creerRecorder(tracks)
  let audioActif = !!audioDest
  if (!rec && audioDest) { rec = creerRecorder(videoStream.getVideoTracks()); audioActif = false }
  if (!rec) return null
  const done = new Promise<Blob>(res => { rec!.onstop = () => res(new Blob(chunks, { type: mime })) })

  if (audioActif && audioCtx && audioDest) {
    try { scoreRevelation(audioCtx, audioDest, opts.type) } catch { /* partition silencieuse — la vidéo continue */ }
  }

  await new Promise<void>(resolve => {
    const start = performance.now()
    let fini = false
    const terminer = () => { if (!fini) { fini = true; clearInterval(garde); resolve() } }
    // Garde-fou : si requestAnimationFrame se fige (onglet masqué, throttling iOS)
    // ou qu'une frame lève, on conclut quand même — la composition ne doit jamais tourner en rond
    const garde = setInterval(() => { if (performance.now() - start >= dureeEff + 1500) terminer() }, 400)
    const frame = () => {
      if (fini) return
      const t = performance.now() - start
      try {
        ctx.drawImage(bgCanvas, 0, 0)
        if (opts.type === 'poeme' && poemeIllustImg && overlay) {
          dessinerPoemePleinCadre(ctx, poemeIllustImg, illustBox, overlay, ornCanvas!, t, dureeEff, W, H, encreTexte, scrimTexte)
        } else if (opts.type === 'poeme' && poemeLayout) {
          dessinerPoemeAnime(ctx, poemeLayout, t, dureeEff, W, accent, ink, bg)
        } else if (img) dessinerDessinPleinCadre(ctx, img, imgBox, opts.texte ?? '', ornCanvas!, t, W, H, ZONE_W, accent, encreTexte, scrimTexte)
        // Voile de boucle — un cillement masque le raccord début/fin sur les réseaux.
        // Sur image plein cadre : couleur du scrim adaptatif (le voile d'ambiance
        // teintait la miniature d'un aplat étranger à l'image).
        if (t < 130) {
          const vc = (opts.type === 'poeme' && poemeIllustImg) ? scrimTexte : bg
          ctx.save(); ctx.globalAlpha = 0.45 * (1 - t / 130); ctx.fillStyle = vc; ctx.fillRect(0, 0, W, H); ctx.restore()
        }
      } catch { terminer(); return }
      if (t < dureeEff) requestAnimationFrame(frame)
      else terminer()
    }
    requestAnimationFrame(frame)
  })

  try { rec.stop() } catch { /* déjà arrêté */ }
  try { audioCtx?.close().catch(() => {}) } catch { /* close() peut pendre sur iOS — jamais attendu */ }
  // Si onstop ne vient jamais (enregistreur figé), on rend null → repli sur l'affiche fixe
  return await Promise.race([
    done,
    new Promise<Blob | null>(r => setTimeout(() => r(null), 8000)),
  ])
}

function flash(ctx: CanvasRenderingContext2D, W: number, t: number, t0: number, dur: number, bg: string, accent: string) {
  if (t < t0 || t > t0 + dur) return
  const p = (t - t0) / dur
  const a = Math.sin(p * Math.PI) // 0→1→0
  const r = (0.2 + p * 2.8) * Math.max(W, 1920) * 0.3
  ctx.save()
  ctx.globalAlpha = a * 0.5
  const grad = ctx.createRadialGradient(W / 2, 960, 0, W / 2, 960, r)
  grad.addColorStop(0, withAlpha(bg, 0.85))
  grad.addColorStop(0.4, withAlpha(accent, 0.16))
  grad.addColorStop(1, withAlpha(bg, 0))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 1920)
  ctx.restore()
}

// Tremblé d'encre « boiling » — sous-échantillonné à 10 fps pour l'effet dessin animé à la main
const TREMOR = [[0.5, -0.4, 0.12], [-0.6, 0.3, -0.1], [0.2, 0.5, 0.08]]
function tremor(t: number, actif: boolean): [number, number, number] {
  if (!actif) return [0, 0, 0]
  const seed = Math.floor(Math.floor(t / 33.33) / 3) % 3
  return TREMOR[seed] as [number, number, number]
}

function dessinerPoemeAnime(
  ctx: CanvasRenderingContext2D, L: LayoutPoeme, t: number, duree: number, W: number, accent: string, ink: string, bg: string,
) {
  const CONV_FIN = 3300, SUSP_FIN = 3640, FLASH_DUR = 320
  const LIGNE_DUR = 260, TREMOR_FIN = 5700
  const convergeY = L.centreY

  // Convergence + suspension des fragments (les voix éparses se rassemblent)
  if (t < ANIM_FLASH_T) {
    ctx.textAlign = 'center'
    // 46 px et départ à 120 ms : les fragments sont lisibles dès la première
    // seconde (le hook des stories) et sur la miniature de partage
    const nf = L.fragments.length
    // Beaucoup de voix (Atelier) : fragments plus petits, cadence resserrée
    ctx.font = `italic ${nf > 8 ? 32 : 46}px 'Bodoni Moda', Georgia, serif`
    L.fragments.forEach((f, i) => {
      const dep = i * Math.min(130, 2200 / Math.max(1, nf))
      const local = clamp01((t - dep) / (CONV_FIN - dep))
      const e = easeInOut(local)
      // Positions de départ RAMENÉES dans le cadre : les fragments sont
      // lisibles dès la première frame (miniature + hook), puis convergent
      const x0v = Math.min(W - 200, Math.max(200, f.x0))
      const y0v = Math.min(1460, Math.max(380, f.y0))
      const x = x0v + (W / 2 - x0v) * e
      const flot = t < CONV_FIN ? Math.sin(t / 1000 * 0.8 * Math.PI * 2 + i * 1.7) * 4 * (1 - e * 0.5) : 0
      // Convergence ÉTAGÉE : chaque fragment rejoint sa propre ligne — ils se
      // rassemblent sans jamais s'imprimer l'un sur l'autre
      const cy = convergeY + (i - (nf - 1) / 2) * Math.min(58, 1150 / Math.max(1, nf))
      const y = y0v + (cy - y0v) * e + flot
      const op = (t < CONV_FIN ? Math.min(0.95, 0.30 + local * 1.5) : 0.95) * (t > SUSP_FIN - 60 ? Math.max(0, (ANIM_FLASH_T - t) / 60) : 1)
      if (op <= 0) return
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((f.rot * (1 - e) * Math.PI) / 180)
      ctx.globalAlpha = op
      ctx.fillStyle = ink
      ctx.fillText(f.texte, 0, 0)
      ctx.restore()
    })
  }

  flash(ctx, W, t, ANIM_FLASH_T, FLASH_DUR, bg, accent)

  // Vers qui s'inscrivent — révélés par masque horizontal, avec tremblé d'encre
  ctx.textAlign = 'center'
  ctx.font = `italic ${L.bodySize}px 'Bodoni Moda', Georgia, serif`
  const visibles = L.lignes.filter(l => l.texte)
  // Cadence adaptative : tous les vers doivent être écrits 600 ms avant la fin
  const pas = Math.min(ANIM_LIGNE_PAS, Math.max(70, (duree - 600 - ANIM_LIGNE_T) / Math.max(1, visibles.length)))
  visibles.forEach((ligne, i) => {
    const lt = ANIM_LIGNE_T + i * pas
    if (t < lt) return
    const p = clamp01((t - lt) / LIGNE_DUR)
    const e = easeOutCubic(p)
    const w = ctx.measureText(ligne.texte).width
    const [tx, ty] = tremor(t, t < TREMOR_FIN)
    ctx.save()
    ctx.beginPath()
    ctx.rect(W / 2 - w / 2 - 4, ligne.y - L.bodySize, (w + 8) * e, L.bodySize * 1.6)
    ctx.clip()
    ctx.globalAlpha = 0.88
    ctx.fillStyle = ink
    ctx.fillText(ligne.texte, W / 2 + tx, ligne.y + ty)
    ctx.restore()
  })

  // Lettrine qui tombe, avec traîne lumineuse puis settle (le coup)
  const lettrine = L.lettrine
  if (lettrine && t >= LETT_T) {
    const p = clamp01((t - LETT_T) / LETT_DUR)
    const fall = p * p * (0.6 + 0.4 * p) // accélération gravitaire
    ctx.textAlign = 'center'
    ctx.font = `900 italic ${lettrine.size}px 'Bodoni Moda', Georgia, serif`
    // Traîne : 5 fantômes aux positions antérieures de la chute, résorbée 100 ms après l'impact
    const trailFade = clamp01(1 - (t - (LETT_T + LETT_DUR)) / 100)
    if (trailFade > 0) {
      const trail = [0.03, 0.06, 0.11, 0.18, 0.28]
      trail.forEach((a, k) => {
        const pk = Math.max(0, p - (trail.length - k) * 0.06)
        const fk = pk * pk * (0.6 + 0.4 * pk)
        const dy = (1 - fk) * -260
        ctx.save(); ctx.globalAlpha = a * trailFade; ctx.fillStyle = accent
        ctx.fillText(lettrine.char, W / 2, lettrine.baselineY + dy)
        ctx.restore()
      })
    }
    // settle (léger dépassement après l'impact)
    let scale = 1
    if (p >= 1) { const s = clamp01((t - (LETT_T + LETT_DUR)) / 180); scale = 1 + Math.sin(s * Math.PI) * 0.04 }
    const dy = (1 - fall) * -260
    ctx.save()
    ctx.globalAlpha = 0.92 * clamp01(p / 0.3)
    ctx.fillStyle = accent
    ctx.translate(W / 2, lettrine.baselineY + dy)
    ctx.scale(scale, scale)
    ctx.fillText(lettrine.char, 0, 0)
    ctx.restore()
  }
}

// ── Texte en surimpression sur l'illustration plein cadre ──────────────────────

interface OverlayTexte {
  lignes: string[]
  size: number
  lineH: number
  top: number
  titre: string[] | null
  titreSize: number
  titreTop: number
}

function layoutTexteOverlay(
  ctx: CanvasRenderingContext2D, titre: string | undefined, texte: string | undefined,
  W: number, H: number, ZONE_W: number,
): OverlayTexte {
  let size = 52, lineH = 78
  const sourceLines = (texte ?? '').split('\n')
  const doWrap = (s: number) => {
    ctx.font = `italic ${s}px 'Bodoni Moda', Georgia, serif`
    const r: string[] = []
    for (const src of sourceLines) {
      if (!src.trim()) { r.push(''); continue }
      for (const p of wrapText(ctx, src, ZONE_W)) r.push(p)
    }
    return r
  }
  let lignes = doWrap(size)
  if (lignes.length > 12) { size = 42; lineH = 62; lignes = doWrap(size) }
  if (lignes.length > 16) { size = 34; lineH = 50; lignes = doWrap(size) }
  if (lignes.length > 24) { size = 28; lineH = 42; lignes = doWrap(size) }
  if (lignes.length > 28) { lignes = lignes.slice(0, 27); lignes.push('[…]') }

  let titreLines: string[] | null = null
  let titreSize = 64
  if (titre?.trim()) {
    ctx.font = `800 italic ${titreSize}px 'Bodoni Moda', Georgia, serif`
    titreLines = wrapText(ctx, titre, ZONE_W).slice(0, 2)
  }
  const titreH = titreLines ? titreLines.length * (titreSize + 12) + 44 : 0
  const blockH = lignes.length * lineH
  let top = H * 0.44 - (blockH + titreH) / 2
  top = Math.max(380, Math.min(top, 1600 - blockH))
  return { lignes, size, lineH, top: top + titreH, titre: titreLines, titreSize, titreTop: top }
}

// Poème + illustration : image bord à bord, texte en fondu simultané.
// L'encre et le voile viennent de la luminance mesurée de l'image (encreTexte /
// scrim), la lisibilité est assurée par une BANDE locale derrière le bloc de
// texte — l'image reste intacte partout ailleurs.
function dessinerPoemePleinCadre(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement, box: { x: number; y: number; w: number; h: number },
  L: OverlayTexte, orn: HTMLCanvasElement, t: number, duree: number, W: number, H: number, encreTexte: string, scrim: string,
) {
  // Image : présente dès la frame 0 (miniature de story = première image),
  // pleine à 800 ms, avec une respiration de zoom continue jusqu'au bout
  const a = 0.35 + 0.65 * easeInOut(clamp01(t / 800))
  const sc = 1.035 - 0.035 * clamp01(t / duree)
  const w = box.w * sc, h = box.h * sc
  ctx.save()
  ctx.globalAlpha = a
  ctx.drawImage(img, W / 2 - w / 2, H / 2 - h / 2, w, h)
  // Voile global très léger (le socle et la bande locale font la lisibilité)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0,    withAlpha(scrim, 0.16))
  g.addColorStop(0.45, withAlpha(scrim, 0.06))
  g.addColorStop(1,    withAlpha(scrim, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // Socle + marque "CADAVRE EXQUIS" (ornCanvas)
  ctx.drawImage(orn, 0, 0)

  // Texte : fondu dès 800 ms — le spectateur a le vers avant la 2e seconde
  const TXT_T = 800, FADE = 900
  const ta = easeInOut(clamp01((t - TXT_T) / FADE))
  if (ta <= 0) return

  // Bande de lisibilité locale — dégradé doux aux bords, jamais un aplat
  const hautBande = (L.titre ? L.titreTop : L.top) - 40
  const basBande = L.top + L.lignes.length * L.lineH + 28
  ctx.save()
  ctx.globalAlpha = ta
  const gb = ctx.createLinearGradient(0, hautBande - 70, 0, basBande + 70)
  gb.addColorStop(0,    withAlpha(scrim, 0))
  gb.addColorStop(0.25, withAlpha(scrim, 0.44))
  gb.addColorStop(0.75, withAlpha(scrim, 0.44))
  gb.addColorStop(1,    withAlpha(scrim, 0))
  ctx.fillStyle = gb
  ctx.fillRect(0, hautBande - 70, W, basBande - hautBande + 140)
  ctx.restore()

  ctx.textAlign = 'center'

  if (L.titre) {
    ctx.save()
    ctx.globalAlpha = ta
    ctx.shadowColor = withAlpha(scrim, 0.85); ctx.shadowBlur = 26; ctx.shadowOffsetY = 3
    ctx.fillStyle = encreTexte
    ctx.font = `800 italic ${L.titreSize}px 'Bodoni Moda', Georgia, serif`
    L.titre.forEach((line, i) => ctx.fillText(line, W / 2, L.titreTop + (i + 1) * (L.titreSize + 12)))
    ctx.restore()
  }

  ctx.font = `italic ${L.size}px 'Bodoni Moda', Georgia, serif`
  L.lignes.forEach((ligne, i) => {
    if (!ligne) return
    ctx.save()
    ctx.globalAlpha = ta * 0.97
    ctx.shadowColor = withAlpha(scrim, 0.85); ctx.shadowBlur = 24; ctx.shadowOffsetY = 2
    ctx.fillStyle = encreTexte
    ctx.fillText(ligne, W / 2, L.top + (i + 1) * L.lineH)
    ctx.restore()
  })
}

// Partition de la révélation dessin — partagée entre la vidéo et la révélation à l'écran
export const REVEAL_DESSIN = {
  // [début, fin, fractionDébut, fractionFin] — bande par bande, avec pauses
  bandes: [
    [800, 1900, 0, 1 / 3],
    [2150, 3250, 1 / 3, 2 / 3],
    [3500, 4400, 2 / 3, 1],
  ] as [number, number, number, number][],
  flashT: 4620, flashDur: 280,
  lectT: 4700, lectDur: 700,
  total: 6000,
}

export function fracRevealDessin(t: number): { frac: number; scanActif: boolean } {
  let frac = 0, scanActif = false
  for (const [t0, t1, f0, f1] of REVEAL_DESSIN.bandes) {
    if (t >= t1) { frac = f1 }
    else if (t >= t0) { frac = f0 + (f1 - f0) * easeInOut((t - t0) / (t1 - t0)); scanActif = true; break }
    else break
  }
  return { frac, scanActif }
}

// Dessin plein cadre : il couvre toute la page, révélé bande par bande,
// la lecture surréaliste apparaît en surimpression dans un léger fondu.
function dessinerDessinPleinCadre(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement, box: { x: number; y: number; w: number; h: number },
  texte: string, orn: HTMLCanvasElement, t: number, W: number, H: number, ZONE_W: number,
  accent: string, encreLect: string, scrimLect: string,
) {
  const { frac, scanActif } = fracRevealDessin(t)

  // Fantôme du dessin dès la frame 0 : il affleure sous le papier (miniature
  // composée, hook immédiat) — la révélation bande par bande garde sa surprise
  ctx.save()
  ctx.globalAlpha = 0.13
  ctx.drawImage(img, box.x, box.y, box.w, box.h)
  ctx.restore()

  if (frac > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, H * frac)
    ctx.clip()
    ctx.drawImage(img, box.x, box.y, box.w, box.h)
    ctx.restore()
    if (scanActif && frac < 1) {
      const yScan = H * frac
      ctx.save()
      ctx.strokeStyle = withAlpha(accent, 0.5)
      ctx.lineWidth = 3
      ctx.shadowColor = withAlpha(accent, 0.12); ctx.shadowBlur = 24
      ctx.beginPath(); ctx.moveTo(0, yScan); ctx.lineTo(W, yScan); ctx.stroke()
      ctx.restore()
    }
  }

  flash(ctx, W, t, REVEAL_DESSIN.flashT, REVEAL_DESSIN.flashDur, scrimLect, accent)

  // Voile de lecture — couleur du scrim ADAPTATIF (mesuré sur le dessin),
  // plus jamais un aplat d'ambiance étranger à l'œuvre
  const lectOp = texte.trim() && t >= REVEAL_DESSIN.lectT
    ? clamp01((t - REVEAL_DESSIN.lectT) / REVEAL_DESSIN.lectDur)
    : 0
  if (lectOp > 0) {
    ctx.save()
    ctx.globalAlpha = lectOp
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H)
    g.addColorStop(0, withAlpha(scrimLect, 0))
    g.addColorStop(0.4, withAlpha(scrimLect, 0.62))
    g.addColorStop(1, withAlpha(scrimLect, 0.92))
    ctx.fillStyle = g
    ctx.fillRect(0, H * 0.55, W, H * 0.45)
    ctx.restore()
  }

  // Ornements (cadre + en-tête) par-dessus le dessin et le voile
  ctx.drawImage(orn, 0, 0)
  // Marque en couleurs adaptatives — lisible sur tout papier
  marque(ctx, W, garantirContraste(accent, scrimLect, 3), encreLect)

  // Lecture surréaliste — léger fondu en surimpression
  if (lectOp > 0) {
    ctx.save()
    ctx.globalAlpha = lectOp
    const lectTop = 1380
    ctx.fillStyle = garantirContraste(accent, scrimLect, 3)
    ctx.textAlign = 'center'
    ctx.font = "22px 'Raleway', sans-serif"
    texteEspace(ctx, '— LECTURE —', W / 2, lectTop, 22 * 0.3)
    ctx.font = "italic 36px 'Playfair Display', Georgia, serif"
    const lignes = wrapText(ctx, texte.replace(/\n+/g, ' ').trim(), ZONE_W - 60).slice(0, 4)
    ctx.fillStyle = withAlpha(encreLect, 0.92)
    lignes.forEach((line, i) => {
      const txt = (i === 0 ? '« ' : '') + line + (i === lignes.length - 1 ? ' »' : '')
      ctx.fillText(txt, W / 2, lectTop + 56 + i * 56)
    })
    ctx.restore()
  }
}

// Génère la vidéo et la partage ; renvoie false si l'encodage vidéo est indisponible (→ repli affiche)
export async function partagerVideoStory(opts: {
  type: 'poeme' | 'dessin'
  titre: string
  texte?: string
  imageDataUrl?: string
  accent: string
  bg: string
  ink: string
  date?: number
  invitation?: string
  seed?: string
}, nomFichier = 'cadavre-exquis'): Promise<boolean | 'annule'> {
  let blob: Blob | null = null
  try { blob = await genererVideoStory(opts) } catch { blob = null }
  if (!blob || blob.size < 2000) return false
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
  const file = new File([blob], `${nomFichier}.${ext}`, { type: blob.type })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Cadavre Exquis' })
      return true
    }
  } catch (e) {
    // L'utilisateur a fermé la feuille de partage : ce n'est ni un échec
    // ni un partage — pas de téléchargement forcé, pas de « ✓ Partagé ».
    if ((e as Error).name === 'AbortError') return 'annule'
    /* autre erreur : repli téléchargement */
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = file.name
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF export
// ─────────────────────────────────────────────────────────────────────────────

export async function exporterPDF(opts: {
  type: 'poeme' | 'dessin'
  titre: string
  texte?: string
  imageDataUrl?: string
  bg: string
  ink: string
  accent: string
  date: number
}): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const marginX = 22
    const contentW = pageW - marginX * 2

    // Hex → rgb helper
    const hex2rgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '')
      const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
      const n = parseInt(full.slice(0, 6), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    const [bgR, bgG, bgB] = hex2rgb(opts.bg || '#faf8f3')
    const [inkR, inkG, inkB] = hex2rgb(opts.ink || '#1a1714')
    const [accR, accG, accB] = hex2rgb(opts.accent || '#b22c20')

    // Cream/paper background
    doc.setFillColor(bgR, bgG, bgB)
    doc.rect(0, 0, pageW, pageH, 'F')

    // Top ornament
    doc.setTextColor(accR, accG, accB)
    doc.setFont('times', 'normal')
    doc.setFontSize(14)
    doc.text('*   *   *', pageW / 2, 24, { align: 'center' })

    // Title
    doc.setTextColor(inkR, inkG, inkB)
    doc.setFont('times', 'bold')
    doc.setFontSize(26)
    const titleLines = doc.splitTextToSize(opts.titre || 'Sans titre', contentW)
    doc.text(titleLines, pageW / 2, 40, { align: 'center' })
    let y = 40 + titleLines.length * 10

    // Date label
    const dateStr = new Date(opts.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(accR, accG, accB)
    doc.text(`Cadavre exquis — ${dateStr}`, pageW / 2, y + 4, { align: 'center' })
    y += 12

    // Separator
    doc.setDrawColor(accR, accG, accB)
    doc.setLineWidth(0.3)
    doc.line(marginX + 30, y, pageW - marginX - 30, y)
    y += 10

    if (opts.imageDataUrl) {
      try {
        // Convert URL → base64 data URL so jsPDF can embed it
        let dataUrl = opts.imageDataUrl
        let fmt: 'PNG' | 'JPEG' = 'PNG'
        if (!dataUrl.startsWith('data:')) {
          const resp = await fetch(dataUrl, { mode: 'cors' })
          const blob = await resp.blob()
          fmt = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 'PNG'
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } else {
          fmt = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'
        }
        const img = await chargerImage(dataUrl)
        const maxW = contentW
        // For poems limit height to leave room for verse text; drawings can fill the page
        const maxH = opts.type === 'poeme' ? 90 : pageH - y - 30
        const ratio = Math.min(maxW / img.width, maxH / img.height)
        const drawW = img.width * ratio
        const drawH = img.height * ratio
        const drawX = (pageW - drawW) / 2
        doc.addImage(dataUrl, fmt, drawX, y, drawW, drawH)
        y += drawH + 8
        // Thin separator after illustration
        doc.setDrawColor(accR, accG, accB)
        doc.setLineWidth(0.2)
        doc.line(marginX + 40, y, pageW - marginX - 40, y)
        y += 8
      } catch (e) {
        console.error('Failed to insert image in PDF', e)
      }
    }

    // For drawings, optionally add vision text below
    if (opts.texte) {
      doc.setFont('times', 'normal')
      doc.setFontSize(opts.type === 'poeme' ? 14 : 11)
      doc.setTextColor(inkR, inkG, inkB)
      // Handle \n forced breaks plus wrapping
      const sourceLines = opts.texte.split('\n')
      const allLines: string[] = []
      for (const src of sourceLines) {
        if (!src.trim()) { allLines.push(''); continue }
        const wrapped = doc.splitTextToSize(src, contentW) as string[]
        for (const w of wrapped) allLines.push(w)
      }
      const lineH = opts.type === 'poeme' ? 8 : 6
      for (const line of allLines) {
        if (y > pageH - 28) {
          doc.addPage()
          doc.setFillColor(bgR, bgG, bgB)
          doc.rect(0, 0, pageW, pageH, 'F')
          doc.setTextColor(inkR, inkG, inkB)
          y = 24
        }
        if (opts.type === 'poeme') {
          doc.text(line, pageW / 2, y, { align: 'center' })
        } else {
          doc.text(line, marginX, y)
        }
        y += lineH
      }
    }

    // Footer
    const footerY = pageH - 16
    doc.setDrawColor(accR, accG, accB)
    doc.setLineWidth(0.2)
    doc.line(marginX + 40, footerY - 6, pageW - marginX - 40, footerY - 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(accR, accG, accB)
    doc.text(`Cadavre Exquis · ${dateStr}`, pageW / 2, footerY, { align: 'center' })

    const slug = (opts.titre || 'sans-titre')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'sans-titre'
    doc.save(`cadavre-${slug}.pdf`)
  } catch (e) {
    console.error('Failed to export PDF', e)
  }
}
