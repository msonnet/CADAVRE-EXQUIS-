import type { Case } from '../types'
import { tr, langueActuelle } from '../i18n'
import { NOMS_VOIX, nomDeVoix, nomsDeVoix } from '../data/voiceIds'

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
 *
 * ── L'identifiant qui s'affichait nu ──────────────────────────────────────
 *
 * Le cadavre écrit, le salon et le poème du jour gardent l'IDENTIFIANT de la
 * voix que le serveur renvoie, et l'Atelier son nom. Les coutures du cadavre
 * écrit annonçaient donc « voix · meteorologue », sans article ni accent.
 * `nomAffiche` rend le nom quand il reçoit un identifiant, et laisse tel
 * quel un nom déjà écrit — y compris la langue où la séance s'est jouée.
 */
export function attribution(c: Case, iaNum?: number): string {
  const { texte, voix } = attributionEnMorceaux(c, iaNum)
  return voix.length ? `${texte} · ${voix.map(nomAffiche).join(' · ')}` : texte
}

/** Le nom d'une voix tel que les coutures l'impriment. */
export function nomAffiche(nom: string): string {
  return Object.prototype.hasOwnProperty.call(NOMS_VOIX, nom) ? nomDeVoix(nom, langueActuelle()) : nom
}

/**
 * La même phrase, coupée en deux : ce qui précède les noms, et les noms.
 *
 * Les coutures du recueil font de chaque nom un lien vers la fiche de la
 * voix ; elles ont besoin des noms À PART pour les poser un par un. Une
 * seule fonction décide quand les noms suivent — l'autre ne fait que coller.
 */
export function attributionEnMorceaux(c: Case, iaNum?: number): { texte: string; voix: string[] } {
  const noms = nomsDeVoix(c.voixNom)
  const avec = (texte: string) => ({ texte, voix: noms })
  const seul = (texte: string) => ({ texte, voix: [] as string[] })

  // ── Vers d'atelier : le nombre de mains d'abord ──────────────────────
  if (typeof c.nbVoix === 'number') {
    const n = c.nbVoix
    const compte = n === 1
      ? tr('une voix', 'one voice')
      : `${n} ${tr('voix', 'voices')}`

    if (c.auteur === 'humain' || n === 0) return seul(tr('toi seul', 'you alone'))
    if (c.auteur === 'mixte') return avec(`${tr('toi et', 'you and')} ${compte}`)
    return avec(compte)
  }

  // ── Cadavre écrit : une seule main par case ──────────────────────────
  if (c.auteur === 'ia') {
    const num = iaNum !== undefined ? ` ${iaNum}` : ''
    return avec(`${tr('voix', 'voice')}${num}`)
  }
  if (c.joueurNumero) return seul(`${tr('joueur', 'player')} ${c.joueurNumero}`)
  // Salon et poème du jour : une vraie personne, nommée. Une main restée
  // anonyme n'est pas « toi » pour autant — c'était le repli d'avant.
  if (c.moi) return seul(tr('toi', 'you'))
  if (c.pseudo) return seul(c.pseudo)
  if ('moi' in c || 'pseudo' in c) return seul(tr('une main', 'a hand'))
  return seul(tr('toi', 'you'))
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
/**
 * Les structures où une case est un VERS ENTIER et non un fragment.
 *
 * `reconstruirePoeme` les traite déjà ensemble — elle joint leurs cases par
 * des retours à la ligne là où les autres structures les cousent en une
 * phrase. Le libellé avait oublié `vers-libre`, et le recueil annonçait donc
 * « 2 FRAGMENTS » pour un poème de deux vers.
 */
const UNE_CASE_EST_UN_VERS = new Set(['atelier', 'vers-libre'])

export function libelleMorceaux(structureId: string, n: number): string {
  if (UNE_CASE_EST_UN_VERS.has(structureId)) {
    return `${n} ${n === 1 ? tr('VERS', 'LINE') : tr('VERS', 'LINES')}`
  }
  return `${n} ${n === 1 ? tr('FRAGMENT', 'FRAGMENT') : tr('FRAGMENTS', 'FRAGMENTS')}`
}

/** Combien de mains se sont posées sur la feuille — de vraies personnes. */
export function libelleMains(n: number): string {
  return `${n} ${n === 1 ? tr('MAIN', 'HAND') : tr('MAINS', 'HANDS')}`
}

/**
 * Une machine a-t-elle écrit dans ce poème ?
 *
 * `auteur` vaut 'humain', 'ia' ou 'mixte' — 'mixte' désigne un vers
 * d'atelier où le médium et une voix se sont partagé la ligne. Les deux
 * derniers comptent.
 */
export function contientDeLIA(cases: { auteur?: string }[]): boolean {
  return cases.some(c => c.auteur === 'ia' || c.auteur === 'mixte')
}

/**
 * La mention portée par un poème qui SORT de l'application.
 *
 * ── Pourquoi elle existe ──────────────────────────────────────────────────
 *
 * L'article 50 du règlement européen sur l'intelligence artificielle,
 * applicable depuis le 2 août 2026, demande que les sorties d'un système
 * générant du texte de synthèse soient identifiables comme telles. Cette
 * obligation ne remonte PAS au fournisseur du modèle : elle est portée par
 * qui met le système sur le marché sous son nom.
 *
 * Dans l'app, la chose est déjà dite — les coutures nomment chaque voix à
 * la fin d'une partie, et c'est le meilleur écran du produit. Mais un poème
 * exporté en `.txt` sortait nu : rien, dans le fichier, ne disait qu'une
 * machine y avait écrit. La sauvegarde `.json`, elle, portait déjà
 * `cases[].auteur` — le marquage lisible par machine existait, le lisible
 * par un humain manquait.
 *
 * ── Pourquoi seulement quand c'est vrai ───────────────────────────────────
 *
 * Un poème écrit par des mains humaines seules ne porte rien. Apposer la
 * mention partout la viderait de son sens, et mentirait dans l'autre
 * sens — le jeu se joue très bien sans aucune voix.
 */
export function mentionIA(): string {
  return tr(
    '✦ Des fragments de ce poème ont été écrits par une intelligence artificielle (Claude, Anthropic).',
    '✦ Fragments of this poem were written by an artificial intelligence (Claude, Anthropic).',
  )
}

/**
 * La série — combien de nuits d'affilée on est venu.
 *
 * Deux défauts corrigés d'un coup, et le second était le plus grave.
 *
 * Les CHIFFRES ROMAINS d'abord. Ils sont justes ailleurs : l'année de
 * l'en-tête (« N° 1.42 · MMXXVI ») et les actes d'une partie (« Acte III »)
 * sont des numéros de revue et de scène, et ils ne dépassent jamais quelques
 * unités. Une série, elle, compte sans borne — « ✦ Cᵉ nuit de suite » au
 * centième jour, ce qui ne se lit pas. Les vers et les mains sont déjà
 * passés en chiffres arabes ; la série leur revient.
 *
 * La LANGUE ensuite : la phrase était écrite en français dans le code, sans
 * `tr()`. L'interface anglaise affichait « nuit de suite » depuis toujours.
 *
 * L'anglais évite l'ordinal — « 2nd », « 3rd », « 21st » demanderaient une
 * table de suffixes pour un gain nul. « 2 nights running » dit la même chose
 * et se lit mieux. Le français garde son ordinal : la série commence à deux,
 * « ᵉ » y est donc toujours la bonne terminaison.
 */
export function libelleSerie(n: number): string {
  return tr(`✦ ${n}ᵉ nuit de suite`, `✦ ${n} nights running`)
}
