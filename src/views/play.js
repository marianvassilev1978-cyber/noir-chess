// Play hub: one-tap rated matchmaking against the player pool, time controls, featured bots, play from a position.
import { $, $$, esc, sheet, toast, timeAgo } from "../util.js";
import { state, save, currentRating, catOf, previewGame, isProvisional, ratingLabel } from "../store.js";
import { BOT_GROUPS, ALL_BOTS, botById, STYLES, customBot } from "../bots.js";
import { findOpponent, playerById, POOL_SIZE } from "../players.js";
import { newGame, startPlacement, resumeLive, nextPlacement, resolveBot } from "./game.js";
import { avatar, deltaPill, sectionHead } from "../ui.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { Chess } from "chess.js";
import { charSVG } from "../art/character.js";
import { bring } from "../art/motion.js";
import { loadOpenings } from "./openings.js";

export const TCS = [
  { cat: "Bullet", key: "bullet", icon: "bullet", list: ["1+0", "1+1", "2+1"] },
  { cat: "Blitz", key: "blitz", icon: "bolt", list: ["3+0", "3+2", "5+0", "5+3"] },
  { cat: "Rapid", key: "rapid", icon: "timer", list: ["10+0", "10+5", "15+10", "30+0"] },
  { cat: "Classical", key: "classical", icon: "sun", list: ["60+0"] },
  { cat: "Unlimited", key: "classical", icon: "infinity", list: ["none"] },
];
export const tcLabel = (t) => (t === "none" ? "∞" : t.replace("+", " | "));
const stakes = (cat, elo) => { const p = previewGame(cat, elo); return `<div class="stakes">${deltaPill(p.win)}<span class="tiny muted" style="align-self:center">win</span>${deltaPill(p.loss)}<span class="tiny muted" style="align-self:center">loss</span>${deltaPill(p.draw)}<span class="tiny muted" style="align-self:center">draw</span></div>`; };

