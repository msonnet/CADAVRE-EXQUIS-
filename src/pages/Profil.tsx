import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { mono } from '../lib/typo'
import { api } from '../lib/apiBase'
import { tr } from '../i18n'

const AVATAR_STYLES = [
  { id: 'surrealiste',     label: tr('Surréaliste', 'Surrealist') },
  { id: 'aquarelle',       label: tr('Aquarelle', 'Watercolor') },
  { id: 'fusain',          label: tr('Fusain', 'Charcoal') },
  { id: 'art_nouveau',     label: 'Art Nouveau' },
  { id: 'encre',           label: tr('Encre', 'Ink') },
  { id: 'expressionniste', label: tr('Expression.', 'Expression.') },
]

async function genererAvatar(prompt: string, style: string): Promise<string | null> {
  try {
    const r = await fetch(api('/api/avatar'), {
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

  const { user, profile, loading, saveProfile, deleteAccount } = useAuth()

  const [pseudo, setPseudo] = useState('')
  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarStyle, setAvatarStyle] = useState('surrealiste')
  const [generatingAvatar, setGeneratingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function supprimerCompte() {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    const err = await deleteAccount()
    setDeleting(false)
    if (err) { setDeleteError(err); return }
    navigate('/', { replace: true })
  }

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
    if (!url) setError(tr("Génération d'avatar indisponible pour l'instant.", 'Avatar generation is unavailable right now.'))
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
          style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← {tr('RETOUR', 'BACK')}
        </button>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 28, marginBottom: 8 }}>
        {tr('— MON PROFIL —', '— MY PROFILE —')}
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSave}
        style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Avatar */}
        <div>
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            {tr('— IMAGE DE PROFIL —', '— PROFILE PICTURE —')}
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85, lineHeight: 1.55, marginBottom: 14 }}>
            {tr("Décris en quelques mots le personnage qui te représente. L'IA générera ton portrait surréaliste.", 'Describe in a few words the character who represents you. The AI will generate your surrealist portrait.')}
          </p>

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
            {/* Aperçu */}
            <div style={{
              width: 72, height: 72, flexShrink: 0,
              border: `1px solid ${accent}40`,
              background: avatarUrl ? 'transparent' : `${accent}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', borderRadius: 3,
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
                placeholder={tr('ex: un alchimiste aux yeux verts avec une barbe de brume…', 'e.g. an alchemist with green eyes and a beard of mist…')}
                aria-label={tr('Description de ton avatar', 'Description of your avatar')}
                rows={2}
                style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 17,
                  color: encre, background: 'rgba(255,253,247,0.5)',
                  border: 'none', borderLeft: `2px solid ${encre}`, padding: '8px 12px',
                  borderRadius: '0 3px 3px 0',
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
                      ...mono, fontSize: 13, padding: '4px 9px',
                      background: avatarStyle === s.id ? `${accent}20` : 'transparent',
                      color: avatarStyle === s.id ? accent : encre,
                      border: `0.5px solid ${avatarStyle === s.id ? accent : `${encre}25`}`,
                      borderRadius: 3,
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
                  ...mono, fontSize: 13, background: 'none', color: accent,
                  border: `0.5px solid ${accent}60`, padding: '6px 12px',
                  borderRadius: 3,
                  cursor: generatingAvatar || !avatarPrompt.trim() ? 'not-allowed' : 'pointer',
                  opacity: generatingAvatar || !avatarPrompt.trim() ? 0.5 : 1,
                }}
              >
                {generatingAvatar ? tr('GÉNÉRATION…', 'GENERATING…') : tr('✦ GÉNÉRER', '✦ GENERATE')}
              </button>
            </div>
          </div>
        </div>

        {/* Pseudo */}
        <div>
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            {tr('— PSEUDONYME —', '— PEN NAME —')}
          </div>
          <input
            type="text"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            placeholder={tr('Ton nom de plume…', 'Your pen name…')}
            aria-label={tr('Pseudonyme', 'Pen name')}
            maxLength={30}
            required
            style={{
              fontFamily: "'Playfair Display', serif", fontSize: 18,
              color: encre, background: 'rgba(255,253,247,0.5)',
              border: 'none', borderLeft: `2px solid ${encre}`, padding: '10px 14px',
              borderRadius: '0 3px 3px 0',
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
            borderRadius: 3,
            opacity: saving || !pseudo.trim() ? 0.5 : 1,
            marginTop: 8,
          }}
        >
          {saving ? tr('ENREGISTREMENT…', 'SAVING…') : profile ? tr('SAUVEGARDER', 'SAVE') : tr('CRÉER MON PROFIL →', 'CREATE MY PROFILE →')}
        </button>

        {/* ── SUPPRESSION DE COMPTE (exigence App Store 5.1.1) ── */}
        {profile && (
          <div style={{ marginTop: 28, paddingTop: 16, borderTop: `0.5px solid ${encre}20`, textAlign: 'center' }}>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{ ...mono, fontSize: 13, color: encre, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', minHeight: 44 }}
              >
                {tr('— SUPPRIMER MON COMPTE —', '— DELETE MY ACCOUNT —')}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: encre, opacity: 0.85, lineHeight: 1.5 }}>
                  {tr('Ton profil et ton compte seront définitivement supprimés. Tes publications dans la galerie deviendront anonymes.', 'Your profile and your account will be permanently deleted. Your gallery publications will become anonymous.')}
                </p>
                {deleteError && (
                  <p role="alert" style={{ ...mono, fontSize: 13, color: '#b22c20' }}>{deleteError}</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={supprimerCompte}
                    disabled={deleting}
                    style={{ flex: 1, padding: '0.85em', background: '#7B0000', color: '#e8d4b8', ...mono, fontSize: 15, border: 'none', cursor: deleting ? 'wait' : 'pointer', borderRadius: 3 }}
                  >
                    {deleting ? tr('SUPPRESSION…', 'DELETING…') : tr('SUPPRIMER DÉFINITIVEMENT', 'DELETE PERMANENTLY')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                    style={{ padding: '0.85em 1em', background: 'transparent', color: encre, ...mono, fontSize: 15, border: `0.5px solid ${encre}30`, cursor: 'pointer', borderRadius: 3 }}
                  >
                    {tr('ANNULER', 'CANCEL')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.form>
    </PageTransition>
  )
}
