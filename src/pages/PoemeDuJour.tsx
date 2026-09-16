import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase } from '../lib/supabase'
import { useSound } from '../hooks/useSound'
import { getStructure, reconstruirePoeme } from '../structures'
import { mono } from '../lib/typo'
import { libelleMorceaux } from '../lib/attribution'
import { tr, langueActuelle } from '../i18n'
import { contrainteDuJour, jourLocal } from '../lib/contrainteDuJour'
import { ouvrirRituel, rituelDuJourFait } from '../lib/rituel'
import { lireSerie } from '../utils/streak'
import MurAbonnement from '../components/MurAbonnement'
import SoldeEncrier from '../components/SoldeEncrier'
import { ouvrirPartieIA, nouvellePartieId, deposerRecu, type Refus } from '../lib/acces'

/**
 * Le cadavre du jour.
 *
 * ── Ce que cette page était ───────────────────────────────────────────────
 *
 * Une page de LECTURE : elle prenait les quatre-vingt-dix dernières
 * publications de la galerie et en désignait une par `dayOfYear() % n`. Sur
 * un stock de quarante pièces dont aucune depuis le 18 juillet, cela
 * revenait à ressortir un poème de l'été tous les quarante jours et à
 * l'appeler « poème du jour ». C'était un musée, pas un rendez-vous.
 *
 * ── Ce qu'elle est ────────────────────────────────────────────────────────
 *
 * Un rendez-vous, dans cet ordre : la contrainte, ta main, puis les autres.
 * On écrit d'abord et on lit ensuite — l'inverse donnerait la réponse avant
 * la question, et un cadavre exquis dont on a lu les voisins n'est plus un
 * cadavre exquis.
 *
 * Les poèmes montrés sont ceux du JOUR MÊME. Quand il n'y en a pas encore,
 * la page le dit et invite, au lieu de meubler avec un ancien : un rendez-vous
 * vide est une invitation, un rendez-vous truqué est une déception qu'on
 * découvre plus tard.
 */

interface PoemeCase { texte: string }
interface PoemePayload { cases: PoemeCase[]; structureId: string; langue?: string }

interface GalleryItem {
  id: string
  titre: string | null
  payload: string
  author_pseudo: string
  created_at: string
}

function toRomain(n: number): string {
  const map: [number, string][] = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
    [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
  ]
  return map.reduce((r, [v, s]) => { while (n >= v) { r += s; n -= v } return r }, '')
}

