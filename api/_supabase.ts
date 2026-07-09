import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase service-role pour les fonctions serveur.
 *
 * Les valeurs saisies dans le dashboard Vercel peuvent être polluées
 * (guillemets, espaces, retours à la ligne du copier-coller) ou une
 * variable SUPABASE_URL parasite peut coexister avec la bonne
 * VITE_SUPABASE_URL. Chaque candidate est donc nettoyée PUIS validée
 * par new URL() — la première valide l'emporte. Sans cela, createClient
 * plante et la fonction meurt en FUNCTION_INVOCATION_FAILED.
 */

function urlCandidate(v: string | undefined): string | null {
  // Un URL ne contient jamais d'espace ni de guillemet : on purge tout.
  let s = (v ?? '').replace(/["'\s]/g, '')
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try { new URL(s); return s } catch { return null }
}

function cleNettoyee(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/["'\s]/g, '')
}

let derniereErreur = ''

export function clientAdmin(): SupabaseClient | null {
  const url = urlCandidate(process.env.SUPABASE_URL) ?? urlCandidate(process.env.VITE_SUPABASE_URL)
  const key = cleNettoyee()
  if (!url || !key) return null
  try {
    return createClient(url, key, { auth: { persistSession: false } })
  } catch (e) {
    derniereErreur = String(e).slice(0, 160)
    return null
  }
}

/** État précis de la config serveur — pour diagnostiquer un 503 à distance. */
export function diagnosticEnv(): string {
  const brutA = process.env.SUPABASE_URL
  const brutB = process.env.VITE_SUPABASE_URL
  const parts = [
    `SUPABASE_URL: ${brutA ? (urlCandidate(brutA) ? 'ok' : 'INVALIDE') : 'absente'}`,
    `VITE_SUPABASE_URL: ${brutB ? (urlCandidate(brutB) ? 'ok' : 'INVALIDE') : 'absente'}`,
    `SERVICE_ROLE_KEY: ${cleNettoyee() ? 'présente' : 'ABSENTE'}`,
  ]
  if (derniereErreur) parts.push(`createClient: ${derniereErreur}`)
  return parts.join(' · ')
}
