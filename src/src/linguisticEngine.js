import { tokenize, normalizeWord, pick, clamp } from "./utils.js";
import { LEX } from "./lexicon.js";

const STORAGE_KEY = "cadavre_global_memory_v2";

// ---------- utils ----------
function ensureArray(arr) {
  return Array.isArray(arr) ? arr.filter(Boolean) : [];
}

function nowDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadGlobalMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveGlobalMemory(mem) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch {}
}

function freshGlobalMemory() {
  return {
    dayKey: nowDayKey(),
    wordCount: {},
    bigramCount: {},
    lineHash: {},
    games: 0
  };
}

function decayGlobalMemory(mem) {
  const today = nowDayKey();
  if (mem.dayKey !== today) {
    const decay = 0.65;
    for (const k of Object.keys(mem.wordCount)) mem.wordCount[k] = Math.round(mem.wordCount[k] * decay);
    for (const k of Object.keys(mem.bigramCount)) mem.bigramCount[k] = Math.round(mem.bigramCount[k] * decay);
    for (const k of Object.keys(mem.lineHash)) mem.lineHash[k] = Math.round(mem.lineHash[k] * decay);
    mem.dayKey = today;
  }
  return mem;
}

function hashLine(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

function weightedChoice(items, weightFn) {
  const arr = items.filter(Boolean);
  if (!arr.length) return "";
  let total = 0;
  const weights = arr.map((x) => {
    const w = Math.max(0.00001, weightFn(x));
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

// ---------- moteur ----------
export class LinguisticEngine {
  constructor() {
    const loaded = loadGlobalMemory();
    this.global = decayGlobalMemory(loaded || freshGlobalMemory());
    this.resetStrophe();
  }

  resetStrophe() {
    this.state = {
      context: "POETIC",
      contextTTL: 0,
      usedWords: new Map(),
      usedBigrams: new Map(),
      recentWords: [],
      metaDone: false,
      turn: 0,
      total: 12
    };
  }

  beginStrophe(totalTurns = 12) {
    this.resetStrophe();
    this.state.total = totalTurns;
    this.state.context = Math.random() < 0.55 ? "POETIC" : "CONCEPT";
    this.state.contextTTL = 2 + Math.floor(Math.random() * 2); // 2–3 vers
  }

  endStrophe() {
    this.global.games += 1;
    saveGlobalMemory(this.global);
  }

  evolveContext(fatigue) {
    if (this.state.contextTTL > 0) {
      this.state.contextTTL--;
      return this.state.context;
    }

    const c = this.state.context;
    const options = [
      ...(c === "POETIC" ? ["POETIC", "POETIC", "CONCEPT", "NARRATIVE", "MIXED"] : []),
      ...(c === "CONCEPT" ? ["CONCEPT", "CONCEPT", "POETIC", "ADMIN", "MIXED"] : []),
      ...(c === "TECH" ? ["TECH", "TECH", "POETIC", "CONCEPT", "MIXED"] : []),
      ...(c === "ADMIN" ? ["ADMIN", "ADMIN", "CONCEPT", "POETIC", "MIXED"] : []),
      ...(c === "ORAL" ? ["ORAL", "ORAL", "POETIC", "CONCEPT", "MIXED"] : []),
      ...(c === "NARRATIVE" ? ["NARRATIVE", "NARRATIVE", "POETIC", "CONCEPT", "MIXED"] : []),
      ...(c === "MIXED" ? ["POETIC", "CONCEPT", "TECH", "ADMIN", "NARRATIVE"] : [])
    ];

    let next = pick(options.length ? options : ["POETIC"]);

    // glissement contrôlé en fin
    if (fatigue > 0.55 && Math.random() < 0.18) next = "TECH";
    if (fatigue > 0.70 && Math.random() < 0.10) next = "ADMIN";
    if (fatigue > 0.80 && Math.random() < 0.08) next = "ORAL";

    this.state.context = next;
    this.state.contextTTL = 2 + Math.floor(Math.random() * 2);
    return next;
  }

  penaltyWord(w) {
    const g = this.global.wordCount[w] || 0;
    const s = this.state.usedWords.get(w) || 0;
    return 1 + s * 2.6 + g * 0.35;
  }

  chooseFrom(key, boostWords = []) {
    const items = ensureArray(LEX[key]);
    const boosted = new Set(boostWords.map(normalizeWord));
    if (!items.length) return `[${key}]`;

    return weightedChoice(items, (x) => {
      const toks = tokenize(x).map(normalizeWord);
      let w = 1.0;
      for (const t of toks) w /= this.penaltyWord(t);
      for (const t of toks) if (boosted.has(t)) w *= 1.20;
      return w;
    });
  }

  recordLine(line) {
    const toks = tokenize(line).map(normalizeWord).filter(Boolean);

    for (const t of toks) {
      this.state.usedWords.set(t, (this.state.usedWords.get(t) || 0) + 1);
      this.global.wordCount[t] = (this.global.wordCount[t] || 0) + 1;
      this.state.recentWords.push(t);
      if (this.state.recentWords.length > 24) this.state.recentWords.shift();
    }

    for (let i = 0; i < toks.length - 1; i++) {
      const bi = `${toks[i]}_${toks[i + 1]}`;
      this.state.usedBigrams.set(bi, (this.state.usedBigrams.get(bi) || 0) + 1);
      this.global.bigramCount[bi] = (this.global.bigramCount[bi] || 0) + 1;
    }

    const h = hashLine(line);
    this.global.lineHash[h] = (this.global.lineHash[h] || 0) + 1;
  }

  isLineTooRepeated(line) {
    const h = hashLine(line);
    return (this.global.lineHash[h] || 0) >= 1;
  }

  buildTemplate(context, fatigue) {
    const hinge = this.chooseFrom("HINGE");
    const archa = Math.random() < 0.22 ? this.chooseFrom("ARCHA") : "";
    const adv = Math.random() < 0.35 ? this.chooseFrom("ADVERB") : "";
    const maxWords = 22 - Math.round(fatigue * 6); // 22..16

    const T = [];

    if (context === "POETIC" || context === "NARRATIVE") {
      T.push(() => `${this.chooseFrom("POETIC_GP")} ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")}`);
      T.push(() => `${this.chooseFrom("POETIC_GN")}, ${hinge} ${this.chooseFrom("POETIC_GV")} ${this.chooseFrom("POETIC_GP")}`);
      T.push(() => `${adv} ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("VERB_PHRASE")} ${this.chooseFrom("POETIC_GP")}`);
      T.push(() => `${this.chooseFrom("NARR_GN")} ${this.chooseFrom("VERB_PHRASE")} ${hinge} ${this.chooseFrom("POETIC_GN")}`);
    }

    if (context === "CONCEPT") {
      T.push(() => `${this.chooseFrom("HIGH_A")} ${hinge} ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")}`);
      T.push(() => `${archa} ${this.chooseFrom("HIGH_B")} : ${this.chooseFrom("POETIC_GP")} ${this.chooseFrom("POETIC_GN")}, ${this.chooseFrom("POETIC_GV")}`);
      T.push(() => `${this.chooseFrom("HIGH_C")}, ${this.chooseFrom("HIGH_A")} ${hinge} ${this.chooseFrom("VERB_PHRASE")}`);
    }

    if (context === "TECH") {
      T.push(() => `${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")} ${hinge} ${this.chooseFrom("TECH_ATELIER")}`);
      T.push(() => `${this.chooseFrom("TECH_ANAT")} ${hinge} ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("VERB_PHRASE")}`);
      T.push(() => `${this.chooseFrom("POETIC_GP")}, ${this.chooseFrom("TECH_ATELIER")} ${hinge} ${this.chooseFrom("HIGH_A")}`);
    }

    if (context === "ADMIN") {
      T.push(() => `${this.chooseFrom("TECH_ADMIN")} ${hinge} ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")}`);
      T.push(() => `${this.chooseFrom("HIGH_C")} : ${this.chooseFrom("TECH_ADMIN")}, ${this.chooseFrom("VERB_PHRASE")} ${this.chooseFrom("POETIC_GP")}`);
    }

    if (context === "ORAL") {
      T.push(() => `${this.chooseFrom("ORAL")} ${hinge} ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")}`);
      T.push(() => `${this.chooseFrom("ORAL")} ; ${this.chooseFrom("HIGH_A")} ${hinge} ${this.chooseFrom("POETIC_GP")}`);
      if (Math.random() < 0.18) T.push(() => `${this.chooseFrom("ORAL_CRU")} — ${this.chooseFrom("POETIC_GN")}`);
    }

    if (context === "MIXED") {
      T.push(() => `${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("VERB_PHRASE")} ${hinge} ${this.chooseFrom("HIGH_B")}`);
      T.push(() => `${this.chooseFrom("HIGH_A")} ${hinge} ${this.chooseFrom("TECH_ANAT")} ${hinge} ${this.chooseFrom("POETIC_GN")}`);
      T.push(() => `${this.chooseFrom("POETIC_GP")}, ${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")} ; ${this.chooseFrom("TECH_ADMIN")}`);
    }

    const canMeta = !this.state.metaDone && this.state.turn >= 3 && Math.random() < 0.32;
    if (canMeta) {
      this.state.metaDone = true;
      const metaVerb = this.chooseFrom("METAMORPH");
      T.push(() => `${this.chooseFrom("POETIC_GP")}, ${this.chooseFrom("POETIC_GN")} ${metaVerb} ${this.chooseFrom("TECH_ANAT")} ${hinge} ${this.chooseFrom("HIGH_B")}`);
    }

    return { maxWords, build: pick(T) };
  }

  softenPunctuation(line) {
    return line
      .replaceAll("//", " / ")
      .replace(/\s+/g, " ")
      .trim();
  }

  enforceLength(line, maxWords) {
    const toks = tokenize(line);
    if (toks.length <= maxWords) return line.trim();
    return toks.slice(0, maxWords).join(" ").trim();
  }

  smoothWithLastWord(line, lastWordSeen) {
    const last = normalizeWord(lastWordSeen);
    if (!last) return line;

    if (Math.random() < 0.08) {
      const toks = tokenize(line).map(normalizeWord);
      if (!toks.includes(last)) {
        const glue = Math.random() < 0.5 ? "—" : ",";
        return `${line} ${glue} ${last}`;
      }
    }
    return line;
  }

  generateLine({ lastWordSeen, turnIndex, totalTurns, prevTokens }) {
    if (turnIndex === 0) this.beginStrophe(totalTurns);
    this.state.turn = turnIndex;

    const fatigue = clamp(turnIndex / Math.max(1, totalTurns - 1), 0, 1);
    const context = this.evolveContext(fatigue);

    // POOR au plancher : 1.5% max, et au plus 1 fois
    const allowPoor = turnIndex < totalTurns - 2 && Math.random() < 0.015;
    const poorUsed = this.state.usedWords.get("__POOR__") || 0;

    let attempts = 0;
    while (attempts++ < 12) {
      let line = "";

      if (allowPoor && poorUsed < 1) {
        const poor = this.chooseFrom("ORAL");
        line = `${poor} ${this.chooseFrom("HINGE")} ${this.chooseFrom("POETIC_GN")}`.trim();
        this.state.usedWords.set("__POOR__", poorUsed + 1);
      } else {
        const tpl = this.buildTemplate(context, fatigue);
        line = tpl.build();
        line = this.softenPunctuation(line);
        line = this.smoothWithLastWord(line, lastWordSeen);
        line = this.enforceLength(line, tpl.maxWords);
      }

      if (this.isLineTooRepeated(line)) continue;

      this.recordLine(line);
      return line;
    }

    const fb = `${this.chooseFrom("POETIC_GN")} ${this.chooseFrom("POETIC_GV")} ${this.chooseFrom("POETIC_GP")}`;
    this.recordLine(fb);
    return fb;
  }
}
