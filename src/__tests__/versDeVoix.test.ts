import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ecrireVersDeVoix, demandeDeVers, retenirVers, MODELE_VERS, N_PROPOSITIONS } from '../../api/_vers.js'
import { VOIX } from '../../api/_voices.js'
import { MOTS_MAX } from '../../api/_jour.js'

/**
 * Les voix du poème du jour écrivent comme celles de l'Atelier.
 *
 * Avant : deux copies d'une consigne générique (« Écris UN vers de poésie
 * surréaliste, 3 à 8 mots »), sur le modèle des fragments, une seule
 * réponse prise telle quelle. Le vers que tout le monde lit était écrit par
 * la voix la moins travaillée du jeu.
 */

const API = join(__dirname, '../../api')
const lire = (f: string) => readFileSync(join(API, f), 'utf8')

describe('une seule façon d\'écrire un vers de voix', () => {
  it('ni le scellement ni le remplacement ne gardent leur copie', () => {
    for (const f of ['cleanup.ts', 'signaler-vers.ts']) {
      const t = lire(f)
      expect(t, f).toContain("from './_vers.js'")
      expect(t, f).not.toMatch(/Écris UN vers de poésie surréaliste/)
      expect(t, f).not.toMatch(/api\.anthropic\.com/)
    }
  })

  it('le modèle est celui des vers entiers de l\'Atelier', () => {
    const atelier = lire('claude.ts')
    expect(atelier).toContain(`type === 'libre' ? '${MODELE_VERS}'`)
  })

  it('la demande porte l\'empreinte de l\'Atelier, mot pour mot', () => {
    // Si l'Atelier change sa phrase un jour, le poème du jour doit suivre —
    // une duplication qui dérive serait pire qu'une duplication assumée.
    const atelier = lire('claude.ts')
    for (const langue of ['fr', 'en'] as const) {
      const d = demandeDeVers({ echo: 'cire', langue, mots: 5 })
      const empreinte = langue === 'fr'
        ? "Ce vers entier doit porter ton empreinte : une chose concrète, prise dans ton univers propre."
        : 'This full line must carry your signature: one concrete thing from your own world.'
      expect(d).toContain(empreinte)
      expect(atelier).toContain(empreinte)
      expect(d).toContain(langue === 'fr' ? 'JAMAIS de style télégraphique' : 'NEVER telegraphic')
    }
  })

  it('la voix ne reçoit que l\'écho — l\'aveuglement tient', () => {
    const d = demandeDeVers({ echo: 'cire', langue: 'fr', mots: 5 })
    expect(d).toContain('« cire »')
    expect(d).not.toMatch(/INTERDICTION|déjà employés/)
  })
})

describe('le choix parmi trois propositions', () => {
  it('écarte la méta, la puce, la ponctuation, et garde la plus sobre', () => {
    const brut = [
      'Voici trois propositions :',
      '1. la balance rouillée compte les heures du quai.',
      '- une lampe sourde',
      '« le sel monte »',
    ].join('\n')
    const v = retenirVers(brut, 'fr')
    expect(v).toBeTruthy()
    expect(v).not.toMatch(/^Voici|[.«»]|^\d|^-/)
  })

  it('rien ne passe au-delà de la borne du vers humain', () => {
    const long = Array(MOTS_MAX + 2).fill('mot').join(' ')
    expect(retenirVers(long, 'fr')).toBeNull()
  })

  it('une réponse coupée par le plafond perd sa dernière ligne', () => {
    expect(retenirVers('la cire se souvient\nune ombre qui gliss', 'fr', true)).toBe('la cire se souvient')
  })
})

describe('l\'appel', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('tire la longueur et le cadran, demande trois propositions, et choisit', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'cle-test')
    const corps: any[] = []
    vi.stubGlobal('fetch', async (_u: string, init: any) => {
      corps.push(JSON.parse(init.body))
      return new Response(JSON.stringify({
        content: [{ text: 'le greffe pèse la pluie\nune encre qui attend\nle registre dort debout' }],
        stop_reason: 'end_turn',
      }))
    })
    const v = await ecrireVersDeVoix(VOIX[0], 'cire', 'fr', () => 0.2)
    expect(v).toBeTruthy()
    expect(corps[0].model).toBe(MODELE_VERS)
    expect(corps[0].messages[0].content).toContain(`${N_PROPOSITIONS} propositions`)
    // 3 + floor(0,2 × 6) = 4 mots.
    expect(corps[0].messages[0].content).toContain('environ 4 mots')
  })

  it('sans clé, rien — l\'appelant sait se passer d\'une voix', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    expect(await ecrireVersDeVoix(VOIX[0], 'cire', 'fr')).toBeNull()
  })
})
