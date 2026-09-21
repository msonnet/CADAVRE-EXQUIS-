/**
 * L'amorce du jour — la tête de la chaîne, décidée par le serveur.
 *
 * ── Pourquoi elle vit ICI et non dans `src` ───────────────────────────────
 *
 * C'est le serveur qui crée la chaîne du jour et qui y inscrit son amorce ;
 * le client la lit dans la réponse au lieu de la recalculer. Deux raisons :
 * une amorce calculée par le client serait une donnée que le client contrôle,
 * et deux joueurs dont les horloges divergent d'une minute autour de minuit
 * n'écriraient pas dans le même poème.
 *
 * Le dossier `api` est délibérément autonome — aucun de ses fichiers
 * n'importe depuis `src` — donc le tirage en file est recopié en bas plutôt
 * qu'importé, comme `_voices.ts` et `_determinants.ts` le font déjà.
 *
 * ── Courte, et c'est une règle ────────────────────────────────────────────
 *
 * Trois formes seulement : déterminant + nom, + adjectif, ou + verbe. Jamais
 * plus. Une amorce de six mots est déjà un vers : il ne resterait rien à
 * faire à la première main, et l'écho qu'elle transmet viendrait d'un texte
 * que personne n'a écrit.
 *
 * ── Les deux langues partagent l'INDEX, jamais le texte ───────────────────
 *
 * Même taille, même ordre : un joueur français et un joueur anglais
 * reçoivent la même amorce, traduite — et non deux jeux différents.
 */

export type Langue = 'fr' | 'en'

/** Trois mots au plus. */
export const MOTS_AMORCE_MAX = 3

/**
 * Combien d'amorces de la veille sont écartées du début du sac suivant.
 *
 * Le sac se vide un tirage par JOUR. Avec une fenêtre de 1, la même amorce
 * revenait parfois à DEUX jours d'écart — mesuré, 0,17 % des retours, deux
 * fois l'an, sur la seule chose que la page montre chaque matin. À 4 :
 * min 5 jours, médiane 41, et les quarante et une amorces sortent toutes.
 */
const FENETRE_RACCORD = 4

const FR = [
  // déterminant + nom
  'le cadavre', 'une horloge', 'la cire', 'un couteau', 'le vernis',
  'une paupière', 'le sel', 'un rochet', 'la rouille', 'une lampe',
  'le plâtre', 'un aimant', 'la craie', 'une serrure', 'le givre',
  // déterminant + nom + adjectif
  'un tambour sourd', 'la suie froide', 'une écluse ouverte', 'le cuivre humide',
  'un fanal éteint', 'la paille sèche', 'un escalier noir', 'le mercure lent',
  'une valise vide', 'le lierre patient', 'un miroir fendu', 'la chaux vive',
  // déterminant + nom + verbe
  'une balance penche', 'le charbon respire', 'une aiguille tourne',
  'le drap glisse', 'une porte bat', 'le sable monte', 'un cheval dort',
  'la lampe tremble', 'un train passe', 'le linge sèche', 'une clé tombe',
  'le vent range', 'une ombre attend', 'la neige tient',
]

const EN = [
  'the corpse', 'a clock', 'the wax', 'a knife', 'the varnish',
  'an eyelid', 'the salt', 'a ratchet', 'the rust', 'a lamp',
  'the plaster', 'a magnet', 'the chalk', 'a lock', 'the frost',
  'a muffled drum', 'the cold soot', 'an open floodgate', 'the damp copper',
  'a dead beacon', 'the dry straw', 'a black staircase', 'the slow mercury',
  'an empty suitcase', 'the patient ivy', 'a cracked mirror', 'the quicklime',
  'a scale tilts', 'the coal breathes', 'a needle turns',
  'the sheet slides', 'a door bangs', 'the sand rises', 'a horse sleeps',
  'the lamp trembles', 'a train passes', 'the linen dries', 'a key falls',
  'the wind tidies', 'a shadow waits', 'the snow holds',
]

/** L'amorce d'un jour donné, dans une langue donnée. Pure et déterministe. */
export function amorcePour(jour: string, langue: Langue): string {
  // L'index est tiré sur le sac FRANÇAIS et lu dans la langue demandée :
  // c'est ce qui garantit que les deux langues jouent la même journée.
  const index = FR.indexOf(tirageEnFile(FR, rangDuJour(jour), 'amorce', FENETRE_RACCORD))
  return (langue === 'en' ? EN : FR)[index]
}

