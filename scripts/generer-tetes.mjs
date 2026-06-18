#!/usr/bin/env node
/**
 * generer-tetes.mjs — génère les 4 têtes de menu en collage photo-réaliste
 * surréaliste (éléphant, papillon, méduse, baleine) via FLUX Pro, détourées
 * par propagation depuis le bord (fond blanc pur → transparent) puis habillées
 * d'une marge de papier déchiré (decouperPapier).
 *
 * Usage :
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs              # toutes
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs elephant     # une seule
 *
 * Sortie : public/tetes/<espece>/ouvert.webp
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { genererImage, detourerFondClair, decouperPapier } from './_gravure.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TAILLE = 1024

// Médium commun : collage photo-réaliste surréaliste.
// detourerFondClair requiert un fond très clair et uniforme → fond blanc pur
// sans ombre portée ni dégradé derrière le sujet.
const PHOTO_SURREAL =
  'photorealistic surrealist editorial illustration, seamlessly composited from photographic ' +
  'elements, vivid saturated natural colours, crisp studio-quality render, perfectly flat ' +
  'uniform pure white background with absolutely no shadow cast on the ground and no vignette ' +
  'and no gradient behind the subject, isolated on pure white, no text, no letters, ' +
  'no caption, no border, no frame'

const CADRAGE =
  'a single creature portrait, perfectly centered, filling the frame with a comfortable ' +
  'margin on every side, ' + PHOTO_SURREAL

const ESPECES = {
  // Éléphant + ailes de papillon monarque — référence directe des planches Pinterest.
  // On nomme « éléphant » comme identité de base (pas de substitution lapin) car
  // le modèle photo-réaliste accepte mieux la greffe d'ailes que les overrides anatomiques.
  elephant: {
    ouvert:
      'a full frontal portrait of an African elephant standing still and calm, natural grey ' +
      'wrinkled skin, kind gentle eyes, long trunk hanging straight down at rest along the ' +
      'vertical centerline, large round floppy ears spread wide, and two large spectacular ' +
      'monarch butterfly wings spreading symmetrically from its back, wings vivid orange and ' +
      'black with white spot markings, seamlessly composited, ' + CADRAGE,
  },

  // Papillon surréaliste : ailes de plumes de chouette effraie + corps humain miniature.
  papillon: {
    ouvert:
      'a surrealist butterfly with both wings replaced by large fully-spread barn-owl feather ' +
      'wings, each wing made of layered soft brown-and-cream feathers, symmetric and wide, ' +
      'at the very centre in place of the insect body a tiny elegant human feminine upper ' +
      'torso in a cream lace dress, slender delicate antennae tipped with tiny round gold ' +
      'orbs, frontal symmetric view, ' + CADRAGE,
  },

  // Méduse translucide avec un œil humain au centre du dôme.
  meduse: {
    ouvert:
      'a photorealistic translucent jellyfish, its dome luminous pale blue-white with soft ' +
      'iridescent shimmer, a single large realistic human eye — warm hazel iris, dark pupil — ' +
      'set at the very centre of the dome as if naturally grown there, looking straight ' +
      'forward, many long graceful thin tentacles trailing symmetrically below in gentle ' +
      'curves, frontal view, ' + CADRAGE,
  },

  // Baleine Magritte : fenêtre découpée dans le flanc révélant un ciel nuageux.
  'baleine-ciel': {
    ouvert:
      'a photorealistic humpback whale floating in the air in a gentle three-quarter ' +
      'front-side view, a clean rectangular window cut through the whale\'s flank revealing ' +
      'a vivid blue sky with white cumulus clouds behind it, as if the whale were hollow ' +
      'and the sky visible through it, a Magritte-like surrealist image, serene and ' +
      'wondrous, dramatic ocean-grey skin, ' + CADRAGE,
  },
}

async function gen(espece, def, falKey, outDir) {
  process.stdout.write(`· ${espece} … `)
  const brut = await genererImage(def.ouvert, falKey, { image_size: 'square_hd' })
  const png = await sharp(brut).resize(TAILLE, TAILLE).png().toBuffer()
  console.log('ok')

  const detourePng = await (await detourerFondClair(png)).resize(480, 480).png().toBuffer()
  const decoupe = await decouperPapier(detourePng)
  const outBuf = await decoupe.webp({ quality: 72, alphaQuality: 80, effort: 6 }).toBuffer()
  await writeFile(join(outDir, 'ouvert.webp'), outBuf)
  console.log(`  → ouvert.webp (${(outBuf.length / 1024).toFixed(0)} ko)`)
}

const falKey = process.env.FAL_KEY
if (!falKey) {
  console.error('✗ FAL_KEY manquante.  Usage : FAL_KEY=xxx node scripts/generer-tetes.mjs [espèce]')
  process.exit(1)
}

const args = process.argv.slice(2)
const especeSeule = args.find(a => !a.startsWith('--'))
if (especeSeule && !ESPECES[especeSeule]) {
  console.error(`✗ espèce inconnue : ${especeSeule}.  Choix : ${Object.keys(ESPECES).join(', ')}`)
  process.exit(1)
}

console.log('Génération des têtes (photo-réaliste surréaliste) → public/tetes/<espèce>/')
const cibles = especeSeule ? { [especeSeule]: ESPECES[especeSeule] } : ESPECES
for (const [espece, def] of Object.entries(cibles)) {
  const outDir = join(__dirname, '..', 'public', 'tetes', espece)
  await mkdir(outDir, { recursive: true })
  try { await gen(espece, def, falKey, outDir) }
  catch (e) { console.log(`erreur : ${e.message}`) }
}
console.log('Terminé.')
