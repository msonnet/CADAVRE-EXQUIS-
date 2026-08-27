// Wrapper client vers /api/claude (Vercel Function)

import { fetchAvecTimeout } from '../utils/fetchAvecTimeout'
import { api } from '../lib/apiBase'
import { langueActuelle } from '../i18n'
import { jetonOuIdentite, recuCourant } from '../lib/acces'

export interface RequeteIA {
  consigne: string
  type: string
  voiceId?: string
  contexte?: string
  eviter?: string[]
  mots?: number   // atelier : nombre de mots imposé au fragment (1–8)
  /** Stratégie de déterminant tirée dans l'idiolecte de la voix, ou 'HORS_GN'
   *  pour un vers entier qui ne doit pas ouvrir sur un groupe nominal.
   *  Le serveur la met en mots (`api/_determinants.ts`) — on n'envoie qu'une clé. */
  determinant?: string
  /** Cette case a-t-elle le droit de puiser dans le lexique de métier de la
   *  voix ? Le quota est tenu par vers, pas par case : à 0,68 de moyenne et
   *  quatre cases, un vers portait 2,7 mots de métier — zéro vers sur
   *  vingt-deux n'en était exempt. Voir `src/lib/lexique.ts`. */
  metier?: boolean
}

export interface ReponseIA {
  texte: string
  source: 'ia' | 'fallback'
  /** Nom de la persona qui a écrit (« l'apiculteur », « le fossoyeur »…) —
   *  le serveur l'envoie depuis toujours, il était jeté ici. */
  voixNom?: string
}

// Au-delà de ce délai, on abandonne la requête pour ne jamais laisser l'écran
// IA tourner indéfiniment sur une connexion lente : l'appelant bascule alors
// sur sa réserve locale (catch → fallback).
const TIMEOUT_MS = 12_000

export async function demanderFragmentIA(requete: RequeteIA): Promise<ReponseIA> {
  // La partie a été réglée à son ouverture ; on ne fait que présenter le reçu.
  const jeton = await jetonOuIdentite()
  const response = await fetchAvecTimeout(api('/api/claude'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
    },
    body: JSON.stringify({
      ...requete,
      partieId: recuCourant(),
      langue: langueActuelle(),
    }),
  }, TIMEOUT_MS)

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`)
  }

  const data = await response.json()
  return {
    texte: data.texte ?? '',
    source: data.source === 'fallback' ? 'fallback' : 'ia',
    voixNom: typeof data.voixNom === 'string' ? data.voixNom : undefined,
  }
}
