/**
 * L'affiche de partage — sa grille, et ce qu'elle dit à qui la reçoit.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Mesuré en générant l'affiche dans Chromium (1080 × 1920) :
 *
 * - Avec une illustration, le poème était posé dans 520–820 et l'image
 *   SOUS lui dans 880–1860 : un poème de trois vers entrait dans le
 *   passe-partout, un long poème courait sous l'image, et la marque
 *   « CADAVRE EXQUIS » s'imprimait sur l'illustration.
 * - L'invitation était tracée à y = 1888, l'adresse à y = 1882 : deux
 *   lignes l'une sur l'autre, illisibles, et toutes deux sur le filet du
 *   cadre (1880).
 * - Toute la signature vivait entre 1770 et 1882, l'en-tête à 192 et 248.
 *   C'est exactement ce qu'une story recouvre : la barre de progression et
 *   le nom du compte en haut, le champ de réponse en bas — environ 250 px
 *   de chaque côté sur 1920. Le « N° 488 » et l'adresse partaient sous
 *   l'interface d'Instagram.
 * - Un poème d'une ligne, centré dans 360–1560, laissait 600 px de papier
 *   vide sous le vers.
 *
 * ── La grille ─────────────────────────────────────────────────────────────
 *
 * Tout ce qui se lit tient entre 250 et 1670. Le cadre, lui, reste au bord :
 * c'est un ornement, il peut passer sous l'interface sans rien perdre. Les
 * ordonnées sont fixes pour l'en-tête, l'invitation et la marque ; le
 * contenu se compose dans ce qui reste et se pose au TIERS OPTIQUE — un
 * bloc centré géométriquement paraît tomber.
 *
 * Avec une illustration, l'image vient d'abord, le poème dessous comme la
 * légende d'une planche. Le poème se mesure en premier et l'image prend le
 * reste, jamais moins de `IMAGE_MIN` : au-delà, le poème passe à un corps
 * plus petit, puis se coupe sur « […] ».
 * La lettrine cède alors sa place à l'image : sous une planche, une
 * capitale de 240 px ferait un second titre, et c'est 200 px d'image en moins.
 *
 * La vidéo suit la même grille : son poème se compose dans la même zone,
 * sa marque et son invitation tombent aux mêmes ordonnées.
 *
 * Une seule importation, `tr` : la géométrie se mesure seule, avec une
 * fonction de mesure du texte fournie par l'appelant (le canevas en vrai,
 * une approximation dans les tests).
 */

import { tr } from '../i18n'

export const STORY_W = 1080
export const STORY_H = 1920
const MARGE = 96
export const ZONE_W = STORY_W - MARGE * 2

/** Les bandes que l'interface d'une story recouvre. */
export const ZONE_SURE = { haut: 250, bas: STORY_H - 250 } as const

/** Les ordonnées fixes (lignes de base), toutes dans la zone sûre. */
export const Y = {
  etoile: 300,
  numero: 344,
  contenuHaut: 396,
  contenuBas: 1428,
  invitation: 1500,
  filetMarque: 1546,
  nomMarque: 1596,
  plume: 1622,
  lien: 1660,
} as const

/** Le passe-partout autour d'une image, de chaque côté. */
export const PASSE = 28
/** Une illustration ne descend jamais sous cette hauteur. */
export const IMAGE_MIN = 460
/** Part de l'espace libre laissée AU-DESSUS du bloc : le tiers optique. */
const OPTIQUE = 0.38

export type Mesure = (texte: string, police: string) => number

/** Une bande verticale occupée — ce que le test de recouvrement compare. */
export interface Boite { nom: string; haut: number; bas: number }

