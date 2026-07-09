import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api } from '../lib/apiBase'

export type Profile = {
  id: string
  pseudo: string
  avatar_url: string | null
  avatar_prompt: string | null
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data ?? null)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  // Connexion anonyme : crée un compte + profil sans email.
  async function signInAnonymously(pseudo: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) return error.message
    if (!data.user) return 'Connexion impossible'
    const { error: profError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      pseudo: pseudo.trim(),
      avatar_url: null,
      avatar_prompt: null,
    })
    if (profError) return profError.message
    setProfile({ id: data.user.id, pseudo: pseudo.trim(), avatar_url: null, avatar_prompt: null })
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  /**
   * Suppression définitive du compte (exigence App Store 5.1.1).
   * Le serveur vérifie le jeton : on ne peut supprimer que son propre compte.
   * Renvoie null si OK, sinon un message d'erreur à afficher.
   */
  async function deleteAccount(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return 'Non connecté'
    try {
      const res = await fetch(api('/api/delete-account'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        return d?.error ?? 'Suppression impossible — réessaie.'
      }
    } catch {
      return 'Connexion impossible — vérifie ton réseau.'
    }
    await supabase.auth.signOut()
    setProfile(null)
    return null
  }

  async function saveProfile(pseudo: string, avatar_url?: string, avatar_prompt?: string): Promise<string | null> {
    if (!user) return 'Non connecté'
    const payload = { id: user.id, pseudo, avatar_url: avatar_url ?? null, avatar_prompt: avatar_prompt ?? null }
    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) return error.message
    setProfile({ id: user.id, pseudo, avatar_url: avatar_url ?? null, avatar_prompt: avatar_prompt ?? null })
    return null
  }

  return { user, session, profile, loading, signInAnonymously, signOut, deleteAccount, saveProfile, reloadProfile: () => user && loadProfile(user.id) }
}
