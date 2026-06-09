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
  } catch { /* fall through to download */ }
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
  } catch { /* fall through */ }
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

// En-tête commun : ✦ + date en petites capitales murmurées
function enTete(ctx: CanvasRenderingContext2D, W: number, accent: string, ink: string, date?: number) {
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.font = "32px 'Raleway', sans-serif"
  ctx.fillText('✦', W / 2, 192)
  if (date) {
    const d = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
    ctx.fillStyle = withAlpha(ink, 0.42)
    ctx.font = "24px 'Raleway', sans-serif"
    texteEspace(ctx, d, W / 2, 248, 24 * 0.35)
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

  ctx.fillStyle = withAlpha(ink, 0.45)
  ctx.font = "24px 'Raleway', sans-serif"
  ctx.fillText(LIEN_MARQUE, W / 2, 1862)
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
      "italic 900 300px 'Fraunces'",
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
      // Retry without CORS for data URLs / same-origin
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
  enTete(ctx, W, accent, ink, opts.date)

  if (opts.type === 'poeme') {
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
    const zoneTop = hasTitle ? 620 : 460, zoneBottom = 1560
    let bodySize = 42, bodyLineH = 66
    const sourceLines = (opts.texte ?? '').split('\n')
    ctx.font = `italic ${bodySize}px 'Playfair Display', Georgia, serif`
    let wrapped: string[] = []
    for (const src of sourceLines) {
      if (!src.trim()) { wrapped.push(''); continue }
      for (const p of wrapText(ctx, src, ZONE_W)) wrapped.push(p)
    }
    if (wrapped.length > 13) { bodySize = 36; bodyLineH = 56; ctx.font = `italic ${bodySize}px 'Playfair Display', Georgia, serif` }
    if (wrapped.length > 17) { wrapped = wrapped.slice(0, 15); wrapped.push('[…]') }

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
      ctx.font = `900 italic ${lettrineSize}px 'Fraunces', Georgia, serif`
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
    wrapped.forEach((line, i) => {
      if (!line) return
      ctx.fillText(line, W / 2, y + (i + 1) * bodyLineH)
    })

    invitationLigne(ctx, W, accent, 1660, invitation)
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
