import { useCallback, useEffect, useRef, useState } from 'react'
import { OUTILS, ORDRE_OUTILS, reglageParDefaut, bornerTaille, type OutilId, type Reglage } from '../lib/trait/outils'
import { dessinerTrait, verser, styleCouche, type PointTrait, type EtatAero } from '../lib/trait/rendu'
import { redresser } from '../lib/trait/redresser'
import { bordDeDepart, surLeBord, type Regle } from '../lib/trait/regle'

/**
 * Le studio de dessin, sans son décor : l'outil en main, les réglages de
 * chaque instrument, la règle, et la saisie du trait jusqu'à ce qu'il soit
 * versé sur la feuille. Le cadavre dessiné local et le salon en ligne s'en
 * servent tous deux : un seul moteur, deux pages.
 *
 * Chaque instrument garde SA taille, SON opacité et SA couleur, comme dans
 * Freeform : reprendre la plume rend la plume qu'on avait laissée.
 */

export interface ReglageOutil extends Reglage { couleur: string }
export type Reglages = Record<OutilId, ReglageOutil>

/** Le temps qu'un doigt immobile met à redresser une forme. */
export const MAINTIEN_REDRESSE = 600
const CLE = 'studio-reglages'

function reglagesInitiaux(encre: string): Reglages {
  const base = Object.fromEntries(ORDRE_OUTILS.map(id => [id, { ...reglageParDefaut(id), couleur: encre }])) as Reglages
  try {
    const lu = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Partial<Reglages> | null
    if (lu) for (const id of ORDRE_OUTILS) {
      const r = lu[id]
      if (r && typeof r.taille === 'number' && typeof r.opacite === 'number') {
        base[id] = {
          taille: bornerTaille(id, r.taille),
          opacite: Math.min(1, Math.max(0.1, r.opacite)),
          // La couleur ne se reprend pas d'une partie à l'autre : chaque partie
          // commence à l'encre de son papier.
          couleur: encre,
        }
      }
    }
  } catch { /* stockage indisponible : réglages d'usine */ }
  return base
}

interface Options {
  canvasRef: React.RefObject<HTMLCanvasElement>
  coucheRef: React.RefObject<HTMLCanvasElement>
  conteneurRef: React.RefObject<HTMLDivElement>
  /** Pixels client → pixels du canvas (tient compte du zoom). */
  versCanvas: (x: number, y: number) => { x: number; y: number }
  fond: string
  papierClair: boolean
  encre: string
  onTraitPose: () => void
}

