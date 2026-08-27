/**
 * La densité de mots rares, et la garde qui la tient.
 *
 * Quatrième instrument, et le dernier axe qui n'avait jamais été compté.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * Sur un atelier de vingt-quatre vers, une fois les trois autres axes réglés
 * (déterminants 8 % de défini, cinq formes sur sept, souffle de deux à onze
 * mots) :
 *
 *   mots hors vocabulaire courant   45 %
 *   vers sans AUCUN mot rare        0 sur 22
 *
 * Zéro. Le poème était formellement irréprochable et lexicalement illisible —
 * câblé, replat, lacunairement, hibernal, doublon, brou, séreuse, exuvial,
 * tourteau, épissant, ébréché, rochet, filoche, diverticule, isobare, chitine,
 * sertissage, greffage, ravinement, déhiscence, controuvée, débattement. Un
 * glossaire distribué dans des formes correctes.
 *
 * Les deux seuls vers qui tenaient debout étaient ceux du médium, et ils ne
 * portaient pas un seul mot rare : « Je marche » et « Parfaitement inutile ».
 *
 * ── La cause, et c'est une arithmétique ───────────────────────────────────
 *
 * Un cadran de technicité existait déjà, mais il tire PAR CASE. À 0,68 de
 * moyenne sur les quarante-six voix, et trois à cinq cases par vers :
 *
 *   probabilité qu'un vers n'ait aucun mot de métier  =  0,32 ^ 4  ≈  1 %
 *   nombre moyen de cases puisant au métier           ≈  2,7
 *
 * Le cadran ne pouvait pas fonctionner : il gouverne la case, or c'est le VERS
 * qu'on lit. Aucun réglage par case, si bas soit-il, ne donne un vers propre
 * sur deux tant que chaque case tire pour son compte.
 *
 * ── Le quota ──────────────────────────────────────────────────────────────
 *
 * Une seule case par vers a le droit de puiser dans le lexique de métier, et
 * un vers sur deux n'y a pas droit du tout. Le mot rare redevient ce qu'il
 * doit être : l'écart dans une phrase ordinaire, pas la matière de la phrase.
 * « la paille ronge un rochet » tient debout ; « il semble usé un diverticule,
 * ce carrelage, du liant tendu » ne tient pas.
 *
 * La technicité de chaque voix garde tout son rôle : elle ne décide plus
 * COMBIEN de mots de métier entrent dans le vers, mais LAQUELLE des cases
 * dépense le quota. Le greffier à 0,9 prend la sienne presque à coup sûr,
 * l'enfant à 0,1 la laisse aux autres. L'identité des voix survit, la densité
 * tombe.
 */

/** Combien de cases d'un vers peuvent puiser au métier, quand il y a droit. */
const QUOTA = 1

/** Part des vers qui n'ont droit à aucun mot de métier. */
const PART_SANS_METIER = 0.45

/**
 * La garde du lexique.
 *
 * Même forme que les trois autres : elle répond à une question, vers par
 * vers, et le tirage lui obéit.
 */
export class GardeLexique {
  private restant = 0
  private histoire: number[] = []
  private readonly rng: () => number

  constructor(opts: { rng?: () => number; histoire?: number[] } = {}) {
    this.rng = opts.rng ?? Math.random
    if (opts.histoire) this.histoire = [...opts.histoire]
  }

  /**
   * Ouvre un vers et lui alloue son quota.
   *
   * Deux vers de suite sans aucun mot de métier feraient un poème plat — les
   * voix ne se distingueraient plus. Deux vers de suite avec le leur, c'est
   * la densité qu'on chasse. On alterne donc sous contrainte.
   */
  ouvrirVers(): number {
    const deuxSansDeSuite = this.histoire.slice(-2).length === 2
      && this.histoire.slice(-2).every(q => q === 0)
    const deuxAvecDeSuite = this.histoire.slice(-2).length === 2
      && this.histoire.slice(-2).every(q => q > 0)

    this.restant = deuxSansDeSuite ? QUOTA
      : deuxAvecDeSuite ? 0
        : (this.rng() < PART_SANS_METIER ? 0 : QUOTA)

    this.histoire.push(this.restant)
    return this.restant
  }

  /**
   * Cette case-ci puise-t-elle au métier ?
   *
   * C'est la technicité de la voix qui décide, mais seulement si le quota du
   * vers n'est pas déjà dépensé. L'appel CONSOMME le quota : on l'appelle une
   * fois par case, dans l'ordre.
   */
  auMetier(technicite: number): boolean {
    if (this.restant <= 0) return false
    if (this.rng() >= technicite) return false
    this.restant--
    return true
  }

  /** Ce qu'il reste à dépenser sur le vers en cours. */
  get quotaRestant(): number {
    return this.restant
  }
}

// ── Le diagnostic, et ce qu'il ne sait pas faire ──────────────────────────
//
// AVERTISSEMENT, écrit après deux tentatives ratées. Cette mesure ne dit PAS
// si un mot est rare en français. Elle dit s'il est absent d'une liste de cinq
// cents mots très courants, ce qui n'est pas la même chose : « fixe »,
// « accuse », « bougie », « grain », « écume », « badge », « loyer »,
// « cendrier » en sortent, et aucun n'est savant.
//
// Une liste de cette taille ne peut pas trancher — le français courant en
// compte plusieurs milliers, et les écrire à la main serait arbitraire d'une
// autre façon. Le seul usage honnête est COMPARATIF : appliquée à l'identique
// à deux poèmes, elle dit lequel est le plus dense. Mesuré ainsi, l'atelier du
// 27 août donne 61 % et quinze vers tirés après le quota 49 %.
//
// Le vrai jugement reste la lecture. Sur ces mêmes quinze vers, un lecteur
// compte NEUF vers sans aucun mot savant ; sur les vingt-deux de l'atelier du
// 27, il en compte zéro. C'est ce chiffre-là qui vaut, et aucun instrument de
// ce dépôt ne sait le produire.

