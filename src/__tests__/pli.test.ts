import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  resteDuPli, tranchesDuFeuillet, avancement,
  DUREE_RABAT, COURBE_RABAT, COURBE_DEPLI, ANGLE_RABAT,
} from '../lib/pli'

/**
 * Le pli à l'écriture.
 *
 * Relevé avant : « sceller » écrasait le champ (`scaleY: 0`,
 * `filter: brightness(0.7)`) puis coupait l'écran ; rien ne disait ce que la
 * visibilité transmettait, et rien ne montrait que la feuille s'épaississait.
 * Ces mesures tiennent ce qui se compte : ce qui reste, combien de temps,
 * selon quelle courbe, et combien d'épaisseurs.
 */

describe('ce que le pli laisse voir', () => {
  it('aveugle : rien', () => {
    expect(resteDuPli('le vin rouge', 'aveugle')).toBeNull()
  })

  it('dernier mot : le dernier mot, tel qu’écrit', () => {
    expect(resteDuPli('le vin rouge', 'dernier-mot')).toBe('rouge')
    expect(resteDuPli('  traverse   la nuit  ', 'dernier-mot')).toBe('nuit')
  })

  it('dernière case : la case entière', () => {
    expect(resteDuPli(' le vin rouge ', 'derniere-case')).toBe('le vin rouge')
  })

  it('une case vide ne laisse rien, quelle que soit la règle', () => {
    for (const v of ['aveugle', 'dernier-mot', 'derniere-case'] as const) {
      expect(resteDuPli('   ', v)).toBeNull()
      expect(resteDuPli(undefined, v)).toBeNull()
    }
  })

  it('le jeu ne garde qu’une copie de la règle — celle que le rabat affiche', () => {
    // Le mot resté sur la tranche doit être celui que lit le tour suivant,
    // et celui que reçoit la voix : une seule fonction pour les trois.
    const jeu = readFileSync(resolve(__dirname, '../pages/Jeu.tsx'), 'utf8')
    const corps = jeu.slice(jeu.indexOf('function getContexteVisible'), jeu.indexOf('function scinderRubrique'))
    expect(corps).toContain('resteDuPli(')
    expect(corps).not.toMatch(/split\(/)
  })
})

describe('le rabat', () => {
  it('ne dure pas plus que l’écrasement qu’il remplace, et reste court', () => {
    expect(DUREE_RABAT).toBeLessThanOrEqual(0.4)
    expect(DUREE_RABAT).toBeLessThan(0.7)
  })

  it('part de l’angle d’où le dépli arrive', () => {
    expect(ANGLE_RABAT).toBe(-92)
  })

  it('se met en mouvement dès l’appui — aucun temps mort', () => {
    // Le dépli rembobiné à la lettre ne parcourait que 0,5 % de l'angle au
    // premier cinquième du temps : la bande semblait ne pas répondre.
    const rembobine = [1 - COURBE_DEPLI[2], 1 - COURBE_DEPLI[3], 1 - COURBE_DEPLI[0], 1 - COURBE_DEPLI[1]] as const
    expect(avancement(rembobine, 0.2)).toBeLessThan(0.01)
    expect(avancement(COURBE_RABAT, 0.2)).toBeGreaterThanOrEqual(0.03)
  })

  it('garde le sens d’un rabat : lent puis vite, jamais l’inverse', () => {
    expect(avancement(COURBE_RABAT, 0.5)).toBeLessThan(0.35)
    expect(avancement(COURBE_RABAT, 0.9)).toBeGreaterThan(0.7)
  })

  it('n’anime plus de filtre dans le jeu', () => {
    // `filter` force à repeindre la case à chaque trame ; le rabat n'anime
    // que transform et opacity.
    const jeu = readFileSync(resolve(__dirname, '../pages/Jeu.tsx'), 'utf8')
    expect(jeu).not.toMatch(/brightness\(/)
    expect(jeu).toContain('<Rabat')
    const rabat = readFileSync(resolve(__dirname, '../components/Rabat.tsx'), 'utf8')
    const anime = rabat.match(/animate=\{[^}]*\}/g) ?? []
    expect(anime.length).toBeGreaterThan(0)
    for (const a of anime) expect(a).not.toMatch(/filter|height|scaleY/)
  })
})

describe('les épaisseurs du feuillet', () => {
  it('une tranche par case scellée, ni plus ni moins', () => {
    for (let n = 0; n <= 12; n++) expect(tranchesDuFeuillet(n)).toHaveLength(n)
  })

  it('chaque épaisseur plus loin est plus courte et plus pâle', () => {
    const t = tranchesDuFeuillet(6)
    for (let i = 1; i < t.length; i++) {
      expect(t[i].retrait).toBeGreaterThan(t[i - 1].retrait)
      expect(t[i].opacite).toBeLessThan(t[i - 1].opacite)
    }
  })

  it('la même géométrie que le feuillet fermé du poème du jour', () => {
    // Trois pixels de retrait, opacité 0,16 décroissante : les règles de
    // `FeuilletPlie`, écrites une fois.
    expect(tranchesDuFeuillet(4).map(t => t.retrait)).toEqual([3, 6, 9, 12])
    expect(tranchesDuFeuillet(4)[0].opacite).toBeCloseTo(0.16 * (1 - 0 / 5))
  })

  it('douze plis tiennent sur un écran de 320 sans faire un entonnoir', () => {
    // La plus courte garde au moins 80 % de la largeur d'une bande de 288 px.
    const t = tranchesDuFeuillet(12)
    expect(288 - 2 * t[t.length - 1].retrait).toBeGreaterThanOrEqual(0.8 * 288)
  })
})
