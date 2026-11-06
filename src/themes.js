// Board colour themes, textures, piece sets and app themes (each app theme has its own animated background).
import { state } from "./store.js";
import { themeBackground } from "./art/scenes.js";

const svgURL = (s) => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
const grain = (freq, oct, alpha, seed = 3) => svgURL(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`);
const WOOD = grain("0.012 0.32", 3, 0.55, 7);
const WOOD_FINE = grain("0.02 0.6", 2, 0.38, 11);
const MARBLE = grain("0.006", 5, 0.32, 4);
const STONE = grain("0.09", 4, 0.22, 9);
const SOFT = grain("0.5", 1, 0.08, 2);

export const BOARDS = [
  { id: "noir", name: "Noir", light: "#e9e0cc", dark: "#8a7457" },
  { id: "graphite", name: "Graphite", light: "#cfcbc3", dark: "#55524c" },
  { id: "jade", name: "Jade", light: "#e4ecdc", dark: "#4f8a6b" },
  { id: "slate", name: "Slate", light: "#dde2e8", dark: "#5f6f84" },
  { id: "ocean", name: "Ocean", light: "#d9e8ef", dark: "#3f7896" },
  { id: "rosewood", name: "Rosewood", light: "#f1dccf", dark: "#9a5d55" },
  { id: "lavender", name: "Lavender", light: "#ece6f6", dark: "#7c6aa8" },
  { id: "ember", name: "Ember", light: "#f6e2cd", dark: "#c0703f" },
  { id: "midnight", name: "Midnight", light: "#9fa8bd", dark: "#3b4561" },
  { id: "moss", name: "Moss", light: "#e8ebcf", dark: "#6d8f55" },
  { id: "brown", name: "Brown", light: "#f0d9b5", dark: "#b58863" },
  { id: "sand", name: "Sand", light: "#f4e5c8", dark: "#cfa76f" },
  { id: "cherry", name: "Cherry", light: "#f1d2c4", dark: "#a55252" },
  { id: "walnut", name: "Walnut", light: "#e3c49a", dark: "#8a5a32", tex: WOOD, blend: "multiply" },
  { id: "maple", name: "Maple", light: "#f3dcb2", dark: "#c18e56", tex: WOOD_FINE, blend: "multiply" },
  { id: "ebony", name: "Ebony", light: "#c9b291", dark: "#4a3426", tex: WOOD, blend: "multiply" },
  { id: "marble", name: "Marble", light: "#eceae4", dark: "#8f9089", tex: MARBLE, blend: "multiply" },
  { id: "stone", name: "Stone", light: "#c9c6bd", dark: "#7c7a73", tex: STONE, blend: "multiply" },
  { id: "glass", name: "Glass", light: "#647e93", dark: "#3c4f5e", tex: SOFT, blend: "overlay" },
  { id: "newspaper", name: "Newspaper", light: "#f7f7f2", dark: "#a8a8a0", tex: STONE, blend: "multiply" },
  { id: "noirgold", name: "Noir Gold", light: "#d8c9a3", dark: "#3c3a35", tex: SOFT, blend: "overlay" },
];
// boards from older versions
const BOARD_ALIAS = { green: "moss", blue: "slate", ice: "ocean", purple: "lavender", coral: "jade", dusk: "graphite", night: "midnight", tournament: "jade", bubblegum: "rosewood" };

export const PIECE_SETS = [
  { id: "cburnett", name: "Classic", credit: "Colin M.L. Burnett · GPLv2+" },
  { id: "staunty", name: "Staunty", credit: "sadsnake1 · CC BY-NC-SA 4.0" },
  { id: "maestro", name: "Maestro", credit: "sadsnake1 · CC BY-NC-SA 4.0" },
  { id: "california", name: "California", credit: "Jerry S. · CC BY-NC-SA 4.0" },
  { id: "cardinal", name: "Cardinal", credit: "sadsnake1 · CC BY-NC-SA 4.0" },
  { id: "fresca", name: "Fresca", credit: "sadsnake1 · CC BY-NC-SA 4.0" },
  { id: "tatiana", name: "Tatiana", credit: "sadsnake1 · CC BY-NC-SA 4.0" },
  { id: "merida", name: "Merida", credit: "Armando H. Marroquin · GPLv2+" },
  { id: "alpha", name: "Alpha", credit: "Eric Bentzen · free for personal use" },
  { id: "chessnut", name: "Chessnut", credit: "Alexis Luengas · Apache 2.0" },
  { id: "companion", name: "Companion", credit: "David L. Brown · freeware" },
  { id: "leipzig", name: "Leipzig", credit: "Armando H. Marroquin · freeware" },
  { id: "kosal", name: "Kosal", credit: "Kosal Sen · CC BY 4.0" },
  { id: "fantasy", name: "Fantasy", credit: "Maurizio Monge · MIT" },
  { id: "celtic", name: "Celtic", credit: "Maurizio Monge · MIT" },
  { id: "pixel", name: "Pixel", credit: "therealqtpi · AGPLv3+" },
];

export const APP_THEMES = [
  { id: "noir", name: "Noir", bg: "#0b0b0d", acc: "#e2b45e", note: "Gold dust over charcoal" },
  { id: "midnight", name: "Midnight", bg: "#070b14", acc: "#8fb2ff", note: "Stars and a cold moon" },
  { id: "forest", name: "Forest", bg: "#07100c", acc: "#5fd697", note: "Fireflies at dusk" },
  { id: "royal", name: "Royal", bg: "#0c0815", acc: "#c39bff", note: "Violet nebula, sparkles" },
  { id: "ember", name: "Ember", bg: "#110907", acc: "#ff8c4d", note: "Rising embers" },
  { id: "ivory", name: "Ivory", bg: "#f3efe6", acc: "#9a6c1f", note: "Light, warm paper" },
];
const THEME_ALIAS = { dark: "noir", oled: "noir", light: "ivory" };
export const themeId = (t) => (APP_THEMES.some((x) => x.id === t) ? t : THEME_ALIAS[t] || "noir");
export function boardTheme(id) { return BOARDS.find((b) => b.id === (BOARD_ALIAS[id] || id)) || BOARDS[0]; }

let bgFor = null;
export function applyTheme() {
  const s = state().settings;
  const b = boardTheme(s.board);
  const st = document.body.style;
  st.setProperty("--board-light", b.light);
  st.setProperty("--board-dark", b.dark);
  st.setProperty("--co-light", b.light);
  st.setProperty("--co-dark", b.dark);
  st.setProperty("--board-tex", b.tex || "none");
  st.setProperty("--board-blend", b.blend || "normal");
  st.setProperty("--anim-ms", (s.animMs || 160) + "ms");
  const t = themeId(s.theme);
  document.body.dataset.theme = t;
  const th = APP_THEMES.find((x) => x.id === t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", th.bg);
  const bg = document.getElementById("bg");
  if (bg && bgFor !== t) { bg.innerHTML = themeBackground(t); bgFor = t; }
}

export function miniBoardStyle(b) {
  return `background:${b.tex ? b.tex + "," : ""}repeating-conic-gradient(${b.dark} 0 25%, ${b.light} 0 50%) 0 0/50% 50%;${b.blend ? "background-blend-mode:" + b.blend : ""}`;
}