const COURANTS = new Set(`
le la les un une des du de au aux ce cet cette ces mon ma mes ton ta tes son sa ses
notre votre leur nos vos leurs et ou ni or mais car donc que qui quoi dont où si comme
quand lorsque tandis dès tant pour par sur sous dans entre depuis vers sans avec chez
contre selon malgré même encore déjà toujours jamais parfois souvent plus moins très
trop peu tout toute tous toutes chaque nul nulle aucun aucune je tu il elle on nous vous
ils elles me te se lui y en être est sont était sera soit avoir eu ont avait aller va
vient venir faire fait voir sait peut veut doit prend tient met dit passe reste demeure
devient semble paraît marche tombe monte descend sort ouvre ferme donne porte laisse
garde attend cherche trouve perd oublie souvient regarde écoute touche sent respire dort
rêve pleure rit parle crie appelle répond compte lit écrit efface brûle glisse coule
fond gèle sèche mouille casse plie cède serre lâche ronge use creuse traverse retient
dévore recouvre remplit vide refroidi refroidit refroidir chauffe gonfle penche tourne
pousse tire coupe verse frotte gratte plante arrache jette pose lave essuie berce maison
fenêtre mur toit chambre table chaise escalier couloir seuil rue route chemin champ
arbre pierre terre eau feu air vent pluie neige gel givre nuit jour matin soir heure
temps saison hiver été automne printemps dimanche main doigt bras jambe pied tête visage
œil yeux bouche dent peau cœur ventre dos corps souffle voix silence bruit cri mot nom
lettre livre page papier encre pain sel vin lait sucre cendre poussière suie boue sable
ombre lumière noir blanc rouge bleu vert jaune gris chien chat oiseau bête insecte verre
tasse assiette couteau clef lampe drap couverture mère père frère sœur enfant fils fille
femme homme voisin grand petit long court haut bas vieux jeune neuf beau laid bon
mauvais froid chaud sec humide dur mou lourd léger plein propre sale lent rapide fort
faible clair sombre doux amer profond mince épais usé cassé fendu ouvert fermé perdu
oublié tombé doucement lentement vite tard tôt loin près ici là dehors dedans ailleurs
inutile parfaitement soufflé pelé boueux givré penché granuleux mouillé bridé saturé
inhabité rouillé sourd muet aveugle nu couvert vêtu tordu plié courbé droit rond carré
pointu serré tendu raide souple lisse rugueux rayé strié tacheté net flou trouble
limpide terne brillant mat tiède glacé brûlant gelé fondu séché trempé abîmé fané flétri
pourri moisi rance aigre creux bombé plat tombant pendant brun beige rose orange violet
seul unique double simple entier demi complet calme agité tranquille inquiet triste gai
vif las étrange bizarre commun ordinaire pauvre riche proche lointain ancien récent
dernier premier prochain large étroit entrouvert clos scellé bouché percé craquelé brisé
rompu déchiré coupé arraché contient grignote froisse avale alourdit comprime effeuille
dévisse visse desserre noue dénoue retourne redresse soulève abaisse dépose enlève
ajoute retire mange boit veille guette flaire renifle rince trempe traîne saisit rend
claque grince craque siffle sonne bat cogne frappe fuit goutte suinte déborde roule fume
pourrit rouille tord déchire fend perce troue
`.trim().split(/\s+/))

/**
 * Ce mot est-il hors du vocabulaire courant ?
 *
 * Deux entrées : la liste, puis une morphologie de secours pour les mots
 * savants qu'aucune liste courte ne contiendra — les suffixes de nomenclature
 * et les mots très longs.
 */
export function motRare(mot: string): boolean {
  const m = mot.toLowerCase().replace(/^[ldjcmnts]['’]/, '').replace(/[^a-zà-ÿ-]/g, '')
  if (!m || m.length <= 3) return false
  if (COURANTS.has(m)) return false
  // Le féminin, le pluriel et le participe des mots courants restent courants.
  for (const suf of ['s', 'e', 'es', 'ée', 'ées', 'és']) {
    if (m.endsWith(suf) && COURANTS.has(m.slice(0, -suf.length))) return false
  }
  return true
}

export interface DiagnosticLexique {
  motsTotal: number
  motsRares: number
  /** Part des mots qui sortent du vocabulaire courant. */
  densite: number
  /** Vers ne portant aucun mot rare — c'est le chiffre qui compte. */
  versSains: number
  total: number
  partSaine: number
  /** Le plus grand nombre de mots rares dans un même vers. */
  pire: number
  rares: string[]
}

/** Mesure la densité lexicale d'un poème. */
export function diagnosticLexique(vers: string[]): DiagnosticLexique {
  const parVers = vers.map(v => (v.toLowerCase().match(/[a-zà-ÿ'’-]+/g) ?? []).filter(motRare))
  const motsTotal = vers.reduce(
    (n, v) => n + (v.toLowerCase().match(/[a-zà-ÿ'’-]+/g) ?? []).filter(m => m.length > 3).length, 0)
  const motsRares = parVers.reduce((n, r) => n + r.length, 0)
  const sains = parVers.filter(r => r.length === 0).length
  const total = vers.length || 1
  return {
    motsTotal,
    motsRares,
    densite: +(motsRares / (motsTotal || 1)).toFixed(3),
    versSains: sains,
    total: vers.length,
    partSaine: +(sains / total).toFixed(3),
    pire: parVers.reduce((m, r) => Math.max(m, r.length), 0),
    rares: [...new Set(parVers.flat())],
  }
}
