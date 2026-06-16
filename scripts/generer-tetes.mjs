#!/usr/bin/env node
/**
 * generer-tetes.mjs — génère les têtes de menu (fourmi, papillon, tigre) en
 * gravure monochrome détourée par luminance, même pipeline que
 * generer-decor.mjs (scripts/_gravure.mjs).
 *
 * Fourmi et tigre ont deux états ALIGNÉS pixel à pixel : mandibules/gueule
 * grand ouvertes, puis fermées. Le second état n'est pas régénéré de zéro
 * (ce qui décalerait les yeux, la tête, les hachures) mais obtenu par
 * inpainting FLUX Fill sur un masque anatomique : seule la zone masquée est
 * repeinte, le reste de l'image reste identique pixel pour pixel entre les
 * deux états — vérifié par diff (zone hors masque ≈ 0). Le papillon n'a
 * qu'un seul état (ailes ouvertes) : replier les ailes déplace les pixels
 * sur la quasi-totalité du cadre, ce qu'aucun masque d'inpainting ne peut
 * faire puisque l'inpainting repeint en place mais ne déplace rien — sa
 * fermeture est animée en CSS côté TeteCollage.tsx (clip-path + transform
 * sur cette même image, pas de second raster).
 *
 * Usage :
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs            # les 3 espèces
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs fourmi     # une seule
 *
 * Sortie : public/tetes/<espece>/ouvert.webp, + ferme.webp pour fourmi/tigre.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { GRAVURE, genererImage, detourerParLuminance } from './_gravure.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TAILLE = 1024 // doit matcher exactement le masque (contrainte FLUX Fill)

const CADRAGE =
  'a single creature head portrait, perfectly centered, frontal symmetric view, ' +
  'filling exactly the same consistent frame, ' + GRAVURE

// { x, y, w, h } en fraction du cadre [0,1] : zone anatomique repeinte par
// l'inpainting pour passer de l'état ouvert à l'état fermé. trouCentral
// (papillon) protège une bande verticale centrale — le corps — du masque.
const ESPECES = {
  fourmi: {
    ouvert: 'an ant head with wide-open mandibles spread apart, antennae raised, ' +
      'large round compound eyes, ' + CADRAGE,
    ferme: 'an ant head with mandibles fully closed together, antennae raised, ' +
      'large round compound eyes, ' + CADRAGE,
    masque: { x: 0.18, y: 0.5, w: 0.64, h: 0.46 },
  },
  papillon: {
    ouvert: 'a butterfly with both wings spread fully open and flat, symmetric, ' +
      'antennae visible, slender body, ' + CADRAGE,
    // pas de "ferme" : le pliage déplace les ailes sur tout le cadre, donc pas
    // d'inpainting possible — fermeture animée en CSS sur cette seule image.
  },
  tigre: {
    ouvert: 'a tiger head with jaws wide open showing the lower jaw dropped, ' +
      'stripes, alert round eyes, ' + CADRAGE,
    ferme: 'a tiger head with its mouth completely closed and sealed shut, lips together, ' +
      'no fangs visible, no teeth visible, no tongue visible, no open gap at all, ' +
      'calm relaxed expression, stripes, alert round eyes, ' + CADRAGE,
    // démarre plus haut que le menton : la lèvre supérieure et le retroussis du
    // museau (où vivent les babines/crocs de l'état ouvert) sont juste au-dessus
    // de la ligne précédente (y:0.52) — non recouverts, ils ne pouvaient donc
    // jamais changer, d'où la gueule restée ouverte au premier essai.
    masque: { x: 0.13, y: 0.4, w: 0.74, h: 0.54 },
  },
}

async function genererMasque({ x, y, w, h, trouCentral }) {
  const px = (v) => Math.round(v * TAILLE)
  const trou = trouCentral
    ? `<rect x="${px(0.5 - trouCentral / 2)}" y="${px(y)}" width="${px(trouCentral)}" height="${px(h)}" fill="black" />`
    : ''
  const svg = `<svg width="${TAILLE}" height="${TAILLE}">
    <rect width="${TAILLE}" height="${TAILLE}" fill="black" />
    <rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" fill="white" />
    ${trou}
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

const versDataUri = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`

async function remplir(imagePng, masquePng, prompt, falKey) {
  const r = await fetch('https://fal.run/fal-ai/flux-pro/v1/fill', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_url: versDataUri(imagePng, 'image/png'),
      mask_url: versDataUri(masquePng, 'image/png'),
      num_images: 1,
      output_format: 'png',
    }),
  })
  if (!r.ok) throw new Error(`FLUX Fill ${r.status}`)
  const data = await r.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error('pas d’image renvoyée (fill)')
  const img = await fetch(url)
  return Buffer.from(await img.arrayBuffer())
}

async function gen(espece, def, falKey, outDir) {
  process.stdout.write(`· ${espece} (ouvert) … `)
  const ouvertBrut = await genererImage(def.ouvert, falKey, { image_size: 'square_hd' })
  const ouvertPng = await sharp(ouvertBrut).resize(TAILLE, TAILLE).png().toBuffer()
  console.log('ok')

  const etats = [['ouvert', ouvertPng]]
  if (def.ferme) {
    process.stdout.write(`· ${espece} (fermé, inpainting aligné) … `)
    const masque = await genererMasque(def.masque)
    const fermePng = await remplir(ouvertPng, masque, def.ferme, falKey)
    etats.push(['ferme', fermePng])
    console.log('ok')
  }

  for (const [etat, buf] of etats) {
    const webp = (await detourerParLuminance(buf))
      .resize(480, 480)
      .webp({ quality: 72, alphaQuality: 80, effort: 6 })
    const outBuf = await webp.toBuffer()
    await writeFile(join(outDir, `${etat}.webp`), outBuf)
    console.log(`  → ${etat}.webp (${(outBuf.length / 1024).toFixed(0)} ko)`)
  }
}

const falKey = process.env.FAL_KEY
if (!falKey) {
  console.error('✗ FAL_KEY manquante.  Usage : FAL_KEY=xxx node scripts/generer-tetes.mjs [espèce]')
  process.exit(1)
}

const [especeSeule] = process.argv.slice(2)
if (especeSeule && !ESPECES[especeSeule]) {
  console.error(`✗ espèce inconnue : ${especeSeule}.  Choix : ${Object.keys(ESPECES).join(', ')}`)
  process.exit(1)
}

console.log('Génération des têtes de menu → public/tetes/<espèce>/')
const cibles = especeSeule ? { [especeSeule]: ESPECES[especeSeule] } : ESPECES
for (const [espece, def] of Object.entries(cibles)) {
  const outDir = join(__dirname, '..', 'public', 'tetes', espece)
  await mkdir(outDir, { recursive: true })
  try { await gen(espece, def, falKey, outDir) }
  catch (e) { console.log(`erreur : ${e.message}`) }
}
console.log('Terminé.')
