import { tokenize, normalizeWord, pick } from "./utils.js";
import { LEX } from "./lexicon.js";

function lastWordOf(line){
  const toks = tokenize(line || "");
  if (!toks.length) return "";
  return normalizeWord(toks[toks.length - 1]);
}

function makeFogSilhouette(lastWord, linesCount){
  const chunks = [];
  const n = Math.max(4, Math.min(10, 6 + Math.floor(linesCount/2)));
  for (let i=0;i<n;i++){
    const len = 18 + Math.floor(Math.random()*28);
    chunks.push("▓".repeat(len));
  }
  return chunks.join("\n") + (lastWord ? `\n\n… ${lastWord}` : "\n\n…");
}

// --- fallback IA local (NE DÉPEND PAS de poet.js) ---
function A(key){
  const a = LEX[key];
  return Array.isArray(a) && a.length ? a : ["…"];
}

function fallbackVerse(lastWordSeen){
  const GN = () => pick(A("POETIC_GN"));
  const GV = () => pick(A("POETIC_GV"));
  const GP = () => pick(A("POETIC_GP"));
  const H  = () => pick(A("HINGE"));
  const HA = () => pick(A("HIGH_A"));
  const HB = () => pick(A("HIGH_B"));
  const TA = () => pick(A("TECH_ATELIER"));
  const TN = () => pick(A("TECH_ANAT"));
  const TD = () => pick(A("TECH_ADMIN"));
  const OR = () => pick(A("ORAL"));

  const templates = [
    () => `${GP()} ${GN()} ${GV()}`,
    () => `${GN()}, ${H()} ${GV()} ${GP()}`,
    () => `${HA()} ${H()} ${GN()} ${GV()}`,
    () => `${HB()} : ${GP()} ${GN()}, ${GV()}`,
    () => `${GN()} ${GV()} ${H()} ${TA()}`,
    () => `${TN()} ${H()} ${GN()} ${GV()}`,
    () => `${TD()} ${H()} ${GN()} ${GV()}`,
    () => `${OR()} ${H()} ${GN()} ${GV()}`
  ];

  let line = pick(templates)().replace(/\s+/g, " ").trim();

  // très léger écho du dernier mot visible (même condition que joueur)
  const last = normalizeWord(lastWordSeen);
  if (last && !tokenize(line).map(normalizeWord).includes(last) && Math.random() < 0.08) {
    line = `${line}, ${last}`;
  }

  return line;
}

export class Game{
  constructor({ previewMode="lastWordFog", totalTurns=12 } = {}){
    this.previewMode = previewMode;
    this.totalTurns = totalTurns;

    this.turn = 0;
    this.done = false;
    this.lines = [];
    this.prevTokens = [];

    const first = Math.random() < 0.5 ? "H" : "C";
    this.turnOrder = Array.from({length: totalTurns}, (_,i) => i%2===0 ? first : (first==="H" ? "C":"H"));

    // import IA dynamique => UI jamais bloquée
    this._generateVerse = null;
    this._poetTried = false;
    this._degraded = false;
  }

  currentActor(){
    if (this.done) return "END";
    const a = this.turnOrder?.[this.turn];
    return (a==="H" || a==="C") ? a : "H";
  }

  meta(){ return `Tour ${this.turn+1}/${this.totalTurns}`; }

  lastWordVisible(){
    if (!this.lines.length) return "";
    return lastWordOf(this.lines[this.lines.length-1].text);
  }

  hint(){
    const w = this.lastWordVisible();
    return w ? `Dernier mot : ${w}` : "Début : aucun mot visible.";
  }

  silhouette(){ return makeFogSilhouette(this.lastWordVisible(), this.lines.length); }

  revealText(){ return this.lines.map(l => l.text).join("\n"); }

  _pushLine(actor, text){
    const clean = (text || "").toString().trim();
    if (!clean) return { ok:false, error:"Ligne vide." };

    this.lines.push({ actor, text: clean });
    const toks = tokenize(clean);
    this.prevTokens.push(...toks);
    if (this.prevTokens.length > 220) this.prevTokens = this.prevTokens.slice(-220);
    return { ok:true };
  }

  _advance(){
    this.turn += 1;
    if (this.turn >= this.totalTurns) this.done = true;
  }

  submitHumanLine(line){
    if (this.done) return { ok:false, error:"Partie terminée." };
    if (this.currentActor() !== "H") return { ok:false, error:"Ce n’est pas ton tour." };

    const r = this._pushLine("H", line);
    if (!r.ok) return r;
    this._advance();
    return { ok:true, done:this.done };
  }

  async _loadPoetIfNeeded(){
    if (this._generateVerse) return;
    if (this._poetTried) return;
    this._poetTried = true;

    try{
      const mod = await import("./poet.js");
      if (typeof mod.generateVerse === "function") {
        this._generateVerse = mod.generateVerse;
        this._degraded = false;
      }
    } catch(e){
      console.error("Poet import failed (non bloquant):", e);
      this._generateVerse = null;
      this._degraded = true;
    }
  }

  async playComputer(){
    if (this.done) return { ok:false, error:"Partie terminée." };
    if (this.currentActor() !== "C") return { ok:true, skipped:true };

    await this._loadPoetIfNeeded();

    try{
      let verse;

      if (this._generateVerse){
        verse = this._generateVerse({
          lastWordSeen: this.lastWordVisible(),
          turnIndex: this.turn,
          prevTokens: this.prevTokens,
          totalTurns: this.totalTurns
        });
      } else {
        // mode dégradé : vers varié (pas de boucle)
        verse = fallbackVerse(this.lastWordVisible());
      }

      const r = this._pushLine("C", verse);
      if (!r.ok) throw new Error(r.error || "IA ligne vide");
      this._advance();
      return { ok:true, verse, done:this.done, recovered: !this._generateVerse, degraded: this._degraded };
    } catch(err){
      console.error("IA crash (recovered):", err);
      this._pushLine("C", fallbackVerse(this.lastWordVisible()));
      this._advance();
      return { ok:true, verse:"(fallback)", done:this.done, recovered:true, degraded:true };
    }
  }
}
