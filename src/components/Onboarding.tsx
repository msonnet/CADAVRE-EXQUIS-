import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useReve } from '../reve'

const ONBOARDING_KEY = 'cadavre-onboarding-done'

interface Slide {
  title: string
  body: React.ReactNode
  hint?: React.ReactNode
}

// La phrase fondatrice de 1925 — rendue avec trois groupes staggerés
function PhraseFondatrice({ accent, ink }: { accent: string; ink: string }) {
  const groupes = [
    { texte: '« Le cadavre exquis »', color: accent },
    { texte: 'boira', color: ink },
    { texte: 'le vin nouveau.', color: `${accent}cc` },
  ]
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
        fontSize: 'clamp(1.2rem, 5vw, 1.5rem)', lineHeight: 1.9,
        display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
      }}>
        {groupes.map((g, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.42, duration: 0.5, ease: 'easeOut' }}
            style={{ color: g.color, display: 'block' }}
          >
            {g.texte}
          </motion.span>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.72 }}
        transition={{ delay: 1.7, duration: 0.6 }}
        style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 13,
          letterSpacing: '0.05em', color: ink,
          marginTop: 20, lineHeight: 1.55,
        }}
      >
        Trois joueurs ont écrit cette phrase — sans jamais se lire.
        <br />A vous, dans trente secondes.
      </motion.p>
    </div>
  )
}

function makeSlides(accent: string, ink: string): Slide[] {
  return [
    {
      title: 'Le cadavre exquis',
      body: "Un jeu surréaliste inventé en 1925. Chaque joueur contribue à une œuvre commune — sans voir ce qu'ont écrit ou dessiné les autres.",
      hint: '✦ ✦ ✦',
    },
    {
      title: 'Personne ne voit rien.',
      body: <PhraseFondatrice accent={accent} ink={ink} />,
    },
    {
      title: 'Deux façons de jouer',
      body: (
        <>
          <strong>Cadavre écrit</strong>
          {" — composez un poème à plusieurs mains, avec ou sans l'IA."}
          <br /><br />
          <strong>Cadavre dessiné</strong>
          {' — dessinez chaque bande sans voir les autres. Jouez seul, à plusieurs ou en ligne.'}
        </>
      ),
      hint: '❆',
    },
  ]
}

function readOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

function writeOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* ignore */
  }
}

export default function Onboarding() {
  const seance = useReve()
  const [visible, setVisible] = useState<boolean>(false)
  const [index, setIndex] = useState<number>(0)

  useEffect(() => {
    if (!readOnboardingDone()) setVisible(true)
  }, [])

  const accent = seance?.accent.hex ?? '#b22c20'
  const bg = seance?.ambiance.bg ?? '#15110d'
  const ink = seance?.ambiance.ink ?? '#e6d4b8'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const SLIDES = makeSlides(accent, ink)

  const close = (): void => {
    writeOnboardingDone()
    setVisible(false)
  }

  const next = (): void => {
    if (index < SLIDES.length - 1) {
      setIndex(index + 1)
    } else {
      close()
    }
  }

  if (!visible) return null

  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 9999,
  }

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    padding: 32,
    background: bg,
    borderRadius: 14,
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
  }

  const skipStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 14,
    background: 'none',
    border: 'none',
    color: ink,
    opacity: 0.5,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: 17,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: 4,
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Bodoni Moda', serif",
    fontWeight: 700,
    fontSize: 28,
    lineHeight: 1.15,
    color: ink,
    margin: 0,
    marginBottom: 16,
  }

  const bodyStyle: React.CSSProperties = {
    fontFamily: "'Playfair Display', serif",
    fontSize: 17,
    lineHeight: 1.65,
    color: ink,
    opacity: 0.85,
    margin: 0,
  }

  const hintStyle: React.CSSProperties = {
    fontFamily: "'Bodoni Moda', serif",
    fontSize: 22,
    color: accent,
    letterSpacing: '0.4em',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 4,
  }

  const dotsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 20,
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    background: accent,
    color: btnText,
    border: 'none',
    borderRadius: 10,
    fontFamily: "'Inter', sans-serif",
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div style={cardStyle}>
        <button type="button" onClick={close} style={skipStyle} aria-label="Passer l'introduction">
          Passer
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <h2 style={titleStyle}>{slide.title}</h2>
            <p style={bodyStyle}>{slide.body}</p>
            {slide.hint && <div style={hintStyle}>{slide.hint}</div>}
          </motion.div>
        </AnimatePresence>

        <div style={dotsStyle} aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: i === index ? accent : ink,
                opacity: i === index ? 1 : 0.3,
                transition: 'background 0.2s, opacity 0.2s',
              }}
            />
          ))}
        </div>

        <button type="button" onClick={next} style={buttonStyle}>
          {isLast ? 'Commencer →' : 'Suivant'}
        </button>
      </div>
    </div>
  )
}
