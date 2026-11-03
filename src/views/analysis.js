// Analysis board: move freely, Stockfish top 3 lines live, eval bar, opening name, FEN/PGN in and out.
import { Chess } from "chess.js";
import { $, $$, esc, sheet, toast, copyText } from "../util.js";
import { Board, destsOf, checkSquare } from "../board.js";
import { ANA } from "../engine.js";
import { fmtEval, pvSan } from "../analysis.js";
import { moveSound } from "../sound.js";
import { moveStrip, EvalBar } from "../ui.js";
import { openingOf, loadEco } from "../eco.js";
import { I } from "../icons.js";

export function render(root, [arg]) {
  let init = {};
  try { if (arg) init = JSON.parse(arg); } catch {}
  let startFen = init.startFen || new Chess().fen();
  let moves = (init.moves || []).slice();
  let cur = init.ply != null ? init.ply : moves.length - 1;
  let job = null, depthTarget = 22, engineOn = true;

  root.className = "view full";
  root.innerHTML = `<div class="game">
    <div class="board-col">
      <div class="row" style="padding:0 6px;min-height:40px"><button class="back">‹</button><b class="grow">Analysis</b><span class="small muted eng-d"></span></div>
      <div class="board-row"><div class="eb"></div><div class="board-holder"><div id="abd"></div></div></div>
      <div class="small muted op-name" style="padding:4px 8px;min-height:22px"></div>
    </div>
    <div class="side-panel">
      <div class="a-lines" style="padding:6px 0"></div>
      <div class="movelist" id="aml"></div>
      <div class="ctrl">
        <button class="icon-btn" id="a-first">${I.first}</button><button class="icon-btn" id="a-prev">${I.prev}</button>
        <button class="icon-btn" id="a-next">${I.next}</button><button class="icon-btn" id="a-last">${I.last}</button>
        <button class="icon-btn" id="a-flip">${I.flip}</button><button class="icon-btn on" id="a-eng">⚙</button>
      </div>
      <div class="row gap-s wrap" style="padding:10px"><button class="btn sm" id="a-fen">FEN / PGN</button><button class="btn sm" id="a-copy">${I.copy} Copy PGN</button><button class="btn sm ghost" id="a-reset">Reset</button></div>
    </div></div>`;
  const board = new Board($("#abd", root), { orientation: init.orientation || "w", onMove });
  const eb = new EvalBar($(".eb", root));
  loadEco().then(() => sync(false)).catch(() => {});

  function pos(upto = cur) { const c = new Chess(startFen); let last = null; for (let i = 0; i <= upto && i < moves.length; i++) last = c.move(moves[i]); return { c, last }; }
  function allFens() { const c = new Chess(startFen); const f = [c.fen()]; for (const m of moves) { c.move(m); f.push(c.fen()); } return f; }

  function sync(anim = true) {
    const { c, last } = pos();
    board.setFen(c.fen(), { animate: anim, lastMove: last ? [last.from, last.to] : null, check: checkSquare(c) });
    board.setMovable(c.isGameOver() ? null : c.turn(), destsOf(c));
    const startNo = +startFen.split(" ")[5] || 1;
    moveStrip($("#aml", root), moves, cur, null, (i) => { cur = i; sync(false); }, startNo, startFen.split(" ")[1]);
    const o = openingOf(allFens().slice(0, cur + 2));
    $(".op-name", root).innerHTML = o ? `<b>${esc(o.eco)}</b> ${esc(o.name)}` : "";
    analyse(c);
  }

  function analyse(c) {
    if (job) job.abort();
    job = new AbortController();
    const lines = $(".a-lines", root);
    if (!engineOn) { lines.innerHTML = '<div class="small muted" style="padding:8px 12px">Engine off</div>'; board.setArrows([]); return; }
    if (c.isGameOver()) { lines.innerHTML = `<div class="small bold" style="padding:8px 12px">${c.isCheckmate() ? "Checkmate" : "Draw"}</div>`; board.setArrows([]); return; }
    const fen = c.fen();
    const sig = job.signal;
    let lastDraw = 0;
    const draw = (j) => {
      const now = performance.now();
      if (now - lastDraw < 180) return;
      lastDraw = now;
      const L = Object.keys(j.lines).sort((a, b) => a - b).map((k) => j.lines[k]);
      if (!L.length) return;
      $(".eng-d", root).textContent = "depth " + L[0].depth;
      eb.set(L[0], board.orientation);
      lines.innerHTML = L.map((l, i) => `<div class="list-row" data-i="${i}" style="padding:6px 12px;border:0"><span class="badge-pill ${i === 0 ? "acc" : ""}" style="min-width:52px;text-align:center">${fmtEval(l)}</span><span class="small grow" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pvSan(fen, l.pv, 12).join(" "))}</span></div>`).join("");
      $$(".list-row", lines).forEach((r) => (r.onclick = () => { const l = L[+r.dataset.i]; playLine(l.pv.slice(0, 1)); }));
      board.setArrows(L.slice(0, 3).map((l, i) => ({ from: l.move.slice(0, 2), to: l.move.slice(2, 4), color: i === 0 ? "b" : "g", opacity: i === 0 ? 0.8 : 0.45, width: i === 0 ? 0.16 : 0.11 })));
    };
    ANA.analyse(fen, { depth: depthTarget, multipv: 3, noCache: true, signal: sig, onInfo: (_, j) => draw(j) }).then((r) => {
      if (sig.aborted) return;
      lastDraw = 0;
      draw({ lines: Object.fromEntries(r.lines.map((l, i) => [i + 1, l])) });
    }).catch(() => {});
  }

  function playLine(pv) {
    const { c } = pos();
    for (const u of pv) {
      try { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); push(m); } catch { break; }
    }
    sync(true);
  }
  function push(m) { moves = moves.slice(0, cur + 1); moves.push(m.san); cur = moves.length - 1; moveSound(m); }

  function onMove(from, to, promo) {
    const { c } = pos();
    let m; try { m = c.move({ from, to, promotion: promo || "q" }); } catch { return sync(false); }
    // if it matches the next mainline move, just step forward
    if (moves[cur + 1] === m.san) { cur++; moveSound(m); }
    else push(m);
    sync(true);
  }

  $(".back", root).onclick = () => history.back();
  $("#a-first", root).onclick = () => { cur = -1; sync(false); };
  $("#a-prev", root).onclick = () => { cur = Math.max(-1, cur - 1); sync(false); };
  $("#a-next", root).onclick = () => { if (cur < moves.length - 1) { cur++; const { last } = pos(); last && moveSound(last); sync(true); } };
  $("#a-last", root).onclick = () => { cur = moves.length - 1; sync(false); };
  $("#a-flip", root).onclick = () => { board.flip(); sync(false); };
  $("#a-eng", root).onclick = (e) => { engineOn = !engineOn; e.currentTarget.classList.toggle("on", engineOn); sync(false); };
  $("#a-reset", root).onclick = () => { startFen = new Chess().fen(); moves = []; cur = -1; sync(false); };
  $("#a-copy", root).onclick = () => { const c = new Chess(startFen); for (const m of moves) c.move(m); copyText(c.pgn()); };
  $("#a-fen", root).onclick = () => {
    const { c } = pos();
    const sh = sheet(`<div class="small muted">Current FEN</div><div class="row gap"><input type="text" readonly value="${esc(c.fen())}"><button class="btn sm cpf">${I.copy}</button></div>
      <div class="small muted mt">Load a FEN or a PGN</div><textarea class="in" placeholder="Paste FEN or PGN"></textarea><button class="btn primary mt ld">Load</button>`, { title: "FEN / PGN" });
    $(".cpf", sh.el).onclick = () => copyText(c.fen());
    $(".ld", sh.el).onclick = () => {
      const t = $(".in", sh.el).value.trim();
      try {
        if (/^\s*([rnbqkpRNBQKP1-8]+\/){7}/.test(t)) { const x = new Chess(t); startFen = x.fen(); moves = []; cur = -1; }
        else { const x = new Chess(); x.loadPgn(t); const hdr = x.getHeaders(); startFen = hdr.FEN || new Chess().fen(); moves = x.history(); cur = moves.length - 1; }
        sh.close(); sync(false);
      } catch { toast("Couldn't read that."); }
    };
  };
  const key = (e) => { if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return; if (e.key === "ArrowLeft") $("#a-prev", root).click(); if (e.key === "ArrowRight") $("#a-next", root).click(); };
  window.addEventListener("keydown", key);
  sync(false);
  return () => { if (job) job.abort(); ANA.clear(); board.destroy(); window.removeEventListener("keydown", key); };
}
