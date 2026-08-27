import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { demanderFragmentIA } from '../api/claude'
import { validerCase } from '../utils/validation'
import type { NiveauValidation, TypeCase } from '../utils/validation'
import { nomDeVoix } from '../data/voiceIds'
import { corrigerAccords } from '../api/corriger'
import { sauvegarderPoeme } from '../db'
import type { Poeme, Case } from '../types'
import { placerVoix, multiplicitesVoix, type PlanAtelier } from './Atelier'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'
import MiniCoach from '../components/MiniCoach'
import {
  GardeOuverture, HORS_GN, TYPES_A_DETERMINANT, FAMILLE,
  diagnostic, familleDe, souder, tirerStrategie,
} from '../lib/determinants'
import { GardeFormes, POIDS_FAMILLE, familleDuVers, type Famille } from '../lib/formes'
import { GardeLexique } from '../lib/lexique'
import { technicite } from '../data/technicite'
import {
  GardeMetrique, classeDeLongueur, diagnosticMetrique, longueurEstimee, motsDuVers,
  type Classe,
} from '../lib/metrique'

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

interface VersAtelier {
  texte: string
  auteur: 'humain' | 'ia' | 'mixte'  // 'mixte' = médium + voix(es) sur le même vers
  voixNums: number[]   // numéros (1-based) des voix IA qui ont participé — vide pour 'humain' pur
  voixNoms?: string[]  // personas correspondantes, révélées après la séance
  mains?: MainAtelier[] // qui a écrit QUELLE case, dans l'ordre du vers
}

/**
 * Une case du vers, et la main qui l'a remplie.
 *
 * Le vers ne gardait que la liste de ses voix, sans dire laquelle avait écrit
 * quoi — et surtout sans distinguer une voix d'un mot tiré de la réserve.
 * Quand l'appel échoue, le serveur renvoie un mot en conserve : dans les
 * coutures il était indiscernable d'un fragment écrit. Sur un recueil, c'est
 * la garantie de publier un vers en croyant qu'une voix l'a signé.
 */
interface MainAtelier {
  role: string          // la case grammaticale remplie (SUJET, VERBE…)
  texte: string         // le fragment tel qu'il a été cousu
  voixNom?: string      // la persona, absente si c'est le médium ou la réserve
  reserve?: boolean     // true si le fragment vient de la réserve, pas d'une voix
}

interface VoixEnCours {
  num: number
  role: string
  fait: boolean
}

// ── Gabarits grammaticaux — le principe du cadavre écrit ──────────────────────
// Chaque voix remplit une case syntaxique définie : le vers assemblé reste
// grammaticalement valide même quand l'image est absurde. Les longueurs
// arbitraires produisaient des tas de noms juxtaposés sans syntaxe.

interface RoleFragment {
  type: string       // type de case envoyé à l'API (contraintes serveur)
  consigne: string
  role: string       // étiquette affichée pendant que la voix écrit
  mots?: number      // uniquement pour le vers à une voix (longueur aléatoire)
  apres?: string     // ponctuation cousue après le fragment (ex : virgule de l'adverbe en tête)
  nu?: boolean       // le nom sans déterminant y est-il recevable ? (voir GN_SUJET)
  /** Mot d'attelage cousu DEVANT le fragment, que personne n'écrit.
   *  C'est lui qui rend possibles les deux formes que le médium écrivait et
   *  que la machine ne savait pas produire : « il est grand le silence des
   *  saisons » et « au travers un trésor ». Sans un mot fixe en tête, une
   *  dislocation ou un syntagme flottant n'existent pas. */
  avant?: string
}

// Le sujet supporte le nom nu : « lacune penche sur l'abîme » est une ellipse
// que la poésie connaît. Le complément, non — « froisse vibrure » n'est pas une
// ellipse, c'est une faute, et la contrainte du groupe verbal le disait déjà
// depuis toujours (« cède terrain » est INTERDIT, « cède du terrain » est correct).
const GN_SUJET: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal sujet', 'a subject noun phrase'), role: tr('SUJET', 'SUBJECT'),
  nu: true,
}
const GN_COMPLEMENT: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal complément', 'an object noun phrase'), role: tr('COMPLÉMENT', 'OBJECT'),
}
const VERBE: RoleFragment = {
  type: 'verbe', consigne: tr('un verbe conjugué', 'a conjugated verb'), role: tr('VERBE', 'VERB'),
}
// Devant un complément, le gabarit exige un verbe transitif — la voix ne sait pas
// qu'un complément suit (principe du cadavre), mais le gabarit, lui, le sait
const VERBE_TRANSITIF: RoleFragment = {
  type: 'verbe-transitif', consigne: tr('un verbe transitif conjugué', 'a conjugated transitive verb'), role: tr('VERBE', 'VERB'),
}
// ── Les cases larges ─────────────────────────────────────────────────────────
// `groupe-nominal-riche` — deux à quatre mots, validé par le serveur depuis
// toujours — n'était employé par AUCUN gabarit de l'atelier. C'est la raison
// pour laquelle zéro pour cent des vers atteignaient dix mots : toutes les
// cases étaient étroites, et cinq cases étroites font un vers court.
const GN_RICHE_SUJET: RoleFragment = {
  type: 'groupe-nominal-riche', consigne: tr('un groupe nominal sujet développé', 'a developed subject noun phrase'), role: tr('SUJET', 'SUBJECT'),
}
const GN_RICHE_COMPLEMENT: RoleFragment = {
  type: 'groupe-nominal-riche', consigne: tr('un groupe nominal complément développé', 'a developed object noun phrase'), role: tr('COMPLÉMENT', 'OBJECT'),
}
const GROUPE_VERBAL: RoleFragment = {
  type: 'groupe-verbal', consigne: tr("un verbe conjugué suivi d'un complément court", 'a conjugated verb followed by a short complement'), role: tr('VERBE + COMPL.', 'VERB + COMPL.'),
}
const ADJECTIF: RoleFragment = {
  type: 'adjectif', consigne: tr('un adjectif qualificatif seul', 'a single descriptive adjective'), role: tr('ADJECTIF', 'ADJECTIVE'),
}
const ADVERBE_TETE: RoleFragment = {
  type: 'adverbe', consigne: tr('un adverbe ou une locution adverbiale', 'an adverb or adverbial phrase'), role: tr('ADVERBE', 'ADVERB'), apres: ',',
}
const ADVERBE_FIN: RoleFragment = {
  type: 'adverbe', consigne: tr('un adverbe ou une locution adverbiale', 'an adverb or adverbial phrase'), role: tr('ADVERBE', 'ADVERB'),
}
const CONJ_COORD: RoleFragment = {
  type: 'conjonction-coord', consigne: tr('une conjonction de coordination ou un adverbe de liaison', 'a coordinating conjunction or linking adverb'), role: tr('CONJONCTION', 'CONJUNCTION'),
}
const CONJ_SUBORD: RoleFragment = {
  type: 'conjonction-subord', consigne: tr('une conjonction de subordination', 'a subordinating conjunction'), role: tr('CONJONCTION', 'CONJUNCTION'),
}
const INFINITIF: RoleFragment = {
  type: 'infinitif', consigne: tr("un verbe à l'infinitif", 'a verb in the infinitive'), role: tr('INFINITIF', 'INFINITIVE'),
}
const GERONDIF: RoleFragment = {
  type: 'gérondif', consigne: tr('un gérondif (en + participe présent)', 'a gerund clause (an -ing form)'), role: tr('GÉRONDIF', 'GERUND'), apres: ',',
}
const QUESTION: RoleFragment = {
  type: 'proposition', consigne: tr('une question', 'a question'), role: 'QUESTION',
}

// ── Les cases des formes incomplètes ─────────────────────────────────────────
// Ces cases-là ne servent à rien d'autre qu'à ne pas finir la phrase.
const GN_APPOSE: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal', 'a noun phrase'), role: tr('APPOSITION', 'APPOSITION'),
  nu: true,
}
const GN_LISTE: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal', 'a noun phrase'), role: tr('ÉNUMÉRATION', 'LIST'),
  nu: true, apres: ',',
}
const GN_LISTE_FIN: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal', 'a noun phrase'), role: tr('ÉNUMÉRATION', 'LIST'),
  nu: true,
}
const INFINITIF_LISTE: RoleFragment = {
  type: 'infinitif', consigne: tr("un verbe à l'infinitif", 'a verb in the infinitive'), role: tr('LITANIE', 'LITANY'),
  apres: ',',
}
const INFINITIF_FIN: RoleFragment = {
  type: 'infinitif', consigne: tr("un verbe à l'infinitif", 'a verb in the infinitive'), role: tr('LITANIE', 'LITANY'),
}
const NOM_SEUL: RoleFragment = {
  type: 'nom', consigne: tr('un nom seul', 'a single noun'), role: tr('UN MOT', 'ONE WORD'),
}
const ADJ_APPOSE: RoleFragment = {
  type: 'adjectif', consigne: tr('un adjectif qualificatif seul', 'a single descriptive adjective'), role: tr('ADJECTIF', 'ADJECTIVE'),
}
// ── Les deux formes que le médium écrivait et que la machine ignorait ───────
//
// Relevé sur deux ateliers : les seuls vers qui sonnaient humains étaient les
// siens, et aucun n'était une proposition indépendante.
//
//   « Il est grand le silence des saisons »  — une dislocation
//   « Au travers un trésor »                 — un syntagme qui pend
//
// Ni l'une ni l'autre n'est une liste. Ce sont des morceaux d'une phrase qui
// n'est pas là — et c'est exactement ce qui leur donne une voix.
// Seuls les verbes attributifs supportent la dislocation « TÊTE + adjectif +
// groupe nominal ». Mesuré sur un atelier réel : « il y a persistante une
// lézarde » et « c'est frictionné un relais » — deux fautes, parce que « il y
// a » réclame un groupe nominal nu et que « c'est » ne prend pas d'attribut
// avant son sujet. « Il est court le temps de l'amour », si.
const TETES_DISLOCATION = ['il est', 'elle est', 'il reste', 'il demeure',
                           'il paraît', 'il semble', 'il devient', 'elle demeure']
const TETES_SYNTAGME = ['dans', 'sous', 'contre', 'depuis', 'derrière', 'entre',
                        'par-dessus', 'à même', 'vers', 'sans', 'au travers', 'auprès de']
/**
 * Le mot d'attelage, en évitant ceux qui viennent de servir.
 *
 * Il est tiré à chaque gabarit et n'avait aucune mémoire : « il reste » a
 * ouvert les vers 10 et 13 du même poème. C'est le même défaut que partout
 * ailleurs dans ce projet — un tirage sans garde revient sur ses pas.
 */