export function render(root) {
  const s = state();
  const st = s.settings;
  let sel = { tc: st.lastTc || st.defaultTc || "10+0", color: st.lastColor || "random", rated: st.lastRated !== undefined ? st.lastRated : true };
  const live = s.live && !s.live.result;
  let opp = null, picked = false;
  const cat = () => catOf(sel.tc);
  const myR = () => currentRating(cat()) || (s.placement && s.placement.rating) || 800;
  function pickOpp() { opp = findOpponent(myR(), { recent: s.recentOpps || [] }); picked = false; }
  const fromId = (id) => (!id ? null : /^p\d+$/.test(id) ? playerById(id) : id.startsWith("echo-") ? customBot(+id.slice(5)) : botById(id));
  opp = fromId(st.pickedOpp); picked = !!opp;
  if (!opp) pickOpp();

  root.innerHTML = `${sectionHead("play", "Play", "", `<span class="badge-pill acc">${esc(cat())} ${ratingLabel(cat())}</span>`)}
    ${live ? `<button class="tile mb resume">${avatar(resolveBot(s.live.bot), 48)}<div class="grow"><div class="t">Continue vs ${esc(s.live.bot.name)}</div><div class="s">Move ${Math.ceil(s.live.moves.length / 2)} · ${s.live.rated ? "rated" : "casual"} · ${tcLabel(s.live.tc)}</div></div><span class="chev">›</span></button>` : ""}
    ${!s.placement && !live && !Object.values(s.ratings).some((x) => x.r && x.games) ? `<button class="tile mb place"><div class="ic" style="background:linear-gradient(135deg,var(--acc2),var(--acc-d))">${I.target}</div><div class="grow"><div class="t">${s.placementRun ? "Continue placement" : "Find my level"}</div><div class="s">${s.placementRun ? s.placementRun.games.length + "/5 games played" : "5 games set your starting rating"}</div></div><span class="chev">›</span></button>` : ""}
    <div class="grid" style="max-width:760px">
      <div class="hero">
        <div class="eyebrow">Next opponent · ${tcLabel(sel.tc)} ${sel.rated ? "rated" : "casual"}</div>
        <div class="pre-card mt-s opp"></div>
        <div class="cta-row"><button class="btn primary big start">${I.play2} Play</button><button class="btn big choose" style="font-size:15px">${I.coach} Change opponent</button></div>
        <div class="row center mt-s"><button class="btn sm ghost reroll">${I.undo} Another player at my level</button></div>
      </div>
      <div class="card">
        <div class="row between"><div class="eyebrow">Time control</div><span class="small muted cat-r"></span></div>
        <div class="tcs mt-s"></div>
        <div class="grid two mt">
          <div><div class="eyebrow mb">Mode</div><div class="seg modes"><button data-r="1">Rated</button><button data-r="0">Casual</button></div></div>
          <div><div class="eyebrow mb">I play</div><div class="seg colors"><button data-c="w">White</button><button data-c="random">Random</button><button data-c="b">Black</button></div></div>
        </div>
        <p class="tiny muted mt-s mode-note"></p>
      </div>
      <div class="sec-title">Featured bots</div>
      <div class="chips scroll tiers">${BOT_GROUPS.map((g) => `<button class="chip" data-t="${g.id}">${g.name} <span class="tiny dim">${g.range}</span></button>`).join("")}</div>
      <div class="bot-row"></div>
      <div class="grid two">
        <button class="tile fromfen"><div class="ic" style="background:linear-gradient(135deg,#f39a3a,#a85a14)">${I.king}</div><div class="grow"><div class="t">From a position</div><div class="s">FEN or an opening</div></div></button>
        <button class="tile friend"><div class="ic" style="background:linear-gradient(135deg,#5fa2ff,#2a5ab8)">${I.swords}</div><div class="grow"><div class="t">Pass & play</div><div class="s">Two players</div></div></button>
        <button class="tile anal"><div class="ic" style="background:linear-gradient(135deg,#c38bff,#6c3fd0)">${I.analysis}</div><div class="grow"><div class="t">Analysis</div><div class="s">Engine board</div></div></button>
        <button class="tile hist"><div class="ic" style="background:linear-gradient(135deg,#6a6a72,#2a2a30)">${I.book}</div><div class="grow"><div class="t">Archive</div><div class="s">${s.games.length} games</div></div></button>
      </div>
    </div>`;

  function drawOpp() {
    const o = opp;
    const rec = s.opponents[o.id];
    $(".hero .eyebrow", root).textContent = `${picked ? "Your pick" : "Matched to you"} · ${tcLabel(sel.tc)} ${sel.rated ? "rated" : "casual"}`;
    $(".opp", root).innerHTML = `${avatar(o, 64)}<div class="grow"><div class="row gap-s">${o.title ? `<span class="title-b">${o.title}</span>` : ""}<b style="font-size:17px">${esc(o.name)}</b><span>${o.flag}</span></div>
      <div class="small muted">${o.elo} · ${STYLES[o.style].name}${o.white && o.white[0] ? " · plays " + esc(o.white[0].replace(/-/g, " ")) : ""}</div>
      ${rec ? `<div class="tiny muted">You ${rec.w}–${rec.d}–${rec.l} vs them</div>` : `<div class="tiny dim">${esc(o.bio || "")}</div>`}
      ${sel.rated ? stakes(cat(), o.elo) : ""}</div>`;
    bring($(".opp .char", root), { enter: true });
  }
  function drawTC() {
    const grp = (g) => `<div><div class="row gap-s tiny bold muted" style="margin:8px 0 6px"><span style="width:16px;height:16px;display:inline-flex">${I[g.icon]}</span>${g.cat}${g.cat !== "Unlimited" ? ` <span class="dim">· ${ratingLabel(g.key)}</span>` : ""}</div><div class="tc-grid">${g.list.map((t) => `<button class="tc-btn ${sel.tc === t ? "on" : ""}" data-tc="${t}">${tcLabel(t)}</button>`).join("")}</div></div>`;
    $(".tcs", root).innerHTML = TCS.slice(0, 3).map(grp).join("") + `<div class="grid two" style="gap:10px">${TCS.slice(3).map(grp).join("")}</div>`;
    $$(".tc-btn", root).forEach((b) => (b.onclick = () => { const oldCat = cat(); sel.tc = b.dataset.tc; if (cat() !== oldCat && !picked) pickOpp(); drawTC(); drawOpp(); drawHead(); }));
  }
  function drawHead() { $(".hero .eyebrow", root).textContent = `${picked ? "Your pick" : "Matched to you"} · ${tcLabel(sel.tc)} ${sel.rated ? "rated" : "casual"}`; $(".cat-r", root).textContent = `${cat()} ${ratingLabel(cat())}${isProvisional(cat()) ? " (provisional)" : ""}`; }
  function drawSeg() {
    $$(".colors button", root).forEach((b) => b.classList.toggle("on", b.dataset.c === sel.color));
    $$(".modes button", root).forEach((b) => b.classList.toggle("on", (b.dataset.r === "1") === sel.rated));
    $(".mode-note", root).textContent = sel.rated ? "Counts for your rating. No takebacks or hints; the coach speaks after the game." : "Live coach after every move, takebacks, hints and the eval bar. No rating change.";
  }
  let tier = (botById(st.lastBot) || {}).tier || tierFor(myR());
  function drawBots() {
    $$(".tiers .chip", root).forEach((c) => c.classList.toggle("on", c.dataset.t === tier));
    const g = BOT_GROUPS.find((x) => x.id === tier);
    $(".bot-row", root).innerHTML = `<div class="bot-scroll">${g.bots.map((b) => `<div class="bcard" data-id="${b.id}"><div class="bport">${charSVG(b.look, { label: b.name })}</div><div class="bname">${b.title ? `<span class="title-b">${b.title}</span> ` : ""}${esc(b.name)}</div><div class="tiny muted">${b.elo} · ${STYLES[b.style].name}</div></div>`).join("")}</div>`;
    $$(".bcard", root).forEach((el) => { bring(el.querySelector(".char")); el.onclick = () => botSheet(botById(el.dataset.id)); });
  }
  function start(o) {
    Object.assign(st, { lastTc: sel.tc, lastColor: sel.color, lastRated: sel.rated, lastCat: cat(), lastBot: o.generated ? st.lastBot : o.id });
    save();
    if (s.live && !s.live.result) s.live = null;
    newGame({ bot: o, tc: sel.tc, color: sel.color, rated: sel.rated, mode: "bot" });
  }
  function botSheet(b) {
    const rec = s.opponents[b.id];
    const sh = sheet(`<div class="bot-sheet"><div class="bs-port">${charSVG(b.look, { label: b.name })}</div>
      <div class="tc"><div class="row center gap-s">${b.title ? `<span class="title-b">${b.title}</span>` : ""}<h2 style="margin:0">${esc(b.name)}</h2><span>${b.flag}</span></div>
      <div class="small muted">${b.elo} · ${STYLES[b.style].name}: ${STYLES[b.style].note.toLowerCase()}</div></div>
      <p class="tc mt-s">${esc(b.bio)}</p>
      ${b.white.length || b.black.length ? `<div class="small muted tc">Openings: ${[...b.white, ...b.black].map((x) => x.replace(/-/g, " ")).join(" · ")}</div>` : ""}
      ${rec ? `<div class="small tc mt-s">Your record: <b>${rec.w}</b> wins · <b>${rec.d}</b> draws · <b>${rec.l}</b> losses</div>` : ""}
      ${sel.rated ? `<div class="row center mt">${stakes(cat(), b.elo)}</div>` : ""}
      <button class="btn primary big mt go">${I.play2} Play ${esc(b.name)} · ${tcLabel(sel.tc)} ${sel.rated ? "rated" : "casual"}</button></div>`, { title: "" });
    sh.el.querySelector(".go").insertAdjacentHTML("afterend", `<button class="btn ghost mt-s setopp" style="width:100%">Set as my opponent</button>`);
    $(".setopp", sh.el).onclick = () => { opp = b; picked = true; st.pickedOpp = b.id; save(); sh.close(); drawOpp(); drawHead(); };
    const ctl = bring($(".bs-port .char", sh.el), { enter: true });
    setTimeout(() => ctl && ctl.expr("happy", 1500), 500);
    $(".go", sh.el).onclick = () => { sh.close(); start(b); };
  }

  $$(".tiers .chip", root).forEach((c) => (c.onclick = () => { tier = c.dataset.t; drawBots(); }));
  $$(".colors button", root).forEach((b) => (b.onclick = () => { sel.color = b.dataset.c; drawSeg(); }));
  $$(".modes button", root).forEach((b) => (b.onclick = () => { sel.rated = b.dataset.r === "1"; drawSeg(); drawOpp(); drawHead(); }));
  $(".start", root).onclick = () => start(opp);
  $(".reroll", root).onclick = () => { s.recentOpps = [opp.id, ...(s.recentOpps || [])].slice(0, 15); st.pickedOpp = null; save(); pickOpp(); drawOpp(); drawHead(); };
  $(".choose", root).onclick = () => opponentPicker(myR(), (o) => { opp = o; picked = true; st.pickedOpp = o.id; save(); drawOpp(); drawHead(); });
  const rs = $(".resume", root); if (rs) rs.onclick = () => { resumeLive(); go("game"); };
  const pl = $(".place", root);
  if (pl) pl.onclick = () => {
    if (s.placementRun && s.placementRun.games.length) return nextPlacement();
    const sh = sheet(`<p>Pick what fits you. The first opponent starts there; it gets stronger when you win and weaker when you lose. 10-minute games, no takebacks.</p>
      <div class="col gap">${[["I just learned the rules", 300], ["I play sometimes, I lose pieces a lot", 600], ["I know basic tactics and openings", 1000], ["I'm a club player", 1400], ["I'm strong (1800+ online)", 1800]].map(([t, e]) => `<button class="tile" data-e="${e}"><div class="grow"><div class="t">${t}</div><div class="s">Start at ${e}</div></div><span class="chev">›</span></button>`).join("")}</div>`, { title: "Find my level" });
    $$("[data-e]", sh.el).forEach((b) => (b.onclick = () => { sh.close(); startPlacement(+b.dataset.e); }));
  };
  $(".friend", root).onclick = () => newGame({ mode: "friend", bot: { id: "friend", name: "Friend", elo: 0 }, color: "w", tc: sel.tc, rated: false });
  $(".anal", root).onclick = () => go("analysis");
  $(".hist", root).onclick = () => go("history");
  $(".fromfen", root).onclick = () => fromPosition(opp, sel);
  drawTC(); drawSeg(); drawOpp(); drawHead(); drawBots();
}

