/**
 * Inviter quelqu'un à un salon — le lien, et ce qu'il devient à l'arrivée.
 *
 * ── La panne ──────────────────────────────────────────────────────────────
 *
 * On ne pouvait inviter qu'en DICTANT un code. Et si l'invité ouvrait
 * `/salon/KX7Q` sans identité — le cas de tout nouveau venu — la page le
 * renvoyait vers `/online` et le code se perdait : il arrivait sur un écran
 * générique, sans savoir qu'on l'attendait nulle part.
 *
 * Désormais le code voyage : `/online?salon=KX7Q`, retenu le temps de
 * choisir un nom de plume, et le salon s'ouvre dès que l'identité existe.
 *
 * Aucune importation : ces règles se mesurent seules.
 */

/** Un code de salon tel qu'on l'accepte d'une URL : lettres et chiffres. */
export function codeDeSalon(brut: string | null | undefined): string | null {
  const c = (brut ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return c.length >= 4 ? c : null
}

export const CLE_SALON_ATTENDU = 'cadavre-salon-attendu'

/** Où renvoyer quelqu'un qui arrive au salon sans identité. */
export const arriveeSansIdentite = (code: string) => `/online?salon=${encodeURIComponent(code)}`

/** Le texte de l'invitation — une phrase, le lien, rien d'autre. */
export function texteInvitation(code: string, lien: string, langue: 'fr' | 'en'): string {
  return langue === 'en'
    ? `Join me at the table — room ${code}, Cadavre Exquis.\n${lien}`
    : `Rejoins-moi à la table — salon ${code}, Cadavre Exquis.\n${lien}`
}

/**
 * Où mène le lien par lequel on arrive — ce que l'écran d'entrée annonce.
 *
 * Un lien partagé (`/poeme-du-jour`, `/salon/KX7Q`, `/online?salon=KX7Q`)
 * tombait sur le même rideau que tout le monde : « TOUCHER POUR ENTRER »,
 * quatre secondes, sans rien dire de ce qui attendait derrière. On ne
 * supprime pas le rideau — il porte l'identité, et c'est la première
 * seconde d'un nouveau venu — mais il dit où il ouvre, et il s'ouvre plus
 * vite.
 */
export type Destination = { genre: 'jour' } | { genre: 'salon'; code: string }

export function destinationEntree(chemin: string, recherche = ''): Destination | null {
  if (/^\/poeme-du-jour\/?$/.test(chemin)) return { genre: 'jour' }
  const salon = /^\/salon\/([^/]+)\/?$/.exec(chemin)
  if (salon) {
    let brut = salon[1]
    try { brut = decodeURIComponent(brut) } catch { /* code mal formé : lu tel quel */ }
    const code = codeDeSalon(brut)
    return code ? { genre: 'salon', code } : null
  }
  if (/^\/online\/?$/.test(chemin)) {
    const code = codeDeSalon(new URLSearchParams(recherche).get('salon'))
    if (code) return { genre: 'salon', code }
  }
  return null
}
