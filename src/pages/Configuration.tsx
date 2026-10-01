import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SectionAide from '../components/SectionAide'
import { useSound } from '../hooks/useSound'
import { Decor, useReve } from '../reve'
import type { ConfigPartie, StructureId, Visibilite } from '../types'
import { mono } from '../lib/typo'
import { groupeRadio, optionRadio } from '../lib/a11y'
import { tr, langueActuelle } from '../i18n'
import MurAbonnement from '../components/MurAbonnement'
import SoldeEncrier from '../components/SoldeEncrier'
import type { Refus } from '../lib/acces'
import { ouvrirTable } from '../lib/lancerTable'
import NomsDesMains from '../components/NomsDesMains'
import {
  CLE_TABLE, NB_SIEGES, lireTable, nomsDesMains, nettoyerNom,
  type Siege, type TableRetenue,
} from '../lib/table'

const STRUCTURES_UI_FR: { id: StructureId; romain: string; label: string; description: string; detail: string }[] = [
  { id: 'phrase-simple',  romain: 'I',   label: 'Phrase courte',  description: '3 cases · sujet, verbe, complément', detail: 'La forme la plus directe — une phrase surréaliste en trois fragments.' },
  { id: 'phrase-etoffee', romain: 'II',  label: 'Phrase étoffée', description: '5 cases · la canonique de Breton',  detail: 'La structure originale inventée en 1925 : « Le cadavre exquis boira le vin nouveau » — article+nom · adjectif · verbe · article+nom · adjectif.' },
  { id: 'vers-libre',     romain: 'III', label: 'Vers libre',     description: '4 à 12 vers · sans contrainte',     detail: 'Chaque joueur écrit un vers entier. Le poème s\'assemble sans règle grammaticale.' },
]
const STRUCTURES_UI_EN: typeof STRUCTURES_UI_FR = [
  { id: 'phrase-simple',  romain: 'I',   label: 'Short sentence', description: '3 parts · subject, verb, object', detail: 'The most direct form — one surrealist sentence in three fragments.' },
  { id: 'phrase-etoffee', romain: 'II',  label: 'Full sentence',  description: "5 parts · Breton's canonical form", detail: 'The original 1925 structure: "The exquisite corpse shall drink the new wine" — article+adjective · noun · verb · article+adjective · noun.' },
  { id: 'vers-libre',     romain: 'III', label: 'Free verse',     description: '4 to 12 lines · no constraint',   detail: 'Each player writes a whole line. The poem assembles with no grammatical rule.' },
]
const STRUCTURES = langueActuelle() === 'en' ? STRUCTURES_UI_EN : STRUCTURES_UI_FR

type SlotType = Siege

const CONFIG_PAR_DEFAUT: ConfigPartie = {
  structureId: 'phrase-etoffee',
  visibilite: 'aveugle',
  // Le joueur ouvre : sa deuxième partie commençait par « La voix parle… »,
  // écran sans bouton, et il n'écrivait plus que 2 fragments sur 5.
  premierJoueur: 'humain',
  mode: 'standard',
  joueursHumains: 1,
  voixIA: 1,
}

/**
 * La dernière table, si elle est lisible — sinon la table par défaut.
 *
 * On ne reprend une règle retenue que si elle existe encore : une structure
 * renommée d'une version à l'autre ne doit pas ouvrir des préparatifs où
 * aucune carte n'est cochée.
 */
function tableDeDepart(): { sieges: SlotType[]; noms: string[]; config: ConfigPartie } {
  let t: TableRetenue | null = null
  try { t = lireTable(localStorage.getItem(CLE_TABLE)) } catch { /* stockage indisponible */ }
  const config: ConfigPartie = { ...CONFIG_PAR_DEFAUT }
  if (t) {
    if (STRUCTURES.some(s => s.id === t!.structureId)) config.structureId = t.structureId as StructureId
    if (['aveugle', 'dernier-mot', 'derniere-case'].includes(t.visibilite ?? '')) config.visibilite = t.visibilite as Visibilite
    if (t.mode === 'standard' || t.mode === 'hypnotique') config.mode = t.mode
    if (t.premierJoueur === 'humain' || t.premierJoueur === 'ia') config.premierJoueur = t.premierJoueur
    config.joueursHumains = t.sieges.filter(s => s === 'humain').length
    config.voixIA = t.sieges.filter(s => s === 'ia').length
    return { sieges: t.sieges, noms: t.noms, config }
  }
  const h = CONFIG_PAR_DEFAUT.joueursHumains
  const ia = CONFIG_PAR_DEFAUT.voixIA
  const sieges: SlotType[] = Array(NB_SIEGES).fill('vide') as SlotType[]
  for (let i = 0; i < h && i < NB_SIEGES; i++) sieges[i] = 'humain'
  for (let i = h; i < h + ia && i < NB_SIEGES; i++) sieges[i] = 'ia'
  return { sieges, noms: Array(NB_SIEGES).fill(''), config }
}

