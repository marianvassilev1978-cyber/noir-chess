// Game Review: accuracy, estimated game rating, eval graph, classifications, phase ratings, the coach walkthrough of
// the key moments (Show me / Why is my move bad? / Retry), every move, and the coach's verdict.
import { Chess } from "chess.js";
import { $, $$, h, esc, md, sheet, toast, copyText } from "../util.js";
import { Board, badgeHTML, CLS, destsOf, checkSquare } from "../board.js";
import { state, save, touchStreak } from "../store.js";
import { reviewGame, winFor, fmtEval, evalPosition, uciOf, sanOf, pvSan } from "../analysis.js";
import { narrate, factsFor, explainPly, verdict, lineSummary, hasClaude, askClaude, plyContext } from "../coach.js";
import { moveSound, play as sfx } from "../sound.js";
import { playerBar, moveStrip, EvalBar, evalGraph, lineViewer, userPlayer, avatar, coachBubble, ring } from "../ui.js";
import { ANA } from "../engine.js";
import { openingOf, loadEco } from "../eco.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { mainCoach } from "../coaches.js";
import { voice } from "../voices.js";
import { charSVG } from "../art/character.js";
import { bring, countTo, typeInto } from "../art/motion.js";
import { burst } from "../art/fx.js";
import { resolveBot } from "./game.js";
import { checkAchievements } from "../achievements.js";

const ORDER = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];
const TEST = () => !!localStorage.getItem("noir.test");

function expand(rec) {
  const c = new Chess(rec.startFen || undefined);
  const fens = [c.fen()], plies = [];
  rec.moves.forEach((san, i) => {
    const fb = c.fen(); const m = c.move(san); const r = rec.review.plies[i];
    plies.push({ i, san: m.san, uci: uciOf(m), color: m.color, fenBefore: fb, fenAfter: c.fen(), ...r, bestSan: r.best ? sanOf(fb, r.best) : null });
    fens.push(c.fen());
  });
  return { ...rec.review, plies, fens };
}
function compact(R) {
  const e = (x) => (x ? { cp: x.cp, mate: x.mate } : null);
  return {
    accW: R.accW, accB: R.accB, ratingW: R.ratingW, ratingB: R.ratingB, counts: R.counts, depth: R.depth, phases: R.phases,
    evals: R.evals.map(e),
    plies: R.plies.map((p) => ({ cls: p.cls, loss: Math.round(p.loss * 10) / 10, acc: Math.round(p.acc), wBest: Math.round(p.wBest), wAfter: Math.round(p.wAfter), best: p.best, bestPv: (p.bestPv || []).slice(0, 10), replyPv: (p.replyPv || []).slice(0, 8), evalBefore: e(p.evalBefore), evalAfter: e(p.evalAfter), phase: p.phase })),
  };
}
const PH = (v) => v == null ? { t: "—", c: "var(--dim)", ic: "" } : v >= 90 ? { t: "Excellent", c: "var(--c-best)", ic: "best" } : v >= 80 ? { t: "Good", c: "var(--c-good)", ic: "good" } : v >= 65 ? { t: "Inaccurate", c: "var(--c-inaccuracy)", ic: "inaccuracy" } : { t: "Poor", c: "var(--c-mistake)", ic: "mistake" };

