import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'

const STRUCTURES = [
  { romain: 'I',   label: 'Phrase courte',  detail: '3 cases · sujet, verbe, complément', exemple: "L'ombre / glisse / dans la nuit froide" },
  { romain: 'II',  label: 'Phrase étoffée', detail: '5 cases · la canonique de Breton', exemple: 'Le cadavre exquis boira le vin nouveau' },
  { romain: 'III', label: 'Vers libre',     detail: '4 à 12 vers · sans contrainte fixe' },
]

const VISIBILITE = [
  { label: 'AVEUGLE',        detail: 'Aucun contexte — tu écris dans le vide total. La forme la plus surréaliste.' },
  { label: 'DERNIER MOT',    detail: 'Un seul mot de la case précédente est visible. Un fil ténu, juste assez pour raccrocher quelque chose.' },
  { label: 'DERNIÈRE CASE',  detail: 'La case précédente entière est visible. Le poème sera plus cohérent, mais moins surprenant.' },
]

const MODES = [
  { label: 'STANDARD',   detail: "Aucune contrainte de temps. Tu prends le temps qu'il faut." },
  { label: 'HYPNOTIQUE', detail: "30 secondes par case. À 0, le fragment est soumis automatiquement — ou une voix intérieure complète à ta place." },
]

const RACCORD_DESSIN = [
  { label: 'AVEUGLE', detail: "Chaque bande commence dans l'obscurité totale. Le monstre prend forme par hasard." },
  { label: 'RACCORD', detail: "Un liseret du fragment précédent reste visible jusqu'au premier trait. Assez pour raccorder les corps, pas assez pour tout voir." },
]

const SECTIONS = [
  { id: 'ecrit',    label: 'CADAVRE ÉCRIT' },
  { id: 'dessine',  label: 'CADAVRE DESSINÉ' },
  { id: 'atelier',  label: "L'ATELIER" },
]

export default function Aide() {
  const navigate = useNavigate()
  const seance = useReve()

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const second = c?.second ?? '#1d3a8c'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const [ouvert, setOuvert] = useState<string[]>([])
  function toggle(id: string) {
    setOuvert(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate(-1)}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← RETOUR
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — RÈGLES —
        </div>

        {/* ── INTRO ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <div
            className="font-bodoni font-black leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            Comment <span style={{ color: accent }}>jouer.</span>
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65 }}>
            Le cadavre exquis est un jeu surréaliste inventé à Paris dans les années 1920. Chaque participant contribue à l'œuvre sans voir ce que les autres ont produit. Le résultat révélé est toujours une surprise.
          </p>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 8 }} />

        {/* ── ACCORDÉON ── */}
        {SECTIONS.map((section, si) => {
          const isOpen = ouvert.includes(section.id)
          const isEcrit = section.id === 'ecrit'
          const isAtelier = section.id === 'atelier'
          const col = isEcrit ? accent : isAtelier ? encre : second

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + si * 0.08 }}
            >
              {/* ── En-tête de section (toujours visible) ── */}
              <button
                onClick={() => toggle(section.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `0.5px solid ${encre}15`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <div
                    className="font-bodoni font-black"
                    style={{ fontSize: 'clamp(1.3rem, 5.5vw, 1.8rem)', color: col, lineHeight: 1 }}
                  >
                    {isEcrit ? 'Cadavre Écrit.' : isAtelier ? "L'Atelier." : 'Cadavre Dessiné.'}
                  </div>
                </div>
                <span style={{
                  ...mono, fontSize: 17, lineHeight: 1, letterSpacing: 0, color: col, flexShrink: 0,
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `0.5px solid ${col}50`, borderRadius: 3,
                }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {/* ── Contenu dépliable ── */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ paddingTop: 16, paddingBottom: 8 }}>

                      {isEcrit && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            Chaque joueur écrit un fragment de phrase ou de vers, sans voir ce que l'autre a écrit. Le poème révélé à la fin est toujours une surprise.
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            — STRUCTURES —
                          </div>
                          {STRUCTURES.map(s => (
                            <div key={s.romain} style={{ display: 'flex', gap: 14, paddingBottom: 12, borderBottom: `0.5px solid ${encre}10`, marginBottom: 12 }}>
                              <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, minWidth: 22 }}>{s.romain}.</span>
                              <div>
                                <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 17, color: encre, marginBottom: 2 }}>{s.label}</div>
                                <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.9, marginBottom: s.exemple ? 5 : 0 }}>{s.detail}</div>
                                {s.exemple && (
                                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75 }}>« {s.exemple} »</div>
                                )}
                              </div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            — VISIBILITÉ —
                          </div>
                          {VISIBILITE.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            — MODES —
                          </div>
                          {MODES.map(m => (
                            <div key={m.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{m.detail}</div>
                            </div>
                          ))}
                        </>
                      )}

                      {isAtelier && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            Un mode solo et expérimental. Tu convoques des voix IA et tu co-écris avec elles un poème dont tu ne vois jamais l'ensemble — ni le leur, ni le tien passé.
                          </p>

                          {[
                            { label: 'LE MÉDIUM', detail: "Tu ouvres le poème et tu le refermes. Entre ces deux moments, la main te revient à intervalles irréguliers — tous les deux à trois vers environ. Plus tu convoques de voix, plus tes retours se font fragments (un mot ou deux parmi une voix IA)." },
                            { label: 'LES VOIX', detail: "Les voix IA complètent les vers entre tes tours. Tu choisis combien en convoquer — de 0 à 46. Plus elles sont nombreuses, plus ta présence dans le poème devient rare et fragmentaire." },
                            { label: 'SEUL (0 VOIX)', detail: "Sans voix convoquées, tu écris tous les vers toi-même, mais sans jamais relire ce que tu as produit. Le cadavre exquis se joue alors contre ta propre mémoire." },
                          ].map(item => (
                            <div key={item.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, marginBottom: 3 }}>{item.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{item.detail}</div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            — VISIBILITÉ —
                          </div>
                          {[
                            { label: "L'ÉCHO", detail: "Le dernier mot du vers précédent est audible. Un fil ténu pour raccrocher la plume." },
                            { label: 'OBSCURITÉ', detail: "Tu écris dans le silence total. Aucun contexte — ni le tien, ni celui des voix." },
                          ].map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}
                        </>
                      )}

                      {!isEcrit && !isAtelier && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            La variante graphique. Chaque joueur dessine une portion du corps sur une bande horizontale, sans voir les fragments voisins. Le monstre révélé à la fin est interprété par une intelligence artificielle en vers surréalistes.
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: second, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            — RACCORD —
                          </div>
                          {RACCORD_DESSIN.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: second, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <div style={{ borderLeft: `1.5px solid ${encre}40`, paddingLeft: 12, marginTop: 20, marginBottom: 8 }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, lineHeight: 1.5, color: encre, opacity: 0.82, marginBottom: 4 }}>
                              « Le cadavre exquis boira le vin nouveau »
                            </div>
                            <div style={{ ...mono, fontSize: 13, color: second, opacity: 0.7, letterSpacing: '0.14em' }}>
                              BRETON, ÉLUARD, MORISE, MAN RAY · 1925
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {/* ── CTA ── */}
        <motion.div
          className="mt-6 mb-3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/config')}
              style={{
                flex: 1, background: accent, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer',
              }}
            >
              Cadavre Écrit →
            </button>
            <button
              onClick={() => navigate('/config-dessin')}
              style={{
                flex: 1, background: second, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer',
              }}
            >
              Cadavre Dessiné →
            </button>
          </div>
        </motion.div>

      </div>
    </PageTransition>
  )
}
