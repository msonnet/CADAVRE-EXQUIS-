import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import { ESSAI_OFFERT, ENCRIER_HEBDO } from '../lib/reserves'

const STRUCTURES = [
  { romain: 'I',   label: tr('Phrase courte', 'Short sentence'),  detail: tr('3 cases · sujet, verbe, complément', '3 slots · subject, verb, complement'), exemple: tr("L'ombre / glisse / dans la nuit froide", 'The shadow / slides / through the cold night') },
  { romain: 'II',  label: tr('Phrase étoffée', 'Full sentence'), detail: tr('5 cases · la canonique de Breton', "5 slots · Breton's canonical form"), exemple: tr('Le cadavre exquis boira le vin nouveau', 'The exquisite corpse will drink the new wine') },
  { romain: 'III', label: tr('Vers libre', 'Free verse'),     detail: tr('4 à 12 vers · sans contrainte fixe', '4 to 12 lines · no fixed constraint') },
]

const VISIBILITE = [
  { label: tr('AVEUGLE', 'BLIND'),        detail: tr('Aucun contexte — tu écris dans le vide total. La forme la plus surréaliste.', 'No context — you write into the void. The most surrealist form.') },
  { label: tr('DERNIER MOT', 'LAST WORD'),    detail: tr('Un seul mot de la case précédente est visible. Un fil ténu, juste assez pour raccrocher quelque chose.', 'A single word from the previous slot is visible. A thin thread, just enough to latch onto something.') },
  { label: tr('DERNIÈRE CASE', 'LAST SLOT'),  detail: tr('La case précédente entière est visible. Le poème sera plus cohérent, mais moins surprenant.', 'The whole previous slot is visible. The poem will be more coherent, but less surprising.') },
]

const MODES = [
  { label: tr('STANDARD', 'STANDARD'),   detail: tr("Aucune contrainte de temps. Tu prends le temps qu'il faut.", 'No time constraint. You take as long as you need.') },
  { label: tr('HYPNOTIQUE', 'HYPNOTIC'), detail: tr('30 secondes par case. À 0, le fragment est soumis automatiquement — ou une voix intérieure complète à ta place.', '30 seconds per slot. At zero, the fragment is submitted automatically — or an inner voice completes it for you.') },
]

const RACCORD_DESSIN = [
  { label: tr('AVEUGLE', 'BLIND'), detail: tr("Chaque bande commence dans l'obscurité totale. Le monstre prend forme par hasard.", 'Each band begins in total darkness. The monster takes shape by chance.') },
  { label: tr('RACCORD', 'JOINED'), detail: tr("Un liseret du fragment précédent reste visible jusqu'au premier trait. Assez pour raccorder les corps, pas assez pour tout voir.", 'A sliver of the previous fragment stays visible until your first stroke. Enough to join the bodies, not enough to see everything.') },
]

const SECTIONS = [
  { id: 'ecrit',    label: tr('CADAVRE ÉCRIT', 'WRITTEN CADAVRE') },
  { id: 'dessine',  label: tr('CADAVRE DESSINÉ', 'DRAWN CADAVRE') },
  { id: 'atelier',  label: tr("L'ATELIER", 'THE WORKSHOP') },
  // Le rendez-vous quotidien. Il vient après les trois modes parce qu'il ne
  // se joue pas comme eux : on n'y ouvre pas une partie, on ajoute une main
  // à celle de tout le monde.
  { id: 'jour',     label: tr('LE POÈME DU JOUR', 'THE POEM OF THE DAY') },
  // L'encrier ferme la liste, et ce n'est pas un mode de jeu : c'est ce qui
  // explique pourquoi trois gestes sur toute l'application sont comptés et
  // pourquoi tout le reste ne l'est pas. Un joueur qui découvre cela AU
  // MOMENT DU REFUS croit à un piège ; ici, il l'apprend avant.
  { id: 'encrier',  label: tr("L'ENCRIER", 'THE INKWELL') },
]

/**
 * Ce que l'encrier compte, et ce qu'il ne compte pas.
 *
 * L'ordre est celui où le joueur les rencontre : d'abord ce qui est
 * gratuit — c'est l'essentiel du jeu et il doit venir en premier — puis les
 * trois actes comptés, puis les réserves, de la plus offerte à la plus
 * engageante.
 *
 * On ne cite AUCUN prix : il dépend du pays, il change, et le magasin
 * l'affiche lui-même au moment de l'achat. Une page de règles qui annonce
 * « 4,99 € » vieillit mal et ment à qui vit ailleurs.
 */
