/**
 * Le cadavre du jour à plusieurs mains — la logique de distribution.
 *
 * ── Ce que c'est ──────────────────────────────────────────────────────────
 *
 * Tu n'écris pas un poème : tu écris UNE case d'un poème commencé par
 * quelqu'un d'autre. Tu vois l'amorce du jour — elle est publique — et rien
 * d'autre. Le poème se scelle quand ses cases sont pleines, et tu découvres
 * alors où ta main a atterri, entre des mains que tu ne connaîtras jamais.
 *
 * C'est le cadavre exquis de 1925 : plusieurs mains, chacune aveugle des
 * autres, une syntaxe correcte et des images impossibles. Les voix de l'IA
 * n'y remplacent pas les joueurs — elles prennent les sièges que personne
 * n'a pris.
 *
 * ── Le monde vide est une contrainte de conception, pas un problème ───────
 *
 * Un poème n'attend JAMAIS quatre humains. Une case ouverte depuis trop
 * longtemps revient à une voix. Avec un seul joueur : une case écrite, trois
 * voix, le poème scellé dans l'heure. Avec six cents : scellé en trois
 * minutes, tout en mains humaines. La forme de l'expérience ne change pas,
 * seule la proportion — et elle s'affiche, « IV mains, dont une humaine ».
 *
 * ── Ce module ne fait que décider ─────────────────────────────────────────
 *
 * Aucune entrée-sortie, aucune date implicite : on lui passe l'état et
 * l'instant, il répond. C'est ce qui le rend mesurable, et c'est là que
 * toutes les règles du rendez-vous sont écrites — pas dispersées dans des
 * requêtes SQL qu'on ne peut pas éprouver.
 */

/** Une case d'un poème en cours. `main` absente = siège libre. */
export interface Siege {
  rang: number
  /** L'identité qui l'a remplie, ou null si elle attend encore. */
  main: string | null
  /** true si c'est une voix qui a pris le siège. */
  voix?: boolean
  /** Quand le siège a été rempli — sert à dater le poème, pas à décider. */
  pose?: number
}

export interface PoemeEnCours {
  id: string
  /** Quand le poème a été ouvert : c'est de là que court l'attente. */
  ouvert: number
  sieges: Siege[]
}

/**
 * Au bout de combien de temps une voix prend un siège libre.
 *
 * Douze minutes : assez pour qu'une vraie main passe aux heures vives, assez
 * court pour qu'un joueur seul voie son poème se sceller avant d'avoir oublié
 * qu'il l'avait commencé. C'est le seul cadran du rendez-vous, et il se règle
 * ici.
 */
export const ATTENTE_VOIX_MS = 12 * 60 * 1000

/** Le fragment le plus long qu'on accepte — une case, pas un vers. */
export const MAX_FRAGMENT = 80

export type Verdict =
  | { quoi: 'siege'; poeme: string; rang: number }
  | { quoi: 'ouvrir' }
  | { quoi: 'rien' }

/**
 * Quel siège tendre à cette main.
 *
 * Trois règles, dans cet ordre, et chacune a sa raison :
 *
 * 1. JAMAIS deux fois dans le même poème. Une main qui remplirait deux cases
 *    d'une même phrase cesserait d'être aveugle : elle verrait la moitié du
 *    poème et pourrait le diriger. C'est la règle qui protège le jeu.
 * 2. Le poème le PLUS AVANCÉ d'abord. On finit ce qui est commencé plutôt que
 *    d'éparpiller les mains sur dix poèmes à moitié vides — sans quoi, avec
 *    peu de joueurs, tout serait scellé par des voix.
 * 3. À égalité, le plus ANCIEN. Il a le plus attendu ; c'est aussi ce qui
 *    l'empêche d'être comblé par une voix.
 */
export function prochainSiege(
  poemes: PoemeEnCours[],
  main: string,
  nbCases: number,
): Verdict {
  const ouverts = poemes.filter(p => {
    if (p.sieges.some(s => s.main === main)) return false
    return p.sieges.some(s => s.main === null)
  })

  if (!ouverts.length) {
    // Rien à remplir : on n'ouvre un poème que si cette main peut l'entamer.
    // Un poème créé sans main dedans serait un stock fantôme, scellé par des
    // voix et payé pour personne.
    return nbCases > 1 ? { quoi: 'ouvrir' } : { quoi: 'rien' }
  }

  const rempli = (p: PoemeEnCours) => p.sieges.filter(s => s.main !== null).length
  ouverts.sort((a, b) => (rempli(b) - rempli(a)) || (a.ouvert - b.ouvert))

  const p = ouverts[0]
  const libre = p.sieges.find(s => s.main === null)!
  return { quoi: 'siege', poeme: p.id, rang: libre.rang }
}

/**
 * Les sièges qu'une voix doit prendre maintenant.
 *
 * Appelé PARESSEUSEMENT, à chaque fois qu'une main se présente : pas de
 * tâche à minuit, donc pas de question de fuseau horaire. Le cron horaire
 * qui existe déjà sert de filet pour les journées sans personne.
 *
 * On ne comble que le PREMIER siège libre d'un poème en souffrance, jamais
 * tous : un poème à moitié écrit doit garder sa chance de recevoir une vraie
 * main au prochain passage. Combler d'un coup le scellerait en une fois et
 * chasserait les humains de leur propre rendez-vous.
 */
export function siegesAAffranchir(
  poemes: PoemeEnCours[],
  maintenant: number,
  attente = ATTENTE_VOIX_MS,
): { poeme: string; rang: number }[] {
  const dus: { poeme: string; rang: number }[] = []
  for (const p of poemes) {
    if (maintenant - p.ouvert < attente) continue
    const libre = p.sieges.find(s => s.main === null)
    if (libre) dus.push({ poeme: p.id, rang: libre.rang })
  }
  return dus
}

/** Un poème est scellé quand aucun siège n'attend plus. */
export function estScelle(p: PoemeEnCours): boolean {
  return p.sieges.every(s => s.main !== null)
}

/** Combien de mains humaines — ce que la page annonce, sans le farder. */
export function mainsHumaines(p: PoemeEnCours): number {
  return p.sieges.filter(s => s.main !== null && !s.voix).length
}

/**
 * Un fragment est-il recevable ?
 *
 * On refuse ici ce qui n'est pas une case : le vide, et ce qui déborde. La
 * longueur n'est pas une politesse — un joueur qui écrirait une phrase
 * entière dans la case « un adjectif » écrirait le poème des autres à leur
 * place, et le cadavre exquis cesserait d'en être un.
 */
export function fragmentRecevable(texte: string): boolean {
  const t = texte.trim()
  return t.length > 0 && t.length <= MAX_FRAGMENT && !/[\r\n]/.test(t)
}
