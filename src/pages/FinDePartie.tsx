import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoemes, sauvegarderIllustration } from '../db'
import type { Poeme } from '../types'
import { useTTS } from '../hooks/useTTS'
import { useSound } from '../hooks/useSound'
import { genererIllustration } from '../api/illustration'
import { corrigerAccords } from '../api/corriger'
import { Decor, useReve } from '../reve'
import { partagerTexte } from '../utils/partager'

const STYLES = [
  { id: 'aquarelle',           label: 'Aquarelle' },
  { id: 'fusain',              label: 'Fusain' },
  { id: 'huile',               label: "Peinture à l'huile" },
  { id: 'encre',               label: 'Encre de Chine' },
  { id: 'gravure',             label: 'Gravure' },
  { id: 'hyperrealisme',       label: 'Hyperréalisme' },
  { id: 'collage_surrealiste', label: 'Collages surréalistes' },
  { id: 'libre',               label: 'Libre' },
]

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

const STRUCT_LABELS: Record<string, string> = {
  'phrase-simple': 'Structure courte',
  'phrase-etoffee': 'Structure étoffée',
  'vers-libre': 'Vers libre',
}

export default function FinDePartie() {
  const navigate = useNavigate()
  const location = useLocation()
  const seance = useReve()
  const [poeme, setPoeme] = useState<Poeme | null>(
    (location.state as { poeme?: Poeme } | null)?.poeme ?? null
  )
  const [activeSection, setActiveSection] = useState<'recueil' | 'coutures' | 'image' | null>(null)
  const [revealReady, setRevealReady] = useState(false)
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null)
  const [styleChoisi, setStyleChoisi] = useState<string | null>(null)
  const [promptLibre, setPromptLibre] = useState('')
  const [generatingIllustration, setGeneratingIllustration] = useState(false)
  const [erreurIllustration, setErreurIllustration] = useState<string | null>(null)
  const [promptVisuel, setPromptVisuel] = useState<string | null>(null)
  const [promptVisible, setPromptVisible] = useState(false)
  const [texteCorrige, setTexteCorrige] = useState<string | null>(null)
  const [pleinEcran, setPleinEcran] = useState(false)
  const [partageOk, setPartageOk] = useState(false)
  const { parler, arreter, parlant } = useTTS()
  const { jouer } = useSound()

  useEffect(() => {
    if (!pleinEcran) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPleinEcran(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pleinEcran])

  const sc = seance?.colorSchema
  const accent = sc?.hex ?? '#b22c20'
  const encre = sc?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = sc?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  useEffect(() => {
    jouer('revelation')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setRevealReady(true), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!poeme) {
      chargerPoemes()
        .then(ps => { if (ps.length > 0) setPoeme(ps[0]) })
        .catch(console.error)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (poeme?.illustration) {
      setIllustrationUrl(poeme.illustration.url)
      setStyleChoisi(poeme.illustration.style)
    }
  }, [poeme?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!poeme) return
    let cancelled = false
    const structure = getStructure(poeme.structureId)
    const brut = reconstruirePoeme(poeme.cases, structure)
    setTexteCorrige(null)
    const blocs = poeme.cases.map((c, i) => ({
      texte: c.texte,
      type: structure.cases[i]?.type ?? 'libre',
    }))
    corrigerAccords(brut, poeme.structureId, blocs).then(t => { if (!cancelled) setTexteCorrige(t) })
    return () => { cancelled = true }
  }, [poeme?.id]) // eslint-disable-line react-hooks/exhaustive-deps


  function choisirStyle(style: string) {
    if (!poeme || generatingIllustration) return
    setStyleChoisi(style)
    setErreurIllustration(null)
    setGeneratingIllustration(true)
    const structure = getStructure(poeme.structureId)
    const texte = reconstruirePoeme(poeme.cases, structure)
    const pl = promptLibre.trim() || undefined
    genererIllustration(texte, style, pl)
      .then(({ url, promptVisuel: pv, reason }) => {
        if (url) {
          setIllustrationUrl(url)
          if (pv) setPromptVisuel(pv)
          const illustration = { url, style, promptLibre: pl, promptUtilise: texte, dateGeneration: Date.now() }
          sauvegarderIllustration(poeme.id, illustration).catch(console.error)
        } else {
          const msg = reason === 'not_configured'
            ? 'Génération d\'images non configurée (clé FAL_KEY manquante)'
            : 'Illustration indisponible — réessayez dans un instant'
          setErreurIllustration(msg)
          setStyleChoisi(null)
        }
      })
      .finally(() => setGeneratingIllustration(false))
  }

  function relancer() {
    if (styleChoisi) choisirStyle(styleChoisi)
  }

  if (!poeme) {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, textAlign: 'center' }}>
          Aucun poème en cours.
        </p>
        <button
          onClick={() => navigate('/config')}
          style={{ marginTop: 32, background: accent, color: btnText, ...mono, fontSize: 17, textTransform: 'uppercase', padding: '0.9em 1.8em', border: 'none', cursor: 'pointer' }}
        >
          Nouvelle partie
        </button>
      </PageTransition>
    )
  }

  const structure = getStructure(poeme.structureId)
  const texte = reconstruirePoeme(poeme.cases, structure)
  const texteAffiche = texteCorrige ?? texte
  const lignes = texteAffiche.split('\n')
  const ligne0 = (lignes[0]?.trim() ?? '').replace(/^[«»"''"“”‘’]+/, '')
  const lettrine = ligne0.charAt(0) ?? ''
  const resteLigne0 = ligne0.slice(1) ?? ''
  const voixCount = poeme.cases.length

  async function partager() {
    if (!poeme) return
    const dateStr = new Date(poeme.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    await partagerTexte(`${texteAffiche}\n\n— Cadavre Exquis · ${dateStr}`, 'Cadavre Exquis')
    setPartageOk(true)
    setTimeout(() => setPartageOk(false), 2000)
  }
  const structLabel = STRUCT_LABELS[poeme.structureId] ?? poeme.structureId
  const heureStr = new Date(poeme.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const feuilletLabel = `FEUILLET ${toRomain(voixCount)} · FIN`
  const labelStyle = STYLES.find(s => s.id === styleChoisi)?.label

  return (
    <>
      {/* ── ÉCRAN D'ASSEMBLAGE ── */}
      <AnimatePresence>
        {!revealReady && poeme && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
            style={{
              position: 'fixed', inset: 0, zIndex: 250,
              background: bg, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 20, textAlign: 'center', padding: '0 28px',
            }}
          >
            {Array.from({ length: voixCount }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: i % 2 === 0 ? '-110%' : '110%' }}
                animate={{ x: 0 }}
                transition={{ delay: i * 0.28, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: 'absolute', left: 0, right: 0,
                  height: `${100 / voixCount}%`,
                  top: `${(i * 100) / voixCount}%`,
                  background: accent, opacity: 0.12,
                  pointerEvents: 'none',
                }}
              />
            ))}
            <motion.div
              style={{ position: 'relative', zIndex: 1 }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + voixCount * 0.14, duration: 0.7 }}
            >
              <div style={{ ...mono, fontSize: 17, color: accent, letterSpacing: '0.28em', marginBottom: 20, opacity: 0.8 }}>
                — {voixCount} VOIX —
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                fontSize: 'clamp(1.5rem, 7vw, 2.2rem)',
                color: encre, lineHeight: 1.3,
              }}>
                Le cadavre
              </div>
              <div style={{
                fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                fontSize: 'clamp(1.5rem, 7vw, 2.2rem)',
                color: encre, lineHeight: 1.3,
              }}>
                se reconstitue
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                >…</motion.span>
              </div>
            </motion.div>
            <motion.div
              style={{ position: 'relative', zIndex: 1, fontSize: 18, color: accent }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              ✦
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
        <Decor variant={illustrationUrl ? 'fin-image' : 'fin'} />

      {/* ── PLEIN ÉCRAN ILLUSTRATION ── */}
      <AnimatePresence>
        {pleinEcran && illustrationUrl && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Illustration en plein écran"
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(10,6,3,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPleinEcran(false)}
          >
            <img
              src={illustrationUrl}
              alt="Illustration du poème en plein écran"
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain' }}
            />
            {labelStyle && (
              <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: 17, letterSpacing: '0.18em', color: '#e8d4b8', opacity: 0.75, marginTop: 12 }}>
                {labelStyle.toUpperCase()}
              </p>
            )}
            <button
              aria-label="Fermer le plein écran"
              onClick={e => { e.stopPropagation(); setPleinEcran(false) }}
              style={{ position: 'absolute', top: 20, right: 20, fontFamily: "'Raleway', sans-serif", fontSize: 17, letterSpacing: '0.18em', color: '#e8d4b8', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
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
            style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {feuilletLabel}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── TITLE ── */}
        <motion.div
          className="mt-6 mb-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <div
            className="font-bodoni font-black leading-none"
            style={{ fontSize: 'clamp(2rem, 9vw, 3rem)', color: encre }}
          >
            <span style={{ display: 'block' }}>LE CADAVRE</span>
            <span style={{ display: 'block' }}>
              <span style={{ color: accent }}>est exquis.</span>
            </span>
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── POEM CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          style={{
            border: `1px solid ${accent}40`,
            borderLeft: `3px solid ${accent}`,
            padding: '16px 16px 12px',
            background: 'rgba(240,228,204,0.25)',
            marginBottom: 20,
          }}
        >
          {/* Poem title in mono */}
          <div style={{ ...mono, fontSize: 17, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            CADAVRE EXQUIS · {new Date(poeme.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
          </div>

          {/* Poem text — lignes dévoilées une à une après le rideau */}
          <div
            style={{
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
              color: encre, fontSize: 'clamp(1.55rem, 7vw, 2.1rem)', lineHeight: 1.6,
            }}
          >
            {revealReady && lignes.map((ligne, i) => (
              <motion.span
                key={i}
                style={{ display: 'block', minHeight: '1.65em' }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.7, duration: 0.7, ease: 'easeOut' }}
              >
                {i === 0 && lettrine && (
                  <span style={{
                    fontFamily: "'Bodoni Moda', serif",
                    fontWeight: 900,
                    fontSize: 'clamp(2.8rem, 10vw, 3.4rem)',
                    lineHeight: 0.85, color: accent,
                    float: 'left', marginRight: 6, marginTop: 4,
                  }}>
                    {lettrine}
                  </span>
                )}
                {i === 0 ? resteLigne0 : (ligne || ' ')}
              </motion.span>
            ))}
          </div>

          {/* Card footer */}
          <div style={{ ...mono, fontSize: 17, color: encre, opacity: 0.75, marginTop: 14, paddingTop: 8, borderTop: `0.5px solid ${encre}20` }}>
            {voixCount} VOIX · {structLabel.toUpperCase()} · {heureStr}
          </div>
        </motion.div>

        {/* ── IMAGE (if already generated) ── */}
        {illustrationUrl && (
          <motion.div
            className="mb-3 flex flex-col gap-1"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <button
              onClick={() => !generatingIllustration && setPleinEcran(true)}
              aria-label="Voir l'illustration en plein écran"
              style={{ display: 'block', background: 'none', border: 'none', padding: 0, cursor: generatingIllustration ? 'default' : 'zoom-in', width: '100%' }}
            >
              <img
                src={illustrationUrl}
                alt="Illustration du poème"
                className="w-full border"
                style={{ borderColor: `${accent}30`, filter: 'contrast(0.97)', opacity: generatingIllustration ? 0.4 : 1, transition: 'opacity 0.5s' }}
              />
            </button>
            <div className="flex justify-between items-center">
              {labelStyle && !generatingIllustration && (
                <span style={{ ...mono, fontSize: 17, color: encre, opacity: 0.75 }}>{labelStyle.toUpperCase()}</span>
              )}
              {!generatingIllustration && (
                <button
                  onClick={() => setPleinEcran(true)}
                  aria-label="Agrandir l'illustration"
                  style={{ ...mono, fontSize: 17, color: accent, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
                >↗ AGRANDIR</button>
              )}
            </div>
            {/* Prompt reveal — always visible after generation */}
            {promptVisuel && !generatingIllustration && (
              <div className="w-full">
                <button
                  onClick={() => setPromptVisible(v => !v)}
                  style={{ ...mono, fontSize: 17, color: encre, opacity: 0.75, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {promptVisible ? '↑ masquer le prompt' : '→ voir le prompt IA'}
                </button>
                {promptVisible && (
                  <p style={{
                    fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre,
                    opacity: 0.85, marginTop: 6, lineHeight: 1.55,
                  }}>
                    {promptVisuel}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SPINNER ── */}
        <AnimatePresence>
          {generatingIllustration && (
            <motion.div
              key="spinner"
              role="status"
              aria-label={`Génération de l'illustration en cours`}
              aria-live="polite"
              className="flex flex-col items-center gap-2 my-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.span
                aria-hidden
                style={{ fontSize: 22, color: accent }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >✦</motion.span>
              <p style={{ ...mono, fontSize: 17, color: encre, opacity: 0.8 }}>{labelStyle?.toUpperCase()} EN COURS…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SCELLER CTA ── */}
        <motion.div
          className="mb-3 mt-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={() => navigate('/bibliotheque')}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: btnText,
              ...mono, fontSize: 17,
              textTransform: 'uppercase',
              padding: '1.15em 1em',
              border: 'none', cursor: 'pointer',
              gap: 2,
            }}
          >
            <span>Sceller au recueil</span>
            <span aria-hidden style={{ fontSize: 17, opacity: 0.85 }}>→</span>
          </button>
        </motion.div>

        {/* ── FOOTER LINKS ── */}
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0', paddingBottom: 4, marginBottom: 8 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          <button
            onClick={() => parlant ? arreter() : parler(texteAffiche)}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.12em', color: parlant ? accent : encre, opacity: parlant ? 0.9 : 0.5, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}
          >
            {parlant ? '◾ RÉCITER' : '— RÉCITER —'}
          </button>
          <button
            onClick={partager}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.12em', color: partageOk ? accent : encre, opacity: partageOk ? 0.9 : 0.5, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', padding: '2px 0' }}
          >
            {partageOk ? '✓ COPIÉ' : '— PARTAGER —'}
          </button>
          <button
            onClick={() => setActiveSection(s => s === 'coutures' ? null : 'coutures')}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.12em', color: activeSection === 'coutures' ? accent : encre, opacity: activeSection === 'coutures' ? 0.9 : 0.5, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}
          >
            — COUTURES —
          </button>
          <button
            onClick={() => setActiveSection(s => s === 'image' ? null : 'image')}
            style={{ ...mono, fontSize: 13, letterSpacing: '0.12em', color: activeSection === 'image' ? accent : encre, opacity: activeSection === 'image' ? 0.9 : 0.5, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right', padding: '2px 0' }}
          >
            — IMAGE —
          </button>
        </motion.div>

        {/* ── COUTURES PANEL ── */}
        <AnimatePresence>
          {activeSection === 'coutures' && (
            <motion.div
              key="coutures"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 mb-6"
            >
              <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15 }} />
              {poeme.cases.map((c, i) => {
                const iaNum = c.voixSlot ?? poeme.cases.slice(0, i).filter(x => x.auteur === 'ia').length + 1
                return (
                  <div key={i} style={{ borderLeft: `2px solid ${accent}30`, paddingLeft: 12, paddingTop: 2, paddingBottom: 2 }}>
                    <p style={{ ...mono, fontSize: 17, color: accent, opacity: 0.7, marginBottom: 3 }}>
                      {c.fonction.toUpperCase()}
                      <span style={{ color: encre, opacity: 0.35, margin: '0 6px' }}>—</span>
                      <span style={{ fontFamily: "'Playfair Display', serif" }}>
                        {c.auteur === 'ia' ? `voix ${iaNum}` : c.joueurNumero ? `joueur ${c.joueurNumero}` : 'toi'}
                      </span>
                      {c.fallback && (
                        <span style={{
                          fontSize: 17,
                          letterSpacing: '0.18em',
                          border: `1px solid ${accent}55`,
                          color: accent,
                          opacity: 0.55,
                          padding: '1px 5px',
                          borderRadius: 2,
                          marginLeft: 7,
                          fontFamily: "'Raleway', sans-serif",
                          verticalAlign: 'middle',
                        }}>
                          RÉSERVE
                        </span>
                      )}
                    </p>
                    <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17, lineHeight: 1.4 }}>
                      {c.texte}
                    </p>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── IMAGE PANEL ── */}
        <AnimatePresence>
          {activeSection === 'image' && (
            <motion.div
              key="image"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="mb-6"
            >
              <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15, marginBottom: 16 }} />

              {/* Prompt libre */}
              <div className="mb-4">
                <input
                  type="text"
                  value={promptLibre}
                  onChange={e => setPromptLibre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && promptLibre.trim()) choisirStyle(styleChoisi || 'libre') }}
                  placeholder="Direction artistique libre… (ex. : sombre et organique)"
                  className="champ-carnet w-full text-sm"
                  style={{ borderLeftColor: accent }}
                />
                {promptLibre.trim() && (
                  <button
                    onClick={() => choisirStyle(styleChoisi || 'libre')}
                    style={{ ...mono, fontSize: 17, color: accent, background: 'none', border: `0.5px solid ${accent}50`, padding: '8px 12px', cursor: 'pointer', marginTop: 8, width: '100%' }}
                  >
                    ✦ GÉNÉRER AVEC CETTE DIRECTION
                  </button>
                )}
              </div>

              {erreurIllustration && (
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: accent, opacity: 0.7, textAlign: 'center', marginBottom: 10 }}>
                  {erreurIllustration}
                </p>
              )}

              {/* Style buttons */}
              {!generatingIllustration && (
                <div className="flex flex-col gap-2">
                  {/* Regenerate if we have an image */}
                  {illustrationUrl && (
                    <button
                      onClick={() => styleChoisi && choisirStyle(styleChoisi)}
                      style={{ ...mono, fontSize: 17, color: encre, opacity: 0.8, background: 'none', border: `0.5px solid ${encre}20`, padding: '8px', cursor: 'pointer' }}
                    >
                      ↺ RELANCER
                    </button>
                  )}
                  {STYLES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => choisirStyle(s.id)}
                      style={{
                        ...mono, fontSize: 17,
                        color: styleChoisi === s.id && illustrationUrl ? accent : encre,
                        opacity: styleChoisi === s.id && illustrationUrl ? 0.9 : 0.55,
                        background: 'transparent',
                        border: `0.5px solid ${styleChoisi === s.id && illustrationUrl ? accent : `${encre}20`}`,
                        padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              {/* Prompt IA reveal */}
              {promptVisuel && !generatingIllustration && (
                <div className="flex flex-col items-center mt-3">
                  <button
                    onClick={() => setPromptVisible(v => !v)}
                    style={{ ...mono, fontSize: 17, color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {promptVisible ? '↑ MASQUER LE PROMPT' : '→ VOIR LE PROMPT IA'}
                  </button>
                  {promptVisible && (
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, marginTop: 6, textAlign: 'center', lineHeight: 1.5, maxWidth: 280 }}>
                      {promptVisuel}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NOUVELLE PARTIE ── */}
        <motion.div
          className="flex justify-center mt-4 pb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          <button
            onClick={() => navigate('/config')}
            style={{ ...mono, fontSize: 17, color: encre, opacity: 0.75, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            — NOUVELLE PARTIE —
          </button>
        </motion.div>

      </div>
    </PageTransition>
    </>
  )
}
