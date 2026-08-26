/**
 * Le diagnostic de FORME d'un poème, et la garde qui va avec.
 *
 * Il existait déjà un diagnostic de déterminant (`determinants.ts`) parce
 * qu'une monotonie ne se corrige que si on sait la compter. Celui-ci compte
 * l'autre monotonie, celle des formes de vers — et il naît de la même façon,
 * d'un poème qui sonnait faux.
 *
 * ── Ce qu'on a mesuré, et pourquoi la mesure d'avant ne suffisait pas ────
 *
 * Sur un atelier de dix-huit vers à dix-huit voix, le premier avec les formes
 * inachevées : 62 % de vers inachevés, ce qui était la cible. Mais SEPT vers
 * sur seize étaient des listes — « certifier, fondre, tasser, muer »,
 * « un athanor, du pendage, un sillon, un volcan » — dont deux paires
 * consécutives.
 *
 * L'erreur était dans la mesure : je comptais « inachevé » sans distinguer une
 * suspension d'une énumération. Or une liste n'est pas une parole inachevée,
 * c'est une forme DÉGÉNÉRÉE : elle n'a aucune syntaxe, et quatre mots
 * juxtaposés coûtent exactement le même effort à la machine qu'à personne.
 * Elle avait remplacé le métronome de la proposition complète par un
 * métronome plus pauvre.
 *
 * On compte donc les familles séparément, et chacune a son plafond.
 */

/** Les familles de forme. La proposition complète en est une comme une autre. */
export type Famille =
  | 'PROPOSITION'   // sujet, verbe, et le reste — la phrase qui se ferme
  | 'LISTE'         // énumération de noms, litanie d'infinitifs
  | 'SUSPENS'       // la phrase s'arrête avant sa fin
  | 'APPOSITION'    // deux groupes nominaux côte à côte, sans verbe
  | 'DISLOCATION'   // « il est grand le silence des saisons »
  | 'SYNTAGME'      // « au travers un trésor » — une préposition et rien après
  | 'MOT'           // un mot seul, tout le vers

export const FAMILLES: Famille[] = [
  'PROPOSITION', 'LISTE', 'SUSPENS', 'APPOSITION', 'DISLOCATION', 'SYNTAGME', 'MOT',
]

/** Les rôles affichés dans les coutures, rangés par famille. */
const ROLE_VERS_FAMILLE: Record<string, Famille> = {
  'ÉNUMÉRATION': 'LISTE', 'LIST': 'LISTE',
  'LITANIE': 'LISTE', 'LITANY': 'LISTE',
  'SUSPENS': 'SUSPENS', 'SUSPENDED': 'SUSPENS',
  'APPOSITION': 'APPOSITION',
  'DISLOCATION': 'DISLOCATION',
  'SYNTAGME': 'SYNTAGME', 'PHRASE': 'SYNTAGME',
  'UN MOT': 'MOT', 'ONE WORD': 'MOT',
}

/**
 * L'ordre de force des familles.
 *
 * Un vers peut porter plusieurs marques — « tandis que le carreau froid, une
 * lampe, un verre » est une suspension QUI s'allonge par appositions. Prendre
 * la première marque rencontrée donnait des familles fausses, et le plafond
 * des listes ne s'appliquait plus à celles qui se cachaient derrière une
 * apposition. On prend donc la marque la plus forte.
 */
const FORCE: Famille[] = ['MOT', 'DISLOCATION', 'SYNTAGME', 'SUSPENS', 'LISTE', 'APPOSITION']

/**
 * La famille d'un vers, lue sur les rôles de ses cases.
 *
 * On lit les RÔLES et non le texte : c'est la séance qui sait ce qu'elle a
 * demandé, et un vers ne trahit pas toujours sa forme à la lecture.
 */
export function familleDuVers(roles: string[]): Famille {
  const vues = new Set<Famille>()
  for (const r of roles) {
    const f = ROLE_VERS_FAMILLE[r]
    if (f) vues.add(f)
  }
  for (const f of FORCE) if (vues.has(f)) return f
  return 'PROPOSITION'
}

export interface DiagnosticFormes {
  total: number
  comptes: Record<Famille, number>
  parts: Record<Famille, number>
  plusLongueSerie: number
  familleDeLaSerie: Famille | null
  /** Combien de familles différentes se font entendre. */
  diversite: number
  familles: Famille[]
}

const vide = (): Record<Famille, number> =>
  Object.fromEntries(FAMILLES.map(f => [f, 0])) as Record<Famille, number>

