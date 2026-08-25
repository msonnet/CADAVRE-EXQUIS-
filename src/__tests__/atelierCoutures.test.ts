import { describe, it, expect } from 'vitest'
import { recalerMains, motsInterdits } from '../pages/JeuAtelier'
import { nomDeVoix } from '../data/voiceIds'

describe('recalerMains — les cases suivent le vers corrigé', () => {
  it('redécoupe le vers corrigé sur le découpage des cases', () => {
    // Le cas réel : « colationne » corrigé en « collationne ».
    const mains = [
      { role: 'CONJONCTION', texte: 'dès que' },
      { role: 'SUJET', texte: 'la calotte' },
      { role: 'VERBE', texte: 'colationne' },
    ]
    expect(recalerMains(mains, 'dès que la calotte collationne').map(m => m.texte))
      .toEqual(['dès que', 'la calotte', 'collationne'])
  })

  it("l'autre cas réel : « le traverse » corrigé en « le travers »", () => {
    const mains = [
      { role: 'CONJONCTION', texte: 'lorsque' },
      { role: 'SUJET', texte: 'la réfraction' },
      { role: 'VERBE', texte: 'imprègne' },
      { role: 'COMPLÉMENT', texte: 'le traverse' },
    ]
    expect(recalerMains(mains, 'lorsque la réfraction imprègne le travers').map(m => m.texte))
      .toEqual(['lorsque', 'la réfraction', 'imprègne', 'le travers'])
  })

  it('conserve tout le reste de la case', () => {
    const mains = [{ role: 'SUJET', texte: 'le propolis', voixNom: "L'apiculteur", reserve: true }]
    const [m] = recalerMains(mains, 'la propolis')
    expect(m).toEqual({ role: 'SUJET', texte: 'la propolis', voixNom: "L'apiculteur", reserve: true })
  })

  it("n'invente rien si la correction a changé le nombre de mots", () => {
    const mains = [
      { role: 'SUJET', texte: 'le garçon se couche' },
      { role: 'VERBE', texte: 'tient du vide' },
    ]
    // Sept mots à l'origine, cinq après : on rend les cases telles quelles.
    expect(recalerMains(mains, 'le garçon tient du vide')).toEqual(mains)
  })

  it('supporte une case vide sans planter', () => {
    expect(recalerMains([], 'peu importe')).toEqual([])
  })
})

describe('nomDeVoix — les coutures ne montrent plus les identifiants', () => {
  it('traduit les identifiants sans accent ni article', () => {
    expect(nomDeVoix('geologue', 'fr')).toBe('Le géologue')
    expect(nomDeVoix('medecin', 'fr')).toBe('Le médecin')
    expect(nomDeVoix('reveur', 'fr')).toBe('Le rêveur')
    expect(nomDeVoix('speleologue', 'fr')).toBe('Le spéléologue')
    expect(nomDeVoix('epistolier', 'fr')).toBe("L'épistolier")
  })

  it('couvre les 46 identifiants du poème examiné', () => {
    const vus = ['enlumineur', 'geologue', 'cartographe', 'traducteur', 'medecin',
      'cartomancien', 'astronome', 'apiculteur', 'collecteuse', 'botaniste', 'psalmiste',
      'lexicographe', 'chimiste', 'meteorologue', 'parfumeur', 'convalescent', 'epistolier',
      'horloger', 'alchimiste', 'jardinier', 'somnambule', 'herboriste', 'reveur', 'greffier',
      'souffleur de verre', 'marin', 'notice', 'funambule', 'photographe', 'telegraphiste',
      'entomologiste', 'cuisinier', 'archiviste', 'ornithologiste', 'archeologue',
      'prisonnier', 'speleologue', 'fossoyeur', 'graveur', 'enfant', 'boucher', 'tisserand',
      'detective', 'libraire', 'insomniaque', 'musicien']
    for (const id of vus) {
      expect(nomDeVoix(id, 'fr')).not.toBe('La voix')
      expect(nomDeVoix(id, 'fr')).not.toBe(id)
    }
  })
})

describe('motsInterdits — le serveur ne garde que les 60 premiers', () => {
  it("l'écho passe en tête : c'est le mot le plus tentant à recopier", () => {
    const l = motsInterdits({ echo: 'couvain', enCours: 'le seuil', vers: [], conjCourtes: [] })
    expect(l[0]).toBe('couvain')
  })

  it('les vers récents passent avant les anciens', () => {
    // La regex du filtre ne garde que les lettres : des mots purement
    // alphabétiques, sinon tous se réduisent à la même racine.
    const mot = (i: number) => 'abcdefghijklmnopqrstuvwxyz'[i % 26].repeat(4)
    const vers = Array.from({ length: 26 }, (_, i) => ({ texte: mot(i) }))
    const l = motsInterdits({ vers, conjCourtes: [] })
    expect(l[0]).toBe(mot(25))
    expect(l[l.length - 1]).toBe(mot(0))
  })

  it("l'écho survit à la troncature sur un poème long — la régression corrigée", () => {
    // Trente-quatre vers de six mots distincts : bien plus que les soixante
    // que le serveur garde. Avant, l'écho était en queue et se faisait couper.
    const vers = Array.from({ length: 34 }, (_, i) => ({
      texte: ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta']
        .map(r => r + 'x'.repeat(i + 1)).join(' '),
    }))
    const l = motsInterdits({ echo: 'couvain', vers, conjCourtes: [] })
    expect(l.length).toBeGreaterThan(60)
    expect(l.slice(0, 60)).toContain('couvain')
  })

  it('ignore les mots de deux lettres ou moins, comme le serveur', () => {
    const l = motsInterdits({ vers: [{ texte: 'un le de mur' }], conjCourtes: [] })
    expect(l).toContain('mur')
    expect(l).not.toContain('un')
  })
})
