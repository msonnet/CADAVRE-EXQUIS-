import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase, getReactorKey } from '../lib/supabase'
import { useSound } from '../hooks/useSound'

const PAGE_SIZE = 20
const REACTION_EMOJIS = ['🌙', '✦', '❀', '🜔'] as const
type ReactionEmoji = typeof REACTION_EMOJIS[number]
const REACTION_LABELS: Record<ReactionEmoji, string> = {
  '🌙': 'Onirique',
  '✦': 'Sublime',
  '❀': 'Délicat',
  '🜔': 'Troublant',
}

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

export default function Galerie() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()

  const accent = seance?.accent.hex ?? '#b22c20'
  const encre = seance?.ambiance.ink ?? '#e6d4b8'
  const bg = seance?.ambiance.bg ?? '#15110d'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'

  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  const [onglet, setOnglet] = useState<GalleryType>('poeme')
  const [items, setItems] = useState<GalleryItem[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementPlus, setChargementPlus] = useState(false)
  const [pageOffset, setPageOffset] = useState(0)
  const [encore, setEncore] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [reactions, setReactions] = useState<ReactionsMap>({})
  const [mine, setMine] = useState<MineMap>({})
  const reactorKey = useRef<string>(getReactorKey())
  const seenViews = useRef<Set<string>>(new Set())
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const chargerReactions = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      const { data, error } = await supabase
        .from('gallery_reactions')
        .select('gallery_id, emoji, reactor_key')
        .in('gallery_id', ids)
      if (error) {
        console.error('[Galerie] Erreur réactions', error)
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
      console.error('[Galerie] Exception réactions', e)
    }
  }, [])

  const toggleReaction = useCallback(async (galleryId: string, emoji: ReactionEmoji) => {
    const hadIt = mine[galleryId]?.has(emoji) ?? false

    // Mise à jour optimiste
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
      console.error('[Galerie] Erreur toggle réaction', e)
      // Rollback
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
        console.error('[Galerie] Erreur incrément vue', error)
        return
      }
      setItems(prev => prev.map(it => it.id === galleryId
        ? { ...it, views_count: (it.views_count ?? 0) + 1 }
        : it))
    } catch (e) {
      console.error('[Galerie] Exception incrément vue', e)
    }
  }, [])

  const handleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = prev === id ? null : id
      if (next) incrementView(next)
      return next
    })
  }, [incrementView])

  const chargerItems = useCallback(async (type: GalleryType, offset: number, reset: boolean) => {
    if (reset) {
      setChargement(true)
      setItems([])
      setEncore(true)
    } else {
      setChargementPlus(true)
    }
    setErreur(null)

    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('id, type, titre, payload, image_url, author_pseudo, author_avatar, created_at, views_count')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        console.error('[Galerie] Erreur de chargement', error)
        setErreur('Impossible de charger la galerie.')
        setChargement(false)
        setChargementPlus(false)
        return
      }

      const nouveaux = (data ?? []) as GalleryItem[]
      setItems(prev => reset ? nouveaux : [...prev, ...nouveaux])
      setEncore(nouveaux.length === PAGE_SIZE)
      setPageOffset(offset + nouveaux.length)
      setChargement(false)
      setChargementPlus(false)

      if (nouveaux.length > 0) {
        chargerReactions(nouveaux.map(n => n.id))
      }
    } catch (e) {
      console.error('[Galerie] Exception chargement', e)
      setErreur('Impossible de charger la galerie.')
      setChargement(false)
      setChargementPlus(false)
    }
  }, [chargerReactions])

  useEffect(() => {
    setExpanded(null)
    chargerItems(onglet, 0, true)
  }, [onglet, chargerItems])

  const chargerPlus = () => {
    if (chargementPlus || !encore) return
    chargerItems(onglet, pageOffset, false)
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.96)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <motion.img
              src={lightboxSrc}
              alt=""
              initial={{ scale: 0.93 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={e => { e.stopPropagation(); setLightboxSrc(null) }}
              style={{
                position: 'absolute', top: 18, right: 18,
                fontFamily: "'Outfit', sans-serif", letterSpacing: '0.16em',
                fontSize: 17, color: '#e8d4b8', opacity: 0.85,
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              ✕ FERMER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 17, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 17, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — GALERIE —
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="font-bodoni font-black leading-tight mb-1"
            style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            Créations <span style={{ color: accent }}>partagées.</span>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: encre, opacity: 0.85, marginBottom: 18,
          }}>
            Les œuvres de la communauté
          </p>
        </motion.div>

        {/* ── ONGLETS ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: `0.5px solid ${encre}20` }}>
          {(['poeme', 'dessin'] as const).map(t => {
            const actif = onglet === t
            return (
              <button
                key={t}
                onClick={() => { jouer('clic'); setOnglet(t) }}
                style={{
                  ...mono,
                  fontSize: 17,
                  fontWeight: 700,
                  color: actif ? accent : encre,
                  opacity: actif ? 1 : 0.55,
                  background: 'none',
                  border: 'none',
                  borderBottom: actif ? `2px solid ${accent}` : '2px solid transparent',
                  padding: '10px 18px 10px 0',
                  marginRight: 18,
                  cursor: 'pointer',
                  letterSpacing: '0.22em',
                }}
              >
                {t === 'poeme' ? 'POÈMES' : 'DESSINS'}
              </button>
            )
          })}
        </div>

        {/* ── LÉGENDE DES RÉACTIONS ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
          marginBottom: 14, opacity: 0.7,
        }}>
          {REACTION_EMOJIS.map(em => (
            <span key={em} style={{ ...mono, fontSize: 17, color: encre, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 17 }}>{em}</span>
              {REACTION_LABELS[em].toUpperCase()}
            </span>
          ))}
        </div>

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
            fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: accent, opacity: 0.85,
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
              fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: encre, opacity: 0.75, textAlign: 'center',
            }}>
              Aucune création partagée pour l'instant.
            </p>
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
                        {/* En-tête de la carte */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                          <p style={{
                            fontFamily: "'Cormorant Garamond', serif", color: encre, fontSize: 17,
                            lineHeight: 1.3, margin: 0, flex: 1, minWidth: 0,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {titreAffiche}
                          </p>
                          <span style={{ ...mono, fontSize: 17, color: accent, opacity: 0.85, flexShrink: 0 }}>
                            {ouvert ? '−' : '+'}
                          </span>
                        </div>
                      </button>

                      {/* Méta auteur (Link) + date */}
                      <p style={{ ...mono, fontSize: 17, color: encre, opacity: 0.7, margin: 0, marginBottom: 8 }}>
                        <Link
                          to={`/u/${encodeURIComponent(item.author_pseudo)}`}
                          onClick={e => e.stopPropagation()}
                          style={{
                            color: encre,
                            textDecoration: 'none',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = accent }}
                          onMouseLeave={e => { e.currentTarget.style.color = encre }}
                        >
                          {item.author_pseudo.toUpperCase()}
                        </Link>
                        {' · '}
                        {formatDate(item.created_at).toUpperCase()}
                      </p>

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
                        {/* Aperçu / contenu */}
                        {item.type === 'poeme' && poemePayload && (
                          <div style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 17, color: encre, opacity: 0.92,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {ouvert
                              ? poemePayload.cases.map(c => c.texte).join('\n')
                              : poemePayload.cases.slice(0, 2).map(c => c.texte).join('\n')}
                          </div>
                        )}

                        {item.type === 'poeme' && item.image_url && (
                          <div style={{
                            marginTop: 10,
                            border: `0.5px solid ${encre}20`,
                            overflow: 'hidden',
                            display: 'flex',
                            justifyContent: 'center',
                            position: 'relative',
                            cursor: ouvert ? 'zoom-in' : 'default',
                          }}
                            onClick={e => { if (ouvert && item.image_url) { e.stopPropagation(); setLightboxSrc(item.image_url) } }}
                          >
                            <img
                              src={item.image_url}
                              alt={titreAffiche}
                              loading="lazy"
                              style={{
                                maxHeight: ouvert ? 'none' : 140,
                                width: ouvert ? '100%' : 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                            {ouvert && (
                              <span style={{
                                position: 'absolute', bottom: 6, right: 8,
                                fontFamily: "'Outfit', sans-serif", letterSpacing: '0.14em',
                                fontSize: 17, color: '#fff',
                                background: 'rgba(0,0,0,0.5)', padding: '2px 7px',
                                pointerEvents: 'none',
                              }}>⤢ AGRANDIR</span>
                            )}
                          </div>
                        )}

                        {item.type === 'dessin' && (item.image_url || dessinPayload?.imageDataUrl) && (() => {
                          const src = item.image_url ?? dessinPayload?.imageDataUrl
                          return (
                            <div style={{
                              border: `0.5px solid ${encre}20`,
                              overflow: 'hidden',
                              background: '#fff',
                              display: 'flex',
                              justifyContent: 'center',
                              position: 'relative',
                              cursor: ouvert ? 'zoom-in' : 'default',
                            }}
                              onClick={e => { if (ouvert && src) { e.stopPropagation(); setLightboxSrc(src) } }}
                            >
                              <img
                                src={src}
                                alt={titreAffiche}
                                style={{
                                  maxHeight: ouvert ? 'none' : 120,
                                  width: ouvert ? '100%' : 'auto',
                                  height: 'auto',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                              />
                              {ouvert && (
                                <span style={{
                                  position: 'absolute', bottom: 6, right: 8,
                                  fontFamily: "'Outfit', sans-serif", letterSpacing: '0.14em',
                                  fontSize: 17, color: '#fff',
                                  background: 'rgba(0,0,0,0.5)', padding: '2px 7px',
                                  pointerEvents: 'none',
                                }}>⤢ AGRANDIR</span>
                              )}
                            </div>
                          )
                        })()}

                        {ouvert && item.type === 'dessin' && dessinPayload?.texteVision && (
                          <p style={{
                            fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: encre,
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
                                fontSize: 17,
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
                              aria-label={`Réagir : ${REACTION_LABELS[em]}`}
                              title={REACTION_LABELS[em]}
                            >
                              <span style={{ fontSize: 17 }}>{em}</span>
                              {count > 0 && <span>{count}</span>}
                            </button>
                          )
                        })}
                        <span style={{
                          ...mono, fontSize: 17, color: encre, opacity: 0.55,
                          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{ fontSize: 17 }}>👁</span>
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

        {/* ── CHARGER PLUS ── */}
        {!chargement && !erreur && items.length > 0 && encore && (
          <motion.div
            style={{ marginTop: 18, marginBottom: 4 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={chargerPlus}
              disabled={chargementPlus}
              style={{
                width: '100%',
                background: chargementPlus ? `${accent}aa` : accent,
                color: btnText,
                ...mono, fontSize: 17, textTransform: 'uppercase',
                padding: '0.9em 1em',
                border: 'none',
                cursor: chargementPlus ? 'wait' : 'pointer',
              }}
            >
              {chargementPlus ? (
                <motion.span
                  style={{ display: 'inline-block' }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >✦</motion.span>
              ) : 'Charger plus →'}
            </button>
          </motion.div>
        )}

        {!chargement && !erreur && items.length > 0 && !encore && (
          <p style={{
            ...mono, fontSize: 17, color: encre, opacity: 0.55,
            textAlign: 'center', marginTop: 18, marginBottom: 4,
          }}>
            — FIN —
          </p>
        )}

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* Référence à bg pour cohérence — la couleur de fond est déjà appliquée par le Decor */}
        <div aria-hidden style={{ display: 'none', background: bg }} />

      </div>
    </PageTransition>
  )
}
