import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes — mode hors-ligne.')
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; pseudo: string; avatar_url: string | null; avatar_prompt: string | null; created_at: string; updated_at: string }
        Insert: { id: string; pseudo: string; avatar_url?: string | null; avatar_prompt?: string | null }
        Update: { pseudo?: string; avatar_url?: string | null; avatar_prompt?: string | null }
      }
      rooms: {
        Row: { code: string; host_id: string | null; mode: 'ecrit' | 'dessin'; structure_id: string; nb_joueurs: number; status: 'waiting' | 'playing' | 'finished'; created_at: string; expires_at: string }
        Insert: { code: string; host_id: string; mode?: 'ecrit' | 'dessin'; structure_id?: string; nb_joueurs?: number; status?: 'waiting' | 'playing' | 'finished' }
        Update: { mode?: 'ecrit' | 'dessin'; structure_id?: string; nb_joueurs?: number; status?: 'waiting' | 'playing' | 'finished' }
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
