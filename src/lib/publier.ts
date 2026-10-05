import type { Poeme, LienPublication } from '../types'
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
 * sans que personne l'ait voulu.
 *
 * Depuis, la galerie montre les coutures. Le nom part donc, mais la PLACE
 * reste : une main nommée devient une main anonyme (`pseudo` vide, que
 * `attribution` lit « une main »), et `moi` — qui n'est pas un nom — est
 * gardé. Sans lui, la galerie ne saurait plus quelle case est celle de qui
 * publie ; et une main de salon dont on aurait seulement ôté le nom serait
 * signée du nom de l'auteur, ce qui serait faux.
 */
export function casesPourGalerie(cases: Poeme['cases']): Poeme['cases'] {
  return cases.map(({ pseudo, ...c }) => (pseudo === undefined ? c : { ...c, pseudo: '' }))
}

/**
 * Rend le lien vers la ligne écrite : le feuillet le garde, pour ne plus
 * se republier et pour lire ce que sa publication a reçu. `langue` sert au
 * salon, dont la langue est celle de la table et non celle du téléphone.
 */
export async function publierPoeme(
  poeme: Poeme,
  auteur: AuteurPublication | null,
  langue: 'fr' | 'en' = langueActuelle(),
): Promise<LienPublication> {
  const payload = JSON.stringify({
    cases: casesPourGalerie(poeme.cases),
    structureId: poeme.structureId,
    titre: poeme.titre,
    langue,
  })

  // L'illustration locale est un dataURL (1080 × 1440) : on l'héberge sur
  // Storage plutôt que d'insérer des mégaoctets de base64 en base.
  let imageUrl = poeme.illustration?.url ?? null
  if (imageUrl?.startsWith('data:')) {
    imageUrl = await uploaderImageGalerie(imageUrl, 'illustration')
  }

  // `select` après l'insertion : la lecture de `gallery` est publique, la
  // base rend donc la ligne qu'elle vient d'écrire, sans aller-retour de plus.
  const { data, error } = await supabase.from('gallery').insert({
    type: 'poeme',
    titre: poeme.titre,
    payload,
    image_url: imageUrl,
    author_pseudo: auteur?.pseudo ?? 'Anonyme',
    author_avatar: auteur?.avatar_url ?? null,
    author_id: auteur?.id ?? null,
  }).select('id, created_at').maybeSingle()
  if (error) throw error
  return lienDe(data)
}

/** La ligne rendue par la base, ou l'instant présent si elle n'a rien rendu. */
export function lienDe(data: { id?: string | null; created_at?: string | null } | null): LienPublication {
  const date = data?.created_at ? Date.parse(data.created_at) : NaN
  return {
    ...(data?.id ? { id: data.id } : {}),
    date: Number.isFinite(date) ? date : Date.now(),
  }
}

/**
 * Publier un dessin — même fil que le poème.
 *
 * Le dessin s'écrivait sans `author_id` : son auteur connecté ne pouvait
 * donc pas le retirer de la galerie (la politique de suppression compare
 * `author_id` à son identité), et ses propres relectures se comptaient
 * comme des lectures. `null` si l'image n'a pas pu être hébergée.
 */
export async function publierDessin(
  dessin: { imageDataUrl: string; titre?: string | null; texteVision?: string | null; nbBandes: number },
  auteur: AuteurPublication | null,
  prefixe = 'dessin',
  langue: 'fr' | 'en' = langueActuelle(),
): Promise<LienPublication | null> {
  const url = await uploaderImageGalerie(dessin.imageDataUrl, prefixe)
  if (!url) return null
  const payload = JSON.stringify({
    texteVision: dessin.texteVision ?? null,
    nbBandes: dessin.nbBandes,
    langue,
  })
  const { data, error } = await supabase.from('gallery').insert({
    type: 'dessin',
    titre: dessin.titre ?? null,
    payload,
    image_url: url,
    author_pseudo: auteur?.pseudo ?? 'Anonyme',
    author_avatar: auteur?.avatar_url ?? null,
    author_id: auteur?.id ?? null,
  }).select('id, created_at').maybeSingle()
  if (error) throw error
  return lienDe(data)
}
