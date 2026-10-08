import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { lireSerie, type Serie } from '../utils/streak'
import { rearmerRappelSiActif } from '../utils/notifications'
import { libelleSerie } from '../lib/attribution'
import { sceauDuJour, libelleAcheve } from '../lib/jourLocal'
import { tr, langueActuelle } from '../i18n'

const ONBOARDING_KEY = 'cadavre-onboarding-done'
function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

export default function Accueil() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  // L'ouverture de l'accueil = le passage du jour : on pointe la série une fois.
  // La série ne se pointe plus à l'OUVERTURE : elle comptait les fois où
  // l'on poussait la porte, pas les poèmes écrits. C'est le dernier
  // fragment du cadavre du jour qui l'incrémente désormais (`Jeu.tsx`).
  const [serie] = useState<Serie>(() => lireSerie())
  /*
    LE SCEAU DU JOUR, LU EN LOCAL.

    Le commentaire du sceau promettait « ✧ en attente, ✦ une fois écrit »,
    et le glyphe était codé ✧ en dur : aucun état n'était lu. Il l'est
    maintenant, sans requête dans le cas ordinaire — l'appareil sait où sa
    main est posée et ce qu'il a déplié.

    La seule question posée au registre — « le poème où j'ai écrit est-il
    scellé ? » — ne part que si ce poème existe, passé l'heure de la
    révélation et pas encore ouvert. Le module est chargé à la demande :
    l'accueil ne tire pas le client Supabase pour une ligne qui, le plus
    souvent, n'a rien à dire.
  */
  const [sceau, setSceau] = useState(() => sceauDuJour(langueActuelle(), new Date()))
  useEffect(() => {
    if (!sceau.aVerifier) return
    let vivant = true
    import('../lib/jour')
      .then(m => m.dernierJourScelle())
      .then(() => { if (vivant) setSceau(sceauDuJour(langueActuelle(), new Date())) })
      .catch(() => { /* registre muet : on ne dit rien plutôt que de supposer */ })
    return () => { vivant = false }
  }, [])

  // Premier lancement : au lieu d'un onboarding lu, on emmène directement le
  // joueur dans une partie Découverte (il vit une révélation avant qu'on lui
  // demande quoi que ce soit). La Découverte marque l'intro comme vue → ceci
  // ne se déclenche qu'une seule fois, jamais en boucle.
  useEffect(() => {
    let vu = true
    try { vu = localStorage.getItem(ONBOARDING_KEY) === '1' } catch { /* ignore */ }
    if (!vu) navigate('/decouverte', { replace: true })
  }, [navigate])

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    // Si le rappel quotidien était activé, on s'assure qu'il est toujours armé.
    rearmerRappelSiActif()
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

  function nav(to: string) {
    jouer('clic')
    navigate(to)
  }

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const second = c?.second ?? '#1d3a8c'
  // Le troisième accent de l'ambiance — celui que les Règles donnent aussi
  // à l'Atelier, pour qu'on le reconnaisse d'un écran à l'autre.
  const tierce = c?.tierce ?? '#1a4a1e'
  // Le quatrième, celui du mode en ligne (voir le bloc des pavés). Les
  // replis sont quatre couleurs distinctes : sans séance, quatre pavés ne
  // doivent pas en montrer deux pareils.
  const quarte = c?.quarte ?? '#701448'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const num = String(((seance?.seed ?? 0) % 999) + 1).padStart(3, '0')
  const annee = toRomain(new Date().getFullYear())
  const idxBiais = seance?.idxBiais ?? -1
  const angleBiais = seance?.angleBiais ?? 0
  const letters = 'Exquis'

  const bg = c?.bg ?? '#0f0805'
  const ui: React.CSSProperties = { fontFamily: "'Raleway', sans-serif" }

  const cadavreSide = seance?.symbolSide === 'right' ? 'left' : 'right'
  const exquisStyle: React.CSSProperties = cadavreSide === 'right'
    ? { paddingRight: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-end', textAlign: 'right' }
    : { paddingLeft: 'clamp(2.8rem, 14vw, 5rem)', alignSelf: 'flex-start', textAlign: 'left' }

  return (
    // `min-h-dvh` et non `h-dvh` : l'accueil tient dans un écran, mais sur un
    // Samsung réglé en grand texte, ou un téléphone de 320 points, un écran
    // FIXE coupait le pied de page — RÈGLES et RÉGLAGES devenaient
    // inatteignables. La page grandit plutôt que de couper.
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh overflow-hidden safe-top safe-bottom">

      <Decor variant="accueil" hideCitation hideSignature />

      {/* ── HEADER ── */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          ...ui, fontSize: 13, letterSpacing: '0.1em',
          color: encre, opacity: 0.7, whiteSpace: 'nowrap',
        }}>
          N° {num} · {annee}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <button
            onClick={() => seance?.retirer()}
            title={tr('Re-tirer un rêve', 'Draw a new dream')}
            aria-label={tr('Tirer une nouvelle ambiance', 'Draw a new ambience')}
            style={{
              ...ui, fontSize: 15, color: accent, opacity: 0.9,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 10px', margin: '-12px -4px',
            }}
          >✦</button>
          <span style={{
            ...ui, fontSize: 13, letterSpacing: '0.1em',
            color: accent, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            {colorLabel}
          </span>
        </div>
      </div>

      <hr style={{
        border: 'none', borderTop: `1.2px solid ${accent}`,
        marginTop: 6, opacity: 0.45, position: 'relative', zIndex: 10,
      }} />
      {(serie.compte >= 2 || seance?.heure) && (
        <div style={{
          position: 'relative', zIndex: 10, marginTop: 3,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          ...ui, fontSize: 11, letterSpacing: '0.06em',
          color: accent, opacity: 0.5,
        }}>
          <span>
            {serie.compte >= 2 ? libelleSerie(serie.compte) : ''}
          </span>
          {seance?.heure && <span>{tr('rêvé à', 'dreamt at')} {seance.heure}</span>}
        </div>
      )}

      {/* ── ZONE CENTRALE ── */}
      <div className="relative flex flex-col flex-1 justify-end" style={{ zIndex: 10 }}>

        {/* Accent vertical éditorial — chiffre de séance */}
        <motion.div
          style={{
            position: 'absolute',
            top: '8%',
            ...(cadavreSide === 'right' ? { left: 0 } : { right: 0 }),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontFamily: "'Raleway', sans-serif",
            fontSize: 9,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.30,
            userSelect: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.30 }}
          transition={{ duration: 1.4, delay: 0.8 }}
        >
          {num} · {annee}
        </motion.div>

        <motion.div
          className="mb-3"
          style={exquisStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.0, delay: 0.3 }}
        >
          <div
            className="font-fraunces font-black"
            style={{
              // Plancher à 4rem et mot insécable : à 320 points de large — un
              // Samsung en « grande taille d'affichage » y tombe — le
              // plancher de 5rem faisait passer le « s » à la ligne.
              fontSize: 'clamp(4rem, 22vw, 9rem)',
              whiteSpace: 'nowrap',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              color: accent,
            }}
          >
            {[...letters].map((l, i) => (
              <span key={i} style={{
                display: 'inline-block',
                transform: i === (idxBiais % letters.length)
                  ? `rotate(${angleBiais}deg) translateY(${angleBiais > 0 ? 2 : -2}px)`
                  : 'none',
                transformOrigin: 'center bottom',
              }}>{l}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── PLI — Citation + CTAs + Footer s'ouvrent comme une feuille pliée ── */}
      <motion.div
        style={{
          position: 'relative', zIndex: 10,
          transformPerspective: 900,
          transformOrigin: 'top center',
        }}
        initial={{ rotateX: -72, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Ligne de pli — l'encre de la charnière */}
        <div style={{
          height: 10,
          marginBottom: 6,
          background: `linear-gradient(to bottom, transparent, ${encre}12 49%, ${encre}22 50%, transparent)`,
        }} />

        {/* ── CITATION ── */}
        {seance?.citation && (
          <div style={{ marginBottom: 14 }}>
            <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.18, marginBottom: 10 }} />
            <span style={{
              fontFamily: "'Playfair Display', serif", fontSize: 17, lineHeight: 1.5,
              color: encre, display: '-webkit-box', fontStyle: 'italic',
              overflow: 'hidden', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              {seance.citation.t}
            </span>
            <div style={{
              ...ui, fontSize: 13, letterSpacing: '0.1em', fontWeight: 700,
              textTransform: 'uppercase', color: accent, marginTop: 5,
            }}>
              {seance.citation.a}
            </div>
          </div>
        )}

        {/* ── CTA ──
             QUATRE PAVÉS, DEUX RANGS — les quatre portes du même jeu.

             Le mode en ligne et l'Atelier étaient des cadres vides, d'un
             autre corps et d'un autre espacement que les deux cadavres : on
             lisait deux boutons de jeu suivis de deux liens d'une autre
             famille. Ce sont pourtant des modes de jeu au même titre. Ils
             prennent donc la forme des cadavres — pavé plein, texte couleur
             du papier, même corps, même graisse, même espacement. Les ✧
             partent : ils distinguaient l'Atelier des autres, et c'est ce
             qu'on ne veut plus.

             Une couleur par mode, et ce sont les QUATRE ACCENTS du jour.
             L'Atelier garde la tierce, celle que les Règles lui donnent. Le
             mode en ligne prend la quarte, et non l'encre qu'il portait en
             contour : sur les trois ambiances sombres l'encre est le crème du
             papier, et l'un des accents en est le voisin clair (`horsEncre`)
             — ou le crème même, quand c'est lui qui ouvre le tirage. Mesuré
             sur sept ambiances × quatre départs : en encre, deux pavés
             jumeaux dans neuf tirages sur vingt-huit, dont trois identiques ;
             en quarte, les quatre pavés ne se ressemblent jamais plus que la
             palette ne se ressemble à elle-même. Aux Règles, la quarte est
             aussi la couleur du poème du jour, et c'est assumé : ce sont les
             deux jeux à mains lointaines, le salon et le rendez-vous. Ne pas
             la « corriger » vers l'encre — `couleursRubriques.test.ts` dit
             pourquoi.

             La hiérarchie ne tient plus au contour mais à la HAUTEUR. Les
             deux cadavres sont le jeu d'origine et ouvrent la grille à
             0,9 em ; le second rang descend à 0,65 em. Même voix, un cran
             plus bas — on voit d'abord les cadavres, ensuite le reste.

             Le rang bas a moins de 44 px de dessin — 42 à 390 points, 35 à
             320 : c'est la zone d'appui globale d'`index.css` qui le porte à
             44, sans grossir le pavé. Cette zone déborde alors au-dessus de
             lui, d'où l'écart de 8 px entre les rangs et non 6 : à 6, à 320
             points, les zones des deux rangs se chevauchaient d'un tiers de
             pixel. Rien qu'un doigt sente, mais plus aucune marge entre deux
             portes voisines ; à 8, il en reste 1,7 px. Balayé au pixel de
             320 à 430 points, chaque point de chaque zone mène à son pavé. */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 6px',
          marginBottom: 10,
        }}>
          {[
            { label: tr('Cadavre Écrit', 'Written Cadavre'), path: '/config',        haut: true,  fond: accent },
            { label: tr('Cadavre Dessiné', 'Drawn Cadavre'), path: '/config-dessin', haut: true,  fond: second },
            { label: tr('Mode en ligne', 'Online mode'),     path: '/online',        haut: false, fond: quarte },
            { label: tr("L'Atelier", 'The Workshop'),        path: '/atelier',       haut: false, fond: tierce },
          ].map(({ label, path, fond, haut }) => (
            <button
              key={path}
              onClick={() => nav(path)}
              style={{
                minWidth: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: fond, color: bg,
                ...ui, fontSize: 'clamp(11px, 3.8vw, 15px)', letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: haut ? '0.9em 0.5em' : '0.65em 0.5em',
                border: 'none', cursor: 'pointer',
                borderRadius: 3, whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── FOOTER ──
             Le cadavre du jour tient la colonne du MILIEU, entre les quatre
             entrées du pied. Il occupait d'abord toute la largeur au-dessus
             des boutons de jeu, où il pesait autant que « Cadavre écrit » —
             or ce n'est pas un mode de jeu de plus, c'est un rendez-vous. Au
             centre, il est vu sans rien écraser : le sceau d'un almanach au
             milieu de sa page. */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          gap: '4px 0', paddingBottom: 4, alignItems: 'center',
        }}>
          {[
            { label: tr('Recueil', 'Collection'), path: '/bibliotheque', col: 1, row: 1 },
            { label: tr('Galerie', 'Gallery'),  path: '/galerie',       col: 3, row: 1, align: 'right' },
            { label: tr('Règles', 'Rules'),   path: '/aide',          col: 1, row: 2 },
            { label: tr('Réglages', 'Settings'), path: '/reglages',      col: 3, row: 2, align: 'right' },
          ].map(({ label, path, align, col, row }) => (
            <button
              key={path}
              onClick={() => nav(path)}
              style={{
                ...ui, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: encre, opacity: 0.65, fontWeight: 700,
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: (align as 'right') ?? 'left',
                padding: '10px 0',
                gridColumn: col, gridRow: row,
              }}
            >
              {label}
            </button>
          ))}

          {/* Le sceau du jour.
              Premier jet : le QUANTIÈME en Bodoni, « 16 », au motif qu'il
              dirait « aujourd'hui » sans l'écrire, comme le « N° 1.42 ·
              MMXXVI » de l'en-tête. Illisible : entre RECUEIL, GALERIE,
              RÈGLES et RÉGLAGES, un nombre nu peut être un compte, une
              version, un numéro de feuillet. Le procédé ne marche dans
              l'en-tête que parce que le mot « N° » l'accompagne.
              Le mot d'abord, donc. L'état tient dans la marque : ✧ en
              attente, ✦ une fois écrit — c'est déjà le vocabulaire de la
              série, « ✦ 2ᵉ nuit de suite ». */}
          <button
            onClick={() => nav('/poeme-du-jour')}
            aria-label={sceau.ecrit
              ? tr('Le poème du jour — ta main est posée', 'The poem of the day — your hand is in')
              : tr('Le poème du jour', 'The poem of the day')}
            title={sceau.ecrit
              ? tr('Le poème du jour — ta main est posée', 'The poem of the day — your hand is in')
              : tr('Le poème du jour', 'The poem of the day')}
            style={{
              gridColumn: 2, gridRow: '1 / 3',
              justifySelf: 'center', alignSelf: 'center',
              width: 52, height: 52, borderRadius: '50%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 1,
              background: 'none', cursor: 'pointer',
              border: `1px solid ${accent}`,
              transition: 'border-color 0.3s',
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1, color: accent }}>{sceau.ecrit ? '✦' : '✧'}</span>
            <span style={{
              ...ui, fontSize: 9, letterSpacing: '0.14em', fontWeight: 700,
              color: accent, opacity: 0.9,
            }}>
              {tr('JOUR', 'DAY')}
            </span>
          </button>
        </div>

        {/*
          TON POÈME EST ACHEVÉ — une ligne, pas une pastille.

          Le seul mécanisme qui fait revenir chaque jour tenait dans un rond
          de 52 px qui ne changeait jamais. La nouvelle la plus désirable du
          jeu — le poème où tu as écrit s'est refermé — ne se lisait nulle
          part sur l'écran le plus vu. Petites capitales, onze pixels, la
          couleur de l'accent : la voix de la revue, pas un chiffre rouge.
          Elle mène au poème lui-même, plié, et s'éteint dès qu'on l'a
          déplié.
        */}
        {sceau.acheve && (
          <button
            onClick={() => nav(`/poeme-du-jour?jour=${sceau.acheve!.jour}`)}
            style={{
              display: 'block', width: '100%', textAlign: 'center',
              ...ui, fontSize: 11, letterSpacing: '0.12em', fontWeight: 700,
              color: accent, background: 'none', border: 'none', cursor: 'pointer',
              padding: '4px 0 6px', lineHeight: 1.5,
            }}
          >
            {libelleAcheve(sceau.acheve, new Date())}{'\u00a0→'}
          </button>
        )}

      </motion.div>

    </PageTransition>
  )
}
