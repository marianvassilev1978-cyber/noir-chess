// Endgame Gym, Vision trainer, Road to 2000 plan, Library.
import { $, $$, esc, md, sheet, loadJSONOpt, today, pick } from "../util.js";
import { Board, sqName } from "../board.js";
import { state, save, touchStreak, currentRating, bestRating } from "../store.js";
import { play as sfx } from "../sound.js";
import { playStep, loadCourse } from "./learn.js";
import { loadOpenings, dueLines } from "./openings.js";
import { videoList, ratingChart, sectionHead, coachBubble, ring } from "../ui.js";
import { coachById } from "../coaches.js";
import { celebrate } from "../art/fx.js";
import { checkAchievements } from "../achievements.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";

// ---------- Endgame Gym ----------
export function renderGym(root, [id]) {
  const s = state();
  root.innerHTML = `<div class="empty">Loading…</div>`;
  let cleanup = null;
  loadJSONOpt("drills-endgame", []).then((drills) => {
    if (id) {
      const d = drills.find((x) => x.id === id);
      if (!d) return go("endgames");
      root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2 style="font-size:19px">${esc(d.title)}</h2><span class="badge-pill">${esc(d.group)}</span></div><div class="lesson-layout"><div class="lb"><div id="gb"></div></div><div class="lt"><div class="gs"></div><div class="row gap mt"><button class="btn ghost nx">Next drill ›</button></div></div></div>`;
      $(".back", root).onclick = () => go("endgames");
      cleanup = playStep($("#gb", root), $(".gs", root), d, () => {}, {
        onResult: (ok, moves) => {
          const r = s.drills[d.id] || { tries: 0 };
          r.tries++; if (ok) { r.done = true; r.best = Math.min(r.best || 999, moves); s.xp += 20; celebrate(); }
          s.drills[d.id] = r; s.daily.drills++; touchStreak(); save();
          checkAchievements({ event: "drill", delay: 1200 });
        },
      });
      const idx = drills.indexOf(d);
      $(".nx", root).onclick = () => go("drill/" + (drills[idx + 1] || drills[0]).id);
      return;
    }
    if (!drills.length) { root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Endgame Gym</h2></div><div class="empty">The endgame drills are still being built — check back after the next update.</div>`; $(".back", root).onclick = () => back(); return; }
    const groups = [...new Set(drills.map((d) => d.group))];
    const done = drills.filter((d) => s.drills[d.id] && s.drills[d.id].done).length;
    root.innerHTML = `${sectionHead("endgames", "Endgame Gym", "", `<button class="back" aria-label="Back">‹</button>${ring(done / drills.length, { size: 52, stroke: 5, label: done + "" })}`)}
      <div class="card gym-coach" style="max-width:720px"></div>
      <div style="max-width:720px">${groups.map((g) => `<div class="sec-title">${esc(g)}</div>${drills.filter((d) => d.group === g).map((d) => { const r = s.drills[d.id]; return `<div class="lesson-row ${r && r.done ? "done" : ""}" data-id="${d.id}"><div class="dot">${r && r.done ? "✓" : d.goal === "win" ? "W" : "½"}</div><div class="grow"><div class="bold small">${esc(d.title)}</div><div class="tiny muted">${d.goal === "win" ? "Win" : "Draw"} in ${d.maxMoves} · ${esc(d.band || "")}${r && r.best ? " · best " + r.best + " moves" : ""}</div></div><span class="chev">›</span></div>`; }).join("")}`).join("")}</div>`;
    $(".back", root).onclick = () => back();
    $$(".lesson-row", root).forEach((r) => (r.onclick = () => go("drill/" + r.dataset.id)));
    coachBubble($(".gym-coach", root), coachById("anselm"), `Real technique against full-strength Stockfish and the tablebase. <b>Win it</b> means mate (or promote into a won position) within the move limit; <b>Hold the draw</b> means survive. Strong players know every one of these by heart.`);
  });
  return () => cleanup && cleanup();
}

