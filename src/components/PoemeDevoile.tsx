import React, { useEffect, useMemo, useRef, useState } from 'react'
import Depli, { type VoletPapier } from './Depli'
import VersEncre from './VersEncre'
import { Tranches } from './Papier'
import { partitionDuPoeme, finDuDepli, DUREE_DEPLI } from '../lib/rythme'

/**
 * Le dévoilement du poème : le papier s'ouvre, et les vers sont dessus.
 *
 * Le feuillet est plié en volets — jusqu'à cinq, un par vers quand le poème
 * est court, ce qui retrouve exactement le pliage d'origine d'un cadavre
 * exquis à trois ou quatre mains. Un volet s'ouvre et montre le vers qu'il
 * porte ; le suivant s'ouvre quand le précédent a eu le temps d'être lu.
 *
 * Jusqu'au 8 novembre il y avait deux gestes : le papier, puis l'encre, qui
 * attendait que le volet soit presque à plat. L'auteur : « le mot met trop de
 * temps à apparaître quand le papier se déplie ». Les fragments d'un cadavre
 * exquis sont écrits AVANT d'être pliés ; le mot est donc déjà sur le volet
 * (`finDuDepli`, `rythme.ts`). `VersEncre` garde la mise en page du vers, sa
 * lettrine et sa copie pour le lecteur d'écran, sans son masque.
 *
 * Avec `papier`, les volets sont des faces de papier opaques et la feuille
 * s'allonge à chaque pli (`Depli`) ; sous elle pendent les tranches des
 * volets encore fermés. Le conteneur de la feuille doit être positionné :
 * c'est sous SON bord que les tranches pendent.
 *
 * `rythme.ts` tient la partition : c'est lui qui sait qu'un vers d'un mot doit
 * tomber vite et laisser un silence, et que le poème entier doit passer en
 * huit secondes qu'il en ait trois ou quarante.
 *
 * ── Ce qui se passe si on ne veut pas regarder ────────────────────────────
 *
 * Une belle animation qu'on subit une deuxième fois est pire qu'une animation
 * bancale. Le premier appui n'importe où pose le poème entier d'un coup, sans
 * rien empêcher d'autre — on n'intercepte pas le geste, on l'écoute. Une
 * touche du clavier fait de même : l'appui au pointeur laissait le clavier
 * sans moyen d'abréger. Et `prefers-reduced-motion` court-circuite la
 * séquence complète.
 *
 * ── Ce qui vient après le poème ───────────────────────────────────────────
 *
 * `onFini` est le signal que la page attend pour faire monter ses actions.
 * `apres` rend, sous chaque vers, ce que la page veut y poser — les
 * coutures : elles se posent SUR le poème au lieu d'en recopier une
 * seconde liste en dessous.
 */

interface Props {
  /** Les vers du poème, un par ligne, dans l'ordre. */
  lignes: string[]
  /** La couleur d'accent, celle de la lettrine. */
  accent: string
  /** Tant que c'est faux, rien n'est rendu : le rideau n'est pas levé. */
  actif: boolean
  /** Poser une lettrine sur la première lettre du premier vers. */
  lettrine?: boolean
  /** Appelé quand la lettrine se pose — le son et l'haptique. */
  onLettrine?: () => void
  /** Appelé une fois le dernier mot posé, ou dès que le dévoilement est sauté. */
  onFini?: () => void
  /** Le style typographique des vers. */
  style?: React.CSSProperties
  /** La taille de la lettrine. */
  tailleLettrine?: string
  /** Rendu sous le vers d'indice i — les coutures, une fois le poème posé. */
  apres?: (i: number) => React.ReactNode
  /** La feuille de papier (`lib/papier.ts`). Absent : les volets transparents d'avant. */
  papier?: VoletPapier
  /** Le pied de la feuille, porté par le dernier volet : il arrive avec lui. */
  pied?: React.ReactNode
}

