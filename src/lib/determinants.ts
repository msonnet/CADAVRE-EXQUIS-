/**
 * Idiolecte de déterminant par voix, et garde d'ouverture de vers.
 *
 * Mesuré sur un atelier réel de 30 vers : DOUZE vers consécutifs ouvraient sur
 * « le » ou « la ». La cause est dans la contrainte envoyée au modèle — elle
 * est la même pour les 46 voix, et ses exemples ouvrent sur « le silence » :
 *
 *   '2 MOTS EXACTEMENT : article + nom — ex : "le silence", "une ombre"…'
 *
 * Le déterminant n'était donc pas un choix, et les 46 voix rendaient toutes
 * l'article défini singulier.
 *
 * ── Ce qui est porté du module, et ce qui ne l'est pas ────────────────────
 *
 * La table d'idiolectes, la garde d'ouverture, la soudure des élisions et le
 * diagnostic sont repris tels quels : c'est là que vit l'intention.
 *
 * En revanche on NE fabrique PAS le groupe nominal à partir d'un nom nu.
 * Le faire demanderait de deviner le genre, et les voix inventent un
 * vocabulaire sans bornes — « paraison », « mordançage », « lacis »,
 * « remige ». L'heuristique du module se tromperait : « remige » ne tombe
 * dans aucun de ses suffixes féminins et sortirait « un remige », qui est
 * précisément la faute déjà présente dans le poème examiné. On transmet donc
 * la STRATÉGIE au modèle, qui connaît le genre, et on garde le contrôle de
 * la distribution sans prendre le risque de l'accord.
 */

/** Familles de déterminants — c'est sur elles que porte la garde d'ouverture. */
export const FAMILLE: Record<string, string> = {
  defini: 'DEF', defini_pl: 'DEF', juridique: 'DEF',
  indefini: 'IND', indefini_pl: 'IND',
  partitif: 'PART',
  demonstratif: 'DEM',
  poss_1s: 'POSS', poss_2s: 'POSS', poss_2p: 'POSS', poss_3s: 'POSS',
  numeral: 'NUM',
  quantifieur: 'QUANT', negatif: 'QUANT',
  zero: 'ZERO',
}

/**
 * Les stratégies qui mettent le nom au pluriel.
 *
 * Elles sont neutralisées : le VERBE d'un vers est écrit par une AUTRE voix,
 * qui ne sait pas si le sujet est pluriel — et sur un vers de fragment, les
 * cases partent même en parallèle. Autoriser le pluriel produirait
 * « plusieurs bordereaux vrille ». Leurs poids sont reportés sur l'équivalent
 * singulier pour ne pas déformer le profil des voix qui en usent beaucoup.
 */
const STRATEGIES_PLURIELLES = new Set(['defini_pl', 'indefini_pl', 'numeral'])
const REPLI_SINGULIER: Record<string, string> = {
  defini_pl: 'defini', indefini_pl: 'indefini', numeral: 'indefini',
}

type Profil = Record<string, number>

