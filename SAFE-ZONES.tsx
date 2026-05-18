// EXEMPLE — application du système Rêve à l'écran Jeu (SANCTUAIRE)
// À adapter dans src/pages/Jeu.tsx
//
// PRINCIPE SANCTUAIRE :
//   · La zone de saisie (textarea) reste libre — concentration protégée
//   · La consigne grammaticale reste libre
//   · Le CTA « Sceller cette voix » reste libre
//   · Le seul décor = un mini-symbole en pied de page côté droit + l'accent
//     coloré du rêve sur les éléments de copy ("ACTE", "CONSIGNE")
//
// Le composant <Decor variant="jeu" /> respecte automatiquement ces règles.

// Dans le JSX de retour de Jeu(), juste APRÈS le <PageTransition> ouvert :

/*
return (
  <PageTransition className="page-carnet relative ... overflow-hidden">

    {/* ── DÉCOR DISCRET (sanctuaire) ── */}
/*    <Decor variant="jeu" />

    {/* ── HEADER avec couleur du rêve ── */}
/*    <div className="folio-row" style={{ color: 'var(--reve-encre)' }}>
      <span style={{ color: seance?.colorSchema.hex }}>ACTE {romain(caseIndex + 1)} / {romain(total)}</span>
      ...
    </div>

    {/* ── CONSIGNE (avec accent du rêve sur le mot clé) ── */}
/*    <div className="consigne">
      <span style={{ color: seance?.colorSchema.hex }}>{verbeColore}</span>
    </div>

    {/* ── TEXTAREA — zone PROTÉGÉE absolue ── */}
/*    <textarea
      className="champ-carnet"
      value={value}
      onChange={...}
      placeholder="…"
      style={{ borderLeftColor: 'var(--reve-encre)', caretColor: seance?.colorSchema.hex }}
    />

    {/* ── CTA — zone PROTÉGÉE absolue ── */}
/*    <button className="cta-rouge" style={{ background: seance?.colorSchema.hex }}>
      sceller cette voix →
    </button>

  </PageTransition>
)
*/

// ───────────────────────────────────────────────────────────
// LISTE DES ÉCRANS ET LEURS SAFE ZONES
// ───────────────────────────────────────────────────────────
//
// ACCUEIL              → <Decor variant="accueil" />
//   PROTÉGÉ : titre Cadavre/Exquis · 4 liens nav · bouton CTA
//   DÉCOR : titre vertical CADAVRE en marge · symbole + cartel · étiquettes · citation · signature
//
// CONFIGURATION        → <Decor variant="config" />
//   PROTÉGÉ : sélecteur de structure · options visibilité · sliders · CTA "Commencer"
//   DÉCOR : symbole en marge haute droite · 1 étiquette · 1 bande optique · signature
//
// JEU (humain)         → <Decor variant="jeu" />            [SANCTUAIRE]
//   PROTÉGÉ : consigne · contexte précédent · textarea · CTA "Sceller cette voix" · timer hypnotique
//   DÉCOR : mini-symbole en pied de page droite, opacité 0.7 · couleur d'accent sur les labels
//
// JEU (cadavre songe)  → <Decor variant="jeu-ia" />         [SANCTUAIRE]
//   PROTÉGÉ : message "Une voix s'avance…" central
//   DÉCOR : symbole centré opacité 0.5 derrière · 1 bande optique
//
// FIN DE PARTIE        → <Decor variant="fin" /> OU <Decor variant="fin-image" />
//   PROTÉGÉ : poème reconstruit · TTS lecture · sélecteur de style d'illustration
//   PROTÉGÉ + PRIORITÉ : si illustration générée → utiliser variant="fin-image"
//                        (décor TRÈS discret pour ne pas concurrencer l'image)
//   DÉCOR : symbole en marge haute droite (variant="fin") OU rien sauf signature (variant="fin-image")
//
// BIBLIOTHÈQUE         → <Decor variant="biblio" />
//   PROTÉGÉ : liste des poèmes · CTA "Nouvelle partie"
//   DÉCOR : symbole en marge haute · 1 étiquette · 1 bande optique
//
// DÉTAIL POÈME         → <Decor variant="detail" />
//   PROTÉGÉ : titre du poème · vers reconstruits · illustration · TTS
//   DÉCOR : symbole en marge haute gauche · 1 bande optique
//
// ───────────────────────────────────────────────────────────
//
// RÈGLE D'OR :
//   Avant chaque écran, le développeur DOIT vérifier que les éléments critiques
//   (formulaires, images générées, vers du poème, CTAs) ont un z-index >= 5
//   pour passer DEVANT le décor (qui est en z-index 1-4).
//
//   Si une zone protégée se chevauche avec le décor : c'est probablement parce
//   que la page n'est pas en `position: relative; overflow: hidden` sur le parent.
//