export function render(root, [id]) {
  const s = state();
  const rec = s.games.find((g) => g.id === id) || (id === "last" ? s.games[s.games.length - 1] : null);
  if (!rec) { root.innerHTML = '<div class="empty">Game not found.</div>'; return; }
  const abort = new AbortController();
  let cleanupBoard = null;
  const coach = mainCoach();
  const you = rec.mode === "friend" ? "w" : rec.color;
  const opp = rec.mode === "friend" ? { name: "Black", av: "♚" } : resolveBot(rec.bot);
  const youP = rec.mode === "friend" ? { name: "White", av: "♔" } : userPlayer();
  if (rec.review && rec.review.plies && rec.review.plies.length === rec.moves.length && rec.review.phases) summary(expand(rec));
  else runReview();

  // ---------- analysing ----------
  function runReview() {
    root.className = "view";
    root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Game Review</h2></div>
      <div class="card tc" style="max-width:520px;margin:0 auto"><div class="rv-stage">${charSVG(coach.look, { bg: false, label: coach.name, pose: "think", expr: "thinking" })}</div>
      <div class="rv-ring">${ring(0, { size: 88, stroke: 7, label: "0%" })}</div>
      <div class="display mt" style="font-size:26px">${esc(coach.short)} is reviewing your game</div><div class="small muted pct mt-s">Starting the engine…</div></div>`;
    $(".back", root).onclick = () => back();
    const ctl = bring($(".rv-stage .char", root), { enter: true });
    if (ctl) ctl.expr("thinking").pose("think");
    const t0 = Date.now();
    const total = rec.moves.length + 1;
    reviewGame(rec.moves, rec.startFen, {
      depth: TEST() ? 8 : 14, signal: abort.signal,
      onProgress: (f) => {
        const el = $(".rv-ring", root); if (!el) return;
        el.innerHTML = ring(f, { size: 88, stroke: 7, label: Math.round(f * 100) + "%" });
        const spent = Date.now() - t0; $(".pct", root).textContent = `Move ${Math.min(total - 1, Math.round(f * total))} of ${total - 1} · about ${Math.max(1, Math.round((spent / Math.max(f, 0.02) - spent) / 1000))}s left`;
        if (ctl && Math.random() < 0.15) ctl.look((Math.random() - 0.5) * 1.4, -0.6);
      },
    }).then((R) => {
      rec.review = compact(R);
      if (rec.mode !== "friend") for (const p of R.plies) if (p.color === rec.color && ["mistake", "blunder", "miss"].includes(p.cls) && p.best && !s.mistakes.some((x) => x.fen === p.fenBefore)) {
        const f = factsFor(p);
        s.mistakes.push({ id: rec.id + ":" + p.i, fen: p.fenBefore, best: p.best, bestSan: p.bestSan, played: p.san, cls: p.cls, motif: f.motif, gameId: rec.id, date: Date.now(), solved: 0 });
      }
      s.daily.reviews++; touchStreak(); s.xp += 15;
      save();
      try { checkAchievements({ event: "review" }); } catch {}
      if (ctl) ctl.react("celebrate");
      setTimeout(() => summary(expand(rec)), TEST() ? 50 : 700);
    }).catch((e) => { if (e.name !== "AbortError") root.innerHTML += `<div class="card">Review failed: ${esc(e.message)}</div>`; });
  }

  // ---------- the summary ----------
  function summary(R) {
    root.className = "view";
    loadEco().catch(() => {});
    const op = openingOf(R.fens);
    const wP = you === "w" ? youP : opp, bP = you === "b" ? youP : opp;
    const wName = rec.mode === "friend" ? "White" : you === "w" ? "You" : opp.name, bName = rec.mode === "friend" ? "Black" : you === "b" ? "You" : opp.name;
    const marks = R.plies.filter((p) => ["blunder", "mistake", "miss", "brilliant", "great"].includes(p.cls)).map((p) => ({ i: p.i, color: CLS[p.cls].color }));
    const V = voice(coach.id);
    const intro = rec.score === 1 ? V.afterWin[0] : rec.score === 0 ? V.afterLoss[0] : V.afterDraw[0];
    const ph = R.phases || { w: {}, b: {} };
    root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Game Review</h2><button class="icon-btn pgn" aria-label="Copy PGN">${I.copy}</button></div>
      <div class="grid" style="max-width:640px;margin:0 auto">
      <div class="card"><div class="sum-coach"></div>
        <div class="accs mt">
          <div class="tc">${avatar(wP, 52, "margin:0 auto")}<div class="small bold mt-s">${esc(wName)}</div></div><div></div>
          <div class="tc">${avatar(bP, 52, "margin:0 auto")}<div class="small bold mt-s">${esc(bName)}</div></div>
          <div class="a w accw">${R.accW ?? "–"}</div><div class="eyebrow">Accuracy</div><div class="a b accb">${R.accB ?? "–"}</div>
          <div class="tc display" style="font-size:26px">${R.ratingW ?? "–"}</div><div class="eyebrow">Game rating</div><div class="tc display" style="font-size:26px">${R.ratingB ?? "–"}</div>
        </div>
        <div class="graph-holder mt"></div>
        ${op ? `<div class="small mt-s"><span class="muted">Opening:</span> <b>${esc(op.eco)}</b> ${esc(op.name)}</div>` : ""}
      </div>
      <button class="btn primary big go-walk">${I.play2} Start review with ${esc(coach.short)}</button>
      <div class="card"><div class="cls-table">${ORDER.map((k) => `<div class="v" style="color:${CLS[k].color}">${R.counts.w[k] || 0}</div><div class="c">${badgeHTML(k)} ${CLS[k].label}</div><div class="v" style="color:${CLS[k].color}">${R.counts.b[k] || 0}</div>`).join("")}</div></div>
      <div class="card"><div class="eyebrow mb">Game phases</div><div class="phases">${["opening", "middlegame", "endgame"].map((k) => { const a = PH(ph.w[k]), b = PH(ph.b[k]); return `<div class="phr"><span class="pv" style="color:${a.c}">${a.ic ? badgeHTML(a.ic) : ""} ${ph.w[k] != null ? Math.round(ph.w[k]) : "—"}</span><b>${k[0].toUpperCase() + k.slice(1)}</b><span class="pv" style="color:${b.c}">${ph.b[k] != null ? Math.round(ph.b[k]) : "—"} ${b.ic ? badgeHTML(b.ic) : ""}</span></div>`; }).join("")}</div></div>
      <div class="grid two"><button class="btn go-moves">${I.analysis} All moves</button><button class="btn go-verdict">${I.medal} Coach's verdict</button></div>
      <button class="btn ghost an">${I.analysis} Open in analysis board</button>
      </div>`;
    $(".back", root).onclick = () => back();
    const cb = coachBubble($(".sum-coach", root), coach, "", { size: 58 });
    cb.say(`${intro} ${summaryLine(R)}`, rec.score === 1 ? "happy" : rec.score === 0 ? "worried" : "neutral");
    countTo($(".accw", root), 0, R.accW || 0, { fmt: (v) => v.toFixed(1) }); countTo($(".accb", root), 0, R.accB || 0, { fmt: (v) => v.toFixed(1) });
    if (R.accW == null) $(".accw", root).textContent = "–"; if (R.accB == null) $(".accb", root).textContent = "–";
    $(".graph-holder", root).appendChild(evalGraph(R.evals, null, (i) => explore(R, i), marks));
    $(".go-walk", root).onclick = () => walkthrough(R);
    $(".go-moves", root).onclick = () => explore(R, 0);
    $(".go-verdict", root).onclick = () => verdictView(R);
    $(".an", root).onclick = () => go("analysis/" + encodeURIComponent(JSON.stringify({ moves: rec.moves, startFen: rec.startFen || null, ply: rec.moves.length - 1, orientation: you })));
    $(".pgn", root).onclick = () => copyText(toPGN(rec));
  }

  function summaryLine(R) {
    const acc = you === "w" ? R.accW : R.accB;
    const c = R.counts[you] || {};
    const bl = c.blunder || 0, mi = (c.mistake || 0) + (c.miss || 0);
    if (rec.mode === "friend") return `Accuracy: White ${R.accW}, Black ${R.accB}.`;
    let t = `You played with **${acc}% accuracy**${R["rating" + you.toUpperCase()] ? `, like a **${R["rating" + you.toUpperCase()]}** player this game` : ""}. `;
    if (!bl && !mi) t += "No mistakes or blunders.";
    else if (bl) t += `${bl} blunder${bl > 1 ? "s" : ""} decided most of it.`;
    else t += `${mi} mistake${mi > 1 ? "s" : ""} to look at.`;
    if (c.brilliant) t += " And a **brilliant** move!";
    return t;
  }

  // the key moments: big swings, brilliants, blunders, misses
  function keyMoments(R) {
    const mine = rec.mode === "friend" ? () => true : (p) => p.color === you;
    const k = R.plies.filter((p) => (mine(p) && ["brilliant", "great", "mistake", "blunder", "miss"].includes(p.cls)) || (!mine(p) && p.cls === "blunder"));
    let swing = null, best = 0;
    for (const p of R.plies) { const d = Math.abs(p.wBest - p.wAfter); if (d > best) { best = d; swing = p; } }
    if (swing && !k.includes(swing) && best >= 15) k.push(swing);
    return k.sort((a, b) => a.i - b.i).slice(0, 10);
  }

  // ---------- board screen shared by walkthrough and explore ----------
  function boardScreen(R, { title }) {
    root.className = "view full";
    root.innerHTML = `<div class="game">
      <div class="board-col">
        <div class="row" style="padding:0 6px;gap:8px"><button class="back" aria-label="Back to summary">‹</button><b class="grow">${title}</b><span class="badge-pill step-n"></span></div>
        <div class="top-bar">${playerBar(you === "w" ? opp : youP, { rating: you === "w" ? (rec.mode === "friend" ? null : rec.bot.elo) : rec.userRating })}</div>
        <div class="board-row"><div class="eb"></div><div class="board-holder"><div id="rbd"></div></div></div>
        <div class="bot-bar">${playerBar(you === "w" ? youP : opp, { rating: you === "w" ? rec.userRating : (rec.mode === "friend" ? null : rec.bot.elo) })}</div>
      </div>
      <div class="side-panel"><div class="movelist" id="rml"></div><div class="rv-coach"></div><div class="ctrl rv-ctrl"></div><div style="padding:6px 10px" class="graph-sm"></div></div></div>`;
    const board = new Board($("#rbd", root), { orientation: you, interactive: true, draw: true });
    const eb = new EvalBar($(".eb", root));
    cleanupBoard = () => board.destroy();
    $(".back", root).onclick = () => { board.destroy(); summary(R); };
    return { board, eb };
  }
  function place(board, eb, R, i) {
    const p = i >= 0 ? R.plies[i] : null;
    const fen = p ? p.fenAfter : R.fens[0];
    board.setMovable(null, null);
    board.setFen(fen, { lastMove: p ? [p.uci.slice(0, 2), p.uci.slice(2, 4)] : null, check: checkSquare(new Chess(fen)) });
    board.setBadges(p ? [{ sq: p.uci.slice(2, 4), cls: p.cls }] : []);
    board.setArrows(p && p.best && p.best !== p.uci && !["best", "book", "brilliant", "great", "forced"].includes(p.cls) ? [{ from: p.best.slice(0, 2), to: p.best.slice(2, 4), color: "g" }] : []);
    eb.set(R.evals[i + 1] || { cp: 0 }, board.orientation);
    moveStrip($("#rml", root), rec.moves, i, R.plies.map((x) => x.cls), (j) => (root.__pick || (() => {}))(j));
    if (p && p.cls === "brilliant") burst(board.sqRect(p.uci.slice(2, 4)), { color: CLS.brilliant.color });
  }
  function actions(p, box, board, R, after) {
    const bad = ["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls);
    const mine = rec.mode === "friend" || p.color === you;
    const row = h(`<div class="row gap-s wrap mt-s">
      ${p.best && p.best !== p.uci ? `<button class="btn sm primary c-best">${I.play2} Show me</button>` : ""}
      ${bad ? `<button class="btn sm c-why">Why is ${esc(p.san)} bad?</button>` : ""}
      ${bad && mine ? `<button class="btn sm ghost c-retry">${I.undo} Retry</button>` : ""}
      <button class="btn sm ghost c-an">Analyse</button>${hasClaude() ? `<button class="btn sm ghost c-ask">Ask</button>` : ""}</div>`);
    box.appendChild(row);
    const on = (sel, f) => { const e = $(sel, row); if (e) e.onclick = f; };
    on(".c-best", () => lineViewer({ title: "Show me: " + p.bestSan, fen: p.fenBefore, pv: p.bestPv && p.bestPv.length ? p.bestPv : [p.best], orientation: board.orientation, coach, intro: `Instead of ${p.san}, **${p.bestSan}**. Watch the line.`, outro: lineSummary(p.fenBefore, p.bestPv, p.color, p.evalBefore), evalEnd: p.evalBefore }));
    on(".c-why", () => lineViewer({ title: "Why " + p.san + " is bad", fen: p.fenBefore, pv: [p.uci, ...(p.replyPv || [])], orientation: board.orientation, coach, intro: `You played **${p.san}**. Here is how it gets punished.`, outro: lineSummary(p.fenBefore, [p.uci, ...(p.replyPv || [])], p.color, p.evalAfter), evalEnd: p.evalAfter }));
    on(".c-retry", () => retry(p, board, box, after));
    on(".c-an", () => go("analysis/" + encodeURIComponent(JSON.stringify({ moves: rec.moves, startFen: rec.startFen || null, ply: p.i, orientation: you }))));
    on(".c-ask", () => askSheet(p));
  }

  // ---------- walkthrough of key moments ----------
  function walkthrough(R) {
    const K = keyMoments(R);
    if (!K.length) { toast("A clean game — no key mistakes. Showing every move."); return explore(R, 0); }
    const { board, eb } = boardScreen(R, { title: `Key moments with ${esc(coach.short)}` });
    let k = 0;
    $(".rv-ctrl", root).innerHTML = `<button class="icon-btn kp" aria-label="Previous moment">${I.prev}</button><button class="btn primary grow kn">Next moment ${I.next}</button>`;
    const show = () => {
      const p = K[k];
      $(".step-n", root).textContent = `${k + 1} / ${K.length}`;
      place(board, eb, R, p.i);
      const box = $(".rv-coach", root);
      const cb = coachBubble(box, coach, "", { size: 52 });
      const mine = rec.mode === "friend" || p.color === you;
      const lead = mine ? "" : `**${esc(opp.name)} blundered with ${p.san}.** `;
      const text = lead + narrate(p, { coach });
      const ex = p.cls === "brilliant" || p.cls === "great" ? "impressed" : ["blunder", "mistake", "miss"].includes(p.cls) && mine ? "worried" : "neutral";
      cb.say(`${badgeHTML(p.cls)} ${text}`, ex);
      if (cb.ctl && ex === "impressed") cb.ctl.react("impressed");
      if (cb.ctl) cb.ctl.lookAt(board.sqRect(p.uci.slice(2, 4)).x, board.sqRect(p.uci.slice(2, 4)).y);
      actions(p, $(".bubble", box), board, R, show);
      $(".kn", root).innerHTML = k < K.length - 1 ? `Next moment ${I.next}` : `Coach's verdict ${I.next}`;
    };
    root.__pick = (j) => { const idx = K.findIndex((x) => x.i === j); if (idx >= 0) { k = idx; show(); } else explore(R, j); };
    $(".kp", root).onclick = () => { if (k > 0) { k--; show(); } };
    $(".kn", root).onclick = () => { if (k < K.length - 1) { k++; show(); } else { board.destroy(); verdictView(R); } };
    show();
  }

  // ---------- every move ----------
  function explore(R, start) {
    const { board, eb } = boardScreen(R, { title: "All moves" });
    let cur = start ?? 0;
    $(".rv-ctrl", root).innerHTML = `<button class="icon-btn" id="r-first" aria-label="First">${I.first}</button><button class="icon-btn" id="r-prev" aria-label="Previous">${I.prev}</button><button class="icon-btn" id="r-next" aria-label="Next">${I.next}</button><button class="icon-btn" id="r-last" aria-label="Last">${I.last}</button><button class="icon-btn" id="r-flip" aria-label="Flip">${I.flip}</button>`;
    const marks = R.plies.filter((p) => ["blunder", "mistake", "miss", "brilliant", "great"].includes(p.cls)).map((p) => ({ i: p.i, color: CLS[p.cls].color }));
    function show(i, sound = false) {
      cur = Math.max(-1, Math.min(R.plies.length - 1, i));
      place(board, eb, R, cur);
      const p = cur >= 0 ? R.plies[cur] : null;
      if (sound && p) moveSound(new Chess(p.fenBefore).move(p.san));
      $(".step-n", root).textContent = p ? `${Math.floor(p.i / 2) + 1}${p.color === "w" ? "." : "…"} ${p.san}` : "Start";
      const box = $(".rv-coach", root);
      if (!p) { box.innerHTML = `<div class="coachbox"><div class="bubble small">The starting position. Step through with ▶ or tap a move.</div></div>`; }
      else { const cb = coachBubble(box, coach, "", { size: 46 }); cb.say(`${badgeHTML(p.cls)} ${narrate(p, { coach, short: ["best", "book", "excellent", "good", "forced"].includes(p.cls) })} <span class="tiny muted">${fmtEval(p.evalAfter)}</span>`); actions(p, $(".bubble", box), board, R, () => show(cur)); }
      const g = $(".graph-sm", root); g.innerHTML = ""; g.appendChild(evalGraph(R.evals, cur, (j) => show(j, true), marks));
    }
    root.__pick = (j) => show(j, true);
    $("#r-first", root).onclick = () => show(-1);
    $("#r-prev", root).onclick = () => show(cur - 1, true);
    $("#r-next", root).onclick = () => show(cur + 1, true);
    $("#r-last", root).onclick = () => show(R.plies.length - 1);
    $("#r-flip", root).onclick = () => { board.flip(); show(cur); };
    const key = (e) => { if (e.key === "ArrowLeft") show(cur - 1, true); if (e.key === "ArrowRight") show(cur + 1, true); };
    window.addEventListener("keydown", key);
    const old = cleanupBoard; cleanupBoard = () => { old && old(); window.removeEventListener("keydown", key); };
    show(cur);
  }

  // ---------- retry ----------
  function retry(p, board, box, after) {
    const c = new Chess(p.fenBefore);
    board.setFen(p.fenBefore, { lastMove: null, check: checkSquare(c) });
    board.setBadges([]); board.setArrows([]);
    box.innerHTML = "";
    const cb = coachBubble(box, coach, "", { size: 46 });
    cb.say(`Find a better move than **${p.san}**. ${p.color === "w" ? "White" : "Black"} to move — checks, captures, threats first.`, "thinking");
    const bar = h(`<div class="row gap-s mt-s"><button class="btn sm ghost c-give">Show me</button><button class="btn sm ghost c-cancel">Back</button></div>`);
    $(".bubble", box).appendChild(bar);
    $(".c-give", bar).onclick = () => { board.o.onMove = null; after(); setTimeout(() => $(".c-best", root) && $(".c-best", root).click(), 100); };
    $(".c-cancel", bar).onclick = () => { board.o.onMove = null; after(); };
    let tries = 0;
    board.setMovable(p.color, destsOf(c));
    board.o.onMove = async (from, to, promo) => {
      const c2 = new Chess(p.fenBefore);
      let m; try { m = c2.move({ from, to, promotion: promo || "q" }); } catch { return; }
      board.setFen(c2.fen(), { lastMove: [from, to], check: checkSquare(c2) }); moveSound(m); board.setMovable(null, null);
      let ok = uciOf(m) === p.best;
      if (!ok) { try { const e = await evalPosition(c2.fen(), { depth: 12, movetime: 1200, multipv: 1 }); ok = winFor(p.evalBefore, p.color) - winFor(e.top, p.color) < 4; } catch {} }
      tries++;
      if (ok) {
        sfx("correct"); board.setBadges([{ sq: to, cls: "best" }]); burst(board.sqRect(to), { color: CLS.best.color, size: 90 });
        if (cb.ctl) cb.ctl.react("celebrate");
        cb.say(`**${m.san}** — ${uciOf(m) === p.best ? "that's the engine's top move!" : "as good as the engine's move!"}`, "happy");
        const mk = state().mistakes.find((x) => x.fen === p.fenBefore); if (mk) { mk.solved++; save(); }
        board.o.onMove = null;
        setTimeout(() => { const b2 = h(`<div class="row gap-s mt-s"><button class="btn sm primary c-line">${I.play2} See the line</button><button class="btn sm ghost c-done">Continue</button></div>`); $(".bubble", box).appendChild(b2); $(".c-line", b2).onclick = () => lineViewer({ title: m.san, fen: p.fenBefore, pv: p.bestPv, orientation: board.orientation, coach, outro: lineSummary(p.fenBefore, p.bestPv, p.color) }); $(".c-done", b2).onclick = after; }, 300);
      } else {
        sfx("wrong");
        if (cb.ctl) cb.ctl.expr("worried", 1200);
        cb.say(tries < 3 ? `Not **${m.san}**. Try again.` : `Here's the answer: **${p.bestSan}**.`);
        setTimeout(() => { if (tries < 3) { board.setFen(p.fenBefore, { lastMove: null, check: checkSquare(c) }); board.setMovable(p.color, destsOf(c)); } else { board.o.onMove = null; after(); } }, tries < 3 ? 900 : 1500);
      }
    };
  }

  // ---------- the coach's verdict ----------
  function verdictView(R) {
    root.className = "view";
    const v = verdict(R, you, coach);
    root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Coach's verdict</h2></div>
      <div class="grid" style="max-width:640px;margin:0 auto">
        <div class="card verdict-hero"><div class="vstage">${charSVG(coach.look, { label: coach.name })}</div><div class="bubble"><div class="who">${esc(coach.short)} · ${esc(coach.role)}</div><div class="txt v-txt"></div></div></div>
        <div class="card"><div class="eyebrow mb" style="color:var(--good)">3 strengths</div><ol class="vlist">${v.strengths.map((x) => `<li>${md(x).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ol></div>
        <div class="card"><div class="eyebrow mb" style="color:var(--c-mistake)">3 things to fix</div><ol class="vlist">${v.fixes.map((x) => `<li>${md(x).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ol></div>
        <button class="tile ex"><div class="ic" style="background:linear-gradient(135deg,var(--acc2),var(--acc-d))">${I.target}</div><div class="grow"><div class="eyebrow">Your next exercise</div><div class="t">${esc(v.exercise.label)}</div></div><span class="chev">›</span></button>
        <button class="btn ghost back2">Back to the summary</button>
      </div>`;
    const ctl = bring($(".vstage .char", root), { enter: true });
    setTimeout(() => { typeInto($(".v-txt", root), md(`${v.intro} ${v.tip}`).replace(/^<p>|<\/p>$/g, ""), { ctl }); if (ctl) ctl.pose("explain", 2500); }, 300);
    $(".back", root).onclick = () => summary(R);
    $(".back2", root).onclick = () => summary(R);
    $(".ex", root).onclick = () => go(v.exercise.route);
  }

  function askSheet(p) {
    const ctx = plyContext(p, rec.moves);
    const msgs = [{ role: "user", content: ctx + `\n\nExplain why ${p.san} was ${p.cls}, what the idea of ${p.bestSan} is, and give one rule to remember.` }];
    const sh = sheet(`<div class="ai-log"></div><form class="row gap mt ai-f"><input type="text" placeholder="Ask a follow-up…"><button class="btn primary sm">Ask</button></form>`, { title: "Ask " + coach.short, wide: true });
    const log = $(".ai-log", sh.el);
    const run = async () => {
      const a = h(`<div class="bubble mb"><p class="muted">Thinking…</p></div>`); log.appendChild(a);
      try { const t = await askClaude(msgs, { onText: ({ text }) => (a.innerHTML = md(text)) }); a.innerHTML = md(t); msgs.push({ role: "assistant", content: t }); }
      catch (e) { a.innerHTML = `<p class="muted">Couldn't reach the coach right now.</p>`; msgs.pop(); }
    };
    $(".ai-f", sh.el).onsubmit = (e) => { e.preventDefault(); const inp = $("input", sh.el); const q = inp.value.trim(); if (!q) return; inp.value = ""; log.appendChild(h(`<div class="small bold mb" style="text-align:right">${esc(q)}</div>`)); msgs.push({ role: "user", content: q }); run(); };
    run();
  }

  return () => { abort.abort(); ANA.clear(); cleanupBoard && cleanupBoard(); };
}

export function toPGN(rec) {
  const d = new Date(rec.date);
  const you = state().settings.name || "You";
  const W = rec.mode === "friend" ? "White" : rec.color === "w" ? you : rec.bot.name;
  const B = rec.mode === "friend" ? "Black" : rec.color === "b" ? you : rec.bot.name;
  const head = `[Event "Noir Chess ${rec.rated ? "rated" : "casual"} game"]\n[Site "Noir Chess"]\n[Date "${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}"]\n[White "${W}"]\n[Black "${B}"]\n[Result "${rec.result || "*"}"]\n[WhiteElo "${rec.color === "w" ? rec.userRating || "" : rec.bot.elo || ""}"]\n[BlackElo "${rec.color === "b" ? rec.userRating || "" : rec.bot.elo || ""}"]\n[TimeControl "${rec.tc}"]\n[Termination "${rec.termination || ""}"]\n${rec.startFen ? `[SetUp "1"]\n[FEN "${rec.startFen}"]\n` : ""}`;
  let body = "";
  const startBlack = rec.startFen && rec.startFen.split(" ")[1] === "b";
  let n = rec.startFen ? +rec.startFen.split(" ")[5] : 1;
  rec.moves.forEach((m, i) => {
    const white = (i + (startBlack ? 1 : 0)) % 2 === 0;
    if (white) body += n + ". "; else if (i === 0) body += n + "... ";
    body += m + " ";
    if (!white) n++;
  });
  return head + "\n" + body + (rec.result || "*");
}
