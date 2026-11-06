// Puzzles: rated (Glicko-2), Puzzle Rush, Puzzle Duel vs a bot, the Daily Puzzle with a calendar streak, custom
// practice (theme / rating / my mistakes) and puzzle stats. Data: the Lichess puzzle database (CC0).
import { Chess } from "chess.js";
import { $, $$, esc, md, sheet, toast, loadJSON, today, shuffle, fmtClock, timeAgo } from "../util.js";
import { Board, destsOf, checkSquare, badgeHTML } from "../board.js";
import { state, save, ratePuzzle, touchStreak, previewPuzzle } from "../store.js";
import { moveSound, play as sfx } from "../sound.js";
import { lineViewer, sectionHead, deltaPill, ratingChart, avatar, ring, coachBubble, emptyState, userPlayer as userUser } from "../ui.js";
import { uciOf } from "../analysis.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { burst, haptic, celebrate } from "../art/fx.js";
import { bring, countTo, shake } from "../art/motion.js";
import { coachFor, mainCoach } from "../coaches.js";
import { ALL_BOTS, botById } from "../bots.js";
import { checkAchievements } from "../achievements.js";

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
  ["Phases", ["opening", "middlegame", "endgame", "pawnEndgame", "rookEndgame", "bishopEndgame", "knightEndgame", "queenEndgame", "promotion", "advancedPawn", "kingsideAttack", "exposedKing"]],
];
const META = new Set(["short", "long", "veryLong", "oneMove", "crushing", "advantage", "equality", "master", "middlegame", "endgame", "opening", "mate"]);
const KEY_THEMES = ["fork", "pin", "hangingPiece", "mateIn2", "skewer", "discoveredAttack", "backRankMate", "deflection", "endgame", "sacrifice"];

