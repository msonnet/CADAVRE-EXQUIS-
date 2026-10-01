import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import MainsDuVers from './MainsDuVers'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import { toRomain } from '../lib/attribution'
import {
  REACTIONS, type CleReaction, type Publication,
  lirePoemePublie, lireDessinPublie, versPublies, tetePublication,
  dateSignature, estAnonyme, attributionPubliee, aDesCoutures, libelleEchos,
} from '../lib/galerie'

/**
 * Une entrée du sommaire de la galerie — et une planche, pour les dessins.
 *
 * ── Ce qui était faux ─────────────────────────────────────────────────────
 *
 * Chaque publication était une boîte à filet, un « + » carré dans le coin,
 * quatre pastilles d'emoji et un œil : la grammaire d'un fil de réseau
 * social, sous un jeu qui se présente comme une revue. Et le poème y était
 * en morceaux (voir `lib/galerie.ts`).
 *
 * Une entrée est maintenant ce qu'elle serait au sommaire d'une revue :
 * le titre — ou, faute de titre, l'incipit — en Playfair italique, la
 * signature en petites capitales, un filet fin pour séparer. Toucher le
 * titre ouvre le poème ENTIER, recousu comme au recueil, avec ses débords
 * en retrait : un vers trop long pour l'écran se replie sous lui-même et
 * ne se confond pas avec le vers suivant.
 *
 * Le titre est le seul bouton de l'entrée. La signature est un lien vers
 * l'auteur, les réactions sont des boutons : rien n'est imbriqué, un bouton
 * dans un bouton n'est pas du HTML valide et le clavier n'y entre jamais.
 */

interface Commun {
  item: Publication
  ouvert: boolean
  onBasculer: () => void
  /** Réactions reçues, par clé — et celles que ce lecteur a posées. */
  reactions: Record<string, number>
  mine: Set<string>
  onReagir: (cle: CleReaction) => void
  onAgrandir: (src: string) => void
  accent: string
  encre: string
  /** ⚑ ⊘ ✕ — dans l'état déplié seulement. */
  actions?: React.ReactNode
  /** Sur la page de l'auteur, son nom ne mène nulle part de plus. */
  sansLienAuteur?: boolean
  domId: string
}

function NomAuteur({ item, encre, sansLien }: { item: Publication; encre: string; sansLien?: boolean }) {
  const nom = item.author_pseudo.toUpperCase()
  // Les anonymes n'ont pas de page : `/u/Anonyme` rassemblait sous un même
  // nom tous ceux qui avaient publié sans compte.
  if (sansLien || estAnonyme(item.author_pseudo)) return <>{nom}</>
  return (
    <Link
      to={`/u/${encodeURIComponent(item.author_pseudo)}`}
      style={{ color: encre, textDecoration: 'none', borderBottom: `0.5px dotted ${encre}66` }}
    >
      {nom}
    </Link>
  )
}

