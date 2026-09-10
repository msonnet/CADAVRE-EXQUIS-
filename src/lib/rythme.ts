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

/**
 * Le temps accordé à l'encre de la TÊTE du poème, pauses comprises.
 *
 * Il ne s'applique qu'aux vers qu'on regarde vraiment — voir `VERS_ANIMES`.
 * Un budget étalé sur tout le poème ne le rend pas bref, il le rend
 * incompréhensible : c'est exactement le reproche qu'a valu la première
 * version.
 */
export const BUDGET_ENCRE = 8500

/** Ce que coûte un vers, avant même son premier mot. */
const BASE = 280
/** Ce que coûte chaque mot supplémentaire. */
const PAR_MOT = 105

/**
 * Le silence qui suit le vers, selon son souffle.
 *
 * Le COURT est le plus long des trois, et c'est délibéré : un vers d'un mot
 * n'a de force que si on le laisse résonner. Le LONG s'est déjà fait entendre
 * pendant qu'il s'écrivait.
 */
const PAUSE: Record<Classe, number> = { COURT: 380, MOYEN: 190, LONG: 260 }

/** Une ligne vide est une respiration, pas un vers. */
const PAUSE_BLANC = 260

/**
 * Le plancher de lisibilité — et c'est lui qui commande, pas le budget.
 *
 * ── Ce que la première version a raté ────────────────────────────────────
 *
 * Elle exprimait son plancher en RATIO : au minimum vingt-deux pour cent de
 * la vitesse naturelle. Sur le poème d'atelier à trente-sept vers, ça donnait
 * cent soixante-dix millisecondes par vers de sept mots, soit vingt-cinq
 * millisecondes par mot. À l'écran, ce n'est plus une écriture, c'est un
 * clignotement : on voit que quelque chose se passe sans pouvoir dire quoi.
 *
 * Un ratio ne sait rien de la lisibilité — il ne connaît que la vitesse
 * d'avant. Le plancher est donc réécrit en temps ABSOLU, la seule grandeur
 * dont l'œil ait quelque chose à faire : quel que soit le nombre de vers, un
 * mot ne paraît jamais en moins de cinquante-huit millisecondes, et un vers
 * jamais en moins de cent dix plus le compte de ses mots.
 *
 * La conséquence est assumée : le budget n'est PAS tenu sur les poèmes longs.
 * Trente-sept vers prennent une vingtaine de secondes. C'est le prix de
 * pouvoir les suivre, et la séquence se saute au doigt.
 */
const PLANCHER_VERS = 110
const PLANCHER_MOT = 58
const PLANCHER_PAUSE = 90

/**
 * La durée d'ouverture d'un pli.
 *
 * Sept cents millisecondes : trop rapide. C'est le pli qui porte la
 * compréhension de toute la scène — si on ne voit pas le papier s'ouvrir, il
 * ne reste qu'un texte qui apparaît par morceaux, et le geste se perd.
 */
export const DUREE_DEPLI = 1150

/**
 * Quelle part du dépli s'est écoulée quand l'encre commence.
 *
 * L'encre n'attend pas que le papier soit tout à fait à plat — ce
 * recouvrement empêche la séquence de se lire comme deux gestes cousus. Mais
 * il était à 0,62 : l'encre partait avant qu'on ait vu le volet s'ouvrir, et
 * les deux mouvements se mangeaient l'un l'autre.
 */
const RECOUVREMENT = 0.78

/**
 * Le temps mort entre le dernier mot d'un volet et l'ouverture du suivant.
 *
 * Sans lui, les volets s'enchaînaient sans respiration et le pliage se lisait
 * comme un défilement continu. C'est ce battement qui fait comprendre qu'on
 * ouvre une feuille volet par volet.
 */
const RESPIRATION_PANNEAU = 320

/** Deux plis ne s'ouvrent jamais à moins de ça l'un de l'autre. */
const ECART_MIN_PLIS = 420

/** Au-delà, le papier serait plié en accordéon plutôt qu'en feuillets. */
export const PANNEAUX_MAX = 5

