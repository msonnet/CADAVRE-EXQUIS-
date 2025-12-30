import { tokenize, normalizeWord } from "./utils.js";

const KEY = "cadavre_theme_memory_v2";

const FAMILIES = {
  ESPACE: new Set(["atelier","mur","beton","béton","porte","portes","couloir","chambre","quai","puits","seuil"]),
  CORPS: new Set(["oeil","œil","yeux","bouche","langue","peau","corps","gorge","nerf","sang","salive","sueur"]),
  NOIR: new Set(["nuit","ombre","obscur","obscurite","obscurité","brume","fond","profonde","profondeur"]),
  MATIERE: new Set(["verre","pierre","cendre","poussiere","poussière","rouille","couteau","clou","corde"]),
  ADMIN: new Set(["dossier","reference","référence","clause","annexe","preuve","formulaire","conformite","conformité","notification"]),
  CONCEPT: new Set(["ecart","écart","intervalle","presence","présence","negatif","négatif","reel","réel","hypothese","hypothèse"])
};

function fresh() {
  return { fam: { ESPACE:0, CORPS:0, NOIR:0, MATIERE:0, ADMIN:0, CONCEPT:0 } };
}

export function loadThemeMemory() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object" || !parsed.fam) return fresh();
    return parsed;
  } catch {
    return fresh();
  }
}

export function saveThemeMemory(mem) {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {}
}

export function decayThemeMemory(mem) {
  // Diffus : oubli progressif, pas de censure
  const decay = 0.80;
  for (const k of Object.keys(mem.fam)) mem.fam[k] = Math.max(0, mem.fam[k] * decay);
  return mem;
}

function familiesInText(text) {
  const toks = tokenize(text).map(normalizeWord);
  const hits = new Set();
  for (const t of toks) {
    for (const [fam, set] of Object.entries(FAMILIES)) {
      if (set.has(t)) hits.add(fam);
    }
  }
  return Array.from(hits);
}

export function themePenaltyForCandidate(mem, text) {
  const fams = familiesInText(text);
  if (!fams.length) return 1.0;

  const alpha = 0.32;
  let p = 1.0;
  for (const f of fams) {
    const fat = mem.fam[f] || 0;
    p *= 1 / (1 + fat * alpha);
  }
  return p;
}

export function updateThemeMemoryFromStrophe(mem, stropheText) {
  const toks = tokenize(stropheText).map(normalizeWord);
  const counts = { ESPACE:0, CORPS:0, NOIR:0, MATIERE:0, ADMIN:0, CONCEPT:0 };

  for (const t of toks) {
    for (const [fam, set] of Object.entries(FAMILIES)) {
      if (set.has(t)) counts[fam] += 1;
    }
  }

  // Mode B : fatigue légère sur toutes les familles "un peu présentes"
  const threshold = 2;
  for (const fam of Object.keys(counts)) {
    if (counts[fam] >= threshold) {
      mem.fam[fam] += Math.min(2.4, 0.9 + counts[fam] * 0.14);
    }
  }
  return mem;
}
