// Checks content/course-strategy.json beyond tools/verify.js:
// - every board/choice/play/exercise FEN is legal (chess.js), arrows/highlights are squares
// - choice steps: 3-4 options, valid answer index, explain present
// - lesson shape: 5-10 steps, >= 4 exercises/choices (play counts), videos well-formed
// - play steps: Stockfish depth 20 agrees with the goal (win >= +5 or mate; draw within +-0.6),
//   and positions with <= 7 pieces are checked against the Lichess tablebase.
// Usage: node tools/strategy-check.js [file]   (one engine, Threads 1)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { Chess, Engine } = require("./strategy-lib.js");
const file = process.argv[2] || path.join(__dirname, "..", "content", "course-strategy.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const SQ = /^[a-h][1-8]$/;
let fails = 0, warns = 0, checked = 0;
const fail = (w, m) => { fails++; console.log("FAIL", w, m); };
const warn = (w, m) => { warns++; console.log("WARN", w, m); };

(async () => {
  const plays = [];
  for (const L of data) {
    if (!L.id || !L.title || !L.band || !Array.isArray(L.lessons)) fail(L.id, "level fields");
    for (const les of L.lessons) {
      const n = les.steps.length, act = les.steps.filter((s) => ["exercise", "choice", "play"].includes(s.type)).length;
      if (n < 5 || n > 10) warn(les.id, `${n} steps (brief: 5-10)`);
      if (act < 4) fail(les.id, `only ${act} exercises/choices`);
      for (const v of les.videos || []) if (!/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(v.url) || !v.title || !v.channel) fail(les.id, "bad video " + JSON.stringify(v));
      les.steps.forEach((s, i) => {
        const w = `[${les.id} #${i + 1} ${s.type}]`;
        if (s.fen) {
          try { new Chess(s.fen); checked++; } catch (e) { fail(w, "illegal FEN " + s.fen + " " + e.message); }
        }
        for (const h of s.highlights || []) if (!SQ.test(h)) fail(w, "bad highlight " + h);
        for (const a of s.arrows || []) if (!SQ.test(a.slice(0, 2)) || !SQ.test(a.slice(2, 4))) fail(w, "bad arrow " + a);
        if (s.type === "choice") {
          if (!Array.isArray(s.options) || s.options.length < 3 || s.options.length > 4) fail(w, "options count");
          if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.options.length) fail(w, "answer index");
          if (!s.explain || !s.text) fail(w, "missing text/explain");
          if (new Set(s.options).size !== s.options.length) fail(w, "duplicate options");
        }
        if (s.type === "board" && !s.fen) fail(w, "board without fen");
        if (s.type === "play") { if (!["win", "draw"].includes(s.goal) || !s.maxMoves) fail(w, "play fields"); plays.push({ s, w }); }
      });
    }
  }
  const eng = new Engine();
  for (const { s, w } of plays) {
    const c = new Chess(s.fen);
    const L = await eng.analyse(s.fen, 1, 20);
    const sc = L[0].score; // side to move = student
    const ok = s.goal === "win" ? sc >= 500 : Math.abs(sc) <= 60;
    const pieces = c.board().flat().filter(Boolean).length;
    let tb = "";
    if (pieces <= 7) {
      try { const j = JSON.parse(execFileSync("curl", ["-s", "-m", "20", "https://tablebase.lichess.ovh/standard?fen=" + encodeURIComponent(s.fen)]).toString()); tb = j.category; } catch (e) { tb = "tablebase-unavailable"; }
    }
    const tbOk = !tb || tb === "tablebase-unavailable" || (s.goal === "draw" ? tb === "draw" : tb === "win");
    const line = `${w} goal=${s.goal} sf20=${sc} pieces=${pieces} tablebase=${tb || "n/a"}`;
    if (!tbOk) fail(w, line);
    else if (!ok && tb === (s.goal === "draw" ? "draw" : "win")) console.log("OK (tablebase overrides SF)", line);
    else if (!ok) fail(w, line);
    else console.log("OK", line);
  }
  eng.quit();
  console.log(`\n${checked} FENs legal-checked, ${plays.length} play steps, ${fails} FAIL, ${warns} WARN`);
  process.exit(fails ? 1 : 0);
})();
