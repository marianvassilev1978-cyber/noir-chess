// Home: your coach greets you, your rating, one-tap play, today's goals, what to do next.
import { $, esc, timeAgo } from "../util.js";
import { state, currentRating, bestRating, storageMode } from "../store.js";
import { avatar, ring, deltaPill, userPlayer } from "../ui.js";
import { ALL_BOTS } from "../bots.js";
import { resumeLive, newGame } from "./game.js";
import { loadCourse } from "./learn.js";
import { dueLines } from "./openings.js";
import { I } from "../icons.js";
import { go } from "../router.js";
import { engineName } from "../engine.js";
import { mainCoach, fill } from "../coaches.js";
import { charSVG } from "../art/character.js";
import { bring, typeInto, countTo } from "../art/motion.js";
import { coverSVG } from "../art/badges.js";
import { pick } from "../util.js";

function sparkline(hist) {
  if (!hist || hist.length < 2) return "";
  const pts = hist.slice(-24).map((x) => x[1]);
  const lo = Math.min(...pts) - 5, hi = Math.max(...pts) + 5, W = 200, H = 56;
  const X = (i) => (i / (pts.length - 1)) * W, Y = (v) => H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 10);
  const d = pts.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#spk)"/><path d="${d}" fill="none" stroke="var(--acc2)" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${X(pts.length - 1)}" cy="${Y(pts[pts.length - 1])}" r="3.5" fill="var(--acc2)"/></svg>`;
}

