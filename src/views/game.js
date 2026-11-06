// The game screen: play a bot, a generated player or a friend on the same phone. Clocks, premoves, confirm-move,
// browsing earlier positions, bot chat, realistic draw offers and resignations, the live coach in casual games,
// and the game-over sheet with the animated rating change and a quick accuracy for both sides.
import { Chess } from "chess.js";
import { $, $$, esc, md, fmtClock, sheet, toast, confirmSheet, uid, pick, copyText } from "../util.js";
import { Board, destsOf, checkSquare, badgeHTML } from "../board.js";
import { state, save, catOf, rateGame, currentRating, touchStreak, isProvisional, previewGame } from "../store.js";
import { botMove, botById, customBot, botLine } from "../bots.js";
import { playerById } from "../players.js";
import { ANA, PLAY } from "../engine.js";
import { evalPosition, classify, uciOf, winFor, sanOf, reviewGame } from "../analysis.js";
import { liveLine, explainPly } from "../coach.js";
import { play as sfx, moveSound } from "../sound.js";
import { playerBar, capturedHTML, moveStrip, EvalBar, lineViewer, userPlayer, avatar, deltaPill } from "../ui.js";
import { openingOf, loadEco } from "../eco.js";
import { I } from "../icons.js";
import { go } from "../router.js";
import { bring, countTo, popIn } from "../art/motion.js";
import { burst, celebrate, haptic } from "../art/fx.js";
import { mainCoach } from "../coaches.js";
import { charSVG } from "../art/character.js";
import { toPGN } from "./review.js";
import { checkAchievements } from "../achievements.js";

let G = null; // the current game
const TEST = () => typeof localStorage !== "undefined" && !!localStorage.getItem("noir.test");

// rebuild the full bot/player object from what a saved game stores
export function resolveBot(b) {
  if (!b) return customBot(800);
  if (b.id && /^p\d+$/.test(b.id)) return playerById(b.id) || b;
  const r = b.id && botById(b.id);
  if (r) return r;
  if (b.id && b.id.startsWith("echo")) return customBot(b.elo);
  if (b.id === "friend") return b;
  return customBot(b.elo || 800);
}
const slimBot = (b) => ({ id: b.id, name: b.name, elo: b.elo, flag: b.flag || "", title: b.title || "", style: b.style, generated: !!b.generated, custom: !!b.custom, ...(b.custom ? { look: b.look } : {}) });

export function newGame(cfg) {
  const s = state();
  const bot = cfg.bot || (cfg.botId ? botById(cfg.botId) || playerById(cfg.botId) : null) || customBot(cfg.elo || 800);
  let color = cfg.color === "random" || !cfg.color ? (Math.random() < 0.5 ? "w" : "b") : cfg.color;
  const [m, inc] = cfg.tc && cfg.tc !== "none" ? cfg.tc.split("+").map(Number) : [null, 0];
  const cat = catOf(cfg.tc);
  G = {
    id: uid(), date: Date.now(), mode: cfg.mode || "bot", bot: slimBot(bot), color, tc: cfg.tc || "none", cat,
    rated: !!cfg.rated && (cfg.mode || "bot") === "bot" && !cfg.startFen, startFen: cfg.startFen || null, moves: [], clocks: m != null ? { w: m * 60000, b: m * 60000 } : null, inc: (inc || 0) * 1000,
    result: null, termination: null, takebacks: 0, hints: 0, cls: [], placement: cfg.placement || null, startedAt: Date.now(), lastTick: null,
    userRating: currentRating(cat) || (s.placement && s.placement.rating) || null, prov: isProvisional(cat), drawOffered: -99, forcedLine: cfg.forcedLine || null, opening: cfg.opening || null,
    chat: {}, low: 0,
  };
  s.live = serialize();
  save();
  go("game");
}
function serialize() { if (!G) return null; return JSON.parse(JSON.stringify(G)); }
export function resumeLive() { const L = state().live; if (!L) return false; G = { ...L, lastTick: null, chat: L.chat || {}, low: L.low || 0, bot: L.bot }; return true; }
export const hasGame = () => !!G && !G.result;

