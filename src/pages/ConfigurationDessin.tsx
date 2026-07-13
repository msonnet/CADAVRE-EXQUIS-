import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SectionAide from '../components/SectionAide'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import type { ConfigDessin } from '../types'
import { mono } from '../lib/typo'
import { tr } from '../i18n'

const CONFIG_PAR_DEFAUT: ConfigDessin = {
  nbBandes: 3,
  joueurs: 2,
  visibilite: 'raccord',
}

type SlotType = 'vide' | 'humain'

export default function ConfigurationDessin() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const [config, setConfig] = useState<ConfigDessin>(CONFIG_PAR_DEFAUT)

  const [slots, setSlots] = useState<SlotType[]>(() => {
    const result: SlotType[] = Array(6).fill('vide') as SlotType[]
    for (let i = 0; i < CONFIG_PAR_DEFAUT.joueurs && i < 6; i++) result[i] = 'humain'
    return result
  })

  const joueurs = Math.max(1, slots.filter(s => s === 'humain').length)

  useEffect(() => {
    setConfig(prev => ({ ...prev, joueurs }))
  }, [joueurs])

  function cyclerSlot(i: number) {
    setSlots(prev => {
      const next = [...prev] as SlotType[]
      if (next[i] === 'humain' && prev.filter(s => s === 'humain').length <= 1) return prev
      next[i] = next[i] === 'humain' ? 'vide' : 'humain'
      return next
    })
  }

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''

  const totalBandes = config.nbBandes
  const cycleNote = joueurs < totalBandes
    ? tr(`les ${joueurs} joueurs se partagent ${totalBandes} bandes — certains dessinent deux fois`, `the ${joueurs} players share ${totalBandes} bands — some draw twice`)
    : joueurs === totalBandes
      ? tr(`${joueurs} joueur${joueurs > 1 ? 's' : ''} · ${totalBandes} bande${totalBandes > 1 ? 's' : ''}`, `${joueurs} player${joueurs > 1 ? 's' : ''} · ${totalBandes} band${totalBandes > 1 ? 's' : ''}`)
      : tr(`${joueurs} joueurs se partagent ${totalBandes} bandes`, `${joueurs} players share ${totalBandes} bands`)

  function demarrer() {
    jouer('demarrage')
    sessionStorage.setItem('config-dessin', JSON.stringify(config))
    sessionStorage.removeItem('dessin-bandes')
    navigate('/jeu-dessin')
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="config-dessin" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('ACCUEIL', 'HOME')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 22, marginBottom: 8 }}>
          {tr('— CADAVRE DESSINÉ —', '— DRAWN CADAVRE —')}
        </div>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginBottom: 20 }}
        >
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 6 }}
          >
            {tr('Préparer le', 'Prepare the')} <span style={{ color: accent }}>{tr('rituel.', 'ritual.')}</span>
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── BANDES ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: 18 }}>
          <SectionAide
            label={tr('FRAGMENTS', 'FRAGMENTS')} accent={accent} encre={encre}
            aide={<>{tr("Le dessin est découpé en bandes horizontales — tête, corps, jambes… Chacun dessine la sienne sans voir les autres, et l'assemblage final est la surprise.", 'The drawing is split into horizontal bands — head, body, legs… Each player draws their own without seeing the others, and the final assembly is the surprise.')}</>}
          />
          <div className="flex gap-2">
            {[2, 3, 4, 5].map(n => {
              const active = config.nbBandes === n
              const labels = ['', '', 'tête · corps', 'tête · corps · jambes', 'tête · corps · taille · jambes', 'tête · buste · ventre · hanches · jambes']
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, nbBandes: n }))}
                  style={{
                    flex: 1, padding: '10px 4px', minHeight: 44,
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: active ? `${accent}08` : 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── AUTOUR DE LA TABLE ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} style={{ marginBottom: 18 }}>
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            {tr('— AUTOUR DE LA TABLE —', '— AROUND THE TABLE —')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => cyclerSlot(i)}
                aria-label={slot === 'vide' ? tr('Ajouter un dessinateur', 'Add an artist') : tr('Retirer ce dessinateur', 'Remove this artist')}
                style={{
                  width: 44, height: 44, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `0.5px solid ${slot === 'vide' ? `${encre}20` : encre}`,
                  background: slot === 'vide' ? 'transparent' : `${encre}10`,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  fontSize: 20,
                  borderRadius: 3,
                }}
              >
                {slot === 'vide' ? (
                  <span style={{ color: `${encre}20`, fontSize: 14 }}>·</span>
                ) : (
                  <span style={{
                    display: 'block', width: 10, height: 10,
                    background: encre, borderRadius: 1,
                  }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.80, fontStyle: 'italic', lineHeight: 1.55 }}>
            {cycleNote}
          </div>
          {joueurs > 1 && (
            <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.5, marginTop: 7, lineHeight: 1.55 }}>
              {tr("Passe l'appareil de main en main — chaque dessinateur replie l'écran avant de passer.", 'Pass the device from hand to hand — each artist folds the screen before passing it on.')}
            </div>
          )}
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginBottom: 20 }}>
          <SectionAide
            label={tr('VISIBILITÉ', 'VISIBILITY')} accent={accent} encre={encre}
            aide={<>{tr("Aveugle : chaque bande commence dans l'obscurité totale. Raccord : un mince raccord révèle la lisière du fragment précédent, pour prolonger les traits.", 'Blind: each band begins in total darkness. Joined: a thin strip reveals the edge of the previous fragment, so you can extend its strokes.')}</>}
          />
          <div className="flex gap-2 mb-2">
            {([
              { id: 'aveugle', label: tr('AVEUGLE', 'BLIND') },
              { id: 'raccord', label: tr('RACCORD', 'JOINED') },
            ] as const).map(v => {
              const active = config.visibilite === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setConfig(c => ({ ...c, visibilite: v.id }))}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: active ? `${accent}08` : 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={demarrer}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: btnText,
              ...mono, fontSize: 17, textTransform: 'uppercase',
              padding: '1.15em 1em', border: 'none', cursor: 'pointer', gap: 2,
              borderRadius: 3,
            }}
          >
            <span>{tr('Commencer le dessin', 'Start drawing')} →</span>
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
