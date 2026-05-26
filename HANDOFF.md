# HANDOFF · Direction artistique finale — Cadavre Exquis

À transmettre à Claude Code. **Ne pas paraphraser** — coller ce document tel quel.

---

## 1 · Ce qu'il faut faire (résumé en une phrase)

> Remplacer les 5 fichiers ci-dessous par leurs versions livrées. **Ne pas modifier les pages** (Accueil, Configuration, Jeu, FinDePartie, etc.) — elles utilisent déjà `<Decor variant="..." />` et les classes CSS, donc tout va se mettre à jour automatiquement.

---

## 2 · Fichiers à REMPLACER (5 fichiers)

| Chemin | Action |
|---|---|
| `src/reve/pools.ts` | **REMPLACER intégralement** par `handoff/src/reve/pools.ts` |
| `src/reve/Decor.tsx` | **REMPLACER intégralement** par `handoff/src/reve/Decor.tsx` |
| `src/reve/index.ts` | **REMPLACER intégralement** par `handoff/src/reve/index.ts` |
| `src/index.css` | **REMPLACER intégralement** par `handoff/src/index.css` |
| `tailwind.config.js` | **REMPLACER intégralement** par `handoff/tailwind.config.js` |
| `src/App.tsx` | **REMPLACER intégralement** par `handoff/src/App.tsx` (vérifie que `<ReveProvider>` est bien le wrapper racine) |

**Fichiers à NE PAS toucher** :
- `src/reve/collages.tsx` — les SVG des collages restent
- `src/reve/prng.ts` — le mulberry32 + helpers restent
- `src/pages/*.tsx` — toutes les pages
- `src/components/*.tsx` — tous les composants existants
- Tous les hooks, l'API Claude, l'audio, la DB IndexedDB

---

## 3 · Ce qui change visuellement

### Typographie
- **Fraunces** (display, italique, 900/800/700) → titres, sections, Exquis
- **Inter** (400/500/600) → UI, body, labels, boutons, méta
- **Cormorant Garamond italique 500** → vers du poème, citations, lead
- Polices augmentées de +3px partout · minimum 14px sur les labels, 16px sur le body, 26px sur les vers

### Couleurs
**5 ambiances** (fond + accents compatibles, contrastes WCAG AA garantis) :

| Ambiance | Fond | Accents compatibles (le rêve en choisit un) |
|---|---|---|
| **Minuit profond** | `#0e1726` | or, cobalt, cinabre, crème |
| **Encre profonde** | `#15110d` | rouge feu, or, ocre, crème |
| **Argile cuite** | `#2a2018` | or chaud, rouge brique, crème, vert sauge |
| **Lin écru** | `#e6dfc9` | vert sapin, pourpre, bleu encre, rouge brique |
| **Aube froide** | `#dde0e6` | bleu nuit, pourpre, rouge sourd, vert encre |

Chaque accent a été testé contre son fond pour la lisibilité. **Aucune combinaison ne peut produire un texte illisible** — c'est garanti par construction (les accents sont scopés par ambiance, jamais croisés).

### Système de rêve
- À chaque ouverture (ou clic sur "✦ re-rêver"), le PRNG mulberry32 tire :
  1. une ambiance parmi les 5
  2. un accent dans le pool de cette ambiance
  3. un symbole (collage)
  4. une citation (auteurs en domaine public uniquement : Breton, Desnos, Apollinaire, Cocteau)
  5. des étiquettes typewriter
  6. une heure nocturne
- Le seed est stocké par jour (`localStorage["cadavre-seed-YYYY-MM-DD"]`) → même rêve toute la journée, change automatiquement le lendemain

---

## 4 · Variants pour les modes de jeu

Le composant `<Decor variant="..." />` accepte ces variants. Toutes les pages doivent utiliser le bon :

