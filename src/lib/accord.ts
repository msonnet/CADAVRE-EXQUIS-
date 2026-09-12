/**
 * L'accord de la dislocation, et la virgule qui lui manquait.
 *
 * ── Le vers qui a motivé le chantier ──────────────────────────────────────
 *
 *     il devient givré la rue, lait
 *
 * Relevé par l'audit du 10 septembre, et classé par lui comme le seul vers
 * vraiment raté d'une séance de onze. Ce n'est pas de l'étrangeté : c'est une
 * faute, et elle se lit comme un bug. Le surréalisme repose sur une syntaxe
 * CORRECTE appliquée à des images impossibles — « Le cadavre exquis boira le
 * vin nouveau » est grammaticalement irréprochable, et c'est la règle de
 * Breton.
 *
 * ── Deux fautes, et elles sont structurelles ──────────────────────────────
 *
 * Le gabarit `DISLOCATION` coud une tête tirée au sort, un adjectif, puis un
 * groupe nominal sujet :
 *
 *     « il devient »  +  « givré »  +  « la rue »
 *
 * 1. La tête est tirée AVANT que le nom existe. Elle ne peut donc pas
 *    s'accorder avec lui : « il devient givré » pour « la rue ».
 * 2. La virgule de dislocation manque. En français elle n'est pas
 *    décorative — « il est grand le silence » n'est pas une phrase, « il est
 *    grand, le silence » en est une.
 *
 * ── Pourquoi ici et pas dans la consigne ──────────────────────────────────
 *
 * Parce que reformuler une consigne n'a JAMAIS marché dans ce projet, et que
 * la voix qui écrit « givré » ne verra jamais « la rue » : c'est le principe
 * du cadavre exquis. Aucune consigne ne peut lui faire accorder ce qu'elle
 * ignore. Seule la couture, qui voit les deux, peut le faire.
 *
 * `corrigerAccords` existe déjà et passe le poème entier chez le modèle à la
 * fin — mais seulement à la fin, seulement si le réseau répond, et seulement
 * sur le texte assemblé. Ceci corrige à la couture, hors ligne, et sans
 * demander l'avis de personne.
 *
 * ── Ce que ce module NE fait pas, et il faut le dire ──────────────────────
 *
 * Il ne touche RIEN quand il n'est pas sûr. Un déterminant élidé (« l'ombre »)
 * ne dit pas le genre : on laisse. Un nom nu (« pluie », sans article) ne le
 * dit pas non plus : on laisse. Un adjectif hors des règles régulières et de
 * la table d'irréguliers : on laisse. Mieux vaut un accord manquant qu'un
 * accord inventé — une correction fautive est pire que la faute, parce
 * qu'elle est invisible à qui relit.
 */

/** Les têtes de dislocation, telles que `JeuAtelier` les tire. */
const TETES: Record<string, { pronom: 'il' | 'elle'; verbe: string; pluriel: string }> = {
  'il est': { pronom: 'il', verbe: 'est', pluriel: 'sont' },
  'elle est': { pronom: 'elle', verbe: 'est', pluriel: 'sont' },
  'il reste': { pronom: 'il', verbe: 'reste', pluriel: 'restent' },
  'elle demeure': { pronom: 'elle', verbe: 'demeure', pluriel: 'demeurent' },
  'il demeure': { pronom: 'il', verbe: 'demeure', pluriel: 'demeurent' },
  'il paraît': { pronom: 'il', verbe: 'paraît', pluriel: 'paraissent' },
  'il semble': { pronom: 'il', verbe: 'semble', pluriel: 'semblent' },
  'il devient': { pronom: 'il', verbe: 'devient', pluriel: 'deviennent' },
}

export type Genre = 'm' | 'f' | 'pluriel' | 'inconnu'

/**
 * Le genre et le nombre que porte un déterminant.
 *
 * L'élision est volontairement `inconnu` : « l'ombre » et « l'ourlet » ont le
 * même article et deux genres. C'est la moitié du travail qu'on renonce à
 * faire, et c'est délibéré.
 */
