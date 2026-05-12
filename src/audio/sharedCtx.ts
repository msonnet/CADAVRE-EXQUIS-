// Contexte audio partagé entre useSound et useAmbiance
// Créé au premier appel depuis un geste utilisateur (clic/tap) → iOS unlock automatique

let _ctx: AudioContext | null = null
const _listeners: Array<() => void> = []

export function getAudioContext(): AudioContext {
  if (_ctx) return _ctx
  _ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  return _ctx
}

export function onContextRunning(cb: () => void) {
  if (_ctx?.state === 'running') { cb(); return }
  _listeners.push(cb)
}

export function notifyContextRunning() {
  _listeners.splice(0).forEach(cb => cb())
}
