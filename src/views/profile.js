// Profile, stats and settings (themes, pieces, sounds, gameplay, backup).
import { $, $$, esc, sheet, toast, copyText, download, confirmSheet } from "../util.js";
import { state, save, exportBackup, importBackup, resetAll, storageMode, TC_CATS } from "../store.js";
import { BOARDS, PIECE_SETS, APP_THEMES, applyTheme, miniBoardStyle } from "../themes.js";
import { ratingChart, avatar, userPlayer } from "../ui.js";
import { Board, pieceURL } from "../board.js";
import { play as sfx } from "../sound.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { engineName } from "../engine.js";

export function render(root) {
  const s = state();
  const G = s.games.filter((g) => g.mode !== "friend");
  const w = G.filter((g) => g.score === 1).length, l = G.filter((g) => g.score === 0).length, d = G.filter((g) => g.score === 0.5).length;
  const reviewed = G.filter((g) => g.review);
  const avgAcc = reviewed.length ? Math.round(reviewed.slice(-20).reduce((a, g) => a + (g.color === "w" ? g.review.accW : g.review.accB), 0) / Math.min(20, reviewed.length)) : null;
  let cat = "rapid";
  root.innerHTML = `<div class="topbar"><h2>Profile</h2><button class="icon-btn st">${I.gear}</button></div>
    <div class="grid" style="max-width:760px">
      <div class="card row gap">${avatar(userPlayer(), 64)}<div class="grow"><h3 style="margin:0">${esc(s.settings.name)}</h3><div class="small muted">🇧🇬 · ${s.xp} XP · 🔥 ${s.streak.count} day streak (best ${s.streak.best || s.streak.count})</div></div><button class="btn sm ed">Edit</button></div>
      <div class="grid three">${["bullet", "blitz", "rapid", "classical", "puzzle"].map((k) => `<button class="stat tc rc" data-k="${k}" style="border:0;cursor:pointer"><div class="k">${k}</div><div class="v">${s.ratings[k].r || "—"}</div><div class="tiny muted">${s.ratings[k].games} ${k === "puzzle" ? "puzzles" : "games"}</div></button>`).join("")}<div class="stat tc"><div class="k">Rush</div><div class="v">${Math.max(s.rush.best.r3, s.rush.best.r5, s.rush.best.survival)}</div><div class="tiny muted">best</div></div></div>
      <div class="card"><div class="row between"><h3 style="margin:0" class="ct">Rapid</h3><span class="small muted cb"></span></div><div class="chart-box"></div></div>
      <div class="grid three">
        <div class="stat tc"><div class="k">Won</div><div class="v" style="color:var(--acc2)">${w}</div></div>
        <div class="stat tc"><div class="k">Drawn</div><div class="v">${d}</div></div>
        <div class="stat tc"><div class="k">Lost</div><div class="v" style="color:#ee6b55">${l}</div></div>
        <div class="stat tc"><div class="k">Accuracy</div><div class="v">${avgAcc != null ? avgAcc + "%" : "—"}</div><div class="tiny muted">last 20 reviewed</div></div>
        <div class="stat tc"><div class="k">Puzzles</div><div class="v">${s.puzzle.solved}</div><div class="tiny muted">solved</div></div>
        <div class="stat tc"><div class="k">Lessons</div><div class="v">${Object.values(s.lessons).filter((x) => x.done).length}</div><div class="tiny muted">done</div></div>
      </div>
      <div class="card weak"></div>
      <button class="tile hist"><div class="ic" style="background:#4a4846">${I.book}</div><div><div class="t">Game history</div><div class="s">${s.games.length} games</div></div><span class="chev">›</span></button>
      <button class="tile st2"><div class="ic" style="background:#5b8bb4">${I.gear}</div><div><div class="t">Settings & themes</div><div class="s">Board, pieces, sounds, backup</div></div><span class="chev">›</span></button>
    </div>`;
  const chart = () => {
    $(".ct", root).textContent = cat[0].toUpperCase() + cat.slice(1);
    $(".cb", root).textContent = s.ratings[cat].best ? "best " + s.ratings[cat].best : "";
    $(".chart-box", root).innerHTML = ratingChart(s.ratings[cat].hist);
  };
  $$(".rc", root).forEach((b) => (b.onclick = () => { cat = b.dataset.k; chart(); }));
  chart();
  // weakest puzzle themes
  const th = Object.entries(s.puzzle.themeStats).filter(([, v]) => v.n >= 5).map(([k, v]) => [k, v.ok / v.n, v.n]).sort((a, b) => a[1] - b[1]).slice(0, 5);
  $(".weak", root).innerHTML = th.length ? `<h3>Weakest puzzle themes</h3>${th.map(([k, p, n]) => `<a class="list-row" href="#/puzzle/theme/${k}" style="color:inherit;text-decoration:none"><div class="grow bold small">${esc(k)}</div><span class="small muted">${n} tried</span><span class="badge-pill ${p < 0.5 ? "red" : "gold"}">${Math.round(p * 100)}%</span></a>`).join("")}<p class="tiny muted mt-s">Train these first — that's where your rating leaks.</p>` : `<h3>Weak spots</h3><p class="small muted">Solve 30+ puzzles and your weakest themes show up here.</p>`;
  $(".st", root).onclick = () => go("settings");
  $(".st2", root).onclick = () => go("settings");
  $(".hist", root).onclick = () => go("history");
  $(".ed", root).onclick = () => {
    const AV = ["♞", "♚", "♛", "♜", "♝", "♟", "🦁", "🐺", "🦅", "🐉", "⚡", "🔥", "👑", "🗡️", "🏆", "😎"];
    const sh = sheet(`<label class="small muted">Name</label><input type="text" class="nm" value="${esc(s.settings.name)}" maxlength="20"><div class="sec-title">Avatar</div><div class="chips avs">${AV.map((a) => `<button class="chip ${s.profile.avatar === a ? "on" : ""}" data-a="${a}" style="font-size:20px">${a}</button>`).join("")}</div><button class="btn primary mt sv">Save</button>`, { title: "Edit profile" });
    let av = s.profile.avatar;
    $$(".avs .chip", sh.el).forEach((c) => (c.onclick = () => { av = c.dataset.a; $$(".avs .chip", sh.el).forEach((x) => x.classList.toggle("on", x === c)); }));
    $(".sv", sh.el).onclick = () => { s.settings.name = $(".nm", sh.el).value.trim() || "You"; s.profile.avatar = av; save(); sh.close(); render(root); };
  };
}

