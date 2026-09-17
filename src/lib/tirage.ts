/**
 * Le tirage en file — mélanger sans répéter, et sans couture au raccord.
 *
 * Deux rendez-vous s'en servent : la contrainte du jour et l'amorce de la
 * chaîne. Le code vivait dans `contrainteDuJour`, il en est sorti tel quel
 * pour que les deux le partagent au lieu de le recopier — les mesures de
 * `contrainteDuJour.test.ts` prouvent qu'il n'a pas bougé.
 */

/** Le jour local, AAAA-MM-JJ. Même règle que la série et que l'ambiance. */
export function jourLocal(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

/** Le rang du jour depuis l'époque — l'index qui fait avancer les files. */
export function rangDuJour(jour: string): number {
  const [a, m, j] = jour.split('-').map(Number)
  return Math.floor(Date.UTC(a, m - 1, j) / 86_400_000)
}

/** FNV-1a 32 bits — petit, sans dépendance, et suffisamment mélangeant pour
 *  décider de l'ordre d'un sac de trente entrées. */
export function hachage(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Un tirage reproductible, pour mélanger un sac à partir de son numéro. */
export function melange<T>(items: T[], graine: number): T[] {
  const out = [...items]
  let x = (graine || 1) >>> 0
  for (let i = out.length - 1; i > 0; i--) {
    // xorshift32 — déterministe, et sans les motifs d'un simple modulo
    x ^= x << 13; x >>>= 0
    x ^= x >> 17
    x ^= x << 5; x >>>= 0
    const j = x % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Un sac mélangé dont la tête ne répète jamais la queue du précédent.
 *
 * C'est LE défaut d'une file qui se vide : à l'intérieur d'un sac rien ne se
 * répète, mais au raccord entre deux sacs la dernière entrée de l'un peut
 * reparaître en tête de l'autre. Mesuré sur trente ans avant correction :
 * une amorce revenait parfois au bout d'UN jour, et comme une structure
 * pouvait elle aussi enjamber le raccord, il existait des jours où la
 * contrainte entière se répétait deux matins de suite.
 *
 * On échange donc la tête avec une position tirée du même mélange. Le sac
 * reste complet — aucune entrée n'est perdue, elles changent seulement
 * d'ordre — et le raccord cesse d'être une couture visible.
 *
 * L'échange ne touche JAMAIS la dernière position, et c'est ce qui rend la
 * garantie exacte au lieu d'approchée : pour savoir sur quoi finit le sac
 * précédent, il faut pouvoir le lire sans le corriger à son tour, sinon la
 * lecture appelle la lecture du sac d'avant, indéfiniment. En laissant la
 * queue intacte, un simple mélange suffit à la connaître. Premier jet :
 * l'échange pouvait tomber sur la dernière case, et le garde regardait
 * alors une queue qui n'était pas la vraie.
 */
export function sacSansRaccord<T>(items: T[], sel: string, numeroSac: number, fenetre = 1): T[] {
  const graine = hachage(`${sel}:${numeroSac}`)
  const sac = melange(items, graine)
  // La fenêtre ne peut pas manger plus d'un tiers du sac, sinon il n'y a plus
  // assez de place pour reloger ce qu'on écarte.
  const f = Math.max(1, Math.min(fenetre, Math.floor(items.length / 3)))
  if (items.length < 2 * f + 1) return sac

  const precedent = melange(items, hachage(`${sel}:${numeroSac - 1}`))
  const queue = new Set(precedent.slice(precedent.length - f))

  for (let i = 0; i < f; i++) {
    if (!queue.has(sac[i])) continue
    // On reloge au-delà de la tête ET avant la queue : la dernière position
    // ne bouge jamais, c'est ce qui rend la lecture du sac précédent exacte.
    for (let k = f; k < sac.length - f; k++) {
      if (!queue.has(sac[k])) { [sac[i], sac[k]] = [sac[k], sac[i]]; break }
    }
  }
  return sac
}

/**
 * Le n-ième tirage d'une file qui se vide avant d'être refaite.
 *
 * `fenetre` dit combien d'entrées de la fin du sac précédent sont écartées de
 * la tête du suivant. Un seul suffit à une file tirée tous les trois jours ;
 * une file tirée TOUS LES JOURS — l'amorce du rendez-vous — en demande
 * davantage, sans quoi la même amorce revenait parfois à deux jours d'écart,
 * sur la seule chose que la page montre chaque matin.
 */
export function tirageEnFile<T>(items: T[], rang: number, sel: string, fenetre = 1): T {
  const taille = items.length
  const numeroSac = Math.floor(rang / taille)
  const position = ((rang % taille) + taille) % taille
  return sacSansRaccord(items, sel, numeroSac, fenetre)[position]
}
