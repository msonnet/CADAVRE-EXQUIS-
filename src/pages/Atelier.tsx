import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { VOICE_IDS } from '../data/voiceIds'
import { mono } from '../lib/typo'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

export interface PlanAtelier {
  totalVers: number          // 5–27, tiré au sort
  toursJoueur: number[]      // indices des vers écrits par le médium (toujours 0 et totalVers-1)
  toursFragmentJoueur: number[] // sous-ensemble de toursJoueur (hors 0 et totalVers-1) où le médium
                             // remplit un seul fragment parmi les voix — plus les voix sont nombreuses,
                             // plus ces tours sont fréquents (0 voix → 0%, max voix → 100%)
  voixPool: string[]         // ids des voix convoquées, mélangées
  echo: boolean              // true = l'écho (dernier mot du vers précédent) ; false = obscurité totale
}

// La cadence du retour est quasi plate : la présence du médium ne se mesure
// pas en nombre de tours mais en mots contribués — et c'est probFragment
// (plus bas) qui porte cette variation. Plus les voix sont nombreuses, plus
// les retours du médium se font fragments (un mot ou deux), donc la main peut
// revenir souvent sans peser sur le poème.
// 1 voix → pas de 1 à 2, 46 voix → pas de 2 à 3 — une inclinaison de courtoisie.
// Le hasard garde sa part : seule la fourchette est liée, jamais le tirage.
export function cadenceRetour(nbVoix: number): [number, number] {
  const t = (Math.min(Math.max(nbVoix, 1), VOICE_IDS.length) - 1) / (VOICE_IDS.length - 1)
  return [Math.round(1 + t), Math.round(2 + t)]
}

// La main revient : le médium ouvre, referme, et la main lui revient selon la cadence.
// À zéro voix (« seul »), tous les vers lui reviennent — le cadavre exquis se joue
// contre sa propre mémoire : l'écho ou l'obscurité s'applique à sa propre trace.
export function tirerPlan(nbVoix: number, echo: boolean): PlanAtelier {
  const totalVers = 5 + Math.floor(Math.random() * 23) // 5–27
  if (nbVoix === 0) {
    return {
      totalVers,
      toursJoueur: Array.from({ length: totalVers }, (_, i) => i),
      toursFragmentJoueur: [],
      voixPool: [],
      echo,
    }
  }
  const [pasMin, pasMax] = cadenceRetour(nbVoix)
  const tours = [0]
  let curseur = 0
  for (;;) {
    const pas = pasMin + Math.floor(Math.random() * (pasMax - pasMin + 1))
    const suivant = curseur + pas
    if (suivant >= totalVers - 1) break
    tours.push(suivant)
    curseur = suivant
  }
  tours.push(totalVers - 1)
  // Des voix sont convoquées : au moins un vers doit leur revenir.
  // (À pas 1, le sort peut couvrir tout le poème — on libère un vers du milieu.)
  if (tours.length >= totalVers) {
    tours.splice(1 + Math.floor(Math.random() * (tours.length - 2)), 1)
  }
  const pool = [...VOICE_IDS].sort(() => Math.random() - 0.5).slice(0, nbVoix)
  // Tours fragment : parmi les retours du milieu, une proportion dépend du nombre de voix.
  // 0 voix → 0 %, max voix → 100 % — le médium devient une voix parmi d'autres.
  // Une voix parmi d'autres jusqu'au bout : même sur un tour fragment, le sort
  // peut le tirer seul sur le vers (1 chance sur 3, comme les voix IA) — il
  // écrit alors le vers entier. Le tirage vit dans JeuAtelier (initFragment).
  const probFragment = nbVoix / VOICE_IDS.length
  const toursFragmentJoueur = tours.filter(
    t => t !== 0 && t !== totalVers - 1 && Math.random() < probFragment
  )
  return { totalVers, toursJoueur: tours, toursFragmentJoueur, voixPool: pool, echo }
}