let DB = null;
export async function db() { if (!DB) DB = await loadJSON("puzzles"); return DB; }
const toP = (a) => ({ fen: a[0], moves: a[1].split(" "), rating: a[2], themes: a[3].split(" "), id: a[4] });
export function pickPuzzle(list, rating, seen, filter) {
  const pool = list.filter((p) => !seen.has(p[4]) && (!filter || filter(p)));
  if (!pool.length) { const all = list.filter((p) => !filter || filter(p)); return (all.length ? all : list)[Math.floor(Math.random() * (all.length || list.length))]; }
  let win = 75;
  for (let k = 0; k < 8; k++) {
    const near = pool.filter((p) => Math.abs(p[2] - rating) <= win);
    if (near.length >= 5 || win > 1200) return near.length ? near[Math.floor(Math.random() * near.length)] : pool[Math.floor(Math.random() * pool.length)];
    win *= 1.6;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
// theme tags shown after solving: the specific themes first, then the general ones (phase, length, result)
const themeTags = (p) => [...p.themes.filter((t) => THEMES[t] && !META.has(t)), ...p.themes.filter((t) => THEMES[t] && META.has(t))].map((t) => `<span class="chip" style="min-height:26px;padding:3px 9px">${THEMES[t]}</span>`).join("");
const pzRating = () => state().ratings.puzzle.r || Math.max(500, (state().ratings.rapid.r || 800) - 100);

// Generic puzzle player. p = {fen, moves:[uci…] (the first is the opponent's set-up move unless setup=false)}
export function puzzlePlayer(el, p, { onDone, onStatus, setup = true, allowAnyMate = true, onMove: onUserMove } = {}) {
  const c = new Chess(p.fen);
  let idx = 0, failed = false, finished = false;
  const TESTM = localStorage.getItem("noir.test");
  if (TESTM) window.__noir = Object.assign(window.__noir || {}, { pz: p, pzReady: false });
  const sol = p.moves.slice();
  const userColor = setup ? (c.turn() === "w" ? "b" : "w") : c.turn();
  const board = new Board(el, { orientation: userColor, onMove });
  const apply = (u) => { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); board.setFen(c.fen(), { lastMove: [m.from, m.to], check: checkSquare(c) }); moveSound(m); return m; };
  const arm = () => board.setMovable(userColor, destsOf(c));
  function opponent() { board.setMovable(null, null); setTimeout(() => { if (finished) return; apply(sol[idx]); idx++; arm(); }, 380); }
  function onMove(from, to, promo) {
    if (finished) return;
    onUserMove && onUserMove();
    const want = sol[idx];
    let m; try { m = new Chess(c.fen()).move({ from, to, promotion: promo || "q" }); } catch { return; }
    const u = uciOf(m), test = new Chess(c.fen()); test.move(m.san);
    const ok = u === want || (allowAnyMate && test.isCheckmate());
    if (!ok) {
      board.setFen(test.fen(), { lastMove: [from, to], check: checkSquare(test) }); moveSound(m);
      board.setBadges([{ sq: to, cls: "blunder" }]); sfx("wrong"); haptic("medium"); shake(el);
      board.setMovable(null, null); failed = true;
      onStatus && onStatus("wrong", m.san);
      setTimeout(() => { board.setBadges([]); board.setFen(c.fen(), { lastMove: null, check: checkSquare(c) }); if (p._retry) arm(); }, 900);
      if (!p._retry) { finished = true; onDone && onDone(false); }
      return;
    }
    apply(u === want ? want : u); idx++;
    board.setBadges([{ sq: to, cls: "best" }]); setTimeout(() => board.setBadges([]), 700);
    if (idx >= sol.length || test.isCheckmate()) {
      finished = true; board.setMovable(null, null); sfx("correct"); haptic("light");
      burst(board.sqRect(to), { color: "#3cc97f", size: 80, dashes: 10 });
      onStatus && onStatus("solved"); onDone && onDone(!failed);
      return;
    }
    onStatus && onStatus("good"); opponent();
  }
  if (setup) { board.setMovable(null, null); setTimeout(() => { if (finished) return; apply(sol[0]); idx = 1; arm(); onStatus && onStatus("yourturn"); if (TESTM) window.__noir.pzReady = true; }, 500); }
  else { arm(); onStatus && onStatus("yourturn"); if (TESTM) window.__noir.pzReady = true; }
  return {
    board, userColor,
    hint() { const u = sol[idx]; if (u) board.setMarks({ [u.slice(0, 2)]: "info" }); },
    solution() { finished = true; lineViewer({ title: "Solution", fen: c.fen(), pv: sol.slice(idx), orientation: userColor, coach: coachFor("tactics") }); },
    destroy() { finished = true; board.destroy(); },
    fen: () => c.fen(), startFen: () => { const t = new Chess(p.fen); if (setup) { try { t.move({ from: sol[0].slice(0, 2), to: sol[0].slice(2, 4), promotion: sol[0][4] }); } catch {} } return t.fen(); },
    playOpp: (u) => {},
  };
}

// ---------- hub ----------
export function renderHub(root) {
  const s = state();
  const R = s.ratings.puzzle;
  const due = s.mistakes.filter((m) => m.solved < 2).length;
  const daily = s.dailyPuzzle || {};
  const dStreak = dailyStreak(daily);
  root.innerHTML = `${sectionHead("puzzles", "Puzzles", "", `<span class="badge-pill acc">${R.r ? R.r + (R.games < 20 ? "?" : "") : "Unrated"}</span>`)}
    <div class="grid" style="max-width:760px">
      <button class="tile big-tile rated hero" style="padding:18px"><div class="ic" style="background:linear-gradient(135deg,#ffb14d,#d0612a);width:60px;height:60px;border-radius:19px">${I.puzzle}</div><div class="grow"><div class="t" style="font-size:20px">Rated puzzles</div><div class="s">${R.r ? `Rating ${R.r} · best ${R.best || R.r}` : "Start at your level"} · streak ${s.puzzle.streak} · ${s.puzzle.solved} solved</div></div><span class="chev">›</span></button>
      <div class="grid two">
        <button class="tile rush"><div class="ic" style="background:linear-gradient(135deg,#ff5f6d,#b3123a)">${I.bolt}</div><div class="grow"><div class="t">Puzzle Rush</div><div class="s">Best ${Math.max(s.rush.best.r3 || 0, s.rush.best.r5 || 0, s.rush.best.survival || 0)}</div></div></button>
        <button class="tile duel"><div class="ic" style="background:linear-gradient(135deg,#5fa2ff,#2a4ab8)">${I.duel}</div><div class="grow"><div class="t">Puzzle Duel</div><div class="s">Race a bot</div></div></button>
        <button class="tile daily"><div class="ic" style="background:linear-gradient(135deg,#f5c542,#b07d1e)">${I.calendar}</div><div class="grow"><div class="t">Daily puzzle</div><div class="s">${daily[today()] ? "Done ✓" : "New today"} · ${dStreak}d streak</div></div></button>
        <button class="tile custom"><div class="ic" style="background:linear-gradient(135deg,#3cc97f,#1d7a4a)">${I.target}</div><div class="grow"><div class="t">Custom</div><div class="s">Theme · rating · mistakes</div></div></button>
        <button class="tile mist"><div class="ic" style="background:linear-gradient(135deg,#c38bff,#6c3fd0)">${I.analysis}</div><div class="grow"><div class="t">My mistakes</div><div class="s">${due} to clear</div></div></button>
        <button class="tile stats"><div class="ic" style="background:linear-gradient(135deg,#8a96aa,#3a4250)">${I.chart}</div><div class="grow"><div class="t">Puzzle stats</div><div class="s">Themes · history</div></div></button>
      </div>
      ${GROUPS.map(([g, list]) => `<div class="sec-title">${g}</div><div class="chips">${list.map((t) => `<button class="chip th" data-t="${t}">${THEMES[t] || t}${themeAcc(t)}</button>`).join("")}</div>`).join("")}
    </div>`;
  $(".rated", root).onclick = () => go("puzzle/rated");
  $(".rush", root).onclick = () => go("rush");
  $(".duel", root).onclick = () => go("duel");
  $(".daily", root).onclick = () => go("daily");
  $(".mist", root).onclick = () => go("mistakes");
  $(".stats", root).onclick = () => go("puzzle-stats");
  $(".custom", root).onclick = () => customSheet();
  $$(".th", root).forEach((b) => (b.onclick = () => go("puzzle/theme/" + b.dataset.t)));
}
function themeAcc(t) {
  const st = state().puzzle.themeStats[t];
  if (!st || st.n < 3) return "";
  const pct = Math.round((st.ok / st.n) * 100);
  return ` <span class="tiny" style="color:${pct >= 70 ? "var(--good)" : pct >= 45 ? "var(--gold)" : "var(--bad)"}">${pct}%</span>`;
}
function customSheet() {
  const sh = sheet(`<div class="eyebrow">Theme</div><select class="cth mt-s"><option value="">Any theme</option>${GROUPS.flatMap(([, l]) => l).map((t) => `<option value="${t}">${THEMES[t]}</option>`).join("")}</select>
    <div class="row between mt"><b>From</b><b class="lo">800</b></div><input type="range" class="rl" min="400" max="2800" step="50" value="${Math.max(400, pzRating() - 200)}">
    <div class="row between mt"><b>To</b><b class="hi">1400</b></div><input type="range" class="rh" min="400" max="3000" step="50" value="${pzRating() + 200}">
    <button class="btn primary big mt go">Start</button><button class="btn ghost mt mm">${I.analysis} Practise my mistakes instead</button>`, { title: "Custom practice" });
  const upd = () => { $(".lo", sh.el).textContent = $(".rl", sh.el).value; $(".hi", sh.el).textContent = $(".rh", sh.el).value; };
  $(".rl", sh.el).oninput = upd; $(".rh", sh.el).oninput = upd; upd();
  $(".go", sh.el).onclick = () => { sh.close(); go(`puzzle/custom/${$(".cth", sh.el).value || "any"}/${$(".rl", sh.el).value}-${$(".rh", sh.el).value}`); };
  $(".mm", sh.el).onclick = () => { sh.close(); go("mistakes"); };
}

// ---------- single-puzzle trainer: rated / theme / custom / daily ----------
export function renderTrainer(root, [mode, arg, arg2]) {
  const s = state();
  let player = null, cur = null, alive = true, t0 = 0, timer = null, used = false, firstMove = false;
  const rated = mode === "rated";
  const title = mode === "theme" ? THEMES[arg] || arg : mode === "daily" ? "Daily puzzle" : mode === "custom" ? `${arg === "any" ? "Custom" : THEMES[arg] || arg} · ${arg2}` : mode === "range" ? "Puzzles " + arg : "Rated puzzles";
  root.className = "view";
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2 style="font-size:26px">${esc(title)}</h2><span class="badge-pill acc pr"></span></div>
    <div class="lesson-layout"><div class="lb"><div id="pzb"></div></div>
    <div class="lt"><div class="pz-status"><span class="sw"></span><span class="msg grow">Loading…</span><span class="pz-time num tiny muted"></span></div>
      <div class="row gap mt-s small muted pz-meta"><span>Streak <b class="pz-streak">${s.puzzle.streak}</b></span><span class="pz-stake"></span></div>
      <div class="tags chips mt-s"></div>
      <div class="row gap mt"><button class="btn grow hint">${I.bulb} Hint</button><button class="btn grow sol">Solution</button><button class="btn primary grow next hide">Next ›</button></div>
      <div class="row gap mt"><button class="btn sm ghost an">${I.analysis} Analyse</button><button class="btn sm ghost rt hide">${I.undo} Retry</button></div>
    </div></div>`;
  $(".back", root).onclick = () => back();
  const tick = () => { const el = $(".pz-time", root); if (el && t0) el.textContent = fmtClock(performance.now() - t0); };
  function record(ok, ms) {
    s.puzzle.seen.push(cur.id);
    if (ok) { s.puzzle.solved++; s.puzzle.streak++; s.puzzle.best = Math.max(s.puzzle.best, s.puzzle.streak); } else { s.puzzle.failed++; s.puzzle.streak = 0; }
    for (const t of cur.themes) { const ts = s.puzzle.themeStats[t] || (s.puzzle.themeStats[t] = { n: 0, ok: 0 }); ts.n++; if (ok) ts.ok++; }
    let delta = null;
    if (rated) delta = ratePuzzle(cur.rating, ok);
    if (mode === "daily") { s.puzzle.dailyDone = today(); (s.dailyPuzzle || (s.dailyPuzzle = {}))[today()] = { ok, id: cur.id }; }
    (s.puzzleHist || (s.puzzleHist = [])).push([Date.now(), cur.id, cur.rating, ok ? 1 : 0, Math.round(ms), delta, mode]);
    if (s.puzzleHist.length > 1500) s.puzzleHist = s.puzzleHist.slice(-1500);
    s.daily.puzzles++; touchStreak(); s.xp += ok ? 3 : 1;
    save();
    checkAchievements({ event: "puzzle", delay: 900 });
    return delta;
  }
  async function next() {
    const list = await db();
    if (!alive) return;
    const seen = new Set(s.puzzle.seen);
    let a;
    if (mode === "daily") { const d = today(); let hh = 0; for (const ch of d) hh = (hh * 31 + ch.charCodeAt(0)) >>> 0; const pool = list.filter((p) => p[2] > 1100 && p[2] < 1900); a = pool[hh % pool.length]; }
    else if (mode === "theme") a = pickPuzzle(list, pzRating(), seen, (p) => p[3].split(" ").includes(arg));
    else if (mode === "custom") { const [lo, hi] = arg2.split("-").map(Number); a = pickPuzzle(list, (lo + hi) / 2, seen, (p) => p[2] >= lo && p[2] <= hi && (arg === "any" || p[3].split(" ").includes(arg))); }
    else if (mode === "range") { const [lo, hi] = arg.split("-").map(Number); a = pickPuzzle(list, (lo + hi) / 2, seen, (p) => p[2] >= lo && p[2] <= hi); }
    else if (mode === "id") a = list.find((p) => p[4] === arg) || list[0];
    else a = pickPuzzle(list, pzRating(), seen);
    cur = toP(a);
    if (player) player.destroy();
    const holder = $("#pzb", root); holder.innerHTML = ""; const bd = document.createElement("div"); holder.appendChild(bd);
    $(".next", root).classList.add("hide"); $(".rt", root).classList.add("hide"); $(".tags", root).innerHTML = "";
    $(".hint", root).disabled = false; $(".sol", root).disabled = false;
    used = false; firstMove = false; t0 = 0; clearInterval(timer); $(".pz-time", root).textContent = "";
    if (rated) { const pv = previewPuzzle(cur.rating); $(".pr", root).textContent = s.ratings.puzzle.r ? s.ratings.puzzle.r : "Unrated"; $(".pz-stake", root).innerHTML = `Puzzle ${cur.rating} · ${deltaPill(pv.win)} ${deltaPill(pv.loss)}`; }
    else $(".pz-stake", root).textContent = `Puzzle ${cur.rating}`;
    player = puzzlePlayer(bd, cur, {
      onMove: () => { if (!firstMove) firstMove = true; },
      onStatus: (st, san) => {
        const box = $(".pz-status", root); box.classList.remove("ok", "bad");
        $(".sw", root).style.background = player && player.userColor === "w" ? "#fff" : "#222";
        if (st === "yourturn") { $(".msg", root).textContent = `${player && player.userColor === "w" ? "White" : "Black"} to move — find the best move`; if (!t0) { t0 = performance.now(); timer = setInterval(tick, 200); } }
        if (st === "good") $(".msg", root).textContent = "Best move! Keep going…";
        if (st === "wrong") { box.classList.add("bad"); $(".msg", root).textContent = `${san} isn't it.`; }
        if (st === "solved") { box.classList.add("ok"); $(".msg", root).textContent = used ? "Solved (with help)." : "Solved!"; }
      },
      onDone: (ok) => {
        clearInterval(timer);
        const ms = t0 ? performance.now() - t0 : 0;
        const delta = record(ok && !used, ms);
        $(".pz-streak", root).textContent = s.puzzle.streak;
        if (delta != null) { $(".pr", root).innerHTML = `${s.ratings.puzzle.r} ${deltaPill(delta)}`; }
        $(".tags", root).innerHTML = themeTags(cur);
        $(".next", root).classList.remove("hide");
        if (!ok) $(".rt", root).classList.remove("hide");
        $(".hint", root).disabled = true;
      },
    });
    // hint and solution count as a fail
    $(".hint", root).onclick = () => { used = true; player.hint(); };
    $(".sol", root).onclick = () => {
      if ($(".next", root).classList.contains("hide")) { clearInterval(timer); const d = record(false, t0 ? performance.now() - t0 : 0); if (d != null) $(".pr", root).innerHTML = `${s.ratings.puzzle.r} ${deltaPill(d)}`; $(".tags", root).innerHTML = themeTags(cur); $(".pz-streak", root).textContent = s.puzzle.streak; }
      used = true; player.solution(); $(".next", root).classList.remove("hide"); $(".hint", root).disabled = true;
    };
    $(".rt", root).onclick = () => { const again = { ...cur, _retry: true }; player.destroy(); const h2 = $("#pzb", root); h2.innerHTML = ""; const b2 = document.createElement("div"); h2.appendChild(b2); player = puzzlePlayer(b2, again, { onStatus: () => {}, onDone: (ok2) => ok2 && toast("Solved on retry ✓") }); };
    $(".an", root).onclick = () => go("analysis/" + encodeURIComponent(JSON.stringify({ startFen: player.startFen(), moves: [], orientation: player.userColor })));
  }
  $(".next", root).onclick = () => (mode === "daily" ? go("daily") : next());
  next().catch((e) => ($(".msg", root).textContent = "Couldn't load puzzles: " + e.message));
  return () => { alive = false; clearInterval(timer); player && player.destroy(); };
}

