#!/usr/bin/env node
/**
 * generer-tetes.mjs — génère les têtes de menu (éléphant, papillon, tigre) en
 * gravure monochrome détourée par luminance (socle scripts/_gravure.mjs).
 *
 * Le tigre a deux états ALIGNÉS pixel à pixel : gueule grand ouverte, puis
 * fermée. Le second état n'est pas régénéré de zéro (ce qui décalerait les
 * yeux, la tête, les hachures) mais obtenu par inpainting FLUX Fill sur un
 * masque anatomique : seule la zone masquée est repeinte, le reste de
 * l'image reste identique pixel pour pixel entre les deux états — vérifié
 * par diff (zone hors masque ≈ 0). Éléphant et papillon n'ont qu'un seul
 * état raster final : la trompe qui se lève et les ailes qui se replient
 * déplacent des pixels sur une grande partie du cadre, ce qu'aucun masque
 * d'inpainting ne peut faire puisque l'inpainting repeint en place mais ne
 * déplace rien — leur animation est un pliage/pivot CSS côté
 * TeteCollage.tsx (clip-path + transform sur cette même image, jamais un
 * second raster).
 *
 * L'éléphant a un fort a priori anatomique (oreilles/défenses canoniques) :
 * ni le prompt texte (toute formulation essayée régénère un éléphant
 * standard) ni une retouche FLUX Fill ciblée sur les oreilles/défenses
 * (résultat effrayant et hors-sujet — cornes, visages, mains agrippantes)
 * n'ont permis la substitution demandée ; ESPECES.elephant s'en tient donc
 * à un éléphant chimérique simple plutôt que de risquer un résultat hors
 * charte (« doux, jamais effrayant »).
 *
 * Usage :
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs            # les 3 espèces
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs elephant   # une seule
 *
 * Sortie : public/tetes/<espece>/ouvert.webp, + ferme.webp pour le tigre.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { GRAVURE, genererImage, detourerParLuminance, decouperPapier } from './_gravure.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TAILLE = 1024 // doit matcher exactement le masque (contrainte FLUX Fill)

const CADRAGE =
  'a single creature head portrait, perfectly centered, frontal symmetric view, ' +
  'filling exactly the same consistent frame, ' + GRAVURE

// Chimères de cadavre exquis : chaque bête mêle des fragments incongrus
// (objets, astres, mécanique) à son anatomie propre — l'esprit du jeu
// transposé aux têtes de menu, pas de simples portraits naturalistes. Ton
// volontairement doux et onirique (livre d'images, pas film d'épouvante).
// Les essais précédents avec des négations dans le prompt ("no horror, no
// gore, no dripping") ont produit l'effet inverse — un modèle de diffusion
// peint souvent le concept même quand il est nié — donc ce prompt n'emploie
// plus que des descriptions positives, douces et concrètes.
const CHIMERE =
  'surrealist exquisite-corpse chimera creature, dreamlike, whimsical, ' +
  'gentle and charming, kind warm expression, elegant ornamental fused details, '

// { x, y, w, h } en fraction du cadre [0,1] : zone anatomique repeinte par
// l'inpainting pour passer de l'état ouvert à l'état fermé. trouCentral
// (papillon) protège une bande verticale centrale — le corps — du masque.
const ESPECES = {
  // La fourmi (crocs/pinces anatomiquement dentelés, gros yeux noirs pleins)
  // lisait comme un monstre quelle que soit la formulation du prompt — un
  // éléphant est par nature rond et doux, bien plus difficile à faire lire
  // comme effrayant. La trompe se lève au clic (pivot CSS, cf. TeteCollage).
  elephant: {
    // dire « tête d'éléphant + oreilles de lapin » régénère systématiquement
    // les oreilles d'éléphant canoniques : l'identité de base « éléphant »
    // est trop forte. À l'inverse, le tigre à oreilles d'éléphant a marché
    // en gardant l'identité de base inchangée (tigre) et en ne greffant que
    // les oreilles — donc ici on inverse : l'identité de base devient un
    // LAPIN (qui produit ses propres oreilles par défaut), seul le nez est
    // remplacé par une trompe greffée. « plain bare head, no crown » retire
    // la couronne ornementale ajoutée spontanément par le CHIMERE partagé.
    ouvert: CHIMERE + 'a rabbit head with two long upright rabbit ears, but with a long gentle ' +
      'elephant trunk in place of a nose, hanging straight down at rest along the vertical ' +
      'centerline, a small delicate bell shape at the very tip of the trunk, large round kind ' +
      'eyes, frontal view, smooth bare forehead between the ears with nothing resting on it, ' + CADRAGE,
  },
  papillon: {
    ouvert: CHIMERE + 'a butterfly whose wings are a pair of feathered bird wings, spread fully ' +
      'open and flat, symmetric, soft layered plumage, gentle watching-eye markings and tiny ' +
      'crescent moons hidden among the feathers, antennae tipped like fine paintbrushes, a small ' +
      'elegant human torso in place of the insect body, ' + CADRAGE,
    // pas de "ferme" : le pliage déplace les ailes sur tout le cadre, donc pas
    // d'inpainting possible — fermeture animée en CSS sur cette seule image.
  },
  tigre: {
    ouvert: CHIMERE + 'a tiger head with its mouth wide open, jaws spread wide apart, fangs and ' +
      'tongue clearly visible, a tiger\'s own short flat nose and whisker pad ' +
      'at the very center of the face, large rounded elephant ears in place of tiger ears, ' +
      'narrow eyes glowing pale yellow-green with thin vertical slit pupils like a cat at night, ' +
      'stripes that flow into soft crescent moons and stars resting along the fur, one small ' +
      'extra eye like a gentle jewel set on the forehead, ' + CADRAGE,
    ferme: CHIMERE + 'a tiger head with its mouth completely closed and sealed shut, lips together, ' +
      'no fangs visible, no teeth visible, no tongue visible, no open gap at all, calm relaxed ' +
      'expression, a tiger\'s own short flat nose and whisker pad at the very center of the face, ' +
      'large rounded elephant ears in place of tiger ears, narrow eyes glowing pale yellow-green ' +
      'with thin vertical slit pupils like a cat at night, stripes that flow into soft crescent ' +
      'moons and stars resting along the fur, one small extra eye like a gentle jewel set on the ' +
      'forehead, ' + CADRAGE,
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
    const detourePng = await (await detourerParLuminance(buf)).resize(480, 480).png().toBuffer()
    const decoupe = await decouperPapier(detourePng)
    const outBuf = await decoupe.webp({ quality: 72, alphaQuality: 80, effort: 6 }).toBuffer()
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