// ---------- Vision (coordinates) ----------
export function renderVision(root) {
  const s = state();
  let color = "w", running = false, score = 0, target = null, timer = null, t0 = 0, board = null;
  const DUR = 30000;
  root.innerHTML = `${sectionHead("learn", "Vision", "Name the square, fast.", `<button class="back" aria-label="Back">‹</button>`)}
    <div class="lesson-layout"><div class="lb" style="position:relative"><div id="vb"></div><div class="vt" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none"><div class="vision-target" style="color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.7)"></div></div></div>
    <div class="lt"><div class="card"><p class="small">A square name appears. Tap it on the board as fast as you can. Strong players "see" coordinates without thinking — it makes calculation and notation much faster.</p>
      <div class="seg cs mb"><button data-c="w">As White</button><button data-c="b">As Black</button></div>
      <div class="row between"><div><div class="tiny muted bold">SCORE</div><div class="big-num sc" style="font-size:36px;font-weight:900">0</div></div><div class="tc"><div class="tiny muted bold">TIME</div><div class="big-timer tm">30</div></div><div class="tc"><div class="tiny muted bold">BEST</div><div class="bold bs" style="font-size:22px">${s.vision.best[color] || 0}</div></div></div>
      <button class="btn primary big mt go">Start</button></div></div></div>`;
  $(".back", root).onclick = () => back();
  board = new Board($("#vb", root), { orientation: color, interactive: false });
  board.setFen("8/8/8/8/8/8/8/8 w - - 0 1", { animate: false });
  const segs = () => $$(".cs button", root).forEach((b) => b.classList.toggle("on", b.dataset.c === color));
  $$(".cs button", root).forEach((b) => (b.onclick = () => { if (running) return; color = b.dataset.c; board.setOrientation(color); segs(); $(".bs", root).textContent = s.vision.best[color] || 0; }));
  segs();
  const newTarget = () => { let t; do t = sqName(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)); while (t === target); target = t; $(".vision-target", root).textContent = t; };
  $("#vb", root).addEventListener("pointerdown", (e) => {
    if (!running) return;
    const sq = board.sqAt(e.clientX, e.clientY);
    if (!sq) return;
    if (sq === target) { score++; $(".sc", root).textContent = score; sfx("select"); board.setMarks({ [sq]: "good" }); newTarget(); }
    else { sfx("wrong"); board.setMarks({ [sq]: "bad" }); }
    setTimeout(() => board.setMarks({}), 180);
  });
  $(".go", root).onclick = () => {
    if (running) return;
    running = true; score = 0; $(".sc", root).textContent = 0; t0 = performance.now(); newTarget();
    $(".go", root).disabled = true;
    timer = setInterval(() => {
      const left = DUR - (performance.now() - t0);
      $(".tm", root).textContent = Math.max(0, Math.ceil(left / 1000));
      if (left <= 0) {
        clearInterval(timer); running = false; $(".vision-target", root).textContent = ""; $(".go", root).disabled = false;
        const best = s.vision.best[color] || 0;
        s.vision.best[color] = Math.max(best, score); s.vision.hist.push([Date.now(), color, score]); touchStreak(); save();
        $(".bs", root).textContent = s.vision.best[color];
        sfx(score > best ? "win" : "notify");
        sheet(`<div class="tc"><div class="big-num" style="font-size:60px;font-weight:900">${score}</div><p>${score > best ? "🏆 New best!" : "Best: " + best} · ${score >= 30 ? "Excellent board vision." : score >= 20 ? "Good. Aim for 30+." : "Keep at it — 2 minutes a day gets you to 25+ in two weeks."}</p></div>`, { title: "Time!" });
      }
    }, 100);
  };
  return () => { clearInterval(timer); board.destroy(); };
}

// ---------- Road to 2000 ----------
const MILESTONES = [
  { r: 400, title: "Learn the rules cold", items: ["Finish Level 1 (The basics)", "Play 10 games vs Beginner bots", "Vision: score 15+"] },
  { r: 800, title: "Stop hanging pieces", items: ["Finish Levels 2–3", "Blunder check before EVERY move", "Puzzle rating 800+", "Win vs Mila without falling for Scholar's Mate"] },
  { r: 1100, title: "Tactics become your weapon", items: ["Finish Level 4 (Tactics)", "Puzzle rating 1100+", "Learn your first White opening (Vienna or Italian) and the Caro-Kann", "Review every loss"] },
  { r: 1400, title: "Plans and endgames", items: ["Finish Levels 5–7", "Endgame Gym: all Basic mates + Pawn endings", "Puzzle rating 1400+", "Openings: 3 stars on all main lines of your repertoire"] },
  { r: 1700, title: "Club player", items: ["Finish Levels 8–9 (Tactics II, Endgames II)", "Lucena + Philidor from memory", "Puzzle Rush 25+", "Average accuracy 80%+ in rated rapid games"] },
  { r: 2000, title: "2000", items: ["Finish Levels 10–12", "Beat Nadia (2000) in a rapid game", "Puzzle rating 2000+", "Accuracy 85%+ and no blunders in most games"] },
];

