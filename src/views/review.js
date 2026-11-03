// Game Review: accuracy, estimated rating, eval graph, every move classified, better lines, retry, ask coach.
import { Chess } from "chess.js";
import { $, h, esc, md, sheet, toast, copyText } from "../util.js";
import { Board, badgeHTML, CLS, destsOf, checkSquare } from "../board.js";
import { state, save, touchStreak } from "../store.js";
import { reviewGame, winFor, fmtEval, evalPosition, uciOf, sanOf, pvSan } from "../analysis.js";
import { explainPly, hasClaude, askClaude, plyContext } from "../coach.js";
import { moveSound, play as sfx } from "../sound.js";
import { playerBar, moveStrip, EvalBar, evalGraph, lineViewer, userPlayer, avatar } from "../ui.js";
import { ANA } from "../engine.js";
import { openingOf, loadEco } from "../eco.js";
import { I } from "../icons.js";
import { go } from "../router.js";

const ORDER = ["brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"];

// rebuild full ply objects from a stored compact review
function expand(rec) {
  const c = new Chess(rec.startFen || undefined);
  const fens = [c.fen()];
  const plies = [];
  rec.moves.forEach((san, i) => {
    const fb = c.fen();
    const m = c.move(san);
    const r = rec.review.plies[i];
    plies.push({ i, san: m.san, uci: uciOf(m), color: m.color, fenBefore: fb, fenAfter: c.fen(), ...r, bestSan: r.best ? sanOf(fb, r.best) : null });
    fens.push(c.fen());
  });
  return { ...rec.review, plies, fens };
}

function compact(R) {
  return {
    accW: R.accW, accB: R.accB, ratingW: R.ratingW, ratingB: R.ratingB, counts: R.counts, depth: R.depth,
    evals: R.evals.map((e) => (e ? { cp: e.cp, mate: e.mate } : null)),
    plies: R.plies.map((p) => ({ cls: p.cls, loss: Math.round(p.loss * 10) / 10, acc: Math.round(p.acc), wBest: Math.round(p.wBest), wAfter: Math.round(p.wAfter), best: p.best, bestPv: (p.bestPv || []).slice(0, 10), replyPv: (p.replyPv || []).slice(0, 8), evalBefore: p.evalBefore ? { cp: p.evalBefore.cp, mate: p.evalBefore.mate } : null, evalAfter: p.evalAfter ? { cp: p.evalAfter.cp, mate: p.evalAfter.mate } : null })),
  };
}

