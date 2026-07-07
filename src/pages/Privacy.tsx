import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import { useReve } from '../reve'

export default function Privacy() {
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const mono: React.CSSProperties = { fontFamily: "'Raleway', sans-serif", letterSpacing: '0.18em' }
  const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" }

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        {/* Header */}
        <div className="flex justify-between items-baseline">
          <button onClick={() => navigate(-1)}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← RETOUR
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45, marginBottom: 24 }} />

        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
          — POLITIQUE DE CONFIDENTIALITÉ —
        </div>

        <h1 style={{ ...serif, fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>
          Vos données, clairement.
        </h1>
        <p style={{ ...mono, fontSize: 13, color: `${encre}66`, marginBottom: 28 }}>
          Dernière mise à jour : 4 juin 2026
        </p>

        {[
          {
            titre: '1. Qui sommes-nous',
            texte: `Cadavre Exquis est une application mobile et web créée et éditée par Nathan Sonnet (nathansonnet@yahoo.fr). Cette politique s'applique à toutes les versions de l'application (iOS, Android, web).`,
          },
          {
            titre: '2. Données collectées',
            texte: `Nous collectons uniquement ce qui est nécessaire au fonctionnement du service :

• Compte : adresse e-mail et pseudonyme, fournis lors de l'inscription via Supabase Auth.
• Contenu créé : poèmes et dessins produits dans les modes en ligne, stockés sur nos serveurs (Supabase) pour permettre le jeu multijoueur et la galerie publique.
• Contenu local : poèmes et dessins en mode hors-ligne restent exclusivement sur votre appareil (IndexedDB) et ne nous sont jamais transmis.
• Avatar : image générée par IA à partir d'un texte que vous fournissez, stockée sur Supabase Storage.
• Adresse IP : enregistrée temporairement (maximum 60 secondes) pour limiter les abus d'API. Non conservée dans nos bases de données.`,
          },
          {
            titre: '3. Finalité du traitement',
            texte: `Vos données sont utilisées pour :
• Faire fonctionner le jeu multijoueur en ligne
• Afficher votre profil et vos créations dans la galerie publique (si vous choisissez de les publier)
• Prévenir les abus (rate limiting)
• Améliorer le service (aucun tracking comportemental individuel)`,
          },
          {
            titre: '4. Services tiers',
            texte: `Cadavre Exquis utilise les services suivants qui peuvent traiter certaines de vos données :

• Supabase (supabase.com) — base de données, authentification, stockage de fichiers. Hébergé en Europe (AWS eu-west-1). Politique : supabase.com/privacy
• Anthropic Claude API (anthropic.com) — génération de fragments de texte par intelligence artificielle. Seul le fragment demandé est transmis, sans identifiant. Politique : anthropic.com/privacy
• fal.ai — génération d'illustrations par IA. Seul le texte du poème est transmis. Politique : fal.ai/privacy
• Vercel (vercel.com) — hébergement de l'application. Politique : vercel.com/legal/privacy-policy

Aucune donnée n'est vendue à des tiers.`,
          },
          {
            titre: '5. Galerie publique et modération',
            texte: `Les poèmes et dessins publiés dans la galerie sont visibles par tous les utilisateurs. Vous pouvez supprimer vos propres publications à tout moment depuis l'application.

Tout utilisateur peut signaler un contenu inapproprié via le bouton « Signaler » présent sur chaque publication. Les signalements sont examinés manuellement. Tout contenu enfreignant nos règles (contenu offensant, illégal, spam) est supprimé dans les 48 heures.`,
          },
          {
            titre: '6. Conservation des données',
            texte: `• Données de compte : conservées tant que votre compte existe. Supprimées sur demande.
• Contributions en ligne (parties multijoueur) : conservées 90 jours après la fin de la partie, puis supprimées automatiquement.
• Galerie : conservée jusqu'à suppression par l'auteur ou modération.
• Données de rate limiting (IP) : automatiquement effacées après 120 secondes.`,
          },
          {
            titre: '7. Vos droits (RGPD)',
            texte: `Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
• Accès : obtenir une copie de vos données personnelles
• Rectification : corriger des données inexactes
• Suppression : demander la suppression de votre compte et de vos données
• Portabilité : recevoir vos données dans un format lisible
• Opposition : vous opposer au traitement de vos données

Pour exercer ces droits, contactez : nathansonnet@yahoo.fr
Nous répondons dans un délai de 30 jours.`,
          },
          {
            titre: '8. Cookies et stockage local',
            texte: `L'application utilise :
• localStorage et IndexedDB : pour stocker vos créations locales, préférences et session d'authentification. Ces données ne quittent jamais votre appareil sauf si vous choisissez de les publier.
• Aucun cookie de tracking ou publicitaire n'est utilisé.`,
          },
          {
            titre: '9. Mineurs',
            texte: `L'application est destinée aux personnes de 13 ans ou plus. Nous ne collectons pas sciemment de données personnelles d'enfants de moins de 13 ans. Si vous êtes parent et pensez que votre enfant nous a fourni des données, contactez-nous à nathansonnet@yahoo.fr.`,
          },
          {
            titre: '10. Contact',
            texte: `Pour toute question relative à cette politique de confidentialité :\n\nNathan Sonnet\nE-mail : nathansonnet@yahoo.fr`,
          },
        ].map(({ titre, texte }) => (
          <div key={titre} style={{ marginBottom: 24 }}>
            <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.18em', marginBottom: 8 }}>
              {titre.toUpperCase()}
            </div>
            <div style={{ ...serif, fontSize: 16, color: encre, opacity: 0.85, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {texte}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 8, marginBottom: 32, paddingTop: 20, borderTop: `0.5px solid ${encre}15` }}>
          <div style={{ ...mono, fontSize: 13, color: `${encre}55` }}>
            CADAVRE EXQUIS · POLITIQUE DE CONFIDENTIALITÉ · 2026
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