export function useStudio({ canvasRef, coucheRef, conteneurRef, versCanvas, fond, papierClair, encre, onTraitPose }: Options) {
  const [outil, setOutil] = useState<OutilId>('crayon')
  const [reglages, setReglages] = useState<Reglages>(() => reglagesInitiaux(encre))
  const [regle, setRegle] = useState<Regle | null>(null)
  const [redresse, setRedresse] = useState<string | null>(null)

  const points = useRef<PointTrait[]>([])
  const enCours = useRef(false)
  const pressionReelle = useRef(false)
  const aero = useRef<EtatAero>({ index: 0, reste: 0 })
  const bord = useRef<-1 | 0 | 1>(0)
  const fige = useRef(false)
  const minuteur = useRef<number | null>(null)
  const image = useRef<number | null>(null)
  const dernierClient = useRef<{ x: number; y: number } | null>(null)
  // Les valeurs lues pendant le trait : un trait commencé garde son outil.
  const actuel = useRef({ outil, reglage: reglages[outil] })

  useEffect(() => {
    try {
      const sans = Object.fromEntries(ORDRE_OUTILS.map(id => [id, { taille: reglages[id].taille, opacite: reglages[id].opacite }]))
      localStorage.setItem(CLE, JSON.stringify(sans))
    } catch { /* rien */ }
  }, [reglages])

  const reglage = reglages[outil]
  const changerReglage = useCallback((id: OutilId, r: Partial<ReglageOutil>) => {
    setReglages(prev => ({ ...prev, [id]: { ...prev[id], ...r, ...(r.taille !== undefined ? { taille: bornerTaille(id, r.taille) } : {}) } }))
  }, [])
  /** Nouveau papier : chaque instrument reprend l'encre de ce papier. */
  const encrerTout = useCallback((c: string) => {
    setReglages(prev => Object.fromEntries(ORDRE_OUTILS.map(id => [id, { ...prev[id], couleur: c }])) as Reglages)
  }, [])

  const dpr = () => window.devicePixelRatio || 1

  const rendre = useCallback((fini: boolean) => {
    const couche = coucheRef.current; if (!couche) return
    const ctx = couche.getContext('2d'); if (!ctx) return
    const { outil: id, reglage: r } = actuel.current
    if (OUTILS[id].rendu !== 'aero') ctx.clearRect(0, 0, couche.width, couche.height)
    const etat = dessinerTrait(ctx, id, r, r.couleur, points.current, { dpr: dpr(), fond, pressionReelle: pressionReelle.current, fini }, aero.current)
    if (etat) aero.current = etat
  }, [coucheRef, fond])

  const planifier = useCallback(() => {
    if (image.current !== null) return
    image.current = requestAnimationFrame(() => { image.current = null; rendre(false) })
  }, [rendre])

  const relancerMinuteur = useCallback(() => {
    if (minuteur.current !== null) clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => {
      minuteur.current = null
      if (!enCours.current || fige.current || bord.current) return
      const r = redresser(points.current, 3 * dpr())
      if (!r) return
      // Le trait devient la forme : épaisseur égale, comme tracée au gabarit.
      points.current = r.points.map(p => ({ ...p, p: 0.5 }))
      pressionReelle.current = false
      fige.current = true
      aero.current = { index: 0, reste: 0 }
      const couche = coucheRef.current
      couche?.getContext('2d')?.clearRect(0, 0, couche.width, couche.height)
      rendre(false)
      setRedresse(r.forme)
    }, MAINTIEN_REDRESSE)
  }, [coucheRef, rendre])

  /** Position client → point du trait, appuyé contre la règle si le trait y a commencé. */
  const point = useCallback((clientX: number, clientY: number, pression: number): PointTrait => {
    let cx = clientX, cy = clientY
    const boite = conteneurRef.current?.getBoundingClientRect()
    if (bord.current && regle && boite) {
      const q = surLeBord(regle, bord.current as -1 | 1, { x: clientX - boite.left, y: clientY - boite.top }, actuel.current.reglage.taille / 2 + 1)
      cx = q.x + boite.left; cy = q.y + boite.top
    }
    const c = versCanvas(cx, cy)
    return { x: c.x, y: c.y, p: pression }
  }, [conteneurRef, regle, versCanvas])

  const debut = useCallback((clientX: number, clientY: number, pression: number, sorte: string) => {
    actuel.current = { outil, reglage: reglages[outil] }
    pressionReelle.current = sorte === 'pen' && pression > 0
    const boite = conteneurRef.current?.getBoundingClientRect()
    bord.current = regle && boite ? bordDeDepart(regle, { x: clientX - boite.left, y: clientY - boite.top }) : 0
    fige.current = false
    aero.current = { index: 0, reste: 0 }
    setRedresse(null)
    enCours.current = true
    dernierClient.current = { x: clientX, y: clientY }
    points.current = [point(clientX, clientY, pressionReelle.current ? pression : 0.5)]
    const couche = coucheRef.current
    if (couche) {
      const canvas = canvasRef.current
      if (canvas && (couche.width !== canvas.width || couche.height !== canvas.height)) { couche.width = canvas.width; couche.height = canvas.height }
      Object.assign(couche.style, styleCouche(actuel.current.outil, actuel.current.reglage, papierClair))
    }
    planifier()
    relancerMinuteur()
  }, [outil, reglages, regle, conteneurRef, coucheRef, canvasRef, papierClair, point, planifier, relancerMinuteur])

  const suite = useCallback((evenements: { clientX: number; clientY: number; pressure: number }[]) => {
    if (!enCours.current || fige.current) return
    for (const e of evenements) points.current.push(point(e.clientX, e.clientY, pressionReelle.current ? e.pressure : 0.5))
    const der = evenements[evenements.length - 1]
    // Le minuteur du redressement ne repart que si le doigt a VRAIMENT bougé.
    if (der && dernierClient.current && Math.hypot(der.clientX - dernierClient.current.x, der.clientY - dernierClient.current.y) > 3) {
      dernierClient.current = { x: der.clientX, y: der.clientY }
      relancerMinuteur()
    }
    planifier()
  }, [point, planifier, relancerMinuteur])

  /** Lève le doigt : le trait est versé sur la feuille. `annuler` : il n'a jamais eu lieu (pincement). */
  const fin = useCallback((annuler = false) => {
    if (!enCours.current) return
    enCours.current = false
    if (minuteur.current !== null) { clearTimeout(minuteur.current); minuteur.current = null }
    if (image.current !== null) { cancelAnimationFrame(image.current); image.current = null }
    const couche = coucheRef.current, canvas = canvasRef.current
    if (!couche || !canvas) return
    if (!annuler && points.current.length) {
      rendre(true)
      const { outil: id, reglage: r } = actuel.current
      const ctx = canvas.getContext('2d')
      if (ctx) verser(ctx, couche, id, r, papierClair)
    }
    couche.getContext('2d')?.clearRect(0, 0, couche.width, couche.height)
    points.current = []
    if (!annuler) onTraitPose()
  }, [coucheRef, canvasRef, rendre, papierClair, onTraitPose])

  useEffect(() => () => {
    if (minuteur.current !== null) clearTimeout(minuteur.current)
    if (image.current !== null) cancelAnimationFrame(image.current)
  }, [])

  return {
    outil, setOutil, reglage, reglages, changerReglage, encrerTout,
    regle, setRegle, redresse, enCours,
    debut, suite, fin,
  }
}
