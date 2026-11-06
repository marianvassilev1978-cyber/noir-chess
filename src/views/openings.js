// Openings & gambits: browse, learn a line move by move, drill it from memory, spaced repetition.
import { Chess } from "chess.js";
import { $, $$, esc, md, sheet, toast, loadJSON, loadJSONOpt, today } from "../util.js";
import { Board, destsOf, checkSquare } from "../board.js";
import { state, save, touchStreak } from "../store.js";
import { moveSound, play as sfx } from "../sound.js";
import { videoList, coachBubble, avatar, sectionHead } from "../ui.js";
import { coachById } from "../coaches.js";
import { newGame } from "./game.js";
import { BOT_GROUPS, ALL_BOTS } from "../bots.js";
import { currentRating } from "../store.js";
import { moveSan } from "../analysis.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";

export async function loadOpenings() {
  const [o, g, x] = await Promise.all([loadJSON("openings"), loadJSON("gambits"), loadJSONOpt("openings-extra", [])]);
  return { openings: [...o, ...x].map((v) => ({ ...v, kind: "openings" })), gambits: g.map((v) => ({ ...v, kind: "gambits" })) };
}
const BOX_DAYS = [1, 2, 4, 8, 16, 32];
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
export function dueLines() {
  const s = state(), t = today();
  return Object.entries(s.openings).filter(([, v]) => v && v.due && v.due <= t).map(([k]) => k);
}
const stars = (n) => `<span style="color:var(--gold);letter-spacing:1px">${"★".repeat(n || 0)}<span style="opacity:.25">${"★".repeat(3 - (n || 0))}</span></span>`;

