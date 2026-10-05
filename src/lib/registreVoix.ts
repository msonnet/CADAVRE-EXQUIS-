import type { Poeme } from '../types'
import { VOICE_IDS, idDeVoix, nomsDeVoix } from '../data/voiceIds'
import { getStructure, reconstruirePoeme } from '../structures'

/**
 * Le registre des voix — qui a écrit quoi, dans tes poèmes.
 *
 * ── Ce qui manquait ───────────────────────────────────────────────────────
 *
 * Les voix n'avaient ni visage ni mémoire. Une fois la partie close, leur
 * nom ne vivait plus que dans les coutures d'un poème, et rien ne recensait
 * celles qu'on avait rencontrées : impossible de retrouver la voix d'un vers
 * aimé autrement qu'en rouvrant les poèmes un à un.
 *
 * Tout est déjà dans le recueil : `cases[].voixNom` pour le cadavre écrit,
 * le salon et le poème du jour, `cases[].mains[].voixNom` pour l'Atelier. Ce
 * module ne fait que les relire. Rien ne part au serveur, rien n'est écrit :
 * le registre est une vue du recueil, il naît et meurt avec lui.
 *
 * ── Ce qu'on attribue, et ce qu'on n'attribue pas ─────────────────────────
 *
 * Une voix ne reçoit que ce qu'elle a ÉCRIT. Un vers d'atelier cousu à trois
 * mains n'est pas « son » vers : on lui rend sa case, et le vers entier n'est
 * gardé qu'en contexte, pour que l'écran puisse la montrer à sa place. Un
 * fragment de RÉSERVE n'est à personne — un texte de conserve signé « le
 * graveur » serait un mensonge, comme dans les coutures.
 *
 * Seuls les vers d'atelier anciens, enregistrés avant que les coutures ne
 * détaillent les cases (`mains` absent), n'ont que la liste des noms : le
 * vers entier y est attribué à chacune, marqué `partage` pour que l'écran
 * dise qu'il fut écrit à plusieurs.
 *
 * Aucune importation de Dexie ici : ce calcul se mesure seul.
 */

export interface VersDeVoix {
  /** Ce que la voix a écrit, tel qu'il a été cousu. */
  texte: string
  /** Le vers entier où il a été cousu, quand il diffère du texte. */
  ligne?: string
  /** Où sa case commence dans `ligne`, quand on a pu la retrouver. */
  debut?: number
  /** Vers ancien sans détail des cases : combien de voix se le partagent. */
  partage?: number
  poemeId: string
  /** Le titre du poème, ou son premier vers — ce que la carte du recueil affiche. */
  poeme: string
  date: number
}

export interface FicheVoix {
  id: string
  /** Sa place dans le registre, de 1 à 46 — l'ordre de `VOICE_IDS`, qui ne bouge pas. */
  numero: number
  /** La date de la première séance partagée. */
  premiere: number
  /** Combien de poèmes distincts elle a touchés. */
  seances: number
  /** Ce qu'elle a écrit, du plus ancien au plus récent. */
  vers: VersDeVoix[]
}

/** Le titre d'un poème, ou son premier vers : ce sous quoi le recueil le montre. */
export function nomDuPoeme(p: Poeme): string {
  if (p.titre) return p.titre
  const entier = reconstruirePoeme(p.cases, getStructure(p.structureId))
  return (entier.split('\n').find(l => l.trim()) ?? '').trim()
}

/**
 * Relit le recueil et rend une fiche par voix rencontrée, indexée par
 * identifiant. Une voix absente de la carte n'a pas encore été rencontrée.
 */
export function registreDesVoix(poemes: Poeme[]): Map<string, FicheVoix> {
  const fiches = new Map<string, FicheVoix>()
  const seances = new Map<string, Set<string>>()

  const inscrire = (id: string, v: VersDeVoix) => {
    let f = fiches.get(id)
    if (!f) {
      f = { id, numero: VOICE_IDS.indexOf(id as typeof VOICE_IDS[number]) + 1, premiere: v.date, seances: 0, vers: [] }
      fiches.set(id, f)
      seances.set(id, new Set())
    }
    f.vers.push(v)
    f.premiere = Math.min(f.premiere, v.date)
    seances.get(id)!.add(v.poemeId)
  }

  for (const p of poemes) {
    let nom: string | null = null
    const nomPoeme = () => (nom ??= nomDuPoeme(p))

    for (const c of p.cases) {
      // Un fragment de réserve n'a pas de voix, même si une case porte un nom.
      if (c.fallback) continue

      if (c.mains?.length) {
        // La place de chaque case dans le vers. Premier jet : l'écran
        // cherchait le texte de la voix dans le vers entier, et soulignait la
        // PREMIÈRE occurrence — sur « le le le », la case du graveur, la
        // deuxième, était montrée sur le premier « le », écrit par une autre
        // main. Les mains sont rangées dans l'ordre du vers : on cherche donc
        // chacune APRÈS la fin de la précédente. Une case introuvable (un
        // accord l'a récrite) n'a pas de place, et l'écran ne souligne rien
        // plutôt que de souligner au hasard.
        const ligne = c.texte.toLowerCase()
        let curseur = 0
        for (const m of c.mains) {
          const t = m.texte.trim().toLowerCase()
          const i = t ? ligne.indexOf(t, curseur) : -1
          if (i >= 0) curseur = i + t.length
          if (m.reserve) continue
          const id = idDeVoix(m.voixNom)
          if (!id) continue
          const entier = m.texte.trim() !== c.texte.trim()
          inscrire(id, {
            texte: m.texte,
            ...(entier ? { ligne: c.texte, ...(i >= 0 ? { debut: i } : {}) } : {}),
            poemeId: p.id, poeme: nomPoeme(), date: p.dateCreation,
          })
        }
        continue
      }

      const ids = nomsDeVoix(c.voixNom).map(idDeVoix).filter((x): x is string => !!x)
      const uniques = [...new Set(ids)]
      for (const id of uniques) {
        inscrire(id, {
          texte: c.texte,
          ...(uniques.length > 1 ? { partage: uniques.length } : {}),
          poemeId: p.id, poeme: nomPoeme(), date: p.dateCreation,
        })
      }
    }
  }

  for (const [id, f] of fiches) {
    f.seances = seances.get(id)!.size
    f.vers.sort((a, b) => a.date - b.date)
  }
  return fiches
}
