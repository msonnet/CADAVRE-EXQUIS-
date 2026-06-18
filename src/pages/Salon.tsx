import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase } from '../lib/supabase'
import { makePapierTexture, usePapier, DECHIRE_1, DECHIRE_2, Section } from '../components/Papier'
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
  'phrase-etoffee': 'Phrase étoffée (5 fragments)',
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
  const papier = usePapier()
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  // Onglet de choix : l'option active devient une petite étiquette d'accent
  // collée (aplat plein + ombre + léger pivot), les autres restent en mode
  // éditorial discret — même grammaire de collage que la config solo.
  const ongletStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 4px', minHeight: 44, borderRadius: 2,
    border: `0.5px solid ${active ? 'transparent' : `${encre}20`}`,
    background: active ? accent : 'transparent',
    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.22)' : 'none',
    transform: active ? 'rotate(-0.8deg)' : 'none',
    ...mono, fontSize: 13, fontWeight: active ? 800 : 400,
    color: active ? btnText : `${encre}80`,
    cursor: 'pointer', transition: 'all 0.15s',
  })

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
    const playerList = (ps ?? []) as RoomPlayer[]
    setPlayers(playerList)

    // Host failover: if the host is no longer among the players, try to claim the role
    if (r.host_id && !playerList.some(p => p.player_id === r.host_id) && playerList.length > 0) {
      const { data: claimed } = await supabase.rpc('claim_host', { p_room_code: code })
      if (claimed) {
        const { data: updatedRoom } = await supabase.from('rooms').select('*').eq('code', code).single()
        if (updatedRoom) setRoom(updatedRoom)
      }
    }
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
    // Count remaining players after leaving
    const { count } = await supabase.from('room_players').select('*', { count: 'exact', head: true }).eq('room_code', code)
    if ((count ?? 0) === 0) {
      // Last player out: close the room so it disappears from the public listing
      await supabase.from('rooms').update({ status: 'finished' }).eq('code', code)
    } else if (room?.host_id === user.id) {
      // Host left but others remain: transfer host to next player
      const { data: remaining } = await supabase.from('room_players').select('player_id').eq('room_code', code).order('joined_at').limit(1)
      if (remaining?.[0]) {
        await supabase.from('rooms').update({ host_id: remaining[0].player_id }).eq('code', code)
      }
    }
    navigate('/online')
  }

  if (authLoading || !room) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        {connectionStatus !== 'connected' && (
          <div style={{
            position: 'fixed', top: 'max(8px, env(safe-area-inset-top))',
            left: '50%', transform: 'translateX(-50%)',
            padding: '8px 14px', borderRadius: 3,
            background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)',
            color: '#fff', fontFamily: "'Raleway', sans-serif", letterSpacing: '0.16em',
            fontSize: 13, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}>
            {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
          </div>
        )}
        {roomError ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85 }}>{roomError}</p>
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
          padding: '8px 14px', borderRadius: 2,
          background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)',
          color: '#fff', fontFamily: "'Raleway', sans-serif", letterSpacing: '0.16em',
          fontSize: 13, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
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

      <Section accent={accent} color={btnText} style={{ marginTop: 28, marginBottom: 10 }}>SALON D'ATTENTE</Section>
      <div
        style={{
          padding: '14px 18px',
          marginBottom: 16,
          ...makePapierTexture(papier.bg),
          clipPath: DECHIRE_1,
          boxShadow: '0 3px 11px rgba(0,0,0,0.28)',
          transform: 'rotate(-0.5deg)',
        }}
      >
        <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 'clamp(2.6rem, 12vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: papier.encre }}>
          {code}
        </div>
      </div>

      {/* ── Joueurs ── */}
      <div style={{ marginBottom: 24 }}>
        <Section accent={accent} color={btnText} style={{ marginBottom: 10 }}>JOUEURS ({players.length})</Section>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {players.map((p, i) => (
              <motion.div
                key={p.player_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  ...makePapierTexture(papier.bg),
                  clipPath: i % 2 === 0 ? DECHIRE_1 : DECHIRE_2,
                  boxShadow: '0 3px 11px rgba(0,0,0,0.28)',
                  transform: i % 2 === 0 ? 'rotate(-0.5deg)' : 'rotate(0.5deg)',
                }}
              >
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.pseudo} style={{ width: 36, height: 36, borderRadius: 2, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 2, background: `${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 17, color: accent }}>
                      {p.pseudo[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em', color: papier.encre }}>
                    {p.pseudo}
                    {room.host_id === p.player_id && (
                      <span style={{ ...mono, fontSize: 13, color: accent, marginLeft: 8 }}>HÔTE</span>
                    )}
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 13, color: p.is_ready ? accent : `${papier.encre}80` }}>
                  {p.is_ready ? '✓ PRÊT' : 'EN ATTENTE'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length < 2 && (
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.75, marginTop: 8 }}>
              En attente d'autres joueurs… Partage le code <strong>{code}</strong>.
            </p>
          )}
        </div>

        {/* ── Bandeau MODE SPECTATEUR (visiteur non-joueur) ── */}
        {!mePlayer && (
          <div style={{
            ...mono, fontSize: 13, color: encre, opacity: 0.75,
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
              ...mono, fontSize: 13, color: encre, opacity: 0.7,
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
          <Section accent={accent} color={btnText} style={{ marginBottom: 10 }}>SPECTATEURS ({spectators.length})</Section>
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
                  <img src={s.avatar_url} alt={s.pseudo} style={{ width: 28, height: 28, borderRadius: 2, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 2, background: `${encre}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 17, color: encre }}>
                      {s.pseudo[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1, fontFamily: "'Bodoni Moda', serif", fontSize: 17, color: encre }}>
                  {s.pseudo}
                </div>
                <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.55 }}>👁 SPECT</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Config (hôte seulement) ── */}
      {isHost && (
        <div style={{ marginBottom: 24 }}>
          <Section accent={accent} color={btnText} style={{ marginBottom: 14 }}>CONFIGURATION</Section>

          <div style={{ marginBottom: 16 }}>
            <Section accent={accent} color={btnText} style={{ marginBottom: 8 }}>MODE</Section>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ecrit', 'dessin'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => updateRoom({ mode: m })}
                  style={ongletStyle(room.mode === m)}
                >
                  {m === 'ecrit' ? 'ÉCRIT' : 'DESSINÉ'}
                </button>
              ))}
            </div>
          </div>

          {room.mode === 'ecrit' && (
            <div style={{ marginBottom: 16 }}>
              <Section accent={accent} color={btnText} style={{ marginBottom: 8 }}>STRUCTURE</Section>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(STRUCT_LABELS).map(([id, label]) => {
                  const active = room.structure_id === id
                  return (
                    <button
                      key={id}
                      onClick={() => updateRoom({ structure_id: id })}
                      style={{ ...ongletStyle(active), textAlign: 'left', flex: 'unset' }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {room.mode === 'dessin' && (
            <div style={{ marginBottom: 16 }}>
              <Section accent={accent} color={btnText} style={{ marginBottom: 8 }}>BANDES</Section>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.8, lineHeight: 1.5, marginBottom: 10 }}>
                Chaque joueur dessine une bande du corps à l'aveugle. Fixe le nombre de joueurs attendus.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    onClick={() => updateRoom({ nb_joueurs: n })}
                    style={ongletStyle(room.nb_joueurs === n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Durée par tour ── */}
          <div style={{ marginBottom: 16 }}>
            <Section accent={accent} color={btnText} style={{ marginBottom: 8 }}>DURÉE PAR TOUR</Section>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TURN_OPTIONS.map(opt => {
                const selected = (room.turn_seconds ?? null) === opt.value
                return (
                  <button
                    key={opt.label}
                    onClick={() => updateRoom({ turn_seconds: opt.value })}
                    style={ongletStyle(selected)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Visibilité du salon ── */}
          <div>
            <Section accent={accent} color={btnText} style={{ marginBottom: 8 }}>VISIBILITÉ</Section>
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
                    style={ongletStyle(selected)}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.65, marginTop: 6 }}>
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
            ...mono, fontSize: 13, color: encre, opacity: 0.75,
            padding: '10px 12px', background: `${encre}08`,
            borderLeft: `2px solid ${encre}40`, textAlign: 'center',
          }}>
            👁 TU SUIS LA PARTIE EN SPECTATEUR
          </div>
        )}

        {/* Prêt/Pas prêt — masqué pour les spectateurs */}
        {!spectator && mePlayer && (
          <button
            onClick={toggleReady}
            style={{
              background: mePlayer?.is_ready ? `${encre}15` : accent,
              color: mePlayer?.is_ready ? encre : btnText,
              ...mono, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '1.15em 1em', border: mePlayer?.is_ready ? `1px solid ${encre}40` : 'none',
              cursor: 'pointer', width: '100%',
              borderRadius: 2,
              transform: mePlayer?.is_ready ? 'none' : 'rotate(-0.6deg)',
              boxShadow: mePlayer?.is_ready ? 'none' : '0 3px 10px rgba(0,0,0,0.28)',
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
              background: allReady ? accent : 'transparent',
              color: allReady ? btnText : `${encre}50`,
              ...mono, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '1.15em 1em',
              border: allReady ? 'none' : `1px solid ${encre}30`,
              cursor: allReady && !starting ? 'pointer' : 'not-allowed',
              width: '100%',
              borderRadius: 2,
              transform: allReady ? 'rotate(-0.6deg)' : 'none',
              boxShadow: allReady ? '0 3px 10px rgba(0,0,0,0.28)' : 'none',
            }}
          >
            {starting ? 'DÉMARRAGE…' : !allReady ? `ATTENTE — ${players.filter(p => !p.is_ready).length} JOUEUR(S) PAS PRÊT(S)` : 'DÉMARRER LA PARTIE →'}
          </button>
        )}
      </div>
    </PageTransition>
  )
}
