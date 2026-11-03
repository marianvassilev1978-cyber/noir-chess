// tactics-check: structural checks for course-tactics.json (no engine): choice FENs legal, answers in range,
// ids unique, step counts, video URL format, duplicate exercise FENs (also against lessons.json)
const { Chess } = require("chess.js");
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(__dirname + "/../content/course-tactics.json", "utf8"));
const old = JSON.parse(fs.readFileSync(__dirname + "/../content/lessons.json", "utf8"));
const oldFens = new Set(old.flatMap((l) => l.lessons.flatMap((s) => s.steps.map((x) => x.fen))).filter(Boolean));
let bad = 0; const ids = new Set(), fens = new Map();
for (const lv of data) for (const ls of lv.lessons) {
  if (ids.has(ls.id)) { console.log("dup id", ls.id); bad++; } ids.add(ls.id);
  if (!ls.id.startsWith(lv.id + "-")) { console.log("id prefix", ls.id); bad++; }
  const ex = ls.steps.filter((s) => s.type === "exercise").length, ch = ls.steps.filter((s) => s.type === "choice").length;
  console.log(ls.id.padEnd(22), "steps", ls.steps.length, "ex", ex, "choice", ch, "videos", (ls.videos || []).length);
  for (const s of ls.steps) {
    if (s.fen) { try { new Chess(s.fen); } catch (e) { console.log("BAD FEN", ls.id, s.fen); bad++; } }
    if (s.type === "choice" && !(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.options.length)) { console.log("bad answer", ls.id); bad++; }
    if (s.type === "exercise") { if (fens.has(s.fen)) { console.log("dup fen", ls.id, fens.get(s.fen)); bad++; } fens.set(s.fen, ls.id); if (oldFens.has(s.fen)) { console.log("fen in lessons.json", ls.id); bad++; } }
  }
  for (const v of ls.videos || []) if (!/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url)) { console.log("bad url", v.url); bad++; }
}
console.log(bad ? bad + " problems" : "structure OK");