export function renderList(root, [kind = "openings"]) {
  const s = state();
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>${kind === "gambits" ? "Gambits" : "Openings"}</h2></div>
    <div class="seg mb kinds" style="max-width:420px"><button data-k="openings">Openings</button><button data-k="gambits">Gambits</button></div>
    <div class="chips mb sides"><button class="chip" data-s="all">All</button><button class="chip" data-s="w">As White</button><button class="chip" data-s="b">As Black</button><button class="chip" data-s="rep">⭐ My repertoire</button></div>
    <div class="row gap mb"><button class="btn sm exb">${I.analysis} Opening explorer</button><button class="btn sm rpb">${I.star} My repertoire</button></div>
    <div class="due-box"></div><div class="grid auto list"><div class="empty">Loading…</div></div>`;
  $(".exb", root).onclick = () => go("analysis/" + encodeURIComponent(JSON.stringify({ moves: [], tab: "explorer" })));
  $(".rpb", root).onclick = () => go("repertoire");
  $(".back", root).onclick = () => back();
  $$(".kinds button", root).forEach((b) => { b.classList.toggle("on", b.dataset.k === kind); b.onclick = () => go("openings/" + b.dataset.k); });
  let side = "all";
  Promise.all([loadOpenings(), loadJSONOpt("repertoire", null)]).then(([D, rep]) => {
    const list = D[kind];
    const repIds = new Set();
    if (rep) for (const st of rep.stages || []) for (const k of ["white", "black_vs_e4", "black_vs_d4", "black_vs_other"]) for (const id of st[k] || []) repIds.add(id);
    const mineR = state().repertoire; if (mineR && Object.values(mineR).flat().length) { repIds.clear(); for (const id of Object.values(mineR).flat()) repIds.add(id); }
    const due = dueLines();
    if (due.length) {
      $(".due-box", root).innerHTML = `<button class="tile mb rev" style="background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 25%,var(--panel)),var(--panel))"><div class="ic" style="background:#e09b2d">${I.timer}</div><div><div class="t">Review due: ${due.length} line${due.length > 1 ? "s" : ""}</div><div class="s">Spaced repetition — keep them in memory</div></div><span class="chev">›</span></button>`;
      $(".rev", root).onclick = () => go("opening/_review");
    }
    const draw = () => {
      $$(".sides .chip", root).forEach((c) => c.classList.toggle("on", c.dataset.s === side));
      const L = list.filter((o) => side === "all" || (side === "rep" ? repIds.has(o.id) : o.side === side));
      $(".list", root).innerHTML = L.map((o) => {
        const ls = o.lines.map((l) => s.openings[l.id] || {});
        const mastered = ls.filter((x) => x.stars >= 3).length;
        return `<div class="card tap" data-id="${o.id}"><div class="row gap"><div class="board small mini" data-fen="${esc(lineFen(o.lines[0], 8))}" data-side="${o.side}" style="width:84px;flex:none"></div>
          <div class="grow"><div class="bold">${esc(o.name)}</div><div class="tiny muted">${o.side === "w" ? "White" : "Black"} · ${esc(o.level || "")} · ${esc(o.eco || "")}</div><div class="tiny mt-s">${o.lines.length} lines · ${mastered} mastered</div>${repIds.has(o.id) ? '<span class="badge-pill gold mt-s">Repertoire</span>' : ""}</div></div></div>`;
      }).join("") || '<div class="empty">Nothing here.</div>';
      $$(".mini", root).forEach((el) => new Board(el, { fen: el.dataset.fen, orientation: el.dataset.side, interactive: false, small: true }));
      $$(".card.tap", root).forEach((c) => (c.onclick = () => go("opening/" + c.dataset.id)));
    };
    $$(".sides .chip", root).forEach((c) => (c.onclick = () => { side = c.dataset.s; draw(); }));
    draw();
  });
}

function lineFen(line, plies = 99) { const c = new Chess(); for (const m of line.moves.slice(0, plies)) { try { moveSan(c, m.san); } catch { break; } } return c.fen(); }

export function renderOpening(root, [id]) {
  if (id === "_review") return renderReview(root);
  if (id === "_rep") return renderReview(root, true);
  const s = state();
  root.innerHTML = `<div class="empty">Loading…</div>`;
  loadOpenings().then((D) => {
    const o = [...D.openings, ...D.gambits].find((x) => x.id === id);
    if (!o) { root.innerHTML = '<div class="empty">Not found.</div>'; return; }
    root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>${esc(o.name)}</h2></div>
      <div class="lesson-layout"><div class="lb"><div id="ob"></div></div><div class="lt">
      <div class="card"><div class="tiny muted bold">${o.side === "w" ? "YOU PLAY WHITE" : "YOU PLAY BLACK"} · ${esc(o.eco || "")} · ${esc(o.level || "")}</div><p class="mt-s">${md(o.tagline || "")}</p>
      ${(o.ideas || []).length ? `<div class="sec-title">Key ideas</div><ul class="small">${o.ideas.map((x) => `<li>${md(x).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ul>` : ""}</div>
      <div class="sec-title">Lines</div>
      ${o.lines.map((l) => { const st = s.openings[l.id] || {}; return `<div class="lesson-row" data-l="${l.id}"><div class="dot" style="${l.type === "trap" ? "background:#ca343133;border-color:#ca3431" : ""}">${l.type === "trap" ? "!" : l.type === "main" ? "★" : "·"}</div><div class="grow"><div class="bold small">${esc(l.name)}</div><div class="tiny muted">${esc(l.type)} · ${l.moves.length} moves</div></div>${stars(st.stars)}</div>`; }).join("")}
      ${videoList(o.videos || [], o.links || [])}
      </div></div>`;
    $(".back", root).onclick = () => back();
    new Board($("#ob", root), { fen: lineFen(o.lines[0], 10), orientation: o.side, interactive: false });
    $$(".lesson-row", root).forEach((r) => (r.onclick = () => {
      const l = o.lines.find((x) => x.id === r.dataset.l);
      const sh = sheet(`<p class="small">${md(l.intro || "")}</p><div class="col gap"><button class="btn primary learn">${I.book} Learn — every move explained</button><button class="btn drill">${I.target} Drill — play it from memory</button><button class="btn vsbot">${I.play2} Play this opening vs a bot</button></div>`, { title: l.name });
      $(".vsbot", sh.el).onclick = () => { sh.close(); playVsBot(o, l); };
      $(".learn", sh.el).onclick = () => { sh.close(); lineTrainer(root, o, l, "learn"); };
      $(".drill", sh.el).onclick = () => { sh.close(); lineTrainer(root, o, l, "drill"); };
    }));
  });
}

function lineTrainer(root, o, l, mode, { onFinish, queue } = {}) {
  const s = state();
  const me = o.side;
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2 class="grow" style="font-size:18px">${esc(l.name)}</h2><span class="badge-pill ${mode === "drill" ? "gold" : "acc"}">${mode === "drill" ? "Practice" : "Learn"}</span></div>
    <div class="lesson-layout"><div class="lb"><div id="lt"></div><div class="movelist mt-s lml" style="border-radius:8px"></div></div><div class="lt">
      <div class="ot-coach"></div><div class="fb"></div>
      <div class="row gap mt"><button class="btn ghost bk">‹</button><button class="btn primary grow fw">Next ›</button></div>
      ${mode === "drill" ? "" : '<button class="btn ghost mt sw">Switch to practice</button>'}
    </div></div>`;
  $(".back", root).onclick = () => renderOpening(root, [o.id]);
  const c = new Chess();
  const coach = o.kind === "gambits" && mode === "drill" ? coachById("dante") : coachById("juno");
  const cb = coachBubble($(".ot-coach", root), coach, "", { size: 56 });
  const say = (html, e) => cb.say(html, e);
  const b = new Board($("#lt", root), { orientation: me, onMove });
  let k = 0, errors = 0, busy = false;
  // deliberate blunders in trap lines (dubious) are played for you, so you only drill the moves worth knowing
  const mine = (i) => (i % 2 === 0 ? "w" : "b") === me && !(l.moves[i] && l.moves[i].dubious && mode === "drill");
  function strip() {
    const sans = l.moves.slice(0, k).map((m) => m.san);
    let html = ""; sans.forEach((m, i) => { if (i % 2 === 0) html += `<span class="n">${i / 2 + 1}.</span>`; html += `<span class="m ${i === k - 1 ? "cur" : ""}">${esc(m)}</span>`; });
    $(".lml", root).innerHTML = html || '<span class="dim small">Start position</span>';
    $(".lml", root).scrollLeft = 9999;
  }
  function render(anim = true, last) {
    b.setFen(c.fen(), { animate: anim, lastMove: last ? [last.from, last.to] : null, check: checkSquare(c) });
    strip();
    const done = k >= l.moves.length;
    if (mode === "learn") {
      b.setMovable(!done && mine(k) ? me : null, !done && mine(k) ? destsOf(c) : null);
      const nxt = l.moves[k];
      if (!done) {
        try { const t = new Chess(c.fen()); const mm = moveSan(t, nxt.san); b.setArrows(mine(k) ? [{ from: mm.from, to: mm.to, color: nxt.dubious ? "r" : "g" }] : []); } catch {}
      } else b.setArrows([]);
      if (done) say(`<b>That's the line.</b> ${esc(l.summary || "")}`, "happy");
      else say(k === 0 ? esc(l.intro || "Let's walk through it.") : `<b>${Math.ceil(k / 2)}${k % 2 ? "." : "..."} ${esc(l.moves[k - 1].san)}</b> ${esc(l.moves[k - 1].text || "")}`, l.moves[k - 1] && l.moves[k - 1].dubious ? "worried" : null);
      $(".fw", root).textContent = done ? "Practice it now" : mine(k) ? "Show my move ›" : "Next ›";
    } else {
      b.setArrows([]);
      b.setMovable(!done && mine(k) ? me : null, !done && mine(k) ? destsOf(c) : null);
      if (!done) say(k === 0 ? `Play the line as ${me === "w" ? "White" : "Black"} from memory.` : `<b>${esc(l.moves[k - 1].san)}</b> ${esc(l.moves[k - 1].text || "")}`);
      $(".fw", root).classList.toggle("hide", !done);
      if (done) finish();
    }
  }
  function step() {
    if (k >= l.moves.length) return;
    let m; try { m = moveSan(c, l.moves[k].san); } catch { toast("This line has a broken move — skipping"); k = l.moves.length; return render(false); }
    k++; moveSound(m); render(true, m);
    if (mode === "drill" && k < l.moves.length && !mine(k)) { busy = true; setTimeout(() => { busy = false; step(); }, 520); }
  }
  function onMove(from, to, promo) {
    if (busy || k >= l.moves.length) return;
    const t = new Chess(c.fen());
    let m; try { m = t.move({ from, to, promotion: promo || "q" }); } catch { return; }
    let want; try { want = moveSan(new Chess(c.fen()), l.moves[k].san); } catch { want = null; }
    if (!want || m.from !== want.from || m.to !== want.to || (want.promotion && want.promotion !== m.promotion)) {
      errors++;
      sfx("wrong");
      b.setFen(t.fen(), { lastMove: [from, to] });
      b.setBadges([{ sq: to, cls: "mistake" }]);
      const right = want || { from: m.from, to: m.to };
      $(".fb", root).innerHTML = `<div class="feedback bad">${esc(m.san)} isn't the line. ${mode === "drill" && errors > 0 ? `The move is <b>${esc(want ? want.san : l.moves[k].san)}</b>.` : ""}</div>`;
      setTimeout(() => { b.setBadges([]); b.setFen(c.fen()); if (mode === "drill") b.setArrows([{ from: right.from, to: right.to, color: "r" }]); b.setMovable(me, destsOf(c)); }, 900);
      return;
    }
    $(".fb", root).innerHTML = "";
    step();
  }
  function finish() {
    const st = s.openings[l.id] || { stars: 0, box: 0 };
    const got = errors === 0 ? 3 : errors === 1 ? 2 : 1;
    st.stars = Math.max(st.stars || 0, got);
    st.box = errors === 0 ? Math.min((st.box || 0) + 1, BOX_DAYS.length - 1) : 0;
    st.due = addDays(BOX_DAYS[st.box]);
    st.last = Date.now();
    s.openings[l.id] = st;
    s.daily.opening++; s.xp += 5 * got; touchStreak(); save();
    import("../achievements.js").then((m) => m.checkAchievements({ event: "opening", delay: 1200 }));
    sfx(got === 3 ? "win" : "correct");
    $(".fb", root).innerHTML = `<div class="feedback ok fade-in"><div style="font-size:26px">${stars(got)}</div><b>${errors === 0 ? "Perfect — no mistakes." : errors + " mistake" + (errors > 1 ? "s" : "") + "."}</b> Next review in ${BOX_DAYS[st.box]} day${BOX_DAYS[st.box] > 1 ? "s" : ""}.<br>${md(l.summary || "")}</div>`;
    $(".fw", root).classList.remove("hide");
    $(".fw", root).textContent = queue && queue.length ? "Next line ›" : "Again";
    $(".fw", root).onclick = () => (onFinish ? onFinish() : lineTrainer(root, o, l, "drill"));
  }
  $(".fw", root).onclick = () => { if (mode === "learn" && k >= l.moves.length) return lineTrainer(root, o, l, "drill"); step(); };
  $(".bk", root).onclick = () => { if (!k) return; c.undo(); k--; if (mode === "drill") { while (k > 0 && !mine(k)) { c.undo(); k--; } } render(false); };
  const sw = $(".sw", root); if (sw) sw.onclick = () => lineTrainer(root, o, l, "drill");
  render(false);
  if (mode === "drill" && !mine(0)) setTimeout(step, 500);
}

function renderReview(root, rep = false) {
  loadOpenings().then((D) => {
    const all = [...D.openings, ...D.gambits];
    let queue = dueLines().map((id) => { for (const o of all) { const l = o.lines.find((x) => x.id === id); if (l) return { o, l }; } return null; }).filter(Boolean);
    if (rep) {
      const R = state().repertoire || {};
      const ids = new Set(Object.values(R).flat());
      const mine = all.filter((o) => ids.has(o.id)).flatMap((o) => o.lines.map((l) => ({ o, l })));
      const st = (l) => (state().openings[l.id] || {}).stars || 0;
      queue = [...queue.filter((q) => ids.has(q.o.id)), ...mine.filter((q) => !queue.some((x) => x.l.id === q.l.id)).sort((a, b) => st(a.l) - st(b.l))].slice(0, 12);
    }
    if (!queue.length) { root.innerHTML = '<div class="topbar"><button class="back">‹</button><h2>Review</h2></div><div class="empty">All caught up. 🎉</div>'; $(".back", root).onclick = () => back(); return; }
    const next = () => { const q = queue.shift(); if (!q) return go("openings/openings"); lineTrainer(root, q.o, q.l, "drill", { onFinish: next, queue }); };
    next();
  });
}

// "Play this opening vs bot": the bot is forced into the line, then plays freely
function playVsBot(o, l) {
  const me = o.side, botSide = me === "w" ? "b" : "w";
  const r = currentRating("rapid") || 1000;
  const bots = ALL_BOTS.filter((b) => b.style !== "engine").sort((a, b) => Math.abs(a.elo - r) - Math.abs(b.elo - r)).slice(0, 6);
  const sh = sheet(`<p class="small muted">The bot plays its side of <b>${esc(l.name)}</b> for as long as you stay in the line, then it plays freely. Casual game.</p>
    <div class="list">${bots.map((b, i) => `<div class="list-row pb" data-i="${i}">${avatar(b, 40)}<div class="grow"><b class="small">${esc(b.name)}</b><div class="tiny muted">${b.elo}</div></div><span class="chev">›</span></div>`).join("")}</div>`, { title: "Play this opening" });
  $$(".pb", sh.el).forEach((el) => (el.onclick = () => { sh.close(); newGame({ bot: bots[+el.dataset.i], tc: "10+5", color: me, rated: false, forcedLine: { side: botSide, type: "main", moves: l.moves.map((m) => m.san), dubious: [] }, opening: o.id }); }));
}

// ---------- repertoire builder ----------
export function renderRepertoire(root) {
  const s = state();
  const R = s.repertoire || (s.repertoire = { white: [], vsE4: [], vsD4: [] });
  root.innerHTML = `${sectionHead("openings", "My repertoire", "Pick your White openings and your defences. Drills and reviews focus on them.", `<button class="back" aria-label="Back">‹</button>`)}<div class="grid rep-g" style="max-width:720px"><div class="skel" style="height:200px"></div></div>`;
  $(".back", root).onclick = () => back();
  loadOpenings().then((D) => {
    const all = [...D.openings, ...D.gambits];
    const first = (o) => (o.lines[0] && o.lines[0].moves[0] && o.lines[0].moves[0].san) || "";
    const groups = [["white", "As White", all.filter((o) => o.side === "w")], ["vsE4", "As Black vs 1.e4", all.filter((o) => o.side === "b" && first(o) === "e4")], ["vsD4", "As Black vs 1.d4 and others", all.filter((o) => o.side === "b" && first(o) !== "e4")]];
    const draw = () => {
      const lines = Object.values(R).flat().flatMap((id) => (all.find((o) => o.id === id) || { lines: [] }).lines);
      const mastered = lines.filter((l) => (s.openings[l.id] || {}).stars >= 3).length;
      $(".rep-g", root).innerHTML = `<div class="card"><div class="row between"><div><div class="eyebrow">Your repertoire</div><div class="display" style="font-size:28px">${lines.length} lines · ${mastered} mastered</div></div><button class="btn primary drillrep" ${lines.length ? "" : "disabled"}>${I.target} Drill it</button></div></div>` +
        groups.map(([k, t, list]) => `<div class="sec-title">${t}</div><div class="chips">${list.map((o) => `<button class="chip rp ${R[k].includes(o.id) ? "on" : ""}" data-k="${k}" data-id="${o.id}">${R[k].includes(o.id) ? "★ " : ""}${esc(o.name)}</button>`).join("")}</div>`).join("");
      $$(".rp", root).forEach((b) => (b.onclick = () => { const k = b.dataset.k, id = b.dataset.id; R[k] = R[k].includes(id) ? R[k].filter((x) => x !== id) : [...R[k], id]; save(); draw(); }));
      const dr = $(".drillrep", root); if (dr) dr.onclick = () => go("opening/_rep");
    };
    draw();
  });
}