export const policeTitre = (s: number) => `800 italic ${s}px 'Bodoni Moda', Georgia, serif`
export const policeCorps = (s: number) => `italic ${s}px 'Playfair Display', Georgia, serif`
export const policeLecture = "italic 36px 'Playfair Display', Georgia, serif"
const LETTRINE = 240
const LETTRINE_VISUEL = LETTRINE * 0.72
// Le blanc sous la lettrine, jusqu'au haut des hampes du premier vers.
// L'ancienne mise en page comptait 28 px PLUS une interligne entière ; la
// grille, qui pose le vers à la hauteur de ses hampes, n'en gardait que 28,
// et le « L » semblait posé sur « la cire ». 60 rend le blanc d'origine.
const LETTRINE_ECART = 60

export function couper(texte: string, max: number, police: string, mesurer: Mesure): string[] {
  const lignes: string[] = []
  let courant = ''
  for (const mot of texte.split(' ')) {
    const essai = courant ? `${courant} ${mot}` : mot
    if (mesurer(essai, police) > max && courant) { lignes.push(courant); courant = mot }
    else courant = essai
  }
  if (courant) lignes.push(courant)
  return lignes
}

// Hauteur visible d'une ligne : du haut des capitales au bas des jambages.
const hautLigne = (s: number) => s * 0.8
const basLigne = (s: number) => s * 0.3

// ─── Titre ──────────────────────────────────────────────────────────────────

export interface TitreAffiche {
  lignes: string[]
  taille: number
  police: string
  baselines: number[]
  filetY: number
  /** Où le contenu peut commencer sous le titre et son filet. */
  bas: number
}

export function composerTitre(titre: string | undefined, mesurer: Mesure): TitreAffiche | null {
  if (!titre?.trim()) return null
  let taille = 76
  let lignes = couper(titre, ZONE_W, policeTitre(taille), mesurer)
  if (lignes.length > 2) {
    taille = 64
    lignes = couper(titre, ZONE_W, policeTitre(taille), mesurer).slice(0, 2)
  }
  const pas = taille + 12
  const baselines = lignes.map((_, i) => Y.contenuHaut + hautLigne(taille) + i * pas)
  const filetY = baselines[baselines.length - 1] + 56
  return { lignes, taille, police: policeTitre(taille), baselines, filetY, bas: filetY + 15 + 40 }
}

// ─── Corps du poème ─────────────────────────────────────────────────────────

interface CorpsMesure {
  lignes: string[]
  /** Index de la dernière ligne de chaque fragment — où passe le pli. */
  finsDeFragment: number[]
  taille: number
  pas: number
}

function mesurerCorps(
  texte: string, taille: number, pas: number, mesurer: Mesure, police: string = policeCorps(taille),
): CorpsMesure {
  const lignes: string[] = []
  const finsDeFragment: number[] = []
  for (const src of texte.split('\n')) {
    if (!src.trim()) { lignes.push(''); continue }
    for (const l of couper(src, ZONE_W, police, mesurer)) lignes.push(l)
    finsDeFragment.push(lignes.length - 1)
  }
  return { lignes, finsDeFragment, taille, pas }
}

const hauteurCorps = (n: number, taille: number, pas: number) =>
  n <= 0 ? 0 : (n - 1) * pas + hautLigne(taille) + basLigne(taille)

/** Ne garde que `max` lignes, la dernière devenant « […] ». */
function tronquer(c: CorpsMesure, max: number): CorpsMesure {
  if (c.lignes.length <= max) return c
  const garde = Math.max(1, max - 1)
  return {
    ...c,
    lignes: [...c.lignes.slice(0, garde), '[…]'],
    finsDeFragment: c.finsDeFragment.filter(i => i < garde - 1),
  }
}

/**
 * Le filet de pli passe entre deux fragments, jamais après le dernier ni
 * devant une ligne vide — et au milieu du BLANC entre les deux lignes. Il
 * était posé à une demi-interligne sous la ligne de base : c'est-à-dire dans
 * les hampes de la ligne suivante, barrant le « p » de « paupière ».
 */
