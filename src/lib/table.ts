/**
 * La table locale — plusieurs mains autour d'un seul téléphone.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Les mains n'avaient qu'un numéro. Le rideau disait « Passe le téléphone à
 * Joueur 2 », et les coutures — la récompense promise du jeu, « leurs noms
 * ne te seront rendus qu'au dernier vers » — signaient « joueur 1 »,
 * « joueur 3 ». Autour d'une table de famille, personne ne sait plus qui
 * était le joueur 2 : l'ordre n'était affiché nulle part. La promesse
 * n'était tenue qu'à moitié.
 *
 * Et la table s'oubliait : après une partie à trois mains, les préparatifs
 * revenaient à « 1 main, 1 voix ». Le siège de la voix se touchait deux
 * fois pour redevenir une main, puis une fois par main — à chaque partie de
 * la soirée.
 *
 * ── Ce que ce module porte ────────────────────────────────────────────────
 *
 * Les prénoms sont FACULTATIFS : une main qui n'en donne pas garde son
 * numéro, qui reste un défaut sobre et juste. Ils ne vivent pas dans un champ
 * nouveau de la case : `Case.pseudo` existait déjà pour le salon et le poème
 * du jour, et `attribution` sait le lire. Une main de la table locale est
 * une personne nommée au même titre qu'une main de salon.
 *
 * La dernière table est retenue dans `localStorage` — et non pour la seule
 * soirée : la même famille rejoue le dimanche suivant, et un prénom n'est
 * pas une donnée qu'on a peur de garder sur son propre téléphone.
 *
 * Aucune importation : se mesure seul.
 */

export type Siege = 'vide' | 'humain' | 'ia'

/** Six sièges, comme à l'écran des préparatifs. */
export const NB_SIEGES = 6

/** Un prénom, pas une phrase : au-delà, le rideau ne le tient plus. */
export const NOM_MAX = 20

export const CLE_TABLE = 'derniere-table'

/** Ce qu'on retient d'une table : ses sièges, ses prénoms, ses règles. */
export interface TableRetenue {
  sieges: Siege[]
  /** Un prénom par SIÈGE (et non par main) : changer un siège ne décale pas les autres. */
  noms: string[]
  structureId?: string
  visibilite?: string
  mode?: string
  premierJoueur?: string
}

/** Un prénom tel qu'on le garde : sans blancs en trop, borné. */
export function nettoyerNom(brut: string): string {
  return brut.replace(/\s+/g, ' ').trim().slice(0, NOM_MAX).trim()
}

/**
 * Les prénoms des mains, dans l'ordre où elles jouent.
 *
 * `buildSequence` numérote les mains de gauche à droite, sièges vides et
 * voix sautés : la main 2 est le deuxième siège HUMAIN, pas le deuxième
 * siège. Une main sans prénom laisse une chaîne vide, et garde son numéro.
 */
export function nomsDesMains(sieges: Siege[], noms: string[]): string[] {
  const r: string[] = []
  sieges.forEach((s, i) => { if (s === 'humain') r.push(nettoyerNom(noms[i] ?? '')) })
  return r
}

/** Le prénom de la main `num` (1, 2, 3…), ou rien si elle n'en a pas. */
export function nomDeMain(noms: string[] | undefined, num: number): string | undefined {
  const n = noms?.[num - 1]
  return n ? nettoyerNom(n) || undefined : undefined
}

/**
 * Relit la dernière table, ou rien si elle est illisible.
 *
 * On valide au lieu de faire confiance : une valeur d'une ancienne version,
 * ou tronquée, rendrait des préparatifs impossibles — aucune main, ou dix
 * sièges.
 */
export function lireTable(brut: string | null): TableRetenue | null {
  if (!brut) return null
  let v: unknown
  try { v = JSON.parse(brut) } catch { return null }
  if (!v || typeof v !== 'object') return null
  const t = v as Partial<TableRetenue>
  if (!Array.isArray(t.sieges) || t.sieges.length !== NB_SIEGES) return null
  if (!t.sieges.every(s => s === 'vide' || s === 'humain' || s === 'ia')) return null
  if (!t.sieges.includes('humain')) return null
  const noms = Array.from({ length: NB_SIEGES }, (_, i) =>
    typeof t.noms?.[i] === 'string' ? nettoyerNom(t.noms[i]) : '')
  return {
    sieges: t.sieges as Siege[],
    noms,
    ...(typeof t.structureId === 'string' ? { structureId: t.structureId } : {}),
    ...(typeof t.visibilite === 'string' ? { visibilite: t.visibilite } : {}),
    ...(typeof t.mode === 'string' ? { mode: t.mode } : {}),
    ...(typeof t.premierJoueur === 'string' ? { premierJoueur: t.premierJoueur } : {}),
  }
}

/**
 * Les mains nommées d'un poème, dans l'ordre où elles sont entrées.
 *
 * Pour l'export : un fichier sorti de l'application ne montre pas les
 * coutures, et un poème écrit à quatre qui ne nomme personne a perdu la
 * moitié de ce qu'il était. Les voix n'y figurent pas — la mention de
 * l'intelligence artificielle les dit déjà, et seulement quand c'est vrai.
 */
export function mainsNommees(cases: { pseudo?: string }[]): string[] {
  const vus: string[] = []
  for (const c of cases) {
    const n = c.pseudo ? nettoyerNom(c.pseudo) : ''
    if (n && !vus.includes(n)) vus.push(n)
  }
  return vus
}

/**
 * La taille d'un prénom sur le rideau de passage.
 *
 * Le numéro tenait en un mot court à 18vw. Un prénom de dix lettres, au même
 * corps en Bodoni noir, sortait de l'écran à 320 points. On réduit avec la
 * longueur, sans descendre sous deux rems : un prénom se lit de l'autre bout
 * de la table.
 */
export function corpsDuNom(nom: string): string {
  const l = Math.max(1, [...nom].length)
  const vw = Math.min(18, Math.round(150 / l))
  return `clamp(2rem, ${vw}vw, 7rem)`
}
