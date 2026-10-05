import type { PoemeScelle, ChaineScellee } from './jour'
import { tr } from '../i18n'
import { jourUTC, revelation } from './horlogeJour'

/**
 * Ce que l'appareil retient du rendez-vous — sans rien demander au réseau.
 *
 * ── Pourquoi ce module existe ─────────────────────────────────────────────
 *
 * Trois choses se savaient déjà et ne se gardaient nulle part :
 *
 *  · OÙ ta main est posée. L'accueil promettait « ✧ en attente, ✦ une fois
 *    écrit » et codait ✧ en dur ; le rappel du soir sonnait le soir même où
 *    l'on venait d'écrire. Les deux n'avaient qu'à se souvenir du jour.
 *  · CE QUE tu as déjà déplié — la clé `cadavre-jour-deplie`, déplacée ici
 *    depuis la page pour que l'accueil sache si « ton poème est achevé » a
 *    déjà été lu.
 *  · LES POÈMES SCELLÉS déjà reçus. Un poème scellé ne change plus — sauf
 *    un vers retiré après signalement, d'où la relecture au retour du
 *    réseau. C'était la donnée la plus facile du jeu à garder hors ligne,
 *    et la page tournait dans le vide sur un réseau pendu.
 *
 * Tout est en localStorage, et tout se lit de façon SYNCHRONE : le premier
 * rendu de la page montre déjà le feuillet d'hier, sans étoile qui tourne.
 * Chaque accès est enveloppé — mode privé, stockage plein : on oublie, on ne
 * plante pas.
 */

type Langue = 'fr' | 'en'

function lire<T>(cle: string, repli: T): T {
  try {
    const v = localStorage.getItem(cle)
    return v ? (JSON.parse(v) as T) : repli
  } catch { return repli }
}
function ecrire(cle: string, v: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(v)) } catch { /* mode privé, stockage plein */ }
}

// ── Ta main ──────────────────────────────────────────────────────────────

export const CLE_MAINS = 'cadavre-jour-mains'

export interface MainPosee {
  /** Le jour UTC de la chaîne où la main est entrée. */
  jour: string
  rang: number
  /** Quand, à peu près — pour dire « hier » dans le fuseau du joueur. */
  pose: number
}

/** La dernière main posée dans cette langue — une chaîne par langue. */
export function mainPosee(langue: Langue): MainPosee | null {
  const m = lire<Partial<Record<Langue, MainPosee>>>(CLE_MAINS, {})[langue]
  return m && typeof m.jour === 'string' ? m : null
}

/**
 * Retenir la main posée. Renvoie true si c'est une nouvelle : l'appelant ne
 * replanifie les rappels qu'à ce moment-là, et non à chaque visite.
 */
export function noterMain(langue: Langue, jour: string, rang: number, pose = Date.now()): boolean {
  const toutes = lire<Partial<Record<Langue, MainPosee>>>(CLE_MAINS, {})
  const avant = toutes[langue]
  if (avant && avant.jour === jour && avant.rang === rang) return false
  ecrire(CLE_MAINS, { ...toutes, [langue]: { jour, rang, pose: avant?.jour === jour ? avant.pose : pose } })
  return true
}

// ── Les feuillets dépliés ────────────────────────────────────────────────

/*
  On retient LE JOUR déjà déplié et non un booléen, pour que le poème du
  lendemain retrouve son feuillet fermé tout seul. Plusieurs jours, depuis
  l'almanach : ouvrir un poème ancien ne doit pas faire rejouer le dépli du
  dernier. L'ancienne valeur — un jour seul — se lit encore.
*/
export const CLE_DEPLI = 'cadavre-jour-deplie'

export function joursDeplies(): string[] {
  try {
    const v = localStorage.getItem(CLE_DEPLI) ?? ''
    return v.startsWith('[') ? JSON.parse(v) : v ? [v] : []
  } catch { return [] }
}
export const dejaDeplie = (jour: string) => joursDeplies().includes(jour)
export function marquerDeplie(jour: string) {
  try {
    const l = [jour, ...joursDeplies().filter(j => j !== jour)].slice(0, 20)
    localStorage.setItem(CLE_DEPLI, JSON.stringify(l))
  } catch { /* mode privé */ }
}

// ── Les poèmes scellés ───────────────────────────────────────────────────

export const CLE_SCELLES = 'cadavre-jour-scelles'
/**
 * Huit poèmes au plus par langue. Un poème de deux cents mains pèse une
 * vingtaine de kilo-octets : huit tiennent largement sous la limite du
 * stockage, et huit jours couvrent la semaine qu'on passe loin du réseau.
 */
const GARDES_MAX = 8

interface Reserve {
  poemes: Partial<Record<Langue, PoemeScelle[]>>
  almanach: Partial<Record<Langue, ChaineScellee[]>>
  /** Le plus récent jour qu'on sait scellé, et quand on l'a vérifié. */
  dernier: Partial<Record<Langue, { jour: string; verifie: number }>>
}
const reserve = (): Reserve => {
  const r = lire<Partial<Reserve>>(CLE_SCELLES, {})
  return { poemes: r.poemes ?? {}, almanach: r.almanach ?? {}, dernier: r.dernier ?? {} }
}

