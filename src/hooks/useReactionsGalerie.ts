import { useState, useCallback, useRef } from 'react'
import { supabase, getReactorKey } from '../lib/supabase'
import type { CleReaction } from '../lib/galerie'

type Comptes = Record<string, number>

/**
 * Les réactions de la galerie : qui a reçu quoi, et ce que j'ai posé.
 *
 * Le même code vivait deux fois, dans la galerie et sur la page d'un
 * auteur, et dérivait déjà — l'une nommait ses boutons, l'autre lisait
 * l'emoji au lecteur d'écran. Une seule machine, mise à jour optimiste et
 * retour en arrière si la base refuse.
 */
export function useReactionsGalerie(journal = '[Galerie]') {
  const [reactions, setReactions] = useState<Record<string, Comptes>>({})
  const [mine, setMine] = useState<Record<string, Set<string>>>({})
  const reactorKey = useRef<string>(getReactorKey())

  const charger = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      const { data, error } = await supabase
        .from('gallery_reactions')
        .select('gallery_id, emoji, reactor_key')
        .in('gallery_id', ids)
      if (error) { console.error(journal, 'Erreur réactions', error); return }
      const counts: Record<string, Comptes> = {}
      const mineNext: Record<string, Set<string>> = {}
      for (const r of (data ?? []) as { gallery_id: string; emoji: string; reactor_key: string }[]) {
        const c = (counts[r.gallery_id] ??= {})
        c[r.emoji] = (c[r.emoji] ?? 0) + 1
        if (r.reactor_key === reactorKey.current) (mineNext[r.gallery_id] ??= new Set()).add(r.emoji)
      }
      // Une publication sans réaction doit aussi être remise à zéro.
      setReactions(prev => {
        const next = { ...prev }
        for (const id of ids) next[id] = counts[id] ?? {}
        return next
      })
      setMine(prev => {
        const next = { ...prev }
        for (const id of ids) next[id] = mineNext[id] ?? new Set()
        return next
      })
    } catch (e) {
      console.error(journal, 'Exception réactions', e)
    }
  }, [journal])

  const basculer = useCallback(async (galleryId: string, cle: CleReaction) => {
    const avait = mine[galleryId]?.has(cle) ?? false
    const appliquer = (sens: 1 | -1, ajoute: boolean) => {
      setReactions(prev => {
        const cur = { ...(prev[galleryId] ?? {}) }
        cur[cle] = Math.max(0, (cur[cle] ?? 0) + sens)
        return { ...prev, [galleryId]: cur }
      })
      setMine(prev => {
        const cur = new Set(prev[galleryId] ?? new Set<string>())
        if (ajoute) cur.add(cle); else cur.delete(cle)
        return { ...prev, [galleryId]: cur }
      })
    }
    appliquer(avait ? -1 : 1, !avait)
    try {
      const { error } = avait
        ? await supabase.from('gallery_reactions').delete()
            .eq('gallery_id', galleryId).eq('reactor_key', reactorKey.current).eq('emoji', cle)
        : await supabase.from('gallery_reactions')
            .insert({ gallery_id: galleryId, emoji: cle, reactor_key: reactorKey.current })
      if (error) throw error
    } catch (e) {
      console.error(journal, 'Erreur réaction', e)
      appliquer(avait ? 1 : -1, avait)
    }
  }, [mine, journal])

  return { reactions, mine, charger, basculer }
}
