import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import { useReve } from '../reve'
import { mono } from '../lib/typo'
import { tr, langueActuelle } from '../i18n'

/**
 * Les conditions d'utilisation — écrites le 22 septembre 2026.
 *
 * Le jeu n'en avait aucune : seulement `/privacy`, et un lien vers l'EULA
 * STANDARD d'Apple, qui est une licence logicielle et ne dit rien du
 * contenu. Trois textes l'exigent, et aucun ne dépend de la taille de
 * l'éditeur :
 *
 *   · Apple, guideline 1.2 — toute application qui héberge du contenu
 *     produit par ses utilisateurs doit faire accepter des conditions où il
 *     est écrit qu'AUCUN contenu répréhensible n'est toléré et que les
 *     auteurs abusifs sont exclus. C'est un motif de rejet courant.
 *   · DSA, article 14 — conditions générales claires. L'exemption
 *     micro-entreprise ne couvre que la section 3 : les articles 14 et 16
 *     valent pour tout hébergeur, quelle que soit sa taille.
 *   · AI Act, article 50 — informer que l'on interagit avec une IA et que
 *     du texte est produit par une machine.
 *
 * ── Le ton ────────────────────────────────────────────────────────────────
 *
 * Celui de `/privacy` : des phrases qu'on peut lire. Un contrat illisible
 * est un contrat qu'on n'a pas lu, et ce projet a passé des semaines à ne
 * pas se contredire lui-même. « AUCUN TRACKING · AUCUNE DONNÉE VENDUE »
 * s'affiche dans les Réglages ; ces conditions ne doivent pas ressembler à
 * un texte qui cache quelque chose.
 *
 * ── Ce qu'un juriste doit relire ──────────────────────────────────────────
 *
 * La licence de publication (§4), la limitation de responsabilité (§11) et
 * le droit applicable (§12). Le reste décrit ce que le code fait déjà et je
 * l'ai vérifié fichier par fichier ; ces trois-là sont des engagements
 * juridiques, pas des descriptions.
 */

const CONTACT = 'nathansonnet@yahoo.fr'
const MAJ_FR = 'Dernière mise à jour : 22 septembre 2026'
const MAJ_EN = 'Last updated: 22 September 2026'

