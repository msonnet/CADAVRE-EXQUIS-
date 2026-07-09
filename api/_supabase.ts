import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase service-role pour les fonctions serveur.
 * Assainit les valeurs des variables d'environnement : les copier-coller
 * dans le dashboard Vercel embarquent parfois guillemets, espaces ou
 * retours à la ligne, et createClient plante sur une URL malformée
 * (FUNCTION_INVOCATION_FAILED) au lieu de renvoyer une erreur propre.
 */

function nettoyer(v: string | undefined): string {
  return (v ?? '').trim().replace(/^["']+|["']+$/g, '').trim()
}

let derniereErreur = ''

export function clientAdmin(): SupabaseClient | null {
  let url = nettoyer(process.env.SUPABASE_URL) || nettoyer(process.env.VITE_SUPABASE_URL)
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url
  const key = nettoyer(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) return null
  try {
    return createClient(url, key, { auth: { persistSession: false } })
  } catch (e) {
    derniereErreur = String(e).slice(0, 160)
    return null
  }
}

/** Dit ce qui manque à la config serveur — pour diagnostiquer un 503 à distance. */
export function diagnosticEnv(): string {
  const url = nettoyer(process.env.SUPABASE_URL) || nettoyer(process.env.VITE_SUPABASE_URL)
  const key = nettoyer(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url && !key) return 'url et clé absentes'
  if (!url) return 'url absente'
  if (!key) return 'SUPABASE_SERVICE_ROLE_KEY absente'
  if (derniereErreur) return `createClient a échoué : ${derniereErreur}`
  return 'config présente'
}