export function genreDuDeterminant(mot: string): Genre {
  const m = mot.toLowerCase().replace(/[^a-zà-ÿ']/g, '')
  if (['le', 'un', 'ce', 'cet', 'mon', 'ton', 'son'].includes(m)) return 'm'
  if (['la', 'une', 'cette', 'ma', 'ta', 'sa'].includes(m)) return 'f'
  if (['les', 'des', 'ces', 'mes', 'tes', 'ses', 'leurs', 'nos', 'vos'].includes(m)) return 'pluriel'
  return 'inconnu'
}

/**
 * Les féminins qu'aucune règle ne donne.
 *
 * La liste est courte exprès : chaque entrée est un mot que le moteur a
 * réellement produit ou qui appartient au vocabulaire courant des voix. On
 * n'invente pas un dictionnaire, on note les cas rencontrés.
 */
const FEMININS: Record<string, string> = {
  beau: 'belle', nouveau: 'nouvelle', vieux: 'vieille', fou: 'folle', mou: 'molle',
  blanc: 'blanche', franc: 'franche', sec: 'sèche', frais: 'fraîche', doux: 'douce',
  faux: 'fausse', roux: 'rousse', long: 'longue', gentil: 'gentille', nul: 'nulle',
  bas: 'basse', gras: 'grasse', épais: 'épaisse', gros: 'grosse', las: 'lasse',
  public: 'publique', turc: 'turque', grec: 'grecque', favori: 'favorite',
}

/**
 * Les adjectifs qui ne s'accordent pas.
 *
 * Presque tous des noms employés comme couleurs. Sans cette liste la règle
 * du `-i` régulier (« poli » → « polie ») fabriquait « kakie ».
 */
const INVARIABLES = new Set([
  'kaki', 'marron', 'orange', 'or', 'argent', 'chic', 'snob', 'sympa',
  'bordeaux', 'turquoise', 'crème', 'ocre', 'pastel', 'standard',
])

/** L'accord d'un adjectif, quand on sait le faire — et rien sinon. */
export function accorderAdjectif(adj: string, genre: Genre): string | null {
  const mot = adj.trim()
  if (!mot || /\s/.test(mot)) return null      // un seul mot, jamais un groupe
  const bas = mot.toLowerCase()

  if (INVARIABLES.has(bas)) return mot
  if (genre === 'm' || genre === 'inconnu') return mot
  if (genre === 'pluriel') {
    // Le pluriel ne dit pas le genre : on ne peut qu'ajouter la marque de
    // nombre, et seulement si elle manque.
    if (/[sxz]$/.test(bas)) return mot
    if (/eau$/.test(bas)) return mot + 'x'
    if (/al$/.test(bas)) return mot.slice(0, -2) + 'aux'
    return mot + 's'
  }

  // Féminin singulier.
  if (FEMININS[bas]) return FEMININS[bas]
  if (/e$/.test(bas)) return mot                       // « calme », « rouge »
  // « givré » → « givrée ». Le participe passé adjectivé est la forme la plus
  // courante des voix, et il finit par une voyelle : sans cette ligne il
  // tombait dans le garde-fou du bas et n'était jamais accordé.
  if (/[éiu]$/.test(bas)) return mot + 'e'
  if (/er$/.test(bas)) return mot.slice(0, -2) + 'ère' // « léger » → « légère »
  if (/f$/.test(bas)) return mot.slice(0, -1) + 've'   // « vif » → « vive »
  if (/(eux|eur)$/.test(bas)) return mot.replace(/(eux|eur)$/, 'euse')
  if (/(el|eil|en|on|et)$/.test(bas)) return mot + mot.slice(-1) + 'e'
  if (/ien$/.test(bas)) return mot + 'ne'
  if (/[aeiouyà-ÿ]$/.test(bas)) return null            // trop irrégulier : on laisse
  return mot + 'e'
}

export interface Dislocation {
  tete: string
  adjectif: string
  /** Le déterminant seul — c'est lui qui porte le genre. */
  determinant: string
  /** Le groupe nominal entier, déterminant compris, tel qu'il sera recousu. */
  groupe: string
}

/**
 * Lit un vers disloqué, s'il en est un.
 *
 * Forme attendue, celle que le gabarit coud :
 *     <tête> <adjectif> <groupe nominal> …
 *
 * Le déterminant n'est pas toujours un mot séparé : « l'ombre » colle le
 * sien au nom. Premier jet de cette lecture, il exigeait trois blocs séparés
 * par des espaces et ne voyait donc AUCUNE dislocation élidée — soit
 * précisément les cas qu'on renonce ensuite à corriger, et qu'on veut
 * pourtant compter.
 */
export function lireDislocation(vers: string): Dislocation | null {
  const t = vers.trim()
  for (const tete of Object.keys(TETES)) {
    if (!t.toLowerCase().startsWith(tete + ' ')) continue
    const suite = t.slice(tete.length + 1)
    const m = suite.match(/^([^\s,]+)\s*,?\s+(.+)$/)
    if (!m) return null
    const groupe = m[2].trim()
    const elide = groupe.match(/^[ldjcmnts]['’]/i)
    const determinant = elide ? elide[0] : (groupe.match(/^\S+/) ?? [''])[0]
    return { tete, adjectif: m[1], determinant, groupe }
  }
  return null
}

/**
 * Accorde la dislocation et lui rend sa virgule.
 *
 * Rend le vers inchangé dès qu'un doute subsiste — voir l'avertissement en
 * tête de fichier.
 */
export function accorderDislocation(vers: string): string {
  const d = lireDislocation(vers)
  if (!d) return vers
  const genre = genreDuDeterminant(d.determinant)
  if (genre === 'inconnu') return vers

  const t = TETES[d.tete]
  const adj = accorderAdjectif(d.adjectif, genre)
  if (adj === null) return vers

  // Au pluriel, le déterminant (« les », « des ») ne dit pas le genre. On ne
  // peut donc pas choisir entre « ils » et « elles » : « ils » est la forme
  // non marquée du français, et garder le genre de la TÊTE serait pire — elle
  // a été tirée au sort avant que le nom existe, elle n'en sait rien.
  const pronom = genre === 'f' ? 'elle' : genre === 'pluriel' ? 'ils' : t.pronom
  const verbe = genre === 'pluriel' ? t.pluriel : t.verbe

  return `${pronom} ${verbe} ${adj}, ${d.groupe}`
}

export interface DiagnosticAccord {
  total: number
  /** Vers disloqués que le module sait lire. */
  disloques: number
  /** Ceux qu'il a fallu corriger. */
  corriges: number
  /** Ceux qu'il n'a pas su lire ou pas su accorder — la part aveugle. */
  laisses: number
  fautes: string[]
}

/** Mesure les fautes d'accord d'un poème, et ce qu'on ne sait pas mesurer. */
export function diagnosticAccord(vers: string[]): DiagnosticAccord {
  let disloques = 0, corriges = 0, laisses = 0
  const fautes: string[] = []
  for (const v of vers) {
    const d = lireDislocation(v)
    if (!d) continue
    disloques++
    const apres = accorderDislocation(v)
    if (apres === v) {
      if (genreDuDeterminant(d.determinant) === 'inconnu') laisses++
    } else {
      corriges++
      fautes.push(`${v}  →  ${apres}`)
    }
  }
  return { total: vers.length, disloques, corriges, laisses, fautes }
}
