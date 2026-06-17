import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase } from '../lib/supabase'
import { useSound } from '../hooks/useSound'
import { getStructure, reconstruirePoeme } from '../structures'
import { PapierCard, Etiquette, ENCRE_PAPIER } from '../components/Papier'

interface PoemeCase { texte: string }
interface PoemePayload { cases: PoemeCase[]; structureId: string; titre?: string }

interface GalleryItem {
  id: string
  type: string
  titre: string | null
  payload: string
  image_url: string | null
  author_pseudo: string
  author_avatar: string | null
  created_at: string
}

function dayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000)
}

export default function PoemeDuJour() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const [item, setItem] = useState<GalleryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [poeme, setPoeme] = useState<string>('')
  const [partagé, setPartagé] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Fetch recent gallery poems (up to 90 to give at least 90 unique daily poems)
      const { data } = await supabase
        .from('gallery')
        .select('id,type,titre,payload,image_url,author_pseudo,author_avatar,created_at')
        .eq('type', 'poeme')
        .order('created_at', { ascending: false })
        .limit(90)

      const items = (data ?? []) as GalleryItem[]
      if (!items.length) { setLoading(false); return }

      // Stable daily pick — same poem for everyone on the same day
      const idx = dayOfYear() % items.length
      const picked = items[idx]
      setItem(picked)

      try {
        const p = JSON.parse(picked.payload) as PoemePayload
        const structure = getStructure(p.structureId)
        const fakeCases = p.cases.map((c, i) => ({
          numero: i + 1, fonction: '', consigne: '', auteur: 'humain' as const, texte: c.texte, ts: 0,
        }))
        setPoeme(reconstruirePoeme(fakeCases, structure))
      } catch {
        setPoeme(picked.payload)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function partager() {
    if (!item || !poeme) return
    jouer('clic')
    const titre = item.titre ? `« ${item.titre} »` : 'Cadavre exquis'
    const texte = `${titre}\n\n${poeme}\n\n— ${item.author_pseudo}`
    try {
      if (navigator.share) {
        await navigator.share({ title: titre, text: texte })
      } else {
        await navigator.clipboard.writeText(texte)
        setPartagé(true)
        setTimeout(() => setPartagé(false), 2000)
      }
    } catch { /* user cancelled */ }
  }

  const date = item ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const lignes = poeme.split('\n').filter(Boolean)

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button onClick={() => navigate(-1)} style={{ ...mono, fontSize: 13, color: encre, opacity: 0.65, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          ← RETOUR
        </button>
        <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>POÈME DU JOUR</span>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45, marginBottom: 28 }} />

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span style={{ fontSize: 22, color: accent }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>✦</motion.span>
        </div>
      )}

      {!loading && !item && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 20, color: encre, opacity: 0.6 }}>
            La galerie est encore vide.<br />Sois le premier à composer.
          </p>
        </div>
      )}

      {!loading && item && (
        /* Perspective container — needed for the 3-D unfold */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', perspective: '1200px' }}>
          <motion.div
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', transformOrigin: 'top center' }}
          >
            <PapierCard rotation={0} bord="dechire1" bordure={`${accent}55`} style={{ padding: '16px 16px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Poem title */}
              <div style={{ marginBottom: 12 }}>
                <Etiquette bg={accent} color={btnText} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
                  {item.titre ? item.titre.toUpperCase() : 'POÈME DU JOUR'}
                </Etiquette>
              </div>

              {/* Poem text — lines appear after the unfold settles */}
              <div style={{ flex: 1 }}>
                {lignes.map((ligne, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.18, duration: 0.45, ease: 'easeOut' }}
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontStyle: 'italic',
                      fontSize: 'clamp(1.3rem, 5.5vw, 1.8rem)',
                      lineHeight: 1.65,
                      color: ENCRE_PAPIER,
                      margin: '0 0 2px',
                    }}
                  >
                    {ligne}
                  </motion.p>
                ))}
              </div>

              {/* Attribution */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 + lignes.length * 0.18, duration: 0.5 }}
                style={{ marginTop: 28, paddingTop: 16, borderTop: `0.5px solid ${ENCRE_PAPIER}20` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  {item.author_avatar ? (
                    <img src={item.author_avatar} alt={item.author_pseudo} style={{ width: 32, height: 32, borderRadius: 3, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 3, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 17, color: accent }}>
                        {item.author_pseudo[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div style={{ ...mono, fontSize: 13, color: ENCRE_PAPIER, fontWeight: 700 }}>{item.author_pseudo}</div>
                    <div style={{ ...mono, fontSize: 11, color: ENCRE_PAPIER, opacity: 0.45, marginTop: 2 }}>{date}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={partager}
                    style={{
                      flex: 1, ...mono, fontSize: 13, background: accent, color: btnText, border: 'none',
                      borderRadius: 2, padding: '12px 0', cursor: 'pointer', letterSpacing: '0.12em',
                      transform: 'rotate(-0.6deg)', boxShadow: '0 3px 10px rgba(0,0,0,0.28)',
                    }}
                  >
                    {partagé ? '✓ COPIÉ' : 'PARTAGER'}
                  </button>
                  <button
                    onClick={() => { jouer('clic'); navigate('/galerie') }}
                    style={{ flex: 1, ...mono, fontSize: 13, background: 'transparent', color: ENCRE_PAPIER, border: `1px solid ${ENCRE_PAPIER}30`, borderRadius: 3, padding: '12px 0', cursor: 'pointer', letterSpacing: '0.12em', opacity: 0.8 }}
                  >
                    GALERIE →
                  </button>
                </div>
              </motion.div>
            </PapierCard>
          </motion.div>
        </div>
      )}
    </PageTransition>
  )
}
