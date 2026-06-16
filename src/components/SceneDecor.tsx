import { useEffect, useRef, useState } from 'react'
import { SCENES } from '../reve/scenes'
import { useReve } from '../reve'

const DARK_AMBIANCES = new Set(['minuit', 'encre', 'argile'])

/**
 * SceneDecor — calques illustrés IA (gravure monochrome) posés derrière le
 * contenu d'un écran, avec parallaxe légère au pointeur/gyroscope et dérive
 * atmosphérique lente. Chaque calque vient de public/scenes/<id>/<calque>.webp
 * (généré par scripts/generer-decor.mjs) ; si le fichier n'existe pas encore
 * (pas de FAL_KEY en local), il se masque silencieusement — l'écran retombe
 * sur le fond plat existant, rien ne casse.
 */
export default function SceneDecor({ id }: { id: string }) {
  const s = useReve()
  const scene = SCENES[id]
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const reduceMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current

  useEffect(() => {
    if (!scene || reduceMotion) return
    function onMove(e: PointerEvent) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      setTilt({ x, y })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [scene, reduceMotion])

  if (!scene) return null
  const isDark = DARK_AMBIANCES.has(s?.ambiance.id ?? '')

  return (
    <div aria-hidden data-scene-decor style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}>
      {scene.layers.map((layer) => (
        <div
          key={layer.src}
          style={{
            position: 'absolute', inset: 0,
            transform: reduceMotion
              ? undefined
              : `translate3d(${tilt.x * layer.depth * 14}px, ${tilt.y * layer.depth * 14}px, 0)`,
            transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          <img
            src={`/scenes/${id}/${layer.src}.webp`}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: layer.opacity ?? 1,
              mixBlendMode: layer.blend ?? 'normal',
              filter: layer.invertOnDark && isDark ? 'invert(1) brightness(0.88)' : undefined,
              animation: layer.driftS && !reduceMotion ? `sceneDrift ${layer.driftS}s ease-in-out infinite` : undefined,
            }}
          />
        </div>
      ))}
    </div>
  )
}
