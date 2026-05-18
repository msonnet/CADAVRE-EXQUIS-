export async function corrigerAccords(texte: string, structureId: string): Promise<string> {
  try {
    const res = await fetch('/api/corriger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte, structureId }),
    })
    if (!res.ok) return texte
    const data = await res.json()
    return data.texte ?? texte
  } catch {
    return texte
  }
}
