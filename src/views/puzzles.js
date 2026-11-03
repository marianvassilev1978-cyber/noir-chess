// Puzzles: rated, themes, Puzzle Rush, daily puzzle, and your own mistakes as puzzles. Data: Lichess puzzle DB (CC0).
import { Chess } from "chess.js";
import { $, $$, esc, md, sheet, toast, loadJSON, today, shuffle, fmtClock } from "../util.js";
import { Board, destsOf, checkSquare, badgeHTML } from "../board.js";
import { state, save, ratePuzzle, touchStreak } from "../store.js";
import { moveSound, play as sfx } from "../sound.js";
import { lineViewer } from "../ui.js";
import { ANA } from "../engine.js";
import { winFor, evalPosition, uciOf } from "../analysis.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";

export const THEMES = {
  mateIn1: "Mate in 1", mateIn2: "Mate in 2", mateIn3: "Mate in 3", mateIn4: "Mate in 4+", fork: "Fork", pin: "Pin", skewer: "Skewer",
  discoveredAttack: "Discovered attack", doubleCheck: "Double check", hangingPiece: "Hanging piece", trappedPiece: "Trapped piece",
  sacrifice: "Sacrifice", deflection: "Deflection", attraction: "Attraction", clearance: "Clearance", interference: "Interference",
  intermezzo: "Intermezzo", xRayAttack: "X-ray", zugzwang: "Zugzwang", quietMove: "Quiet move", defensiveMove: "Defensive move",
  capturingDefender: "Capture the defender", backRankMate: "Back-rank mate", smotheredMate: "Smothered mate", anastasiaMate: "Anastasia's mate",
  arabianMate: "Arabian mate", bodenMate: "Boden's mate", hookMate: "Hook mate", doubleBishopMate: "Double bishop mate", dovetailMate: "Dovetail mate",
  kingsideAttack: "Kingside attack", queensideAttack: "Queenside attack", promotion: "Promotion", underPromotion: "Underpromotion",
  advancedPawn: "Advanced pawn", enPassant: "En passant", castling: "Castling", exposedKing: "Exposed king",
  endgame: "Endgame", pawnEndgame: "Pawn endgame", rookEndgame: "Rook endgame", bishopEndgame: "Bishop endgame", knightEndgame: "Knight endgame",
  queenEndgame: "Queen endgame", queenRookEndgame: "Queen & rook endgame", opening: "Opening", middlegame: "Middlegame",
  short: "Short (2 moves)", long: "Long (3 moves)", veryLong: "Very long (4+)", oneMove: "One-move", crushing: "Crushing", advantage: "Advantage", equality: "Equality", master: "From master games",
};
const GROUPS = [
  ["Checkmates", ["mateIn1", "mateIn2", "mateIn3", "mateIn4", "backRankMate", "smotheredMate", "anastasiaMate", "arabianMate", "bodenMate", "hookMate", "doubleBishopMate", "dovetailMate"]],
  ["Tactics", ["fork", "pin", "skewer", "discoveredAttack", "doubleCheck", "hangingPiece", "trappedPiece", "sacrifice", "deflection", "attraction", "clearance", "interference", "intermezzo", "xRayAttack", "capturingDefender", "quietMove", "defensiveMove", "zugzwang"]],
  ["Phases", ["opening", "middlegame", "endgame", "pawnEndgame", "rookEndgame", "bishopEndgame", "knightEndgame", "queenEndgame", "queenRookEndgame", "promotion", "advancedPawn", "kingsideAttack", "exposedKing"]],
  ["Length", ["oneMove", "short", "long", "veryLong"]],
];

let DB = null;
async function db() { if (!DB) DB = await loadJSON("puzzles"); return DB; }

