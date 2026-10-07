import { useEffect, useRef, useState } from 'react'
import { tr, langueActuelle } from '../../i18n'
import { OUTILS, ORDRE_OUTILS, chiffreDuFut, type OutilId } from '../../lib/trait/outils'
import type { Reglages } from '../../hooks/useStudio'
import { groupeRadio, optionRadio } from '../../lib/a11y'
import Instrument, { HAUTEUR_INSTRUMENT, LARGEUR_INSTRUMENT } from './Instrument'

/**
 * La trousse : les instruments debout dans un plateau d'ivoire, la règle à
 * gauche, la couleur à droite — la disposition de Freeform.
 *
 * Un toucher choisit l'instrument, qui se soulève. Un SECOND toucher sur
 * l'instrument déjà levé ouvre ses réglages : c'est là que vivent l'épaisseur
 * au pixel et l'opacité. Un enfant ne voit que des crayons ; le dessinateur
 * trouve le reste sans qu'on le lui étale.
 */

interface Props {
  outil: OutilId
  reglages: Reglages
  onChoisir: (id: OutilId) => void
  onRegler: (id: OutilId) => void
  regle: boolean
  onRegle: () => void
  onCouleur: () => void
  /** Hauteur visible du plateau (les instruments plongent sous son bord). */
  hauteur?: number
  /** La couleur du papier : le plateau en dérive, pour ne pas trancher sur la feuille. */
  papier?: string
}

const ECHELLE = 1.25
const PLONGE = 26   // de combien un instrument au repos s'enfonce de plus qu'un instrument levé
// L'instrument levé garde sa pointe DANS le plateau, à quelques pixels du
// bord : au premier jet il montait de 16 px au-dessus et le bord la coupait.
const LEVEE = 3