const SECTIONS_FR = [
  {
    titre: '1. Objet',
    texte: `Cadavre Exquis est un jeu d'écriture et de dessin collectif, créé et édité par Nathan Sonnet (${CONTACT}). Ces conditions régissent l'usage de l'application, sur toutes ses versions — iOS, Android et web.

Utiliser l'application, c'est les accepter. Si un point vous paraît inacceptable, n'utilisez pas le service et écrivez-nous : une objection est une information utile.`,
  },
  {
    titre: '2. Votre identité',
    texte: `Le jeu solo n'exige aucun compte. Une identité anonyme — un simple identifiant, sans e-mail ni mot de passe — est créée sur votre appareil au premier usage d'une fonction facturée.

Le mode en ligne demande un pseudonyme. La galerie demande un compte.

Vous devez avoir la capacité juridique de conclure ces conditions. Si vous êtes mineur, l'accord de vos parents est requis.

Vous êtes responsable de ce qui est fait depuis votre compte.`,
  },
  {
    titre: '3. Ce que le jeu coûte',
    texte: `Le jeu est gratuit et entier. Écrire à plusieurs, dessiner, publier en galerie, relire ses poèmes, composer son recueil, donner sa main au poème du jour : rien de tout cela n'est compté.

Trois actes seulement appellent un service facturé — une illustration grand format, une partie où les voix de l'intelligence artificielle écrivent, la lecture d'un dessin. Ce sont les seuls que l'encrier mesure.

L'abonnement se reconduit automatiquement sauf résiliation au moins vingt-quatre heures avant la fin de la période en cours, depuis les réglages de votre compte Apple ou Google. Les flacons sont des achats uniques, sans reconduction.

Les paiements sont traités par Apple ou Google. Nous ne recevons ni votre moyen de paiement ni votre identité de facturation, et nous ne pouvons pas vous rembourser directement : les remboursements relèvent du magasin. Dans l'Union européenne, votre droit de rétractation s'exerce auprès de lui.`,
  },
  {
    titre: '4. Ce que vous écrivez vous appartient',
    texte: `Vous restez l'auteur de vos textes et de vos dessins. Nous ne les revendiquons pas et nous ne les vendons pas.

En publiant dans la galerie ou en donnant votre main au poème du jour, vous nous accordez le droit non exclusif et gratuit d'afficher cette contribution dans l'application, et de la conserver le temps nécessaire au service. Ce droit s'éteint lorsque vous supprimez la publication.

Un cadavre exquis est écrit à plusieurs mains : une fois votre vers posé dans le poème du jour, il appartient à un texte commun et ne peut plus être retiré seul, sauf au titre de la modération ci-dessous.`,
  },
  {
    titre: '5. Contenu interdit — aucune tolérance',
    texte: `Aucun contenu répréhensible n'est toléré, et aucun auteur abusif n'est gardé. Il est interdit de publier, d'écrire ou de dessiner :

• des contenus illégaux, quels qu'ils soient ;
• des contenus sexuels, en particulier impliquant des mineurs ;
• des incitations à la haine, à la violence ou à la discrimination ;
• du harcèlement, des menaces, l'exposition de la vie privée d'autrui ;
• l'œuvre d'autrui présentée comme la vôtre ;
• des données personnelles — les vôtres ou celles de quelqu'un d'autre ;
• de la publicité, du démarchage, des liens commerciaux ;
• toute tentative de contourner les limites techniques du service.

Le jeu se joue à l'aveugle, entre inconnus. Écrivez ce que vous accepteriez de lire.`,
  },
  {
    titre: '6. Signaler un contenu',
    texte: `Deux chemins, et ils ne font pas la même chose.

Dans la galerie, le bouton « Signaler » présent sur chaque publication. Il ne demande aucun compte.

Dans le poème du jour, le signe ⚑ sous chaque vers. Deux joueurs différents doivent le signaler pour qu'il soit retiré automatiquement — à un seul, n'importe qui pourrait faire tomber le poème vers après vers.

Pour un contenu que vous estimez ILLICITE, un canal ouvert à tous existe, sans compte : l'option « contenu illicite » du même signe, ou directement ${CONTACT}. Cette notification ne retire rien d'elle-même : elle nous parvient immédiatement et appelle une décision humaine.

Tout contenu contraire au paragraphe 5 est retiré au plus tard sous vingt-quatre heures après examen.`,
  },
  {
    titre: `7. Ce qu'il advient d'un contenu retiré`,
    texte: `Dans la galerie, un contenu retiré est supprimé.

Dans le poème du jour, un vers retiré est REMPLACÉ et jamais effacé : un trou casserait les rangs, et l'écho reçu par la main suivante ne voudrait plus rien dire. Le vers devient un vers de voix, écrit sur le même écho. Ce qui disparaît, c'est le lien vers la personne.

Si nous retirons un contenu dont vous êtes l'auteur, nous vous en informons et vous en donnons la raison lorsque nous disposons d'un moyen de vous joindre. Le poème du jour est écrit sous pseudonyme et sans adresse : dans ce cas, nous ne pouvons pas vous prévenir, et vous pouvez nous écrire à ${CONTACT} pour contester. Nous réexaminons toute contestation.`,
  },
  {
    titre: '8. Les voix ne sont pas des personnes',
    texte: `Une partie du texte que vous lisez dans l'application est écrit par une intelligence artificielle.

Ce que le jeu appelle « les voix » est un modèle de langage (Claude, développé par Anthropic). Les illustrations sont produites par un modèle d'image (FLUX, via fal.ai). Dans le poème du jour, les voix complètent le poème lorsque moins de cinq mains sont passées ; les coutures, à la fin d'une partie, disent qui a écrit quoi.

Ces textes sont générés automatiquement. Ils peuvent être étranges, faux, ou sans rapport : c'est le principe du jeu et ce n'est jamais un avis, un conseil ni une information.`,
  },
  {
    titre: '9. Suspension et exclusion',
    texte: `Nous pouvons retirer un contenu, suspendre ou supprimer un compte qui enfreint ces conditions, en particulier le paragraphe 5. Un manquement grave — contenu illégal, harcèlement, contenu impliquant un mineur — entraîne l'exclusion immédiate et définitive.

Vous pouvez supprimer votre compte à tout moment depuis l'application, sans nous demander : Profil → Supprimer mon compte.`,
  },
  {
    titre: '10. Point de contact',
    texte: `Pour toute question, réclamation, notification de contenu illicite ou demande d'une autorité : ${CONTACT}.

C'est le point de contact unique au sens du règlement européen sur les services numériques. Les échanges se font en français ou en anglais.`,
  },
  {
    titre: '11. Le service est fourni tel quel',
    texte: `Nous faisons de notre mieux pour que le jeu fonctionne, sans garantir qu'il soit disponible sans interruption ni sans défaut.

Vos poèmes hors ligne vivent sur votre appareil, et nulle part ailleurs. Désinstaller l'application ou effacer les données du navigateur les détruit. Exportez votre recueil depuis la bibliothèque : c'est la seule sauvegarde qui existe, et elle est entre vos mains.

Notre responsabilité ne peut être engagée pour la perte de contenus que nous n'hébergeons pas, ni pour l'usage que des tiers feraient d'un contenu que vous avez rendu public.`,
  },
  {
    titre: '12. Modifications et droit applicable',
    texte: `Ces conditions peuvent évoluer. La date en tête de page indique la dernière version ; un changement substantiel sera annoncé dans l'application.

Ces conditions sont régies par le droit français. En cas de litige, une solution amiable sera recherchée d'abord — écrivez-nous. À défaut, les tribunaux français sont compétents. Si vous êtes consommateur dans l'Union européenne, vous conservez le bénéfice des dispositions impératives de votre pays de résidence.`,
  },
]

