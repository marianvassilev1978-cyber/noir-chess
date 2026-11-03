// Home dashboard.
import { $, $$, esc, timeAgo } from "../util.js";
import { state, currentRating, bestRating } from "../store.js";
import { avatar, userPlayer, ratingChart } from "../ui.js";
import { ALL_BOTS } from "../bots.js";
import { resumeLive, newGame } from "./game.js";
import { loadCourse } from "./learn.js";
import { dueLines } from "./openings.js";
import { I } from "../icons.js";
import { go } from "../router.js";
import { engineName } from "../engine.js";
import { storageMode } from "../store.js";

export function render(root) {
  const s = state();
  const d = s.daily;
  const live = s.live && !s.live.result;
  const r = currentRating("rapid");
  const hr = new Date().getHours();
  const greet = hr < 5 ? "Late night grind" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const targets = [["Puzzles", d.puzzles, 15], ["Lesson", d.lesson, 1], ["Openings", d.opening, 2], ["Games", d.games, 2], ["Review", d.reviews, 1]];
  const done = targets.filter(([, v, g]) => v >= g).length;
  const due = dueLines().length;
  const lastGame = s.games[s.games.length - 1];
  const sugg = ALL_BOTS.reduce((a, b) => (Math.abs(b.elo - (r || 600)) < Math.abs(a.elo - (r || 600)) ? b : a), ALL_BOTS[0]);
  root.innerHTML = `
    <div class="row gap mb" style="padding-top:4px">
      <div class="grow"><div class="small muted bold">${greet}</div><h2 style="margin:0">${esc(s.settings.name || "You")}</h2></div>
      <div class="row gap-s" title="Daily streak"><span class="streak-flame">🔥</span><b style="font-size:20px">${s.streak.count || 0}</b></div>
    </div>
    <div class="grid" style="max-width:760px">
    ${live ? `<button class="tile resume" style="background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 40%,var(--panel)),var(--panel))"><div class="ic" style="background:var(--acc)">${I.play2}</div><div><div class="t">Continue your game</div><div class="s">vs ${esc(s.live.bot.name)} · move ${Math.ceil(s.live.moves.length / 2)}</div></div><span class="chev">›</span></button>` : ""}
    <div class="hero">
      <div class="row between">
        <div><div class="tiny muted bold">RAPID RATING</div><div class="big-num">${r || "—"}</div><div class="small muted">${r ? `Best ${bestRating()} · Road to 2000: ${Math.max(0, 2000 - bestRating())} to go` : "Find your level in 5 games"}</div></div>
        <div class="tc"><svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--bg3)" stroke-width="4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--acc)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(done / targets.length) * 97.4} 97.4" transform="rotate(-90 18 18)"/><text x="18" y="21.5" text-anchor="middle" fill="currentColor" font-size="10" font-weight="900">${done}/${targets.length}</text></svg><div class="tiny muted bold">TODAY</div></div>
      </div>
      <div class="row gap mt">
        ${r ? `<button class="btn primary grow qp">${I.play} Play ${esc(sugg.name)} (${sugg.elo})</button>` : `<button class="btn primary grow pl">${I.target} Find my level</button>`}
        <button class="btn grow pz">${I.puzzle} Puzzles</button>
      </div>
    </div>
    <div class="card"><div class="row between"><h3 style="margin:0">Today's plan</h3><a href="#/plan" class="small">Road to 2000 ›</a></div>
      <div class="grid three mt" style="grid-template-columns:repeat(5,1fr);gap:6px">${targets.map(([n, v, g]) => `<div class="stat tc" style="padding:8px 4px;${v >= g ? "background:color-mix(in srgb,var(--acc) 28%,var(--panel2))" : ""}"><div class="v" style="font-size:17px">${Math.min(v, g)}/${g}</div><div class="k" style="font-size:9.5px">${n}</div></div>`).join("")}</div>
    </div>
    <div class="next-lesson"></div>
    ${due ? `<button class="tile due"><div class="ic" style="background:#e09b2d">${I.timer}</div><div><div class="t">${due} opening line${due > 1 ? "s" : ""} due</div><div class="s">Quick review keeps them in memory</div></div><span class="chev">›</span></button>` : ""}
    ${s.mistakes.filter((m) => m.solved < 2).length ? `<button class="tile mist"><div class="ic" style="background:#8c6fbf">${I.target}</div><div><div class="t">Fix your mistakes</div><div class="s">${s.mistakes.filter((m) => m.solved < 2).length} positions from your own games</div></div><span class="chev">›</span></button>` : ""}
    ${lastGame ? `<div class="card tap lg-card"><div class="row gap">${avatar(lastGame.bot, 42)}<div class="grow"><div class="bold">Last game vs ${esc(lastGame.bot.name)}</div><div class="small muted">${lastGame.score === 1 ? "Won" : lastGame.score === 0 ? "Lost" : lastGame.mode === "friend" ? lastGame.result : "Draw"} · ${timeAgo(lastGame.date)}${lastGame.review ? ` · accuracy ${lastGame.color === "w" ? lastGame.review.accW : lastGame.review.accB}%` : ""}</div></div><span class="btn sm">${lastGame.review ? "Review" : "Run review"}</span></div></div>` : ""}
    <div class="card"><div class="row between"><h3 style="margin:0">Rating</h3><a href="#/profile" class="small">All stats ›</a></div>${ratingChart(s.ratings.rapid.hist.length > 1 ? s.ratings.rapid.hist : s.ratings.blitz.hist)}</div>
    <div class="tiny dim tc">${esc(engineName())} · progress saved ${storageMode() === "cloud" ? "to your Claude account and this device" : "on this device"}</div>
    </div>`;
  const rs = $(".resume", root); if (rs) rs.onclick = () => { resumeLive(); go("game"); };
  const qp = $(".qp", root); if (qp) qp.onclick = () => newGame({ bot: sugg, tc: s.settings.lastTc || "10+0", color: "random", rated: true });
  const pl = $(".pl", root); if (pl) pl.onclick = () => go("play");
  $(".pz", root).onclick = () => go("puzzle/rated");
  const du = $(".due", root); if (du) du.onclick = () => go("opening/_review");
  const mi = $(".mist", root); if (mi) mi.onclick = () => go("mistakes");
  const lg = $(".lg-card", root); if (lg) lg.onclick = () => go("review/" + lastGame.id);
  loadCourse().then((C) => {
    const all = C.flatMap((lv) => lv.lessons.map((l) => ({ ...l, level: lv })));
    const n = all.find((l) => !(s.lessons[l.id] && s.lessons[l.id].done));
    const box = $(".next-lesson", root); if (!box || !n) return;
    box.innerHTML = `<button class="tile nl"><div class="ic" style="background:#3d7ea6">${I.learn}</div><div class="grow"><div class="s bold">${esc(n.level.title)}</div><div class="t">${esc(n.title)}</div><div class="s">${n.minutes || 10} min</div></div><span class="chev">›</span></button>`;
    $(".nl", box).onclick = () => go("lesson/" + n.id);
  }).catch(() => {});
}
