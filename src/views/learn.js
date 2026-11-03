// Learn hub, the Zero-to-2000 course path, and the lesson player.
import { Chess } from "chess.js";
import { $, $$, esc, md, sheet, toast, loadJSON, loadJSONOpt } from "../util.js";
import { Board, destsOf, checkSquare, badgeHTML } from "../board.js";
import { state, save, touchStreak } from "../store.js";
import { moveSound, play as sfx } from "../sound.js";
import { evalPosition, winFor, uciOf, fmtEval, moveSan } from "../analysis.js";
import { ANA, PLAY } from "../engine.js";
import { videoList, lineViewer } from "../ui.js";
import { probe, isWin, isLoss, isDrawish, pieceCount } from "../tb.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";

const UNIT_COLORS = ["#4f8a3c", "#3d7ea6", "#8a5cc2", "#c2603c", "#2f8f83", "#b5862a", "#6a5acd", "#c23c6a", "#3c6ac2", "#8a3c3c", "#2a7f5a", "#7a5230"];
const BANDS = { l1: "0–400", l2: "200–600", l3: "400–800", l4: "600–1100", l5: "900–1300", l6: "900–1400", l7: "1000–1500" };

export async function loadCourse() {
  const base = await loadJSON("lessons");
  const extra = await Promise.all(["course-tactics", "course-endgames", "course-strategy"].map((n) => loadJSONOpt(n, [])));
  const all = [...base.map((l) => ({ ...l, band: l.band || BANDS[l.id] })), ...extra.flat()];
  all.sort((a, b) => +a.id.slice(1) - +b.id.slice(1));
  return all;
}

export function renderHub(root) {
  const s = state();
  root.innerHTML = `<div class="topbar"><h2>Learn</h2><span class="badge-pill gold">${s.xp} XP</span></div>
    <div class="grid" style="max-width:760px">
      <button class="tile course" style="background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 35%,var(--panel)),var(--panel));padding:18px 16px"><div class="ic" style="background:var(--acc);width:56px;height:56px">${I.learn}</div><div class="grow"><div class="t" style="font-size:18px">Zero to 2000 course</div><div class="s cprog">Loading…</div><div class="progress mt-s"><i class="cbar" style="width:0%"></i></div></div><span class="chev">›</span></button>
      <div class="grid two">
        <button class="tile op"><div class="ic" style="background:#3d7ea6">${I.book}</div><div><div class="t">Openings</div><div class="s">Learn & drill lines</div></div></button>
        <button class="tile gb"><div class="ic" style="background:#c2603c">${I.swords}</div><div><div class="t">Gambits</div><div class="s">Alien, Martian & more</div></div></button>
        <button class="tile eg"><div class="ic" style="background:#2f8f83">${I.king}</div><div><div class="t">Endgame Gym</div><div class="s">Win it vs Stockfish</div></div></button>
        <button class="tile vi"><div class="ic" style="background:#8a5cc2">${I.eye}</div><div><div class="t">Vision</div><div class="s">Board coordinates</div></div></button>
        <button class="tile pl"><div class="ic" style="background:#b5862a">${I.target}</div><div><div class="t">Road to 2000</div><div class="s">Your training plan</div></div></button>
        <button class="tile lib"><div class="ic" style="background:#c23c6a">${I.video}</div><div><div class="t">Library</div><div class="s">Videos & resources</div></div></button>
      </div>
    </div>`;
  $(".course", root).onclick = () => go("course");
  $(".op", root).onclick = () => go("openings/openings");
  $(".gb", root).onclick = () => go("openings/gambits");
  $(".eg", root).onclick = () => go("endgames");
  $(".vi", root).onclick = () => go("vision");
  $(".pl", root).onclick = () => go("plan");
  $(".lib", root).onclick = () => go("library");
  loadCourse().then((C) => {
    const all = C.flatMap((l) => l.lessons);
    const done = all.filter((l) => s.lessons[l.id] && s.lessons[l.id].done).length;
    const pc = $(".cprog", root); if (!pc) return;
    pc.textContent = `${done}/${all.length} lessons · ${C.length} levels`;
    $(".cbar", root).style.width = Math.round((done / all.length) * 100) + "%";
  });
}