/** L'idiolecte de chaque voix, en poids relatifs. */
export const PROFILS: Record<string, Profil> = {
  tisserand:            { defini: 4, defini_pl: 3, indefini: 2, zero: 1 },
  speleologue:          { indefini: 35, defini: 30, partitif: 20, zero: 15 },
  collecteuse:          { defini_pl: 35, numeral: 25, quantifieur: 20, indefini: 20 },
  prisonnier:           { poss_1s: 35, defini: 25, negatif: 20, demonstratif: 20 },
  chimiste:             { defini: 45, partitif: 25, numeral: 15, zero: 15 },
  marin:                { defini: 30, indefini: 25, zero: 25, demonstratif: 20 },
  somnambule:           { demonstratif: 35, indefini: 30, zero: 20, poss_1s: 15 },
  lexicographe:         { zero: 40, defini: 30, numeral: 15, quantifieur: 15 },
  entomologiste:        { defini_pl: 35, numeral: 25, indefini: 25, defini: 15 },
  enlumineur:           { defini: 30, poss_3s: 25, demonstratif: 25, indefini: 20 },
  fossoyeur:            { zero: 30, defini: 30, numeral: 20, poss_3s: 20 },
  libraire:             { defini: 35, demonstratif: 25, indefini: 25, defini_pl: 15 },
  notice:               { defini: 50, quantifieur: 20, zero: 20, numeral: 10 },
  parfumeur:            { partitif: 35, defini: 25, indefini: 20, poss_3s: 20 },
  funambule:            { zero: 30, defini: 25, indefini: 25, quantifieur: 20 },
  convalescent:         { poss_1s: 40, defini: 25, demonstratif: 20, negatif: 15 },
  meteorologue:         { defini_pl: 30, indefini: 30, quantifieur: 20, partitif: 20 },
  horloger:             { numeral: 30, defini: 30, quantifieur: 20, demonstratif: 20 },
  telegraphiste:        { zero: 45, defini: 25, numeral: 20, indefini: 10 },
  herboriste:           { partitif: 35, defini_pl: 25, indefini: 20, defini: 20 },
  traducteur:           { demonstratif: 30, defini: 30, indefini: 20, zero: 20 },
  reveur:               { poss_1s: 30, indefini: 30, demonstratif: 20, zero: 20 },
  greffier:             { juridique: 45, defini: 30, numeral: 15, quantifieur: 10 },
  epistolier:           { poss_2s: 35, poss_1s: 25, defini: 20, demonstratif: 20 },
  enfant:               { poss_1s: 40, demonstratif: 30, indefini: 20, defini: 10 },
  detective:            { defini: 35, demonstratif: 25, indefini: 20, poss_3s: 20 },
  'souffleur de verre': { partitif: 30, indefini: 30, defini: 25, zero: 15 },
  cartographe:          { defini: 35, numeral: 25, quantifieur: 20, defini_pl: 20 },
  alchimiste:           { partitif: 35, zero: 25, defini: 20, numeral: 20 },
  cartomancien:         { defini: 35, numeral: 25, demonstratif: 25, quantifieur: 15 },
  astronome:            { defini: 30, numeral: 25, defini_pl: 25, quantifieur: 20 },
  archeologue:          { indefini: 30, defini_pl: 25, partitif: 25, numeral: 20 },
  insomniaque:          { negatif: 30, demonstratif: 25, poss_1s: 25, defini: 20 },
  psalmiste:            { zero: 45, poss_2s: 25, defini: 20, quantifieur: 10 },
  botaniste:            { defini: 35, indefini: 25, defini_pl: 25, numeral: 15 },
  musicien:             { defini: 30, numeral: 25, indefini: 25, zero: 20 },
  archiviste:           { defini: 30, juridique: 25, numeral: 25, quantifieur: 20 },
  boucher:              { partitif: 45, defini: 30, indefini: 15, numeral: 10 },
  geologue:             { defini: 30, indefini: 25, partitif: 25, defini_pl: 20 },
  jardinier:            { defini: 30, poss_1s: 25, defini_pl: 25, indefini: 20 },
  apiculteur:           { defini_pl: 35, defini: 25, quantifieur: 20, indefini: 20 },
  graveur:              { defini: 30, demonstratif: 25, indefini: 25, zero: 20 },
  medecin:              { defini: 35, poss_2p: 25, quantifieur: 20, indefini: 20 },
  photographe:          { demonstratif: 35, defini: 25, indefini: 25, zero: 15 },
  ornithologiste:       { indefini: 30, defini_pl: 30, numeral: 20, defini: 20 },
  cuisinier:            { partitif: 40, defini: 25, indefini: 20, numeral: 15 },
}

const PROFIL_PAR_DEFAUT: Profil = { defini: 30, indefini: 25, demonstratif: 15, partitif: 15, zero: 15 }

/** Le profil d'une voix, pluriels repliés sur leur équivalent singulier. */
function profilSingulier(voixId: string): [string, number][] {
  const brut = PROFILS[voixId] ?? PROFIL_PAR_DEFAUT
  const poids: Profil = {}
  for (const [k, v] of Object.entries(brut)) {
    const cle = STRATEGIES_PLURIELLES.has(k) ? REPLI_SINGULIER[k] : k
    poids[cle] = (poids[cle] ?? 0) + v
  }
  return Object.entries(poids)
}

/**
 * Tire une stratégie dans l'idiolecte de la voix.
 * `exclure` reçoit les FAMILLES que la garde d'ouverture interdit.
 */
export function tirerStrategie(
  voixId: string,
  exclure: Set<string> = new Set(),
  rng: () => number = Math.random,
): string {
  const entrees = profilSingulier(voixId)
  const dispo = entrees.filter(([k]) => !exclure.has(FAMILLE[k]))
  const pool = dispo.length ? dispo : entrees
  const total = pool.reduce((s, [, v]) => s + v, 0)
  let t = rng() * total
  for (const [k, v] of pool) {
    t -= v
    if (t <= 0) return k
  }
  return pool[pool.length - 1][0]
}

