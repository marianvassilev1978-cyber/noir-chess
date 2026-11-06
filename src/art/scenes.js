// Scenes: animated theme backgrounds, original piece silhouettes, the logo mark, section banners, empty-state art.
// Kurzgesagt-style rules (STYLE.md "Motion craft"): stacked wide soft glows, three parallax particle layers with one
// shared wind, nothing ever still, no full-frame grain, low contrast so text stays readable.

// Simple original piece silhouettes in a 100×100 box (not the licensed piece sets).
export const PIECE = {
  p: "M50 18a13 13 0 0 1 8 23.3c5 3 8.5 8 9.5 14.7L70 74H30l2.5-18c1-6.7 4.5-11.7 9.5-14.7A13 13 0 0 1 50 18ZM24 78h52a4 4 0 0 1 4 4v6H20v-6a4 4 0 0 1 4-4Z",
  r: "M26 16h10v8h8v-8h12v8h8v-8h10v20l-8 6 3 32H31l3-32-8-6ZM22 78h56a4 4 0 0 1 4 4v6H18v-6a4 4 0 0 1 4-4Z",
  n: "M30 74c-2-14 4-24 16-30-8 2-15 0-19 5l-7-6c2-9 8-16 16-20l2-9 7 7c16 2 27 15 28 33 1 9 0 15-3 20ZM24 78h56a4 4 0 0 1 4 4v6H20v-6a4 4 0 0 1 4-4ZM44 30a3.5 3.5 0 1 0 0 .1Z",
  b: "M50 10a6 6 0 0 1 4 10.5C64 26 70 36 68 48c-1.3 8-6 13-11 16l3 10H40l3-10c-5-3-9.7-8-11-16-2-12 4-22 14-27.5A6 6 0 0 1 50 10Zm4 22-8 14 5 3 8-14ZM24 78h52a4 4 0 0 1 4 4v6H20v-6a4 4 0 0 1 4-4Z",
  q: "M20 30a6 6 0 1 1 6.3 6L34 58l8-26a6 6 0 1 1 8-2 6 6 0 1 1 8 2l8 26 7.7-22A6 6 0 1 1 80 30l-8 44H28ZM24 78h52a4 4 0 0 1 4 4v6H20v-6a4 4 0 0 1 4-4Z",
  k: "M46 6h8v8h8v8h-8v6c10 3 18 10 18 22 0 9-5 16-9 24H27c-4-8-9-15-9-24 0-12 8-19 18-22v-6h-8v-8h8ZM24 78h52a4 4 0 0 1 4 4v6H20v-6a4 4 0 0 1 4-4Z",
};
export const pieceSil = (t, { x = 0, y = 0, s = 1, fill = "#fff", op = 1, cls = "", rot = 0 } = {}) =>
  `<g transform="translate(${x} ${y}) rotate(${rot} ${50 * s} ${50 * s}) scale(${s})" class="${cls}" opacity="${op}"><path d="${PIECE[t]}" fill="${fill}"/></g>`;

let N = 0;
const R = (a, b) => a + Math.random() * (b - a);

