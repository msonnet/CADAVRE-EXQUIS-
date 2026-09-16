import type { StructureId } from '../types'
import { langueActuelle } from '../i18n'

/**
 * La contrainte du jour — le rituel quotidien.
 *
 * ── Pourquoi une amorce et non un thème ───────────────────────────────────
 *
 * Un thème (« écris sur la nuit ») n'est pas une contrainte de cadavre
 * exquis : il demande une intention, or le jeu repose sur l'absence
 * d'intention partagée. Une AMORCE, elle, est la pratique de Breton même —
 * « Le cadavre exquis boira le vin nouveau » commence par un article et un
 * nom donnés. Tout le monde reçoit le même premier fragment et écrit la
 * suite à l'aveugle. Dix poèmes du jour deviennent alors comparables : ils
 * partent du même mot et divergent.
 *
 * ── Pourquoi c'est déterministe et sans serveur ───────────────────────────
 *
 * La date suffit. Deux joueurs du même jour tirent la même contrainte sans
 * qu'aucun registre ne les départage, hors ligne compris. C'est ce qui rend
 * ce rituel gratuit à faire tourner : rien à héberger, rien à synchroniser,
 * rien qui tombe en panne.
 *
 * La contrepartie est assumée : le jour est LOCAL, comme la série
 * (`streak.ts`) et comme l'ambiance (`reve/Decor.tsx`). Un joueur à Tokyo
 * reçoit donc la contrainte du 16 pendant qu'un joueur à Lamastre écrit
 * encore celle du 15. Chacun a la sienne le jour où il la vit, ce qui est
 * l'attente naturelle ; une révélation à heure fixe, elle, exigerait une
 * horloge commune et donc un serveur.
 *
 * ── Pourquoi la structure tourne au lieu d'être tirée ─────────────────────
 *
 * Un simple hachage donnerait des séries — quatre « phrase étoffée »
 * d'affilée arrivent souvent sur trois valeurs. On vide donc une file
 * mélangée avant d'en tirer une nouvelle, exactement comme `repartirVoix`
 * répartit les voix de l'Atelier. Même chose pour les amorces : aucune ne
 * revient avant que son sac ne soit vide.
 *
 * ── Pourquoi des voix, et non zéro ────────────────────────────────────────
 *
 * Premier jet : zéro voix, pour que le rituel n'entame jamais l'encrier.
 * C'était une bonne réponse économique et une mauvaise réponse de jeu — un
 * cadavre exquis écrit d'une seule main n'est pas un cadavre exquis, c'est
 * un exercice. Le rendez-vous quotidien doit être le JEU, pas sa version
 * amoindrie.
 *
 * Le nombre de voix est donc lui aussi tiré du jour : la table change d'un
 * matin à l'autre, comme l'amorce.
 *
 * Conséquence assumée, et elle se règle ailleurs : une partie avec voix se
 * décompte de l'encrier comme toutes les autres (`ouvrirPartieIA`). Si le
 * rituel doit rester gratuit au-delà de la réserve d'essai, c'est un acte
 * `cadavre_jour` exempté et plafonné à un par jour qu'il faut ajouter dans
 * `api/_acces.ts`, sur le modèle d'`avatar` — pas une exception ici.
 */

export interface ContrainteDuJour {
  /** AAAA-MM-JJ local — la clé du jour, et ce qui se compare. */
  jour: string
  structureId: Extract<StructureId, 'phrase-simple' | 'phrase-etoffee' | 'vers-libre'>
  /** Le premier fragment, donné à tous. Il remplit la case 1. */
  amorce: string
  /**
   * Le nombre de cases du jour. Fixe pour tout le monde — en vers libre il
   * est d'ordinaire tiré au sort par partie, ce qui rendrait deux poèmes du
   * même jour incomparables.
   */
  nbCases: number
  /** Combien de voix t'accompagnent. Jamais zéro : c'est un cadavre exquis. */
  voixIA: number
}

/** Les trois structures du cadavre écrit. L'Atelier n'en est pas : une séance
 *  de trente-sept vers n'est pas un rituel quotidien. */