export function render(root) {
  const s = state();
  const d = s.daily;
  const live = s.live && !s.live.result;
  const cat = s.settings.lastCat || "rapid";
  const r = currentRating(cat);
  const R = s.ratings[cat] || s.ratings.rapid;
  const hr = new Date().getHours();
  const greet = hr < 5 ? "Late-night grind" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const goals = [["Puzzles", d.puzzles, 15, I.puzzle, "puzzle/rated"], ["Lesson", d.lesson, 1, I.learn, "course"], ["Openings", d.opening, 2, I.book, "openings/openings"], ["Games", d.games, 2, I.play, "play"], ["Review", d.reviews, 1, I.analysis, "history"]];
  const done = goals.filter(([, v, g]) => v >= g).length;
  const due = dueLines().length;
  const lastGame = s.games[s.games.length - 1];
  const sugg = ALL_BOTS.reduce((a, b) => (Math.abs(b.elo - (r || 600)) < Math.abs(a.elo - (r || 600)) ? b : a), ALL_BOTS[0]);
  const coach = mainCoach();
  const name = esc(s.settings.name || "You");
  const lastDelta = R && R.hist && R.hist.length > 1 ? R.hist[R.hist.length - 1][1] - R.hist[R.hist.length - 2][1] : null;
  const mist = s.mistakes.filter((m) => m.solved < 2).length;

  root.innerHTML = `
    <div class="home-top">
      <div class="grow"><div class="hi">${greet}</div><h1>${name}</h1></div>
      <span class="streak" title="Daily streak">${I.flame}${s.streak.count || 0}</span>
      <button class="press" style="border:0;background:none;padding:0;cursor:pointer" aria-label="Profile">${avatar(userPlayer(), 44)}</button>
    </div>
    <div class="grid" style="max-width:760px">
      <div class="hero">
        <div class="hero-coach"><div class="stage">${charSVG(coach.look, { bg: false, label: coach.name })}</div><div class="bubble"><div class="who">${esc(coach.short)} · ${esc(coach.role)}</div><div class="txt small"></div></div></div>
        <div class="rate-row">
          <div><div class="eyebrow">${esc(cat)} rating</div><div class="big-num rnum">${r || "—"}</div>
            <div class="small muted mt-s">${r ? `${deltaPill(lastDelta)} &nbsp;Best ${bestRating()} · ${Math.max(0, 2000 - bestRating())} to 2000` : "Play 5 placement games to get rated"}</div></div>
          ${sparkline(R && R.hist)}
        </div>
        <div class="cta-row">
          ${r ? `<button class="btn primary big qp">${I.play2} Play ${esc(sugg.name)}</button>` : `<button class="btn primary big pl">${I.target} Find my level</button>`}
          <button class="btn big pz" style="font-size:16px">${I.puzzle} Puzzles</button>
        </div>
      </div>
      ${live ? `<button class="tile resume"><div class="mini-b">${avatar(s.live.bot, 48)}</div><div class="grow"><div class="t">Continue vs ${esc(s.live.bot.name)}</div><div class="s">Move ${Math.ceil(s.live.moves.length / 2)} · ${s.live.rated ? "rated" : "casual"} · ${esc(s.live.tc === "none" ? "unlimited" : s.live.tc.replace("+", " | "))}</div></div><span class="chev">›</span></button>` : ""}
      <div class="card">
        <div class="row between mb"><div><div class="eyebrow">Today</div><div class="display" style="font-size:24px">${done === goals.length ? "All goals done" : `${done} of ${goals.length} goals`}</div></div><a href="#/plan" class="small">Road to 2000 ›</a></div>
        <div class="goals">${goals.map(([n, v, g, ic, link]) => `<div class="goal ${v >= g ? "done" : ""}" data-go="${link}">${ring(v / g, { size: 52, stroke: 5, label: v >= g ? I.check : ic })}<span>${Math.min(v, g)}/${g}</span><span style="margin-top:-6px">${n}</span></div>`).join("")}</div>
      </div>
      <div class="next-lesson"></div>
      ${due ? `<button class="tile due"><div class="ic" style="background:linear-gradient(135deg,#f5c542,#b07d1e)">${I.timer}</div><div class="grow"><div class="t">${due} opening line${due > 1 ? "s" : ""} due</div><div class="s">Spaced repetition keeps them in memory</div></div><span class="chev">›</span></button>` : ""}
      ${mist ? `<button class="tile mist"><div class="ic" style="background:linear-gradient(135deg,#c38bff,#6c55c9)">${I.target}</div><div class="grow"><div class="t">Fix your mistakes</div><div class="s">${mist} positions from your own games</div></div><span class="chev">›</span></button>` : ""}
      ${lastGame ? `<button class="tile lg-card">${avatar(lastGame.bot, 48)}<div class="grow"><div class="t">Last game vs ${esc(lastGame.bot.name)}</div><div class="s">${lastGame.score === 1 ? "Won" : lastGame.score === 0 ? "Lost" : lastGame.mode === "friend" ? lastGame.result : "Draw"} · ${timeAgo(lastGame.date)}${lastGame.review ? ` · ${lastGame.color === "w" ? lastGame.review.accW : lastGame.review.accB}% accuracy` : ""}</div></div><span class="badge-pill ${lastGame.review ? "" : "acc"}">${lastGame.review ? "Review" : "Run review"}</span></button>` : ""}
      <div class="tiny dim tc" style="padding:6px 0 4px">${esc(engineName())} · saved ${storageMode() === "cloud" ? "to your account and this device" : "on this device"}</div>
    </div>`;

  // the coach comes alive and greets you
  const ctl = bring($(".hero-coach .char", root), { enter: true });
  const line = r && lastDelta > 0 ? `Nice — +${lastDelta} last game, ${s.settings.name || "friend"}. Let's keep the streak going.` : fill(pick(coach.hello), { name: s.settings.name || "friend" });
  setTimeout(() => { ctl && ctl.expr("happy", 1600); typeInto($(".hero-coach .txt", root), esc(line), { ctl }); }, 380);
  if (r) countTo($(".rnum", root), Math.max(0, r - 60), r, { duration: 1.1 });

  $(".press", root).onclick = () => go("profile");
  const rs = $(".resume", root); if (rs) rs.onclick = () => { resumeLive(); go("game"); };
  const qp = $(".qp", root); if (qp) qp.onclick = () => go("play");
  const pl = $(".pl", root); if (pl) pl.onclick = () => go("play");
  $(".pz", root).onclick = () => go("puzzles");
  root.querySelectorAll("[data-go]").forEach((g) => (g.onclick = () => go(g.dataset.go)));
  const du = $(".due", root); if (du) du.onclick = () => go("opening/_review");
  const mi = $(".mist", root); if (mi) mi.onclick = () => go("mistakes");
  const lg = $(".lg-card", root); if (lg) lg.onclick = () => go("review/" + lastGame.id);
  loadCourse().then((C) => {
    const all = C.flatMap((lv, k) => lv.lessons.map((l) => ({ ...l, level: lv, k })));
    const n = all.find((l) => !(s.lessons[l.id] && s.lessons[l.id].done));
    const box = $(".next-lesson", root); if (!box || !n) return;
    box.innerHTML = `<div class="cover-card nl"><div class="cv">${coverSVG(n.k)}</div><div class="meta"><div class="eyebrow" style="color:#fff;opacity:.8">Next lesson · ${esc(n.level.title.replace(/^Level \d+ — /, ""))}</div><div class="t">${esc(n.title)}</div><div class="s">${n.minutes || 10} min · continue where you left off</div></div></div>`;
    $(".nl", box).onclick = () => go("lesson/" + n.id);
  }).catch(() => {});
}
