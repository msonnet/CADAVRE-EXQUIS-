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
 */

export interface AuteurPublication {
  pseudo?: string | null
  avatar_url?: string | null
  id?: string | null
}

/**
 * Les cases telles qu'elles partent en galerie : sans les noms des mains.
 *
 * Une case de la table locale porte le prénom tapé aux préparatifs
 * (« Nadja », « Léa »), souvent celui d'un enfant ; une case de salon, le
 * pseudo d'un inconnu. `publierPoeme` les envoyait telles quelles, dans une
 * table que la clé anonyme lit : des prénoms devenaient une donnée publique
 * sans que personne l'ait voulu. Or la galerie ne montre AUCUNE couture —
 * elle n'en a jamais eu besoin. On ne garde donc que le numéro de la main.
 */
export function casesPourGalerie(cases: Poeme['cases']): Poeme['cases'] {
  return cases.map(({ pseudo, moi, ...c }) => c)
}

export async function publierPoeme(poeme: Poeme, auteur: AuteurPublication | null): Promise<void> {
  const payload = JSON.stringify({
    cases: casesPourGalerie(poeme.cases),
    structureId: poeme.structureId,
    titre: poeme.titre,
    langue: langueActuelle(),
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