const mouvementReduit = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Les guillemets ouvrants ne font pas une lettrine. */
const OUVRANTS = /^[«»"'“”‘’]+/

export default function PoemeDevoile({
  lignes, accent, actif, lettrine, onLettrine, onFini, style,
  tailleLettrine = 'clamp(2.8rem, 10vw, 3.4rem)', apres, papier, pied,
}: Props) {
  const [saute, setSaute] = useState(false)
  const reduit = useMemo(mouvementReduit, [])
  const immediat = saute || reduit

  // Le premier vers cède sa première lettre à la lettrine.
  const ligne0 = (lignes[0]?.trim() ?? '').replace(OUVRANTS, '')
  // Une lettrine est une CAPITALE. Les fragments se cousent en minuscule, et
  // un « l » bas-de-casse en Bodoni, à cette taille, se lisait comme un
  // trait rouge — « | a balance rouillée ».
  const capitale = lettrine ? ligne0.charAt(0).toLocaleUpperCase() : ''
  const affichees = useMemo(
    () => (capitale ? [ligne0.slice(1), ...lignes.slice(1)] : lignes),
    [lignes, capitale, ligne0],
  )

  const partition = useMemo(() => partitionDuPoeme(affichees), [affichees])
  const fin = finDuDepli(partition)
  const nPanneaux = partition.panneaux.length
  // Les volets encore fermés : autant de tranches sous la feuille.
  const [ouverts, setOuverts] = useState(0)

  // L'instant où le rideau s'est levé, gardé une fois pour toutes. Le
  // minuteur de fin repartait de zéro à chaque nouvelle partition — or la
  // correction d'accord arrive PENDANT l'écriture et change les lignes :
  // `onFini` tombait alors en retard d'autant, et avec lui tout ce que la
  // page fait attendre derrière le poème.
  const leve = useRef<number | null>(null)
  if (actif && leve.current === null) leve.current = Date.now()
  // Abrégé au doigt, et non au clavier — voir plus bas.
  const parAppui = useRef(false)

  // Le premier appui n'importe où pose le poème. On écoute la phase de
  // capture sans rien empêcher : le bouton qu'on visait s'enfonce quand même.
  useEffect(() => {
    if (!actif || immediat) return
    const sauter = (e: Event) => { parAppui.current = e.type === 'pointerdown'; setSaute(true) }
    const ecoule = Date.now() - (leve.current ?? Date.now())
    const retirer = () => {
      window.removeEventListener('pointerdown', sauter, { capture: true })
      window.removeEventListener('keydown', sauter, { capture: true })
    }
    // Le poème posé de lui-même, on cesse d'écouter. L'écoute survivait à la
    // séquence : le premier appui sur COUTURES ou sur le guide « abrégeait »
    // un poème déjà écrit, et le feuillet se remontait sous le doigt.
    const finie = setTimeout(() => { retirer(); onFini?.() }, Math.max(0, fin + 240 - ecoule))
    // Le son et l'haptique de la lettrine : quand le premier volet se pose.
    const lettrinePosee = capitale && onLettrine && nPanneaux > 0
      ? setTimeout(onLettrine, Math.max(0, partition.panneaux[0].ouverture + DUREE_DEPLI - ecoule))
      : undefined
    const plis = partition.panneaux.map((pan, p) =>
      setTimeout(() => setOuverts(o => Math.max(o, p + 1)), Math.max(0, pan.ouverture - ecoule)))
    window.addEventListener('pointerdown', sauter, { capture: true })
    window.addEventListener('keydown', sauter, { capture: true })
    return () => {
      clearTimeout(finie)
      clearTimeout(lettrinePosee)
      plis.forEach(clearTimeout)
      retirer()
    }
  }, [actif, immediat, fin]) // eslint-disable-line react-hooks/exhaustive-deps

  /*
    Abrégé AU DOIGT, `onFini` attend que le clic soit passé.

    La page fait monter ses actions à `onFini` — « SCELLER AU RECUEIL » juste
    sous la carte. Or au toucher, le clic que le navigateur synthétise après
    `touchend` tombe sur ce qui est SOUS le doigt à cet instant : un appui
    sous la carte, pour abréger, aurait pressé le bouton apparu entre le
    toucher et le relâcher (le piège du rabat, `Rabat.tsx`). On laisse donc
    passer ce clic, puis on prévient. Un geste sans clic — on a fait défiler
    — ne retient rien plus d'une demi-seconde.
  */
  useEffect(() => {
    if (!actif || !immediat) return
    if (!parAppui.current) { onFini?.(); return }
    let fait = false
    const prevenir = () => { if (!fait) { fait = true; onFini?.() } }
    const apresClic = () => { setTimeout(prevenir, 0) }
    window.addEventListener('click', apresClic, { capture: true, once: true })
    const filet = setTimeout(prevenir, 500)
    return () => {
      window.removeEventListener('click', apresClic, { capture: true })
      clearTimeout(filet)
    }
  }, [actif, immediat]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!actif) return null

  const dureeDepli = DUREE_DEPLI / 1000

  return (
    // La clé change à l'appui qui abrège, et c'est ce qui pose le poème.
    // Sans elle, un appui EN COURS de séquence ne posait rien : les mots
    // déjà lancés recevaient une transition nulle et se figeaient à
    // mi-masque — « il reste du givre sur la v » — et les volets suivants
    // restaient couchés. Seul un appui avant le premier mot marchait, et
    // c'est le seul que la mesure faisait. On remonte donc le feuillet
    // déjà ouvert, d'un coup.
    <div key={immediat ? 'pose' : 'encre'} style={style}>
      {partition.panneaux.map((panneau, p) => (
        <Depli
          key={p}
          delai={panneau.ouverture / 1000}
          duree={dureeDepli}
          immediat={immediat}
          // Sur la feuille de papier, le premier volet est plié sous
          // l'en-tête : son bord haut est un pli, lui aussi.
          pli={papier ? true : p > 0}
          papier={papier}
          rang={p}
        >
          {panneau.lignes.map(i => {
            const t = partition.vers[i]
            return (
              <React.Fragment key={i}>
              <VersEncre
                texte={affichees[i] || ''}
                // Le lecteur d'écran lit le vers ENTIER : sans cela il
                // entendait la lettrine à part, puis « e marche ».
                lu={i === 0 && capitale ? ligne0 : undefined}
                debut={t.debut / 1000}
                duree={t.duree / 1000}
                // Le mot est déjà sur le volet : c'est le pli qui le montre.
                immediat
                avant={i === 0 && capitale ? (
                  // Imprimée avec le reste : elle ne tombe plus, elle est là
                  // quand le premier volet se couche.
                  <span
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Bodoni Moda', serif",
                      fontWeight: 900,
                      // Une lettrine est DROITE. Elle héritait de l'italique
                      // du poème, et un « L » de Bodoni penché se lisait
                      // comme une barre oblique rouge — « / e vernis ».
                      fontStyle: 'normal',
                      fontSize: tailleLettrine,
                      lineHeight: 0.85,
                      color: accent,
                      // Le flottement est porté par `VersEncre`, qui la loge
                      // dans le retrait des débords.
                      marginRight: 6,
                      marginTop: 4,
                    }}
                  >
                    {capitale}
                  </span>
                ) : undefined}
              />
              {apres?.(i)}
              </React.Fragment>
            )
          })}
          {p === nPanneaux - 1 && pied}
        </Depli>
      ))}
      {/* Les volets encore fermés, en tranches sous le bord de la feuille. */}
      {papier && !immediat && ouverts < nPanneaux && (
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: '100%', pointerEvents: 'none' }}>
          <Tranches n={nPanneaux - ouverts} encre={style?.color as string ?? '#000'} />
        </div>
      )}
    </div>
  )
}