const auHasard = (v: string[], evites?: Set<string>): string => {
  const dispo = evites ? v.filter(x => !evites.has(x)) : v
  const pool = dispo.length ? dispo : v
  return pool[Math.floor(Math.random() * pool.length)]
}

const disloqueAdj = (evites?: Set<string>): RoleFragment => ({
  type: 'adjectif', consigne: tr('un adjectif qualificatif seul', 'a single descriptive adjective'),
  role: tr('DISLOCATION', 'DISLOCATION'), avant: auHasard(TETES_DISLOCATION, evites),
})
const syntagmeGN = (evites?: Set<string>): RoleFragment => ({
  type: 'groupe-nominal', consigne: tr('un groupe nominal', 'a noun phrase'),
  role: tr('SYNTAGME', 'PHRASE'), avant: auHasard(TETES_SYNTAGME, evites), nu: true,
})

// Le groupe nominal d'une subordonnée qu'on n'achève pas : « tandis que le
// carreau ». C'est exactement la forme de « Dans la totalité du monde ».
const GN_SUSPENDU: RoleFragment = {
  type: 'groupe-nominal', consigne: tr('un groupe nominal', 'a noun phrase'), role: tr('SUSPENS', 'SUSPENDED'),
  nu: true,
}
const GN_SUSPENDU_RICHE: RoleFragment = {
  type: 'groupe-nominal-riche', consigne: tr('un groupe nominal développé', 'a developed noun phrase'),
  role: tr('SUSPENS', 'SUSPENDED'),
}
// Le verbe transitif qu'on laisse sans complément : la phrase s'arrête sur
// une main tendue.
const VERBE_SUSPENDU: RoleFragment = {
  type: 'verbe-transitif', consigne: tr('un verbe transitif conjugué', 'a conjugated transitive verb'), role: tr('SUSPENS', 'SUSPENDED'),
}

const EST_OUTIL = (f: RoleFragment) =>
  f.type === 'conjonction-coord' || f.type === 'conjonction-subord'

// Un mot d'attelage en tête change ce sur quoi le VERS ouvre : « sous un
// trésor » commence par une préposition, pas par un groupe nominal, même si
// la case, elle, en est un.
const EST_GN = (f: RoleFragment) =>
  !f.avant && (f.type === 'groupe-nominal' || f.type === 'groupe-nominal-riche')

/**
 * `outilsPermis` : le vers a-t-il une voix qui parle ailleurs dans le poème ?
 *
 * Sinon on n'ouvre pas de case-outil du tout. Réserver les mots de liaison aux
 * voix qui reviennent ne suffisait pas : sur une table de 46 voix, trente-sept
 * ne prennent la parole qu'une fois, et sur près d'un vers sur deux toutes les
 * voix présentes sont dans ce cas — il n'y avait personne à qui confier le
 * « or ». Le gabarit lui-même s'efface donc.
 */
/**
 * Les formes qui ne finissent pas leur phrase.
 *
 * Mesuré sur un atelier de dix-sept vers : les quinze vers de voix étaient
 * quinze propositions complètes — sujet, verbe, complément, circonstanciel.
 * Aucun fragment, aucune reprise, aucun vers de deux mots. Les seuls vers qui
 * sonnaient humains étaient ceux du médium, et aucun des deux n'était une
 * proposition indépendante : « Il est beau le soleil couchant » est une
 * dislocation, « Dans la totalité du monde » une subordonnée qui pend.
 *
 * Le moteur savait faire de la syntaxe, pas de la parole.
 *
 * ── Pourquoi elles vont d'abord aux GRANDES tables ──────────────────────
 *
 * Le nombre de voix commande le nombre de cases, et toutes les formes à trois
 * voix et plus étaient des propositions complètes. Le poème à quarante-six
 * voix aurait donc été le plus CONTRAINT du recueil, pas le plus riche :
 * quarante-six phrases bien faites à la file. C'est l'inverse de ce qu'une
 * multitude devrait produire.
 *
 * L'énumération et la litanie règlent ça parce qu'elles sont les deux seules
 * formes qui GRANDISSENT avec le nombre de mains : cinq voix, cinq noms
 * juxtaposés. Une proposition, elle, ne peut pas grandir — elle ne peut que
 * s'alourdir de circonstanciels.
 */
const enumeration = (n: number): RoleFragment[] =>
  Array.from({ length: n }, (_, i) => (i === n - 1 ? GN_LISTE_FIN : GN_LISTE))

const litanie = (n: number): RoleFragment[] =>
  Array.from({ length: n }, (_, i) => (i === n - 1 ? INFINITIF_FIN : INFINITIF_LISTE))

/**
 * L'allongement des formes qui ne sont PAS des listes.
 *
 * Une apposition qui s'étend par des cases d'énumération se lit comme une
 * liste — et c'est bien ce qu'elle devient : le diagnostic de forme, qui va
 * chercher le premier rôle reconnu, la comptait en LISTE. La famille déclarée
 * et la famille lue divergeaient, et le plafond des listes ne s'appliquait
 * donc pas à la moitié d'entre elles.
 */
const appositions = (n: number): RoleFragment[] =>
  Array.from({ length: n }, (_, i) => (i === n - 1 ? GN_APPOSE : { ...GN_APPOSE, apres: ',' }))

export function gabaritsIncomplets(
  nVoix: number,
  /** Les mots d'attelage qui viennent de servir — « il reste » a ouvert deux
   *  vers du même poème faute de cette mémoire. */
  attelages?: Set<string>,
): { famille: Famille; cases: RoleFragment[] }[] {
  const L = (famille: Famille, cases: RoleFragment[]) => ({ famille, cases })
  if (nVoix <= 1) {
    return [
      L('MOT', [NOM_SEUL]),
      L('SYNTAGME', [syntagmeGN(attelages)]),                            // « au travers un trésor »
    ]
  }
  if (nVoix === 2) {
    return [
      L('DISLOCATION', [disloqueAdj(attelages), GN_SUJET]),              // « il est grand le silence »
      L('SYNTAGME', [syntagmeGN(attelages), ADJ_APPOSE]),                // « sous un trésor perdu »
      L('APPOSITION', [{ ...GN_APPOSE, apres: ',' }, GN_APPOSE]),
      L('SUSPENS', [GN_SUJET, VERBE_SUSPENDU]),                 // « la craie efface »
      L('SUSPENS', [CONJ_SUBORD, GN_SUSPENDU]),                 // « tandis que le carreau »
      L('LISTE', litanie(2)),
    ]
  }
  if (nVoix === 3) {
    return [
      L('DISLOCATION', [disloqueAdj(attelages), GN_SUJET, ADJ_APPOSE]),
      L('DISLOCATION', [disloqueAdj(attelages), { ...GN_SUJET, apres: ',' }, GN_APPOSE]),
      L('SYNTAGME', [syntagmeGN(attelages), { ...ADJ_APPOSE, apres: ',' }, GN_APPOSE]),
      L('APPOSITION', [GN_SUJET, { ...ADJ_APPOSE, apres: ',' }, GN_APPOSE]),
      L('SUSPENS', [CONJ_SUBORD, GN_SUSPENDU, ADJ_APPOSE]),
      L('SUSPENS', [ADVERBE_TETE, GN_SUJET, VERBE_SUSPENDU]),
      L('LISTE', enumeration(3)),
      L('LISTE', litanie(3)),
    ]
  }
  if (nVoix === 4) {
    return [
      L('DISLOCATION', [disloqueAdj(attelages), { ...GN_SUJET, apres: ',' }, GN_APPOSE, ADJ_APPOSE]),
      L('SYNTAGME', [syntagmeGN(attelages), { ...ADJ_APPOSE, apres: ',' }, GN_APPOSE, ADJ_APPOSE]),
      L('APPOSITION', [GN_SUJET, { ...ADJ_APPOSE, apres: ',' }, GN_APPOSE, ADJ_APPOSE]),
      L('SUSPENS', [CONJ_SUBORD, GN_SUSPENDU, { ...ADJ_APPOSE, apres: ',' }, GN_APPOSE]),
      L('SUSPENS', [ADVERBE_TETE, GN_SUJET, ADJECTIF, VERBE_SUSPENDU]),
      // Une suspension LARGE : sans elle, toutes les formes inachevées étaient
      // courtes et le souffle long ne pouvait venir que d'une proposition.
      L('SUSPENS', [CONJ_SUBORD, GN_SUSPENDU_RICHE, { ...ADJ_APPOSE, apres: ',' }, GN_APPOSE]),
      L('LISTE', enumeration(4)),
      L('LISTE', litanie(4)),
    ]
  }
  // Cinq voix et plus : les formes s'allongent par APPOSITION, jamais par
  // énumération — sans quoi la famille déclarée et la famille lue divergent,
  // et le plafond des listes ne s'applique plus à la moitié d'entre elles.
  return [
    L('DISLOCATION', [disloqueAdj(attelages), { ...GN_SUJET, apres: ',' }, ...appositions(nVoix - 3), ADJ_APPOSE]),
    L('SYNTAGME', [syntagmeGN(attelages), { ...ADJ_APPOSE, apres: ',' }, ...appositions(nVoix - 3), ADJ_APPOSE]),
    L('APPOSITION', [GN_SUJET, { ...ADJ_APPOSE, apres: ',' }, ...appositions(nVoix - 3), ADJ_APPOSE]),
    L('SUSPENS', [CONJ_SUBORD, GN_SUSPENDU, { ...ADJ_APPOSE, apres: ',' }, ...appositions(nVoix - 3)]),
    L('SUSPENS', [ADVERBE_TETE, ...appositions(nVoix - 3), ADJECTIF, VERBE_SUSPENDU]),
    L('LISTE', enumeration(nVoix)),
    L('LISTE', litanie(nVoix)),
  ].filter(g => g.cases.length === nVoix)
}

/**
 * La part des vers qu'on laisse inachevés.
 *
 * Elle lit DEUX choses, et il a fallu mesurer pour comprendre pourquoi.
 *
 * Le nombre de mains sur CE vers, d'abord : plus elles sont nombreuses, plus
 * le gabarit complet s'alourdit de circonstanciels, et plus l'inachevé
 * soulage.
 *
 * La taille de la TABLE ensuite, et c'est elle qu'on avait oubliée. Une
 * grande table n'entasse pas les voix sur un vers — elle allonge le poème.
 * Mesuré sur trois cents plans : 1,5 voix par vers à quatre convives, 2,3 à
 * quarante-six. Autrement dit, la monotonie d'une grande séance n'est pas
 * dans le vers, elle est à l'échelle du POÈME : trente vers bien construits
 * à la file. Seule la taille de la table peut la corriger, et c'est
 * exactement ce qu'on demandait.
 */
