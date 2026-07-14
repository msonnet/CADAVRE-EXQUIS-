import { describe, it, expect, vi } from 'vitest'

// La validation anglaise se déclenche sur la langue active : on la force à 'en'.
vi.mock('../i18n', () => ({
  langueActuelle: () => 'en',
  tr: (_fr: string, en: string) => en,
}))

import { validerCase } from '../utils/validation'

const strict = (texte: string, type: Parameters<typeof validerCase>[1]) =>
  validerCase(texte, type, 'stricte')

describe('validation stricte EN — verbes', () => {
  it('accepte une forme conjuguée connue', () => {
    expect(strict('devours', 'verbe').valide).toBe(true)
    expect(strict('fell', 'verbe-transitif').valide).toBe(true)
  })
  it('tolère un mot unique inconnu sans article', () => {
    expect(strict('smolders', 'verbe').valide).toBe(true)
  })
  it('refuse un groupe nominal à la place du verbe', () => {
    expect(strict('the cold moon', 'verbe').valide).toBe(false)
  })
})

describe('validation stricte EN — noms et groupes nominaux', () => {
  it('accepte un nom avec article', () => {
    expect(strict('the rain', 'nom').valide).toBe(true)
  })
  it('refuse une phrase complète comme nom', () => {
    expect(strict('the rain falls on the roof', 'nom').valide).toBe(false)
  })
  it('accepte un groupe nominal riche', () => {
    expect(strict('a pale door of salt', 'groupe-nominal-riche').valide).toBe(true)
  })
  it('refuse une phrase complète comme groupe nominal', () => {
    expect(strict('the shadow devours the last candle', 'groupe-nominal').valide).toBe(false)
  })
})

describe('validation stricte EN — adjectifs et adverbes', () => {
  it('accepte un adjectif seul', () => {
    expect(strict('hollow', 'adjectif').valide).toBe(true)
  })
  it('refuse un verbe comme adjectif', () => {
    expect(strict('devours', 'adjectif').valide).toBe(false)
  })
  it('accepte un adverbe en -ly et une locution', () => {
    expect(strict('gently', 'adverbe').valide).toBe(true)
    expect(strict('without a sound', 'adverbe').valide).toBe(true)
  })
})

describe('validation stricte EN — formes spéciales', () => {
  it('proposition : exige une question', () => {
    expect(strict('the night is long', 'proposition').valide).toBe(false)
    expect(strict('where do the shadows go?', 'proposition').valide).toBe(true)
  })
  it('gérondif : forme en -ing en tête', () => {
    expect(strict('falling', 'gérondif').valide).toBe(true)
    expect(strict('the fall', 'gérondif').valide).toBe(false)
  })
  it('infinitif : « to + verbe », sans article', () => {
    expect(strict('to burn', 'infinitif').valide).toBe(true)
    expect(strict('the burn', 'infinitif').valide).toBe(false)
  })
  it('article-adj : exige les deux mots', () => {
    expect(strict('a dark', 'article-adj').valide).toBe(true)
    expect(strict('the', 'article-adj').valide).toBe(false)
  })
  it('conjonctions : mots courts, pas de phrase', () => {
    expect(strict('however', 'conjonction-coord').valide).toBe(true)
    expect(strict('but the night falls', 'conjonction-coord').valide).toBe(false)
    expect(strict('as soon as', 'conjonction-subord').valide).toBe(true)
  })
})

describe('validation EN — niveaux', () => {
  it('souple : tout texte non vide passe', () => {
    expect(validerCase('anything at all goes here', 'verbe', 'souple').valide).toBe(true)
    expect(validerCase('   ', 'verbe', 'souple').valide).toBe(false)
  })
})
