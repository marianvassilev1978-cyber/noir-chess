// Bot calibration: headless bot-vs-bot matches between neighbouring bots, using the SAME selection code as the app
// (src/botbrain.js) against native Stockfish. Fits each bot's internal "skill" so the stronger bot of every pair
// scores roughly what the Elo difference predicts. Writes src/bot-calibration.json and tools/calibration-log.md.
//
//   node tools/calibrate.mjs [--games=20] [--passes=2] [--jobs=6]
//   (child mode) node tools/calibrate.mjs --pair=<idA>,<idB> --skills=<a>,<b> --games=N
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Chess } from "chess.js";
import { chooseMove, strength, bookMove } from "../src/botbrain.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith("--" + k + "=")); return a ? a.split("=")[1] : d; };

// roster from src/bots.js (id, elo, style, white, black)
function roster() {
  const src = fs.readFileSync(path.join(ROOT, "src/bots.js"), "utf8");
  const out = [];
  const re = /B\("([a-z]+)", "[^"]+", (\d+), "([a-z]+)", "([a-z]+)", "[^"]*", "(?:[^"\\]|\\.)*", (\[[^\]]*\]), (\[[^\]]*\])/g;
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], elo: +m[2], tier: m[3], style: m[4], white: JSON.parse(m[5]), black: JSON.parse(m[6]) });
  return out.sort((a, b) => a.elo - b.elo);
}
function bookAll() {
  const C = (n) => JSON.parse(fs.readFileSync(path.join(ROOT, "content", n + ".json"), "utf8"));
  const bk = {};
  for (const op of [...C("openings"), ...C("openings-extra"), ...C("gambits")]) bk[op.id] = op.lines.map((l) => ({ side: op.side, type: l.type, moves: l.moves.map((x) => x.san), dubious: l.moves.map((x) => !!x.dubious) }));
  return bk;
}

class SF {
  constructor() {
    this.p = spawn("stockfish", [], { stdio: ["pipe", "pipe", "ignore"] });
    this.buf = ""; this.cb = null;
    this.p.stdout.on("data", (d) => { this.buf += d; let i; while ((i = this.buf.indexOf("\n")) >= 0) { const l = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1); this.cb && this.cb(l); } });
    this.send("uci"); this.send("setoption name Threads value 1"); this.send("setoption name Hash value 16");
  }
  send(c) { this.p.stdin.write(c + "\n"); }
  analyse(fen, { nodes, multipv = 1, movetime }) {
    return new Promise((res) => {
      const lines = {}, turn = fen.split(" ")[1], sg = turn === "w" ? 1 : -1;
      this.cb = (l) => {
        if (l.startsWith("info") && l.includes(" pv ") && !l.includes("bound")) {
          const mp = +((l.match(/ multipv (\d+)/) || [0, 1])[1]); const sm = l.match(/ score (cp|mate) (-?\d+)/); if (!sm) return;
          const cp = sm[1] === "cp" ? sg * +sm[2] : null, mate = sm[1] === "mate" ? sg * +sm[2] : null;
          const score = mate != null ? (mate > 0 ? 100000 - mate * 10 : -100000 - mate * 10) : cp;
          lines[mp] = { move: l.split(" pv ")[1].split(" ")[0], cp, mate, score };
        } else if (l.startsWith("bestmove")) { this.cb = null; res({ best: l.split(" ")[1], lines: Object.keys(lines).sort((a, b) => a - b).map((k) => lines[k]) }); }
      };
      this.send("setoption name MultiPV value " + multipv);
      this.send("position fen " + fen);
      this.send("go " + (movetime ? "movetime " + movetime : "nodes " + nodes));
    });
  }
  quit() { this.send("quit"); }
}

async function playGame(sf, white, black, bk) {
  const c = new Chess();
  const hist = [];
  for (let ply = 0; ply < 200; ply++) {
    if (c.isGameOver()) break;
    const bot = c.turn() === "w" ? white : black;
    const fen = c.fen();
    let uci = null;
    const lines = (c.turn() === "w" ? bot.white : bot.black).flatMap((id) => bk[id] || []);
    const bm = bookMove(bot, hist, c.turn(), lines);
    if (bm) { try { const m = new Chess(fen).move(bm); uci = m.from + m.to + (m.promotion || ""); } catch {} }
    if (!uci) {
      const S = strength(bot.skill);
      const r = await sf.analyse(fen, S.full ? { movetime: 150 } : { nodes: S.nodes, multipv: S.multipv });
      uci = chooseMove({ bot, fen, lines: r.lines, ply }).uci || r.best;
    }
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    hist.push(m.san);
  }
  if (c.isCheckmate()) return c.turn() === "w" ? 0 : 1;
  if (c.isGameOver()) return 0.5;
  // adjudicate long games with a quick engine verdict
  const r = await sf.analyse(c.fen(), { nodes: 200000 });
  const v = r.lines[0] ? r.lines[0].score : 0;
  return v > 250 ? 1 : v < -250 ? 0 : 0.5;
}

