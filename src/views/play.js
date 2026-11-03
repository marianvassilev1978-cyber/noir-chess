// Play setup: pick a bot, a time control, colour and mode.
import { $, $$, esc, sheet, toast, timeAgo } from "../util.js";
import { state, save, currentRating } from "../store.js";
import { BOT_GROUPS, ALL_BOTS, botById, customBot } from "../bots.js";
import { newGame, startPlacement, resumeLive, nextPlacement } from "./game.js";
import { avatar } from "../ui.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { Chess } from "chess.js";

export const TCS = [
  { cat: "Bullet", icon: "bullet", list: ["1+0", "1+1", "2+1"] },
  { cat: "Blitz", icon: "bolt", list: ["3+0", "3+2", "5+0", "5+3"] },
  { cat: "Rapid", icon: "timer", list: ["10+0", "10+5", "15+10", "30+0"] },
  { cat: "Classical", icon: "sun", list: ["45+15", "60+0", "90+30"] },
  { cat: "Unlimited", icon: "infinity", list: ["none"] },
];
const tcLabel = (t) => (t === "none" ? "∞" : t.endsWith("+0") ? t.split("+")[0] + " min" : t.replace("+", " | "));

export function render(root) {
  const s = state();
  const st = s.settings;
  let sel = { bot: st.lastBot || suggestBot(), tc: st.lastTc || "10+0", color: st.lastColor || "random", rated: st.lastRated !== undefined ? st.lastRated : true, custom: st.lastCustom || 1200 };
  const rating = currentRating("rapid");
  const live = s.live && !s.live.result;
  root.innerHTML = `
    <div class="topbar"><h2>Play</h2>${rating ? `<span class="badge-pill acc">Rapid ${rating}</span>` : ""}</div>
    ${live ? `<button class="tile mb resume"><div class="ic" style="background:var(--acc)">${I.play2}</div><div><div class="t">Continue your game</div><div class="s">vs ${esc(s.live.bot.name)} · move ${Math.ceil(s.live.moves.length / 2)}</div></div><span class="chev">›</span></button>` : ""}
    ${!s.placement && !live ? `<button class="tile mb place" style="background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 35%,var(--panel)),var(--panel))"><div class="ic" style="background:var(--acc)">${I.target}</div><div><div class="t">${s.placementRun ? "Continue placement" : "Find my level"}</div><div class="s">${s.placementRun ? s.placementRun.games.length + "/5 games played" : "5 games to set your starting rating"}</div></div><span class="chev">›</span></button>` : ""}
    <div class="grid" style="grid-template-columns:minmax(0,1fr);max-width:720px">
    <div class="card">
      <div class="bot-hero sel-hero"></div>
      <div class="sec-title">Bots</div>
      <div class="chips scroll grp-chips mb">${BOT_GROUPS.map((g, i) => `<button class="chip" data-g="${g.id}">${g.name} <span class="muted tiny">${g.range}</span></button>`).join("")}<button class="chip" data-g="custom">Custom</button></div>
      <div class="bot-grid bots"></div>
      <div class="custom-box hide mt">
        <div class="row between"><b>Bot strength</b><b class="cv">${sel.custom}</b></div>
        <input type="range" min="100" max="3200" step="50" value="${sel.custom}" class="cr">
      </div>
    </div>
    <div class="card">
      <div class="sec-title" style="margin-top:0">Time control</div>
      <div class="tcs"></div>
      <div class="sec-title">I play as</div>
      <div class="seg colors"><button data-c="w">♔ White</button><button data-c="random">🎲 Random</button><button data-c="b">♚ Black</button></div>
      <div class="sec-title">Mode</div>
      <div class="seg modes"><button data-r="1">Rated</button><button data-r="0">Practice + coach</button></div>
      <p class="small muted mt-s mode-note"></p>
    </div>
    <button class="btn primary big start">Play</button>
    <div class="grid two">
      <button class="tile friend"><div class="ic" style="background:#5b8bb4">${I.swords}</div><div><div class="t">Pass & play</div><div class="s">Two players, one phone</div></div></button>
      <button class="tile anal"><div class="ic" style="background:#8c6fbf">${I.analysis}</div><div><div class="t">Analysis</div><div class="s">Engine board</div></div></button>
      <button class="tile fromfen"><div class="ic" style="background:#c47a3a">${I.king}</div><div><div class="t">From position</div><div class="s">Play a FEN vs a bot</div></div></button>
      <button class="tile hist"><div class="ic" style="background:#4a4846">${I.book}</div><div><div class="t">Game history</div><div class="s">${s.games.length} games</div></div></button>
    </div>
    </div>`;

  const grp = (id) => BOT_GROUPS.find((g) => g.bots.some((b) => b.id === id));
  let group = sel.bot === "custom" ? "custom" : (grp(sel.bot) || BOT_GROUPS[0]).id;

  function drawBots() {
    $$(".grp-chips .chip", root).forEach((c) => c.classList.toggle("on", c.dataset.g === group));
    const box = $(".bots", root);
    $(".custom-box", root).classList.toggle("hide", group !== "custom");
    if (group === "custom") { box.innerHTML = ""; sel.bot = "custom"; hero(); return; }
    const g = BOT_GROUPS.find((x) => x.id === group);
    box.innerHTML = g.bots.map((b) => `<div class="bot ${sel.bot === b.id ? "on" : ""}" data-id="${b.id}">${avatar(b, 52)}<div class="n">${esc(b.name)}</div><div class="e">${b.elo}</div></div>`).join("");
    $$(".bot", box).forEach((el) => (el.onclick = () => { sel.bot = el.dataset.id; drawBots(); }));
    hero();
  }
  function curBot() { return sel.bot === "custom" ? customBot(sel.custom) : botById(sel.bot) || ALL_BOTS[0]; }
  function hero() {
    const b = curBot();
    $(".sel-hero", root).innerHTML = `${avatar(b, 72)}<div class="grow"><div class="row gap-s"><h3 style="margin:0">${esc(b.name)}</h3><span class="badge-pill">${b.elo}</span> <span>${b.flag || ""}</span></div><div class="small muted mt-s">${esc(b.bio)}</div>${rating ? `<div class="tiny mt-s ${b.elo > rating + 300 ? "delta-down" : b.elo < rating - 300 ? "muted" : "delta-up"}">${b.elo > rating + 300 ? "Much stronger than you — expect to lose, learn from the review." : b.elo < rating - 300 ? "Weaker than you — good for practising openings." : "A fair fight for your rating."}</div>` : ""}</div>`;
  }
  function drawTC() {
    $(".tcs", root).innerHTML = TCS.map((g) => `<div class="row gap-s small bold muted" style="margin:8px 0 6px"><span style="width:18px;height:18px;display:inline-flex">${I[g.icon]}</span>${g.cat}</div><div class="tc-grid">${g.list.map((t) => `<button class="tc-btn ${sel.tc === t ? "on" : ""}" data-tc="${t}">${tcLabel(t)}</button>`).join("")}</div>`).join("");
    $$(".tc-btn", root).forEach((b) => (b.onclick = () => { sel.tc = b.dataset.tc; drawTC(); }));
  }
  function drawSeg() {
    $$(".colors button", root).forEach((b) => b.classList.toggle("on", b.dataset.c === sel.color));
    $$(".modes button", root).forEach((b) => b.classList.toggle("on", (b.dataset.r === "1") === sel.rated));
    $(".mode-note", root).textContent = sel.rated ? "Counts for your rating. No takebacks, no hints, coach after the game." : "Live coach after every move, takebacks, hints and the blunder guard. Doesn't change your rating.";
  }
  $$(".grp-chips .chip", root).forEach((c) => (c.onclick = () => { group = c.dataset.g; if (group !== "custom") { const g = BOT_GROUPS.find((x) => x.id === group); if (!g.bots.some((b) => b.id === sel.bot)) sel.bot = g.bots[0].id; } drawBots(); }));
  $$(".colors button", root).forEach((b) => (b.onclick = () => { sel.color = b.dataset.c; drawSeg(); }));
  $$(".modes button", root).forEach((b) => (b.onclick = () => { sel.rated = b.dataset.r === "1"; drawSeg(); }));
  $(".cr", root).oninput = (e) => { sel.custom = +e.target.value; $(".cv", root).textContent = sel.custom; hero(); };
  $(".start", root).onclick = () => {
    Object.assign(st, { lastBot: sel.bot, lastTc: sel.tc, lastColor: sel.color, lastRated: sel.rated, lastCustom: sel.custom });
    save();
    if (s.live && !s.live.result) s.live = null;
    newGame({ bot: curBot(), tc: sel.tc, color: sel.color, rated: sel.rated, mode: "bot" });
  };
  const rs = $(".resume", root); if (rs) rs.onclick = () => { resumeLive(); go("game"); };
  const pl = $(".place", root);
  if (pl) pl.onclick = () => {
    if (s.placementRun && s.placementRun.games.length) return nextPlacement();
    const sh = sheet(`<p>Pick what fits you best. The first bot starts there; it gets stronger when you win and weaker when you lose. Games are 10 minutes, no takebacks.</p>
      <div class="col gap">${[["I just learned the rules", 300], ["I play sometimes, I lose pieces a lot", 600], ["I know basic tactics and openings", 1000], ["I'm a club player", 1400], ["I'm strong (1800+ online)", 1800]].map(([t, e]) => `<button class="tile" data-e="${e}"><div><div class="t">${t}</div><div class="s">Start at ${e}</div></div><span class="chev">›</span></button>`).join("")}</div>`, { title: "Find my level" });
    $$("[data-e]", sh.el).forEach((b) => (b.onclick = () => { sh.close(); startPlacement(+b.dataset.e); }));
  };
  $(".friend", root).onclick = () => newGame({ mode: "friend", bot: { id: "friend", name: "Friend", elo: 0, av: "♚" }, color: "w", tc: sel.tc, rated: false });
  $(".anal", root).onclick = () => go("analysis");
  $(".hist", root).onclick = () => go("history");
  $(".fromfen", root).onclick = () => {
    const sh = sheet(`<p class="small">Paste a FEN. You play the side to move against ${esc(curBot().name)} (${curBot().elo}).</p><input type="text" class="fen" placeholder="FEN"><button class="btn primary mt go">Play from here</button>`, { title: "Play from position" });
    $(".go", sh.el).onclick = () => {
      const f = $(".fen", sh.el).value.trim();
      try { const c = new Chess(f); sh.close(); newGame({ bot: curBot(), tc: sel.tc, color: c.turn(), rated: false, startFen: c.fen() }); } catch { toast("That FEN isn't valid."); }
    };
  };
  drawBots(); drawTC(); drawSeg();
}

