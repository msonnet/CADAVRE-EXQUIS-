import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { useSound } from '../hooks/useSound'
import { chargerPoemes } from '../db'
import type { Poeme } from '../types'
import { VOICE_IDS, nomDeVoix } from '../data/voiceIds'
import { EPIGRAPHES } from '../data/epigraphes'
import { registreDesVoix, type FicheVoix, type VersDeVoix } from '../lib/registreVoix'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'

/**
 * Le registre des voix — l'index des contributeurs, à la manière d'une revue.
 *
 * Les voix n'avaient ni visage ni mémoire : un nom en italique dans les
 * coutures, puis plus rien. On ne pouvait pas retrouver celle qui avait
 * écrit le vers qu'on aimait, ni savoir qu'on l'avait croisée trois fois.
 *
 * ── Ce que la page est, et ce qu'elle refuse d'être ───────────────────────
 *
 * Les quarante-six places sont imprimées, numérotées dans l'ordre fixe du
 * registre ; celles des voix qu'on n'a pas rencontrées restent en blanc,
 * sans nom. Ce n'est PAS une collection à compléter : aucun compte « sur
 * 46 », aucune rareté, aucun badge. Un index de revue ne félicite personne,
 * il dit qui a écrit dans ces pages.
 *
 * Le tirage ne change pas : on ne choisit pas une voix d'ici, on ne la
 * rappelle pas à la table. La fenêtre de vingt parties reste la règle, et
 * l'anonymat de l'Atelier jusqu'au dernier vers aussi.
 *
 * Tout est relu dans le recueil local (Dexie). Rien ne part au serveur.
 */

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(tr('fr-FR', 'en-GB'), {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** « N° 06 » — la place au registre, sur deux chiffres comme une cote. */
function cote(n: number): string {
  return `N° ${String(n).padStart(2, '0')}`
}

/**
 * La lettrine d'une voix : la capitale de son nom, article ôté.
 * « L'apiculteur » donne A, « Le souffleur de verre » S. Une capitale et
 * jamais une minuscule : un « l » en Bodoni se lit comme un trait.
 */
export function lettrineDeVoix(nom: string): string {
  const sansArticle = nom.replace(/^(le |la |les |l['’]|the )/i, '')
  return (sansArticle[0] ?? '').toLocaleUpperCase(tr('fr-FR', 'en-GB'))
}

function libelleSeances(n: number): string {
  return `${n} ${n === 1 ? tr('SÉANCE', 'SÉANCE') : tr('SÉANCES', 'SÉANCES')}`
}

/**
 * Ce que la voix a écrit, posé dans son vers quand on le connaît : le vers
 * entier à l'encre pâle, sa part à l'accent. On voit d'un coup ce qui est à
 * elle et où elle l'a cousu — c'est la signature d'une voix d'atelier.
 */
function VersSigne({ v, encre, accent }: { v: VersDeVoix; encre: string; accent: string }) {
  // La place vient du registre, qui suit l'ordre des mains : chercher le
  // texte ici soulignait sa première occurrence, parfois écrite par une
  // autre main. Sans place connue, on montre la part seule.
  if (v.ligne && v.debut !== undefined) {
    const i = v.debut, fin = i + v.texte.trim().length
    return (
      <>
        <span style={{ opacity: 0.55 }}>{v.ligne.slice(0, i)}</span>
        <span style={{ color: accent }}>{v.ligne.slice(i, fin)}</span>
        <span style={{ opacity: 0.55 }}>{v.ligne.slice(fin)}</span>
      </>
    )
  }
  return <span style={{ color: encre }}>{v.texte}</span>
}

export default function RegistreVoix() {
  const navigate = useNavigate()
  // Le paramètre arrive DÉJÀ décodé par le routeur. Le décoder une seconde
  // fois faisait planter la page sur /voix/%25 (« % » seul n'est pas une
  // séquence valide) : le carnet se déchirait sur une adresse mal tapée.
  const { id } = useParams<{ id?: string }>()
  const seance = useReve()
  const { jouer } = useSound()
  const [poemes, setPoemes] = useState<Poeme[]>([])
  const [chargement, setChargement] = useState(true)

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const langue = langueActuelle()

  useEffect(() => {
    chargerPoemes()
      .then(setPoemes)
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [])

  const registre = useMemo(() => registreDesVoix(poemes), [poemes])

  // Changer de fiche ne doit pas laisser le regard au milieu de la page
  // précédente : la fiche commence en haut, comme une page qu'on tourne.
  useEffect(() => { window.scrollTo(0, 0) }, [id])

  const aller = (chemin: string) => { jouer('clic'); navigate(chemin) }

  const entete = (
    <>
      <div className="flex justify-between items-baseline">
        <button
          onClick={() => aller(id ? '/voix' : '/bibliotheque')}
          style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← {id ? tr('LE REGISTRE', 'THE REGISTER') : tr('MES POÈMES', 'MY POEMS')}
        </button>
        <span style={{ ...mono, fontSize: 13, letterSpacing: '0.1em', color: accent, fontWeight: 700 }}>{colorLabel}</span>
      </div>
      <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />
      <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 4 }}>
        {tr('— LE REGISTRE DES VOIX —', '— THE REGISTER OF VOICES —')}
      </div>
    </>
  )

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="biblio" />
      {/* La marge basse est un pied de page : la signature du décor (« rêvé
          à … ») est posée au bas de la page, et la dernière place du
          registre venait s'écrire dessous. */}
      <div style={{ position: 'relative', zIndex: 10, paddingBottom: 48 }} className="flex flex-col flex-1">
        {entete}
        {chargement
          ? <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.4 }}>…</p>
          : id
            ? <Fiche id={id} fiche={registre.get(id)} encre={encre} accent={accent} langue={langue} aller={aller} />
            : <Index registre={registre} encre={encre} accent={accent} langue={langue} aller={aller} />}
      </div>
    </PageTransition>
  )
}

// ── L'index ─────────────────────────────────────────────────────────────────

function Index({ registre, encre, accent, langue, aller }: {
  registre: Map<string, FicheVoix>
  encre: string
  accent: string
  langue: 'fr' | 'en'
  aller: (chemin: string) => void
}) {
  const n = registre.size
  return (
    <>
      <p style={{ ...mono, fontSize: 12, color: encre, opacity: 0.5, marginBottom: 18 }}>
        {n === 0
          ? tr('aucune voix rencontrée', 'no voice met yet')
          : n === 1
            ? tr('une voix rencontrée dans tes poèmes', 'one voice met in your poems')
            : tr(`${n} voix rencontrées dans tes poèmes`, `${n} voices met in your poems`)}
      </p>

      {n === 0 && (
        <div style={{ borderLeft: `2px solid ${accent}30`, paddingLeft: 14, marginBottom: 18 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17, lineHeight: 1.5, opacity: 0.8 }}>
            {tr(
              "Chaque voix qui écrit dans un de tes poèmes prend ici sa place, avec ce qu'elle a écrit.",
              'Every voice that writes in one of your poems takes its place here, with what it wrote.',
            )}
          </p>
        </div>
      )}

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {VOICE_IDS.map((vid, i) => {
          const f = registre.get(vid)
          if (!f) {
            // Une place en blanc : sa cote et un filet, rien d'autre. Muette
            // pour le lecteur d'écran — des dizaines de lignes vides ne disent
            // rien que le compte, au-dessus, ne dise déjà.
            return (
              <li key={vid} aria-hidden="true" className="flex items-baseline" style={{ gap: 10, padding: '7px 0' }}>
                <span style={{ ...mono, fontSize: 11, color: encre, opacity: 0.3, letterSpacing: '0.08em', flexShrink: 0 }}>{cote(i + 1)}</span>
                <span style={{ flex: 1, borderBottom: `1px dotted ${encre}`, opacity: 0.18, transform: 'translateY(-3px)' }} />
              </li>
            )
          }
          const nom = nomDeVoix(vid, langue)
          const epi = EPIGRAPHES[vid]
          return (
            <li key={vid}>
              <button
                onClick={() => aller(`/voix/${encodeURIComponent(vid)}`)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  borderLeft: `2px solid ${accent}40`, padding: '8px 0 8px 12px', margin: '6px 0', cursor: 'pointer', minHeight: 44,
                }}
              >
                <span className="flex items-baseline" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ ...mono, fontSize: 11, color: encre, opacity: 0.5, letterSpacing: '0.08em' }}>{cote(i + 1)}</span>
                  <span aria-hidden="true" style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 20, color: accent, width: 18, textAlign: 'center', flexShrink: 0 }}>
                    {lettrineDeVoix(nom)}
                  </span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, color: encre }}>{nom}</span>
                  <span style={{ ...mono, fontSize: 11, color: accent, opacity: 0.75, letterSpacing: '0.12em', marginLeft: 'auto' }}>
                    {libelleSeances(f.seances)}
                  </span>
                </span>
                {epi && (
                  <span style={{ display: 'block', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.4, color: encre, opacity: 0.7, marginTop: 2 }}>
                    {langue === 'en' ? epi.en : epi.fr}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </>
  )
}

