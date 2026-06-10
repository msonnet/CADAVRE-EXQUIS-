import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { demanderFragmentIA } from '../api/claude'
import { sauvegarderPoeme } from '../db'
import type { Poeme, Case } from '../types'
import type { PlanAtelier } from './Atelier'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

interface VersAtelier {
  texte: string
  auteur: 'humain' | 'ia'
  voixNums: number[]   // numéros (1-based) des voix qui ont cousu ce vers — vide pour le médium
}

interface VoixEnCours {
  num: number
  mots: number
  fait: boolean
}

// Réserve locale si l'API est injoignable — le poème ne s'arrête jamais
const RESERVE = [
  "l'ombre", 'un souffle froid', 'la cendre', 'sans bruit', 'le sel de la nuit',
  'une porte close', 'la pierre humide', 'un os de verre', 'le vent du nord', "l'eau noire",
]

const CLE_BROUILLON = 'atelier-en-cours'

const attendre = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// Masque un vers : la forme des mots sans le texte (traits proportionnels)
function masquer(texte: string): string {
  return texte
    .split(/\s+/)
    .map(w => '─'.repeat(Math.max(2, Math.min(8, Math.round(w.length * 0.75)))))
    .join(' ')
}

export default function JeuAtelier() {
  const navigate = useNavigate()
  const location = useLocation()
  const seance = useReve()
  const { jouer } = useSound()

  // Plan : depuis la navigation, sinon depuis le brouillon (rechargement de page)
  const [plan] = useState<PlanAtelier | null>(() => {
    const fromState = (location.state as { plan?: PlanAtelier } | null)?.plan
    if (fromState) return fromState
    try {
      const saved = localStorage.getItem(CLE_BROUILLON)
      if (saved) return (JSON.parse(saved) as { plan: PlanAtelier }).plan
    } catch { /* ignore */ }
    return null
  })

  const [vers, setVers] = useState<VersAtelier[]>(() => {
    const fromState = (location.state as { plan?: PlanAtelier } | null)?.plan
    if (fromState) return []   // nouvelle séance — on repart de zéro
    try {
      const saved = localStorage.getItem(CLE_BROUILLON)
      if (saved) return (JSON.parse(saved) as { vers: VersAtelier[] }).vers ?? []
    } catch { /* ignore */ }
    return []
  })
  const versRef = useRef<VersAtelier[]>(vers)
  versRef.current = vers

  const [saisie, setSaisie] = useState('')
  const [voixEnCours, setVoixEnCours] = useState<VoixEnCours[]>([])
  const traites = useRef<Set<number>>(new Set())
  const sauvegardeFaite = useRef(false)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }

  const idx = vers.length
  const total = plan?.totalVers ?? 0
  const termine = plan !== null && idx >= total
  const tourJoueur = plan !== null && !termine && plan.toursJoueur.includes(idx)

  // Pas de plan (accès direct à l'URL) → retour à la configuration
  useEffect(() => {
    if (!plan) navigate('/atelier', { replace: true })
  }, [plan, navigate])

  // Brouillon : la séance survit à un rechargement
  useEffect(() => {
    if (!plan || termine) return
    try { localStorage.setItem(CLE_BROUILLON, JSON.stringify({ plan, vers })) } catch { /* ignore */ }
  }, [plan, vers, termine])

  function ajouterVers(v: VersAtelier) {
    setVers(prev => [...prev, v])
  }

  // ── Tour des voix : 1 à 3 voix se partagent le vers, fragments de longueur aléatoire ──
  useEffect(() => {
    if (!plan || termine || tourJoueur) return
    if (traites.current.has(idx)) return
    traites.current.add(idx)
    jouer('ia')

    let annule = false

    async function ecrireVersIA() {
      const p = plan!
      const nVoix = Math.min(1 + Math.floor(Math.random() * 3), p.voixPool.length)
      const indices = p.voixPool.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, nVoix)
      // Nombre de mots par fragment : 2–6 pour une voix seule, 1–5 par voix en partage
      const tailles = indices.map(() =>
        nVoix === 1 ? 2 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 5)
      )
      setVoixEnCours(indices.map((vi, k) => ({ num: vi + 1, mots: tailles[k], fait: false })))

      const fragments: string[] = []
      for (let k = 0; k < indices.length; k++) {
        if (annule) return
        const precedent = versRef.current[idx - 1]?.texte
        const enCours = fragments.join(' ')
        const contexte = p.echo
          ? ([precedent, enCours].filter(Boolean).join(' ').slice(-400) || undefined)
          : undefined
        const eviter = [
          ...versRef.current.flatMap(v => v.texte.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []),
          ...(enCours.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []),
        ].filter(m => m.length > 2)

        let texte = ''
        try {
          const [reponse] = await Promise.all([
            demanderFragmentIA({
              consigne: "un fragment de vers — une image physique, concrète, inattendue",
              type: 'libre',
              voiceId: p.voixPool[indices[k]],
              contexte,
              eviter,
              mots: tailles[k],
            }),
            attendre(650 + Math.random() * 450),   // respiration théâtrale minimale par voix
          ])
          texte = reponse.texte.trim()
        } catch { /* réserve locale */ }
        if (!texte) texte = RESERVE[Math.floor(Math.random() * RESERVE.length)]

        // Les fragments suivants se cousent en minuscule — un seul fil
        fragments.push(k === 0 ? texte : texte.charAt(0).toLowerCase() + texte.slice(1))
        if (annule) return
        setVoixEnCours(prev => prev.map((v, j) => j === k ? { ...v, fait: true } : v))
      }

      await attendre(500)
      if (annule) return
      setVoixEnCours([])
      ajouterVers({
        texte: fragments.join(' ').replace(/\s+/g, ' ').trim(),
        auteur: 'ia',
        voixNums: indices.map(i => i + 1),
      })
    }

    ecrireVersIA()
    return () => { annule = true }
  }, [idx, plan, termine, tourJoueur]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fin : sauvegarde et révélation ──
  useEffect(() => {
    if (!plan || !termine || sauvegardeFaite.current) return
    sauvegardeFaite.current = true

    const cases: Case[] = versRef.current.map((v, i) => ({
      numero: i + 1,
      fonction: `vers ${i + 1}`,
      consigne: v.auteur === 'humain'
        ? 'vers du médium'
        : `vers des voix ${v.voixNums.map(toRomain).join(' · ')}`,
      auteur: v.auteur,
      texte: v.texte,
      ts: Date.now(),
    }))

    const poeme: Poeme = {
      id: `atelier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      titre: null,
      structureId: 'atelier',
      mode: 'standard',
      visibilite: plan.echo ? 'derniere-case' : 'aveugle',
      cases,
      dateCreation: Date.now(),
      dateModification: Date.now(),
    }

    sauvegarderPoeme(poeme)
      .catch(console.error)
      .finally(() => {
        localStorage.removeItem(CLE_BROUILLON)
        navigate('/fin', { state: { poeme } })
      })
  }, [termine, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  function deposerVers() {
    const t = saisie.trim()
    if (!t || !tourJoueur) return
    jouer('soumettre')
    setSaisie('')
    ajouterVers({ texte: t, auteur: 'humain', voixNums: [] })
  }

  function quitter() {
    if (vers.length > 0 && !window.confirm('Refermer l\'atelier ? La séance en cours sera perdue.')) return
    localStorage.removeItem(CLE_BROUILLON)
    navigate('/')
  }

  if (!plan) return null

  const echoTexte = plan.echo && tourJoueur && idx > 0 ? vers[idx - 1].texte : null
  const consigneJoueur = idx === 0
    ? 'Ouvrez la séance — le premier vers vous appartient.'
    : idx === total - 1
      ? 'Refermez le poème — le dernier vers vous appartient.'
      : 'La main vous revient.'

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="jeu" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={quitter}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← QUITTER
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── ÉTAT DE SÉANCE ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
            — L'ATELIER —
          </span>
          <span style={{ ...mono, fontSize: 12, color: encre, opacity: 0.6 }}>
            VERS {toRomain(Math.min(idx + 1, total))} / {toRomain(total)}
          </span>
        </div>
        <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.45, marginTop: 3 }}>
          {toRomain(plan.voixPool.length)} VOIX · {plan.echo ? "L'ÉCHO" : 'OBSCURITÉ TOTALE'}
        </div>

        {/* ── FEUILLET MASQUÉ : la forme du poème, jamais le texte ── */}
        <div style={{ marginTop: 22, marginBottom: 18, minHeight: 60 }}>
          {vers.map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                marginBottom: 6, lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: 11, color: v.auteur === 'humain' ? accent : encre, opacity: v.auteur === 'humain' ? 0.9 : 0.4, flexShrink: 0 }}>
                {v.auteur === 'humain' ? '✒' : '✦'}
              </span>
              <span style={{ fontSize: 13, color: encre, opacity: 0.35, letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                {masquer(v.texte)}
              </span>
            </motion.div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── ZONE ACTIVE ── */}
        <AnimatePresence mode="wait">
          {tourJoueur ? (
            <motion.div
              key={`humain-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 8 }}
            >
              {/* L'écho — le vers précédent, si la visibilité le permet */}
              {echoTexte ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 6 }}>
                    — L'ÉCHO —
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontStyle: 'italic', color: encre, opacity: 0.85, lineHeight: 1.4 }}>
                    « {echoTexte} »
                  </div>
                </div>
              ) : idx > 0 && (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.45, marginBottom: 16 }}>
                  — VOUS ÉCRIVEZ DANS LE NOIR —
                </div>
              )}

              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontStyle: 'italic', color: encre, opacity: 0.75, marginBottom: 12 }}>
                {consigneJoueur}
              </div>

              <textarea
                value={saisie}
                onChange={e => setSaisie(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); deposerVers() }
                }}
                placeholder="votre vers…"
                rows={2}
                autoFocus
                style={{
                  width: '100%', resize: 'none',
                  fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic',
                  color: encre, background: 'transparent',
                  border: 'none', borderBottom: `1.2px solid ${accent}66`,
                  outline: 'none', padding: '4px 2px 8px', lineHeight: 1.45,
                }}
              />
              <button
                onClick={deposerVers}
                disabled={!saisie.trim()}
                style={{
                  width: '100%', marginTop: 14,
                  background: saisie.trim() ? encre : `${encre}30`,
                  color: bg,
                  ...mono, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0.85em 1em', border: 'none',
                  cursor: saisie.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
              >
                {idx === total - 1 ? 'Refermer le poème ✒' : 'Déposer le vers ✒'}
              </button>
            </motion.div>
          ) : !termine ? (
            <motion.div
              key={`ia-${idx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 24, textAlign: 'center' }}
            >
              <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.26em', marginBottom: 14 }}>
                — LES VOIX ÉCRIVENT —
              </div>
              {voixEnCours.map((v, k) => (
                <motion.div
                  key={k}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: v.fait ? 0.85 : 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, marginBottom: 7 }}
                >
                  VOIX {toRomain(v.num)} · {v.mots} {v.mots > 1 ? 'MOTS' : 'MOT'}{' '}
                  {v.fait
                    ? <span style={{ color: accent }}>✦</span>
                    : <motion.span
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ color: accent }}
                      >…</motion.span>}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="fin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ paddingBottom: 24, textAlign: 'center', ...mono, fontSize: 13, color: accent, letterSpacing: '0.22em' }}
            >
              — LE POÈME SE REFERME —
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  )
}
