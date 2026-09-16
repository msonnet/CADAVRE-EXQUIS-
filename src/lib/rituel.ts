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
 * ── Des voix, parce que c'est un cadavre exquis ───────────────────────────
 *
 * Premier jet : `voixIA: 0`, pour que le rituel n'entame jamais l'encrier.
 * Bonne réponse économique, mauvaise réponse de jeu — un cadavre exquis
 * écrit d'une seule main est un exercice, pas le jeu. Le rendez-vous
 * quotidien doit être le jeu entier.
 *
 * La partie se règle donc à son ouverture comme toutes les autres, par
 * `ouvrirPartieIA`, et c'est l'appelant qui s'en charge : ce module prépare,
 * il ne paie pas. Si le rituel doit rester gratuit au-delà de la réserve
 * d'essai, la réponse est un acte `cadavre_jour` exempté et plafonné à un
 * par jour dans `api/_acces.ts`, sur le modèle d'`avatar`.
 *
 * `premierJoueur: 'ia'` : l'amorce occupe la première place de la séquence,
 * et cette place est celle d'une voix. C'est juste — l'amorce est bien une
 * main qui n'est pas la tienne.
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
    premierJoueur: 'ia',
    mode: 'standard',
    joueursHumains: 1,
    voixIA: c.voixIA,
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
