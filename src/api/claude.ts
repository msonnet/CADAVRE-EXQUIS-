// Wrapper client vers /api/claude (Vercel Function)

export interface RequeteIA {
  consigne: string
  type: string
  voiceId?: string
  contexte?: string
  eviter?: string[]
}

export interface ReponseIA {
  texte: string
  source: 'ia' | 'fallback'
}

export async function demanderFragmentIA(requete: RequeteIA): Promise<ReponseIA> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requete),
  })

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`)
  }

  const data = await response.json()
  return {
    texte: data.texte ?? '',
    source: data.source === 'fallback' ? 'fallback' : 'ia',
  }
}
