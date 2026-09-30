/**
 * Un pli par main — ce que le dépli ouvre, volet après volet.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Le dépli pliait le poème par LIGNES. Or une phrase courte ou étoffée
 * — trois ou cinq mains — se recompose en UNE seule ligne : le feuillet ne
 * s'ouvrait donc qu'en un volet, et le geste du jeu, la feuille qu'on
 * déplie bande après bande, disparaissait précisément pour les deux
 * structures d'entrée.
 *
 * Sur une vraie feuille, chaque main écrit sur SA bande, sous le pli de la
 * précédente. Déplier, c'est lire de haut en bas, un fragment par bande.
 * C'est ce que le dévoilement montre désormais. Le recueil, le partage et
 * l'export gardent la phrase d'un seul tenant : seul le feuillet de fin de
 * partie se lit plié.
 *
 * ── La correction d'accord ────────────────────────────────────────────────
 *
 * Le texte corrigé (`corrigerAccords`) arrive en une phrase. On le rend à
 * ses bandes en comptant les mots de chaque fragment : une correction
 * d'accord change des terminaisons, pas le nombre de mots. Si le compte ne
 * tombe pas juste, on garde les fragments bruts — une bande fausse serait
 * pire qu'un accord manquant.
 *
 * Aucune importation : se mesure seul.
 */

const mots = (t: string) => t.trim().split(/\s+/).filter(Boolean)

/**
 * Les bandes du feuillet : un fragment par main, corrigé si l'on peut.
 * `null` si le poème ne se plie pas ainsi (aucun fragment).
 */
export function bandesParMain(fragments: string[], corrige?: string | null): string[] | null {
  const bruts = fragments.map(f => f.trim()).filter(Boolean)
  if (bruts.length === 0) return null
  if (!corrige) return bruts

  const tous = mots(corrige)
  const comptes = bruts.map(f => mots(f).length)
  if (comptes.reduce((a, b) => a + b, 0) !== tous.length) return bruts

  const out: string[] = []
  let i = 0
  for (const n of comptes) {
    out.push(tous.slice(i, i + n).join(' '))
    i += n
  }
  return out
}

/** Les structures dont une case est un morceau de phrase, pas un vers. */
export const SE_PLIE_PAR_MAIN = new Set(['phrase-simple', 'phrase-etoffee'])
