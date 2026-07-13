import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { mono } from '../lib/typo'
import { tr } from '../i18n'

const STRUCTURES = [
  { romain: 'I',   label: tr('Phrase courte', 'Short sentence'),  detail: tr('3 cases · sujet, verbe, complément', '3 slots · subject, verb, complement'), exemple: tr("L'ombre / glisse / dans la nuit froide", 'The shadow / slides / through the cold night') },
  { romain: 'II',  label: tr('Phrase étoffée', 'Full sentence'), detail: tr('5 cases · la canonique de Breton', "5 slots · Breton's canonical form"), exemple: tr('Le cadavre exquis boira le vin nouveau', 'The exquisite corpse will drink the new wine') },
  { romain: 'III', label: tr('Vers libre', 'Free verse'),     detail: tr('4 à 12 vers · sans contrainte fixe', '4 to 12 lines · no fixed constraint') },
]

const VISIBILITE = [
  { label: tr('AVEUGLE', 'BLIND'),        detail: tr('Aucun contexte — tu écris dans le vide total. La forme la plus surréaliste.', 'No context — you write into the void. The most surrealist form.') },
  { label: tr('DERNIER MOT', 'LAST WORD'),    detail: tr('Un seul mot de la case précédente est visible. Un fil ténu, juste assez pour raccrocher quelque chose.', 'A single word from the previous slot is visible. A thin thread, just enough to latch onto something.') },
  { label: tr('DERNIÈRE CASE', 'LAST SLOT'),  detail: tr('La case précédente entière est visible. Le poème sera plus cohérent, mais moins surprenant.', 'The whole previous slot is visible. The poem will be more coherent, but less surprising.') },
]

const MODES = [
  { label: tr('STANDARD', 'STANDARD'),   detail: tr("Aucune contrainte de temps. Tu prends le temps qu'il faut.", 'No time constraint. You take as long as you need.') },
  { label: tr('HYPNOTIQUE', 'HYPNOTIC'), detail: tr('30 secondes par case. À 0, le fragment est soumis automatiquement — ou une voix intérieure complète à ta place.', '30 seconds per slot. At zero, the fragment is submitted automatically — or an inner voice completes it in your place.') },
]

const RACCORD_DESSIN = [
  { label: tr('AVEUGLE', 'BLIND'), detail: tr("Chaque bande commence dans l'obscurité totale. Le monstre prend forme par hasard.", 'Each band begins in total darkness. The monster takes shape by chance.') },
  { label: tr('RACCORD', 'JOINED'), detail: tr("Un liseret du fragment précédent reste visible jusqu'au premier trait. Assez pour raccorder les corps, pas assez pour tout voir.", 'A sliver of the previous fragment stays visible until your first stroke. Enough to join the bodies, not enough to see everything.') },
]

