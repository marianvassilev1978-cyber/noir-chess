// Build content/eco.json from the Lichess chess-openings TSVs (CC0).
// Output: { names: [[eco,name]], pos: { hash: nameIdx|-1 } } where hash = fnv1a(epd) base36.
// nameIdx = index of the deepest named opening at that position; -1 = book position without own name.
const fs = require("fs");
const path = require("path");
const { Chess } = require("chess.js");
const dir = process.argv[2];
const out = process.argv[3];

function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
const epd = (fen) => fen.split(" ").slice(0, 4).join(" ");

const names = [];
const pos = {};
const depth = {};
for (const f of ["a", "b", "c", "d", "e"]) {
  const rows = fs.readFileSync(path.join(dir, f + ".tsv"), "utf8").trim().split("\n").slice(1);
  for (const r of rows) {
    const [eco, name, pgn] = r.split("\t");
    const c = new Chess();
    const sans = pgn.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/);
    const idx = names.push([eco, name]) - 1;
    for (let i = 0; i < sans.length; i++) {
      c.move(sans[i]);
      const h = fnv(epd(c.fen()));
      if (i === sans.length - 1) {
        // final position: named
        if (depth[h] === undefined || depth[h] !== "named" ) { pos[h] = idx; depth[h] = "named"; }
      } else if (pos[h] === undefined) pos[h] = -1;
    }
  }
}
fs.writeFileSync(out, JSON.stringify({ names, pos }));
console.log("names", names.length, "positions", Object.keys(pos).length, "bytes", fs.statSync(out).size);
