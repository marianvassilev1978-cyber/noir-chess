// Learn hub, the Zero-to-2000 course path, and the lesson player.
import { Chess } from "chess.js";
import { $, $$, esc, md, sheet, toast, loadJSON, loadJSONOpt, pick } from "../util.js";
import { Board, destsOf, checkSquare, badgeHTML } from "../board.js";
import { state, save, touchStreak } from "../store.js";
import { moveSound, play as sfx } from "../sound.js";
import { evalPosition, winFor, uciOf, fmtEval, moveSan } from "../analysis.js";
import { ANA, PLAY } from "../engine.js";
import { videoList, lineViewer, sectionHead, ring, coachBubble, skeleton } from "../ui.js";
import { coachById } from "../coaches.js";
import { charSVG } from "../art/character.js";
import { coverSVG } from "../art/badges.js";
import { celebrate } from "../art/fx.js";
import { checkAchievements } from "../achievements.js";
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

// the coach who teaches each level
export const LEVEL_COACH = { l1: "amara", l2: "amara", l3: "juno", l4: "niko", l5: "mira", l6: "anselm", l7: "amara", l8: "niko", l9: "anselm", l10: "mira", l11: "dante", l12: "mira" };
export const coachOfLevel = (lv) => coachById(LEVEL_COACH[lv.id] || "amara");
const levelDone = (s, lv) => lv.lessons.filter((l) => s.lessons[l.id] && s.lessons[l.id].done).length;

export function renderHub(root) {
  const s = state();
  root.innerHTML = `${sectionHead("learn", "Learn", "", `<span class="badge-pill gold">${s.xp} XP</span>`)}
    <div class="grid" style="max-width:760px">
      <div class="continue"></div>
      <div class="recs"></div>
      <div class="sec-title">Courses</div>
      <div class="course-grid"><div class="skel" style="height:180px"></div><div class="skel" style="height:180px"></div></div>
      <div class="sec-title">Train</div>
      <div class="grid two">
        <button class="tile op"><div class="ic" style="background:linear-gradient(135deg,#3cc97f,#1d7a4a)">${I.book}</div><div class="grow"><div class="t">Openings</div><div class="s">Learn, drill, explore</div></div></button>
        <button class="tile gb"><div class="ic" style="background:linear-gradient(135deg,#ff8c4d,#a8401a)">${I.swords}</div><div class="grow"><div class="t">Gambits</div><div class="s">Alien, Martian & more</div></div></button>
        <button class="tile rep"><div class="ic" style="background:linear-gradient(135deg,#f5c542,#b07d1e)">${I.star}</div><div class="grow"><div class="t">My repertoire</div><div class="s">Build it, drill it</div></div></button>
        <button class="tile eg"><div class="ic" style="background:linear-gradient(135deg,#c38bff,#6c3fd0)">${I.king}</div><div class="grow"><div class="t">Endgame Gym</div><div class="s">Win it vs Stockfish</div></div></button>
        <button class="tile vi"><div class="ic" style="background:linear-gradient(135deg,#5fa2ff,#2a4ab8)">${I.eye}</div><div class="grow"><div class="t">Vision</div><div class="s">Board coordinates</div></div></button>
        <button class="tile pl"><div class="ic" style="background:linear-gradient(135deg,#2fd3c6,#127a72)">${I.target}</div><div class="grow"><div class="t">Road to 2000</div><div class="s">Your training plan</div></div></button>
        <button class="tile co"><div class="ic" style="background:linear-gradient(135deg,#f39a3a,#a85a14)">${I.coach}</div><div class="grow"><div class="t">Coaches</div><div class="s">Meet all six</div></div></button>
        <button class="tile lib"><div class="ic" style="background:linear-gradient(135deg,#f06a8f,#a8264a)">${I.video}</div><div class="grow"><div class="t">Library</div><div class="s">Videos & links</div></div></button>
      </div>
    </div>`;
  const on = (c, r) => ($(c, root).onclick = () => go(r));
  on(".op", "openings/openings"); on(".gb", "openings/gambits"); on(".rep", "repertoire"); on(".eg", "endgames"); on(".vi", "vision"); on(".pl", "plan"); on(".co", "coaches"); on(".lib", "library");
  loadCourse().then((C) => {
    const grid = $(".course-grid", root); if (!grid) return;
    grid.innerHTML = C.map((lv, k) => { const d = levelDone(s, lv), n = lv.lessons.length, co = coachOfLevel(lv); return `<div class="course-card press" data-id="${lv.id}"><div class="cc-cover">${coverSVG(k)}</div>
      <div class="cc-meta"><div class="grow"><div class="eyebrow">${esc(lv.band || "")} · ${n} lessons</div><div class="cc-title">${esc(lv.title.replace(/^Level \d+ — /, ""))}</div><div class="row gap-s tiny muted mt-s"><span class="av" style="width:22px;height:22px;border-radius:8px">${charSVG(co.look, { label: co.name })}</span>with ${esc(co.short)}</div></div>${ring(d / n, { size: 44, stroke: 4, label: d === n ? I.check : `${d}/${n}` })}</div></div>`; }).join("");
    $$(".course-card", grid).forEach((el) => (el.onclick = () => go("course/" + el.dataset.id)));
    // continue where you left off
    const all = C.flatMap((lv, k) => lv.lessons.map((l) => ({ ...l, level: lv, k })));
    const n = all.find((l) => !(s.lessons[l.id] && s.lessons[l.id].done));
    if (n) {
      const co = coachOfLevel(n.level);
      $(".continue", root).innerHTML = `<div class="cover-card nl"><div class="cv">${coverSVG(n.k)}</div><div class="meta"><div class="eyebrow" style="color:#fff;opacity:.85">Continue · ${esc(n.level.title.replace(/^Level \d+ — /, ""))} · with ${esc(co.short)}</div><div class="t">${esc(n.title)}</div><div class="s">${n.minutes || 10} min</div></div></div>`;
      $(".nl", root).onclick = () => go("lesson/" + n.id);
    }
    recommend(C).then((html) => { const r = $(".recs", root); if (r && html) r.innerHTML = html; $$(".rec", root).forEach((b) => (b.onclick = () => go(b.dataset.go))); });
  });
}