export function render(root) {
  if (!G) { if (!resumeLive()) { go("play"); return; } }
  const g = G;
  const s = state();
  const bot = g.mode === "friend" ? null : resolveBot(g.bot);
  const chess = () => { const c = new Chess(g.startFen || undefined); for (const m of g.moves) c.move(m); return c; };
  const user = g.mode === "friend" ? { name: "White", look: null, av: "♔", bg: "linear-gradient(135deg,#eee,#bbb)" } : userPlayer();
  const opp = g.mode === "friend" ? { name: "Black", av: "♚", bg: "linear-gradient(135deg,#444,#111)" } : { ...bot, title: bot.title || g.bot.title };
  const userColor = g.mode === "friend" ? "both" : g.color;
  const orient = g.mode === "friend" ? "w" : g.color;
  const casual = !g.rated && g.mode === "bot" && !g.placement;
  const coachOn = (casual || g.mode === "friend") && s.settings.coachLive;

  root.className = "view full";
  root.innerHTML = `<div class="game">
    <div class="board-col">
      <div class="top-bar">${playerBar(opp, { rating: g.mode === "friend" ? null : g.bot.elo, color: orient === "w" ? "b" : "w", clock: !!g.clocks })}</div>
      <div class="board-row"><div class="eb ${s.settings.evalBar && casual ? "" : "hide"}"></div><div class="board-holder"><div id="bd"></div><button class="btn sm primary back-live hide">${I.play2} Back to game</button></div></div>
      <div class="bot-bar">${playerBar(user, { rating: g.mode === "friend" ? null : g.userRating, color: orient, clock: !!g.clocks, provisional: g.prov })}</div>
    </div>
    <div class="side-panel">
      <div class="row" style="gap:0"><button class="icon-btn" id="b-prev" aria-label="Previous move" style="border:0;background:none">${I.prev}</button><div class="movelist grow" id="ml"></div><button class="icon-btn" id="b-next" aria-label="Next move" style="border:0;background:none">${I.next}</button></div>
      <div class="coach-area"></div>
      <div class="confirm-bar hide"><button class="btn ghost c-no">${I.x} Cancel</button><button class="btn primary c-yes">${I.check} Play <span class="c-san"></span></button></div>
      <div class="actbar"></div>
      <div class="gameinfo"></div>
    </div>
  </div>`;

  const board = new Board($("#bd", root), { orientation: orient, onMove: userMove, onPremove: setPremove });
  const eb = new EvalBar($(".eb", root));
  let viewPly = null, alive = true, tickTimer = null, abort = new AbortController(), premove = null, botThinking = false, pending = null;
  const lowWarned = { w: false, b: false };
  const evals = {}; // ply -> {top, best, lines}
  const coachArea = $(".coach-area", root);
  const oppCtl = bring($(".top-bar .char", root));
  const meCtl = bring($(".bot-bar .char", root));
  loadEco().then(() => updateInfo()).catch(() => {});

  const fens = () => { const c = new Chess(g.startFen || undefined); const out = [c.fen()]; for (const m of g.moves) { c.move(m); out.push(c.fen()); } return out; };
  function updateInfo() {
    const o = openingOf(fens());
    const tcName = g.tc === "none" ? "Unlimited" : g.tc.replace("+", " | ");
    $(".gameinfo", root).innerHTML = `${g.placement ? `Placement ${g.placement.i + 1}/5 · ` : ""}${g.rated ? "Rated" : g.mode === "friend" ? "Pass & play" : "Casual"} · ${tcName}${o ? ` · <b>${esc(o.eco)}</b> ${esc(o.name)}` : ""}`;
  }

  // ---------- action bar ----------
  function drawActions() {
    const n = g.moves.length, over = !!g.result;
    const canAbort = n < 4 && g.mode !== "friend";
    const btn = (id, ic, label, cls = "", dis = false) => `<button id="${id}" class="${cls}" ${dis ? "disabled" : ""} aria-label="${label}">${ic}<span>${label}</span></button>`;
    $(".actbar", root).innerHTML = over
      ? btn("a-review", I.analysis, "Review") + btn("a-rematch", I.undo, "Rematch") + btn("a-new", I.plus, "New game") + btn("a-flip", I.flip, "Flip")
      : (canAbort ? btn("a-abort", I.x, "Abort") : btn("a-resign", I.flag, "Resign", "warn")) +
        btn("a-draw", I.half, "Draw", "", canAbort && g.mode !== "friend") +
        (casual || g.mode === "friend" ? btn("a-undo", I.undo, "Takeback", "", !n) : "") +
        (casual ? btn("a-hint", I.bulb, "Hint") : "") +
        btn("a-flip", I.flip, "Flip") + btn("a-set", I.gear, "Settings") + btn("a-leave", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/></svg>`, "Leave");
    const on = (id, f) => { const e = $("#" + id, root); if (e) e.onclick = f; };
    on("a-flip", flip); on("a-resign", resign); on("a-abort", abortGame); on("a-draw", offerDraw); on("a-undo", () => takeback(false)); on("a-hint", hint); on("a-set", settingsSheet); on("a-leave", leave);
    on("a-review", () => go("review/" + g.id)); on("a-rematch", rematch); on("a-new", () => go("play"));
  }

  // ---------- rendering ----------
  function sync(animate = true) {
    const live = viewPly === null;
    const c = new Chess(g.startFen || undefined);
    const upto = live ? g.moves.length : viewPly + 1;
    let last = null;
    for (let i = 0; i < upto; i++) last = c.move(g.moves[i]);
    board.setFen(c.fen(), { animate, lastMove: last ? [last.from, last.to] : null, check: checkSquare(c) });
    board.setDim(!live);
    $(".back-live", root).classList.toggle("hide", live);
    const canMove = live && !g.result && !pending && (userColor === "both" ? true : c.turn() === userColor) && !botThinking;
    board.setMovable(canMove ? (userColor === "both" ? c.turn() : userColor) : null, canMove ? destsOf(c) : null);
    board.o.premoveColor = live && !g.result && userColor !== "both" && c.turn() !== userColor && s.settings.premove ? userColor : null;
    const idx = upto - 1;
    const showCls = casual || g.result || g.mode === "friend";
    const mine = idx >= 0 && last && (userColor === "both" || last.color === userColor || g.result);
    board.setBadges(mine && g.cls[idx] && showCls && s.settings.classOnBoard ? [{ sq: last.to, cls: g.cls[idx] }] : []);
    $(".top-bar .caps", root).innerHTML = capturedHTML(c, orient === "w" ? "b" : "w");
    $(".bot-bar .caps", root).innerHTML = capturedHTML(c, orient);
    moveStrip($("#ml", root), g.moves, live ? g.moves.length - 1 : viewPly, showCls ? g.cls : null, (i) => { viewPly = i >= g.moves.length - 1 ? null : i; sync(false); }, +(g.startFen ? g.startFen.split(" ")[5] : 1), g.startFen ? g.startFen.split(" ")[1] : "w");
    const e = evals[upto]; if (e) eb.set(e.top, board.orientation);
    if (last && oppCtl) oppCtl.lookAt(board.sqRect(last.to).x, board.sqRect(last.to).y);
    drawClocks();
  }
  const turnNow = () => ((g.startFen ? g.startFen.split(" ")[1] : "w") === "w") === (g.moves.length % 2 === 0) ? "w" : "b";
  function drawClocks() {
    if (!g.clocks) return;
    const turn = turnNow();
    for (const el of root.querySelectorAll(".clock")) {
      const col = el.dataset.color, t = g.clocks[col];
      el.querySelector(".t").textContent = fmtClock(t);
      el.classList.toggle("run", !g.result && turn === col && g.lastTick != null);
      el.classList.toggle("low", t < Math.min(20000, (g.clocks.start || t) * 0.1 + 10000));
    }
  }
  function tick() {
    if (!g.clocks || g.result || g.lastTick == null) return;
    const now = performance.now(), dt = now - g.lastTick; g.lastTick = now;
    const turn = turnNow();
    g.clocks[turn] = Math.max(0, g.clocks[turn] - dt);
    if (g.clocks[turn] < 15000 && !lowWarned[turn] && (userColor === "both" || turn === userColor)) { lowWarned[turn] = true; sfx("lowtime"); haptic("medium"); }
    if (g.clocks[turn] <= 0) {
      const other = turn === "w" ? "b" : "w";
      const insuff = cannotMate(chess(), other);
      finish(insuff ? "1/2-1/2" : other === "w" ? "1-0" : "0-1", insuff ? "timeout vs insufficient material" : "timeout");
    }
    drawClocks();
  }
  function cannotMate(c, color) {
    let n = 0, minors = 0;
    for (const row of c.board()) for (const p of row) if (p && p.color === color && p.type !== "k") { n++; if (p.type === "n" || p.type === "b") minors++; }
    return n === 0 || (n === 1 && minors === 1);
  }

  // ---------- engine helpers ----------
  async function evalAt(ply, deep = false) {
    if (evals[ply] && (!deep || evals[ply].deep)) return evals[ply];
    const f = fens()[ply];
    const e = await evalPosition(f, deep ? { depth: 13, movetime: 1500, multipv: 2, signal: abort.signal } : { depth: 10, movetime: TEST() ? 150 : 400, multipv: 1, signal: abort.signal });
    e.fen = f; e.deep = deep; evals[ply] = e;
    return e;
  }
  // after each move: bot chat, eval bar, the live coach (casual)
  async function afterMove(ply) {
    try {
      const deep = coachOn;
      const [before, after] = await Promise.all([evalAt(ply, deep), evalAt(ply + 1, deep)]);
      if (!alive || g.result) return;
      const fs = fens();
      const c = new Chess(fs[ply]); const legal = c.moves().length; const m = c.move(g.moves[ply]);
      const r = classify({ fenBefore: fs[ply], uci: uciOf(m), color: m.color, before, after, prevCls: ply ? g.cls[ply - 1] : null, legalCount: legal, ply });
      g.cls[ply] = r.cls;
      if (g.mode === "bot") botReact(m, before, after);
      if (coachOn && (userColor === "both" || m.color === userColor)) {
        const p = { i: ply, san: m.san, uci: uciOf(m), color: m.color, fenBefore: fs[ply], fenAfter: fs[ply + 1], evalBefore: before.top, evalAfter: after.top, best: before.best, bestSan: before.best ? sanOf(fs[ply], before.best) : null, bestPv: before.top.pv || [], replyPv: after.top.pv || [], ...r };
        showCoach(p);
      }
      if (viewPly === null && g.moves.length - 1 === ply) sync(false);
      if (s.settings.evalBar && casual) eb.set(after.top, board.orientation);
      if (r.cls === "brilliant" && (userColor === "both" || m.color === userColor)) { burst(board.sqRect(m.to), { color: "#c38bff" }); haptic("heavy"); }
    } catch (e) { if (e.name !== "AbortError") console.warn(e); }
  }

  // ---------- bot personality ----------
  let chatTimer = null;
  function say(key, force = false) {
    if (!bot || g.mode !== "bot") return;
    const chatty = bot.habits ? bot.habits.chatty : 0.8;
    if (!force && Math.random() > chatty) return;
    const line = botLine(bot, key);
    if (!line) return;
    let pop = $(".chat-pop", root);
    if (!pop) { pop = document.createElement("div"); pop.className = "chat-pop"; $(".top-bar", root).appendChild(pop); }
    pop.textContent = line;
    popIn(pop);
    clearTimeout(chatTimer); chatTimer = setTimeout(() => pop && pop.remove(), 3600);
    const ex = { hi: "happy", oops: "worried", thanks: "happy", up: "happy", down: "worried", draw: "neutral" }[key];
    if (oppCtl) { if (key === "win") oppCtl.react("celebrate"); else if (key === "lose") oppCtl.react("disappoint"); else if (ex) oppCtl.expr(ex, 2600); oppCtl.talk(true, Math.min(2200, 400 + line.length * 45)); }
  }
  function botReact(m, before, after) {
    const bc = g.color === "w" ? "b" : "w";
    const wB = winFor(before.top, bc), wA = winFor(after.top, bc);
    if (m.color === bc && wB - wA >= 18) say("oops");
    else if (m.color !== bc && wA - wB >= 18) { say("thanks"); if (oppCtl) oppCtl.react("impressed"); }
    if (wA > 85 && !g.chat.up) { g.chat.up = 1; say("up"); }
    if (wA < 15 && !g.chat.down) { g.chat.down = 1; say("down"); }
    // users' great moves impress the opponent
    if (m.color !== bc && meCtl && wA - wB < -10) meCtl.expr("happy", 1500);
  }
  // should the bot resign instead of moving?
  function wantsResign(e) {
    if (!bot || g.moves.length < 30 || bot.style === "engine") return false;
    const habit = bot.habits ? bot.habits.resign : bot.elo >= 1800 ? "normal" : "never";
    if (habit === "never") return false;
    const w = winFor(e.top, g.color === "w" ? "b" : "w");
    const thr = habit === "early" ? 9 : 4;
    g.low = w < thr ? g.low + 1 : 0;
    return g.low >= (habit === "early" ? 2 : 3);
  }

  // ---------- coach ----------
  function showCoach(p) {
    const coach = mainCoach();
    const L = liveLine(p);
    const bad = ["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls);
    coachArea.innerHTML = `<div class="coachbox fade-in"><div class="face">${charSVG(coach.look, { label: coach.name })}</div><div class="bubble">
      <div class="head">${badgeHTML(p.cls)} <span>${esc(p.san)} · ${esc(L.title)}</span></div>
      ${L.text ? `<div class="small">${md(L.text)}</div>` : ""}
      ${bad ? `<div class="row gap-s wrap mt-s"><button class="btn sm c-better">Show better</button><button class="btn sm ghost c-why">Why it's worse</button>${casual ? '<button class="btn sm ghost c-retry">Retry</button>' : ""}</div>` : ""}
    </div></div>`;
    const ctl = bring($(".char", coachArea));
    if (ctl) ctl.expr(bad ? "worried" : p.cls === "brilliant" || p.cls === "great" ? "impressed" : "happy", 2400);
    const b = $(".c-better", coachArea);
    if (b) {
      b.onclick = () => lineViewer({ title: "Better: " + p.bestSan, fen: p.fenBefore, pv: p.bestPv, orientation: board.orientation, intro: `**${p.bestSan}** instead of ${p.san}.` });
      $(".c-why", coachArea).onclick = () => lineViewer({ title: "Why " + p.san + " is worse", fen: p.fenBefore, pv: [p.uci, ...(p.replyPv || [])], orientation: board.orientation, intro: `You played **${p.san}**. Here is the best answer.` });
      const rt = $(".c-retry", coachArea); if (rt) rt.onclick = () => takeback(true);
    }
  }

  // ---------- moves ----------
  function setPremove(from, to) { premove = from ? [from, to] : null; board.setPremove(premove); }
  function userMove(from, to, promo) {
    if (g.result) return;
    const c = chess();
    let m;
    try { m = c.move({ from, to, promotion: promo || "q" }); } catch { sync(false); return; }
    if (s.settings.confirmMove && userColor !== "both") {
      pending = m;
      board.setFen(c.fen(), { lastMove: [m.from, m.to], check: checkSquare(c) });
      board.setMovable(null, null);
      $(".c-san", root).textContent = m.san;
      $(".confirm-bar", root).classList.remove("hide"); $(".actbar", root).classList.add("hide");
      return;
    }
    commit(m);
  }
  $(".c-yes", root).onclick = () => { const m = pending; pending = null; $(".confirm-bar", root).classList.add("hide"); $(".actbar", root).classList.remove("hide"); if (m) commit(m); };
  $(".c-no", root).onclick = () => { pending = null; $(".confirm-bar", root).classList.add("hide"); $(".actbar", root).classList.remove("hide"); sync(false); };

  function commit(m) {
    const mover = m.color;
    if (g.clocks) {
      if (!g.clocks.start) g.clocks.start = g.clocks.w;
      if (g.lastTick == null) g.lastTick = performance.now();
      else { tick(); g.clocks[mover] += g.inc; }
      if (g.moves.length === 0) g.lastTick = performance.now();
    }
    g.moves.push(m.san);
    const c = chess();
    moveSound(m, c.isGameOver());
    if (m.captured || m.san.includes("+")) haptic("light");
    viewPly = null;
    if (userColor === "both" || mover === userColor) { premove = null; board.setPremove(null); }
    updateInfo(); sync(true); drawActions();
    afterMove(g.moves.length - 1);
    state().live = serialize(); save();
    if (c.isGameOver()) return endByRules(c);
    if (g.mode === "bot" && c.turn() !== g.color) botTurn();
  }

  async function botTurn() {
    botThinking = true;
    sync(false);
    $(".top-bar .think", root).classList.remove("hide");
    if (oppCtl) oppCtl.expr("thinking");
    try {
      const c = chess();
      const ply = g.moves.length;
      // a losing player may resign instead
      if (g.moves.length >= 30) { try { const e = await evalAt(ply); if (wantsResign(e)) { botThinking = false; return finish(g.color === "w" ? "1-0" : "0-1", "resignation"); } } catch {} }
      let uci;
      const q = window.__noir && window.__noir.botQueue;
      if (q && q.length) { const san = q.shift(); const mm = new Chess(c.fen()).move(san); uci = mm.from + mm.to + (mm.promotion || ""); await new Promise((r) => setTimeout(r, 120)); }
      else uci = await botMove(bot, c.fen(), g.moves, g.clocks ? { ms: g.clocks[c.turn()], inc: g.inc } : null, { signal: abort.signal, forcedLine: g.forcedLine, startFen: g.startFen });
      if (!alive || g.result) return;
      const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      botThinking = false;
      $(".top-bar .think", root).classList.add("hide");
      if (oppCtl) oppCtl.expr("neutral");
      const pm = premove;
      commit(m);
      if (pm && !g.result) {
        premove = null; board.setPremove(null);
        let m2 = null;
        try { m2 = chess().move({ from: pm[0], to: pm[1], promotion: s.settings.autoQueen ? "q" : "q" }); } catch {}
        if (m2) setTimeout(() => commit(m2), 60);
        else sync(false);
      }
    } catch (e) {
      botThinking = false;
      if (e.name !== "AbortError") { console.warn(e); toast("Engine hiccup, retrying…"); setTimeout(() => alive && !g.result && botTurn(), 800); }
    }
  }

  function endByRules(c) {
    if (c.isCheckmate()) finish(c.turn() === "w" ? "0-1" : "1-0", "checkmate");
    else if (c.isStalemate()) finish("1/2-1/2", "stalemate");
    else if (c.isThreefoldRepetition()) finish("1/2-1/2", "threefold repetition");
    else if (c.isInsufficientMaterial()) finish("1/2-1/2", "insufficient material");
    else finish("1/2-1/2", "50-move rule");
  }

  // ---------- the end ----------
  function finish(result, termination) {
    if (g.result) return;
    g.result = result; g.termination = termination;
    clearInterval(tickTimer);
    board.setMovable(null, null); board.o.premoveColor = null;
    $(".top-bar .think", root).classList.add("hide");
    const st = state();
    const score = g.mode === "friend" ? null : result === "1/2-1/2" ? 0.5 : (result === "1-0") === (g.color === "w") ? 1 : 0;
    const oldR = g.userRating;
    let delta = null;
    if (g.rated && score != null) delta = rateGame(g.cat, g.bot.elo, score);
    if (g.mode !== "friend") {
      st.daily.games++; touchStreak(); st.xp += 10 + (score === 1 ? 10 : 0);
      const rec0 = st.opponents[g.bot.id] || (st.opponents[g.bot.id] = { name: g.bot.name, w: 0, d: 0, l: 0, last: 0 });
      if (score === 1) rec0.w++; else if (score === 0) rec0.l++; else rec0.d++;
      rec0.last = Date.now();
      st.recentOpps = [g.bot.id, ...(st.recentOpps || []).filter((x) => x !== g.bot.id)].slice(0, 15);
    }
    st.timePlayed = (st.timePlayed || 0) + (Date.now() - g.startedAt);
    const rec = {
      id: g.id, date: g.date, mode: g.mode, botId: g.bot.id, bot: g.bot, color: g.color, tc: g.tc, cat: g.cat, rated: g.rated, result, termination,
      moves: g.moves, startFen: g.startFen, delta, score, opening: (openingOf(fens()) || {}).name || null, userRating: oldR, newRating: g.rated ? st.ratings[g.cat].r : null, placement: g.placement, review: null, cls: g.cls.slice(), ms: Date.now() - g.startedAt,
    };
    st.games.push(rec);
    st.live = null;
    if (g.placement) { const run = st.placementRun || (st.placementRun = { games: [] }); run.games.push({ elo: rec.bot.elo, score: rec.score }); }
    save();
    sfx(score === 1 ? "win" : score === 0 ? "lose" : "draw");
    if (score === 1) say("lose", true); else if (score === 0) say("win", true); else if (score === 0.5) say("draw", true);
    if (score === 1 && meCtl) meCtl.react("celebrate");
    if (score === 0 && meCtl) meCtl.react("disappoint");
    sync(false); drawActions();
    setTimeout(() => resultSheet(rec, oldR), 650);
    try { checkAchievements({ event: "game", game: rec }); } catch (e) { console.warn(e); }
  }

  function resultSheet(rec, oldR) {
    const st = state();
    const won = rec.score === 1, drew = rec.score === 0.5;
    const title = rec.mode === "friend" ? (rec.result === "1-0" ? "White won" : rec.result === "0-1" ? "Black won" : "Draw") : won ? "You won!" : drew ? "Draw" : `${esc(rec.bot.name)} won`;
    let placementHTML = "";
    if (rec.placement) {
      const run = st.placementRun;
      if (run && run.games.length >= 5) {
        const perf = Math.round(run.games.reduce((a, x) => a + x.elo + (x.score - 0.5) * 400, 0) / run.games.length);
        const rating = Math.max(100, Math.round(perf / 25) * 25);
        st.placement = { rating, date: Date.now() };
        for (const k of ["bullet", "blitz", "rapid", "classical"]) if (!st.ratings[k].r || st.ratings[k].seeded) st.ratings[k] = { r: rating, rd: 200, vol: 0.06, games: 0, hist: [[Date.now(), rating]], best: rating };
        st.placementRun = null; save();
        placementHTML = `<div class="hero mt"><div class="eyebrow">Your starting rating</div><div class="big-num">${rating}</div><div class="small">From 5 placement games. Every rated game moves it from here.</div></div>`;
      } else if (run) placementHTML = `<p class="mt">Placement: ${run.games.length}/5 played.</p>`;
    }
    const upBig = won && rec.bot.elo >= (oldR || 0) + 100;
    const sh = sheet(`<div class="result-card">
      <div class="res-t">${title}</div>
      <div class="res-s">by ${esc(rec.termination)}</div>
      ${rec.mode !== "friend" ? `<div class="vs"><div class="col" style="align-items:center;gap:6px">${avatar(userPlayer(), 72, "", won ? "win" : "")}<b class="small">You</b></div><div class="display" style="font-size:22px;color:var(--mut)">vs</div><div class="col" style="align-items:center;gap:6px">${avatar(resolveBot(rec.bot), 72, "", !won && !drew ? "win" : "")}<b class="small">${esc(rec.bot.name)}</b></div></div>` : ""}
      ${rec.delta != null ? `<div class="eyebrow">${esc(rec.cat)} rating</div><div class="res-rating"><span class="big-num rr">${oldR}</span>${deltaPill(rec.delta)}</div>` : ""}
      ${placementHTML}
      ${rec.mode !== "friend" ? `<div class="quick-acc"><div class="qa"><div class="eyebrow">Your accuracy</div><b class="qa-u">…</b></div><div class="qa"><div class="eyebrow">${esc(rec.bot.name)}</div><b class="qa-o">…</b></div></div>` : ""}
      <div class="col gap mt">
        <button class="btn primary big r-review">${I.analysis} Game Review</button>
        <div class="grid two">${rec.placement && !st.placement ? `<button class="btn r-nextp" style="grid-column:span 2">Next placement game</button>` : `<button class="btn r-rematch">${I.undo} Rematch</button><button class="btn r-new">${I.plus} New opponent</button>`}</div>
        <button class="btn ghost r-pgn">${I.copy} Share PGN</button>
      </div></div>`, { title: "" });
    if (rec.delta != null) setTimeout(() => countTo($(".rr", sh.el), oldR, oldR + rec.delta, { duration: 1.2 }), 350);
    if (won) { celebrate({ big: upBig }); haptic("heavy"); }
    $(".r-review", sh.el).onclick = () => { sh.close(); go("review/" + rec.id); };
    const rm = $(".r-rematch", sh.el); if (rm) rm.onclick = () => { sh.close(); rematch(); };
    const nw = $(".r-new", sh.el); if (nw) nw.onclick = () => { sh.close(); go("play"); };
    const np = $(".r-nextp", sh.el); if (np) np.onclick = () => { sh.close(); nextPlacement(); };
    $(".r-pgn", sh.el).onclick = () => copyText(toPGN(rec));
    // quick accuracy for both sides (a fast review; the full review runs deeper)
    if (rec.mode !== "friend" && rec.moves.length >= 4) {
      reviewGame(rec.moves, rec.startFen, { depth: TEST() ? 6 : 9 }).then((R) => {
        rec.quick = { accW: R.accW, accB: R.accB, ratingW: R.ratingW, ratingB: R.ratingB }; save();
        const mine = rec.color === "w" ? R.accW : R.accB, theirs = rec.color === "w" ? R.accB : R.accW;
        const u = $(".qa-u", sh.el), o = $(".qa-o", sh.el);
        if (u) { if (mine == null) u.textContent = "–"; else countTo(u, 0, mine, { fmt: (v) => v.toFixed(1) }); }
        if (o) { if (theirs == null) o.textContent = "–"; else countTo(o, 0, theirs, { fmt: (v) => v.toFixed(1) }); }
      }).catch(() => {});
    } else { const u = $(".qa-u", sh.el), o = $(".qa-o", sh.el); if (u) u.textContent = "–"; if (o) o.textContent = "–"; }
  }

  function rematch() { newGame({ bot: resolveBot(g.bot), color: g.mode === "friend" ? "w" : g.color === "w" ? "b" : "w", tc: g.tc, rated: g.rated, mode: g.mode, startFen: g.startFen, forcedLine: g.forcedLine }); }

  // ---------- actions ----------
  function flip() { board.flip(); const tb = $(".top-bar", root); const bb = $(".bot-bar", root); const t = tb.innerHTML; tb.innerHTML = bb.innerHTML; bb.innerHTML = t; bringAllBars(); sync(false); }
  function bringAllBars() { /* characters re-attach after a flip */ $$(".pbar .char", root).forEach((c) => bring(c)); }
  async function resign() {
    if (g.result) return;
    if (s.settings.confirmResign && !(await confirmSheet("Resign this game?" + (g.rated ? " It counts as a loss." : ""), "Resign"))) return;
    if (g.mode === "friend") finish(turnNow() === "w" ? "0-1" : "1-0", "resignation");
    else finish(g.color === "w" ? "0-1" : "1-0", "resignation");
  }
  function abortGame() {
    if (g.moves.length >= 4) return resign();
    abort.abort(); state().live = null; save(); G = null; toast("Game aborted · no rating change"); go("play");
  }
  async function leave() {
    if (g.result) return go("play");
    if (g.moves.length < 4 && g.mode !== "friend") return abortGame();
    const msg = g.rated ? "Leave this game? It counts as a resignation." : "Leave this game? It will be recorded as a resignation.";
    if (!(await confirmSheet(msg, "Leave", "Stay"))) return;
    if (g.mode === "friend") { state().live = null; save(); G = null; return go("play"); }
    finish(g.color === "w" ? "0-1" : "1-0", "resignation (left)");
  }
  async function offerDraw() {
    if (g.result) return;
    if (g.mode === "friend") { if (await confirmSheet("Agree to a draw?", "Draw")) finish("1/2-1/2", "agreement"); return; }
    if (g.moves.length - g.drawOffered < 10) return toast("You offered a draw recently.");
    g.drawOffered = g.moves.length;
    let e; try { e = await evalAt(g.moves.length); } catch { return; }
    const w = winFor(e.top, g.color === "w" ? "b" : "w");
    const style = bot.style;
    const accept = w < 28 || (g.moves.length >= 40 && Math.abs(w - 50) < 10 && Math.random() < (style === "aggressive" ? 0.25 : style === "defensive" ? 0.85 : 0.6));
    if (accept) { toast(`${esc(bot.name)} accepts the draw.`); finish("1/2-1/2", "agreement"); }
    else { toast(`${esc(bot.name)} declines.`); const pop = () => say(w > 60 ? "up" : "hi", true); pop(); }
  }
  async function hint() {
    if (g.result || turnNow() !== g.color) return;
    g.hints++;
    const e = await evalAt(g.moves.length, true);
    if (!e.best) return;
    const hb = $("#a-hint", root);
    if (!hb.dataset.stage) { board.setMarks({ [e.best.slice(0, 2)]: "info" }); hb.dataset.stage = "1"; toast("Hint: this piece. Tap Hint again for the move."); }
    else { board.setArrows([{ from: e.best.slice(0, 2), to: e.best.slice(2, 4), color: "b" }]); delete hb.dataset.stage; }
    setTimeout(() => board.setMarks({}), 4000);
  }
  async function takeback(silent) {
    if (!g.moves.length || g.result) return;
    abort.abort(); abort = new AbortController(); PLAY.stop();
    botThinking = false;
    $(".top-bar .think", root).classList.add("hide");
    let n = userColor === "both" ? 1 : turnNow() === userColor ? 2 : 1;
    n = Math.min(n, g.moves.length);
    g.moves.splice(-n); g.cls.splice(g.moves.length);
    for (const k in evals) if (+k > g.moves.length) delete evals[k];
    g.takebacks++;
    viewPly = null;
    coachArea.innerHTML = silent ? `<div class="coachbox"><div class="bubble small">Try again. Checks, captures and threats first.</div></div>` : "";
    state().live = serialize(); save();
    sync(true); drawActions();
    if (g.mode === "bot" && turnNow() !== g.color) botTurn();
  }
  function settingsSheet() {
    const st = s.settings;
    const t = (k, label, sub = "") => `<div class="setting"><div class="l"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div><label class="switch"><input type="checkbox" data-k="${k}" ${st[k] ? "checked" : ""}><span></span></label></div>`;
    const sh = sheet(t("sound", "Sounds") + t("premove", "Premoves") + t("autoQueen", "Always promote to queen") + t("confirmMove", "Confirm moves", "Tap ✓ before a move is played") + t("legal", "Show legal moves") + t("lastMove", "Highlight last move") + (casual ? t("evalBar", "Eval bar") + t("coachLive", "Live coach") : "") + `<div class="setting"><div class="l"><b>Coordinates</b></div><select class="co"><option value="inside">Inside</option><option value="off">Off</option></select></div>`, { title: "Game settings" });
    $$("input[data-k]", sh.el).forEach((i) => (i.onchange = () => { st[i.dataset.k] = i.checked; save(); if (i.dataset.k === "evalBar") $(".eb", root).classList.toggle("hide", !(st.evalBar && casual)); sync(false); }));
    const co = $(".co", sh.el); co.value = st.coords || "inside"; co.onchange = () => { st.coords = co.value; save(); board.drawCoords(); };
  }

  // move browsing
  $("#b-prev", root).onclick = () => { const cur = viewPly === null ? g.moves.length - 1 : viewPly; viewPly = Math.max(-1, cur - 1); sync(false); };
  $("#b-next", root).onclick = () => { if (viewPly === null) return; viewPly = viewPly + 1 >= g.moves.length - 1 ? null : viewPly + 1; sync(false); };
  $(".back-live", root).onclick = () => { viewPly = null; sync(false); };

  // ---------- start ----------
  updateInfo(); drawActions(); sync(false);
  if (!g.moves.length && !g.result) { sfx("start"); setTimeout(() => say("hi", true), 500); }
  if (g.clocks && !g.result) { if (g.moves.length) g.lastTick = performance.now(); tickTimer = setInterval(tick, 100); }
  if (!g.result && g.mode === "bot" && turnNow() !== g.color) setTimeout(botTurn, 600);

  // test hooks
  if (TEST()) window.__noir = Object.assign(window.__noir || {}, { game: g, setClock: (c, ms) => { g.clocks[c] = ms; drawClocks(); }, botQueue: (window.__noir && window.__noir.botQueue) || [] });
  const onVis = () => { if (document.hidden) { state().live = serialize(); save(); } };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    alive = false; clearInterval(tickTimer); clearTimeout(chatTimer); abort.abort(); PLAY.stop(); ANA.clear(); board.destroy();
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
function placementBot(elo, i) { return { ...customBot(elo), id: "echo-" + elo, name: "Placement · Echo" }; }
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
