#!/usr/bin/env node
/*
  Le jeu se tient au téléphone, en portrait — sur iPhone comme sur Samsung.

  Les dossiers `ios/` et `android/` ne sont pas dans le dépôt : `cap add` les
  engendre à partir des gabarits de Capacitor, qui déclarent un iPad et les
  quatre orientations. Or toute la mise en page est composée pour un écran
  debout de 320 à 430 points : couché, l'accueil perd son pied de page et le
  studio de dessin ses outils. Le manifeste PWA dit déjà `portrait` ; ce
  script porte la même décision dans les deux projets natifs.

  - iOS : portrait seul, `TARGETED_DEVICE_FAMILY = 1` — iPhone seulement —
    et iOS 16 au minimum (le gabarit dit 15.0, la fiche App Store dit 16).
    Un iPad l'installe quand même, en mode compatibilité (un iPhone agrandi),
    ce qui est exactement le rendu voulu.
  - Android : `screenOrientation="portrait"` sur l'activité.

  Idempotent : on peut le relancer après chaque `cap sync`. Un projet absent
  est ignoré en silence — on n'a pas forcément ajouté les deux plateformes.

  Usage : node scripts/natif-telephone.mjs [racine]
*/
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const racine = process.argv[2] ?? process.cwd()

export function plistPortrait(xml) {
  const portrait = '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>'
  return xml
    .replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*)<array>[\s\S]*?<\/array>/, `$1${portrait}`)
    .replace(/(<key>UISupportedInterfaceOrientations~ipad<\/key>\s*)<array>[\s\S]*?<\/array>/, `$1${portrait}`)
}

export const IOS_MINIMUM = '16.0'

export function pbxprojIphone(txt) {
  return txt
    .replace(/TARGETED_DEVICE_FAMILY = "?[0-9,]+"?;/g, 'TARGETED_DEVICE_FAMILY = 1;')
    .replace(/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/g, `IPHONEOS_DEPLOYMENT_TARGET = ${IOS_MINIMUM};`)
}

export function manifestePortrait(xml) {
  if (/android:screenOrientation=/.test(xml)) {
    return xml.replace(/android:screenOrientation="[^"]*"/, 'android:screenOrientation="portrait"')
  }
  return xml.replace(/(<activity\b)/, '$1\n            android:screenOrientation="portrait"')
}

function retoucher(chemin, f) {
  if (!existsSync(chemin)) return false
  const avant = readFileSync(chemin, 'utf8')
  const apres = f(avant)
  if (apres !== avant) writeFileSync(chemin, apres)
  console.log(`${apres !== avant ? 'retouché' : 'déjà en ordre'} · ${chemin}`)
  return true
}

if (import.meta.url === `file://${process.argv[1]}`) {
  retoucher(join(racine, 'ios/App/App/Info.plist'), plistPortrait)
  retoucher(join(racine, 'ios/App/App.xcodeproj/project.pbxproj'), pbxprojIphone)
  retoucher(join(racine, 'android/app/src/main/AndroidManifest.xml'), manifestePortrait)
}
