export async function genererIllustration(texte: string, style: string, promptLibre?: string): Promise<string | null> {
  try {
    const response = await fetch('/api/illustration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, style, promptLibre }),
    })
    if (!response.ok) return null
    const { url } = await response.json()
    return url ?? null
  } catch {
    return null
  }
}