export function partIncomplete(nVoix: number, tailleTable = 1): number {
  const base = nVoix <= 1 ? 0.18
    : nVoix === 2 ? 0.22
      : nVoix === 3 ? 0.30
        : nVoix === 4 ? 0.42
          : 0.50
  const bonus = Math.min(0.20, Math.max(0, ((tailleTable - 6) / 40) * 0.20))
  return Math.min(0.62, base + bonus)
}

function tirerGabaritBrut(
  nVoix: number,
  souffles: Set<Classe> | undefined,
  attelages: Set<string> | undefined,
  questionPermise = true,
  outilsPermis = true,
  /** La garde d'ouverture réclame un vers qui ne commence pas par un groupe
   *  nominal — au-delà de trois à six vers nominaux d'affilée, l'oreille n'entend
   *  plus qu'un métronome. */
  ouvertureHorsGN = false,
  /** Le nombre de voix convoquées pour la séance entière — pas celles de ce
   *  vers-ci. C'est lui qui décide de la part inachevée du poème. */
  tailleTable = 1,
  /** Les familles de forme que la garde autorise encore. Sans elle, sept vers
   *  sur seize se retrouvaient être des listes. */
  permises?: Set<Famille>,
): RoleFragment[] {
  const filtrer = (v: RoleFragment[][]) => {
    let dispo = v
    if (!outilsPermis) {
      const sansOutil = dispo.filter(g => !g.some(EST_OUTIL))
      if (sansOutil.length) dispo = sansOutil
    }
    if (ouvertureHorsGN) {
      const autrement = dispo.filter(g => !EST_GN(g[0]))
      if (autrement.length) dispo = autrement
    }
    return dispo
  }
  // Les formes inachevées passent d'abord, et leur part monte avec la table.
  //
  // Quand la garde a retiré la PROPOSITION — trois phrases complètes se
  // suivaient déjà — le tirage n'est plus tiré : il est imposé. Sans cela la
  // garde ne servait à rien de ce côté-là, et la simulation montrait des
  // séries de quinze propositions d'affilée : elle pouvait interdire la
  // phrase complète, mais rien n'obligeait le sort à l'écouter.
  const inacheveImpose = permises !== undefined && !permises.has('PROPOSITION')
  if (inacheveImpose || Math.random() < partIncomplete(nVoix, tailleTable)) {
    // On tire la FAMILLE d'abord, avec ses poids, et la variante ensuite —
    // pas l'inverse. En tirant à plat dans le vivier, c'est le NOMBRE de
    // variantes qui décidait de la fréquence : deux variantes de liste sur
    // cinq ont donné sept listes sur seize vers. Le poids d'une famille ne
    // doit rien devoir à la quantité de formes qu'on lui a écrites.
    // Le tri se fait sur le vivier ENTIER, jamais variante par variante : le
    // filtre garde tout quand plus rien ne passe, et appliqué à une variante
    // seule ce repli laissait justement passer celle qu'il fallait exclure —
    // une case-outil interdite, une ouverture nominale que la garde refusait.
    // Et si rien ne survit, on ne force pas l'inachevé : on retombe sur les
    // formes complètes, qui ont leurs propres replis.
    const pool = gabaritsIncomplets(nVoix, attelages).filter(g => !permises || permises.has(g.famille))
    const cartes = new Map<RoleFragment[], Famille>(pool.map(g => [g.cases, g.famille] as const))
    const retenus = [...cartes.keys()].filter(c =>
      (outilsPermis || !c.some(EST_OUTIL)) && (!ouvertureHorsGN || !EST_GN(c[0])))

    const parFamille = new Map<Famille, RoleFragment[][]>()
    for (const c of retenus) {
      const f = cartes.get(c)!
      parFamille.set(f, [...(parFamille.get(f) ?? []), c])
    }
    const familles = [...parFamille.keys()]
    const total = familles.reduce((s, f) => s + POIDS_FAMILLE[f], 0)
    if (total > 0) {
      let t = Math.random() * total
      let choisie = familles[familles.length - 1]
      for (const f of familles) { t -= POIDS_FAMILLE[f]; if (t <= 0) { choisie = f; break } }
      const v = parFamille.get(choisie)!
      return v[Math.floor(Math.random() * v.length)]
    }
  }

  if (nVoix === 1) {
    // Une seule plume écrit le vers entier — rarement une question (l'interrogatif
    // épuisé devient un tic sur un poème long : budget géré par l'appelant), sinon
    // un vers libre de longueur tirée au sort (3 à 6 mots)
    if (questionPermise && Math.random() < 0.12) return [QUESTION]
    // Une voix seule écrit le vers entier : c'est le seul endroit où le
    // souffle long s'obtient sans compter des mains. On le lui demande.
    const long = souffles?.size === 1 && souffles.has('LONG')
    const mots = long ? 8 + Math.floor(Math.random() * 5) : 3 + Math.floor(Math.random() * 4)
    return [{ type: 'libre', consigne: tr('un vers', 'one line of verse'), role: tr('VERS ENTIER', 'FULL LINE'), mots }]
  }
  if (nVoix === 2) {
    const variantes: RoleFragment[][] = [
      [GN_SUJET, GROUPE_VERBAL],   // « le silence » + « traverse la nuit »
      [GN_SUJET, VERBE],           // « la lumière » + « tremble »
      [GN_SUJET, ADJECTIF],        // « une lumière » + « froide » — vers nominal
      [INFINITIF, GN_COMPLEMENT],  // « brûler » + « la cendre »
      [CONJ_COORD, GROUPE_VERBAL], // « mais » + « traverse la nuit » — ellipse sans sujet
    ]
    const dispo = filtrer(variantes)
    return dispo[Math.floor(Math.random() * dispo.length)]
  }
  if (nVoix === 4) {
    const variantes: RoleFragment[][] = [
      [GN_RICHE_SUJET, VERBE_TRANSITIF, GN_RICHE_COMPLEMENT, ADVERBE_FIN],
      [CONJ_SUBORD, GN_RICHE_SUJET, GROUPE_VERBAL, ADVERBE_FIN],
      [GERONDIF, GN_RICHE_SUJET, VERBE_TRANSITIF, GN_RICHE_COMPLEMENT],
      [GN_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_COMPLEMENT],      // « la lumière » « froide » « dévore » « la cendre »
      [ADVERBE_TETE, GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT],  // « doucement, » « le sel » « ronge » « la nuit »
      [GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT, ADVERBE_FIN],   // « le sel » « dévore » « la nuit » « lentement »
      [CONJ_SUBORD, GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT],   // « quand » « la cendre » « fissure » « le mur »
      [GERONDIF, GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT],      // « en tombant, » « la pluie » « creuse » « la pierre »
      [CONJ_COORD, GN_SUJET, ADJECTIF, GROUPE_VERBAL],           // « mais » « la lumière » « froide » « pèse sur le monde »
    ]
    const dispo = filtrer(variantes)
    return dispo[Math.floor(Math.random() * dispo.length)]
  }
  if (nVoix >= 5) {
    // Cinq voix sur un seul vers : la densité maximale de la table ronde.
    // Elle n'existe que parce que la couverture prime — toutes les voix
    // convoquées doivent parler, quitte à se serrer sur le même vers.
    const variantes: RoleFragment[][] = [
      [GN_RICHE_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_RICHE_COMPLEMENT, ADVERBE_FIN],
      [CONJ_SUBORD, GN_RICHE_SUJET, GROUPE_VERBAL, GN_RICHE_COMPLEMENT, ADVERBE_FIN],
      [GERONDIF, GN_RICHE_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_RICHE_COMPLEMENT],
      [GN_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_COMPLEMENT, ADVERBE_FIN],
      [ADVERBE_TETE, GN_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_COMPLEMENT],
      [CONJ_SUBORD, GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT, ADVERBE_FIN],
      [GERONDIF, GN_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_COMPLEMENT],
      [CONJ_COORD, GN_SUJET, ADJECTIF, VERBE_TRANSITIF, GN_COMPLEMENT],
    ]
    const dispo = filtrer(variantes)
    return dispo[Math.floor(Math.random() * dispo.length)]
  }
  const variantesTrois: RoleFragment[][] = [
    // Les trois premières sont les LARGES : sans elles, le vers de dix mots
    // n'existait pas. Elles restent minoritaires — c'est la garde métrique
    // qui va les chercher quand le poème n'a pas respiré depuis longtemps.
    [GN_RICHE_SUJET, VERBE_TRANSITIF, GN_RICHE_COMPLEMENT],
    [GN_RICHE_SUJET, GROUPE_VERBAL, ADVERBE_FIN],
    [GERONDIF, GN_RICHE_SUJET, GROUPE_VERBAL],
    [GN_SUJET, VERBE_TRANSITIF, GN_COMPLEMENT], // la phrase courte de Breton
    [GN_SUJET, ADJECTIF, GROUPE_VERBAL],    // « la lumière » + « froide » + « traverse la nuit »
    [ADVERBE_TETE, GN_SUJET, GROUPE_VERBAL], // « doucement, » + « la cendre » + « pèse sur le monde »
    [GN_SUJET, GROUPE_VERBAL, ADVERBE_FIN],  // « le sel » + « traverse la nuit » + « lentement »
    [GN_SUJET, VERBE, ADVERBE_FIN],          // « une écluse » + « chavire » + « sans bruit »
    [CONJ_COORD, GN_SUJET, GROUPE_VERBAL],   // « mais » + « la cendre » + « pèse sur le monde »
    [CONJ_COORD, GN_SUJET, VERBE],           // « car » + « la lumière » + « tremble »
    [CONJ_SUBORD, GN_SUJET, VERBE],          // « quand » + « le sel » + « chavire »
    [CONJ_SUBORD, GN_SUJET, GROUPE_VERBAL],  // « lorsque » + « la cendre » + « pèse sur le monde »
    [GERONDIF, GN_SUJET, VERBE],             // « en tombant, » + « la lumière » + « tremble »
  ]
  const dispoTrois = filtrer(variantesTrois)
  return dispoTrois[Math.floor(Math.random() * dispoTrois.length)]
}

