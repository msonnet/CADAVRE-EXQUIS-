import type { Case, Poeme } from '../types'

/**
 * Ce qui s'écrit avec d'autres entre aussi au recueil.
 *
 * ── La panne ──────────────────────────────────────────────────────────────
 *
 * Seuls le cadavre écrit sur un téléphone et l'Atelier appelaient
 * `sauvegarderPoeme`. Un poème écrit en salon, avec de vraies autres mains,
 * disparaissait dès qu'on quittait la page de fin — le serveur efface les
 * salons chaque nuit. Le poème du jour, pareil : on pouvait le relire
 * jusqu'au lendemain, puis plus jamais. Les deux poèmes que le jeu met le
 * plus en avant étaient les seuls qu'on ne pouvait pas garder.
 *
 * ── Ce qui entre ──────────────────────────────────────────────────────────
 *
 * Le poème tel qu'il a été cousu, et les NOMS des mains — le pseudo pour une
 * personne, la persona pour une voix, « toi » pour soi. C'est ce qui fait
 * qu'un poème de salon relu six mois plus tard est encore un souvenir.
 *
 * L'identifiant est déterminé par le salon ou par le jour : rouvrir la page
 * de fin ne crée pas de doublon.
 *
 * Aucune importation de Dexie ici : ces conversions se mesurent seules.
 */

export const idSalon = (code: string) => `salon-${code}`
/** Le dessin d'un salon : même règle, dans la table des dessins. */
export const idDessinSalon = (code: string) => `dessin-salon-${code}`
export const idJour = (langue: string, jour: string) => `jour-${langue}-${jour}`

/** Une main de salon : qui a posé la case. */
export interface Contribution {
  case_index: number
  texte: string
  player_id: string
  voice_name?: string | null
}

export function poemeDuSalon(o: {
  code: string
  structureId: Poeme['structureId']
  contributions: Contribution[]
  pseudos: Map<string, string>
  moi: string | null
  fonctions?: string[]
  date?: number
}): Poeme {
  const date = o.date ?? Date.now()
  const cases: Case[] = [...o.contributions]
    .sort((a, b) => a.case_index - b.case_index)
    .map((c, i) => {
      const voix = !!c.voice_name
      return {
        numero: i + 1,
        fonction: o.fonctions?.[i] ?? '',
        consigne: '',
        auteur: voix ? 'ia' : 'humain',
        texte: c.texte,
        ts: date,
        ...(voix ? { voixNom: c.voice_name ?? undefined } : {}),
        ...(!voix && c.player_id === o.moi ? { moi: true } : {}),
        // Une chaîne vide, et non l'absence : une main anonyme n'est pas
        // « toi », et `attribution` doit pouvoir faire la différence.
        ...(!voix && c.player_id !== o.moi ? { pseudo: o.pseudos.get(c.player_id) ?? '' } : {}),
      }
    })
  return {
    id: idSalon(o.code),
    titre: null,
    structureId: o.structureId,
    mode: 'standard',
    visibilite: 'aveugle',
    cases,
    origine: 'salon',
    dateCreation: date,
    dateModification: date,
  }
}

export interface VersDuJour {
  rang: number
  texte: string
  pseudo: string | null
  voix: boolean
  voixNom: string | null
  aMoi: boolean
}

/**
 * Le poème du jour scellé. Une case par vers, dans l'ordre des rangs — la
 * structure est celle du vers libre, qui joint les cases à la ligne.
 */
export function poemeDuJour(o: {
  langue: string
  jour: string
  vers: VersDuJour[]
  date?: number
}): Poeme {
  const date = o.date ?? Date.now()
  const cases: Case[] = [...o.vers]
    .sort((a, b) => a.rang - b.rang)
    .map((v, i) => ({
      numero: i + 1,
      fonction: '',
      consigne: '',
      auteur: v.voix ? 'ia' : 'humain',
      texte: v.texte,
      ts: date,
      ...(v.voix && v.voixNom ? { voixNom: v.voixNom } : {}),
      ...(!v.voix && v.aMoi ? { moi: true } : {}),
      ...(!v.voix && !v.aMoi ? { pseudo: v.pseudo ?? '' } : {}),
    }))
  return {
    id: idJour(o.langue, o.jour),
    titre: null,
    structureId: 'vers-libre',
    mode: 'standard',
    visibilite: 'dernier-mot',
    cases,
    origine: 'jour',
    jour: o.jour,
    dateCreation: date,
    dateModification: date,
  }
}

/**
 * Combien de vraies personnes ont écrit ce poème — ce que la carte du
 * recueil annonce en « N MAINS ». `null` pour un poème joué sur ce
 * téléphone : il n'a pas de mains à compter autres que la sienne.
 *
 * Au poème du jour, une main n'écrit qu'un vers : chaque vers humain en est
 * une. En salon, une main écrit plusieurs cases, et on compte les noms.
 */
export function mainsDuPoeme(p: Pick<Poeme, 'origine' | 'cases'>): number | null {
  // Un feuillet relié au carnet n'a pas de table : ses vers viennent de
  // poèmes différents, et compter leurs signatures additionnerait des mains
  // qui ne se sont jamais assises ensemble.
  if (!p.origine || p.origine === 'carnet') return null
  const humaines = p.cases.filter(c => c.auteur === 'humain')
  if (p.origine === 'jour') return humaines.length
  return new Set(humaines.map(c => (c.moi ? '\u0000moi' : c.pseudo ?? ''))).size
}
