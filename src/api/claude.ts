// Wrapper client vers /api/claude (Vercel Function)

export interface RequeteIA {
  consigne: string
  type: string
}

export async function demanderFragmentIA(requete: RequeteIA): Promise<string> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requete),
  })

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`)
  }

  const { texte } = await response.json()
  return texte ?? ''
}