const SECTIONS_EN = [
  {
    titre: '1. Purpose',
    texte: `Cadavre Exquis is a collective writing and drawing game, created and published by Nathan Sonnet (${CONTACT}). These terms govern the use of the application in all its versions — iOS, Android and web.

Using the application means accepting them. If something here seems unacceptable to you, do not use the service and write to us: an objection is useful information.`,
  },
  {
    titre: '2. Your identity',
    texte: `Solo play requires no account. An anonymous identity — a plain identifier, with no e-mail and no password — is created on your device the first time you use a billed feature.

Online play asks for a pen name. The gallery asks for an account.

You must have the legal capacity to enter into these terms. If you are a minor, your parents' consent is required.

You are responsible for what is done from your account.`,
  },
  {
    titre: '3. What the game costs',
    texte: `The game is free and whole. Writing together, drawing, publishing to the gallery, rereading your poems, composing your collection, giving your hand to the poem of the day: none of it is counted.

Only three acts call a billed service — a large-format illustration, a game where the artificial intelligence voices write, the reading of a drawing. Those are the only ones the inkwell measures.

The subscription renews automatically unless cancelled at least twenty-four hours before the end of the current period, from your Apple or Google account settings. Flasks are one-time purchases with no renewal.

Payments are handled by Apple or Google. We receive neither your payment method nor your billing identity, and we cannot refund you directly: refunds are handled by the store. In the European Union, your right of withdrawal is exercised with them.`,
  },
  {
    titre: '4. What you write is yours',
    texte: `You remain the author of your texts and drawings. We do not claim them and we do not sell them.

By publishing to the gallery or giving your hand to the poem of the day, you grant us the non-exclusive, royalty-free right to display that contribution within the application and to keep it for as long as the service requires. That right ends when you delete the publication.

An exquisite corpse is written by several hands: once your line is placed in the poem of the day, it belongs to a shared text and can no longer be withdrawn on its own, except under the moderation described below.`,
  },
  {
    titre: '5. Forbidden content — no tolerance',
    texte: `There is no tolerance for objectionable content, and no abusive author is kept. You may not publish, write or draw:

• unlawful content of any kind;
• sexual content, in particular involving minors;
• incitement to hatred, violence or discrimination;
• harassment, threats, exposure of someone else's private life;
• someone else's work presented as your own;
• personal data — yours or anyone else's;
• advertising, solicitation, commercial links;
• any attempt to circumvent the technical limits of the service.

The game is played blind, among strangers. Write what you would accept to read.`,
  },
  {
    titre: '6. Reporting content',
    texte: `Two paths, and they do not do the same thing.

In the gallery, the "Report" button on every publication. It requires no account.

In the poem of the day, the ⚑ mark under each line. Two different players must report it for it to be withdrawn automatically — with only one, anyone could bring the poem down line by line.

For content you believe to be ILLEGAL, a channel open to everyone exists, with no account: the "illegal content" option of the same mark, or directly ${CONTACT}. That notice withdraws nothing by itself: it reaches us immediately and calls for a human decision.

Any content contrary to paragraph 5 is removed within twenty-four hours of review at the latest.`,
  },
  {
    titre: '7. What happens to withdrawn content',
    texte: `In the gallery, withdrawn content is deleted.

In the poem of the day, a withdrawn line is REPLACED and never erased: a gap would break the ranks, and the echo received by the next hand would no longer mean anything. The line becomes a voice's line, written on the same echo. What disappears is the link to the person.

If we withdraw content you authored, we inform you and give you the reason whenever we have a way to reach you. The poem of the day is written under a pen name and without an address: in that case we cannot notify you, and you may write to ${CONTACT} to contest. We re-examine every contest.`,
  },
  {
    titre: '8. The voices are not people',
    texte: `Part of the text you read in the application is written by an artificial intelligence.

What the game calls "the voices" is a language model (Claude, developed by Anthropic). Illustrations are produced by an image model (FLUX, via fal.ai). In the poem of the day, the voices complete the poem when fewer than five hands have passed; the seams, at the end of a game, say who wrote what.

These texts are generated automatically. They may be strange, wrong, or unrelated: that is the principle of the game and it is never an opinion, advice or information.`,
  },
  {
    titre: '9. Suspension and exclusion',
    texte: `We may withdraw content, suspend or delete an account that breaches these terms, in particular paragraph 5. A serious breach — unlawful content, harassment, content involving a minor — leads to immediate and permanent exclusion.

You can delete your account at any time from within the application, without asking us: Profile → Delete my account.`,
  },
  {
    titre: '10. Point of contact',
    texte: `For any question, complaint, notice of illegal content or request from an authority: ${CONTACT}.

This is the single point of contact within the meaning of the European Digital Services Act. Exchanges take place in French or English.`,
  },
  {
    titre: '11. The service is provided as is',
    texte: `We do our best to keep the game working, without guaranteeing that it will be available without interruption or fault.

Your offline poems live on your device, and nowhere else. Uninstalling the application or clearing your browser data destroys them. Export your collection from the library: it is the only backup that exists, and it is in your hands.

We cannot be held liable for the loss of content we do not host, nor for the use third parties might make of content you have made public.`,
  },
  {
    titre: '12. Changes and governing law',
    texte: `These terms may change. The date at the top of the page indicates the latest version; a substantial change will be announced within the application.

These terms are governed by French law. In the event of a dispute, an amicable solution will be sought first — write to us. Failing that, the French courts have jurisdiction. If you are a consumer in the European Union, you retain the benefit of the mandatory provisions of your country of residence.`,
  },
]