function descriptionTable(humains: number, ia: number): string {
  if (langueActuelle() === 'en') {
    const mains = humains === 1 ? '1 hand' : `${humains} hands`
    if (ia === 0) return `${mains} — the séance can begin.`
    const voix = ia === 1 ? '1 voice' : `${ia} voices`
    return `${mains}, ${voix} — the séance can begin.`
  }
  const mains = humains === 1 ? '1 main' : `${humains} mains`
  if (ia === 0) return `${mains} — la séance peut commencer.`
  const voix = ia === 1 ? '1 voix' : `${ia} voix`
  return `${mains}, ${voix} — la séance peut commencer.`
}

export default function Configuration() {
  const navigate = useNavigate()
  const { jouer } = useSound()
  const seance = useReve()

  // La table se retrouve d'une partie à l'autre : avant, les préparatifs
  // repartaient toujours de « 1 main, 1 voix », et une famille de quatre
  // recomposait la sienne siège par siège à chaque partie de la soirée.
  const [depart] = useState(tableDeDepart)
  const [slots, setSlots] = useState<SlotType[]>(depart.sieges)
  // Un prénom par SIÈGE : un siège qui devient voix puis redevient main
  // retrouve le sien, et les autres ne se décalent pas.
  const [noms, setNoms] = useState<string[]>(depart.noms)

  const [config, setConfig] = useState<ConfigPartie>(depart.config)
  const [refus, setRefus] = useState<Refus | null>(null)
  const [ouverture, setOuverture] = useState(false)

  const joueursHumains = Math.max(1, slots.filter(s => s === 'humain').length)
  const voixIA = slots.filter(s => s === 'ia').length

  useEffect(() => {
    setConfig(prev => ({ ...prev, joueursHumains, voixIA }))
  }, [joueursHumains, voixIA])

  function cyclerSlot(i: number) {
    setSlots(prev => {
      const next = [...prev] as SlotType[]
      const cycle: SlotType[] = ['vide', 'humain', 'ia']
      const currentIdx = cycle.indexOf(next[i])
      const nextType = cycle[(currentIdx + 1) % 3]
      // Prevent removing the last human
      if (next[i] === 'humain' && prev.filter(s => s === 'humain').length <= 1) return prev
      next[i] = nextType
      return next
    })
  }

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''

  // Les sièges humains, de gauche à droite : c'est l'ordre dans lequel
  // `buildSequence` numérote les mains, donc celui des prénoms.
  const siegesHumains = slots.flatMap((s, i) => (s === 'humain' ? [i] : []))

  async function demarrer() {
    jouer('demarrage')
    if (ouverture) return

    // Seul, on n'a de nom pour personne : la couture dira « toi ».
    const table: ConfigPartie = {
      ...config, joueursHumains, voixIA,
      ...(joueursHumains > 1 ? { noms: nomsDesMains(slots, noms) } : {}),
    }
    try {
      const retenue: TableRetenue = {
        sieges: slots, noms: noms.map(nettoyerNom),
        structureId: config.structureId, visibilite: config.visibilite,
        mode: config.mode, premierJoueur: config.premierJoueur,
      }
      localStorage.setItem(CLE_TABLE, JSON.stringify(retenue))
    } catch { /* stockage plein ou interdit : la partie se joue quand même */ }

    // Une partie où l'IA écrit se règle à son ouverture — jamais en cours de
    // route. `ouvrirTable` est la même porte que « la même table » en fin de
    // partie : un raccourci ne contourne pas l'encrier.
    if (voixIA > 0) setOuverture(true)
    const refuse = await ouvrirTable(table)
    setOuverture(false)
    if (refuse) { setRefus(refuse); return }
    navigate('/jeu')
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="config" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('SORTIR', 'EXIT')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── SECTION LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 24, marginBottom: 8 }}>
          {tr('— PRÉPARATIFS —', '— PREPARATIONS —')}
        </div>

        {/* ── TITLE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div
            className="font-fraunces font-black leading-tight"
            style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, marginBottom: 18 }}
          >
            {tr('Choisir la', 'Choose the')}{' '}
            <span style={{ color: accent }}>{tr('structure', 'structure')}</span>
          </div>
        </motion.div>

        {/* ── STRUCTURE CARDS ── */}
        <div className="flex flex-col gap-2 mb-8" {...groupeRadio(tr('Structure du poème', 'Poem structure'))}>
          {STRUCTURES.map((s, i) => {
            const active = config.structureId === s.id
            return (
              <motion.button
                key={s.id}
                {...optionRadio(active, `${s.label} — ${s.description}`)}
                onClick={() => setConfig(prev => ({ ...prev, structureId: s.id }))}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '16px 16px',
                  background: active ? `${accent}12` : 'transparent',
                  border: `0.5px solid ${active ? accent : `${encre}20`}`,
                  borderLeft: `3px solid ${active ? accent : 'transparent'}`,
                  borderRadius: 3,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 24, lineHeight: 1, color: accent, minWidth: 40, paddingTop: 1 }}>
                  {s.romain}.
                </span>
                <div>
                  <div style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 19, color: encre, marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.60 }}>{s.description}</div>
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* ── VISIBILITÉ ── */}
        <div style={{ marginBottom: 18 }}>
          <SectionAide
            label={tr('VISIBILITÉ', 'VISIBILITY')} accent={accent} encre={encre}
            aide={<>{tr("Aveugle : tu écris sans rien voir des autres. Un mot : seul le dernier mot précédent t'est montré. Une case : toute la case précédente est révélée.", 'Blind: you write without seeing anything. One word: only the previous last word is shown. One part: the whole previous part is revealed.')}</>}
          />
          <div className="flex gap-2" {...groupeRadio(tr('Visibilité', 'Visibility'))}>
            {(['aveugle', 'dernier-mot', 'derniere-case'] as Visibilite[]).map(v => {
              const active = config.visibilite === v
              return (
                <button
                  key={v}
                  {...optionRadio(active)}
                  onClick={() => setConfig(c => ({ ...c, visibilite: v }))}
                  style={{
                    flex: 1, padding: '8px 4px', minHeight: 44,
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {v === 'aveugle' ? tr('AVEUGLE', 'BLIND') : v === 'dernier-mot' ? tr('UN MOT', 'ONE WORD') : tr('UNE CASE', 'ONE PART')}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── AUTOUR DE LA TABLE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ marginBottom: 18 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 12 }}>
            {tr('— AUTOUR DE LA TABLE —', '— AROUND THE TABLE —')}
          </div>
          {/* Six sièges de 44 et cinq écarts de 8 font 304 points : à 320,
              il en reste 288, et le sixième siège sortait du cadre. Les
              écarts se resserrent au besoin, le siège ne rétrécit jamais. */}
          <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 304, gap: 4, marginBottom: 12 }}>
            {slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => cyclerSlot(i)}
                aria-label={slot === 'vide' ? tr('Ajouter un joueur', 'Add a player') : slot === 'humain' ? `${tr('Joueur humain', 'Human player')}${nettoyerNom(noms[i] ?? '') ? `, ${nettoyerNom(noms[i])}` : ''} — ${tr('changer', 'change')}` : tr('Voix IA — changer', 'AI voice — change')}
                style={{
                  width: 44, height: 44, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `0.5px solid ${slot === 'vide' ? `${encre}20` : slot === 'humain' ? encre : accent}`,
                  background: slot === 'vide' ? 'transparent' : slot === 'humain' ? `${encre}10` : `${accent}10`,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                  fontSize: 20,
                  borderRadius: 3,
                }}
              >
                {slot === 'vide' && (
                  <span style={{ color: `${encre}20`, fontSize: 14 }}>·</span>
                )}
                {/* Le siège garde son carré, nommé ou non. Une initiale y
                    avait été posée pour relier le siège à sa ligne de
                    prénom ; mais « Marie-Christine » et « Maximilien »
                    portaient toutes deux « M », et un repère qui ne
                    départage pas ne relie rien. Les lignes de prénoms
                    suivent l'ordre des sièges, « MAIN I », « MAIN II ». */}
                {slot === 'humain' && (
                  <span style={{
                    display: 'block', width: 10, height: 10,
                    background: encre, borderRadius: 1,
                  }} />
                )}
                {slot === 'ia' && (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key="ia"
                      animate={{ opacity: [0.55, 1, 0.55] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ color: accent, display: 'inline-block' }}
                    >✦</motion.span>
                  </AnimatePresence>
                )}
              </button>
            ))}
          </div>
          <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.55, marginBottom: 8, letterSpacing: '0.08em' }}>
            <span style={{ display: 'inline-block', width: 9, height: 9, background: encre, borderRadius: 1, verticalAlign: 'middle', marginRight: 4 }} />
            {tr('une main', 'one hand')} · <span style={{ color: accent }}>✦</span> {tr('une voix IA — toucher une case pour changer', 'one AI voice — tap a seat to change')}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.80, fontStyle: 'italic', lineHeight: 1.55 }}>
            {descriptionTable(joueursHumains, voixIA)}
          </div>

          {/*
            Les prénoms — à plusieurs seulement. Seul, il n'y a personne à
            appeler et la couture dit « toi ».
          */}
          {joueursHumains > 1 && (
            <NomsDesMains
              sieges={siegesHumains} noms={noms}
              onNom={(siege, v) => setNoms(prev => prev.map((n, j) => (j === siege ? v : n)))}
              encre={encre} accent={accent}
            />
          )}
        </motion.div>

        {/* ── PREMIER JOUEUR — uniquement solo avec IA ── */}
        {voixIA > 0 && joueursHumains === 1 && (
          <div style={{ marginBottom: 18 }}>
            <SectionAide
              label={tr('OUVRE LA SÉANCE', 'OPENS THE SÉANCE')} accent={accent} encre={encre}
              aide={<>{tr("Qui écrit le premier fragment — et donc un fragment sur deux. Si la voix ouvre, tu la regardes écrire avant ton tour ; si tu ouvres, elle répond à ce que tu as posé.", 'Who writes the first fragment — and therefore every other one. If the voice opens, you watch it write before your turn; if you open, it answers what you laid down.')}</>}
            />
            <div className="flex gap-2">
              {(['ia', 'humain'] as const).map(p => {
                const active = config.premierJoueur === p
                return (
                  <button
                    key={p}
                    onClick={() => setConfig(c => ({ ...c, premierJoueur: p }))}
                    style={{
                      flex: 1, padding: '8px 4px', minHeight: 44,
                      border: `0.5px solid ${active ? accent : `${encre}20`}`,
                      borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                      borderRadius: 3,
                      background: 'transparent', cursor: 'pointer',
                      ...mono, fontSize: 13,
                      color: active ? accent : `${encre}80`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {p === 'ia' ? tr('VOIX IA', 'AI VOICE') : tr('JOUEUR', 'PLAYER')}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MODE ── */}
        <div style={{ marginBottom: 18 }}>
          <SectionAide
            label={tr('MODE', 'MODE')} accent={accent} encre={encre}
            aide={<>{tr("Standard : prends le temps qu'il faut pour chaque fragment. Hypnotique : 30 secondes par fragment, puis il se scelle de lui-même — l'écriture automatique, sans retour.", 'Standard: take all the time you need. Hypnotic: 30 seconds per fragment, then it seals itself — automatic writing, no going back.')}</>}
          />
          <div className="flex gap-2" {...groupeRadio(tr('Mode de jeu', 'Game mode'))}>
            {(['standard', 'hypnotique'] as const).map(m => {
              const active = config.mode === m
              return (
                <button
                  key={m}
                  {...optionRadio(active)}
                  onClick={() => setConfig(c => ({ ...c, mode: m }))}
                  style={{
                    flex: 1, padding: '8px 4px', minHeight: 44,
                    border: `0.5px solid ${active ? accent : `${encre}20`}`,
                    borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                    borderRadius: 3,
                    background: 'transparent', cursor: 'pointer',
                    ...mono, fontSize: 13,
                    color: active ? accent : `${encre}80`,
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'standard' ? tr('STANDARD', 'STANDARD') : tr('HYPNOTIQUE', 'HYPNOTIC')}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/*
          Le solde AVANT le bouton et non sous lui : le bouton est collant,
          une ligne posée sous lui flotterait par-dessus le texte qui défile.
          Il n'apparaît que si une voix est convoquée — une table sans voix
          n'appelle rien et ne coûte rien.
        */}
        {voixIA > 0 && (
          <SoldeEncrier acte="partie_ia" encre={encre} accent={accent} style={{ marginBottom: 8 }} />
        )}

        {/* ── CTA — sticky pour rester accessible même en bas de page ── */}
        <motion.div
          className="mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileTap={{ scale: 0.98 }}
          style={{ position: 'sticky', bottom: 8 }}
        >
          <button
            onClick={demarrer}
            disabled={ouverture}
            className="w-full flex flex-col items-center justify-center"
            style={{
              background: accent, color: btnText,
              ...mono, fontSize: 17,
              textTransform: 'uppercase',
              padding: '1.15em 1em',
              border: 'none', cursor: ouverture ? 'default' : 'pointer',
              gap: 2,
              borderRadius: 3,
              opacity: ouverture ? 0.7 : 1,
            }}
          >
            <span>{tr('Commencer la séance', 'Begin the séance')}</span>
            <span aria-hidden style={{ fontSize: 17, opacity: 0.85 }}>→</span>
          </button>
        </motion.div>

      </div>

      <MurAbonnement
        visible={refus !== null}
        acte={refus?.acte ?? 'partie_ia'}
        motif={refus?.motif ?? 'essai_epuise'}
        plafond={refus?.plafond}
        onFermer={() => setRefus(null)}
        onEncrierRempli={() => { setRefus(null); demarrer() }}
        accent={accent} encre={encre} bg={seance?.ambiance.bg ?? '#f0e4cc'}
      />
    </PageTransition>
  )
}