export function renderCourse(root) {
  const s = state();
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Zero to 2000</h2></div><div class="path" style="max-width:720px"><div class="empty">Loading course…</div></div>`;
  $(".back", root).onclick = () => back();
  loadCourse().then((C) => {
    let nextFound = false;
    const html = C.map((lv, k) => {
      const done = lv.lessons.filter((l) => s.lessons[l.id] && s.lessons[l.id].done).length;
      return `<div class="unit"><div class="unit-head" style="background:linear-gradient(135deg,${UNIT_COLORS[k % UNIT_COLORS.length]},color-mix(in srgb,${UNIT_COLORS[k % UNIT_COLORS.length]} 60%,#000))">
        <div class="band">${esc(lv.band || "")} ${lv.band ? "rating" : ""} · ${done}/${lv.lessons.length}</div><h3>${esc(lv.title)}</h3><div class="small" style="opacity:.9">${esc(lv.subtitle || "")}</div></div>
        ${lv.lessons.map((l, i) => {
          const d = s.lessons[l.id] && s.lessons[l.id].done;
          let cls = d ? "done" : "";
          if (!d && !nextFound) { cls = "next"; nextFound = true; }
          const nEx = (l.steps || []).filter((x) => x.type === "exercise" || x.type === "choice" || x.type === "play").length;
          return `<div class="lesson-row ${cls}" data-id="${l.id}"><div class="dot">${d ? "✓" : i + 1}</div><div class="grow"><div class="bold">${esc(l.title)}</div><div class="tiny muted">${l.minutes || 10} min · ${nEx} exercises${l.videos && l.videos.length ? " · ▶ " + l.videos.length : ""}</div></div>${cls === "next" ? '<span class="badge-pill acc">Next</span>' : ""}</div>`;
        }).join("")}</div>`;
    }).join("");
    $(".path", root).innerHTML = html;
    $$(".lesson-row", root).forEach((r) => (r.onclick = () => go("lesson/" + r.dataset.id)));
    const nx = $(".lesson-row.next", root); if (nx) nx.scrollIntoView({ block: "center" });
  });
}

// ---------- lesson player ----------
export function renderLesson(root, [id]) {
  const s = state();
  let alive = true, cleanupStep = null;
  root.innerHTML = `<div class="empty">Loading…</div>`;
  loadCourse().then((C) => {
    if (!alive) return;
    let lesson = null, level = null;
    for (const lv of C) for (const l of lv.lessons) if (l.id === id) { lesson = l; level = lv; }
    if (!lesson) { root.innerHTML = '<div class="empty">Lesson not found.</div>'; return; }
    const flat = C.flatMap((lv) => lv.lessons);
    const nextLesson = flat[flat.indexOf(lesson) + 1];
    const steps = lesson.steps || [];
    let i = 0, score = 0, tasks = 0;
    root.innerHTML = `<div class="topbar"><button class="back">‹</button><div class="steps-dots"></div><span class="small muted cnt"></span></div>
      <div class="small muted bold" style="margin:-6px 0 8px">${esc(level.title)} · ${esc(lesson.title)}</div>
      <div class="lesson-layout"><div class="lb"></div><div class="lt"><div class="step"></div><div class="row gap mt nav"><button class="btn ghost prev">‹ Back</button><button class="btn primary grow nextb">Continue</button></div></div></div>`;
    $(".back", root).onclick = () => go("course");
    const dots = () => ($(".steps-dots", root).innerHTML = steps.map((_, k) => `<i class="${k < i ? "done" : k === i ? "cur" : ""}"></i>`).join(""));

    function show() {
      if (cleanupStep) { cleanupStep(); cleanupStep = null; }
      dots();
      $(".cnt", root).textContent = `${Math.min(i + 1, steps.length)}/${steps.length}`;
      const lb = $(".lb", root), st = $(".step", root);
      lb.innerHTML = ""; st.innerHTML = "";
      $(".prev", root).style.visibility = i > 0 ? "visible" : "hidden";
      const nextb = $(".nextb", root);
      nextb.disabled = false;
      nextb.textContent = "Continue";
      if (i >= steps.length) return finish();
      const step = steps[i];
      if (step.type === "text") {
        lb.classList.add("hide");
        st.innerHTML = `<div class="card step-text fade-in">${md(step.text)}</div>${i === 0 ? videoList(lesson.videos || [], lesson.links || []) : ""}`;
      } else {
        lb.classList.remove("hide");
        const bd = document.createElement("div"); lb.appendChild(bd);
        if (step.type === "board") cleanupStep = boardStep(bd, st, step);
        else if (step.type === "exercise") { nextb.disabled = true; tasks++; cleanupStep = exerciseStep(bd, st, step, (ok) => { if (ok) score++; nextb.disabled = false; nextb.textContent = "Continue"; }); }
        else if (step.type === "choice") { nextb.disabled = true; tasks++; cleanupStep = choiceStep(bd, st, step, (ok) => { if (ok) score++; nextb.disabled = false; }); }
        else if (step.type === "play") { nextb.disabled = true; tasks++; nextb.textContent = "Skip"; nextb.disabled = false; cleanupStep = playStep(bd, st, step, (ok) => { if (ok) score++; nextb.textContent = "Continue"; }); }
        else st.innerHTML = `<div class="card">${md(step.text || "")}</div>`;
      }
    }
    function finish() {
      const prev = s.lessons[lesson.id] || {};
      s.lessons[lesson.id] = { done: true, score, tasks, best: Math.max(prev.best || 0, tasks ? score / tasks : 1), date: Date.now() };
      if (!prev.done) { s.xp += 30; s.daily.lesson++; }
      touchStreak();
      save();
      sfx("win");
      $(".lb", root).classList.add("hide");
      $(".nav", root).classList.add("hide");
      $(".step", root).innerHTML = `<div class="card tc fade-in"><div class="hand">🏆</div><h2>Lesson complete</h2><p class="muted">${tasks ? `${score}/${tasks} exercises right first time` : "Nice work."} · +30 XP</p>
        ${videoList(lesson.videos || [], lesson.links || [])}
        <div class="col gap mt">${nextLesson ? `<button class="btn primary big nl">Next: ${esc(nextLesson.title)}</button>` : ""}<button class="btn again">Repeat lesson</button><button class="btn ghost bc">Back to course</button></div></div>`;
      const nl = $(".nl", root); if (nl) nl.onclick = () => go("lesson/" + nextLesson.id);
      $(".again", root).onclick = () => { i = 0; score = 0; tasks = 0; $(".nav", root).classList.remove("hide"); show(); };
      $(".bc", root).onclick = () => go("course");
    }
    $(".prev", root).onclick = () => { if (i > 0) { i--; show(); } };
    $(".nextb", root).onclick = () => { i++; show(); };
    show();
  });
  return () => { alive = false; cleanupStep && cleanupStep(); ANA.clear(); };
}

function sideName(fen) { return fen.split(" ")[1] === "w" ? "White" : "Black"; }

export function boardStep(bd, st, step) {
  const b = new Board(bd, { fen: step.fen, orientation: step.orientation || step.fen.split(" ")[1], interactive: false });
  const marks = {}; for (const sq of step.highlights || []) marks[sq] = "gold";
  b.setMarks(marks);
  b.setArrows((step.arrows || []).map((a) => (typeof a === "string" ? { from: a.slice(0, 2), to: a.slice(2, 4), color: "o" } : a)));
  st.innerHTML = `<div class="card step-text fade-in">${md(step.text)}</div>`;
  return () => b.destroy();
}

export function exerciseStep(bd, st, step, done) {
  const c = new Chess(step.fen);
  const me = c.turn();
  const b = new Board(bd, { fen: step.fen, orientation: me, onMove });
  let k = 0, wrong = 0, finished = false;
  st.innerHTML = `<div class="card step-text fade-in"><div class="row gap-s mb"><span class="cls-badge" style="background:${me === "w" ? "#fff" : "#222"};border:1px solid #888"></span><b>${sideName(step.fen)} to move</b></div>${md(String(step.text || "").replace(/^s*(White|Black) to move[.:,]?s*/i, ""))}</div>
    <div class="fb"></div><div class="row gap mt"><button class="btn sm ghost hint">${I.bulb} Hint</button><button class="btn sm ghost show">Show answer</button></div>`;
  const fb = $(".fb", st);
  const arm = () => b.setMovable(me, destsOf(c));
  arm();
  async function onMove(from, to, promo) {
    if (finished) return;
    let m; try { m = new Chess(c.fen()).move({ from, to, promotion: promo || "q" }); } catch { return; }
    const want = step.solution[k];
    const test = new Chess(c.fen());
    let wantMv = null; try { wantMv = moveSan(new Chess(c.fen()), want); } catch {}
    let right = wantMv ? (wantMv.from === m.from && wantMv.to === m.to && (wantMv.promotion || "q") === (m.promotion || "q")) : m.san.replace(/[+#]/g, "") === want.replace(/[+#!?]/g, "");
    test.move(m.san);
    if (!right && step.goal === "mate" && test.isCheckmate()) right = true;
    if (!right && k === step.solution.length - 1 && step.goal !== "mate") {
      // accept an engine-equal alternative on the final move
      b.setMovable(null, null);
      fb.innerHTML = `<div class="feedback info small">Checking ${esc(m.san)}…</div>`;
      try {
        const [e1, e2] = await Promise.all([evalPosition(c.fen(), { depth: 12, movetime: 1200, multipv: 1 }), evalPosition(test.fen(), { depth: 12, movetime: 1200, multipv: 1 })]);
        if (winFor(e1.top, me) - winFor(e2.top, me) < 3) right = "alt";
      } catch {}
    }
    if (!right) {
      wrong++;
      sfx("wrong");
      b.setFen(test.fen(), { lastMove: [from, to] });
      b.setBadges([{ sq: to, cls: "mistake" }]);
      fb.innerHTML = `<div class="feedback bad"><b>${esc(m.san)}</b> isn't it. ${wrong >= 2 && step.hint ? md(step.hint) : "Try again."}</div>`;
      setTimeout(() => { if (finished) return; b.setBadges([]); b.setFen(c.fen(), { lastMove: null, check: checkSquare(c) }); arm(); }, 900);
      return;
    }
    const mv = c.move(m.san);
    b.setFen(c.fen(), { lastMove: [mv.from, mv.to], check: checkSquare(c) });
    moveSound(mv);
    b.setBadges([{ sq: mv.to, cls: "best" }]);
    k++;
    if (k >= step.solution.length || right === "alt") return solved(right === "alt" ? `**${m.san}** works too — the engine rates it as good as the main answer (**${step.solution[k - 1] || step.solution[0]}**).\n\n` : "");
    // opponent reply
    b.setMovable(null, null);
    fb.innerHTML = `<div class="feedback ok small">Good — keep going.</div>`;
    setTimeout(() => {
      if (finished) return;
      let r; try { r = moveSan(c, step.solution[k]); } catch { return solved(""); }
      b.setFen(c.fen(), { lastMove: [r.from, r.to], check: checkSquare(c) });
      b.setBadges([]);
      moveSound(r);
      k++;
      if (k >= step.solution.length) return solved("");
      arm();
    }, 550);
  }
  function solved(prefix) {
    finished = true;
    b.setMovable(null, null);
    sfx("correct");
    fb.innerHTML = `<div class="feedback ok fade-in"><b>${wrong ? "Solved." : "Correct!"}</b> ${md(prefix + (step.explain || ""))}</div>`;
    done(wrong === 0);
  }
  $(".hint", st).onclick = () => { fb.innerHTML = `<div class="feedback info">${md(step.hint || "Look at checks, captures and threats.")}</div>`; wrong = Math.max(wrong, 1); };
  $(".show", st).onclick = () => {
    if (finished) return;
    finished = true;
    const pv = []; const t = new Chess(c.fen());
    for (const san of step.solution.slice(k)) { try { const mm = moveSan(t, san); pv.push(uciOf(mm)); } catch { break; } }
    lineViewer({ title: "Answer", fen: c.fen(), pv, orientation: me, intro: step.explain || "" });
    fb.innerHTML = `<div class="feedback info">${md("**" + step.solution.join(" ") + "** — " + (step.explain || ""))}</div>`;
    done(false);
  };
  return () => { finished = true; b.destroy(); };
}