export function pickPuzzle(list, rating, seen, filter) {
  const pool = list.filter((p) => !seen.has(p[4]) && (!filter || filter(p)));
  if (!pool.length) return list[Math.floor(Math.random() * list.length)];
  let win = 75;
  for (let k = 0; k < 8; k++) {
    const near = pool.filter((p) => Math.abs(p[2] - rating) <= win);
    if (near.length >= 5 || win > 1200) return near.length ? near[Math.floor(Math.random() * near.length)] : pool[Math.floor(Math.random() * pool.length)];
    win *= 1.6;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// Generic puzzle player. p = {fen, moves:[uci...] (first is opponent's set-up move unless setup=false), rating, themes}
export function puzzlePlayer(el, p, { onDone, onStatus, setup = true, allowAnyMate = true } = {}) {
  const c = new Chess(p.fen);
  let idx = 0;
  const sol = p.moves.slice();
  let failed = false, finished = false;
  const userColor = setup ? (c.turn() === "w" ? "b" : "w") : c.turn();
  const board = new Board(el, { orientation: userColor, onMove });
  const apply = (u) => { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); board.setFen(c.fen(), { lastMove: [m.from, m.to], check: checkSquare(c) }); moveSound(m); return m; };
  function arm() { board.setMovable(userColor, destsOf(c)); }
  function opponent() {
    board.setMovable(null, null);
    setTimeout(() => { if (finished) return; apply(sol[idx]); idx++; arm(); }, 380);
  }
  function onMove(from, to, promo) {
    if (finished) return;
    const want = sol[idx];
    let m; try { m = new Chess(c.fen()).move({ from, to, promotion: promo || "q" }); } catch { return; }
    const u = uciOf(m);
    const test = new Chess(c.fen()); test.move(m.san);
    const ok = u === want || (allowAnyMate && test.isCheckmate());
    if (!ok) {
      board.setFen(test.fen(), { lastMove: [from, to], check: checkSquare(test) });
      moveSound(m);
      board.setBadges([{ sq: to, cls: "blunder" }]);
      sfx("wrong");
      board.setMovable(null, null);
      failed = true;
      onStatus && onStatus("wrong", m.san);
      setTimeout(() => { board.setBadges([]); board.setFen(c.fen(), { lastMove: null, check: checkSquare(c) }); arm(); }, 900);
      if (!p._retry) { finished = true; onDone && onDone(false); }
      return;
    }
    apply(u === want ? want : u);
    idx++;
    board.setBadges([{ sq: to, cls: "best" }]);
    setTimeout(() => board.setBadges([]), 700);
    if (idx >= sol.length || test.isCheckmate()) {
      finished = true;
      board.setMovable(null, null);
      sfx("correct");
      onStatus && onStatus("solved");
      onDone && onDone(!failed);
      return;
    }
    onStatus && onStatus("good");
    opponent();
  }
  if (setup) { board.setMovable(null, null); setTimeout(() => { apply(sol[0]); idx = 1; arm(); onStatus && onStatus("yourturn"); }, 500); }
  else { arm(); onStatus && onStatus("yourturn"); }
  return {
    board, userColor,
    hint() { const u = sol[idx]; if (u) board.setMarks({ [u.slice(0, 2)]: "info" }); },
    solution() {
      finished = true;
      const fenNow = c.fen();
      const rest = sol.slice(idx);
      lineViewer({ title: "Solution", fen: fenNow, pv: rest, orientation: userColor });
    },
    retry() { p._retry = true; },
    destroy() { board.destroy(); },
    fen: () => c.fen(),
  };
}

const toP = (a) => ({ fen: a[0], moves: a[1].split(" "), rating: a[2], themes: a[3].split(" "), id: a[4] });

export function renderHub(root) {
  const s = state();
  const r = s.ratings.puzzle.r;
  const due = s.mistakes.filter((m) => m.solved < 2).length;
  root.innerHTML = `<div class="topbar"><h2>Puzzles</h2>${r ? `<span class="badge-pill acc">${r}</span>` : ""}</div>
    <div class="grid" style="max-width:720px">
      <button class="tile big-tile rated" style="background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 28%,var(--panel)),var(--panel))"><div class="ic" style="background:#e09b2d">${I.puzzle}</div><div><div class="t">Rated puzzles</div><div class="s">${r ? "Rating " + r + " · best " + (s.ratings.puzzle.best || r) : "Start at your level"} · ${s.puzzle.solved} solved</div></div><span class="chev">›</span></button>
      <div class="grid two">
        <button class="tile rush"><div class="ic" style="background:#d6453d">${I.bolt}</div><div><div class="t">Puzzle Rush</div><div class="s">Best ${Math.max(s.rush.best.r3, s.rush.best.r5, s.rush.best.survival)}</div></div></button>
        <button class="tile daily"><div class="ic" style="background:#5b8bb4">${I.sun}</div><div><div class="t">Daily puzzle</div><div class="s">${s.puzzle.dailyDone === today() ? "Done ✓" : "New today"}</div></div></button>
        <button class="tile mist"><div class="ic" style="background:#8c6fbf">${I.target}</div><div><div class="t">My mistakes</div><div class="s">${due} to clear</div></div></button>
        <button class="tile custom"><div class="ic" style="background:#4a8a5c">${I.chart}</div><div><div class="t">Custom</div><div class="s">Pick rating range</div></div></button>
      </div>
      ${GROUPS.map(([g, list]) => `<div class="sec-title">${g}</div><div class="chips">${list.map((t) => `<button class="chip th" data-t="${t}">${THEMES[t] || t}${themeAcc(t)}</button>`).join("")}</div>`).join("")}
    </div>`;
  $(".rated", root).onclick = () => go("puzzle/rated");
  $(".rush", root).onclick = () => go("rush");
  $(".daily", root).onclick = () => go("puzzle/daily");
  $(".mist", root).onclick = () => go("mistakes");
  $(".custom", root).onclick = () => {
    const sh = sheet(`<div class="row between"><b>From</b><b class="lo">800</b></div><input type="range" class="rl" min="400" max="2800" step="50" value="800"><div class="row between mt"><b>To</b><b class="hi">1400</b></div><input type="range" class="rh" min="400" max="3000" step="50" value="1400"><button class="btn primary mt go">Start</button>`, { title: "Custom puzzles" });
    $(".rl", sh.el).oninput = (e) => ($(".lo", sh.el).textContent = e.target.value);
    $(".rh", sh.el).oninput = (e) => ($(".hi", sh.el).textContent = e.target.value);
    $(".go", sh.el).onclick = () => { sh.close(); go(`puzzle/range/${$(".rl", sh.el).value}-${$(".rh", sh.el).value}`); };
  };
  $$(".th", root).forEach((b) => (b.onclick = () => go("puzzle/theme/" + b.dataset.t)));
}
function themeAcc(t) {
  const st = state().puzzle.themeStats[t];
  if (!st || st.n < 3) return "";
  const pct = Math.round((st.ok / st.n) * 100);
  return ` <span class="tiny" style="color:${pct >= 70 ? "var(--acc2)" : pct >= 45 ? "var(--gold)" : "#ee6b55"}">${pct}%</span>`;
}

// Single-puzzle trainer (rated / theme / daily / range)
export function renderTrainer(root, [mode, arg]) {
  const s = state();
  let player = null, cur = null, alive = true;
  const rated = mode === "rated";
  root.className = "view";
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>${mode === "theme" ? esc(THEMES[arg] || arg) : mode === "daily" ? "Daily puzzle" : mode === "range" ? "Puzzles " + esc(arg) : "Rated puzzles"}</h2><span class="badge-pill acc pr"></span></div>
    <div class="lesson-layout"><div class="lb"><div id="pzb"></div></div>
    <div class="lt"><div class="pz-status"><span class="sw"></span><span class="msg">Loading…</span></div>
      <div class="small muted mt-s meta"></div>
      <div class="row gap mt"><button class="btn grow hint">${I.bulb} Hint</button><button class="btn grow sol">Solution</button><button class="btn primary grow next hide">Next ›</button></div>
      <div class="row gap mt"><button class="btn sm ghost an">Analyze</button><button class="btn sm ghost rt hide">Retry</button></div>
    </div></div>`;
  $(".back", root).onclick = () => back();

  async function next() {
    const list = await db();
    if (!alive) return;
    const seen = new Set(s.puzzle.seen);
    let a;
    if (mode === "daily") { const d = today(); let h = 0; for (const ch of d) h = (h * 31 + ch.charCodeAt(0)) >>> 0; a = list.filter((p) => p[2] > 1100 && p[2] < 1900)[h % 1000]; }
    else if (mode === "theme") a = pickPuzzle(list, s.ratings.puzzle.r || 1000, seen, (p) => p[3].split(" ").includes(arg));
    else if (mode === "range") { const [lo, hi] = arg.split("-").map(Number); a = pickPuzzle(list, (lo + hi) / 2, seen, (p) => p[2] >= lo && p[2] <= hi); }
    else a = pickPuzzle(list, s.ratings.puzzle.r || Math.max(500, (s.ratings.rapid.r || 800) - 100), seen);
    cur = toP(a);
    if (player) player.destroy();
    const holder = $("#pzb", root); holder.innerHTML = "";
    const bd = document.createElement("div"); holder.appendChild(bd);
    $(".next", root).classList.add("hide"); $(".rt", root).classList.add("hide");
    $(".hint", root).disabled = false; $(".sol", root).disabled = false;
    $(".meta", root).innerHTML = "";
    let used = false;
    player = puzzlePlayer(bd, cur, {
      onStatus: (st, san) => {
        const box = $(".pz-status", root);
        box.classList.remove("ok", "bad");
        const sw = player ? (player.userColor === "w" ? "#fff" : "#222") : "#888";
        $(".sw", root).style.background = sw;
        if (st === "yourturn") $(".msg", root).textContent = `${player && player.userColor === "w" ? "White" : "Black"} to move — find the best move`;
        if (st === "good") { $(".msg", root).textContent = "Best move! Keep going…"; }
        if (st === "wrong") { box.classList.add("bad"); $(".msg", root).textContent = `${san} isn't it.`; }
        if (st === "solved") { box.classList.add("ok"); $(".msg", root).textContent = "Solved!"; }
      },
      onDone: (ok) => {
        const solved = ok && !used;
        s.puzzle.seen.push(cur.id);
        if (solved) { s.puzzle.solved++; s.puzzle.streak++; s.puzzle.best = Math.max(s.puzzle.best, s.puzzle.streak); } else { s.puzzle.failed++; s.puzzle.streak = 0; }
        for (const t of cur.themes) { const ts = s.puzzle.themeStats[t] || (s.puzzle.themeStats[t] = { n: 0, ok: 0 }); ts.n++; if (solved) ts.ok++; }
        let delta = null;
        if (rated) delta = ratePuzzle(cur.rating, solved);
        if (mode === "daily") s.puzzle.dailyDone = today();
        s.daily.puzzles++; touchStreak(); s.xp += solved ? 3 : 1;
        save();
        if (delta != null) $(".pr", root).innerHTML = `${s.ratings.puzzle.r} <span class="${delta >= 0 ? "delta-up" : "delta-down"}">${delta >= 0 ? "+" : ""}${delta}</span>`;
        $(".meta", root).innerHTML = `Puzzle rating ${cur.rating} · ${cur.themes.filter((t) => THEMES[t] && !["short", "long", "veryLong", "oneMove", "crushing", "advantage", "middlegame", "endgame", "opening", "master"].includes(t)).map((t) => THEMES[t]).join(", ")} · <a href="https://lichess.org/training/${cur.id}" target="_blank" rel="noopener">Lichess #${cur.id}</a>`;
        $(".next", root).classList.remove("hide");
        if (!ok) { $(".rt", root).classList.remove("hide"); }
        $(".hint", root).disabled = true;
      },
    });
    if (rated) $(".pr", root).textContent = s.ratings.puzzle.r ? s.ratings.puzzle.r : "Unrated";
    $(".hint", root).onclick = () => { used = true; player.hint(); };
    $(".sol", root).onclick = () => { used = true; player.solution(); $(".next", root).classList.remove("hide"); if (!s.puzzle.seen.includes(cur.id)) { s.puzzle.seen.push(cur.id); s.puzzle.failed++; s.puzzle.streak = 0; if (rated) ratePuzzle(cur.rating, false); save(); } };
    $(".rt", root).onclick = () => { const again = { ...cur, _retry: true }; player.destroy(); const holder2 = $("#pzb", root); holder2.innerHTML = ""; const b2 = document.createElement("div"); holder2.appendChild(b2); player = puzzlePlayer(b2, again, { onStatus: () => {}, onDone: (ok2) => ok2 && toast("Solved on retry ✓") }); };
    $(".an", root).onclick = () => go("analysis/" + encodeURIComponent(JSON.stringify({ startFen: player.fen(), moves: [] })));
  }
  $(".next", root).onclick = () => (mode === "daily" ? go("puzzles") : next());
  next().catch((e) => ($(".msg", root).textContent = "Couldn't load puzzles: " + e.message));
  return () => { alive = false; player && player.destroy(); };
}

