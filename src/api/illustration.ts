import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'
import { api } from '../lib/apiBase'

// Format Instagram : 3:4 vertical, 1080 × 1440 px — publiable sans recadrage.
const INSTA_W = 1080
const INSTA_H = 1440

/**
 * Redessine l'illustration à exactement 1080 × 1440 (JPEG). La génération est
 * déjà en 3:4 exact (1056 × 1408 — fal arrondit aux multiples de 32) : le
 * redimensionnement est homothétique, rien n'est coupé. En cas d'échec
 * (CORS, mémoire), l'URL d'origine est conservée — même ratio, donc toujours
 * compatible Instagram.
 */
async function normaliserFormatInstagram(url: string): Promise<string> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => resolve(im)
      im.onerror = reject
      im.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = INSTA_W
    canvas.height = INSTA_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return url
    // Cover : l'image remplit tout le cadre, centrée (aucune bande, aucune déformation)
    const scale = Math.max(INSTA_W / img.naturalWidth, INSTA_H / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (INSTA_W - w) / 2, (INSTA_H - h) / 2, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    return dataUrl.startsWith('data:image/jpeg') ? dataUrl : url
  } catch {
    return url
  }
}

export async function genererIllustration(
  texte: string,
  style: string,
  promptLibre?: string
): Promise<{ url: string | null; promptVisuel?: string; reason?: string }> {
  try {
    // 60 s : juste au-dessus du plafond serveur (maxDuration 55 s), pour que
    // la réponse ou l'erreur du serveur l'emporte, tout en coupant net si la
    // connexion se perd au lieu de laisser le spinner « EN COURS… » à vie.
    const response = await fetchAvecTimeout(api('/api/illustration'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, style, promptLibre }),
    }, 60_000)
    if (!response.ok) return { url: null, reason: `http_${response.status}` }
    const { url, promptVisuel, reason } = await response.json()
    if (!url) return { url: null, promptVisuel, reason }
    return { url: await normaliserFormatInstagram(url), promptVisuel, reason }
  } catch (err) {
    return { url: null, reason: (err as Error)?.name === 'AbortError' ? 'timeout' : 'network_error' }
  }
}