function tierFor(r) { return r < 850 ? "beginner" : r < 1450 ? "intermediate" : r < 2150 ? "advanced" : r < 2850 ? "master" : "engine"; }

// play from a FEN, or from the end of any opening line
function fromPosition(opp, sel) {
  const sh = sheet(`<div class="seg mb fp-k"><button data-k="op" class="on">From an opening</button><button data-k="fen">From a FEN</button></div>
    <div class="fp-op"><input type="search" class="q" placeholder="Search openings (Vienna, Caro-Kann, Alien…)"><div class="list op-list mt-s" style="max-height:44vh;overflow:auto"></div></div>
    <div class="fp-fen hide"><input type="text" class="fen" placeholder="Paste a FEN"><button class="btn primary mt go">Play from here</button></div>
    <p class="tiny muted mt-s">Casual game against ${esc(opp.name)} (${opp.elo}). Positions from a FEN or an opening line are never rated.</p>`, { title: "Play from a position" });
  $$(".fp-k button", sh.el).forEach((b) => (b.onclick = () => { $$(".fp-k button", sh.el).forEach((x) => x.classList.toggle("on", x === b)); $(".fp-op", sh.el).classList.toggle("hide", b.dataset.k !== "op"); $(".fp-fen", sh.el).classList.toggle("hide", b.dataset.k !== "fen"); }));
  $(".go", sh.el).onclick = () => {
    const f = $(".fen", sh.el).value.trim();
    try { const c = new Chess(f); sh.close(); newGame({ bot: opp, tc: sel.tc, color: c.turn(), rated: false, startFen: c.fen() }); } catch { toast("That FEN isn't valid."); }
  };
  loadOpenings().then((D) => {
    const all = [...D.openings, ...D.gambits].flatMap((o) => o.lines.map((l) => ({ o, l })));
    const draw = (q = "") => {
      const L = all.filter(({ o, l }) => !q || (o.name + " " + l.name).toLowerCase().includes(q.toLowerCase())).slice(0, 60);
      $(".op-list", sh.el).innerHTML = L.map(({ o, l }, i) => `<div class="list-row" data-i="${i}"><div class="grow"><div class="small bold">${esc(o.name)}</div><div class="tiny muted">${esc(l.name)} · you play ${o.side === "w" ? "White" : "Black"}</div></div><span class="chev">›</span></div>`).join("");
      $$(".op-list .list-row", sh.el).forEach((r) => (r.onclick = () => {
        const { o, l } = L[+r.dataset.i];
        const c = new Chess();
        for (const m of l.moves) { try { c.move(m.san); } catch { break; } }
        sh.close();
        newGame({ bot: opp, tc: sel.tc, color: c.turn(), rated: false, startFen: c.fen() });
      }));
    };
    $(".q", sh.el).oninput = (e) => draw(e.target.value);
    draw();
  });
}

