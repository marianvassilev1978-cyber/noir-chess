// Analysis board: a variation tree (branching moves), Stockfish top-3 lines with depth, eval bar, best-move arrow,
// arrows and circles (long-press or right-drag), the opening explorer, PGN/FEN in and out, practice vs a bot.
import { Chess } from "chess.js";
import { $, $$, esc, sheet, toast, copyText, loadJSON } from "../util.js";
import { Board, destsOf, checkSquare } from "../board.js";
import { ANA } from "../engine.js";
import { fmtEval, pvSan } from "../analysis.js";
import { moveSound } from "../sound.js";
import { EvalBar, avatar } from "../ui.js";
import { openingOf, loadEco, fnv, epd } from "../eco.js";
import { I } from "../icons.js";
import { back } from "../router.js";
import { state, currentRating } from "../store.js";
import { findOpponent } from "../players.js";
import { BOT_GROUPS } from "../bots.js";
import { newGame } from "./game.js";

let EXP = null;
export const loadExplorer = async () => (EXP = EXP || (await loadJSON("explorer")));

export function render(root, [arg]) {
  let init = {};
  try { if (arg) init = JSON.parse(arg); } catch {}
  // ---------- the tree ----------
  let uidN = 0;
  const node = (parent, m, fen) => ({ id: ++uidN, parent, san: m ? m.san : null, uci: m ? m.from + m.to + (m.promotion || "") : null, from: m && m.from, to: m && m.to, fen, children: [], ply: parent ? parent.ply + 1 : 0 });
  let rootN, cur;
  function build(startFen, moves) {
    const c = new Chess(startFen || undefined);
    rootN = node(null, null, c.fen());
    let n = rootN;
    for (const san of moves) { let m; try { m = c.move(san); } catch { break; } const k = node(n, m, c.fen()); n.children.push(k); n = k; }
    return n;
  }
  const last = build(init.startFen, init.moves || []);
  cur = rootN;
  if (init.ply != null) { let n = rootN; for (let i = 0; i <= init.ply && n.children[0]; i++) n = n.children[0]; cur = n; } else cur = last;
  let job = null, engineOn = true, tab = init.tab === "explorer" ? "explorer" : "moves";

  root.className = "view full";
  root.innerHTML = `<div class="game anl">
    <div class="board-col">
      <div class="row" style="padding:0 6px;min-height:44px;gap:8px"><button class="back" aria-label="Back">‹</button><b class="grow">Analysis</b><span class="small muted eng-d"></span></div>
      <div class="a-lines"></div>
      <div class="board-row"><div class="eb"></div><div class="board-holder"><div id="abd"></div></div></div>
      <div class="small op-name"></div>
    </div>
    <div class="side-panel">
      <div class="ctrl">
        <button class="icon-btn" id="a-first" aria-label="Start">${I.first}</button><button class="icon-btn" id="a-prev" aria-label="Back">${I.prev}</button>
        <button class="icon-btn" id="a-next" aria-label="Forward">${I.next}</button><button class="icon-btn" id="a-last" aria-label="End">${I.last}</button>
        <button class="icon-btn" id="a-flip" aria-label="Flip">${I.flip}</button><button class="icon-btn on" id="a-eng" aria-label="Engine on/off">${I.bolt}</button>
      </div>
      <div class="seg a-tabs" style="margin:0 10px"><button data-t="moves" class="on">Moves</button><button data-t="explorer">Explorer</button></div>
      <div class="a-tree"></div>
      <div class="a-exp hide"></div>
      <div class="row gap-s wrap" style="padding:10px">
        <button class="btn sm primary" id="a-practice">${I.play2} Practice vs bot</button>
        <button class="btn sm" id="a-fen">FEN / PGN</button><button class="btn sm" id="a-copy">${I.copy} PGN</button>
        <button class="btn sm ghost" id="a-promote">Promote line</button><button class="btn sm ghost" id="a-del">Delete line</button>
      </div>
      <div class="tiny muted" style="padding:0 12px 12px">Long-press a square (or right-drag) to draw arrows and circles.</div>
    </div></div>`;
  const board = new Board($("#abd", root), { orientation: init.orientation || "w", onMove, draw: true });
  const eb = new EvalBar($(".eb", root));
  loadEco().then(() => sync(false)).catch(() => {});
  if (tab === "explorer") setTimeout(() => { const b = root.querySelector('.a-tabs button[data-t="explorer"]'); b && b.click(); }, 0);

  const pathTo = (n) => { const p = []; while (n.parent) { p.unshift(n); n = n.parent; } return p; };
  function sync(anim = true) {
    const c = new Chess(cur.fen);
    board.setFen(cur.fen, { animate: anim, lastMove: cur.from ? [cur.from, cur.to] : null, check: checkSquare(c) });
    board.setMovable(c.isGameOver() ? null : c.turn(), destsOf(c));
    drawTree();
    const fens = [rootN.fen, ...pathTo(cur).map((n) => n.fen)];
    const o = openingOf(fens);
    $(".op-name", root).innerHTML = o ? `<b>${esc(o.eco)}</b> ${esc(o.name)}` : "";
    if (tab === "explorer") drawExplorer();
    analyse(c);
  }

  // ---------- the move tree (main line + variations in brackets) ----------
  function drawTree() {
    const out = [];
    const F = +rootN.fen.split(" ")[5] || 1, rb = new Chess(rootN.fen).turn() === "b" ? 1 : 0;
    const noOf = (n) => F + Math.floor((n.ply - 1 + rb) / 2);
    const num = (n, force) => { const w = new Chess(n.parent.fen).turn() === "w"; return w ? `<span class="n">${noOf(n)}.</span>` : force ? `<span class="n">${noOf(n)}…</span>` : ""; };
    function line(n, first) {
      let html = "", k = n, force = first;
      while (k) {
        html += num(k, force) + `<span class="m ${k === cur ? "cur" : ""}" data-id="${k.id}">${esc(k.san)}</span>`;
        force = false;
        const p = k.parent;
        if (p && p.children[0] === k && p.children.length > 1) for (const v of p.children.slice(1)) html += `<span class="var">(${line(v, true)})</span>`, force = true;
        k = k.children[0];
      }
      return html;
    }
    const html = rootN.children.length ? line(rootN.children[0], true) + (rootN.children.slice(1).map((v) => `<span class="var">(${line(v, true)})</span>`).join("")) : '<span class="dim small">Make a move on the board.</span>';
    const el = $(".a-tree", root);
    el.innerHTML = `<div class="tree">${html}</div>`;
    const ids = {}; (function walk(n) { ids[n.id] = n; n.children.forEach(walk); })(rootN);
    el.onclick = (e) => { const t = e.target.closest(".m"); if (t) { cur = ids[+t.dataset.id]; sync(false); } };
    const c = el.querySelector(".m.cur"); if (c) c.scrollIntoView({ block: "nearest" });
  }

  // ---------- the explorer ----------
  async function drawExplorer() {
    const box = $(".a-exp", root);
    box.innerHTML = `<div class="small muted" style="padding:10px 12px">Loading the explorer…</div>`;
    const E = await loadExplorer().catch(() => null);
    if (!E || tab !== "explorer") return;
    const h = fnv(epd(cur.fen));
    const list = E.pos[h] || [];
    const named = E.named[h] != null ? E.names[E.named[h]] : null;
    box.innerHTML = `${named ? `<div class="exp-name"><b>${esc(named)}</b></div>` : ""}${list.length ? list.slice(0, 14).map(([san, n, course]) => {
      const c = new Chess(cur.fen); let child = null; try { c.move(san); child = E.named[fnv(epd(c.fen()))]; } catch {}
      return `<div class="list-row exp-row" data-san="${esc(san)}"><b class="exp-san">${esc(san)}</b><div class="grow tiny muted">${child != null ? esc(E.names[child]) : "&nbsp;"}</div>${course ? `<span class="badge-pill acc" title="In your course">★ course</span>` : ""}<span class="badge-pill">${n} line${n > 1 ? "s" : ""}</span></div>`;
    }).join("") : `<div class="small muted" style="padding:10px 12px">Out of the opening book here: no known theory for this position.</div>`}<div class="tiny dim" style="padding:6px 12px">Named lines from the Lichess opening database (CC0) and this app's course.</div>`;
    $$(".exp-row", box).forEach((r) => (r.onclick = () => { const c = new Chess(cur.fen); try { const m = c.move(r.dataset.san); addMove(m, c.fen()); moveSound(m); sync(true); } catch {} }));
  }

  // ---------- engine ----------
  function analyse(c) {
    if (job) job.abort();
    job = new AbortController();
    const lines = $(".a-lines", root);
    if (!engineOn) { lines.innerHTML = '<div class="small muted a-line">Engine off</div>'; board.setArrows([]); eb.set({ cp: 0 }, board.orientation); $(".eng-d", root).textContent = ""; return; }
    if (c.isGameOver()) { lines.innerHTML = `<div class="small bold a-line">${c.isCheckmate() ? "Checkmate" : "Draw"}</div>`; board.setArrows([]); return; }
    const fen = c.fen(), sig = job.signal;
    let lastDraw = 0;
    const draw = (j) => {
      const now = performance.now(); if (now - lastDraw < 180) return; lastDraw = now;
      const L = Object.keys(j.lines).sort((a, b) => a - b).map((k) => j.lines[k]);
      if (!L.length) return;
      $(".eng-d", root).textContent = "depth " + L[0].depth;
      eb.set(L[0], board.orientation);
      lines.innerHTML = L.slice(0, 3).map((l, i) => `<div class="a-line" data-i="${i}"><span class="badge-pill ${i === 0 ? "acc" : ""}">${fmtEval(l)}</span><span class="small grow">${esc(pvSan(fen, l.pv, 10).join(" "))}</span></div>`).join("");
      $$(".a-line", lines).forEach((r) => (r.onclick = () => { const l = L[+r.dataset.i]; const cc = new Chess(cur.fen); try { const m = cc.move({ from: l.move.slice(0, 2), to: l.move.slice(2, 4), promotion: l.move[4] }); addMove(m, cc.fen()); moveSound(m); sync(true); } catch {} }));
      board.setArrows(L.slice(0, 3).map((l, i) => ({ from: l.move.slice(0, 2), to: l.move.slice(2, 4), color: i === 0 ? "b" : "g", opacity: i === 0 ? 0.85 : 0.4, width: i === 0 ? 0.17 : 0.1 })));
    };
    ANA.analyse(fen, { depth: localStorage.getItem("noir.test") ? 10 : 22, multipv: 3, noCache: true, signal: sig, onInfo: (_, j) => draw(j) }).then((r) => { if (sig.aborted) return; lastDraw = 0; draw({ lines: Object.fromEntries(r.lines.map((l, i) => [i + 1, l])) }); }).catch(() => {});
  }

  function addMove(m, fen) {
    const ex = cur.children.find((k) => k.san === m.san);
    if (ex) { cur = ex; return; }
    const k = node(cur, m, fen);
    cur.children.push(k);
    cur = k;
  }
  function onMove(from, to, promo) {
    const c = new Chess(cur.fen);
    let m; try { m = c.move({ from, to, promotion: promo || "q" }); } catch { return sync(false); }
    addMove(m, c.fen()); moveSound(m); sync(true);
  }
  function pgnOf() {
    const hdr = rootN.fen !== new Chess().fen() ? `[SetUp "1"]\n[FEN "${rootN.fen}"]\n\n` : "";
    const F = +rootN.fen.split(" ")[5] || 1, rb = new Chess(rootN.fen).turn() === "b" ? 1 : 0;
    const mv = (n, force) => { const w = new Chess(n.parent.fen).turn() === "w"; const no = F + Math.floor((n.ply - 1 + rb) / 2); return (w ? no + ". " : force ? no + "... " : "") + n.san; };
    function line(n, force) { let out = [], k = n, f = force; while (k) { out.push(mv(k, f)); f = false; const p = k.parent; if (p.children[0] === k && p.children.length > 1) { for (const v of p.children.slice(1)) out.push("(" + line(v, true) + ")"); f = true; } k = k.children[0]; } return out.join(" "); }
    return hdr + (rootN.children.length ? line(rootN.children[0], true) + rootN.children.slice(1).map((v) => " (" + line(v, true) + ")").join("") : "") + " *";
  }

  // ---------- controls ----------
  $(".back", root).onclick = () => back();
  $("#a-first", root).onclick = () => { cur = rootN; sync(false); };
  $("#a-prev", root).onclick = () => { if (cur.parent) { cur = cur.parent; sync(false); } };
  $("#a-next", root).onclick = () => { if (cur.children[0]) { cur = cur.children[0]; const c = new Chess(cur.parent.fen); moveSound(c.move(cur.san)); sync(true); } };
  $("#a-last", root).onclick = () => { while (cur.children[0]) cur = cur.children[0]; sync(false); };
  $("#a-flip", root).onclick = () => { board.flip(); sync(false); };
  $("#a-eng", root).onclick = (e) => { engineOn = !engineOn; e.currentTarget.classList.toggle("on", engineOn); sync(false); };
  $$(".a-tabs button", root).forEach((b) => (b.onclick = () => { tab = b.dataset.t; $$(".a-tabs button", root).forEach((x) => x.classList.toggle("on", x === b)); $(".a-tree", root).classList.toggle("hide", tab !== "moves"); $(".a-exp", root).classList.toggle("hide", tab !== "explorer"); if (tab === "explorer") drawExplorer(); }));
  $("#a-promote", root).onclick = () => { let n = cur; while (n.parent) { const p = n.parent; const i = p.children.indexOf(n); if (i > 0) { p.children.splice(i, 1); p.children.unshift(n); } n = p; } drawTree(); toast("Promoted to the main line"); };
  $("#a-del", root).onclick = () => { if (!cur.parent) return; const p = cur.parent; p.children = p.children.filter((k) => k !== cur); cur = p; sync(false); };
  $("#a-copy", root).onclick = () => copyText(pgnOf());
  $("#a-practice", root).onclick = () => practice();
  $("#a-fen", root).onclick = () => {
    const sh = sheet(`<div class="eyebrow">Current FEN</div><div class="row gap mt-s"><input type="text" readonly value="${esc(cur.fen)}"><button class="btn sm cpf" aria-label="Copy FEN">${I.copy}</button></div>
      <div class="eyebrow mt">Load a FEN or a PGN</div><textarea class="in mt-s" placeholder="Paste FEN or PGN"></textarea><button class="btn primary mt ld">Load</button>`, { title: "FEN / PGN" });
    $(".cpf", sh.el).onclick = () => copyText(cur.fen);
    $(".ld", sh.el).onclick = () => {
      const t = $(".in", sh.el).value.trim();
      try {
        if (/^\s*([rnbqkpRNBQKP1-8]+\/){7}/.test(t)) { const x = new Chess(t); build(x.fen(), []); cur = rootN; }
        else { const x = new Chess(); x.loadPgn(t); const hdr = x.getHeaders(); cur = build(hdr.FEN || null, x.history()); }
        sh.close(); sync(false);
      } catch { toast("Couldn't read that."); }
    };
  };
  function practice() {
    const s = state();
    const turn = new Chess(cur.fen).turn();
    const r = currentRating("rapid") || 1000;
    const matched = findOpponent(r, { recent: s.recentOpps || [] });
    const bots = BOT_GROUPS.flatMap((g) => g.bots).filter((b) => Math.abs(b.elo - r) <= 500).slice(0, 8);
    const sh = sheet(`<p class="small muted">You play ${turn === "w" ? "White" : "Black"} from this position. Casual, unlimited time.</p>
      <div class="list">${[matched, ...bots].map((b, i) => `<div class="list-row pr" data-i="${i}">${avatar(b, 40)}<div class="grow"><b class="small">${esc(b.name)}</b><div class="tiny muted">${b.elo}${i === 0 ? " · matched to you" : ""}</div></div><span class="chev">›</span></div>`).join("")}</div>`, { title: "Practice vs bot from here" });
    const all = [matched, ...bots];
    $$(".pr", sh.el).forEach((el) => (el.onclick = () => { sh.close(); newGame({ bot: all[+el.dataset.i], tc: "none", color: turn, rated: false, startFen: cur.fen }); }));
  }
  const key = (e) => { if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; if (e.key === "ArrowLeft") $("#a-prev", root).click(); if (e.key === "ArrowRight") $("#a-next", root).click(); };
  window.addEventListener("keydown", key);
  sync(false);
  return () => { if (job) job.abort(); ANA.clear(); board.destroy(); window.removeEventListener("keydown", key); };
}