// ---------- Daily puzzle with a calendar streak ----------
function dailyStreak(d) { let n = 0; const t = new Date(); for (;;) { const k = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); if (d[k]) { n++; t.setDate(t.getDate() - 1); } else if (n === 0 && k === today()) { t.setDate(t.getDate() - 1); } else break; } return n; }
export function renderDaily(root) {
  const s = state();
  const d = s.dailyPuzzle || {};
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  const key = (dd) => `${y}-${String(m + 1).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  let cells = "";
  for (let i = 0; i < (first + 6) % 7; i++) cells += `<i></i>`;
  for (let dd = 1; dd <= days; dd++) { const k = key(dd), v = d[k]; cells += `<i class="${v ? (v.ok ? "ok" : "miss") : ""} ${k === today() ? "today" : ""}">${dd}</i>`; }
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Daily puzzle</h2></div>
    <div class="grid" style="max-width:560px">
      <div class="card"><div class="row between"><div><div class="eyebrow">Calendar streak</div><div class="big-num">${dailyStreak(d)}<span class="small muted"> days</span></div></div>${ring(Object.keys(d).filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).length / days, { size: 64, label: Object.keys(d).filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, "0")}`)).length + "" })}</div>
        <div class="eyebrow mt">${now.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
        <div class="cal mt-s"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b>${cells}</div></div>
      <button class="btn primary big go">${d[today()] ? "Replay today's puzzle" : "Solve today's puzzle"}</button>
    </div>`;
  $(".back", root).onclick = () => back();
  $(".go", root).onclick = () => go("puzzle/daily");
}

// ---------- Puzzle Rush ----------
export function renderRush(root) {
  const s = state();
  let killRun = () => {};
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Puzzle Rush</h2></div>
    <div class="grid" style="max-width:560px">
      <p class="muted">Solve as many as you can. Puzzles start easy and get harder with every one you solve.</p>
      ${[["r3", "3 minutes", "Fast. Three strikes and you're out.", I.timer], ["r5", "5 minutes", "More time to think.", I.timer], ["survival", "Survival", "No clock. Three strikes.", I.fire]].map(([k, t, d, ic]) => `<button class="tile" data-k="${k}"><div class="ic" style="background:linear-gradient(135deg,#ff5f6d,#b3123a)">${ic}</div><div class="grow"><div class="t">${t}</div><div class="s">${d} · Best ${s.rush.best[k] || 0}</div></div><span class="chev">›</span></button>`).join("")}
    </div>`;
  $(".back", root).onclick = () => back();
  $$("[data-k]", root).forEach((b) => (b.onclick = () => rush(b.dataset.k)));
  return () => killRun();

  async function rush(kind) {
    const list = await db();
    const limit = kind === "r3" ? 180000 : kind === "r5" ? 300000 : null;
    let score = 0, strikes = 0, level = Math.max(400, Math.min(900, pzRating() - 500)), t0 = performance.now(), timer = null, player = null, over = false;
    const log = [];
    killRun = () => { over = true; clearInterval(timer); player && player.destroy(); };
    const used = new Set();
    root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Rush</h2><span class="big-timer tm">${limit ? fmtClock(limit) : ""}</span></div>
      <div class="lesson-layout"><div class="lb"><div id="rb"></div></div><div class="lt">
      <div class="row between"><div class="stat" style="padding:10px 16px"><div class="k">Score</div><div class="v sc">0</div></div><div class="strikes" aria-label="Strikes">${"<i></i>".repeat(3)}</div></div>
      <div class="rush-strip mt strip"></div><button class="btn ghost mt quit">End run</button></div></div>`;
    $(".back", root).onclick = () => { end(); back(); };
    $(".quit", root).onclick = () => end();
    const strip = $(".strip", root);
    function nextP() {
      if (over) return;
      const a = pickPuzzle(list, level, used); used.add(a[4]);
      const p = toP(a);
      if (player) player.destroy();
      const holder = $("#rb", root); holder.innerHTML = ""; const bd = document.createElement("div"); holder.appendChild(bd);
      player = puzzlePlayer(bd, p, {
        onDone: (ok) => {
          if (over) return;
          log.push({ ...p, ok });
          strip.insertAdjacentHTML("beforeend", `<i class="${ok ? "ok" : "bad"}">${ok ? "✓" : "✕"}</i>`);
          if (ok) { score++; level += score < 10 ? 70 : 45; countTo($(".sc", root), score - 1, score, { duration: 0.3 }); }
          else { strikes++; $$(".strikes i", root).forEach((x, i) => x.classList.toggle("on", i < strikes)); if (strikes >= 3) return end(); }
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
      for (const x of log) s.puzzle.seen.push(x.id);
      save();
      checkAchievements({ event: "rush", delay: 1200 });
      if (score > best && score >= 5) celebrate({ big: score >= 20 });
      // results: every puzzle with ✓ or ✗, tap to review
      root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Rush results</h2></div>
        <div class="grid" style="max-width:560px">
          <div class="hero tc"><div class="eyebrow">${kind === "survival" ? "Survival" : kind === "r3" ? "3 minutes" : "5 minutes"}</div><div class="big-num fsc">0</div><div class="small mt-s">${score > best ? "🏆 New personal best!" : `Personal best: ${best}`}</div></div>
          <div class="card"><div class="eyebrow mb">${log.length} puzzles</div><div class="list">${log.map((x, i) => `<div class="list-row rr" data-i="${i}"><span class="cls-badge lg" style="background:${x.ok ? "var(--good)" : "var(--bad)"};border-radius:9px">${x.ok ? "✓" : "✕"}</span><div class="grow"><b class="small">Puzzle ${i + 1}</b><div class="tiny muted">${x.rating} · ${x.themes.filter((t) => THEMES[t] && !META.has(t)).slice(0, 2).map((t) => THEMES[t]).join(", ")}</div></div><span class="chev">›</span></div>`).join("") || '<div class="small muted">No puzzles played.</div>'}</div></div>
          <button class="btn primary big again">Play again</button>
        </div>`;
      countTo($(".fsc", root), 0, score, { duration: 1 });
      $(".back", root).onclick = () => renderRush(root);
      $(".again", root).onclick = () => rush(kind);
      $$(".rr", root).forEach((r) => (r.onclick = () => { const x = log[+r.dataset.i]; const c = new Chess(x.fen); let after = x.fen; try { c.move({ from: x.moves[0].slice(0, 2), to: x.moves[0].slice(2, 4), promotion: x.moves[0][4] }); after = c.fen(); } catch {} lineViewer({ title: `Puzzle ${+r.dataset.i + 1} · ${x.rating}`, fen: after, pv: x.moves.slice(1), orientation: c.turn(), coach: coachFor("tactics"), intro: x.ok ? "You solved this one. The full solution:" : "Here's what you missed:", outro: "" }); }));
    }
    if (limit) timer = setInterval(() => { const left = limit - (performance.now() - t0); const tm = $(".tm", root); if (!tm) return killRun(); tm.textContent = fmtClock(left); tm.classList.toggle("low", left < 15000); if (left <= 0) end(); }, 200);
    nextP();
  }
}

