/**
 * Le paquet — la physique du poème qu'on déplie au doigt.
 *
 * Maquette validée par l'auteur le 11 novembre (`scripts/temoins/depli-au-doigt/
 * paquet.html`, et `docs/direction-artistique.md`, « Le plan moderne ») : la
 * feuille arrive FERMÉE, un paquet dont on ne voit que le dos du papier. On le
 * tire vers soi : il se soulève, se dresse, passe la verticale et retombe un
 * pli plus bas en découvrant la bande qu'il couvrait. Lâché, un pli tombe sous
 * son POIDS du côté où il penche. Le papier se courbe. Aucun son.
 *
 * Le module est pur : un état, des pas de temps, des angles. `FeuillePliee`
 * le peint.
 *
 * ── L'état ────────────────────────────────────────────────────────────────
 *
 * k : la bande que le rabat couvre (N − 1 : tout est ouvert). θ : l'angle du
 * pli en cours. À θ = 0 le rabat est couché sur la bande k ; il tourne autour
 * du bas de cette bande, se dresse à π/2, se couche sur la bande k + 1 à π.
 * Pour le doigt, un seul nombre : P = k + θ/π.
 *
 * β : la courbure du papier, en radians au bord libre. Elle suit une cible
 * (le bord qui traîne dans l'air, devance sous le doigt, s'affaisse de biais)
 * par un ressort amorti : c'est ce ressort qui fait la souplesse.
 */

/** Les réglages validés. Les retouches de l'auteur sont dans le journal. */
export const REGLAGES = {
  /** px — la distance de l'œil. */
  perspective: 750,
  /** px — l'œil du joueur, sous le haut de la feuille, vers le bas de l'écran :
   *  le pli se dresse VERS SOI. (L'œil au-dessus : le pli dressé n'était qu'un trait.) */
  origine: 650,
  /** rad/s² — le poids du papier. 110 au premier essai : « trop rapide ». */
  pesanteur: 40,
  /** Le freinage de l'air : le papier est léger. */
  air: 3.5,
  /** Ce que le pli garde de sa vitesse en touchant la table. */
  rebond: 0.08,
  /** rad/s — en dessous, il ne rebondit plus : il est posé. */
  pose: 1.2,
  /** rad/s — l'élan d'un pli qu'on ouvre d'un toucher. */
  poussee: 14,
  /** rad/s — l'élan du pli qui esquisse le geste (≈ 25°). */
  esquisse: 6,
  /** ms — entre deux plis, quand un toucher déplie tout. */
  entrePlis: 120,
  /** Le doigt parcourt 1,25 fois la course du papier : le pli suit posément. */
  course: 1.25,
  /** Le rabat en huit lamelles. */
  lamelles: 8,
  /** La raideur du papier : il vibre environ trois fois par seconde… */
  raideur: 380,
  /** … et pas longtemps. */
  amortiPapier: 21,
  /** rad par rad/s — en chute, le bord libre traîne dans l'air. */
  traine: 0.045,
  /** rad par rad/s — mené au doigt, le bord libre devance. */
  devance: 0.02,
  /** rad — tenu de biais, il s'affaisse sous son poids. */
  affaisse: 0.22,
  /** La courbe se marque vers le bord libre. */
  profil: 1.5,
  /** Le bord libre se pose sans rebondir (« oublie le claquement »). */
  rebondBord: 0,
  /** px — chaque lamelle passe sous la suivante : pas de jour entre elles. */
  recouvre: 1.5,
  /** ms — personne n'y touche : le paquet s'ouvre de lui-même. */
  autoOuverture: 8000,
} as const

export type Reglages = typeof REGLAGES
export type Mode = 'repos' | 'tire' | 'chute' | 'ouvert'

export interface EtatPli {
  /** La bande que le rabat couvre. */
  k: number
  /** L'angle du pli en cours, de 0 à π. */
  th: number
  /** Sa vitesse angulaire. */
  w: number
  /** La courbure du papier au bord libre, et sa vitesse. */
  beta: number
  vbeta: number
  /** 1 en chute, 0 au doigt : contre la table, sous le doigt, la courbe s'efface. */
  libre: number
  /** Le pli a touché la table ; on attend que son bord se pose. */
  posee: boolean
}

export const etatInitial = (): EtatPli => ({ k: 0, th: 0, w: 0, beta: 0, vbeta: 0, libre: 1, posee: false })