/**
 * Le tirage, avec le souffle.
 *
 * La longueur ne se choisit pas case par case : elle est le produit du nombre
 * de cases par leur largeur, et on ne la connaît qu'une fois le gabarit tiré.
 * On tire donc, on mesure, et on retire si le souffle demandé n'y est pas.
 * Huit essais, pas plus — au-delà on rend ce qu'on a : mieux vaut un vers de
 * la mauvaise longueur qu'une boucle qui ne rend rien.
 */
export function tirerGabarit(
  nVoix: number,
  questionPermise = true,
  outilsPermis = true,
  ouvertureHorsGN = false,
  tailleTable = 1,
  permises?: Set<Famille>,
  /** Les souffles que la garde métrique autorise encore. Sans elle, zéro pour
   *  cent des vers atteignaient dix mots, à toutes les tailles de table. */
  souffles?: Set<Classe>,
  /** Les mots d'attelage récemment employés, à ne pas reprendre. */
  attelages?: Set<string>,
): RoleFragment[] {
  const brut = () =>
    tirerGabaritBrut(nVoix, souffles, attelages, questionPermise, outilsPermis, ouvertureHorsGN, tailleTable, permises)
  let g = brut()
  if (!souffles || souffles.size === 0) return g
  for (let i = 0; i < 8 && !souffles.has(classeDeLongueur(longueurEstimee(g))); i++) g = brut()
  return g
}

/**
 * Recale les cases d'un vers sur son texte corrigé.
 *
 * La correction d'accords s'applique au vers entier, après la séance : les
 * cases gardaient le fragment d'avant. Les coutures affichaient « la calotte
 * colationne » sous un vers qui disait « collationne », et « le traverse »
 * sous « le travers ». L'appareil critique mentait sur son propre texte.
 *
 * On redécoupe le vers corrigé selon le nombre de mots de chaque case. Si la
 * correction a changé ce compte, on n'invente rien : les cases d'origine sont
 * rendues telles quelles.
 */
export function recalerMains(mains: MainAtelier[], versCorrige: string): MainAtelier[] {
  const parCase = mains.map(m => m.texte.trim().split(/\s+/).filter(Boolean).length)
  const attendus = parCase.reduce((a, b) => a + b, 0)
  const mots = versCorrige.trim().split(/\s+/).filter(Boolean)
  if (!attendus || mots.length !== attendus) return mains
  let i = 0
  return mains.map((m, k) => {
    const part = mots.slice(i, i + parCase[k]).join(' ')
    i += parCase[k]
    return { ...m, texte: part }
  })
}

/**
 * Les mots interdits, DU PLUS RÉCENT AU PLUS ANCIEN.
 *
 * Le serveur ne garde que les soixante premiers de la liste. L'Atelier les
 * envoyait dans l'ordre du poème : sur trente-quatre vers, les mots récents —
 * dont l'écho qu'on vient de transmettre — étaient coupés avant d'arriver.
 * D'où « le virage glacé lève du couvain » suivi de « le couvain couvant » :
 * la voix suivante reprenait le mot entendu parce que rien ne le lui
 * interdisait. Le mode écrit inversait déjà sa liste ; l'Atelier avait été
 * oublié.
 *
 * L'écho passe en tête : c'est le mot qu'il est le plus tentant de recopier,
 * et le seul qu'on ait délibérément mis dans l'oreille de la voix.
 *
 * Les conjonctions courtes le suivent immédiatement, et c'est la deuxième
 * moitié de la même leçon : elles étaient en QUEUE de liste, donc coupées dès
 * le vingtième vers. Mesuré sur un atelier de trente-cinq vers : « or » ouvrait
 * les vers 7, 23 et 28. Elles sont cinq au maximum, ce sont les mots les plus
 * exposés à la répétition, et ils sont invisibles au filtre des mots longs.
 */
export function motsInterdits(opts: {
  echo?: string
  enCours?: string
  vers: { texte: string }[]
  conjCourtes: string[]
}): string[] {
  const mots = (t: string) => (t.toLowerCase().match(/[a-zà-ÿ]+/gi) ?? []).filter(m => m.length > 2)
  return [
    ...(opts.echo ? mots(opts.echo) : []),
    ...opts.conjCourtes,
    ...(opts.enCours ? mots(opts.enCours) : []),
    ...[...opts.vers].reverse().flatMap(v => mots(v.texte)),
  ]
}

// Signature d'un gabarit — pour ne jamais tirer deux fois de suite la même forme
function signatureGabarit(g: RoleFragment[]): string {
  // Le rôle entre dans la signature : une énumération de trois groupes
  // nominaux et une proposition « sujet + verbe + complément » ne partagent pas
  // leurs types, mais une énumération et une apposition, si.
  return g.map(f => `${f.type}:${f.role}:${f.mots ?? ''}`).join('|')
}

// Dernier mot d'un vers, dépouillé de sa ponctuation — la seule trace transmise en écho
function dernierMot(texte: string): string | undefined {
  return texte.trim().split(/\s+/).at(-1)?.replace(/^[«"(]+|[»".,;:!?…)]+$/g, '')
}

// Réserve locale par rôle si l'API est injoignable — le poème ne s'arrête jamais
const RESERVE_FR: Record<string, string[]> = {
  // Toutes les familles de déterminant, sinon une panne de réseau ramène la
  // litanie de « le » que la stratégie sert justement à défaire.
  'groupe-nominal': ['le silence', "l'ombre", 'une cendre', 'la nuit', 'un souffle', 'la pierre', 'le givre', 'une porte',
                     'la rouille', 'un seuil', "l'écume", 'le lierre', 'une aiguille', 'le limon',
                     'ce seuil', 'cette faille', 'cet écart', 'ce lierre',
                     'du sable', 'de la suie', "de l'ambre", 'du sel',
                     'mon ombre', 'sa cendre', 'ton silence', 'son givre',
                     'chaque fêlure', 'nulle issue', 'aucun seuil', 'toute la suie',
                     'poussière', 'rouille', 'cendre', 'brume'],
  // Le vers d'un seul mot tire ici : sans cette entrée, la réserve retombait
  // sur celle des vers entiers et rendait une phrase là où on attendait un mot.
  'nom': ['cendre', 'seuil', 'givre', 'rouille', 'limon', 'écume', 'suie', 'lierre',
          'brume', 'poussière', 'sel', 'craie', 'ardoise', 'fêlure'],
  'verbe': ['tremble', 'dévore', 'veille', 'chavire', 'demeure', 'glisse', 'rôde', 'vacille',
            'affleure', 'se penche', 'consent', 'recule'],
  'verbe-transitif': ['dévore', 'effleure', 'avale', 'fissure', 'traverse', 'ronge',
                      'soulève', 'recoud', 'berce', 'creuse', 'apprivoise', 'engloutit'],
  'groupe-verbal': ['traverse la nuit', 'brûle en silence', 'tombe sans bruit', 'pèse sur le monde', "glisse dans l'ombre",
                    'compte les heures', 'retient son souffle', 'efface les seuils'],
  'adjectif': ['pâle', 'sourd', 'creux', 'nocturne', 'amer', 'froid', 'opaque', 'muet', 'fendu', 'tiède'],
  'adverbe': ['sans bruit', 'doucement', 'à jamais', 'ailleurs', 'en silence', 'à rebours', 'de biais'],
  'proposition': ['Que reste-t-il encore ?', 'Où vont les ombres ?', 'Qui veille encore ?', "Jusqu'où va le vide ?"],
  'libre': ["l'ombre se souvient", 'la nuit garde tout', 'le sel des heures', 'une porte respire', 'le vent du nord demeure',
            'quelque chose consent', "l'eau noire patiente"],
  'conjonction-coord': ['mais', 'car', 'or', 'pourtant', 'cependant', 'donc'],
  'conjonction-subord': ['quand', 'si', 'comme', 'lorsque', 'dès que', 'tandis que'],
  'infinitif': ['brûler', 'attendre', 'traverser', 'descendre', 'effacer', 'tenir', 'sentir', 'glisser'],
  'gérondif': ['en tombant', 'en glissant', 'en brûlant', 'en tremblant', 'en dormant', 'en cherchant'],
}
const RESERVE_EN: Record<string, string[]> = {
  'groupe-nominal': ['the silence', 'the shadow', 'an ember', 'the night', 'a breath', 'the stone', 'the frost', 'a door',
                     'the rust', 'a threshold', 'the foam', 'the ivy', 'a needle', 'the silt',
                     'this threshold', 'that rift', 'this ivy',
                     'some soot', 'some amber', 'some salt',
                     'my shadow', 'its ash', 'your silence',
                     'each crack', 'no way out', 'every seam',
                     'dust', 'rust', 'ash', 'fog'],
  'nom': ['ash', 'threshold', 'frost', 'rust', 'silt', 'foam', 'soot', 'ivy',
          'fog', 'dust', 'salt', 'chalk', 'slate', 'crack'],
  'verbe': ['trembles', 'devours', 'keeps watch', 'capsizes', 'remains', 'glides', 'prowls', 'wavers',
            'surfaces', 'leans over', 'consents', 'recoils'],
  'verbe-transitif': ['devours', 'grazes', 'swallows', 'cracks', 'crosses', 'gnaws',
                      'lifts', 'mends', 'cradles', 'hollows', 'tames', 'engulfs'],
  'groupe-verbal': ['crosses the night', 'burns in silence', 'falls without a sound', 'weighs on the world', 'slips into the shadow',
                    'counts the hours', 'holds its breath', 'erases the thresholds'],
  'adjectif': ['pale', 'muffled', 'hollow', 'nocturnal', 'bitter', 'cold', 'opaque', 'mute', 'cracked', 'lukewarm'],
  'adverbe': ['without a sound', 'gently', 'forever', 'elsewhere', 'in silence', 'backwards', 'sideways'],
  'proposition': ['What still remains?', 'Where do the shadows go?', 'Who keeps watch?', 'How far does the void go?'],
  'libre': ['the shadow remembers', 'the night keeps everything', 'the salt of the hours', 'a door breathes', 'the north wind remains',
            'something consents', 'the black water waits'],
  'conjonction-coord': ['but', 'for', 'yet', 'however', 'and yet', 'so'],
  'conjonction-subord': ['when', 'if', 'as', 'while', 'as soon as', 'whereas'],
  'infinitif': ['to burn', 'to wait', 'to cross', 'to descend', 'to erase', 'to hold', 'to feel', 'to glide'],
  'gérondif': ['falling', 'gliding', 'burning', 'trembling', 'sleeping', 'searching'],
}
const RESERVE: Record<string, string[]> = langueActuelle() === 'en' ? RESERVE_EN : RESERVE_FR

