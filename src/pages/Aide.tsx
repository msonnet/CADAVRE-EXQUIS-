import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'

const STRUCTURES = [
  { romain: 'I',   label: 'Phrase courte',  detail: '3 cases · sujet, verbe, complément', exemple: "L'ombre / glisse / dans la nuit froide" },
  { romain: 'II',  label: 'Phrase étoffée', detail: '7 cases · la canonique de Breton', exemple: 'Un beau soleil caressera lentement une mer endormie' },
  { romain: 'III', label: 'Vers libre',     detail: '4 à 12 vers · sans contrainte fixe' },
]

const VISIBILITE = [
  { label: 'AVEUGLE',        detail: 'Aucun contexte — tu écris dans le vide total. La forme la plus surréaliste.' },
  { label: 'DERNIER MOT',    detail: 'Un seul mot de la case précédente est visible. Un fil ténu, juste assez pour raccrocher quelque chose.' },
  { label: 'DERNIÈRE CASE',  detail: 'La case précédente entière est visible. Le poème sera plus cohérent, mais moins surprenant.' },
]

const MODES = [
  { label: 'STANDARD',   detail: 'Aucune contrainte de temps. Tu prends le temps qu\'il faut.' },
  { label: 'HYPNOTIQUE', detail: '30 secondes par case. À 0, le fragment est soumis automatiquement — ou une voix intérieure complète à ta place.' },
]

const RACCORD_DESSIN = [
  { label: 'AVEUGLE', detail: 'Chaque bande commence dans l\'obscurité totale. Le monstre prend forme par hasard.' },
  { label: 'RACCORD', detail: 'Un liseret du fragment précédent reste visible jusqu\'au premier trait. Assez pour raccorder les corps, pas assez pour tout voir.' },
]

export default function Aide() {
  const navigate = useNavigate()
  const seance = useReve()

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const second = encre
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate(-1)}
            style={{ ...mono, fontSize: 15, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← RETOUR
          </button>
          <span style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — RÈGLES —
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 20 }}
        >
          <div
            className="font-bodoni font-black leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            Comment <span style={{ color: accent }}>jouer.</span>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: encre,
            lineHeight: 1.65, marginBottom: 10,
          }}>
            Le cadavre exquis est un jeu surréaliste inventé à Paris dans les années 1920. Chaque participant contribue à l'œuvre sans voir ce que les autres ont produit. Le résultat révélé est toujours une surprise.
          </p>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 24 }} />

        {/* ══════════════════════════════════════════
            CADAVRE ÉCRIT  (couleur accent)
        ══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
            — CADAVRE ÉCRIT —
          </div>
          <div
            className="font-bodoni font-black leading-tight"
            style={{ fontSize: 'clamp(1.45rem, 6vw, 2rem)', color: accent, marginBottom: 16 }}
          >
            Cadavre Écrit.
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre,
            lineHeight: 1.65, opacity: 0.88, marginBottom: 20,
          }}>
            Chaque joueur écrit un fragment de phrase ou de vers, sans voir ce que l'autre a écrit. Le poème révélé à la fin est toujours une surprise.
          </p>

          {/* Structures */}
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — STRUCTURES —
          </div>
          {STRUCTURES.map(s => (
            <div key={s.romain} style={{ display: 'flex', gap: 14, paddingBottom: 12, borderBottom: `0.5px solid ${encre}10`, marginBottom: 12 }}>
              <span style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, minWidth: 22 }}>{s.romain}.</span>
              <div>
                <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 15, color: encre, marginBottom: 2 }}>
                  {s.label}
                </div>
                <div style={{ ...mono, fontSize: 15, color: encre, opacity: 0.9, marginBottom: s.exemple ? 5 : 0 }}>
                  {s.detail}
                </div>
                {s.exemple && (
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.75 }}>
                    « {s.exemple} »
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Visibilité */}
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
            — VISIBILITÉ —
          </div>
          {VISIBILITE.map(v => (
            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.85 }}>{v.detail}</div>
            </div>
          ))}

          {/* Modes */}
          <div style={{ ...mono, fontSize: 14, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
            — MODES —
          </div>
          {MODES.map(m => (
            <div key={m.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 15, color: accent, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.85 }}>{m.detail}</div>
            </div>
          ))}
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 24 }} />

        {/* ══════════════════════════════════════════
            CADAVRE DESSINÉ  (couleur encre)
        ══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ ...mono, fontSize: 14, color: second, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
            — CADAVRE DESSINÉ —
          </div>
          <div
            className="font-bodoni font-black leading-tight"
            style={{ fontSize: 'clamp(1.45rem, 6vw, 2rem)', color: encre, marginBottom: 16 }}
          >
            Cadavre Dessiné.
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre,
            lineHeight: 1.65, opacity: 0.88, marginBottom: 20,
          }}>
            La variante graphique. Chaque joueur dessine une portion du corps sur une bande horizontale, sans voir les fragments voisins. Le monstre révélé à la fin est interprété par une intelligence artificielle en vers surréalistes.
          </p>

          {/* Raccord */}
          <div style={{ ...mono, fontSize: 14, color: second, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — RACCORD —
          </div>
          {RACCORD_DESSIN.map(v => (
            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
              <div style={{ ...mono, fontSize: 15, color: second, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: encre, opacity: 0.85 }}>{v.detail}</div>
            </div>
          ))}

          {/* Citation */}
          <div style={{ borderLeft: `1.5px solid ${encre}40`, paddingLeft: 12, marginTop: 20 }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, lineHeight: 1.5, color: encre, opacity: 0.82, marginBottom: 4 }}>
              « Le cadavre exquis boira le vin nouveau »
            </div>
            <div style={{ ...mono, fontSize: 14, color: second, opacity: 0.7, letterSpacing: '0.14em' }}>
              BRETON, ÉLUARD, MORISE, MAN RAY · 1925
            </div>
          </div>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/config')}
              className="flex flex-col items-center justify-center"
              style={{
                flex: 1,
                background: accent, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer', gap: 2,
              }}
            >
              <span>Cadavre Écrit</span>
              <span aria-hidden style={{ fontSize: 15, opacity: 0.85 }}>✒</span>
            </button>
            <button
              onClick={() => navigate('/config-dessin')}
              className="flex flex-col items-center justify-center"
              style={{
                flex: 1,
                background: second, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer', gap: 2,
              }}
            >
              <span>Cadavre Dessiné</span>
              <span aria-hidden style={{ fontSize: 15, opacity: 0.85 }}>✎</span>
            </button>
          </div>
        </motion.div>

      </div>
    </PageTransition>
  )
}
