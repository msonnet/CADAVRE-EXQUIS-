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
      ctx.font = `italic ${fontSize}px Georgia, 'Cormorant Garamond', serif`

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
      ctx.font = `italic ${fontSize}px Georgia, 'Cormorant Garamond', serif`
      wrappedLines.forEach((line, i) => {
        ctx.fillText(line, pad, img.height + pad + Math.round(pad * 0.5) + (i + 1) * lineH)
      })

      resolve(canvas.toDataURL('image/png'))
    }
    img.src = imageDataUrl
  })
}