export default function Atelier() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const [nbVoix, setNbVoix] = useState<number>(() => {
    // `|| défaut` avalerait le zéro (« seul ») — on valide explicitement
    const brut = localStorage.getItem('atelier-nb-voix')
    const n = brut === null ? NaN : Number(brut)
    return Number.isInteger(n) && n >= 0 && n <= VOICE_IDS.length ? n : VOICE_IDS.length
  })
  const [echo, setEcho] = useState<boolean>(
    () => (localStorage.getItem('atelier-visibilite') ?? 'echo') === 'echo'
  )

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const colorLabel = c?.name.toUpperCase() ?? ''

  const toutes = nbVoix === VOICE_IDS.length

  function ouvrirSeance() {
    jouer('clic')
    localStorage.setItem('atelier-nb-voix', String(nbVoix))
    localStorage.setItem('atelier-visibilite', echo ? 'echo' : 'obscurite')
    const plan = tirerPlan(nbVoix, echo)
    navigate('/jeu-atelier', { state: { plan } })
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="atelier" />

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
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          — L'ATELIER —
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 18 }}
        >
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 6 }}
          >
            Écrire avec <span style={{ color: accent }}>les voix.</span>
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, fontStyle: 'italic', lineHeight: 1.5 }}>
            {nbVoix === 0
              ? <>Le sort fixera la longueur du poème — de V à XXVII vers. Tu les écriras
                tous, seul, sans jamais relire : le cadavre exquis se joue contre ta
                propre mémoire.</>
              : <>Le sort fixera la longueur du poème — de V à XXVII vers. Tu l'ouvriras,
                tu le refermeras, et la main te reviendra tous les {toRomain(cadenceRetour(nbVoix)[0])} à {toRomain(cadenceRetour(nbVoix)[1])} vers
                — plus les voix sont nombreuses, plus tes retours se font fragments.</>
            }
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 22 }} />

        {/* ── VOIX ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 26 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — VOIX CONVOQUÉES —
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
            <span className="font-fraunces font-black" style={{ fontSize: 44, color: accent, lineHeight: 1 }}>
              {nbVoix === 0 ? 'Seul' : toRomain(nbVoix)}
            </span>
            <span style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, textTransform: 'uppercase' }}>
              {nbVoix === 0 ? 'ta main uniquement' : toutes ? 'Toutes les voix' : nbVoix === 1 ? 'une seule voix' : `${nbVoix} voix`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={VOICE_IDS.length}
            value={nbVoix}
            onChange={e => setNbVoix(Number(e.target.value))}
            style={{ width: '100%', accentColor: accent }}
            aria-label="Nombre de voix"
          />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.7, marginTop: 8 }}>
            {nbVoix === 0
              ? 'Aucune voix ne parlera — la dernière main se passe le papier à elle-même.'
              : 'Les voix sont tirées au sort — tu ne sauras jamais lesquelles parlent.'}
          </div>
        </motion.div>

        {/* ── VISIBILITÉ ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            — VISIBILITÉ —
          </div>
          <div className="flex gap-2 mb-3">
            {[
              { id: true,  label: "L'ÉCHO" },
              { id: false, label: 'OBSCURITÉ' },
            ].map(opt => {
              const active = echo === opt.id
              return (
                <button
                  key={String(opt.id)}
                  onClick={() => setEcho(opt.id)}
                  style={{
                    flex: 1, padding: '8px 4px',
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}60`,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.8 }}>
            {echo
              ? (nbVoix === 0
                ? 'Tu n’entendras que le dernier mot de ton propre vers précédent.'
                : 'Chaque main — la tienne comme celles des voix — n’entend que le dernier mot du vers précédent.')
              : (nbVoix === 0
                ? 'Tu ne reliras rien. Le poème se coud dans le noir, vers après vers.'
                : 'Personne ne voit rien. Le poème se coud dans le noir absolu.')}
          </div>
        </motion.div>

        <div style={{ flex: 1 }} />

        {/* ── CTA ── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          onClick={ouvrirSeance}
          style={{
            width: '100%',
            background: encre, color: bg,
            ...mono, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '0.9em 1em', border: 'none', cursor: 'pointer',
            borderRadius: 3,
            marginBottom: 10,
          }}
        >
          Ouvrir la séance ✧
        </motion.button>

      </div>
    </PageTransition>
  )
}