const SECTIONS = [
  { id: 'ecrit',    label: tr('CADAVRE ÉCRIT', 'WRITTEN CADAVRE') },
  { id: 'dessine',  label: tr('CADAVRE DESSINÉ', 'DRAWN CADAVRE') },
  { id: 'atelier',  label: tr("L'ATELIER", 'THE WORKSHOP') },
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
            ← {tr('RETOUR', 'BACK')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          {tr('— RÈGLES —', '— RULES —')}
        </div>

        {/* ── INTRO ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <div
            className="font-fraunces font-black leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            {tr('Comment', 'How to')} <span style={{ color: accent }}>{tr('jouer.', 'play.')}</span>
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65 }}>
            {tr("Le cadavre exquis est un jeu surréaliste inventé à Paris dans les années 1920. Chaque participant contribue à l'œuvre sans voir ce que les autres ont produit. Le résultat révélé est toujours une surprise.", 'The exquisite corpse is a surrealist game invented in Paris in the 1920s. Each participant contributes to the work without seeing what the others have produced. The revealed result is always a surprise.')}
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
                    className="font-fraunces font-black"
                    style={{ fontSize: 'clamp(1.3rem, 5.5vw, 1.8rem)', color: col, lineHeight: 1 }}
                  >
                    {isEcrit ? tr('Cadavre Écrit.', 'Written Cadavre.') : isAtelier ? tr("L'Atelier.", 'The Workshop.') : tr('Cadavre Dessiné.', 'Drawn Cadavre.')}
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
                            {tr("Chaque joueur écrit un fragment de phrase ou de vers, sans voir ce que l'autre a écrit. Le poème révélé à la fin est toujours une surprise.", 'Each player writes a fragment of a sentence or a line, without seeing what the other wrote. The poem revealed at the end is always a surprise.')}
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            {tr('— STRUCTURES —', '— STRUCTURES —')}
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
                            {tr('— VISIBILITÉ —', '— VISIBILITY —')}
                          </div>
                          {VISIBILITE.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            {tr('— MODES —', '— MODES —')}
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
                            {tr("Un mode solo et expérimental. Tu convoques des voix IA et tu co-écris avec elles un poème dont tu ne vois jamais l'ensemble — ni le leur, ni le tien passé.", 'A solo, experimental mode. You summon AI voices and co-write a poem with them — one you never see in full: neither their lines, nor your own past ones.')}
                          </p>

                          {[
                            { label: tr('LE MÉDIUM', 'THE MEDIUM'), detail: tr('Tu ouvres le poème et tu le refermes. Entre ces deux moments, la main te revient à intervalles irréguliers — tous les deux à trois vers environ. Plus tu convoques de voix, plus tes retours se font fragments (un mot ou deux parmi une voix IA).', 'You open the poem and you close it. Between those two moments, the pen returns to you at irregular intervals — every two or three lines or so. The more voices you summon, the more your turns shrink to fragments (a word or two within an AI voice).') },
                            { label: tr('LES VOIX', 'THE VOICES'), detail: tr('Les voix IA complètent les vers entre tes tours. Tu choisis combien en convoquer — de 0 à 46. Plus elles sont nombreuses, plus ta présence dans le poème devient rare et fragmentaire.', 'The AI voices complete the lines between your turns. You choose how many to summon — from 0 to 46. The more numerous they are, the rarer and more fragmentary your presence in the poem becomes.') },
                            { label: tr('SEUL (0 VOIX)', 'ALONE (0 VOICES)'), detail: tr('Sans voix convoquées, tu écris tous les vers toi-même, mais sans jamais relire ce que tu as produit. Le cadavre exquis se joue alors contre ta propre mémoire.', 'With no voices summoned, you write every line yourself, but without ever rereading what you have produced. The exquisite corpse is then played against your own memory.') },
                          ].map(item => (
                            <div key={item.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, marginBottom: 3 }}>{item.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{item.detail}</div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            {tr('— VISIBILITÉ —', '— VISIBILITY —')}
                          </div>
                          {[
                            { label: tr("L'ÉCHO", 'THE ECHO'), detail: tr('Le dernier mot du vers précédent est audible. Un fil ténu pour raccrocher la plume.', 'The last word of the previous line is audible. A thin thread to catch your pen on.') },
                            { label: tr('OBSCURITÉ', 'DARKNESS'), detail: tr('Tu écris dans le silence total. Aucun contexte — ni le tien, ni celui des voix.', 'You write in total silence. No context — neither yours, nor that of the voices.') },
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
                            {tr('La variante graphique. Chaque joueur dessine une portion du corps sur une bande horizontale, sans voir les fragments voisins. Le monstre révélé à la fin est interprété par une intelligence artificielle en vers surréalistes.', 'The graphic variant. Each player draws a portion of the body on a horizontal band, without seeing the neighbouring fragments. The monster revealed at the end is interpreted by an artificial intelligence in surrealist verse.')}
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: second, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            {tr('— RACCORD —', '— JOIN —')}
                          </div>
                          {RACCORD_DESSIN.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: second, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <div style={{ borderLeft: `1.5px solid ${encre}40`, paddingLeft: 12, marginTop: 20, marginBottom: 8 }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, lineHeight: 1.5, color: encre, opacity: 0.82, marginBottom: 4 }}>
                              {tr('« Le cadavre exquis boira le vin nouveau »', '“The exquisite corpse will drink the new wine”')}
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
              {tr('Cadavre Écrit', 'Written Cadavre')} →
            </button>
            <button
              onClick={() => navigate('/config-dessin')}
              style={{
                flex: 1, background: second, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer',
              }}
            >
              {tr('Cadavre Dessiné', 'Drawn Cadavre')} →
            </button>
          </div>
        </motion.div>

      </div>
    </PageTransition>
  )
}
