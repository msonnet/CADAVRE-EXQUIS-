/**
 * Les animations Lottie — ce qui se calcule sans écran.
 *
 * Cahier des charges : `docs/chantier-effectcraft.md`.
 *
 * ── Les couleurs repères ──────────────────────────────────────────────────
 *
 * Une animation ne porte jamais une couleur d'ambiance : l'ambiance change
 * chaque jour, l'animation est figée dans un fichier. Elle porte donc trois
 * couleurs REPÈRES, pures et impossibles à confondre avec une vraie teinte,
 * que le chargement remplace par celles de la séance :
 *
 *   accent  #FF0000  →  seance.colorSchema.hex
 *   encre   #00FF00  →  seance.colorSchema.encre
 *   papier  #0000FF  →  seance.colorSchema.bg   (= seance.ambiance.bg)
 *
 * Lottie écrit les couleurs en fractions de 0 à 1 ; EffectCraft les arrondit
 * parfois au dernier chiffre. On compare donc à 1/255 près.
 *
 * Seuls les aplats et les traits (`fl`, `st`) se recolorent. Les dégradés
 * (`gf`, `gs`) rangent leurs couleurs dans un tableau à plat, mêlé aux
 * positions des arrêts et à l'opacité : ils sont interdits, et la mesure le
 * vérifie plutôt que ce code ne tente de les lire.
 *
 * ── Les repères de composition ────────────────────────────────────────────
 *
 * Les segments ne sont jamais des numéros d'image écrits dans le code : ils
 * se lisent dans les repères de composition qu'EffectCraft exporte
 * (`markers`, `{ cm: nom, tm: début, dr: durée }`, en images). Retoucher le
 * rythme d'une animation dans EffectCraft ne demande alors aucune ligne ici.
 */

/** Une couleur Lottie : trois ou quatre fractions de 0 à 1. */
export type CouleurLottie = number[]

export type NomRepere = 'accent' | 'encre' | 'papier'

/** Les valeurs posées dans EffectCraft. */
export const REPERES: Record<NomRepere, [number, number, number]> = {
  accent: [1, 0, 0],
  encre: [0, 1, 0],
  papier: [0, 0, 1],
}

const TOLERANCE = 1 / 255 + 1e-9

/** Les trois couleurs de la séance, en hexadécimal (`#rrggbb` ou `#rgb`). */
export type CouleursSeance = Record<NomRepere, string>

/** Le repère que porte une couleur Lottie, ou `null` si ce n'en est aucun. */
export function repereDe(c: CouleurLottie): NomRepere | null {
  if (!Array.isArray(c) || c.length < 3) return null
  for (const nom of Object.keys(REPERES) as NomRepere[]) {
    const r = REPERES[nom]
    if (Math.abs(c[0] - r[0]) <= TOLERANCE
      && Math.abs(c[1] - r[1]) <= TOLERANCE
      && Math.abs(c[2] - r[2]) <= TOLERANCE) return nom
  }
  return null
}

/** `#rrggbb` ou `#rgb` → fractions de 0 à 1. `null` si illisible. */
export function hexVersLottie(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map(x => x + x).join('') : m[1]
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
}

/* ── Parcourir une animation ─────────────────────────────────────────────── */

type Objet = Record<string, unknown>

const estObjet = (v: unknown): v is Objet => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Visite chaque objet de l'animation, calques des précompositions compris.
 * Le parcours est générique : une forme imbriquée dans trois groupes, ou
 * dans une précomposition, n'échappe ni à la recoloration ni à la mesure.
 */
export function parcourir(donnees: unknown, visite: (o: Objet) => void): void {
  const pile: unknown[] = [donnees]
  while (pile.length) {
    const v = pile.pop()
    if (Array.isArray(v)) { for (const x of v) pile.push(x); continue }
    if (!estObjet(v)) continue
    visite(v)
    for (const x of Object.values(v)) if (typeof x === 'object' && x !== null) pile.push(x)
  }
}

/**
 * Chaque couleur d'aplat ou de trait, fixe ou animée, avec de quoi la
 * remplacer. Une couleur animée en porte une par clé (`s`, et `e` dans
 * l'ancien format).
 */
function couleursDeForme(o: Objet): { lire: () => CouleurLottie; ecrire: (c: CouleurLottie) => void }[] {
  if ((o.ty !== 'fl' && o.ty !== 'st') || !estObjet(o.c)) return []
  const prop = o.c
  const k = prop.k
  if (!Array.isArray(k)) return []
  // Fixe : `k` est la couleur elle-même.
  if (typeof k[0] === 'number') {
    return [{ lire: () => k as CouleurLottie, ecrire: c => { prop.k = c } }]
  }
  // Animée : `k` est une liste de clés.
  const acces: ReturnType<typeof couleursDeForme> = []
  for (const cle of k) {
    if (!estObjet(cle)) continue
    for (const champ of ['s', 'e'] as const) {
      if (Array.isArray(cle[champ])) {
        acces.push({ lire: () => cle[champ] as CouleurLottie, ecrire: c => { cle[champ] = c } })
      }
    }
  }
  return acces
}

