import type { Case, ConfigPartie } from '../types'
import { getStructure } from '../structures'
import { contrainteDuJour, jourLocal, type ContrainteDuJour } from './contrainteDuJour'

/**
 * Le rituel du jour — ce qui relie la contrainte au jeu.
 *
 * ── Pourquoi passer par un brouillon ──────────────────────────────────────
 *
 * `Jeu.tsx` sait déjà reprendre une partie interrompue : il lit un brouillon
 * et repart à la case où on s'était arrêté. Poser l'amorce comme une case
 * DÉJÀ SCELLÉE, c'est donc décrire le rituel dans un vocabulaire que le jeu
 * connaît, au lieu de lui ajouter un mode. Rien à changer dans sa machine
 * d'états : il croit reprendre, et il a raison — la première main a bien été
 * jouée, simplement elle l'a été par le jour.
 *
 * ── Zéro voix, et c'est structurel ────────────────────────────────────────
 *
 * `voixIA: 0`. Le cadavre du jour n'appelle jamais l'IA, donc n'entame
 * jamais l'encrier. Un rituel quotidien qui grignoterait la réserve d'essai
 * chaque matin punirait le joueur le plus fidèle — et écrire tous les
 * fragments soi-même sans se relire est de toute façon la forme la plus pure
 * du jeu.
 */

/** Le jour dont le cadavre est fait — local, comme la série et l'ambiance. */
const CLE_FAIT = 'cadavre-rituel-fait'
/** Le rituel en cours, le temps de la partie. Sert à savoir, à l'arrivée sur
 *  l'écran de fin, que ce poème-là était celui du jour. */
const CLE_EN_COURS = 'cadavre-rituel-en-cours'

export function rituelFaitLe(): string | null {
  try { return localStorage.getItem(CLE_FAIT) } catch { return null }
}

/** Le cadavre du jour est-il déjà écrit ? */
export function rituelDuJourFait(d = new Date()): boolean {
  return rituelFaitLe() === jourLocal(d)
}

export function marquerRituelFait(jour: string): void {
  try { localStorage.setItem(CLE_FAIT, jour) } catch { /* mode privé */ }
}

/** Le jour du rituel en cours, s'il y en a un. */
export function rituelEnCours(): string | null {
  try { return sessionStorage.getItem(CLE_EN_COURS) } catch { return null }
}

export function cloreRituelEnCours(): void {
  try { sessionStorage.removeItem(CLE_EN_COURS) } catch { /* ignore */ }
}

/**
 * Prépare la partie du jour et renvoie la route où aller.
 *
 * Écrit le brouillon amorcé, la configuration, et le drapeau qui permettra à
 * la fin de partie de reconnaître ce poème comme celui du jour.
 */
export function ouvrirRituel(c: ContrainteDuJour = contrainteDuJour()): string {
  const structure = getStructure(c.structureId)
  const def = structure.cases[0]

  const config: ConfigPartie = {
    structureId: c.structureId,
    visibilite: 'aveugle',
    premierJoueur: 'humain',
    mode: 'standard',
    joueursHumains: 1,
    voixIA: 0,
  }

  // L'amorce est une case scellée, pas un texte de départ à modifier : la
  // rouvrir reviendrait à laisser chacun changer la contrainte, et deux
  // poèmes du jour cesseraient d'être comparables.
  const amorce: Case = {
    numero: 1,
    fonction: def?.fonction ?? '',
    consigne: def?.consigne ?? '',
    auteur: 'humain',
    donne: true,
    texte: c.amorce,
    ts: Date.now(),
  }

  const brouillon = {
    poemeId: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `r${Date.now().toString(36)}`,
    config,
    cases: [amorce],
    caseIndex: 1,
    total: c.nbCases,
  }

  try {
    localStorage.setItem('brouillon-actuel', JSON.stringify(brouillon))
    sessionStorage.setItem('config-partie', JSON.stringify(config))
    sessionStorage.setItem(CLE_EN_COURS, c.jour)
    // Le guide en neuf étapes détournerait le rituel vers son propre
    // parcours ; on ne le déclenche pas ici.
    sessionStorage.removeItem('decouverte')
  } catch { /* stockage refusé : la partie s'ouvrira sans amorce, pas de blocage */ }

  return '/jeu'
}