// ---------- logo mark ----------
export function logoMark(size = 64, { glow = true } = {}) {
  const u = "lg" + ++N;
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="Noir Chess"><defs>
    <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7dc98"/><stop offset=".5" stop-color="#e2b45e"/><stop offset="1" stop-color="#a87a2e"/></linearGradient>
    <linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232327"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>
    <clipPath id="${u}c"><rect x="4" y="4" width="92" height="92" rx="26"/></clipPath></defs>
    ${glow ? `<rect x="4" y="10" width="92" height="92" rx="26" fill="#e2b45e" opacity=".18" filter="blur(6px)"/>` : ""}
    <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#${u}b)"/>
    <g clip-path="url(#${u}c)" opacity=".09">${[0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => ((i + j) % 2 ? `<rect x="${4 + i * 23}" y="${4 + j * 23}" width="23" height="23" fill="#fff"/>` : "")).join("")).join("")}</g>
    <rect x="4.5" y="4.5" width="91" height="91" rx="25.5" fill="none" stroke="url(#${u}g)" stroke-opacity=".55"/>
    <g transform="translate(16 12) scale(.68)"><path d="${PIECE.n}" fill="url(#${u}g)"/></g>
    <circle cx="44.5" cy="32.5" r="2.4" fill="#1a140a"/></svg>`;
}

// ---------- theme backgrounds ----------
const THEME_BG = {
  noir: { glows: ["#e2b45e", "#6b5330", "#3a3a48"], mote: "#f4d58e", motif: "board", kind: "dust" },
  midnight: { glows: ["#3c64c8", "#6a4fd0", "#1c2c5a"], mote: "#cfe0ff", motif: "stars", kind: "stars" },
  forest: { glows: ["#2f9c63", "#7ac943", "#0f3a26"], mote: "#d8ff8a", motif: "leaves", kind: "fireflies" },
  royal: { glows: ["#8a5fd6", "#d65fb8", "#2c1f4a"], mote: "#e8d4ff", motif: "crown", kind: "sparkles" },
  ember: { glows: ["#ff6a2a", "#ffb14d", "#5a1a08"], mote: "#ffb36b", motif: "embers", kind: "embers" },
  ivory: { glows: ["#e8c98a", "#c9d8ef", "#f6efe0"], mote: "#b59456", motif: "board", kind: "dust", light: true },
};
export function themeBackground(id) {
  const t = THEME_BG[id] || THEME_BG.noir;
  const u = "tb" + ++N;
  let defs = "", s = "";
  t.glows.forEach((c, i) => { defs += `<radialGradient id="${u}g${i}"><stop offset="0" stop-color="${c}" stop-opacity="${t.light ? 0.5 : 0.22}"/><stop offset=".45" stop-color="${c}" stop-opacity="${t.light ? 0.2 : 0.08}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`; });
  // stacked wide glows (three depths, each drifting)
  s += `<ellipse class="drift" cx="330" cy="90" rx="300" ry="260" fill="url(#${u}g0)"/>`;
  s += `<ellipse class="drift2" cx="40" cy="520" rx="320" ry="300" fill="url(#${u}g1)"/>`;
  s += `<ellipse class="drift" cx="260" cy="860" rx="340" ry="240" fill="url(#${u}g2)" style="animation-duration:52s"/>`;
  // motif (very faint, deepest layer)
  if (t.motif === "board") {
    let g = "";
    for (let i = 0; i <= 8; i++) { const x = 200 + (i - 4) * 70; g += `<line x1="${x}" y1="1000" x2="${200 + (i - 4) * 22}" y2="700" stroke="${t.mote}" stroke-width="1"/>`; }
    for (let j = 0; j < 6; j++) { const y = 700 + j * j * 9 + j * 10; const hw = 88 + j * 34 + j * j * 3.5; g += `<line x1="${200 - hw}" y1="${y}" x2="${200 + hw}" y2="${y}" stroke="${t.mote}" stroke-width="1"/>`; }
    s += `<g opacity="${t.light ? 0.12 : 0.07}">${g}</g>`;
    s += pieceSil("n", { x: 250, y: 120, s: 1.9, fill: t.mote, op: t.light ? 0.05 : 0.035, cls: "drift2" });
  } else if (t.motif === "crown") s += pieceSil("q", { x: 230, y: 140, s: 2, fill: t.mote, op: 0.04, cls: "drift2" });
  else if (t.motif === "leaves") { for (let i = 0; i < 5; i++) s += `<path d="M0 0C20 -30 60 -30 80 0C60 30 20 30 0 0Z" fill="${t.glows[2]}" opacity=".5" transform="translate(${-20 + i * 95} ${780 + (i % 2) * 40}) rotate(${-30 + i * 15}) scale(${1.2 + (i % 3) * 0.3})"/>`; }
  else if (t.motif === "embers") s += pieceSil("k", { x: 240, y: 120, s: 1.9, fill: t.mote, op: 0.035, cls: "drift2" });
  // particles: three parallax layers, one shared wind
  const wind = t.kind === "embers" ? 40 : 18;
  const layers = [[9, 0.8, 0.3, 22], [7, 1.4, 0.5, 15], [5, 2.2, 0.75, 10]];
  for (const [n, r, o, d] of layers) for (let i = 0; i < n; i++) {
    const x = R(0, 400), y = R(80, 820), dl = -R(0, d), dur = d * R(0.8, 1.3);
    if (t.kind === "stars") s += `<circle class="twinkle" cx="${x.toFixed(0)}" cy="${(y - 60).toFixed(0)}" r="${r * 0.8}" fill="${t.mote}" style="--d:${(dur / 3).toFixed(1)}s;--dl:${dl.toFixed(1)}s;--o:${o}"/>`;
    else if (t.kind === "sparkles") s += `<path class="twinkle" d="M${x} ${y - 5 * r}l${r} ${4 * r}l${4 * r} ${r}l${-4 * r} ${r}l${-r} ${4 * r}l${-r} ${-4 * r}l${-4 * r} ${-r}l${4 * r} ${-r}Z" fill="${t.mote}" style="--d:${(dur / 2.5).toFixed(1)}s;--dl:${dl.toFixed(1)}s;--o:${o}"/>`;
    else if (t.kind === "embers") s += `<circle class="rise" cx="${x.toFixed(0)}" cy="${(800 + R(0, 120)).toFixed(0)}" r="${r}" fill="${t.mote}" style="--d:${dur.toFixed(1)}s;--dl:${dl.toFixed(1)}s;--o:${o};--dx:${(wind * R(0.5, 1.5)).toFixed(0)}px"/>`;
    else if (t.kind === "fireflies") s += `<g class="mote" style="--d:${(dur * 1.6).toFixed(1)}s;--dl:${dl.toFixed(1)}s;--o:${o + 0.15};--dx:${(wind * R(-1, 1.6)).toFixed(0)}px"><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r * 3}" fill="${t.mote}" opacity=".18"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="${t.mote}"/></g>`;
    else s += `<circle class="mote" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="${t.mote}" style="--d:${dur.toFixed(1)}s;--dl:${dl.toFixed(1)}s;--o:${o * 0.7};--dx:${(wind * R(0.6, 1.4)).toFixed(0)}px"/>`;
  }
  if (t.kind === "stars") s += `<circle cx="320" cy="120" r="36" fill="#dfe8ff" opacity=".07"/><circle cx="320" cy="120" r="70" fill="#dfe8ff" opacity=".03"/>`;
  // a light vignette (corners ~0.8 of the edge brightness)
  defs += `<radialGradient id="${u}v" cx="50%" cy="40%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${t.light ? 0.06 : 0.35}"/></radialGradient>`;
  s += `<rect width="400" height="1000" fill="url(#${u}v)"/>`;
  return `<svg viewBox="0 0 400 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}</defs>${s}</svg>`;
}

