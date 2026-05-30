import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Handles Supabase email confirmation redirects (PKCE flow).
// Supabase sends: https://your-site.com/auth/callback?code=...
// supabase-js detects the code on createClient(), so by the time this
// component mounts the session is already being set. We just redirect home.
export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/profil', { replace: true })
      } else {
        // Exchange code for session (handles cases where detectSessionInUrl
        // needs an explicit trigger)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(() => {
            navigate('/profil', { replace: true })
          }).catch(() => {
            navigate('/', { replace: true })
          })
        } else {
          navigate('/', { replace: true })
        }
      }
    })
  }, [navigate])

  return null
}
