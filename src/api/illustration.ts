export async function genererIllustration(
  texte: string,
  style: string,
  promptLibre?: string
): Promise<{ url: string | null; promptVisuel?: string }> {
  try {
    const response = await fetch('/api/illustration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, style, promptLibre }),
    })
    if (!response.ok) return { url: null }
    const { url, promptVisuel } = await response.json()
    return { url: url ?? null, promptVisuel }
  } catch {
    return { url: null }
  }
}
