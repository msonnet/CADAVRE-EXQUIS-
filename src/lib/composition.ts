import type { Case, Poeme } from '../types'
import type { VersRecolte } from '../db'
import { tr } from '../i18n'

/**
 * Relier des vers du carnet en un feuillet du recueil.
 *
 * ── Ce qui manquait ───────────────────────────────────────────────────────
 *
 * Le carnet portait l'ambition du recueil — « trois cents vers récoltés puis
 * assemblés à la main » — et n'offrait pour l'assembler que deux flèches qui
 * déplacent d'UN rang. Remonter le deux-cent-quatre-vingtième vers en tête
 * demandait deux cent soixante-dix-neuf appuis, et la seule sortie était un
 * `.txt` : le vers assemblé ne pouvait devenir ni un feuillet, ni une
 * affiche, ni une publication.
 *
 * ── Le geste ──────────────────────────────────────────────────────────────
 *
 * On touche les vers dans l'ordre du poème. L'ordre du TOUCHER fait l'ordre
 * du feuillet : le vers du fond du carnet qu'on touche en premier ouvre le
 * poème, sans un seul déplacement. On relit, on retouche l'ordre à la
 * flèche si besoin, et l'on relie.
 *
 * Le feuillet est un vers libre — la structure qui joint les cases à la
 * ligne, celle du poème du jour. Il hérite donc de tout ce qu'un poème du
 * recueil sait faire : le dépli, l'affiche, l'illustration, la galerie.
 *
 * ── Les coutures sont les provenances ─────────────────────────────────────
 *
 * Chaque case garde d'où vient son vers : la date et le titre du poème
 * d'origine à la place de la fonction grammaticale, et la signature que les
 * coutures annonçaient quand on l'a gardé. Un collage qui ne dit pas d'où
 * viennent ses morceaux n'est plus un collage, c'est un texte.
 *
 * ── Le carnet n'est pas vidé ──────────────────────────────────────────────
 *
 * Relier COPIE. Un vers peut servir à deux feuillets, et le carnet reste la
 * réserve dont on compose — le vider à chaque reliure le transformerait en
 * file d'attente.
 *
 * Aucune importation de Dexie ici : la composition se mesure seule.
 */

/** Un feuillet d'un seul vers n'est que ce vers : il en faut deux pour relier. */
export const PLANCHER_FEUILLET = 2

/** Toucher un vers : il entre à la fin du feuillet, ou en sort. */
export function basculerChoix(choix: readonly string[], id: string): string[] {
  return choix.includes(id) ? choix.filter(x => x !== id) : [...choix, id]
}

/** Monter ou descendre un vers dans le feuillet en cours de relecture. */
export function deplacerChoix(choix: readonly string[], id: string, sens: -1 | 1): string[] {
  const i = choix.indexOf(id)
  const j = i + sens
  if (i === -1 || j < 0 || j >= choix.length) return [...choix]
  const r = [...choix]
  ;[r[i], r[j]] = [r[j], r[i]]
  return r
}

/** D'où vient le vers — ce que la couture du feuillet imprime à la place de la fonction. */
export function provenanceDuVers(v: Pick<VersRecolte, 'datePoeme' | 'dateRecolte' | 'poemeTitre'>): string {
  const date = new Date(v.datePoeme ?? v.dateRecolte).toLocaleDateString(tr('fr-FR', 'en-GB'), {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  return v.poemeTitre ? `${date} · ${v.poemeTitre}` : date
}

const SIGNATURES_SEULES = new Set(['toi', 'you', 'toi seul', 'you alone'])

/**
 * Qui a écrit le vers — pour que le feuillet sache s'il porte une voix.
 *
 * Ce n'est pas un détail d'affichage : le `.txt` du recueil appose la
 * mention de l'IA (AI Act, art. 50) d'après `auteur`. Un feuillet qui
 * recoud des vers de voix doit la porter comme leurs poèmes d'origine.
 *
 * Le carnet ne gardait pas l'auteur avant ce lot. Pour ses vers anciens, on
 * le retrouve dans le poème d'origine s'il est encore au recueil, puis par
 * le compte de voix de l'Atelier. Faute de tout, on ne tient pour humain
 * qu'un vers signé « toi » : dans le doute la mention est due, l'omettre
 * serait mentir dans le sens que le règlement interdit.
 */
export function auteurDuVers(v: VersRecolte, source?: Poeme): Case['auteur'] {
  if (v.auteur) return v.auteur
  const origine = source?.cases.find(c => c.texte.trim() === v.texte)
  if (origine) return origine.auteur
  if (v.nbVoix === 0) return 'humain'
  if (typeof v.nbVoix === 'number') return 'mixte'
  if (v.signature && SIGNATURES_SEULES.has(v.signature.trim().toLowerCase())) return 'humain'
  return 'mixte'
}

/** L'identifiant d'un feuillet relié : un par reliure, deux reliures font deux feuillets. */
export function idFeuilletCarnet(date: number, alea: number = Math.random()): string {
  return `carnet-${date}-${alea.toString(36).slice(2, 8)}`
}

/**
 * Le feuillet relié — les vers dans l'ordre donné, chacun avec sa couture.
 *
 * `sources` : les poèmes d'origine encore au recueil, par identifiant, pour
 * retrouver l'auteur des vers gardés avant qu'on le note.
 */
export function poemeDuCarnet(o: {
  vers: VersRecolte[]
  sources?: Map<string, Poeme>
  date?: number
  id?: string
}): Poeme {
  const date = o.date ?? Date.now()
  const cases: Case[] = o.vers.map((v, i) => ({
    numero: i + 1,
    fonction: provenanceDuVers(v),
    consigne: '',
    auteur: auteurDuVers(v, v.poemeId ? o.sources?.get(v.poemeId) : undefined),
    texte: v.texte,
    ts: date,
    // Une chaîne vide plutôt que l'absence : c'est la présence du champ qui
    // dit à `attribution` qu'il lit une couture de carnet.
    signature: v.signature ?? '',
  }))
  return {
    id: o.id ?? idFeuilletCarnet(date),
    titre: null,
    structureId: 'vers-libre',
    mode: 'standard',
    visibilite: 'aveugle',
    cases,
    origine: 'carnet',
    dateCreation: date,
    dateModification: date,
  }
}
