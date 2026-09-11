import type { Case } from '../types'
import { tr } from '../i18n'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

/**
 * Qui a écrit ce fragment, tel que les coutures l'annoncent.
 *
 * Les deux panneaux de coutures — fin de partie et feuillet — écrivaient
 * chacun leur version de cette phrase, et aucun des deux ne savait lire un
 * vers d'atelier : `auteur` y vaut souvent « mixte », qui n'était traité
 * nulle part et retombait sur « toi ». La signature des voix, patiemment
 * construite à la fin de la séance, ne s'affichait donc jamais.
 *
 * Un vers d'atelier porte `nbVoix` : c'est lui qui distingue les deux
 * lectures. Le nombre passe devant les noms — sur une table de quarante-six,
 * savoir qu'un vers a été écrit par cinq mains dit quelque chose que la liste
 * des cinq noms ne dit pas.
 */
export function attribution(c: Case, iaNum?: number): string {
  const noms = c.voixNom ? ` · ${c.voixNom}` : ''

  // ── Vers d'atelier : le nombre de mains d'abord ──────────────────────
  if (typeof c.nbVoix === 'number') {
    const n = c.nbVoix
    const compte = n === 1
      ? tr('une voix', 'one voice')
      : `${toRomain(n)} ${tr('voix', 'voices')}`

    if (c.auteur === 'humain' || n === 0) return tr('toi seul', 'you alone')
    if (c.auteur === 'mixte') return `${tr('toi et', 'you and')} ${compte}${noms}`
    return `${compte}${noms}`
  }

  // ── Cadavre écrit : une seule main par case ──────────────────────────
  if (c.auteur === 'ia') {
    const num = iaNum !== undefined ? ` ${iaNum}` : ''
    return `${tr('voix', 'voice')}${num}${noms}`
  }
  if (c.joueurNumero) return `${tr('joueur', 'player')} ${c.joueurNumero}`
  return tr('toi', 'you')
}

/**
 * Combien de morceaux composent ce poème, tel que le pied de carte l'annonce.
 *
 * ── Le mot qui mentait ────────────────────────────────────────────────────
 *
 * Les pieds de carte écrivaient « 5 VOIX » en comptant les CASES. Sur une
 * partie jouée seul, l'écran annonçait donc cinq voix là où il n'y avait
 * qu'une main — le reproche exact de l'audit du 10 septembre.
 *
 * Contrairement à ce que ce rapport supposait, « voix » ne désignait pas
 * trois choses mais deux. Le cadavre écrit convoque les mêmes quarante-six
 * personas que l'atelier (`Jeu.tsx` importe `VOICE_IDS`) : « VOIX IA »,
 * « la voix écrit en secret », « voix 2 · L'horloger » sont tous justes et
 * restent. Seul le COMPTE était faux, et c'est lui seul qu'on corrige.
 *
 * « fragment » plutôt que « case » : c'est le mot de l'écran d'entrée —
 * « Chaque fragment ignore les autres. » — et celui du champ de saisie.
 * « case » désigne l'emplacement, « fragment » ce qu'on y a écrit, et c'est
 * bien ce qu'on compte.
 *
 * L'atelier fait exception : une case y est un VERS entier, pas un morceau.
 */
export function libelleMorceaux(structureId: string, n: number): string {
  if (structureId === 'atelier') {
    return `${n} ${n === 1 ? tr('VERS', 'LINE') : tr('VERS', 'LINES')}`
  }
  return `${n} ${n === 1 ? tr('FRAGMENT', 'FRAGMENT') : tr('FRAGMENTS', 'FRAGMENTS')}`
}

/** Combien de mains se sont posées sur la feuille — de vraies personnes. */
export function libelleMains(n: number): string {
  return `${n} ${n === 1 ? tr('MAIN', 'HAND') : tr('MAINS', 'HANDS')}`
}