function plisEntre(corps: CorpsMesure, lignes: { texte: string; y: number }[]): number[] {
  const milieu = (basLigne(corps.taille) + corps.pas - hautLigne(corps.taille)) / 2
  return corps.finsDeFragment
    .filter(i => i < lignes.length - 1 && lignes[i].texte && lignes[i + 1]?.texte)
    .map(i => Math.round(lignes[i].y + milieu))
}

export interface ImageAffiche {
  /** Rectangle où l'image est dessinée (déjà tournée si `tourner`). */
  x: number; y: number; w: number; h: number
  tourner: boolean
}

export interface AffichePoeme {
  titre: TitreAffiche | null
  image: ImageAffiche | null
  lettrine: { char: string; baseline: number; taille: number } | null
  corps: { lignes: { texte: string; y: number }[]; plis: number[]; taille: number; police: string }
  boites: Boite[]
}

const TAILLES_SEUL: [number, number][] = [[50, 74], [40, 62], [34, 52]]
const TAILLES_ILLUSTRE: [number, number][] = [[46, 66], [40, 58], [34, 50]]
const ECART_IMAGE = 64

export function composerAffichePoeme(
  e: { titre?: string; texte?: string; image?: { w: number; h: number } | null },
  mesurer: Mesure,
): AffichePoeme {
  const titre = composerTitre(e.titre, mesurer)
  const haut = titre ? titre.bas : Y.contenuHaut
  const zoneH = Y.contenuBas - haut
  const texte = e.texte ?? ''
  const image = e.image && e.image.w > 0 && e.image.h > 0 ? e.image : null

  let corps!: CorpsMesure
  let lettrine = false
  let imageDispo = 0

  if (image) {
    // Le poème d'abord : l'image prend ce qui reste, jamais moins d'IMAGE_MIN.
    const reste = (c: CorpsMesure) => zoneH - hauteurCorps(c.lignes.length, c.taille, c.pas) - ECART_IMAGE - 2 * PASSE
    for (const [t, p] of TAILLES_ILLUSTRE) {
      corps = mesurerCorps(texte, t, p, mesurer)
      if (reste(corps) >= IMAGE_MIN) break
    }
    if (reste(corps) < IMAGE_MIN) {
      const dispo = zoneH - ECART_IMAGE - 2 * PASSE - IMAGE_MIN - hautLigne(corps.taille) - basLigne(corps.taille)
      corps = tronquer(corps, Math.floor(dispo / corps.pas) + 1)
    }
    imageDispo = reste(corps)
  } else {
    const hauteur = (c: CorpsMesure, l: boolean) =>
      (l ? LETTRINE_VISUEL + LETTRINE_ECART : 0) + hauteurCorps(c.lignes.length, c.taille, c.pas)
    const avecLettrine = (c: CorpsMesure) => c.lignes.length <= 8 && !!c.lignes[0]
    for (const [t, p] of TAILLES_SEUL) {
      corps = mesurerCorps(texte, t, p, mesurer)
      lettrine = avecLettrine(corps)
      if (hauteur(corps, lettrine) <= zoneH) break
    }
    if (hauteur(corps, lettrine) > zoneH) {
      lettrine = false
      const dispo = zoneH - hautLigne(corps.taille) - basLigne(corps.taille)
      corps = tronquer(corps, Math.floor(dispo / corps.pas) + 1)
    }
  }

  const corpsH = hauteurCorps(corps.lignes.length, corps.taille, corps.pas)
  const boites: Boite[] = []
  if (titre) {
    boites.push({ nom: 'titre', haut: titre.baselines[0] - hautLigne(titre.taille), bas: titre.baselines[titre.baselines.length - 1] + basLigne(titre.taille) })
    boites.push({ nom: 'filet du titre', haut: titre.filetY - 15, bas: titre.filetY + 15 })
  }

  let img: ImageAffiche | null = null
  let y: number
  if (image) {
    const ratio = Math.min((ZONE_W - 2 * PASSE) / image.w, imageDispo / image.h)
    const w = image.w * ratio, h = image.h * ratio
    const pile = h + 2 * PASSE + ECART_IMAGE + corpsH
    const top = haut + (zoneH - pile) * OPTIQUE
    img = { x: (STORY_W - w) / 2, y: top + PASSE, w, h, tourner: false }
    boites.push({ nom: 'illustration', haut: top, bas: top + h + 2 * PASSE })
    y = top + h + 2 * PASSE + ECART_IMAGE
  } else {
    const pile = (lettrine ? LETTRINE_VISUEL + LETTRINE_ECART : 0) + corpsH
    y = haut + (zoneH - pile) * OPTIQUE
  }

  let lettrineOut: AffichePoeme['lettrine'] = null
  if (lettrine) {
    const baseline = y + LETTRINE_VISUEL
    lettrineOut = { char: corps.lignes[0].charAt(0).toUpperCase(), baseline, taille: LETTRINE }
    boites.push({ nom: 'lettrine', haut: y, bas: baseline + 6 })
    y = baseline + LETTRINE_ECART
  }

  const lignes = corps.lignes.map((t, i) => ({ texte: t, y: y + hautLigne(corps.taille) + i * corps.pas }))
  if (lignes.length) boites.push({ nom: 'poème', haut: y, bas: y + corpsH })
  const plis = plisEntre(corps, lignes)

  return {
    titre, image: img, lettrine: lettrineOut,
    corps: { lignes, plis, taille: corps.taille, police: policeCorps(corps.taille) },
    boites: [...boitesFixes(), ...boites],
  }
}

