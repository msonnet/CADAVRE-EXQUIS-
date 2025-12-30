export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function tokenize(s) {
  return (s || "")
    .toString()
    .replace(/[“”«»]/g, '"')
    .replace(/[’]/g, "'")
    .match(/[A-Za-zÀ-ÖØ-öø-ÿœŒ]+|[0-9]+|[^\s]/g) || [];
}

export function normalizeWord(w) {
  return (w || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9œ]/g, "");
}

export function titleStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