// ── La fiche ────────────────────────────────────────────────────────────────

function Fiche({ id, fiche, encre, accent, langue, aller }: {
  id: string
  fiche: FicheVoix | undefined
  encre: string
  accent: string
  langue: 'fr' | 'en'
  aller: (chemin: string) => void
}) {
  const numero = VOICE_IDS.indexOf(id as typeof VOICE_IDS[number]) + 1

  // Une place en blanc reste en blanc, même ouverte par son adresse : le
  // registre ne nomme que les voix qui ont écrit dans tes poèmes.
  if (!fiche) {
    return (
      <div style={{ marginTop: 14 }}>
        {numero > 0 && (
          <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.5, letterSpacing: '0.1em', marginBottom: 8 }}>{cote(numero)}</div>
        )}
        <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 17, lineHeight: 1.5, opacity: 0.8 }}>
          {tr("Cette place du registre est encore en blanc.", 'This place in the register is still blank.')}
        </p>
      </div>
    )
  }

  const nom = nomDeVoix(id, langue)
  const epi = EPIGRAPHES[id]
  return (
    <>
      <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.5, letterSpacing: '0.1em', marginTop: 14 }}>{cote(fiche.numero)}</div>

      {/* La lettrine est l'emblème de la voix : sa capitale en Bodoni, à
          l'accent, posée à côté du nom entier plutôt qu'à sa place — « Le
          chimiste » ne commence pas par C, et une lettrine qui mangerait
          l'article écrirait un autre nom. */}
      <div className="flex items-center" style={{ gap: 14, marginTop: 4 }}>
        <span aria-hidden="true" style={{
          fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontSize: 'clamp(3rem, 16vw, 4.2rem)', lineHeight: 1,
          color: accent, minWidth: '0.8em', textAlign: 'center', flexShrink: 0,
        }}>
          {lettrineDeVoix(nom)}
        </span>
        <h1 className="font-fraunces font-black" style={{ margin: 0, fontSize: 'clamp(1.7rem, 8vw, 2.4rem)', lineHeight: 1.1, color: encre, overflowWrap: 'anywhere', minWidth: 0 }}>
          {nom}
        </h1>
      </div>

      {epi && (
        <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.45, color: encre, opacity: 0.85, marginTop: 14 }}>
          {langue === 'en' ? epi.en : epi.fr}
        </p>
      )}

      <div style={{ ...mono, fontSize: 11, color: encre, opacity: 0.6, letterSpacing: '0.14em', marginTop: 12, lineHeight: 1.7 }}>
        {tr('PREMIÈRE SÉANCE', 'FIRST SÉANCE')} · {formatDate(fiche.premiere).toUpperCase()} · {libelleSeances(fiche.seances)}
      </div>

      <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.15, margin: '18px 0 14px' }} />

      <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.2em', marginBottom: 10 }}>
        {tr('— DANS TES POÈMES —', '— IN YOUR POEMS —')}
      </div>

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {fiche.vers.map((v, k) => (
          <li key={k}>
            <button
              onClick={() => aller(`/bibliotheque/${encodeURIComponent(v.poemeId)}?coutures`)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                borderLeft: `2px solid ${accent}30`, padding: '6px 0 6px 12px', marginBottom: 12, cursor: 'pointer', minHeight: 44,
              }}
            >
              <span style={{ display: 'block', fontFamily: "'Playfair Display', serif", fontSize: 18, lineHeight: 1.45, color: encre }}>
                <VersSigne v={v} encre={encre} accent={accent} />
              </span>
              <span style={{ display: 'block', ...mono, fontSize: 11, color: encre, opacity: 0.55, marginTop: 4, letterSpacing: '0.04em' }}>
                {v.partage ? `${tr(`À ${v.partage} VOIX`, `${v.partage} VOICES`)} · ` : ''}
                {v.poeme || tr('Sans titre', 'Untitled')} · {formatDate(v.date)} →
              </span>
            </button>
          </li>
        ))}
      </ol>
    </>
  )
}
