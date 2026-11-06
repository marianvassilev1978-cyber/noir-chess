// Achievement badges and course covers (original SVG). Badges: medallion shape × metal × emblem.
import { PIECE, pieceSil } from "./scenes.js";

let N = 0;
const METAL = {
  bronze: ["#f0b98a", "#c07a45", "#7a4320", "#3a1d0c"],
  silver: ["#f4f6f8", "#c2c9d1", "#7d8894", "#2c3238"],
  gold: ["#fff0b8", "#f0c45a", "#b07d1e", "#4a3006"],
  obsidian: ["#c9b6ff", "#6c55c9", "#2a1f55", "#0c0820"],
};
// emblems in a 24×24 box
const EMB = {
  trophy: "M7 3h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.8V17h3v3H8v-3h3v-2.2A5 5 0 0 1 8.4 12H8a4 4 0 0 1-4-4V5h3Zm10 4v3a2 2 0 0 0 1-2V7ZM7 7H6v1a2 2 0 0 0 1 2Z",
  flame: "M12 2s6 5 6 11a6 6 0 0 1-12 0c0-2.6 1.2-4.4 1.2-4.4S8.4 11 10.6 11C10.6 6.4 12 2 12 2Zm0 11c-1 1.4-2 2.3-2 4a2 2 0 0 0 4 0c0-1.7-1-2.6-2-4Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7Z",
  crown: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5Zm3 13h12v2H6Z",
  star: "M12 2l3 6.6 7 .8-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.8Z",
  target: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
  book: "M4 4h6a3 3 0 0 1 2 .8A3 3 0 0 1 14 4h6v15h-6a2 2 0 0 0-2 1 2 2 0 0 0-2-1H4Zm2 2v11h4l1 .3V7a1 1 0 0 0-1-1Zm12 0h-4a1 1 0 0 0-1 1v10.3l1-.3h4Z",
  puzzle: "M10 2a2.5 2.5 0 0 1 2.4 3H16a1 1 0 0 1 1 1v3.6A2.5 2.5 0 1 1 17 14.4V18a1 1 0 0 1-1 1h-3.6a2.5 2.5 0 1 0-4.8 0H4a1 1 0 0 1-1-1v-3.6a2.5 2.5 0 1 0 0-4.8V6a1 1 0 0 1 1-1h3.6A2.5 2.5 0 0 1 10 2Z",
  rocket: "M14 3c4-1.5 7-1 7-1s.5 3-1 7l-6 6-4-4ZM9 12l3 3-2 4-3-1 1-2-2-1Zm-4.5 4.5c1.5-.5 3 1 2.5 2.5L4 21Z",
  shield: "M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5Zm-1 13.4 6-6-1.4-1.4L11 12.6 8.4 10 7 11.4Z",
  gem: "M7 3h10l4 6-9 12L3 9Zm1.2 2L6 8.5h3.4L10.6 5Zm4.2 0 1.2 3.5H17L14.8 5ZM6 10.5l5 6.6-1.9-6.6Zm7.9 0L12 17l5-6.5Z",
  clock: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-1 2h2v5l3.5 2-1 1.7L11 13.2Z",
  eye: "M12 5c5.5 0 9.5 5.2 10 7-.5 1.8-4.5 7-10 7S2.5 13.8 2 12c.5-1.8 4.5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z",
  swords: "M3 3h4l8 8-2 2-8-8Zm18 0v4l-6.5 6.5-2-2L19 3ZM5 16l3 3-2 2-1.5-1.5L3 21l-1-1 1.5-1.5L2 17Zm14 0 2 2-1.5 1.5L21 21l-1 1-1.5-1.5L17 22l-2-2 3-3Z",
  medal: "M7 2h4l1 4 1-4h4l-3 7a6 6 0 1 1-4 0Zm5 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z",
  brain: "M9 3a3 3 0 0 1 3 1.4A3 3 0 0 1 15 3a3 3 0 0 1 3 3 3.5 3.5 0 0 1 2 6 3.5 3.5 0 0 1-2 6 3 3 0 0 1-6 1.3A3 3 0 0 1 6 18a3.5 3.5 0 0 1-2-6 3.5 3.5 0 0 1 2-6 3 3 0 0 1 3-3Zm2 3v13h2V6Z",
  heart: "M12 21 4 13a5 5 0 0 1 8-6 5 5 0 0 1 8 6Z",
  mountain: "M2 20 9 7l4 6 2-3 7 10Zm7-9-3 5.5 2-1 1.5 1.5 2-2Z",
  calendar: "M7 2h2v2h6V2h2v2h3v17H4V4h3Zm-1 7v10h12V9Zm2 2h3v3H8Z",
  chart: "M3 20h18v2H3Zm2-3 4-6 4 3 6-9 1.6 1.2-7.2 10.6-4-3-3 4.4Z",
  sparkle: "M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z",
  hourglass: "M6 2h12v4l-4 6 4 6v4H6v-4l4-6-4-6Zm2 2v1.4L12 11l4-5.6V4ZM12 13l-4 5.6V20h8v-1.4Z",
  knight: "", king: "", pawn: "", queen: "", rook: "",
};
const PIECE_EMB = { knight: "n", king: "k", pawn: "p", queen: "q", rook: "r" };
const SHAPES = {
  circle: (s) => `<circle cx="50" cy="50" r="${44 * s}"/>`,
  shield: (s) => `<path d="M50 ${50 - 46 * s}L${50 + 40 * s} ${50 - 32 * s}V${50 + 4 * s}C${50 + 40 * s} ${50 + 28 * s} ${50 + 22 * s} ${50 + 42 * s} 50 ${50 + 48 * s}C${50 - 22 * s} ${50 + 42 * s} ${50 - 40 * s} ${50 + 28 * s} ${50 - 40 * s} ${50 + 4 * s}V${50 - 32 * s}Z"/>`,
  hex: (s) => { const p = []; for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 2; p.push((50 + Math.cos(a) * 46 * s).toFixed(1) + " " + (50 + Math.sin(a) * 46 * s).toFixed(1)); } return `<path d="M${p.join("L")}Z"/>`; },
  star: (s) => { const p = []; for (let i = 0; i < 16; i++) { const a = (Math.PI / 8) * i - Math.PI / 2, r = i % 2 ? 40 * s : 47 * s; p.push((50 + Math.cos(a) * r).toFixed(1) + " " + (50 + Math.sin(a) * r).toFixed(1)); } return `<path d="M${p.join("L")}Z"/>`; },
};

