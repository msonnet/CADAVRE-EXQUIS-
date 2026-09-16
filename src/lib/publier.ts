import type { Poeme } from '../types'
import { supabase, uploaderImageGalerie } from './supabase'
import { langueActuelle } from '../i18n'

/**
 * Publier un poème en galerie.
 *
 * ── Pourquoi ce module existe ─────────────────────────────────────────────
 *
 * La publication ne vivait qu'en ligne dans `PoemeDetail`, donc au bout de
 * trois gestes après la fin d'une partie : fin → Recueil → ouvrir le poème →
 * PUBLIER. Pour un rendez-vous quotidien, c'est mortel. S'il n'y a rien de
 * publié, il n'y a rien à comparer, et la boucle casse à son premier maillon
 * — or comparer est tout l'intérêt du cadavre du jour.
 *
 * Le code est donc sorti de la page pour que la fin de partie puisse
 * l'appeler aussi, sans le recopier.
 *
 * ── Ce que le payload porte en plus ───────────────────────────────────────
 *
 * `rituel` : le jour du rendez-vous et son amorce. Sans cette clé, la page
 * du jour ne peut filtrer que sur la date de publication et ramasse
 * n'importe quel poème publié le même jour. La marque est recopiée dans le
 * payload plutôt que déduite : une galerie doit se lire sans rejouer le
 * calcul de la contrainte.
 */

export interface AuteurPublication {
  pseudo?: string | null
  avatar_url?: string | null
  id?: string | null
}

export async function publierPoeme(poeme: Poeme, auteur: AuteurPublication | null): Promise<void> {
  const payload = JSON.stringify({
    cases: poeme.cases,
    structureId: poeme.structureId,
    titre: poeme.titre,
    langue: langueActuelle(),
    ...(poeme.rituel ? { rituel: poeme.rituel } : {}),
  })

  // L'illustration locale est un dataURL (1080 × 1440) : on l'héberge sur
  // Storage plutôt que d'insérer des mégaoctets de base64 en base.
  let imageUrl = poeme.illustration?.url ?? null
  if (imageUrl?.startsWith('data:')) {
    imageUrl = await uploaderImageGalerie(imageUrl, 'illustration')
  }

  const { error } = await supabase.from('gallery').insert({
    type: 'poeme',
    titre: poeme.titre,
    payload,
    image_url: imageUrl,
    author_pseudo: auteur?.pseudo ?? 'Anonyme',
    author_avatar: auteur?.avatar_url ?? null,
    author_id: auteur?.id ?? null,
  })
  if (error) throw error
}
