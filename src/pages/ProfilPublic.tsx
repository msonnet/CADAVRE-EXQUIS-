import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase, getReactorKey } from '../lib/supabase'

const REACTION_EMOJIS = ['🌙', '✦', '❀', '🜔'] as const
type ReactionEmoji = typeof REACTION_EMOJIS[number]

type GalleryType = 'poeme' | 'dessin'

interface GalleryItem {
  id: string
  type: GalleryType
  titre: string | null
  payload: string
  image_url: string | null
  author_pseudo: string
  author_avatar: string | null
  created_at: string
  views_count?: number | null
}

interface ReactionRow {
  gallery_id: string
  emoji: string
  reactor_key: string
}

type ReactionCounts = Record<string, number>
type ReactionsMap = Record<string, ReactionCounts>
type MineMap = Record<string, Set<string>>

interface PoemeCase {
  texte: string
}

interface PoemePayload {
  cases: PoemeCase[]
  structureId: string
  titre?: string
}

interface DessinPayload {
  imageDataUrl?: string
  texteVision?: string
  nbBandes: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function parsePoeme(payload: string): PoemePayload | null {
  try { return JSON.parse(payload) as PoemePayload } catch { return null }
}

function parseDessin(payload: string): DessinPayload | null {
  try { return JSON.parse(payload) as DessinPayload } catch { return null }
}

function extraitPoeme(payload: PoemePayload): string {
  const texte = payload.cases.map(c => c.texte).join(' · ')
  return texte.slice(0, 120)
}

export default function ProfilPublic() {
  const navigate = useNavigate()
  const params = useParams<{ pseudo: string }>()
  const pseudoParam = params.pseudo ?? ''
  const seance = useReve()

  const accent = seance?.accent.hex ?? '#b22c20'
  const encre = seance?.ambiance.ink ?? '#e6d4b8'
  const bg = seance?.ambiance.bg ?? '#15110d'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'

  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const [items, setItems] = useState<GalleryItem[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reactions, setReactions] = useState<ReactionsMap>({})
  const [mine, setMine] = useState<MineMap>({})
  const reactorKey = useRef<string>(getReactorKey())
  const seenViews = useRef<Set<string>>(new Set())

  const chargerReactions = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      const { data, error } = await supabase
        .from('gallery_reactions')
        .select('gallery_id, emoji, reactor_key')
        .in('gallery_id', ids)
      if (error) {
        console.error('[ProfilPublic] Erreur réactions', error)
        return
      }
      const counts: ReactionsMap = {}
      const mineNext: MineMap = {}
      const rows = (data ?? []) as ReactionRow[]
      for (const r of rows) {
        if (!counts[r.gallery_id]) counts[r.gallery_id] = {}
        counts[r.gallery_id][r.emoji] = (counts[r.gallery_id][r.emoji] ?? 0) + 1
        if (r.reactor_key === reactorKey.current) {
          if (!mineNext[r.gallery_id]) mineNext[r.gallery_id] = new Set()
          mineNext[r.gallery_id].add(r.emoji)
        }
      }
      setReactions(prev => ({ ...prev, ...counts }))
      setMine(prev => {
        const next: MineMap = { ...prev }
        for (const id of ids) {
          next[id] = mineNext[id] ?? new Set()
        }
        return next
      })
    } catch (e) {
      console.error('[ProfilPublic] Exception réactions', e)
    }
  }, [])

  const toggleReaction = useCallback(async (galleryId: string, emoji: ReactionEmoji) => {
    const hadIt = mine[galleryId]?.has(emoji) ?? false

    setReactions(prev => {
      const cur = { ...(prev[galleryId] ?? {}) }
      cur[emoji] = Math.max(0, (cur[emoji] ?? 0) + (hadIt ? -1 : 1))
      return { ...prev, [galleryId]: cur }
    })
    setMine(prev => {
      const cur = new Set(prev[galleryId] ?? new Set<string>())
      if (hadIt) cur.delete(emoji)
      else cur.add(emoji)
      return { ...prev, [galleryId]: cur }
    })

    try {
      if (hadIt) {
        const { error } = await supabase
          .from('gallery_reactions')
          .delete()
          .eq('gallery_id', galleryId)
          .eq('reactor_key', reactorKey.current)
          .eq('emoji', emoji)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('gallery_reactions')
          .insert({ gallery_id: galleryId, emoji, reactor_key: reactorKey.current })
        if (error) throw error
      }
    } catch (e) {
      console.error('[ProfilPublic] Erreur toggle réaction', e)
      setReactions(prev => {
        const cur = { ...(prev[galleryId] ?? {}) }
        cur[emoji] = Math.max(0, (cur[emoji] ?? 0) + (hadIt ? 1 : -1))
        return { ...prev, [galleryId]: cur }
      })
      setMine(prev => {
        const cur = new Set(prev[galleryId] ?? new Set<string>())
        if (hadIt) cur.add(emoji)
        else cur.delete(emoji)
        return { ...prev, [galleryId]: cur }
      })
    }
  }, [mine])

  const incrementView = useCallback(async (galleryId: string) => {
    if (seenViews.current.has(galleryId)) return
    seenViews.current.add(galleryId)
    try {
      const { error } = await supabase.rpc('increment_gallery_view', { g_id: galleryId })
      if (error) {
        console.error('[ProfilPublic] Erreur incrément vue', error)
        return
      }
      setItems(prev => prev.map(it => it.id === galleryId
        ? { ...it, views_count: (it.views_count ?? 0) + 1 }
        : it))
    } catch (e) {
      console.error('[ProfilPublic] Exception incrément vue', e)
    }
  }, [])

  const handleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = prev === id ? null : id
      if (next) incrementView(next)
      return next
    })
  }, [incrementView])

  useEffect(() => {
    let annule = false
    async function charger() {
      setChargement(true)
      setErreur(null)
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('id, type, titre, payload, image_url, author_pseudo, author_avatar, created_at, views_count')
          .ilike('author_pseudo', pseudoParam)
          .order('created_at', { ascending: false })

        if (annule) return

        if (error) {
          console.error('[ProfilPublic] Erreur de chargement', error)
          setErreur('Impossible de charger ce profil.')
          setChargement(false)
          return
        }

        const rows = (data ?? []) as GalleryItem[]
        setItems(rows)
        setChargement(false)

        if (rows.length > 0) {
          chargerReactions(rows.map(r => r.id))
        }
      } catch (e) {
        if (annule) return
        console.error('[ProfilPublic] Exception chargement', e)
        setErreur('Impossible de charger ce profil.')
        setChargement(false)
      }
    }
    charger()
    return () => { annule = true }
  }, [pseudoParam, chargerReactions])

  const titreAffichePseudo = items[0]?.author_pseudo ?? pseudoParam

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/galerie')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← GALERIE
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — PROFIL —
        </div>

        {/* ── TITRE (pseudo) ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="font-bodoni font-black leading-tight mb-1"
            style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            <span style={{ color: accent }}>{titreAffichePseudo}</span>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: encre, opacity: 0.85, marginBottom: 18,
          }}>
            Œuvres publiées
          </p>
        </motion.div>

        {/* ── CHARGEMENT ── */}
        {chargement && (
          <div className="flex justify-center py-16">
            <motion.span
              style={{ fontSize: 20, color: accent }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >✦</motion.span>
          </div>
        )}

        {/* ── ERREUR ── */}
        {!chargement && erreur && (
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: accent, opacity: 0.85,
            textAlign: 'center', padding: '40px 0',
          }}>
            {erreur}
          </p>
        )}

        {/* ── VIDE ── */}
        {!chargement && !erreur && items.length === 0 && (
          <motion.div
            className="flex flex-col items-center py-14"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.75, textAlign: 'center',
            }}>
              Aucune œuvre publiée sous ce nom.
            </p>
            <button
              onClick={() => navigate('/galerie')}
              style={{
                marginTop: 22,
                background: accent, color: btnText,
                ...mono, fontSize: 12, textTransform: 'uppercase',
                padding: '0.8em 1.4em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retour à la galerie
            </button>
          </motion.div>
        )}

        {/* ── LISTE ── */}
        {!chargement && !erreur && items.length > 0 && (
          <AnimatePresence initial={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item, i) => {
                const ouvert = expanded === item.id
                const poemePayload = item.type === 'poeme' ? parsePoeme(item.payload) : null
                const dessinPayload = item.type === 'dessin' ? parseDessin(item.payload) : null
                const titreAffiche = item.titre
                  ?? (poemePayload?.titre)
                  ?? (item.type === 'poeme' && poemePayload ? extraitPoeme(poemePayload).slice(0, 48) : null)
                  ?? (item.type === 'dessin' && dessinPayload?.texteVision ? dessinPayload.texteVision.split('\n')[0].slice(0, 48) : null)
                  ?? 'Sans titre'

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <div
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: 12,
                        border: `0.5px solid ${encre}15`,
                        background: 'transparent',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}55` }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = `${encre}15` }}
                    >
                      <button
                        onClick={() => handleExpand(item.id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                          <p style={{
                            fontFamily: "'Cormorant Garamond', serif", color: encre, fontSize: 16,
                            lineHeight: 1.3, margin: 0, flex: 1, minWidth: 0,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {titreAffiche}
                          </p>
                          <span style={{ ...mono, fontSize: 11, color: accent, opacity: 0.85, flexShrink: 0 }}>
                            {ouvert ? '−' : '+'}
                          </span>
                        </div>

                        <p style={{ ...mono, fontSize: 11, color: encre, opacity: 0.7, margin: 0, marginBottom: 8 }}>
                          {(item.type === 'poeme' ? 'POÈME' : 'DESSIN')}
                          {' · '}
                          {formatDate(item.created_at).toUpperCase()}
                        </p>

                        {item.type === 'poeme' && poemePayload && (
                          <div style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 15, color: encre, opacity: 0.92,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {ouvert
                              ? poemePayload.cases.map(c => c.texte).join('\n')
                              : poemePayload.cases.slice(0, 2).map(c => c.texte).join('\n')}
                          </div>
                        )}

                        {item.type === 'dessin' && (item.image_url || dessinPayload?.imageDataUrl) && (
                          <div style={{
                            border: `0.5px solid ${encre}20`,
                            overflow: 'hidden',
                            background: '#fff',
                            display: 'flex',
                            justifyContent: 'center',
                          }}>
                            <img
                              src={item.image_url ?? dessinPayload?.imageDataUrl}
                              alt={titreAffiche}
                              style={{
                                maxHeight: ouvert ? 'none' : 120,
                                width: ouvert ? '100%' : 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                          </div>
                        )}

                        {ouvert && item.type === 'dessin' && dessinPayload?.texteVision && (
                          <p style={{
                            fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: encre,
                            opacity: 0.85, marginTop: 8, lineHeight: 1.4, whiteSpace: 'pre-wrap',
                          }}>
                            {dessinPayload.texteVision}
                          </p>
                        )}
                      </button>

                      {/* ── RÉACTIONS + VUES ── */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        marginTop: 10, flexWrap: 'wrap',
                      }}>
                        {REACTION_EMOJIS.map(em => {
                          const count = reactions[item.id]?.[em] ?? 0
                          const reacted = mine[item.id]?.has(em) ?? false
                          return (
                            <button
                              key={em}
                              onClick={e => { e.stopPropagation(); toggleReaction(item.id, em) }}
                              style={{
                                ...mono,
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                background: 'transparent',
                                color: reacted ? accent : encre,
                                opacity: reacted ? 1 : 0.6,
                                border: reacted ? `1px solid ${accent}` : `0.5px solid ${encre}25`,
                                cursor: 'pointer',
                                transition: 'opacity 0.15s, border-color 0.15s, color 0.15s',
                                lineHeight: 1,
                              }}
                              onMouseEnter={e => { if (!reacted) e.currentTarget.style.opacity = '0.95' }}
                              onMouseLeave={e => { if (!reacted) e.currentTarget.style.opacity = '0.6' }}
                              aria-label={`Réagir ${em}`}
                            >
                              <span style={{ fontSize: 13 }}>{em}</span>
                              {count > 0 && <span>{count}</span>}
                            </button>
                          )
                        })}
                        <span style={{
                          ...mono, fontSize: 11, color: encre, opacity: 0.55,
                          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{ fontSize: 12 }}>👁</span>
                          {item.views_count ?? 0}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* Référence à bg pour cohérence */}
        <div aria-hidden style={{ display: 'none', background: bg }} />

      </div>
    </PageTransition>
  )
}
