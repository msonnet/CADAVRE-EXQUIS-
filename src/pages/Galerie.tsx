import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { Decor, useReve } from '../reve'
import { supabase } from '../lib/supabase'
import { useSound } from '../hooks/useSound'
import { useAuth } from '../hooks/useAuth'
import { useReactionsGalerie } from '../hooks/useReactionsGalerie'
import { mono } from '../lib/typo'
import { api } from '../lib/apiBase'
import { tr, langueActuelle } from '../i18n'
import { chargerPoemes, chargerDessins } from '../db'
import EntreeGalerie, { Planches } from '../components/EntreeGalerie'
import {
  type Publication, type TypePublication,
  languePublication, correspond, retenusDeLaSemaine,
} from '../lib/galerie'
import { almanach, type ChaineScellee } from '../lib/jour'

const PAGE_SIZE = 20
const COLONNES = 'id, type, titre, payload, image_url, author_pseudo, author_avatar, author_id, created_at, views_count'

type GalleryType = TypePublication
type GalleryItem = Publication

const REPORT_REASONS = [
  { id: 'inappropriate', label: tr('Contenu inapproprié', 'Inappropriate content') },
  { id: 'spam', label: tr('Spam', 'Spam') },
  { id: 'offensive', label: tr('Contenu offensant', 'Offensive content') },
  { id: 'other', label: tr('Autre', 'Other') },
] as const

// ── Auteurs masqués (App Store guideline 1.2 : bloquer un utilisateur abusif) ──
// Liste locale à l'appareil ; réinitialisable depuis Réglages.
export const MASQUES_KEY = 'auteurs-masques'

export function cleAuteur(item: { author_id?: string | null; author_pseudo: string }): string {
  return item.author_id ?? `p:${item.author_pseudo}`
}

function lireMasques(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MASQUES_KEY) ?? '[]')) }
  catch { return new Set() }
}

