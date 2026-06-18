import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Onboarding from '../components/Onboarding'
import TeteCollage from '../components/TeteCollage'
import { PapierCard, Etiquette, usePapier } from '../components/Papier'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { pointerSerie, type Serie } from '../utils/streak'
import { rearmerRappelSiActif } from '../utils/notifications'

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
  const [serie] = useState<Serie>(() => pointerSerie())

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
  const accent2 = seance?.accent2.hex ?? accent
  const surAccent2 = seance?.ambiance.buttonText ?? '#fff'
  const encre = c?.encre ?? '#0f0805'
  // encre garantie lisible sur le fond de l'ambiance (contrairement à
  // `accent`, choisi pour les aplats de chips, pas pour du texte nu sur fond)
  const ink = seance?.ambiance.ink ?? encre
  const papier = usePapier()
  const colorLabel = c?.name.toUpperCase() ?? ''
  const num = String(((seance?.seed ?? 0) % 999) + 1).padStart(3, '0')
  const annee = toRomain(new Date().getFullYear())
  const idxBiais = seance?.idxBiais ?? -1
  const angleBiais = seance?.angleBiais ?? 0
  const letters = 'Exquis.'

  const ui: React.CSSProperties = { fontFamily: "'Raleway', sans-serif" }

  const cadavreSide = seance?.symbolSide === 'right' ? 'left' : 'right'
  const exquisStyle: React.CSSProperties = cadavreSide === 'right'
    ? { paddingRight: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-end', textAlign: 'right' }
    : { paddingLeft: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-start', textAlign: 'left' }

  return (
    <PageTransition className="page-carnet relative flex flex-col h-dvh overflow-hidden safe-top safe-bottom">

      <Decor variant="accueil" hideCitation hideSignature />
      <Onboarding />

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
            title="Re-tirer un rêve"
            style={{
              ...ui, fontSize: 13, color: accent, opacity: 0.9,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
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
        marginTop: 4, opacity: 0.45, position: 'relative', zIndex: 10,
      }} />
      {serie.compte >= 2 && (
        <div style={{
          position: 'relative', zIndex: 10, marginTop: 1,
          fontFamily: "'Caveat', cursive", fontWeight: 600,
          fontSize: 17, color: ink, opacity: 0.85,
        }}>
          ✦ {toRomain(serie.compte)}ᵉ nuit de suite
        </div>
      )}

      {/* ── ZONE CENTRALE ── titre + citation groupés sous le header ;
          pas de flexGrow ici — c'est le séparateur après qui absorbe le slack */}
      <div className="relative flex flex-col justify-start" style={{ zIndex: 10, flexShrink: 0, paddingTop: 18 }}>

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
          initial={{ opacity: 0, y: -22, rotate: -7 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* carton de papier découpé, posé sous le titre — la pièce maîtresse
              du poster-collage, donc la plus grande et la plus pivotée */}
          <PapierCard
            rotation={-1.6}
            bordure={seance?.ambiance.rule}
            papierBg={papier.bg}
            textureVariant={1}
            style={{
              position: 'relative', display: 'inline-block',
              boxShadow: '0 6px 18px rgba(0,0,0,0.32)',
              padding: 'clamp(3px, 1.2vw, 8px) clamp(12px, 4vw, 26px)',
            }}
          >
            {/* étiquette « Cadavre » agrafée au coin du carton — se lit avec
                « Exquis. » juste dessous comme le titre complet du jeu, en
                pleine opacité (remplace l'ancien filigrane vertical illisible) */}
            <Etiquette
              bg={accent2}
              color={surAccent2}
              rotation={-3}
              style={{
                position: 'absolute', top: -12, [cadavreSide]: 14,
                fontSize: 'clamp(13px, 4.2vw, 18px)', letterSpacing: '0.14em',
                padding: '5px 12px', boxShadow: '0 3px 9px rgba(0,0,0,0.3)', zIndex: 1,
              }}
            >
              Cadavre
            </Etiquette>
            <div
              className="font-fraunces font-black"
              style={{
                fontSize: 'clamp(4rem, 17vw, 7rem)',
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
          </PapierCard>
        </motion.div>

        {/* ── CITATION — groupée avec le titre, juste en dessous ── */}
        {seance?.citation && (
          <div style={{ position: 'relative', marginBottom: 13, marginTop: 2 }}>
            <PapierCard
              rotation={0.9}
              bord="net"
              bordure={seance.ambiance.rule}
              papierBg={papier.bg}
              textureVariant={2}
              style={{ boxShadow: '0 4px 13px rgba(0,0,0,0.28)', padding: '10px 13px 12px' }}
            >
              <span style={{
                fontFamily: "'Playfair Display', serif", fontSize: 16.5, lineHeight: 1.48,
                color: papier.encre, display: '-webkit-box', fontStyle: 'italic',
                overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}>
                {seance.citation.t}
              </span>
            </PapierCard>
            <span style={{
              position: 'absolute', right: 16, bottom: -19,
              fontFamily: "'Raleway', sans-serif", fontSize: 10.5, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap',
              color: ink, opacity: 0.62, transform: 'rotate(-2.2deg)',
            }}>
              {seance.citation.a}
            </span>
          </div>
        )}
      </div>

      {/* séparateur flexible : absorbe l'espace libre entre la citation et les
          têtes, quelle que soit la hauteur d'écran — ni le titre ni les têtes
          ne bougent quand l'écran est plus ou moins haut */}
      <div style={{ flexGrow: 1 }} />

      {/* ── PLI — CTAs + Footer s'ouvrent comme une feuille pliée ── */}
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
        {/* ── CTA — têtes-collages dont la composition ET la place de chaque
            espèce sont pilotées par le seed de l'ambiance.
            · la GÉOMÉTRIE est positionnelle (3 emplacements : a = haut-gauche,
              b = haut-droit, c = bas) et varie selon seed % 4 (4 arrangements) ;
            · la PERMUTATION décide quelle tête occupe quel emplacement selon
              seed % 6 (les 6 permutations de 3 éléments) — les têtes échangent
              donc leur place d'une ambiance à l'autre.
            Le label et la destination voyagent avec l'animal (l'éléphant reste
            « Cadavre Écrit », etc.), donc les 3 entrées du menu restent toujours
            atteignables. marginTop 24 garantit que l'attribution de la citation
            ne chevauche jamais les têtes, même quand le séparateur rétrécit. ── */}
        {(() => {
          // Emplacements (positionnels) : a (haut-gauche, translateX), b (haut-droit),
          // c (bas, marginLeft). Chaque arrangement règle width / marginTop / rotation.
          const ARRANGEMENTS = [
            { a: { w: '46%', mt: -95, tx: '-3%', rot: -3 }, b: { w: '42%', mt:  -8, rot:  4.5 }, c: { w: '49%', ml: '36%', mt: 6, rot: -2.5 } },
            { a: { w: '44%', mt: -55, tx:  '0%', rot: -2 }, b: { w: '44%', mt: -50, rot:  3.5 }, c: { w: '47%', ml: '14%', mt: 8, rot:  2.0 } },
            { a: { w: '40%', mt:   5, tx:  '0%', rot: -4 }, b: { w: '48%', mt: -85, rot:  3.0 }, c: { w: '50%', ml: '30%', mt: 4, rot:  3.0 } },
            { a: { w: '43%', mt: -40, tx: '-2%', rot:-1.5 }, b: { w: '45%', mt: -88, rot:  5.0 }, c: { w: '48%', ml: '10%', mt: 5, rot: -1.0 } },
          ] as const

          // Les 3 entrées du menu : chacune garde son libellé et sa destination,
          // mais tire SA créature dans un petit pool thématique selon le seed —
          // l'identité du mode (« Cadavre Écrit » etc.) reste fixe, seule la
          // chimère affichée change d'une ambiance à l'autre (4 par mode → 64
          // ménageries possibles, en plus des arrangements et permutations).
          // La 1re de chaque pool est l'espèce historique (avec son animation
          // propre) ; les 3 autres sont des chimères mono-état (salut CSS).
          const ENTREES = [
            { especes: ['elephant', 'racine', 'hibou-horloge', 'dame-fleur'],     label: 'Cadavre Écrit',   route: '/config' },
            { especes: ['papillon', 'meduse', 'poisson-oiseau', 'cerf-lune'],     label: 'Cadavre Dessiné', route: '/config-dessin' },
            { especes: ['tigre', 'renard-automne', 'escargot-maison', 'baleine-ciel'], label: 'Mode en ligne', route: '/online' },
          ] as const

          // 6 permutations de [0,1,2] → quelle entrée va en emplacement a / b / c.
          const PERMUTATIONS = [
            [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
          ] as const

          const seed = seance?.seed ?? 0
          const { a, b, c } = ARRANGEMENTS[seed % 4]
          const [ia, ib, ic] = PERMUTATIONS[seed % 6]
          const eA = ENTREES[ia], eB = ENTREES[ib], eC = ENTREES[ic]
          // créature tirée dans le pool de l'entrée ; décalée par l'index de
          // l'entrée pour décorréler du choix d'arrangement (seed % 4).
          const espOf = (e: typeof ENTREES[number], j: number) => e.especes[(seed + j) % e.especes.length]

          return (
            <div style={{ position: 'relative', marginBottom: 10, marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: a.w, marginTop: a.mt, transform: `translate(${a.tx}, 0) rotate(${a.rot}deg)`, zIndex: 2 }}>
                  <TeteCollage espece={espOf(eA, ia)} label={eA.label} onActivate={() => nav(eA.route)} />
                </div>
                <div style={{ width: b.w, marginTop: b.mt, transform: `rotate(${b.rot}deg)`, zIndex: 3 }}>
                  <TeteCollage espece={espOf(eB, ib)} label={eB.label} onActivate={() => nav(eB.route)} />
                </div>
              </div>
              <div style={{ width: c.w, marginLeft: c.ml, marginTop: c.mt, transform: `rotate(${c.rot}deg)`, zIndex: 4 }}>
                <TeteCollage espece={espOf(eC, ic)} label={eC.label} onActivate={() => nav(eC.route)} />
              </div>
            </div>
          )
        })()}

        {/* ── FOOTER — petites étiquettes collées, dernier échelon de la
            hiérarchie : même langage que les CTA, en plus petit ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '6px 0', paddingBottom: 0,
        }}>
          {[
            { label: 'Recueil', path: '/bibliotheque', rot: -1.4 },
            { label: 'Galerie',  path: '/galerie',       align: 'right', rot: 1.1 },
            { label: 'Règles',   path: '/aide',           rot: 1.3 },
            { label: 'Réglages', path: '/reglages',      align: 'right', rot: -1.2 },
          ].map(({ label, path, align, rot }, i) => (
            <button
              key={path}
              onClick={() => nav(path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 0', minHeight: 44,
                display: 'flex', alignItems: 'center',
                justifyContent: (align as 'right') ? 'flex-end' : 'flex-start',
              }}
            >
              <Etiquette
                bg={i % 2 === 0 ? accent : accent2}
                color={surAccent2}
                rotation={rot}
                style={{ fontSize: 11.5, padding: '5px 13px' }}
              >
                {label}
              </Etiquette>
            </button>
          ))}
          {/* Entrée discrète — l'atelier du recueil : un petit bout de
              papier collé, même matière que le reste, mais le plus petit et
              le moins saturé de tous, pour rester le dernier échelon */}
          <button
            onClick={() => nav('/atelier')}
            style={{
              gridColumn: '1 / -1', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0', minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Etiquette
              bg={papier.bg}
              color={papier.encre}
              rotation={-1}
              style={{
                border: `1px solid ${seance?.ambiance.rule ?? 'rgba(0,0,0,0.18)'}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                padding: '2px 14px',
                fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: 14,
                letterSpacing: 'normal', textTransform: 'none',
              }}
            >
              ✧ l'atelier ✧
            </Etiquette>
          </button>
        </div>

        {/* Signature du rêve — note manuscrite, posée à même le fond comme
            les annotations légères du collage de référence (pas de carton) */}
        {seance?.heure && (
          <div style={{
            textAlign: 'right', fontFamily: "'Caveat', cursive", fontWeight: 600,
            fontSize: 16, color: ink, opacity: 0.85, paddingBottom: 2,
          }}>
            rêvé à {seance.heure}
          </div>
        )}

      </motion.div>

    </PageTransition>
  )
}