const ENCRIER = [
  {
    label: tr('CE QUI NE COÛTE RIEN', 'WHAT COSTS NOTHING'),
    detail: tr(
      "Écrire à plusieurs, dessiner, publier en galerie, relire ses poèmes, composer son recueil, donner sa main au poème du jour : rien de tout cela n'est compté, et rien ne le sera.",
      'Writing together, drawing, publishing to the gallery, rereading your poems, composing your collection, giving your hand to the poem of the day: none of it is counted, and none of it will be.',
    ),
  },
  {
    label: tr('CE QUI EST COMPTÉ', 'WHAT IS COUNTED'),
    detail: tr(
      "Trois gestes seulement appellent une machine qui me facture : une illustration grand format, une partie où les voix de l'IA écrivent, la lecture surréaliste d'un dessin. Ce sont les seuls que l'encrier mesure.",
      'Only three acts call a machine that bills me: a large-format illustration, a game where the AI voices write, the surrealist reading of a drawing. Those are the only ones the inkwell measures.',
    ),
  },
  {
    // Les nombres viennent d'`ESSAI_OFFERT` et non de la phrase. Écrits en
    // toutes lettres ils annonçaient encore « cinq illustrations » le jour
    // où la réserve est passée à deux — la faute même que le lot 9 a
    // corrigée ailleurs, et ici elle se lirait comme une promesse non tenue.
    label: tr("L'ESSAI, UNE FOIS", 'THE TRIAL, ONCE'),
    detail: tr(
      `À ta première partie, ton encrier est plein : ${ESSAI_OFFERT.images} illustrations, ${ESSAI_OFFERT.parties} parties avec les voix, ${ESSAI_OFFERT.lectures} lectures de dessin. De quoi voir exactement ce que tout cela vaut, sans rien donner.`,
      `At your first game, your inkwell is full: ${ESSAI_OFFERT.images} illustrations, ${ESSAI_OFFERT.parties} games with the voices, ${ESSAI_OFFERT.lectures} drawing readings. Enough to see exactly what it is worth, without giving anything.`,
    ),
  },
  {
    /*
      « L'ENCRIER SE REMPLIT » et non « L'ENCRIER » tout court : la section
      entière porte déjà ce nom, et une ligne « L'ENCRIER » à l'intérieur
      d'une section « L'ENCRIER » ne dirait rien. Formulée en ACTION, elle
      se lit sans ambiguïté et reprend mot pour mot ce que le mur annonce
      déjà quand le plafond du jour tombe : « L'encrier se remplit à
      minuit ».
    */
    label: tr('L’ENCRIER SE REMPLIT', 'THE INKWELL REFILLS'),
    detail: tr(
      `Puis, ${ENCRIER_HEBDO.parties} partie avec les voix te revient chaque semaine, gratuitement et sans fin. L'encrier n'est jamais vraiment sec.`,
      `Then ${ENCRIER_HEBDO.parties} game with the voices comes back to you every week, free and without end. The inkwell is never truly dry.`,
    ),
  },
  {
    label: tr('LE FLACON', 'THE FLASK'),
    detail: tr(
      "Des illustrations achetées à l'unité, quand tu en veux. Achat unique, aucune reconduction, et l'encre ne s'évapore pas : ce que tu n'utilises pas t'attend.",
      'Illustrations bought by the handful, when you want them. One-time purchase, no renewal, and the ink does not evaporate: what you do not use waits for you.',
    ),
  },
  {
    label: tr("L'ABONNEMENT", 'THE SUBSCRIPTION'),
    detail: tr(
      "Voix de l'IA et lectures de dessins sans compter, deux illustrations grand format par jour. Pour qui écrit souvent — les autres n'en ont pas besoin.",
      'AI voices and drawing readings without counting, two large-format illustrations a day. For those who write often — the others do not need it.',
    ),
  },
]

