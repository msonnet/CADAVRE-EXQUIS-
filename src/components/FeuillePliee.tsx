import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PLIURE } from './Papier'
import { reliefDuPli } from '../lib/papier'
import { mono } from '../lib/typo'
import {
  REGLAGES as R, etatInitial, pas, estCalme, poidsCourbe, angleA,
  progres, pliDe, placer, progresDe, positionDe, type Mode, type EtatPli,
} from '../lib/paquet'

/**
 * La feuille pliée — le poème qu'on déplie au doigt.
 *
 * Maquette validée par l'auteur le 11 novembre (`lib/paquet.ts` pour la
 * physique). La feuille arrive FERMÉE : un paquet dont on ne voit que le dos.
 * On le tire vers soi, chaque pli se dresse et retombe sous son poids en
 * découvrant sa bande ; un toucher déplie tout, pli après pli. Aucun son.
 *
 * ── Les bandes ────────────────────────────────────────────────────────────
 *
 * Elles sont TOUTES dans le document, à leur place, dès le départ : une bande
 * pas encore découverte est transparente, jamais `visibility: hidden` ni
 * retirée — le lecteur d'écran lit le poème entier à tout moment, comme avec
 * l'ancien dépli (« un volet fermé est transparent »). Leur hauteur est
 * réservée : rien ne bouge sous la feuille quand elle s'ouvre.
 *
 * Le rabat, lui, n'est qu'une image : des lamelles posées par-dessus, cachées
 * au lecteur d'écran, qui n'existent plus une fois tout ouvert.
 *
 * ── Les gestes ────────────────────────────────────────────────────────────
 *
 * — Tirer le paquet vers soi : le pli suit le doigt ; lâché, il tombe du côté
 *   où il penche.
 * — Le toucher : tout se déplie, pli après pli.
 * — Un appui AILLEURS que sur la feuille, ou pendant que les plis tombent, ou
 *   une touche du clavier : le poème est posé d'un coup (`onSauter`). La
 *   règle du jeu, « un appui pose le poème entier », tient toujours.
 * — Personne n'y touche : le paquet esquisse le geste deux fois, puis
 *   s'ouvre de lui-même au bout de huit secondes.
 */

export interface PapierPlie {
  couleur: string
  /** Le dos du papier : un rien plus terne. */
  dos: string
  sombre: boolean
  /** L'ombre de la feuille posée (`box-shadow`). */
  ombre: string
  /** La teinte de l'ombre d'un pli qui se détourne de la lumière. */
  ombreVolet: string
  grain?: string
}

interface Props {
  /** Le contenu de chaque bande, dans l'ordre ; la première porte l'en-tête, la dernière le pied. */
  bandes: React.ReactNode[]
  papier: PapierPlie
  /** La marge intérieure de la feuille, en pixels. */
  bord: number
  encre: string
  /** Le poème est posé d'avance — mouvement réduit, ou abrégé : pas de paquet. */
  pose?: boolean
  /** Le dernier pli est posé : tout le poème est ouvert. */
  onOuvert?: () => void
  /** Le joueur veut tout voir d'un coup. `parAppui` : au doigt (et non au clavier). */
  onSauter?: (parAppui: boolean) => void
  /** Un pli s'est posé sur la table — la vibration. */
  onPliPose?: () => void
  /** « — TIRER POUR DÉPLIER — » */
  invite: string
}

// La lumière du jeu : une seule, en haut à gauche, un peu devant la table.
const LUMIERE = (() => { const v = [-0.42, -0.58, 0.7], n = Math.hypot(...v); return v.map(c => c / n) })()
const LY = LUMIERE[1], LZ = LUMIERE[2], E0 = LZ
// Où tombe l'ombre d'un point à la hauteur z : en bas à droite.
const OX = -LUMIERE[0] / LUMIERE[2], OY = -LUMIERE[1] / LUMIERE[2]
const PI = Math.PI

const enRgb = (c: string, defaut: string) => /^#[0-9a-f]{6}$/i.test(c)
  ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).join(',')
  : defaut
