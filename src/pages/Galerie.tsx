import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 20

type GalleryType = 'poeme' | 'dessin'

interface GalleryItem {
  id: string
  type: GalleryType
  titre: string | null
  payload: string
  author_pseudo: string
  author_avatar: string | null
  created_at: string
}

interface PoemeCase {
  texte: string
}

interface PoemePayload {
  cases: PoemeCase[]
  structureId: string
  titre?: string
}

interface DessinPayload {
  imageDataUrl: string
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

  const chargerItems = useCallback(async (type: GalleryType, offset: number, reset: boolean) => {
    if (reset) {
      setChargement(true)
      setItems([])
      setEncore(true)
    } else {
      setChargementPlus(true)
    }
    setErreur(null)

    const { data, error } = await supabase
      .from('gallery')
      .select('id, type, titre, payload, author_pseudo, author_avatar, created_at')
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
  }, [])

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

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ACCUEIL
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
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
            fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: encre, opacity: 0.85, marginBottom: 18,
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
                onClick={() => setOnglet(t)}
                style={{
                  ...mono,
                  fontSize: 12,
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
                    <button
                      onClick={() => setExpanded(ouvert ? null : item.id)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: 12,
                        border: `0.5px solid ${encre}15`,
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}55` }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = `${encre}15` }}
                    >
                      {/* En-tête de la carte */}
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

                      {/* Méta auteur + date */}
                      <p style={{ ...mono, fontSize: 11, color: encre, opacity: 0.7, margin: 0, marginBottom: 8 }}>
                        {item.author_pseudo.toUpperCase()}
                        {' · '}
                        {formatDate(item.created_at).toUpperCase()}
                      </p>

                      {/* Aperçu / contenu */}
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

                      {item.type === 'dessin' && dessinPayload && (
                        <div style={{
                          border: `0.5px solid ${encre}20`,
                          overflow: 'hidden',
                          background: '#fff',
                          display: 'flex',
                          justifyContent: 'center',
                        }}>
                          <img
                            src={dessinPayload.imageDataUrl}
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
                ...mono, fontSize: 13, textTransform: 'uppercase',
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
            ...mono, fontSize: 11, color: encre, opacity: 0.55,
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
