/**
 * La technicité de chaque voix, côté joueur.
 *
 * Le cadran vit dans `api/_voices.ts`, avec le reste de la voix. Mais c'est
 * l'atelier qui décide maintenant quelle case d'un vers dépense le quota de
 * métier (voir `src/lib/lexique.ts`), et il lui faut donc ce nombre-là — et
 * lui seul. Importer les voix entières embarquerait leurs lexiques, leurs
 * gestes et leurs situations dans le bundle du navigateur pour rien.
 *
 * Un test garde les deux tables identiques.
 */
export const TECHNICITE: Record<string, number> = {
  'archiviste': 0.85,
  'botaniste': 0.85,
  'meteorologue': 0.75,
  'enfant': 0.1,
  'marin': 0.75,
  'chimiste': 0.9,
  'cuisinier': 0.75,
  'detective': 0.7,
  'astronome': 0.8,
  'medecin': 0.8,
  'musicien': 0.6,
  'archeologue': 0.8,
  'horloger': 0.9,
  'cartographe': 0.75,
  'reveur': 0.25,
  'telegraphiste': 0.7,
  'ornithologiste': 0.75,
  'somnambule': 0.2,
  'fossoyeur': 0.7,
  'traducteur': 0.7,
  'jardinier': 0.65,
  'speleologue': 0.75,
  'libraire': 0.75,
  'boucher': 0.8,
  'entomologiste': 0.85,
  'geologue': 0.85,
  'photographe': 0.6,
  'tisserand': 0.8,
  'cartomancien': 0.5,
  'souffleur de verre': 0.75,
  'alchimiste': 0.8,
  'funambule': 0.7,
  'apiculteur': 0.75,
  'lexicographe': 0.85,
  'enlumineur': 0.8,
  'herboriste': 0.7,
  'epistolier': 0.45,
  'greffier': 0.9,
  'convalescent': 0.3,
  'collecteuse': 0.6,
  'psalmiste': 0.5,
  'notice': 0.9,
  'graveur': 0.7,
  'insomniaque': 0.25,
  'parfumeur': 0.8,
  'prisonnier': 0.45,
}

/** Le cadran d'une voix — 0,75 pour une voix inconnue, comme côté serveur. */
export function technicite(voixId: string): number {
  return TECHNICITE[voixId] ?? 0.75
}
