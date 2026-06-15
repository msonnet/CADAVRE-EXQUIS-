import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import OnlineDrawingCanvas from '../components/OnlineDrawingCanvas'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { useSound } from '../hooks/useSound'
import { supabase } from '../lib/supabase'
import { getStructure, nombreCasesEffectif } from '../structures'

// ── Types ─────────────────────────────────────────────────────────────────────

type Room = { code: string; host_id: string | null; mode: string; structure_id: string; nb_joueurs: number; status: string; turn_seconds: number | null; started_at: string | null; nb_cases: number | null }
type RoomPlayer = { id: string; player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null; joined_at: string | null }
type Contribution = { case_index: number; texte: string; player_id: string }

const TYPE_LABEL: Record<string, string> = {
  'nom': 'NOM · AVEC OU SANS ARTICLE',
  'verbe': "À L'INFINITIF · OU CONJUGUÉ",
  'adjectif': 'ÉPITHÈTE · OU ATTRIBUT',
  'adverbe': 'DE MANIÈRE · OU DEGRÉ',
  'groupe-nominal': 'DÉT. · NOM · ÉPITHÈTE',
  'groupe-verbal': 'VERBE · COMPLÉMENT',
  'proposition': 'PHRASE COMPLÈTE · AVEC PONCTUATION',
  'libre': 'LIBRE · SANS CONTRAINTE',
  'article-adj': 'ARTICLE + ADJECTIF · 2 MOTS',
}

// ── Claude IA helper ──────────────────────────────────────────────────────────

async function callClaude(consigne: string, type: string): Promise<{ texte: string; voixNom: string | null }> {
  try {
    const r = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consigne, type }) })
    if (!r.ok) return { texte: '', voixNom: null }
    const { texte, voixNom } = await r.json()
    return { texte: texte ?? '', voixNom: voixNom ?? null }
  } catch { return { texte: '', voixNom: null } }
}

// ── JeuOnline ─────────────────────────────────────────────────────────────────

