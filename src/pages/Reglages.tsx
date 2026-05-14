import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import SeparateurOr from '../components/SeparateurOr'
import { chargerPoemes } from '../db'
import { Decor } from '../reve'
import type { NiveauValidation } from '../utils/validation'

const NIVEAUX: { id: NiveauValidation; label: string; desc: string }[] = [
  { id: 'stricte',    label: 'Stricte',    desc: 'Avertit si le fragment ne correspond pas à la consigne' },
  { id: 'souple',     label: 'Souple',     desc: 'Accepte tout texte non vide' },
  { id: 'desactivee', label: 'Désactivée', desc: 'Aucune vérification' },
]

export default function Reglages() {
  const navigate = useNavigate()
  const [sonActif, setSonActif] = useState(() => localStorage.getItem('ambiance-muted') !== 'true')
  const [validation, setValidation] = useState<NiveauValidation>(
    () => (localStorage.getItem('validation-niveau') as NiveauValidation) ?? 'souple'
  )
  const [exportOk, setExportOk] = useState(false)

  function toggleSon() {
    const next = !sonActif
    setSonActif(next)
    localStorage.setItem('ambiance-muted', String(!next))
  }

  function changerValidation(niveau: NiveauValidation) {
    setValidation(niveau)
    localStorage.setItem('validation-niveau', niveau)
  }

  async function exporterPoemes() {
    const poemes = await chargerPoemes()
    const json = JSON.stringify(poemes, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cadavre-exquis-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // iOS Safari ne supporte pas <a download> sur blob: — ouvrir dans un nouvel onglet en fallback
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 5000)
    setExportOk(true)
    setTimeout(() => setExportOk(false), 2000)
  }

  return (
    <PageTransition className="page-carnet safe-top safe-bottom">
      <Decor variant="config" />
      <button onClick={() => navigate('/')} className="nav-discrete mb-8 hover:text-encre transition-colors">
        ← Accueil
      </button>

      <h2 className="font-garamond italic text-2xl text-encre mb-1">Réglages</h2>
      <p className="sous-titre mb-6">Préférences de l'application</p>

      <SeparateurOr />

      <div className="flex flex-col gap-8 py-6">

        {/* Audio ambiant */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="consigne-grammaticale">Audio ambiant</span>
            <span className="font-lora text-gris text-sm">
              Drone atmosphérique pendant le jeu
            </span>
          </div>
          <button
            onClick={toggleSon}
            className={`w-12 h-6 rounded-full transition-colors duration-300 relative flex-shrink-0 ${
              sonActif ? 'bg-or/60' : 'bg-gris/30'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-encre transition-transform duration-300 ${
                sonActif ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Validation grammaticale */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="consigne-grammaticale">Validation grammaticale</span>
            <span className="font-lora text-gris text-sm">
              {NIVEAUX.find(n => n.id === validation)?.desc}
            </span>
          </div>
          <div className="flex gap-2">
            {NIVEAUX.map(n => (
              <button
                key={n.id}
                onClick={() => changerValidation(n.id)}
                className={`flex-1 py-2 text-xs border transition-all ${
                  validation === n.id
                    ? 'border-or/60 text-encre bg-or/10'
                    : 'border-gris-clair/30 text-gris hover:border-or/30 hover:text-encre'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export JSON */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="consigne-grammaticale">Exporter mes poèmes</span>
            <span className="font-lora text-gris text-sm">
              Télécharge tous les poèmes en JSON
            </span>
          </div>
          <button
            onClick={exporterPoemes}
            className="nav-discrete hover:text-encre transition-colors px-3 py-1 border border-gris-clair/30 hover:border-or/40 text-sm"
          >
            {exportOk ? '✓ Téléchargé' : '↓ Exporter'}
          </button>
        </div>

      </div>

      <SeparateurOr />

      <p className="font-lora text-gris text-xs text-center opacity-60 mt-4">
        Cadavre Exquis v1.0<br />
        Aucun tracking. Aucun compte. Tout reste local.
      </p>
    </PageTransition>
  )
}
