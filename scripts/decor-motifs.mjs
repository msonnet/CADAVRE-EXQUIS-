/**
 * decor-motifs.mjs — fabrique les motifs du jour (public/decor/*.webp)
 * depuis les gravures de resources/gravures/ (sources et droits :
 * resources/gravures/SOURCES.md).
 *
 *   node scripts/decor-motifs.mjs
 *
 * ── Découper ──────────────────────────────────────────────────────────────
 *
 * Trois façons, selon la gravure :
 * - un DISQUE dont on trouve l'axe (le phénakistiscope : l'étiquette jaune
 *   du centre, pas le milieu du contour — sinon il tournerait en voilant) ;
 * - un CERCLE donné (la lune de Doppelmayr) ;
 * - par CONTRASTE sur le papier (la carpe, la clef) : ce qui s'écarte du
 *   papier, épaissi puis aminci pour relier les traits, les trous comblés,
 *   la plus grande forme seule ; des zones peuvent être effacées avant
 *   (le croquis de profil au-dessus de la carpe) ;
 * - en BANDE effilée (le nuage) : l'encre fait l'opacité.
 *
 * ── Le bord découpé ───────────────────────────────────────────────────────
 *
 * Tous les motifs (sauf le nuage, qui est une vapeur) reçoivent la même
 * marge de papier, au contour à peine irrégulier : coupés aux ciseaux et
 * collés sur la page, comme les coupures d'Ernst. C'est ce geste commun
 * qui fait des sept motifs une collection plutôt que sept images.
 *
 * Le script affiche la couleur de ce papier : le plafond de contraste des
 * ambiances sombres la lit (`papier` des motifs, src/reve/collages.tsx).
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { statSync } from 'node:fs'

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = (f) => resolve(RACINE, 'resources/gravures', f)
const SORTIE = (f) => resolve(RACINE, 'public/decor', f)

/** Le papier du bord découpé. */
export const PAPIER_DECOUPE = [246, 240, 226]

const MOTIFS = {
  phenakistiscope: { src: 'phenakistiscope-chats-ane-v1830.jpg', disque: true, largeur: 480 },
  'lune': { src: 'tabula-selenographica-1707.jpg', box: [30, 245, 950, 950], cercle: [504, 718, 462], largeur: 480 },
  'nuage': { src: 'tabula-selenographica-1707.jpg', box: [360, 201, 240, 25], bande: true, largeur: 450, sansBord: true },
  'carpe': { src: 'carpe-bloch-1785.jpg', box: [96, 95, 1759, 935], ecart: 38, fermer: 3, effacer: [[140, 90, 450, 240]], largeur: 540 },
  'clef': { src: 'clef-grotesques-1635.jpg', box: [150, 60, 1320, 4860], lumMax: 125, fermer: 3, hauteur: 560 },
}

/** On découpe à 2,5 fois la taille finale, puis on réduit : traits nets, lettres voisines non soudées. */
const TRAVAIL = 2.5

const voisinsDe = (W, H) => (p) => { const i = p % W, j = (p / W) | 0; return [i > 0 ? p - 1 : -1, i < W - 1 ? p + 1 : -1, j > 0 ? p - W : -1, j < H - 1 ? p + W : -1] }

/** Le disque viennois : le contour, puis l'axe (l'étiquette jaune). */
async function disque(cfg) {
  const { data, info } = await sharp(SOURCE(cfg.src)).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info
  const px = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]] }
  let x0 = W, x1 = 0, y0 = H, y1 = 0
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) { const [r, , b] = px(x, y); if (r - b > 14) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } }
  const rayon = Math.min(x1 - x0, y1 - y0) / 2
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = 0, sy = 0, n = 0
  const f = rayon * 0.15
  for (let y = Math.round(cy - f); y < cy + f; y++) for (let x = Math.round(cx - f); x < cx + f; x++) { const [r, g, b] = px(x, y); if (r > 190 && g > 150 && b < 110 && r - b > 110) { sx += x; sy += y; n++ } }
  if (n > 200) { cx = sx / n; cy = sy / n }
  const r = rayon - 4, cote = Math.round(2 * r), C = Math.round(cfg.largeur * TRAVAIL)
  const carre = await sharp(SOURCE(cfg.src)).toColourspace('srgb').removeAlpha()
    .extract({ left: Math.round(cx - r), top: Math.round(cy - r), width: cote, height: cote }).resize(C, C).raw().toBuffer()
  const alpha = new Float32Array(C * C), R = C / 2
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const i = (y * C + x) * 3, d = Math.hypot(x + 0.5 - R, y + 0.5 - R)
    const fente = carre[i] - carre[i + 2] < 6 && d > R * 0.8
    alpha[y * C + x] = fente ? 0 : Math.max(0, Math.min(1, R - 1 - d))
  }
  return { W: C, H: C, data: carre, alpha }
}