export function renderSettings(root) {
  const s = state();
  const st = s.settings;
  root.innerHTML = `<div class="topbar"><button class="back">‹</button><h2>Settings</h2></div>
    <div class="lesson-layout"><div class="lb settings-prev"><div id="pv"></div></div><div class="lt">
    <div class="card"><h3>Board</h3><div class="swatches bds"></div></div>
    <div class="card"><h3>Pieces</h3><div class="swatches pcs" style="grid-template-columns:repeat(auto-fill,minmax(92px,1fr))"></div><p class="tiny muted mt-s pcred"></p></div>
    <div class="card"><h3>App theme</h3><div class="chips ths">${APP_THEMES.map((t) => `<button class="chip" data-t="${t.id}"><span style="width:14px;height:14px;border-radius:50%;background:${t.bg};border:2px solid ${t.acc}"></span>${t.name}</button>`).join("")}</div></div>
    <div class="card"><h3>Sound</h3>
      ${tog("sound", "Sounds", "Move, capture and check sounds")}
      <div class="setting"><div class="l"><b>Sound set</b></div><select class="ss"><option value="wood">Wood (default)</option><option value="sfx">Lichess SFX</option><option value="piano">Piano</option></select></div>
      <div class="setting"><div class="l"><b>Volume</b></div><input type="range" class="vol" min="0" max="1" step="0.05" value="${st.volume ?? 0.8}" style="max-width:160px"></div>
      ${tog("haptics", "Vibration", "Short buzz on captures and checks (Android)")}
    </div>
    <div class="card"><h3>Gameplay</h3>
      ${tog("legal", "Show legal moves", "Dots on squares you can move to")}
      ${tog("lastMove", "Highlight last move", "")}
      ${tog("anim", "Animate pieces", "")}
      <div class="setting"><div class="l"><b>Animation speed</b></div><select class="am"><option value="90">Fast</option><option value="160">Normal</option><option value="260">Slow</option></select></div>
      <div class="setting"><div class="l"><b>Coordinates</b></div><select class="co"><option value="inside">Inside</option><option value="off">Off</option></select></div>
      ${tog("premove", "Premoves", "Queue your move while the bot thinks")}
      ${tog("autoQueen", "Always promote to queen", "")}
      ${tog("confirmResign", "Confirm resign", "")}
      ${tog("classOnBoard", "Move badges on board", "Brilliant / Blunder icons on the square")}
    </div>
    <div class="card"><h3>Coach (practice games)</h3>
      ${tog("coachLive", "Live coach", "Rate every move as you play")}
      ${tog("guard", "Blunder guard", "Warn me before I play a move that loses a lot")}
      ${tog("evalBar", "Eval bar", "Show the engine evaluation while playing")}
    </div>
    <div class="card"><h3>Backup</h3><p class="small muted">Progress is saved ${storageMode() === "cloud" ? "to your Claude account and to this device" : "on this device"}. The installed app and the Claude version keep separate progress — use a backup to move it.</p>
      <div class="row gap wrap"><button class="btn sm cpb">${I.copy} Copy backup</button><button class="btn sm dlb hide-in-claude">Download</button><button class="btn sm imb">Import backup</button><button class="btn sm danger rst">Reset all</button></div></div>
    <div class="card small muted"><h3>About</h3>Noir Chess 2 · ${esc(engineName())}<br>Engine: Stockfish 18 (GPLv3) via stockfish.js · Rules: chess.js (BSD-2) · Puzzles & opening names: Lichess databases (CC0) · Pieces: see credits above · Sounds: Lichess sets by Enigmahack (AGPLv3+) and synthesized wood.</div>
    </div></div>`;
  $(".back", root).onclick = () => back();
  const pv = new Board($("#pv", root), { fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5", interactive: false });
  pv.setFen("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5", { lastMove: ["g8", "f6"], animate: false });
  const refresh = () => { applyTheme(); pv.refreshPieces(); pv.drawCoords(); save(); };
  const bds = () => { $(".bds", root).innerHTML = BOARDS.map((b) => `<div class="swatch ${st.board === b.id ? "on" : ""}" data-b="${b.id}"><div class="mini" style="${miniBoardStyle(b)}"></div><span>${b.name}</span></div>`).join(""); $$(".bds .swatch", root).forEach((el) => (el.onclick = () => { st.board = el.dataset.b; bds(); refresh(); })); };
  const pcs = () => {
    $(".pcs", root).innerHTML = PIECE_SETS.map((p) => `<div class="pieceset ${st.pieces === p.id ? "on" : ""}" data-p="${p.id}"><div class="imgs"><img src="${pieceURL("wN", p.id)}"><img src="${pieceURL("bQ", p.id)}"></div>${p.name}</div>`).join("");
    $$(".pieceset", root).forEach((el) => (el.onclick = () => { st.pieces = el.dataset.p; pcs(); refresh(); }));
    const cur = PIECE_SETS.find((p) => p.id === st.pieces); $(".pcred", root).textContent = cur ? cur.name + " by " + cur.credit : "";
  };
  bds(); pcs();
  $$(".ths .chip", root).forEach((c) => { c.classList.toggle("on", c.dataset.t === st.theme); c.onclick = () => { st.theme = c.dataset.t; $$(".ths .chip", root).forEach((x) => x.classList.toggle("on", x === c)); refresh(); }; });
  $$(".tg", root).forEach((el) => (el.onchange = () => { st[el.dataset.k] = el.checked; refresh(); if (el.dataset.k === "sound" && el.checked) sfx("move"); }));
  const sel = (cls, key, num) => { const e = $(cls, root); e.value = String(st[key]); e.onchange = () => { st[key] = num ? +e.value : e.value; refresh(); if (key === "soundSet") sfx("capture"); }; };
  sel(".ss", "soundSet"); sel(".am", "animMs", true); sel(".co", "coords");
  $(".vol", root).oninput = (e) => { st.volume = +e.target.value; };
  $(".vol", root).onchange = () => { save(); sfx("move"); };
  $(".cpb", root).onclick = () => copyText(exportBackup());
  $(".dlb", root).onclick = () => download("noir-chess-backup-" + new Date().toISOString().slice(0, 10) + ".json", exportBackup(), "application/json");
  $(".imb", root).onclick = () => {
    const sh = sheet(`<textarea class="bk" placeholder="Paste backup here"></textarea><button class="btn primary mt ok">Import</button>`, { title: "Import backup" });
    $(".ok", sh.el).onclick = async () => { try { if (!(await confirmSheet("This replaces your progress on this device with the backup. Continue?", "Import"))) return; importBackup($(".bk", sh.el).value); sh.close(); toast("Backup imported"); applyTheme(); go("home"); } catch { toast("That backup isn't valid."); } };
  };
  $(".rst", root).onclick = async () => { if (await confirmSheet("Delete ALL progress — ratings, games, lessons? This can't be undone.", "Delete everything")) { resetAll(); applyTheme(); go("home"); } };
  return () => pv.destroy();
}

function tog(key, label, sub) {
  const on = state().settings[key];
  return `<div class="setting"><div class="l"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div><label class="switch"><input type="checkbox" class="tg" data-k="${key}" ${on ? "checked" : ""}><span></span></label></div>`;
}
