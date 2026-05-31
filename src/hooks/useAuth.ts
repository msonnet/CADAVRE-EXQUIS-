import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  pseudo: string
  avatar_url: string | null
  avatar_prompt: string | null
}

// Empêche toute promesse Supabase de bloquer l'UI indéfiniment.
// Sur certains navigateurs intégrés (Yahoo Mail, Messenger, Instagram…)
// `navigator.locks` stalle et getSession() ne se résout jamais : sans ce
// garde-fou, l'écran reste figé sur « CHARGEMENT… ».
function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false
    const timer = setTimeout(() => { if (!done) { done = true; resolve(fallback) } }, ms)
    Promise.resolve(promise).then(
      (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v) } },
      () => { if (!done) { done = true; clearTimeout(timer); resolve(fallback) } },
    )
  })
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    // Garde-fou ultime : quoi qu'il arrive, l'app s'affiche au bout de 5 s.
    const failsafe = setTimeout(() => { if (!cancelled) setLoading(false) }, 5000)

    withTimeout(supabase.auth.getSession(), 4500, { data: { session: null } } as any)
      .then(({ data: { session } }) => {
        if (cancelled) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) loadProfile(session.user.id)
        else setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSession(null); setUser(null); setLoading(false)
      })
      .finally(() => clearTimeout(failsafe))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => { cancelled = true; clearTimeout(failsafe); subscription.unsubscribe() }
  }, [])

  async function loadProfile(userId: string) {
    try {
      const { data } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        6000,
        { data: null } as any,
      )
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
