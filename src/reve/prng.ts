// ════════════════════════════════════════════════
// PRNG mulberry32 — pseudo-aléatoire déterministe par seed
// ════════════════════════════════════════════════

/** Renvoie une fonction qui produit des nombres entre 0 et 1, déterministe. */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6D2B79F5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pioche N éléments aléatoires (sans remise) dans un tableau. */
export function pickN<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(rng() * copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

/** Pioche un élément aléatoire. */
export function pickOne<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

// ════════════════════════════════════════════════
// MÉMOIRE DES COLLAGES (localStorage)
// Exclut temporairement les collages tirés ≥ 3 fois
// ════════════════════════════════════════════════

const MEMOIRE_KEY = 'cadavre-memoire-collages'
const MEMOIRE_SEUIL = 3

function lireMemoire(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MEMOIRE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function ecrireMemoire(m: Record<string, number>): void {
  try { localStorage.setItem(MEMOIRE_KEY, JSON.stringify(m)) } catch {}
}

/** Incrémente le compteur d'un collage. */
export function incrementerMemoire(id: string): void {
  const m = lireMemoire()
  m[id] = (m[id] || 0) + 1
  ecrireMemoire(m)
}

/** Filtre un pool : exclut les ids déjà tirés ≥ seuil fois.
 *  Si tous sont exclus, on réinitialise la mémoire. */
export function filtrerMemoire<T extends { id: string }>(pool: T[]): T[] {
  const m = lireMemoire()
  const filtre = pool.filter(c => (m[c.id] || 0) < MEMOIRE_SEUIL)
  if (filtre.length < 3) {
    // tout le pool a été vu — on réinitialise
    ecrireMemoire({})
    return pool
  }
  return filtre
}
