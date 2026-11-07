/**
 * decor-phenakistiscope.mjs — fabrique `public/decor/phenakistiscope.webp`
 * depuis le scan du disque viennois (resources/gravures/SOURCES.md).
 *
 *   node scripts/decor-phenakistiscope.mjs
 *
 * ── Ce que fait le script ─────────────────────────────────────────────────
 *
 * 1. Il trouve le disque : le papier crème a plus de rouge que de bleu, le
 *    fond gris-bleu du scan l'inverse.
 * 2. Il trouve l'AXE : l'étiquette jaune du centre (« Jos. Berman,
 *    Kunsthändler in Wien »), et non le milieu du contour. Le disque tourne
 *    autour de ce point dans le jeu : centré sur le contour, un scan
 *    légèrement ovale ou décalé tournerait en voilant.
 * 3. Il découpe un carré centré sur l'axe, rend transparents le dehors du
 *    disque et ses douze fentes (du fond gris, près du bord), et écrit un
 *    WebP de 480 px — trois fois la taille affichée sur l'accueil.
 *
 * Il affiche aussi la couleur du papier mesurée : c'est elle que lit le
 * plafond de contraste (`PAPIER` du symbole, src/reve/collages.tsx).
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(RACINE, 'resources/gravures/phenakistiscope-chats-ane-v1830.jpg')
const SORTIE = resolve(RACINE, 'public/decor/phenakistiscope.webp')
const COTE = 480

const { data, info } = await sharp(SOURCE).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info
const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]] }

// 1. Le contour.
let x0 = W, x1 = 0, y0 = H, y1 = 0
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const [r, , b] = px(x, y)
  if (r - b > 14) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
}
const rayon = Math.min(x1 - x0, y1 - y0) / 2
let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2

// 2. L'axe : le centre de l'étiquette jaune, cherchée près du milieu.
let sx = 0, sy = 0, n = 0
const fenetre = rayon * 0.15
for (let y = Math.round(cy - fenetre); y < cy + fenetre; y++) for (let x = Math.round(cx - fenetre); x < cx + fenetre; x++) {
  const [r, g, b] = px(x, y)
  if (r > 190 && g > 150 && b < 110 && r - b > 110) { sx += x; sy += y; n++ }
}
if (n > 200) {
  console.log(`axe : décalé de ${(sx / n - cx).toFixed(1)}, ${(sy / n - cy).toFixed(1)} px du milieu du contour (${n} px jaunes)`)
  cx = sx / n; cy = sy / n
}
const r = rayon - 4

// 3. Le carré, la transparence, le WebP.
const cote = Math.round(2 * r)
const carre = await sharp(SOURCE)
  .extract({ left: Math.round(cx - r), top: Math.round(cy - r), width: cote, height: cote })
  .resize(COTE, COTE).raw().toBuffer()
const out = Buffer.alloc(COTE * COTE * 4)
const R = COTE / 2
const papiers = []
for (let y = 0; y < COTE; y++) for (let x = 0; x < COTE; x++) {
  const i = (y * COTE + x) * 3, o = (y * COTE + x) * 4
  const d = Math.hypot(x + 0.5 - R, y + 0.5 - R)
  const bord = Math.max(0, Math.min(1, R - 1 - d))
  const [rr, gg, bb] = [carre[i], carre[i + 1], carre[i + 2]]
  const fente = rr - bb < 6 && d > R * 0.8
  out[o] = rr; out[o + 1] = gg; out[o + 2] = bb
  out[o + 3] = fente ? 0 : Math.round(255 * bord)
  // Le papier nu : la bande entre le bord et les figures.
  if (d > R * 0.9 && d < R * 0.95 && !fente) papiers.push([rr, gg, bb])
}
await sharp(out, { raw: { width: COTE, height: COTE, channels: 4 } }).webp({ quality: 84, alphaQuality: 90 }).toFile(SORTIE)

papiers.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]))
const med = papiers[Math.floor(papiers.length * 0.6)]
const hex = '#' + med.map(v => v.toString(16).padStart(2, '0')).join('')
const { size } = await import('node:fs').then(fs => fs.statSync(SORTIE))
console.log(`écrit ${SORTIE.replace(RACINE + '/', '')} — ${COTE} px, ${(size / 1024).toFixed(0)} Ko ; papier mesuré ${hex}`)
