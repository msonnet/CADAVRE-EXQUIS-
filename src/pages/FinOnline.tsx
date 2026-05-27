import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getStructure, reconstruirePoeme } from '../structures'
import { corrigerAccords } from '../api/corriger'
import { genererIllustration } from '../api/illustration'

type Room = { code: string; host_id: string | null; mode: string; structure_id: string; nb_joueurs: number; status: string }
type RoomPlayer = { player_id: string; pseudo: string; avatar_url: string | null; order_index: number | null }
type Contribution = { case_index: number; texte: string; player_id: string }

const STYLES = [
  { id: 'aquarelle',           label: 'Aquarelle' },
  { id: 'fusain',              label: 'Fusain' },
  { id: 'huile',               label: "Huile" },
  { id: 'encre',               label: 'Encre' },
  { id: 'collage_surrealiste', label: 'Collage' },
  { id: 'hyperrealisme',       label: 'Hyperréalisme' },
  { id: 'libre',               label: 'Libre' },
]

export default function FinOnline() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const { user, loading: authLoading } = useAuth()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [texteCorrige, setTexteCorrige] = useState<string | null>(null)
  const [texteAssemble, setTexteAssemble] = useState<string>('')
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null)
  const [styleChoisi, setStyleChoisi] = useState<string | null>(null)
  const [generatingIllus, setGeneratingIllus] = useState(false)
  const [erreurIllus, setErreurIllus] = useState<string | null>(null)
  const [showCoutures, setShowCoutures] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const load = useCallback(async () => {
    if (!code || !user) return
    const { data: r } = await supabase.from('rooms').select('*').eq('code', code).single()
    if (!r) { navigate('/online'); return }
    setRoom(r)

    const { data: ps } = await supabase.from('room_players').select('*').eq('room_code', code).order('order_index')
    setPlayers((ps ?? []) as RoomPlayer[])

    const { data: cs } = await supabase.from('contributions').select('*').eq('room_code', code).order('case_index')
    const cList = (cs ?? []) as Contribution[]
    setContributions(cList)

    if (cList.length > 0 && r.mode === 'ecrit') {
      const structure = getStructure(r.structure_id)
      const caseMap = new Map(cList.map(c => [c.case_index, c.texte]))
      const fakeCases = structure.cases.map((def, i) => ({
        numero: i + 1,
        fonction: def.fonction,
        consigne: def.consigne,
        auteur: 'humain' as const,
        texte: caseMap.get(i) ?? '',
        ts: Date.now(),
      }))
      const brut = reconstruirePoeme(fakeCases, structure)
      setTexteAssemble(brut)

      let cancelled = false
      corrigerAccords(brut, r.structure_id).then(t => { if (!cancelled) setTexteCorrige(t) })
      return () => { cancelled = true }
    }
  }, [code, user, navigate])

  useEffect(() => {
    if (!authLoading && !user) { navigate('/online'); return }
    if (!authLoading && user) load()
  }, [authLoading, user, load])

  async function genererIllus(style: string) {
    if (!texteAssemble) return
    setStyleChoisi(style)
    setGeneratingIllus(true)
    setErreurIllus(null)
    const { url } = await genererIllustration(texteAssemble, style)
    if (url) {
      setIllustrationUrl(url)
    } else {
      setErreurIllus('Génération indisponible — réessayez dans un instant')
      setStyleChoisi(null)
    }
    setGeneratingIllus(false)
  }

  if (authLoading || !room) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <span style={{ ...mono, fontSize: 13, color: accent, opacity: 0.8 }}>CHARGEMENT…</span>
      </PageTransition>
    )
  }

  const texteAffiche = texteCorrige ?? texteAssemble
  const lignes = texteAffiche.split('\n')
  const ligne0 = (lignes[0]?.trim() ?? '').replace(/^[«»"''"""'']+/, '')
  const lettrine = ligne0.charAt(0) ?? ''
  const resteLigne0 = ligne0.slice(1) ?? ''

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom relative">
      <Decor variant="fin" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={() => navigate('/online')}
          style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← ACCUEIL
        </button>
        <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{code}</span>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

      <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 12 }}>
        — RÉVÉLATION —
      </div>

      {!revealed ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: encre, opacity: 0.85, lineHeight: 1.6 }}>
            Le cadavre a été assemblé.
          </div>
          <div style={{ display: 'flex', gap: -8 }}>
            {players.map(p => (
              <div key={p.player_id} style={{
                width: 44, height: 44, borderRadius: 3, overflow: 'hidden',
                border: `2px solid ${accent}`, marginLeft: -6,
                background: `${accent}20`,
              }}>
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 18, color: accent }}>
                      {p.pseudo[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setRevealed(true)}
            style={{ background: accent, color: 'var(--reve-button-text)', ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.9em 2em', border: 'none', cursor: 'pointer', marginTop: 8 }}
          >
            {room.mode === 'dessin' ? 'RÉVÉLER LE DESSIN →' : 'RÉVÉLER LE POÈME →'}
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── Mode dessin : bandes empilées ── */}
          {room.mode === 'dessin' && (
            <div style={{ marginBottom: 28 }}>
              {contributions
                .sort((a, b) => a.case_index - b.case_index)
                .map(c => {
                  const p = players.find(pl => pl.player_id === c.player_id)
                  return (
                    <div key={c.case_index} style={{ marginBottom: 4 }}>
                      {c.texte.startsWith('data:') ? (
                        <img src={c.texte} alt={p?.pseudo ?? ''} style={{ width: '100%', display: 'block', borderLeft: `3px solid ${accent}40` }} />
                      ) : (
                        <div style={{ padding: '12px 14px', background: `${accent}10`, fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre }}>{c.texte}</div>
                      )}
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, letterSpacing: '0.15em', color: accent, opacity: 0.7, marginTop: 2, paddingLeft: 4 }}>
                        {p?.pseudo ?? '?'}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* ── Mode écrit : poème ── */}
          {room.mode !== 'dessin' && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", color: encre, fontSize: 15, lineHeight: 1.65 }}>
              {texteAffiche && lettrine && (
                <>
                  <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: '3.6rem', lineHeight: 0.85, color: accent, float: 'left', margin: '6px 8px 0 0' }}>
                    {lettrine}
                  </span>
                  {resteLigne0}
                  {lignes.slice(1).map((l, i) => (
                    <React.Fragment key={i}><br />{l}</React.Fragment>
                  ))}
                </>
              )}
              {(!lettrine || !texteAffiche) && texteAffiche}
            </p>
          </div>
          )}

          {/* Coutures — mode écrit seulement */}
          {room.mode !== 'dessin' && (<div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowCoutures(!showCoutures)}
              style={{ ...mono, fontSize: 13, color: showCoutures ? accent : encre, opacity: showCoutures ? 1 : 0.75, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {showCoutures ? '▲' : '▼'} LES COUTURES
            </button>
            {showCoutures && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15 }} />
                {contributions.sort((a, b) => a.case_index - b.case_index).map(c => {
                  const p = players.find(pl => pl.player_id === c.player_id)
                  return (
                    <div key={c.case_index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 2, overflow: 'hidden', flexShrink: 0, border: `1px solid ${accent}30` }}>
                        {p?.avatar_url ? (
                          <img src={p.avatar_url} alt={p.pseudo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 12, color: accent, fontWeight: 900 }}>
                              {p?.pseudo[0]?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span style={{ ...mono, fontSize: 12, color: accent }}>{p?.pseudo ?? '?'}</span>
                        <span style={{ color: encre, opacity: 0.35, margin: '0 6px' }}>—</span>
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", color: encre, fontSize: 16 }}>{c.texte}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>)}

          {/* Illustration — mode écrit seulement */}
          {room.mode !== 'dessin' && (<div style={{ marginBottom: 20 }}>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
              — ILLUSTRATION —
            </div>

            {illustrationUrl && (
              <img
                src={illustrationUrl}
                alt="illustration"
                style={{ width: '100%', borderRadius: 2, marginBottom: 12, border: `0.5px solid ${accent}30` }}
              />
            )}

            {generatingIllus && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <motion.span style={{ fontSize: 24, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}>✦</motion.span>
                <p style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, marginTop: 8 }}>{styleChoisi?.toUpperCase()} EN COURS…</p>
              </div>
            )}

            {erreurIllus && (
              <p style={{ ...mono, fontSize: 13, color: '#b22c20', marginBottom: 8 }}>{erreurIllus}</p>
            )}

            {!generatingIllus && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => genererIllus(s.id)}
                    style={{
                      ...mono, fontSize: 13, padding: '6px 12px',
                      background: styleChoisi === s.id && illustrationUrl ? `${accent}20` : 'transparent',
                      color: styleChoisi === s.id && illustrationUrl ? accent : encre,
                      border: `0.5px solid ${styleChoisi === s.id && illustrationUrl ? accent : `${encre}25`}`,
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>)}

          {/* Nouvelle partie */}
          <button
            onClick={() => navigate('/online')}
            style={{
              width: '100%', background: 'transparent', color: encre,
              ...mono, fontSize: 13, textTransform: 'uppercase',
              padding: '0.85em 1.8em', border: `1px solid ${encre}40`,
              cursor: 'pointer', marginTop: 8,
            }}
          >
            NOUVELLE PARTIE
          </button>
        </motion.div>
      )}
    </PageTransition>
  )
}
