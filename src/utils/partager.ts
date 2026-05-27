import { jsPDF } from 'jspdf'

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
      ctx.font = `${fontSize}px Georgia, 'Cormorant Garamond', serif`

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
      ctx.font = `${fontSize}px Georgia, 'Cormorant Garamond', serif`
      wrappedLines.forEach((line, i) => {
        ctx.fillText(line, pad, img.height + pad + Math.round(pad * 0.5) + (i + 1) * lineH)
      })

      resolve(canvas.toDataURL('image/png'))
    }
    img.src = imageDataUrl
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Story format (9:16, 1080×1920) generator
// ─────────────────────────────────────────────────────────────────────────────

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
}): Promise<string> {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Wait for fonts if possible
  try {
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      await (document as any).fonts.ready
    }
  } catch { /* ignore */ }

  // Background
  ctx.fillStyle = opts.bg
  ctx.fillRect(0, 0, W, H)

  // Subtle inner frame
  ctx.strokeStyle = `${opts.accent}33`
  ctx.lineWidth = 2
  ctx.strokeRect(48, 48, W - 96, H - 96)

  const marginX = 90

  if (opts.type === 'poeme') {
    // Title
    ctx.fillStyle = opts.ink
    ctx.textAlign = 'center'
    ctx.font = "bold 80px 'Bodoni Moda', 'Cormorant Garamond', Georgia, serif"
    const titleLines = wrapText(ctx, opts.titre, W - marginX * 2)
    const titleLineH = 92
    const titleTop = 200
    titleLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, titleTop + i * titleLineH)
    })
    const titleBottom = titleTop + titleLines.length * titleLineH

    // Ornament
    ctx.fillStyle = opts.accent
    ctx.font = "32px 'Outfit', monospace"
    ctx.fillText('✦   ✦   ✦', W / 2, titleBottom + 60)

    // Body text — handle \n as forced break
    ctx.fillStyle = opts.ink
    ctx.font = "48px 'Bodoni Moda', 'Cormorant Garamond', Georgia, serif"
    const bodyLineH = 48 * 1.5
    const sourceLines = (opts.texte ?? '').split('\n')
    const wrapped: string[] = []
    for (const src of sourceLines) {
      if (!src.trim()) { wrapped.push(''); continue }
      const pieces = wrapText(ctx, src, W - marginX * 2)
      for (const p of pieces) wrapped.push(p)
    }

    // Vertically center body between titleBottom+120 and H-220
    const bodyTopBoundary = titleBottom + 140
    const bodyBottomBoundary = H - 220
    const totalBodyH = wrapped.length * bodyLineH
    const bodyStartY = Math.max(
      bodyTopBoundary + bodyLineH,
      (bodyTopBoundary + bodyBottomBoundary) / 2 - totalBodyH / 2 + bodyLineH,
    )
    wrapped.forEach((line, i) => {
      ctx.fillText(line, W / 2, bodyStartY + i * bodyLineH)
    })
  } else {
    // Drawing variant
    ctx.fillStyle = opts.ink
    ctx.textAlign = 'center'
    ctx.font = "bold 60px 'Bodoni Moda', 'Cormorant Garamond', Georgia, serif"
    const titleLines = wrapText(ctx, opts.titre, W - marginX * 2)
    const titleLineH = 72
    const titleTop = 170
    titleLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, titleTop + i * titleLineH)
    })
    const titleBottom = titleTop + titleLines.length * titleLineH

    // Image area: max 900×1400 centered vertically
    if (opts.imageDataUrl) {
      try {
        const img = await chargerImage(opts.imageDataUrl)
        const maxW = 900
        const maxH = 1400
        const ratio = Math.min(maxW / img.width, maxH / img.height)
        const drawW = img.width * ratio
        const drawH = img.height * ratio
        const areaTop = titleBottom + 60
        const areaBottom = H - 220
        const drawX = (W - drawW) / 2
        const drawY = areaTop + ((areaBottom - areaTop) - drawH) / 2
        ctx.drawImage(img, drawX, drawY, drawW, drawH)
      } catch (e) {
        console.error('Failed to load image for story', e)
      }
    }
  }

  // Bottom mark
  ctx.fillStyle = opts.accent
  ctx.textAlign = 'center'
  ctx.font = "28px 'Outfit', monospace"
  const mark = 'C A D A V R E   E X Q U I S'
  ctx.fillText(mark, W / 2, H - 110)
  // small sub-mark
  ctx.fillStyle = opts.ink
  ctx.globalAlpha = 0.55
  ctx.font = "20px 'Outfit', monospace"
  ctx.fillText('— JEU SURRÉALISTE —', W / 2, H - 75)
  ctx.globalAlpha = 1

  return canvas.toDataURL('image/png')
}

export async function telechargerStory(dataUrl: string, nom: string): Promise<void> {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `cadavre-${nom}-story.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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
    doc.text('✦   ✦   ✦', pageW / 2, 24, { align: 'center' })

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

    if (opts.type === 'dessin' && opts.imageDataUrl) {
      // Insert image centered, scaled to fit
      try {
        const img = await chargerImage(opts.imageDataUrl)
        const maxW = contentW
        const maxH = pageH - y - 30
        const ratio = Math.min(maxW / img.width, maxH / img.height)
        const drawW = img.width * ratio
        const drawH = img.height * ratio
        const drawX = (pageW - drawW) / 2
        // Detect format from data URL
        const fmt = opts.imageDataUrl.startsWith('data:image/jpeg') || opts.imageDataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG'
        doc.addImage(opts.imageDataUrl, fmt, drawX, y, drawW, drawH)
        y += drawH + 6
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
