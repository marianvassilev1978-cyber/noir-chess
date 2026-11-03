// Openings soundness checker (Stockfish 19).
// Usage: node tools/openings-check.js <openings-file.json> [depth=14] [--engines=1] [--report=out.json]
//
// File format: array of openings {id,name,side:"w"|"b",level,eco,tagline,ideas,lines:[{id,name,type,intro,moves:[{san,text}],summary}]}
// (an object with an "openings" array is also accepted).
//
// For every line:
//  - every SAN must be legal from the start position (chess.js); SAN spelling must match chess.js
//    (e.g. a missing "+" or "#") -> WARN
//  - every move of the STUDENT's side (opening.side) is compared with Stockfish's best move at
//    the given depth. If it loses >= 80cp vs best:
//       FAIL   if nothing marks it as deliberate
//       LABEL  if it is marked as deliberate: move has "dubious":true, or its text contains
//              ?! / !? / "dubious" / "unsound" / "gambit" / "sacrifice" / "objectively"
//              (gambit pawn/piece offers are fine as long as the student is told the truth)
//  - every move of the OPPONENT that loses >= 150cp is reported:
//       OK-TRAP  in lines of type "trap" (that is the point of a trap line)
//       INFO     in main/variation lines (the line teaches the student to expect an error; consider
//                making it a trap line or a sideline note)
//  - the final position's evaluation from the student's side is printed; WARN if <= -100 in a
//    main/variation line (the student ends up clearly worse).
// Scores are clamped to +-1500 before computing losses; a loss while the student stays >= +300
// is printed as "still winning".
// Exit code 1 if any FAIL or illegal move.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Chess } = require("chess.js");

const SF = path.join(__dirname, "sf", "stockfish", "stockfish-windows-x86-64-universal.exe");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const DEPTH = +(args.find((a) => /^\d+$/.test(a)) || 14);
const NENG = +((args.find((a) => a.startsWith("--engines=")) || "--engines=1").split("=")[1]);
const REPORT = (args.find((a) => a.startsWith("--report=")) || "").split("=")[1];
const STUDENT_LOSS = 80, OPP_LOSS = 150, CLAMP = 1500;

class Engine {
  constructor() {
    this.p = spawn(SF, [], { stdio: ["pipe", "pipe", "inherit"] });
    this.buf = ""; this.cb = null; this.last = null;
    this.p.stdout.on("data", (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!this.cb) continue;
        if (line.startsWith("info") && line.includes(" score ") && line.includes(" pv ")) {
          const m = line.match(/ score (cp|mate) (-?\d+)/);
          const score = m[1] === "cp" ? +m[2] : (+m[2] > 0 ? 100000 - +m[2] : -100000 - +m[2]);
          this.last = { score, mate: m[1] === "mate" ? +m[2] : null, pv: line.split(" pv ")[1].split(" ") };
        } else if (line.startsWith("bestmove")) {
          const cb = this.cb; this.cb = null;
          cb({ ...this.last, best: line.split(" ")[1] });
        }
      }
    });
    this.send("uci");
    this.send("setoption name Threads value 1");
    this.send("setoption name Hash value 64");
    this.send("isready");
  }
  send(c) { this.p.stdin.write(c + "\n"); }
  go(fen, searchmove) {
    return new Promise((res) => {
      this.last = null; this.cb = res;
      this.send("position fen " + fen);
      this.send("go depth " + DEPTH + (searchmove ? " searchmoves " + searchmove : ""));
    });
  }
  quit() { this.send("quit"); }
}

const clamp = (x) => Math.max(-CLAMP, Math.min(CLAMP, x));
const uci = (m) => m.from + m.to + (m.promotion || "");
const LABEL_RE = /\?!|!\?|dubious|unsound|gambit|sacrific|objectively/i;
const fmt = (cp) => (cp >= 99000 ? "M" + (100000 - cp) : cp <= -99000 ? "-M" + (100000 + cp) : (cp >= 0 ? "+" : "") + (cp / 100).toFixed(2));