export function choiceStep(bd, st, step, done) {
  let b = null;
  if (step.fen) {
    b = new Board(bd, { fen: step.fen, orientation: step.orientation || step.fen.split(" ")[1], interactive: false });
    if (step.arrows) b.setArrows(step.arrows.map((a) => (typeof a === "string" ? { from: a.slice(0, 2), to: a.slice(2, 4), color: "o" } : a)));
    const marks = {}; for (const sq of step.highlights || []) marks[sq] = "gold"; b.setMarks(marks);
  } else bd.parentElement.classList.add("hide");
  st.innerHTML = `<div class="card step-text fade-in">${md(step.text)}<div class="opts">${step.options.map((o, i) => `<button class="opt" data-i="${i}">${md(o)}</button>`).join("")}</div></div><div class="fb"></div>`;
  let answered = false;
  $$(".opt", st).forEach((el) => (el.onclick = () => {
    if (answered) return;
    const i = +el.dataset.i;
    if (i === step.answer) {
      answered = true;
      el.classList.add("right");
      sfx("correct");
      $(".fb", st).innerHTML = `<div class="feedback ok fade-in">${md(step.explain || "Correct.")}</div>`;
      done(!st.dataset.wrong);
    } else {
      el.classList.add("wrong");
      sfx("wrong");
      st.dataset.wrong = "1";
      $(".fb", st).innerHTML = `<div class="feedback bad">Not quite — think again.</div>`;
    }
  }));
  return () => { b && b.destroy(); };
}

