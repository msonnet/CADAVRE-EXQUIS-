import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SectionAide from '../components/SectionAide'
import { useSound } from '../hooks/useSound'
import { Decor, useReve } from '../reve'
import type { ConfigPartie, StructureId, Visibilite } from '../types'

const STRUCTURES: { id: StructureId; romain: string; label: string; description: string; detail: string }[] = [
  { id: 'phrase-simple',  romain: 'I',   label: 'Phrase courte',  description: '3 cases · sujet, verbe, complément', detail: 'La forme la plus directe — une phrase surréaliste en trois fragments.' },
  { id: 'phrase-etoffee', romain: 'II',  label: 'Phrase étoffée', description: '5 cases · la canonique de Breton',  detail: 'La structure originale inventée en 1925 : « Le cadavre exquis boira le vin nouveau » — article+nom · adjectif · verbe · article+nom · adjectif.' },
  { id: 'vers-libre',     romain: 'III', label: 'Vers libre',     description: '4 à 12 vers · sans contrainte',     detail: 'Chaque joueur écrit un vers entier. Le poème s\'assemble sans règle grammaticale.' },
]

type SlotType = 'vide' | 'humain' | 'ia'

const CONFIG_PAR_DEFAUT: ConfigPartie = {
  structureId: 'phrase-etoffee',
  visibilite: 'aveugle',
  premierJoueur: 'ia',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 1,
}

function descriptionTable(humains: number, ia: number): string {
  const mains = humains === 1 ? '1 main' : `${humains} mains`
  if (ia === 0) return `${mains} — la séance peut commencer.`
  const voix = ia === 1 ? '1 voix' : `${ia} voix`
  return `${mains}, ${voix} — la séance peut commencer.`
}