/** Les quatre réactions, en signes et en mots — la légende d'en tête est retirée. */
export function RangeeReactions({ item, reactions, mine, onReagir, accent, encre }: Pick<Commun, 'item' | 'reactions' | 'mine' | 'onReagir' | 'accent' | 'encre'>) {
  return (
    <div
      role="group"
      aria-label={tr('Réagir', 'React')}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}
    >
      {REACTIONS.map(r => {
        const n = reactions[r.cle] ?? 0
        const pose = mine.has(r.cle)
        return (
          <button
            key={r.cle}
            onClick={() => onReagir(r.cle)}
            aria-pressed={pose}
            aria-label={`${r.libelle()}${n > 0 ? ` — ${n}` : ''}`}
            data-reaction={r.cle}
            style={{
              ...mono, fontSize: 11, letterSpacing: '0.14em',
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              padding: '7px 10px', lineHeight: 1.2,
              background: 'transparent', cursor: 'pointer',
              color: pose ? accent : encre, opacity: pose ? 1 : 0.7,
              border: pose ? `1px solid ${accent}` : `0.5px solid ${encre}30`,
              borderRadius: 3,
            }}
          >
            <span aria-hidden style={{ fontSize: 14, letterSpacing: 0 }}>{r.signe}</span>
            <span>{r.libelle().toUpperCase()}</span>
            {n > 0 && <span aria-hidden>{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Les coutures d'une publication : qui a écrit quoi, voix comprises. */
export function CouturesPubliees({ item, accent, encre, id }: { item: Publication; accent: string; encre: string; id: string }) {
  const p = lirePoemePublie(item.payload)
  if (!p) return null
  const unVers = p.structureId === 'atelier' || p.structureId === 'vers-libre'
  return (
    <div id={id} style={{ marginTop: 10 }}>
      {p.cases.map((cas, i) => {
        const { texte, voix } = attributionPubliee(cas, item.author_pseudo)
        const fonction = cas.fonction?.trim()
          || (unVers ? `${tr('vers', 'line')} ${i + 1}` : `${tr('fragment', 'fragment')} ${i + 1}`)
        return (
          <div key={i} style={{ borderLeft: `2px solid ${accent}35`, paddingLeft: 12, paddingTop: 4, paddingBottom: 4, marginBottom: 8 }}>
            <div style={{ ...mono, fontSize: 11, color: accent, opacity: 0.85, marginBottom: 2 }}>
              {fonction.toUpperCase()}
              <span style={{ color: encre, opacity: 0.35, margin: '0 8px' }}>—</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, letterSpacing: 0, color: encre, opacity: 0.85 }}>
                {[texte, ...voix].join(' · ')}
              </span>
            </div>
            <p style={{ fontFamily: "'Playfair Display', serif", color: encre, fontSize: 16, lineHeight: 1.4, margin: 0 }}>
              {cas.texte}
            </p>
            {cas.mains?.length ? <MainsDuVers mains={cas.mains} accent={accent} encre={encre} main={item.author_pseudo} /> : null}
          </div>
        )
      })}
    </div>
  )
}

/** La ligne de signature : « — MIREILLE · 29 SEPTEMBRE », et ce qu'il a reçu. */
function Signature({ item, encre, echos, sansLien, prefixe }: { item: Publication; encre: string; echos: string; sansLien?: boolean; prefixe?: string }) {
  return (
    <div style={{ ...mono, fontSize: 11, letterSpacing: '0.16em', color: encre, marginTop: 4, lineHeight: 1.6 }}>
      <div style={{ opacity: 0.75 }}>
        {prefixe ?? '— '}<NomAuteur item={item} encre={encre} sansLien={sansLien} />
        {' · '}{dateSignature(item.created_at)}
      </div>
      {/* Une ligne à part, toujours : à droite quand elle tenait, dessous
          quand elle ne tenait pas, elle changeait de place d'une entrée à
          l'autre et le sommaire perdait sa colonne. */}
      {echos && <div data-echos style={{ opacity: 0.6 }}>{echos}</div>}
    </div>
  )
}

export default function EntreeGalerie(props: Commun) {
  const { item, ouvert, onBasculer, reactions, accent, encre, actions, sansLienAuteur, domId, onAgrandir } = props
  const [coutures, setCoutures] = useState(false)
  const poeme = lirePoemePublie(item.payload)
  const tete = tetePublication(item)
  const vers = poeme ? versPublies(poeme) : []
  // Sans titre, la tête EST l'incipit, et ouverte elle ne se replie plus :
  // un poème d'une seule ligne — la phrase courte, la phrase étoffée — y est
  // déjà entier, le répéter dessous serait l'écrire deux fois.
  const corps = vers.length === 1 && tete === vers[0] ? [] : vers
  const echos = libelleEchos({ lectures: item.views_count ?? 0, reactions })
  const idCoutures = `${domId}-coutures`

  return (
    <article style={{ borderBottom: `0.5px solid ${encre}22`, padding: '14px 0 12px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* La vignette, comme sur la carte du recueil : décorative, le titre
            est juste à côté. Ouvert, l'illustration passe en pleine largeur. */}
        {item.image_url && !ouvert && (
          <img
            src={item.image_url} alt="" loading="lazy"
            style={{ width: 54, height: 72, objectFit: 'cover', flexShrink: 0, border: `0.5px solid ${accent}30` }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={onBasculer}
            aria-expanded={ouvert}
            aria-controls={domId}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: 0,
              background: 'none', border: 'none', cursor: 'pointer', color: encre,
            }}
          >
            <span style={{
              fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 19, lineHeight: 1.35,
              display: '-webkit-box', WebkitLineClamp: ouvert ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } as React.CSSProperties}>
              {tete}
            </span>
          </button>
          <Signature item={item} encre={encre} echos={echos} sansLien={sansLienAuteur} />
        </div>
      </div>

      {ouvert && (
        <div id={domId} style={{ marginTop: 12 }}>
          {/* Le poème entier. Chaque vers est un paragraphe à retrait
              négatif : ce qui déborde se range sous le vers, en retrait,
              comme dans un recueil imprimé. */}
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, lineHeight: 1.55, color: encre }}>
            {corps.map((v, i) => (
              <p key={i} style={{ margin: 0, paddingLeft: '1.4em', textIndent: '-1.4em' }}>{v}</p>
            ))}
          </div>

          {item.image_url && (
            <button
              onClick={() => onAgrandir(item.image_url!)}
              aria-label={tr("Agrandir l'illustration", 'Enlarge the illustration')}
              style={{ display: 'block', width: '100%', padding: 0, marginTop: 12, background: 'none', border: 'none', cursor: 'zoom-in' }}
            >
              <img src={item.image_url} alt="" loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', border: `0.5px solid ${encre}20` }} />
            </button>
          )}

          {poeme && aDesCoutures(poeme) && (
            <>
              <button
                onClick={() => setCoutures(c => !c)}
                aria-expanded={coutures}
                aria-controls={idCoutures}
                style={{
                  ...mono, fontSize: 11, letterSpacing: '0.16em', color: accent,
                  opacity: coutures ? 1 : 0.8, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '10px 0 2px', marginTop: 4,
                }}
              >
                ⟡ {tr('COUTURES', 'SEAMS')}
              </button>
              {coutures && <CouturesPubliees item={item} accent={accent} encre={encre} id={idCoutures} />}
            </>
          )}

          <RangeeReactions {...props} />
          {actions && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>{actions}</div>}
        </div>
      )}
    </article>
  )
}

/**
 * Une planche du cahier de dessins — « PL. III — MIREILLE ».
 *
 * Les dessins étaient des vignettes de 120 px de haut, centrées dans un
 * cadre blanc pleine largeur : un dessin vertical de trois mains n'en
 * montrait que la tête. Ils se rangent maintenant deux par deux, à leur
 * hauteur entière ; ouverte, la planche prend toute la largeur.
 */
export function PlancheGalerie(props: Commun & { numero: number }) {
  const { item, ouvert, onBasculer, reactions, accent, encre, actions, sansLienAuteur, domId, onAgrandir, numero } = props
  const d = lireDessinPublie(item.payload)
  const src = item.image_url ?? d?.imageDataUrl ?? null
  const tete = tetePublication(item)
  const echos = libelleEchos({ lectures: item.views_count ?? 0, reactions })
  const pl = `${tr('PL.', 'PL.')} ${toRomain(numero)}`
  return (
    <figure style={{ margin: 0, gridColumn: ouvert ? '1 / -1' : undefined, minWidth: 0 }}>
      <button
        onClick={onBasculer}
        aria-expanded={ouvert}
        aria-controls={domId}
        aria-label={`${pl} — ${tete}`}
        style={{ display: 'block', width: '100%', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {src
          ? <img src={src} alt="" loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', background: '#fff', border: `0.5px solid ${encre}25` }} />
          : <span style={{ display: 'block', aspectRatio: '3 / 4', border: `0.5px solid ${encre}25` }} />}
      </button>
      <figcaption style={{ ...mono, fontSize: 11, letterSpacing: '0.16em', color: encre, marginTop: 6 }}>
        <span style={{ color: accent }}>{pl}</span>
        <span style={{ opacity: 0.75 }}> — <NomAuteur item={item} encre={encre} sansLien={sansLienAuteur} /></span>
      </figcaption>
      {ouvert && (
        <div id={domId} style={{ marginTop: 8, paddingBottom: 12, borderBottom: `0.5px solid ${encre}22` }}>
          {d?.texteVision && (
            <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: encre, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>
              {d.texteVision}
            </p>
          )}
          <Signature item={item} encre={encre} echos={echos} sansLien={sansLienAuteur} />
          {src && (
            <button
              onClick={() => onAgrandir(src)}
              style={{ ...mono, fontSize: 11, letterSpacing: '0.16em', color: accent, background: 'none', border: 'none', cursor: 'zoom-in', padding: '10px 0 0' }}
            >
              ⤢ {tr('AGRANDIR', 'ENLARGE')}
            </button>
          )}
          <RangeeReactions {...props} />
          {actions && <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>{actions}</div>}
        </div>
      )}
    </figure>
  )
}
