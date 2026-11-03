// Opening names from the Lichess chess-openings database (CC0, 3,865 named lines).
import { loadJSON } from "./util.js";

let DB = null;
export async function loadEco() { if (!DB) DB = await loadJSON("eco"); return DB; }
export const ecoReady = () => !!DB;

export function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
export const epd = (fen) => fen.split(" ").slice(0, 4).join(" ");

export function isBook(fen) { return !!DB && DB.pos[fnv(epd(fen))] !== undefined; }

// fens: list of positions in game order; returns {eco,name,ply} of the deepest named position
export function openingOf(fens) {
  if (!DB) return null;
  let best = null;
  for (let i = 0; i < fens.length && i < 40; i++) {
    const v = DB.pos[fnv(epd(fens[i]))];
    if (v === undefined) { if (i > 2 && best && i - best.ply > 6) break; continue; }
    if (v >= 0) best = { eco: DB.names[v][0], name: DB.names[v][1], ply: i };
  }
  return best;
}
