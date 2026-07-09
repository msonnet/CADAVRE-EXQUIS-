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
const PROD_API = 'https://cadavre-exquis-beta.vercel.app'

export function api(path: string): string {
  return Capacitor.isNativePlatform() ? `${PROD_API}${path}` : path
}