// Play a position out against Stockfish until the goal is reached.
export function playStep(bd, st, step, done, { onResult } = {}) {
  let c = new Chess(step.fen);
  const me = c.turn();
  const b = new Board(bd, { fen: step.fen, orientation: me, onMove });
  let moves = 0, over = false, thinking = false;
  const abort = new AbortController();
  const max = step.maxMoves || 40;
  st.innerHTML = `<div class="card step-text fade-in"><div class="row gap-s mb"><span class="badge-pill ${step.goal === "win" ? "acc" : "gold"}">${step.goal === "win" ? "Win it" : "Hold the draw"}</span><b>${sideName(step.fen)} to move</b><span class="grow"></span><span class="small muted mv">0/${max}</span></div>${md(String(step.text || "").replace(/^s*(White|Black) to move[.:,]?s*/i, ""))}</div>
    <div class="fb"></div><div class="row gap mt"><button class="btn sm ghost hint">${I.bulb} Hint</button><button class="btn sm ghost reset">↺ Restart</button><button class="btn sm ghost tech">Technique</button></div>`;
  const fb = $(".fb", st);
  const arm = () => b.setMovable(me, destsOf(c));
  arm();
  function status(html, cls = "info") { fb.innerHTML = `<div class="feedback ${cls} fade-in">${html}</div>`; }
  async function onMove(from, to, promo) {
    if (over || thinking) return;
    let m; try { m = c.move({ from, to, promotion: promo || "q" }); } catch { return; }
    moves++;
    $(".mv", st).textContent = `${moves}/${max}`;
    b.setFen(c.fen(), { lastMove: [m.from, m.to], check: checkSquare(c) });
    moveSound(m);
    b.setMovable(null, null);
    if (await judge(m)) return;
    thinking = true;
    try {
      // perfect defence from the tablebase when possible, Stockfish otherwise
      let best = null;
      const tb = await probe(c.fen());
      if (tb && tb.moves && tb.moves.length) best = tb.moves[0].uci;
      if (!best) { const r = await PLAY.analyse(c.fen(), { depth: 16, movetime: 700, noCache: true, signal: abort.signal }); best = r.best; }
      else await new Promise((r) => setTimeout(r, 350));
      if (over) return;
      const om = c.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] });
      b.setFen(c.fen(), { lastMove: [om.from, om.to], check: checkSquare(c) });
      moveSound(om);
      thinking = false;
      if (await judge(om)) return;
      arm();
    } catch { thinking = false; }
  }
  async function judge(m) {
    if (c.isCheckmate()) return end(c.turn() !== me && step.goal === "win" ? true : c.turn() !== me, c.turn() !== me ? "Checkmate!" : "You got mated.");
    if (c.isDraw() || c.isStalemate()) return end(step.goal === "draw", c.isStalemate() ? "Stalemate — draw." : "Draw by the rules.");
    if (m.color === me) {
      // tablebase verdict first (exact), then Stockfish
      const tb = pieceCount(c.fen()) <= 7 ? await probe(c.fen()) : null;
      if (tb && tb.category && tb.category !== "unknown") {
        const oppCat = tb.category; // side to move = opponent
        if (step.goal === "win") {
          if (!isLoss(oppCat)) return end(false, "That lets the win slip — the tablebase says it's no longer winning. Restart and try again.");
          if (m.promotion) return end(true, "Promoted with a won position — the rest is a basic mate.");
          if (moves >= max) return end(false, "Out of moves — you need a faster technique.");
          if (tb.dtm != null) status(`Winning. Perfect play mates in ${Math.ceil(Math.abs(tb.dtm) / 2)}.`);
        } else {
          if (isWin(oppCat)) return end(false, "That loses — the tablebase says your opponent now wins. Restart and find the defence.");
          if (moves >= max) return end(true, `You held for ${max} moves. That's a draw.`);
        }
        return false;
      }
      // evaluate after my move
      let e;
      try { e = await evalPosition(c.fen(), { depth: 14, movetime: 900, multipv: 1, signal: abort.signal }); } catch { return false; }
      const w = winFor(e.top, me);
      if (step.goal === "win") {
        if (m.promotion && w > 97) return end(true, "Promoted — the win is now trivial.");
        if (w < 55) return end(false, `The win slipped away (eval ${fmtEval(e.top)}). Restart and try again.`);
        if (moves >= max) return end(false, "Out of moves — you need a faster technique.");
        if (w > 99 && e.top.mate != null) status(`Winning — mate in ${Math.abs(e.top.mate)} is there. Keep going.`);
      } else {
        if (w < 15) return end(false, `That loses (eval ${fmtEval(e.top)}). Restart and find the defence.`);
        if (moves >= max) return end(true, `You held for ${max} moves. That's a draw.`);
      }
    }
    return false;
  }
  function end(ok, msg) {
    over = true;
    b.setMovable(null, null);
    sfx(ok ? "correct" : "wrong");
    status(`<b>${esc(msg)}</b>${ok ? "<br>" + md(step.explain || "") : ""}`, ok ? "ok" : "bad");
    onResult && onResult(ok, moves);
    if (ok) done(true);
    return true;
  }
  $(".reset", st).onclick = () => { over = false; thinking = false; c = new Chess(step.fen); moves = 0; $(".mv", st).textContent = `0/${max}`; b.setFen(step.fen, { lastMove: null, check: null }); fb.innerHTML = ""; arm(); };
  $(".hint", st).onclick = async () => {
    if (over || thinking) return;
    try { const e = await evalPosition(c.fen(), { depth: 18, movetime: 1500, multipv: 1 }); if (e.best) b.setArrows([{ from: e.best.slice(0, 2), to: e.best.slice(2, 4), color: "b" }]); setTimeout(() => b.setArrows([]), 2500); } catch {}
    if (step.hint) status(md(step.hint));
  };
  $(".tech", st).onclick = () => sheet(`<div class="step-text">${md(step.explain || "")}</div>`, { title: "Technique" });
  return () => { over = true; abort.abort(); PLAY.stop(); b.destroy(); };
}
