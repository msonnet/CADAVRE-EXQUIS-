#!/usr/bin/env node
/**
 * generer-tetes.mjs — génère les têtes d'animaux « gravure » des boutons du menu.
 *
 * Usage :
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs
 *   FAL_KEY=xxxxx node scripts/generer-tetes.mjs tigre   # une seule
 *
 * Produit public/tetes/{fourmi,papillon,tigre,elephant}.png — gravures
 * sépia sur papier vieilli, cadrage paysage (le bas reste sobre pour laisser
 * la place au cartouche du nom de mode). Le composant TeteCollage les pose en
 * fond ; si une image manque, il affiche un repli papier hachuré.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'tetes')

const GRAVURE =
  'antique copperplate intaglio engraving, dense cross-hatching and stippling, ' +
  'Max Ernst surrealist collage from "Une Semaine de Bonté", 19th-century natural-history plate, ' +
  'warm sepia ink on aged cream paper, museum specimen, ' +
  'perfectly frontal symmetrical view facing the camera directly, subject fills the frame, ' +
  'no text, no letters, no caption, no border, no frame'

const TETES = {
  // Cadavre Écrit — la fourmi, mandibules grand ouvertes (le texte logé dans le vide entre elles)
  fourmi:
    'monstrous ant head facing the camera perfectly frontally, symmetrical, ' +
    'mandibles spread wide open downward forming a clear V-shaped gap of dark empty space between them, ' +
    'two large faceted compound eyes flanking the head symmetrically, segmented antennae curving up and outward, ' + GRAVURE,
  // Cadavre Dessiné — la phalène vue de dessus, ailes grand ouvertes (le texte posé sur les ailes)
  papillon:
    'great moth viewed directly from above, wings fully spread flat and symmetrical like a pinned museum specimen, ' +
    'intricate radiating wing patterns, furred body and head centered between the wings, feathered antennae, ' + GRAVURE,
  // Mode en ligne — le tigre, gueule grand ouverte de face (le texte logé dans la bouche)
  tigre:
    'tiger head facing the camera perfectly frontally, symmetrical, ' +
    'jaws wide open vertically forming a dark open mouth gap with fangs visible on both sides, ' +
    'symmetrical facial stripes, fierce eyes, ' + GRAVURE,
  // Atelier — l'éléphant, trompe et oreilles déployées de face
  elephant:
    'elephant head facing the camera perfectly frontally, symmetrical, ' +
    'trunk raised and curled open at the tip forming a gap, both great ears unfurled wide, tusks visible, ' +
    'wrinkled hide, ' + GRAVURE,
}

async function gen(nom, prompt, falKey) {
  process.stdout.write(`· ${nom} … `)
  const r = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: 'square_hd',
      num_inference_steps: 32,
      guidance_scale: 4.0,
      safety_tolerance: 5,
      num_images: 1,
    }),
  })
  if (!r.ok) { console.log(`échec FLUX ${r.status}`); return false }
  const data = await r.json()
  const url = data.images?.[0]?.url
  if (!url) { console.log('pas d’image'); return false }
  const img = await fetch(url)
  const buf = Buffer.from(await img.arrayBuffer())
  await writeFile(join(OUT, `${nom}.png`), buf)
  console.log(`ok (${(buf.length / 1024).toFixed(0)} ko)`)
  return true
}

const falKey = process.env.FAL_KEY
if (!falKey) {
  console.error('✗ FAL_KEY manquante.  Usage : FAL_KEY=xxx node scripts/generer-tetes.mjs')
  process.exit(1)
}

await mkdir(OUT, { recursive: true })
const seul = process.argv[2]
const cibles = seul ? { [seul]: TETES[seul] } : TETES
if (seul && !TETES[seul]) {
  console.error(`✗ tête inconnue : ${seul}.  Choix : ${Object.keys(TETES).join(', ')}`)
  process.exit(1)
}

console.log(`Génération des têtes gravure → public/tetes/`)
for (const [nom, prompt] of Object.entries(cibles)) {
  try { await gen(nom, prompt, falKey) } catch (e) { console.log(`erreur : ${e.message}`) }
}
console.log('Terminé.')