(async () => {
  let data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(data)) data = data.openings || data.gambits || [];
  const problems = [];
  const ids = new Set();
  // Build jobs: unique (fen, move) pairs + final positions.
  const jobs = new Map();
  const plan = [];
  for (const op of data) {
    if (!["w", "b"].includes(op.side)) problems.push({ kind: "FAIL", where: op.id, msg: "side must be w or b" });
    if (ids.has(op.id)) problems.push({ kind: "FAIL", where: op.id, msg: "duplicate opening id" });
    ids.add(op.id);
    for (const ln of op.lines || []) {
      const where = op.id + " > " + ln.id;
      if (ids.has(ln.id)) problems.push({ kind: "WARN", where, msg: "duplicate line id" });
      ids.add(ln.id);
      if (!["main", "variation", "sideline", "trap"].includes(ln.type)) problems.push({ kind: "WARN", where, msg: "unknown line type " + ln.type });
      const c = new Chess();
      const plies = [];
      let ok = true;
      ln.moves.forEach((mv, i) => {
        if (!ok) return;
        if (!mv.text || !mv.text.trim()) problems.push({ kind: "WARN", where, msg: `ply ${i + 1} ${mv.san} has no text` });
        const fen = c.fen();
        let m = null;
        try { m = c.move(mv.san); } catch (e) { m = null; }
        if (!m) { problems.push({ kind: "FAIL", where, msg: `illegal move ${mv.san} at ply ${i + 1} (${fen})` }); ok = false; return; }
        if (m.san !== mv.san) problems.push({ kind: "WARN", where, msg: `ply ${i + 1}: SAN "${mv.san}" should be written "${m.san}"` });
        const key = fen + "|" + uci(m);
        if (!jobs.has(key)) jobs.set(key, { fen, move: uci(m) });
        plies.push({ i, san: m.san, fen, key, mover: fen.split(" ")[1], obj: mv });
      });
      const fkey = c.fen() + "|";
      if (ok && !c.isGameOver() && !jobs.has(fkey)) jobs.set(fkey, { fen: c.fen(), move: null });
      plan.push({ op, ln, where, plies, ok, finalKey: ok ? fkey : null, finalTurn: c.turn(), mate: c.isCheckmate(), finalFen: c.fen() });
    }
  }
  // Run jobs in parallel.
  const list = [...jobs.values()];
  const engines = Array.from({ length: Math.min(NENG, list.length || 1) }, () => new Engine());
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(engines.map(async (e) => {
    while (next < list.length) {
      const j = list[next++];
      const best = await e.go(j.fen);
      j.bestScore = best.score; j.bestMove = best.best; j.pv = best.pv;
      if (j.move) {
        if (best.best === j.move) j.playedScore = best.score;
        else j.playedScore = (await e.go(j.fen, j.move)).score;
      }
      done++;
      if (done % 200 === 0) process.stderr.write(`  ${done}/${list.length} positions (${((Date.now() - t0) / 1000) | 0}s)\n`);
    }
  }));
  engines.forEach((e) => e.quit());
  // Evaluate.
  const summary = [];
  for (const p of plan) {
    const { op, ln, where } = p;
    const isTrap = ln.type === "trap";
    for (const pl of p.plies) {
      const j = jobs.get(pl.key);
      const loss = clamp(j.bestScore) - clamp(j.playedScore);
      const student = pl.mover === op.side;
      const moveNo = Math.floor(pl.i / 2) + 1 + (pl.mover === "w" ? "." : "...");
      const best = new Chess(pl.fen).move(j.bestMove, { strict: false });
      const bestSan = best ? best.san : j.bestMove;
      const desc = `${moveNo}${pl.san} loses ${(loss / 100).toFixed(2)} (played ${fmt(j.playedScore)}, best ${bestSan} ${fmt(j.bestScore)}, mover's view)`;
      if (student && loss >= STUDENT_LOSS) {
        const labelled = pl.obj.dubious || LABEL_RE.test(pl.obj.text || "");
        const still = j.playedScore >= 300 ? " [still winning]" : "";
        problems.push({ kind: labelled ? "LABEL" : "FAIL", where, msg: desc + still });
      } else if (!student && loss >= OPP_LOSS) {
        problems.push({ kind: isTrap ? "OK-TRAP" : "INFO", where, msg: "opponent error " + desc });
      }
    }
    if (p.ok) {
      let ev;
      if (p.mate) ev = p.finalTurn === op.side ? -100000 : 100000;
      else { const j = jobs.get(p.finalKey); ev = p.finalTurn === op.side ? j.bestScore : -j.bestScore; }
      summary.push({ where, type: ln.type, plies: p.plies.length, final: ev });
      if (ev <= -100 && !isTrap) problems.push({ kind: "WARN", where, msg: `line ends ${fmt(ev)} for the student (${p.finalFen})` });
    }
  }
  const order = { FAIL: 0, WARN: 1, LABEL: 2, INFO: 3, "OK-TRAP": 4 };
  problems.sort((a, b) => order[a.kind] - order[b.kind]);
  console.log(`\n=== ${path.basename(file)}: ${data.length} openings, ${plan.length} lines, ${list.length} positions, depth ${DEPTH} ===\n`);
  for (const pr of problems) console.log(`${pr.kind.padEnd(7)} [${pr.where}] ${pr.msg}`);
  console.log("\nFinal evaluations (student's view):");
  for (const s of summary) console.log(`  ${s.where.padEnd(48)} ${s.type.padEnd(9)} ${String(s.plies).padStart(3)} plies  ${fmt(s.final)}`);
  const cnt = (k) => problems.filter((p) => p.kind === k).length;
  console.log(`\n${plan.length} lines: ${cnt("FAIL")} FAIL, ${cnt("WARN")} WARN, ${cnt("LABEL")} LABEL (deliberate, labelled), ${cnt("INFO")} INFO, ${cnt("OK-TRAP")} OK-TRAP  (${((Date.now() - t0) / 1000) | 0}s)`);
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify({ problems, summary }, null, 1));
  process.exit(cnt("FAIL") ? 1 : 0);
})();
