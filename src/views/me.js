// Profile, stats and achievements.
import { $, $$, esc, sheet, timeAgo } from "../util.js";
import { state, save, TC_CATS, isProvisional } from "../store.js";
import { avatar, userPlayer, ratingChart, ring, sectionHead, emptyState, deltaPill } from "../ui.js";
import { AVATAR_LOOKS } from "../art/cast.js";
import { charSVG } from "../art/character.js";
import { bring } from "../art/motion.js";
import { badgeSVG } from "../art/badges.js";
import { burst } from "../art/fx.js";
import { ACH } from "../achievements.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { resolveBot } from "./game.js";

const CATS = ["bullet", "blitz", "rapid", "classical", "puzzle"];
const accOf = (g) => (g.review ? (g.color === "w" ? g.review.accW : g.review.accB) : g.quick ? (g.color === "w" ? g.quick.accW : g.quick.accB) : null);
const fmtDur = (ms) => { const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000); return h ? `${h}h ${m}m` : `${m}m`; };

export function render(root) {
  const s = state();
  const G = s.games.filter((g) => g.mode !== "friend");
  const me = userPlayer();
  const unlocked = ACH.filter((a) => s.achievements[a.id]).length;
  const joined = new Date(s.profile.joined || Date.now());
  root.innerHTML = `${sectionHead("profile", "", "", `<button class="icon-btn st" aria-label="Settings">${I.gear}</button>`)}
    <div class="grid" style="max-width:760px;margin-top:-60px">
      <div class="prof-head"><button class="prof-av press" aria-label="Change avatar">${avatar(me, 96)}</button>
        <div class="grow"><h1 style="margin:0">${esc(s.settings.name)}</h1><div class="small muted">${me.flag} · member since ${joined.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
        <div class="row gap-s mt-s"><span class="streak">${I.flame}${s.streak.count || 0}</span><span class="badge-pill gold">${s.xp} XP</span><span class="badge-pill">${unlocked}/${ACH.length} badges</span></div></div></div>
      <div class="rbadges">${CATS.map((k) => { const R = s.ratings[k]; return `<button class="rb press" data-k="${k}"><div class="k">${k}</div><div class="v">${R.r || "—"}${R.r && (k === "puzzle" ? R.games < 20 : isProvisional(k)) ? "<small>?</small>" : ""}</div><div class="tiny muted">${R.games} ${k === "puzzle" ? "solved" : "games"}</div></button>`; }).join("")}</div>
      <div class="grid two">
        <button class="tile go-stats"><div class="ic" style="background:linear-gradient(135deg,#5fa2ff,#2a4ab8)">${I.chart}</div><div class="grow"><div class="t">Stats</div><div class="s">Graphs, openings, records</div></div></button>
        <button class="tile go-ach"><div class="ic" style="background:linear-gradient(135deg,#f5c542,#b07d1e)">${I.trophy}</div><div class="grow"><div class="t">Achievements</div><div class="s">${unlocked} of ${ACH.length}</div></div></button>
        <button class="tile go-arch"><div class="ic" style="background:linear-gradient(135deg,#6a6a72,#2a2a30)">${I.book}</div><div class="grow"><div class="t">Game archive</div><div class="s">${s.games.length} games</div></div></button>
        <button class="tile go-coach"><div class="ic" style="background:linear-gradient(135deg,#f39a3a,#a85a14)">${I.coach}</div><div class="grow"><div class="t">Coaches</div><div class="s">Meet all six</div></div></button>
      </div>
      <div class="card"><div class="row between"><h3 style="margin:0" class="ct">Rapid</h3><span class="small muted cb"></span></div><div class="chart-box mt-s"></div></div>
      <div class="card ach-strip"><div class="row between mb"><div class="eyebrow">Latest badges</div><a href="#/achievements" class="small">All ›</a></div><div class="badges-row">${ACH.filter((a) => s.achievements[a.id]).sort((a, b) => s.achievements[b.id] - s.achievements[a.id]).slice(0, 6).map((a) => badgeSVG(a, { size: 54 })).join("") || '<span class="small muted">Play, solve and learn to unlock your first badge.</span>'}</div></div>
      <button class="tile st2"><div class="ic" style="background:linear-gradient(135deg,#8a96aa,#3a4250)">${I.gear}</div><div class="grow"><div class="t">Settings</div><div class="s">Board, pieces, sounds, coach, backup</div></div><span class="chev">›</span></button>
    </div>`;
  bring($(".prof-av .char", root), { enter: true });
  let cat = s.settings.lastCat || "rapid";
  const chart = () => { $(".ct", root).textContent = cat[0].toUpperCase() + cat.slice(1); $(".cb", root).textContent = s.ratings[cat].best ? "best " + s.ratings[cat].best : ""; $(".chart-box", root).innerHTML = ratingChart(s.ratings[cat].hist); $$(".rb", root).forEach((b) => b.classList.toggle("on", b.dataset.k === cat)); };
  $$(".rb", root).forEach((b) => (b.onclick = () => { cat = b.dataset.k; chart(); }));
  chart();
  $(".st", root).onclick = () => go("settings");
  $(".st2", root).onclick = () => go("settings");
  $(".go-stats", root).onclick = () => go("stats");
  $(".go-ach", root).onclick = () => go("achievements");
  $(".go-arch", root).onclick = () => go("history");
  $(".go-coach", root).onclick = () => go("coaches");
  $(".prof-av", root).onclick = () => editProfile(() => render(root));
}

