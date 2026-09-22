import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { ESSAI_OFFERT, ENCRIER_HEBDO } from '../lib/reserves'

/**
 * L'essai offert — la dépense d'acquisition, mesurée.
 *
 * Ces trois nombres sont le seul endroit du projet où l'on décide combien
 * coûte un joueur qui ne paiera jamais. Ils vivaient jusqu'ici dans une
 * phrase de CLAUDE.md et dans un commentaire SQL, c'est-à-dire nulle part :
 * on pouvait faire passer l'essai à dix illustrations sans qu'aucune alarme
 * ne sonne, et sans que personne recalcule la facture.
 *
 * ── Pourquoi le plafond est à 0,30 $ ──────────────────────────────────────
 *
 * L'essai n'est pas attaché à une personne : il l'est à une identité
 * ANONYME (`signInAnonymously`), donc à une installation. Réinstaller
 * l'app, effacer les données du site, changer de téléphone — et il se
 * rouvre. Ce n'est pas une dépense par joueur, c'est une dépense par remise
 * à zéro, et rien dans le code ne la borne.
 *
 * Le point mort en dépend directement : à 4,58 $ nets par abonné-mois, un
 * essai à 0,32 $ intégralement consommé demandait 7,1 % des installations
 * abonnées un mois. Le voici à 0,264 $, soit 5,8 %.
 *
 * Deux mouvements l'ont fait, en sens contraire, et le second l'a emporté :
 * les illustrations sont tombées de 5 à 2 (−0,12 $), puis les parties sont
 * montées de 5 à 8 (+0,06 $). Le solde reste favorable, mais il faut le
 * dire tel qu'il est — la générosité s'est déplacée des images vers les
 * voix, elle n'a pas seulement diminué.
 *
 * Ce déplacement est délibéré : une illustration se comprend dès la
 * première, une partie avec les voix demande d'y revenir. Et surtout, c'est
 * une dépense UNIQUE — le fond d'encrier hebdomadaire, lui, court pour toujours,
 * et c'est elle qu'on a gardée basse.
 *
 * Le plafond laisse un peu d'air au-dessus de la valeur actuelle, et se
 * fera sentir bien avant que la facture ne surprenne.
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

/** Ce que coûte un an de fond d'encrier hebdomadaire, jamais repris. */
function coutDeLEncrier(hebdo: typeof ENCRIER_HEBDO): number {
  return 52 * (hebdo.images * COUT.images
    + hebdo.parties * COUT.parties
    + hebdo.lectures * COUT.lectures)
}

describe('la dépense d’acquisition reste bornée', () => {
  it('un essai entièrement consommé coûte au plus 0,30 $', () => {
    expect(coutDeLEssai(ESSAI_OFFERT)).toBeLessThanOrEqual(0.30)
  })

  it('vaut aujourd’hui 0,264 $ — deux illustrations, huit parties, trois lectures', () => {
    expect(ESSAI_OFFERT).toEqual({ images: 2, parties: 8, lectures: 3 })
    expect(coutDeLEssai(ESSAI_OFFERT)).toBeCloseTo(0.264, 3)
  })

  it('les illustrations ne pèsent plus les deux tiers de la dépense', () => {
    // À cinq, elles valaient 0,20 $ des 0,32 $ — le gros de l'acquisition
    // pour l'acte qu'on comprend dès la première.
    const part = (ESSAI_OFFERT.images * COUT.images) / coutDeLEssai(ESSAI_OFFERT)
    expect(part).toBeLessThan(0.4)
  })

  it('le point mort tient sous 6 % des installations, essai consommé à fond', () => {
    // 4,99 € moins les 15 % d'Apple ≈ 4,58 $ nets par abonné-mois.
    // 5,8 % aujourd'hui, contre 7,1 % avant le 22 septembre.
    const NET_ABONNE_MOIS = 4.58
    expect(coutDeLEssai(ESSAI_OFFERT) / NET_ABONNE_MOIS).toBeLessThan(0.06)
  })
})

describe('l’encrier se remplit chaque semaine, et cela court pour toujours', () => {
  it('coûte 1,04 $ par an et par joueur actif non abonné', () => {
    expect(coutDeLEncrier(ENCRIER_HEBDO)).toBeCloseTo(1.04, 2)
  })

  it('s’autofinance sous 2 % d’abonnés parmi les actifs hebdomadaires', () => {
    /*
      La mesure qui décide de ce qu'on rend chaque semaine, et la seule.

      Un abonné rapporte 54,96 $ par an (4,58 × 12). Pour une part `x`
      d'abonnés parmi les actifs, ce qu'on rend est payé quand
      `x × 54,96 ≥ (1 − x) × coût annuel`.

      À une partie par semaine il faut 1,9 % ; à deux 3,6 % ; à trois
      5,4 % — au-dessus de ce que le freemium obtient d'ordinaire, et le
      coût y monte AVEC le succès. C'est pourquoi on part à une.
    */
    const NET_ABONNE_AN = 4.58 * 12
    const c = coutDeLEncrier(ENCRIER_HEBDO)
    expect(c / (NET_ABONNE_AN + c)).toBeLessThan(0.02)
  })

  it('ne rend que des parties — les images sont le flacon, pas l’encrier', () => {
    // Un flacon n'a de sens que s'il se vide, et à 0,020 $ la partie un pack
    // honnête ne se viderait jamais. La séparation est structurelle.
    expect(ENCRIER_HEBDO.parties).toBeGreaterThan(0)
    expect(ENCRIER_HEBDO.images).toBe(0)
  })

  it('dit la même chose que la migration', () => {
    const sql = readFileSync('supabase/migrations/20260730000010_abonnement.sql', 'utf8')
    const m = /CASE p_type WHEN 'partie_ia' THEN (\d+) ELSE (\d+) END/.exec(sql)
    expect(m, 'encrier_hebdo() introuvable dans la migration').not.toBeNull()
    expect(Number(m![1]), 'parties').toBe(ENCRIER_HEBDO.parties)
    expect(Number(m![2]), 'tout le reste').toBe(ENCRIER_HEBDO.images)
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
