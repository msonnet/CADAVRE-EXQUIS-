/**
 * L'horloge du rendez-vous — quand le poème se ferme, quand on peut le dire.
 *
 * ── Pourquoi un module à part ─────────────────────────────────────────────
 *
 * Trois écrans parlent de l'heure du poème du jour, et chacun l'écrivait à
 * sa façon. La page annonçait « il se referme à minuit », ce qui tombe à
 * 01 h ou 02 h en France et à 17 h en Californie. L'annonce du scellement
 * partait « le lendemain à 9 h locales » : au Japon, 9 h tombe AVANT le
 * cron de 00 h 30 UTC — la notification « le poème est achevé » arrivait
 * sur un poème encore ouvert. Le rappel du soir, lui, ne savait pas si la
 * main avait déjà été posée.
 *
 * Tout passe donc ici, sans entrée-sortie et sans date implicite : chaque
 * fonction reçoit son « maintenant », ce qui la rend mesurable dans tous
 * les fuseaux.
 */

const JOUR_MS = 86_400_000

/** Le jour UTC d'un instant — la clé du rendez-vous, AAAA-MM-JJ. */
export function jourUTC(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** La veille d'un jour UTC. */
export function veille(jour: string): string {
  return jourUTC(new Date(Date.parse(`${jour}T00:00:00Z`) - JOUR_MS))
}

/** L'instant où la chaîne d'un jour cesse de recevoir des vers : minuit UTC. */
export function fermeture(jour: string): Date {
  return new Date(Date.parse(`${jour}T00:00:00Z`) + JOUR_MS)
}

/**
 * L'instant à partir duquel on peut AFFIRMER que le poème est scellé.
 *
 * Le cron est posé à 00 h 30 UTC, mais le plan Hobby ne le déclenche que
 * « dans l'heure », pas à la minute, et le scellement appelle encore les
 * voix du plancher. Deux heures après minuit laissent la marge entière : une
 * annonce qui arriverait sur un poème encore ouvert serait un mensonge, et
 * c'est le seul qu'on ne peut pas rattraper.
 */
export function revelation(jour: string): Date {
  return new Date(fermeture(jour).getTime() + 2 * 3_600_000)
}

/**
 * Quand annoncer le poème achevé à qui y a écrit.
 *
 * Le lendemain à 9 h locales — on ne réveille personne pour un poème — mais
 * JAMAIS avant la révélation. Les deux bornes se croisent selon le fuseau :
 * en France c'est 9 h qui gagne, au Japon ou en Californie le soir où le
 * cron est passé.
 *
 * Et si la révélation tombe en pleine nuit locale — aux Açores, une main
 * posée à 23 h 30 l'apprendrait à 1 h —, l'annonce attend le matin suivant.
 */
export const HEURE_ANNONCE = 9
const NUIT = 23
export function heureAnnonce(jour: string, maintenant: Date): Date {
  const demain = new Date(maintenant)
  demain.setDate(demain.getDate() + 1)
  demain.setHours(HEURE_ANNONCE, 0, 0, 0)
  const r = revelation(jour)
  if (demain.getTime() >= r.getTime()) return demain
  const t = new Date(r)
  if (t.getHours() >= NUIT) t.setDate(t.getDate() + 1)
  if (t.getHours() >= NUIT || t.getHours() < HEURE_ANNONCE) t.setHours(HEURE_ANNONCE, 0, 0, 0)
  return t
}

/**
 * Les rappels du soir, un par jour, et non plus un rappel répété.
 *
 * L'ancien rappel était planifié une fois pour toutes à 20 h chaque jour :
 * il sonnait encore le soir où l'on venait d'écrire, ce qui apprend surtout
 * à couper les notifications. Une notification répétée ne sait rien du
 * jour ; des notifications ponctuelles, replanifiées à chaque ouverture, si.
 *
 * On saute le soir dont le jour UTC est celui où la main est déjà posée —
 * c'est cette chaîne-là que le rappel inviterait à rejoindre. Et on n'en
 * planifie qu'une semaine : qui n'a pas rouvert l'application depuis sept
 * jours n'a pas besoin qu'on insiste.
 */
export const HEURE_RAPPEL = 20
export function instantsRappel(maintenant: Date, jourEcrit: string | null, n = 7): Date[] {
  const r: Date[] = []
  for (let i = 0; i <= n && r.length < n; i++) {
    const d = new Date(maintenant)
    d.setDate(d.getDate() + i)
    d.setHours(HEURE_RAPPEL, 0, 0, 0)
    if (d.getTime() <= maintenant.getTime()) continue
    if (jourEcrit && jourUTC(d) === jourEcrit) continue
    r.push(d)
  }
  return r
}

/**
 * L'heure locale d'un instant, comme on la dit : « 2 h », « 5 h 30 » ;
 * « 2 AM », « 5:30 PM ». Le jour est UTC, l'heure qu'on lit est la sienne.
 * Et minuit se dit « minuit » là où il tombe vraiment : « à 0 h » n'est pas
 * une phrase qu'on prononce.
 */
export function libelleHeure(d: Date, langue: 'fr' | 'en'): string {
  const h = d.getHours()
  const m = d.getMinutes()
  if (!m && (h === 0 || h === 12)) {
    return langue === 'fr' ? (h ? 'midi' : 'minuit') : (h ? 'noon' : 'midnight')
  }
  if (langue === 'fr') return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
  const h12 = h % 12 || 12
  const suffixe = h < 12 ? 'AM' : 'PM'
  return m ? `${h12}:${String(m).padStart(2, '0')} ${suffixe}` : `${h12} ${suffixe}`
}
