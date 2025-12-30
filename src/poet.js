// src/poet.js
// Moteur : génération d’un vers IA en condition cadavre exquis.
// Dépendances : src/lexicon.js (LEX). Optionnel : src/registers.js (REG).

import { LEX } from "./lexicon.js";
import { pickVoice } from "./voices.js";

// Optional registers (chargement non-bloquant, sans top-level await)
let REG = { pickActiveRegisters: null, generateFromRegister: null };
import("./registers.js")
  .then((m) => {
    REG.pickActiveRegisters = m.pickActiveRegisters;
    REG.generateFromRegister = m.generateFromRegister;
  })
  .catch(() => {
    REG.pickActiveRegisters = null;
    REG.generateFromRegister = null;
  });

/* ----------------------------- Utils de base ----------------------------- */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function arr(key) {
  const v = LEX[key];
  return Array.isArray(v) ? v : [];
}

function stripPunct(w) {
  // Compat large : lettres latines + apostrophes + tirets.
  return (w || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-zà-öø-ÿœ'’\-]+/gi, "");
}

function rootGuess(w) {
  return (w || "").replace(/(e|es|s|ent|ait|ais|ant|ée|ées|és|er|ir|re)$/i, "");
}

function fixContractions(line) {
  return (line || "")
    .replace(/\bà\s+le\b/gi, "au")
    .replace(/\bà\s+les\b/gi, "aux")
    .replace(/\bde\s+le\b/gi, "du")
    .replace(/\bde\s+les\b/gi, "des")
    .replace(/\bjusqu['’]à\s+le\b/gi, "jusqu’au")
    .replace(/\bjusqu['’]à\s+les\b/gi, "jusqu’aux")
    .replace(/\bà l['’]insu de le\b/gi, "à l’insu du")
    .replace(/\bà l['’]insu de les\b/gi, "à l’insu des")
    .replace(/\bau regard de le\b/gi, "au regard du")
    .replace(/\bau regard de les\b/gi, "au regard des");
}

/* ----------------------------- Voix / style ----------------------------- */

const VOICES = [
  { id: "core", w: 1.0 },
  { id: "cru", w: 0.9 },
  { id: "haut", w: 0.9 },
  { id: "atelier", w: 0.9 },
  { id: "anat", w: 0.8 },
  { id: "concept", w: 0.9 },
];

function pickVoice() {
  const total = VOICES.reduce((s, v) => s + v.w, 0);
  let r = Math.random() * total;
  for (const v of VOICES) {
    r -= v.w;
    if (r <= 0) return v;
  }
  return VOICES[0];
}

/* ----------------------------- Anti-répétition ----------------------------- */

function normKey(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?—–\-()«»"']/g, "")
    .trim();
}

function bumpMap(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function tooSeen(map, key, max) {
  return (map.get(key) || 0) >= max;
}

function hasGibberishToken(line) {
  // Attrape des “louo”, “chiarbon” et autres artefacts (heuristique simple)
  return /\b[a-zà-öø-ÿœ]{1,2}\b/i.test(line) && /louo|chiarbon|inscectes/i.test(line);
}

function hasDeadSyntax(line) {
  // Fin sur connecteur/préposition fréquents
  return /\b(de|du|des|à|au|aux|que|qui|dont|mais|ou|et|si|car|donc|or)\s*$/i.test(line);
}

function hasFlatRepetition(line) {
  // Même mot répété trop proche (simple)
  const t = normKey(line).split(" ").filter(Boolean);
  for (let i = 2; i < t.length; i++) {
    if (t[i] === t[i - 1] && t[i] === t[i - 2]) return true;
  }
  return false;
}

/* ----------------------------- Choix lexicaux ----------------------------- */

function choose(state, key, voice) {
  // Ici : pas de tables par voix => fallback direct.
  // Si tu as des keys dédiées par voix (ex: ORAL, HIGH_A...), c’est géré via templates.
  const a = arr(key);
  if (!a.length) return "";
  // Anti-répétition légère sur tokens courts
  let tries = 0;
  while (tries++ < 6) {
    const x = pick(a);
    const k = `${key}:${x}`;
    if (!tooSeen(state.used, k, 2)) {
      bumpMap(state.used, k);
      return x;
    }
  }
  const x = pick(a);
  bumpMap(state.used, `${key}:${x}`);
  return x;
}

/* ----------------------------- Connecteurs typés ----------------------------- */

function pickHingeTyped(state, voice) {
  // Rare : on garde une présence mais moins fréquente
  if (Math.random() > 0.22) return { text: "", kind: "NONE" };

  const r = Math.random();
  // 55% verbaux, 35% nominaux, 10% libres
  if (r < 0.55 && arr("HINGE_VERB").length) {
    return { text: choose(state, "HINGE_VERB", voice), kind: "VERB" };
  }
  if (r < 0.90 && arr("HINGE_NOM").length) {
    return { text: choose(state, "HINGE_NOM", voice), kind: "NOM" };
  }
  if (arr("HINGE_FREE").length) {
    return { text: choose(state, "HINGE_FREE", voice), kind: "FREE" };
  }
  // fallback
  if (arr("HINGE").length) return { text: choose(state, "HINGE", voice), kind: "FREE" };
  return { text: "", kind: "NONE" };
}

function hasBadHingeFollow(line) {
  // Attrape les principaux cas : "pendant que NOM", "lorsque brouillard", "à proportion que égrenage"
  // Heuristique : connecteur verbal + mot qui n’a pas l’air d’un verbe/auxiliaire dans les 1-2 tokens suivants.
  return /\b(pendant que|lorsque|alors que|tandis que|si bien que|de sorte que|en sorte que|pour peu que|si tant est que|à proportion que)\s+([a-zà-öø-ÿœ]{3,})(\s+[a-zà-öø-ÿœ]{3,})?\b(?!\s+(se|s['’]|ne|n['’]|ai|as|a|avons|avez|ont|suis|es|est|sommes|êtes|sont|vais|va|vont|peux|peut|peuvent|dois|doit|doivent))/i.test(
    line
  );
}

/* ----------------------------- Réaction au dernier mot ----------------------------- */

function pickFromMap(map, key) {
  if (!map) return null;
  const a = map[key];
  return Array.isArray(a) && a.length ? pick(a) : null;
}

function guessVerbForm(w) {
  // Heuristique volontairement prudente
  if (/(er|ir|re)$/i.test(w)) {
    if (/er$/i.test(w)) return w.replace(/er$/i, "e"); // marcher -> marche
    if (/ir$/i.test(w)) return w.replace(/ir$/i, "is"); // finir -> finis (approx)
    if (/re$/i.test(w)) return w.replace(/re$/i, "s"); // vendre -> vends (approx)
  }
  return null;
}

function reactPick(lastWord) {
  const w0 = stripPunct(lastWord);
  if (!w0) return { mode: "none" };

  const w1 = w0;
  const w2 = rootGuess(w0);

  const syn = pickFromMap(LEX.REACT, w1) || pickFromMap(LEX.REACT, w2);
  const ant = pickFromMap(LEX.REACT_ANT, w1) || pickFromMap(LEX.REACT_ANT, w2);

  // pondérations
  const r = Math.random();
  if (r < 0.06) return { mode: "echo", w: w1 };
  if (r < 0.44 && syn) return { mode: "syn", w: w1, x: syn };
  if (r < 0.62 && ant) return { mode: "ant", w: w1, a: ant };

  const v = guessVerbForm(w1);
  if (r < 0.84 && v) return { mode: "shiftVerb", w: w1, v };

  return { mode: r < 0.92 ? "shiftNoun" : "none", w: w1 };
}

function fillTpl(tpl, data, state, voice) {
  const gn = () => choose(state, "POETIC_GN", voice) || choose(state, "GN", voice) || "reste";
  const adj = () => choose(state, "ADJ", voice) || choose(state, "POETIC_ADJ", voice) || "muet";

  return (tpl || "")
    .replace(/\{W\}/g, data.w || "")
    .replace(/\{X\}/g, data.x || "")
    .replace(/\{A\}/g, data.a || "")
    .replace(/\{V\}/g, data.v || "")
    .replace(/\{N\}/g, gn())
    .replace(/\{ADJ\}/g, adj())
    .replace(/\s+/g, " ")
    .trim();
}

function reactInsertAdvanced(line, lastWord, state, voice) {
  const data = reactPick(lastWord);
  if (!data || data.mode === "none") return line;

  const T = LEX.REACT_TPL || {};
  const candidates =
    (data.mode === "echo" && Array.isArray(T.echo) && T.echo) ||
    (data.mode === "syn" && Array.isArray(T.syn) && T.syn) ||
    (data.mode === "ant" && Array.isArray(T.ant) && T.ant) ||
    (data.mode === "shiftVerb" && Array.isArray(T.shiftVerb) && T.shiftVerb) ||
    (data.mode === "shiftNoun" && Array.isArray(T.shiftNoun) && T.shiftNoun) ||
    (data.mode === "shiftAdj" && Array.isArray(T.shiftAdj) && T.shiftAdj) ||
    [];

  if (!candidates.length) return line;

  const frag = fillTpl(pick(candidates), data, state, voice);
  if (!frag) return line;

  const inserted = `${line} ${frag}`.replace(/\s+/g, " ").trim();
  return inserted;
}

/* ----------------------------- Registres (dominant) ----------------------------- */

function evolveDominantRegister(state) {
  if (!state.activeRegs || state.activeRegs.length === 0 || !REG.generateFromRegister) return null;

  if (state.domReg && state.domRegTTL > 0) {
    state.domRegTTL--;
    return state.domReg;
  }

  const pool = state.activeRegs.filter((r) => !state.domReg || r.id !== state.domReg.id);
  const next = pool.length ? pick(pool) : pick(state.activeRegs);

  state.domReg = next;
  state.domRegTTL = 2 + Math.floor(Math.random() * 2); // 2–3 vers
  return state.domReg;
}

function buildRegisterLine(state, voice) {
  if (!REG.generateFromRegister || !state.activeRegs || !state.activeRegs.length) return "";

  const dom = evolveDominantRegister(state);
  const p = dom ? 0.45 : 0.35;
  if (Math.random() > p) return "";

  const reg = dom || pick(state.activeRegs);
  const line = REG.generateFromRegister(reg);
  return line || "";
}

/* ----------------------------- Génération core ----------------------------- */

function polishGrammar(line) {
  let out = (line || "").replace(/\s+/g, " ").trim();

  // corrections ciblées (résiduelles)
  out = out.replace(/\bà cause de le\b/gi, "à cause du");
  out = out.replace(/\bà cause de les\b/gi, "à cause des");
  out = out.replace(/\bà l['’]insu de le\b/gi, "à l’insu du");
  out = out.replace(/\bà l['’]insu de les\b/gi, "à l’insu des");

  out = fixContractions(out);

  // cap
  if (/^[a-zà-öø-ÿœ]/i.test(out)) out = out[0].toUpperCase() + out.slice(1);
  return out.trim();
}

function buildCoreLine(state, lastWordSeen, voice) {
  const GN = () => choose(state, "POETIC_GN", voice) || choose(state, "GN", voice) || "";
  const GV = () => choose(state, "POETIC_GV", voice) || choose(state, "GV", voice) || "";
  const GP = () => choose(state, "POETIC_GP", voice) || choose(state, "GP", voice) || "";
  const HA = () => choose(state, "HIGH_A", voice) || choose(state, "HIGH_B", voice) || "";
  const TA = () => choose(state, "TECH_ATELIER", voice) || "";
  const TN = () => choose(state, "TECH_ANAT", voice) || "";

  const hingeObj = pickHingeTyped(state, voice);
  const hinge = hingeObj.text;
  const kind = hingeObj.kind;
  const glue = hinge ? ` ${hinge} ` : " ";

  const afterHingeVerb = () => {
    // Proposition verbale crédible : VERB_PHRASE sinon GV + GP
    return choose(state, "VERB_PHRASE", voice) || `${GV()} ${GP()}`.trim() || GV() || "";
  };

  const afterHingeNom = () => {
    return GN();
  };

  const afterHinge = () => {
    if (!hinge) return "";
    if (kind === "VERB") return VERB_PHRASE();
    if (kind === "NOM") return afterHingeNom();
    // FREE : plutôt verbal pour éviter "lorsque brouillard"
    return Math.random() < 0.65 ? afterHingeVerb() : afterHingeNom();
  };

  const T = [];

  // Templates “stables” : on s’arrange pour que ce qui suit hinge respecte son type
  T.push(() => `${GN()} ${GV()} ${GP()}`.trim());
  T.push(() => `${HA()} : ${GN()} ${GV()}`.trim());
  T.push(() => `${GN()},${glue}${afterHinge()} ${GP()}`.trim());
  T.push(() => `${TN()}${glue}${afterHinge()} ${GP()}`.trim());
  T.push(() => `${TA()}${glue}${afterHinge()} ${GP()}`.trim());
  T.push(() => `${GN()} — ${GN()} ; ${GV()}`.trim());
  T.push(() => `${GN()} / ${HA()} ${GV()}`.trim());

  // Un template réactif au dernier mot (sans répétition directe systématique)
  T.push(() => {
    const w = stripPunct(lastWordSeen);
    if (!w) return `${GN()} ${GV()} ${GP()}`.trim();
    // pivot nominal léger
    return `${GN()} : ${w} ${GV()}`.trim();
  });

  // Tirage
  let tries = 0;
  while (tries++ < 6) {
    const cand = pick(T)();
    if (!cand) continue;

    const nk = normKey(cand);
    if (tooSeen(state.usedBi, nk, 2)) continue;



    // garde-fous
    if (hasDeadSyntax(cand)) continue;
    if (hasFlatRepetition(cand)) continue;
    if (hasGibberishToken(cand)) continue;
    if (hasBadHingeFollow(cand)) continue;
    if (hasInvalidQueStructure(candidate)) continue;


    bumpMap(state.usedBi, nk);
    return cand;
  }

  // fallback ultime
  return `${GN()} ${GV()}`.trim() || GN() || "…";
}

/* ----------------------------- State & API ----------------------------- */

function initState(totalTurns) {
  const regs = REG.pickActiveRegisters ? REG.pickActiveRegisters(Math.random) : [];
  const dom = regs && regs.length ? pick(regs) : null;

  const voice = pickVoice();

  return {
    used: new Map(),
    usedBi: new Map(),

    totalTurns,
    stropheLines: [],

    voiceId: voice.id,
    voiceTTL: 2 + Math.floor(Math.random() * 2),

    activeRegs: regs,
    domReg: dom,
    domRegTTL: dom ? 2 + Math.floor(Math.random() * 2) : 0,

    // mémoires légères (peu intrusives)
    lastKey: "",
  };
}

function currentVoice(state) {
  // Petite rotation de voix (simulation multi-participants), sans casser la cohérence
  if (state.voiceTTL > 0) {
    state.voiceTTL--;
    return { id: state.voiceId };
  }
  const v = pickVoice();
  state.voiceId = v.id;
  state.voiceTTL = 2 + Math.floor(Math.random() * 2);
  return { id: state.voiceId };
}

/**
 * Génère un vers IA.
 * @param {string} lastWordSeen - dernier mot visible (celui de l’utilisateur au tour précédent)
 * @param {number} turnIndex - index du tour IA (0..)
 * @param {number} totalTurns - total de tours dans la strophe (ex: 12)
 * @returns {string} vers généré
 */
export function generateVerse(lastWordSeen, turnIndex, totalTurns) {
  // State attaché à la fonction (compat avec ton architecture existante)
  if (!generateVerse._s || generateVerse._s.totalTurns !== totalTurns || turnIndex === 0) {
    generateVerse._s = initState(totalTurns);
  }
  const s = generateVerse._s;

  // voice
  const v = currentVoice(s);

  // Mix core / registre (dominant)
  const domActive = !!(s.domReg && s.domRegTTL > 0);
  const preferCore = domActive ? 0.48 : 0.55;

  let out = "";
  let attempts = 0;

  while (attempts++ < 18) {
    const useCore = Math.random() < preferCore;

    if (useCore) {
      out = buildCoreLine(s, lastWordSeen, v);
    } else {
      out = buildRegisterLine(s, v) || buildCoreLine(s, lastWordSeen, v);
    }

    out = polishGrammar(out);

    // Réaction avancée au dernier mot : probabiliste + discrète
    if (lastWordSeen && Math.random() < 0.60) {
      const before = out;
      out = reactInsertAdvanced(out, lastWordSeen, s, v);
      out = polishGrammar(out);
      // garde-fous post-insertion
      if (hasDeadSyntax(out) || hasBadHingeFollow(out) || hasFlatRepetition(out) || hasGibberishToken(out)) {
        out = before;
      }
    }

    // anti-répétitions et contrôles
    const nk = normKey(out);
    if (!nk) continue;
    if (tooSeen(s.usedBi, nk, 2)) continue;
    if (hasBadHingeFollow(out)) continue;
    if (hasDeadSyntax(out)) continue;

    bumpMap(s.usedBi, nk);
    s.stropheLines.push(out);
    return out;
  }

  // fallback final
  out = polishGrammar(buildCoreLine(s, lastWordSeen, v));
  s.stropheLines.push(out);
  return out;
}

/**
 * Réinitialise la strophe en cours (à appeler sur “Nouvelle partie”).
 * Ne touche pas à l’historique (qui doit être géré ailleurs).
 */
export function resetStrophe(totalTurns) {
  generateVerse._s = initState(totalTurns);
}