/**
 * Les types de case qui commencent par un déterminant — les seuls sur
 * lesquels une stratégie a un sens.
 *
 * La MISE EN MOTS de la stratégie n'est pas ici : elle vit dans
 * `api/_determinants.ts`, et le client n'envoie que la clé. Une phrase toute
 * faite venue du navigateur entrerait telle quelle dans le prompt système ;
 * une clé ne peut rien injecter.
 */
export const TYPES_A_DETERMINANT = new Set(['groupe-nominal', 'groupe-nominal-riche'])

/** Une ouverture qui n'est pas un groupe nominal du tout. */
export const HORS_GN = 'HORS_GN'

/**
 * Garde d'ouverture de vers — deux contraintes.
 *
 *  1. Pas plus de `maxFamille` vers consécutifs ouvrant sur la même famille.
 *  2. Pas plus de `maxGN` vers consécutifs ouvrant sur un groupe nominal, quel
 *     que soit son déterminant : au-delà, le gabarit doit ouvrir autrement —
 *     conjonction, adverbe, gérondif, infinitif.
 *
 * Le seuil GN se retire au hasard dans un intervalle : fixe, il remplacerait
 * un métronome par un autre.
 */
export class GardeOuverture {
  private readonly maxFamille: number
  private readonly borne: [number, number]
  private readonly rng: () => number
  private seuilGN: number
  private histoire: string[] = []

  constructor(opts: {
    maxFamille?: number
    maxGN?: [number, number]
    rng?: () => number
    /** Familles déjà ouvertes — pour reprendre une séance rouverte au milieu. */
    histoire?: string[]
  } = {}) {
    this.maxFamille = opts.maxFamille ?? 2
    this.borne = opts.maxGN ?? [3, 6]
    this.rng = opts.rng ?? Math.random
    this.seuilGN = this.tirerSeuil()
    if (opts.histoire) this.histoire = [...opts.histoire]
  }

  private tirerSeuil(): number {
    const [min, max] = this.borne
    return min + Math.floor(this.rng() * (max - min + 1))
  }

  /** Les familles interdites au prochain vers. */
  famillesInterdites(): Set<string> {
    const interdites = new Set<string>()
    if (this.histoire.length >= this.maxFamille) {
      const queue = this.histoire.slice(-this.maxFamille)
      if (queue.every(f => f === queue[0]) && queue[0] !== HORS_GN) interdites.add(queue[0])
    }
    return interdites
  }

  /** Le prochain vers doit-il impérativement ouvrir hors groupe nominal ? */
  exigeOuvertureHorsGN(): boolean {
    if (this.histoire.length < this.seuilGN) return false
    return this.histoire.slice(-this.seuilGN).every(f => f !== HORS_GN)
  }

  /** Enregistre la famille d'ouverture du vers accepté. */
  enregistrer(famille: string): void {
    this.histoire.push(famille)
    if (famille === HORS_GN) this.seuilGN = this.tirerSeuil()
  }
}

/**
 * Soude les élisions à la jointure des cases.
 * « sitôt qu' une faille » → « sitôt qu'une faille ».
 * À appliquer sur le vers assemblé, jamais sur une case isolée.
 *
 * La ponctuation haute — « ? », « ! », « ; », « : » — garde son espace en
 * français. Recoller sans distinguer donnait « désoperculation? », qui est la
 * règle anglaise appliquée à un vers français.
 */