/**
 * La stratégie de déterminant d'une case — ou rien du tout.
 *
 * On n'envoie qu'une CLÉ : c'est le serveur qui la met en mots
 * (`api/_determinants.ts`). Une phrase venue du navigateur entrerait telle
 * quelle dans le prompt système.
 */
export function determinantDeCase(
  type: string,
  voixId: string,
  interdites?: Set<string>,
  horsGN = false,
  /** Le nom nu est-il recevable à cette place ? Faux par défaut : seul le
   *  groupe SUJET le porte (voir GN_SUJET). */
  nuPermis = false,
): string | undefined {
  if (TYPES_A_DETERMINANT.has(type)) {
    const exclure = new Set(interdites ?? [])
    // Le groupe nominal RICHE porte un adjectif ou un complément : sa contrainte
    // exige un déterminant, et le nom nu s'y contredirait.
    if (type === 'groupe-nominal-riche' || !nuPermis) exclure.add('ZERO')
    return tirerStrategie(voixId, exclure)
  }
  // Le vers entier est écrit d'un seul tenant : on ne peut pas lui imposer un
  // déterminant sans lui imposer d'ouvrir sur un groupe nominal, ce qui serait
  // la monotonie inverse. On ne lui demande donc que de ne pas en ouvrir un.
  if (type === 'libre' && horsGN) return HORS_GN
  return undefined
}

/**
 * Le tireur de déterminants d'UN vers.
 *
 * La garde d'ouverture ne surveillait que la tête du vers. À l'intérieur,
 * rien : « la cendre traverse la nuit » a deux articles définis, et une
 * énumération de cinq groupes nominaux pouvait en aligner cinq. On garde donc
 * la famille de la case précédente et on l'écarte de la suivante.
 */
function tireurDeVers(famillesEnTete: Set<string>) {
  let precedente: string | undefined
  return (r: RoleFragment, voixId: string, premiere: boolean, horsGN: boolean) => {
    const exclure = new Set<string>(premiere ? famillesEnTete : [])
    if (precedente) exclure.add(precedente)
    const d = determinantDeCase(r.type, voixId, exclure, premiere && horsGN, r.nu === true)
    if (d && FAMILLE[d]) precedente = FAMILLE[d]
    return d
  }
}

/** La réserve locale, elle aussi tenue à la stratégie demandée. */
export function piocherReserve(type: string, determinant?: string): string {
  const pool = RESERVE[type] ?? RESERVE['libre']
  const famille = determinant ? FAMILLE[determinant] : undefined
  const conformes = famille ? pool.filter(m => familleDe(m) === famille) : []
  const source = conformes.length ? conformes : pool
  return source[Math.floor(Math.random() * source.length)]
}

/**
 * La minuscule d'attaque des vers de voix.
 *
 * Les fragments cousus après le premier étaient déjà mis en minuscule — un seul
 * fil. Mais le premier gardait ce que le modèle avait envoyé, et le modèle
 * capitalise ce qu'il rend comme une phrase entière. Sur trente-cinq vers, cinq
 * portaient une majuscule et trente non : « Le registre demeure clos » au-dessus
 * de « le rochet macère ». Les vers du médium, eux, gardent sa frappe — c'est
 * la sienne.
 */
function enMinuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1)
}

const CLE_BROUILLON = 'atelier-en-cours'

const attendre = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// Masque un vers : la forme des mots sans le texte (traits proportionnels)
function masquer(texte: string): string {
  return texte
    .split(/\s+/)
    .map(w => '─'.repeat(Math.max(2, Math.min(8, Math.round(w.length * 0.75)))))
    .join(' ')
}