const STRUCTURES: ContrainteDuJour['structureId'][] = [
  'phrase-simple', 'phrase-etoffee', 'vers-libre',
]

/**
 * Les amorces, par structure et par langue.
 *
 * Chaque case 1 a son type : « article + nom » en phrase étoffée, un groupe
 * nominal plus ample en phrase courte, un vers entier en vers libre. Une
 * amorce qui ne tient pas dans sa case casserait la grammaire du jeu dès le
 * premier mot.
 *
 * Les deux langues ont le MÊME nombre d'amorces, dans le même ordre : c'est
 * ce qui fait qu'un joueur français et un joueur anglais reçoivent la même
 * contrainte le même jour, et non deux jeux différents.
 */
const AMORCES_FR: Record<ContrainteDuJour['structureId'], string[]> = {
  'phrase-etoffee': [
    'le cadavre', 'une horloge', 'la cire', 'un couteau', 'le vernis',
    'une paupière', 'le sel', 'un rochet', 'la rouille', 'une lampe',
    'le plâtre', 'un aimant', 'la craie', 'une serrure', 'le givre',
    'un tambour', 'la suie', 'une écluse', 'le cuivre', 'un fanal',
    'la paille', 'un escalier', 'le mercure', 'une valise', 'le lierre',
    'un miroir', 'la chaux', 'une balance', 'le charbon', 'une aiguille',
  ],
  'phrase-simple': [
    'la main gauche du dormeur', 'un train sans wagons', 'la dernière lampe du couloir',
    'une femme faite de sel', 'le plancher de la chambre haute', 'un orage rangé dans un tiroir',
    'la doublure du manteau', 'trois horloges arrêtées', 'le facteur des dimanches',
    'une porte qui donne sur la mer', 'le silence entre deux gares', 'un chien de plâtre',
    'la poussière des greniers', 'une échelle sans barreaux', 'le côté nord du visage',
    'un piano rempli d\'eau', 'la fumée des cheminées basses', 'une clé sans serrure',
    'le drap du lit défait', 'un jardin sous la neige', 'la voix des appareils éteints',
    'une montre de gousset', 'le rideau de la salle vide', 'un pont qui ne mène nulle part',
    'la craie des tableaux noirs', 'une barque à l\'envers', 'le fond des poches',
    'un phare dans les terres', 'la couture du gant', 'une chaise dans le couloir',
  ],
  'vers-libre': [
    'la nuit déplie ses outils', 'quelqu\'un a laissé la mer ouverte',
    'les horloges avalent leur propre bruit', 'un escalier descend dans le sel',
    'la cire se souvient des doigts', 'personne ne ferme les tiroirs du nord',
    'le vent range les chaises lentement', 'une lampe brûle sous l\'eau',
    'les mains poussent contre la vitre', 'un train traverse la chambre haute',
    'la craie tombe sans se briser', 'quelque chose respire dans le plâtre',
    'les miroirs changent de côté', 'une porte bat dans le grenier vide',
    'le sel monte le long des murs', 'quelqu\'un compte les marches à l\'envers',
    'la rouille avance sur les noms', 'un cheval dort debout dans l\'armoire',
    'les fenêtres regardent vers l\'intérieur', 'une valise s\'ouvre toute seule',
    'le givre écrit sur les paupières', 'personne n\'a rallumé le phare',
    'les papiers volent sans se poser', 'une écluse s\'ouvre dans le sommeil',
    'le cuivre chante quand on l\'oublie', 'un drap glisse le long du couloir',
    'les racines remontent vers la lampe', 'quelqu\'un marche sur le toit d\'en face',
    'la suie retombe en silence', 'une balance pèse de l\'air',
  ],
}

