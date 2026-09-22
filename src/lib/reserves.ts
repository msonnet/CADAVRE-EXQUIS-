/**
 * Les réserves de l'encrier — les seuls cadrans de générosité du jeu.
 *
 * ── Pourquoi un module à part, sans une seule importation ─────────────────
 *
 * Ces nombres décident combien coûte un joueur qui ne paiera jamais, et ils
 * doivent donc être lisibles PARTOUT sans rien traîner derrière eux : par
 * les mesures unitaires, par les tests de bout en bout sous Node, par la
 * page des Règles. Tant qu'ils vivaient dans `acces.ts`, les importer
 * entraînait le client Supabase et `import.meta.env` — et un test de bout
 * en bout ne pouvait pas vérifier que la prose annonce les vrais chiffres.
 *
 * C'est le même motif que `solde.ts` : ce qui se mesure vit à part.
 */

/**
 * La réserve d'essai, offerte une seule fois à la création de l'identité.
 * Permanente : ce qui reste reste.
 *
 * Doit égaler les valeurs par DÉFAUT de la table `acces`
 * (`supabase/migrations/20260730000010_abonnement.sql`) — une mesure les
 * tient d'accord, et la même mesure plafonne le coût total à 0,30 $.
 *
 * Deux illustrations et non cinq : à cinq elles pesaient les deux tiers de
 * la dépense, pour l'acte qu'on comprend dès la première. Huit parties et
 * non cinq : les voix demandent d'y revenir pour se faire aimer, et c'est
 * une dépense UNIQUE — c'est l'encrier hebdomadaire, récurrent, qu'on garde
 * bas.
 */
export const ESSAI_OFFERT = { images: 2, parties: 8, lectures: 3 } as const

/**
 * L'ENCRIER — ce qui revient chaque semaine, gratuitement et sans fin.
 *
 * ── Un mot, deux portées, et c'est assumé ─────────────────────────────────
 *
 * « L'Encrier » nomme aussi l'abonnement, et le dispositif entier. Ce n'est
 * pas une négligence : l'encrier EST le récipient, et ce qu'il contient de
 * base est précisément cette goutte qui revient. L'essai et le flacon sont
 * ce qu'on y VERSE en plus — l'un offert une fois, l'autre acheté.
 *
 * Le nom précédent était « la ration ». Juste comptablement, faux de ton :
 * une ration est militaire, c'est un mot de pénurie, et il jurait dans une
 * application qui parle de feuillets et de coutures. Un encrier n'est jamais
 * vide, il est bas — et c'est exactement ce qu'on veut faire sentir.
 *
 * Elle ne remplace pas l'essai, elle lui succède : le nouveau joueur reçoit
 * huit parties d'un coup pour découvrir, puis une par semaine, pour
 * toujours.
 *
 * Pourquoi cela plutôt qu'un mur : un mur qu'on franchit une fois s'oublie,
 * et le joueur part au lieu de s'abonner — d'autant qu'une porte gratuite
 * est juste à côté, le poème du jour. Un encrier qui se remplit se ressent
 * chaque semaine, et rappelle chaque semaine ce dont on voudrait plus.
 *
 * Pourquoi UNE et pas trois : à trois par semaine il faudrait 5,4 %
 * d'abonnés parmi les actifs hebdomadaires rien que pour le financer, et
 * treize parties par mois ne laisseraient plus rien à vendre. Ce qu'on donne
 * chaque semaine se relève, jamais ne se baisse — on part donc bas.
 *
 * Doit rester d'accord avec `encrier_hebdo()` dans la migration.
 */
export const ENCRIER_HEBDO = { images: 0, parties: 1, lectures: 0 } as const