// "Recommended for you": from your reviewed games (mistake types, weakest phase, worst openings)
async function recommend(C) {
  const s = state();
  const motifs = {};
  for (const m of s.mistakes) if (m.motif) motifs[m.motif] = (motifs[m.motif] || 0) + 1;
  const phase = { opening: [], middlegame: [], endgame: [] };
  for (const g of s.games) if (g.review && g.review.phases && g.review.phases[g.color]) for (const k in phase) if (g.review.phases[g.color][k] != null) phase[k].push(g.review.phases[g.color][k]);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const weakPhase = Object.entries(phase).map(([k, a]) => [k, avg(a)]).filter(([, v]) => v != null).sort((a, b) => a[1] - b[1])[0];
  const ops = {};
  for (const g of s.games) if (g.opening && g.mode !== "friend") { const o = ops[g.opening] || (ops[g.opening] = { n: 0, score: 0 }); o.n++; o.score += g.score || 0; }
  const worstOp = Object.entries(ops).filter(([, v]) => v.n >= 2).sort((a, b) => a[1].score / a[1].n - b[1].score / b[1].n)[0];
  const recs = [];
  const topMotif = Object.entries(motifs).sort((a, b) => b[1] - a[1])[0];
  const MOTIF = { hanging: ["Stop hanging pieces", "puzzle/theme/hangingPiece", "l2"], "allowed-tactic": ["Spot your opponent's tactics", "puzzle/theme/fork", "l4"], "missed-win": ["Find the winning tactic", "puzzle/theme/fork", "l8"], "allowed-mate": ["King safety", "puzzle/theme/mateIn2", "l11"], "missed-mate": ["Checkmate patterns", "puzzle/theme/mateIn2", "l4"], endgame: ["Endgame technique", "endgames", "l6"], opening: ["Opening principles", "openings/openings", "l3"], positional: ["Plans and structure", "puzzle/theme/middlegame", "l5"] };
  if (topMotif && MOTIF[topMotif[0]]) { const [t, r, lv] = MOTIF[topMotif[0]]; recs.push([`${t}`, `${topMotif[1]} of your mistakes are this type`, r, I.puzzle]); const L = C.find((x) => x.id === lv); if (L) { const nx = L.lessons.find((l) => !(s.lessons[l.id] && s.lessons[l.id].done)) || L.lessons[0]; recs.push([`Lesson: ${nx.title}`, L.title.replace(/^Level \d+ — /, ""), "lesson/" + nx.id, I.learn]); } }
  if (weakPhase && weakPhase[1] < 85) recs.push([`Your ${weakPhase[0]} (${Math.round(weakPhase[1])}%)`, "Your weakest phase in reviewed games", weakPhase[0] === "endgame" ? "endgames" : weakPhase[0] === "opening" ? "openings/openings" : "puzzle/theme/middlegame", I.chart]);
  if (worstOp) recs.push([`Shore up: ${worstOp[0]}`, `${Math.round((worstOp[1].score / worstOp[1].n) * 100)}% score in ${worstOp[1].n} games`, "openings/openings", I.book]);
  if (!recs.length) return `<div class="card rec-card"><div class="eyebrow">Recommended for you</div><div class="small muted mt-s">Play and review a few games — your recommendations come from your own mistakes.</div></div>`;
  return `<div class="card rec-card"><div class="eyebrow mb">Recommended for you</div>${recs.slice(0, 3).map(([t, d, r, ic]) => `<button class="list-row rec" data-go="${r}" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;color:inherit;text-align:left"><span class="rec-ic">${ic}</span><div class="grow"><b class="small">${esc(t)}</b><div class="tiny muted">${esc(d)}</div></div><span class="chev">›</span></button>`).join("")}</div>`;
}