const AMORCES_EN: Record<ContrainteDuJour['structureId'], string[]> = {
  'phrase-etoffee': [
    'the corpse', 'a clock', 'the wax', 'a knife', 'the varnish',
    'an eyelid', 'the salt', 'a ratchet', 'the rust', 'a lamp',
    'the plaster', 'a magnet', 'the chalk', 'a lock', 'the frost',
    'a drum', 'the soot', 'a floodgate', 'the copper', 'a beacon',
    'the straw', 'a staircase', 'the mercury', 'a suitcase', 'the ivy',
    'a mirror', 'the lime', 'a scale', 'the coal', 'a needle',
  ],
  'phrase-simple': [
    'the sleeper\'s left hand', 'a train with no carriages', 'the last lamp in the corridor',
    'a woman made of salt', 'the floor of the upper room', 'a storm kept in a drawer',
    'the lining of the coat', 'three stopped clocks', 'the Sunday postman',
    'a door opening onto the sea', 'the silence between two stations', 'a plaster dog',
    'the dust of attics', 'a ladder with no rungs', 'the north side of the face',
    'a piano full of water', 'the smoke of low chimneys', 'a key with no lock',
    'the sheet of the unmade bed', 'a garden under snow', 'the voice of switched-off machines',
    'a pocket watch', 'the curtain of the empty hall', 'a bridge leading nowhere',
    'the chalk of blackboards', 'an upturned boat', 'the bottom of pockets',
    'a lighthouse inland', 'the seam of the glove', 'a chair in the hallway',
  ],
  'vers-libre': [
    'night unfolds its tools', 'someone left the sea open',
    'the clocks swallow their own sound', 'a staircase goes down into the salt',
    'the wax remembers the fingers', 'no one closes the northern drawers',
    'the wind puts the chairs away slowly', 'a lamp burns underwater',
    'hands push against the glass', 'a train crosses the upper room',
    'the chalk falls without breaking', 'something breathes inside the plaster',
    'the mirrors change sides', 'a door bangs in the empty attic',
    'the salt climbs the walls', 'someone counts the stairs backwards',
    'the rust moves across the names', 'a horse sleeps standing in the wardrobe',
    'the windows look inward', 'a suitcase opens by itself',
    'the frost writes on the eyelids', 'no one has relit the beacon',
    'the papers fly without settling', 'a floodgate opens in sleep',
    'the copper sings when forgotten', 'a sheet slides along the corridor',
    'the roots climb towards the lamp', 'someone walks on the opposite roof',
    'the soot falls in silence', 'a scale weighs air',
  ],
}

/** Vers libre : la longueur du jour. Bornée serré — un rituel se tient en
 *  deux minutes, et `nombreCasesEffectif` irait jusqu'à douze. */
const VERS_LIBRE_MIN = 4
const VERS_LIBRE_MAX = 7

/** Le jour local, AAAA-MM-JJ. Même règle que la série et que l'ambiance. */
export function jourLocal(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

/** Le rang du jour depuis l'époque — l'index qui fait avancer les files. */
function rangDuJour(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number)
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000)
}

/** FNV-1a 32 bits — petit, sans dépendance, et suffisamment mélangeant pour
 *  décider de l'ordre d'un sac de trente entrées. */
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
function sacSansRaccord<T>(items: T[], sel: string, numeroSac: number): T[] {
  const graine = hachage(`${sel}:${numeroSac}`)
  const sac = melange(items, graine)
  if (items.length < 3) return sac
  const precedent = melange(items, hachage(`${sel}:${numeroSac - 1}`))
  if (Object.is(sac[0], precedent[precedent.length - 1])) {
    // 1 à length-2 : la queue reste où elle est.
    const j = 1 + (graine % (sac.length - 2))
    ;[sac[0], sac[j]] = [sac[j], sac[0]]
  }
  return sac
}

/**
 * Le n-ième tirage d'une file qui se vide avant d'être refaite.
 *
 * Aucune entrée ne revient tant que les autres n'ont pas servi — le même
 * raisonnement que `repartirVoix` à l'Atelier, plus la couture du raccord
 * ci-dessus, que l'Atelier n'a pas à traiter parce qu'un poème s'arrête.
 */
