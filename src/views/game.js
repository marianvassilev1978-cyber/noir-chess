// The game screen: play a bot (or a friend on the same phone) with clocks, premoves and a live coach.
import { Chess } from "chess.js";
import { $, h, esc, md, fmtClock, sheet, toast, confirmSheet, uid, pick } from "../util.js";
import { Board, destsOf, checkSquare, badgeHTML, CLS } from "../board.js";
import { state, save, catOf, rateGame, currentRating, touchStreak } from "../store.js";
import { botMove, botById, customBot, BOT_LINES } from "../bots.js";
import { ANA, PLAY } from "../engine.js";
import { evalPosition, classify, uciOf, winFor, sanOf } from "../analysis.js";
import { liveLine, explainPly } from "../coach.js";
import { play as sfx, moveSound } from "../sound.js";
import { playerBar, capturedHTML, moveStrip, EvalBar, lineViewer, userPlayer, avatar } from "../ui.js";
import { openingOf, loadEco } from "../eco.js";
import { I } from "../icons.js";
import { go } from "../router.js";

let G = null; // current game

export function newGame(cfg) {
  const s = state();
  const bot = cfg.bot || (cfg.botId ? botById(cfg.botId) : null) || customBot(cfg.elo || 800);
  let color = cfg.color === "random" || !cfg.color ? (Math.random() < 0.5 ? "w" : "b") : cfg.color;
  if (bot.white && cfg.color === "auto") color = "b";
  const [m, inc] = cfg.tc && cfg.tc !== "none" ? cfg.tc.split("+").map(Number) : [null, 0];
  G = {
    id: uid(), date: Date.now(), mode: cfg.mode || "bot", bot, color, tc: cfg.tc || "none", cat: catOf(cfg.tc),
    rated: !!cfg.rated, startFen: cfg.startFen || null, moves: [], clocks: m != null ? { w: m * 60000, b: m * 60000 } : null, inc: (inc || 0) * 1000,
    result: null, termination: null, takebacks: 0, hints: 0, cls: [], evals: {}, placement: cfg.placement || null, startedAt: Date.now(), lastTick: null,
    userRating: currentRating(catOf(cfg.tc)) || (s.placement && s.placement.rating) || null, drawOffered: 0,
  };
  s.live = serialize();
  save();
  go("game");
}

function serialize() {
  if (!G) return null;
  const { evals, ...rest } = G;
  return JSON.parse(JSON.stringify({ ...rest, botId: G.bot.id, bot: G.bot }));
}
export function resumeLive() { const L = state().live; if (!L) return false; G = { ...L, evals: {}, lastTick: null }; return true; }
export const hasGame = () => !!G && !G.result;

