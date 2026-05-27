import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
if (supabaseUrl && !supabaseUrl.startsWith('http')) supabaseUrl = 'https://' + supabaseUrl
if (!supabaseUrl) supabaseUrl = 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('[Supabase] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes.')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
)

/** Identifiant anonyme stable par appareil pour les réactions. */
export function getReactorKey(): string {
  try {
    let k = localStorage.getItem('cadavre-reactor-key')
    if (!k) {
      k = 'r-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      localStorage.setItem('cadavre-reactor-key', k)
    }
    return k
  } catch {
    return 'r-anon'
  }
}

/** Upload une image base64 (data URL) vers le bucket gallery-images.
 *  Retourne l'URL publique ou null en cas d'échec. */
export async function uploaderImageGalerie(dataUrl: string, prefix = 'dessin'): Promise<string | null> {
  try {
    const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/)
    if (!m) return null
    const mime = m[1]
    const ext = mime.split('/')[1].replace('+xml', '')
    const bytes = atob(m[2])
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: mime })
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('gallery-images').upload(filename, blob, {
      contentType: mime, cacheControl: '31536000',
    })
    if (error) { console.error('upload error', error); return null }
    const { data } = supabase.storage.from('gallery-images').getPublicUrl(filename)
    return data.publicUrl ?? null
  } catch (e) {
    console.error('upload exception', e)
    return null
  }
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; pseudo: string; avatar_url: string | null; avatar_prompt: string | null; created_at: string; updated_at: string }
        Insert: { id: string; pseudo: string; avatar_url?: string | null; avatar_prompt?: string | null }
        Update: { pseudo?: string; avatar_url?: string | null; avatar_prompt?: string | null }
      }
      rooms: {
        Row: { code: string; host_id: string | null; mode: 'ecrit' | 'dessin'; structure_id: string; nb_joueurs: number; status: 'waiting' | 'playing' | 'finished'; created_at: string; expires_at: string; turn_seconds: number | null; started_at: string | null }
        Insert: { code: string; host_id: string; mode?: 'ecrit' | 'dessin'; structure_id?: string; nb_joueurs?: number; status?: 'waiting' | 'playing' | 'finished'; turn_seconds?: number | null; started_at?: string | null }
        Update: { mode?: 'ecrit' | 'dessin'; structure_id?: string; nb_joueurs?: number; status?: 'waiting' | 'playing' | 'finished'; turn_seconds?: number | null; started_at?: string | null }
      }
      room_players: {
        Row: { id: string; room_code: string; player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null; is_ready: boolean; joined_at: string }
        Insert: { room_code: string; player_id: string; pseudo: string; avatar_url?: string | null; order_index?: number | null; is_ready?: boolean }
        Update: { order_index?: number | null; is_ready?: boolean; pseudo?: string; avatar_url?: string | null }
      }
      contributions: {
        Row: { id: string; room_code: string; player_id: string; case_index: number; texte: string; submitted_at: string }
        Insert: { room_code: string; player_id: string; case_index: number; texte: string }
        Update: never
      }
    }
  }
}
