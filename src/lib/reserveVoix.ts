import { RESERVE_FR, RESERVE_EN, type ReserveVoix } from '../data/reserveVoix'

/**
 * Où une case puise quand sa voix ne répond pas.
 *
 * Les familles de la réserve sont celles des grilles du cadavre écrit, et
 * les deux langues ne découpent pas la phrase de la même façon : la grille
 * française demande « article + nom » puis l'adjectif seul, l'anglaise
 * « article + adjectif » puis le nom nu. D'où deux tables.
 *
 * Une case dont la famille n'est dans aucune grille (adverbe, proposition…)
 * n'a pas de réserve propre : elle retombe sur le stock commun, et
 * l'étiquette reste nue. On n'invente pas une réserve pour un usage qui
 * n'existe pas.
 */
const FAMILLE_FR: Partial<Record<string, keyof ReserveVoix>> = {
  'groupe-nominal': 'gn',
  'nom': 'gn',
  'groupe-nominal-riche': 'gnr',
  'verbe': 'verbe',
  'adjectif': 'adj',
  'libre': 'vers',
}

const FAMILLE_EN: Partial<Record<string, keyof ReserveVoix>> = {
  'nom': 'gn',
  'groupe-nominal-riche': 'gnr',
  'verbe': 'verbe',
  'article-adj': 'adj',
  'libre': 'vers',
}

/** Les fragments de réserve d'une voix pour ce type de case — vide si aucun. */
export function reserveDe(voixId: string | undefined, type: string, langue: 'fr' | 'en'): string[] {
  if (!voixId) return []
  const famille = (langue === 'en' ? FAMILLE_EN : FAMILLE_FR)[type]
  const r = (langue === 'en' ? RESERVE_EN : RESERVE_FR)[voixId]
  return famille && r ? r[famille] : []
}

/**
 * Un fragment de la réserve de la voix, que la partie n'a pas encore employé.
 *
 * Rend `null` quand la voix n'a rien à donner — famille absente, ou trois
 * fragments déjà posés dans la partie. L'appelant passe alors au stock
 * commun, et ne doit PAS l'étiqueter au nom de la voix.
 *
 * `cle` est la normalisation de l'appelant : le même fragment avec ou sans
 * accent compte pour un doublon, comme partout ailleurs dans la partie.
 */
export function puiserReserve(
  voixId: string | undefined,
  type: string,
  langue: 'fr' | 'en',
  utilises: Set<string>,
  cle: (t: string) => string,
  hasard: () => number = Math.random,
): string | null {
  const libres = reserveDe(voixId, type, langue).filter(t => !utilises.has(cle(t)))
  if (!libres.length) return null
  return libres[Math.floor(hasard() * libres.length)]
}
