/**
 * Le son du papier — bruit filtré, synthétisé à la volée.
 *
 * ── Pourquoi ──────────────────────────────────────────────────────────────
 *
 * Tous les sons du jeu étaient des sinusoïdes entre 110 et 330 Hz, derrière
 * un passe-bas à 2,4 kHz. Or le haut-parleur d'un téléphone ne rend presque
 * rien sous 300 Hz : la lettrine, à 110 Hz, y était inaudible, et le jeu se
 * jouait dans un silence qu'on n'avait pas choisi.
 *
 * Le papier, lui, vit entre 1 et 6 kHz — exactement la bande qu'un
 * téléphone restitue le mieux. Et c'est le matériau du jeu : feuillets,
 * plis, coutures. Un pli qui claque, une feuille qu'on pose, une plume qui
 * gratte : trois gestes, trois bruits filtrés, aucun fichier à précacher.
 *
 * Chaque appel tire ses propres paramètres dans une fourchette étroite :
 * deux plis identiques à la suite se reconnaîtraient comme un échantillon.
 */

const tampons = new WeakMap<BaseAudioContext, AudioBuffer>()

/** Une seconde de bruit blanc, calculée une fois par contexte. */
function bruit(ctx: BaseAudioContext): AudioBuffer {
  const deja = tampons.get(ctx)
  if (deja) return deja
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  tampons.set(ctx, b)
  return b
}

const autour = (v: number, ecart: number) => v * (1 + (Math.random() * 2 - 1) * ecart)

/** Une bouffée de bruit filtré : l'unité de tous les sons de papier. */
function bouffee(
  ctx: BaseAudioContext, dest: AudioNode, t: number,
  o: { type: BiquadFilterType; freq: number; q: number; attaque: number; duree: number; gain: number },
) {
  const src = ctx.createBufferSource()
  src.buffer = bruit(ctx)
  const f = ctx.createBiquadFilter()
  f.type = o.type
  f.frequency.value = autour(o.freq, 0.12)
  f.Q.value = o.q
  const g = ctx.createGain()
  const pic = autour(o.gain, 0.15)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pic, t + o.attaque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.attaque + o.duree)
  src.connect(f); f.connect(g); g.connect(dest)
  // Démarrer à un point au hasard du tampon : le grain change à chaque fois.
  src.start(t, Math.random() * 0.5, o.attaque + o.duree + 0.05)
}

/** Un volet qui se déplie : l'arête qui claque, puis la feuille qui glisse. */
export function pli(ctx: BaseAudioContext, dest: AudioNode, t: number) {
  bouffee(ctx, dest, t, { type: 'bandpass', freq: 3400, q: 0.9, attaque: 0.004, duree: 0.07, gain: 0.22 })
  bouffee(ctx, dest, t + 0.02, { type: 'bandpass', freq: 1500, q: 0.6, attaque: 0.05, duree: 0.28, gain: 0.09 })
}

/** Une feuille posée sur la table : un souffle grave, un frôlement aigu. */
export function feuille(ctx: BaseAudioContext, dest: AudioNode, t: number) {
  bouffee(ctx, dest, t, { type: 'lowpass', freq: 1100, q: 0.7, attaque: 0.012, duree: 0.2, gain: 0.16 })
  bouffee(ctx, dest, t + 0.01, { type: 'highpass', freq: 4200, q: 0.5, attaque: 0.02, duree: 0.12, gain: 0.05 })
}

/** Une plume qui gratte — le sceau d'un fragment. */
export function plume(ctx: BaseAudioContext, dest: AudioNode, t: number) {
  bouffee(ctx, dest, t, { type: 'bandpass', freq: 5200, q: 2.2, attaque: 0.01, duree: 0.09, gain: 0.07 })
  bouffee(ctx, dest, t + 0.07, { type: 'bandpass', freq: 4600, q: 2.2, attaque: 0.01, duree: 0.12, gain: 0.05 })
}

// ─── Les sons, coupés ou non ────────────────────────────────────────────────

const CLE_SONS = 'cadavre-sons'

/**
 * Les effets sonores sont-ils actifs ? Oui par défaut.
 *
 * L'ambiance continue de se taire — c'était une demande, elle tient. Ceci
 * ne règle que les effets : un bouton son qui ne coupait rien, sur deux
 * écrans, était un mensonge d'interface.
 */
export function sonsActifs(): boolean {
  try { return localStorage.getItem(CLE_SONS) !== 'off' } catch { return true }
}

export function reglerSons(actifs: boolean): void {
  try { localStorage.setItem(CLE_SONS, actifs ? 'on' : 'off') } catch { /* ignore */ }
}
