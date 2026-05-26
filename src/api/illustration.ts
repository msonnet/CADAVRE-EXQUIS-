export async function genererIllustration(
  texte: string,
  style: string,
  promptLibre?: string
): Promise<{ url: string | null; promptVisuel?: string; reason?: string }> {
  try {
    const response = await fetch('/api/illustration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, style, promptLibre }),
    })
    if (!response.ok) return { url: null, reason: `http_${response.status}` }
    const { url, promptVisuel, reason } = await response.json()
    return { url: url ?? null, promptVisuel, reason }
  } catch {
    return { url: null, reason: 'network_error' }
  }
}
