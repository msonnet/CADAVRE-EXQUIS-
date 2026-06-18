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
 * Chaque tête a son médium propre (STYLE par espèce, ci-dessous) : papillon en
 * halftone noir & blanc, éléphant en sépia + fragments de texte, tigre en
 * gravure avec un seul accent sourd. Pas de teinte ni de grain communs.
 *
 * Usage :
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs              # les 3
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs elephant     # une seule
 *
 * Sortie : public/tetes/<espece>/ouvert.webp, + ferme.webp pour le tigre.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { GRAVURE, HALFTONE, SEPIA_TEXTE, ACCENT, LINOGRAVURE, VITRAIL, ENCRE_LAVIS, COLLAGE_ACCENT, genererImage, detourerFondClair, decouperPapier } from './_gravure.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TAILLE = 1024 // doit matcher exactement le masque (contrainte FLUX Fill)

// Un médium DISTINCT par tête (demande utilisateur : ni la même teinte ni le
// même grain partout, pas d'arc-en-ciel). Le prompt de chaque espèce se termine
// par GRAVURE (via CADRAGE) ; on le remplace par le style voulu. detourerFondClair
// (détourage couleur par propagation depuis le bord) convient aux trois : il
// préserve les pixels du sujet quels qu'ils soient et n'enlève que le fond clair.
const STYLE = {
  papillon: HALFTONE, elephant: SEPIA_TEXTE, tigre: ACCENT,
  // 3 chimères conservées — médium propre chacune.
  'poisson-oiseau': VITRAIL,
  'escargot-maison': LINOGRAVURE,
  'hibou-horloge': ENCRE_LAVIS,
  // 6 chimères refondues en COLLAGE surréaliste monochrome + 1 accent (réf.
  // Ernst / Dada) ; la variété vient désormais de la composition, des fragments
  // et de l'accent, plus du médium pictural (qui rendait un effet « sticker »).
  racine: COLLAGE_ACCENT,
  meduse: COLLAGE_ACCENT,
  'cerf-lune': COLLAGE_ACCENT,
  'dame-fleur': COLLAGE_ACCENT,
  'renard-automne': COLLAGE_ACCENT,
  'baleine-ciel': COLLAGE_ACCENT,
}

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