// ─── La vidéo ───────────────────────────────────────────────────────────────
//
// La vidéo composait son poème dans 360–1560 et posait sa marque dans
// 1770–1882 : la même faute que l'affiche, sous le même champ de réponse. Un
// poème illustré en surimpression descendait jusqu'à 1600 et plus, sur la
// marque. Elle suit désormais la grille de l'affiche.

const LECTURE_PAS = 56

export const policeVideo = (s: number) => `italic ${s}px 'Bodoni Moda', Georgia, serif`
const TAILLES_VIDEO: [number, number][] = [[50, 74], [40, 62], [33, 50], [28, 42]]
const TAILLES_SURIMPRESSION: [number, number][] = [[52, 78], [42, 62], [34, 50], [28, 42]]

export interface CorpsVideo {
  lignes: { texte: string; y: number }[]
  plis: number[]
  taille: number
  pas: number
}

/** Choisit le plus grand corps qui tient dans `zoneH`, sinon coupe sur « […] ». */
function ajuster(texte: string, zoneH: number, tailles: [number, number][], mesurer: Mesure): CorpsMesure {
  let corps!: CorpsMesure
  for (const [t, p] of tailles) {
    corps = mesurerCorps(texte, t, p, mesurer, policeVideo(t))
    if (hauteurCorps(corps.lignes.length, t, p) <= zoneH) return corps
  }
  const dispo = zoneH - hautLigne(corps.taille) - basLigne(corps.taille)
  return tronquer(corps, Math.max(1, Math.floor(dispo / corps.pas) + 1))
}

function poser(corps: CorpsMesure, y0: number): CorpsVideo {
  const lignes = corps.lignes.map((t, i) => ({ texte: t, y: y0 + hautLigne(corps.taille) + i * corps.pas }))
  return { lignes, plis: plisEntre(corps, lignes), taille: corps.taille, pas: corps.pas }
}

