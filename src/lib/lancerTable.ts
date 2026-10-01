import type { ConfigPartie } from '../types'
import { ouvrirPartieIA, nouvellePartieId, deposerRecu, type Refus } from './acces'

/**
 * Ouvre une partie du cadavre écrit sur ce téléphone.
 *
 * Deux portes y mènent désormais — les préparatifs, et « UNE AUTRE, À LA
 * MÊME TABLE » en fin de partie — et la seconde ne doit pas être un raccourci
 * qui contourne la première. Une partie où une voix écrit se règle à son
 * ouverture, jamais en cours de route : c'est ici, une fois, pour les deux.
 *
 * Rend le refus quand l'encrier est sec, pour que l'appelant ouvre le mur ;
 * rien quand la partie peut commencer.
 */
export async function ouvrirTable(config: ConfigPartie): Promise<Refus | null> {
  // Une table entièrement humaine ne coûte rien et passe.
  if (config.voixIA > 0) {
    const partieId = nouvellePartieId()
    const refuse = await ouvrirPartieIA(partieId, 'ecrit')
    if (refuse) return refuse
    deposerRecu(partieId)
  }

  // Purge : un brouillon périmé écraserait cette config, et le drapeau
  // découverte forcerait le passage manuel des tours IA.
  localStorage.removeItem('brouillon-actuel')
  sessionStorage.removeItem('decouverte')
  sessionStorage.setItem('config-partie', JSON.stringify(config))
  return null
}
