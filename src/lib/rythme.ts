/**
 * La partition du dévoilement : à quel instant chaque pli s'ouvre, à quel
 * instant chaque vers s'écrit, et combien de temps il met.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * L'ancien dévoilement tenait dans une seule ligne : `delay: 0.3 + i * 0.55`.
 * Chaque vers attendait la même chose, qu'il fasse un mot ou dix. Sur le poème
 * d'atelier à trente-sept vers, le dernier apparaissait à **20,1 s**, après
 * 4,8 s d'assemblage — vingt-cinq secondes de rideau qu'on ne pouvait pas
 * interrompre. Ce n'est pas une animation, c'est une attente.
 *
 * ── Ce que la partition change ────────────────────────────────────────────
 *
 * Deux choses, et une seule des deux est visible.
 *
 * 1. Le vers respire selon SA longueur. `metrique.ts` compte déjà ses mots et
 *    lui donne sa classe ; on s'en sert. Un vers d'un mot s'écrit vite et
 *    laisse un silence derrière lui — il tombe comme un coup. Un vers de dix
 *    mots se déroule, et le suivant vient sans attendre. C'est l'inverse de
 *    l'intuition, et c'est ce qui fait un rythme : la pause suit la brièveté.
 *
 * 2. Le tout tient dans un BUDGET. On mesure la durée naturelle du poème ; si
 *    elle dépasse le budget, on comprime tout d'un même facteur. Les rapports
 *    entre les vers sont conservés — le court reste court RELATIVEMENT au
 *    long — mais le poème entier passe en huit secondes qu'il ait trois vers
 *    ou quarante.
 *
 * Le module est pur et sans React : c'est ce qui permet de le mesurer.
 */

import { classeDeLongueur, motsDuVers, type Classe } from './metrique'

/** Le temps total accordé à l'encre, pauses comprises. En millisecondes. */
export const BUDGET_ENCRE = 7600

/** Ce que coûte un vers, avant même son premier mot. */
const BASE = 260
/** Ce que coûte chaque mot supplémentaire. */
const PAR_MOT = 78

/**
 * Le silence qui suit le vers, selon son souffle.
 *
 * Le COURT est le plus long des trois, et c'est délibéré : un vers d'un mot
 * n'a de force que si on le laisse résonner. Le LONG s'est déjà fait entendre
 * pendant qu'il s'écrivait.
 */
const PAUSE: Record<Classe, number> = { COURT: 300, MOYEN: 150, LONG: 230 }

/** Une ligne vide est une respiration, pas un vers. */
const PAUSE_BLANC = 240

/**
 * Le plancher de compression, et ce qu'il coûte.
 *
 * Sans lui, un poème de deux cents vers réduirait chaque vers à un
 * scintillement de trente millisecondes. Avec lui, le budget cesse d'être tenu
 * au-delà d'un certain nombre de vers — il faut le dire, parce que c'est un
 * choix et non un oubli.
 *
 * Le point de bascule se calcule : un vers moyen coûte environ 800 ms
 * naturellement, donc le budget est tenu tant que 800 n × 0,22 ≤ 7600, soit
 * **jusqu'à quarante-trois vers**. Le plus grand atelier jamais mesuré en
 * faisait trente-sept. Au-delà, la séquence s'allonge d'environ 176 ms par
 * vers supplémentaire plutôt que de devenir illisible — et de toute façon,
 * elle se saute au doigt.
 */
const PLANCHER = 0.22

/** La durée d'ouverture d'un pli. */
export const DUREE_DEPLI = 700

/**
 * Quelle part du dépli s'est écoulée quand l'encre commence.
 *
 * L'encre n'attend pas que le papier soit à plat : elle arrive dans le
 * dernier tiers de l'ouverture. C'est ce recouvrement qui empêche la séquence
 * de se lire comme deux gestes séparés.
 */
const RECOUVREMENT = 0.62

/** Deux plis ne s'ouvrent jamais à moins de ça l'un de l'autre. */
const ECART_MIN_PLIS = 260

/** Au-delà, le papier serait plié en accordéon plutôt qu'en feuillets. */
export const PANNEAUX_MAX = 5