export function render(root, [id]) {
  const s = state();
  const rec = s.games.find((g) => g.id === id) || (id === "last" ? s.games[s.games.length - 1] : null);
  if (!rec) { root.innerHTML = '<div class="empty">Game not found.</div>'; return; }
  const abort = new AbortController();
  let cleanupBoard = null;

  if (rec.review && rec.review.plies && rec.review.plies.length === rec.moves.length) { showSummary(expand(rec)); }
  else runReview();

  function runReview() {
    root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Game Review</h2></div>
      <div class="card tc"><div class="coachbox" style="justify-content:center"><div class="face">♞</div><div class="bubble small" style="flex:none">Reviewing your game move by move…</div></div>
      <div class="progress mt"><i style="width:0%"></i></div><div class="small muted mt-s pct">Starting engine…</div></div>`;
    $(".back", root).onclick = () => history.back();
    const t0 = Date.now();
    reviewGame(rec.moves, rec.startFen, {
      depth: 14, signal: abort.signal,
      onProgress: (f) => { const bar = $(".progress i", root); if (bar) { bar.style.width = Math.round(f * 100) + "%"; const el = Date.now() - t0; $(".pct", root).textContent = `${Math.round(f * 100)}% · about ${Math.max(1, Math.round(((el / Math.max(f, 0.02)) - el) / 1000))}s left`; } },
    }).then((R) => {
      rec.review = compact(R);
      // collect the user's mistakes as personal puzzles
      if (rec.mode !== "friend") {
        for (const p of R.plies) if (p.color === rec.color && ["mistake", "blunder", "miss"].includes(p.cls) && p.best) {
          if (!s.mistakes.some((x) => x.fen === p.fenBefore)) s.mistakes.push({ id: rec.id + ":" + p.i, fen: p.fenBefore, best: p.best, bestSan: p.bestSan, played: p.san, cls: p.cls, gameId: rec.id, date: Date.now(), solved: 0 });
        }
      }
      s.daily.reviews++; touchStreak(); s.xp += 15;
      save();
      showSummary(expand(rec));
    }).catch((e) => { if (e.name !== "AbortError") { root.innerHTML += `<div class="card">Review failed: ${esc(e.message)}</div>`; } });
  }

  function showSummary(R) {
    const you = rec.mode === "friend" ? "w" : rec.color;
    const wName = rec.mode === "friend" ? "White" : you === "w" ? "You" : rec.bot.name;
    const bName = rec.mode === "friend" ? "Black" : you === "b" ? "You" : rec.bot.name;
    const youP = userPlayer();
    const bot = { av: rec.bot.av, bg: rec.bot.bg, name: rec.bot.name };
    const wP = rec.mode === "friend" ? { av: "♔", bg: "#ddd" } : you === "w" ? youP : bot;
    const bP = rec.mode === "friend" ? { av: "♚", bg: "#333" } : you === "b" ? youP : bot;
    const marks = R.plies.filter((p) => ["blunder", "mistake", "miss", "brilliant", "great"].includes(p.cls)).map((p) => ({ i: p.i, color: CLS[p.cls].color }));
    loadEco().catch(() => {});
    const op = openingOf(R.fens);
    const keyCls = ORDER;
    root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Game Review</h2></div>
      <div class="grid" style="max-width:640px;margin:0 auto">
      <div class="card">
        <div class="coachbox" style="padding:0 0 12px"><div class="face">♞</div><div class="bubble small">${md(coachSummary(R, rec))}</div></div>
        <div class="graph-holder"></div>
        <div class="accs mt">
          <div class="tc">${avatar(wP, 44, "margin:0 auto")}<div class="small bold mt-s">${esc(wName)}</div></div><div></div>
          <div class="tc">${avatar(bP, 44, "margin:0 auto")}<div class="small bold mt-s">${esc(bName)}</div></div>
          <div class="a w">${R.accW ?? "–"}</div><div class="small muted bold">Accuracy</div><div class="a b">${R.accB ?? "–"}</div>
          <div class="tc bold" style="font-size:20px">${R.ratingW ?? "–"}</div><div class="small muted bold">Game rating</div><div class="tc bold" style="font-size:20px">${R.ratingB ?? "–"}</div>
        </div>
      </div>
      <div class="card"><div class="cls-table">
        ${keyCls.map((k) => `<div class="v" style="color:${CLS[k].color}">${R.counts.w[k] || 0}</div><div class="c">${badgeHTML(k)} ${CLS[k].label}</div><div class="v" style="color:${CLS[k].color}">${R.counts.b[k] || 0}</div>`).join("")}
      </div></div>
      ${op ? `<div class="card small"><span class="muted">Opening:</span> <b>${esc(op.eco)}</b> ${esc(op.name)}</div>` : ""}
      <button class="btn primary big go-moves">Start review ${I.next}</button>
      <div class="row gap"><button class="btn grow an">${I.analysis} Analysis</button><button class="btn grow pgn">${I.copy} Copy PGN</button></div>
      </div>`;
    $(".back", root).onclick = () => history.back();
    $(".graph-holder", root).appendChild(evalGraph(R.evals, null, (i) => explore(R, i), marks));
    $(".go-moves", root).onclick = () => explore(R, firstKey(R, you));
    $(".an", root).onclick = () => go("analysis/" + encodeURIComponent(JSON.stringify({ moves: rec.moves, startFen: rec.startFen || null, ply: rec.moves.length - 1 })));
    $(".pgn", root).onclick = () => copyText(toPGN(rec));
  }

  function firstKey(R, you) { const k = R.plies.find((p) => p.color === you && ["blunder", "mistake", "miss"].includes(p.cls)); return k ? k.i : 0; }

  function explore(R, start) {
    const you = rec.mode === "friend" ? "w" : rec.color;
    const youP = rec.mode === "friend" ? { name: "White", av: "♔", bg: "#ddd" } : userPlayer();
    const opp = rec.mode === "friend" ? { name: "Black", av: "♚", bg: "#333" } : { name: rec.bot.name, av: rec.bot.av, bg: rec.bot.bg };
    root.className = "view full";
    root.innerHTML = `<div class="game">
      <div class="board-col">
        <div class="row" style="padding:0 6px"><button class="back">‹</button><b class="grow">Game Review</b><button class="icon-btn" id="rv-sum">${I.chart}</button></div>
        <div class="top-bar">${playerBar(opp, { rating: rec.mode === "friend" ? null : rec.bot.elo })}</div>
        <div class="board-row"><div class="eb"></div><div class="board-holder"><div id="rbd"></div></div></div>
        <div class="bot-bar">${playerBar(youP, { rating: rec.userRating })}</div>
      </div>
      <div class="side-panel">
        <div class="movelist" id="rml"></div>
        <div class="rv-coach"></div>
        <div class="ctrl">
          <button class="icon-btn" id="r-first">${I.first}</button><button class="icon-btn" id="r-prev">${I.prev}</button>
          <button class="icon-btn" id="r-next">${I.next}</button><button class="icon-btn" id="r-last">${I.last}</button>
          <button class="icon-btn" id="r-flip">${I.flip}</button>
        </div>
        <div style="padding:8px 10px" class="graph-sm"></div>
      </div></div>`;
    const board = new Board($("#rbd", root), { orientation: you, interactive: true });
    const eb = new EvalBar($(".eb", root));
    let cur = start ?? 0;
    let retrying = false;
    cleanupBoard = () => board.destroy();
    const cls = R.plies.map((p) => p.cls);
    const graphBox = $(".graph-sm", root);
    const marks = R.plies.filter((p) => ["blunder", "mistake", "miss", "brilliant", "great"].includes(p.cls)).map((p) => ({ i: p.i, color: CLS[p.cls].color }));

    function show(i, sound = false) {
      retrying = false;
      cur = Math.max(-1, Math.min(R.plies.length - 1, i));
      const fen = cur < 0 ? R.fens[0] : R.plies[cur].fenAfter;
      const c = new Chess(fen);
      const p = cur >= 0 ? R.plies[cur] : null;
      board.setMovable(null, null);
      board.setFen(fen, { lastMove: p ? [p.uci.slice(0, 2), p.uci.slice(2, 4)] : null, check: checkSquare(c) });
      if (sound && p) moveSound(new Chess(p.fenBefore).move(p.san));
      board.setBadges(p ? [{ sq: p.uci.slice(2, 4), cls: p.cls }] : []);
      const arrows = [];
      if (p && p.best && p.best !== p.uci && !["best", "book", "brilliant", "great", "forced"].includes(p.cls)) arrows.push({ from: p.best.slice(0, 2), to: p.best.slice(2, 4), color: "g" });
      board.setArrows(arrows);
      eb.set(R.evals[cur + 1] || { cp: 0 }, board.orientation);
      moveStrip($("#rml", root), rec.moves, cur, cls, (j) => show(j, true));
      graphBox.innerHTML = ""; graphBox.appendChild(evalGraph(R.evals, cur, (j) => show(j, true), marks));
      coach(p);
    }

    function coach(p) {
      const box = $(".rv-coach", root);
      if (!p) { box.innerHTML = `<div class="coachbox"><div class="face">♞</div><div class="bubble small">Starting position. Use ▶ to step through the game, or tap a move.</div></div>`; return; }
      const bad = ["inaccuracy", "mistake", "blunder", "miss"].includes(p.cls);
      const mine = rec.mode === "friend" || p.color === rec.color;
      box.innerHTML = `<div class="coachbox"><div class="face">♞</div><div class="bubble">
        <div class="head">${badgeHTML(p.cls, "lg")} <span style="color:${CLS[p.cls].color}">${esc(p.san)} is ${CLS[p.cls].label.toLowerCase().replace("miss", "a miss")}</span><span class="grow"></span><span class="badge-pill">${fmtEval(p.evalAfter)}</span></div>
        <div class="small">${md(explainPly(p).split("\n\n").slice(1).join("\n\n"))}</div>
        <div class="row gap-s wrap mt-s">
          ${p.best && p.best !== p.uci ? `<button class="btn sm primary c-best">▶ Best: ${esc(p.bestSan)}</button>` : ""}
          ${bad ? `<button class="btn sm ghost c-why">▶ Why it's worse</button>` : ""}
          ${bad && mine ? `<button class="btn sm ghost c-retry">↺ Retry</button>` : ""}
          <button class="btn sm ghost c-next">Next mistake ›</button>
          <button class="btn sm ghost c-ask">💬 Ask coach</button>
          <button class="btn sm ghost c-an">Analyze</button>
        </div></div></div>`;
      const b = $(".c-best", box);
      if (b) b.onclick = () => lineViewer({ title: "Best: " + p.bestSan, fen: p.fenBefore, pv: p.bestPv && p.bestPv.length ? p.bestPv : [p.best], orientation: board.orientation, intro: `Instead of ${p.san}, the engine plays **${p.bestSan}**. Best play for both sides:`, outro: outcome(p.fenBefore, p.bestPv, p.color) });
      const w = $(".c-why", box);
      if (w) w.onclick = () => lineViewer({ title: "Why " + p.san + " is worse", fen: p.fenBefore, pv: [p.uci, ...(p.replyPv || [])], orientation: board.orientation, intro: `You played **${p.san}**. Watch the best answer.`, outro: outcome(p.fenBefore, [p.uci, ...(p.replyPv || [])], p.color) });
      const r = $(".c-retry", box);
      if (r) r.onclick = () => retry(p);
      $(".c-next", box).onclick = () => {
        const n = R.plies.find((q) => q.i > p.i && (rec.mode === "friend" || q.color === rec.color) && ["blunder", "mistake", "miss", "inaccuracy"].includes(q.cls));
        if (n) show(n.i, true); else toast("No more mistakes. 🎉");
      };
      $(".c-ask", box).onclick = () => askSheet(p);
      $(".c-an", box).onclick = () => go("analysis/" + encodeURIComponent(JSON.stringify({ moves: rec.moves, startFen: rec.startFen || null, ply: p.i })));
    }

    function retry(p) {
      retrying = true;
      const c = new Chess(p.fenBefore);
      board.setFen(p.fenBefore, { lastMove: null, check: checkSquare(c) });
      board.setBadges([]); board.setArrows([]);
      $(".rv-coach", root).innerHTML = `<div class="coachbox"><div class="face">♞</div><div class="bubble"><div class="head">Find a better move than ${esc(p.san)}</div><div class="small">${p.color === "w" ? "White" : "Black"} to move. Checks, captures, threats — then decide.</div><div class="row gap-s mt-s"><button class="btn sm ghost c-give">Show me</button><button class="btn sm ghost c-cancel">Back</button></div></div></div>`;
      $(".c-give", root).onclick = () => show(p.i);
      $(".c-cancel", root).onclick = () => show(p.i);
      let tries = 0;
      board.setMovable(p.color, destsOf(c));
      board.o.onMove = async (from, to, promo) => {
        if (!retrying) return;
        const c2 = new Chess(p.fenBefore);
        let m; try { m = c2.move({ from, to, promotion: promo || "q" }); } catch { return; }
        board.setFen(c2.fen(), { lastMove: [from, to], check: checkSquare(c2) });
        moveSound(m);
        board.setMovable(null, null);
        let ok = uciOf(m) === p.best;
        if (!ok) {
          try { const e = await evalPosition(c2.fen(), { depth: 13, movetime: 1500, multipv: 1 }); ok = winFor(p.evalBefore, p.color) - winFor(e.top, p.color) < 4; } catch {}
        }
        tries++;
        const fb = $(".rv-coach .bubble", root);
        if (ok) {
          sfx("correct");
          board.setBadges([{ sq: to, cls: "best" }]);
          fb.innerHTML = `<div class="head">${badgeHTML("best")} Correct! ${esc(m.san)}</div><div class="small">${uciOf(m) === p.best ? "That's the engine's top move." : "That's as good as the engine's move."}</div><div class="row gap-s mt-s"><button class="btn sm primary c-line">▶ See the line</button><button class="btn sm ghost c-done">Continue</button></div>`;
          $(".c-line", fb).onclick = () => lineViewer({ title: m.san, fen: p.fenBefore, pv: p.bestPv, orientation: board.orientation });
          $(".c-done", fb).onclick = () => show(p.i);
          const mk = state().mistakes.find((x) => x.fen === p.fenBefore); if (mk) { mk.solved++; save(); }
        } else {
          sfx("wrong");
          fb.innerHTML = `<div class="head">${badgeHTML("mistake")} Not that one.</div><div class="small">${tries < 3 ? "Try again." : "Here's the answer."}</div>`;
          setTimeout(() => { if (tries < 3) retry(p); else show(p.i); }, tries < 3 ? 900 : 1200);
        }
      };
    }

    function askSheet(p) {
      const ctx = plyContext(p, rec.moves);
      if (!hasClaude()) {
        const q = `I'm reviewing my chess game. ${ctx}\nExplain in simple words why ${p.san} was ${p.cls}, what the better move ${p.bestSan} does, and one rule I can remember.`;
        const sh = sheet(`<p class="small">The live coach works inside the Claude version of this app. Here you can copy the question and paste it into Claude:</p><textarea readonly>${esc(q)}</textarea><button class="btn primary mt cp">${I.copy} Copy question for Claude</button>`, { title: "Ask the coach" });
        $(".cp", sh.el).onclick = () => copyText(q);
        return;
      }
      const msgs = [{ role: "user", content: ctx + `\n\nExplain why ${p.san} was ${p.cls === "best" ? "good" : p.cls}, what the idea of ${p.bestSan} is, and give one rule to remember.` }];
      const sh = sheet(`<div class="ai-log"></div><form class="row gap mt ai-f"><input type="text" placeholder="Ask a follow-up…"><button class="btn primary sm">Ask</button></form>`, { title: "Coach", wide: true });
      const log = $(".ai-log", sh.el);
      const run = async () => {
        const a = h(`<div class="bubble mb"><p class="muted">Thinking…</p></div>`); log.appendChild(a);
        try { const t = await askClaude(msgs, { onText: ({ text }) => (a.innerHTML = md(text)) }); a.innerHTML = md(t); msgs.push({ role: "assistant", content: t }); }
        catch (e) { a.innerHTML = `<p class="muted">${e && e.code === "rate_limited" ? "The coach needs a short break — try again in a minute." : "Couldn't reach the coach right now."}</p>`; msgs.pop(); }
      };
      $(".ai-f", sh.el).onsubmit = (e) => { e.preventDefault(); const inp = $("input", sh.el); const q = inp.value.trim(); if (!q) return; inp.value = ""; log.appendChild(h(`<div class="small bold mb" style="text-align:right">${esc(q)}</div>`)); msgs.push({ role: "user", content: q }); run(); };
      run();
    }

    $(".back", root).onclick = () => { board.destroy(); root.className = "view"; showSummary(R); };
    $("#rv-sum", root).onclick = () => { board.destroy(); root.className = "view"; showSummary(R); };
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

  return () => { abort.abort(); ANA.clear(); cleanupBoard && cleanupBoard(); };
}

