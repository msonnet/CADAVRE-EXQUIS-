#!/usr/bin/env node
/*
  planche.mjs — photographie une maquette à des instants choisis et en fait UNE planche.

    node planche.mjs <maquette.html> <sortie.png> [--t=0,400,800,1200] [--ambiance=lin] [--largeur=390] [--hauteur=844]
                     [--params="cas=atelier&accent=0"] [--echelle=0.5] [--colonnes=6] [--pleine]

  Chaque instant charge `maquette.html?t=<ms>&ambiance=…` : la maquette doit rendre
  l'image exacte de cet instant (`Temoin.enregistrer({ rendre(t) })`). `--t=fin` vaut la durée.
  Sans `--t`, une seule photo de l'état final (`reduit=1`). `--pleine` : la page entière.
*/
import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const [,, maquette, sortie, ...reste] = process.argv
if (!maquette || !sortie) { console.error('usage : planche.mjs <maquette.html> <sortie.png> [--t=…]'); process.exit(2) }
const opt = Object.fromEntries(reste.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true] }))
const largeur = Number(opt.largeur ?? 390), hauteur = Number(opt.hauteur ?? 844)
const echelle = Number(opt.echelle ?? 0.5), ambiance = opt.ambiance ?? 'lin'
const instants = opt.t ? String(opt.t).split(',') : [null]
const colonnes = Number(opt.colonnes ?? Math.min(instants.length, 6))
const extra = opt.params ? '&' + opt.params : ''

const dossier = mkdtempSync(join(tmpdir(), 'planche-'))
const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
const ctx = await b.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 2, locale: 'fr-FR', hasTouch: true, isMobile: true })
const page = await ctx.newPage()
const erreurs = []
page.on('pageerror', e => erreurs.push(String(e)))
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
const fichiers = []
for (const [i, t] of instants.entries()) {
  const temps = t === null ? 'reduit=1' : `t=${t === 'fin' ? 9e9 : t}`
  await page.goto(`file://${resolve(maquette)}?${temps}&ambiance=${ambiance}${extra}`)
  await page.waitForFunction(() => ['fige', 'pose'].includes(document.documentElement.dataset.temoin), null, { timeout: 8000 }).catch(() => erreurs.push(`instant ${t} : la maquette n'a pas signalé son rendu (data-temoin)`))
  await page.waitForTimeout(120)
  const f = join(dossier, `${String(i).padStart(3, '0')}.png`)
  await page.screenshot({ path: f, fullPage: !!opt.pleine })
  fichiers.push(f)
}
await b.close()

if (fichiers.length === 1) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', fichiers[0], '-vf', `scale=iw*${echelle}:-1`, sortie])
} else {
  const lignes = Math.ceil(fichiers.length / colonnes)
  const w = Math.round(largeur * 2 * echelle)
  // Chaque vignette porte son instant, en haut à gauche.
  const entrees = fichiers.flatMap(f => ['-i', f])
  const filtres = fichiers.map((_, i) => `[${i}]scale=${w}:-1,drawbox=x=0:y=0:w=92:h=22:color=black@0.72:t=fill,drawtext=text='${String(instants[i]).replace(/[^0-9a-z]/gi, '')} ms':x=5:y=5:fontsize=13:fontcolor=white[v${i}]`)
  const mise = fichiers.map((_, i) => `${(i % colonnes) * (w + 6)}_${Math.floor(i / colonnes)}*(h0+6)`.replace(/(\d+)\*\(h0\+6\)/, (_, n) => Array.from({ length: Number(n) }, () => 'h0+6').join('+') || '0')).join('|')
  const graphe = `${filtres.join(';')};${fichiers.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${fichiers.length}:layout=${mise}:fill=0x777777`
  try {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entrees, '-filter_complex', graphe, '-frames:v', '1', sortie])
  } catch {
    // Sans police pour `drawtext` : la planche sans étiquettes.
    const sans = fichiers.map((_, i) => `[${i}]scale=${w}:-1[v${i}]`).join(';') + `;${fichiers.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${fichiers.length}:layout=${mise}:fill=0x777777`
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...entrees, '-filter_complex', sans, '-frames:v', '1', sortie])
  }
  void lignes
}
rmSync(dossier, { recursive: true, force: true })
console.log(`${sortie} — ${fichiers.length} image(s)${instants[0] === null ? '' : ' : ' + instants.join(', ') + ' ms'}`)
if (erreurs.length) { console.log('ERREURS DE PAGE :\n  ' + [...new Set(erreurs)].join('\n  ')); process.exitCode = 1 }
