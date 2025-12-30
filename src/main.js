import { Game } from "./game.js";
import { titleStamp } from "./utils.js";


const $ = (id) => document.getElementById(id);

const previewMode = $("previewMode");
const btnNew = $("btnNew");
const who = $("who");
const meta = $("meta");
const hint = $("hint");
const silhouette = $("silhouette");

const input = $("input");
const btnSend = $("btnSend");
const status = $("status");

const revealPanel = $("revealPanel");
const finalText = $("finalText");
const btnCopy = $("btnCopy");
const btnAgain = $("btnAgain");

const historyList = $("historyList");

// Historique persistant
const STORAGE_KEY = "cadavre_history_v2";
const HISTORY = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
})();

function saveHistory(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(HISTORY)); } catch {} }

function renderHistory(){
  historyList.innerHTML = "";
  if (!HISTORY.length){
    historyList.innerHTML = `<p class="muted">Aucune strophe pour l’instant.</p>`;
    return;
  }
  for (const item of HISTORY){
    const div = document.createElement("div");
    div.className = "historyItem";
    div.innerHTML = `<div class="hMeta">${item.stamp}</div><pre>${item.text}</pre>`;
    historyList.appendChild(div);
  }
}

function pushHistory(text){
  HISTORY.unshift({ stamp: titleStamp(), text });
  if (HISTORY.length > 200) HISTORY.length = 200;
  saveHistory();
  renderHistory();
}

let game = new Game({ previewMode: previewMode.value, totalTurns: 12 });
let aiRunning = false;

function setStatus(s){ status.textContent = s || ""; }

function enableHuman(){
  input.disabled = false;
  btnSend.disabled = false;
  who.textContent = "À toi";
  input.focus();
}

function disableHuman(){
  input.disabled = true;
  btnSend.disabled = true;
}

async function updateUI(){
  if (game.done){
    who.textContent = "Fin";
    meta.textContent = "Révélation";
    hint.textContent = "—";
    silhouette.textContent = "";
    disableHuman();

    revealPanel.hidden = false;
    finalText.textContent = game.revealText();
    setStatus("Révélation.");
    return;
  }

  revealPanel.hidden = true;

  const actor = game.currentActor();
  who.textContent = actor === "H" ? "À toi" : "Ordinateur";
  meta.textContent = game.meta();
  hint.textContent = game.hint();
  silhouette.textContent = (game.previewMode === "lastWordFog") ? game.silhouette() : "";

  if (actor === "H"){
    aiRunning = false;
    enableHuman();
    setStatus("À toi d’écrire un vers.");
    return;
  }

  // Tour IA : asynchrone, non bloquant
  if (!aiRunning){
    aiRunning = true;
    disableHuman();
    setStatus("L’ordinateur joue…");

    setTimeout(async () => {
      const r = await game.playComputer();
      aiRunning = false;
      setStatus(r.recovered ? "IA en mode dégradé (mais la partie continue)." : "L’ordinateur a joué.");
      updateUI();
    }, 0);

    // sécurité : rend la main si quelque chose dérape
    setTimeout(() => {
      if (aiRunning){
        aiRunning = false;
        setStatus("IA lente : main rendue.");
        enableHuman();
      }
    }, 900);
  }
}

function newGame(){
  aiRunning = false;
  game = new Game({ previewMode: previewMode.value, totalTurns: 12 });
  input.value = "";
  setStatus("Nouvelle partie.");
  updateUI();
}

btnNew.addEventListener("click", newGame);
btnAgain.addEventListener("click", newGame);

previewMode.addEventListener("change", () => {
  game.previewMode = previewMode.value;
  updateUI();
});

btnSend.addEventListener("click", () => {
  const line = (input.value || "").trim();
  const r = game.submitHumanLine(line);

  if (!r.ok){
    setStatus(r.error || "Impossible de valider.");
    // sécurité : si désynchro, on rend la main
    enableHuman();
    return;
  }

  input.value = "";
  setStatus("Vers validé.");
  updateUI();

  if (r.done){
    pushHistory(game.revealText());
  }
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter"){
    e.preventDefault();
    btnSend.click();
  }
});

btnCopy.addEventListener("click", async () => {
  try{
    await navigator.clipboard.writeText(game.revealText());
    setStatus("Copié.");
  } catch {
    setStatus("Copie impossible.");
  }
});

renderHistory();
newGame();
