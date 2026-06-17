/**
 * _gravure.mjs — socle commun de la génération d'illustrations IA
 * (generer-tetes.mjs) : appel FLUX et détourage par luminance. Un seul jeu
 * d'images en gravure monochrome s'adapte ensuite aux 5 ambiances du jeu via
 * le filtre invert() (cf. Decor.tsx, TeteCollage.tsx).
 */

import sharp from 'sharp'

export const ENCRE = { r: 0x1a, g: 0x14, b: 0x10 } // identique à collages.tsx
export const LUEUR = { r: 0xff, g: 0xf3, b: 0xda } // ton chaud, pour les calques 'light' (blend screen)
// luminance en dessous de laquelle un pixel est considéré "encre pleine"
export const SEUIL_NOIR = 60
// luminance au-dessus de laquelle un pixel est considéré "papier vide" → transparent
export const SEUIL_BLANC = 215

export const GRAVURE =
  'antique copperplate intaglio engraving, dense fine cross-hatching and stippling for tonal depth, ' +
  'monochrome sepia-black ink only, perfectly flat uniform pale cream paper background with absolutely ' +
  'no vignette and no gradient behind the subject, museum natural-history plate, ' +
  '19th-century engraving precision, no text, no letters, no caption, no border, no frame, no color'

// Variante COULEUR « mélange de médiums » (cf. detourerFondClair) : la même
// chimère, mais rendue comme un vrai collage surréaliste — gravure rehaussée à
// l'aquarelle, papiers découpés, fragments de photo ancienne, couleurs vives.
// Fond papier clair et uniforme imposé pour que le détourage couleur isole
// proprement le sujet. Descriptions positives uniquement (un modèle de
// diffusion peint souvent un concept même nié).
export const MIXTE =
  'surrealist mixed-media collage illustration in the spirit of Max Ernst and Dada, ' +
  'hand-coloured antique engraving combined with loose watercolour washes, torn cut-paper shapes ' +
  'and faded vintage photograph fragments, bold vivid saturated colours, visible paper grain, ' +
  'playful dreamlike storybook plate, perfectly flat uniform pale cream paper background with ' +
  'absolutely no vignette and no gradient behind the subject, no text, no letters, no caption, ' +
  'no border, no frame'

// Saturation (max-min sur RVB) sous laquelle un pixel TRÈS clair est lu comme
// fond papier (donc rendu transparent) par detourerFondClair. Assez bas pour
// préserver les aplats pâles mais colorés du sujet (aquarelles claires).
export const SAT_FOND = 30

export async function genererImage(prompt, falKey, opts = {}) {
  const r = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: opts.image_size ?? 'portrait_4_3',
      num_inference_steps: 32,
      guidance_scale: 4.0,
      safety_tolerance: 5,
      num_images: 1,
    }),
  })
  if (!r.ok) throw new Error(`FLUX ${r.status}`)
  const data = await r.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error('pas d’image renvoyée')
  const img = await fetch(url)
  return Buffer.from(await img.arrayBuffer())
}

/**
 * Détoure par luminance et fige la couleur sur l'encre de référence (ou la
 * lueur, pour les calques pensés pour mix-blend-mode: screen).
 * - encre (par défaut) : le NOIR est la matière → alpha = densité d'encre.
 * - lumière : le CLAIR est la matière → alpha = intensité lumineuse.
 * Retourne un objet sharp (non encore encodé), à resize/encoder par l'appelant.
 */
export async function detourerParLuminance(buf, { lumiere = false } = {}) {
  const teinte = lumiere ? LUEUR : ENCRE
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  const { data } = await img.raw().toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    let alpha
    if (lum <= SEUIL_NOIR) alpha = lumiere ? 0 : 255
    else if (lum >= SEUIL_BLANC) alpha = lumiere ? 255 : 0
    else {
      const t = (lum - SEUIL_NOIR) / (SEUIL_BLANC - SEUIL_NOIR)
      alpha = Math.round(255 * (lumiere ? t : 1 - t))
    }
    out[o] = teinte.r
    out[o + 1] = teinte.g
    out[o + 2] = teinte.b
    out[o + 3] = alpha
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
}

/**
 * Détourage pour images COLORÉES (mixed-media) : retire le fond papier clair
 * (très lumineux ET quasi neutre) en PRÉSERVANT les couleurs du sujet — les
 * RVB d'origine sont conservés tels quels, seul l'alpha est calculé. À
 * utiliser à la place de detourerParLuminance pour les têtes en couleur, puis
 * passer le résultat à decouperPapier (qui pose la marge de papier déchirée ;
 * les clairs enclavés dans le sujet laisseront voir le papier dessous).
 */
