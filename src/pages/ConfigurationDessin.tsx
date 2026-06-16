import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { PapierCard, Etiquette, ENCRE_PAPIER } from '../components/Papier'
import type { ConfigDessin } from '../types'

// Intitulé de section = étiquette d'accent collée (même langage que
// Configuration.tsx), à la place de l'ancien « — TITRE — » en filet typo.
function Section({ children, accent, color, style }: {
  children: React.ReactNode; accent: string; color: string; style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <Etiquette bg={accent} color={color} rotation={-1.4} style={{ fontSize: 11, letterSpacing: '0.14em' }}>
        {children}
      </Etiquette>
    </div>
  )
}

const CONFIG_PAR_DEFAUT: ConfigDessin = {
  nbBandes: 3,
  joueurs: 2,
  visibilite: 'raccord',
}

type SlotType = 'vide' | 'humain'

// Références historiques au cadavre exquis dessiné
const REFS = [
  { titre: 'Le cadavre exquis boira le vin nouveau', auteurs: 'Breton, Éluard, Morise, Man Ray', annee: '1925' },
  { titre: 'Premier cadavre dessiné collectif', auteurs: 'André Breton et ses amis', annee: '1927' },
  { titre: 'Exquisite Corpse (Drawing)', auteurs: 'Yves Tanguy, Joan Miró, Max Morise, Man Ray', annee: '1928' },
]

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
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  // bouton-étiquette accent collé quand actif (même langage que Configuration.tsx)
  const ongletStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px 4px', minHeight: 44, borderRadius: 2,
    border: `0.5px solid ${active ? 'transparent' : `${encre}20`}`,
    background: active ? accent : 'transparent',
    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.22)' : 'none',
    transform: active ? 'rotate(-0.8deg)' : 'none',
    ...mono, fontSize: 13, fontWeight: active ? 800 : 400,
    color: active ? btnText : `${encre}80`,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  const ref = REFS[(seance?.seed ?? 0) % REFS.length]
  const totalBandes = config.nbBandes
  const cycleNote = joueurs < totalBandes
    ? `les ${joueurs} joueurs se partagent ${totalBandes} bandes — certains dessinent deux fois`
    : joueurs === totalBandes
      ? `${joueurs} joueur${joueurs > 1 ? 's' : ''} · ${totalBandes} bande${totalBandes > 1 ? 's' : ''}`
      : `${joueurs} joueurs se partagent ${totalBandes} bandes`

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
            ← ACCUEIL
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <Section accent={accent} color={btnText} style={{ marginTop: 22, marginBottom: 10 }}>CADAVRE DESSINÉ</Section>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginBottom: 20 }}
        >
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', color: encre, marginBottom: 6 }}
          >
            Préparer le <span style={{ color: accent }}>rituel.</span>
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── BANDES ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: 18 }}>
          <Section accent={accent} color={btnText} style={{ marginBottom: 10 }}>FRAGMENTS</Section>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.8, marginBottom: 8 }}>
            Nombre de bandes horizontales à dessiner
          </div>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map(n => {
              const active = config.nbBandes === n
              return (
                <button
                  key={n}
                  onClick={() => setConfig(c => ({ ...c, nbBandes: n }))}
                  style={ongletStyle(active)}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── AUTOUR DE LA TABLE ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} style={{ marginBottom: 18 }}>
          <Section accent={accent} color={btnText} style={{ marginBottom: 12 }}>AUTOUR DE LA TABLE</Section>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => cyclerSlot(i)}
                aria-label={slot === 'vide' ? 'Ajouter un dessinateur' : 'Retirer ce dessinateur'}
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
              Passe l'appareil de main en main — chaque dessinateur replie l'écran avant de passer.
            </div>
          )}
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginBottom: 20 }}>
          <Section accent={accent} color={btnText} style={{ marginBottom: 10 }}>VISIBILITÉ</Section>
          <div className="flex gap-2 mb-2">
            {([
              { id: 'aveugle', label: 'AVEUGLE' },
              { id: 'raccord', label: 'RACCORD' },
            ] as const).map(v => {
              const active = config.visibilite === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setConfig(c => ({ ...c, visibilite: v.id }))}
                  style={ongletStyle(active)}
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.8 }}>
            {config.visibilite === 'aveugle'
              ? 'Chaque bande commence dans l\'obscurité totale.'
              : 'Un raccord révèle la lisière du fragment précédent.'}
          </div>
        </motion.div>

        {/* ── CITATION HISTORIQUE — carton de papier, étiquette d'auteurs
            agrafée au coin (même langage que la citation de l'accueil) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ marginBottom: 26 }}
        >
          <PapierCard
            rotation={0.9}
            bord="dechire1"
            bordure={`${accent}55`}
            style={{ padding: '12px 14px 14px' }}
          >
            <div style={{
              fontFamily: "'Playfair Display', serif", fontSize: 18, lineHeight: 1.5,
              color: ENCRE_PAPIER, fontStyle: 'italic',
            }}>
              « {ref.titre} »
            </div>
          </PapierCard>
          {/* étiquette d'auteurs — la liste peut être longue (collectifs à
              plusieurs noms), donc en flux normal et autorisée à passer à la
              ligne plutôt qu'épinglée en absolu hors cadre comme à l'accueil */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -11, paddingRight: 14 }}>
            <Etiquette
              bg={accent}
              color={btnText}
              rotation={-2.2}
              style={{
                fontSize: 11.5, padding: '4px 9px',
                whiteSpace: 'normal', textAlign: 'right', lineHeight: 1.35, maxWidth: '85%',
              }}
            >
              {ref.auteurs.toUpperCase()} · {ref.annee}
            </Etiquette>
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
              borderRadius: 2, transform: 'rotate(-0.6deg)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.28)',
            }}
          >
            <span>Commencer le dessin →</span>
          </button>
        </motion.div>

      </div>
    </PageTransition>
  )
}