export function badgeSVG(b, { locked = false, size = 72, shine = false } = {}) {
  const u = "bd" + ++N;
  const m = METAL[b.metal || "bronze"];
  const shape = SHAPES[b.shape || "circle"];
  const emb = PIECE_EMB[b.emblem]
    ? `<g transform="translate(29 27) scale(.42)"><path d="${PIECE[PIECE_EMB[b.emblem]]}" fill="url(#${u}e)"/></g>`
    : `<g transform="translate(29 29) scale(1.75)"><path d="${EMB[b.emblem] || EMB.star}" fill="url(#${u}e)" fill-rule="evenodd"/></g>`;
  const fill = locked ? ["#3a3a40", "#2a2a2f", "#1c1c20", "#0e0e10"] : m;
  return `<svg class="badge-svg ${locked ? "locked" : ""} ${shine ? "shine" : ""}" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${(b.name || "Badge").replace(/"/g, "")}${locked ? " (locked)" : ""}"><defs>
    <linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fill[0]}"/><stop offset=".45" stop-color="${fill[1]}"/><stop offset="1" stop-color="${fill[2]}"/></linearGradient>
    <linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill[2]}"/><stop offset="1" stop-color="${fill[3]}"/></linearGradient>
    <linearGradient id="${u}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${locked ? "#55555c" : "#fffaf0"}"/><stop offset="1" stop-color="${locked ? "#3a3a40" : fill[0]}"/></linearGradient>
    <linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="${u}c">${shape(1)}</clipPath></defs>
    ${locked ? "" : `<g opacity=".35" fill="${fill[1]}" style="filter:blur(5px)">${shape(1)}</g>`}
    <g fill="url(#${u}m)">${shape(1)}</g>
    <g fill="url(#${u}f)">${shape(0.82)}</g>
    <g clip-path="url(#${u}c)"><path d="M10 30C30 12 70 12 90 30" stroke="#fff" stroke-opacity="${locked ? 0.05 : 0.35}" stroke-width="3" fill="none"/>
      <rect class="sh" x="-60" y="-10" width="40" height="120" fill="url(#${u}s)" transform="rotate(20 50 50)"/></g>
    ${emb}
    ${b.tier ? `<text x="50" y="92" text-anchor="middle" font-size="11" font-weight="800" fill="${locked ? "#55555c" : fill[0]}" font-family="Inter, sans-serif">${b.tier}</text>` : ""}
  </svg>`;
}

// ---------- course covers (16:9) ----------
const COVER = [
  { motif: "basics", c: ["#e2b45e", "#2a1d08"] }, { motif: "safety", c: ["#ef5b5b", "#2a0a0a"] }, { motif: "opening", c: ["#3cc97f", "#06281a"] },
  { motif: "tactics", c: ["#ff8c4d", "#2e1206"] }, { motif: "strategy", c: ["#5fa2ff", "#0b1c3d"] }, { motif: "endgame", c: ["#c38bff", "#1f0f3a"] },
  { motif: "think", c: ["#2fd3c6", "#06302c"] }, { motif: "tactics", c: ["#f2c94c", "#2e2306"] }, { motif: "endgame", c: ["#9bb5ff", "#0f1838"] },
  { motif: "strategy", c: ["#84d16a", "#0f2a0a"] }, { motif: "attack", c: ["#f06a8f", "#2e0816"] }, { motif: "think", c: ["#f4d58e", "#1c160a"] },
];
export const coverColor = (i) => COVER[i % COVER.length].c[0];
export function coverSVG(i, { motif } = {}) {
  const u = "cv" + ++N;
  const t = COVER[i % COVER.length], [a, b] = t.c, mo = motif || t.motif;
  let s = `<defs><linearGradient id="${u}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".9"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="#08080a"/></linearGradient>
    <radialGradient id="${u}gl"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".35" stop-color="${a}" stop-opacity=".25"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}pc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="${a}"/></linearGradient>
    <linearGradient id="${u}dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#${u}bg)"/><circle class="sa-breathe" cx="210" cy="86" r="120" fill="url(#${u}gl)"/>`;
  const board = (x, y, n, sz, op) => { let g = ""; for (let i2 = 0; i2 < n; i2++) for (let j = 0; j < n; j++) if ((i2 + j) % 2) g += `<rect x="${x + i2 * sz}" y="${y + j * sz}" width="${sz}" height="${sz}"/>`; return `<g fill="#fff" opacity="${op}">${g}</g>`; };
  const shadow = (x, y, w) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${w * 0.16}" fill="#000" opacity=".4"/>`;
  if (mo === "basics") s += board(150, 40, 5, 26, 0.08) + shadow(205, 150, 30) + `<g class="sa-float">${pieceSil("p", { x: 160, y: 50, s: 0.95, fill: `url(#${u}pc)` })}</g>`;
  if (mo === "safety") s += `<g class="sa-float"><path d="M210 30l44 16v34c0 28-19 48-44 58-25-10-44-30-44-58V46Z" fill="url(#${u}pc)" opacity=".95"/>${pieceSil("p", { x: 186, y: 48, s: 0.48, fill: "#1a1a1e" })}</g>`;
  if (mo === "opening") s += `<g stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".55"><path d="M150 150C170 100 200 100 220 70"/><path d="M220 70l18-26M220 70l26-8"/><path d="M150 150C190 130 230 130 270 110"/></g>` + `<g class="sa-float">${pieceSil("n", { x: 168, y: 32, s: 0.95, fill: `url(#${u}pc)` })}</g>`;
  if (mo === "tactics") s += shadow(210, 152, 34) + `<g class="sa-float">${pieceSil("n", { x: 160, y: 46, s: 1, fill: `url(#${u}pc)` })}</g><g stroke="${a}" stroke-width="4" stroke-linecap="round" opacity=".9"><path d="M248 70l26-26M248 70l30 4"/><path d="M178 70l-26-26M178 70l-30 4"/></g>` + `<circle cx="282" cy="40" r="7" fill="#fff" opacity=".8"/><circle cx="144" cy="40" r="7" fill="#fff" opacity=".8"/>`;
  if (mo === "strategy") { s += board(140, 70, 6, 22, 0.07); for (let k = 0; k < 4; k++) s += pieceSil("p", { x: 150 + k * 32, y: 96 - k * 16, s: 0.42, fill: `url(#${u}pc)`, op: 0.95 }); s += `<path d="M150 150L276 70" stroke="#fff" stroke-width="2" stroke-dasharray="4 6" opacity=".5"/>`; }
  if (mo === "endgame") s += board(150, 50, 5, 24, 0.08) + shadow(190, 154, 26) + `<g class="sa-float">${pieceSil("k", { x: 145, y: 64, s: 0.9, fill: `url(#${u}pc)` })}</g>` + pieceSil("p", { x: 230, y: 92, s: 0.55, fill: `url(#${u}pc)`, op: 0.9 });
  if (mo === "think") s += `<g class="sa-float"><circle cx="210" cy="78" r="44" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/><circle cx="210" cy="78" r="28" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>${pieceSil("q", { x: 183, y: 50, s: 0.55, fill: `url(#${u}pc)` })}</g>`;
  if (mo === "attack") s += shadow(214, 152, 30) + pieceSil("k", { x: 168, y: 52, s: 0.9, fill: `url(#${u}dk)` }) + `<g stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"><path d="M130 40l40 40M300 36l-44 44M296 150l-40-34"/></g>`;
  for (let k = 0; k < 7; k++) s += `<circle class="sa-twinkle" cx="${(100 + Math.random() * 215).toFixed(0)}" cy="${(10 + Math.random() * 160).toFixed(0)}" r="${(0.8 + Math.random() * 1.6).toFixed(1)}" fill="#fff" style="animation-delay:${(-Math.random() * 4).toFixed(1)}s"/>`;
  return `<svg class="cover-svg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
}
