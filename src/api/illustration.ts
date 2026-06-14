import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'

export async function genererIllustration(
  texte: string,
  style: string,
  promptLibre?: string
): Promise<{ url: string | null; promptVisuel?: string; reason?: string }> {
  try {
    // 60 s : juste au-dessus du plafond serveur (maxDuration 55 s), pour que
    // la réponse ou l'erreur du serveur l'emporte, tout en coupant net si la
    // connexion se perd au lieu de laisser le spinner « EN COURS… » à vie.
    const response = await fetchAvecTimeout('/api/illustration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, style, promptLibre }),
    }, 60_000)
    if (!response.ok) return { url: null, reason: `http_${response.status}` }
    const { url, promptVisuel, reason } = await response.json()
    return { url: url ?? null, promptVisuel, reason }
  } catch (err) {
    return { url: null, reason: (err as Error)?.name === 'AbortError' ? 'timeout' : 'network_error' }
  }
}