/** Le cas général : cadre, puis cercle, bande ou contraste. */
async function decouper(cfg) {
  const [bx, by, bw, bh] = cfg.box
  const k = TRAVAIL * (cfg.largeur ? cfg.largeur / bw : cfg.hauteur / bh)
  const W = Math.round(bw * k), H = Math.round(bh * k)
  const { data } = await sharp(SOURCE(cfg.src)).toColourspace('srgb').removeAlpha()
    .extract({ left: bx, top: by, width: bw, height: bh }).resize(W, H).raw().toBuffer({ resolveWithObject: true })
  const px = (p) => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]]
  const lum = (p) => 0.299 * data[p * 3] + 0.587 * data[p * 3 + 1] + 0.114 * data[p * 3 + 2]
  const bord = []
  for (let i = 0; i < W; i++) bord.push(px(i), px((H - 1) * W + i))
  for (let j = 0; j < H; j++) bord.push(px(j * W), px(j * W + W - 1))
  const med = [0, 1, 2].map(c => bord.map(q => q[c]).sort((a, b) => a - b)[Math.floor(bord.length / 2)])
  for (const [ex, ey, ew, eh] of cfg.effacer ?? []) {
    for (let j = Math.max(0, Math.round((ey - by) * k)); j < Math.min(H, Math.round((ey - by + eh) * k)); j++)
      for (let i = Math.max(0, Math.round((ex - bx) * k)); i < Math.min(W, Math.round((ex - bx + ew) * k)); i++)
        for (let c = 0; c < 3; c++) data[(j * W + i) * 3 + c] = med[c]
  }
  const alpha = new Float32Array(W * H)
  if (cfg.cercle) {
    const [cx, cy, r] = cfg.cercle
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const d = Math.hypot((i + 0.5) / k + bx - cx, (j + 0.5) / k + by - cy)
      alpha[j * W + i] = Math.max(0, Math.min(1, (r - d) * k))
    }
  } else if (cfg.bande) {
    let lmin = 255, lmax = 0
    for (let p = 0; p < W * H; p++) { lmin = Math.min(lmin, lum(p)); lmax = Math.max(lmax, lum(p)) }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const p = j * W + i
      const encre = Math.pow((lmax - lum(p)) / Math.max(1, lmax - lmin), 0.7)
      alpha[p] = Math.min(1, encre * 1.6) * Math.min(1, Math.min(i, W - 1 - i) / (W * 0.28)) * Math.min(1, Math.min(j, H - 1 - j) / (H * 0.38))
    }
  } else {
    const voisins = voisinsDe(W, H)
    let m = new Uint8Array(W * H)
    for (let p = 0; p < W * H; p++) { const [r, g, b] = px(p); m[p] = cfg.lumMax ? (lum(p) < cfg.lumMax ? 1 : 0) : (Math.hypot(r - med[0], g - med[1], b - med[2]) > cfg.ecart ? 1 : 0) }
    const dilater = (a) => { const b = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) if (a[p] || voisins(p).some(v => v >= 0 && a[v])) b[p] = 1; return b }
    const eroder = (a) => { const b = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) if (a[p] && voisins(p).every(v => v >= 0 && a[v])) b[p] = 1; return b }
    for (let t = 0; t < cfg.fermer; t++) m = dilater(m)
    for (let t = 0; t < cfg.fermer; t++) m = eroder(m)
    const dehors = new Uint8Array(W * H); const pile = []
    for (let i = 0; i < W; i++) pile.push(i, (H - 1) * W + i)
    for (let j = 0; j < H; j++) pile.push(j * W, j * W + W - 1)
    while (pile.length) { const p = pile.pop(); if (dehors[p] || m[p]) continue; dehors[p] = 1; for (const v of voisins(p)) if (v >= 0) pile.push(v) }
    for (let p = 0; p < W * H; p++) m[p] = dehors[p] ? 0 : 1
    const etiq = new Int32Array(W * H); const tailles = [0]
    for (let p0 = 0; p0 < W * H; p0++) {
      if (!m[p0] || etiq[p0]) continue
      const n = tailles.length; let t = 0; const q = [p0]; etiq[p0] = n
      while (q.length) { const p = q.pop(); t++; for (const v of voisins(p)) if (v >= 0 && m[v] && !etiq[v]) { etiq[v] = n; q.push(v) } }
      tailles.push(t)
    }
    const plus = tailles.indexOf(Math.max(...tailles))
    const flou = await sharp(Buffer.from(m.map((_, p) => etiq[p] === plus ? 255 : 0)), { raw: { width: W, height: H, channels: 1 } }).blur(0.7).extractChannel(0).raw().toBuffer()
    for (let p = 0; p < W * H; p++) alpha[p] = flou[p] / 255
  }
  return { W, H, data, alpha }
}