/** Le poème seul, sous le titre éventuel, au tiers optique de la zone. */
export function composerCorpsVideo(
  e: { titre?: string; texte?: string }, mesurer: Mesure,
): { titre: TitreAffiche | null; corps: CorpsVideo; boites: Boite[] } {
  const titre = composerTitre(e.titre, mesurer)
  const haut = titre ? titre.bas : Y.contenuHaut
  const zoneH = Y.contenuBas - haut
  const c = ajuster(e.texte ?? '', zoneH, TAILLES_VIDEO, mesurer)
  const h = hauteurCorps(c.lignes.length, c.taille, c.pas)
  const y0 = haut + (zoneH - h) * OPTIQUE
  const boites: Boite[] = [...boitesFixes()]
  if (titre) {
    boites.push({ nom: 'titre', haut: titre.baselines[0] - hautLigne(titre.taille), bas: titre.baselines[titre.baselines.length - 1] + basLigne(titre.taille) })
    boites.push({ nom: 'filet du titre', haut: titre.filetY - 15, bas: titre.filetY + 15 })
  }
  boites.push({ nom: 'poème', haut: y0, bas: y0 + h })
  return { titre, corps: poser(c, y0), boites }
}

export interface SurimpressionVideo {
  titre: { lignes: string[]; taille: number; baselines: number[] } | null
  corps: CorpsVideo
  /** La bande que le texte occupe — le voile local se pose derrière. */
  haut: number
  bas: number
  boites: Boite[]
}

const TITRE_SURIMPRESSION = 64
const ECART_TITRE_SURIMPRESSION = 44

/** Titre et poème posés sur une illustration plein cadre. */
export function composerSurimpression(
  e: { titre?: string; texte?: string }, mesurer: Mesure,
): SurimpressionVideo {
  let titreLignes: string[] = []
  if (e.titre?.trim()) titreLignes = couper(e.titre, ZONE_W, policeTitre(TITRE_SURIMPRESSION), mesurer).slice(0, 2)
  const pasTitre = TITRE_SURIMPRESSION + 12
  const titreH = titreLignes.length
    ? (titreLignes.length - 1) * pasTitre + hautLigne(TITRE_SURIMPRESSION) + basLigne(TITRE_SURIMPRESSION) + ECART_TITRE_SURIMPRESSION
    : 0
  const zoneH = Y.contenuBas - Y.contenuHaut
  const c = ajuster(e.texte ?? '', zoneH - titreH, TAILLES_SURIMPRESSION, mesurer)
  const h = titreH + hauteurCorps(c.lignes.length, c.taille, c.pas)
  const haut = Y.contenuHaut + (zoneH - h) * OPTIQUE
  const titre = titreLignes.length
    ? { lignes: titreLignes, taille: TITRE_SURIMPRESSION, baselines: titreLignes.map((_, i) => haut + hautLigne(TITRE_SURIMPRESSION) + i * pasTitre) }
    : null
  const boites: Boite[] = [...boitesFixes()]
  if (titre) boites.push({ nom: 'titre', haut, bas: haut + titreH - ECART_TITRE_SURIMPRESSION })
  boites.push({ nom: 'poème', haut: haut + titreH, bas: haut + h })
  return { titre, corps: poser(c, haut + titreH), haut, bas: haut + h, boites }
}

/**
 * La lecture d'un dessin en surimpression : ancrée par le BAS, sur la zone
 * de contenu. Elle commençait à 1380 et sa quatrième ligne tombait à 1604,
 * sur la marque déplacée.
 */
export function composerLectureVideo(texte: string, mesurer: Mesure): { libelleY: number; lignes: { texte: string; y: number }[]; boites: Boite[] } | null {
  const brut = texte.replace(/\n+/g, ' ').trim()
  if (!brut) return null
  const lignes = couper(brut, ZONE_W - 60, policeLecture, mesurer).slice(0, 4)
  const libelleY = Y.contenuBas - basLigne(36) - LECTURE_PAS * lignes.length
  return {
    libelleY,
    lignes: lignes.map((t, i) => ({ texte: t, y: libelleY + LECTURE_PAS * (i + 1) })),
    boites: [...boitesFixes(), { nom: 'lecture', haut: libelleY - 22, bas: Y.contenuBas }],
  }
}

// ─── Dessin ─────────────────────────────────────────────────────────────────

export interface AfficheDessin {
  image: ImageAffiche | null
  lecture: { filetY: number; libelleY: number; lignes: { texte: string; y: number }[] } | null
  boites: Boite[]
}

