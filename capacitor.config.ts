import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'fr.nathansonnet.cadavreexquis',
  appName: 'Cadavre Exquis',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: false,
    // Minimum iOS version for App Store submission
    minVersion: '16.0',
  },
  android: {
    // Minimum SDK version 24 = Android 7.0 (covers ~95% of devices)
    minWebViewVersion: 60,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0f0805',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchAutoHide: true,
    },
  },
}

export default config