const PI = Math.PI
const borne = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** La position du doigt, un seul nombre. */
export const progres = (e: EtatPli) => e.k + e.th / PI
/** Le pli en cours pour une position donnée, sur une feuille de n bandes. */
export const pliDe = (p: number, n: number) => Math.min(Math.floor(p + 1e-9), n - 2)

/** Place le pli à la position p (0 → n − 1). */
export function placer(e: EtatPli, p: number, n: number): void {
  p = borne(p, 0, n - 1)
  if (p >= n - 1) { e.k = n - 2; e.th = PI } else { e.k = pliDe(p, n); e.th = (p - e.k) * PI }
}

/**
 * Un pas de temps h (secondes) — un pli charnière en bas, sur une table : son
 * poids le couche du côté où il penche, θ'' = −g·cos θ − air·θ'. La courbure
 * suit sa cible par un ressort ; la table arrête le bord libre.
 *
 * `wDoigt` : la vitesse du pli mené au doigt (mode « tire »).
 */
export function pas(e: EtatPli, h: number, mode: Mode, wDoigt: number, R: Reglages = REGLAGES): void {
  if (mode === 'chute' && !e.posee) {
    e.w += (-R.pesanteur * Math.cos(e.th) - R.air * e.w) * h
    e.th += e.w * h
    // Un contact ne compte que si le pli va VERS la table : posé à θ = 0 et
    // lancé vers le haut, il n'a rien touché (la première image d'un pli lancé
    // depuis la table l'arrêtait net).
    if ((e.th <= 0 && e.w < 0) || (e.th >= PI && e.w > 0)) {
      const choc = Math.abs(e.w)
      e.th = e.th <= 0 ? 0 : PI
      if (choc < R.pose) { e.w = 0; e.posee = true } else e.w = -R.rebond * e.w
    }
  }
  const v = mode === 'tire' ? wDoigt : e.w
  let cible = mode === 'tire' ? borne(R.devance * v, -0.5, 0.5) : mode === 'chute' ? borne(-R.traine * v, -0.7, 0.7) : 0
  if (mode === 'tire' || mode === 'chute') cible -= R.affaisse * Math.sin(2 * e.th)
  e.vbeta += (R.raideur * (cible - e.beta) - R.amortiPapier * e.vbeta) * h
  e.beta += e.vbeta * h
  if (mode === 'chute') {
    const contre = (e.th >= PI && e.beta > 0) ? 1 : (e.th <= 0 && e.beta < 0) ? -1 : 0
    if (contre) { if (contre * e.vbeta > 0) e.vbeta = -R.rebondBord * e.vbeta; e.beta = 0 }
  }
  e.libre += ((mode === 'tire' ? 0 : 1) - e.libre) * Math.min(1, h / 0.08)
}

/**
 * Le pli et son bord sont posés. Quand un toucher déplie tout, on n'attend
 * pas que le bord ait fini de trembler pour lancer le suivant — et pour une
 * grande feuille (`large`, le dessin), moins encore : son bord tremble plus
 * longtemps, et l'attendre faisait un temps mort d'une demi-seconde.
 */
export const estCalme = (e: EtatPli, enchaine: boolean, large = false) =>
  !enchaine ? Math.abs(e.beta) < 0.003 && Math.abs(e.vbeta) < 0.05
    : large ? Math.abs(e.beta) < 0.06 && Math.abs(e.vbeta) < 1.5
      : Math.abs(e.beta) < 0.02 && Math.abs(e.vbeta) < 0.6

/** Le poids de la courbe : entière en chute, effacée contre la table sous le doigt. */
export function poidsCourbe(e: EtatPli): number {
  const pres = Math.min(e.th, PI - e.th) / 0.5
  const lisse = pres >= 1 ? 1 : pres * pres * (3 - 2 * pres)
  return lisse + (1 - lisse) * e.libre
}

/** L'angle du papier à la place s du rabat (0 : la charnière, 1 : le bord libre). */
export const angleA = (e: EtatPli, s: number, poids: number, R: Reglages = REGLAGES) =>
  borne(e.th + e.beta * poids * Math.pow(s, R.profil), 0, PI)

/**
 * Le doigt mène l'angle : la course d'un pli va du milieu de la bande qu'il
 * couvre au milieu de la suivante.
 */