export default function JeuAtelier() {
  const navigate = useNavigate()
  const location = useLocation()
  const seance = useReve()
  const { jouer } = useSound()

  // Plan : depuis la navigation, sinon depuis le brouillon (rechargement de page)
  const [plan] = useState<PlanAtelier | null>(() => {
    const fromState = (location.state as { plan?: PlanAtelier } | null)?.plan
    if (fromState) return fromState
    try {
      const saved = localStorage.getItem(CLE_BROUILLON)
      if (saved) return (JSON.parse(saved) as { plan: PlanAtelier }).plan
    } catch { /* ignore */ }
    return null
  })

  const [vers, setVers] = useState<VersAtelier[]>(() => {
    const fromState = (location.state as { plan?: PlanAtelier } | null)?.plan
    if (fromState) return []   // nouvelle séance — on repart de zéro
    try {
      const saved = localStorage.getItem(CLE_BROUILLON)
      if (saved) return (JSON.parse(saved) as { vers: VersAtelier[] }).vers ?? []
    } catch { /* ignore */ }
    return []
  })
  const versRef = useRef<VersAtelier[]>(vers)
  versRef.current = vers

  // La garde d'ouverture : pas deux fois la même famille de déterminant de
  // suite, et pas plus de trois à six vers nominaux d'affilée. Elle reprend
  // l'histoire du brouillon rouvert — sinon une séance reprise au vingtième
  // vers repartirait avec une mémoire vide.
  const [garde] = useState(() => new GardeOuverture({
    histoire: diagnostic(vers.map(v => v.texte)).familles,
  }))

  // La garde des FORMES : pas deux listes de suite, pas plus d'un vers sur
  // huit en liste. Sans elle, sept vers sur seize en étaient — le métronome
  // de la proposition complète avait été remplacé par un métronome plus
  // pauvre encore. Elle reprend l'histoire d'un brouillon rouvert.
  const [gardeFormes] = useState(() => new GardeFormes(
    plan?.totalVers ?? 20,
    vers.map(v => familleDuVers((v.mains ?? []).map(m => m.role))),
  ))

  // La garde du SOUFFLE : pas plus de deux ou trois vers de la même longueur
  // d'affilée, et un vers long réclamé tous les quatre à huit vers. Mesuré
  // avant elle : zéro pour cent des vers atteignaient dix mots, et jusqu'à
  // huit vers de suite avaient exactement la même taille.
  const [gardeMetrique] = useState(() => new GardeMetrique({
    histoire: diagnosticMetrique(vers.map(v => v.texte)).classes,
  }))

  // Les deux derniers mots d'attelage employés — « il reste », « à même ».
  // Ils sont cousus par le gabarit, personne ne les écrit, et rien ne les
  // empêchait de revenir : « il reste » a ouvert les vers 10 et 13 du même
  // poème.
  const attelages = useRef<string[]>([])

  // La garde du LEXIQUE : au plus une case par vers puise dans le métier de sa
  // voix, et près d'un vers sur deux n'y a pas droit du tout. Mesuré avant
  // elle, sur un atelier de vingt-quatre vers dont les trois autres axes
  // étaient réglés : 45 % de mots hors vocabulaire courant, et ZÉRO vers sur
  // vingt-deux sans un seul. Le cadran de technicité existait, mais il tirait
  // par CASE — or c'est le vers qu'on lit.
  const [gardeLexique] = useState(() => new GardeLexique())

  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  // Le niveau de validation vient des Réglages, comme dans le cadavre écrit.
  // L'Atelier ne le lisait pas : un vers cassé y passait sans un mot, et le
  // médium pouvait poser une proposition entière dans une case qui attendait
  // un groupe nominal — d'où « Le garçon se couche tient du vide ».
  const niveauValidation = (localStorage.getItem('validation-niveau') as NiveauValidation) ?? 'souple'
  const [voixEnCours, setVoixEnCours] = useState<VoixEnCours[]>([])
  const traites = useRef<Set<number>>(new Set())
  const traiteFragment = useRef<Set<number>>(new Set())
  const sauvegardeFaite = useRef(false)
  const dernierGabarit = useRef('')
  const fragNomsRef = useRef<string[]>([])
  const fragMainsRef = useRef<(MainAtelier | null)[]>([])

  // État pour les tours fragment du médium (verse co-écrit avec des voix IA)
  const [fragGabarit, setFragGabarit] = useState<RoleFragment[] | null>(null)
  const [fragSlotJoueur, setFragSlotJoueur] = useState(0)
  const [fragVoixIndices, setFragVoixIndices] = useState<number[]>([])
  const [fragTextes, setFragTextes] = useState<(string | null)[]>([])

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'
  const colorLabel = c?.name.toUpperCase() ?? ''

  const idx = vers.length
  const total = plan?.totalVers ?? 0
  const termine = plan !== null && idx >= total
  const tourJoueur = plan !== null && !termine && plan.toursJoueur.includes(idx)
  // toursFragmentJoueur peut être absent des vieux brouillons sauvegardés → ?? []
  const tourFragmentJoueur = tourJoueur && (plan?.toursFragmentJoueur ?? []).includes(idx)

  // Pas de plan (accès direct à l'URL) → retour à la configuration
  useEffect(() => {
    if (!plan) navigate('/atelier', { replace: true })
  }, [plan, navigate])

  // Brouillon : la séance survit à un rechargement
  useEffect(() => {
    if (!plan || termine) return
    try { localStorage.setItem(CLE_BROUILLON, JSON.stringify({ plan, vers })) } catch { /* ignore */ }
  }, [plan, vers, termine])

  function ajouterVers(v: VersAtelier) {
    // On enregistre ce qui est SORTI, pas ce qui avait été demandé : la voix
    // ne suit pas toujours la stratégie, et la réserve locale ne la connaît
    // même pas. La garde doit compter le poème réel.
    garde.enregistrer(familleDe(v.texte))
    gardeFormes.enregistrer(familleDuVers((v.mains ?? []).map(m => m.role)))
    // Le souffle se compte sur le vers RENDU, pas sur celui qui avait été
    // demandé : une case peut déborder ou repartir en réserve.
    gardeMetrique.enregistrer(classeDeLongueur(motsDuVers(v.texte)))
    setVers(prev => [...prev, v])
  }

  // ── Tour des voix : 1 à 3 voix se partagent le vers, chacune dans une case
  // grammaticale tirée au sort — le principe du cadavre écrit ──
  useEffect(() => {
    if (!plan || termine || tourJoueur) return   // tourFragmentJoueur ⊂ tourJoueur — couvert ici
    if (traites.current.has(idx)) return
    traites.current.add(idx)
    jouer('ia')

    let annule = false

    async function ecrireVersIA() {
      const p = plan!
      // Les voix de ce vers ont été réparties au tirage du plan, en rotation :
      // c'est ce qui garantit que les 46 convoquées parlent toutes. Le repli
      // couvre les brouillons ouverts avant cette bascule.
      const assignees = p.voixParVers?.[idx]
      const indices = assignees ?? p.voixPool.map((_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(1 + Math.floor(Math.random() * 3), p.voixPool.length))
      const nVoix = indices.length
      // L'interrogatif est plafonné : une question par poème (deux au-delà de XX vers)
      // — sans budget, les « Qui pleure sous la craie ? » s'accumulent en tic
      const questionsOk = versRef.current.filter(v => v.texte.includes('?')).length
        < Math.max(1, Math.floor(p.totalVers / 10))
      // Une case-outil ne s'ouvre que si une voix du vers parle ailleurs dans
      // le poème : personne ne dépense son unique prise de parole sur « or ».
      const mult = multiplicitesVoix(p)
      const outilsOk = indices.some(v => (mult[v] ?? 0) > 1)

      // Ce que la garde d'ouverture réclame pour ce vers-ci.
      const famillesInterdites = garde.famillesInterdites()
      const horsGN = garde.exigeOuvertureHorsGN()

      // Jamais deux fois de suite la même forme — la métrique respire
      const table = p.voixPool.length
      const formesOk = gardeFormes.permises()
      const soufflesOk = gardeMetrique.permises(GardeMetrique.peutEtreLong(nVoix))
      const evites = new Set(attelages.current.slice(-2))
      let gabarit = tirerGabarit(nVoix, questionsOk, outilsOk, horsGN, table, formesOk, soufflesOk, evites)
      for (let essai = 0; essai < 5 && signatureGabarit(gabarit) === dernierGabarit.current; essai++) {
        gabarit = tirerGabarit(nVoix, questionsOk, outilsOk, horsGN, table, formesOk, soufflesOk, evites)
      }
      dernierGabarit.current = signatureGabarit(gabarit)
      if (gabarit[0].avant) attelages.current.push(gabarit[0].avant)

      // Et quand elle s'ouvre, elle revient à l'une de ces voix-là.
      const ordre = placerVoix(indices, gabarit.map(g => g.type), mult)
      setVoixEnCours(ordre.map((vi, k) => ({ num: vi + 1, role: gabarit[k].role, fait: false })))

      // L'écho au dernier mot : seule la dernière trace du vers précédent est
      // transmise — assez pour un raccord, pas assez pour imposer un thème.
      // La voix décide librement d'y rebondir ou de l'ignorer.
      const precedent = versRef.current[idx - 1]?.texte
      const echo = precedent ? dernierMot(precedent) : undefined
      const contexte = p.echo && echo ? echo : undefined

      const tirer = tireurDeVers(famillesInterdites)
      gardeLexique.ouvrirVers()
      const fragments: string[] = []
      const nomsVoix: string[] = []
      const mains: MainAtelier[] = []
      // Conjonctions courtes (≤2 lettres) : "en" (gérondif), "or", "si", "et", "ni"
      // échappent au filtre > 2 chars. Calculé avant la boucle : versRef est stable
      // entre itérations, inutile de refaire le scan à chaque fragment.
      const CONJ_COURTES = langueActuelle() === 'en' ? new Set(['or', 'if', 'as', 'so']) : new Set(['or', 'si', 'en', 'et', 'ni'])
      const conjCourtesUsees = versRef.current.flatMap(v => {
        const m = v.texte.trim().toLowerCase().match(/^[a-zà-ÿ]+/)
        return m && CONJ_COURTES.has(m[0]) ? [m[0]] : []
      })
      for (let k = 0; k < ordre.length; k++) {
        if (annule) return
        const caseRole = gabarit[k]
        const enCours = fragments.join(' ')
        const eviter = motsInterdits({
          echo: contexte, enCours, vers: versRef.current, conjCourtes: conjCourtesUsees,
        })

        // Le déterminant se tire dans l'idiolecte de la voix qui parle —
        // le boucher part du partitif, l'enfant du possessif, le
        // télégraphiste du nom nu. En tête, la garde retire la famille qui
        // vient de servir deux fois ; à l'intérieur, le tireur écarte celle
        // de la case d'avant.
        const determinant = tirer(caseRole, p.voixPool[ordre[k]], k === 0, horsGN)
        // Le quota se dépense dans l'ordre des cases : la première voix dont
        // la technicité mord prend le mot de métier du vers, les suivantes
        // parlent de leur vie.
        const metier = gardeLexique.auMetier(technicite(p.voixPool[ordre[k]]))

        const requete = {
          consigne: caseRole.consigne,
          type: caseRole.type,
          voiceId: p.voixPool[ordre[k]],
          contexte,
          eviter,
          metier,
          ...(caseRole.mots ? { mots: caseRole.mots } : {}),
          ...(determinant ? { determinant } : {}),
        }
        let texte = ''
        let nomCase: string | undefined
        let deLaReserve = false
        try {
          const [reponse] = await Promise.all([
            // Une reprise avant la réserve locale — les lignes en conserve se reconnaissent
            demanderFragmentIA(requete).catch(async () => { await attendre(800); return demanderFragmentIA(requete) }),
            attendre(650 + Math.random() * 450),   // respiration théâtrale minimale par voix
          ])
          texte = reponse.texte.trim()
          // Le serveur sert lui aussi des mots en conserve quand l'appel à
          // Claude échoue : `source` est la seule chose qui les trahisse.
          deLaReserve = reponse.source === 'fallback'
          // Le serveur renvoie l'identifiant brut (« geologue ») : les coutures
          // affichaient ça au lieu du nom (« Le géologue »).
          nomCase = deLaReserve || !reponse.voixNom
            ? undefined
            : nomDeVoix(reponse.voixNom, langueActuelle())
          if (texte && nomCase) nomsVoix.push(nomCase)
        } catch { /* réserve locale */ }
        if (!texte) {
          deLaReserve = true
          nomCase = undefined
          texte = piocherReserve(caseRole.type, determinant)
        }
        // Les questions retrouvent leur point d'interrogation (le serveur coupe la ponctuation finale)
        if (caseRole.type === 'proposition' && !/[?!.]\s*$/.test(texte)) texte += langueActuelle() === 'en' ? '?' : ' ?'

        // Tous les fragments de voix se cousent en minuscule — un seul fil,
        // celui d'attaque compris.
        // Le mot d'attelage — « il est », « au travers » — n'est écrit par
        // personne : il tient la forme. Il entre dans le texte de la case pour
        // que les coutures restent alignées sur le vers.
        const cousu = (caseRole.avant ? `${caseRole.avant} ` : '') + enMinuscule(texte)
        fragments.push(cousu + (caseRole.apres ?? ''))
        mains.push({ role: caseRole.role, texte: cousu, voixNom: nomCase, reserve: deLaReserve || undefined })
        if (annule) return
        setVoixEnCours(prev => prev.map((v, j) => j === k ? { ...v, fait: true } : v))
      }

      await attendre(500)
      if (annule) return
      setVoixEnCours([])
      ajouterVers({
        // `souder` recolle ce que la couture sépare : « sitôt qu' une faille »
        // devient « sitôt qu'une faille ».
        texte: souder(fragments.join(' ')),
        auteur: 'ia',
        voixNums: ordre.map(i => i + 1),
        voixNoms: nomsVoix,
        mains,
      })
    }

    ecrireVersIA()
    return () => { annule = true }
  }, [idx, plan, termine, tourJoueur]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tour fragment : le médium remplit un slot, les voix remplissent les autres ──
  // Le gabarit est tiré, un slot est assigné au médium, les voix IA cherchent
  // leurs fragments en parallèle pendant que le médium tape le sien.
  useEffect(() => {
    if (!plan || termine || !tourFragmentJoueur) return
    if (traiteFragment.current.has(idx)) return
    traiteFragment.current.add(idx)
    jouer('ia')

    let annule = false

    async function initFragment() {
      const p = plan!
      // Le médium écrit surtout des FRAGMENTS cousus avec les voix : le vers
      // entier en solitaire devient l'exception (12 %) — c'est la couture
      // aveugle qui fait l'atelier, pas l'écriture en solo.
      // Comme pour les vers IA : la répartition vient du plan. Le tirage du
      // solo (le médium seul sur son vers) y a été déplacé — un vers sans voix
      // assignée est un vers qu'il tient seul.
      const assignees = p.voixParVers?.[idx]
      const r = Math.random()
      const aiDuPlan = assignees ?? p.voixPool.map((_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(r < 0.12 ? 0 : r < 0.56 ? 1 : 2, p.voixPool.length))
      const nAI = aiDuPlan.length
      const nTotal = nAI + 1
      // Le budget interrogatif s'applique aussi à la plume du médium
      const questionsOk = versRef.current.filter(v => v.texte.includes('?')).length
        < Math.max(1, Math.floor(p.totalVers / 10))
      const mult = multiplicitesVoix(p)
      const outilsOk = aiDuPlan.some(v => (mult[v] ?? 0) > 1)
      const famillesInterdites = garde.famillesInterdites()
      const horsGN = garde.exigeOuvertureHorsGN()
      const table = p.voixPool.length
      const formesOk = gardeFormes.permises()
      const soufflesOk = gardeMetrique.permises(GardeMetrique.peutEtreLong(nTotal))
      const evites = new Set(attelages.current.slice(-2))
      let gabarit = tirerGabarit(nTotal, questionsOk, outilsOk, horsGN, table, formesOk, soufflesOk, evites)
      for (let essai = 0; essai < 5 && signatureGabarit(gabarit) === dernierGabarit.current; essai++) {
        gabarit = tirerGabarit(nTotal, questionsOk, outilsOk, horsGN, table, formesOk, soufflesOk, evites)
      }
      dernierGabarit.current = signatureGabarit(gabarit)
      if (gabarit[0].avant) attelages.current.push(gabarit[0].avant)

      const slotJoueur = Math.floor(Math.random() * gabarit.length)
      // Même règle que sur les vers de voix, en sautant la case du médium.
      const casesIA = gabarit.map((g, i) => ({ type: g.type, i })).filter(c => c.i !== slotJoueur)
      const aiIndices = placerVoix(aiDuPlan, casesIA.map(c => c.type), mult)

      setFragGabarit(gabarit)
      setFragSlotJoueur(slotJoueur)
      setFragVoixIndices(aiIndices)
      setFragTextes(new Array(gabarit.length).fill(null))

      // Voix IA affichées comme en cours (hors slot médium)
      let aiCounter = 0
      setVoixEnCours(
        gabarit
          .map((role, k) => k !== slotJoueur
            ? { num: aiIndices[aiCounter++] + 1, role: role.role, fait: false }
            : null)
          .filter(Boolean) as VoixEnCours[]
      )

      // Eviter — calculé une fois, partagé par tous les fetches parallèles
      const CONJ_COURTES_F = langueActuelle() === 'en' ? new Set(['or', 'if', 'as', 'so']) : new Set(['or', 'si', 'en', 'et', 'ni'])
      const conjCourtesUsees = versRef.current.flatMap(v => {
        const m = v.texte.trim().toLowerCase().match(/^[a-zà-ÿ]+/)
        return m && CONJ_COURTES_F.has(m[0]) ? [m[0]] : []
      })
      const nomsFragment: string[] = []
      // Une entrée par case du gabarit : la case du médium reste vide, les
      // autres reçoivent leur persona — ou le drapeau réserve.
      const mainsFragment: (MainAtelier | null)[] = new Array(gabarit.length).fill(null)
      fragMainsRef.current = mainsFragment
      const echoVers = versRef.current[idx - 1]?.texte
      const echoMot = echoVers ? dernierMot(echoVers) : undefined
      const contexte = p.echo && echoMot ? echoMot : undefined
      const eviterBase = motsInterdits({
        echo: contexte, vers: versRef.current, conjCourtes: conjCourtesUsees,
      })

      // Slots IA numérotés pour mise à jour de voixEnCours
      const aiSlots: { k: number; aiIdx: number }[] = []
      let c = 0
      for (let k = 0; k < gabarit.length; k++) {
        if (k !== slotJoueur) aiSlots.push({ k, aiIdx: c++ })
      }

      // Les stratégies se tirent AVANT les appels : le tireur garde la mémoire
      // du vers, et les appels partent en parallèle — ils ne peuvent donc pas
      // se la transmettre. On parcourt le gabarit dans l'ordre, case du médium
      // comprise (elle n'a pas de déterminant, mais elle occupe une place).
      const tirer = tireurDeVers(famillesInterdites)
      gardeLexique.ouvrirVers()
      const determinants: (string | undefined)[] = []
      const metiers: boolean[] = []
      for (let k = 0; k < gabarit.length; k++) {
        if (k === slotJoueur) { determinants.push(undefined); metiers.push(false); continue }
        const localIdx = aiSlots.findIndex(a => a.k === k)
        const voixId = p.voixPool[aiIndices[localIdx]]
        determinants.push(tirer(gabarit[k], voixId, k === 0, horsGN))
        metiers.push(gardeLexique.auMetier(technicite(voixId)))
      }

      // Fetch en parallèle — le médium tape pendant que les voix cherchent
      await Promise.all(aiSlots.map(async ({ k, aiIdx: localIdx }) => {
        if (annule) return
        const role = gabarit[k]
        const determinant = determinants[k]
        const requete = {
          consigne: role.consigne,
          type: role.type,
          voiceId: p.voixPool[aiIndices[localIdx]],
          contexte,
          eviter: eviterBase,
          metier: metiers[k],
          ...(determinant ? { determinant } : {}),
        }
        let texte = ''
        let nomCase: string | undefined
        let deLaReserve = false
        try {
          const [reponse] = await Promise.all([
            demanderFragmentIA(requete).catch(async () => { await attendre(800); return demanderFragmentIA(requete) }),
            attendre(400 + Math.random() * 400),
          ])
          texte = reponse.texte.trim()
          deLaReserve = reponse.source === 'fallback'
          nomCase = deLaReserve || !reponse.voixNom
            ? undefined
            : nomDeVoix(reponse.voixNom, langueActuelle())
          if (texte && nomCase) nomsFragment.push(nomCase)
        } catch { /* réserve locale */ }
        if (!texte) {
          deLaReserve = true
          nomCase = undefined
          texte = piocherReserve(role.type, determinant)
        }
        mainsFragment[k] = { role: role.role, texte, voixNom: nomCase, reserve: deLaReserve || undefined }
        if (role.type === 'proposition' && !/[?!.]\s*$/.test(texte)) texte += langueActuelle() === 'en' ? '?' : ' ?'
        if (annule) return
        setFragTextes(prev => { const next = [...prev]; if (next.length > k) next[k] = texte; return next })
        setVoixEnCours(prev => prev.map((v, i) => i === localIdx ? { ...v, fait: true } : v))
      }))
      fragNomsRef.current = nomsFragment
    }

    initFragment()
    return () => { annule = true }
  }, [idx, plan, termine, tourFragmentJoueur]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Assemblage fragment : quand tous les slots sont remplis (médium + voix) ──
  useEffect(() => {
    if (!fragGabarit || fragTextes.length === 0) return
    if (fragTextes.some(t => t === null)) return

    // Le fragment tel qu'il entre dans le vers — mot d'attelage compris,
    // minuscule appliquée. Les coutures doivent montrer CELUI-LÀ.
    const cousus = fragGabarit.map((role, k) => {
      const t = fragTextes[k] as string
      // La case du médium en tête de vers garde sa frappe ; celle d'une voix,
      // non — c'est le même fil que partout ailleurs.
      const nu = k === 0 && k === fragSlotJoueur ? t : enMinuscule(t)
      return (role.avant ? `${role.avant} ` : '') + nu
    })
    const coutures = fragGabarit.map((role, k) => cousus[k] + (role.apres ?? ''))
    const texte = souder(coutures.join(' '))
    const voixNums = fragVoixIndices.map(i => i + 1)

    // Le détail case par case : celles des voix ont été notées pendant les
    // fetches, celle du médium se remplit ici — c'est la seule qui manque.
    // Le texte vient TOUJOURS d'ici, jamais de ce qui a été noté pendant le
    // fetch : là-bas c'est la sortie brute du modèle, sans minuscule et sans
    // mot d'attelage. Les coutures affichaient donc « le mordant » sous un
    // vers qui disait « à même le mordant » — et `recalerMains`, qui recale
    // les cases sur le vers corrigé en comptant les mots, ne retrouvait plus
    // ses comptes et rendait tout inchangé.
    const mains: MainAtelier[] = fragGabarit.map((role, k) => ({
      ...(fragMainsRef.current[k] ?? { role: role.role, texte: '' }),
      texte: cousus[k],
    }))

    setVoixEnCours([])
    // Tiré seul sur le vers, le médium signe seul — pas de couture mixte
    ajouterVers({ texte, auteur: voixNums.length === 0 ? 'humain' : 'mixte', voixNums, voixNoms: fragNomsRef.current, mains })
    setFragGabarit(null)
    setFragTextes([])
  }, [fragTextes, fragGabarit]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fin : correction des accords vers par vers, sauvegarde et révélation ──
  useEffect(() => {
    if (!plan || !termine || sauvegardeFaite.current) return
    sauvegardeFaite.current = true

    finaliser()

    async function finaliser() {
      // Les accords sont cousus dans le poème lui-même : les coutures
      // (vue vers par vers) montrent le même texte que le feuillet.
      let textes = versRef.current.map(v => v.texte)
      try {
        const corrige = await corrigerAccords(
          textes.join('\n'), 'atelier',
          textes.map(t => ({ texte: t, type: 'libre' })),
        )
        const lignes = corrige.split('\n').map(l => l.trim()).filter(Boolean)
        if (lignes.length === textes.length) textes = lignes
      } catch { /* texte brut */ }

      const cases: Case[] = versRef.current.map((v, i) => ({
        numero: i + 1,
        fonction: tr(`vers ${i + 1}`, `line ${i + 1}`),
        consigne: (() => {
          // Les personas sont révélées ici, jamais pendant la séance.
          const noms = (v.voixNoms ?? []).filter(Boolean)
          const signature = noms.length
            ? noms.join(' · ')
            : v.voixNums.map(toRomain).join(' · ')
          if (v.auteur === 'humain') return tr('vers du médium', 'line by the medium')
          return v.auteur === 'mixte'
            ? tr(`vers du médium et de ${signature}`, `line by the medium and ${signature}`)
            : tr(`vers de ${signature}`, `line by ${signature}`)
        })(),
        auteur: v.auteur,
        // Le nombre de mains sur ce vers, leurs noms, et le détail case par
        // case : les coutures affichaient « voix IA » générique faute de
        // savoir les lire, et rien ne distinguait un mot de réserve.
        nbVoix: v.voixNums.length,
        voixNom: (v.voixNoms ?? []).filter(Boolean).join(' · ') || undefined,
        mains: v.mains ? recalerMains(v.mains, textes[i]) : undefined,
        texte: textes[i],
        ts: Date.now(),
      }))

      const poeme: Poeme = {
        id: `atelier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        titre: null,
        structureId: 'atelier',
        mode: 'standard',
        visibilite: plan!.echo ? 'derniere-case' : 'aveugle',
        cases,
        dateCreation: Date.now(),
        dateModification: Date.now(),
      }

      sauvegarderPoeme(poeme)
        .catch(console.error)
        .finally(() => {
          localStorage.removeItem(CLE_BROUILLON)
          navigate('/fin', { state: { poeme } })
        })
    }
  }, [termine, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  function deposerVers() {
    const t = saisie.trim()
    if (!t || !tourJoueur || tourFragmentJoueur) return
    // Le vers entier se valide comme un vers libre : en stricte, on refuse
    // surtout le vide et les formes qui ne tiennent pas debout.
    const v = validerCase(t, 'libre', niveauValidation)
    if (!v.valide) { setErreur(v.message ?? tr('Texte invalide.', 'Invalid text.')); return }
    setErreur(null)
    jouer('soumettre')
    setSaisie('')
    ajouterVers({ texte: t, auteur: 'humain', voixNums: [] })
  }

  function deposerFragment() {
    let t = saisie.trim()
    if (!t || !fragGabarit || fragTextes[fragSlotJoueur] !== null) return
    // La case du médium se valide contre son type, exactement comme celle
    // qu'on demande aux voix : c'est le même gabarit grammatical.
    const v = validerCase(t, fragGabarit[fragSlotJoueur].type as TypeCase, niveauValidation)
    if (!v.valide) { setErreur(v.message ?? tr('Texte invalide.', 'Invalid text.')); return }
    setErreur(null)
    // La question du médium retrouve son point d'interrogation, comme celle des voix
    if (fragGabarit[fragSlotJoueur].type === 'proposition' && !/[?!.]\s*$/.test(t)) t += langueActuelle() === 'en' ? '?' : ' ?'
    jouer('soumettre')
    setSaisie('')
    setFragTextes(prev => {
      const next = [...prev]
      next[fragSlotJoueur] = t
      return next
    })
  }

  function quitter() {
    if (vers.length > 0 && !window.confirm(tr("Refermer l'atelier ? La séance en cours sera perdue.", 'Close the workshop? The current séance will be lost.'))) return
    localStorage.removeItem(CLE_BROUILLON)
    navigate('/')
  }

  if (!plan) return null

  // Le médium reçoit le même écho que les voix : le dernier mot du vers précédent, rien de plus
  const echoTexte = plan.echo && tourJoueur && idx > 0 ? (dernierMot(vers[idx - 1].texte) ?? null) : null
  const seul = plan.voixPool.length === 0
  const consigneJoueur = idx === 0
    ? seul
      ? tr('Ouvre la séance — tu joues contre ta propre mémoire.', 'Open the séance — you play against your own memory.')
      : tr("Ouvre la séance — le premier vers t'appartient.", 'Open the séance — the first line is yours.')
    : idx === total - 1
      ? seul
        ? tr('Referme le poème — sans te relire.', 'Close the poem — without rereading yourself.')
        : tr("Referme le poème — le dernier vers t'appartient.", 'Close the poem — the last line is yours.')
      : seul
        ? tr("Continue à l'aveugle — ta mémoire seule guide la main.", 'Carry on blind — memory alone guides your hand.')
        : tr('La main te revient.', 'The pen returns to you.')

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="jeu" />

      {/* ── MINI-GUIDE (première séance uniquement) ── */}
      <MiniCoach
        cle="coach-atelier"
        actif={!termine}
        accent={accent} encre={encre} bg={bg}
        etapes={[
          { titre: tr('Tu es le médium.', 'You are the medium.'),
            corps: tr('Tu ouvres le poème, tu le refermeras. Entre les deux, les voix écrivent — et la main te revient quand le sort le décide.', 'You open the poem, and you will close it. In between, the voices write — and the pen returns to you when fate decides.') },
          { titre: tr('Le feuillet reste voilé.', 'The page stays veiled.'),
            corps: tr('Les traits que tu vois sont la forme des vers, jamais leur texte. Personne ne relit — c’est la règle.', 'The dashes you see are the shape of the lines, never their words. No one rereads — that’s the rule.') },
          plan.echo
            ? { titre: tr('L’écho.', 'The echo.'),
                corps: tr('À chaque tour, tu n’entendras que le dernier mot du vers précédent. Raccroche-toi à lui — ou ignore-le.', 'Each turn, you’ll hear only the last word of the previous line. Catch hold of it — or ignore it.') }
            : { titre: tr('L’obscurité.', 'The darkness.'),
                corps: tr('Tu écris dans le noir total — aucun contexte, ni le tien, ni celui des voix.', 'You write in total darkness — no context, neither yours nor the voices’.') },
        ]}
      />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={quitter}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('QUITTER', 'LEAVE')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── ÉTAT DE SÉANCE ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em' }}>
            {tr("— L'ATELIER —", '— THE WORKSHOP —')}
          </span>
          <span style={{ ...mono, fontSize: 12, color: encre, opacity: 0.6 }}>
            {tr('VERS', 'LINE')} {toRomain(Math.min(idx + 1, total))} / {toRomain(total)}
          </span>
        </div>
        <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.45, marginTop: 3 }}>
          {plan.voixPool.length === 0 ? tr('SEUL', 'ALONE') : tr(`${toRomain(plan.voixPool.length)} VOIX`, `${toRomain(plan.voixPool.length)} VOICES`)} · {plan.echo ? tr("L'ÉCHO", 'THE ECHO') : tr('OBSCURITÉ TOTALE', 'TOTAL DARKNESS')}
        </div>

        {/* ── FEUILLET MASQUÉ : la forme du poème, jamais le texte ── */}
        <div style={{ marginTop: 22, marginBottom: 18, minHeight: 60 }}>
          {vers.map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, lineHeight: 1.2 }}
            >
              <span style={{
                fontSize: 11, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center',
                color: v.auteur === 'ia' ? encre : accent,
                opacity: v.auteur === 'humain' ? 0.9 : v.auteur === 'mixte' ? 0.55 : 0.4,
              }}>
                {v.auteur === 'ia'
                  ? '✦'
                  : <span style={{ display: 'inline-block', width: 7, height: 7, background: 'currentColor', borderRadius: 1 }} />}
              </span>
              <span style={{ fontSize: 13, color: encre, opacity: 0.55, letterSpacing: '0.08em', wordBreak: 'break-all' }}>
                {masquer(v.texte)}
              </span>
            </motion.div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── ZONE ACTIVE ── */}
        <AnimatePresence mode="wait">

          {/* Tour fragment : le médium remplit un slot, les voix les autres */}
          {tourFragmentJoueur && fragGabarit ? (
            <motion.div
              key={`fragment-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 8 }}
            >
              {echoTexte ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 6 }}>
                    {tr("— L'ÉCHO —", '— THE ECHO —')}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontStyle: 'italic', color: encre, opacity: 0.85, lineHeight: 1.4 }}>
                    « … {echoTexte} »
                  </div>
                </div>
              ) : idx > 0 && (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginBottom: 14 }}>
                  {tr('— TU ÉCRIS DANS LE NOIR —', '— YOU WRITE IN THE DARK —')}
                </div>
              )}

              {/* Voix IA travaillant en parallèle */}
              {voixEnCours.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {voixEnCours.map((v, k) => (
                    <motion.div
                      key={k}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: v.fait ? 0.5 : 0.75 }}
                      transition={{ duration: 0.3 }}
                      style={{ ...mono, fontSize: 12, color: encre, marginBottom: 5 }}
                    >
                      {tr('VOIX', 'VOICE')} {toRomain(v.num)} · {v.role}{' '}
                      {v.fait
                        ? <span style={{ color: accent }}>✦</span>
                        : <motion.span
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            style={{ color: accent }}
                          >…</motion.span>}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Slot du médium — actif tant qu'il n'a pas soumis */}
              {fragTextes[fragSlotJoueur] === null ? (
                <>
                  <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 6 }}>
                    {fragGabarit.length === 1
                      ? <>{tr('— LE SORT TE TIRE SEUL ·', '— FATE DRAWS YOU ALONE ·')} {fragGabarit[fragSlotJoueur].role} —</>
                      : <>{tr('— FRAGMENT', '— FRAGMENT')} {toRomain(fragSlotJoueur + 1)} / {toRomain(fragGabarit.length)} · {fragGabarit[fragSlotJoueur].role} —</>}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontStyle: 'italic', color: encre, opacity: 0.7, marginBottom: 10 }}>
                    {fragGabarit[fragSlotJoueur].consigne}
                  </div>
                  <input
                    value={saisie}
                    onChange={e => { setSaisie(e.target.value); if (erreur) setErreur(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); deposerFragment() } }}
                    placeholder={tr('ton fragment…', 'your fragment…')}
                    autoFocus
                    style={{
                      width: '100%',
                      fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic',
                      color: encre, background: 'transparent',
                      border: 'none', borderBottom: `1.2px solid ${accent}66`,
                      outline: 'none', padding: '4px 2px 8px', lineHeight: 1.45,
                    }}
                  />
                  <button
                    onClick={deposerFragment}
                    disabled={!saisie.trim()}
                    style={{
                      width: '100%', marginTop: 14,
                      background: saisie.trim() ? encre : `${encre}30`,
                      color: bg,
                      ...mono, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '0.85em 1em', border: 'none',
                      borderRadius: 3,
                      cursor: saisie.trim() ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                    }}
                  >
                    {tr('Glisser le fragment', 'Slip in the fragment')} →
                  </button>
                  {erreur && (
                    <p role="alert" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: accent, marginTop: 8 }}>
                      {erreur}
                    </p>
                  )}
                </>
              ) : (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginTop: 8 }}>
                  {tr('— LES VOIX TERMINENT —', '— THE VOICES ARE FINISHING —')}
                </div>
              )}
            </motion.div>

          /* Tour complet : le médium écrit le vers seul */
          ) : tourJoueur ? (
            <motion.div
              key={`humain-${idx}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 8 }}
            >
              {echoTexte ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 6 }}>
                    {tr("— L'ÉCHO —", '— THE ECHO —')}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontStyle: 'italic', color: encre, opacity: 0.85, lineHeight: 1.4 }}>
                    « … {echoTexte} »
                  </div>
                </div>
              ) : idx > 0 && (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginBottom: 16 }}>
                  {tr('— TU ÉCRIS DANS LE NOIR —', '— YOU WRITE IN THE DARK —')}
                </div>
              )}

              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontStyle: 'italic', color: encre, opacity: 0.75, marginBottom: 12 }}>
                {consigneJoueur}
              </div>

              <textarea
                value={saisie}
                onChange={e => { setSaisie(e.target.value); if (erreur) setErreur(null) }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); deposerVers() }
                }}
                placeholder={tr('ton vers…', 'your line…')}
                rows={2}
                autoFocus
                style={{
                  width: '100%', resize: 'none',
                  fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: 'italic',
                  color: encre, background: 'transparent',
                  border: 'none', borderBottom: `1.2px solid ${accent}66`,
                  outline: 'none', padding: '4px 2px 8px', lineHeight: 1.45,
                }}
              />
              <button
                onClick={deposerVers}
                disabled={!saisie.trim()}
                style={{
                  width: '100%', marginTop: 14,
                  background: saisie.trim() ? encre : `${encre}30`,
                  color: bg,
                  ...mono, fontSize: 15, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0.85em 1em', border: 'none',
                  borderRadius: 3,
                  cursor: saisie.trim() ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
              >
                {idx === total - 1 ? tr('Refermer le poème →', 'Close the poem →') : tr('Déposer le vers →', 'Lay down the line →')}
              </button>
              {erreur && (
                <p role="alert" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: accent, marginTop: 8 }}>
                  {erreur}
                </p>
              )}
            </motion.div>

          /* Tour IA pur ou attente init fragment */
          ) : !termine ? (
            <motion.div
              key={`ia-${idx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ paddingBottom: 24, textAlign: 'center' }}
            >
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.28em', marginBottom: 14 }}>
                {tr('— LES VOIX ÉCRIVENT —', '— THE VOICES ARE WRITING —')}
              </div>
              {voixEnCours.map((v, k) => (
                <motion.div
                  key={k}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: v.fait ? 0.85 : 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, marginBottom: 7 }}
                >
                  {tr('VOIX', 'VOICE')} {toRomain(v.num)} · {v.role}{' '}
                  {v.fait
                    ? <span style={{ color: accent }}>✦</span>
                    : <motion.span
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ color: accent }}
                      >…</motion.span>}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="fin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ paddingBottom: 24, textAlign: 'center', ...mono, fontSize: 13, color: accent, letterSpacing: '0.22em' }}
            >
              {tr('— LE POÈME SE REFERME —', '— THE POEM CLOSES —')}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  )
}
