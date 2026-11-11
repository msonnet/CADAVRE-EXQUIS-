#!/usr/bin/env node
/*
  autonome.mjs — fait d'une maquette témoin UNE page qui tient seule : les
  polices du jeu (en données), les styles communs et le kit recopiés dedans.
  C'est cette page qu'on publie pour que l'auteur l'essaie sur son téléphone.

    node scripts/temoins/outils/autonome.mjs <maquette.html> <sortie.html> [--fragment]

  --fragment : sans <!doctype>, <html>, <head> ni <body>, et sans les deux
  balises <meta> du début — la forme qu'attend la publication d'une page, qui
  pose elle-même ce squelette. Le <title> reste en tête.

  La sortie pèse environ 700 Ko (les douze fichiers de police) : elle ne va pas
  dans le dépôt.
*/
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const [,, entree, sortie, ...options] = process.argv
if (!entree || !sortie) { console.error('usage : autonome.mjs <maquette.html> <sortie.html> [--fragment]'); process.exit(2) }
const dossier = dirname(resolve(entree))
const lire = chemin => readFileSync(resolve(dossier, chemin), 'utf8')

// Une feuille de style, ses polices changées en données.
function styleAutonome(chemin) {
  const base = dirname(resolve(dossier, chemin))
  return lire(chemin).replace(/url\('([^']+\.woff2)'\)/g, (_, f) =>
    `url('data:font/woff2;base64,${readFileSync(resolve(base, f)).toString('base64')}')`)
}

let html = readFileSync(entree, 'utf8')
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style>\n${styleAutonome(href)}\n</style>`)
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const code = lire(src)
  if (code.includes('</script')) throw new Error(`${src} contient « </script » : il fermerait la balise`)
  return `<script>\n${code}\n</script>`
})
if (options.includes('--fragment')) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<\/?html[^>]*>\s*/g, '')
    .replace(/<\/?head>\s*/g, '')
    .replace(/<\/?body>\s*/g, '')
    .replace(/<meta charset[^>]*>\s*/, '')
    .replace(/<meta name="viewport"[^>]*>\s*/, '')
}
writeFileSync(sortie, html)
console.log(`${sortie} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} Ko`)