export default function Aide() {
  const navigate = useNavigate()
  const seance = useReve()

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const second = c?.second ?? '#1d3a8c'
  const colorLabel = c?.name.toUpperCase() ?? ''

  /*
    UNE COULEUR PAR RUBRIQUE, et elle veut dire quelque chose.

    Avant : trois couleurs pour cinq rubriques. L'Atelier et le poème du
    jour étaient tous deux en encre, l'Encrier et le cadavre écrit tous deux
    en accent — à l'écran, deux paires jumelles qui n'ont rien à voir.

    Les deux premières reprennent la couleur du BOUTON de leur mode sur
    l'accueil : le rouge du cadavre écrit, le bleu du dessiné. On reconnaît
    la rubrique avant de lire son nom. Les deux accents suivants de
    l'ambiance vont aux deux modes qui n'ont pas de bouton coloré.

    L'ENCRIER garde l'encre, et c'est le seul choix qui n'est pas arbitraire :
    c'est son nom.
  */
  const COULEURS: Record<string, string> = {
    ecrit:   accent,
    dessine: second,
    atelier: c?.tierce ?? encre,
    jour:    c?.quarte ?? second,
    encrier: encre,
  }

  const [ouvert, setOuvert] = useState<string[]>([])
  function toggle(id: string) {
    setOuvert(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate(-1)}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('RETOUR', 'BACK')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          {tr('— RÈGLES —', '— RULES —')}
        </div>

        {/* ── INTRO ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <div
            className="font-fraunces font-black leading-tight mb-3"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            {tr('Comment', 'How to')} <span style={{ color: accent }}>{tr('jouer', 'play')}</span>
          </div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65 }}>
            {tr("Le cadavre exquis est un jeu surréaliste inventé à Paris dans les années 1920. Chaque participant contribue à l'œuvre sans voir ce que les autres ont produit. Le résultat révélé est toujours une surprise.", 'The exquisite corpse is a surrealist game invented in Paris in the 1920s. Each participant contributes to the work without seeing what the others have produced. The revealed result is always a surprise.')}
          </p>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 8 }} />

        {/* ── ACCORDÉON ── */}
        {SECTIONS.map((section, si) => {
          const isOpen = ouvert.includes(section.id)
          const isEcrit = section.id === 'ecrit'
          const isAtelier = section.id === 'atelier'
          const isJour = section.id === 'jour'
          const isEncrier = section.id === 'encrier'
          const col = COULEURS[section.id]

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + si * 0.08 }}
            >
              {/* ── En-tête de section (toujours visible) ── */}
              <button
                onClick={() => toggle(section.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 0', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `0.5px solid ${encre}15`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <div
                    className="font-fraunces font-black"
                    style={{ fontSize: 'clamp(1.3rem, 5.5vw, 1.8rem)', color: col, lineHeight: 1 }}
                  >
                    {isEcrit ? tr('Cadavre Écrit', 'Written Cadavre')
                      : isAtelier ? tr("L'Atelier", 'The Workshop')
                      : isJour ? tr('Le poème du jour', 'The poem of the day')
                      : isEncrier ? tr("L'Encrier", 'The Inkwell')
                      : tr('Cadavre Dessiné', 'Drawn Cadavre')}
                  </div>
                </div>
                <span style={{
                  ...mono, fontSize: 17, lineHeight: 1, letterSpacing: 0, color: col, flexShrink: 0,
                  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `0.5px solid ${col}50`, borderRadius: 3,
                }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {/* ── Contenu dépliable ── */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ paddingTop: 16, paddingBottom: 8 }}>

                      {isEcrit && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            {tr("Chaque joueur écrit un fragment de phrase ou de vers, sans voir ce que l'autre a écrit. Le poème révélé à la fin est toujours une surprise.", 'Each player writes a fragment of a sentence or a line, without seeing what the other wrote. The poem revealed at the end is always a surprise.')}
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            {tr('— STRUCTURES —', '— STRUCTURES —')}
                          </div>
                          {STRUCTURES.map(s => (
                            <div key={s.romain} style={{ display: 'flex', gap: 14, paddingBottom: 12, borderBottom: `0.5px solid ${encre}10`, marginBottom: 12 }}>
                              <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, minWidth: 22 }}>{s.romain}.</span>
                              <div>
                                <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 17, color: encre, marginBottom: 2 }}>{s.label}</div>
                                <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.9, marginBottom: s.exemple ? 5 : 0 }}>{s.detail}</div>
                                {s.exemple && (
                                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75 }}>« {s.exemple} »</div>
                                )}
                              </div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            {tr('— VISIBILITÉ —', '— VISIBILITY —')}
                          </div>
                          {VISIBILITE.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            {tr('— MODES —', '— MODES —')}
                          </div>
                          {MODES.map(m => (
                            <div key={m.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{m.detail}</div>
                            </div>
                          ))}
                        </>
                      )}

                      {isAtelier && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            {tr("Un mode solo et expérimental. Tu convoques des voix IA et tu co-écris avec elles un poème dont tu ne vois jamais l'ensemble — ni le leur, ni le tien passé.", 'A solo, experimental mode. You summon AI voices and co-write a poem with them — one you never see in full: neither their lines, nor your own past ones.')}
                          </p>

                          {[
                            { label: tr('LE MÉDIUM', 'THE MEDIUM'), detail: tr('Tu ouvres le poème et tu le refermes. Entre ces deux moments, la main te revient à intervalles irréguliers — tous les deux à trois vers environ. Plus tu convoques de voix, plus tes retours se font fragments (un mot ou deux parmi une voix IA).', 'You open the poem and you close it. Between those two moments, the pen returns to you at irregular intervals — every two or three lines or so. The more voices you summon, the more your turns shrink to fragments (a word or two within an AI voice).') },
                            { label: tr('LES VOIX', 'THE VOICES'), detail: tr('Les voix IA complètent les vers entre tes tours. Tu choisis combien en convoquer — de 0 à 46. Plus elles sont nombreuses, plus ta présence dans le poème devient rare et fragmentaire.', 'The AI voices complete the lines between your turns. You choose how many to summon — from 0 to 46. The more of them there are, the rarer and more fragmentary your presence in the poem becomes.') },
                            { label: tr('SEUL (0 VOIX)', 'ALONE (0 VOICES)'), detail: tr('Sans voix convoquées, tu écris tous les vers toi-même, mais sans jamais relire ce que tu as produit. Le cadavre exquis se joue alors contre ta propre mémoire.', 'With no voices summoned, you write every line yourself, but without ever rereading what you have produced. The exquisite corpse is then played against your own memory.') },
                          ].map(item => (
                            <div key={item.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, marginBottom: 3 }}>{item.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{item.detail}</div>
                            </div>
                          ))}

                          <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10, marginTop: 16 }}>
                            {tr('— VISIBILITÉ —', '— VISIBILITY —')}
                          </div>
                          {[
                            { label: tr("L'ÉCHO", 'THE ECHO'), detail: tr('Le dernier mot du vers précédent est audible. Un fil ténu pour raccrocher la plume.', 'The last word of the previous line is audible. A thin thread to catch your pen on.') },
                            { label: tr('OBSCURITÉ', 'DARKNESS'), detail: tr('Tu écris dans le silence total. Aucun contexte — ni le tien, ni celui des voix.', 'You write in total silence. No context — neither yours, nor that of the voices.') },
                          ].map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}
                        </>
                      )}

                      {isJour && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            {tr(
                              'Chaque jour, un seul poème, écrit par toutes les mains qui passent. Tu en écris UN vers — et du vers précédent, tu ne vois que son dernier mot. Le poème se referme à minuit et se dévoile : tu découvres alors entre qui le sort t’a mis.',
                              'Each day, a single poem, written by every hand that passes. You write ONE line of it — and of the line before, you see only its last word. The poem closes at midnight and is revealed: you then discover between whom chance placed you.',
                            )}
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            {tr('— LA RÈGLE —', '— THE RULE —')}
                          </div>
                          {[
                            { label: tr('UNE MAIN, UN VERS', 'ONE HAND, ONE LINE'), detail: tr('Tu n’écris qu’une fois par jour. C’est ce qui fait que la longueur du poème compte les gens venus, et non les bavards.', 'You write only once a day. That is what makes the poem’s length count the people who came, not the talkative ones.') },
                            { label: tr('L’AMORCE', 'THE SEED'), detail: tr('Le premier à passer reçoit trois mots donnés par le jour — les mêmes pour tout le monde. Il ouvre le poème.', 'The first to pass receives three words given by the day — the same for everyone. They open the poem.') },
                            { label: tr('L’ÉCHO', 'THE ECHO'), detail: tr('Ensuite, chaque main ne voit que le dernier mot de celle qui précède. Assez pour s’accrocher, jamais assez pour diriger.', 'After that, each hand sees only the last word of the one before. Enough to hold on to, never enough to steer.') },
                            { label: tr('LE SCELLEMENT', 'THE SEALING'), detail: tr('À minuit le poème se ferme. S’il a reçu moins de cinq vers, des voix le complètent — elles aussi n’ont vu qu’un mot.', 'At midnight the poem closes. If it received fewer than five lines, voices complete it — they too saw only one word.') },
                          ].map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: encre, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <button
                            onClick={() => navigate('/poeme-du-jour')}
                            style={{
                              width: '100%', marginTop: 18,
                              ...mono, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase',
                              background: 'transparent', color: encre,
                              border: `0.5px solid ${encre}40`, borderRadius: 3,
                              padding: '0.85em 1em', cursor: 'pointer',
                            }}
                          >
                            {tr('Donner ma main aujourd’hui', 'Give my hand today')} →
                          </button>
                        </>
                      )}

                      {isEncrier && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            {tr(
                              'Le jeu est gratuit et entier. Trois gestes seulement appellent une machine qui coûte de l’argent réel : c’est l’encrier qui les compte, et lui seul. Tout le reste est sans limite, et le restera.',
                              'The game is free and whole. Only three acts call a machine that costs real money: the inkwell counts those, and nothing else. Everything else is without limit, and will stay so.',
                            )}
                          </p>

                          {ENCRIER.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, lineHeight: 1.7, marginTop: 16 }}>
                            {tr(
                              'Aucune publicité, aucun pisteur, aucune donnée vendue. Le prix, lui, est celui qu’affiche ton magasin au moment de l’achat.',
                              'No advertising, no trackers, no data sold. The price is the one your store shows at the moment of purchase.',
                            )}
                          </p>
                        </>
                      )}

                      {!isEcrit && !isAtelier && !isJour && !isEncrier && (
                        <>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, lineHeight: 1.65, opacity: 0.88, marginBottom: 20 }}>
                            {tr('La variante graphique. Chaque joueur dessine une portion du corps sur une bande horizontale, sans voir les fragments voisins. Le monstre révélé à la fin est interprété par une intelligence artificielle en vers surréalistes.', 'The graphic variant. Each player draws a portion of the body on a horizontal band, without seeing the neighbouring fragments. The monster revealed at the end is interpreted by an artificial intelligence in surrealist verse.')}
                          </p>

                          <div style={{ ...mono, fontSize: 13, color: second, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
                            {tr('— RACCORD —', '— JOIN —')}
                          </div>
                          {RACCORD_DESSIN.map(v => (
                            <div key={v.label} style={{ paddingBottom: 10, borderBottom: `0.5px solid ${encre}10`, marginBottom: 10 }}>
                              <div style={{ ...mono, fontSize: 13, color: second, fontWeight: 700, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: encre, opacity: 0.85 }}>{v.detail}</div>
                            </div>
                          ))}

                          <div style={{ borderLeft: `1.5px solid ${encre}40`, paddingLeft: 12, marginTop: 20, marginBottom: 8 }}>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, lineHeight: 1.5, color: encre, opacity: 0.82, marginBottom: 4 }}>
                              {tr('« Le cadavre exquis boira le vin nouveau »', '“The exquisite corpse will drink the new wine”')}
                            </div>
                            <div style={{ ...mono, fontSize: 13, color: second, opacity: 0.7, letterSpacing: '0.14em' }}>
                              BRETON, ÉLUARD, MORISE, MAN RAY · 1925
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {/* ── CTA ── */}
        <motion.div
          className="mt-6 mb-3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/config')}
              style={{
                flex: 1, background: accent, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer',
              }}
            >
              {tr('Cadavre Écrit', 'Written Cadavre')} →
            </button>
            <button
              onClick={() => navigate('/config-dessin')}
              style={{
                flex: 1, background: second, color: btnText,
                ...mono, fontSize: 15, textTransform: 'uppercase',
                padding: '1em 0.5em', border: 'none', cursor: 'pointer',
              }}
            >
              {tr('Cadavre Dessiné', 'Drawn Cadavre')} →
            </button>
          </div>
        </motion.div>

      </div>
    </PageTransition>
  )
}
