// Notifications locales — planifiées sur l'appareil par @capacitor/local-notifications.
// Aucune donnée n'est envoyée : la notification est purement locale, fidèle au
// « tout reste local ». No-op hors plateforme native (le web PWA ne sait pas
// planifier une notification de façon fiable) — le plugin est importé à la
// demande pour ne pas alourdir le bundle web.

import { Capacitor } from '@capacitor/core'
import { tr, langueActuelle } from '../i18n'
import { heureAnnonce, instantsRappel } from '../lib/horlogeJour'
import { mainPosee } from '../lib/jourLocal'

export const RAPPEL_KEY = 'cadavre-rappel'
/** Le jour pour lequel l'annonce du poème achevé est planifiée. */
export const ANNONCE_KEY = 'cadavre-annonce'
// L'ancien rappel RÉPÉTÉ. Il n'est plus jamais planifié, mais on l'annule à
// chaque replanification : une installation d'avant le porte encore.
const NOTIF_ID = 1001
const NOTIF_SCELLEMENT = 1002 // l'annonce du poème achevé, une fois par jour écrit
// Les rappels ponctuels : un identifiant par soir de la semaine à venir.
const NOTIF_RAPPELS = [1101, 1102, 1103, 1104, 1105, 1106, 1107]

// Le rappel n'a de sens que sur l'app installée (iOS / Android).
export function rappelDisponible(): boolean {
  return Capacitor.isNativePlatform()
}

const accorde = (p: { display: string }) => p.display === 'granted'

/**
 * Les rappels du soir — sept soirs ponctuels, replanifiés à chaque
 * ouverture, et non plus un rappel répété.
 *
 * L'ancien sonnait tous les jours à 20 h sans condition, donc aussi le soir
 * où l'on venait d'écrire ; et son texte était en dur, en français, même
 * pour un joueur anglophone. Les soirs se calculent dans `horlogeJour` :
 * celui dont la main est déjà posée est sauté.
 */
async function planifierRappels(): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  // On annule tout avant de replanifier — jamais de doublon, et l'ancien
  // rappel répété disparaît avec.
  await LocalNotifications.cancel({
    notifications: [NOTIF_ID, ...NOTIF_RAPPELS].map(id => ({ id })),
  })
  const soirs = instantsRappel(new Date(), mainPosee(langueActuelle())?.jour ?? null, NOTIF_RAPPELS.length)
  if (!soirs.length) return
  await LocalNotifications.schedule({
    notifications: soirs.map((at, i) => ({
      id: NOTIF_RAPPELS[i],
      title: 'Cadavre Exquis',
      body: tr(
        'Le poème du jour t’attend — ajoute ta main au cadavre.',
        'The poem of the day is waiting — add your hand to the cadavre.',
      ),
      schedule: { at, allowWhileIdle: true },
    })),
  })
}

// (Re)planifie le rappel du soir. Demande l'autorisation au besoin ; renvoie
// true si le rappel est bien armé, false si refusé ou indisponible.
export async function activerRappelQuotidien(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (!accorde(perm)) return false
    await planifierRappels()
    return true
  } catch {
    return false
  }
}

export async function desactiverRappelQuotidien(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({
      notifications: [NOTIF_ID, ...NOTIF_RAPPELS].map(id => ({ id })),
    })
  } catch { /* non bloquant */ }
}

// À appeler au démarrage, et quand une main vient d'être posée : si le
// joueur avait activé le rappel, on replanifie la semaine — c'est ce qui
// fait sauter le soir où il a déjà écrit. Silencieux sinon —
// requestPermissions ne re-demande pas si le choix est déjà fait.
export async function rearmerRappelSiActif(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    if (localStorage.getItem(RAPPEL_KEY) === '1') await activerRappelQuotidien()
  } catch { /* non bloquant */ }
}

/**
 * Annoncer le poème achevé, au lendemain de sa main posée.
 *
 * ── Pourquoi ce n'est pas un vrai push, et pourquoi ce n'en est pas un ────
 *
 * Une notification LOCALE est planifiée à l'avance : elle ne peut pas savoir
 * qu'un poème vient de se sceller. Le vrai push — FCM, APNs, un déclencheur
 * serveur — est un chantier d'un autre ordre.
 *
 * Mais on n'en a pas besoin pour dire la vérité. Au moment où une main pose
 * son vers, on sait DEUX choses avec certitude : que le poème se fermera à
 * minuit UTC, et à quel rang cette main y est entrée. Il suffit de ne
 * parler qu'APRÈS la révélation.
 *
 * Premier jet : « le lendemain à 9 h locales », sans plus. Au Japon ou en
 * Australie, 9 h tombe avant le cron de 00 h 30 UTC — l'annonce partait sur
 * un poème encore ouvert. `heureAnnonce` prend désormais le plus tard des
 * deux : 9 h le lendemain, ou la révélation passée.
 *
 * Elle ne part qu'à qui a écrit. C'est une nouvelle, pas un rappel — le
 * rappel du soir, lui, s'adresse à tout le monde et vit plus haut.
 *
 * `demander` : la permission ne se demande QUE sur un geste explicite, le
 * lien « M'ÉCRIRE QUAND IL SERA ACHEVÉ » sous ton vers. Poser son premier
 * vers ne déclenche aucune demande dans la foulée ; mais celui qui a déjà
 * dit oui est prévenu sans rien refaire.
 */
export async function annoncerScellement(rang: number, jour: string, demander = false): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = demander
      ? await LocalNotifications.requestPermissions()
      : await LocalNotifications.checkPermissions()
    if (!accorde(perm)) return false

    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_SCELLEMENT }] })
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_SCELLEMENT,
        title: tr('Le poème est achevé', 'The poem is finished'),
        body: tr(
          `Tu en es la ${rang}ᵉ main. Viens voir entre qui le sort t'a mis.`,
          `You are its ${rang}${rang === 1 ? 'st' : rang === 2 ? 'nd' : rang === 3 ? 'rd' : 'th'} hand. Come and see between whom chance placed you.`,
        ),
        schedule: { at: heureAnnonce(jour, new Date()), allowWhileIdle: true },
      }],
    })
    try { localStorage.setItem(ANNONCE_KEY, jour) } catch { /* mode privé */ }
    return true
  } catch { return false /* non bloquant : le vers est posé, c'est l'essentiel */ }
}

/**
 * Ce que l'écran « TON VERS » peut proposer.
 *
 *  · `armee`      — l'annonce de ce jour est planifiée : on le dit, sobrement.
 *  · `proposable` — on peut la demander d'un geste.
 *  · `muette`     — rien ne notifie : le web, ou un refus déjà prononcé. On
 *                   ne redemande pas à qui a dit non ; les réglages du
 *                   téléphone sont à lui.
 */
export type EtatAnnonce = 'armee' | 'proposable' | 'muette'
export async function etatAnnonce(jour: string): Promise<EtatAnnonce> {
  if (!Capacitor.isNativePlatform()) return 'muette'
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display === 'denied') return 'muette'
    if (accorde(perm) && localStorage.getItem(ANNONCE_KEY) === jour) return 'armee'
    return 'proposable'
  } catch { return 'muette' }
}