export default function PoemeDuJour() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const bg = seance?.ambiance.bg ?? '#f0e4cc'

  const [contrainte] = useState(() => contrainteDuJour())
  const [fait] = useState(() => rituelDuJourFait())
  const [serie] = useState(() => lireSerie())
  const [autres, setAutres] = useState<GalleryItem[] | null>(null)
  const [refus, setRefus] = useState<Refus | null>(null)
  const [ouverture, setOuverture] = useState(false)

  const structure = getStructure(contrainte.structureId)
  const nomStructure = structure.nom
  // « VII cases » était faux : en vers libre une case EST un vers, et c'est
  // précisément ce que `libelleMorceaux` sait dire depuis le lot 9.
  const morceaux = libelleMorceaux(contrainte.structureId, contrainte.nbCases).toLowerCase()

  useEffect(() => {
    let vivant = true
    ;(async () => {
      // Le jour même, et rien d'autre. `jourLocal` borne au fuseau du joueur :
      // un poème publié hier soir à 23 h 50 n'est pas celui d'aujourd'hui.
      const debut = new Date()
      debut.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('gallery')
        .select('id,titre,payload,author_pseudo,created_at')
        .eq('type', 'poeme')
        .gte('created_at', debut.toISOString())
        .order('created_at', { ascending: false })
        .limit(30)
      if (!vivant) return
      const tous = (data ?? []) as GalleryItem[]
      setAutres(tous.filter(it => {
        try {
          const l = (JSON.parse(it.payload) as PoemePayload).langue === 'en' ? 'en' : 'fr'
          return l === langueActuelle()
        } catch { return langueActuelle() === 'fr' }
      }))
    })().catch(() => { if (vivant) setAutres([]) })
    return () => { vivant = false }
  }, [])

  // Le cadavre du jour convoque des voix : il se règle à son ouverture comme
  // toute partie avec IA, jamais en cours de route. Registre injoignable :
  // on laisse passer, comme partout ailleurs.
  async function ecrire() {
    if (ouverture) return
    jouer('demarrage')
    setOuverture(true)
    const partieId = nouvellePartieId()
    const refuse = await ouvrirPartieIA(partieId, 'jour')
    setOuverture(false)
    if (refuse) { setRefus(refuse); return }
    deposerRecu(partieId)
    navigate(ouvrirRituel(contrainte))
  }

  function texteDe(it: GalleryItem): string {
    try {
      const p = JSON.parse(it.payload) as PoemePayload
      const s = getStructure(p.structureId)
      return reconstruirePoeme(
        p.cases.map((x, i) => ({
          numero: i + 1, fonction: '', consigne: '', auteur: 'humain' as const, texte: x.texte, ts: 0,
        })), s)
    } catch { return it.payload }
  }

  return (
    <PageTransition className="page-carnet flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="aide" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── EN-TÊTE ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← {tr('ACCUEIL', 'HOME')}
          </button>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.1em' }}>
            {tr('CADAVRE DU JOUR', 'CADAVRE OF THE DAY')}
          </span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LA CONTRAINTE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginTop: 26 }}
        >
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            {tr('— LA CONTRAINTE —', '— TODAY’S CONSTRAINT —')}
          </div>

          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.8, marginBottom: 14, lineHeight: 1.5 }}>
            {tr(
              `Tout le monde part du même mot aujourd’hui. Tu écris la suite sans jamais te relire — ${nomStructure.toLowerCase()}, ${morceaux}.`,
              `Everyone starts from the same words today. You write the rest without ever rereading — ${nomStructure.toLowerCase()}, ${morceaux}.`,
            )}
          </div>

          {/* L'amorce, donnée telle quelle — c'est elle, le rendez-vous. */}
          <div
            style={{
              borderLeft: `2px solid ${accent}`,
              paddingLeft: 14, paddingTop: 4, paddingBottom: 4,
              marginBottom: 8,
            }}
          >
            <div
              className="font-fraunces font-black leading-tight"
              style={{ fontSize: 'clamp(1.7rem, 7vw, 2.4rem)', color: accent }}
            >
              {contrainte.amorce}
            </div>
          </div>
          <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5, letterSpacing: '0.14em' }}>
            {tr(
              `DONNÉ À TOUS · ${contrainte.voixIA === 1 ? 'UNE VOIX T’ACCOMPAGNE' : `${toRomain(contrainte.voixIA)} VOIX T’ACCOMPAGNENT`}`,
              `GIVEN TO ALL · ${contrainte.voixIA === 1 ? 'ONE VOICE JOINS YOU' : `${contrainte.voixIA} VOICES JOIN YOU`}`,
            )}
          </div>
        </motion.div>

        <div style={{ flex: 1, minHeight: 20 }} />

        {/* ── TA MAIN ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 6 }}
        >
          {fait ? (
            <>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18, color: encre, opacity: 0.8, marginBottom: 12, textAlign: 'center' }}>
                {serie.compte >= 2
                  ? tr(`Ton cadavre du jour est écrit — ${toRomain(serie.compte)}ᵉ jour de suite.`,
                       `Today’s cadavre is written — ${serie.compte} days in a row.`)
                  : tr('Ton cadavre du jour est écrit.', 'Today’s cadavre is written.')}
              </div>
              <button
                onClick={() => { jouer('clic'); navigate('/bibliotheque') }}
                style={{
                  width: '100%', ...mono, fontSize: 14, letterSpacing: '0.12em',
                  background: 'transparent', color: encre,
                  border: `0.5px solid ${encre}30`, borderRadius: 3,
                  padding: '0.9em 1em', cursor: 'pointer',
                }}
              >
                {tr('LE RELIRE DANS LE RECUEIL', 'REREAD IT IN THE COLLECTION')} →
              </button>
            </>
          ) : (
            <>
              <button
                onClick={ecrire}
                disabled={ouverture}
                style={{
                  width: '100%', background: encre, color: bg,
                  ...mono, fontSize: 16, letterSpacing: '0.12em', textTransform: 'uppercase',
                  padding: '0.9em 1em', border: 'none', borderRadius: 3,
                  cursor: ouverture ? 'default' : 'pointer', opacity: ouverture ? 0.7 : 1,
                }}
              >
                {tr('Écrire le cadavre du jour', 'Write today’s cadavre')} ✧
              </button>
              {/* Le solde sous le bouton, comme partout où une voix se paie :
                  le joueur apprenait la limite au refus. */}
              <SoldeEncrier acte="partie_ia" encre={encre} accent={accent} style={{ marginTop: 8 }} />
            </>
          )}
        </motion.div>

        {/* ── LES AUTRES MAINS — après la tienne, jamais avant ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ marginTop: 22 }}
        >
          <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.14, marginBottom: 14 }} />
          <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            {tr('— LES AUTRES MAINS, AUJOURD’HUI —', '— OTHER HANDS, TODAY —')}
          </div>

          {autres === null && (
            <div style={{ ...mono, fontSize: 13, color: encre, opacity: 0.45 }}>
              {tr('LECTURE…', 'READING…')}
            </div>
          )}

          {autres?.length === 0 && (
            <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 17, color: encre, opacity: 0.65, lineHeight: 1.5 }}>
              {fait
                ? tr('Personne d’autre n’a encore publié aujourd’hui. Reviens ce soir.',
                     'No one else has published today. Come back tonight.')
                : tr('Personne n’a encore écrit aujourd’hui. La première main est la tienne.',
                     'No one has written today. The first hand is yours.')}
            </div>
          )}

          {autres?.map((it, i) => (
            <div key={it.id} style={{ marginBottom: 16, paddingBottom: 14, borderBottom: i < autres.length - 1 ? `0.5px solid ${encre}14` : 'none' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18, color: encre, lineHeight: 1.55, whiteSpace: 'pre-line', marginBottom: 6 }}>
                {texteDe(it)}
              </div>
              <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5, letterSpacing: '0.1em' }}>
                {it.author_pseudo.toUpperCase()}
              </div>
            </div>
          ))}

          {!!autres?.length && (
            <button
              onClick={() => { jouer('clic'); navigate('/galerie') }}
              style={{ ...mono, fontSize: 13, color: encre, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0' }}
            >
              {tr('TOUTE LA GALERIE', 'THE WHOLE GALLERY')} →
            </button>
          )}
        </motion.div>

        <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.35, letterSpacing: '0.12em', marginTop: 8 }}>
          {jourLocal()}
        </div>
      </div>

      <MurAbonnement
        visible={refus !== null}
        acte={refus?.acte ?? 'partie_ia'}
        motif={refus?.motif ?? 'essai_epuise'}
        plafond={refus?.plafond}
        onFermer={() => setRefus(null)}
        onAbonne={() => { setRefus(null); ecrire() }}
        accent={accent} encre={encre} bg={bg}
      />
    </PageTransition>
  )
}
