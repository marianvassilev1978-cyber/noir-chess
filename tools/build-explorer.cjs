// Builds content/explorer.json: from every position in the Lichess chess-openings database (CC0) and the course's
// opening lines, the known continuations with how many named lines go through them and where they lead.
// node tools/build-explorer.cjs <dir with a.tsv … e.tsv>
const fs = require("fs"), path = require("path");
const { Chess } = require("chess.js");
const dir = process.argv[2];
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
const epd = (fen) => fen.split(" ").slice(0, 4).join(" ");
const names = [], nameIdx = new Map(), pos = {}, named = {};
const idx = (n) => { if (!nameIdx.has(n)) { nameIdx.set(n, names.length); names.push(n); } return nameIdx.get(n); };
function addLine(sans, name, course) {
  const c = new Chess();
  for (let i = 0; i < sans.length; i++) {
    const h = fnv(epd(c.fen()));
    let m; try { m = c.move(sans[i]); } catch { return; }
    const e = (pos[h] = pos[h] || {});
    const x = (e[m.san] = e[m.san] || { n: 0, name: null, course: null });
    x.n++;
    if (course) x.course = course;
    const ch = fnv(epd(c.fen()));
    if (i === sans.length - 1 && name) named[ch] = idx(name);
  }
}
for (const f of ["a", "b", "c", "d", "e"]) {
  const rows = fs.readFileSync(path.join(dir, f + ".tsv"), "utf8").trim().split("\n").slice(1);
  for (const r of rows) { const [eco, name, pgn] = r.split("\t"); addLine(pgn.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/), `${eco} ${name}`); }
}
const C = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "content", n + ".json"), "utf8"));
for (const op of [...C("openings"), ...C("openings-extra"), ...C("gambits")]) for (const l of op.lines) addLine(l.moves.map((m) => m.san), null, op.id);
// where each move leads: the named opening at the child position, else the most common name further down (first found)
const out = {};
for (const [h, moves] of Object.entries(pos)) {
  out[h] = Object.entries(moves).sort((a, b) => b[1].n - a[1].n).map(([san, x]) => { const r = [san, x.n]; r.push(x.course || 0); return r; });
}
fs.writeFileSync(path.join(__dirname, "..", "content", "explorer.json"), JSON.stringify({ names, named, pos: out }));
console.log("positions", Object.keys(out).length, "names", names.length, "bytes", fs.statSync(path.join(__dirname, "..", "content", "explorer.json")).size);
