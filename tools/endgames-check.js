// Endgames content checker (Level 9 course + Endgame Gym drills).
// Usage (from project root): node tools/endgames-check.js [depth=20]
// Checks:
//  - drills-endgame.json: schema (ids unique, group/goal/band/maxMoves/text/hint/explain), FEN legal, count >= 30
//  - every drill and every course "play" step: Lichess tablebase category (<= 7 pieces) must equal the goal
//    ("win" -> "win", "draw" -> "draw", from the side to move) AND Stockfish at the given depth must agree
//    (win: >= +500cp or forced mate for the side to move; draw: within +-60cp). If a position has > 7 pieces,
//    only Stockfish is used.
//  - course exercises with <= 7 pieces: tablebase check that every student move keeps the best result and is
//    the ONLY move that does (warns otherwise). (Stockfish uniqueness is checked by tools/verify.js.)
//  - all board/choice FENs legal, choice answer index valid
//  - every video: YouTube oEmbed must answer, and title/channel must match what is stored.
// Stockfish runs with Threads 1 / Hash 64, one process only (CPU limit).
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Chess } = require("chess.js");

const ROOT = path.join(__dirname, "..");
const SF = path.join(__dirname, "sf", "stockfish", "stockfish-windows-x86-64-universal.exe");
const DEPTH = +(process.argv[2] || 20);
const COURSE = path.join(ROOT, "content", "course-endgames.json");
const DRILLS = path.join(ROOT, "content", "drills-endgame.json");
const GROUPS = ["Basic mates", "Pawn endings", "Rook endings", "Minor pieces", "Queen endings"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pieceCount = (fen) => fen.split(" ")[0].replace(/[^a-zA-Z]/g, "").length;

const tbCache = new Map();
async function tablebase(fen) {
  if (tbCache.has(fen)) return tbCache.get(fen);
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch("https://tablebase.lichess.ovh/standard?fen=" + encodeURIComponent(fen));
    if (r.status === 429) { await sleep(65000); continue; }
    const text = await r.text();
    let j;
    try { j = JSON.parse(text); } catch (e) { j = { error: text.trim() }; }
    tbCache.set(fen, j);
    await sleep(1000);
    return j;
  }
  return { error: "rate limited" };
}

class Engine {
  constructor() {
    this.p = spawn(SF, [], { stdio: ["pipe", "pipe", "ignore"] });
    this.buf = ""; this.listeners = [];
    this.p.stdout.on("data", (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1);
        this.listeners.forEach((f) => f(line));
      }
    });
    this.send("uci");
    this.send("setoption name Threads value 1");
    this.send("setoption name Hash value 64");
  }
  send(c) { this.p.stdin.write(c + "\n"); }
  eval(fen, depth) {
    return new Promise((res) => {
      let last = null;
      const f = (l) => {
        if (l.startsWith("info") && l.includes(" score ") && !l.includes(" upperbound") && !l.includes(" lowerbound")) {
          const m = l.match(/ score (cp|mate) (-?\d+)/);
          const pv = l.includes(" pv ") ? l.split(" pv ")[1].split(" ")[0] : null;
          if (m) last = { cp: m[1] === "cp" ? +m[2] : null, mate: m[1] === "mate" ? +m[2] : null, pv };
        } else if (l.startsWith("bestmove")) {
          this.listeners = this.listeners.filter((x) => x !== f);
          res(last);
        }
      };
      this.listeners.push(f);
      this.send("ucinewgame");
      this.send("position fen " + fen);
      this.send("go depth " + depth);
    });
  }
  quit() { this.send("quit"); }
}

let fails = 0, warns = 0;
const FAIL = (...a) => { fails++; console.log("FAIL", ...a); };
const WARN = (...a) => { warns++; console.log("WARN", ...a); };
const OK = (...a) => console.log("ok  ", ...a);

function legal(fen, tag) {
  try { const c = new Chess(fen); return c; } catch (e) { FAIL(tag, "bad FEN", fen, e.message); return null; }
}

async function checkGoal(eng, fen, goal, tag) {
  const c = legal(fen, tag); if (!c) return;
  if (c.isGameOver()) { FAIL(tag, "position already over"); return; }
  const n = pieceCount(fen);
  let tbTxt = "TB n/a (" + n + " pieces)";
  if (n <= 7) {
    const j = await tablebase(fen);
    if (j.error) { FAIL(tag, "tablebase error", j.error); return; }
    tbTxt = `TB ${j.category}` + (j.dtm != null ? ` dtm ${j.dtm}` : "") + ` dtz ${j.dtz}`;
    if (j.category !== goal) FAIL(tag, `tablebase says ${j.category}, goal is ${goal}`);
  }
  const e = await eng.eval(fen, DEPTH);
  let sfOk, sfTxt;
  if (e.mate !== null) { sfTxt = `SF mate ${e.mate}`; sfOk = goal === "win" ? e.mate > 0 : false; }
  else { sfTxt = `SF ${e.cp}cp`; sfOk = goal === "win" ? e.cp >= 500 : Math.abs(e.cp) <= 60; }
  if (!sfOk) {
    // with a tablebase verdict the tablebase is the authority; Stockfish disagreement is a warning
    if (n <= 7) WARN(tag, `${goal}: ${tbTxt}; Stockfish d${DEPTH} disagrees (${sfTxt})`);
    else FAIL(tag, `${goal}: Stockfish d${DEPTH} disagrees (${sfTxt})`);
  } else OK(tag, `${goal}: ${tbTxt}; ${sfTxt} (d${DEPTH})`);
}

