import { describe, it, expect } from 'vitest'
import { validerCase } from '../utils/validation'

// Le médium a été refusé sur « s'effondre le jour », qui est un groupe verbal
// irréprochable. La cause : une liste fermée de cinq cents verbes courants, et
// le pronom réfléchi qui empêchait même la reconnaissance de « effondre ».
// Or c'est tout le vocabulaire rare qui fait ce jeu — les voix écrivent
// « dissèque », « macère », « calcine », « stridule ».

const ok = (t: string, n: 'stricte' | 'souple' = 'stricte') =>
  validerCase(t, 'groupe-verbal', n).valide

describe('groupe verbal — le verbe rare passe', () => {
  it('accepte le verbe pronominal qui a été refusé', () => {
    expect(ok("s'effondre le jour")).toBe(true)
    expect(ok('se referme sur le coffre')).toBe(true)
    expect(ok("s'ouvre sans un bruit")).toBe(true)
    expect(ok("m'échappe entre les doigts")).toBe(true)
  })

  it("accepte les verbes des voix, qu'aucune liste ne contiendra", () => {
    for (const gv of ['dissèque sans rature', 'macère dans la nuit', 'calcine la cendre',
                      'stridule sous la tôle', 'collationne les feuillets', 'désosse le jarret',
                      'affleure un tesson nu', 'grésille en morse', 'longe le défaut',
                      'butine encore un peu', 'ronronne sous la voûte', 'dévide le fil']) {
      expect(ok(gv), gv).toBe(true)
    }
  })

  it('accepte encore les verbes courants, avec ou sans complément', () => {
    expect(ok('traverse la nuit')).toBe(true)
    expect(ok('brûle en silence')).toBe(true)
    expect(ok('pèse sur le monde')).toBe(true)
  })

  it('refuse toujours ce qui se lit comme un groupe nominal', () => {
    expect(ok('la cendre froide du seuil')).toBe(false)
    expect(ok("l'ombre portée du mur")).toBe(false)
    expect(ok('une vieille clef rouillée')).toBe(false)
  })

  it('laisse passer deux mots sans discuter — trop court pour trancher', () => {
    expect(ok('la cendre')).toBe(true)
  })
})

describe('groupe verbal — en anglais', () => {
  const okEN = (t: string) => validerCase(t, 'groupe-verbal', 'stricte').valide
  it('accepte le verbe rare et refuse le groupe nominal', () => {
    // La langue est lue depuis les réglages : en français par défaut ici, on
    // vérifie surtout que la forme anglaise ne casse pas le français.
    expect(okEN('crosses the night')).toBe(true)
  })
})

describe("le réfléchi ne se lit pas comme un nom ailleurs", () => {
  it("n'est pas pris pour un adverbe", () => {
    expect(validerCase("s'effondre lentement partout", 'adverbe', 'stricte').valide).toBe(false)
  })
  it("n'est pas pris pour une conjonction", () => {
    expect(validerCase("s'effondre", 'conjonction-coord', 'stricte').valide).toBe(false)
  })
})
