// fetch qui abandonne au-delà d'un délai : aucun écran ne doit tourner
// indéfiniment sur une connexion lente ou une API muette. L'appelant traite
// l'abandon comme un échec réseau ordinaire — l'AbortError tombe dans son
// catch, et le jeu bascule sur son repli (réserve locale, texte brut, etc.).
export async function fetchAvecTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}