/** « 28 SEPT. » — le jour UTC d'une chaîne scellée, comme l'almanach l'écrit. */
function dateNumero(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`)
  return d.toLocaleDateString(tr('fr-FR', 'en-GB'), { day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase()
}

export default function Galerie() {
  const navigate = useNavigate()
  const seance = useReve()
  const { jouer } = useSound()
  const { user } = useAuth()

  const accent = seance?.accent.hex ?? '#b22c20'
  const encre = seance?.ambiance.ink ?? '#e6d4b8'
  const bg = seance?.ambiance.bg ?? '#15110d'
  const btnText = seance?.ambiance.buttonText ?? '#0f0805'


  const [onglet, setOnglet] = useState<GalleryType>('poeme')
  const [recherche, setRecherche] = useState('')
  const [items, setItems] = useState<GalleryItem[]>([])
  const [chargement, setChargement] = useState(true)
  const [chargementPlus, setChargementPlus] = useState(false)
  const [pageOffset, setPageOffset] = useState(0)
  const [encore, setEncore] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const { reactions, mine, charger: chargerReactions, basculer: toggleReaction } = useReactionsGalerie()
  const seenViews = useRef<Set<string>>(new Set())
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportDone, setReportDone] = useState(false)
  const [reportError, setReportError] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [masques, setMasques] = useState<Set<string>>(lireMasques)
  const [retenus, setRetenus] = useState<GalleryItem[]>([])
  const [numeros, setNumeros] = useState<ChaineScellee[]>([])
  // Les publications de ce téléphone : les rouvrir ne compte pas une
  // lecture. Un auteur qui relit son poème dix fois se serait annoncé dix
  // lecteurs — et c'est exactement le chiffre qu'on lui montre désormais.
  const siennes = useRef<Set<string>>(new Set())
  useEffect(() => {
    Promise.all([chargerPoemes(), chargerDessins()])
      .then(([p, d]) => {
        for (const x of [...p, ...d]) if (x.publication?.id) siennes.current.add(x.publication.id)
      })
      .catch(() => { /* stockage illisible : on compte, comme avant */ })
  }, [])

  const masquerAuteur = useCallback((item: GalleryItem) => {
    setMasques(prev => {
      const next = new Set(prev)
      next.add(cleAuteur(item))
      try { localStorage.setItem(MASQUES_KEY, JSON.stringify([...next])) } catch { /* plein */ }
      return next
    })
    setExpanded(null)
  }, [])

  const incrementView = useCallback(async (item: GalleryItem) => {
    const galleryId = item.id
    if (seenViews.current.has(galleryId)) return
    seenViews.current.add(galleryId)
    if (siennes.current.has(galleryId) || (user && item.author_id === user.id)) return
    try {
      const { error } = await supabase.rpc('increment_gallery_view', { g_id: galleryId })
      if (error) {
        console.error('[Galerie] Erreur incrément vue', error)
        return
      }
      const plusUn = (it: GalleryItem) => it.id === galleryId ? { ...it, views_count: (it.views_count ?? 0) + 1 } : it
      setItems(prev => prev.map(plusUn))
      setRetenus(prev => prev.map(plusUn))
    } catch (e) {
      console.error('[Galerie] Exception incrément vue', e)
    }
  }, [user])

  // La clé d'ouverture distingue le sommaire de la liste : une publication
  // retenue cette semaine figure aux deux endroits, et ne doit s'ouvrir
  // qu'à celui qu'on a touché.
  const handleExpand = useCallback((cle: string, item: GalleryItem) => {
    const next = expanded === cle ? null : cle
    setExpanded(next)
    if (next) incrementView(item)
  }, [expanded, incrementView])

  const envoyerSignalement = useCallback(async () => {
    if (!reportingId || !reportReason) return
    setReportSending(true)
    setReportError(false)
    try {
      const res = await fetch(api('/api/report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: reportingId,
          reason: reportReason,
          details: reportDetails || undefined,
          reporter_id: user?.id ?? null,
        }),
      })
      if (res.ok) {
        setReportDone(true)
        setTimeout(() => {
          setReportingId(null)
          setReportDone(false)
          setReportReason('')
          setReportDetails('')
        }, 2000)
      } else {
        setReportError(true)
      }
    } catch {
      setReportError(true)
    } finally {
      setReportSending(false)
    }
  }, [reportingId, reportReason, reportDetails, user])

  const supprimerItem = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from('gallery').delete().eq('id', id)
      // Retirée aussi du sommaire de la semaine : elle y restait jusqu'au
      // rechargement, sous les yeux de l'auteur qui venait de la supprimer.
      if (!error) {
        setItems(prev => prev.filter(it => it.id !== id))
        setRetenus(prev => prev.filter(it => it.id !== id))
      }
    } catch { /* ignore */ } finally {
      setDeletingId(null)
    }
  }, [])

  const chargerItems = useCallback(async (type: GalleryType, offset: number, reset: boolean) => {
    if (reset) {
      setChargement(true)
      setItems([])
      setEncore(true)
    } else {
      setChargementPlus(true)
    }
    setErreur(null)

    try {
      // Le filtre de langue est côté client (langue portée par le payload) :
      // on avance dans les pages jusqu'à trouver des publications dans la
      // langue active, ou épuiser la table.
      let curseur = offset
      let fini = false
      let nouveaux: GalleryItem[] = []
      for (let tour = 0; tour < 5 && nouveaux.length === 0 && !fini; tour++) {
        const { data, error } = await supabase
          .from('gallery')
          .select(COLONNES)
          .eq('type', type)
          .order('created_at', { ascending: false })
          .range(curseur, curseur + PAGE_SIZE * 2 - 1)

        if (error) {
          console.error('[Galerie] Erreur de chargement', error)
          setErreur(tr('Impossible de charger la galerie.', 'Could not load the gallery.'))
          setChargement(false)
          setChargementPlus(false)
          return
        }

        const bruts = (data ?? []) as GalleryItem[]
        curseur += bruts.length
        fini = bruts.length < PAGE_SIZE * 2
        nouveaux = bruts.filter(it => languePublication(it) === langueActuelle())
      }

      setItems(prev => reset ? nouveaux : [...prev, ...nouveaux])
      setEncore(!fini)
      setPageOffset(curseur)
      setChargement(false)
      setChargementPlus(false)

      if (nouveaux.length > 0) {
        chargerReactions(nouveaux.map(n => n.id))
      }
    } catch (e) {
      console.error('[Galerie] Exception chargement', e)
      setErreur(tr('Impossible de charger la galerie.', 'Could not load the gallery.'))
      setChargement(false)
      setChargementPlus(false)
    }
  }, [chargerReactions])

  useEffect(() => {
    setExpanded(null)
    setRecherche('')
    chargerItems(onglet, 0, true)
  }, [onglet, chargerItems])

  // ── La semaine des lecteurs ──
  //
  // La seule découverte possible était le fil chronologique : un poème
  // publié lundi était enfoui jeudi, quels qu'aient été ses lecteurs. Trois
  // publications retenues par les réactions des sept derniers jours, en
  // tête des poèmes. Deux requêtes ; une panne n'affiche rien, et la liste
  // reste ce qu'elle était.
  useEffect(() => {
    if (onglet !== 'poeme') { setRetenus([]); return }
    let annule = false
    ;(async () => {
      try {
        const maintenant = Date.now()
        const { data, error } = await supabase
          .from('gallery_reactions')
          .select('gallery_id, emoji, reactor_key, created_at')
          .gte('created_at', new Date(maintenant - 7 * 86_400_000).toISOString())
          .limit(2000)
        if (error || !data?.length) return
        // On en prend plus que trois : la langue et le type ne se filtrent
        // qu'une fois les publications lues.
        const ids = retenusDeLaSemaine(data as { gallery_id: string; emoji: string; reactor_key: string; created_at: string }[], maintenant, 12)
        if (!ids.length) return
        const { data: rows, error: e2 } = await supabase.from('gallery').select(COLONNES).in('id', ids)
        if (e2 || !rows || annule) return
        const parId = new Map((rows as GalleryItem[]).map(r => [r.id, r]))
        const choisis = ids
          .map(id => parId.get(id))
          .filter((r): r is GalleryItem => !!r && r.type === 'poeme' && languePublication(r) === langueActuelle())
          .slice(0, 3)
        setRetenus(choisis)
        chargerReactions(choisis.map(r => r.id))
      } catch { /* le sommaire se tait */ }
    })()
    return () => { annule = true }
  }, [onglet, chargerReactions])

  // ── Les numéros du poème du jour ──
  //
  // Le second titre du sommaire. La galerie ne menait au rendez-vous que
  // par un lien d'en-tête, vers la journée en cours : les poèmes scellés,
  // les seuls de tout le jeu écrits par une foule, n'y figuraient nulle
  // part. Les trois derniers, dans la langue active — `almanach` filtre
  // déjà — et rien de plus que leur date et leur amorce : un nombre de vers
  // ou de mains ferait un palmarès. Une panne rend une liste vide, donc
  // rien.
  useEffect(() => {
    if (onglet !== 'poeme') { setNumeros([]); return }
    let annule = false
    almanach(3).then(a => { if (!annule) setNumeros(a) })
    return () => { annule = true }
  }, [onglet])

  // ── Les actions de modération, dans l'état déplié seulement ──
  function actionsDe(item: GalleryItem): React.ReactNode {
    if (user && item.author_id === user.id) {
      return (
        <button
          onClick={() => {
            if (deletingId === item.id) return
            if (confirm(tr('Supprimer cette publication ?', 'Delete this publication?'))) supprimerItem(item.id)
          }}
          style={{
            ...mono, fontSize: 13, color: accent, opacity: 0.85,
            background: 'none', border: `0.5px solid ${accent}40`,
            borderRadius: 3,
            cursor: 'pointer', padding: '9px 12px', minHeight: 40,
          }}
        >
          {deletingId === item.id ? '…' : tr('✕ SUPPRIMER', '✕ DELETE')}
        </button>
      )
    }
    return (
      <>
        <button
          onClick={() => {
            setReportingId(item.id)
            setReportReason('')
            setReportDetails('')
          }}
          style={{
            ...mono, fontSize: 13, color: encre, opacity: 0.65,
            background: 'none', border: `0.5px solid ${encre}30`,
            borderRadius: 3,
            cursor: 'pointer', padding: '9px 12px', minHeight: 40,
          }}
        >
          ⚑ {tr('Signaler', 'Report')}
        </button>
        <button
          onClick={() => {
            if (confirm(tr(`Masquer toutes les publications de « ${item.author_pseudo} » ? (réversible dans Réglages)`, `Hide all publications from “${item.author_pseudo}”? (reversible in Settings)`))) {
              masquerAuteur(item)
            }
          }}
          aria-label={tr(`Masquer les publications de ${item.author_pseudo}`, `Hide publications from ${item.author_pseudo}`)}
          style={{
            ...mono, fontSize: 13, color: encre, opacity: 0.65,
            background: 'none', border: `0.5px solid ${encre}30`,
            borderRadius: 3,
            cursor: 'pointer', padding: '9px 12px', minHeight: 40,
          }}
        >
          ⊘ {tr("Masquer l'auteur", 'Hide author')}
        </button>
      </>
    )
  }

  function propsEntree(item: GalleryItem, cle: string, domId: string) {
    return {
      item,
      ouvert: expanded === cle,
      onBasculer: () => handleExpand(cle, item),
      reactions: reactions[item.id] ?? {},
      mine: mine[item.id] ?? new Set<string>(),
      onReagir: (c: Parameters<typeof toggleReaction>[1]) => toggleReaction(item.id, c),
      onAgrandir: (src: string) => setLightboxSrc(src),
      accent, encre,
      actions: actionsDe(item),
      domId,
    }
  }

  function entree(item: GalleryItem, cle: string, domId: string) {
    return <EntreeGalerie key={cle} {...propsEntree(item, cle, domId)} />
  }

  const chargerPlus = () => {
    if (chargementPlus || !encore) return
    chargerItems(onglet, pageOffset, false)
  }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom overflow-hidden">
      <Decor variant="biblio" />

      {/* ── MODAL SIGNALEMENT ── */}
      <AnimatePresence>
        {reportingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              background: 'rgba(0,0,0,0.72)',
              display: 'flex', alignItems: 'flex-end',
            }}
            onClick={() => { if (!reportSending) { setReportingId(null); setReportReason(''); setReportDetails('') } }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={tr('Signaler ce contenu', 'Report this content')}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                background: bg,
                borderTop: `1.5px solid ${accent}55`,
                padding: '24px 20px calc(24px + var(--sa-bottom))',
                display: 'flex', flexDirection: 'column', gap: 16,
              }}
            >
              <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em' }}>
                {tr('— SIGNALER CE CONTENU —', '— REPORT THIS CONTENT —')}
              </div>

              {reportDone ? (
                <p role="status" style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85 }}>
                  {tr('Signalement envoyé. Merci.', 'Report sent. Thank you.')}
                </p>
              ) : (
                <>
                  {reportError && (
                    <p role="alert" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: accent }}>
                      {tr("L'envoi a échoué — vérifie ta connexion et réessaie.", "Sending failed — check your connection and try again.")}
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setReportReason(r.id)}
                        style={{
                          ...mono, fontSize: 15, textAlign: 'left',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: reportReason === r.id ? `1.5px solid ${accent}` : `0.5px solid ${encre}30`,
                          borderRadius: 3,
                          color: reportReason === r.id ? accent : encre,
                          cursor: 'pointer',
                        }}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder={tr('Détails (facultatif)…', 'Details (optional)…')}
                    maxLength={500}
                    rows={3}
                    style={{
                      ...mono, fontSize: 16, color: encre,
                      background: `${encre}08`,
                      border: `0.5px solid ${encre}30`,
                      borderRadius: 3,
                      padding: '10px 12px',
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => { setReportingId(null); setReportReason(''); setReportDetails('') }}
                      style={{
                        flex: 1, ...mono, fontSize: 14,
                        padding: '12px 0',
                        background: 'transparent',
                        border: `0.5px solid ${encre}30`,
                        borderRadius: 3,
                        color: encre, opacity: 0.7,
                        cursor: 'pointer',
                      }}
                    >
                      {tr('ANNULER', 'CANCEL')}
                    </button>
                    <button
                      onClick={envoyerSignalement}
                      disabled={!reportReason || reportSending}
                      style={{
                        flex: 2, ...mono, fontSize: 14, fontWeight: 700,
                        padding: '12px 0',
                        background: reportReason && !reportSending ? accent : `${accent}55`,
                        border: 'none',
                        borderRadius: 3,
                        color: btnText,
                        cursor: reportReason && !reportSending ? 'pointer' : 'default',
                      }}
                    >
                      {reportSending ? '…' : tr('SIGNALER', 'REPORT')}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <motion.img
              src={lightboxSrc}
              alt=""
              initial={{ scale: 0.93 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={e => { e.stopPropagation(); setLightboxSrc(null) }}
              style={{
                position: 'absolute', top: 'max(18px, var(--sa-top))', right: 'max(18px, var(--sa-right))',
                fontFamily: "'Raleway', sans-serif", letterSpacing: '0.16em',
                fontSize: 17, color: '#e8d4b8', opacity: 0.85,
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
            onClick={() => navigate('/')}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← {tr('ACCUEIL', 'HOME')}
          </button>
          <button
            onClick={() => { jouer('clic'); navigate('/poeme-du-jour') }}
            style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {tr('POÈME DU JOUR', 'POEM OF THE DAY')} →
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          {tr('— GALERIE —', '— GALLERY —')}
        </div>

        {/* ── TITRE ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="font-fraunces font-black leading-tight mb-1"
            style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre }}
          >
            {tr('Créations', 'Shared')} <span style={{ color: accent }}>{tr('partagées', 'creations')}</span>
          </div>
          <p style={{
            fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.85, marginBottom: 18,
          }}>
            {tr('Les œuvres de la communauté', 'Works from the community')}
          </p>
        </motion.div>

        {/* ── ONGLETS ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 14, borderBottom: `0.5px solid ${encre}20` }}>
          {(['poeme', 'dessin'] as const).map(t => {
            const actif = onglet === t
            return (
              <button
                key={t}
                onClick={() => { jouer('clic'); setOnglet(t) }}
                style={{
                  ...mono,
                  fontSize: 17,
                  fontWeight: 700,
                  color: actif ? accent : encre,
                  opacity: actif ? 1 : 0.55,
                  background: 'none',
                  border: 'none',
                  borderBottom: actif ? `2px solid ${accent}` : '2px solid transparent',
                  padding: '10px 18px 10px 0',
                  marginRight: 18,
                  cursor: 'pointer',
                  letterSpacing: '0.22em',
                }}
              >
                {t === 'poeme' ? tr('POÈMES', 'POEMS') : tr('DESSINS', 'DRAWINGS')}
              </button>
            )
          })}
        </div>

        {/* La légende des réactions est retirée : chaque bouton porte
            désormais son mot à côté de son signe, là où l'on réagit. */}

        {/* ── RECHERCHE ── */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder={tr('Un vers, un titre, un nom…', 'A line, a title, a name…')}
            aria-label={tr('Rechercher un vers, un titre ou un auteur', 'Search a line, a title or an author')}
            enterKeyHint="search"
            style={{
              width: '100%',
              ...mono, fontSize: 16,
              color: encre,
              background: `${encre}06`,
              border: `0.5px solid ${encre}25`,
              borderBottom: recherche ? `1px solid ${accent}` : `0.5px solid ${encre}25`,
              borderRadius: 3,
              outline: 'none',
              padding: '10px 12px',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

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

        {/* ── VIDE ── */}
        {!chargement && !erreur && items.length === 0 && (
          <motion.div
            className="flex flex-col items-center py-14"
            style={{ gap: 18, width: '100%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p style={{
              fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.75, textAlign: 'center',
            }}>
              {tr("Aucune création partagée pour l'instant.", "No shared creations yet.")}
            </p>
            <p style={{
              ...mono, fontSize: 13, color: encre, opacity: 0.55, textAlign: 'center', lineHeight: 1.6,
            }}>
              {onglet === 'poeme'
                ? tr('Compose un poème, puis publie-le ici depuis le recueil.', 'Compose a poem, then publish it here from your collection.')
                : tr('Dessine un cadavre, puis publie-le ici depuis le recueil.', 'Draw a cadavre, then publish it here from your collection.')}
            </p>
            <button
              onClick={() => { jouer('clic'); navigate(onglet === 'poeme' ? '/config' : '/config-dessin') }}
              style={{
                background: accent, color: btnText,
                ...mono, fontSize: 15, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '0.85em 1.6em', border: 'none', cursor: 'pointer', borderRadius: 3,
              }}
            >
              {onglet === 'poeme' ? tr('Cadavre Écrit →', 'Written Cadavre →') : tr('Cadavre Dessiné →', 'Drawn Cadavre →')}
            </button>
          </motion.div>
        )}

        {/* ── LA SEMAINE DES LECTEURS ── */}
        {!chargement && !erreur && onglet === 'poeme' && !recherche.trim() && (() => {
          const visibles = retenus.filter(it => !masques.has(cleAuteur(it)))
          if (!visibles.length) return null
          return (
            <section aria-labelledby="titre-semaine" style={{ marginBottom: 22 }}>
              <h2 id="titre-semaine" style={{ ...mono, fontSize: 11, color: accent, fontWeight: 700, letterSpacing: '0.22em', margin: '0 0 2px' }}>
                {tr('— LA SEMAINE DES LECTEURS —', "— THE READERS' WEEK —")}
              </h2>
              {visibles.map(item => entree(item, `s:${item.id}`, `semaine-${item.id}`))}
            </section>
          )
        })()}

        {/* ── LES NUMÉROS DU POÈME DU JOUR ── */}
        {!chargement && !erreur && onglet === 'poeme' && !recherche.trim() && numeros.length > 0 && (
          <nav aria-label={tr('Numéros du poème du jour', 'Past issues of the poem of the day')} style={{ marginBottom: 22 }}>
            <h2 style={{ ...mono, fontSize: 11, color: accent, fontWeight: 700, letterSpacing: '0.22em', margin: '0 0 2px' }}>
              {tr('— LES POÈMES DU JOUR —', '— POEMS OF THE DAY —')}
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {numeros.map(n => (
                <li key={n.id} style={{ borderBottom: `0.5px solid ${encre}18` }}>
                  <Link
                    to={`/poeme-du-jour?jour=${n.jour}`}
                    onClick={() => jouer('clic')}
                    style={{
                      display: 'flex', alignItems: 'baseline', gap: 14, minHeight: 44,
                      padding: '11px 0', color: encre, textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18, opacity: 0.9, minWidth: 0, overflowWrap: 'anywhere' }}>
                      {n.amorce}
                    </span>
                    <span style={{ ...mono, fontSize: 11, letterSpacing: '0.14em', opacity: 0.6, marginLeft: 'auto', flexShrink: 0 }}>
                      {dateNumero(n.jour)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* ── LISTE ── */}
        {!chargement && !erreur && items.length > 0 && (() => {
          const visibles = items.filter(it => !masques.has(cleAuteur(it)))
          const itemsFiltres = recherche.trim()
            ? visibles.filter(it => correspond(it, recherche))
            : visibles
          if (itemsFiltres.length === 0) {
            return (
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: encre, opacity: 0.6, textAlign: 'center', padding: '28px 0' }}>
                {tr(`Aucun résultat pour « ${recherche} ».`, `No results for “${recherche}”.`)}
              </p>
            )
          }
          if (onglet === 'dessin') {
            // La planche : deux colonnes, chaque dessin à sa hauteur
            // entière, et les détails sous la rangée (`Planches`).
            return <Planches items={itemsFiltres} propsDe={item => propsEntree(item, item.id, `pub-${item.id}`)} />
          }
          return (
            <section aria-label={tr('Publications', 'Publications')}>
              {recherche.trim() === '' && (numeros.length > 0 || retenus.some(r => !masques.has(cleAuteur(r)))) && (
                <h2 style={{ ...mono, fontSize: 11, color: accent, fontWeight: 700, letterSpacing: '0.22em', margin: '0 0 2px' }}>
                  {tr('— AU FIL DES JOURS —', '— DAY BY DAY —')}
                </h2>
              )}
              {itemsFiltres.map(item => entree(item, item.id, `pub-${item.id}`))}
            </section>
          )
        })()}

        {/* ── CHARGER PLUS ── */}
        {!chargement && !erreur && items.length > 0 && encore && (
          <motion.div
            style={{ marginTop: 18, marginBottom: 4 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={chargerPlus}
              disabled={chargementPlus}
              style={{
                width: '100%',
                background: chargementPlus ? `${accent}aa` : accent,
                color: btnText,
                ...mono, fontSize: 17, textTransform: 'uppercase',
                padding: '0.9em 1em',
                border: 'none',
                borderRadius: 3,
                cursor: chargementPlus ? 'wait' : 'pointer',
              }}
            >
              {chargementPlus ? (
                <motion.span
                  style={{ display: 'inline-block' }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >✦</motion.span>
              ) : tr('Charger plus →', 'Load more →')}
            </button>
          </motion.div>
        )}

        {!chargement && !erreur && items.length > 0 && !encore && (
          <p style={{
            ...mono, fontSize: 13, color: encre, opacity: 0.55,
            textAlign: 'center', marginTop: 18, marginBottom: 4,
          }}>
            {tr('— FIN —', '— END —')}
          </p>
        )}

        <div style={{ flex: 1, minHeight: 12 }} />

        {/* Référence à bg pour cohérence — la couleur de fond est déjà appliquée par le Decor */}
        <div aria-hidden style={{ display: 'none', background: bg }} />

      </div>
    </PageTransition>
  )
}
