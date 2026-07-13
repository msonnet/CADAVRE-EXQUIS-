// Wrapper client vers /api/claude (Vercel Function)

import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'
import { api } from '../lib/apiBase'
import { langueActuelle } from '../i18n'

export interface RequeteIA {
  consigne: string
  type: string
  voiceId?: string
  contexte?: string
  eviter?: string[]
  mots?: number   // atelier : nombre de mots imposé au fragment (1–8)
}

export interface ReponseIA {
  texte: string
  source: 'ia' | 'fallback'
}

// Au-delà de ce délai, on abandonne la requête pour ne jamais laisser l'écran
// IA tourner indéfiniment sur une connexion lente : l'appelant bascule alors
// sur sa réserve locale (catch → fallback).
const TIMEOUT_MS = 12_000

export async function demanderFragmentIA(requete: RequeteIA): Promise<ReponseIA> {
  const response = await fetchAvecTimeout(api('/api/claude'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...requete, langue: langueActuelle() }),
  }, TIMEOUT_MS)

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`)
  }

  const data = await response.json()
  return {
    texte: data.texte ?? '',
    source: data.source === 'fallback' ? 'fallback' : 'ia',
  }
}
