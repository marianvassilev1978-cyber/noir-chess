// Board colour themes, textures, piece sets and app themes.
import { state } from "./store.js";

const svgURL = (s) => `url("data:image/svg+xml;utf8,${encodeURIComponent(s)}")`;
const grain = (freq, oct, alpha, seed = 3, stretch = "") => svgURL(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)' ${stretch}/></svg>`);
const WOOD = grain("0.012 0.32", 3, 0.55, 7);
const WOOD_FINE = grain("0.02 0.6", 2, 0.38, 11);
const MARBLE = grain("0.006", 5, 0.32, 4);
const STONE = grain("0.09", 4, 0.22, 9);
const SOFT = grain("0.5", 1, 0.08, 2);

export const BOARDS = [
  { id: "green", name: "Green", light: "#ebecd0", dark: "#739552" },
  { id: "brown", name: "Brown", light: "#f0d9b5", dark: "#b58863" },
  { id: "blue", name: "Blue", light: "#dee3e6", dark: "#8ca2ad" },
  { id: "ice", name: "Ice Sea", light: "#d9e4e8", dark: "#6b97ac" },
  { id: "purple", name: "Purple", light: "#efefef", dark: "#8877b7" },
  { id: "coral", name: "Coral", light: "#b1e4b9", dark: "#70a2a3" },
  { id: "dusk", name: "Dusk", light: "#ccb7ae", dark: "#706677" },
  { id: "sand", name: "Sand", light: "#f4e5c8", dark: "#cfa76f" },
  { id: "night", name: "Night", light: "#9fa4ad", dark: "#4b5263" },
  { id: "tournament", name: "Tournament", light: "#ebece8", dark: "#316549" },
  { id: "bubblegum", name: "Bubblegum", light: "#fdeff2", dark: "#f4a6c0" },
  { id: "cherry", name: "Cherry", light: "#f1d2c4", dark: "#a55252" },
  { id: "walnut", name: "Walnut", light: "#e3c49a", dark: "#8a5a32", tex: WOOD, blend: "multiply" },
  { id: "maple", name: "Maple", light: "#f3dcb2", dark: "#c18e56", tex: WOOD_FINE, blend: "multiply" },
  { id: "ebony", name: "Ebony", light: "#c9b291", dark: "#4a3426", tex: WOOD, blend: "multiply" },
  { id: "marble", name: "Marble", light: "#eceae4", dark: "#8f9089", tex: MARBLE, blend: "multiply" },
  { id: "stone", name: "Stone", light: "#c9c6bd", dark: "#7c7a73", tex: STONE, blend: "multiply" },
  { id: "glass", name: "Glass", light: "#647e93", dark: "#3c4f5e", tex: SOFT, blend: "overlay" },
  { id: "newspaper", name: "Newspaper", light: "#f7f7f2", dark: "#a8a8a0", tex: STONE, blend: "multiply" },
  { id: "noir", name: "Noir Gold", light: "#d8c9a3", dark: "#3c3a35", tex: SOFT, blend: "overlay" },
];

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
  { id: "dark", name: "Dark", bg: "#302e2b", acc: "#81b64c" },
  { id: "midnight", name: "Midnight", bg: "#161b26", acc: "#81b64c" },
  { id: "oled", name: "OLED Black", bg: "#000000", acc: "#81b64c" },
  { id: "forest", name: "Forest", bg: "#1c2a22", acc: "#81b64c" },
  { id: "noir", name: "Noir Gold", bg: "#0e0e10", acc: "#d4af37" },
  { id: "light", name: "Light", bg: "#f1efe9", acc: "#81b64c" },
];

export function boardTheme(id) { return BOARDS.find((b) => b.id === id) || BOARDS[0]; }

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
  document.body.dataset.theme = s.theme || "dark";
  const tc = (APP_THEMES.find((t) => t.id === s.theme) || APP_THEMES[0]).bg;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", tc);
}

export function miniBoardStyle(b) {
  return `background:${b.tex ? b.tex + "," : ""}repeating-conic-gradient(${b.dark} 0 25%, ${b.light} 0 50%) 0 0/50% 50%;${b.blend ? "background-blend-mode:" + b.blend : ""}`;
}
