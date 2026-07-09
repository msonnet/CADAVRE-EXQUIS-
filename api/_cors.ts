/**
 * En-têtes CORS pour les fonctions API.
 *
 * L'app native Capacitor sert le webview depuis capacitor://localhost (iOS)
 * ou https://localhost (Android) : ses appels vers cadavre-exquis-beta.vercel.app
 * sont cross-origin et le WKWebView les bloque sans ces en-têtes. Le web
 * même-origine n'est pas affecté. Pas de cookies en jeu (auth par Bearer),
 * donc l'origine jokère est sûre ici — les endpoints restent protégés par
 * le rate limiting et, pour la suppression de compte, par le jeton de session.
 *
 * Renvoie true si la requête était le préflight OPTIONS (déjà répondu).
 */
export function cors(req: any, res: any): boolean {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return true
  }
  return false
}