// ---------- Puzzle Duel vs a bot ----------
export function renderDuel(root) {
  const s = state();
  let kill = () => {};
  const my = pzRating();
  const opps = ALL_BOTS.filter((b) => b.style !== "engine").sort((a, b) => Math.abs(a.elo - my) - Math.abs(b.elo - my)).slice(0, 6).sort((a, b) => a.elo - b.elo);
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Puzzle Duel</h2></div>
    <div class="grid" style="max-width:560px"><p class="muted">Race a bot through the same puzzles on the same 3-minute clock. Its speed and accuracy follow its rating. Most solved wins.</p>
    ${opps.map((b) => `<button class="tile" data-id="${b.id}">${avatar(b, 52)}<div class="grow"><div class="t">${esc(b.name)}</div><div class="s">${b.elo} · ${(s.duels || []).filter((d) => d.bot === b.id && d.won).length} wins vs them</div></div><span class="chev">›</span></button>`).join("")}</div>`;
  $(".back", root).onclick = () => back();
  $$("[data-id]", root).forEach((b) => (b.onclick = () => duel(botById(b.dataset.id))));
  return () => kill();

  async function duel(bot) {
    const list = await db();
    const LIMIT = localStorage.getItem("noir.test") ? 20000 : 180000;
    const used = new Set(), seq = [];
    let level = Math.max(500, Math.min(my, bot.elo) - 300);
    const nextPz = (i) => { while (seq.length <= i) { const a = pickPuzzle(list, level, used); used.add(a[4]); seq.push(toP(a)); level += 55; } return seq[i]; };
    let me = 0, them = 0, mi = 0, bi = 0, over = false, player = null, t0 = performance.now(), timer = null, botTimer = null;
    kill = () => { over = true; clearInterval(timer); clearTimeout(botTimer); player && player.destroy(); };
    root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Duel</h2><span class="big-timer tm">${fmtClock(LIMIT)}</span></div>
      <div class="duel-bar"><div class="dl me">${avatar(userUser(), 40)}<div class="grow"><div class="small bold">You</div><div class="dtrack"><i class="dfill mef"></i></div></div><b class="num msc">0</b></div>
        <div class="dl them">${avatar(bot, 40)}<div class="grow"><div class="small bold">${esc(bot.name)} <span class="muted">${bot.elo}</span></div><div class="dtrack"><i class="dfill thf"></i></div></div><b class="num tsc">0</b></div></div>
      <div class="lesson-layout"><div class="lb"><div id="db"></div></div><div class="lt"><div class="pz-status"><span class="msg">Go!</span></div></div></div>`;
    $(".back", root).onclick = () => { kill(); renderDuel(root); };
    const bars = () => { $(".msc", root).textContent = me; $(".tsc", root).textContent = them; const mx = Math.max(6, me, them); $(".mef", root).style.width = (me / mx) * 100 + "%"; $(".thf", root).style.width = (them / mx) * 100 + "%"; };
    function mine() {
      if (over) return;
      const p = nextPz(mi);
      if (player) player.destroy();
      const holder = $("#db", root); holder.innerHTML = ""; const bd = document.createElement("div"); holder.appendChild(bd);
      player = puzzlePlayer(bd, p, { onDone: (ok) => { if (over) return; if (ok) me++; mi++; bars(); $(".msg", root).textContent = ok ? "Solved! Next…" : "Missed. Next…"; setTimeout(mine, ok ? 250 : 650); } });
    }
    // the bot: time per puzzle grows with difficulty, accuracy from the rating difference
    function botStep() {
      if (over) return;
      const p = nextPz(bi);
      const diff = p.rating - bot.elo;
      const ms = Math.max(2500, (6000 + p.moves.length * 2500) * Math.pow(2, diff / 500) * (0.75 + Math.random() * 0.5));
      botTimer = setTimeout(() => { if (over) return; const pOk = 1 / (1 + Math.pow(10, diff / 400)); if (Math.random() < pOk) them++; bi++; bars(); botStep(); }, localStorage.getItem("noir.test") ? Math.min(ms, 2500) : ms);
    }
    timer = setInterval(() => { const left = LIMIT - (performance.now() - t0); const tm = $(".tm", root); if (!tm) return kill(); tm.textContent = fmtClock(left); if (left <= 0) end(); }, 200);
    function end() {
      if (over) return; kill();
      const won = me > them;
      (s.duels || (s.duels = [])).push({ t: Date.now(), bot: bot.id, me, them, won });
      s.daily.puzzles += me; touchStreak(); s.xp += me * 2; save();
      checkAchievements({ event: "duel", delay: 1200 });
      if (won) celebrate({ big: true });
      sfx(won ? "win" : me === them ? "draw" : "lose");
      sheet(`<div class="result-card"><div class="res-t">${won ? "You won the duel!" : me === them ? "A tie" : `${esc(bot.name)} wins`}</div><div class="res-s">${me} – ${them}</div>
        <div class="vs"><div class="col" style="align-items:center;gap:6px">${avatar(userUser(), 64, "", won ? "win" : "")}<b class="small">You · ${me}</b></div><div class="display" style="font-size:22px;color:var(--mut)">vs</div><div class="col" style="align-items:center;gap:6px">${avatar(bot, 64, "", !won && me !== them ? "win" : "")}<b class="small">${esc(bot.name)} · ${them}</b></div></div>
        <button class="btn primary big again">Rematch</button></div>`, { title: "" }).el.querySelector(".again").onclick = (e) => { e.target.closest(".sheet-back").remove(); duel(bot); };
    }
    bars(); mine(); botStep();
  }
}

