import React from 'react'

// ════════════════════════════════════════════════════════════════════════
// LES MOTIFS DU JOUR — le décor vivant (docs/direction-artistique.md)
//
// Décisions de l'auteur, 7 novembre 2026 :
// - les motifs animés vivent UNIQUEMENT sur l'accueil ;
// - SEPT motifs, un par jour de la semaine ;
// - un mouvement subtil, qui vit de lui-même, et qui se modifie légèrement
//   quand on le touche ;
// - les dix-huit dessins au trait d'avant (rotorelief, œil tranché, pipe,
//   montres molles…) sont supprimés, partout.
//
// Chaque motif est une VRAIE gravure, du domaine public ou en CC0, jamais
// une caricature d'époque (resources/gravures/SOURCES.md). En couleurs
// d'origine ; sur les ambiances sombres, le décor baisse sa lumière jusqu'au
// plafond de contraste (`filtreSymbole`, Decor.tsx).
//
// Tant que les sept ne sont pas tous validés sur images témoins, les jours
// sans motif propre reprennent les motifs existants, dans l'ordre.
// ════════════════════════════════════════════════════════════════════════

type ProprietesMotif = { w?: number }

export interface Motif {
  id: string
  /** Le nom du cartel. */
  label: string
  /** La référence du cartel. */
  ref: string
  draw: React.FC<ProprietesMotif>
  /** La taille de base ; l'accueil l'affiche à 90 %. */
  w: number
  /** La couleur du papier de la gravure, mesurée sur le scan : le plafond de contraste la lit. */
  papier: string
}

/**
 * Au toucher, le disque s'emballe — comme sous une chiquenaude — puis
 * retrouve son pas en une seconde et demie. Sous mouvement réduit, aucune
 * animation ne tourne : le toucher ne fait rien, et c'est voulu.
 */
function chiquenaude(e: React.PointerEvent<HTMLElement>) {
  const anim = e.currentTarget.getAnimations?.()[0]
  if (!anim) return
  const debut = performance.now()
  const DUREE = 1500
  const pas = () => {
    const t = Math.min(1, (performance.now() - debut) / DUREE)
    anim.updatePlaybackRate(1 + 2 * (1 - t) * (1 - t))   // ×3, puis la décrue
    if (t < 1) requestAnimationFrame(pas)
  }
  pas()
}

// ── Le Phénakistiscope — un VRAI disque, Vienne, vers 1830 ──
//
// Un disque stroboscopique viennois (Cooper Hewitt, Smithsonian, domaine
// public). Deux anneaux de douze images : un chat bondit par-dessus un
// tabouret, un âne en redingote tourne la tête. Le disque tourne d'un
// douzième de tour par image (`.phenakistiscope`, src/index.css) : c'est
// l'animation d'origine, rien n'est inventé.
const Phenakistiscope: React.FC<ProprietesMotif> = ({ w = 166 }) => (
  <img
    src={`${import.meta.env.BASE_URL}decor/phenakistiscope.webp`}
    width={w} height={w} alt="" draggable={false}
    className="phenakistiscope"
    onPointerDown={chiquenaude}
    style={{ display: 'block', width: w, height: w, pointerEvents: 'auto', touchAction: 'manipulation' }}
  />
)

/** Les motifs, dans l'ordre de la semaine : lundi d'abord. */
export const MOTIFS: Motif[] = [
  { id: 'phenakistiscope', label: 'Le Phénakistiscope', ref: 'disque stroboscopique · Vienne, v. 1830', draw: Phenakistiscope, w: 166, papier: '#eddbba' },
]

/**
 * Le motif d'un jour : un par jour de la semaine, lundi = le premier. Tant
 * qu'il y en a moins de sept, la semaine reprend les motifs existants.
 */
export function motifDuJour(date: Date = new Date()): Motif {
  const lundiZero = (date.getDay() + 6) % 7
  return MOTIFS[lundiZero % MOTIFS.length]
}
