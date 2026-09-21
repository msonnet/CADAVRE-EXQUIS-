// Rappel quotidien local — planifié sur l'appareil par @capacitor/local-notifications.
// Aucune donnée n'est envoyée : la notification est purement locale, fidèle au
// « tout reste local ». No-op hors plateforme native (le web PWA ne sait pas
// planifier un rappel répété de façon fiable) — le plugin est importé à la
// demande pour ne pas alourdir le bundle web.

import { Capacitor } from '@capacitor/core'
import { tr } from '../i18n'

export const RAPPEL_KEY = 'cadavre-rappel'
const NOTIF_ID = 1001        // identifiant stable : on ne crée jamais de doublon
const NOTIF_SCELLEMENT = 1002 // l'annonce du poème achevé, une fois par jour écrit
const HEURE_RAPPEL = 20      // 20 h, l'heure des rêves qui commencent
// 9 h locales pour l'annonce du poème achevé : il se ferme à minuit UTC,
// soit 01 h ou 02 h à Lamastre, et on ne réveille personne pour un poème.
const HEURE_SCELLEMENT = 9

// Le rappel n'a de sens que sur l'app installée (iOS / Android).
export function rappelDisponible(): boolean {
  return Capacitor.isNativePlatform()
}

// (Re)planifie le rappel quotidien. Demande l'autorisation au besoin ; renvoie
// true si le rappel est bien armé, false si refusé ou indisponible.
export async function activerRappelQuotidien(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    // On annule l'éventuel rappel existant avant de replanifier (jamais de doublon).
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] })
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_ID,
        title: 'Cadavre Exquis',
        body: 'Le poème du jour t\'attend — ajoute ta main au cadavre.',
        schedule: { on: { hour: HEURE_RAPPEL, minute: 0 }, allowWhileIdle: true },
      }],
    })
    return true
  } catch {
    return false
  }
}

export async function desactiverRappelQuotidien(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] })
  } catch { /* non bloquant */ }
}

// À appeler au démarrage : si le joueur avait activé le rappel, on s'assure
// qu'il est toujours armé (réinstallation, mise à jour…). Silencieux sinon —
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
 * son vers, on sait DEUX choses avec certitude : que le poème se scellera à
 * minuit UTC, et à quel rang cette main y est entrée. Une annonce planifiée
 * au lendemain matin n'affirme donc rien qu'on ignore — elle arrive après
 * le scellement, jamais avant.
 *
 * Neuf heures locales, et non minuit : le poème se ferme à 01 h ou 02 h à
 * Lamastre, et réveiller quelqu'un pour lui annoncer un poème n'est pas le
 * ton de ce jeu.
 *
 * Elle ne part qu'à qui a écrit. C'est une nouvelle, pas un rappel — le
 * rappel du soir, lui, s'adresse à tout le monde et vit plus haut.
 */
export async function annoncerScellement(rang: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.checkPermissions()
    // On ne demande RIEN ici : un joueur qui pose son premier vers n'a pas à
    // recevoir une demande d'autorisation dans la foulée. S'il a déjà armé
    // le rappel du soir, il est d'accord ; sinon on se tait.
    if (perm.display !== 'granted') return

    const demain = new Date()
    demain.setDate(demain.getDate() + 1)
    demain.setHours(HEURE_SCELLEMENT, 0, 0, 0)

    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_SCELLEMENT }] })
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_SCELLEMENT,
        title: tr('Le poème est achevé', 'The poem is finished'),
        body: tr(
          `Tu en es la ${rang}ᵉ main. Viens voir entre qui le sort t'a mis.`,
          `You are its ${rang}${rang === 1 ? 'st' : rang === 2 ? 'nd' : rang === 3 ? 'rd' : 'th'} hand. Come and see between whom chance placed you.`,
        ),
        schedule: { at: demain, allowWhileIdle: true },
      }],
    })
  } catch { /* non bloquant : le vers est posé, c'est l'essentiel */ }
}
