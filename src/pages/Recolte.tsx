import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import {
  chargerRecolte, deplacerDansLaRecolte, mettreEnTeteDeLaRecolte, relierEnFeuillet, retirerDeLaRecolte,
  viderLaRecolte, type VersRecolte,
} from '../db'
import { mono } from '../lib/typo'
import { PLANCHER_FEUILLET, basculerChoix, deplacerChoix, mettreEnTete, provenanceDuVers, titreTraduit } from '../lib/reliure'
import { attributionSignee, nomAffiche } from '../lib/attribution'
import { emporterFichier } from '../lib/emporter'
import { tr, langueActuelle } from '../i18n'

/**
 * Le carnet — les vers gardés, à travers toutes les séances.
 *
 * C'est la pièce qui manquait pour qu'un recueil soit possible. Le moteur
 * produit la matière ; il n'y avait pas de panier. On relisait dix-huit vers
 * gardables dans une capture d'écran, et ils disparaissaient avec la séance.
 *
 * Trois gestes, pas un de plus : garder (dans les coutures), ordonner ici,
 * emporter. L'ordre est celui du médium et non celui des dates — un recueil
 * ne se range pas chronologiquement, il se compose.
 *
 * ── Composer ──────────────────────────────────────────────────────────────
 *
 * Il manquait le geste qui donne son sens au carnet : faire un poème de ses
 * vers. Les flèches ne déplacent que d'un rang, et la seule sortie était un
 * fichier. « COMPOSER » ouvre un second régime : on touche les vers dans
 * l'ordre du poème, on relit le feuillet, on le relie au recueil
 * (`lib/composition.ts`). Deux temps et non un, parce que relire est le
 * moment où l'on voit le poème pour la première fois d'un seul tenant — et
 * où l'on corrige l'ordre qu'on avait cru juste en touchant.
 */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(tr('fr-FR', 'en-GB'), {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** La signature gardée, relue dans la langue courante — comme le feuillet la relira. */
function signatureLue(signature: string): string {
  const { texte, voix } = attributionSignee(signature)
  return [texte, ...voix.map(nomAffiche)].join(' · ')
}

/** Le carnet en texte nu — un vers par ligne, rien d'autre. */
function enTexte(vers: VersRecolte[]): string {
  return vers.map(v => v.texte).join('\n')
}

export default function Recolte() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const [vers, setVers] = useState<VersRecolte[]>([])
  const [chargement, setChargement] = useState(true)
  const [copie, setCopie] = useState(false)
  const [provenances, setProvenances] = useState(false)
  // 'carnet' : le carnet tel qu'il était. 'choix' : on touche les vers.
  // 'relecture' : le feuillet d'un seul tenant, avant de le relier.
  const [regime, setRegime] = useState<'carnet' | 'choix' | 'relecture'>('carnet')
  const [choix, setChoix] = useState<string[]>([])
  const [reliure, setReliure] = useState(false)
  const [echecReliure, setEchecReliure] = useState(false)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const fond = seance?.ambiance.bg ?? '#f0e4cc'
  const texteBouton = seance?.ambiance.buttonText ?? '#0f0805'

  useEffect(() => {
    chargerRecolte()
      .then(setVers)
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [])

  async function deplacer(id: string, sens: -1 | 1) {
    jouer('clic')
    await deplacerDansLaRecolte(id, sens)
    setVers(await chargerRecolte())
  }

  async function enTete(id: string) {
    jouer('clic')
    await mettreEnTeteDeLaRecolte(id)
    setVers(await chargerRecolte())
  }

  async function retirer(id: string) {
    jouer('clic')
    await retirerDeLaRecolte(id)
    setVers(await chargerRecolte())
  }

  function composer() {
    jouer('clic')
    setChoix([])
    setRegime('choix')
  }

  function abandonner() {
    jouer('clic')
    setChoix([])
    setRegime('carnet')
  }

  function toucher(id: string) {
    jouer('clic')
    setChoix(ch => basculerChoix(ch, id))
  }

  /** Relie le feuillet et l'ouvre : c'est au recueil qu'il s'illustre, se partage, se publie. */
  async function relier() {
    if (reliure || choix.length < PLANCHER_FEUILLET) return
    setReliure(true)
    setEchecReliure(false)
    jouer('clic')
    try {
      const poeme = await relierEnFeuillet(choix)
      navigate(`/bibliotheque/${poeme.id}`)
    } catch (e) {
      // Le bouton se rallumait sans un mot : le joueur retouchait RELIER
      // sans savoir que la première fois n'avait rien relié.
      console.error(e)
      setEchecReliure(true)
      setReliure(false)
    }
  }

  async function vider() {
    if (!window.confirm(tr(
      `Vider le carnet ? Les ${vers.length} vers gardés seront perdus.`,
      `Empty the notebook? The ${vers.length} kept lines will be lost.`,
    ))) return
    await viderLaRecolte()
    setVers([])
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(enTexte(vers))
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch { /* le presse-papiers peut être refusé — le fichier reste */ }
  }

  /** Le fichier que le médium emporte pour écrire ailleurs. */
  function telecharger() {
    const blob = new Blob([enTexte(vers)], { type: 'text/plain;charset=utf-8' })
    return emporterFichier({
      nom: `${tr('recolte', 'harvest')}-${new Date().toISOString().slice(0, 10)}.txt`,
      blob, titre: tr('La récolte', 'The harvest'),
    })
  }

  const boutonPlat = {
    ...mono, fontSize: 12, letterSpacing: '0.1em', color: encre, opacity: 0.75,
    background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0', minHeight: 44,
  } as const

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="biblio" />

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        <div className="flex justify-between items-baseline">
          <button onClick={() => navigate('/bibliotheque')} style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← {tr('MES POÈMES', 'MY POEMS')}
          </button>
          <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 4 }}>
          {tr('— LE CARNET —', '— THE NOTEBOOK —')}
        </div>
        <div className="flex justify-between items-center" style={{ gap: 12, marginBottom: 18 }}>
          <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.5 }} aria-live="polite">
            {regime === 'choix'
              ? (choix.length === 0
                ? tr('touche les vers dans l’ordre du poème', 'touch the lines in the poem’s order')
                : choix.length === 1
                  ? tr('un vers choisi', 'one line chosen')
                  : tr(`${choix.length} vers choisis`, `${choix.length} lines chosen`))
              : regime === 'relecture'
                ? tr('le feuillet, avant de le relier', 'the page, before it is bound')
                : vers.length === 0
                  ? tr('aucun vers gardé', 'no line kept')
                  : vers.length === 1
                    ? tr('un vers gardé', 'one line kept')
                    : tr(`${vers.length} vers gardés`, `${vers.length} lines kept`)}
          </p>
          {/* Cerné et non plein : composer est une proposition, pas l'action
              attendue de la page — on vient d'abord y relire ce qu'on a gardé. */}
          {regime === 'carnet' && vers.length >= PLANCHER_FEUILLET && (
            <button
              onClick={composer}
              style={{
                ...mono, fontSize: 11, letterSpacing: '0.16em', color: accent,
                background: 'none', border: `1px solid ${accent}80`, borderRadius: 3,
                padding: '6px 10px', cursor: 'pointer', flexShrink: 0, minHeight: 32,
              }}
            >
              {tr('COMPOSER', 'COMPOSE')}
            </button>
          )}
        </div>

        {chargement && (
          <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.4 }}>{tr('…', '…')}</p>
        )}

        {!chargement && vers.length === 0 && (
          <div style={{ borderLeft: `2px solid ${accent}30`, paddingLeft: 14 }}>
            <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17, lineHeight: 1.5, opacity: 0.8 }}>
              {tr(
                "Ouvrez les coutures d'un poème et gardez les vers qui vous retiennent. Ils s'accumulent ici, d'une séance à l'autre, jusqu'à faire un recueil.",
                'Open a poem’s seams and keep the lines that hold you. They gather here, séance after séance, until they make a collection.',
              )}
            </p>
          </div>
        )}

        {/* ── LES VERS ── */}
        {regime !== 'relecture' && (
        <div className="flex-1">
          <AnimatePresence initial={false}>
            {vers.map((v, i) => {
              const rang = choix.indexOf(v.id)
              return (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                style={{ borderLeft: `2px solid ${rang >= 0 ? accent : `${accent}30`}`, paddingLeft: 12, marginBottom: 14 }}
              >
                {regime === 'choix' ? (
                  // Le vers entier est la cible : sur trois cents lignes, viser
                  // une case à cocher serait le geste de trop. Le rang s'écrit
                  // dans la marge, comme on numérote au crayon les morceaux
                  // d'un collage avant de les coller.
                  <button
                    onClick={() => toucher(v.id)}
                    aria-pressed={rang >= 0}
                    // Le rang de la marge est muet au lecteur d'écran : il passe dans le nom.
                    aria-label={rang >= 0
                      ? tr(`${v.texte} — vers ${rang + 1} du feuillet`, `${v.texte} — line ${rang + 1} of the page`)
                      : v.texte}
                    className="flex items-baseline"
                    style={{
                      gap: 10, width: '100%', textAlign: 'left', background: 'none',
                      border: 'none', padding: '4px 0', cursor: 'pointer', minHeight: 44,
                    }}
                  >
                    <span aria-hidden style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, minWidth: 18, flexShrink: 0 }}>
                      {rang >= 0 ? rang + 1 : '·'}
                    </span>
                    <span style={{
                      fontFamily: "'Playfair Display', serif", color: encre, fontSize: 18, lineHeight: 1.45,
                      opacity: rang >= 0 || choix.length === 0 ? 1 : 0.6,
                    }}>
                      {v.texte}
                    </span>
                  </button>
                ) : (
                <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 18, lineHeight: 1.45 }}>
                  {v.texte}
                </p>
                )}

                {provenances && (
                  <p style={{ ...mono, fontSize: 11, color: accent, opacity: 0.6, marginTop: 4 }}>
                    {[
                      v.signature ? signatureLue(v.signature) : null,
                      v.datePoeme ? formatDate(v.datePoeme) : null,
                      v.poemeTitre ? titreTraduit(v.poemeTitre) : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}

                {regime === 'carnet' && (
                // `wrap` : avec un cinquième geste, la ligne ne tient plus à
                // 320 points — LE POÈME passe dessous plutôt que hors de l'écran.
                <div className="flex items-center flex-wrap" style={{ columnGap: 14, marginTop: 4 }}>
                  <button
                    onClick={() => deplacer(v.id, -1)}
                    disabled={i === 0}
                    aria-label={tr('Monter ce vers', 'Move this line up')}
                    style={{ ...mono, fontSize: 15, color: encre, opacity: i === 0 ? 0.15 : 0.55, background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', minHeight: 40, minWidth: 32 }}
                  >↑</button>
                  <button
                    onClick={() => deplacer(v.id, 1)}
                    disabled={i === vers.length - 1}
                    aria-label={tr('Descendre ce vers', 'Move this line down')}
                    style={{ ...mono, fontSize: 15, color: encre, opacity: i === vers.length - 1 ? 0.15 : 0.55, background: 'none', border: 'none', cursor: i === vers.length - 1 ? 'default' : 'pointer', minHeight: 40, minWidth: 32 }}
                  >↓</button>
                  {/* Le carnet avait gardé les flèches d'un cran quand la
                      relecture gagnait son « EN TÊTE » : son ordre est pourtant
                      celui que COPIER et FICHIER emportent, et le 280ᵉ vers y
                      coûtait 279 appuis. */}
                  <button
                    onClick={() => enTete(v.id)}
                    disabled={i === 0}
                    aria-label={tr('Mettre ce vers en tête du carnet', 'Move this line to the top of the notebook')}
                    style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: encre, opacity: i === 0 ? 0.15 : 0.45, background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', minHeight: 40 }}
                  >{tr('EN TÊTE', 'TO THE TOP')}</button>
                  <button
                    onClick={() => retirer(v.id)}
                    aria-label={tr('Retirer ce vers du carnet', 'Remove this line from the notebook')}
                    style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: encre, opacity: 0.35, background: 'none', border: 'none', cursor: 'pointer', minHeight: 40 }}
                  >{tr('RETIRER', 'REMOVE')}</button>
                  {v.poemeId && (
                    <button
                      onClick={() => navigate(`/bibliotheque/${v.poemeId}`)}
                      aria-label={tr('Revenir au poème', 'Back to the poem')}
                      style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: encre, opacity: 0.35, background: 'none', border: 'none', cursor: 'pointer', minHeight: 40 }}
                    >{tr('LE POÈME', 'THE POEM')}</button>
                  )}
                </div>
                )}
              </motion.div>
              )
            })}
          </AnimatePresence>
          {/* La barre du choix est posée sur le bas de l'écran : sans cette
              cale, elle recouvrirait le dernier vers du carnet. */}
          {regime === 'choix' && <div aria-hidden style={{ height: 96 }} />}
        </div>
        )}

        {/* ── LE FEUILLET — la relecture avant la reliure ── */}
        {regime === 'relecture' && (
          <div className="flex-1">
            <div style={{ ...mono, fontSize: 11, color: accent, letterSpacing: '0.22em', marginBottom: 12 }}>
              {tr('— LE FEUILLET —', '— THE PAGE —')}
            </div>
            {choix.map((id, i) => {
              const v = vers.find(x => x.id === id)
              if (!v) return null
              return (
                <div key={id} style={{ borderLeft: `2px solid ${accent}30`, paddingLeft: 12, marginBottom: 12 }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 18, lineHeight: 1.45 }}>
                    {v.texte}
                  </p>
                  {/* Ce qui deviendra la couture du vers : on la lit avant de relier. */}
                  <p style={{ ...mono, fontSize: 11, color: accent, opacity: 0.6, marginTop: 2 }}>
                    {/* La signature relue comme le feuillet la relira — dans la
                        langue courante, et non telle qu'elle fut écrite. */}
                    {[provenanceDuVers(v), v.signature && signatureLue(v.signature)].filter(Boolean).join(' — ')}
                  </p>
                  <div className="flex items-center" style={{ gap: 14, marginTop: 2 }}>
                    <button
                      onClick={() => { jouer('clic'); setChoix(ch => deplacerChoix(ch, id, -1)) }}
                      disabled={i === 0}
                      aria-label={tr('Monter ce vers dans le feuillet', 'Move this line up the page')}
                      style={{ ...mono, fontSize: 15, color: encre, opacity: i === 0 ? 0.15 : 0.55, background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', minHeight: 40, minWidth: 32 }}
                    >↑</button>
                    <button
                      onClick={() => { jouer('clic'); setChoix(ch => deplacerChoix(ch, id, 1)) }}
                      disabled={i === choix.length - 1}
                      aria-label={tr('Descendre ce vers dans le feuillet', 'Move this line down the page')}
                      style={{ ...mono, fontSize: 15, color: encre, opacity: i === choix.length - 1 ? 0.15 : 0.55, background: 'none', border: 'none', cursor: i === choix.length - 1 ? 'default' : 'pointer', minHeight: 40, minWidth: 32 }}
                    >↓</button>
                    {/* Les flèches ne déplacent que d'un rang : sur un feuillet de
                        trente vers, remonter le dernier coûtait vingt-neuf appuis
                        — le travers même que le mode COMPOSER venait corriger. */}
                    <button
                      onClick={() => { jouer('clic'); setChoix(ch => mettreEnTete(ch, id)) }}
                      disabled={i === 0}
                      aria-label={tr('Mettre ce vers en tête du feuillet', 'Move this line to the top of the page')}
                      style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: encre, opacity: i === 0 ? 0.15 : 0.45, background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', minHeight: 40 }}
                    >{tr('EN TÊTE', 'TO THE TOP')}</button>
                    <button
                      onClick={() => {
                        jouer('clic')
                        const reste = choix.filter(x => x !== id)
                        setChoix(reste)
                        // Sous le plancher il n'y a plus de feuillet à relire :
                        // on revient au choix plutôt que d'offrir une reliure impossible.
                        if (reste.length < PLANCHER_FEUILLET) setRegime('choix')
                      }}
                      aria-label={tr('Ôter ce vers du feuillet — il reste au carnet', 'Leave this line out of the page — it stays in the notebook')}
                      style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: encre, opacity: 0.35, background: 'none', border: 'none', cursor: 'pointer', minHeight: 40 }}
                    >{tr('ÔTER', 'LEAVE OUT')}</button>
                  </div>
                </div>
              )
            })}

            <p style={{ ...mono, fontSize: 11, color: encre, opacity: 0.45, marginTop: 6, marginBottom: 14 }}>
              {tr(
                'Les vers restent au carnet. Le feuillet entre au recueil, leurs provenances pour coutures.',
                'The lines stay in the notebook. The page enters the collection, their sources as its seams.',
              )}
            </p>
            <button
              onClick={relier}
              disabled={reliure}
              className="w-full"
              style={{
                ...mono, fontSize: 14, letterSpacing: '0.14em', background: accent, color: texteBouton,
                border: 'none', borderRadius: 3, padding: '14px 12px', minHeight: 48,
                cursor: reliure ? 'default' : 'pointer', opacity: reliure ? 0.7 : 1,
              }}
            >
              {tr('RELIER EN FEUILLET', 'BIND INTO A PAGE')}
            </button>
            {echecReliure && (
              <p role="alert" style={{ ...mono, fontSize: 11, color: accent, marginTop: 8, textAlign: 'center' }}>
                {tr('Le feuillet n’a pas pu être relié.', 'The page could not be bound.')}
              </p>
            )}
            <button
              onClick={() => { jouer('clic'); setRegime('choix') }}
              style={{ ...boutonPlat, display: 'block', margin: '6px auto 0' }}
            >
              ← {tr('CHOISIR ENCORE', 'CHOOSE AGAIN')}
            </button>
            <button
              onClick={abandonner}
              style={{ ...boutonPlat, display: 'block', margin: '0 auto', opacity: 0.45, fontSize: 11 }}
            >
              {tr('ABANDONNER', 'DISCARD')}
            </button>
          </div>
        )}

        {/* ── EMPORTER ── */}
        {regime === 'carnet' && vers.length > 0 && (
          <>
            <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15, marginTop: 8 }} />
            <div className="grid grid-cols-3">
              <button onClick={copier} style={boutonPlat}>
                {copie ? tr('COPIÉ', 'COPIED') : tr('COPIER', 'COPY')}
              </button>
              <button onClick={telecharger} style={{ ...boutonPlat, borderLeft: `0.5px solid ${encre}1f`, borderRight: `0.5px solid ${encre}1f` }}>
                {tr('FICHIER', 'FILE')}
              </button>
              <button
                onClick={() => setProvenances(p => !p)}
                aria-pressed={provenances}
                style={{ ...boutonPlat, color: provenances ? accent : encre, opacity: provenances ? 0.9 : 0.75 }}
              >
                {tr('SOURCES', 'SOURCES')}
              </button>
            </div>
            <button
              onClick={vider}
              style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', color: encre, opacity: 0.28, background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0', minHeight: 44 }}
            >
              — {tr('VIDER LE CARNET', 'EMPTY THE NOTEBOOK')} —
            </button>
          </>
        )}
      </div>

      {/* ── LA BARRE DU CHOIX ──
          Fixe, parce que le carnet peut compter trois cents vers : la
          relecture doit rester à portée du pouce où que l'on soit descendu.
          Elle reprend le fond de l'ambiance pour que les vers qui passent
          dessous ne s'y lisent pas en transparence. */}
      {regime === 'choix' && (
        <div
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20,
            background: fond, borderTop: `0.5px solid ${encre}26`,
            paddingTop: 8, paddingBottom: 'max(var(--sa-bottom), 10px)',
            paddingLeft: 'max(var(--sa-left), 16px)', paddingRight: 'max(var(--sa-right), 16px)',
          }}
        >
          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            <button onClick={abandonner} style={{ ...boutonPlat, opacity: 0.6 }}>
              {tr('ANNULER', 'CANCEL')}
            </button>
            <button
              onClick={() => { jouer('clic'); setRegime('relecture'); window.scrollTo({ top: 0 }) }}
              disabled={choix.length < PLANCHER_FEUILLET}
              style={{
                ...mono, fontSize: 12, letterSpacing: '0.12em', color: accent,
                background: 'none', border: `1px solid ${accent}${choix.length < PLANCHER_FEUILLET ? '33' : '99'}`,
                borderRadius: 3, minHeight: 44, cursor: choix.length < PLANCHER_FEUILLET ? 'default' : 'pointer',
                opacity: choix.length < PLANCHER_FEUILLET ? 0.45 : 1,
              }}
            >
              {tr('RELIRE', 'READ OVER')} →
            </button>
          </div>
        </div>
      )}
    </PageTransition>
  )
}