function editProfile(done) {
  const s = state();
  let av = AVATAR_LOOKS[s.profile.avatar] ? s.profile.avatar : "a-knight";
  const sh = sheet(`<label class="eyebrow">Name</label><input type="text" class="nm mt-s" value="${esc(s.settings.name)}" maxlength="20">
    <div class="eyebrow mt">Avatar</div><div class="av-grid mt-s">${Object.entries(AVATAR_LOOKS).map(([id, L]) => `<button class="av-pick ${av === id ? "on" : ""}" data-a="${id}" aria-label="${esc(L.name)}">${charSVG({ ...L, id }, { label: L.name })}<span class="tiny">${esc(L.name)}</span></button>`).join("")}</div>
    <button class="btn primary big mt sv">Save</button>`, { title: "Edit profile" });
  $$(".av-pick .char", sh.el).forEach((c) => bring(c));
  $$(".av-pick", sh.el).forEach((b) => (b.onclick = () => { av = b.dataset.a; $$(".av-pick", sh.el).forEach((x) => x.classList.toggle("on", x === b)); const c = b.querySelector(".char"); c.__ctl && c.__ctl.react("celebrate"); }));
  $(".sv", sh.el).onclick = () => { s.settings.name = $(".nm", sh.el).value.trim() || "You"; s.profile.avatar = av; save(); sh.close(); done(); };
}

