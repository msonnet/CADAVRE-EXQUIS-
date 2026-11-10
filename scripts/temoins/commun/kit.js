/*
  Le nécessaire commun aux maquettes témoins.

  — Les sept ambiances du jeu (`src/reve/pools.ts`), posées en variables CSS.
  — Le papier (`src/lib/papier.ts`) : couleur, ombre, plis au repos, grain.
  — L'horloge : une animation est une FONCTION PURE du temps, `rendre(t)`.
    C'est ce qui permet de la figer à un instant (`?t=1200`) pour la
    photographier, de la poser d'un appui, et de la rejouer.

  Paramètres d'adresse :
    ambiance=lin|aube|rose|celadon|minuit|encre|argile   (défaut : lin)
    accent=0..3      l'accent de l'ambiance (défaut : celui des captures de référence)
    t=1200           fige l'animation à 1200 ms, sans la jouer
    reduit=1         « réduire les animations » : l'état final, tout de suite
    auto=0           ne joue pas au chargement
    vitesse=0.5      ralentit (0,5) ou accélère la lecture
*/
(function () {
  'use strict'

  const AMBIANCES = {
    minuit:  { nom: 'Minuit profond', fond: '#141640', encre: '#f0e4cc', encreDouce: '#cec0a4', encrePale: '#9e9078', filet: 'rgba(240, 228, 204, 0.16)', texteBouton: '#141640', defaut: 0,
      halo: 'radial-gradient(ellipse at 28% 18%, rgba(120, 90, 220, 0.20), transparent 48%), radial-gradient(ellipse at 72% 82%, rgba(240, 104, 64, 0.14), transparent 48%)',
      accents: [['saumon', '#f06840', '#f88458'], ['cobalt', '#8aaef8', '#a4c6ff'], ['or', '#d4a838', '#e8bc4c'], ['crème', '#f0e4cc', '#faf0dc']] },
    encre:   { nom: 'Encre profonde', fond: '#080604', encre: '#ede0c8', encreDouce: '#c4b098', encrePale: '#8c786a', filet: 'rgba(237, 224, 200, 0.14)', texteBouton: '#080604', defaut: 0,
      halo: 'radial-gradient(ellipse at 50% 28%, rgba(220, 28, 16, 0.16), transparent 58%)',
      accents: [['rouge vif', '#e82010', '#f43020'], ['or', '#d4a838', '#e8bc4c'], ['ocre', '#e8a050', '#f4b464'], ['crème', '#ede0c8', '#f8ecd8']] },
    argile:  { nom: 'Argile cuite', fond: '#1c1208', encre: '#eedcc0', encreDouce: '#ceba98', encrePale: '#a89070', filet: 'rgba(238, 220, 192, 0.16)', texteBouton: '#1c1208', defaut: 0,
      halo: 'radial-gradient(ellipse at 20% 30%, rgba(212, 152, 72, 0.14), transparent 50%)',
      accents: [['or brûlé', '#d4a040', '#e8b454'], ['rouge brique', '#e05a38', '#f07050'], ['crème', '#eedcc0', '#f8e8d0'], ['vert sauge', '#8aaa78', '#9ec08c']] },
    lin:     { nom: 'Lin écru', fond: '#f2ede2', encre: '#0c0a06', encreDouce: '#2c2820', encrePale: '#5a5040', filet: 'rgba(12, 10, 6, 0.13)', texteBouton: '#f2ede2', defaut: 1,
      halo: 'radial-gradient(ellipse at 70% 78%, rgba(20, 40, 160, 0.05), transparent 55%)',
      accents: [['rouge sang', '#c01c14', '#d42c22'], ['bleu cobalt', '#1428a0', '#2038b8'], ['vert sapin', '#1a4a1e', '#245e28'], ['pourpre', '#701448', '#8a1c60']] },
    aube:    { nom: 'Aube froide', fond: '#e4e8f0', encre: '#080c18', encreDouce: '#2c3048', encrePale: '#4c5068', filet: 'rgba(8, 12, 24, 0.13)', texteBouton: '#e4e8f0', defaut: 0,
      halo: 'radial-gradient(ellipse at 20% 28%, rgba(100, 20, 80, 0.06), transparent 55%)',
      accents: [['bleu nuit', '#1428a0', '#1c38c0'], ['rouge vif', '#cc1c14', '#e02c20'], ['pourpre', '#681448', '#801c60'], ['vert encre', '#144830', '#1c6040']] },
    rose:    { nom: 'Rose fané', fond: '#f2e2dc', encre: '#301820', encreDouce: '#5c3a46', encrePale: '#8a6470', filet: 'rgba(48, 24, 32, 0.14)', texteBouton: '#f8ece8', defaut: 0,
      halo: 'radial-gradient(ellipse at 24% 22%, rgba(160, 24, 40, 0.07), transparent 52%), radial-gradient(ellipse at 78% 80%, rgba(102, 20, 78, 0.05), transparent 50%)',
      accents: [['carmin', '#a01828', '#b82838'], ['prune', '#66144e', '#7e1c62'], ['vert bouteille', '#14523a', '#1c684c'], ['bleu ardoise', '#2a3a78', '#364a92']] },
    celadon: { nom: 'Céladon', fond: '#e3ead8', encre: '#1a281c', encreDouce: '#40523f', encrePale: '#6c7c64', filet: 'rgba(26, 40, 28, 0.13)', texteBouton: '#eef4e4', defaut: 0,
      halo: 'radial-gradient(ellipse at 76% 24%, rgba(176, 40, 24, 0.06), transparent 52%), radial-gradient(ellipse at 22% 78%, rgba(14, 74, 82, 0.06), transparent 50%)',
      accents: [['cinabre', '#b02818', '#c83a26'], ['paon', '#0e4a52', '#166070'], ['terre brûlée', '#6e3a14', '#864a1e'], ['encre violette', '#46285e', '#583676']] },
  }

  // ── Couleurs ────────────────────────────────────────────────────────────
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
  const melange = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)) }
  const luminance = h => {
    const [r, g, b] = rgb(h).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const alpha = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }

  // ── Le papier — recopié de `src/lib/papier.ts` ──────────────────────────
  function papierDeLaFeuille(fond, encre) {
    const sombre = luminance(fond) < 0.18
    const couleur = sombre ? melange(fond, encre, 0.075) : melange(fond, '#ffffff', 0.55)
    return {
      couleur, sombre,
      // Le dos d'une feuille : le même papier, un rien plus terne. (Ajout des maquettes.)
      dos: sombre ? melange(couleur, '#000000', 0.22) : melange(couleur, encre, 0.07),
      // La tranche d'un paquet de feuilles. (Ajout des maquettes.)
      tranche: sombre ? melange(couleur, encre, 0.16) : melange(couleur, encre, 0.2),
      ombre: sombre
        ? '0 0 0 0.5px rgba(255,240,210,0.18), 0 14px 18px rgba(0,0,0,0.55)'
        : '0 1px 0.6px rgba(60,40,10,0.16), 0 12px 16px -2px rgba(60,40,10,0.15)',
      ombreVolet: sombre ? '#000000' : '#1e1406',
    }
  }
  function reliefDuPli(rang, sombre) {
    if (rang % 2 === 0) return `linear-gradient(to bottom, ${sombre ? 'rgba(0,0,0,0.26)' : 'rgba(40,28,10,0.04)'}, rgba(0,0,0,0) 30%)`
    return `linear-gradient(to bottom, ${sombre ? 'rgba(255,240,210,0.035)' : 'rgba(255,255,255,0.45)'}, rgba(255,255,255,0) 24%), `
      + `linear-gradient(to top, ${sombre ? 'rgba(0,0,0,0.12)' : 'rgba(40,28,10,0.02)'}, rgba(0,0,0,0) 24%)`
  }
  const PLIURE = 'linear-gradient(to bottom, rgba(0,0,0,0.26) 0 1px, rgba(255,255,255,0.34) 1px 2px)'
  const grains = {}
  function grainDuPapier(sombre) {
    const cle = sombre ? 'sombre' : 'clair'
    if (grains[cle]) return grains[cle]
    const n = 200, c = document.createElement('canvas'); c.width = c.height = n
    const g = c.getContext('2d'); if (!g) return 'none'
    let graine = sombre ? 3 : 7
    const hasard = () => { graine = (graine + 0x6d2b79f5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
    const img = g.createImageData(n, n), teinte = sombre ? [255, 244, 222] : [58, 44, 24]
    for (let i = 0; i < n * n; i++) { img.data[i * 4] = teinte[0]; img.data[i * 4 + 1] = teinte[1]; img.data[i * 4 + 2] = teinte[2]; img.data[i * 4 + 3] = Math.pow(hasard(), 4) * (sombre ? 24 : 20) }
    g.putImageData(img, 0, 0)
    g.globalAlpha = sombre ? 0.07 : 0.08; g.strokeStyle = sombre ? '#fff3dc' : '#3a2c18'; g.lineWidth = 0.6
    for (let i = 0; i < 26; i++) {
      const x = hasard() * n, y = hasard() * n, l = 6 + hasard() * 16, a = hasard() * Math.PI
      g.beginPath(); g.moveTo(x, y)
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (hasard() - 0.5) * 4, y + Math.sin(a) * l * 0.5 + (hasard() - 0.5) * 4, x + Math.cos(a) * l, y + Math.sin(a) * l)
      g.stroke()
    }
    return (grains[cle] = `url(${c.toDataURL('image/png')})`)
  }

  // ── Paramètres ──────────────────────────────────────────────────────────
  const q = new URLSearchParams(location.search)
  // Les mêmes paramètres se lisent aussi après le « # » : sur la planche
  // publiée, seule cette partie de l'adresse arrive jusqu'à la maquette.
  for (const [k, v] of new URLSearchParams(location.hash.replace(/^#/, ''))) if (!q.has(k)) q.set(k, v)
  const params = {
    ambiance: AMBIANCES[q.get('ambiance')] ? q.get('ambiance') : 'lin',
    accent: q.has('accent') ? Number(q.get('accent')) : null,
    t: q.has('t') ? Number(q.get('t')) : null,
    reduit: q.get('reduit') === '1',
    auto: q.get('auto') !== '0',
    vitesse: q.has('vitesse') ? Math.max(0.05, Number(q.get('vitesse')) || 1) : 1,
    brut: q,
  }

  const etat = { ambiance: null, papier: null }
  function poserAmbiance(id, accent) {
    const a = AMBIANCES[id] || AMBIANCES.lin
    const i = accent == null || !a.accents[accent] ? a.defaut : accent
    const [, acc, survol] = a.accents[i]
    const papier = papierDeLaFeuille(a.fond, a.encre)
    const r = document.documentElement
    const v = {
      '--fond': a.fond, '--encre': a.encre, '--encre-douce': a.encreDouce, '--encre-pale': a.encrePale,
      '--filet': a.filet, '--halo': a.halo, '--accent': acc, '--accent-survol': survol, '--texte-bouton': a.texteBouton,
      '--papier': papier.couleur, '--papier-dos': papier.dos, '--papier-tranche': papier.tranche,
      '--ombre-feuille': papier.ombre, '--ombre-volet': papier.ombreVolet, '--grain': grainDuPapier(papier.sombre),
    }
    for (const k in v) r.style.setProperty(k, v[k])
    r.dataset.ambiance = id
    r.dataset.sombre = papier.sombre ? '1' : '0'
    etat.ambiance = { id, ...a, accent: acc, accentSurvol: survol }
    etat.papier = papier
    nommer()
  }
  // Le nom de l'ambiance, partout où la page le montre — et de nouveau quand le document est lu.
  function nommer() { if (etat.ambiance) document.querySelectorAll('[data-nom-ambiance]').forEach(e => { e.textContent = etat.ambiance.nom.toUpperCase() }) }
  poserAmbiance(params.ambiance, params.accent)
  document.addEventListener('DOMContentLoaded', nommer)

  // ── Les contenus témoins, les mêmes pour toutes les maquettes ───────────
  /*
    Trois poèmes : `cas=court|etoffe|atelier` (défaut : etoffe). Un tableau de
    VOLETS ; chaque volet porte un ou plusieurs vers — à l'Atelier, au-delà de
    cinq vers, le jeu groupe (`plierEnPanneaux`). `ouvertures` : les instants
    où le jeu ouvre chaque volet AUJOURD'HUI (`src/lib/rythme.ts`), en ms ; un
    volet met 1 150 ms à s'ouvrir. C'est le souffle du poème : un vers court
    laisse un silence, un vers long se lit.
  */
  const POEMES = {
    court: { pied: '3 FRAGMENTS · PHRASE COURTE · 07:32', volets: [['La baleine infirme'], ['recoud'], ['un escalier de sel']], ouvertures: [0, 1295, 2380], finActuelle: 3530 },
    etoffe: { pied: '5 FRAGMENTS · STRUCTURE ÉTOFFÉE · 07:32', volets: [['Le vernis craquelé'], ['avale'], ['une lampe sourde'], ['sous la pluie'], ['du jardin']], ouvertures: [0, 1295, 2380, 3675, 4970], finActuelle: 6120 },
    atelier: { pied: '11 VERS · L’ATELIER · 07:32', volets: [
      ['Je marche', 'la paille ronge un rochet', 'il reste du givre sur la vitre du couloir'],
      ['Parfaitement inutile', 'le tablier sèche mal contre la porte du fond'],
      ['un athanor', 'elle pousse la lampe et le drap se froisse encore'],
      ['sans nom', 'la cire se souvient des doigts'],
      ['obliquement', 'une clef dort dans le pain']], ouvertures: [0, 3130, 5425, 7808, 9780], finActuelle: 10930 },
  }
  const cas = POEMES[q.get('cas')] ? q.get('cas') : 'etoffe'
  /*
    Le dessin témoin : un cadavre dessiné à trois mains (tête à la plume,
    corps au feutre, jambes au crayon), 720 × 2520 px, sur le papier du studio.
    `coutures` : où une main a passé le dessin à la suivante, en fractions de
    la hauteur. Les bandes sont aussi fournies une à une.
  */
  const DESSIN = {
    url: '../assets/dessin-assemble.png', bandes: ['../assets/dessin-bande-1.png', '../assets/dessin-bande-2.png', '../assets/dessin-bande-3.png'],
    largeur: 720, hauteur: 2520, coutures: [1 / 3, 2 / 3], papier: '#fdf8f2', mains: ['TÊTE — Nadja', 'CORPS — Léa', 'JAMBES — Paul'],
    lecture: 'Un monsieur en haut-de-forme a pris une cage pour cœur, et s’en va sur une roue.',
  }

  // ── Mathématiques d'animation ───────────────────────────────────────────
  const borne = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
  const M = {
    borne,
    mel: (a, b, t) => a + (b - a) * t,
    /** Où en est t entre a et b, de 0 à 1 (borné). */
    part: (t, a, b) => borne((t - a) / (b - a)),
    lisse: t => t * t * (3 - 2 * t),
    sortieCube: t => 1 - Math.pow(1 - t, 3),
    entreeCube: t => t * t * t,
    entreeSortie: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    /** Dépasse, puis revient : un objet qui se pose. */
    sortieElan: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    /** Un ressort amorti : 0 → 1 avec quelques oscillations. */
    ressort: (t, raideur = 9, amorti = 5) => 1 - Math.exp(-amorti * t) * Math.cos(raideur * t),
    /** Bézier cubique façon CSS : `bezier(0.16, 0.84, 0.24, 1)(t)`. */
    bezier(x1, y1, x2, y2) {
      const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
      const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t
      return x => { let t = x; for (let i = 0; i < 8; i++) { const d = X(t) - x; if (Math.abs(d) < 1e-5) break; const p = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(p) < 1e-6) break; t -= d / p } return Y(borne(t)) }
    },
    rad: d => d * Math.PI / 180,
  }

  /*
    La lumière du jeu : une seule, en haut à gauche, un peu devant la table.
    Vecteur unitaire qui va DE la surface VERS la lampe, dans le repère de
    l'écran (x vers la droite, y vers le bas, z vers l'œil).
  */
  const LUMIERE = (() => { const v = [-0.42, -0.58, 0.7], n = Math.hypot(...v); return v.map(c => c / n) })()
  /** L'éclairement (0..1) d'une face dont la normale est n, un vecteur unitaire. */
  const eclairement = n => borne(n[0] * LUMIERE[0] + n[1] * LUMIERE[1] + n[2] * LUMIERE[2])

  // ── L'horloge ───────────────────────────────────────────────────────────
  let def = null, raf = 0, t0 = 0, tCourant = 0, enCours = false
  const versParent = m => { try { if (window.parent !== window) window.parent.postMessage({ temoin: true, ...m }, '*') } catch { /* seul */ } }

  function rendre(t) { tCourant = t; if (def) def.rendre(t) }
  function arreter() { cancelAnimationFrame(raf); enCours = false }
  function poser() {
    if (!def) return
    arreter()
    if (def.poser) def.poser(); else rendre(def.duree)
    tCourant = def.duree
    document.documentElement.dataset.temoin = 'pose'
    versParent({ evenement: 'fin' })
  }
  function jouer() {
    if (!def) return
    arreter()
    enCours = true
    document.documentElement.dataset.temoin = 'joue'
    t0 = performance.now()
    rendre(0)
    const pas = () => {
      const t = (performance.now() - t0) * params.vitesse
      if (t >= def.duree) { poser(); return }
      rendre(t)
      raf = requestAnimationFrame(pas)
    }
    raf = requestAnimationFrame(pas)
  }

  async function enregistrer(d) {
    def = d
    try { await document.fonts.ready } catch { /* tant pis */ }
    if (d.pret) await d.pret()
    versParent({ evenement: 'pret', duree: d.duree })
    if (params.t != null) { rendre(Math.min(params.t, d.duree)); document.documentElement.dataset.temoin = 'fige'; return }
    const reduit = params.reduit || (params.brut.get('reduit') !== '0' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (reduit) { poser(); return }
    if (!params.auto) { rendre(0); return }
    setTimeout(jouer, 350)
  }

  // Un appui pendant la séquence pose tout — la règle du jeu : « une belle
  // animation qu'on subit une deuxième fois est pire qu'une animation bancale ».
  window.addEventListener('pointerdown', e => {
    if (!enCours || (e.target.closest && e.target.closest('[data-sans-saut]'))) return
    poser()
  }, { capture: true })
  window.addEventListener('keydown', () => { if (enCours) poser() }, { capture: true })

  // La planche témoin pilote ses maquettes par messages.
  window.addEventListener('message', e => {
    const m = e.data
    if (!m || !m.temoin) return
    if (m.action === 'rejouer') jouer()
    if (m.action === 'poser') poser()
    if (m.action === 'ambiance') { poserAmbiance(m.valeur, m.accent); if (def && def.surAmbiance) def.surAmbiance(); rendre(tCourant) }
    if (m.action === 'aller') { arreter(); rendre(m.valeur) }
  })

  window.Temoin = {
    AMBIANCES, params, M, LUMIERE, eclairement, PLIURE, POEMES, cas, poeme: POEMES[cas], DESSIN,
    get ambiance() { return etat.ambiance }, get papier() { return etat.papier },
    melange, alpha, luminance, papierDeLaFeuille, reliefDuPli, grainDuPapier, poserAmbiance,
    enregistrer, jouer, poser, rendre, get t() { return tCourant }, get enCours() { return enCours },
  }
  window.rejouer = jouer
})()
