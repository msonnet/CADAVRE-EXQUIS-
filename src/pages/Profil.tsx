import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'

const AVATAR_STYLES = [
  { id: 'surrealiste',     label: 'Surréaliste' },
  { id: 'aquarelle',       label: 'Aquarelle' },
  { id: 'fusain',          label: 'Fusain' },
  { id: 'art_nouveau',     label: 'Art Nouveau' },
  { id: 'encre',           label: 'Encre' },
  { id: 'expressionniste', label: 'Expression.' },
]

async function genererAvatar(prompt: string, style: string): Promise<string | null> {
  try {
    const r = await fetch('/api/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style }),
    })
    if (!r.ok) return null
    const { url } = await r.json()
    return url ?? null
  } catch {
    return null
  }
}

export default function Profil() {
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading, saveProfile } = useAuth()

  const [pseudo, setPseudo] = useState('')
  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarStyle, setAvatarStyle] = useState('surrealiste')
  const [generatingAvatar, setGeneratingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setPseudo(profile.pseudo)
      setAvatarPrompt(profile.avatar_prompt ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
    }
  }, [profile])

  useEffect(() => {
    if (!loading && !user) navigate('/online')
  }, [loading, user, navigate])

  async function handleGenerateAvatar() {
    if (!avatarPrompt.trim()) return
    setGeneratingAvatar(true)
    setError(null)
    const url = await genererAvatar(avatarPrompt.trim(), avatarStyle)
    setAvatarUrl(url)
    if (!url) setError('Génération d\'avatar indisponible pour l\'instant.')
    setGeneratingAvatar(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!pseudo.trim()) return
    setSaving(true)
    setError(null)
    const err = await saveProfile(pseudo.trim(), avatarUrl ?? undefined, avatarPrompt.trim() || undefined)
    setSaving(false)
    if (err) { setError(err); return }
    navigate('/online')
  }

  if (loading) return null

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <button
          onClick={() => navigate('/online')}
          style={{ ...mono, fontSize: 17, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← RETOUR
        </button>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      <div style={{ ...mono, fontSize: 17, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 28, marginBottom: 8 }}>
        — MON PROFIL —
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Avatar */}
        <div>
          <div style={{ ...mono, fontSize: 17, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — IMAGE DE PROFIL —
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85, lineHeight: 1.55, marginBottom: 14 }}>
            Décrivez en quelques mots le personnage qui vous représente. L'IA générera votre portrait surréaliste.
          </p>

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
            {/* Aperçu */}
            <div style={{
              width: 72, height: 72, flexShrink: 0,
              border: `1px solid ${accent}40`,
              background: avatarUrl ? 'transparent' : `${accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', borderRadius: 4,
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : generatingAvatar ? (
                <motion.span
                  style={{ fontSize: 22, color: accent }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >✦</motion.span>
              ) : (
                <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 28, color: `${accent}50` }}>
                  {pseudo[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={avatarPrompt}
                onChange={e => setAvatarPrompt(e.target.value)}
                placeholder="ex: un alchimiste aux yeux verts avec une barbe de brume…"
                aria-label="Description de votre avatar"
                rows={2}
                style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 17,
                  color: encre, background: 'rgba(255,253,247,0.5)',
                  border: 'none', borderLeft: `2px solid ${encre}`, padding: '8px 12px',
                  outline: 'none', caretColor: accent, resize: 'none', width: '100%',
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {AVATAR_STYLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setAvatarStyle(s.id)}
                    style={{
                      ...mono, fontSize: 17, padding: '4px 9px',
                      background: avatarStyle === s.id ? `${accent}20` : 'transparent',
                      color: avatarStyle === s.id ? accent : encre,
                      border: `0.5px solid ${avatarStyle === s.id ? accent : `${encre}25`}`,
                      cursor: 'pointer',
                    }}
                  >{s.label}</button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleGenerateAvatar}
                disabled={generatingAvatar || !avatarPrompt.trim()}
                style={{
                  ...mono, fontSize: 17, background: 'none', color: accent,
                  border: `0.5px solid ${accent}60`, padding: '6px 12px',
                  cursor: generatingAvatar || !avatarPrompt.trim() ? 'not-allowed' : 'pointer',
                  opacity: generatingAvatar || !avatarPrompt.trim() ? 0.5 : 1,
                }}
              >
                {generatingAvatar ? 'GÉNÉRATION…' : '✦ GÉNÉRER'}
              </button>
            </div>
          </div>
        </div>

        {/* Pseudo */}
        <div>
          <div style={{ ...mono, fontSize: 17, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — PSEUDONYME —
          </div>
          <input
            type="text"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            placeholder="Votre nom de plume…"
            aria-label="Pseudonyme"
            maxLength={30}
            required
            style={{
              fontFamily: "'Playfair Display', serif", fontSize: 18,
              color: encre, background: 'rgba(255,253,247,0.5)',
              border: 'none', borderLeft: `2px solid ${encre}`, padding: '10px 14px',
              outline: 'none', caretColor: accent, width: '100%',
            }}
          />
        </div>

        {error && (
          <p style={{ ...mono, fontSize: 17, color: '#b22c20' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving || !pseudo.trim()}
          style={{
            background: accent, color: btnText, ...mono, fontSize: 17,
            textTransform: 'uppercase', padding: '0.9em 1.8em',
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            opacity: saving || !pseudo.trim() ? 0.5 : 1,
            marginTop: 8,
          }}
        >
          {saving ? 'ENREGISTREMENT…' : profile ? 'SAUVEGARDER' : 'CRÉER MON PROFIL →'}
        </button>
      </motion.form>
    </PageTransition>
  )
}