export function progresDe(y: number, milieux: number[]): number {
  const n = milieux.length
  if (n < 2 || y <= milieux[0]) return 0
  if (y >= milieux[n - 1]) return n - 1
  let i = 0
  while (i < n - 2 && y > milieux[i + 1]) i++
  return i + (y - milieux[i]) / (milieux[i + 1] - milieux[i])
}
export function positionDe(p: number, milieux: number[]): number {
  const n = milieux.length
  if (n < 2) return milieux[0] ?? 0
  const i = pliDe(p, n)
  return milieux[i] + (p - i) * (milieux[i + 1] - milieux[i])
}

// ── Le dessin plié ──────────────────────────────────────────────────────────
//
// Maquette `scripts/temoins/dessin-3d/maquette.html`, validée par l'auteur le
// 11 novembre : le même geste, sur une feuille six fois plus haute qu'un vers.
// Trois mains, puis le BAS de la feuille, qui replie les jambes : trois plis,
// trois découvertes. La feuille prend toute la largeur ; la vue la suit.

export const REGLAGES_DESSIN = {
  lamelles: 10,
  /** px */
  recouvre: 2,
  /** ms — entre deux plis, quand un toucher déplie tout. */
  entrePlis: 30,
  /** px — la course du doigt pour un pli entier : une bande est trop haute
   *  pour qu'on la parcoure d'un milieu à l'autre. */
  coursePli: 150,
  /** L'œil du joueur, à 55 % de la hauteur de l'écran. */
  oeil: 0.55,
  /** s — la vue rattrape la pliure suivante en un peu plus d'une demi-seconde. */
  suivi: 0.3,
  /** px — la largeur de la feuille, au plus. */
  largeurMax: 460,
  /** Une fois ouvert, le dessin entier occupe 68 % de la hauteur ; la lecture dessous. */
  resserre: 0.68,
  /** px — la place que garde la lecture sur un petit écran. */
  placeLecture: 190,
  /** ms — on regarde les jambes un instant… */
  attenteJambes: 900,
  /** ms — … puis la vue recule, plus lentement qu'un pli. */
  recul: 1300,
} as const

/**
 * Une grande feuille tombe plus lentement qu'une petite, comme un pendule plus
 * long : le mouvement validé du poème est joué au ralenti, d'un facteur
 * (hauteur du rabat / 60 px)^0,35 — « trop rapide » au premier essai. Plafonné.
 */
export const lenteurDe = (hauteurRabat: number) => Math.min(1.7, Math.max(1, Math.pow(hauteurRabat / 60, 0.35)))

/** Un rabat plus grand se regarde de plus loin, sans quoi il sort de l'écran en se dressant. */
export const perspectiveDe = (largeur: number) => Math.round(1300 * Math.sqrt(largeur / 200))

/**
 * Où se pose la vue (le haut de l'écran, en pixels de la feuille). La bande
 * qu'on découvre est montrée ENTIÈRE, le nom de sa main compris, la pliure
 * vers le milieu de l'écran (centrer la pliure coupait le haut de la bande).
 * Le paquet fermé se montre entier ; ouvert, la vue reste sur les jambes.
 */
export function cadreDe(tops: number[], hs: number[], k: number, th: number, mode: Mode, hauteurVue: number): number {
  const n = tops.length
  if (n < 2) return 0
  if (mode === 'ouvert') return tops[n - 2]
  if (mode === 'repos' && k === 0 && th === 0) return 0
  return Math.max(0, Math.min(tops[k] + hs[k] - 0.5 * hauteurVue, tops[k]))
}

/**
 * L'échelle du dessin entier, une fois la vue reculée : 68 % de la hauteur,
 * et sur un très petit écran la lecture garde d'abord sa place. Sans lecture
 * à venir, le dessin prend l'écran.
 */
export function echelleEnsemble(hauteurVue: number, hauteurFeuille: number, avecLecture: boolean, D = REGLAGES_DESSIN): number {
  if (hauteurFeuille <= 0) return 1
  return avecLecture
    ? Math.max(0.1, Math.min(1, (hauteurVue * D.resserre) / hauteurFeuille, (hauteurVue - D.placeLecture) / hauteurFeuille))
    : Math.max(0.1, Math.min(1, (hauteurVue - 40) / hauteurFeuille))
}
