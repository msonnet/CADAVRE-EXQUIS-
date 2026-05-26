import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoeme, supprimerPoeme, mettreAJourTitre } from '../db'
import type { Poeme } from '../types'
import { useTTS } from '../hooks/useTTS'
import { Decor, useReve } from '../reve'
import { partagerTexte, partagerImageDistante } from '../utils/partager'

const NOMS_STRUCTURES: Record<string, string> = {
  'phrase-simple':  'Structure courte',
  'phrase-etoffee': 'Structure étoffée',
  'vers-libre':     'Vers libre',
}

const MEDIUMS: Record<string, string> = {
  aquarelle: 'Aquarelle', fusain: 'Fusain', huile: "Peinture à l'huile",
  encre: 'Encre de Chine', gravure: 'Gravure', hyperrealisme: 'Hyperréalisme',
  libre: 'Libre', collage_surrealiste: 'Collages surréalistes',
}

export default function PoemeDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const seance = useReve()
  const [poeme, setPoeme] = useState<Poeme | null>(null)
  const [chargement, setChargement] = useState(true)
  const [casesVisibles, setCasesVisibles] = useState(false)
  const [editionTitre, setEditionTitre] = useState(false)
  const [titreDraft, setTitreDraft] = useState('')
  const [confirmSuppression, setConfirmSuppression] = useState(false)
  const [pleinEcran, setPleinEcran] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { parler, arreter, parlant } = useTTS()

  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const colorLabel = c?.name.toUpperCase() ?? ''
  const mono: React.CSSProperties = { fontFamily: "'Outfit', sans-serif", letterSpacing: '0.18em' }

  useEffect(() => {
    if (!id) return
    chargerPoeme(id)
      .then(p => { if (p) { setPoeme(p); setTitreDraft(p.titre ?? '') } })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [id])

  useEffect(() => {
    if (editionTitre) inputRef.current?.focus()
  }, [editionTitre])

  // Close fullscreen on Escape
  useEffect(() => {
    if (!pleinEcran) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPleinEcran(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pleinEcran])

  async function sauvegarderTitre() {
    if (!poeme || !id) return
    const titre = titreDraft.trim() || null
    await mettreAJourTitre(id, titre ?? '')
    setPoeme(p => p ? { ...p, titre } : p)
    setEditionTitre(false)
  }

  async function supprimer() {
    if (!id) return
    await supprimerPoeme(id)
    navigate('/bibliotheque', { replace: true })
  }

  async function partager() {
    if (!poeme) return
    const struct = getStructure(poeme.structureId)
    const textePoeme = reconstruirePoeme(poeme.cases, struct)
    const titre = poeme.titre ?? 'Cadavre Exquis'
    const contenu = `${titre}\n\n${textePoeme}\n\n— Cadavre Exquis, jeu surréaliste`
    if (poeme.illustration?.url) {
      await partagerImageDistante(poeme.illustration.url, titre, contenu, titre)
    } else {
      await partagerTexte(contenu, titre)
    }
  }

  function imprimerPoeme() {
    if (!poeme) return
    const titre = poeme.titre ?? 'Cadavre Exquis'
    const struct = getStructure(poeme.structureId)
    const texte = reconstruirePoeme(poeme.cases, struct)
    const date = new Date(poeme.dateCreation).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    const versHtml = texte.split('\n')
      .map(l => `<p class="vers">${l.trim() ? l.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '&nbsp;'}</p>`)
      .join('')
    const illustrationHtml = poeme.illustration?.url ? `
    <div class="illus">
      <img src="${poeme.illustration.url}" alt="Illustration" onerror="this.parentElement.style.display='none'">
      <p class="medium">${MEDIUMS[poeme.illustration.style] ?? poeme.illustration.style}</p>
    </div>` : ''
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${titre.replace(/</g,'&lt;')}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;background:#faf8f3;color:#1a1714;padding:48px 40px;max-width:560px;margin:0 auto}.ornement{text-align:center;letter-spacing:.5em;font-size:1.1em;margin-bottom:24px}h1{font-size:1.8em;font-style:italic;font-weight:400;text-align:center;margin-bottom:5px}.label{text-align:center;font-size:.72em;letter-spacing:.12em;text-transform:uppercase;color:#999;margin-bottom:28px}hr{border:none;border-top:1px solid #ccc;opacity:.35;margin:24px 0}.illus{text-align:center;margin:20px 0}.illus img{max-width:260px;width:100%}.medium{font-size:.65em;letter-spacing:.1em;text-transform:uppercase;color:#bbb;margin-top:6px}.poeme{text-align:center;margin:12px 0}.vers{font-size:1.3em;font-style:italic;line-height:2.1}.footer{text-align:center;font-size:.65em;letter-spacing:.1em;text-transform:uppercase;color:#c0b8a8;margin-top:48px}@media print{body{padding:16mm 14mm}}</style>
</head><body><div class="ornement">✦ &nbsp; ✦ &nbsp; ✦</div><h1>${titre.replace(/</g,'&lt;')}</h1><p class="label">Cadavre exquis — ${date}</p><hr>${illustrationHtml}${illustrationHtml ? '<hr>' : ''}<div class="poeme">${versHtml}</div><hr><p class="footer">Cadavre Exquis · Jeu surréaliste</p><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  if (chargement) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <motion.span
          aria-label="Chargement…"
          style={{ fontSize: 22, color: accent }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >✦</motion.span>
      </PageTransition>
    )
  }

  if (!poeme) {
    return (
      <PageTransition className="page-carnet relative flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: encre, opacity: 0.75 }}>
          Poème introuvable.
        </p>
        <button
          onClick={() => navigate('/bibliotheque')}
          style={{ marginTop: 28, background: accent, color: '#e8d4b8', ...mono, fontSize: 13, textTransform: 'uppercase', padding: '0.9em 1.8em', border: 'none', cursor: 'pointer' }}
        >
          Mes poèmes
        </button>
      </PageTransition>
    )
  }

  const structure = getStructure(poeme.structureId)
  const texte = reconstruirePoeme(poeme.cases, structure)
  const lignes = texte.split('\n')
  const lettrine = lignes[0]?.trim().charAt(0) ?? ''
  const resteLigne0 = lignes[0]?.trim().slice(1) ?? ''
  const voixCount = poeme.cases.length
  const structLabel = NOMS_STRUCTURES[poeme.structureId] ?? poeme.structureId
  const dateStr = new Date(poeme.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
  const heureStr = new Date(poeme.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const illustrationLabel = poeme.illustration ? (MEDIUMS[poeme.illustration.style] ?? poeme.illustration.style) : null

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <Decor variant="detail" />

      {/* ── PLEIN ÉCRAN ILLUSTRATION ── */}
      <AnimatePresence>
        {pleinEcran && poeme.illustration?.url && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Illustration en plein écran"
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(10,6,3,0.97)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'zoom-out',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setPleinEcran(false)}
          >
            <img
              src={poeme.illustration.url}
              alt="Illustration surréaliste du poème"
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain' }}
            />
            {illustrationLabel && (
              <p style={{ ...mono, fontSize: 12, color: '#e8d4b8', opacity: 0.75, marginTop: 12 }}>
                {illustrationLabel.toUpperCase()}
              </p>
            )}
            <button
              aria-label="Fermer le plein écran"
              onClick={() => setPleinEcran(false)}
              style={{ position: 'absolute', top: 20, right: 20, ...mono, fontSize: 13, color: '#e8d4b8', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ✕ FERMER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-baseline">
          <button
            onClick={() => navigate('/bibliotheque')}
            aria-label="Retour à mes poèmes"
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← MES POÈMES
          </button>
          <span style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700 }}>{colorLabel}</span>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45 }} />

        {/* ── LABEL ── */}
        <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginTop: 20, marginBottom: 8 }}>
          — FEUILLET —
        </div>

        {/* ── TITRE éditable ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 6 }}
        >
          {editionTitre ? (
            <div className="flex gap-2 items-center">
              <input
                ref={inputRef}
                className="champ-carnet flex-1"
                style={{ borderLeftColor: accent, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 20 }}
                value={titreDraft}
                onChange={e => setTitreDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') sauvegarderTitre()
                  if (e.key === 'Escape') setEditionTitre(false)
                }}
                placeholder="Titre du poème…"
                aria-label="Titre du poème"
              />
              <button
                onClick={sauvegarderTitre}
                aria-label="Valider le titre"
                style={{ ...mono, fontSize: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >✓</button>
              <button
                onClick={() => setEditionTitre(false)}
                aria-label="Annuler l'édition du titre"
                style={{ ...mono, fontSize: 12, color: encre, opacity: 0.75, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditionTitre(true)}
              aria-label={poeme.titre ? `Titre : ${poeme.titre}. Tap pour renommer` : 'Sans titre — tap pour nommer'}
              className="text-left w-full"
            >
              <div
                className="font-bodoni font-black italic leading-tight"
                style={{ fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: poeme.titre ? encre : `${encre}40` }}
              >
                {poeme.titre ?? 'Sans titre'}
              </div>
              {!poeme.titre && (
                <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.7, marginTop: 2 }}>
                  TAP POUR NOMMER
                </div>
              )}
            </button>
          )}
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 20 }} />

        {/* ── ILLUSTRATION ── */}
        {poeme.illustration?.url && (
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <button
              onClick={() => setPleinEcran(true)}
              aria-label="Voir l'illustration en plein écran"
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'zoom-in', padding: 0 }}
            >
              <img
                src={poeme.illustration.url}
                alt="Illustration surréaliste du poème"
                className="w-full"
                style={{ borderColor: `${accent}30`, filter: 'contrast(0.96) sepia(0.08)' }}
              />
            </button>
            <div className="flex justify-between items-center mt-2">
              {illustrationLabel && (
                <span style={{ ...mono, fontSize: 12, color: encre, opacity: 0.75 }}>{illustrationLabel.toUpperCase()}</span>
              )}
              <button
                onClick={() => setPleinEcran(true)}
                aria-label="Agrandir l'illustration"
                style={{ ...mono, fontSize: 12, color: accent, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}
              >
                ↗ AGRANDIR
              </button>
            </div>
          </motion.div>
        )}

        {/* ── POÈME ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          style={{ marginBottom: 16 }}
        >
          <div style={{ ...mono, fontSize: 12, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 10 }}>
            — LE CADAVRE —
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: encre, fontSize: 16, lineHeight: 1.7 }}>
            {lettrine && (
              <span style={{
                fontFamily: "'Bodoni Moda', serif", fontWeight: 900, fontStyle: 'italic',
                fontSize: 'clamp(2.8rem, 10vw, 3.4rem)',
                lineHeight: 0.85, color: accent,
                float: 'left', marginRight: 6, marginTop: 4,
              }}>
                {lettrine}
              </span>
            )}
            {resteLigne0 && <span>{resteLigne0}</span>}
            {lignes.slice(1).map((ligne, i) => (
              <React.Fragment key={i}>
                <br />
                {ligne || ' '}
              </React.Fragment>
            ))}
          </div>
          <div style={{ ...mono, fontSize: 12, color: encre, opacity: 0.7, marginTop: 14, paddingTop: 8, borderTop: `0.5px solid ${encre}15` }}>
            {dateStr} · {voixCount} VOIX · {structLabel.toUpperCase()} · {heureStr}
          </div>
        </motion.div>

        <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 16 }} />

        {/* ── ACTIONS PRINCIPALES ── */}
        <motion.div
          className="flex justify-between items-center mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={() => parlant ? arreter() : parler(texte)}
            aria-label={parlant ? 'Arrêter la lecture' : 'Écouter le poème'}
            aria-pressed={parlant}
            style={{ ...mono, fontSize: 13, color: parlant ? accent : encre, opacity: parlant ? 0.9 : 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {parlant ? '◾ RÉCITER' : '— RÉCITER —'}
          </button>
          <button
            onClick={partager}
            aria-label="Partager le poème"
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            — PARTAGER —
          </button>
          <button
            onClick={imprimerPoeme}
            aria-label="Télécharger le poème en PDF"
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            — PDF —
          </button>
          <button
            onClick={() => setCasesVisibles(v => !v)}
            aria-label={casesVisibles ? 'Masquer les coutures' : 'Voir case par case'}
            aria-expanded={casesVisibles}
            style={{ ...mono, fontSize: 13, color: casesVisibles ? accent : encre, opacity: casesVisibles ? 0.9 : 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            — COUTURES —
          </button>
        </motion.div>

        {/* ── COUTURES ── */}
        <AnimatePresence>
          {casesVisibles && (
            <motion.div
              key="coutures"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              style={{ marginBottom: 16 }}
            >
              <hr style={{ border: 'none', borderTop: `0.5px solid ${encre}`, opacity: 0.12, marginBottom: 12 }} />
              {poeme.cases.map((cas, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `2px solid ${accent}35`, paddingLeft: 12,
                    paddingTop: 6, paddingBottom: 6, marginBottom: 10,
                  }}
                >
                  <div style={{ ...mono, fontSize: 12, color: accent, opacity: 0.8, marginBottom: 3 }}>
                    {cas.fonction?.toUpperCase() ?? `CASE ${i + 1}`}
                    <span style={{ color: encre, opacity: 0.35, margin: '0 8px' }}>—</span>
                    <em style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
                      {cas.auteur === 'ia' ? 'voix IA' : cas.joueurNumero ? `joueur ${cas.joueurNumero}` : 'toi'}
                    </em>
                  </div>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: encre, fontSize: 16, lineHeight: 1.4 }}>
                    {cas.texte}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1 }} />

        {/* ── CTA NOUVELLE PARTIE ── */}
        <motion.div
          className="mb-3 mt-4"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={() => navigate('/config')}
            className="w-full flex flex-col items-center justify-center"
            aria-label="Démarrer une nouvelle partie"
            style={{
              background: accent, color: '#e8d4b8',
              ...mono, fontSize: 13, textTransform: 'uppercase',
              padding: '1.1em 1em', border: 'none', cursor: 'pointer', gap: 2,
            }}
          >
            <span>Nouvelle partie</span>
            <span aria-hidden style={{ fontSize: 14, opacity: 0.85 }}>→</span>
          </button>
        </motion.div>

        {/* ── SUPPRESSION ── */}
        <div className="flex justify-center pb-3">
          <AnimatePresence mode="wait">
            {!confirmSuppression ? (
              <motion.button
                key="suppr"
                onClick={() => setConfirmSuppression(true)}
                aria-label="Supprimer ce poème"
                style={{ ...mono, fontSize: 12, color: encre, opacity: 0.9, background: 'none', border: 'none', cursor: 'pointer' }}
                initial={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
              >
                — SUPPRIMER —
              </motion.button>
            ) : (
              <motion.div
                key="confirm"
                className="flex gap-5 items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span style={{ ...mono, fontSize: 12, color: encre, opacity: 0.8 }}>SUPPRIMER DÉFINITIVEMENT ?</span>
                <button
                  onClick={supprimer}
                  aria-label="Confirmer la suppression"
                  style={{ ...mono, fontSize: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer' }}
                >OUI</button>
                <button
                  onClick={() => setConfirmSuppression(false)}
                  aria-label="Annuler la suppression"
                  style={{ ...mono, fontSize: 12, color: encre, opacity: 0.8, background: 'none', border: 'none', cursor: 'pointer' }}
                >NON</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </PageTransition>
  )
}