/**
 * Combien de vers reçoivent le traitement complet, et pourquoi il y a une
 * limite du tout.
 *
 * ── L'arithmétique qu'on ne peut pas contourner ──────────────────────────
 *
 * Un vers lisible coûte au minimum un demi-tiers de seconde. Trente-sept vers
 * lisibles coûtent donc vingt à vingt-cinq secondes, quoi qu'on règle : le
 * plancher de lisibilité et la longueur du poème sont inconciliables, et
 * toute tentative de tenir les deux donne un clignotement.
 *
 * ── Ce qu'on regarde réellement ───────────────────────────────────────────
 *
 * Sur un téléphone, la carte du poème commence à deux cent cinquante pixels
 * du haut et un vers en occupe une cinquantaine, parfois deux fois plus quand
 * il se replie. **On voit neuf vers, pas trente-sept.** Les vingt-huit autres
 * s'animaient sous la ligne de flottaison, pour personne, et c'est ce temps
 * perdu qui obligeait à comprimer les neuf qu'on regarde.
 *
 * La tête reçoit donc le rythme entier, et le reste du poème est porté par un
 * dernier volet : il s'ouvre, et le texte est déjà écrit dessus. C'est du
 * reste ce que fait une vraie feuille qu'on déplie — on ne voit pas
 * apparaître ce qui est écrit au dos du pli, on le découvre d'un coup.
 */
export const VERS_ANIMES = 9

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

/** Le temps sous lequel un vers cesse d'être lisible, quel que soit le budget. */
function plancher(mots: number): number {
  return mots === 0 ? 0 : PLANCHER_VERS + PLANCHER_MOT * mots
}

/**
 * La partition complète du poème.
 *
 * Les volets s'enchaînent avec un battement : le suivant commence à s'ouvrir
 * assez tôt pour être prêt à l'instant exact où son encre arrive. L'ouverture
 * ne coûte donc presque rien, sauf la première — celle qu'on regarde.
 *
 * Au-delà de `VERS_ANIMES`, le reste du poème part dans un dernier volet dont
 * les vers sont déjà écrits à l'ouverture : ils sont sous la ligne de
 * flottaison, les animer ne coûterait que du temps volé à ceux qu'on voit.
 */
export function partitionDuPoeme(
  lignes: string[],
  opts: { budget?: number; panneauxMax?: number; versAnimes?: number } = {},
): Partition {
  const budget = opts.budget ?? BUDGET_ENCRE
  const panneauxMax = opts.panneauxMax ?? PANNEAUX_MAX
  if (lignes.length === 0) return { panneaux: [], vers: [], fin: 0, facteur: 1 }

  // La tête est animée ; la queue, s'il y en a une, prend le dernier volet.
  const tete = Math.min(lignes.length, Math.max(1, opts.versAnimes ?? VERS_ANIMES))
  const queue = lignes.length - tete
  const groupes = plierEnPanneaux(tete, queue > 0 ? panneauxMax - 1 : panneauxMax)
  if (queue > 0) groupes.push(Array.from({ length: queue }, (_, j) => tete + j))

  const mesures = lignes.map(naturel)
  // Le budget ne compte que la tête : c'est elle qu'il règle.
  const totalTete = mesures.slice(0, tete).reduce((n, m) => n + m.duree + m.pause, 0)
  // Le facteur vise le budget ; le plancher, appliqué vers par vers plus bas,
  // décide en dernier ressort.
  const facteur = totalTete <= budget ? 1 : budget / totalTete

  const vers: TempsVers[] = new Array(lignes.length)
  const panneaux: Panneau[] = []
  let ouverture = 0
  let finEncre = 0

  for (const groupe of groupes) {
    const deja = groupe[0] >= tete
    let t = ouverture + DUREE_DEPLI * RECOUVREMENT
    for (const i of groupe) {
      const m = mesures[i]
      // La compression s'arrête au plancher : mieux vaut une séquence plus
      // longue qu'une séquence qu'on ne peut pas suivre.
      const duree = deja ? 0 : Math.max(m.duree * facteur, plancher(m.mots))
      // Le volet de queue s'ouvre sur un texte déjà là : tous ses vers
      // partagent le même instant, celui de son ouverture.
      vers[i] = { debut: t, duree, mots: m.mots, classe: m.classe }
      if (!deja) t += duree + Math.max(m.pause * facteur, PLANCHER_PAUSE)
    }
    panneaux.push({ lignes: groupe, ouverture })
    const dernier = vers[groupe[groupe.length - 1]]
    finEncre = dernier.debut + dernier.duree
    // Le volet suivant s'ouvre assez tôt pour être prêt quand son encre
    // arrive — soit après le battement qui suit le dernier mot du volet
    // courant.
    ouverture = Math.max(
      ouverture + ECART_MIN_PLIS,
      t + RESPIRATION_PANNEAU - DUREE_DEPLI * RECOUVREMENT,
    )
  }

  return { panneaux, vers, fin: finEncre, facteur: +facteur.toFixed(3) }
}
