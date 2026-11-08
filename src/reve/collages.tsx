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
const decor = (f: string) => `${import.meta.env.BASE_URL}decor/${f}`
const touchable = { pointerEvents: 'auto' as const, touchAction: 'manipulation' as const }

/**
 * Au toucher, le motif reçoit la classe `touche` le temps de sa réaction
 * (src/index.css), puis la rend. Sous mouvement réduit, la réaction n'a
 * pas d'animation : le toucher ne fait rien, et c'est voulu.
 */
function reagir(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  el.classList.remove('touche')
  void el.offsetWidth                    // pour qu'un second toucher rejoue
  el.classList.add('touche')
  el.addEventListener('animationend', () => el.classList.remove('touche'), { once: true })
}

// ── La Lune et le nuage — Un chien andalou (Buñuel et Dalí, 1929) ──
//
// La lune de Doppelmayr et Homann (Nuremberg, 1707), et un mince filet de
// nuée découpé dans la même planche : il traverse la lune, lentement, comme
// le nuage effilé du film. Au toucher, il passe vite.
const LuneEtNuage: React.FC<ProprietesMotif> = ({ w = 160 }) => (
  <span className="motif-lune" onPointerDown={reagir}
    style={{ ...touchable, display: 'block', position: 'relative', width: w, height: w, overflow: 'hidden' }}>
    <img className="lune-astre" src={decor('lune.webp')} alt="" draggable={false} width={w} height={w}
      style={{ position: 'absolute', inset: 0, width: w, height: w }} />
    <img className="lune-nuage" src={decor('nuage.webp')} alt="" draggable={false}
      style={{ position: 'absolute', left: 0, top: '45%', width: Math.round(w * 0.95) }} />
  </span>
)

// ── Le Poisson soluble — A. Breton, 1924 ──
//
// La carpe de Bloch (Ichthyologie, 1785). Elle nage sur place ; au toucher,
// elle se dissout — presque transparente, brouillée — et se reforme : le
// geste dit le titre.
const PoissonSoluble: React.FC<ProprietesMotif> = ({ w = 176 }) => (
  <img className="motif-carpe" src={decor('carpe.webp')} alt="" draggable={false} onPointerDown={reagir}
    style={{ ...touchable, display: 'block', width: w }} />
)

// ── La Clef des songes — d'après Magritte, 1930 ──
//
// Une clef d'ornement aux trois termes grotesques (1635, Rijksmuseum). Elle
// se balance, suspendue ; au toucher, elle tourne d'un quart de tour, comme
// dans une serrure, et revient.
const ClefDesSonges: React.FC<ProprietesMotif> = ({ w = 54 }) => (
  <span className="motif-clef-scene" style={{ display: 'block', padding: '0 18px' }}>
    <img className="motif-clef" src={decor('clef.webp')} alt="" draggable={false} onPointerDown={reagir}
      style={{ ...touchable, display: 'block', width: w }} />
  </span>
)

/** Le papier du bord découpé (scripts/decor-motifs.mjs) : le plafond de contraste le lit. */
const PAPIER_DECOUPE = '#f6f0e2'

const PHENAKISTISCOPE: Motif = { id: 'phenakistiscope', label: 'Le Phénakistiscope', ref: 'Vienne, v. 1830 · l’ancêtre des Rotoreliefs', draw: Phenakistiscope, w: 166, papier: PAPIER_DECOUPE }
const LUNE: Motif = { id: 'lune', label: 'La Lune et le nuage', ref: 'Un chien andalou, 1929 · lune de 1707', draw: LuneEtNuage, w: 160, papier: PAPIER_DECOUPE }
const POISSON: Motif = { id: 'poisson', label: 'Le Poisson soluble', ref: 'A. Breton, 1924 · carpe de Bloch, 1785', draw: PoissonSoluble, w: 176, papier: PAPIER_DECOUPE }
const CLEF: Motif = { id: 'clef', label: 'La Clef des songes', ref: 'd’après Magritte, 1930 · clef de 1635', draw: ClefDesSonges, w: 54, papier: PAPIER_DECOUPE }

/**
 * La semaine, lundi d'abord. Les cases vides attendent leur motif — l'Œil-
 * ballon (Redon), la Rencontre fortuite (Lautréamont), la Pomme (Magritte),
 * à retravailler avant production (docs/direction-artistique.md).
 */
export const SEMAINE: (Motif | null)[] = [PHENAKISTISCOPE, null, null, LUNE, POISSON, null, CLEF]

/** Les motifs produits, dans l'ordre de la semaine. */
export const MOTIFS: Motif[] = SEMAINE.filter((m): m is Motif => m !== null)

/**
 * Le motif d'un jour : celui de son jour de la semaine ; un jour encore vide
 * prend l'un des motifs produits, en tournant, pour que deux jours voisins
 * ne se ressemblent pas.
 */
export function motifDuJour(date: Date = new Date()): Motif {
  const lundiZero = (date.getDay() + 6) % 7
  return SEMAINE[lundiZero] ?? MOTIFS[lundiZero % MOTIFS.length]
}