// ---------- game archive ----------
export function renderHistory(root) {
  const s = state();
  const games = s.games.slice().reverse();
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Archive</h2><button class="btn sm ex">${I.share} Export PGN</button></div>
    <input type="search" class="q mb" placeholder="Search opponent or opening">
    <div class="chips mb hf">${["all", "won", "lost", "drawn", "rated", "bullet", "blitz", "rapid", "classical"].map((f) => `<button class="chip" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}</div>
    <div class="card list"></div>`;
  $(".back", root).onclick = () => back();
  let f = "all", q = "";
  const draw = () => {
    $$(".hf .chip", root).forEach((c) => c.classList.toggle("on", c.dataset.f === f));
    const L = games.filter((g) => (f === "all" || (f === "won" && g.score === 1) || (f === "lost" && g.score === 0) || (f === "drawn" && g.score === 0.5) || (f === "rated" && g.rated) || g.cat === f) && (!q || (g.bot.name + " " + (g.opening || "")).toLowerCase().includes(q)));
    let month = "";
    $(".list", root).innerHTML = L.length ? L.map((g) => {
      const mo = new Date(g.date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const head = mo !== month ? ((month = mo), `<div class="eyebrow" style="padding:12px 2px 4px">${mo}</div>`) : "";
      const res = g.mode === "friend" ? g.result : g.score === 1 ? "W" : g.score === 0 ? "L" : "D";
      const col = g.score === 1 ? "var(--good)" : g.score === 0 ? "var(--bad)" : "#777";
      const acc = g.review ? (g.color === "w" ? g.review.accW : g.review.accB) : g.quick ? (g.color === "w" ? g.quick.accW : g.quick.accB) : null;
      return head + `<div class="list-row" data-id="${g.id}"><span class="cls-badge lg" style="background:${col};border-radius:9px">${res}</span>${avatar(resolveBot(g.bot), 36)}<div class="grow"><div class="bold small">${esc(g.mode === "friend" ? "Pass & play" : g.bot.name)} <span class="muted">${g.bot.elo || ""}</span></div><div class="tiny muted">${tcLabel(g.tc)} · ${g.rated ? "rated" : "casual"} · ${Math.ceil(g.moves.length / 2)} moves${g.opening ? " · " + esc(g.opening) : ""} · ${timeAgo(g.date)}</div></div>${acc != null ? `<span class="badge-pill">${acc}%</span>` : ""}${g.delta != null ? deltaPill(g.delta) : ""}</div>`;
    }).join("") : '<div class="empty">No games here yet.</div>';
    $$(".list-row", root).forEach((r) => (r.onclick = () => go("review/" + r.dataset.id)));
  };
  $$(".hf .chip", root).forEach((c) => (c.onclick = () => { f = c.dataset.f; draw(); }));
  $(".q", root).oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
  $(".ex", root).onclick = async () => { const { toPGN } = await import("./review.js"); const { copyText, download } = await import("../util.js"); const txt = s.games.map(toPGN).join("\n\n"); download("noir-chess-games.pgn", txt, "application/x-chess-pgn"); copyText(txt); };
  draw();
}

// ---------- choose your opponent: matched, featured bots, any of the 2,000 players, or an exact strength ----------
const STYLE_KEYS = ["all", "aggressive", "positional", "trickster", "defensive", "chaotic"];
export function opponentPicker(myR, onPick) {
  const s = state();
  let tab = "match", target = Math.round(myR / 50) * 50, style = "all", tier = (BOT_GROUPS.find((g) => g.bots.some((b) => Math.abs(b.elo - myR) < 200)) || BOT_GROUPS[0]).id, custom = target;
  const sh = sheet(`<div class="seg op-tabs"><button data-t="match">Matched</button><button data-t="bots">Bots</button><button data-t="players">Players</button><button data-t="custom">Custom</button></div><div class="op-body mt"></div>`, { title: "Choose your opponent", wide: true });
  const body = $(".op-body", sh.el);
  const row = (o) => { const r = s.opponents[o.id]; return `<button class="list-row op-row" data-id="${o.id}" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;color:inherit;text-align:left">${avatar(o, 46)}<div class="grow"><div class="row gap-s">${o.title ? `<span class="title-b">${o.title}</span>` : ""}<b class="small">${esc(o.name)}</b><span class="tiny">${o.flag || ""}</span></div><div class="tiny muted">${STYLES[o.style] ? STYLES[o.style].name : ""}${o.bio && !o.generated ? " · " + esc(o.bio) : ""}${r ? ` · you ${r.w}–${r.d}–${r.l}` : ""}</div></div><span class="badge-pill">${o.elo}</span></button>`; };
  const bind = (list) => $$(".op-row", body).forEach((el) => (el.onclick = () => { const o = list.find((x) => x.id === el.dataset.id); sh.close(); onPick(o); }));
  const near = (t, filt, n) => { const out = []; for (let i = 0; i < POOL_SIZE; i++) { const p = playerById("p" + i); if (filt(p)) out.push(p); } return out.sort((a, b) => Math.abs(a.elo - t) - Math.abs(b.elo - t)).slice(0, n).sort((a, b) => a.elo - b.elo); };
  function draw() {
    $$(".op-tabs button", sh.el).forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
    if (tab === "match") {
      const list = near(myR, (p) => Math.abs(p.elo - myR) <= 50 && !(s.recentOpps || []).includes(p.id), 10);
      body.innerHTML = `<p class="tiny muted">Players within ±50 of your rating (${myR}).</p>${list.map(row).join("")}`; bind(list);
    } else if (tab === "bots") {
      const g = BOT_GROUPS.find((x) => x.id === tier);
      body.innerHTML = `<div class="chips scroll op-tiers">${BOT_GROUPS.map((x) => `<button class="chip ${x.id === tier ? "on" : ""}" data-t="${x.id}">${x.name} <span class="tiny dim">${x.range}</span></button>`).join("")}</div><div class="mt-s">${g.bots.map(row).join("")}</div>`;
      $$(".op-tiers .chip", body).forEach((c) => (c.onclick = () => { tier = c.dataset.t; draw(); }));
      bind(g.bots);
    } else if (tab === "players") {
      const list = near(target, (p) => style === "all" || p.style === style, 30);
      body.innerHTML = `<div class="row between"><b>Rating around</b><b class="tv">${target}</b></div><input type="range" class="tr" min="100" max="3200" step="50" value="${target}" aria-label="Rating">
        <div class="chips mt-s">${STYLE_KEYS.map((k) => `<button class="chip st ${style === k ? "on" : ""}" data-s="${k}">${k === "all" ? "All styles" : STYLES[k].name}</button>`).join("")}</div>
        <div class="mt-s plist">${list.map(row).join("")}</div>`;
      $(".tr", body).oninput = (e) => { $(".tv", body).textContent = e.target.value; };
      $(".tr", body).onchange = (e) => { target = +e.target.value; draw(); };
      $$(".st", body).forEach((c) => (c.onclick = () => { style = c.dataset.s; draw(); }));
      bind(list);
    } else {
      body.innerHTML = `<p class="small muted">A sparring partner at exactly the strength you pick.</p><div class="row between"><b>Strength</b><b class="cv">${custom}</b></div><input type="range" class="cr2" min="100" max="3200" step="25" value="${custom}" aria-label="Strength"><button class="btn primary big mt cgo">Choose Echo · ${custom}</button>`;
      $(".cr2", body).oninput = (e) => { custom = +e.target.value; $(".cv", body).textContent = custom; $(".cgo", body).textContent = "Choose Echo · " + custom; };
      $(".cgo", body).onclick = () => { sh.close(); onPick(customBot(custom)); };
    }
  }
  $$(".op-tabs button", sh.el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
  draw();
}
