#!/usr/bin/env node
/**
 * generer-decor.mjs — génère les calques illustrés des décors de scène
 * (parallaxe IA), complément des têtes de menu (generer-tetes.mjs) et des
 * collages SVG (src/reve/collages.tsx).
 *
 * Usage :
 *   FAL_KEY=xxxxx node scripts/generer-decor.mjs accueil          # tous les calques
 *   FAL_KEY=xxxxx node scripts/generer-decor.mjs accueil decor    # un seul calque
 *
 * Chaque calque est généré en gravure monochrome sur fond papier uni, puis
 * détouré par luminance : on ne garde QUE la densité d'encre (alpha), la
 * couleur RVB est figée sur l'encre de référence (#1a1410, identique à
 * collages.tsx). Ça permet à un seul jeu d'images de s'adapter aux 5
 * ambiances du jeu via le même filtre invert() déjà utilisé sur les
 * symboles (Decor.tsx → SymboleAvecCartel), sans regénérer par ambiance.
 *
 * Sortie : public/scenes/<scene>/<calque>.webp (RGBA, fond transparent).
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ENCRE = { r: 0x1a, g: 0x14, b: 0x10 } // identique à collages.tsx
const LUEUR = { r: 0xff, g: 0xf3, b: 0xda } // ton chaud, pour les calques 'light' (blend screen)
// luminance en dessous de laquelle un pixel est considéré "encre pleine"
const SEUIL_NOIR = 60
// luminance au-dessus de laquelle un pixel est considéré "papier vide" → transparent
const SEUIL_BLANC = 215
// calques où c'est le CLAIR qui est la matière (lueur), pas l'encre
const CALQUES_LUMIERE = new Set(['light'])

const GRAVURE =
  'antique copperplate intaglio engraving, dense fine cross-hatching and stippling for tonal depth, ' +
  'monochrome sepia-black ink only, perfectly flat uniform pale cream paper background with absolutely ' +
  'no vignette and no gradient behind the subject, museum natural-history plate, ' +
  '19th-century engraving precision, no text, no letters, no caption, no border, no frame, no color'

const SCENES = {
  accueil: {
    // portrait, calé sur l'écran d'accueil mobile (titre en bas, CTAs en bas)
    bg:
      'extremely sparse and faint atmospheric engraving texture filling a tall vertical composition, ' +
      'barely-visible drifting cross-hatch clouds, a few ghostly half-dissolved surrealist shapes ' +
      'almost melting into the paper grain, very low contrast, mostly empty negative space, ' + GRAVURE,
    decor:
      'a single large surrealist motif occupying only the upper third of a tall vertical composition: ' +
      'an enormous detailed eye emerging from a cracked egg, floating among soft engraved clouds, ' +
      'intricate cross-hatching, dreamlike Max Ernst atmosphere, ' +
      'the lower two-thirds of the canvas left completely empty flat cream paper with nothing on it, ' + GRAVURE,
    particules:
      'a sparse scatter of small floating particles across a tall vertical composition: tiny ink motes, ' +
      'drifting feathers, faint dust specks and minuscule insect wings, evenly spread, very small relative ' +
      'to the canvas, mostly empty space between them, ' + GRAVURE,
    light:
      'a single soft round glow, a hazy radial halo of light centered in the upper area of a tall vertical ' +
      'composition, gently radiating outward and fading to nothing, no hard edge, no other subject, ' + GRAVURE,
  },
}

async function genererImage(prompt, falKey) {
  const r = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: 'portrait_4_3',
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
 * Détoure par luminance.
 * - calques d'encre (par défaut) : le NOIR est la matière → alpha = densité d'encre, couleur figée ENCRE.
 * - calques de lumière ('light') : le CLAIR est la matière → alpha = intensité lumineuse, couleur LUEUR
 *   (pensé pour mix-blend-mode: screen, où le noir n'a aucun effet).
 */
async function detourerParLuminance(buf, calque) {
  const lumiere = CALQUES_LUMIERE.has(calque)
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
  // 600×800 @ q68 : budget mobile (~150-270 ko/calque) — la texture gravure tolère
  // bien la compression, le détail fin compte moins que le poids sur l'écran d'accueil.
  return sharp(out, { raw: { width, height, channels: 4 } })
    .resize(600, 800)
    .webp({ quality: 68, alphaQuality: 75, effort: 6 })
}

async function gen(scene, calque, prompt, falKey, outDir) {
  process.stdout.write(`· ${scene}/${calque} … `)
  const buf = await genererImage(prompt, falKey)
  const webp = await detourerParLuminance(buf, calque)
  const outBuf = await webp.toBuffer()
  await writeFile(join(outDir, `${calque}.webp`), outBuf)
  console.log(`ok (${(outBuf.length / 1024).toFixed(0)} ko)`)
}

const falKey = process.env.FAL_KEY
if (!falKey) {
  console.error('✗ FAL_KEY manquante.  Usage : FAL_KEY=xxx node scripts/generer-decor.mjs <scene> [calque]')
  process.exit(1)
}

const [scene, calqueSeul] = process.argv.slice(2)
if (!scene || !SCENES[scene]) {
  console.error(`✗ scène inconnue : ${scene ?? '(aucune)'}.  Choix : ${Object.keys(SCENES).join(', ')}`)
  process.exit(1)
}
const calques = SCENES[scene]
if (calqueSeul && !calques[calqueSeul]) {
  console.error(`✗ calque inconnu : ${calqueSeul}.  Choix : ${Object.keys(calques).join(', ')}`)
  process.exit(1)
}

const outDir = join(__dirname, '..', 'public', 'scenes', scene)
await mkdir(outDir, { recursive: true })

console.log(`Génération du décor « ${scene} » → public/scenes/${scene}/`)
const cibles = calqueSeul ? { [calqueSeul]: calques[calqueSeul] } : calques
for (const [calque, prompt] of Object.entries(cibles)) {
  try { await gen(scene, calque, prompt, falKey, outDir) }
  catch (e) { console.log(`erreur : ${e.message}`) }
}
console.log('Terminé.')
