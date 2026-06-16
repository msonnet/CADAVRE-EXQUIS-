/**
 * _gravure.mjs — socle commun de la génération d'illustrations IA
 * (generer-tetes.mjs) : appel FLUX et détourage par luminance. Un seul jeu
 * d'images en gravure monochrome s'adapte ensuite aux 5 ambiances du jeu via
 * le filtre invert() (cf. Decor.tsx, TeteCollage.tsx).
 */

import sharp from 'sharp'

export const ENCRE = { r: 0x1a, g: 0x14, b: 0x10 } // identique à collages.tsx
export const LUEUR = { r: 0xff, g: 0xf3, b: 0xda } // ton chaud, pour les calques 'light' (blend screen)
// luminance en dessous de laquelle un pixel est considéré "encre pleine"
export const SEUIL_NOIR = 60
// luminance au-dessus de laquelle un pixel est considéré "papier vide" → transparent
export const SEUIL_BLANC = 215

export const GRAVURE =
  'antique copperplate intaglio engraving, dense fine cross-hatching and stippling for tonal depth, ' +
  'monochrome sepia-black ink only, perfectly flat uniform pale cream paper background with absolutely ' +
  'no vignette and no gradient behind the subject, museum natural-history plate, ' +
  '19th-century engraving precision, no text, no letters, no caption, no border, no frame, no color'

export async function genererImage(prompt, falKey, opts = {}) {
  const r = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: opts.image_size ?? 'portrait_4_3',
      num_inference_steps: 32,
      guidance_scale: 4.0,
      safety_tolerance: 5,
      num_images: 1,
    }),
  })
  if (!r.ok) throw new Error(`FLUX ${r.status}`)
  const data = await r.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error('pas d’image renvoyée')
  const img = await fetch(url)
  return Buffer.from(await img.arrayBuffer())
}

/**
 * Détoure par luminance et fige la couleur sur l'encre de référence (ou la
 * lueur, pour les calques pensés pour mix-blend-mode: screen).
 * - encre (par défaut) : le NOIR est la matière → alpha = densité d'encre.
 * - lumière : le CLAIR est la matière → alpha = intensité lumineuse.
 * Retourne un objet sharp (non encore encodé), à resize/encoder par l'appelant.
 */
export async function detourerParLuminance(buf, { lumiere = false } = {}) {
  const teinte = lumiere ? LUEUR : ENCRE
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  const { data } = await img.raw().toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    let alpha
    if (lum <= SEUIL_NOIR) alpha = lumiere ? 0 : 255
    else if (lum >= SEUIL_BLANC) alpha = lumiere ? 255 : 0
    else {
      const t = (lum - SEUIL_NOIR) / (SEUIL_BLANC - SEUIL_NOIR)
      alpha = Math.round(255 * (lumiere ? t : 1 - t))
    }
    out[o] = teinte.r
    out[o + 1] = teinte.g
    out[o + 2] = teinte.b
    out[o + 3] = alpha
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
}