function suggestBot() {
  const r = currentRating("rapid") || 600;
  let best = ALL_BOTS[0];
  for (const b of ALL_BOTS) if (Math.abs(b.elo - r) < Math.abs(best.elo - r)) best = b;
  return best.id;
}

// ---------- game history ----------
export function renderHistory(root) {
  const s = state();
  const games = s.games.slice().reverse();
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Game history</h2></div>
    <div class="chips mb hf">${["all", "won", "lost", "drawn", "rated"].map((f) => `<button class="chip" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}</div>
    <div class="card list"></div>`;
  $(".back", root).onclick = () => back();
  let f = "all";
  const draw = () => {
    $$(".hf .chip", root).forEach((c) => c.classList.toggle("on", c.dataset.f === f));
    const L = games.filter((g) => f === "all" || (f === "won" && g.score === 1) || (f === "lost" && g.score === 0) || (f === "drawn" && g.score === 0.5) || (f === "rated" && g.rated));
    $(".list", root).innerHTML = L.length ? L.map((g) => {
      const res = g.mode === "friend" ? g.result : g.score === 1 ? "W" : g.score === 0 ? "L" : "D";
      const col = g.score === 1 ? "var(--acc)" : g.score === 0 ? "var(--red)" : "#777";
      const acc = g.review ? (g.color === "w" ? g.review.accW : g.review.accB) : null;
      return `<div class="list-row" data-id="${g.id}"><span class="cls-badge lg" style="background:${col};border-radius:6px">${res}</span>${avatar(g.bot, 34)}<div class="grow"><div class="bold small">${esc(g.mode === "friend" ? "Pass & play" : g.bot.name)} <span class="muted">(${g.bot.elo || ""})</span></div><div class="tiny muted">${g.tc === "none" ? "∞" : g.tc} · ${g.rated ? "Rated" : "Casual"} · ${Math.ceil(g.moves.length / 2)} moves · ${timeAgo(g.date)}</div></div>${acc != null ? `<span class="badge-pill">${acc}%</span>` : ""}${g.delta != null ? `<span class="${g.delta >= 0 ? "delta-up" : "delta-down"} small">${g.delta >= 0 ? "+" : ""}${g.delta}</span>` : ""}</div>`;
    }).join("") : '<div class="empty">No games yet.</div>';
    $$(".list-row", root).forEach((r) => (r.onclick = () => go("review/" + r.dataset.id)));
  };
  $$(".hf .chip", root).forEach((c) => (c.onclick = () => { f = c.dataset.f; draw(); }));
  draw();
}
