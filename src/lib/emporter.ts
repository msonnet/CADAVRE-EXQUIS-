import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Faire sortir un fichier de l'application — la seule porte.
 *
 * ── La panne ──────────────────────────────────────────────────────────────
 *
 * Tout ce qui quittait le jeu passait par des gestes de NAVIGATEUR : un lien
 * `<a download>` pour le recueil, la récolte, l'affiche et la vidéo ; un
 * `jsPDF.save()` pour le PDF ; `navigator.share` pour la feuille de partage.
 * Dans l'application installée, aucun ne fait rien : la webvue d'Android n'a
 * pas de `navigator.share` et ignore `download`, WKWebView ignore aussi le
 * lien. Le joueur appuyait sur PARTAGER, le bouton affichait « ✓ PARTAGÉ »,
 * et rien n'était parti. L'export du recueil — la seule sauvegarde qui
 * existe — ne produisait aucun fichier.
 *
 * ── Ce qui change ─────────────────────────────────────────────────────────
 *
 * En natif, le fichier est écrit dans le cache de l'application puis confié
 * à la feuille de partage du système : AirDrop, Fichiers, Drive, messagerie
 * — le joueur choisit. Dans un navigateur, rien ne change.
 *
 * Le résultat dit ce qui s'est RÉELLEMENT passé, pour que les boutons ne
 * mentent plus : `annule` n'est ni un succès ni un échec.
 */

export type Issue = 'partage' | 'annule' | 'telecharge'

export const estNatif = (): boolean => Capacitor.isNativePlatform()

/** La feuille native refermée sans choix rejette avec ce message. */
const estAnnulation = (e: unknown): boolean =>
  (e as Error)?.name === 'AbortError' || /cancel/i.test(String((e as Error)?.message ?? e))

async function enBase64(blob: Blob): Promise<string> {
  const url = await new Promise<string>((ok, ko) => {
    const r = new FileReader()
    r.onload = () => ok(r.result as string)
    r.onerror = () => ko(r.error)
    r.readAsDataURL(blob)
  })
  return url.slice(url.indexOf(',') + 1)
}

/** Un nom de fichier sans rien que le système de fichiers refuserait. */
export function nomSur(nom: string): string {
  return nom.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').slice(0, 120) || 'cadavre-exquis'
}

export async function emporterFichier(o: {
  nom: string
  blob: Blob
  titre?: string
  texte?: string
}): Promise<Issue> {
  const nom = nomSur(o.nom)

  if (estNatif()) {
    const { uri } = await Filesystem.writeFile({
      path: nom,
      data: await enBase64(o.blob),
      directory: Directory.Cache,
    })
    try {
      await Share.share({ title: o.titre, text: o.texte, files: [uri], dialogTitle: o.titre })
      return 'partage'
    } catch (e) {
      if (estAnnulation(e)) return 'annule'
      throw e
    }
  }

  const fichier = new File([o.blob], nom, { type: o.blob.type })
  const donnees: ShareData = { files: [fichier], title: o.titre }
  if (o.texte) donnees.text = o.texte
  try {
    if (navigator.canShare?.(donnees)) {
      await navigator.share(donnees)
      return 'partage'
    }
  } catch (e) {
    if (estAnnulation(e)) return 'annule'
    /* autre refus : on retombe sur le téléchargement */
  }
  const url = URL.createObjectURL(o.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'telecharge'
}

/**
 * Un texte seul. En natif la feuille du système ; ailleurs `navigator.share`
 * s'il existe, sinon rien — l'appelant garde son repli (le presse-papiers).
 */
export async function partagerTexteSeul(texte: string, titre: string): Promise<Issue | null> {
  try {
    if (estNatif()) {
      await Share.share({ title: titre, text: texte, dialogTitle: titre })
      return 'partage'
    }
    if (navigator.share) {
      await navigator.share({ title: titre, text: texte })
      return 'partage'
    }
  } catch (e) {
    if (estAnnulation(e)) return 'annule'
  }
  return null
}

/** Une image en `data:` ou `blob:` — ce que produisent le canevas et les affiches. */
export async function blobDe(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}
