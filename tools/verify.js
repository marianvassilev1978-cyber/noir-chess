// Verify lesson/course exercises with Stockfish 19.
// Usage: node verify.js <file.json> [depth=18]
// Accepts: an array of levels ({lessons:[{steps:[...]}]}), an array of lessons ({steps}), or {levels:[...]}.
// For every step with type "exercise": FEN must be legal, solution must be a legal SAN sequence
// (student move, opponent reply, student move, ...). Each STUDENT move must be the engine's best
// move, or within 30cp of it, AND the second-best alternative must be clearly worse (>= 120cp gap,
// or the best is a mate and the alternative is not a faster/equal mate) -- i.e. a unique answer.
// Opponent replies must be legal (and preferably best; warns if not within 80cp).
// Also checks "board" steps have legal FENs and arrows/highlights are valid squares.
// Prints a report; exit code 1 if any FAIL.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Chess } = require("chess.js");

const SF = path.join(__dirname, "sf", "stockfish", "stockfish-windows-x86-64-universal.exe");
const file = process.argv[2];
const DEPTH = +(process.argv[3] || 18);

class Engine {
  constructor() {
    this.p = spawn(SF, [], { stdio: ["pipe", "pipe", "inherit"] });
    this.buf = "";
    this.listeners = [];
    this.p.stdout.on("data", (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        this.listeners.forEach((f) => f(line));
      }
    });
    this.send("uci");
    this.send("setoption name Threads value 2");
    this.send("setoption name Hash value 64");
  }
  send(c) { this.p.stdin.write(c + "\n"); }
  analyse(fen, multipv = 3, depth = DEPTH) {
    return new Promise((res) => {
      const lines = {};
      const f = (l) => {
        if (l.startsWith("info") && l.includes(" pv ") && l.includes(" multipv ")) {
          const mp = +l.match(/ multipv (\d+)/)[1];
          const d = +l.match(/ depth (\d+)/)[1];
          let score;
          const m = l.match(/ score (cp|mate) (-?\d+)/);
          if (m[1] === "cp") score = +m[2];
          else score = (+m[2] > 0 ? 100000 - +m[2] : -100000 - +m[2]);
          const mate = m[1] === "mate" ? +m[2] : null;
          const pv = l.split(" pv ")[1].split(" ");
          lines[mp] = { depth: d, score, mate, move: pv[0], pv };
        } else if (l.startsWith("bestmove")) {
          this.listeners = this.listeners.filter((x) => x !== f);
          res(Object.keys(lines).sort((a, b) => a - b).map((k) => lines[k]));
        }
      };
      this.listeners.push(f);
      this.send("setoption name MultiPV value " + multipv);
      this.send("position fen " + fen);
      this.send("go depth " + depth);
    });
  }
  quit() { this.send("quit"); }
}

function collectSteps(data) {
  const out = [];
  const walk = (node, trail) => {
    if (Array.isArray(node)) return node.forEach((n, i) => walk(n, trail));
    if (node && typeof node === "object") {
      if (node.steps) node.steps.forEach((s, i) => out.push({ s, where: (trail ? trail + " > " : "") + (node.id || node.title) + " #" + (i + 1) }));
      for (const k of ["levels", "lessons", "units", "drills"]) if (node[k]) walk(node[k], (trail ? trail + " > " : "") + (node.id || ""));
    }
  };
  walk(data, "");
  return out;
}

const uci = (m) => m.from + m.to + (m.promotion || "");
const SQ = /^[a-h][1-8]$/;

(async () => {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const steps = collectSteps(data);
  const eng = new Engine();
  let fails = 0, warns = 0, ok = 0;
  for (const { s, where } of steps) {
    const tag = `[${where}]`;
    if (s.type === "board" || s.type === "exercise") {
      let c;
      try { c = new Chess(s.fen); } catch (e) { console.log("FAIL", tag, "bad FEN", s.fen, e.message); fails++; continue; }
      for (const h of s.highlights || []) if (!SQ.test(h)) { console.log("FAIL", tag, "bad highlight", h); fails++; }
      for (const a of s.arrows || []) {
        const sq = typeof a === "string" ? [a.slice(0, 2), a.slice(2, 4)] : [a.from, a.to];
        if (!SQ.test(sq[0]) || !SQ.test(sq[1])) { console.log("FAIL", tag, "bad arrow", JSON.stringify(a)); fails++; }
      }
      if (c.isGameOver() && s.type === "exercise") { console.log("FAIL", tag, "game already over at start"); fails++; continue; }
    }
    if (s.type !== "exercise") continue;
    const c = new Chess(s.fen);
    let bad = false;
    for (let i = 0; i < s.solution.length; i++) {
      const san = s.solution[i];
      const fen = c.fen();
      let mv;
      try { mv = c.move(san); } catch (e) { mv = null; }
      if (!mv) { console.log("FAIL", tag, `illegal move ${san} at ply ${i + 1} in ${fen}`); bad = true; break; }
      if (s.noEngine) continue;
      const lines = await eng.analyse(fen, i % 2 === 0 ? 2 : 1);
      const best = lines[0];
      const played = uci(mv);
      if (i % 2 === 0) {
        // student move: needs to be best (or near) and unique
        let playedScore = best.move === played ? best.score : null;
        if (playedScore === null) {
          const alt = lines.find((l) => l.move === played);
          if (alt) playedScore = alt.score;
          else {
            // evaluate the played move directly
            const after = await eng.analyse(c.fen(), 1);
            playedScore = -after[0].score;
          }
        }
        const isMateBest = best.mate !== null && best.mate > 0;
        const tol = isMateBest ? 0 : 30;
        if (best.score - playedScore > tol && !(isMateBest && playedScore >= 99000 && s.goal === "mate")) {
          console.log("FAIL", tag, `ply ${i + 1} ${san} is not best: engine prefers ${best.move} (${best.score} vs ${playedScore}) fen ${fen}`);
          bad = true; break;
        }
        const second = lines.find((l) => l.move !== played);
        if (second && !s.multipleAnswers) {
          const gap = playedScore - second.score;
          const bothMate = playedScore > 99000 && second.score > 99000;
          if (!bothMate && gap < 120 && !(playedScore > 99000 && second.score < 99000)) {
            console.log("WARN", tag, `ply ${i + 1} ${san} not unique: ${second.move} is close (${playedScore} vs ${second.score})`);
            warns++;
          }
          if (bothMate && i === s.solution.length - 1) { /* final mating move alternatives are fine */ }
        }
      } else {
        if (best.move !== played && Math.abs(best.score) < 99000) {
          // check reply quality
          const after = await eng.analyse(c.fen(), 1);
          const sc = -after[0].score;
          if (best.score - sc > 80) { console.log("WARN", tag, `reply ${san} is weak, engine reply ${best.move} (${best.score} vs ${sc})`); warns++; }
        }
      }
    }
    if (!bad && s.goal === "mate" && !c.isCheckmate()) { console.log("FAIL", tag, "goal mate but final position is not checkmate"); bad = true; }
    if (bad) fails++; else ok++;
  }
  eng.quit();
  console.log(`\n${ok} exercises OK, ${fails} FAIL, ${warns} WARN (depth ${DEPTH})`);
  process.exit(fails ? 1 : 0);
})();