| Variant | Pour quel écran |
|---|---|
| `accueil` | Accueil principal |
| `config` | Configuration de la partie |
| `jeu` | **Mode Cadavre Écrit · tour humain** — SANCTUAIRE (décor minimal, juste un mini-symbole en pied) |
| `jeu-ia` | **Tour IA** ("le cadavre songe") — symbole central opacité 0.45 |
| `jeu-dessin` | **Mode Cadavre Dessiné** — SANCTUAIRE pour ne pas distraire du canevas |
| `multi` | **Mode multijoueur** (passation de téléphone entre joueurs) |
| `fin` | Fin de partie sans illustration générée |
| `fin-image` | Fin de partie AVEC illustration — **aucun symbole** (l'image est le centre) |
| `biblio` | Bibliothèque |
| `detail` | Détail d'un poème |

**Action requise :** vérifier que chaque page utilise le bon variant. Notamment :
- `Jeu.tsx` (mode écrit) → `<Decor variant="jeu" />`
- Si tu as une page `JeuDessin.tsx` → `<Decor variant="jeu-dessin" />`
- Si tu as une page `JeuMulti.tsx` ou similaire → `<Decor variant="multi" />`

Si une page n'utilise pas encore `<Decor>`, ajoute-le après l'ouverture de `<PageTransition>` :

```tsx
import { Decor } from '../reve'

return (
  <PageTransition className="page-carnet relative ... overflow-hidden">
    <Decor variant="jeu" />
    {/* contenu existant inchangé */}
  </PageTransition>
)
```

---

## 5 · Comment les pages utilisent les couleurs

Les pages doivent utiliser les **variables CSS** (pas de couleur en dur). Tout est déjà branché :

```tsx
// ✅ Bon — suit le rêve courant
<button className="btn-primaire">Sceller cette voix</button>
<div className="vers-jeu">{poeme}</div>
<span className="label-accent">— CONSIGNE —</span>

// ✅ Bon en inline
<div style={{ color: 'var(--reve-accent)' }}>Mot rouge</div>
<input style={{ caretColor: 'var(--reve-accent)' }} />

// ❌ À éviter — couleur en dur (ne suivra pas le rêve)
<button style={{ background: '#b22c20' }}>Sceller</button>
```

Si dans le code existant tu trouves des couleurs en dur (`#b22c20`, `#0f0805`, `#e6d4b8`, etc.), **remplace-les par les variables** correspondantes :
- Couleur de fond → `var(--reve-bg)`
- Texte principal → `var(--reve-ink)`
- Texte secondaire → `var(--reve-ink-soft)`
- Texte tertiaire → `var(--reve-ink-faint)`
- Accent (CTA, accent visuel) → `var(--reve-accent)`
- Filets/borders → `var(--reve-rule)`

---

## 6 · Compatibilité ascendante

Les anciens noms de classes Tailwind continuent à fonctionner via des alias :

| Ancien | Alias vers |
|---|---|
| `text-papier`, `bg-papier` | `var(--reve-bg)` |
| `text-encre`, `bg-encre` | `var(--reve-ink)` |
| `text-rouge`, `bg-rouge` | `var(--reve-accent)` |
| `text-or` | `var(--reve-accent)` |
| `font-garamond`, `font-bodoni` | Fraunces |
| `font-lora`, `font-fell` | Inter |

**Aucune page ne devrait casser.** Si une page casse, c'est probablement :
1. Soit un import qui pointait vers un export supprimé (vérifie les imports de `'../reve'`)
2. Soit une couleur en dur qui ne s'adapte plus

---

## 7 · Checklist de validation post-intégration

Après l'intégration, tester :

- [ ] `npm run dev` ne produit aucune erreur TypeScript
- [ ] L'app charge sur l'Accueil sans crash
- [ ] Le bouton "✦ re-rêver" change l'ambiance complète (fond + accent + symbole + citation)
- [ ] Sur 10 clics consécutifs, **aucune combinaison ne produit de texte illisible**
- [ ] Les 5 ambiances apparaissent toutes au moins une fois sur 20 clics
- [ ] Le mode **Cadavre Écrit** (Jeu.tsx) reste sobre — un seul mini-symbole en pied
- [ ] Le mode **Cadavre Dessiné** ne couvre pas le canevas avec du décor
- [ ] Le mode **Multijoueur** affiche correctement le décor sans masquer les CTAs de passation
- [ ] La police du body est ≥ 16px partout, ≥ 14px sur les labels, ≥ 26px sur les vers du poème
- [ ] L'italique du Cormorant est visible (poids 500, pas 400)
- [ ] Aucune couleur en dur ne ressort sur fond clair quand l'ambiance Lin/Aube est active

---

## 8 · Si quelque chose casse

**Crash au démarrage** : vérifier `App.tsx` — `<ReveProvider>` doit envelopper `<BrowserRouter>`.

**Texte illisible sur fond clair** : la couleur est en dur dans une page. Remplacer par `var(--reve-ink)` ou la classe Tailwind correspondante.

**Symbole couvre un bouton** : la page n'a pas `position: relative` + `overflow: hidden`, ou son contenu interactif n'est pas en `z-index: 5+`.

**`useReve()` renvoie null** : la page n'est pas dans `<ReveProvider>`, ou est rendue hors arbre React.

---

Tout est prêt. Le seul mot de passe pour que ça marche : **remplacer ces 6 fichiers et redémarrer.**