export interface TempsVers {
  /** Instant où le premier mot commence à paraître, en ms depuis le lever. */
  debut: number
  /** Temps que met l'encre à traverser le vers. */
  duree: number
  mots: number
  classe: Classe
}

export interface Panneau {
  /** Les index des vers portés par ce pli. */
  lignes: number[]
  /** Instant où le pli commence à s'ouvrir. */
  ouverture: number
}

export interface Partition {
  panneaux: Panneau[]
  /** Un temps par vers, dans l'ordre du poème, en instants absolus. */
  vers: TempsVers[]
  /** Instant où le dernier mot du dernier vers a fini de paraître. */
  fin: number
  /** Le facteur de compression appliqué. 1 = le poème tenait dans le budget. */
  facteur: number
}

/**
 * Plie une suite de vers en feuillets.
 *
 * Une feuille de cadavre exquis est pliée en autant de volets qu'il y a de
 * mains ; un poème court retrouve donc exactement son pliage d'origine, un
 * vers par volet. Au-delà de cinq, on groupe : trente-sept volets ne seraient
 * plus un pliage mais un accordéon, et le dévoilement n'en finirait pas.
 */
export function plierEnPanneaux(n: number, max = PANNEAUX_MAX): number[][] {
  if (n <= 0) return []
  const k = Math.min(n, Math.max(1, max))
  const base = Math.floor(n / k)
  const reste = n % k
  const out: number[][] = []
  let i = 0
  for (let p = 0; p < k; p++) {
    const taille = base + (p < reste ? 1 : 0)
    out.push(Array.from({ length: taille }, (_, j) => i + j))
    i += taille
  }
  return out
}

/** La durée naturelle d'un vers, avant compression : l'encre, puis le silence. */
function naturel(texte: string): { duree: number; pause: number; mots: number; classe: Classe } {
  const mots = motsDuVers(texte)
  const classe = classeDeLongueur(mots)
  if (mots === 0) return { duree: 0, pause: PAUSE_BLANC, mots, classe }
  return { duree: BASE + PAR_MOT * mots, pause: PAUSE[classe], mots, classe }
}

/**
 * La partition complète du poème.
 *
 * Les plis s'enchaînent sans temps mort : le pli suivant commence à s'ouvrir
 * assez tôt pour que son papier soit prêt à l'instant exact où l'encre du
 * précédent s'arrête. L'ouverture ne coûte donc rien au budget, sauf la
 * première — celle qu'on regarde.
 */
export function partitionDuPoeme(
  lignes: string[],
  opts: { budget?: number; panneauxMax?: number } = {},
): Partition {
  const budget = opts.budget ?? BUDGET_ENCRE
  const groupes = plierEnPanneaux(lignes.length, opts.panneauxMax ?? PANNEAUX_MAX)
  if (groupes.length === 0) return { panneaux: [], vers: [], fin: 0, facteur: 1 }

  const mesures = lignes.map(naturel)
  const totalNaturel = mesures.reduce((n, m) => n + m.duree + m.pause, 0)
  const facteur = totalNaturel <= budget ? 1 : Math.max(PLANCHER, budget / totalNaturel)

  const vers: TempsVers[] = new Array(lignes.length)
  const panneaux: Panneau[] = []
  let ouverture = 0
  let finEncre = 0

  for (const groupe of groupes) {
    let t = ouverture + DUREE_DEPLI * RECOUVREMENT
    for (const i of groupe) {
      const m = mesures[i]
      vers[i] = { debut: t, duree: m.duree * facteur, mots: m.mots, classe: m.classe }
      t += (m.duree + m.pause) * facteur
    }
    panneaux.push({ lignes: groupe, ouverture })
    // Le dernier vers du pli a fini de s'écrire ici — sa pause finale sert de
    // couverture à l'ouverture du pli suivant.
    const dernier = vers[groupe[groupe.length - 1]]
    finEncre = dernier.debut + dernier.duree
    ouverture = Math.max(ouverture + ECART_MIN_PLIS, t - DUREE_DEPLI * RECOUVREMENT)
  }

  return { panneaux, vers, fin: finEncre, facteur: +facteur.toFixed(3) }
}
