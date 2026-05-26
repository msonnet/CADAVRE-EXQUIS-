import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { STRUCTURES } from '../structures'

type Room = { code: string; host_id: string | null; mode: 'ecrit' | 'dessin'; structure_id: string; nb_joueurs: number; status: string }
type RoomPlayer = { id: string; player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null; is_ready: boolean }

const STRUCT_LABELS: Record<string, string> = {
  'phrase-simple': 'Phrase simple (3 joueurs)',
  'phrase-etoffee': 'Phrase étoffée (7 joueurs)',
  'vers-libre': 'Vers libre (variable)',
}

export default function Salon() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading: authLoading } = useAuth()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [roomError, setRoomError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  const isHost = room?.host_id === user?.id
  const mePlayer = players.find(p => p.player_id === user?.id)
  const allReady = players.length >= 2 && players.every(p => p.is_ready)

  // ── Join room on mount ────────────────────────────────
  const joinRoom = useCallback(async () => {
    if (!user || !profile || !code) return
    const { error } = await supabase.from('room_players').upsert({
      room_code: code,
      player_id: user.id,
      pseudo: profile.pseudo,
      avatar_url: profile.avatar_url ?? null,
      is_ready: false,
    }, { onConflict: 'room_code,player_id' })
    if (error) console.error('Erreur join:', error)
  }, [user, profile, code])

  // ── Load room + players ───────────────────────────────
  const loadRoom = useCallback(async () => {
    if (!code) return
    const { data: r, error } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (error || !r) { setRoomError('Salon introuvable.'); return }
    setRoom(r)
    if (r.status === 'playing') navigate(`/jeu-online/${code}`)
    if (r.status === 'finished') navigate(`/fin-online/${code}`)

    const { data: ps } = await supabase.from('room_players').select('*').eq('room_code', code).order('joined_at')
    setPlayers(ps ?? [])
  }, [code, navigate])

  useEffect(() => {
    if (!authLoading && !user) { navigate('/online'); return }
    if (!authLoading && user && !profile) { navigate('/profil'); return }
    if (!authLoading && user && profile) {
      loadRoom().then(() => joinRoom())
    }
  }, [authLoading, user, profile, loadRoom, joinRoom])

  // ── Realtime subscriptions ────────────────────────────
  useEffect(() => {
    if (!code) return

    const channel = supabase.channel(`salon-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_code=eq.${code}` },
        () => loadRoom()
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          const r = payload.new as Room
          setRoom(r)
          if (r.status === 'playing') navigate(`/jeu-online/${code}`)
          if (r.status === 'finished') navigate(`/fin-online/${code}`)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, loadRoom, navigate])

  // ── Host: update room config ──────────────────────────
  async function updateRoom(changes: Partial<Room>) {
    if (!code) return
    await supabase.from('rooms').update(changes).eq('code', code)
    setRoom(prev => prev ? { ...prev, ...changes } : prev)
  }

  // ── Toggle ready ──────────────────────────────────────
  async function toggleReady() {
    if (!user || !code) return
    const newReady = !mePlayer?.is_ready
    await supabase.from('room_players').update({ is_ready: newReady }).eq('room_code', code).eq('player_id', user.id)
  }

  // ── Start game ────────────────────────────────────────
  async function startGame() {
    if (!code || !room) return
    setStarting(true)

    const shuffled = [...players].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from('room_players').update({ order_index: i }).eq('id', shuffled[i].id)
    }

    await supabase.from('rooms').update({ status: 'playing', nb_joueurs: players.length }).eq('code', code)
    setStarting(false)
  }

  // ── Copy code ─────────────────────────────────────────
  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function quitterSalon() {
    if (!user || !code) return
    await supabase.from('room_players').delete().eq('room_code', code).eq('player_id', user.id)
    navigate('/online')
  }

  if (authLoading || !room) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        {roomError ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ ...mono, fontSize: 14, color: encre, opacity: 0.85 }}>{roomError}</p>
            <button onClick={() => navigate('/online')} style={{ ...mono, fontSize: 13, color: accent, background: 'none', border: 'none', cursor: 'pointer', marginTop: 16 }}>
              ← RETOUR
            </button>
          </div>
        ) : (
          <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
        )}
      </PageTransition>
    )
  }

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={quitterSalon}
          style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← QUITTER
        </button>
        <button
          onClick={copyCode}
          style={{ ...mono, fontSize: 13, color: copied ? accent : encre, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {copied ? '✓ COPIÉ' : `CODE : ${code}`}
        </button>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 28, marginBottom: 4 }}>
        — SALON D'ATTENTE —
      </div>
      <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 20, color: encre, marginBottom: 16 }}>
        {code}
      </div>

      {/* ── Joueurs ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
          — JOUEURS ({players.length}) —
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {players.map((p) => (
              <motion.div
                key={p.player_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  background: p.player_id === user?.id ? `${accent}12` : `${encre}07`,
                  borderLeft: `2px solid ${p.is_ready ? accent : `${encre}30`}`,
                }}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.pseudo} style={{ width: 36, height: 36, borderRadius: 3, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 3, background: `${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 16, color: accent }}>
                      {p.pseudo[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 15, color: encre }}>
                    {p.pseudo}
                    {room.host_id === p.player_id && (
                      <span style={{ ...mono, fontSize: 12, color: accent, marginLeft: 8 }}>HÔTE</span>
                    )}
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 12, color: p.is_ready ? accent : `${encre}50` }}>
                  {p.is_ready ? '✓ PRÊT' : 'EN ATTENTE'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length < 2 && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: encre, opacity: 0.75, marginTop: 8 }}>
              En attente d'autres joueurs… Partagez le code <strong>{code}</strong>.
            </p>
          )}
        </div>
      </div>

      {/* ── Config (hôte seulement) ── */}
      {isHost && (
        <div style={{ marginBottom: 24, padding: '16px', background: `${encre}06`, borderLeft: `2px solid ${accent}40` }}>
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — CONFIGURATION —
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ ...mono, fontSize: 12, color: encre, marginBottom: 6 }}>MODE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ecrit', 'dessin'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => updateRoom({ mode: m })}
                  style={{
                    ...mono, fontSize: 13, padding: '6px 14px',
                    background: room.mode === m ? accent : 'transparent',
                    color: room.mode === m ? '#e8d4b8' : encre,
                    border: `1px solid ${room.mode === m ? accent : `${encre}40`}`,
                    cursor: 'pointer',
                  }}
                >
                  {m === 'ecrit' ? 'ÉCRIT' : 'DESSINÉ'}
                </button>
              ))}
            </div>
          </div>

          {room.mode === 'ecrit' && (
            <div>
              <div style={{ ...mono, fontSize: 12, color: encre, marginBottom: 6 }}>STRUCTURE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(STRUCT_LABELS).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => updateRoom({ structure_id: id })}
                    style={{
                      ...mono, fontSize: 13, padding: '7px 14px', textAlign: 'left',
                      background: room.structure_id === id ? `${accent}18` : 'transparent',
                      color: room.structure_id === id ? accent : encre,
                      border: `1px solid ${room.structure_id === id ? accent : `${encre}25`}`,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
        {/* Prêt/Pas prêt */}
        <button
          onClick={toggleReady}
          style={{
            background: mePlayer?.is_ready ? `${encre}15` : accent,
            color: mePlayer?.is_ready ? encre : '#e8d4b8',
            ...mono, fontSize: 13, textTransform: 'uppercase',
            padding: '0.85em 1.8em', border: mePlayer?.is_ready ? `1px solid ${encre}40` : 'none',
            cursor: 'pointer', width: '100%',
          }}
        >
          {mePlayer?.is_ready ? '✓ PRÊT — CLIQUER POUR ANNULER' : 'JE SUIS PRÊT'}
        </button>

        {/* Démarrer (hôte seulement) */}
        {isHost && (
          <button
            onClick={startGame}
            disabled={!allReady || starting}
            style={{
              background: allReady ? encre : 'transparent',
              color: allReady ? '#e8d4b8' : `${encre}50`,
              ...mono, fontSize: 13, textTransform: 'uppercase',
              padding: '0.85em 1.8em',
              border: allReady ? 'none' : `1px solid ${encre}30`,
              cursor: allReady && !starting ? 'pointer' : 'not-allowed',
              width: '100%',
            }}
          >
            {starting ? 'DÉMARRAGE…' : !allReady ? `ATTENTE — ${players.filter(p => !p.is_ready).length} JOUEUR(S) PAS PRÊT(S)` : 'DÉMARRER LA PARTIE →'}
          </button>
        )}
      </div>
    </PageTransition>
  )
}
