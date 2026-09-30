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