export default function Conditions() {
  const navigate = useNavigate()
  const seance = useReve()
  const c = seance?.colorSchema
  const accent = c?.hex ?? '#b22c20'
  const encre = c?.encre ?? '#0f0805'
  const serif: React.CSSProperties = { fontFamily: "'Playfair Display', serif" }
  const sections = langueActuelle() === 'en' ? SECTIONS_EN : SECTIONS_FR

  return (
    <PageTransition className="page-carnet relative flex flex-col min-h-dvh safe-top safe-bottom">
      <div style={{ position: 'relative', zIndex: 10 }} className="flex flex-col flex-1">

        <div className="flex justify-between items-baseline">
          <button onClick={() => navigate(-1)}
            style={{ ...mono, fontSize: 13, color: encre, opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← {tr('RETOUR', 'BACK')}
          </button>
        </div>
        <hr style={{ border: 'none', borderTop: `1.2px solid ${accent}`, marginTop: 6, opacity: 0.45, marginBottom: 24 }} />

        <div style={{ ...mono, fontSize: 13, color: accent, fontWeight: 700, letterSpacing: '0.22em', marginBottom: 8 }}>
          {tr('— CONDITIONS D’UTILISATION —', '— TERMS OF USE —')}
        </div>

        <h1 style={{ ...serif, fontSize: 'clamp(1.9rem, 8vw, 2.6rem)', color: encre, fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>
          {tr('Ce qui est permis, et ce qui ne l’est pas.', 'What is allowed, and what is not.')}
        </h1>
        <p style={{ ...mono, fontSize: 13, color: `${encre}66`, marginBottom: 28 }}>
          {tr(MAJ_FR, MAJ_EN)}
        </p>

        {sections.map(({ titre, texte }) => (
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
            {tr('CADAVRE EXQUIS · CONDITIONS D’UTILISATION · 2026', 'CADAVRE EXQUIS · TERMS OF USE · 2026')}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