export async function detourerFondClair(buf) {
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  const { data } = await img.raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const sat = Math.max(r, g, b) - Math.min(r, g, b)
    const estFond = lum >= SEUIL_BLANC && sat <= SAT_FOND
    out[o] = r; out[o + 1] = g; out[o + 2] = b
    out[o + 3] = estFond ? 0 : 255
  }
  return sharp(out, { raw: { width, height, channels: 4 } })
}

// Carton de papier crème — identique à PAPIER (src/components/Papier.tsx) ;
// dupliqué ici car ce script tourne hors du bundle Vite (pas d'import .tsx).
const PAPIER = { r: 0xf6, g: 0xea, b: 0xd0 }

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)))

// sharp promeut un raw mono-canal en 3 canaux après blur()/resize() (espace
// sRGB par défaut) : relire tel quel et indexer en width*height décalerait
// tout (on ne lirait qu'un tiers de l'image en RVB entrelacé). Ce helper
// relit toujours en 1 canal réel (1er canal de chaque pixel), quel que soit
// le nombre de canaux renvoyé.
async function rawMono(pipeline, N) {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })
  if (info.channels === 1) return data
  const out = Buffer.alloc(N)
  for (let i = 0; i < N; i++) out[i] = data[i * info.channels]
  return out
}