export function souder(texte: string, langue: 'fr' | 'en' = 'fr'): string {
  let t = String(texte)
    .replace(/(['’])\s+/g, '$1')
    .replace(/\s+([,.…])/g, '$1')
    .replace(/([,;:])(?=\S)/g, '$1 ')
  t = langue === 'en'
    ? t.replace(/\s+([;:!?])/g, '$1')
    // Une espace avant, une seule, et jamais deux signes séparés l'un de l'autre
    : t.replace(/\s*([;:!?])/g, ' $1').replace(/([;:!?])\s+(?=[;:!?])/g, '$1')
  return t.replace(/\s{2,}/g, ' ').trim()
}

// L'adverbe de tête est reconnu à sa virgule, pas à sa terminaison : les cases
// qui ouvrent un vers sur un adverbe la posent toujours (« doucement, »). Sans
// elle, « suintement », « décollement », « building » — des noms nus parfaitement
// ordinaires — étaient lus comme des ouvertures hors groupe nominal, et la garde
// croyait avoir aéré le poème alors qu'elle n'avait rien fait.
// Les deux langues dans la même expression : l'Atelier se joue aussi en
// anglais, et un diagnostic qui ne saurait lire que le français y verrait
// partout du « nom nu » — la garde d'ouverture réclamerait alors une ouverture
// hors groupe nominal à chaque vers.
// Deux groupes, et c'est nécessaire : après une élision, `\b` ne tient pas.
// « l' » suivi de « é » n'a pas de frontière de mot au sens de JavaScript —
// « l'écume » et « l'écluse » retombaient donc dans « aucun déterminant », et
// une litanie de douze articles définis se lisait comme une série de six.
const DET_ELIDES = /^(de\s+l['’]|l['’])/i
const DET_OUVRANTS = /^(le|la|les|un|une|des|du|de la|ce|cet|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|votre|vos|ledit|ladite|lesdits|lesdites|nul|nulle|aucun|aucune|chaque|tout|toute|quelque|quelques|plusieurs|maint|mainte|the|said|a|an|this|that|these|those|my|your|his|her|its|our|their|some|no|each|every|all|both|many|several)\b/i

const OUVERTURES_HORS_GN = /^(et|ou|mais|or|donc|car|ni|quand|lorsque|tandis|pourtant|cependant|sitôt|tant|puisque|comme|si|en\s+\w+ant|à|dans|sur|sous|par|pour|avec|sans|vers|depuis|jusqu|entre|contre|selon|malgré|il|elle|je|tu|nous|vous|on|ça|cela|rien|toujours|jamais|encore|déjà|ainsi|alors|ici|là|\w+ment\s*,|and|but|yet|so|nor|when|while|whereas|if|as|since|though|although|because|until|before|after|in|on|at|by|with|without|under|over|through|into|from|against|toward|beneath|it|he|she|they|we|i|you|nothing|never|always|still|already|thus|then|here|there|\w+ing\s*,|\w+ly\s*,)/i

export interface Diagnostic {
  total: number
  comptes: Record<string, number>
  tauxDefini: number
  plusLongueSerie: number
  familleDeLaSerie: string | null
  familles: string[]
}

/** Mesure ce que l'oreille avait entendu. */
export function diagnostic(vers: string[]): Diagnostic {
  const familles = vers.map(v => {
    const brut = String(v).trim()
    const m = brut.match(DET_ELIDES) ?? brut.match(DET_OUVRANTS)
    if (!m) return OUVERTURES_HORS_GN.test(brut) ? HORS_GN : 'ZERO'
    const d = m[1].toLowerCase().replace(/['’]/, "'").replace(/\s+/g, ' ')
    if (['le', 'la', "l'", 'les', 'ledit', 'ladite', 'lesdits', 'lesdites', 'the', 'said'].includes(d)) return 'DEF'
    if (['un', 'une', 'des', 'a', 'an'].includes(d)) return 'IND'
    if (['du', 'de la', "de l'", 'some'].includes(d)) return 'PART'
    if (['ce', 'cet', 'cette', 'ces', 'this', 'that', 'these', 'those'].includes(d)) return 'DEM'
    if (['mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses', 'votre', 'vos',
         'my', 'your', 'his', 'her', 'its', 'our', 'their'].includes(d)) return 'POSS'
    return 'QUANT'
  })

  const comptes: Record<string, number> = {}
  for (const f of familles) comptes[f] = (comptes[f] ?? 0) + 1

  let plusLongue = 0, courante = 0, precedente: string | null = null, familleSerie: string | null = null
  for (const f of familles) {
    if (f === precedente && f !== HORS_GN) courante++
    else { courante = 1; precedente = f }
    if (courante > plusLongue) { plusLongue = courante; familleSerie = f }
  }

  return {
    total: vers.length,
    comptes,
    tauxDefini: +(((comptes.DEF ?? 0) / (vers.length || 1)).toFixed(3)),
    plusLongueSerie: plusLongue,
    familleDeLaSerie: familleSerie,
    familles,
  }
}

/** La famille d'ouverture d'un seul texte — vers, ou entrée de réserve. */
export function familleDe(texte: string): string {
  return diagnostic([texte]).familles[0]
}