// ---------- child: play one pair ----------
if (arg("pair")) {
  const [a, b] = arg("pair").split(","), [sa, sb] = arg("skills").split(",").map(Number), N = +arg("games", 20);
  const R = roster(), bk = bookAll();
  const A = { ...R.find((x) => x.id === a), skill: sa }, Bb = { ...R.find((x) => x.id === b), skill: sb };
  const sf = new SF();
  let scoreB = 0;
  for (let g = 0; g < N; g++) {
    const bWhite = g % 2 === 0;
    const res = await playGame(sf, bWhite ? Bb : A, bWhite ? A : Bb, bk);
    scoreB += bWhite ? res : 1 - res;
    sf.send("ucinewgame");
  }
  sf.quit();
  process.stdout.write(JSON.stringify({ a, b, scoreB, n: N }) + "\n");
  process.exit(0);
}

// ---------- parent ----------
const GAMES = +arg("games", 20), PASSES = +arg("passes", 2), JOBS = +arg("jobs", 6);
const R = roster();
const calPath = path.join(ROOT, "src/bot-calibration.json");
const prev = JSON.parse(fs.readFileSync(calPath, "utf8"));
const skill = Object.fromEntries(R.map((b) => [b.id, (prev.skill && prev.skill[b.id]) || b.elo]));
const log = [`# Bot calibration log`, ``, `Run ${new Date().toISOString()}: ${GAMES} games per neighbouring pair (colours alternate), ${PASSES} pass(es), native ${"Stockfish"}, same selection code as the app (src/botbrain.js).`, ``];
const expect = (d) => 1 / (1 + Math.pow(10, -d / 400));
const perf = (s) => -400 * Math.log10(1 / Math.min(0.95, Math.max(0.05, s)) - 1);

function runPair(a, b) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [fileURLToPath(import.meta.url), `--pair=${a.id},${b.id}`, `--skills=${Math.round(skill[a.id])},${Math.round(skill[b.id])}`, `--games=${GAMES}`], { stdio: ["ignore", "pipe", "ignore"] });
    let out = ""; p.stdout.on("data", (d) => (out += d)); p.on("close", () => { try { res(JSON.parse(out.trim().split("\n").pop())); } catch { res(null); } });
  });
}
async function pass(label, adjust) {
  const pairs = R.slice(0, -1).map((a, i) => [a, R[i + 1]]);
  const results = new Array(pairs.length);
  let next = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: JOBS }, async () => { while (next < pairs.length) { const i = next++; results[i] = await runPair(...pairs[i]); process.stderr.write(`  ${label} ${pairs[i][0].id}-${pairs[i][1].id}: ${results[i] ? results[i].scoreB + "/" + results[i].n : "fail"}\n`); } }));
  log.push(`## ${label} (${((Date.now() - t0) / 60000).toFixed(1)} min)`, ``, `| Pair | Elo gap | Expected (stronger) | Observed | Skill gap | Verdict |`, `|---|---|---|---|---|---|`);
  const newGap = [];
  pairs.forEach(([a, b], i) => {
    const r = results[i]; const gap = b.elo - a.elo, E = expect(gap), O = r ? r.scoreB / r.n : E;
    const sg = skill[b.id] - skill[a.id];
    const ok = Math.abs(O - E) <= 0.15;
    log.push(`| ${a.id} (${a.elo}) – ${b.id} (${b.elo}) | ${gap} | ${(E * 100).toFixed(0)}% | ${(O * 100).toFixed(0)}% | ${Math.round(sg)} | ${ok ? "ok" : O < E ? "too weak, widen" : "too strong, narrow"} |`);
    // performance gap ∝ skill gap: rescale the gap so the next run lands on the Elo gap
    const dObs = perf(O), ratio = Math.min(2, Math.max(0.5, gap / Math.max(20, dObs)));
    newGap.push(ok ? sg : sg * (1 + (ratio - 1) * 0.7));
  });
  log.push(``);
  if (adjust) { let acc = skill[R[0].id]; R.forEach((b, i) => { if (i) { acc += Math.max(25, newGap[i - 1]); skill[b.id] = Math.round(acc); } }); }
  return results;
}

for (let p = 1; p <= PASSES; p++) await pass(`Pass ${p}${p < PASSES ? " (measure + adjust)" : " (verify)"}`, p < PASSES);
fs.writeFileSync(calPath, JSON.stringify({ skill, games: GAMES, passes: PASSES, date: new Date().toISOString().slice(0, 10) }, null, 1));
log.push(`## Final internal skills`, ``, R.map((b) => `- ${b.id}: Elo ${b.elo} → skill ${skill[b.id]}`).join("\n"), ``);
fs.writeFileSync(path.join(HERE, "calibration-log.md"), log.join("\n"));
console.log("calibration written");
