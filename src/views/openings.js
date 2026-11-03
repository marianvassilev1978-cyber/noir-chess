// Openings & gambits: browse, learn a line move by move, drill it from memory, spaced repetition.
import { Chess } from "chess.js";
import { $, $$, esc, md, sheet, toast, loadJSON, loadJSONOpt, today } from "../util.js";
import { Board, destsOf, checkSquare } from "../board.js";
import { state, save, touchStreak } from "../store.js";
import { moveSound, play as sfx } from "../sound.js";
import { videoList } from "../ui.js";
import { moveSan } from "../analysis.js";
import { I } from "../icons.js";
import { go } from "../router.js";

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
    <div class="due-box"></div><div class="grid auto list"><div class="empty">Loading…</div></div>`;
  $(".back", root).onclick = () => history.back();
  $$(".kinds button", root).forEach((b) => { b.classList.toggle("on", b.dataset.k === kind); b.onclick = () => go("openings/" + b.dataset.k); });
  let side = "all";
  Promise.all([loadOpenings(), loadJSONOpt("repertoire", null)]).then(([D, rep]) => {
    const list = D[kind];
    const repIds = new Set();
    if (rep) for (const st of rep.stages || []) for (const k of ["white", "black_vs_e4", "black_vs_d4", "black_vs_other"]) for (const id of st[k] || []) repIds.add(id);
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
    $(".back", root).onclick = () => history.back();
    new Board($("#ob", root), { fen: lineFen(o.lines[0], 10), orientation: o.side, interactive: false });
    $$(".lesson-row", root).forEach((r) => (r.onclick = () => {
      const l = o.lines.find((x) => x.id === r.dataset.l);
      const sh = sheet(`<p class="small">${md(l.intro || "")}</p><div class="col gap"><button class="btn primary learn">📖 Learn — step through with explanations</button><button class="btn drill">🧠 Practice — play it from memory</button></div>`, { title: l.name });
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
      <div class="card step-text expl"></div><div class="fb"></div>
      <div class="row gap mt"><button class="btn ghost bk">‹</button><button class="btn primary grow fw">Next ›</button></div>
      ${mode === "drill" ? "" : '<button class="btn ghost mt sw">Switch to practice</button>'}
    </div></div>`;
  $(".back", root).onclick = () => renderOpening(root, [o.id]);
  const c = new Chess();
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
      $(".expl", root).innerHTML = k === 0 ? md(l.intro || "") : `<div class="bold mb">${Math.ceil(k / 2)}${k % 2 ? "." : "..."} ${esc(l.moves[k - 1].san)}</div>${md(l.moves[k - 1].text || "")}`;
      if (done) $(".expl", root).innerHTML += `<div class="feedback ok mt">${md(l.summary || "End of the line.")}</div>`;
      $(".fw", root).textContent = done ? "Practice it now" : mine(k) ? "Show my move ›" : "Next ›";
    } else {
      b.setArrows([]);
      b.setMovable(!done && mine(k) ? me : null, !done && mine(k) ? destsOf(c) : null);
      if (!done) $(".expl", root).innerHTML = k === 0 ? `Play the line as ${me === "w" ? "White" : "Black"} from memory.` : `<div class="bold mb">${esc(l.moves[k - 1].san)}</div>${md(l.moves[k - 1].text || "")}`;
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

function renderReview(root) {
  loadOpenings().then((D) => {
    const all = [...D.openings, ...D.gambits];
    const queue = dueLines().map((id) => { for (const o of all) { const l = o.lines.find((x) => x.id === id); if (l) return { o, l }; } return null; }).filter(Boolean);
    if (!queue.length) { root.innerHTML = '<div class="topbar"><button class="back">‹</button><h2>Review</h2></div><div class="empty">All caught up. 🎉</div>'; $(".back", root).onclick = () => history.back(); return; }
    const next = () => { const q = queue.shift(); if (!q) return go("openings/openings"); lineTrainer(root, q.o, q.l, "drill", { onFinish: next, queue }); };
    next();
  });
}
