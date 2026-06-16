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
import { GRAVURE, genererImage, detourerParLuminance } from './_gravure.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// calques où c'est le CLAIR qui est la matière (lueur), pas l'encre
const CALQUES_LUMIERE = new Set(['light'])

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

async function gen(scene, calque, prompt, falKey, outDir) {
  process.stdout.write(`· ${scene}/${calque} … `)
  const buf = await genererImage(prompt, falKey)
  // 600×800 @ q68 : budget mobile (~150-270 ko/calque) — la texture gravure tolère
  // bien la compression, le détail fin compte moins que le poids sur l'écran d'accueil.
  const webp = (await detourerParLuminance(buf, { lumiere: CALQUES_LUMIERE.has(calque) }))
    .resize(600, 800)
    .webp({ quality: 68, alphaQuality: 75, effort: 6 })
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
