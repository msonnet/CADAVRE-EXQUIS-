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
