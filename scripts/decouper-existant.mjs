#!/usr/bin/env node
/**
 * decouper-existant.mjs — applique decouperPapier() (cf. _gravure.mjs) aux
 * têtes déjà générées, sans rappeler FLUX : les webp existants ont déjà un
 * alpha d'encre propre (detourerParLuminance), il suffit de leur ajouter la
 * marge de papier déchirée. Usage ponctuel suite au changement de détourage
 * (carton rectangulaire → découpe collée à la silhouette).
 *
 * Usage : node scripts/decouper-existant.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decouperPapier } from './_gravure.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const FICHIERS = [
  'elephant/ouvert.webp',
  'papillon/ouvert.webp',
  'tigre/ouvert.webp',
  'tigre/ferme.webp',
]

for (const rel of FICHIERS) {
  const p = join(__dirname, '..', 'public', 'tetes', rel)
  const buf = await readFile(p)
  const decoupe = await decouperPapier(buf)
  const out = await decoupe.webp({ quality: 72, alphaQuality: 80, effort: 6 }).toBuffer()
  await writeFile(p, out)
  console.log(`✓ ${rel} (${(out.length / 1024).toFixed(0)} ko)`)
}
console.log('Terminé.')
