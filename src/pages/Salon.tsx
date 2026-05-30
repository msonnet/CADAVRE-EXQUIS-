import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase } from '../lib/supabase'
import { STRUCTURES, getStructure, nombreCasesEffectif } from '../structures'

type Room = { code: string; host_id: string | null; mode: 'ecrit' | 'dessin'; structure_id: string; nb_joueurs: number; status: string; turn_seconds: number | null; started_at: string | null; is_public: boolean; nb_cases: number | null }
type RoomPlayer = { id: string; player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null; is_ready: boolean }
type SpectatorPresence = { player_id: string; pseudo: string; avatar_url: string | null; is_spectator: true }

const TURN_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'SANS LIMITE' },
  { value: 120, label: '2 MIN' },
  { value: 300, label: '5 MIN' },
  { value: 600, label: '10 MIN' },
]

const STRUCT_LABELS: Record<string, string> = {
  'phrase-simple': 'Phrase simple (3 fragments)',
  'phrase-etoffee': 'Phrase étoffée (7 fragments)',
  'vers-libre': 'Vers libre (variable)',
}

export default function Salon() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading: authLoading } = useAuth()
  const { jouer } = useSound()
  const demarragePlayedRef = useRef(false)

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [roomError, setRoomError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [spectator, setSpectator] = useState(false)
  const [spectators, setSpectators] = useState<SpectatorPresence[]>([])

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [reconnectTick, setReconnectTick] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const isHost = room?.host_id === user?.id
  const mePlayer = players.find(p => p.player_id === user?.id)
  const allReady = players.length >= 2 && players.every(p => p.is_ready)

  // ── Join room on mount ────────────────────────────────
  const joinRoom = useCallback(async () => {
    if (!user || !profile || !code) return
    if (spectator) return // les spectateurs ne s'insèrent pas dans room_players
    try {
      const { error } = await supabase.from('room_players').upsert({
        room_code: code,
        player_id: user.id,
        pseudo: profile.pseudo,
        avatar_url: profile.avatar_url ?? null,
        is_ready: false,
      }, { onConflict: 'room_code,player_id' })
      if (error) console.error('Erreur join:', error)
    } catch (e) {
      console.error('Erreur join (exception):', e)
    }
  }, [user, profile, code, spectator])

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
    if (!code || !user) return
    setConnectionStatus('connecting')

    const channel = supabase.channel(`salon-${code}`, {
      config: { presence: { key: user.id } },
    })
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
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<SpectatorPresence>()
        const all: SpectatorPresence[] = []
        for (const key of Object.keys(state)) {
          for (const meta of state[key]) {
            if (meta && (meta as SpectatorPresence).is_spectator) {
              all.push(meta as SpectatorPresence)
            }
          }
        }
        setSpectators(all)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected')
          loadRoom()
          if (spectator && profile) {
            try {
              await channel.track({
                player_id: user.id,
                pseudo: profile.pseudo,
                avatar_url: profile.avatar_url ?? null,
                is_spectator: true,
              } satisfies SpectatorPresence)
            } catch (e) {
              console.error('Erreur track spectateur:', e)
            }
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          setConnectionStatus('disconnected')
        }
      })

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [code, loadRoom, navigate, reconnectTick, user, profile, spectator])

  // Jouer le son de démarrage la première fois que le statut passe à 'playing'
  useEffect(() => {
    if (room?.status === 'playing' && !demarragePlayedRef.current) {
      demarragePlayedRef.current = true
      jouer('demarrage')
    }
  }, [room?.status, jouer])

  // Auto-reconnect when disconnected
  useEffect(() => {
    if (connectionStatus !== 'disconnected') return
    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionStatus('connecting')
      setReconnectTick(t => t + 1)
    }, 1500)
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connectionStatus])

  // ── Host: update room config ──────────────────────────
  async function updateRoom(changes: Partial<Room>) {
    if (!code) return
    await supabase.from('rooms').update(changes).eq('code', code)
    setRoom(prev => prev ? { ...prev, ...changes } : prev)
  }

  // ── Toggle ready ──────────────────────────────────────
  async function toggleReady() {
    if (!user || !code) return
    jouer('clic')
    const newReady = !mePlayer?.is_ready
    await supabase.from('room_players').update({ is_ready: newReady }).eq('room_code', code).eq('player_id', user.id)
  }

  // ── Start game ────────────────────────────────────────
  async function startGame() {
    if (!code || !room) return
    jouer('clic')
    setStarting(true)

    try {
      const shuffled = [...players].sort(() => Math.random() - 0.5)
      for (let i = 0; i < shuffled.length; i++) {
        await supabase.from('room_players').update({ order_index: i }).eq('id', shuffled[i].id)
      }

      // Fix the total number of cases ONCE at game start so every client agrees.
      const nbCases = room.mode === 'dessin'
        ? players.length
        : nombreCasesEffectif(getStructure(room.structure_id))

      await supabase.from('rooms').update({
        status: 'playing',
        nb_joueurs: players.length,
        nb_cases: nbCases,
        started_at: new Date().toISOString(),
      }).eq('code', code)
    } catch (e) {
      console.error('Erreur startGame:', e)
    } finally {
      setStarting(false)
    }
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
        {connectionStatus !== 'connected' && (
          <div style={{
            position: 'fixed', top: 'max(8px, env(safe-area-inset-top))',
            left: '50%', transform: 'translateX(-50%)',
            padding: '8px 14px', borderRadius: 4,
            background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)',
            color: '#fff', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.16em',
            fontSize: 11, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
          </div>
        )}
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

      {connectionStatus !== 'connected' && (
        <div style={{
          position: 'fixed', top: 'max(8px, env(safe-area-inset-top))',
          left: '50%', transform: 'translateX(-50%)',
          padding: '8px 14px', borderRadius: 4,
          background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)',
          color: '#fff', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.16em',
          fontSize: 11, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>
          {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
        </div>
      )}

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
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.75, marginTop: 8 }}>
              En attente d'autres joueurs… Partagez le code <strong>{code}</strong>.
            </p>
          )}
        </div>

        {/* ── Bandeau MODE SPECTATEUR (visiteur non-joueur) ── */}
        {!mePlayer && (
          <div style={{
            ...mono, fontSize: 12, color: encre, opacity: 0.75,
            padding: '8px 12px', background: `${encre}08`,
            borderLeft: `2px solid ${encre}40`, marginTop: 12,
          }}>
            👁 MODE SPECTATEUR
          </div>
        )}

        {/* ── Bouton spectateur (uniquement si pas encore joueur) ── */}
        {!mePlayer && !spectator && (
          <button
            onClick={() => setSpectator(true)}
            style={{
              ...mono, fontSize: 12, color: encre, opacity: 0.7,
              background: 'none', border: 'none', cursor: 'pointer',
              marginTop: 10, padding: 0, textAlign: 'left',
            }}
          >
            👁 REJOINDRE COMME SPECTATEUR
          </button>
        )}
      </div>

      {/* ── Spectateurs ── */}
      {spectators.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — SPECTATEURS ({spectators.length}) —
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {spectators.map(s => (
              <div
                key={s.player_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 10px',
                  background: `${encre}05`,
                  borderLeft: `2px solid ${encre}30`,
                  opacity: 0.85,
                }}
              >
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.pseudo} style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 3, background: `${encre}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 13, color: encre }}>
                      {s.pseudo[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1, fontFamily: "'Bodoni Moda', serif", fontSize: 14, color: encre }}>
                  {s.pseudo}
                </div>
                <span style={{ ...mono, fontSize: 11, color: encre, opacity: 0.55 }}>👁 SPECT</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    color: room.mode === m ? btnText : encre,
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

          {room.mode === 'dessin' && (
            <div>
              <div style={{ ...mono, fontSize: 12, color: encre, marginBottom: 6 }}>BANDES</div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: encre, opacity: 0.8, lineHeight: 1.5, marginBottom: 10 }}>
                Chaque joueur dessine une bande du corps à l'aveugle. Fixez le nombre de joueurs attendus.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    onClick={() => updateRoom({ nb_joueurs: n })}
                    style={{
                      ...mono, fontSize: 13, padding: '6px 14px',
                      background: room.nb_joueurs === n ? `${accent}18` : 'transparent',
                      color: room.nb_joueurs === n ? accent : encre,
                      border: `1px solid ${room.nb_joueurs === n ? accent : `${encre}25`}`,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Durée par tour ── */}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...mono, fontSize: 12, color: encre, marginBottom: 6 }}>DURÉE PAR TOUR</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TURN_OPTIONS.map(opt => {
                const selected = (room.turn_seconds ?? null) === opt.value
                return (
                  <button
                    key={opt.label}
                    onClick={() => updateRoom({ turn_seconds: opt.value })}
                    style={{
                      ...mono, fontSize: 13, padding: '6px 14px',
                      background: selected ? `${accent}18` : 'transparent',
                      color: selected ? accent : encre,
                      border: `1px solid ${selected ? accent : `${encre}25`}`,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Visibilité du salon ── */}
          <div style={{ marginTop: 12 }}>
            <div style={{ ...mono, fontSize: 12, color: encre, marginBottom: 6 }}>VISIBILITÉ</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { value: true, label: 'PUBLIC' },
                { value: false, label: 'PRIVÉ' },
              ] as const).map(opt => {
                const selected = (room.is_public ?? true) === opt.value
                return (
                  <button
                    key={opt.label}
                    onClick={() => updateRoom({ is_public: opt.value })}
                    style={{
                      flex: 1, ...mono, fontSize: 13, padding: '7px 10px',
                      background: selected ? `${accent}18` : 'transparent',
                      color: selected ? accent : encre,
                      border: `1px solid ${selected ? accent : `${encre}25`}`,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: encre, opacity: 0.65, marginTop: 6 }}>
              {(room.is_public ?? true)
                ? 'Visible dans la liste des parties ouvertes.'
                : 'Accessible uniquement par code — salon privé.'}
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', paddingTop: 16 }}>
        {/* Bandeau spectateur */}
        {spectator && !mePlayer && (
          <div style={{
            ...mono, fontSize: 12, color: encre, opacity: 0.75,
            padding: '10px 12px', background: `${encre}08`,
            borderLeft: `2px solid ${encre}40`, textAlign: 'center',
          }}>
            👁 VOUS SUIVEZ LA PARTIE EN SPECTATEUR
          </div>
        )}

        {/* Prêt/Pas prêt — masqué pour les spectateurs */}
        {!spectator && mePlayer && (
          <button
            onClick={toggleReady}
            style={{
              background: mePlayer?.is_ready ? `${encre}15` : accent,
              color: mePlayer?.is_ready ? encre : btnText,
              ...mono, fontSize: 13, textTransform: 'uppercase',
              padding: '0.85em 1.8em', border: mePlayer?.is_ready ? `1px solid ${encre}40` : 'none',
              cursor: 'pointer', width: '100%',
            }}
          >
            {mePlayer?.is_ready ? '✓ PRÊT — CLIQUER POUR ANNULER' : 'JE SUIS PRÊT'}
          </button>
        )}

        {/* Démarrer (hôte seulement) */}
        {isHost && (
          <button
            onClick={startGame}
            disabled={!allReady || starting}
            style={{
              background: allReady ? encre : 'transparent',
              color: allReady ? 'var(--reve-bg)' : `${encre}50`,
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
