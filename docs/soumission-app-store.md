# Soumission App Store — état et marche à suivre

Dernière vérification : 27 juillet 2026, sur le commit courant de `main`.

---

## 1. État vérifié côté code

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | aucune erreur |
| `npm run build` | build PWA complet, service worker généré |
| Tests unitaires (Vitest) | 74 / 74 |
| Tests E2E (Playwright, FR + EN) | 16 / 16 |
| Secrets dans le dépôt | aucun (`.env.example` seul versionné) |
| `console.log` résiduels dans `src/` | 0 |
| `TODO` / `FIXME` / `debugger` | 0 |
| Gestionnaire d'erreurs de debug dans `dist/` | retiré — l'app affiche l'écran « Le carnet s'est déchiré. » |
| Sondes production (`/api/claude`, `/api/corriger`, `/privacy`, `/`) | HTTP 200 |

### Vulnérabilités npm

Trois corrigées (`tar` critique, `brace-expansion` haute, `dompurify` modérée).

Deux modérées restent, dans `react-router` : elles exigent un passage en
**v7 majeure**, écarté avant soumission. Non atteignables ici :
- *open redirect via backslash* — les 88 appels `navigate()` visent des routes
  littérales ; les segments dynamiques (`/u/:pseudo`) sont encodés ;
- *deserializeErrors()* — l'app n'utilise ni loaders, ni actions, ni API data.

À planifier après la mise en ligne, avec la suite E2E comme filet.

---

## 2. Conformité aux règles Apple

| Règle | Où |
|---|---|
| **1.2 — contenu généré par les utilisateurs** | signalement (`⚑` sur chaque publication → `api/report.ts`), blocage d'auteur (`⊘ Masquer l'auteur`, réinitialisable dans Réglages), suppression de ses propres publications |
| **5.1.1 (v) — suppression de compte** | Profil → « SUPPRIMER MON COMPTE » → `api/delete-account.ts` (jeton vérifié, publications anonymisées, profil et compte auth supprimés) |
| **5.1.1 — politique de confidentialité** | page `/privacy`, bilingue FR/EN, RGPD |
| **2.3 — pas de contenu de debug** | gestionnaire retiré, écran d'erreur au registre du jeu |
| **4.0 — design** | icône et splash cohérents, interface bilingue complète |

### App Privacy (à remplir dans App Store Connect)

Données **liées à l'utilisateur** : adresse e-mail et pseudonyme (compte
Supabase), contenu créé et publié en galerie, avatar généré.
Données **non liées** : adresse IP conservée ≤ 60 s pour le rate limiting.
**Aucun tracking**, aucune donnée vendue, aucun identifiant publicitaire.

---

## 3. Fiche App Store

- **Bundle ID** : `fr.nathansonnet.cadavreexquis`
- **Version** : 1.0.0 · **iOS minimum** : 16.0
- **Catégorie** : Games → Word Games · **Âge** : 4+
- **Politique de confidentialité** : `https://cadavre-exquis-beta.vercel.app/privacy`
- **Support** : `https://cadavre-exquis-beta.vercel.app`
- **Textes anglais** prêts à coller : [`docs/app-store-en.md`](./app-store-en.md)

---

## 4. Ce qu'il reste à faire — sur ton Mac

### a. Générer les binaires

```bash
npm install
npm run build

# première fois seulement
npm run cap:add:ios
npm run cap:add:android

# icônes et splash à toutes les tailles, depuis resources/
npx @capacitor/assets generate \
  --iconBackgroundColor '#000000' \
  --splashBackgroundColor '#000000'

npm run cap:ios        # Xcode → Product > Archive → App Store Connect
npm run cap:android    # Android Studio → Generate Signed Bundle
```

Le fond passe au **noir pur** : l'Œil cousu est composé sur noir, l'ancien
`#0f0805` laisserait un liseré visible autour du sceau.

### b. Captures d'écran

Obligatoires en **6,7"** et **6,5"** (plus iPad si tu coches le support iPad).

Écrans conseillés, dans cet ordre : la révélation d'un poème (l'écran qui vend
le jeu), l'écran d'écriture avec sa consigne, les COUTURES nommant les voix,
le cadavre dessiné assemblé, la galerie.

À faire **deux fois** : une série en français, une en anglais (bascule dans
Réglages → LANGUE avant de capturer).

### c. Variables d'environnement Vercel

Vérifier qu'elles sont bien en Production avant la revue — l'app packagée tape
sur `https://cadavre-exquis-beta.vercel.app`.

| Variable | Rôle | Requis |
|---|---|---|
| `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` | base, auth, galerie | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | cron de nettoyage, suppression de compte | oui |
| `ANTHROPIC_API_KEY` | voix IA, correction, lecture des dessins | oui |
| `FAL_KEY` | illustrations et voix de lecture | oui |
| `CRON_SECRET` | protège `/api/cleanup` | oui |
| `RESEND_API_KEY` + `REPORT_EMAIL` | e-mail au modérateur à chaque signalement | recommandé (modération 1.2) |
| `ELEVENLABS_API_KEY` | voix de lecture en direct (sinon passe par `FAL_KEY`) | optionnel |

### d. Compte de démonstration pour la revue

Apple teste le mode en ligne. Dans « App Review Information », fournir un
pseudo de test et cette note :

> Online play requires only a pen name — no password, no e-mail. Tap "Online
> mode", enter any pen name, then "Create a game". Solo play (Written Cadavre,
> Drawn Cadavre, The Workshop) needs no account at all.

---

## 5. Connu, assumé, non bloquant

- Salons en ligne : le minuteur de tour est **local**. Si le joueur dont c'est
  le tour ferme l'app, la partie attend. Les autres peuvent quitter le salon.
- Le mode **spectateur** est codé mais sans point d'entrée dans l'interface.
- La **série** (streak) compte les ouvertures de l'app, pas les poèmes écrits.
- Les **réactions et vues** de la galerie ne remontent pas à l'auteur.
- `useAmbiance` est un moignon : le bouton son de l'écran de dessin ne coupe
  rien (les sons restent coupés par l'interrupteur physique iOS).
- L'**haptique** repose sur `navigator.vibrate`, non implémenté par le WKWebView
  iOS : aucune vibration sur iPhone tant que `@capacitor/haptics` n'est pas
  branché.
- `prefers-reduced-motion` neutralise le CSS mais pas les animations
  framer-motion.

Aucun de ces points n'est un motif de rejet ; ils sont documentés pour la v1.1.
