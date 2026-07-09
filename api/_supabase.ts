import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase service-role pour les fonctions serveur.
 * Normalise l'URL comme le fait le client web (src/lib/supabase.ts) :
 * la variable Vercel peut être renseignée sans « https:// », et
 * createClient PLANTE sur une URL sans protocole (FUNCTION_INVOCATION_FAILED)
 * au lieu de renvoyer une erreur propre.
 */
export function clientAdmin(): SupabaseClient | null {
  let url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
  if (url && !url.startsWith('http')) url = 'https://' + url
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key, { auth: { persistSession: false } })
  } catch {
    return null
  }
}