export function renderPlan(root) {
  const s = state();
  const r = bestRating() || 0;
  const next = MILESTONES.find((m) => m.r > r) || MILESTONES[MILESTONES.length - 1];
  const prev = [...MILESTONES].reverse().find((m) => m.r <= r);
  const pct = Math.min(100, Math.round(((r - (prev ? prev.r : 0)) / (next.r - (prev ? prev.r : 0))) * 100));
  const d = s.daily;
  const targets = [
    ["Puzzles", d.puzzles, 15, "puzzle/rated"], ["Lesson", d.lesson, 1, "course"], ["Opening drills", d.opening, 2, "openings/openings"],
    ["Games", d.games, 2, "play"], ["Game reviews", d.reviews, 1, "history"], ["Endgame drill", d.drills, 1, "endgames"],
  ];
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Road to 2000</h2></div>
    <div class="grid" style="max-width:720px">
      <div class="hero"><div class="row between"><div><div class="tiny bold muted">BEST RATING</div><div class="big-num">${r || "—"}</div></div><div class="tc"><div class="tiny bold muted">NEXT</div><div class="bold" style="font-size:24px">${next.r}</div></div></div>
        <div class="progress mt"><i style="width:${r ? pct : 0}%"></i></div><div class="small mt-s">${r ? `${next.r - r} points to "${esc(next.title)}"` : "Play your placement games first."}</div></div>
      <div class="card"><h3>Today</h3>${targets.map(([n, v, goal, link]) => `<div class="list-row" data-go="${link}"><span class="cls-badge lg" style="background:${v >= goal ? "var(--acc)" : "var(--bg3)"}">${v >= goal ? "✓" : ""}</span><div class="grow bold small">${n}</div><span class="small muted">${Math.min(v, goal)}/${goal}</span><span class="chev">›</span></div>`).join("")}
        <p class="tiny muted mt">About 90–120 minutes. The order matters less than doing all of it every day — consistency beats long sessions.</p></div>
      <div class="sec-title">Milestones</div>
      ${MILESTONES.map((m) => `<div class="card" style="${m.r <= r ? "opacity:.6" : m === next ? "box-shadow:0 0 0 2px var(--acc)" : ""}"><div class="row between"><h3 style="margin:0">${m.r <= r ? "✅" : m === next ? "🎯" : "🔒"} ${m.r} — ${esc(m.title)}</h3></div><ul class="small mt-s">${m.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("")}
      <div class="card"><h3>How the hours turn into rating</h3><div class="small step-text">${md(`**Two weeks:** finish Levels 1–3, do the blunder check every move, 15 puzzles a day. Most beginners gain 150–300 points just by not hanging pieces.

**Three months:** tactics (Level 4 + daily puzzles) and one opening per colour. Realistic: 1100–1300.

**One year at 2+ hours a day:** with every loss reviewed and the endgame gym done, 1600–1800 is realistic.

**Two years:** 2000 is achievable for a hard worker who keeps reviewing. The players who stall are the ones who only play and never review.`)}</div></div>
      <div class="rep"></div>
    </div>`;
  $(".back", root).onclick = () => back();
  $$("[data-go]", root).forEach((el) => (el.onclick = () => go(el.dataset.go)));
  Promise.all([loadJSONOpt("repertoire", null), loadOpenings()]).then(([rep, D]) => {
    if (!rep) return;
    const all = [...D.openings, ...D.gambits];
    const nm = (id) => { const o = all.find((x) => x.id === id); return o ? `<a href="#/opening/${o.id}">${esc(o.name)}</a>` : esc(id); };
    $(".rep", root).innerHTML = `<div class="sec-title">Your repertoire</div><div class="card small">${md(rep.intro || "")}</div>` + (rep.stages || []).map((st) => `<div class="card"><h3>${esc(st.band)}</h3>
      <div class="small"><b>White:</b> ${(st.white || []).map(nm).join(", ")}<br><b>Black vs 1.e4:</b> ${(st.black_vs_e4 || []).map(nm).join(", ")}<br><b>Black vs 1.d4:</b> ${(st.black_vs_d4 || []).map(nm).join(", ")}${st.black_vs_other && st.black_vs_other.length ? `<br><b>Black vs others:</b> ${st.black_vs_other.map(nm).join(", ")}` : ""}</div>
      ${st.why ? `<div class="small muted mt-s">${md(st.why)}</div>` : ""}${(st.goals || []).length ? `<ul class="small mt-s">${st.goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}</div>`).join("");
  });
}

// ---------- Library ----------
const CHANNELS = [
  ["GothamChess", "Openings, traps, beginner-friendly game breakdowns"],
  ["Daniel Naroditsky", "Speedrun series: how a GM thinks at every rating"],
  ["Hanging Pawns", "Deep, structured opening and strategy courses"],
  ["Saint Louis Chess Club", "Grandmaster lectures by level (beginner to advanced)"],
  ["ChessNetwork", "Clear explanations of plans and endgames"],
  ["John Bartholomew", "Climbing the rating ladder: fundamentals, explained"],
  ["Chess Vibes", "Tactics, traps and opening principles"],
  ["Remote Chess Academy", "Strategy, attacking and typical mistakes"],
  ["agadmator", "Famous games, move by move"],
  ["ChessDojo", "Training plans and game reviews by rating"],
];
const SITES = [
  ["Lichess Practice", "https://lichess.org/practice", "Free interactive drills: checkmates, tactics, endgames"],
  ["Lichess Puzzle Themes", "https://lichess.org/training/themes", "Millions of puzzles by theme (this app's puzzles come from here)"],
  ["Lichess Opening Explorer", "https://lichess.org/analysis#explorer", "What masters and club players actually play"],
  ["Lichess Studies", "https://lichess.org/study", "Free community courses on every topic"],
  ["Capablanca — Chess Fundamentals (free, public domain)", "https://www.gutenberg.org/ebooks/33870", "The classic beginner-to-club book by a world champion"],
  ["Syzygy tablebase", "https://syzygy-tables.info/", "Perfect play for any endgame with 7 pieces or fewer"],
];
const REPOS = [
  ["official-stockfish/Stockfish", "The engine behind the bots, coach and review"],
  ["nmrugg/stockfish.js", "Stockfish compiled to WebAssembly for the browser"],
  ["lichess-org/chess-openings", "3,865 named openings used for move names and 'Book' moves (CC0)"],
  ["lichess-org/lila", "Lichess source: puzzle database, piece sets, sounds"],
  ["jhlywa/chess.js", "Chess rules: legal moves, check, mate, PGN"],
];

export function renderLibrary(root) {
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Library</h2></div>
    <div class="grid" style="max-width:760px">
      <div class="sec-title">Videos for every lesson</div><div class="vids"><div class="empty small">Loading…</div></div>
      <div class="sec-title">YouTube channels worth your time</div>
      <div class="card">${CHANNELS.map(([n, d]) => `<a class="list-row" style="color:inherit;text-decoration:none" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(n + " chess")}"><span class="cls-badge lg" style="background:#c4302b">▶</span><div class="grow"><div class="bold small">${esc(n)}</div><div class="tiny muted">${esc(d)}</div></div><span class="chev">›</span></a>`).join("")}</div>
      <div class="sec-title">Websites & free books</div>
      <div class="card">${SITES.map(([n, u, d]) => `<a class="list-row" style="color:inherit;text-decoration:none" target="_blank" rel="noopener" href="${u}"><span class="cls-badge lg" style="background:#3d7ea6">↗</span><div class="grow"><div class="bold small">${esc(n)}</div><div class="tiny muted">${esc(d)}</div></div></a>`).join("")}</div>
      <div class="sec-title">Open-source knowledge wired into this app</div>
      <div class="card">${REPOS.map(([n, d]) => `<a class="list-row" style="color:inherit;text-decoration:none" target="_blank" rel="noopener" href="https://github.com/${n}"><span class="cls-badge lg" style="background:#333">⌥</span><div class="grow"><div class="bold small">${esc(n)}</div><div class="tiny muted">${esc(d)}</div></div></a>`).join("")}</div>
    </div>`;
  $(".back", root).onclick = () => back();
  Promise.all([loadCourse(), loadOpenings()]).then(([C, D]) => {
    let html = "";
    for (const lv of C) {
      const v = lv.lessons.filter((l) => (l.videos || []).length);
      if (!v.length) continue;
      html += `<div class="card"><h3>${esc(lv.title)}</h3>${v.map((l) => `<div class="small bold mt">${esc(l.title)}</div>${videoList(l.videos).replace('<div class="sec-title">Watch & read</div>', "")}`).join("")}</div>`;
    }
    const ov = [...D.openings, ...D.gambits].filter((o) => (o.videos || []).length);
    if (ov.length) html += `<div class="card"><h3>Openings</h3>${ov.map((o) => `<div class="small bold mt">${esc(o.name)}</div>${videoList(o.videos).replace('<div class="sec-title">Watch & read</div>', "")}`).join("")}</div>`;
    $(".vids", root).innerHTML = html || '<div class="empty small">Lesson videos arrive with the new course levels.</div>';
  });
}
