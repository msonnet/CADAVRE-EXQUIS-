import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'fr.nathansonnet.cadavreexquis',
  appName: 'Cadavre Exquis',
  webDir: 'dist',
  // La couleur de la webvue avant que la page ne peigne la sienne, et sous
  // un éventuel rebond : noir, comme le splash et l'Œil cousu. Le blanc par
  // défaut éclairait l'écran d'un flash au lancement.
  backgroundColor: '#000000',
  server: {
    androidScheme: 'https',
  },
  ios: {
    // Le document DÉFILE. `scrollEnabled: false` figeait la vue de
    // défilement de WKWebView : les pages plus hautes que l'écran — les
    // Réglages, les Règles, les préparatifs dont le bouton « Commencer la
    // séance » tombe sous le pli sur un iPhone — étaient inatteignables.
    // Le rebond est déjà coupé en CSS (`overscroll-behavior: none`).
    scrollEnabled: true,
    // Les retraits sont faits par la page (`--sa-*`, `index.css`) avec
    // `viewport-fit=cover`. Laisser iOS les ajouter en plus les doublerait,
    // et le fond de la webvue apparaîtrait sous la barre d'état.
    contentInset: 'never',
    // iOS 16 au minimum : ce n'est pas une option de Capacitor (l'ancienne
    // clé `minVersion` était ignorée en silence) — `cap:telephone` l'écrit
    // dans le projet Xcode.
  },
  android: {
    // Minimum SDK version 24 = Android 7.0 (covers ~95% of devices)
    minWebViewVersion: 60,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: true,
    },
    SystemBars: {
      // Android 15 dessine l'application sous les barres système. Capacitor
      // injecte les vraies valeurs dans `--safe-area-inset-*`, que
      // `index.css` lit avant `env()`.
      insetsHandling: 'css',
    },
  },
}

export default config
