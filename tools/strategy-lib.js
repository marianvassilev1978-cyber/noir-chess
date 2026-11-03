// Helpers for the strategy course generator: build FENs from move lists, Stockfish analysis.
const path = require("path");
const { spawn } = require("child_process");
const { Chess } = require(path.join(__dirname, "node_modules", "chess.js"));
const SF = path.join(__dirname, "sf", "stockfish", "stockfish-windows-x86-64-universal.exe");

function strip(pgn) {
  return pgn.replace(/\{[^}]*\}/g, " ").replace(/\d+\.(\.\.)?/g, " ").split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}
// play moves from start (or fen); n = number of plies (default all). Returns Chess instance.
function play(pgn, n, fen) {
  const c = fen ? new Chess(fen) : new Chess();
  const toks = strip(pgn);
  const lim = n === undefined ? toks.length : n;
  for (let i = 0; i < lim; i++) {
    let mv;
    try { mv = c.move(toks[i]); } catch (e) { throw new Error(`illegal ${toks[i]} at ply ${i + 1} (${c.fen()})`); }
  }
  return c;
}
const fenAfter = (pgn, n, fen) => play(pgn, n, fen).fen();

class Engine {
  constructor() {
    this.p = spawn(SF, [], { stdio: ["pipe", "pipe", "inherit"] });
    this.buf = ""; this.listeners = [];
    this.p.stdout.on("data", (d) => {
      this.buf += d.toString(); let i;
      while ((i = this.buf.indexOf("\n")) >= 0) { const l = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1); this.listeners.forEach((f) => f(l)); }
    });
    this.send("uci"); this.send("setoption name Threads value 1"); this.send("setoption name Hash value 64");
  }
  send(c) { this.p.stdin.write(c + "\n"); }
  analyse(fen, multipv = 3, depth = 18) {
    return new Promise((res) => {
      const lines = {};
      const f = (l) => {
        if (l.startsWith("info") && l.includes(" pv ") && l.includes(" multipv ")) {
          const mp = +l.match(/ multipv (\d+)/)[1];
          const m = l.match(/ score (cp|mate) (-?\d+)/);
          const score = m[1] === "cp" ? +m[2] : (+m[2] > 0 ? 100000 - +m[2] : -100000 - +m[2]);
          lines[mp] = { score, mate: m[1] === "mate" ? +m[2] : null, move: l.split(" pv ")[1].split(" ")[0], pv: l.split(" pv ")[1].split(" ") };
        } else if (l.startsWith("bestmove")) {
          this.listeners = this.listeners.filter((x) => x !== f);
          res(Object.keys(lines).sort((a, b) => a - b).map((k) => lines[k]));
        }
      };
      this.listeners.push(f);
      this.send("setoption name MultiPV value " + multipv); this.send("position fen " + fen); this.send("go depth " + depth);
    });
  }
  quit() { this.send("quit"); }
}
// convert uci pv to SAN list
function pvSan(fen, pv, max = 8) {
  const c = new Chess(fen); const out = [];
  for (const u of pv.slice(0, max)) { try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch (e) { break; } }
  return out;
}
module.exports = { Chess, play, fenAfter, strip, Engine, pvSan };