export default function JeuOnline() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const bg = c?.bg ?? '#fdf8f2'
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const { user, profile, loading: authLoading } = useAuth()
  const { jouer } = useSound()
  const prevContribCountRef = useRef(0)
  const contribInitializedRef = useRef(false)

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [myPlayer, setMyPlayer] = useState<RoomPlayer | null>(null)
  const [myContrib, setMyContrib] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const introTriggeredRef = useRef(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [reconnectTick, setReconnectTick] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [tick, setTick] = useState(0)
  const autoSubmittedRef = useRef(false)
  const turnStartedAtRef = useRef<number>(Date.now())
  const inputRef = useRef<string>('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showLastWord, setShowLastWord] = useState(false)
  const [iaVoixNom, setIaVoixNom] = useState<string | null>(null)

  const isSpectator = !!room && !!user && !!players.length && !myPlayer

  // Stable ordering (joined_at tiebreak so all clients agree)
  const orderedPlayers = [...players].sort((a, b) => {
    const ao = a.order_index, bo = b.order_index
    if (ao != null && bo != null && ao !== bo) return ao - bo
    const aj = a.joined_at ?? '', bj = b.joined_at ?? ''
    if (aj !== bj) return aj < bj ? -1 : 1
    return a.player_id < b.player_id ? -1 : 1
  })
  const myIndex = user ? orderedPlayers.findIndex(p => p.player_id === user.id) : -1
  const myEffectiveIndex = myIndex >= 0 ? myIndex : null

  // Turn state
  const structure = room ? getStructure(room.structure_id) : null
  const nbTotal = !room ? 0
    : room.mode === 'dessin' ? (room.nb_cases ?? room.nb_joueurs ?? players.length)
    : (room.nb_cases ?? (structure ? nombreCasesEffectif(structure) : 0))
  const currentCase = contributions.length
  const whoseTurnIdx = orderedPlayers.length > 0 ? currentCase % orderedPlayers.length : 0
  const currentTurnPlayer = orderedPlayers[whoseTurnIdx] ?? null

  // Écrit: round-robin, reset submitted when it's my turn again
  const isMyTurnEcrit = room?.mode === 'ecrit' && !submitted
    && myEffectiveIndex !== null && orderedPlayers.length > 0
    && myEffectiveIndex === whoseTurnIdx && currentCase < nbTotal

  // Dessin: turn-by-turn — only play when it's MY position in the sequence
  const isMyTurnDessin = room?.mode === 'dessin' && !submitted
    && myEffectiveIndex !== null
    && myEffectiveIndex === whoseTurnIdx
    && currentCase < nbTotal

  const caseDef = isMyTurnEcrit && structure && currentCase < structure.cases.length
    ? structure.cases[currentCase] : null

  const prevFragment = contributions.find(c2 => c2.case_index === currentCase - 1)
  const prevLastWord = prevFragment && !prevFragment.texte.startsWith('data:')
    ? prevFragment.texte.trim().split(/\s+/).pop() ?? '' : ''

  // Raccord for drawing: data URL of the previous band (not player index — correct across multiple rounds)
  const raccordRaw = room?.mode === 'dessin' && currentCase > 0
    ? (contributions.find(c2 => c2.case_index === currentCase - 1)?.texte ?? null)
    : null
  const raccordDataUrl = raccordRaw
    ? raccordRaw.startsWith('data:')
      ? raccordRaw
      : (() => { try { return (JSON.parse(raccordRaw) as { imageDataUrl: string }).imageDataUrl } catch { return raccordRaw } })()
    : null

  const loadGame = useCallback(async () => {
    if (!code || !user) return
    const { data: r } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!r) { navigate('/online'); return }
    if (r.status === 'finished') { navigate(`/fin-online/${code}`); return }
    setRoom(r)
    const { data: ps } = await supabase.from('room_players').select('*').eq('room_code', code).order('joined_at')
    const pList = (ps ?? []) as RoomPlayer[]
    setPlayers(pList)
    const me = pList.find(p => p.player_id === user.id)
    setMyPlayer(me ?? null)
    const { data: cs } = await supabase.from('contributions').select('case_index,texte,player_id').eq('room_code', code).order('case_index')
    const cList = (cs ?? []) as Contribution[]
    setContributions(cList)

    const ordered = [...pList].sort((a, b) => {
      const ao = a.order_index, bo = b.order_index
      if (ao != null && bo != null && ao !== bo) return ao - bo
      const aj = a.joined_at ?? '', bj = b.joined_at ?? ''
      if (aj !== bj) return aj < bj ? -1 : 1
      return a.player_id < b.player_id ? -1 : 1
    })
    const myIdx2 = ordered.findIndex(p => p.player_id === user.id)

    if (r.mode === 'dessin') {
      const mine = cList.find(c2 => c2.player_id === user.id)
      if (mine) { setMyContrib(mine.texte); setSubmitted(true) }
    } else {
      if (myIdx2 >= 0 && pList.length > 0) {
        const roundStart = Math.floor(cList.length / pList.length) * pList.length
        const myExpectedCase = roundStart + myIdx2
        const alreadyDone = cList.some(c2 => c2.case_index === myExpectedCase && c2.player_id === user.id)
        if (alreadyDone) {
          setSubmitted(true)
          const mine2 = cList.find(c2 => c2.case_index === myExpectedCase && c2.player_id === user.id)
          if (mine2) setMyContrib(mine2.texte)
        } else {
          const mine3 = cList.filter(c2 => c2.player_id === user.id)
          if (mine3.length > 0) setMyContrib(mine3[mine3.length - 1].texte)
        }
      }
    }
  }, [code, user, navigate])

  useEffect(() => {
    if (!authLoading && !user) { navigate('/online'); return }
    if (!authLoading && user) loadGame()
  }, [authLoading, user, loadGame])

  useEffect(() => {
    if (!code) return
    setConnectionStatus('connecting')
    const channel = supabase.channel(`jeu-online-${code}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `room_code=eq.${code}` },
        (payload) => {
          const newC = payload.new as Contribution
          setContributions(prev => prev.find(x => x.case_index === newC.case_index) ? prev : [...prev, newC].sort((a, b) => a.case_index - b.case_index))
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => { const r = payload.new as Room; setRoom(prev => prev ? { ...prev, ...r } : r); if (r.status === 'finished') navigate(`/fin-online/${code}`) })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_players', filter: `room_code=eq.${code}` },
        () => {
          // A player left — refresh player list and attempt host failover if needed
          loadGame()
        })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') { setConnectionStatus('connected'); loadGame() }
        else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') setConnectionStatus('disconnected')
      })
    return () => { if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current); supabase.removeChannel(channel) }
  }, [code, navigate, loadGame, reconnectTick])

  useEffect(() => {
    if (connectionStatus !== 'disconnected') return
    reconnectTimeoutRef.current = setTimeout(() => { setConnectionStatus('connecting'); setReconnectTick(t => t + 1) }, 1500)
    return () => { if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null } }
  }, [connectionStatus])

  useEffect(() => {
    if (!code || !user) return
    const id = setInterval(async () => {
      const { data: cs } = await supabase.from('contributions').select('case_index,texte,player_id').eq('room_code', code).order('case_index')
      if (cs) setContributions(cs as Contribution[])
      const { data: r } = await supabase.from('rooms').select('*').eq('code', code).single()
      if (r?.status === 'finished') navigate(`/fin-online/${code}`)
      if (r) {
        setRoom(prev => prev ? { ...prev, ...r } : r)
        // Host failover: if the host is gone, try to claim the role
        if (r.host_id) {
          const { data: ps } = await supabase.from('room_players').select('player_id').eq('room_code', code)
          const playerIds = (ps ?? []).map((p: { player_id: string }) => p.player_id)
          if (!playerIds.includes(r.host_id) && playerIds.length > 0) {
            await supabase.rpc('claim_host', { p_room_code: code })
          }
        }
      }
    }, 3000)
    return () => clearInterval(id)
  }, [code, user, navigate])

  useEffect(() => {
    if (!room || !nbTotal) return
    // Guard: nbTotal must be at least nb_joueurs to prevent premature navigation
    // when players haven't all loaded yet or nb_cases is wrong
    if (room.nb_joueurs && nbTotal < room.nb_joueurs) return
    if (contributions.length >= nbTotal) {
      // Any player can try — claim_host handles the race; only the rightful host wins
      if (room.status === 'playing') {
        if (room.host_id === user?.id) {
          supabase.from('rooms').update({ status: 'finished' }).eq('code', code ?? '')
        } else {
          // Attempt host takeover then mark finished (handles host disconnect at game end)
          supabase.rpc('claim_host', { p_room_code: code }).then(({ data: claimed }) => {
            if (claimed) supabase.from('rooms').update({ status: 'finished' }).eq('code', code ?? '')
          })
        }
      }
      navigate(`/fin-online/${code}`)
    }
  }, [contributions.length, room, code, user, nbTotal, navigate])

  useEffect(() => { setShowLastWord(false) }, [currentCase])

  // Show intro overlay when it becomes my turn
  useEffect(() => {
    const isMyTurn = isMyTurnDessin || isMyTurnEcrit
    if (isMyTurn && !introTriggeredRef.current && !submitted) {
      setShowIntro(true)
      introTriggeredRef.current = true
    }
    if (!isMyTurn) introTriggeredRef.current = false
  }, [isMyTurnDessin, isMyTurnEcrit, submitted])

  useEffect(() => {
    if (!submitted || !room || room.mode !== 'ecrit') return
    if (!orderedPlayers.length || myEffectiveIndex === null || !nbTotal) return
    const currCase = contributions.length
    if (currCase >= nbTotal) return
    if (myEffectiveIndex === currCase % orderedPlayers.length) { setSubmitted(false); setInput(''); autoSubmittedRef.current = false }
  }, [contributions.length, submitted, orderedPlayers.length, myEffectiveIndex, room, nbTotal])

  const mergeContribution = useCallback((c2: Contribution) => {
    setContributions(prev => prev.find(x => x.case_index === c2.case_index) ? prev : [...prev, c2].sort((a, b) => a.case_index - b.case_index))
  }, [])

  useEffect(() => {
    const prev = prevContribCountRef.current; const now = contributions.length
    prevContribCountRef.current = now
    if (!contribInitializedRef.current) { contribInitializedRef.current = true; return }
    if (now > prev && !submitted) { jouer('clic'); if ('vibrate' in navigator) navigator.vibrate(180) }
  }, [contributions.length, submitted, jouer])

  useEffect(() => { if (!room?.turn_seconds) return; const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id) }, [room?.turn_seconds])
  useEffect(() => { turnStartedAtRef.current = Date.now() }, [contributions.length])
  useEffect(() => { inputRef.current = input }, [input])

  const secondsLeft = (() => {
    if (!room?.turn_seconds) return null
    const elapsed = Math.floor((Date.now() - turnStartedAtRef.current) / 1000)
    return Math.max(0, room.turn_seconds - elapsed)
  })()
  void tick

  useEffect(() => {
    if (isSpectator || secondsLeft === null || secondsLeft > 0 || submitted || autoSubmittedRef.current) return
    if (!(isMyTurnEcrit || isMyTurnDessin) || !user || !code || myEffectiveIndex === null) return
    autoSubmittedRef.current = true
    const textToSubmit = inputRef.current.trim() || '…';
    (async () => {
      try {
        const caseIdx = room?.mode === 'dessin' ? myEffectiveIndex : contributions.length
        // Idempotence : déjà soumis localement → marquer sans ré-insérer
        if (contributions.some(c => c.case_index === caseIdx && c.player_id === user.id)) {
          setSubmitted(true); return
        }
        const { error } = await supabase.from('contributions').insert({ room_code: code, player_id: user.id, case_index: caseIdx, texte: textToSubmit })
        if (!error) {
          mergeContribution({ case_index: caseIdx, texte: textToSubmit, player_id: user.id }); setMyContrib(textToSubmit); setSubmitted(true); try { jouer('soumettre') } catch {}
        } else if (error.code === '23505') {
          // Race: another player already holds this case_index — treat as done
          setSubmitted(true)
        } else {
          // Real failure (network, RLS, …): reset so the timer effect can retry
          autoSubmittedRef.current = false
          setSubmitError('Soumission automatique échouée — vérifie ta connexion.')
        }
      } catch {
        autoSubmittedRef.current = false
        setSubmitError('Soumission automatique échouée — vérifie ta connexion.')
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitted, isSpectator, user, code, myEffectiveIndex, jouer, isMyTurnEcrit, isMyTurnDessin, room?.mode, contributions.length, mergeContribution])

  async function handleIa() {
    if (!caseDef) return
    setIaLoading(true)
    setIaVoixNom(null)
    const { texte, voixNom } = await callClaude(caseDef.consigne, caseDef.type)
    if (texte) { setInput(texte); setIaVoixNom(voixNom) }
    setIaLoading(false); jouer('ia')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !user || !code || !isMyTurnEcrit || submitted || submitting) return
    setSubmitting(true); setSubmitError(null)
    const { error } = await supabase.from('contributions').insert({ room_code: code, player_id: user.id, case_index: currentCase, texte: input.trim(), voice_name: iaVoixNom })
    if (!error) {
      mergeContribution({ case_index: currentCase, texte: input.trim(), player_id: user.id }); setMyContrib(input.trim()); setSubmitted(true); jouer('soumettre')
    } else if (error.code === '23505') {
      // Unique constraint: this case was already sealed (race condition)
      setSubmitError('Ce fragment a déjà été scellé. Attends ton prochain tour.')
      setSubmitted(true)
    } else {
      setSubmitError('Erreur lors de l\'envoi. Réessaie.')
    }
    setSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent) }
  }

  async function handleDrawingSubmit(dataUrl: string) {
    if (!user || !code || myEffectiveIndex === null) return
    if (contributions.some(c2 => c2.case_index === myEffectiveIndex && c2.player_id === user.id)) return
    const { error } = await supabase.from('contributions').insert({ room_code: code, player_id: user.id, case_index: myEffectiveIndex, texte: dataUrl })
    if (!error) {
      mergeContribution({ case_index: myEffectiveIndex, texte: dataUrl, player_id: user.id }); setMyContrib(dataUrl); setSubmitted(true); jouer('soumettre')
    } else if (error.code === '23505') {
      setSubmitted(true) // Already submitted (race), treat as done
    }
    // For other errors: canvas stays visible, player can retry by re-submitting
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (authLoading || !room || (!myPlayer && !isSpectator)) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        {connectionStatus !== 'connected' && (
          <div style={{ position: 'fixed', top: 'max(8px,env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 3, background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)', color: '#fff', fontFamily: "'Raleway',sans-serif", letterSpacing: '0.16em', fontSize: 13, zIndex: 100 }}>
            {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
          </div>
        )}
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
      </PageTransition>
    )
  }

  // ── Full-screen canvas when it's my turn to draw ──────────────────────────

  if (isMyTurnDessin) {
    if (showIntro) {
      return (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowIntro(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: encre, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28, cursor: 'pointer', textAlign: 'center', padding: '0 28px' }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em' }}>
            — BANDE {(myEffectiveIndex ?? 0) + 1} SUR {nbTotal} —
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 'clamp(2rem,9vw,3rem)', color: bg, lineHeight: 1.25 }}>
            À toi<br />de dessiner
          </div>
          {raccordDataUrl && (
            <div style={{ ...mono, fontSize: 13, color: `${bg}60`, letterSpacing: '0.16em' }}>
              ← RACCORD DU JOUEUR PRÉCÉDENT VISIBLE
            </div>
          )}
          <motion.div style={{ ...mono, fontSize: 13, color: `${bg}50`, letterSpacing: '0.2em', marginTop: 12 }}
            animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.8 }}>
            TOUCHER POUR COMMENCER
          </motion.div>
          <motion.span style={{ fontSize: 20, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
        </motion.div>
      )
    }
    return (
      <OnlineDrawingCanvas
        onSubmit={handleDrawingSubmit}
        raccordDataUrl={raccordDataUrl}
        bandeNum={(myEffectiveIndex ?? 0) + 1}
        totalBandes={nbTotal}
        accent={accent}
        encre={encre}
        bg={bg}
      />
    )
  }

  const submitted_count = contributions.length

  // ── Connection banner (reused in multiple views) ──────────────────────────
  const connBanner = connectionStatus !== 'connected' ? (
    <div style={{ position: 'fixed', top: 'max(8px,env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', padding: '8px 14px', borderRadius: 3, background: connectionStatus === 'disconnected' ? 'rgba(178,44,32,0.95)' : 'rgba(212,168,56,0.95)', color: '#fff', fontFamily: "'Raleway',sans-serif", letterSpacing: '0.16em', fontSize: 13, zIndex: 100 }}>
      {connectionStatus === 'disconnected' ? '⚠ HORS LIGNE — RECONNEXION…' : '⟳ RECONNEXION…'}
    </div>
  ) : null

  // ── Player avatars row ────────────────────────────────────────────────────
  const avatarsRow = (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
      {orderedPlayers.map((p, idx) => {
        const isTheirTurn = idx === whoseTurnIdx && currentCase < nbTotal
        const isMe = p.player_id === user?.id
        const hasDone = room.mode === 'dessin'
          ? contributions.some(c2 => c2.player_id === p.player_id)
          : contributions.some(c2 => c2.player_id === p.player_id)
        return (
          <div key={p.player_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
            <div style={{ width: 40, height: 40, borderRadius: 3, overflow: 'hidden', border: `2px solid ${isTheirTurn ? accent : hasDone ? `${accent}50` : `${encre}20`}`, opacity: hasDone || isTheirTurn ? 1 : 0.5, boxShadow: isTheirTurn ? `0 0 8px ${accent}60` : 'none' }}>
              {p.avatar_url ? <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Bodoni Moda',serif", fontWeight: 900, fontSize: 17, color: accent }}>{p.pseudo[0]?.toUpperCase()}</span></div>}
            </div>
            <span style={{ ...mono, fontSize: 13, color: isTheirTurn ? accent : `${encre}50` }}>
              {isMe ? (isTheirTurn ? 'À TOI' : submitted ? '✓' : '…') : isTheirTurn ? '▸' : hasDone ? '✓' : '…'}
            </span>
          </div>
        )
      })}
    </div>
  )

  // ── Spectator view ────────────────────────────────────────────────────────
  if (isSpectator) {
    return (
      <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
        <Decor variant="aide" />
        {connBanner}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85 }}>{code}</span>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{submitted_count}/{nbTotal} SOUMIS</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 16, marginBottom: 4 }}>👁 SPECTATEUR</div>
        {avatarsRow}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {currentTurnPlayer && currentCase < nbTotal && (
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: encre, opacity: 0.8, textAlign: 'center' }}>
              En attente de <strong>{currentTurnPlayer.pseudo}</strong>…
            </p>
          )}
          <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
        </div>
      </PageTransition>
    )
  }

  // ── Main player view ──────────────────────────────────────────────────────
  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="jeu" />
      {connBanner}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85 }}>{code}</span>
        <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{submitted_count}/{nbTotal}</span>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      {avatarsRow}

      {/* Timer bar */}
      {secondsLeft !== null && room.turn_seconds && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 2, background: `${encre}15`, borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((secondsLeft / room.turn_seconds) * 100)}%`, background: secondsLeft < 30 ? '#b22c20' : accent, transition: 'width 1s linear' }} />
          </div>
          <div style={{ ...mono, fontSize: 13, color: secondsLeft < 30 ? '#b22c20' : accent, marginTop: 4, textAlign: 'right' }}>
            {secondsLeft >= 60
              ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
              : `${secondsLeft}s`}
          </div>
        </div>
      )}

      {/* Main content */}
      <AnimatePresence mode="wait">

        {/* ── Submitted / waiting ── */}
        {submitted ? (
          <motion.div key="waiting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>✓ CONTRIBUTION REÇUE</div>
            {(() => {
              if (!myContrib) return null
              const displayUrl = myContrib.startsWith('data:') ? myContrib : (() => { try { return (JSON.parse(myContrib) as { imageDataUrl: string }).imageDataUrl } catch { return null } })()
              return displayUrl
                ? <img src={displayUrl} alt="ton dessin" style={{ width: '100%', maxWidth: 280, borderRadius: 3, border: `1px solid ${accent}30` }} />
                : <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: encre, padding: '16px 0', borderTop: `0.5px solid ${encre}20`, borderBottom: `0.5px solid ${encre}20` }}>« {myContrib} »</div>
            })()}
            {room.mode === 'ecrit' && currentCase < nbTotal ? (
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: encre, opacity: 0.75, lineHeight: 1.6 }}>
                C'est au tour de <strong>{currentTurnPlayer?.pseudo ?? '…'}</strong>. Ton tour reviendra ensuite.
              </p>
            ) : (
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: encre, opacity: 0.75, lineHeight: 1.6 }}>
                En attente des autres joueurs… La révélation aura lieu lorsque tout le monde aura soumis.
              </p>
            )}
            <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
          </motion.div>

        ) : showIntro && isMyTurnEcrit ? (
          // ── Écrit : intro before my turn ──
          <motion.div key={`intro-${currentCase}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowIntro(false)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, cursor: 'pointer', textAlign: 'center' }}>
            <div style={{ ...mono, fontSize: 13, color: accent, letterSpacing: '0.28em' }}>
              — CASE {currentCase + 1} SUR {nbTotal} —
            </div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 'clamp(1.8rem,8vw,2.6rem)', color: encre, lineHeight: 1.3 }}>
              À toi<br />d'écrire
            </div>
            <motion.div style={{ ...mono, fontSize: 13, color: `${encre}45`, letterSpacing: '0.2em', marginTop: 8 }}
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.8 }}>
              TOUCHER POUR COMMENCER
            </motion.div>
            <motion.span style={{ fontSize: 20, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
          </motion.div>

        ) : isMyTurnEcrit && caseDef ? (
          // ── Écrit : my turn ──
          <motion.div key={`form-${currentCase}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Consigne */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>— CONSIGNE —</div>
              <div className="font-fraunces font-black" style={{ fontSize: 'clamp(1.6rem, 7vw, 2.4rem)', lineHeight: 1.05, letterSpacing: '-0.01em', color: encre, marginBottom: 4 }}>
                {caseDef.consigne.charAt(0).toUpperCase() + caseDef.consigne.slice(1)}.
              </div>
              {TYPE_LABEL[caseDef.type] && (
                <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, marginBottom: 12 }}>{TYPE_LABEL[caseDef.type]}</div>
              )}
            </div>

            {/* Last word hint */}
            {currentCase > 0 && prevLastWord && (
              <div style={{ marginBottom: 18 }}>
                {showLastWord ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.55 }}>DERNIER MOT&nbsp;:</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: accent, fontStyle: 'italic' }}>…{prevLastWord}</span>
                    <button type="button" onClick={() => setShowLastWord(false)} style={{ ...mono, fontSize: 13, color: encre, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>masquer</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowLastWord(true)} style={{ ...mono, fontSize: 13, color: accent, background: 'transparent', border: `0.5px solid ${accent}50`, padding: '7px 14px', borderRadius: 3, cursor: 'pointer', letterSpacing: '0.16em' }}>
                    👁 VOIR LE DERNIER MOT
                  </button>
                )}
              </div>
            )}

            {/* Input */}
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>— ÉCRIS ICI · TOI SEUL LE VERRAS —</div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <textarea
                value={input}
                onChange={e => { setInput(e.target.value); setSubmitError(null); setIaVoixNom(null) }}
                onKeyDown={handleKeyDown}
                placeholder="…"
                aria-label={caseDef.consigne}
                autoFocus
                rows={3}
                style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: encre, background: 'rgba(255,253,247,0.5)', border: 'none', borderLeft: `2px solid ${encre}`, padding: '12px 16px', outline: 'none', caretColor: accent, width: '100%', resize: 'none' }}
              />
              {submitError && <div style={{ ...mono, fontSize: 13, color: '#b22c20' }}>{submitError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleIa} disabled={iaLoading}
                  style={{ flex: 1, ...mono, fontSize: 13, padding: '0.85em', background: 'transparent', color: encre, border: `0.5px solid ${encre}30`, borderRadius: 3, cursor: iaLoading ? 'wait' : 'pointer', opacity: iaLoading ? 0.5 : 0.8 }}>
                  {iaLoading ? '…' : '✦ IA'}
                </button>
                <button type="submit" disabled={!input.trim() || submitting}
                  style={{ flex: 3, background: input.trim() ? accent : 'transparent', color: input.trim() ? btnText : `${encre}40`, ...mono, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.85em 1.5em', borderRadius: 3, border: input.trim() ? 'none' : `1px solid ${encre}30`, cursor: input.trim() && !submitting ? 'pointer' : 'not-allowed' }}>
                  {submitting ? 'ENVOI…' : 'SCELLER CETTE VOIX →'}
                </button>
              </div>
            </form>
          </motion.div>

        ) : (
          // ── Not my turn / waiting for others ──
          <motion.div key="notmyturn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
            {currentTurnPlayer && currentCase < nbTotal ? (
              <>
                <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.55, letterSpacing: '0.22em' }}>— EN ATTENTE —</div>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, color: encre, lineHeight: 1.6 }}>
                  C'est le tour de <strong>{currentTurnPlayer.pseudo}</strong>…
                </p>
                <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: encre, opacity: 0.55 }}>
                  {room.mode === 'dessin' ? `Bande ${currentCase + 1} sur ${nbTotal}` : `Case ${currentCase + 1} sur ${nbTotal}`}
                </p>
              </>
            ) : (
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: encre, opacity: 0.75 }}>En attente de la partie…</p>
            )}
            <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