export function render(root) {
  if (!G) { if (!resumeLive()) { go("play"); return; } }
  const g = G;
  const chess = new Chess(g.startFen || undefined);
  for (const m of g.moves) chess.move(m);
  const user = g.mode === "friend" ? { name: "White", av: "♔", bg: "linear-gradient(135deg,#eee,#bbb)" } : userPlayer();
  const opp = g.mode === "friend" ? { name: "Black", av: "♚", bg: "linear-gradient(135deg,#444,#111)" } : g.bot;
  const userColor = g.mode === "friend" ? "both" : g.color;
  const orient = g.mode === "friend" ? "w" : g.color;
  const practice = !g.rated && g.mode === "bot" && !g.placement;

  root.className = "view full";
  root.innerHTML = `<div class="game fade-in">
    <div class="board-col">
      <div class="top-bar">${playerBar(opp, { rating: g.mode === "friend" ? null : g.bot.elo, color: orient === "w" ? "b" : "w", clock: !!g.clocks })}</div>
      <div class="board-row"><div class="eb ${state().settings.evalBar && practice ? "" : "hide"}"></div><div class="board-holder"><div id="bd"></div></div></div>
      <div class="bot-bar">${playerBar(user, { rating: g.mode === "friend" ? null : g.userRating, color: orient, clock: !!g.clocks })}</div>
    </div>
    <div class="side-panel">
      <div class="movelist" id="ml"></div>
      <div class="coach-area"></div>
      <div class="ctrl">
        <button class="icon-btn" id="b-flip" title="Flip">${I.flip}</button>
        <button class="icon-btn" id="b-prev">${I.prev}</button>
        <button class="icon-btn" id="b-next">${I.next}</button>
        ${practice || g.mode === "friend" ? `<button class="icon-btn" id="b-undo" title="Take back">${I.undo}</button>` : ""}
        ${practice ? `<button class="icon-btn" id="b-hint" title="Hint">${I.bulb}</button>` : ""}
        <button class="icon-btn" id="b-draw" title="Offer draw">½</button>
        <button class="icon-btn" id="b-resign" title="Resign">${I.flag}</button>
      </div>
      <div class="game-info small muted" style="padding:8px 12px"></div>
    </div>
  </div>`;

  const board = new Board($("#bd", root), { orientation: orient, onMove: userMove, onPremove: setPremove });
  const eb = new EvalBar($(".eb", root));
  let viewPly = null; // null = live
  let alive = true, tickTimer = null, abort = new AbortController(), premove = null, botThinking = false, lowWarned = { w: false, b: false };
  const coachArea = $(".coach-area", root);
  loadEco().then(() => updateInfo()).catch(() => {});

  function fens() { const c = new Chess(g.startFen || undefined); const out = [c.fen()]; for (const m of g.moves) { c.move(m); out.push(c.fen()); } return out; }

  function updateInfo() {
    const o = openingOf(fens());
    const tcName = g.tc === "none" ? "Unlimited" : g.tc.replace("+", " | ");
    $(".game-info", root).innerHTML = `${g.placement ? `Placement game ${g.placement.i + 1}/5 · ` : ""}${g.rated ? "Rated" : g.mode === "friend" ? "Pass & play" : "Practice"} · ${tcName}${o ? ` · <b>${esc(o.eco)}</b> ${esc(o.name)}` : ""}`;
  }

  function sync(animate = true) {
    const live = viewPly === null;
    const c = new Chess(g.startFen || undefined);
    const upto = live ? g.moves.length : viewPly + 1;
    let last = null;
    for (let i = 0; i < upto; i++) last = c.move(g.moves[i]);
    board.setFen(c.fen(), { animate, lastMove: last ? [last.from, last.to] : null, check: checkSquare(c) });
    const canMove = live && !g.result && (userColor === "both" ? true : c.turn() === userColor) && !botThinking;
    board.setMovable(canMove ? (userColor === "both" ? c.turn() : userColor) : null, canMove ? destsOf(c) : null);
    board.o.premoveColor = live && !g.result && userColor !== "both" && c.turn() !== userColor ? userColor : null;
    // badges for the last move shown
    const idx = upto - 1;
    const showCls = practice || g.result;
    const mineIdx = idx >= 0 && (userColor === "both" || last.color === userColor || g.result);
    board.setBadges(mineIdx && g.cls[idx] && showCls && state().settings.classOnBoard ? [{ sq: last.to, cls: g.cls[idx] }] : []);
    board.setArrows([]);
    // captured / material
    $(".top-bar .caps", root).innerHTML = capturedHTML(c, orient === "w" ? "b" : "w");
    $(".bot-bar .caps", root).innerHTML = capturedHTML(c, orient);
    moveStrip($("#ml", root), sanList(), live ? g.moves.length - 1 : viewPly, showCls ? g.cls : null, (i) => { viewPly = i >= g.moves.length - 1 ? null : i; sync(false); });
    const e = g.evals[upto];
    if (e) eb.set(e.top, board.orientation);
    drawClocks();
  }
  const sanList = () => g.moves;

  function drawClocks() {
    if (!g.clocks) return;
    const c = new Chess(g.startFen || undefined); // cheap: turn from move count
    const turn = ((g.startFen ? g.startFen.split(" ")[1] : "w") === "w") === (g.moves.length % 2 === 0) ? "w" : "b";
    for (const el of root.querySelectorAll(".clock")) {
      const col = el.dataset.color;
      const t = g.clocks[col];
      el.querySelector(".t").textContent = fmtClock(t);
      el.classList.toggle("run", !g.result && turn === col && g.moves.length >= (col === "w" ? 0 : 1) && g.lastTick != null);
      el.classList.toggle("low", t < 20000);
    }
  }

  function turnNow() { const c = new Chess(g.startFen || undefined); for (const m of g.moves) c.move(m); return c; }

  function tick() {
    if (!g.clocks || g.result || g.lastTick == null) return;
    const now = performance.now();
    const dt = now - g.lastTick; g.lastTick = now;
    const turn = turnNow().turn();
    g.clocks[turn] = Math.max(0, g.clocks[turn] - dt);
    if (g.clocks[turn] < 15000 && !lowWarned[turn] && (userColor === "both" || turn === userColor)) { lowWarned[turn] = true; sfx("lowtime"); }
    if (g.clocks[turn] <= 0) {
      // flag: loss unless the opponent cannot possibly mate
      const c = turnNow();
      const other = turn === "w" ? "b" : "w";
      const insuff = onlyKingOrMinor(c, other);
      finish(insuff ? "1/2-1/2" : other === "w" ? "1-0" : "0-1", insuff ? "timeout vs insufficient material" : "time");
    }
    drawClocks();
  }
  function onlyKingOrMinor(c, color) {
    let n = 0, minors = 0;
    for (const row of c.board()) for (const p of row) if (p && p.color === color && p.type !== "k") { n++; if (p.type === "n" || p.type === "b") minors++; }
    return n === 0 || (n === 1 && minors === 1);
  }

  async function analyseAt(ply) {
    if (g.evals[ply]) return g.evals[ply];
    const f = fens()[ply];
    const e = await evalPosition(f, { depth: 13, movetime: 1500, multipv: 2, signal: abort.signal });
    e.fen = f;
    g.evals[ply] = e;
    return e;
  }

  async function coachMove(ply) {
    // classify the move that led from ply to ply+1
    if (!(practice || g.mode === "friend") || !state().settings.coachLive) return;
    try {
      const [before, after] = await Promise.all([analyseAt(ply), analyseAt(ply + 1)]);
      if (!alive) return;
      const fs = fens();
      const c = new Chess(fs[ply]);
      const legal = c.moves().length;
      const m = c.move(g.moves[ply]);
      const prevPly = ply > 0 ? g.cls[ply - 1] : null;
      const r = classify({ fenBefore: fs[ply], uci: uciOf(m), color: m.color, before, after, prevCls: prevPly, legalCount: legal, ply });
      g.cls[ply] = r.cls;
      const p = { i: ply, san: m.san, uci: uciOf(m), color: m.color, fenBefore: fs[ply], fenAfter: fs[ply + 1], evalBefore: before.top, evalAfter: after.top, best: before.best, bestSan: before.best ? sanOf(fs[ply], before.best) : null, bestPv: before.top.pv || [], replyPv: after.top.pv || [], ...r };
      if (userColor === "both" || m.color === userColor) showCoach(p);
      if (viewPly === null && g.moves.length - 1 === ply) sync(false);
      else moveStrip($("#ml", root), sanList(), viewPly === null ? g.moves.length - 1 : viewPly, g.cls, (i) => { viewPly = i >= g.moves.length - 1 ? null : i; sync(false); });
      eb.set(after.top, board.orientation);
    } catch (e) { if (e.name !== "AbortError") console.warn(e); }
  }

  function showCoach(p) {
    const L = liveLine(p);
    const bad = ["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls);
    coachArea.innerHTML = `<div class="coachbox fade-in"><div class="face">♞</div><div class="bubble">
      <div class="head">${badgeHTML(p.cls)} <span>${esc(p.san)} — ${esc(L.title)}</span></div>
      ${L.text ? `<div class="small">${md(L.text)}</div>` : ""}
      ${bad ? `<div class="row gap-s wrap mt-s"><button class="btn sm c-better">▶ Show better</button><button class="btn sm ghost c-why">▶ Why it's worse</button>${practice ? '<button class="btn sm ghost c-retry">↺ Retry</button>' : ""}<button class="btn sm ghost c-more">More</button></div>` : ""}
    </div></div>`;
    const b = $(".c-better", coachArea);
    if (b) {
      b.onclick = () => lineViewer({ title: "Better: " + p.bestSan, fen: p.fenBefore, pv: p.bestPv, orientation: board.orientation, intro: `**${p.bestSan}** instead of ${p.san}. Watch how the game would go with best play from both sides.` });
      $(".c-why", coachArea).onclick = () => lineViewer({ title: "Why " + p.san + " is worse", fen: p.fenBefore, pv: [p.uci, ...(p.replyPv || [])], orientation: board.orientation, intro: `You played **${p.san}**. Here is the opponent's best answer.` });
      $(".c-more", coachArea).onclick = () => sheet(`<div class="step-text">${md(explainPly(p))}</div>`, { title: "Coach" });
      const rt = $(".c-retry", coachArea);
      if (rt) rt.onclick = () => takeback(true);
    }
  }

  function setPremove(from, to) {
    premove = from ? [from, to] : null;
    board.setPremove(premove);
  }

  async function userMove(from, to, promo) {
    if (g.result) return;
    const c = turnNow();
    let m;
    try { m = c.move({ from, to, promotion: promo || "q" }); } catch { sync(false); return; }
    // blunder guard (practice): warn before committing a losing move
    if (practice && state().settings.guard) {
      try {
        const ply = g.moves.length;
        const before = await analyseAt(ply);
        const ae = await evalPosition(c.fen(), { depth: 11, movetime: 800, multipv: 1 });
        const loss = winFor(before.top, m.color) - winFor(ae.top, m.color);
        if (loss >= 20 && !(await confirmSheet(`<b>Careful:</b> ${esc(m.san)} looks like a blunder — the engine thinks it throws away a lot. Play it anyway?`, "Play it", "Think again"))) { sync(false); return; }
      } catch {}
    }
    commit(m);
  }

  function commit(m) {
    const moverColor = m.color;
    if (g.clocks) {
      if (g.lastTick == null) g.lastTick = performance.now();
      else { tick(); g.clocks[moverColor] += g.inc; }
      if (g.moves.length === 0) g.lastTick = performance.now();
    }
    g.moves.push(m.san);
    const c = turnNow();
    moveSound(m, c.isGameOver());
    viewPly = null;
    if (userColor === "both" || moverColor === userColor) { premove = null; board.setPremove(null); }
    updateInfo();
    sync(true);
    const ply = g.moves.length - 1;
    coachMove(ply);
    state().live = serialize(); save();
    if (c.isGameOver()) return endByRules(c);
    if (g.mode === "bot" && c.turn() !== g.color) botTurn();
  }

  async function botTurn() {
    botThinking = true;
    sync(false);
    $(".top-bar .think", root).classList.remove("hide");
    try {
      const c = turnNow();
      const uci = await botMove(g.bot, c.fen(), g.moves, g.clocks ? { ms: g.clocks[c.turn()], inc: g.inc } : null, { signal: abort.signal });
      if (!alive || g.result) return;
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      botThinking = false;
      $(".top-bar .think", root).classList.add("hide");
      const pm = premove;
      commit(m);
      // premove
      if (pm && !g.result) {
        const c2 = turnNow();
        premove = null; board.setPremove(null);
        let m2 = null;
        try { m2 = c2.move({ from: pm[0], to: pm[1], promotion: "q" }); } catch {}
        if (m2) setTimeout(() => commit(m2), 60);
      }
    } catch (e) {
      botThinking = false;
      if (e.name !== "AbortError") { console.warn(e); toast("Engine error — tap to retry"); }
    }
  }

  function endByRules(c) {
    if (c.isCheckmate()) finish(c.turn() === "w" ? "0-1" : "1-0", "checkmate");
    else if (c.isStalemate()) finish("1/2-1/2", "stalemate");
    else if (c.isThreefoldRepetition()) finish("1/2-1/2", "repetition");
    else if (c.isInsufficientMaterial()) finish("1/2-1/2", "insufficient material");
    else finish("1/2-1/2", "50-move rule");
  }

  function finish(result, termination) {
    if (g.result) return;
    g.result = result; g.termination = termination;
    clearInterval(tickTimer);
    board.setMovable(null, null);
    const s = state();
    const score = g.mode === "friend" ? null : result === "1/2-1/2" ? 0.5 : (result === "1-0") === (g.color === "w") ? 1 : 0;
    let delta = null;
    if (g.rated && score != null) { delta = rateGame(g.cat, g.bot.elo, score); }
    if (g.mode !== "friend") { s.daily.games++; touchStreak(); s.xp += 10 + (score === 1 ? 10 : 0); }
    const rec = {
      id: g.id, date: g.date, mode: g.mode, botId: g.bot.id, bot: { name: g.bot.name, elo: g.bot.elo, av: g.bot.av, bg: g.bot.bg },
      color: g.color, tc: g.tc, cat: g.cat, rated: g.rated, result, termination, moves: g.moves, startFen: g.startFen, delta, score,
      userRating: g.userRating, placement: g.placement, review: null, cls: g.cls.slice(),
    };
    s.games.push(rec);
    s.live = null;
    if (g.placement) placementStep(rec);
    save();
    sfx(score === 1 ? "win" : score === 0 ? "lose" : "draw");
    sync(false);
    setTimeout(() => resultSheet(rec), 450);
  }

  function placementStep(rec) {
    const s = state();
    const run = s.placementRun || (s.placementRun = { games: [] });
    run.games.push({ elo: rec.bot.elo, score: rec.score });
  }

  function resultSheet(rec) {
    const s = state();
    const won = rec.score === 1, drew = rec.score === 0.5;
    const title = rec.mode === "friend" ? (rec.result === "1-0" ? "White won" : rec.result === "0-1" ? "Black won" : "Draw") : won ? "You won!" : drew ? "Draw" : `${g.bot.name} won`;
    const line = rec.mode === "friend" ? "" : pick(won ? BOT_LINES.lose : drew ? BOT_LINES.draw : BOT_LINES.win);
    const run = s.placementRun;
    let placementHTML = "";
    if (rec.placement) {
      const done = run.games.length >= 5;
      if (done) {
        const perf = Math.round(run.games.reduce((a, x) => a + x.elo + (x.score - 0.5) * 400, 0) / run.games.length);
        const rating = Math.max(100, Math.round(perf / 25) * 25);
        s.placement = { rating, date: Date.now() };
        for (const k of ["bullet", "blitz", "rapid", "classical"]) if (!s.ratings[k].r) s.ratings[k] = { r: rating, games: 0, hist: [[Date.now(), rating]], best: rating };
        s.placementRun = null;
        save();
        placementHTML = `<div class="hero mt"><div class="small muted bold">YOUR STARTING RATING</div><div class="big-num">${rating}</div><div class="small">From 5 placement games. Every rated game moves it from here.</div></div>`;
      } else {
        placementHTML = `<p class="mt">Placement: ${run.games.length}/5 played.</p>`;
      }
    }
    const sh = sheet(`<div class="result-card">
      <div class="res-t">${title}</div>
      <div class="res-s">by ${esc(rec.termination)}</div>
      ${rec.mode !== "friend" ? `<div class="vs"><div class="col" style="align-items:center;gap:4px">${avatar(userPlayer(), 64, "", won ? "win" : "")}<b class="small">You</b></div><div class="muted bold">vs</div><div class="col" style="align-items:center;gap:4px">${avatar(g.bot, 64, "", !won && !drew ? "win" : "")}<b class="small">${esc(g.bot.name)}</b></div></div>` : ""}
      ${line ? `<div class="bubble small" style="display:inline-block;margin-bottom:12px">“${esc(line)}”</div>` : ""}
      ${rec.delta != null ? `<div class="mb">Rating: <b>${s.ratings[rec.cat].r}</b> <span class="${rec.delta >= 0 ? "delta-up" : "delta-down"}">${rec.delta >= 0 ? "+" : ""}${rec.delta}</span></div>` : ""}
      ${placementHTML}
      <div class="col gap mt">
        <button class="btn primary big r-review">${I.analysis} Game Review</button>
        <div class="row gap">
          ${rec.placement && !s.placement ? `<button class="btn grow r-nextp">Next placement game</button>` : `<button class="btn grow r-rematch">Rematch</button><button class="btn grow r-new">New game</button>`}
        </div>
      </div></div>`, { title: "" });
    $(".r-review", sh.el).onclick = () => { sh.close(); go("review/" + rec.id); };
    const rm = $(".r-rematch", sh.el); if (rm) rm.onclick = () => { sh.close(); newGame({ bot: g.bot, color: g.mode === "friend" ? "w" : g.color === "w" ? "b" : "w", tc: g.tc, rated: g.rated, mode: g.mode }); };
    const nw = $(".r-new", sh.el); if (nw) nw.onclick = () => { sh.close(); go("play"); };
    const np = $(".r-nextp", sh.el); if (np) np.onclick = () => { sh.close(); nextPlacement(); };
  }

  async function takeback(silent) {
    if (!g.moves.length || g.result) return;
    abort.abort(); abort = new AbortController(); PLAY.stop();
    botThinking = false;
    $(".top-bar .think", root).classList.add("hide");
    // undo back to the user's turn
    const c = turnNow();
    let n = userColor === "both" ? 1 : c.turn() === userColor ? 2 : 1;
    n = Math.min(n, g.moves.length);
    g.moves.splice(-n); g.cls.splice(g.moves.length);
    for (const k in g.evals) if (+k > g.moves.length) delete g.evals[k];
    g.takebacks++;
    viewPly = null;
    coachArea.innerHTML = silent ? `<div class="coachbox"><div class="face">♞</div><div class="bubble small">Try again — look for checks, captures and threats first.</div></div>` : "";
    state().live = serialize(); save();
    sync(true);
    const c2 = turnNow();
    if (g.mode === "bot" && c2.turn() !== g.color) botTurn();
  }

  // buttons
  $("#b-flip", root).onclick = () => { board.flip(); const tb = $(".top-bar", root).innerHTML; $(".top-bar", root).innerHTML = $(".bot-bar", root).innerHTML; $(".bot-bar", root).innerHTML = tb; sync(false); };
  $("#b-prev", root).onclick = () => { const cur = viewPly === null ? g.moves.length - 1 : viewPly; viewPly = Math.max(-1, cur - 1); sync(false); };
  $("#b-next", root).onclick = () => { if (viewPly === null) return; viewPly = viewPly + 1 >= g.moves.length - 1 ? null : viewPly + 1; sync(false); };
  const ub = $("#b-undo", root); if (ub) ub.onclick = () => takeback(false);
  const hb = $("#b-hint", root);
  if (hb) hb.onclick = async () => {
    if (g.result) return;
    const c = turnNow(); if (c.turn() !== g.color) return;
    g.hints++;
    const e = await analyseAt(g.moves.length);
    if (!e.best) return;
    const fromOnly = !hb.dataset.stage;
    if (fromOnly) { board.setMarks({ [e.best.slice(0, 2)]: "info" }); hb.dataset.stage = "1"; toast("Hint: this piece. Tap again for the move."); }
    else { board.setArrows([{ from: e.best.slice(0, 2), to: e.best.slice(2, 4), color: "b" }]); delete hb.dataset.stage; }
    setTimeout(() => board.setMarks({}), 4000);
  };
  $("#b-draw", root).onclick = async () => {
    if (g.result) return;
    if (g.mode === "friend") { if (await confirmSheet("Agree to a draw?", "Draw")) finish("1/2-1/2", "agreement"); return; }
    if (g.drawOffered && g.moves.length - g.drawOffered < 10) return toast("You offered a draw recently.");
    g.drawOffered = g.moves.length;
    const e = await analyseAt(g.moves.length);
    const botWin = winFor(e.top, g.color === "w" ? "b" : "w");
    const accept = (g.moves.length > 40 && botWin < 58) || botWin < 30;
    if (accept) { toast(`${g.bot.name} accepts the draw.`); finish("1/2-1/2", "agreement"); }
    else toast(`${g.bot.name} declines the draw.`);
  };
  $("#b-resign", root).onclick = async () => {
    if (g.result) { go("review/" + g.id); return; }
    if (g.moves.length < 2 && !g.rated) { state().live = null; save(); G = null; go("play"); return; }
    if (state().settings.confirmResign && !(await confirmSheet("Resign this game?", "Resign"))) return;
    if (g.mode === "friend") { const c = turnNow(); finish(c.turn() === "w" ? "0-1" : "1-0", "resignation"); }
    else finish(g.color === "w" ? "0-1" : "1-0", "resignation");
  };

  const greet = g.mode === "bot" && !g.moves.length ? `<div class="coachbox"><div class="face" style="background:${g.bot.bg}">${esc(g.bot.av)}</div><div class="bubble small"><b>${esc(g.bot.name)}:</b> ${esc(pick(g.bot.hi || ["Good luck!"]))}</div></div>` : "";
  coachArea.innerHTML = greet;
  updateInfo();
  sync(false);
  if (!g.moves.length) sfx("start");
  if (g.clocks) { if (g.moves.length) g.lastTick = performance.now(); tickTimer = setInterval(tick, 100); }
  const c0 = turnNow();
  if (!g.result && g.mode === "bot" && c0.turn() !== g.color) setTimeout(botTurn, 500);

  const onVis = () => { if (document.hidden) { state().live = serialize(); save(); } };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    alive = false; clearInterval(tickTimer); abort.abort(); PLAY.stop(); ANA.clear(); board.destroy();
    document.removeEventListener("visibilitychange", onVis);
    if (G && !G.result) { state().live = serialize(); save(); }
  };
}

// ---------- placement ----------
export function startPlacement(startElo) {
  const s = state();
  s.placementRun = { games: [], start: startElo };
  save();
  newGame({ elo: startElo, bot: placementBot(startElo, 0), color: "w", tc: "10+0", rated: false, placement: { i: 0 } });
}
function placementBot(elo, i) { return { ...customBot(elo), id: "placement-" + i, name: "Placement bot", av: "🎯", hi: ["Let's find your level."] }; }
export function nextPlacement() {
  const s = state();
  const run = s.placementRun;
  if (!run) return go("play");
  const i = run.games.length;
  const last = run.games[i - 1];
  const step = [300, 250, 200, 150][Math.min(i - 1, 3)];
  const elo = Math.max(100, Math.min(2600, last.elo + (last.score === 1 ? step : last.score === 0 ? -step : 0)));
  newGame({ elo, bot: placementBot(elo, i), color: i % 2 ? "b" : "w", tc: "10+0", rated: false, placement: { i } });
}
