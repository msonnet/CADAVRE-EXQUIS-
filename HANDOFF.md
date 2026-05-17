# HANDOFF — Direction artistique finale (système rêve + couleurs aléatoires)

Ce dossier contient le **système de design final** pour Cadavre Exquis, prêt à intégrer dans ton repo React + TypeScript + Vite + Tailwind.

---

## 1 · Ce qui change

**Direction artistique : Dragonfly × papier déchiré × couleurs aléatoires**

- À chaque ouverture (1 par jour, ou bouton « re-rêver ») l'app **tire un rêve unique** : 1 schéma chromatique parmi 8 + collages + marginalia + dérèglements
- Les **dessins des collages** changent de couleur par rêve : rouge, bleu de Prusse, vert d'absinthe, ocre, sépia, pourpre, ardoise, cuivre
- Les collages sont **posés sur des papiers déchirés**, parfois avec du scotch visible
- **Mots-clés pipe-séparés** en bandeau supérieur (style Dragonfly)
- **Typographie verticale** « CADAVRE » sur le côté
- **Marginalia manuscrites** en marges, dans la couleur du rêve
- **Dérèglements** : pâté d'encre, errata, tampon, coin corné, compteur fou — un seul par rêve
- **Sanctuaire du jeu** : sur l'écran Jeu, pas de marginalia, juste un mini-collage très discret
- **Positions en %** : adaptatif iPhone SE → Pro Max, plus de rognage
- **Contraste WCAG** : la couleur du rêve est utilisée uniquement pour décor + accents, le texte courant reste sombre

---

## 2 · Fichiers livrés

```
handoff/
├── tailwind.config.js            # ↻ remplace le tien
├── src/
│   ├── index.css                  # ↻ remplace le tien (+ animations rêve)
│   ├── App.tsx                    # ↻ wrap dans <ReveProvider>
│   ├── pages/
│   │   └── Accueil.tsx            # ↻ exemple complet refait
│   └── reve/                      # ← copier tel quel
│       ├── index.ts
│       ├── Decor.tsx
│       ├── collages.tsx           # 17 collages référencés
│       ├── pools.ts               # marginalia + dérèglements + couleurs
│       └── prng.ts                # PRNG mulberry32 + mémoire
```

---

## 3 · Intégration (15 min)

### Étape 1 — Remplace `tailwind.config.js`, `src/index.css`, `src/App.tsx`
Copie les 3 fichiers à leur place.

### Étape 2 — Copie le dossier `src/reve/`
Crée `src/reve/` dans ton repo, copie les 5 fichiers.

### Étape 3 — Remplace `src/pages/Accueil.tsx`
C'est l'exemple complet refait avec le nouveau système.

### Étape 4 — Adapte les autres pages
Pour chaque page, **5 lignes suffisent** :

```tsx
import { Decor, HeaderKeywords, SignatureReve, useReve } from '../reve'

export default function MaPage() {
  return (
    <PageTransition className="page-carnet relative ... overflow-hidden">
      <HeaderKeywords />
      <Decor variant="config" />   {/* ← config | jeu | fin | biblio | detail */}

      {/* le contenu existant */}

      <SignatureReve />
    </PageTransition>
  )
}
```

### Étape 5 — Page Jeu = sanctuaire
Pour `Jeu.tsx`, utilise `<Decor variant="jeu" />` qui place automatiquement :
- Aucune marginalia (concentration protégée)
- Aucun dérèglement bruyant
- Juste un mini-collage discret en bas (avec `size: 0.55`)

---

## 4 · API du système rêve

### `useReve()`
Retourne la séance courante :

```tsx
const seance = useReve()

seance.seed             // nombre unique du jour
seance.collages         // CollageDef[6]
seance.margs            // MargEntry[4]
seance.derlg            // 'pate' | 'errata' | 'tampon' | 'coin' | 'compteur'
seance.angleBiais       // angle aléatoire pour la lettre déréglée
seance.idxBiais         // index de la lettre déréglée
seance.colorKey         // 'rouge' | 'bleu' | 'vert' | ...
seance.colorSchema.hex  // #e83830, #1d3a8c, etc.
seance.retirer()        // bouton « re-rêver » : nouveau seed
```

### `<Decor variant="..." />`
Place automatiquement collage + marginalia + dérèglement selon l'écran.

| variant | placement collage | marginalia | dérèglement |
|---|---|---|---|
| `accueil` | grand, taped | 2 | oui |
| `config` | normal | 1 | oui |
| `jeu` | mini (sanctuaire) | 0 | non |
| `fin` | grand, taped | 1 | oui |
| `biblio` | mini | 1 | oui |
| `detail` | normal, taped | 1 | oui |

### `<HeaderKeywords count={8} />`
Bandeau supérieur avec 8 mots-clés pipe-séparés, déterministes par seed.

### `<VerticalAccent text="CADAVRE" side="right" />`
Typographie verticale, couleur du rêve, sur le côté.

### `<SignatureReve />`
Petite signature « rêve № 17 » en bas à droite.

---

## 5 · Compatibilité

- Toutes les classes Tailwind existantes (`text-or`, `font-garamond`, `bg-ivoire`, etc.) sont **conservées en alias** vers les nouvelles. **Aucune page ne casse.**
- Migration progressive possible : tu peux n'adapter que l'Accueil au début, le reste de l'app continue de fonctionner avec ses anciennes classes.
- Le système rêve est **opt-in** : si tu n'utilises pas `<Decor>` sur une page, elle reste comme avant.

---

## 6 · Tester en local

```bash
npm run dev
```

Tu devrais voir :
- L'Accueil avec un collage coloré (rouge, bleu, vert, etc.) sur papier déchiré
- Un bandeau de mots-clés en haut
- Une typo verticale « CADAVRE » à droite
- Le bouton « ✦ re-rêver » en bas à gauche
- En bas à droite : « rêve № NNNNN »

À chaque rafraîchissement du jour suivant (ou en cliquant « re-rêver »), tout change : couleur, collages, marginalia.

---

## 7 · Roadmap pages restantes

Te suggère cet ordre :
1. ✓ Accueil — livré
2. Configuration — `<Decor variant="config" />`
3. Jeu — `<Decor variant="jeu" />` (sanctuaire, automatique)
4. FinDePartie — `<Decor variant="fin" />` + lettrine rouge sur 1ʳᵉ lettre du poème
5. Bibliotheque — `<Decor variant="biblio" />` + items en numéros romains
6. PoemeDetail — `<Decor variant="detail" />`

Aide / Reglages : appliquer juste le nouveau Tailwind suffit.
