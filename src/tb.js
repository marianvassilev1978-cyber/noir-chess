// Lichess endgame tablebase (perfect play for ≤ 7 pieces). Online only; callers fall back to Stockfish.
const cache = new Map();
export const pieceCount = (fen) => (fen.split(" ")[0].match(/[a-zA-Z]/g) || []).length;

export async function probe(fen) {
  if (pieceCount(fen) > 7) return null;
  const key = fen.split(" ").slice(0, 4).join(" ");
  if (cache.has(key)) return cache.get(key);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch("https://tablebase.lichess.ovh/standard?fen=" + encodeURIComponent(fen), { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    cache.set(key, j);
    return j;
  } catch { return null; }
}

// category is from the side to move
export const isWin = (c) => ["win", "syzygy-win", "maybe-win"].includes(c);
export const isLoss = (c) => ["loss", "syzygy-loss", "maybe-loss"].includes(c);
export const isDrawish = (c) => ["draw", "cursed-win", "blessed-loss"].includes(c);
