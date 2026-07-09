import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'
import { api } from '../lib/apiBase'

export async function corrigerAccords(
  texte: string,
  structureId: string,
  blocs?: { texte: string; type: string }[],
): Promise<string> {
  try {
    // La correction est awaitée au moment du partage : sans plafond, une API
    // muette gèlerait le bouton « Partager ». Au-delà, on partage le texte brut.
    const res = await fetchAvecTimeout(api('/api/corriger'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, structureId, blocs }),
    }, 15_000)
    if (!res.ok) return texte
    const data = await res.json()
    return data.texte ?? texte
  } catch {
    return texte
  }
}
