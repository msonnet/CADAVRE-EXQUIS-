import { describe, it, expect } from 'vitest'
import { AMBIANCES, type AmbianceKey } from '../reve/pools'
import { garantirContraste, ratioContraste } from '../reve/contraste'

/**
 * Cinq rubriques, cinq couleurs — pour TOUTES les ambiances.
 *
 * La page des Règles distingue cinq entrées : cadavre écrit, cadavre
 * dessiné, l'Atelier, le poème du jour, l'Encrier. Elle n'avait que trois
 * couleurs — l'accent, le second, l'encre — si bien que deux paires
 * portaient la même : l'Atelier avec le poème du jour, l'Encrier avec le
 * cadavre écrit. À l'écran, des jumelles qui n'ont rien à voir.
 *
 * Chaque ambiance porte QUATRE accents ; on n'en exposait que deux.
 * `tierce` et `quarte` ouvrent les deux autres, et avec l'encre cela fait
 * cinq.
 *
 * ── Pourquoi la mesure balaie tout ────────────────────────────────────────
 *
 * L'ambiance est tirée au sort chaque jour, et l'indice du premier accent
 * l'est aussi. Vérifier la palette d'aujourd'hui ne prouverait rien : c'est
 * le pire tirage qu'il faut tenir, sur les sept ambiances et les quatre
 * points de départ.
 */

const CLES = Object.keys(AMBIANCES) as AmbianceKey[]

/**
 * Les cinq couleurs d'un tirage donné, telles que `Decor` les compose.
 *
 * `horsEncre` y est recopiée : sur les ambiances sombres, un accent VAUT
 * l'encre — le crème du papier joue les deux rôles — et il cède alors la
 * place à son `hover`, une couleur écrite dans la palette et non inventée.
 */
function cinqCouleurs(cle: AmbianceKey, depart: number): string[] {
  const a = AMBIANCES[cle]
  const bg = a.bg
  const ink = garantirContraste(a.ink, bg, 4.5)
  const at = (i: number) => {
    const acc = a.accents[(depart + i) % a.accents.length]
    const brut = acc.hex.toLowerCase() === a.ink.toLowerCase() ? acc.hover : acc.hex
    return garantirContraste(brut, bg, 4.5)
  }
  return [
    at(0),   // cadavre écrit
    at(1),   // cadavre dessiné
    at(2),   // l'Atelier
    at(3),   // le poème du jour
    ink,     // l'Encrier — son nom, l'encre
  ]
}

describe('les cinq rubriques des Règles ne se confondent jamais', () => {
  it('chaque ambiance porte au moins quatre accents', () => {
    // C'est ce qui rend les cinq couleurs possibles. Une ambiance ajoutée
    // avec trois accents ferait retomber deux rubriques sur la même.
    for (const cle of CLES) {
      expect(AMBIANCES[cle].accents.length, cle).toBeGreaterThanOrEqual(4)
    }
  })

  it('les cinq sont distinctes, à tout tirage', () => {
    for (const cle of CLES) {
      for (let depart = 0; depart < AMBIANCES[cle].accents.length; depart++) {
        const cinq = cinqCouleurs(cle, depart)
        expect(new Set(cinq.map(c => c.toLowerCase())).size,
          `${cle} · départ ${depart} — ${cinq.join(' ')}`).toBe(5)
      }
    }
  })

  it('et toutes lisibles sur le fond du jour', () => {
    // Une rubrique ne devient pas illisible parce qu'elle est la
    // quatrième : `tierce` et `quarte` passent le même plancher que les
    // deux premières.
    for (const cle of CLES) {
      const bg = AMBIANCES[cle].bg
      for (let depart = 0; depart < AMBIANCES[cle].accents.length; depart++) {
        for (const c of cinqCouleurs(cle, depart)) {
          expect(ratioContraste(c, bg), `${cle} · ${c}`).toBeGreaterThanOrEqual(4.4)
        }
      }
    }
  })
})