// ---------- section banners (Play, Puzzles, Learn …) ----------
const SECTIONS = {
  play: { c: ["#e2b45e", "#3a2a10"], pieces: [["k", 0.95, 20], ["q", 0.8, -14]], motif: "swords" },
  puzzles: { c: ["#ff7a59", "#3a1206"], pieces: [["n", 0.9, -8]], motif: "bolt" },
  learn: { c: ["#5fa2ff", "#0d1f45"], pieces: [["b", 0.85, -10], ["p", 0.6, 12]], motif: "book" },
  openings: { c: ["#3cc97f", "#06281a"], pieces: [["p", 0.7, 0], ["n", 0.85, -12]], motif: "branch" },
  endgames: { c: ["#c38bff", "#22113f"], pieces: [["k", 0.9, 0], ["p", 0.6, 0]], motif: "grid" },
  profile: { c: ["#f2c94c", "#3a2a06"], pieces: [["q", 0.9, 8]], motif: "rays" },
  coaches: { c: ["#f39a3a", "#3a1a06"], pieces: [], motif: "rays" },
};
export function sectionArt(kind, { h = 150 } = {}) {
  const t = SECTIONS[kind] || SECTIONS.play;
  const u = "sa" + ++N;
  const [a, b] = t.c;
  let s = `<defs><linearGradient id="${u}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}" stop-opacity=".55"/><stop offset=".55" stop-color="${b}" stop-opacity=".85"/><stop offset="1" stop-color="#0b0b0d"/></linearGradient>
    <radialGradient id="${u}gl"><stop offset="0" stop-color="${a}" stop-opacity=".55"/><stop offset=".4" stop-color="${a}" stop-opacity=".18"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}pc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${a}"/></linearGradient></defs>`;
  s += `<rect width="400" height="${h}" fill="url(#${u}bg)"/>`;
  s += `<circle class="sa-breathe" cx="300" cy="${h * 0.55}" r="${h * 0.9}" fill="url(#${u}gl)"/>`;
  if (t.motif === "swords" || t.motif === "rays") for (let i = 0; i < 14; i++) { const ang = (i / 14) * Math.PI * 2; s += `<path d="M300 ${h * 0.55}L${300 + Math.cos(ang) * 420} ${h * 0.55 + Math.sin(ang) * 420}L${300 + Math.cos(ang + 0.12) * 420} ${h * 0.55 + Math.sin(ang + 0.12) * 420}Z" fill="#fff" opacity=".035"/>`; }
  if (t.motif === "bolt") s += `<path class="sa-float" d="M250 14L214 82h30l-14 54 52-76h-32l20-46Z" fill="#fff" opacity=".12"/>`;
  if (t.motif === "book") s += `<g class="sa-float" opacity=".14"><path d="M210 40c20-8 40-8 56 2v76c-16-10-36-10-56-2Z" fill="#fff"/><path d="M322 40c-20-8-40-8-56 2v76c16-10 36-10 56-2Z" fill="#fff" opacity=".7"/></g>`;
  if (t.motif === "branch") s += `<g opacity=".18" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"><path d="M200 ${h - 10}C200 80 240 70 250 40"/><path d="M200 ${h - 10}C200 90 170 70 160 50"/><path d="M250 40L280 20M250 40L262 12"/></g>`;
  if (t.motif === "grid") { let g = ""; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g += `<rect x="${200 + i * 28}" y="${20 + j * 28}" width="28" height="28" fill="#fff"/>`; s += `<g opacity=".06">${g}</g>`; }
  // floating pieces with a soft glow and a contact shadow
  t.pieces.forEach(([p, sc, rot], i) => {
    const x = 250 + i * 70 - (t.pieces.length - 1) * 30, y = h * 0.16 + i * 10;
    s += `<ellipse cx="${x + 50 * sc}" cy="${y + 96 * sc}" rx="${30 * sc}" ry="${5 * sc}" fill="#000" opacity=".35" class="sa-shadow" style="animation-delay:${-i * 1.3}s"/>`;
    s += `<g class="sa-float" style="animation-delay:${-i * 1.3}s">${pieceSil(p, { x, y, s: sc, rot, fill: `url(#${u}pc)`, op: 0.92 })}</g>`;
  });
  for (let i = 0; i < 9; i++) s += `<circle class="sa-twinkle" cx="${R(150, 395).toFixed(0)}" cy="${R(8, h - 8).toFixed(0)}" r="${R(0.8, 2).toFixed(1)}" fill="#fff" style="animation-delay:${-R(0, 4).toFixed(1)}s"/>`;
  return `<svg class="section-art" viewBox="0 0 400 ${h}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">${s}</svg>`;
}

// ---------- empty state: a sleepy knight ----------
export function emptyArt(kind = "sleep") {
  const u = "em" + ++N;
  return `<svg class="ill" viewBox="0 0 150 120" role="img" aria-label="Nothing here yet"><defs><radialGradient id="${u}g"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a42"/><stop offset="1" stop-color="#1c1c21"/></linearGradient></defs>
    <circle cx="75" cy="64" r="56" fill="url(#${u}g)" class="sa-breathe"/>
    <ellipse cx="75" cy="108" rx="34" ry="5" fill="#000" opacity=".35"/>
    <g class="sa-float">${pieceSil("n", { x: 33, y: 18, s: 0.88, fill: `url(#${u}p)` })}
      <path d="M68 40q4 3 8 0" stroke="#f4d58e" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
    ${kind === "sleep" ? `<g fill="var(--acc2)" font-family="Instrument Serif, serif" font-style="italic"><text class="zz z1" x="102" y="36" font-size="16">z</text><text class="zz z2" x="112" y="22" font-size="12">z</text><text class="zz z3" x="120" y="12" font-size="9">z</text></g>` : ""}
  </svg>`;
}