export function composerAfficheDessin(
  e: { texte?: string; image?: { w: number; h: number } | null },
  mesurer: Mesure,
): AfficheDessin {
  const zoneH = Y.contenuBas - Y.contenuHaut
  const brut = (e.texte ?? '').replace(/\n+/g, ' ').trim()
  const lignesLecture = brut ? couper(brut, ZONE_W - 60, policeLecture, mesurer).slice(0, 4) : []
  // filet (±15) → libellé à +50 → lignes tous les 56 px
  const lectureH = lignesLecture.length ? 15 + 50 + LECTURE_PAS * lignesLecture.length + basLigne(36) : 0
  const ecart = lignesLecture.length ? 70 : 0

  let img: ImageAffiche | null = null
  let pileImage = 0
  const image = e.image && e.image.w > 0 && e.image.h > 0 ? e.image : null
  if (image) {
    const r = image.w / image.h
    // Le rouleau : une bande très horizontale se couche à la verticale.
    const tourner = r > 1.6
    const w0 = tourner ? image.h : image.w, h0 = tourner ? image.w : image.h
    const maxW = tourner || r < 0.9 ? 700 : ZONE_W - 2 * PASSE
    const maxH = zoneH - lectureH - ecart - 2 * PASSE
    const ratio = Math.min(maxW / w0, maxH / h0)
    img = { x: 0, y: 0, w: w0 * ratio, h: h0 * ratio, tourner }
    pileImage = img.h + 2 * PASSE
  }
  const pile = pileImage + ecart + lectureH
  const top = Y.contenuHaut + (zoneH - pile) * OPTIQUE
  const boites: Boite[] = []
  if (img) {
    img.x = (STORY_W - img.w) / 2
    img.y = top + PASSE
    boites.push({ nom: 'dessin', haut: top, bas: top + pileImage })
  }
  let lecture: AfficheDessin['lecture'] = null
  if (lignesLecture.length) {
    const filetY = top + pileImage + ecart + 15
    const libelleY = filetY + 50
    lecture = { filetY, libelleY, lignes: lignesLecture.map((t, i) => ({ texte: t, y: libelleY + LECTURE_PAS * (i + 1) })) }
    boites.push({ nom: 'lecture', haut: filetY - 15, bas: libelleY + LECTURE_PAS * lignesLecture.length + basLigne(36) })
  }
  return { image: img, lecture, boites: [...boitesFixes(), ...boites] }
}

/** L'en-tête, l'invitation et la marque : les mêmes sur toutes les affiches. */
export function boitesFixes(): Boite[] {
  return [
    { nom: 'en-tête', haut: Y.etoile - 26, bas: Y.numero + 6 },
    { nom: 'invitation', haut: Y.invitation - hautLigne(32), bas: Y.invitation + basLigne(32) },
    { nom: 'marque', haut: Y.filetMarque, bas: Y.lien + basLigne(24) },
  ]
}

// ─── Ce que le partage emporte ──────────────────────────────────────────────

/**
 * L'invitation, dans la langue du joueur. Elle était codée en dur en
 * français (« Ajoute ta main au cadavre. ») et sortait telle quelle sur
 * l'affiche anglaise. Elle mène au poème du jour : le seul lieu où un
 * inconnu peut ajouter sa main le jour même, sans compte et sans salon.
 */
export function invitationDuJour(): string {
  return tr('Ajoute ta main au poème du jour.', "Add your hand to today's poem.")
}

export const CHEMIN_INVITATION = '/poeme-du-jour'

/**
 * Le texte qui accompagne le fichier dans la feuille de partage. Il n'y en
 * avait aucun : sur une messagerie, le destinataire recevait une vidéo et
 * rien sur quoi appuyer.
 */
export function texteDuPartage(invitation: string, lien: string): string {
  return `${invitation}\n${lien}`
}