// ---------- stats ----------
export function renderStats(root) {
  const s = state();
  const G = s.games.filter((g) => g.mode !== "friend" && g.score != null);
  let cat = s.settings.lastCat || "rapid", range = "all";
  const wdl = (list) => { const w = list.filter((g) => g.score === 1).length, d = list.filter((g) => g.score === 0.5).length, l = list.filter((g) => g.score === 0).length, n = list.length || 1; return { w, d, l, n: list.length, wp: (w / n) * 100, dp: (d / n) * 100, lp: (l / n) * 100 }; };
  const bar = (x, label) => `<div class="wdl"><div class="row between small"><b>${label}</b><span class="muted">${x.n} games</span></div><div class="wdl-bar">${x.n ? `<i class="w" style="width:${x.wp}%"></i><i class="d" style="width:${x.dp}%"></i><i class="l" style="width:${x.lp}%"></i>` : ""}</div><div class="row between tiny muted"><span>${x.w} won (${Math.round(x.wp)}%)</span><span>${x.d} drawn</span><span>${x.l} lost</span></div></div>`;
  // accuracy trend (last 50 games with an accuracy)
  const accs = G.map((g) => accOf(g)).filter((a) => a != null).slice(-50);
  const trend = () => {
    if (accs.length < 2) return emptyState("No accuracy yet", "Review games to build your accuracy trend.");
    const W = 600, H = 120, lo = Math.max(0, Math.min(...accs) - 5), hi = Math.min(100, Math.max(...accs) + 5);
    const X = (i) => 12 + (i / (accs.length - 1)) * (W - 24), Y = (v) => H - 12 - ((v - lo) / (hi - lo || 1)) * (H - 24);
    const avgLine = accs.map((_, i) => { const w = accs.slice(Math.max(0, i - 4), i + 1); return w.reduce((a, b) => a + b, 0) / w.length; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:120px">${accs.map((a, i) => `<circle cx="${X(i)}" cy="${Y(a)}" r="3.2" fill="var(--mut)" opacity=".55"/>`).join("")}<path d="${avgLine.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ")}" fill="none" stroke="var(--acc2)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg><div class="row between tiny muted"><span>${accs.length} games</span><span>average ${Math.round(accs.reduce((a, b) => a + b, 0) / accs.length)}%</span></div>`;
  };
  // openings report
  const ops = {};
  for (const g of G) if (g.opening) { const o = ops[g.opening] || (ops[g.opening] = { n: 0, pts: 0, acc: [] }); o.n++; o.pts += g.score; const a = accOf(g); if (a != null) o.acc.push(a); }
  const opRows = Object.entries(ops).sort((a, b) => b[1].n - a[1].n).slice(0, 10);
  // records
  const wins = G.filter((g) => g.score === 1);
  const best = wins.slice().sort((a, b) => (b.bot.elo || 0) - (a.bot.elo || 0))[0];
  let run = 0, longest = 0; for (const g of G) { run = g.score === 1 ? run + 1 : 0; longest = Math.max(longest, run); }
  const time = (s.timePlayed || 0) || G.reduce((a, g) => a + (g.ms || 0), 0);
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Stats</h2></div>
    <div class="grid" style="max-width:760px">
      <div class="card"><div class="chips scroll cats">${CATS.map((k) => `<button class="chip" data-k="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
        <div class="seg ranges mt"><button data-r="30">1M</button><button data-r="90">3M</button><button data-r="365">1Y</button><button data-r="all">All</button></div>
        <div class="chart-box mt"></div></div>
      <div class="grid three"><div class="stat tc"><div class="k">Best win</div><div class="v">${best ? best.bot.elo : "—"}</div><div class="tiny muted">${best ? esc(best.bot.name) : "no wins yet"}</div></div>
        <div class="stat tc"><div class="k">Win streak</div><div class="v">${longest}</div><div class="tiny muted">longest</div></div>
        <div class="stat tc"><div class="k">Day streak</div><div class="v">${s.streak.best || 0}</div><div class="tiny muted">longest</div></div>
        <div class="stat tc"><div class="k">Played</div><div class="v" style="font-size:24px">${fmtDur(time)}</div><div class="tiny muted">total time</div></div>
        <div class="stat tc"><div class="k">Games</div><div class="v">${G.length}</div><div class="tiny muted">vs bots</div></div>
        <div class="stat tc"><div class="k">Puzzles</div><div class="v">${s.puzzle.solved}</div><div class="tiny muted">solved</div></div></div>
      ${best ? `<button class="tile bw">${avatar(resolveBot(best.bot), 48)}<div class="grow"><div class="eyebrow">Best win</div><div class="t">${esc(best.bot.name)} · ${best.bot.elo}</div><div class="s">${timeAgo(best.date)} · ${esc(best.termination || "")}</div></div><span class="chev">›</span></button>` : ""}
      <div class="card"><h3>Results</h3>${bar(wdl(G), "All games")}${bar(wdl(G.filter((g) => g.color === "w")), "As White")}${bar(wdl(G.filter((g) => g.color === "b")), "As Black")}</div>
      <div class="card"><h3>Accuracy trend</h3>${trend()}</div>
      <div class="card"><h3>Openings report</h3>${opRows.length ? `<div class="op-table"><b class="tiny muted">Opening</b><b class="tiny muted">Games</b><b class="tiny muted">Score</b><b class="tiny muted">Acc.</b>${opRows.map(([n, o]) => `<span class="small">${esc(n)}</span><span class="small num">${o.n}</span><span class="small num" style="color:${o.pts / o.n >= 0.5 ? "var(--good)" : "var(--bad)"}">${Math.round((o.pts / o.n) * 100)}%</span><span class="small num">${o.acc.length ? Math.round(o.acc.reduce((a, b) => a + b, 0) / o.acc.length) + "%" : "–"}</span>`).join("")}</div>` : emptyState("No openings yet", "Your openings appear here as you play.")}</div>
    </div>`;
  $(".back", root).onclick = () => back();
  const draw = () => {
    $$(".cats .chip", root).forEach((c) => c.classList.toggle("on", c.dataset.k === cat));
    $$(".ranges button", root).forEach((b) => b.classList.toggle("on", b.dataset.r === String(range)));
    const since = range === "all" ? 0 : Date.now() - range * 86400000;
    $(".chart-box", root).innerHTML = ratingChart((s.ratings[cat].hist || []).filter((x) => x[0] >= since));
  };
  $$(".cats .chip", root).forEach((c) => (c.onclick = () => { cat = c.dataset.k; draw(); }));
  $$(".ranges button", root).forEach((b) => (b.onclick = () => { range = b.dataset.r === "all" ? "all" : +b.dataset.r; draw(); }));
  const bw = $(".bw", root); if (bw) bw.onclick = () => go("review/" + best.id);
  draw();
}

// ---------- achievements ----------
export function renderAchievements(root) {
  const s = state();
  const n = ACH.filter((a) => s.achievements[a.id]).length;
  root.innerHTML = `${sectionHead("profile", "Achievements", `${n} of ${ACH.length} unlocked`, `<button class="back" aria-label="Back">‹</button>${ring(n / ACH.length, { size: 56, stroke: 5, label: n + "" })}`)}
    <div class="ach-grid">${ACH.map((a) => { const t = s.achievements[a.id]; return `<button class="ach press ${t ? "on" : ""}" data-id="${a.id}">${badgeSVG(a, { size: 76, locked: !t })}<b>${esc(a.name)}</b><span class="tiny muted">${t ? new Date(t).toLocaleDateString() : "Locked"}</span></button>`; }).join("")}</div>`;
  $(".back", root).onclick = () => back();
  $$(".ach", root).forEach((b) => (b.onclick = () => {
    const a = ACH.find((x) => x.id === b.dataset.id), t = s.achievements[a.id];
    const sh = sheet(`<div class="tc"><div class="ach-big">${badgeSVG(a, { size: 150, locked: !t, shine: !!t })}</div><h2 style="margin:8px 0 2px">${esc(a.name)}</h2><p class="muted">${esc(a.desc)}</p><p class="small">${t ? "Unlocked " + new Date(t).toLocaleDateString() : "Not unlocked yet."}</p></div>`, { title: "" });
    if (t) setTimeout(() => burst(sh.el.querySelector(".ach-big"), { size: 120 }), 300);
  }));
}
