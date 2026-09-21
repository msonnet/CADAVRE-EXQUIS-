import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { lireSerie, type Serie } from '../utils/streak'
import { rearmerRappelSiActif } from '../utils/notifications'
import { tr } from '../i18n'

const ONBOARDING_KEY = 'cadavre-onboarding-done'
function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

export default function Accueil() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  // L'ouverture de l'accueil = le passage du jour : on pointe la série une fois.
  // La série ne se pointe plus à l'OUVERTURE : elle comptait les fois où
  // l'on poussait la porte, pas les poèmes écrits. C'est le dernier
  // fragment du cadavre du jour qui l'incrémente désormais (`Jeu.tsx`).
  const [serie] = useState<Serie>(() => lireSerie())

  // Premier lancement : au lieu d'un onboarding lu, on emmène directement le
  // joueur dans une partie Découverte (il vit une révélation avant qu'on lui
  // demande quoi que ce soit). La Découverte marque l'intro comme vue → ceci
  // ne se déclenche qu'une seule fois, jamais en boucle.
  useEffect(() => {
    let vu = true
    try { vu = localStorage.getItem(ONBOARDING_KEY) === '1' } catch { /* ignore */ }
    if (!vu) navigate('/decouverte', { replace: true })
  }, [navigate])

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    // Si le rappel quotidien était activé, on s'assure qu'il est toujours armé.
    rearmerRappelSiActif()
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

  function nav(to: string) {
    jouer('clic')
    navigate(to)
  }

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const second = c?.second ?? '#1d3a8c'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const num = String(((seance?.seed ?? 0) % 999) + 1).padStart(3, '0')
  const annee = toRomain(new Date().getFullYear())
  const idxBiais = seance?.idxBiais ?? -1
  const angleBiais = seance?.angleBiais ?? 0
  const letters = 'Exquis'

  const bg = c?.bg ?? '#0f0805'
  const ui: React.CSSProperties = { fontFamily: "'Raleway', sans-serif" }

  const cadavreSide = seance?.symbolSide === 'right' ? 'left' : 'right'
  const exquisStyle: React.CSSProperties = cadavreSide === 'right'
    ? { paddingRight: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-end', textAlign: 'right' }
    : { paddingLeft: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-start', textAlign: 'left' }

  return (
    <PageTransition className="page-carnet relative flex flex-col h-dvh overflow-hidden safe-top safe-bottom">

      <Decor variant="accueil" hideCitation hideSignature />

      {/* ── HEADER ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          ...ui, fontSize: 13, letterSpacing: '0.1em',
          color: encre, opacity: 0.7, whiteSpace: 'nowrap',
        }}>
          N° {num} · {annee}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <button
            onClick={() => seance?.retirer()}
            title={tr('Re-tirer un rêve', 'Draw a new dream')}
            aria-label={tr('Tirer une nouvelle ambiance', 'Draw a new ambience')}
            style={{
              ...ui, fontSize: 15, color: accent, opacity: 0.9,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 10px', margin: '-12px -4px',
            }}
          >✦</button>
          <span style={{
            ...ui, fontSize: 13, letterSpacing: '0.1em',
            color: accent, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            {colorLabel}
          </span>
        </div>
      </div>

      <hr style={{
        border: 'none', borderTop: `1.2px solid ${accent}`,
        marginTop: 6, opacity: 0.45, position: 'relative', zIndex: 10,
      }} />
      {(serie.compte >= 2 || seance?.heure) && (
        <div style={{
          position: 'relative', zIndex: 10, marginTop: 3,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          ...ui, fontSize: 11, letterSpacing: '0.06em',
          color: accent, opacity: 0.5,
        }}>
          <span>
            {serie.compte >= 2 ? `✦ ${toRomain(serie.compte)}ᵉ nuit de suite` : ''}
          </span>
          {seance?.heure && <span>{tr('rêvé à', 'dreamt at')} {seance.heure}</span>}
        </div>
      )}

      {/* ── ZONE CENTRALE ── */}
      <div className="relative flex flex-col flex-1 justify-end" style={{ zIndex: 10 }}>

        {/* Accent vertical éditorial — chiffre de séance */}
        <motion.div
          style={{
            position: 'absolute',
            top: '8%',
            ...(cadavreSide === 'right' ? { left: 0 } : { right: 0 }),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontFamily: "'Raleway', sans-serif",
            fontSize: 9,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.30,
            userSelect: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.30 }}
          transition={{ duration: 1.4, delay: 0.8 }}
        >
          {num} · {annee}
        </motion.div>

        <motion.div
          className="mb-3"
          style={exquisStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.3 }}
        >
          <div
            className="font-fraunces font-black"
            style={{
              fontSize: 'clamp(5rem, 22vw, 9rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              color: accent,
            }}
          >
            {[...letters].map((l, i) => (
              <span key={i} style={{
                display: 'inline-block',
                transform: i === (idxBiais % letters.length)
                  ? `rotate(${angleBiais}deg) translateY(${angleBiais > 0 ? 2 : -2}px)`
                  : 'none',
                transformOrigin: 'center bottom',
              }}>{l}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── PLI — Citation + CTAs + Footer s'ouvrent comme une feuille pliée ── */}
      <motion.div
        style={{
          position: 'relative', zIndex: 10,
          transformPerspective: 900,
          transformOrigin: 'top center',
        }}
        initial={{ rotateX: -72, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Ligne de pli — l'encre de la charnière */}
        <div style={{
          height: 10,
          marginBottom: 6,
          background: `linear-gradient(to bottom, transparent, ${encre}12 49%, ${encre}22 50%, transparent)`,
        }} />

        {/* ── CITATION ── */}
        {seance?.citation && (
          <div style={{ marginBottom: 14 }}>
            <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.18, marginBottom: 10 }} />
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 17, lineHeight: 1.5,
              color: encre, display: '-webkit-box', fontStyle: 'italic',
              overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              {seance.citation.t}
            </span>
            <div style={{
              ...ui, fontSize: 13, letterSpacing: '0.1em', fontWeight: 700,
              textTransform: 'uppercase', color: accent, marginTop: 5,
            }}>
              {seance.citation.a}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => nav('/config')}
              style={{
                flex: 1, minWidth: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: accent, color: bg,
                ...ui, fontSize: 'clamp(11px, 3.8vw, 15px)', letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '0.9em 0.5em', border: 'none', cursor: 'pointer',
                borderRadius: 3, whiteSpace: 'nowrap',
              }}
            >
              {tr('Cadavre Écrit', 'Written Cadavre')}
            </button>
            <button
              onClick={() => nav('/config-dessin')}
              style={{
                flex: 1, minWidth: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: second, color: bg,
                ...ui, fontSize: 'clamp(11px, 3.8vw, 15px)', letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '0.9em 0.5em', border: 'none', cursor: 'pointer',
                borderRadius: 3, whiteSpace: 'nowrap',
              }}
            >
              {tr('Cadavre Dessiné', 'Drawn Cadavre')}
            </button>
          </div>
          <button
            onClick={() => nav('/online')}
            style={{
              width: '100%', marginTop: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: 'transparent', color: encre,
              ...ui, fontSize: 17, letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '0.55em 1em', border: `1px solid ${encre}40`, cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            <span>{tr('Mode en ligne', 'Online mode')}</span>
          </button>
        </div>

        {/* ── FOOTER ──
             Le cadavre du jour tient la colonne du MILIEU, entre les quatre
             entrées du pied. Il occupait d'abord toute la largeur au-dessus
             des boutons de jeu, où il pesait autant que « Cadavre écrit » —
             or ce n'est pas un mode de jeu de plus, c'est un rendez-vous. Au
             centre, il est vu sans rien écraser : le sceau d'un almanach au
             milieu de sa page. */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          gap: '4px 0', paddingBottom: 4, alignItems: 'center',
        }}>
          {[
            { label: tr('Recueil', 'Collection'), path: '/bibliotheque', col: 1, row: 1 },
            { label: tr('Galerie', 'Gallery'),  path: '/galerie',       col: 3, row: 1, align: 'right' },
            { label: tr('Règles', 'Rules'),   path: '/aide',          col: 1, row: 2 },
            { label: tr('Réglages', 'Settings'), path: '/reglages',      col: 3, row: 2, align: 'right' },
          ].map(({ label, path, align, col, row }) => (
            <button
              key={path}
              onClick={() => nav(path)}
              style={{
                ...ui, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: encre, opacity: 0.65, fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: (align as 'right') ?? 'left',
                padding: '10px 0',
                gridColumn: col, gridRow: row,
              }}
            >
              {label}
            </button>
          ))}

          {/* Le sceau du jour.
              Premier jet : le QUANTIÈME en Bodoni, « 16 », au motif qu'il
              dirait « aujourd'hui » sans l'écrire, comme le « N° 1.42 ·
              MMXXVI » de l'en-tête. Illisible : entre RECUEIL, GALERIE,
              RÈGLES et RÉGLAGES, un nombre nu peut être un compte, une
              version, un numéro de feuillet. Le procédé ne marche dans
              l'en-tête que parce que le mot « N° » l'accompagne.
              Le mot d'abord, donc. L'état tient dans la marque : ✧ en
              attente, ✦ une fois écrit — c'est déjà le vocabulaire de la
              série, « ✦ IIᵉ nuit de suite ». */}
          <button
            onClick={() => nav('/poeme-du-jour')}
            aria-label={tr('Le poème du jour', 'The poem of the day')}
            title={tr('Le poème du jour', 'The poem of the day')}
            style={{
              gridColumn: 2, gridRow: '1 / 3',
              justifySelf: 'center', alignSelf: 'center',
              width: 52, height: 52, borderRadius: '50%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              background: 'none', cursor: 'pointer',
              border: `1px solid ${accent}`,
              transition: 'border-color 0.3s',
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1, color: accent }}>✧</span>
            <span style={{
              ...ui, fontSize: 9, letterSpacing: '0.14em', fontWeight: 700,
              color: accent, opacity: 0.9,
            }}>
              {tr('JOUR', 'DAY')}
            </span>
          </button>
          {/* Entrée discrète — l'atelier du recueil */}
          <button
            onClick={() => nav('/atelier')}
            style={{
              ...ui, gridColumn: '1 / -1', gridRow: 3, fontSize: 11, letterSpacing: '0.3em',
              textTransform: 'uppercase', color: encre, opacity: 0.35,
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'center', padding: '7px 0 2px',
            }}
          >
            ✧ l'atelier ✧
          </button>
        </div>

      </motion.div>

    </PageTransition>
  )
}
