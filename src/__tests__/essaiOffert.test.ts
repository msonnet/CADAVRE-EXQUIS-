import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ESSAI_OFFERT } from '../lib/acces'

/**
 * L'essai offert — la dépense d'acquisition, mesurée.
 *
 * Ces trois nombres sont le seul endroit du projet où l'on décide combien
 * coûte un joueur qui ne paiera jamais. Ils vivaient jusqu'ici dans une
 * phrase de CLAUDE.md et dans un commentaire SQL, c'est-à-dire nulle part :
 * on pouvait faire passer l'essai à dix illustrations sans qu'aucune alarme
 * ne sonne, et sans que personne recalcule la facture.
 *
 * ── Pourquoi le plafond est à 0,25 $ ──────────────────────────────────────
 *
 * L'essai n'est pas attaché à une personne : il l'est à une identité
 * ANONYME (`signInAnonymously`), donc à une installation. Réinstaller
 * l'app, effacer les données du site, changer de téléphone — et il se
 * rouvre. Ce n'est pas une dépense par joueur, c'est une dépense par remise
 * à zéro, et rien dans le code ne la borne.
 *
 * Le point mort en dépend directement : à 4,58 $ nets par abonné-mois, un
 * essai à 0,32 $ intégralement consommé demande 7,1 % des installations
 * abonnées un mois ; à 0,20 $ il en demande 4,5 %. Le plafond laisse un peu
 * d'air au-dessus de la valeur actuelle, et se fera sentir bien avant que
 * la facture ne surprenne.
 */

/**
 * Coût unitaire réel de chaque acte, en dollars.
 *
 * La vérité vit dans le commentaire d'en-tête d'`api/_acces.ts` ; elle est
 * recopiée ici pour être calculable. Ces chiffres ne sont PAS dans le
 * bundle client : ce que le serveur paie ne regarde pas le navigateur.
 */
const COUT = { images: 0.040, parties: 0.020, lectures: 0.008 } as const

/** Ce que coûte au maximum un essai entièrement consommé. */
function coutDeLEssai(essai: typeof ESSAI_OFFERT): number {
  return essai.images * COUT.images
    + essai.parties * COUT.parties
    + essai.lectures * COUT.lectures
}

describe('la dépense d’acquisition reste bornée', () => {
  it('un essai entièrement consommé coûte au plus 0,25 $', () => {
    expect(coutDeLEssai(ESSAI_OFFERT)).toBeLessThanOrEqual(0.25)
  })

  it('vaut aujourd’hui 0,204 $ — deux illustrations, cinq parties, trois lectures', () => {
    expect(ESSAI_OFFERT).toEqual({ images: 2, parties: 5, lectures: 3 })
    expect(coutDeLEssai(ESSAI_OFFERT)).toBeCloseTo(0.204, 3)
  })

  it('les illustrations ne pèsent plus les deux tiers de la dépense', () => {
    // À cinq, elles valaient 0,20 $ des 0,32 $ — le gros de l'acquisition
    // pour l'acte qu'on comprend dès la première.
    const part = (ESSAI_OFFERT.images * COUT.images) / coutDeLEssai(ESSAI_OFFERT)
    expect(part).toBeLessThan(0.5)
  })

  it('le point mort tient sous 5 % des installations, essai consommé à fond', () => {
    // 4,99 € moins les 15 % d'Apple ≈ 4,58 $ nets par abonné-mois.
    const NET_ABONNE_MOIS = 4.58
    expect(coutDeLEssai(ESSAI_OFFERT) / NET_ABONNE_MOIS).toBeLessThan(0.05)
  })
})

describe('les deux copies de la réserve disent la même chose', () => {
  it('le client annonce exactement les valeurs par défaut de la table', () => {
    // `ESSAI_OFFERT` sert à afficher « ton essai est intact » AVANT qu'une
    // identité existe : s'il dérive des DEFAULT de la migration, l'app
    // promet une réserve que la base ne donnera pas.
    const sql = readFileSync('supabase/migrations/20260730000010_abonnement.sql', 'utf8')
    for (const [champ, attendu] of [
      ['essai_images', ESSAI_OFFERT.images],
      ['essai_parties', ESSAI_OFFERT.parties],
      ['essai_lectures', ESSAI_OFFERT.lectures],
    ] as const) {
      const m = new RegExp(`${champ}\\s+INTEGER NOT NULL DEFAULT (\\d+)`).exec(sql)
      expect(m, `${champ} introuvable dans la migration`).not.toBeNull()
      expect(Number(m![1]), champ).toBe(attendu)
    }
  })
})