const degrade = (sens: string, rgb: string, a0: number, a1: number) =>
  `linear-gradient(${sens}, rgba(${rgb},${a0.toFixed(3)}), rgba(${rgb},${a1.toFixed(3)}))`

interface Face { lumiere: HTMLDivElement | null; ombre: HTMLDivElement | null; contenu: HTMLDivElement | null }
interface Lamelle { el: HTMLDivElement | null; dessus: Face; dessous: Face }
interface Doigt { id: number; y0: number; base: number; t0: number; bouge: boolean; traces: [number, number][]; p: number }

export default function FeuillePliee({ bandes, papier, bord, encre, pose, onOuvert, onSauter, onPliPose, invite }: Props) {
  const N = bandes.length
  const S = R.lamelles
  const [ouvert, setOuvert] = useState(!!pose || N < 2)
  // Au dernier pli, le revers du rabat porte la dernière bande, écrite.
  const [recto, setRecto] = useState(false)

  const racine = useRef<HTMLDivElement>(null)
  const bandesEl = useRef<(HTMLDivElement | null)[]>([])
  const empreinte = useRef<HTMLDivElement>(null)
  const ombre = useRef<HTMLDivElement>(null)
  const inviteEl = useRef<HTMLParagraphElement>(null)
  const lamelles = useRef<Lamelle[]>(Array.from({ length: S }, () => ({
    el: null, dessus: { lumiere: null, ombre: null, contenu: null }, dessous: { lumiere: null, ombre: null, contenu: null },
  })))
  // Les fonctions de la page, toujours les dernières : la boucle les appelle hors de React.
  const rappels = useRef({ onOuvert, onSauter, onPliPose })
  rappels.current = { onOuvert, onSauter, onPliPose }

  const m = useRef({
    e: etatInitial() as EtatPli,
    mode: (ouvert ? 'ouvert' : 'repos') as Mode,
    enchaine: false, touche: false, fini: ouvert,
    wDoigt: 0, raf: 0, tPrec: 0,
    tops: [] as number[], hs: [] as number[],
    doigt: null as Doigt | null,
    minuteurs: [] as number[],
    recto: false,
  })

  const rgbOmbre = enRgb(papier.ombreVolet, '30,20,6')
  const rgbLumiere = papier.sombre ? enRgb(encre, '255,255,255') : '255,255,255'
  const kL = papier.sombre ? 0.85 : 2.5, kO = papier.sombre ? 0.7 : 0.42

  // ── La peinture : tout est écrit à la main, image par image ─────────────
  const peindre = () => {
    const st = m.current, e = st.e
    const ouv = st.mode === 'ouvert'
    const k = ouv ? N - 1 : e.k
    bandesEl.current.forEach((b, i) => {
      if (!b) return
      b.style.opacity = i <= k ? '1' : '0'
      b.style.pointerEvents = i <= k ? '' : 'none'
    })
    const bas = (i: number) => (st.tops[i] ?? 0) + (st.hs[i] ?? 0)
    if (empreinte.current) empreinte.current.style.height = `${bas(ouv ? N - 1 : k)}px`
    if (ouv || !st.hs.length) return

    const a = st.hs[k], b = st.hs[k + 1] ?? a
    const s = (1 - Math.cos(e.th)) / 2
    const h = a + s * (b - a), L = h / S
    const charniere = bas(k)
    const veutRecto = k === N - 2
    if (veutRecto !== st.recto) { st.recto = veutRecto; setRecto(veutRecto) }
    const poids = poidsCourbe(e)
    const lum = (phi: number) => Math.max(0, Math.sin(phi) * LY + Math.cos(phi) * LZ)
    const lumR = (phi: number) => Math.max(0, -Math.sin(phi) * LY - Math.cos(phi) * LZ)
    const voile = (E: number) => [Math.max(0, (E0 - E) * kO), Math.max(0, (E - E0) * kL)]
    let y = charniere, z = 0
    lamelles.current.forEach((l, i) => {
      if (!l.el) return
      const phi = angleA(e, (i + 0.5) / S, poids), lo = angleA(e, i / S, poids), hi = angleA(e, (i + 1) / S, poids)
      l.el.style.height = `${(L + R.recouvre).toFixed(2)}px`
      l.el.style.transform = `translate3d(0px,${(y - L - R.recouvre).toFixed(2)}px,${z.toFixed(2)}px) rotateX(${(-phi).toFixed(5)}rad)`
      // La lumière, interpolée d'un bord à l'autre de la lamelle : pas de marches.
      const [od0, ld0] = voile(lum(lo)), [od1, ld1] = voile(lum(hi))
      if (l.dessus.ombre) l.dessus.ombre.style.background = degrade('to top', rgbOmbre, od0, od1)
      if (l.dessus.lumiere) l.dessus.lumiere.style.background = degrade('to top', rgbLumiere, ld0, ld1)
      const [or0, lr0] = voile(lumR(lo)), [or1, lr1] = voile(lumR(hi))
      if (l.dessous.ombre) l.dessous.ombre.style.background = degrade('to bottom', rgbOmbre, or0, or1)
      if (l.dessous.lumiere) l.dessous.lumiere.style.background = degrade('to bottom', rgbLumiere, lr0, lr1)
      // Au revers, chaque lamelle montre sa tranche de la dernière bande.
      if (l.dessous.contenu) l.dessous.contenu.style.top = `${(-i * L).toFixed(2)}px`
      y -= L * Math.cos(phi); z += L * Math.sin(phi)
    })
    // L'ombre du rabat dressé : de la charnière jusqu'à l'ombre de son bord libre.
    if (ombre.current) {
      const long = y + OY * z - charniere
      ombre.current.style.opacity = (Math.min(1, Math.sin(e.th) * 2.5) * (papier.sombre ? 0.9 : 0.75)).toFixed(3)
      ombre.current.style.transform = `matrix(1,0,${(OX * z / 100).toFixed(4)},${(long / 100).toFixed(4)},0,${charniere.toFixed(2)})`
    }
    if (inviteEl.current) {
      inviteEl.current.style.top = `${(bas(0) + 12).toFixed(0)}px`
      inviteEl.current.style.opacity = (0.62 * Math.max(0, Math.min(1, 1 - progres(e) * 1.5))).toFixed(3)
    }
  }

  // ── Le temps ────────────────────────────────────────────────────────────
  const demander = () => {
    const st = m.current
    if (!st.raf) { st.tPrec = performance.now(); st.raf = requestAnimationFrame(boucle) }
  }
  const boucle = (t: number) => {
    const st = m.current, e = st.e
    st.raf = 0
    const dt = Math.min(0.05, Math.max(0, (t - st.tPrec) / 1000)); st.tPrec = t
    const n = Math.max(1, Math.ceil(dt * 480)), h = dt / n
    if (st.mode === 'tire') st.wDoigt *= Math.exp(-dt / 0.06)
    if (dt > 0) for (let i = 0; i < n; i++) pas(e, h, st.mode, st.wDoigt)
    // Le pli et son bord sont posés : on passe à la bande suivante.
    if (st.mode === 'chute' && e.posee && estCalme(e, st.enchaine)) {
      e.beta = 0; e.vbeta = 0; e.posee = false
      if (e.th >= PI) { e.k += 1; e.th = 0; rappels.current.onPliPose?.() }
      poser()
      return
    }
    peindre()
    const mode: Mode = st.mode
    const tire = mode === 'tire'
    const bouge = tire || mode === 'chute' || Math.abs(e.beta) > 0.002 || Math.abs(e.vbeta) > 0.02
      || Math.abs(e.libre - (tire ? 0 : 1)) > 0.01
    if (bouge) demander()
    else { e.beta = 0; e.vbeta = 0; peindre() }
  }
  const lacher = (vitesse: number) => {
    const st = m.current
    st.e.w = Math.max(-40, Math.min(40, vitesse)); st.e.posee = false
    if (st.e.k >= N - 1) { poser(); return }
    st.mode = 'chute'; demander()
  }
  const poser = () => {
    const st = m.current, e = st.e
    if (e.k >= N - 2 && e.th >= PI) { e.k = N - 1; e.th = 0 }
    st.mode = e.k >= N - 1 ? 'ouvert' : 'repos'
    peindre()
    if (st.mode === 'ouvert') {
      st.enchaine = false
      if (!st.fini) { st.fini = true; setOuvert(true); rappels.current.onOuvert?.() }
    } else if (st.enchaine) {
      st.minuteurs.push(window.setTimeout(() => { if (st.enchaine && st.mode === 'repos') lacher(R.poussee) }, R.entrePlis))
    }
  }
  const arreter = () => {
    const st = m.current
    cancelAnimationFrame(st.raf); st.raf = 0
    st.minuteurs.forEach(clearTimeout); st.minuteurs = []
  }
  const sauter = (parAppui: boolean) => {
    const st = m.current
    if (st.fini) return
    st.fini = true; st.enchaine = false
    arreter()
    rappels.current.onSauter?.(parAppui)
  }

  // Une seule bande — un poème d'un vers : rien à plier, la feuille est
  // ouverte d'emblée, et la page doit le savoir (sans quoi ses actions
  // n'arrivaient jamais). Posée d'avance, c'est la page qui le sait déjà.
  useEffect(() => {
    if (N < 2 && !pose) { m.current.fini = true; rappels.current.onOuvert?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Les mesures : la place de chaque bande ──────────────────────────────
  useLayoutEffect(() => {
    const mesurer = () => {
      const st = m.current
      st.tops = bandesEl.current.map(b => b?.offsetTop ?? 0)
      st.hs = bandesEl.current.map(b => b?.offsetHeight ?? 0)
      peindre()
    }
    mesurer()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(mesurer)
    bandesEl.current.forEach(b => b && ro.observe(b))
    return () => ro.disconnect()
  }, [N, ouvert, recto]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Les gestes ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (ouvert) return
    const el = racine.current
    if (!el) return
    const st = m.current
    const milieux = () => st.tops.map((t, i) => t + (st.hs[i] ?? 0) / 2)

    const appui = (ev: PointerEvent) => {
      if (st.mode === 'ouvert' || st.doigt) return
      // Pendant que les plis tombent d'eux-mêmes, un appui pose tout.
      if (st.enchaine) { ev.preventDefault(); sauter(true); return }
      // Les bandes encore pliées ont déjà leur place, transparentes : sous le
      // paquet, c'est la table. Un appui là est un appui AILLEURS, qui pose le
      // poème entier — il dépliait pli par pli.
      const k = st.e.k
      const basVisible = el.getBoundingClientRect().top + (st.tops[k] ?? 0) + (st.hs[k] ?? 0)
        + (st.e.th > PI / 2 ? (st.hs[k + 1] ?? 0) : 0) + 8
      if (ev.clientY > basVisible) { sauter(true); return }
      st.touche = true; st.e.posee = false
      try { el.setPointerCapture(ev.pointerId) } catch { /* tant pis */ }
      const t = performance.now(), p = progres(st.e)
      st.doigt = { id: ev.pointerId, y0: ev.clientY, base: positionDe(p, milieux()), t0: t, bouge: false, traces: [[t, p]], p }
      st.mode = 'tire'; st.e.w = 0; st.wDoigt = 0
      demander()
      ev.preventDefault()
    }
    const glisse = (ev: PointerEvent) => {
      const d = st.doigt
      if (!d || ev.pointerId !== d.id) return
      const dy = ev.clientY - d.y0
      if (Math.abs(dy) > 6) d.bouge = true
      const p = progresDe(d.base + dy / R.course, milieux()), t = performance.now()
      const tA = d.traces[d.traces.length - 1][0]
      st.wDoigt = 0.5 * st.wDoigt + 0.5 * ((p - d.p) / Math.max(0.004, (t - tA) / 1000) * PI)
      d.p = p
      placer(st.e, p, N)
      d.traces.push([t, p])
      while (d.traces.length > 2 && t - d.traces[0][0] > 90) d.traces.shift()
      demander()
    }
    const relache = (ev: PointerEvent) => {
      const d = st.doigt
      if (!d || ev.pointerId !== d.id) return
      const t = performance.now()
      const [t1, p1] = d.traces[0], [t2, p2] = d.traces[d.traces.length - 1]
      const vitesse = t2 - t1 > 8 && t - t2 < 60 && pliDe(p1, N) === pliDe(p2, N) ? (p2 - p1) / (t2 - t1) * 1000 * PI : 0
      const tape = !d.bouge && t - d.t0 < 400
      st.doigt = null
      if (tape) { st.enchaine = true; lacher(R.poussee); return }
      if (progres(st.e) >= N - 1 - 1e-9) { st.e.k = N - 1; st.e.th = 0; poser(); return }
      // Couché pile sur une bande : rien ne tombe.
      if (st.e.th <= 1e-6 && Math.abs(vitesse) < 0.5) { st.e.th = 0; st.mode = 'repos'; demander(); return }
      lacher(vitesse)
    }
    // Dans une vue web, le défilement natif ne doit pas reprendre le geste.
    const retenir = (ev: TouchEvent) => { if (st.mode !== 'ouvert') ev.preventDefault() }
    // Un appui ailleurs que sur la feuille, ou une touche : le poème entier.
    const ailleurs = (ev: PointerEvent) => {
      if (st.mode === 'ouvert' || el.contains(ev.target as Node)) return
      sauter(true)
    }
    const clavier = () => { if (st.mode !== 'ouvert') sauter(false) }

    el.addEventListener('pointerdown', appui)
    el.addEventListener('pointermove', glisse)
    el.addEventListener('pointerup', relache)
    el.addEventListener('pointercancel', relache)
    el.addEventListener('touchmove', retenir, { passive: false })
    window.addEventListener('pointerdown', ailleurs, { capture: true })
    window.addEventListener('keydown', clavier, { capture: true })

    // L'invitation : le paquet soulève son bord et retombe, deux fois au plus ;
    // puis, si personne n'y touche, il s'ouvre de lui-même.
    const esquisse = () => { if (!st.touche && st.mode === 'repos' && st.e.k === 0 && st.e.th === 0) lacher(R.esquisse) }
    st.minuteurs.push(window.setTimeout(esquisse, 1100), window.setTimeout(esquisse, 4600))
    st.minuteurs.push(window.setTimeout(() => {
      if (!st.touche && st.mode === 'repos') { st.enchaine = true; lacher(R.poussee) }
    }, R.autoOuverture))

    return () => {
      el.removeEventListener('pointerdown', appui)
      el.removeEventListener('pointermove', glisse)
      el.removeEventListener('pointerup', relache)
      el.removeEventListener('pointercancel', relache)
      el.removeEventListener('touchmove', retenir)
      window.removeEventListener('pointerdown', ailleurs, { capture: true })
      window.removeEventListener('keydown', clavier, { capture: true })
      arreter()
    }
  }, [ouvert]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Le rendu ────────────────────────────────────────────────────────────
  const fond = { backgroundImage: papier.grain, backgroundSize: '200px 200px' }
  const trait = papier.sombre ? 'rgba(0,0,0,0.55)' : 'rgba(40,28,10,0.22)'
  const lignes = (sens: 'top' | 'bottom') =>
    `repeating-linear-gradient(to ${sens === 'top' ? 'bottom' : 'top'}, ${trait} 0 0.6px, transparent 0.6px 2px) ${sens} / 100% 4px no-repeat`
  const couche: React.CSSProperties = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }
  const face = (dessous: boolean, i: number, f: Face) => {
    const bord0 = i === 0, bordS = i === S - 1
    // Les plis du paquet, sur ses deux bords : la charnière et le bord libre.
    const tranches = recto && dessous ? undefined
      : bord0 ? lignes(dessous ? 'top' : 'bottom') : bordS ? lignes(dessous ? 'bottom' : 'top') : undefined
    return (
      <div style={{
        ...couche, overflow: 'hidden',
        backgroundColor: dessous && recto ? papier.couleur : papier.dos, ...fond,
        WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
        transform: dessous ? 'rotateX(180deg) translateZ(0.5px)' : 'translateZ(0.5px)',
      }}>
        <div ref={el => { f.lumiere = el }} style={couche} />
        {dessous && recto && (
          <div ref={el => { f.contenu = el }} style={{ position: 'absolute', left: 0, right: 0, top: 0, padding: `0 ${bord}px 12px` }}>
            {bandes[N - 1]}
          </div>
        )}
        <div ref={el => { f.ombre = el }} style={couche} />
        {tranches && <div style={{ ...couche, background: tranches }} />}
      </div>
    )
  }

  return (
    <div
      ref={racine}
      style={{
        position: 'relative',
        perspective: ouvert ? undefined : `${R.perspective}px`,
        perspectiveOrigin: ouvert ? undefined : `50% ${R.origine}px`,
        touchAction: ouvert ? undefined : 'none',
        WebkitUserSelect: ouvert ? undefined : 'none', userSelect: ouvert ? undefined : 'none',
        WebkitTouchCallout: ouvert ? undefined : 'none',
        cursor: ouvert ? undefined : 'grab',
      } as React.CSSProperties}
    >
      {/* L'ombre de la feuille sur la table : l'empreinte de ce qui est découvert. */}
      <div ref={empreinte} aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, borderRadius: 3, boxShadow: papier.ombre, pointerEvents: 'none' }} />
      {bandes.map((contenu, i) => (
        <div
          key={i}
          ref={el => { bandesEl.current[i] = el }}
          data-volet-papier={i}
          style={{
            position: 'relative',
            padding: `${i === 0 ? 16 : 0}px ${bord}px ${i === N - 1 ? 12 : 0}px`,
            backgroundColor: papier.couleur, ...fond,
            borderRadius: N === 1 ? 3 : i === 0 ? '3px 3px 0 0' : i === N - 1 ? '0 0 3px 3px' : undefined,
            // Un pixel de papier sous la bande suivante : pas de jour entre deux plis.
            boxShadow: i < N - 1 ? `0 1px 0 ${papier.couleur}` : undefined,
          }}
        >
          {/* Les marques au repos : la feuille a été pliée en accordéon. */}
          {i > 0 && <div aria-hidden style={{ ...couche, background: reliefDuPli((i + 1) % 2, papier.sombre) }} />}
          <div style={{ position: 'relative' }}>{contenu}</div>
          {i > 0 && <div aria-hidden style={{ ...couche, bottom: 'auto', height: 2, opacity: 0.42, background: PLIURE }} />}
        </div>
      ))}
      {!ouvert && (
        <>
          <div ref={ombre} aria-hidden style={{
            position: 'absolute', left: 0, top: 0, width: '100%', height: 100, zIndex: 5, opacity: 0,
            transformOrigin: '0 0', filter: 'blur(3px)', pointerEvents: 'none',
            background: `linear-gradient(to bottom, ${papier.sombre ? 'rgba(0,0,0,0.7)' : 'rgba(40,28,10,0.34)'}, rgba(0,0,0,0))`,
          }} />
          {lamelles.current.map((l, i) => (
            <div
              key={i}
              aria-hidden
              ref={el => { l.el = el }}
              style={{
                position: 'absolute', left: 0, top: 0, width: '100%', zIndex: 6 + i,
                transformOrigin: '50% 100%', transformStyle: 'preserve-3d', willChange: 'transform', pointerEvents: 'none',
              }}
            >
              {face(false, i, l.dessus)}
              {face(true, i, l.dessous)}
            </div>
          ))}
          <p ref={inviteEl} aria-hidden style={{
            position: 'absolute', left: 0, right: 0, margin: 0, textAlign: 'center', pointerEvents: 'none',
            ...mono, fontStyle: 'normal', fontSize: 12, letterSpacing: '0.18em', color: encre, opacity: 0.62,
          }}>
            {invite}
          </p>
        </>
      )}
    </div>
  )
}
