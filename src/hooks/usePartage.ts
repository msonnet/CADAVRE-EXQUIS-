import { useState } from 'react'
import { partagerStory, partagerVideoStory } from '../utils/partager'
import { tr } from '../i18n'

/**
 * Le partage, et ce qu'il dit pendant qu'il travaille.
 *
 * ── Ce que la mesure a dit ────────────────────────────────────────────────
 *
 * L'audit du 10 septembre concluait que le bouton PARTAGER ne faisait rien.
 * Chronométré, il faisait ceci :
 *
 *     240 ms   rien
 *     6,2 s    « ✦ EN COURS… », sans interruption
 *     6,2 s    « ✓ PARTAGÉ », le fichier tombe
 *
 * Six secondes d'encodage vidéo derrière un libellé muet. Personne n'attend
 * six secondes devant un bouton qui ne dit rien.
 *
 * ── Le presse-papiers d'abord, et c'est une question de délai ────────────
 *
 * Sans feuille de partage — tout navigateur de bureau — le repli est un
 * téléchargement de fichier, et RIEN n'était copié. On copie donc le texte
 * tout de suite, avant l'encodage : le droit d'écrire dans le presse-papiers
 * tient à l'activation par le geste, et six secondes plus tard le navigateur
 * l'aurait refusé. Le joueur repart avec son texte même s'il quitte la page
 * avant la fin de la vidéo.
 *
 * ── Pourquoi un crochet plutôt que trois copies ──────────────────────────
 *
 * Trois boutons partagent : le poème (`FinDePartie`), le dessin qu'on vient
 * de finir (`FinDessin`), le dessin du recueil (`DessinDetail`). Ils
 * divergeaient déjà — l'un annonçait « ✓ PARTAGÉ » même quand la feuille de
 * partage avait été refermée, l'autre n'annonçait jamais rien. Une seule
 * machine d'état vaut mieux que trois qui dérivent.
 */

type Phase = 'repos' | 'travail' | 'fait' | 'echec'

/** Ce que `partagerVideoStory` sait recevoir. */
export interface OptsPartage {
  type: 'poeme' | 'dessin'
  titre: string
  texte?: string
  imageDataUrl?: string
  accent: string
  bg: string
  ink: string
  date?: number
  invitation?: string
  seed?: string
}

/** Combien de temps le bouton garde son aveu avant de revenir au repos. */
const TENUE = 2600

export function usePartage(opts: { libelleCopie?: string; libelleTravail?: string } = {}) {
  const [phase, setPhase] = useState<Phase>('repos')
  const [copie, setCopie] = useState(false)

  const enCours = phase === 'travail'
  const fait = phase === 'fait'

  async function partager(donnees: OptsPartage, nomFichier?: string) {
    if (enCours) return
    setPhase('travail')
    setCopie(false)

    // Le texte, tout de suite, tant que le geste est encore frais.
    let aCopie = false
    if (!navigator.share && donnees.texte) {
      try {
        await navigator.clipboard.writeText(donnees.texte)
        aCopie = true
        setCopie(true)
      } catch { /* presse-papiers refusé : le fichier reste */ }
    }

    try {
      // Vidéo animée ; repli automatique sur l'affiche fixe si l'encodage
      // est indisponible.
      const ok = await partagerVideoStory(donnees, nomFichier)
      if (ok === 'annule') {
        // Feuille refermée par l'utilisateur : ce n'est pas un partage, et
        // le prétendre serait mentir.
        setPhase('repos')
        setCopie(false)
        return
      }
      if (!ok) await partagerStory(donnees, nomFichier)
      setPhase('fait')
      setTimeout(() => { setPhase('repos'); setCopie(false) }, TENUE)
    } catch (e) {
      console.error('partage échoué', e)
      // Un bouton qui ne dit rien est pire qu'un bouton absent : si le texte
      // est au moins copié, on le dit ; sinon on avoue l'échec.
      setPhase(aCopie ? 'repos' : 'echec')
      setTimeout(() => { setPhase('repos'); setCopie(false) }, TENUE)
    }
  }

  /**
   * Le libellé du bouton — il dit ce qui s'est réellement passé, dans
   * l'ordre où ça arrive. « ✓ PARTAGÉ » sur un navigateur sans feuille de
   * partage aurait été un mensonge.
   */
  function libelle(repos: string): string {
    if (phase === 'echec') return tr('✕ PARTAGE IMPOSSIBLE', '✕ SHARING FAILED')
    if (phase === 'fait') return tr('✓ PARTAGÉ', '✓ SHARED')
    if (copie && enCours) return tr('✓ COPIÉ · VIDÉO…', '✓ COPIED · VIDEO…')
    if (copie) return opts.libelleCopie ?? tr('✓ TEXTE COPIÉ', '✓ TEXT COPIED')
    // « COMPOSITION… » pour les dessins : le mot est à eux, il reste.
    if (enCours) return opts.libelleTravail ?? tr('✦ EN COURS…', '✦ WORKING…')
    return repos
  }

  /** Le bouton se teinte dès qu'il a quelque chose à dire. */
  const actif = phase !== 'repos' || copie

  return { partager, libelle, enCours, fait, copie, actif }
}