// Amorce COLLAGE (réf. exemples fournis : œil gravé sur fragment déchiré +
// colonne de texte ; fragments qui en percent d'autres). Le « médium » (STYLE
// = COLLAGE_ACCENT) porte tout le rendu collage ; cette amorce ne fait que
// nommer le sujet comme un assemblage de morceaux découpés, mi-créature
// mi-assemblage abstrait, jamais une illustration léchée.
const COLLAGE_SUJET = 'an exquisite-corpse paper collage, '

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

  // ── 9 chimères supplémentaires ────────────────────────────────────────────
  // Toutes mono-état (un seul ouvert.webp) : pas d'inpainting aligné, leur
  // « activation » au clic est un léger salut CSS (cf. SingleRaster dans
  // TeteCollage.tsx). Chaque bête mêle plusieurs règnes (humain / végétal /
  // animal / minéral) et porte un médium qui lui est propre.

  // ABSTRAIT — tête-arbre : fragment de gravure d'arbre + œil gravé + colonne de texte (réf. exemple).
  racine: {
    ouvert: COLLAGE_SUJET + 'a strange head-creature: a torn fragment of an engraved bare tree and roots ' +
      'forming the skull, a single large antique engraved human eye pasted where a face would be, a long ' +
      'narrow column of old printed book text hanging straight down like a neck or a root, a couple of tiny ' +
      'cut-out birds, ragged torn paper edges between every piece, the eye washed with one faint accent ' +
      'colour, ' + CADRAGE,
  },
  // CRÉATURE — méduse : dôme de montgolfière gravée + tentacules de bandes de texte et chaînes.
  meduse: {
    ouvert: COLLAGE_SUJET + 'a jellyfish-being: a domed bell cut from a halftone engraving of an old ' +
      'hot-air balloon, long trailing tentacles made of thin torn strips of printed book text and fine ' +
      'engraved chains, a small engraved eye pasted at the centre of the bell, ragged torn paper edges, ' +
      'clashing line weights, one faint accent colour on the eye, ' + CADRAGE,
  },
  // CRÉATURE — cerf : tête gravée, bois remplacés par bandes de texte + fragment de lune.
  'cerf-lune': {
    ouvert: COLLAGE_SUJET + 'a stag-being: a head cut from an antique animal engraving, its antlers ' +
      'replaced by pasted strips of printed book text and a cut-out crescent-moon fragment branching ' +
      'upward, layered torn paper pieces with little shadows, a mix of fine engraving and coarse halftone, ' +
      'one faint accent colour on the moon, ' + CADRAGE,
  },
  // ANIMAL + ANIMAL + MINÉRAL — poisson emplumé aux écailles de vitrail.
  'poisson-oiseau': {
    ouvert: CHIMERE + 'a plump gentle fish head with round friendly eyes, soft layered bird feathers ' +
      'and a single elegant peacock plume rising from the top, scales shaped like little stained-glass ' +
      'panes, delicate fins like feathered wings, calm kind expression, frontal symmetric view, ' + CADRAGE,
  },
  // ANIMAL + ARCHITECTURE — escargot dont la coquille est une maisonnette, linogravure.
  'escargot-maison': {
    ouvert: CHIMERE + 'a gentle snail with a kind little face and two long soft antennae tipped with ' +
      'tiny glowing paper lanterns, its spiral shell is a cosy little house with small round windows ' +
      'and a tiny chimney with curling smoke, whimsical and sweet, frontal symmetric view, ' + CADRAGE,
  },
  // CRÉATURE/ABSTRAIT — femme : visage gravé, un œil-fleur découpé, chevelure de colonnes de texte.
  'dame-fleur': {
    ouvert: COLLAGE_SUJET + "a woman's head: the face cut from a fine old engraving, one eye replaced by a " +
      'pasted cut-out of an engraved flower, the hair made of torn columns of printed book text fanning ' +
      'out, ragged scissor-cut edges, deliberately clashing line weights, one faint accent colour on the ' +
      'lips, ' + CADRAGE,
  },
  // ANIMAL + MÉCANIQUE + VÉGÉTAL — hibou-horloger, lavis d'encre sumi-e.
  'hibou-horloge': {
    ouvert: CHIMERE + 'a wise gentle owl head with large round calm eyes, its chest and brow set with ' +
      'delicate brass clockwork gears and a small antique pocket-watch as a third eye on the forehead, ' +
      'soft feathers mixed with thin curling vines, scholarly and kind, frontal symmetric view, ' + CADRAGE,
  },
  // CRÉATURE — renard : tête gravée, une oreille en bande de texte, feuille découpée, fragment d'engrenage.
  'renard-automne': {
    ouvert: COLLAGE_SUJET + 'a fox-being: the head cut from an antique engraving, one ear replaced by a ' +
      'torn upright strip of printed book text, a pasted cut-out of an engraved leaf, a small engraved gear ' +
      'fragment, ragged torn paper edges, mixed clashing line weights, one faint accent colour on an eye, ' + CADRAGE,
  },
  // CRÉATURE/ABSTRAIT — baleine : corps gravé percé d'une fenêtre déchirée révélant une autre gravure.
  'baleine-ciel': {
    ouvert: COLLAGE_SUJET + 'a whale-being: the body cut from an old engraving, a torn rectangular window ' +
      'cut into its flank revealing a different pasted engraving of sea and sky behind it, thin strips of ' +
      'printed book text trailing off, ragged torn edges, layered overlapping cut pieces, one faint accent ' +
      'colour in the window, ' + CADRAGE,
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
  // Chaque tête a son médium propre : on remplace le bloc GRAVURE (terminaison
  // commune des prompts via CADRAGE) par le style de l'espèce.
  const style = STYLE[espece] ?? GRAVURE
  const medium = (p) => p.replace(GRAVURE, style)

  process.stdout.write(`· ${espece} (ouvert) … `)
  const ouvertBrut = await genererImage(medium(def.ouvert), falKey, { image_size: 'square_hd' })
  const ouvertPng = await sharp(ouvertBrut).resize(TAILLE, TAILLE).png().toBuffer()
  console.log('ok')

  const etats = [['ouvert', ouvertPng]]
  if (def.ferme) {
    process.stdout.write(`· ${espece} (fermé, inpainting aligné) … `)
    const masque = await genererMasque(def.masque)
    const fermePng = await remplir(ouvertPng, masque, medium(def.ferme), falKey)
    etats.push(['ferme', fermePng])
    console.log('ok')
  }

  for (const [etat, buf] of etats) {
    const detourePng = await (await detourerFondClair(buf)).resize(480, 480).png().toBuffer()
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

const args = process.argv.slice(2)
const especeSeule = args.find(a => !a.startsWith('--'))
if (especeSeule && !ESPECES[especeSeule]) {
  console.error(`✗ espèce inconnue : ${especeSeule}.  Choix : ${Object.keys(ESPECES).join(', ')}`)
  process.exit(1)
}

console.log('Génération des têtes de menu (médium par espèce) → public/tetes/<espèce>/')
const cibles = especeSeule ? { [especeSeule]: ESPECES[especeSeule] } : ESPECES
for (const [espece, def] of Object.entries(cibles)) {
  const outDir = join(__dirname, '..', 'public', 'tetes', espece)
  await mkdir(outDir, { recursive: true })
  try { await gen(espece, def, falKey, outDir) }
  catch (e) { console.log(`erreur : ${e.message}`) }
}
console.log('Terminé.')