/** Garder un poème reçu — il remplace l'ancienne copie du même jour. */
export function garderScelle(langue: Langue, p: PoemeScelle) {
  const r = reserve()
  const l = [p, ...(r.poemes[langue] ?? []).filter(x => x.jour !== p.jour)]
    .sort((a, b) => b.jour.localeCompare(a.jour))
    .slice(0, GARDES_MAX)
  r.poemes[langue] = l
  savoirScelle(langue, p.jour, r)
  ecrire(CLE_SCELLES, r)
}

/** Un poème gardé, ou le plus récent si l'on ne nomme pas de jour. */
export function scelleGarde(langue: Langue, jour?: string): PoemeScelle | null {
  const l = reserve().poemes[langue] ?? []
  return (jour ? l.find(p => p.jour === jour) : l[0]) ?? null
}

export function garderAlmanach(langue: Langue, jours: ChaineScellee[]) {
  if (!jours.length) return
  const r = reserve()
  r.almanach[langue] = jours
  savoirScelle(langue, jours[0].jour, r)
  ecrire(CLE_SCELLES, r)
}
export const almanachGarde = (langue: Langue): ChaineScellee[] => reserve().almanach[langue] ?? []

/** Le plus récent jour qu'on SAIT scellé — reçu, pas supposé. */
export function dernierConnu(langue: Langue): { jour: string; verifie: number } | null {
  return reserve().dernier[langue] ?? null
}
export function savoirScelle(langue: Langue, jour: string, r?: Reserve) {
  const res = r ?? reserve()
  const avant = res.dernier[langue]
  res.dernier[langue] = { jour: !avant || jour > avant.jour ? jour : avant.jour, verifie: Date.now() }
  if (!r) ecrire(CLE_SCELLES, res)
}

/**
 * Le poème le plus récent qu'on puisse attendre à cette heure.
 *
 * Sert à ne pas présenter un poème gardé comme « le poème achevé » quand un
 * plus récent s'est scellé depuis : une copie d'avant-hier, affichée tout de
 * suite, n'est qu'une page de l'almanach jusqu'à ce que le réseau confirme.
 */
export function dernierAttendu(maintenant: Date): string {
  // Le plus grand jour J dont la révélation (J + 1, 2 h UTC) est passée.
  return jourUTC(new Date(maintenant.getTime() - 26 * 3_600_000))
}

// ── Ce que l'accueil en dit ──────────────────────────────────────────────

export interface SceauDuJour {
  /** Ta main est posée dans la chaîne d'aujourd'hui. */
  ecrit: boolean
  /** Un poème scellé où tu as écrit, et que tu n'as pas encore ouvert. */
  acheve: MainPosee | null
  /** Faut-il demander au registre si ce poème est bien scellé ? */
  aVerifier: boolean
}

/**
 * L'état du sceau de l'accueil, lu en local.
 *
 * Aucune requête au lancement dans le cas ordinaire : on sait d'où vient
 * sa main, et l'on sait ce qu'on a déplié. La seule question qui reste —
 * « le poème où j'ai écrit est-il bien scellé ? » — ne se pose que s'il y
 * a un candidat, passé l'heure de la révélation, et sa réponse se garde :
 * un poème scellé le reste.
 */
export function sceauDuJour(langue: Langue, maintenant: Date): SceauDuJour {
  const m = mainPosee(langue)
  const auj = jourUTC(maintenant)
  if (!m) return { ecrit: false, acheve: null, aVerifier: false }
  if (m.jour >= auj) return { ecrit: m.jour === auj, acheve: null, aVerifier: false }
  if (dejaDeplie(m.jour) || maintenant.getTime() < revelation(m.jour).getTime()) {
    return { ecrit: false, acheve: null, aVerifier: false }
  }
  const connu = dernierConnu(langue)
  if (connu && connu.jour >= m.jour) return { ecrit: false, acheve: m, aVerifier: false }
  // Pas encore confirmé : on demandera, mais pas plus d'une fois par heure —
  // un cron en panne ne doit pas transformer chaque ouverture en requête.
  const recent = !!connu && maintenant.getTime() - connu.verifie < 3_600_000
  return { ecrit: false, acheve: null, aVerifier: !recent }
}

/**
 * « TON POÈME D'HIER EST ACHEVÉ » — et « hier » se juge dans le fuseau du
 * joueur, à la date où il a écrit, pas au jour UTC de la chaîne : une main
 * posée à 17 h en Californie entre dans la chaîne du lendemain UTC, et lui
 * dire « hier » le soir même serait faux.
 */
export function libelleAcheve(m: MainPosee, maintenant: Date): string {
  const pose = new Date(m.pose)
  const hier = new Date(maintenant); hier.setDate(hier.getDate() - 1)
  if (pose.toDateString() === hier.toDateString()) {
    return tr('TON POÈME D’HIER EST ACHEVÉ', 'YOUR POEM FROM YESTERDAY IS FINISHED')
  }
  if (pose.toDateString() === maintenant.toDateString()) {
    return tr('TON POÈME EST ACHEVÉ', 'YOUR POEM IS FINISHED')
  }
  const date = new Date(`${m.jour}T12:00:00Z`)
    .toLocaleDateString(tr('fr-FR', 'en-GB'), { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .toUpperCase()
  return tr(`TON POÈME DU ${date} EST ACHEVÉ`, `YOUR POEM OF ${date} IS FINISHED`)
}