async function checkExerciseTB(s, tag) {
  if (pieceCount(s.fen) > 7) return;
  const c = new Chess(s.fen);
  const notes = [];
  for (let i = 0; i < s.solution.length; i++) {
    const before = c.fen();
    const mv = c.move(s.solution[i]);
    if (i % 2 === 1) continue;
    if (pieceCount(before) > 7) continue;
    const j = await tablebase(before);
    if (j.error) { WARN(tag, "tablebase error", j.error); return; }
    const want = j.category === "win" ? "loss" : j.category === "draw" ? "draw" : j.category === "loss" ? "win" : null;
    const best = j.moves.filter((m) => m.category === want);
    const played = j.moves.find((m) => m.uci === mv.from + mv.to + (mv.promotion || ""));
    if (!played || played.category !== want) { FAIL(tag, `ply ${i + 1} ${mv.san} spoils the tablebase result (${j.category})`); return; }
    if (best.length > 1) WARN(tag, `ply ${i + 1} ${mv.san}: other moves keep the same result: ${best.filter((m) => m !== played).map((m) => m.san).join(" ")}`);
    notes.push(`${mv.san}=${j.category}${best.length === 1 ? " (only move)" : ""}`);
  }
  if (notes.length) OK(tag, "TB:", notes.join(", "));
}

async function checkVideo(v, tag) {
  const m = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url);
  if (!m) { FAIL(tag, "video URL format", v.url); return; }
  const r = await fetch("https://www.youtube.com/oembed?url=" + encodeURIComponent(v.url) + "&format=json");
  if (!r.ok) { FAIL(tag, "oEmbed failed", r.status, v.url); return; }
  const j = await r.json();
  if (j.title !== v.title || j.author_name !== v.channel) FAIL(tag, "video meta mismatch", JSON.stringify({ stored: [v.title, v.channel], oembed: [j.title, j.author_name] }));
  else OK(tag, "video", v.channel, "-", v.title);
}

(async () => {
  const course = JSON.parse(fs.readFileSync(COURSE, "utf8"));
  const drills = JSON.parse(fs.readFileSync(DRILLS, "utf8"));
  const eng = new Engine();
  let nEx = 0, nPlay = 0, nChoice = 0, nVid = 0, nLessons = 0;

  console.log(`== Course ${path.basename(COURSE)}`);
  const ids = new Set();
  for (const level of course) {
    for (const lesson of level.lessons) {
      nLessons++;
      if (ids.has(lesson.id)) FAIL(lesson.id, "duplicate lesson id"); ids.add(lesson.id);
      let interactive = 0;
      for (let k = 0; k < lesson.steps.length; k++) {
        const s = lesson.steps[k];
        const tag = `[${lesson.id} #${k + 1} ${s.type}]`;
        if (["exercise", "play", "choice"].includes(s.type)) interactive++;
        if (s.type === "board") legal(s.fen, tag);
        if (s.type === "choice") {
          nChoice++;
          if (s.fen) legal(s.fen, tag);
          if (!(Number.isInteger(s.answer) && s.answer >= 0 && s.answer < s.options.length)) FAIL(tag, "bad answer index");
        }
        if (s.type === "exercise") { nEx++; if (legal(s.fen, tag)) await checkExerciseTB(s, tag); }
        if (s.type === "play") {
          nPlay++;
          if (!["win", "draw"].includes(s.goal) || !(s.maxMoves > 0)) FAIL(tag, "bad goal/maxMoves");
          await checkGoal(eng, s.fen, s.goal, tag);
        }
      }
      if (interactive < 5 || interactive > 9) WARN(lesson.id, `${interactive} interactive steps`);
      for (const v of lesson.videos || []) { nVid++; await checkVideo(v, `[${lesson.id}]`); }
    }
  }

  console.log(`\n== Drills ${path.basename(DRILLS)}`);
  const dids = new Set();
  const byGroup = {};
  for (const d of drills) {
    const tag = `[${d.id}]`;
    for (const k of ["id", "title", "group", "band", "fen", "goal", "maxMoves", "text", "hint", "explain"]) if (d[k] === undefined || d[k] === "") FAIL(tag, "missing field", k);
    if (dids.has(d.id)) FAIL(tag, "duplicate id"); dids.add(d.id);
    if (!GROUPS.includes(d.group)) FAIL(tag, "bad group", d.group);
    if (!["win", "draw"].includes(d.goal)) FAIL(tag, "bad goal", d.goal);
    byGroup[d.group] = (byGroup[d.group] || 0) + 1;
    await checkGoal(eng, d.fen, d.goal, tag);
  }
  if (drills.length < 30) FAIL("drills", `only ${drills.length} drills (need >= 30)`);
  eng.quit();

  console.log(`\nCourse: ${nLessons} lessons, ${nEx} exercises, ${nPlay} plays, ${nChoice} choices, ${nVid} videos`);
  console.log(`Drills: ${drills.length} (${Object.entries(byGroup).map(([g, n]) => g + " " + n).join(", ")})`);
  console.log(`RESULT: ${fails} FAIL, ${warns} WARN (Stockfish depth ${DEPTH}, tablebase.lichess.ovh for <= 7 pieces)`);
  process.exit(fails ? 1 : 0);
})();