// one course (level): cover, coach intro, chapters with progress
export function renderCourse(root, [lvId]) {
  const s = state();
  root.innerHTML = `<div class="empty">${skeleton(4)}</div>`;
  loadCourse().then((C) => {
    if (!lvId) return go("learn", { replace: true });
    const k = C.findIndex((x) => x.id === lvId); const lv = C[k];
    if (!lv) { root.innerHTML = '<div class="empty">Course not found.</div>'; return; }
    const co = coachOfLevel(lv), d = levelDone(s, lv);
    let nextFound = false;
    root.innerHTML = `<div class="course-hero"><div class="ch-cover">${coverSVG(k)}</div><button class="back" aria-label="Back">‹</button>
        <div class="ch-meta"><div class="eyebrow" style="color:#fff;opacity:.85">${esc(lv.band || "")} · ${d}/${lv.lessons.length} done</div><h1>${esc(lv.title.replace(/^Level \d+ — /, ""))}</h1><div class="progress mt-s"><i style="width:${Math.round((d / lv.lessons.length) * 100)}%"></i></div></div></div>
      <div class="grid" style="max-width:720px"><div class="card ch-coach"></div>
      <div class="sec-title">Chapters</div>
      ${lv.lessons.map((l, i) => {
        const done = s.lessons[l.id] && s.lessons[l.id].done;
        let cls = done ? "done" : "";
        if (!done && !nextFound) { cls = "next"; nextFound = true; }
        const nEx = (l.steps || []).filter((x) => ["exercise", "choice", "play"].includes(x.type)).length;
        const best = s.lessons[l.id] && s.lessons[l.id].best;
        return `<div class="lesson-row ${cls}" data-id="${l.id}">${ring(done ? 1 : 0, { size: 40, stroke: 4, label: done ? I.check : String(i + 1) })}<div class="grow"><div class="bold">${esc(l.title)}</div><div class="tiny muted">${l.minutes || 10} min · ${nEx} exercises${l.videos && l.videos.length ? " · ▶ " + l.videos.length : ""}${best != null && done ? ` · ${Math.round(best * 100)}%` : ""}</div></div>${cls === "next" ? '<span class="badge-pill acc">Next</span>' : `<span class="chev">›</span>`}</div>`;
      }).join("")}</div>`;
    $(".back", root).onclick = () => back();
    coachBubble($(".ch-coach", root), co, `${esc(lv.subtitle || "")}. I'll be your coach for this course.`, { expr: "happy" });
    $$(".lesson-row", root).forEach((r) => (r.onclick = () => go("lesson/" + r.dataset.id)));
  });
}

