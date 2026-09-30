import { Capacitor } from '@capacitor/core'

/**
 * Base des appels API.
 *
 * Sur le web (Vercel), les chemins relatifs /api/... visent la même origine.
 * Dans l'app native Capacitor, le webview sert capacitor://localhost (iOS)
 * ou https://localhost (Android) : un chemin relatif n'atteindrait aucun
 * backend. On vise alors la production — dont les fonctions renvoient les
 * en-têtes CORS nécessaires (api/_cors.ts).
 */
export const PROD_API = 'https://cadavre-exquis-beta.vercel.app'

export function api(path: string): string {
  return Capacitor.isNativePlatform() ? `${PROD_API}${path}` : path
}

/**
 * L'adresse publique d'une page du jeu — celle qu'on peut envoyer à
 * quelqu'un. En natif, l'origine de la webvue (`capacitor://localhost`)
 * n'ouvre rien chez le destinataire : on donne celle de la production.
 */
export function lienPublic(path: string): string {
  const origine = Capacitor.isNativePlatform() || typeof window === 'undefined'
    ? PROD_API
    : window.location.origin
  return `${origine}${path}`
}