// ---------- Puzzle Rush ----------
export function renderRush(root) {
  const s = state();
  let killRun = () => {};
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Puzzle Rush</h2></div>
    <div class="grid" style="max-width:560px">
      <p class="muted">Solve as many as you can. Puzzles start easy and get harder with every one you solve.</p>
      ${[["r3", "3 minutes", "Fast. 3 strikes and you're out.", I.timer], ["r5", "5 minutes", "More time to think.", I.timer], ["survival", "Survival", "No clock. 3 strikes.", I.fire]].map(([k, t, d, ic]) => `<button class="tile" data-k="${k}"><div class="ic" style="background:#d6453d">${ic}</div><div><div class="t">${t}</div><div class="s">${d} · Best ${s.rush.best[k] || 0}</div></div><span class="chev">›</span></button>`).join("")}
    </div>`;
  $(".back", root).onclick = () => back();
  $$("[data-k]", root).forEach((b) => (b.onclick = () => rush(b.dataset.k)));
  return () => killRun();

  async function rush(kind) {
    const list = await db();
    const limit = kind === "r3" ? 180000 : kind === "r5" ? 300000 : null;
    let score = 0, strikes = 0, level = 500, t0 = performance.now(), timer = null, player = null, over = false;
    killRun = () => { over = true; clearInterval(timer); player && player.destroy(); };
    const used = new Set();
    root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Puzzle Rush</h2><span class="big-timer tm">${limit ? fmtClock(limit) : ""}</span></div>
      <div class="lesson-layout"><div class="lb"><div id="rb"></div></div><div class="lt">
      <div class="row between"><div class="hero" style="padding:10px 16px"><div class="tiny muted bold">SCORE</div><div class="big-num sc">0</div></div><div class="strikes" style="font-size:28px;letter-spacing:4px">○○○</div></div>
      <div class="rush-strip mt strip"></div><button class="btn ghost mt quit">End run</button></div></div>`;
    $(".back", root).onclick = () => { end(); back(); };
    $(".quit", root).onclick = () => end();
    const strip = $(".strip", root);
    function nextP() {
      if (over) return;
      const a = pickPuzzle(list, level, used);
      used.add(a[4]);
      const p = toP(a);
      if (player) player.destroy();
      const holder = $("#rb", root); holder.innerHTML = ""; const bd = document.createElement("div"); holder.appendChild(bd);
      player = puzzlePlayer(bd, p, {
        onDone: (ok) => {
          if (over) return;
          strip.insertAdjacentHTML("beforeend", `<i class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✕"}</i>`);
          if (ok) { score++; level += score < 10 ? 70 : 45; $(".sc", root).textContent = score; }
          else { strikes++; $(".strikes", root).textContent = "✕".repeat(strikes) + "○".repeat(Math.max(0, 3 - strikes)); if (strikes >= 3) return end(); }
          setTimeout(nextP, ok ? 250 : 700);
        },
      });
    }
    function end() {
      if (over) return; over = true;
      clearInterval(timer);
      const best = s.rush.best[kind] || 0;
      s.rush.best[kind] = Math.max(best, score);
      s.rush.hist.push([Date.now(), kind, score]);
      s.daily.puzzles += score; touchStreak(); s.xp += score;
      save();
      sheet(`<div class="tc"><div class="muted bold">SCORE</div><div class="big-num" style="font-size:64px;font-weight:900">${score}</div><p>${score > best ? "🏆 New personal best!" : `Best: ${best}`}</p><button class="btn primary big again">Play again</button></div>`, { title: "Run over" }).el.querySelector(".again").onclick = (e) => { e.target.closest(".sheet-back").remove(); rush(kind); };
    }
    if (limit) timer = setInterval(() => {
      const left = limit - (performance.now() - t0);
      const tm = $(".tm", root); if (!tm) return killRun();
      tm.textContent = fmtClock(left);
      if (left <= 0) end();
    }, 200);
    nextP();
  }
}