// ---------- lesson player: the coach narrates in a speech bubble ----------
export function renderLesson(root, [id]) {
  const s = state();
  let alive = true, cleanupStep = null;
  root.innerHTML = `<div class="empty">${skeleton(4)}</div>`;
  loadCourse().then((C) => {
    if (!alive) return;
    let lesson = null, level = null;
    for (const lv of C) for (const l of lv.lessons) if (l.id === id) { lesson = l; level = lv; }
    if (!lesson) { root.innerHTML = '<div class="empty">Lesson not found.</div>'; return; }
    const co = coachOfLevel(level);
    const flat = C.flatMap((lv) => lv.lessons);
    const nextLesson = flat[flat.indexOf(lesson) + 1];
    const steps = lesson.steps || [];
    let i = 0, score = 0, tasks = 0;
    root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><div class="steps-dots"></div><span class="small muted cnt"></span></div>
      <div class="eyebrow" style="margin:-6px 0 8px">${esc(level.title.replace(/^Level \d+ — /, ""))} · ${esc(lesson.title)}</div>
      <div class="lesson-layout"><div class="lb"></div><div class="lt"><div class="lesson-coach"></div><div class="step"></div><div class="row gap mt nav"><button class="btn ghost prev">‹ Back</button><button class="btn primary grow nextb">Continue</button></div></div></div>`;
    $(".back", root).onclick = () => go("course/" + level.id);
    const cb = coachBubble($(".lesson-coach", root), co, "", { size: 60 });
    const dots = () => ($(".steps-dots", root).innerHTML = steps.map((_, k) => `<i class="${k < i ? "done" : k === i ? "cur" : ""}"></i>`).join(""));
    const firstSentence = (t) => String(t || "").replace(/\n+/g, " ").split(/(?<=[.!?])\s/)[0];

    function show() {
      if (cleanupStep) { cleanupStep(); cleanupStep = null; }
      dots();
      $(".cnt", root).textContent = `${Math.min(i + 1, steps.length)}/${steps.length}`;
      const lb = $(".lb", root), st = $(".step", root);
      lb.innerHTML = ""; st.innerHTML = "";
      $(".prev", root).style.visibility = i > 0 ? "visible" : "hidden";
      const nextb = $(".nextb", root);
      nextb.disabled = false; nextb.textContent = "Continue";
      if (i >= steps.length) return finish();
      const step = steps[i];
      if (step.type === "text") {
        lb.classList.add("hide");
        // the coach says the lesson text; long texts: the first sentence in the bubble, the rest below
        const txt = String(step.text || "");
        const head = firstSentence(txt);
        cb.say(md(head).replace(/^<p>|<\/p>$/g, ""), i === 0 ? "happy" : "neutral");
        if (cb.ctl) cb.ctl.pose("explain", 1800);
        const rest = txt.slice(txt.indexOf(head) + head.length).trim();
        st.innerHTML = `${rest ? `<div class="card step-text fade-in">${md(rest)}</div>` : ""}${i === 0 ? videoList(lesson.videos || [], lesson.links || []) : ""}`;
      } else {
        lb.classList.remove("hide");
        const bd = document.createElement("div"); lb.appendChild(bd);
        const react = (ok) => { if (!cb.ctl) return; if (ok) { cb.ctl.react("celebrate"); cb.say(pick(["Exactly right!", "That's it!", "Well found!", "Correct — nicely done."]), "happy"); } else { cb.ctl.expr("worried", 1600); } };
        if (step.type === "board") { cb.say(md(firstSentence(step.text)).replace(/^<p>|<\/p>$/g, "")); cleanupStep = boardStep(bd, st, step); }
        else if (step.type === "exercise") { cb.say("Your turn: find the move.", "thinking"); nextb.disabled = true; tasks++; cleanupStep = exerciseStep(bd, st, step, (ok) => { if (ok) score++; react(ok); nextb.disabled = false; nextb.textContent = "Continue"; }); }
        else if (step.type === "choice") { cb.say("Think it through, then choose.", "thinking"); nextb.disabled = true; tasks++; cleanupStep = choiceStep(bd, st, step, (ok) => { if (ok) score++; react(ok); nextb.disabled = false; }); }
        else if (step.type === "play") { cb.say(step.goal === "win" ? "Win this position against the engine." : "Hold the draw against the engine.", "neutral"); tasks++; nextb.textContent = "Skip"; nextb.disabled = false; cleanupStep = playStep(bd, st, step, (ok) => { if (ok) score++; react(ok); nextb.textContent = "Continue"; }); }
        else st.innerHTML = `<div class="card">${md(step.text || "")}</div>`;
      }
    }
    function finish() {
      const prev = s.lessons[lesson.id] || {};
      s.lessons[lesson.id] = { done: true, score, tasks, best: Math.max(prev.best || 0, tasks ? score / tasks : 1), date: Date.now() };
      if (!prev.done) { s.xp += 30; s.daily.lesson++; }
      if (level.lessons.every((l) => s.lessons[l.id] && s.lessons[l.id].done)) { s.levelsDone = [...new Set([...(s.levelsDone || []), level.id])]; }
      touchStreak(); save();
      sfx("win"); celebrate();
      checkAchievements({ event: "lesson", delay: 1400 });
      $(".lb", root).classList.add("hide"); $(".nav", root).classList.add("hide");
      if (cb.ctl) cb.ctl.react("celebrate");
      cb.say(`Lesson complete! ${tasks ? `${score} of ${tasks} exercises right first time.` : ""} +30 XP.`, "happy");
      $(".step", root).innerHTML = `<div class="card tc fade-in"><h2>Lesson complete</h2><p class="muted">${tasks ? `${score}/${tasks} exercises right first time` : "Nice work."} · +30 XP</p>
        ${videoList(lesson.videos || [], lesson.links || [])}
        <div class="col gap mt">${nextLesson ? `<button class="btn primary big nl">Next: ${esc(nextLesson.title)}</button>` : ""}<button class="btn again">Repeat lesson</button><button class="btn ghost bc">Back to the course</button></div></div>`;
      const nl = $(".nl", root); if (nl) nl.onclick = () => go("lesson/" + nextLesson.id);
      $(".again", root).onclick = () => { i = 0; score = 0; tasks = 0; $(".nav", root).classList.remove("hide"); show(); };
      $(".bc", root).onclick = () => go("course/" + level.id);
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
    <div class="fb"></div><div class="row gap mt"><button class="btn sm ghost hint">${I.bulb} Hint</button><button class="btn sm ghost show">${I.play2} Show me</button></div>`;
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