// PRNG déterministe (mulberry32) : le bruit du bord déchiré doit être
// REPRODUCTIBLE — sinon deux états d'une même bête (tigre ouvert/fermé,
// fondus l'un dans l'autre) auraient des bords arrachés différents qui
// frémiraient pendant le fondu. Une graine fixe par défaut → bord identique
// d'un état à l'autre et d'une regénération à l'autre.
function mulberry32(graine) {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Découpe « papier déchiré » collée au plus près du sujet : au lieu d'un
 * grand carton rectangulaire posé derrière la gravure (qui donne un effet
 * « rectangle avec un dessin dedans »), on étend l'alpha de l'encre vers
 * l'extérieur d'une marge irrégulière (bruit basse résolution agrandi en
 * douceur, jamais un cercle parfait) et on remplit cette marge d'un papier
 * crème — exactement comme une vraie découpe aux ciseaux dans un magazine,
 * qui suit la silhouette du sujet plutôt qu'un cadre. Le bord obtenu sert
 * lui-même de masque CSS (drop-shadow) côté TeteCollage.tsx : plus besoin de
 * carton séparé derrière l'image.
 */
export async function decouperPapier(buf, { marge = 16, dechirure = 18, graine = 1 } = {}) {
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
  const { data } = await img.raw().toBuffer({ resolveWithObject: true })
  const N = width * height

  // 1) silhouette PLEINE par remplissage de fond depuis le pourtour.
  // Une gravure tonale n'a pas d'aplat : son alpha est la carte des tons
  // (l'encre dense est opaque, les zones claires — reflets, fourrure blanche,
  // fond — sont transparentes). Seuiller l'alpha donnerait donc une forme
  // trouée (le centre clair du sujet lu comme « dehors »). On inonde plutôt
  // le fond depuis les bords du cadre en ne traversant que des pixels
  // transparents (l'encre fait barrière) : tout ce qui n'est PAS atteint —
  // y compris les clairs ENCLAVÉS dans le sujet, cernés par le trait — est le
  // sujet. On obtient ainsi une silhouette pleine, seule base correcte pour
  // une marge de papier qui épouse le contour.
  const SEUIL_A = 10
  const fond = new Uint8Array(N) // 1 = fond relié au bord
  const pile = []
  const pousser = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const i = y * width + x
    if (fond[i] || data[i * 4 + 3] > SEUIL_A) return // déjà vu ou pixel d'encre = frontière
    fond[i] = 1
    pile.push(i)
  }
  for (let x = 0; x < width; x++) { pousser(x, 0); pousser(x, height - 1) }
  for (let y = 0; y < height; y++) { pousser(0, y); pousser(width - 1, y) }
  while (pile.length) {
    const i = pile.pop()
    const x = i % width, y = (i / width) | 0
    pousser(x - 1, y); pousser(x + 1, y); pousser(x, y - 1); pousser(x, y + 1)
  }
  const silhouetteBrute = Buffer.alloc(N)
  for (let i = 0; i < N; i++) silhouetteBrute[i] = fond[i] ? 0 : 255

  // 1bis) débruitage (flou court + seuil au point milieu = ouverture/fermeture
  // morphologique douce) : efface les protubérances et fentes plus fines que
  // ~3px — les vibrisses et les franges de fourrure que le remplissage a
  // laissées en peigne au bas du sujet, qui donneraient sinon une marge de
  // papier en stries. La gravure elle-même (posée plus tard par-dessus) garde
  // ses vibrisses ; seule la silhouette de PAPIER est lissée.
  const lisse = await rawMono(sharp(silhouetteBrute, { raw: { width, height, channels: 1 } }).blur(3), N)
  const silhouetteLisse = Buffer.alloc(N)
  for (let i = 0; i < N; i++) silhouetteLisse[i] = lisse[i] > 127 ? 255 : 0

  // 1ter) on ne garde que la plus grande composante connexe : le sujet est une
  // seule masse pleine, donc tout fragment détaché (lignes de sol/d'ombre que
  // le modèle a parfois dessinées, copeaux isolés) est du bruit — sinon il
  // recevrait sa propre marge de papier en stries dans les coins bas.
  const silhouette = Buffer.alloc(N)
  {
    const label = new Int32Array(N).fill(-1)
    const file = new Int32Array(N)
    let meilleurDebut = -1, meilleureTaille = 0
    for (let s = 0; s < N; s++) {
      if (silhouetteLisse[s] === 0 || label[s] !== -1) continue
      let tete = 0, queue = 0
      file[queue++] = s; label[s] = s
      while (tete < queue) {
        const i = file[tete++]
        const x = i % width, y = (i / width) | 0
        const voisins = [i - 1, i + 1, i - width, i + width]
        if (x === 0) voisins[0] = -1
        if (x === width - 1) voisins[1] = -1
        if (y === 0) voisins[2] = -1
        if (y === height - 1) voisins[3] = -1
        for (const v of voisins) {
          if (v < 0 || silhouetteLisse[v] === 0 || label[v] !== -1) continue
          label[v] = s; file[queue++] = v
        }
      }
      if (queue > meilleureTaille) { meilleureTaille = queue; meilleurDebut = s }
    }
    for (let i = 0; i < N; i++) silhouette[i] = label[i] === meilleurDebut ? 255 : 0
  }

  // 2) flou large de la silhouette pleine = approximation de « distance au
  // bord » : seuillée bas (cf. étape 4, sous le point milieu 127), elle place
  // le contour retenu à l'EXTÉRIEUR du sujet — c'est ce débord qui forme la
  // marge de papier, et non un rétrécissement.
  const blurred = await rawMono(sharp(silhouette, { raw: { width, height, channels: 1 } }).blur(Math.max(0.3, marge)), N)

  // 3) bruit basse résolution ré-agrandi en douceur : silhouette de la marge
  // jamais lisse, jamais répétitive (chaque tirage diffère légèrement).
  const NLOW = 28
  const noiseLow = Buffer.alloc(NLOW * NLOW)
  const rng = mulberry32(graine)
  for (let i = 0; i < noiseLow.length; i++) noiseLow[i] = Math.floor(rng() * 255)
  const noise = await rawMono(sharp(noiseLow, { raw: { width: NLOW, height: NLOW, channels: 1 } }).resize(width, height, { kernel: 'cubic' }), N)

  // 4) seuil du flou perturbé par le bruit → bord déchiré (pas un simple
  // anneau concentrique : le bruit avance ou recule le bord pixel à pixel).
  const seuilBase = 30
  const paperMaskRaw = Buffer.alloc(N)
  for (let i = 0; i < N; i++) {
    const jitter = (noise[i] - 128) * (dechirure / 128)
    paperMaskRaw[i] = blurred[i] > (seuilBase - jitter) ? 255 : 0
  }

  // 5) anti-alias léger du bord déchiré (sinon escalier de pixels visible).
  const paperMask = await rawMono(sharp(paperMaskRaw, { raw: { width, height, channels: 1 } }).blur(0.8), N)

  // 6) carton crème avec un grain léger (même bruit, juste atténué), alpha
  // = la marge déchirée calculée ci-dessus.
  const paperLayer = Buffer.alloc(N * 4)
  for (let i = 0; i < N; i++) {
    const o = i * 4
    const grain = (noise[i] - 128) * 0.07
    paperLayer[o] = clamp255(PAPIER.r + grain)
    paperLayer[o + 1] = clamp255(PAPIER.g + grain)
    paperLayer[o + 2] = clamp255(PAPIER.b + grain)
    paperLayer[o + 3] = paperMask[i]
  }

  // 7) la gravure d'origine (son alpha d'encre propre) posée par-dessus le
  // papier — l'encre la plus claire (hachures fines) laisse deviner le
  // papier dessous, comme une vraie gravure imprimée sur un support.
  return sharp(paperLayer, { raw: { width, height, channels: 4 } })
    .composite([{ input: data, raw: { width, height, channels: 4 }, blend: 'over' }])
}
