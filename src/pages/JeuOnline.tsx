import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getStructure, nombreCasesEffectif } from '../structures'

type Room = { code: string; host_id: string | null; mode: string; structure_id: string; nb_joueurs: number; status: string }
type RoomPlayer = { id: string; player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null }
type Contribution = { case_index: number; texte: string; player_id: string }

const TYPE_LABEL: Record<string, string> = {
  'nom': 'NOM SEUL · SANS ARTICLE',
  'verbe': 'UN SEUL MOT · CONJUGUÉ',
  'adjectif': 'UN SEUL MOT',
  'adverbe': '1 À 2 MOTS',
  'groupe-nominal': 'GROUPE NOMINAL',
  'groupe-verbal': 'GROUPE VERBAL',
  'proposition': 'PROPOSITION',
  'libre': 'VERS LIBRE',
  'article-adj': 'ARTICLE + ADJECTIF · 2 MOTS',
}

async function callClaude(consigne: string, type: string): Promise<string> {
  try {
    const r = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consigne, type }),
    })
    if (!r.ok) return ''
    const { texte } = await r.json()
    return texte ?? ''
  } catch { return '' }
}

export default function JeuOnline() {
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
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [myPlayer, setMyPlayer] = useState<RoomPlayer | null>(null)
  const [myContrib, setMyContrib] = useState<string | null>(null)

  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const myIndex = myPlayer?.order_index ?? null

  const loadGame = useCallback(async () => {
    if (!code || !user) return
    const { data: r } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!r) { navigate('/online'); return }
    if (r.status === 'finished') { navigate(`/fin-online/${code}`); return }
    setRoom(r)

    const { data: ps } = await supabase.from('room_players').select('*').eq('room_code', code).order('order_index')
    const pList = (ps ?? []) as RoomPlayer[]
    setPlayers(pList)
    const me = pList.find(p => p.player_id === user.id)
    setMyPlayer(me ?? null)

    const { data: cs } = await supabase.from('contributions').select('case_index,texte,player_id').eq('room_code', code)
    const cList = (cs ?? []) as Contribution[]
    setContributions(cList)
    const myC = cList.find(c => c.player_id === user.id)
    if (myC) { setMyContrib(myC.texte); setSubmitted(true) }
  }, [code, user, navigate])

  useEffect(() => {
    if (!authLoading && !user) { navigate('/online'); return }
    if (!authLoading && user) loadGame()
  }, [authLoading, user, loadGame])

  // Realtime: watch contributions for full reveal
  useEffect(() => {
    if (!code) return
    const channel = supabase.channel(`jeu-online-${code}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contributions', filter: `room_code=eq.${code}` },
        (payload) => {
          const newC = payload.new as Contribution
          setContributions(prev => {
            const existing = prev.find(c => c.case_index === newC.case_index)
            if (existing) return prev
            return [...prev, newC]
          })
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => {
          const r = payload.new as Room
          if (r.status === 'finished') navigate(`/fin-online/${code}`)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [code, navigate])

  // Auto-finish when all contributions received
  useEffect(() => {
    if (!room || !players.length) return
    const structure = getStructure(room.structure_id)
    const total = room.mode === 'dessin' ? players.length : Math.min(players.length, nombreCasesEffectif(structure))
    if (contributions.length >= total && room.status === 'playing' && room.host_id === user?.id) {
      supabase.from('rooms').update({ status: 'finished' }).eq('code', code ?? '')
    }
  }, [contributions, players, room, code, user])

  async function handleIa() {
    if (!room || myIndex === null) return
    const structure = getStructure(room.structure_id)
    const caseDef = structure.cases[myIndex]
    if (!caseDef) return
    setIaLoading(true)
    const texte = await callClaude(caseDef.consigne, caseDef.type)
    if (texte) setInput(texte)
    setIaLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !user || !code || myIndex === null) return
    setSubmitting(true)
    const { error } = await supabase.from('contributions').insert({
      room_code: code,
      player_id: user.id,
      case_index: myIndex,
      texte: input.trim(),
    })
    if (!error) {
      setMyContrib(input.trim())
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  if (authLoading || !room || !myPlayer) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
      </PageTransition>
    )
  }

  const structure = getStructure(room.structure_id)
  const nbTotal = Math.min(players.length, nombreCasesEffectif(structure))
  const caseDef = myIndex !== null ? structure.cases[myIndex] : null
  const submitted_count = contributions.length

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85 }}>
          {code}
        </span>
        <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>
          {submitted_count}/{nbTotal} SOUMIS
        </span>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      {/* Joueurs */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {players.map((p) => {
          const hasDone = contributions.some(c => c.player_id === p.player_id)
          return (
            <div key={p.player_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 3, overflow: 'hidden',
                border: `2px solid ${hasDone ? accent : `${encre}20`}`,
                opacity: hasDone ? 1 : 0.5,
              }}>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 16, color: accent }}>
                      {p.pseudo[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <span style={{ ...mono, fontSize: 11, color: hasDone ? accent : `${encre}50` }}>
                {hasDone ? '✓' : '…'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Contenu principal */}
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}
          >
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
              ✓ CONTRIBUTION REÇUE
            </div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20,
              color: encre, padding: '16px 0', borderTop: `0.5px solid ${encre}20`, borderBottom: `0.5px solid ${encre}20`,
            }}>
              « {myContrib} »
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: encre, opacity: 0.75, lineHeight: 1.6 }}>
              En attente des autres joueurs…{'\n'}La révélation aura lieu lorsque tout le monde aura soumis sa contribution.
            </p>
            <motion.span
              style={{ fontSize: 22, color: accent }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >✦</motion.span>
          </motion.div>
        ) : caseDef ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>
              VOTRE CASE · {(myIndex ?? 0) + 1}/{nbTotal}
            </div>
            <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.75, marginBottom: 4 }}>
              {TYPE_LABEL[caseDef.type] ?? caseDef.type.toUpperCase()}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 17, color: encre, marginBottom: 20, lineHeight: 1.5 }}>
              Écrivez <strong>{caseDef.consigne}</strong>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={caseDef.consigne}
                autoFocus
                style={{
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 22,
                  color: encre, background: 'rgba(255,253,247,0.5)',
                  border: 'none', borderLeft: `2px solid ${encre}`, padding: '12px 16px',
                  outline: 'none', caretColor: accent, width: '100%',
                }}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleIa}
                  disabled={iaLoading}
                  style={{
                    flex: 1, ...mono, fontSize: 13, padding: '0.7em',
                    background: 'transparent', color: encre,
                    border: `0.5px solid ${encre}30`, cursor: iaLoading ? 'wait' : 'pointer',
                    opacity: iaLoading ? 0.5 : 0.8,
                  }}
                >
                  {iaLoading ? '…' : '✦ IA'}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || submitting}
                  style={{
                    flex: 3, background: input.trim() ? accent : 'transparent',
                    color: input.trim() ? '#e8d4b8' : `${encre}40`,
                    ...mono, fontSize: 13, textTransform: 'uppercase',
                    padding: '0.7em 1.5em',
                    border: input.trim() ? 'none' : `1px solid ${encre}30`,
                    cursor: input.trim() && !submitting ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'ENVOI…' : 'SOUMETTRE →'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="nocase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 16, color: encre, opacity: 0.75, textAlign: 'center' }}>
              En attente de la partie…
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
