// Structural check of all content as the app will load it.
const fs = require("fs");
const path = require("path");
const { Chess } = require("chess.js");
const C = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "content", n + ".json"), "utf8"));
function moveSan(chess, san) {
  try { return chess.move(san); } catch {}
  const clean = String(san).replace(/[!?]+$/, "");
  const m = clean.match(/^([NBRQK])([a-h]?[1-8]?)(x?[a-h][1-8].*)$/);
  if (m) { try { return chess.move(m[1] + m[3]); } catch {} }
  return chess.move(clean);
}
let bad = 0, n = { lessons: 0, ex: 0, choice: 0, play: 0, board: 0, text: 0, videos: 0 };
const err = (...a) => { bad++; console.log("ERR", ...a); };
const levels = [...C("lessons"), ...C("course-tactics"), ...C("course-endgames"), ...C("course-strategy")].sort((a, b) => +a.id.slice(1) - +b.id.slice(1));
const ids = new Set();
for (const lv of levels) for (const l of lv.lessons) {
  n.lessons++;
  if (ids.has(l.id)) err("dup lesson", l.id); ids.add(l.id);
  n.videos += (l.videos || []).length;
  for (const v of l.videos || []) if (!/(v=|youtu\.be\/|shorts\/)[\w-]{11}/.test(v.url)) err("bad video url", l.id, v.url);
  l.steps.forEach((s, i) => {
    const w = l.id + "#" + (i + 1);
    if (!["text", "board", "exercise", "choice", "play"].includes(s.type)) return err("unknown type", w, s.type);
    n[s.type === "exercise" ? "ex" : s.type]++;
    if (s.fen) { try { new Chess(s.fen); } catch (e) { err("fen", w, e.message); } }
    if (s.type === "exercise") { const c = new Chess(s.fen); for (const san of s.solution) { try { moveSan(c, san); } catch { err("solution", w, san); break; } } }
    if (s.type === "choice" && !(s.options && s.options[s.answer] !== undefined)) err("choice answer", w);
    if (s.type === "play" && !["win", "draw"].includes(s.goal)) err("play goal", w);
  });
}
const ops = [...C("openings"), ...C("openings-extra"), ...C("gambits")];
const lids = new Set(); let lines = 0;
for (const o of ops) for (const l of o.lines) {
  lines++;
  if (lids.has(l.id)) err("dup line", l.id); lids.add(l.id);
  const c = new Chess();
  for (const m of l.moves) { try { const mv = moveSan(c, m.san); if (mv.san !== m.san) console.log("note: non-canonical SAN", l.id, m.san, "->", mv.san); } catch { err("line move", l.id, m.san); break; } }
}
const drills = C("drills-endgame");
for (const d of drills) { try { new Chess(d.fen); } catch { err("drill fen", d.id); } }
console.log(`levels ${levels.length}, lessons ${n.lessons}, exercises ${n.ex}, choices ${n.choice}, play ${n.play}, boards ${n.board}, texts ${n.text}, videos ${n.videos}`);
console.log(`openings ${ops.length}, lines ${lines}, drills ${drills.length}, puzzles ${C("puzzles").length}`);
console.log(bad ? bad + " ERRORS" : "ALL OK");
