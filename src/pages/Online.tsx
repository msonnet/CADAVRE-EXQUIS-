import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase } from '../lib/supabase'

function genCode(): string {
  const adj = ['LOUP', 'CYGNE', 'CRABE', 'OURS', 'VACHE', 'TIGRE', 'AIGLE', 'SINGE', 'VIPÈRE', 'LAPIN', 'RENARD', 'HIBOU']
  const n = Math.floor(Math.random() * 90) + 10
  return `${adj[Math.floor(Math.random() * adj.length)]}-${n}`
}

type PublicRoom = {
  code: string
  mode: string
  structure_id: string
  nb_joueurs: number
  player_count: number
}

const MODE_LABEL: Record<string, string> = { ecrit: 'ÉCRIT', dessin: 'DESSINÉ' }
const STRUCT_SHORT: Record<string, string> = {
  'phrase-simple': '3 cases',
  'phrase-etoffee': '7 cases',
  'vers-libre': 'libre',
}

export default function Online() {
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading, signInWithEmail, signOut } = useAuth()
  const { jouer } = useSound()

  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)

  const fetchPublicRooms = useCallback(async () => {
    setLoadingRooms(true)
    try {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('code, mode, structure_id, nb_joueurs')
        .eq('status', 'waiting')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10)
      if (!rooms) { setPublicRooms([]); return }
      const withCounts = await Promise.all(rooms.map(async (r) => {
        const { count } = await supabase
          .from('room_players')
          .select('*', { count: 'exact', head: true })
          .eq('room_code', r.code)
        return { ...r, player_count: count ?? 0 }
      }))
      setPublicRooms(withCounts)
    } finally {
      setLoadingRooms(false)
    }
  }, [])

  useEffect(() => {
    if (user && profile) fetchPublicRooms()
  }, [user, profile, fetchPublicRooms])

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSendingEmail(true)
    setEmailError(null)
    const err = await signInWithEmail(email.trim())
    setSendingEmail(false)
    if (err) setEmailError(err)
    else setEmailSent(true)
  }

  async function handleCreate() {
    if (!user || !profile) return
    jouer('clic')
    setCreating(true)
    setCreateError(null)
    try {
      const code = genCode()
      const { error } = await supabase.from('rooms').insert({
        code,
        host_id: user.id,
        mode: 'ecrit',
        structure_id: 'phrase-simple',
        nb_joueurs: 3,
        status: 'waiting',
        is_public: true,
      })
      if (error) throw error
      navigate(`/salon/${code}`)
    } catch (err: any) {
      console.error('Erreur création salon:', err)
      setCreateError(err?.message ?? 'Erreur lors de la création du salon.')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code || !user || !profile) return
    jouer('clic')
    setJoining(true)
    setJoinError(null)
    try {
      const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()
      if (!room) { setJoinError('Salon introuvable — vérifiez le code.'); setJoining(false); return }
      if (room.status !== 'waiting') { setJoinError('Cette partie a déjà commencé.'); setJoining(false); return }
      navigate(`/salon/${code}`)
    } catch {
      setJoinError('Impossible de rejoindre — réessayez.')
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={() => navigate('/')}
          style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← RETOUR
        </button>
        {user && (
          <button
            onClick={signOut}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            DÉCONNEXION
          </button>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 28, marginBottom: 8 }}>
        — MODE EN LIGNE —
      </div>

      {/* ── NOT LOGGED IN ── */}
      {!user && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="font-bodoni font-black leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 8vw, 2.8rem)', color: encre, marginBottom: 12 }}
          >
            Jouer à plusieurs.
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.85, lineHeight: 1.65, marginBottom: 28 }}>
            Chaque joueur sur son propre appareil. Composez ensemble un cadavre exquis, chacun ignorant ce qu'ont écrit les autres. La révélation est collective.
          </p>

          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — CONNEXION —
          </div>

          <AnimatePresence mode="wait">
            {emailSent ? (
              <motion.p
                key="sent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: accent, lineHeight: 1.6 }}
              >
                Un lien magique a été envoyé à <strong>{email}</strong>. Ouvrez-le pour vous connecter.
              </motion.p>
            ) : (
              <motion.form key="form" onSubmit={handleSendLink} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.85, marginBottom: 4 }}>
                  Entrez votre adresse e-mail pour recevoir un lien de connexion instantané — sans mot de passe.
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  aria-label="Adresse e-mail"
                  required
                  style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
                    color: encre, background: 'rgba(255,253,247,0.5)',
                    border: 'none', borderLeft: `2px solid ${encre}`, padding: '10px 14px',
                    outline: 'none', caretColor: accent, width: '100%',
                  }}
                />
                {emailError && (
                  <p style={{ ...mono, fontSize: 13, color: '#b22c20', marginTop: -4 }}>{emailError}</p>
                )}
                <button
                  type="submit"
                  disabled={sendingEmail}
                  style={{ background: accent, color: btnText, ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.85em 1.8em', border: 'none', cursor: 'pointer', opacity: sendingEmail ? 0.5 : 1 }}
                >
                  {sendingEmail ? 'ENVOI…' : 'ENVOYER LE LIEN'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── LOGGED IN BUT NO PROFILE ── */}
      {user && !profile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: encre, opacity: 0.85, marginBottom: 20 }}>
            Connecté. Créez votre profil pour continuer.
          </p>
          <button
            onClick={() => navigate('/profil')}
            style={{ background: accent, color: btnText, ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.85em 1.8em', border: 'none', cursor: 'pointer' }}
          >
            CRÉER MON PROFIL →
          </button>
        </motion.div>
      )}

      {/* ── LOGGED IN WITH PROFILE ── */}
      {user && profile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Profil courant */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: `0.5px solid ${encre}20` }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.pseudo}
                style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover', border: `1px solid ${accent}40` }}
              />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 4, background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 22, color: accent }}>
                  {profile.pseudo[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 16, color: encre }}>{profile.pseudo}</div>
              <button
                onClick={() => navigate('/profil')}
                style={{ ...mono, fontSize: 12, color: accent, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                MODIFIER LE PROFIL
              </button>
            </div>
          </div>

          {/* Parties ouvertes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
                — PARTIES OUVERTES —
              </div>
              <button
                onClick={fetchPublicRooms}
                disabled={loadingRooms}
                style={{ ...mono, fontSize: 12, color: encre, opacity: 0.65, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {loadingRooms ? '⟳' : '↺ ACTUALISER'}
              </button>
            </div>
            {loadingRooms ? (
              <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.5 }}>Recherche…</p>
            ) : publicRooms.length === 0 ? (
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.65, lineHeight: 1.5 }}>
                Aucune partie ouverte pour l'instant. Créez la vôtre ou rejoignez par code.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {publicRooms.map((r) => (
                  <motion.button
                    key={r.code}
                    onClick={() => { jouer('clic'); navigate(`/salon/${r.code}`) }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: `${encre}06`, border: `1px solid ${encre}20`,
                      borderLeft: `3px solid ${accent}`,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 16, color: encre, marginBottom: 2 }}>
                        {r.code}
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: accent, letterSpacing: '0.18em' }}>
                        {MODE_LABEL[r.mode] ?? r.mode} · {STRUCT_SHORT[r.structure_id] ?? r.structure_id}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700 }}>
                        {r.player_count}/{r.nb_joueurs}
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5 }}>JOUEURS</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Créer salon */}
          <div>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
              — NOUVELLE PARTIE —
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.85, marginBottom: 14, lineHeight: 1.5 }}>
              Créez un salon et partagez le code, ou laissez-le public pour que d'autres rejoignent.
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{ background: accent, color: btnText, ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.9em 1.8em', border: 'none', cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.6 : 1, width: '100%' }}
            >
              {creating ? 'CRÉATION…' : 'CRÉER UN SALON'}
            </button>
            {createError && (
              <p style={{ ...mono, fontSize: 12, color: '#b22c20', marginTop: 8 }}>{createError}</p>
            )}
          </div>

          {/* Rejoindre salon */}
          <div>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
              — REJOINDRE PAR CODE —
            </div>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="LOUP-42"
                aria-label="Code du salon"
                maxLength={12}
                style={{
                  ...mono, fontSize: 16, textTransform: 'uppercase',
                  color: encre, background: 'rgba(255,253,247,0.5)',
                  border: 'none', borderLeft: `2px solid ${encre}`, padding: '10px 14px',
                  outline: 'none', caretColor: accent, letterSpacing: '0.15em',
                }}
              />
              {joinError && (
                <p style={{ ...mono, fontSize: 13, color: '#b22c20' }}>{joinError}</p>
              )}
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                style={{ background: 'transparent', color: encre, ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.8em 1.8em', border: `1px solid ${encre}`, cursor: 'pointer', opacity: joining || !joinCode.trim() ? 0.4 : 1 }}
              >
                {joining ? 'RECHERCHE…' : 'REJOINDRE'}
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </PageTransition>
  )
}
