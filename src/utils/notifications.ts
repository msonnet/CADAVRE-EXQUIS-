// Rappel quotidien local — planifié sur l'appareil par @capacitor/local-notifications.
// Aucune donnée n'est envoyée : la notification est purement locale, fidèle au
// « tout reste local ». No-op hors plateforme native (le web PWA ne sait pas
// planifier un rappel répété de façon fiable) — le plugin est importé à la
// demande pour ne pas alourdir le bundle web.

import { Capacitor } from '@capacitor/core'

export const RAPPEL_KEY = 'cadavre-rappel'
const NOTIF_ID = 1001        // identifiant stable : on ne crée jamais de doublon
const HEURE_RAPPEL = 20      // 20 h, l'heure des rêves qui commencent

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