function outcome(fen, pv, color) {
  const c = new Chess(fen);
  const mat = () => { let w = 0, b = 0; const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; for (const r of c.board()) for (const p of r) if (p) { if (p.color === "w") w += V[p.type]; else b += V[p.type]; } return color === "w" ? w - b : b - w; };
  const m0 = mat();
  for (const u of (pv || []).slice(0, 10)) { try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; } }
  if (c.isCheckmate()) return c.turn() === color ? "**Checkmate — you lose.**" : "**Checkmate!**";
  const d = mat() - m0;
  if (d > 0) return `At the end you are **${d} point${d > 1 ? "s" : ""} of material ahead**.`;
  if (d < 0) return `At the end you are **${-d} point${d < -1 ? "s" : ""} of material behind**.`;
  return "Material stays equal — the difference is in piece activity and king safety.";
}

function coachSummary(R, rec) {
  const you = rec.color;
  const acc = you === "w" ? R.accW : R.accB;
  const c = R.counts[you] || {};
  const bl = (c.blunder || 0), mi = (c.mistake || 0) + (c.miss || 0);
  if (rec.mode === "friend") return `Accuracy: White ${R.accW}, Black ${R.accB}.`;
  let t = `You played with **${acc}% accuracy**${R["rating" + you.toUpperCase()] ? ` — like a **${R["rating" + you.toUpperCase()]}** player in this game` : ""}. `;
  if (bl === 0 && mi === 0) t += "No mistakes or blunders. That's how you climb.";
  else if (bl) t += `${bl} blunder${bl > 1 ? "s" : ""} decided most of it. Start with ${bl > 1 ? "those" : "that one"}: what did you miss, and which check of your blunder routine would have caught it?`;
  else t += `${mi} mistake${mi > 1 ? "s" : ""}. Step through them and use **Retry** before looking at the answer.`;
  if (c.brilliant) t += ` And a **brilliant** move — find it.`;
  return t;
}

export function toPGN(rec) {
  const d = new Date(rec.date);
  const you = state().settings.name || "You";
  const W = rec.mode === "friend" ? "White" : rec.color === "w" ? you : rec.bot.name;
  const B = rec.mode === "friend" ? "Black" : rec.color === "b" ? you : rec.bot.name;
  const head = `[Event "Noir Chess ${rec.rated ? "rated" : "casual"} game"]\n[Site "Noir Chess"]\n[Date "${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}"]\n[White "${W}"]\n[Black "${B}"]\n[Result "${rec.result || "*"}"]\n[TimeControl "${rec.tc}"]\n${rec.startFen ? `[SetUp "1"]\n[FEN "${rec.startFen}"]\n` : ""}`;
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