export default function Configuration() {
  const navigate = useNavigate()
  const { jouer } = useSound()
  const seance = useReve()

  const [slots, setSlots] = useState<SlotType[]>(() => {
    const h = CONFIG_PAR_DEFAUT.joueursHumains
    const ia = CONFIG_PAR_DEFAUT.voixIA
    const result: SlotType[] = Array(6).fill('vide') as SlotType[]
    for (let i = 0; i < h && i < 6; i++) result[i] = 'humain'
    for (let i = h; i < h + ia && i < 6; i++) result[i] = 'ia'
    return result
  })

  const [config, setConfig] = useState<ConfigPartie>(CONFIG_PAR_DEFAUT)

  const joueursHumains = Math.max(1, slots.filter(s => s === 'humain').length)
  const voixIA = slots.filter(s => s === 'ia').length

  useEffect(() => {
    setConfig(prev => ({ ...prev, joueursHumains, voixIA }))
  }, [joueursHumains, voixIA])

  function cyclerSlot(i: number) {
    setSlots(prev => {
      const next = [...prev] as SlotType[]
      const cycle: SlotType[] = ['vide', 'humain', 'ia']
      const currentIdx = cycle.indexOf(next[i])
      const nextType = cycle[(currentIdx + 1) % 3]
      // Prevent removing the last human
      if (next[i] === 'humain' && prev.filter(s => s === 'humain').length <= 1) return prev
      next[i] = nextType
      return next
    })
  }

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  function demarrer() {
    jouer('demarrage')
    // Purge : un brouillon périmé écraserait cette config, et le drapeau
    // découverte forcerait le passage manuel des tours IA.
    localStorage.removeItem('brouillon-actuel')
    sessionStorage.removeItem('decouverte')
    sessionStorage.setItem('config-partie', JSON.stringify(config))
    navigate('/jeu')
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="config" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← SORTIR
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── SECTION LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          — PRÉPARATIFS —
        </div>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 18 }}
          >
            Choisir la{' '}
            <span style={{ color: accent }}>structure.</span>
          </div>
        </motion.div>

        {/* ── STRUCTURE CARDS ── */}
        <div className="flex flex-col gap-2 mb-8">
          {STRUCTURES.map((s, i) => {
            const active = config.structureId === s.id
            return (
              <motion.button
                key={s.id}
                onClick={() => setConfig(prev => ({ ...prev, structureId: s.id }))}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 14px',
                  background: active ? `${accent}12` : 'transparent',
                  border: `0.5px solid ${active ? accent : `${encre}20`}`,
                  borderLeft: `3px solid ${active ? accent : 'transparent'}`,
                  borderRadius: 3,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, minWidth: 26, paddingTop: 2 }}>
                  {s.romain}.
                </span>
                <div>
                  <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 17, color: encre, marginBottom: 3 }}>
                    {s.label}
                  </div>
                  <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.60 }}>{s.description}</div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* ── VISIBILITÉ ── */}
        <div style={{ marginBottom: 18 }}>
          <SectionAide
            label="VISIBILITÉ" accent={accent} encre={encre}
            aide={<>Aveugle : tu écris sans rien voir des autres. Un mot : seul le dernier mot précédent t'est montré. Une case : toute la case précédente est révélée.</>}
          />
          <div className="flex gap-2">
            {(['aveugle', 'dernier-mot', 'derniere-case'] as Visibilite[]).map(v => {
              const active = config.visibilite === v
              return (
                <button
                  key={v}
                  onClick={() => setConfig(c => ({ ...c, visibilite: v }))}
                  style={{
                    flex: 1, padding: '8px 4px', minHeight: 44,
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {v === 'aveugle' ? 'AVEUGLE' : v === 'dernier-mot' ? 'UN MOT' : 'UNE CASE'}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── AUTOUR DE LA TABLE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ marginBottom: 18 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — AUTOUR DE LA TABLE —
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => cyclerSlot(i)}
                aria-label={slot === 'vide' ? 'Ajouter un joueur' : slot === 'humain' ? 'Joueur humain — changer' : 'Voix IA — changer'}
                style={{
                  width: 44, height: 44, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `0.5px solid ${slot === 'vide' ? `${encre}20` : slot === 'humain' ? encre : accent}`,
                  background: slot === 'vide' ? 'transparent' : slot === 'humain' ? `${encre}10` : `${accent}10`,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  fontSize: 20,
                  borderRadius: 3,
                }}
              >
                {slot === 'vide' && (
                  <span style={{ color: `${encre}20`, fontSize: 14 }}>·</span>
                )}
                {slot === 'humain' && (
                  <span style={{
                    display: 'block', width: 10, height: 10,
                    background: encre, borderRadius: 1,
                  }} />
                )}
                {slot === 'ia' && (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key="ia"
                      animate={{ opacity: [0.55, 1, 0.55] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ color: accent, display: 'inline-block' }}
                    >✦</motion.span>
                  </AnimatePresence>
                )}
              </button>
            ))}
          </div>
          <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginBottom: 8, letterSpacing: '0.08em' }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, background: encre, borderRadius: 1, verticalAlign: 'middle', marginRight: 4 }} />
            une main · <span style={{ color: accent }}>✦</span> une voix IA — toucher une case pour changer
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.80, fontStyle: 'italic', lineHeight: 1.55 }}>
            {descriptionTable(joueursHumains, voixIA)}
          </div>
        </motion.div>

        {/* ── PREMIER JOUEUR — uniquement solo avec IA ── */}
        {voixIA > 0 && joueursHumains === 1 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
              — OUVRE LA SÉANCE —
            </div>
            <div className="flex gap-2">
              {(['ia', 'humain'] as const).map(p => {
                const active = config.premierJoueur === p
                return (
                  <button
                    key={p}
                    onClick={() => setConfig(c => ({ ...c, premierJoueur: p }))}
                    style={{
                      flex: 1, padding: '8px 4px', minHeight: 44,
                      border: `0.5px solid ${active ? accent : `${encre}20`}`,
                      borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                      borderRadius: 3,
                      background: 'transparent', cursor: 'pointer',
                      ...mono, fontSize: 13,
                      color: active ? accent : `${encre}80`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {p === 'ia' ? 'VOIX IA' : 'JOUEUR'}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MODE ── */}
        <div style={{ marginBottom: 18 }}>
          <SectionAide
            label="MODE" accent={accent} encre={encre}
            aide={<>Standard : prends le temps qu'il faut pour chaque fragment. Hypnotique : 30 secondes par fragment, puis il se scelle de lui-même — l'écriture automatique, sans retour.</>}
          />
          <div className="flex gap-2">
            {(['standard', 'hypnotique'] as const).map(m => {
              const active = config.mode === m
              return (
                <button
                  key={m}
                  onClick={() => setConfig(c => ({ ...c, mode: m }))}
                  style={{
                    flex: 1, padding: '8px 4px', minHeight: 44,
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'standard' ? 'STANDARD' : 'HYPNOTIQUE'}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* ── CTA — sticky pour rester accessible même en bas de page ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileTap={{ scale: 0.98 }}
          style={{ position: 'sticky', bottom: 8 }}
        >
          <button
            onClick={demarrer}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: btnText,
              ...mono, fontSize: 17,
              textTransform: 'uppercase',
              padding: '1.15em 1em',
              border: 'none', cursor: 'pointer',
              gap: 2,
              borderRadius: 3,
            }}
          >
            <span>Commencer la séance</span>
            <span aria-hidden style={{ fontSize: 17, opacity: 0.85 }}>→</span>
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
