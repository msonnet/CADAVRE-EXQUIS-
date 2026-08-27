import { describe, it, expect } from 'vitest'
import { choisirProposition } from '../../api/claude'

// Jusqu'ici chaque case n'avait qu'une chance : le modèle rendait un fragment,
// on le validait ou on le jetait à la réserve. Toutes les corrections de ce
// projet étaient donc des CONTRAINTES. On demande maintenant trois
// propositions et on garde la meilleure — le problème passe de la contrainte
// à la sélection.

describe('choisirProposition', () => {
  it('préfère le mot ordinaire quand la case doit rester ordinaire', () => {
    expect(choisirProposition(['la déhiscence', 'le carreau', "l'involucre"], true)).toBe('le carreau')
    expect(choisirProposition(['un sertissage', 'un lacet'], true)).toBe('un lacet')
    expect(choisirProposition(['la schistosité', 'la chaudière', 'le drap'], true)).toBe('le drap')
  })

  it("ne pénalise PAS le mot savant quand la case a droit au métier", () => {
    // Sur une case de métier, « déhiscence » est le mot juste. À pénalité
    // égale on garde le plus court, et c'est tout.
    expect(choisirProposition(['la déhiscence', 'le carreau'], false)).toBe('le carreau')
    const c = choisirProposition(['la déhiscence du fruit', 'le carreau'], false)
    expect(c).toBe('le carreau')   // égalité de pénalité, le plus court gagne
  })

  it('écarte avant tout ce qui reprend un mot déjà employé', () => {
    // C'est la faute la plus audible, et le modèle désobéit à la liste des
    // interdits plus souvent qu'on ne croit.
    expect(choisirProposition(['la cendre', 'le tourteau'], true, ['cendre'])).toBe('le tourteau')
    // La même famille compte : « macérat » après « macère ».
    expect(choisirProposition(['un macérat', 'un lacet'], true, ['macère'])).toBe('un lacet')
  })

  it('fait passer la reprise avant la longueur', () => {
    // « cendre » est court mais déjà employé ; « la percolation » est long
    // mais neuf. La reprise pèse quatre, la longueur trois.
    expect(choisirProposition(['la cendre', 'la percolation'], true, ['cendre'])).toBe('la percolation')
  })

  it('rend quelque chose dès qu\'une proposition tient', () => {
    expect(choisirProposition(['le drap'], true)).toBe('le drap')
    expect(choisirProposition(['', 'le drap', ''], true)).toBe('le drap')
  })

  it("rend le vide quand aucune ne tient — la réserve prendra le relais", () => {
    expect(choisirProposition([], true)).toBe('')
    expect(choisirProposition(['', '', ''], true)).toBe('')
  })

  it('préfère le court à pénalité égale', () => {
    expect(choisirProposition(['le vieux drap troué', 'le drap'], true)).toBe('le drap')
  })

  it('ne se laisse pas piéger par les mots de moins de trois lettres', () => {
    // Le filtre interne ignore « le », « du », « ce » : ils ne comptent ni
    // comme reprise ni comme longueur.
    expect(choisirProposition(['le drap', 'du drap'], true, ['le', 'du'])).toBeTruthy()
  })
})