/** Toutes les couleurs d'aplat et de trait d'une animation. */
export function couleursDe(donnees: unknown): CouleurLottie[] {
  const out: CouleurLottie[] = []
  parcourir(donnees, o => { for (const a of couleursDeForme(o)) out.push(a.lire()) })
  return out
}

/**
 * Une COPIE de l'animation, ses repères remplacés par les couleurs de la
 * séance. L'alpha d'origine est gardé.
 *
 * Une copie, et jamais l'original : `lottie-web` annote les données qu'on
 * lui donne. Le JSON téléchargé est gardé en mémoire et sert à toutes les
 * instances, sur toutes les ambiances — le modifier en place teindrait la
 * prochaine couture aux couleurs de la précédente.
 *
 * Une couleur de séance illisible laisse le repère tel quel plutôt que de
 * casser : la mesure garantit qu'aucune ambiance n'en produit.
 */
export function recolorer<T>(donnees: T, couleurs: CouleursSeance): T {
  const copie = structuredClone(donnees)
  const cibles: Partial<Record<NomRepere, [number, number, number]>> = {}
  for (const nom of Object.keys(REPERES) as NomRepere[]) {
    const rgb = hexVersLottie(couleurs[nom])
    if (rgb) cibles[nom] = rgb
  }
  parcourir(copie, o => {
    for (const a of couleursDeForme(o)) {
      const c = a.lire()
      const nom = repereDe(c)
      const cible = nom ? cibles[nom] : undefined
      if (cible) a.ecrire(c.length > 3 ? [...cible, c[3]] : [...cible])
    }
  })
  return copie
}

/* ── Les repères de composition ─────────────────────────────────────────── */

export interface Segment {
  /** Première image. */
  debut: number
  /** Image de fin (exclue). Égale à `debut` pour un repère sans durée. */
  fin: number
}

interface MarqueurLottie { cm?: unknown; tm?: unknown; dr?: unknown }

/**
 * Le nom d'un repère. EffectCraft écrit le commentaire tel quel ; d'autres
 * exporteurs l'enveloppent dans un JSON `{"name": …}`. On lit les deux.
 */
function nomDuMarqueur(cm: unknown): string | null {
  if (typeof cm !== 'string') return null
  const brut = cm.trim()
  if (brut.startsWith('{')) {
    try {
      const o = JSON.parse(brut)
      if (estObjet(o) && typeof o.name === 'string') return o.name.trim()
    } catch { /* un commentaire qui commence par une accolade, simplement */ }
  }
  return brut
}

/** Les repères de l'animation, par nom. */
export function reperesDe(donnees: unknown): Map<string, Segment> {
  const out = new Map<string, Segment>()
  const marqueurs = estObjet(donnees) && Array.isArray(donnees.markers) ? donnees.markers : []
  for (const m of marqueurs as MarqueurLottie[]) {
    const nom = nomDuMarqueur(m?.cm)
    if (!nom || typeof m.tm !== 'number') continue
    const dr = typeof m.dr === 'number' && m.dr > 0 ? m.dr : 0
    out.set(nom, { debut: m.tm, fin: m.tm + dr })
  }
  return out
}

/** L'animation entière, de `ip` à `op`. */
export function segmentEntier(donnees: unknown): Segment {
  const o = estObjet(donnees) ? donnees : {}
  const debut = typeof o.ip === 'number' ? o.ip : 0
  const fin = typeof o.op === 'number' ? o.op : debut
  return { debut, fin }
}

/**
 * Ce que l'animation doit jouer.
 *
 * - un `segment` nommé : ce repère-là (inconnu → l'animation entière, pour
 *   qu'une faute de nom se voie à l'écran sans laisser de trou) ;
 * - sinon, en boucle : le repère `boucle` s'il existe ;
 * - sinon : l'animation entière.
 */
export function segmentAJouer(donnees: unknown, opts: { segment?: string; boucle?: boolean }): Segment {
  const reperes = reperesDe(donnees)
  const nomme = opts.segment ? reperes.get(opts.segment) : undefined
  if (nomme && nomme.fin > nomme.debut) return nomme
  if (!opts.segment && opts.boucle) {
    const b = reperes.get('boucle')
    if (b && b.fin > b.debut) return b
  }
  return segmentEntier(donnees)
}

/**
 * L'image fixe montrée sous mouvement réduit : le repère `pose`. Sans lui
 * (la mesure l'exige, mais un fichier peut manquer), la dernière image du
 * segment qui aurait été joué — l'état d'arrivée plutôt que le départ.
 */
export function imagePose(donnees: unknown, segment: Segment): number {
  const pose = reperesDe(donnees).get('pose')
  if (pose) return pose.debut
  return Math.max(segment.debut, segment.fin - 1)
}

/** Le rapport largeur / hauteur de l'animation (1 par défaut). */
export function proportions(donnees: unknown): number {
  const o = estObjet(donnees) ? donnees : {}
  return typeof o.w === 'number' && typeof o.h === 'number' && o.h > 0 ? o.w / o.h : 1
}
