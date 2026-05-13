import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { getStructure, reconstruirePoeme } from '../structures'
import { chargerPoeme, supprimerPoeme, mettreAJourTitre } from '../db'
import type { Poeme } from '../types'
import { useTTS } from '../hooks/useTTS'

export default function PoemeDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [poeme, setPoeme] = useState<Poeme | null>(null)
  const [chargement, setChargement] = useState(true)
  const [casesVisibles, setCasesVisibles] = useState(false)
  const [editionTitre, setEditionTitre] = useState(false)
  const [titreDraft, setTitreDraft] = useState('')
  const [confirmSuppression, setConfirmSuppression] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { parler, arreter, parlant } = useTTS()

  function imprimerPoeme() {
    if (!poeme) return
    const titre = poeme.titre ?? 'Cadavre Exquis'
    const struct = getStructure(poeme.structureId)
    const texte = reconstruirePoeme(poeme.cases, struct)
    const date = new Date(poeme.dateCreation).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const versHtml = texte.split('\n')
      .map(l => `<p class="vers">${l.trim() ? l.replace(/&/g,'&amp;').replace(/</g,'&lt;') : '&nbsp;'}</p>`)
      .join('')

    const MEDIUMS: Record<string, string> = {
      aquarelle: 'Aquarelle', fusain: 'Fusain', huile: "Peinture à l'huile",
      encre: 'Encre de Chine', gravure: 'Gravure',
      hyperrealisme: 'Hyperréalisme', libre: 'Libre',
      cyanotype: 'Cyanotype', linogravure: 'Linogravure', pastel: 'Pastel sec',
      collage: 'Collage', gouache: 'Gouache', sanguine: 'Sanguine',
      mezzotinte: 'Mezzotinte', lavis: 'Lavis', serigraphie: 'Sérigraphie',
    }
    const illustrationHtml = poeme.illustration?.url ? `
    <div class="illus">
      <img src="${poeme.illustration.url}" alt="Illustration" onerror="this.parentElement.style.display='none'">
      <p class="medium">${MEDIUMS[poeme.illustration.style] ?? poeme.illustration.style}</p>
    </div>` : ''

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre.replace(/</g,'&lt;')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;background:#faf8f3;color:#1a1714;padding:48px 40px;max-width:560px;margin:0 auto}
.ornement{text-align:center;color:#c9a84c;letter-spacing:.5em;font-size:1.1em;margin-bottom:24px}
h1{font-size:1.8em;font-style:italic;font-weight:400;text-align:center;margin-bottom:5px;line-height:1.3}
.label{text-align:center;font-size:.72em;letter-spacing:.12em;text-transform:uppercase;color:#999;margin-bottom:28px}
hr{border:none;border-top:1px solid #c9a84c;opacity:.35;margin:24px 0}
.illus{text-align:center;margin:20px 0}
.illus img{max-width:260px;width:100%;filter:sepia(0.12) contrast(0.95);border:1px solid rgba(201,168,76,.2)}
.medium{font-size:.65em;letter-spacing:.1em;text-transform:uppercase;color:#bbb;margin-top:6px}
.poeme{text-align:center;margin:12px 0}
.vers{font-size:1.3em;font-style:italic;line-height:2.1}
.footer{text-align:center;font-size:.65em;letter-spacing:.1em;text-transform:uppercase;color:#c0b8a8;margin-top:48px}
@media print{body{background:white;padding:16mm 14mm}}
</style>
</head>
<body>
<div class="ornement">✦ &nbsp; ✦ &nbsp; ✦</div>
<h1>${titre.replace(/</g,'&lt;')}</h1>
<p class="label">Cadavre exquis — ${date}</p>
<hr>
${illustrationHtml}
${illustrationHtml ? '<hr>' : ''}
<div class="poeme">${versHtml}</div>
<hr>
<p class="footer">Cadavre Exquis · Jeu surréaliste</p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  useEffect(() => {
    if (!id) return
    chargerPoeme(id)
      .then(p => {
        if (p) {
          setPoeme(p)
          setTitreDraft(p.titre ?? '')
        }
      })
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [id])

  useEffect(() => {
    if (editionTitre) inputRef.current?.focus()
  }, [editionTitre])

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

  if (chargement) {
    return (
      <PageTransition className="page-carnet flex items-center justify-center min-h-dvh">
        <motion.span
          className="text-or text-2xl"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ✦
        </motion.span>
      </PageTransition>
    )
  }

  if (!poeme) {
    return (
      <PageTransition className="page-carnet flex flex-col items-center justify-center min-h-dvh safe-top safe-bottom">
        <p className="vers-jeu opacity-40">Poème introuvable.</p>
        <button onClick={() => navigate('/bibliotheque')} className="btn-primaire mt-8">
          Mes poèmes
        </button>
      </PageTransition>
    )
  }

  const structure = getStructure(poeme.structureId)
  const texte = reconstruirePoeme(poeme.cases, structure)
  const lignes = texte.split('\n')

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <button
        onClick={() => navigate('/bibliotheque')}
        className="nav-discrete mb-8 hover:text-encre transition-colors"
      >
        ← Mes poèmes
      </button>

      {/* Titre — éditable */}
      <div className="mb-6">
        {editionTitre ? (
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              className="champ-carnet flex-1 text-lg font-cormorant italic"
              value={titreDraft}
              onChange={e => setTitreDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') sauvegarderTitre()
                if (e.key === 'Escape') setEditionTitre(false)
              }}
              placeholder="Titre du poème…"
            />
            <button onClick={sauvegarderTitre} className="nav-discrete hover:text-encre transition-colors">
              ✓
            </button>
            <button onClick={() => setEditionTitre(false)} className="nav-discrete hover:text-encre transition-colors">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditionTitre(true)}
            className="text-left group w-full"
          >
            <p className="font-garamond italic text-2xl text-encre leading-tight">
              {poeme.titre ?? (
                <span className="opacity-40">Sans titre — tap pour nommer</span>
              )}
            </p>
            <p className="nav-discrete mt-1 opacity-0 group-hover:opacity-60 transition-opacity">
              ✎ Renommer
            </p>
          </button>
        )}
      </div>

      <SeparateurOr />

      {/* Illustration */}
      {poeme.illustration?.url && (
        <motion.div
          className="my-6 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <img
            src={poeme.illustration.url}
            alt="Illustration surréaliste du poème"
            className="w-full max-w-xs rounded-sm border border-or/20 opacity-90"
            style={{ filter: 'sepia(0.15) contrast(0.95)' }}
          />
        </motion.div>
      )}

      {/* Poème reconstitué */}
      <motion.div
        className="my-8 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {lignes.map((ligne, i) => (
          <p key={i} className="vers-jeu leading-relaxed">
            {ligne || ' '}
          </p>
        ))}
      </motion.div>

      <div className="flex justify-center mb-2">
        <button
          onClick={() => parlant ? arreter() : parler(texte)}
          className="nav-discrete hover:text-encre transition-colors"
        >
          {parlant ? '◾ Arrêter' : '▶ Écouter'}
        </button>
      </div>

      <SeparateurOr />

      {/* Cases détaillées */}
      <button
        onClick={() => setCasesVisibles(v => !v)}
        className="nav-discrete mt-6 w-full text-center hover:text-encre transition-colors"
      >
        {casesVisibles ? '↑ Masquer les cases' : '↓ Voir case par case'}
      </button>

      <AnimatePresence>
        {casesVisibles && (
          <motion.div
            className="mt-4 space-y-4"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            {poeme.cases.map((c, i) => {
              const iaNum = poeme.cases.slice(0, i).filter(x => x.auteur === 'ia').length + 1
              return (
              <div key={i} className="border-l-2 border-or/30 pl-4 py-1">
                <p className="nav-discrete mb-1">
                  {c.fonction}
                  <span className="mx-2 opacity-40">—</span>
                  <span className="italic">
                    {c.auteur === 'ia' ? `voix ${iaNum}` : c.joueurNumero ? `joueur ${c.joueurNumero}` : 'toi'}
                  </span>
                </p>
                <p className="font-cormorant italic text-encre text-lg leading-snug">
                  {c.texte}
                </p>
              </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="mt-12 flex flex-col items-center gap-4">
        <button onClick={() => navigate('/config')} className="btn-primaire">
          Nouvelle partie
        </button>

        <button
          onClick={imprimerPoeme}
          className="nav-discrete hover:text-encre transition-colors"
        >
          ↓ Télécharger en PDF
        </button>

        <AnimatePresence mode="wait">
          {!confirmSuppression ? (
            <motion.button
              key="suppr"
              onClick={() => setConfirmSuppression(true)}
              className="nav-discrete hover:text-encre transition-colors"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Supprimer ce poème
            </motion.button>
          ) : (
            <motion.div
              key="confirm"
              className="flex gap-6 items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="nav-discrete">Supprimer définitivement ?</span>
              <button
                onClick={supprimer}
                className="nav-discrete text-red-400 hover:text-red-600 transition-colors"
              >
                Oui
              </button>
              <button
                onClick={() => setConfirmSuppression(false)}
                className="nav-discrete hover:text-encre transition-colors"
              >
                Non
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