/** Mesure la forme d'un poème, vers par vers. */
export function diagnosticFormes(versRoles: string[][]): DiagnosticFormes {
  const familles = versRoles.map(familleDuVers)
  const comptes = vide()
  for (const f of familles) comptes[f]++

  const total = familles.length || 1
  const parts = vide()
  for (const f of FAMILLES) parts[f] = +(comptes[f] / total).toFixed(3)

  let plusLongue = 0, courante = 0
  let precedente: Famille | null = null, familleSerie: Famille | null = null
  for (const f of familles) {
    if (f === precedente) courante++
    else { courante = 1; precedente = f }
    if (courante > plusLongue) { plusLongue = courante; familleSerie = f }
  }

  return {
    total: familles.length,
    comptes,
    parts,
    plusLongueSerie: plusLongue,
    familleDeLaSerie: familleSerie,
    diversite: FAMILLES.filter(f => comptes[f] > 0).length,
    familles,
  }
}

/**
 * Les plafonds, en part du poème.
 *
 * La LISTE est la seule vraiment bridée, et c'est délibéré : elle n'a pas de
 * syntaxe, elle ne coûte rien, et le modèle y va tout seul dès qu'on la lui
 * ouvre. Sept vers sur seize dans le poème mesuré. Un ou deux par poème
 * suffisent à faire respirer, au-delà c'est le poème qui s'arrête de parler.
 *
 * La PROPOSITION n'a pas de plafond : c'est le fond sur lequel les autres se
 * détachent. Sans elle, l'inachevé n'est plus un écart, il devient la norme.
 */
export const PLAFOND_PART: Partial<Record<Famille, number>> = {
  LISTE: 0.12,
  MOT: 0.12,
  SUSPENS: 0.22,
  DISLOCATION: 0.18,
  SYNTAGME: 0.15,
  APPOSITION: 0.18,
}

/**
 * Le poids de chaque famille au tirage.
 *
 * La LISTE est à dix pour cent des tirages inachevés, soit un vers sur vingt
 * au plus — et c'est délibéré. Elle était à deux variantes sur cinq dans le
 * vivier, ce qui a donné sept listes sur seize vers : le modèle y va tout
 * seul, elle ne coûte rien, et elle n'a aucune syntaxe. Les deux formes que
 * le médium écrivait lui-même — la dislocation et le syntagme flottant —
 * pèsent ensemble trois fois plus.
 */
export const POIDS_FAMILLE: Record<Famille, number> = {
  SUSPENS: 26,
  DISLOCATION: 20,
  APPOSITION: 18,
  SYNTAGME: 16,
  MOT: 10,
  LISTE: 10,
  PROPOSITION: 0,   // jamais tirée ici : elle est le fond, pas un écart
}

/** Combien de vers d'affilée une même famille peut tenir. */
const SERIE_MAX: Partial<Record<Famille, number>> = {
  LISTE: 1,          // jamais deux listes de suite — c'était la faute la plus audible
  MOT: 1,
  SYNTAGME: 1,
  DISLOCATION: 1,
  APPOSITION: 2,
  SUSPENS: 2,
  PROPOSITION: 3,
}

/**
 * La garde des formes — l'exact pendant de GardeOuverture, un cran au-dessus.
 *
 * Elle répond à une seule question : quelles familles sont encore permises au
 * prochain vers ? Deux motifs de refus, la série et le plafond.
 */
export class GardeFormes {
  private histoire: Famille[] = []
  private readonly totalPrevu: number

  constructor(totalPrevu: number, histoire: Famille[] = []) {
    this.totalPrevu = Math.max(1, totalPrevu)
    this.histoire = [...histoire]
  }

  /** Les familles encore recevables au prochain vers. */
  permises(): Set<Famille> {
    const ok = new Set<Famille>(FAMILLES)
    const comptes = vide()
    for (const f of this.histoire) comptes[f]++

    for (const f of FAMILLES) {
      // Le plafond du poème, calculé sur le total PRÉVU : sans quoi les
      // premiers vers seraient tous refusés (une liste sur deux vers écrits
      // fait 50 %) et les derniers n'auraient plus aucune limite.
      const plafond = PLAFOND_PART[f]
      if (plafond !== undefined && comptes[f] >= Math.max(1, Math.round(plafond * this.totalPrevu))) {
        ok.delete(f)
      }
      // La série en cours.
      const max = SERIE_MAX[f] ?? 2
      if (this.histoire.length >= max && this.histoire.slice(-max).every(x => x === f)) {
        ok.delete(f)
      }
    }
    // On ne ferme jamais toutes les portes : la proposition reste le fond.
    if (!ok.size) ok.add('PROPOSITION')
    return ok
  }

  enregistrer(f: Famille): void {
    this.histoire.push(f)
  }
}