// ---------- My mistakes ----------
export function renderMistakes(root) {
  const s = state();
  const list = s.mistakes.filter((m) => m.solved < 2);
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>My mistakes</h2><span class="badge-pill">${list.length} left</span></div>
    <p class="muted small">Every mistake and blunder from your reviewed games lands here. Find the move you missed — twice — to clear it.</p>
    <div class="lesson-layout"><div class="lb"><div id="mb"></div></div><div class="lt"><div class="pz-status"><span class="sw"></span><span class="msg"></span></div><div class="small muted mt-s meta"></div>
    <div class="row gap mt"><button class="btn grow sol">Show answer</button><button class="btn primary grow next">Next ›</button></div></div></div>`;
  $(".back", root).onclick = () => back();
  if (!list.length) { $(".lesson-layout", root).innerHTML = emptyState("Nothing to fix yet", "Play games and run Game Review — your mistakes turn into puzzles here."); return; }
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
        if (st === "wrong") { $(".pz-status", root).classList.add("bad"); $(".msg", root).textContent = san + " — not that. Try again."; }
        if (st === "solved") { m.solved++; $(".pz-status", root).classList.remove("bad"); $(".pz-status", root).classList.add("ok"); $(".msg", root).textContent = "Correct! " + m.bestSan + (m.solved >= 2 ? " — cleared ✓" : " — once more to clear it"); state().daily.puzzles++; touchStreak(); save(); }
      },
    });
  }
  $(".sol", root).onclick = () => player.solution();
  $(".next", root).onclick = () => { i++; show(); };
  show();
  return () => player && player.destroy();
}

// ---------- Puzzle stats ----------
export function renderStats(root) {
  const s = state();
  const R = s.ratings.puzzle;
  const th = Object.entries(s.puzzle.themeStats).filter(([t, v]) => THEMES[t] && !META.has(t) && v.n >= 3).map(([t, v]) => ({ t, n: v.n, acc: v.ok / v.n })).sort((a, b) => b.n - a.n);
  const weakest = th.filter((x) => x.n >= 5).sort((a, b) => a.acc - b.acc).slice(0, 3);
  const untried = KEY_THEMES.find((t) => !s.puzzle.themeStats[t] || s.puzzle.themeStats[t].n < 5);
  const rec = weakest[0] ? weakest[0].t : untried || "fork";
  const hist = (s.puzzleHist || []).slice(-40).reverse();
  const total = s.puzzle.solved + s.puzzle.failed;
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Puzzle stats</h2></div>
    <div class="grid" style="max-width:760px">
      <div class="grid three"><div class="stat tc"><div class="k">Rating</div><div class="v">${R.r || "—"}</div></div><div class="stat tc"><div class="k">Best</div><div class="v">${R.best || "—"}</div></div><div class="stat tc"><div class="k">Accuracy</div><div class="v">${total ? Math.round((s.puzzle.solved / total) * 100) + "%" : "—"}</div></div></div>
      <div class="card"><h3>Rating</h3>${ratingChart(R.hist)}</div>
      <button class="tile recm"><div class="ic" style="background:linear-gradient(135deg,var(--acc2),var(--acc-d))">${I.target}</div><div class="grow"><div class="eyebrow">Recommended for you</div><div class="t">${THEMES[rec]} ×10</div><div class="s">${weakest[0] ? `Your weakest theme (${Math.round(weakest[0].acc * 100)}%)` : "A key theme you haven't trained much yet"}</div></div><span class="chev">›</span></button>
      <div class="card"><h3>Accuracy by theme</h3>${th.length ? th.slice(0, 16).map((x) => `<div class="tbar" data-t="${x.t}"><span class="small grow">${THEMES[x.t]}</span><span class="tiny muted">${x.n}</span><div class="bar"><i style="width:${Math.round(x.acc * 100)}%;background:${x.acc >= 0.7 ? "var(--good)" : x.acc >= 0.45 ? "var(--gold)" : "var(--bad)"}"></i></div><b class="tiny">${Math.round(x.acc * 100)}%</b></div>`).join("") : emptyState("No themes yet", "Solve a few puzzles to see your theme accuracy.")}</div>
      ${weakest.length ? `<div class="card"><h3>Weakest themes</h3>${weakest.map((x) => `<a class="list-row" href="#/puzzle/theme/${x.t}" style="color:inherit"><div class="grow bold small">${THEMES[x.t]}</div><span class="badge-pill red">${Math.round(x.acc * 100)}%</span></a>`).join("")}</div>` : ""}
      <div class="card"><h3>History</h3>${hist.length ? hist.map(([t, id, pr, ok, ms, d]) => `<div class="list-row ph" data-id="${id}"><span class="cls-badge" style="background:${ok ? "var(--good)" : "var(--bad)"}">${ok ? "✓" : "✕"}</span><div class="grow small">${pr} · ${fmtClock(ms)}</div>${d != null ? deltaPill(d) : ""}<span class="tiny muted">${timeAgo(t)}</span></div>`).join("") : '<div class="small muted">No puzzles yet.</div>'}</div>
    </div>`;
  $(".back", root).onclick = () => back();
  $(".recm", root).onclick = () => go("puzzle/theme/" + rec);
  $$(".tbar", root).forEach((b) => (b.onclick = () => go("puzzle/theme/" + b.dataset.t)));
  $$(".ph", root).forEach((r) => (r.onclick = () => go("puzzle/id/" + r.dataset.id)));
}
