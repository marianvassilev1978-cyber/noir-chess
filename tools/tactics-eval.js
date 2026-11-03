// tactics-eval: node tactics-eval.js depth "fen" ["SAN moves to apply first"] -> multipv 3 lines (SAN pv)
const path = require("path"); const { spawn } = require("child_process"); const { Chess } = require("chess.js");
const SF = path.join(__dirname, "sf", "stockfish", "stockfish-windows-x86-64-universal.exe");
const [depth, fen0, pre, mpv] = process.argv.slice(2);
const c = new Chess(fen0); for (const m of (pre || "").split(" ").filter(Boolean)) c.move(m);
const fen = c.fen();
const p = spawn(SF); let buf = ""; const lines = {};
p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
  if (l.startsWith("info") && l.includes(" multipv ") && l.includes(" pv ")) { const k = +l.match(/multipv (\d+)/)[1]; const s = l.match(/score (cp|mate) (-?\d+)/); lines[k] = [s[1] + " " + s[2], l.split(" pv ")[1].split(" ")]; }
  if (l.startsWith("bestmove")) { console.log(fen, "(", c.turn(), "to move )"); for (const k of Object.keys(lines)) { const cc = new Chess(fen); const san = []; for (const u of lines[k][1].slice(0, 10)) { try { san.push(cc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch (e) { break; } } console.log(" ", lines[k][0], san.join(" ")); } p.stdin.write("quit\n"); } } });
p.stdin.write(`uci\nsetoption name Threads value 1
setoption name Hash value 64\nsetoption name MultiPV value ${mpv || 3}\nposition fen ${fen}\ngo depth ${depth}\n`);