/** Le bord découpé : une marge de papier, au contour à peine irrégulier. */
function decoupe({ W, H, data, alpha }, marge) {
  // On agrandit la toile pour que la marge tienne.
  const G = marge + 3, W2 = W + 2 * G, H2 = H + 2 * G
  const a2 = new Float32Array(W2 * H2), d2 = Buffer.alloc(W2 * H2 * 3)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const p = j * W + i, q = (j + G) * W2 + (i + G)
    a2[q] = alpha[p]; d2[q * 3] = data[p * 3]; d2[q * 3 + 1] = data[p * 3 + 1]; d2[q * 3 + 2] = data[p * 3 + 2]
  }
  // Distance au sujet, par couches successives.
  const voisins = voisinsDe(W2, H2)
  const dist = new Float32Array(W2 * H2).fill(Infinity)
  let front = []
  for (let p = 0; p < W2 * H2; p++) if (a2[p] > 0.5) { dist[p] = 0; front.push(p) }
  for (let t = 1; t <= marge + 2 && front.length; t++) {
    const suivant = []
    for (const p of front) for (const v of voisins(p)) if (v >= 0 && dist[v] === Infinity) { dist[v] = t; suivant.push(v) }
    front = suivant
  }
  // Le dehors : ce que l'on atteint depuis le bord de la toile sans traverser le sujet.
  const dehors = new Uint8Array(W2 * H2); const pile = []
  for (let i = 0; i < W2; i++) pile.push(i, (H2 - 1) * W2 + i)
  for (let j = 0; j < H2; j++) pile.push(j * W2, j * W2 + W2 - 1)
  while (pile.length) { const p = pile.pop(); if (dehors[p] || a2[p] > 0.5) continue; dehors[p] = 1; for (const v of voisins(p)) if (v >= 0) pile.push(v) }
  const out = Buffer.alloc(W2 * H2 * 4)
  for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
    const p = j * W2 + i
    // Les ciseaux tremblent un peu : ± 1 px le long du contour.
    const r = marge + 0.9 * (Math.sin(i * 0.083) + Math.sin(j * 0.071 + 1.7))
    const papier = dehors[p] ? Math.max(0, Math.min(1, r + 0.5 - dist[p])) : 0
    const a = a2[p]
    for (let c = 0; c < 3; c++) out[p * 4 + c] = Math.round(d2[p * 3 + c] * a + PAPIER_DECOUPE[c] * (1 - a))
    out[p * 4 + 3] = Math.round(255 * Math.max(a, papier))
  }
  return { W: W2, H: H2, out }
}

for (const [nom, cfg] of Object.entries(MOTIFS)) {
  const brut = cfg.disque ? await disque(cfg) : await decouper(cfg)
  let W, H, out
  if (cfg.sansBord) {
    ({ W, H } = brut); out = Buffer.alloc(W * H * 4)
    for (let p = 0; p < W * H; p++) { for (let c = 0; c < 3; c++) out[p * 4 + c] = brut.data[p * 3 + c]; out[p * 4 + 3] = Math.round(brut.alpha[p] * 255) }
  } else {
    ({ W, H, out } = decoupe(brut, Math.max(10, Math.round(Math.max(brut.W, brut.H) * 0.011))))
  }
  const final = cfg.largeur ? { width: Math.round(W / TRAVAIL) } : { height: Math.round(H / TRAVAIL) }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(final).webp({ quality: 84, alphaQuality: 90 }).toFile(SORTIE(`${nom}.webp`))
  console.log(`${nom.padEnd(16)} ${final.width ?? '…'}×${final.height ?? '…'}  ${(statSync(SORTIE(`${nom}.webp`)).size / 1024).toFixed(0)} Ko`)
}
console.log(`papier du bord découpé : #${PAPIER_DECOUPE.map(v => v.toString(16).padStart(2, '0')).join('')}`)
