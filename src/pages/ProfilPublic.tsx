import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase } from '../lib/supabase'
import { mono } from '../lib/typo'
import { tr } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { useReactionsGalerie } from '../hooks/useReactionsGalerie'
import EntreeGalerie, { Planches } from '../components/EntreeGalerie'
import { type Publication, estAnonyme, motifExact, memePseudo } from '../lib/galerie'

/**
 * La page d'un auteur — `/u/:pseudo`.
 *
 * Elle répétait les fautes de la galerie (cases jointes par « · », une par
 * ligne, emoji en couleur) et les répète donc plus : elle compose ses
 * entrées avec les mêmes pièces que la galerie, poèmes au sommaire et
 * dessins en planche.
 *
 * Deux défauts propres à la page, corrigés ici :
 * - `/u/Anonyme` rassemblait tous ceux qui avaient publié sans compte sous
 *   un même nom. Un anonyme n'a pas de page : c'est ce qu'anonyme veut dire.
 * - le pseudo partait tel quel dans un `ilike`, où `%` et `_` sont des
 *   jokers : « M_reille » ouvrait la page de Mireille. `*` aussi, que
 *   PostgREST change en `%` : d'où le tri par `memePseudo` au retour.
 */
export default function ProfilPublic() {
  const navigate = useNavigate()
  const params = useParams<{ pseudo: string }>()
  const pseudoParam = params.pseudo ?? ''
  const seance = useReve()
  const { user } = useAuth()

  const accent = seance?.accent.hex ?? '#b22c20'
  const encre = seance?.ambiance.ink ?? '#e6d4b8'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'

  const anonyme = estAnonyme(pseudoParam)
  const [items, setItems] = useState<Publication[]>([])
  const [chargement, setChargement] = useState(!anonyme)
  const [erreur, setErreur] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const { reactions, mine, charger: chargerReactions, basculer } = useReactionsGalerie('[ProfilPublic]')
  const seenViews = useRef<Set<string>>(new Set())

  const incrementView = useCallback(async (item: Publication) => {
    if (seenViews.current.has(item.id)) return
    seenViews.current.add(item.id)
    // Sa propre page relue ne se compte pas comme une lecture.
    if (user && item.author_id === user.id) return
    try {
      const { error } = await supabase.rpc('increment_gallery_view', { g_id: item.id })
      if (error) { console.error('[ProfilPublic] Erreur incrément vue', error); return }
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, views_count: (it.views_count ?? 0) + 1 } : it))
    } catch (e) {
      console.error('[ProfilPublic] Exception incrément vue', e)
    }
  }, [user])

  const handleExpand = useCallback((item: Publication) => {
    const next = expanded === item.id ? null : item.id
    setExpanded(next)
    if (next) incrementView(item)
  }, [expanded, incrementView])

  useEffect(() => {
    if (anonyme) { setChargement(false); return }
    let annule = false
    async function charger() {
      setChargement(true)
      setErreur(null)
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('id, type, titre, payload, image_url, author_pseudo, author_avatar, author_id, created_at, views_count')
          .ilike('author_pseudo', motifExact(pseudoParam))
          .order('created_at', { ascending: false })

        if (annule) return
        if (error) {
          console.error('[ProfilPublic] Erreur de chargement', error)
          setErreur(tr('Impossible de charger ce profil.', 'Could not load this profile.'))
          setChargement(false)
          return
        }
        // Le motif ramène large (`*` y devient `_`, un caractère quelconque) ;
        // l'égalité trie. Sans elle, l'auteur « M* » verrait sa page
        // rassembler Mo, Mu et Ma.
        const rows = ((data ?? []) as Publication[]).filter(r => memePseudo(r.author_pseudo, pseudoParam))
        setItems(rows)
        setChargement(false)
        if (rows.length > 0) chargerReactions(rows.map(r => r.id))
      } catch (e) {
        if (annule) return
        console.error('[ProfilPublic] Exception chargement', e)
        setErreur(tr('Impossible de charger ce profil.', 'Could not load this profile.'))
        setChargement(false)
      }
    }
    charger()
    return () => { annule = true }
  }, [pseudoParam, anonyme, chargerReactions])

  const titreAffichePseudo = items[0]?.author_pseudo ?? pseudoParam
  const poemes = items.filter(it => it.type === 'poeme')
  const dessins = items.filter(it => it.type === 'dessin')

  function props(item: Publication) {
    return {
      item,
      ouvert: expanded === item.id,
      onBasculer: () => handleExpand(item),
      reactions: reactions[item.id] ?? {},
      mine: mine[item.id] ?? new Set<string>(),
      onReagir: (c: Parameters<typeof basculer>[1]) => basculer(item.id, c),
      onAgrandir: (src: string) => setLightboxSrc(src),
      accent, encre,
      sansLienAuteur: true,
      domId: `pub-${item.id}`,
    }
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="biblio" />

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setLightboxSrc(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.96)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <img src={lightboxSrc} alt="" style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', display: 'block' }} />
            <button
              onClick={e => { e.stopPropagation(); setLightboxSrc(null) }}
              style={{
                position: 'absolute', top: 'max(18px, var(--sa-top))', right: 'max(18px, var(--sa-right))',
                ...mono, fontSize: 13, color: '#e8d4b8', opacity: 0.85,
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
              }}
            >
              ✕ {tr('FERMER', 'CLOSE')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/galerie')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('GALERIE', 'GALLERY')}
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          {tr('— PROFIL —', '— PROFILE —')}
        </div>

        {/* ── TITRE (pseudo) ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="font-fraunces font-black leading-tight mb-1"
            style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, overflowWrap: 'anywhere' }}
          >
            <span style={{ color: accent }}>{titreAffichePseudo}</span>
          </div>
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, marginBottom: 18,
          }}>
            {tr('Œuvres publiées', 'Published works')}
          </p>
        </motion.div>

        {/* ── CHARGEMENT ── */}
        {chargement && (
          <div className="flex justify-center py-16">
            <motion.span
              style={{ fontSize: 20, color: accent }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >✦</motion.span>
          </div>
        )}

        {/* ── ERREUR ── */}
        {!chargement && erreur && (
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 17, color: accent, opacity: 0.85,
            textAlign: 'center', padding: '40px 0',
          }}>
            {erreur}
          </p>
        )}

        {/* ── VIDE — ou anonyme ── */}
        {!chargement && !erreur && items.length === 0 && (
          <motion.div
            className="flex flex-col items-center py-14"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p style={{
              fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, textAlign: 'center',
            }}>
              {anonyme
                ? tr('Les anonymes n’ont pas de page : c’est ce qu’anonyme veut dire.', 'Anonymous authors have no page: that is what anonymous means.')
                : tr('Aucune œuvre publiée sous ce nom.', 'No works published under this name.')}
            </p>
            <button
              onClick={() => navigate('/galerie')}
              style={{
                marginTop: 22,
                background: accent, color: btnText,
                ...mono, fontSize: 17, textTransform: 'uppercase',
                padding: '0.8em 1.4em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {tr('Retour à la galerie', 'Back to the gallery')}
            </button>
          </motion.div>
        )}

        {/* ── POÈMES — au sommaire ── */}
        {!chargement && !erreur && poemes.length > 0 && (
          <section aria-label={tr('Poèmes', 'Poems')}>
            {poemes.map(item => <EntreeGalerie key={item.id} {...props(item)} />)}
          </section>
        )}

        {/* ── DESSINS — en planche ── */}
        {!chargement && !erreur && dessins.length > 0 && (
          <section aria-labelledby="titre-planches" style={{ marginTop: poemes.length ? 24 : 0 }}>
            <h2 id="titre-planches" style={{ ...mono, fontSize: 11, color: accent, fontWeight: 700, letterSpacing: '0.22em', margin: '0 0 10px' }}>
              {tr('— PLANCHES —', '— PLATES —')}
            </h2>
            <Planches items={dessins} propsDe={props} />
          </section>
        )}

        <div style={{ flex: 1, minHeight: 12 }} />
      </div>
    </PageTransition>
  )
}
