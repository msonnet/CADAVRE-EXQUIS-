import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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

  async function signInWithEmail(email: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/online` },
    })
    return error?.message ?? null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function saveProfile(pseudo: string, avatar_url?: string, avatar_prompt?: string): Promise<string | null> {
    if (!user) return 'Non connecté'
    const payload = { id: user.id, pseudo, avatar_url: avatar_url ?? null, avatar_prompt: avatar_prompt ?? null }
    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) return error.message
    setProfile({ id: user.id, pseudo, avatar_url: avatar_url ?? null, avatar_prompt: avatar_prompt ?? null })
    return null
  }

  return { user, session, profile, loading, signInWithEmail, signOut, saveProfile, reloadProfile: () => user && loadProfile(user.id) }
}