// ---------- My mistakes ----------
export function renderMistakes(root) {
  const s = state();
  const list = s.mistakes.filter((m) => m.solved < 2);
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>My mistakes</h2><span class="badge-pill">${list.length} left</span></div>
    <p class="muted small">Every mistake and blunder from your reviewed games lands here. Find the move you missed — twice — to clear it.</p>
    <div class="lesson-layout"><div class="lb"><div id="mb"></div></div><div class="lt"><div class="pz-status"><span class="sw"></span><span class="msg"></span></div><div class="small muted mt-s meta"></div>
    <div class="row gap mt"><button class="btn grow sol">Show answer</button><button class="btn primary grow next">Next ›</button></div></div></div>`;
  $(".back", root).onclick = () => back();
  if (!list.length) { $(".lesson-layout", root).innerHTML = '<div class="empty">Nothing here yet. Play games and run Game Review — your mistakes will turn into puzzles.</div>'; return; }
  let player = null, i = 0;
  const order = shuffle(list);
  function show() {
    const m = order[i % order.length];
    if (player) player.destroy();
    const holder = $("#mb", root); holder.innerHTML = ""; const bd = document.createElement("div"); holder.appendChild(bd);
    $(".meta", root).textContent = `In the game you played ${m.played} (${m.cls}). Cleared ${m.solved}/2.`;
    $(".msg", root).textContent = "Find the best move";
    $(".pz-status", root).classList.remove("ok", "bad");
    player = puzzlePlayer(bd, { fen: m.fen, moves: [m.best], _retry: true }, {
      setup: false,
      onStatus: (st, san) => {
        $(".sw", root).style.background = new Chess(m.fen).turn() === "w" ? "#fff" : "#222";
        if (st === "wrong") { $(".pz-status", root).classList.add("bad"); $(".msg", root).textContent = san + " — that's not it. Try again."; }
        if (st === "solved") { m.solved++; $(".pz-status", root).classList.remove("bad"); $(".pz-status", root).classList.add("ok"); $(".msg", root).textContent = "Correct! " + m.bestSan + (m.solved >= 2 ? " — cleared ✓" : " — one more time to clear it"); state().daily.puzzles++; touchStreak(); save(); }
      },
    });
  }
  $(".sol", root).onclick = () => player.solution();
  $(".next", root).onclick = () => { i++; show(); };
  show();
  return () => player && player.destroy();
}