function tirageEnFile<T>(items: T[], rang: number, sel: string): T {
  const taille = items.length
  const numeroSac = Math.floor(rang / taille)
  const position = ((rang % taille) + taille) % taille
  return sacSansRaccord(items, sel, numeroSac)[position]
}

/**
 * Le rang de l'amorce, qui n'est PAS celui du jour.
 *
 * Premier jet : les amorces étaient indexées par le rang du jour. Comme la
 * structure change tous les jours, chaque sac de trente n'était alors visité
 * qu'à un tiers de ses positions — vingt amorces sur trente ne sortaient
 * jamais dans leur sac, et le test l'a vu avant moi.
 *
 * Or un sac de structures contient les trois exactement une fois. Le numéro
 * de ce sac EST donc l'ordinal de la structure du jour : à son k-ième
 * passage, une structure pioche la k-ième amorce de sa propre file. Chaque
 * sac d'amorces se vide alors pour de bon, en trente passages — environ
 * quatre-vingt-dix jours.
 */
function rangDeLAmorce(rang: number): number {
  return Math.floor(rang / STRUCTURES.length)
}

/** La contrainte d'un jour donné. Pure : même date, même résultat, partout. */
export function contrainteDuJour(d = new Date()): ContrainteDuJour {
  const jour = jourLocal(d)
  const rang = rangDuJour(jour)

  const structureId = tirageEnFile(STRUCTURES, rang, 'structure')

  // Les deux langues partagent l'INDEX, jamais le texte : c'est ainsi que
  // deux joueurs de langues différentes reçoivent la même contrainte.
  const pool = AMORCES_FR[structureId]
  const index = pool.indexOf(
    tirageEnFile(pool, rangDeLAmorce(rang), `amorce:${structureId}`))
  const amorces = langueActuelle() === 'en' ? AMORCES_EN : AMORCES_FR
  const amorce = amorces[structureId][index]

  const nbCases = structureId === 'vers-libre'
    ? VERS_LIBRE_MIN + (hachage(`longueur:${jour}`) % (VERS_LIBRE_MAX - VERS_LIBRE_MIN + 1))
    : (structureId === 'phrase-simple' ? 3 : 5)

  // Une à trois voix, bornées par la table : au-delà de la moitié des cases
  // restantes, le joueur ne tiendrait plus la plume assez souvent pour que
  // le poème soit aussi le sien.
  const placesLibres = Math.max(1, nbCases - 1)
  const maxVoix = Math.max(1, Math.min(3, Math.ceil(placesLibres / 2)))
  const voixIA = 1 + (hachage(`voix:${jour}`) % maxVoix)

  return { jour, structureId, amorce, nbCases, voixIA }
}

/** Combien d'amorces par structure — le test s'en sert, et le rythme aussi. */
export function tailleDuSac(structureId: ContrainteDuJour['structureId']): number {
  return AMORCES_FR[structureId].length
}

/**
 * Les voix du jour : les mêmes pour tout le monde.
 *
 * Elles étaient tirées par joueur, fenêtre glissante sur les personas
 * récentes. Deux poèmes du même jour différaient donc surtout parce que le
 * TIRAGE avait différé — on comparait des tirages, pas des mains. Or c'est
 * la main qu'on vient lire.
 *
 * Tirées du jour, tout le monde s'assoit à la même table : même amorce,
 * même structure, même longueur, mêmes personas aux mêmes places. La seule
 * variable restante est humaine.
 *
 * Ce qui n'est PAS partagé, et qu'on assume : le TEXTE que chaque voix
 * écrit, puisqu'il est engendré à chaque appel. C'est le bruit du jeu, pas
 * un défaut de conception — le partager exigerait un serveur.
 */
export function voixDuJour(ids: readonly string[], nb: number, jour: string): string[] {
  if (!ids.length || nb <= 0) return []
  const sac = melange([...ids], hachage(`table:${jour}`))
  // Le sac est plus grand que la table : on prend les premières, sans
  // répétition tant que la table tient dans le sac.
  return Array.from({ length: nb }, (_, i) => sac[i % sac.length])
}

export const STRUCTURES_DU_RITUEL = STRUCTURES
