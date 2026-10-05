import { supabase } from './supabase'
import { compterReactions, totalReactions, type Echos, type Publication, type Releve } from './galerie'

/**
 * Ce que les publications de l'auteur ont reçu — lectures et réactions.
 *
 * ── Pourquoi ─────────────────────────────────────────────────────────────
 *
 * Les compteurs existaient (`views_count`, `gallery_reactions`) et ne se
 * lisaient que dans la galerie, au milieu des publications des autres.
 * L'auteur ne savait donc jamais qu'il avait été lu : le feuillet de son
 * recueil ignorait même qu'il avait été publié. Deux requêtes, quel que
 * soit le nombre de publications — jamais une par poème.
 *
 * Aucune colonne ni politique nouvelle : la lecture de `gallery` et de
 * `gallery_reactions` est publique depuis les migrations du 27 mai.
 *
 * ── Ce que la réponse distingue ──────────────────────────────────────────
 *
 * `null` : le registre n'a pas répondu (réseau, Supabase absent). L'écran
 * se tait — afficher « 0 LECTURE » serait inventer un chiffre.
 * `absents` : la base a répondu et la publication n'y est plus — retirée
 * par son auteur ou par la modération. Le feuillet peut alors se rouvrir à
 * la publication.
 */
export interface ReleveEchos {
  echos: Record<string, Echos>
  absents: Set<string>
}

export async function lireEchos(ids: string[]): Promise<ReleveEchos | null> {
  const uniques = [...new Set(ids.filter(Boolean))]
  if (uniques.length === 0) return { echos: {}, absents: new Set() }
  try {
    const [pubs, reacs] = await Promise.all([
      supabase.from('gallery').select('id, views_count').in('id', uniques),
      supabase.from('gallery_reactions').select('gallery_id, emoji').in('gallery_id', uniques),
    ])
    if (pubs.error || reacs.error || !Array.isArray(pubs.data)) return null
    const comptes = compterReactions((reacs.data ?? []) as { gallery_id: string; emoji: string }[])
    const echos: Record<string, Echos> = {}
    for (const p of pubs.data as { id: string; views_count: number | null }[]) {
      echos[p.id] = { lectures: p.views_count ?? 0, reactions: comptes[p.id] ?? {} }
    }
    const absents = new Set(uniques.filter(id => !echos[id]))
    return { echos, absents }
  } catch {
    return null
  }
}

/**
 * Les publications d'un compte, pour son Profil — par `author_id` et non par
 * pseudo : un pseudo se change, et deux joueurs peuvent l'avoir porté.
 * `null` si le registre n'a pas répondu.
 */
export async function publicationsDe(authorId: string): Promise<Publication[] | null> {
  try {
    const { data, error } = await supabase
      .from('gallery')
      .select('id, type, titre, payload, image_url, author_pseudo, author_avatar, author_id, created_at, views_count')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .limit(60)
    if (error || !Array.isArray(data)) return null
    return data as Publication[]
  } catch {
    return null
  }
}

// ── Le relevé du courrier ────────────────────────────────────────────────
//
// Ce que le recueil a déjà montré à l'auteur, pour ne lui annoncer que ce
// qui est NOUVEAU. Local à l'appareil, comme le recueil lui-même : il ne
// sert qu'à composer une phrase, et le perdre ne coûte qu'une annonce de
// trop.

const CLE_RELEVE = 'courrier-releve'

export function lireReleve(): Releve | null {
  try {
    const brut = localStorage.getItem(CLE_RELEVE)
    return brut ? JSON.parse(brut) as Releve : null
  } catch { return null }
}

export function ecrireReleve(r: Releve): void {
  try { localStorage.setItem(CLE_RELEVE, JSON.stringify(r)) } catch { /* plein ou refusé */ }
}

/** Le relevé d'aujourd'hui, tiré de ce que la base vient de rendre. */
export function releveDe(echos: Record<string, Echos>): Releve {
  const out: Releve = {}
  for (const [id, e] of Object.entries(echos)) out[id] = { l: e.lectures, r: totalReactions(e) }
  return out
}
