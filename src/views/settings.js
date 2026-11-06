// Settings (board, pieces, theme, sound, gameplay, time control, coach, backup) and Credits & licences.
import { $, $$, esc, sheet, toast, copyText, download, confirmSheet } from "../util.js";
import { state, save, exportBackup, importBackup, resetAll, storageMode } from "../store.js";
import { BOARDS, PIECE_SETS, APP_THEMES, applyTheme, miniBoardStyle, themeId } from "../themes.js";
import { Board, pieceURL } from "../board.js";
import { play as sfx, testSound, audioState, preloadCurrent } from "../sound.js";
import { COACHES } from "../coaches.js";
import { charSVG } from "../art/character.js";
import { themeBackground } from "../art/scenes.js";
import { I } from "../icons.js";
import { go, back } from "../router.js";
import { engineName } from "../engine.js";
import { TCS, tcLabel } from "./play.js";

const tog = (key, label, sub = "") => { const on = state().settings[key]; return `<div class="setting"><div class="l"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</div><label class="switch"><input type="checkbox" class="tg" data-k="${key}" ${on ? "checked" : ""} aria-label="${label}"><span></span></label></div>`; };

export function render(root) {
  const s = state();
  const st = s.settings;
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Settings</h2></div>
    <div class="lesson-layout"><div class="lb settings-prev"><div id="pv"></div></div><div class="lt">
    <div class="card"><h3>App theme</h3><div class="theme-grid">${APP_THEMES.map((t) => `<button class="theme-card ${themeId(st.theme) === t.id ? "on" : ""}" data-t="${t.id}" aria-label="${t.name} theme"><div class="tc-bg" style="background:${t.bg}">${themeBackground(t.id)}<span class="tc-acc" style="background:${t.acc}"></span></div><b>${t.name}</b><span class="tiny muted">${t.note}</span></button>`).join("")}</div></div>
    <div class="card"><h3>Board</h3><div class="swatches bds"></div></div>
    <div class="card"><h3>Pieces</h3><div class="swatches pcs" style="grid-template-columns:repeat(auto-fill,minmax(92px,1fr))"></div><p class="tiny muted mt-s pcred"></p></div>
    <div class="card"><h3>Your coach</h3><div class="coach-pick"></div><button class="btn sm ghost mt-s mtc">Meet the coaches ›</button></div>
    <div class="card"><h3>Sound</h3>
      ${tog("sound", "Sounds", "Moves, captures, checks, game start and end, puzzles, achievements")}
      <div class="setting"><div class="l"><b>Sound set</b></div><select class="ss" aria-label="Sound set"><option value="wood">Wood — real recordings (default)</option><option value="sfx">Lichess SFX</option><option value="piano">Piano</option></select></div>
      <div class="setting"><div class="l"><b>Volume</b></div><input type="range" class="vol" min="0" max="1" step="0.05" value="${st.volume ?? 0.8}" style="max-width:160px" aria-label="Volume"></div>
      ${tog("soundOnSilent", "Play when iPhone is on silent", "On: sounds play even with the silent switch on. Off: mixes with your music.")}
      ${tog("haptics", "Haptics", "A light tap on captures, checks and big moments")}
      <div class="setting"><div class="l"><b>Test sound</b><small class="ast"></small></div><button class="btn sm tsnd">🔊 Play</button></div>
    </div>
    <div class="card"><h3>Board & moves</h3>
      <div class="setting"><div class="l"><b>Coordinates</b></div><select class="co" aria-label="Coordinates"><option value="inside">On</option><option value="off">Off</option></select></div>
      <div class="setting"><div class="l"><b>Animation speed</b></div><select class="am" aria-label="Animation speed"><option value="90">Fast</option><option value="160">Normal</option><option value="260">Slow</option></select></div>
      ${tog("anim", "Animate pieces")}
      ${tog("legal", "Show legal moves", "Dots on squares you can move to")}
      ${tog("lastMove", "Highlight last move")}
      ${tog("premove", "Premoves", "Queue a move while the opponent thinks")}
      ${tog("autoQueen", "Always promote to a queen")}
      ${tog("confirmMove", "Confirm moves", "Tap ✓ before a move is played")}
      ${tog("confirmResign", "Confirm resign")}
      ${tog("classOnBoard", "Move badges on the board", "Brilliant / Blunder icons on the square")}
      <div class="setting"><div class="l"><b>Default time control</b></div><select class="dtc" aria-label="Default time control">${TCS.flatMap((g) => g.list.map((t) => `<option value="${t}">${g.cat} ${tcLabel(t)}</option>`)).join("")}</select></div>
    </div>
    <div class="card"><h3>Coach in casual games</h3>
      ${tog("coachLive", "Live coach", "Rates every move as you play")}
      ${tog("guard", "Blunder guard", "Warn before a move that loses a lot")}
      ${tog("evalBar", "Eval bar", "Engine evaluation while you play")}
    </div>
    <div class="card"><h3>Backup & restore</h3><p class="small muted">Your progress is saved ${storageMode() === "cloud" ? "to your account and this device" : "on this device"}. Copy a backup to keep it safe or move it to another device.</p>
      <div class="row gap wrap"><button class="btn sm cpb">${I.copy} Copy backup</button><button class="btn sm dlb">Download</button><button class="btn sm imb">Restore from backup</button><button class="btn sm danger rst">Reset all</button></div></div>
    <button class="tile cred"><div class="ic" style="background:linear-gradient(135deg,#8a96aa,#3a4250)">${I.book}</div><div class="grow"><div class="t">Credits & licences</div><div class="s">Engine, data, pieces, sounds, fonts, libraries</div></div><span class="chev">›</span></button>
    <div class="card small muted"><div class="eyebrow">About</div>Noir Chess · build <b class="bid">${esc(window.NOIR_BUILD || "dev")}</b> · cache <b>noir-${esc(window.NOIR_BUILD || "dev")}</b><br>${esc(engineName())}</div>
    </div></div>`;
  $(".back", root).onclick = () => back();
  const pv = new Board($("#pv", root), { fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5", interactive: false });
  pv.setFen("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5", { lastMove: ["g8", "f6"], animate: false });
  const refresh = () => { applyTheme(); pv.refreshPieces(); pv.drawCoords(); save(); };
  const bds = () => { $(".bds", root).innerHTML = BOARDS.map((b) => `<button class="swatch ${st.board === b.id ? "on" : ""}" data-b="${b.id}" aria-label="${b.name} board"><div class="mini" style="${miniBoardStyle(b)}"></div><span>${b.name}</span></button>`).join(""); $$(".bds .swatch", root).forEach((el) => (el.onclick = () => { st.board = el.dataset.b; bds(); refresh(); })); };
  const pcs = () => {
    $(".pcs", root).innerHTML = PIECE_SETS.map((p) => `<button class="pieceset ${st.pieces === p.id ? "on" : ""}" data-p="${p.id}"><div class="imgs"><img src="${pieceURL("wN", p.id)}" alt=""><img src="${pieceURL("bQ", p.id)}" alt=""></div>${p.name}</button>`).join("");
    $$(".pieceset", root).forEach((el) => (el.onclick = () => { st.pieces = el.dataset.p; pcs(); refresh(); }));
    const cur = PIECE_SETS.find((p) => p.id === st.pieces); $(".pcred", root).textContent = cur ? cur.name + " by " + cur.credit : "";
  };
  const cp = () => { $(".coach-pick", root).innerHTML = COACHES.map((c) => `<button class="cp-item ${st.coach === c.id ? "on" : ""}" data-c="${c.id}" aria-label="${c.name}"><span class="av" style="width:54px;height:54px;border-radius:18px">${charSVG(c.look, { label: c.name })}</span><span class="tiny">${c.short}</span></button>`).join(""); $$(".cp-item", root).forEach((b) => (b.onclick = () => { st.coach = b.dataset.c; save(); cp(); })); };
  bds(); pcs(); cp();
  $$(".theme-card", root).forEach((c) => (c.onclick = () => { st.theme = c.dataset.t; $$(".theme-card", root).forEach((x) => x.classList.toggle("on", x === c)); refresh(); }));
  $$(".tg", root).forEach((el) => (el.onchange = () => { st[el.dataset.k] = el.checked; refresh(); if (el.dataset.k === "sound" && el.checked) sfx("move"); }));
  const sel = (cls, key, num) => { const e = $(cls, root); e.value = String(st[key]); e.onchange = () => { st[key] = num ? +e.value : e.value; if (key === "defaultTc") st.lastTc = e.value; refresh(); if (key === "soundSet") { preloadCurrent(); testSound(); } }; };
  sel(".ss", "soundSet"); sel(".am", "animMs", true); sel(".co", "coords"); sel(".dtc", "defaultTc");
  $(".vol", root).oninput = (e) => { st.volume = +e.target.value; };
  $(".vol", root).onchange = () => { save(); sfx("move"); };
  $(".tsnd", root).onclick = () => { if (!st.sound) { st.sound = true; save(); const t = $('.tg[data-k="sound"]', root); if (t) t.checked = true; } testSound(); setTimeout(() => ($(".ast", root).textContent = "Audio: " + audioState()), 600); };
  $(".mtc", root).onclick = () => go("coaches");
  $(".cred", root).onclick = () => go("credits");
  $(".cpb", root).onclick = () => copyText(exportBackup());
  $(".dlb", root).onclick = () => download("noir-chess-backup-" + new Date().toISOString().slice(0, 10) + ".json", exportBackup(), "application/json");
  $(".imb", root).onclick = () => {
    const sh = sheet(`<p class="small muted">Paste a backup you copied earlier. Your current progress on this device is replaced.</p><textarea class="bk" placeholder="Paste backup here"></textarea><button class="btn primary mt ok">Restore</button>`, { title: "Restore from backup" });
    $(".ok", sh.el).onclick = async () => { try { JSON.parse($(".bk", sh.el).value); if (!(await confirmSheet("Replace your progress on this device with the backup?", "Restore"))) return; importBackup($(".bk", sh.el).value); sh.close(); toast("Backup restored"); applyTheme(); go("home"); } catch { toast("That backup isn't valid."); } };
  };
  $(".rst", root).onclick = async () => { if (await confirmSheet("Delete ALL progress: ratings, games, lessons? Copy a backup first. This can't be undone.", "Delete everything")) { resetAll(); applyTheme(); go("home"); } };
  return () => pv.destroy();
}

export function renderCredits(root) {
  const row = (t, d, u) => `<a class="list-row" href="${u}" target="_blank" rel="noopener" style="color:inherit"><div class="grow"><b class="small">${t}</b><div class="tiny muted">${d}</div></div><span class="chev">↗</span></a>`;
  root.innerHTML = `<div class="topbar"><button class="back" aria-label="Back">‹</button><h2>Credits</h2></div>
    <div class="grid" style="max-width:640px">
      <div class="card"><div class="eyebrow mb">Engine & rules</div>${row("Stockfish 18", "GPLv3 · via stockfish.js (nmrugg)", "https://github.com/nmrugg/stockfish.js")}${row("chess.js", "BSD-2-Clause · legal moves, PGN, FEN", "https://github.com/jhlywa/chess.js")}</div>
      <div class="card"><div class="eyebrow mb">Data</div>${row("Lichess puzzle database", "CC0 · 5,178 puzzles", "https://database.lichess.org/")}${row("Lichess chess-openings", "CC0 · opening names and the explorer", "https://github.com/lichess-org/chess-openings")}${row("Lichess tablebase", "Online endgame tablebase (7 pieces)", "https://tablebase.lichess.ovh/")}</div>
      <div class="card"><div class="eyebrow mb">Pieces</div>${PIECE_SETS.map((p) => `<div class="list-row"><div class="grow"><b class="small">${p.name}</b><div class="tiny muted">${esc(p.credit)}</div></div></div>`).join("")}<p class="tiny muted mt-s">Piece sets from lichess-org/lila.</p></div>
      <div class="card"><div class="eyebrow mb">Sound</div><div class="small">Wood set built from Kenney's Impact, Interface and Casino sounds (CC0). Achievement chime synthesised for Noir Chess. SFX and Piano sets by Enigmahack (AGPLv3+).</div></div>
      <div class="card"><div class="eyebrow mb">Design & motion</div>${row("Motion", "MIT · springs, staggers, transitions (motion.dev)", "https://motion.dev")}${row("canvas-confetti", "ISC · celebrations", "https://github.com/catdad/canvas-confetti")}${row("ios-haptics technique", "MIT · haptics on iPhone Safari", "https://github.com/tijnjh/ios-haptics")}${row("Inter", "SIL Open Font License 1.1", "https://github.com/rsms/inter")}${row("Instrument Serif", "SIL Open Font License 1.1", "https://github.com/Instrument/instrument-serif")}</div>
      <div class="card small"><div class="eyebrow mb">Art</div>Every coach, bot, avatar, badge, course cover, background and icon is original vector art drawn in code for Noir Chess (src/art, style guide public/art/STYLE.md). Noir Chess is a non-commercial personal project; because it bundles GPL/AGPL components its source is public.</div>
    </div>`;
  $(".back", root).onclick = () => back();
}
