import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import {
  chargerRecolte, deplacerDansLaRecolte, retirerDeLaRecolte, viderLaRecolte,
  type VersRecolte,
} from '../db'
import { mono } from '../lib/typo'
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
 */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(tr('fr-FR', 'en-GB'), {
    day: 'numeric', month: 'long', year: 'numeric',
  })
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

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''

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

  async function retirer(id: string) {
    jouer('clic')
    await retirerDeLaRecolte(id)
    setVers(await chargerRecolte())
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
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tr('recolte', 'harvest')}-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.5, marginBottom: 18 }}>
          {vers.length === 0
            ? tr('aucun vers gardé', 'no line kept')
            : vers.length === 1
              ? tr('un vers gardé', 'one line kept')
              : tr(`${vers.length} vers gardés`, `${vers.length} lines kept`)}
        </p>

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
        <div className="flex-1">
          <AnimatePresence initial={false}>
            {vers.map((v, i) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                style={{ borderLeft: `2px solid ${accent}30`, paddingLeft: 12, marginBottom: 14 }}
              >
                <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 18, lineHeight: 1.45 }}>
                  {v.texte}
                </p>

                {provenances && (
                  <p style={{ ...mono, fontSize: 11, color: accent, opacity: 0.6, marginTop: 4 }}>
                    {[
                      v.signature,
                      v.datePoeme ? formatDate(v.datePoeme) : null,
                      v.poemeTitre || null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}

                <div className="flex items-center" style={{ gap: 14, marginTop: 4 }}>
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── EMPORTER ── */}
        {vers.length > 0 && (
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
    </PageTransition>
  )
}