function melange(a: string, b: string, t: number) {
  const h = (x: string) => { const n = parseInt(x.replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const A = h(a), B = h(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
const sombre = (c: string) => { const n = parseInt(c.replace('#', '').slice(0, 6), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 110 }

export const nomOutil = (id: OutilId) => (langueActuelle() === 'en' ? OUTILS[id].nom[1] : OUTILS[id].nom[0])

export default function Trousse({ outil, reglages, onChoisir, onRegler, regle, onRegle, onCouleur, hauteur = 92, papier = '#fdf8f2' }: Props) {
  // Le nom de l'instrument qu'on vient de prendre s'affiche un instant au-dessus
  // du plateau : sans étiquettes permanentes, il faut pouvoir apprendre leurs noms.
  const [nomVu, setNomVu] = useState<string | null>(null)
  const minuteur = useRef<number | null>(null)
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current) }, [])
  const annoncer = (id: OutilId) => {
    setNomVu(nomOutil(id))
    if (minuteur.current) clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setNomVu(null), 1300)
  }

  const couleur = reglages[outil].couleur
  const w = LARGEUR_INSTRUMENT * ECHELLE, h = HAUTEUR_INSTRUMENT * ECHELLE
  const levee = LEVEE
  // Le plateau est le papier éclairci, pas un ivoire fixe : sur le kraft, un
  // plateau blanc faisait un trou dans la feuille. Sur l'ardoise, on éclaircit
  // davantage pour que les instruments d'ivoire restent lisibles.
  const clair = sombre(papier) ? 0.62 : 0.45
  const haut = melange(papier, '#ffffff', clair + 0.08), bas = melange(papier, '#ffffff', clair)
  return (
    <div style={{ position: 'relative' }}>
      {nomVu && (
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, top: -26, textAlign: 'center', pointerEvents: 'none',
          fontFamily: "'Raleway', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: '#6d6558',
        }}>{nomVu.toUpperCase()}</div>
      )}
      <div style={{
        display: 'flex', alignItems: 'stretch', height: hauteur,
        background: `linear-gradient(${haut}, ${bas})`, borderRadius: 30,
        boxShadow: '0 10px 26px rgba(40,28,16,0.14), 0 2px 6px rgba(40,28,16,0.07), inset 0 1px 0 rgba(255,255,255,0.7)',
        overflow: 'hidden',
      }}>
        {/* La règle, couchée en tête de la trousse. */}
        <button
          type="button" onClick={onRegle}
          aria-pressed={regle} aria-label={tr('Règle', 'Ruler')}
          style={{ flex: '0 0 auto', width: 50, border: 'none', background: 'none', padding: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          <svg width={34} height={h} viewBox={`0 0 34 ${h}`} aria-hidden style={{
            position: 'absolute', left: 10, top: regle ? levee : levee + PLONGE,
            transition: 'top 0.22s cubic-bezier(.2,.9,.3,1.2)',
            filter: `drop-shadow(0 ${regle ? 6 : 2}px ${regle ? 7 : 3}px rgba(40,28,16,${regle ? 0.24 : 0.16}))`,
          }}>
            <defs><linearGradient id="regle-verre" x1="0" x2="1"><stop offset="0" stopColor="#efe9dd" /><stop offset="0.5" stopColor="#ffffff" /><stop offset="1" stopColor="#e2dacb" /></linearGradient></defs>
            <rect x={4} y={10} width={26} height={h} rx={3} fill="url(#regle-verre)" stroke="#d3c9b6" strokeWidth={0.8} />
            {Array.from({ length: 14 }, (_, i) => (
              <line key={i} x1={4} x2={i % 2 ? 11 : 16} y1={18 + i * 6} y2={18 + i * 6} stroke="#8b8172" strokeWidth={0.8} />
            ))}
          </svg>
        </button>

        <div
          {...groupeRadio(tr('Instruments', 'Instruments'))}
          style={{ flex: 1, minWidth: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {ORDRE_OUTILS.map(id => {
            const actif = id === outil
            const r = reglages[id]
            return (
              <button
                key={id} type="button"
                {...optionRadio(actif, nomOutil(id))}
                title={actif ? tr('Toucher encore pour régler', 'Tap again for settings') : nomOutil(id)}
                data-outil={id}
                onClick={() => { if (actif) onRegler(id); else { onChoisir(id); annoncer(id) } }}
                style={{ flex: '0 0 auto', width: w + 2, border: 'none', background: 'none', padding: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{
                  position: 'absolute', left: 1, top: actif ? levee : levee + PLONGE,
                  transform: `scale(${ECHELLE})`, transformOrigin: '0 0',
                  transition: 'top 0.22s cubic-bezier(.2,.9,.3,1.2)',
                  filter: `drop-shadow(0 ${actif ? 5 : 2}px ${actif ? 6 : 3}px rgba(40,28,16,${actif ? 0.24 : 0.15}))`,
                }}>
                  <Instrument id={id} couleur={OUTILS[id].sansCouleur ? '#e9a6a2' : r.couleur} chiffre={chiffreDuFut(id, r.taille)} />
                </div>
              </button>
            )
          })}
        </div>

        {/* La couleur : un anneau chromatique, la couleur de l'outil au centre. */}
        <button
          type="button" onClick={onCouleur}
          aria-label={tr('Choisir une couleur', 'Choose a color')}
          disabled={OUTILS[outil].sansCouleur}
          style={{ flex: '0 0 auto', width: 64, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: OUTILS[outil].sansCouleur ? 0.4 : 1 }}
        >
          <span style={{
            width: 42, height: 42, borderRadius: '50%', display: 'block',
            background: 'conic-gradient(#ff4d4d, #ffb03b, #f7f740, #5ee05e, #3fd5e0, #4a6cff, #b84dff, #ff4dc1, #ff4d4d)',
            boxShadow: '0 2px 6px rgba(40,28,16,0.2)', position: 'relative',
          }}>
            <span style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: couleur, boxShadow: `0 0 0 2.5px ${haut}` }} />
          </span>
        </button>
      </div>
    </div>
  )
}