/** Les sacs, pour la mesure. */
export function sacAmorces(langue: Langue = 'fr'): readonly string[] {
  return langue === 'en' ? EN : FR
}

/**
 * Le jour UTC, AAAA-MM-JJ.
 *
 * La seule horloge que tout le monde partage. Dès que les vers circulent, le
 * jour LOCAL devient impossible : un joueur à Lisbonne à 00 h 30 serait déjà
 * sur la journée suivante et ne pourrait pas s'asseoir à la même table qu'un
 * joueur à Paris. Le rendez-vous tourne donc à minuit UTC — soit 01 h ou
 * 02 h à Lamastre selon la saison.
 */
export function jourUTC(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

// ── Le tirage en file ────────────────────────────────────────────────────
// Recopié de `src/lib/tirage.ts` : le dossier api n'importe pas depuis src,
// comme `_voices.ts` et `_determinants.ts`. Les deux copies sont mesurées.

function rangDuJour(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number)
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000)
}

function hachage(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Un tirage reproductible, pour mélanger un sac à partir de son numéro. */
function melange<T>(items: T[], graine: number): T[] {
  const out = [...items]
  let x = (graine || 1) >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    // xorshift32 — déterministe, et sans les motifs d'un simple modulo
    x ^= x << 13; x >>>= 0
    x ^= x >> 17
    x ^= x << 5; x >>>= 0
    const j = x % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Un sac mélangé dont la tête ne répète jamais la queue du précédent.
 *
 * C'est LE défaut d'une file qui se vide : à l'intérieur d'un sac rien ne se
 * répète, mais au raccord entre deux sacs la dernière entrée de l'un peut
 * reparaître en tête de l'autre. Mesuré sur trente ans avant correction :
 * une amorce revenait parfois au bout d'UN jour, et comme une structure
 * pouvait elle aussi enjamber le raccord, il existait des jours où la
 * contrainte entière se répétait deux matins de suite.
 *
 * On échange donc la tête avec une position tirée du même mélange. Le sac
 * reste complet — aucune entrée n'est perdue, elles changent seulement
 * d'ordre — et le raccord cesse d'être une couture visible.
 *
 * L'échange ne touche JAMAIS la dernière position, et c'est ce qui rend la
 * garantie exacte au lieu d'approchée : pour savoir sur quoi finit le sac
 * précédent, il faut pouvoir le lire sans le corriger à son tour, sinon la
 * lecture appelle la lecture du sac d'avant, indéfiniment. En laissant la
 * queue intacte, un simple mélange suffit à la connaître. Premier jet :
 * l'échange pouvait tomber sur la dernière case, et le garde regardait
 * alors une queue qui n'était pas la vraie.
 */
function sacSansRaccord<T>(items: T[], sel: string, numeroSac: number, fenetre = 1): T[] {
  const graine = hachage(`${sel}:${numeroSac}`)
  const sac = melange(items, graine)
  // La fenêtre ne peut pas manger plus d'un tiers du sac, sinon il n'y a plus
  // assez de place pour reloger ce qu'on écarte.
  const f = Math.max(1, Math.min(fenetre, Math.floor(items.length / 3)))
  if (items.length < 2 * f + 1) return sac

  const precedent = melange(items, hachage(`${sel}:${numeroSac - 1}`))
  const queue = new Set(precedent.slice(precedent.length - f))

  for (let i = 0; i < f; i++) {
    if (!queue.has(sac[i])) continue
    // On reloge au-delà de la tête ET avant la queue : la dernière position
    // ne bouge jamais, c'est ce qui rend la lecture du sac précédent exacte.
    for (let k = f; k < sac.length - f; k++) {
      if (!queue.has(sac[k])) { [sac[i], sac[k]] = [sac[k], sac[i]]; break }
    }
  }
  return sac
}

/**
 * Le n-ième tirage d'une file qui se vide avant d'être refaite.
 *
 * `fenetre` dit combien d'entrées de la fin du sac précédent sont écartées de
 * la tête du suivant. Un seul suffit à une file tirée tous les trois jours ;
 * une file tirée TOUS LES JOURS — l'amorce du rendez-vous — en demande
 * davantage, sans quoi la même amorce revenait parfois à deux jours d'écart,
 * sur la seule chose que la page montre chaque matin.
 */
function tirageEnFile<T>(items: T[], rang: number, sel: string, fenetre = 1): T {
  const taille = items.length
  const numeroSac = Math.floor(rang / taille)
  const position = ((rang % taille) + taille) % taille
  return sacSansRaccord(items, sel, numeroSac, fenetre)[position]
}
