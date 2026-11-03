// Interactive chessboard: drag or tap to move, animated pieces, premoves, arrows, badges, promotion picker.
import { state } from "./store.js";
import { play as sfx } from "./sound.js";

const FILES = "abcdefgh";
export const sqName = (f, r) => FILES[f] + (r + 1);
const sqXY = (sq) => [FILES.indexOf(sq[0]), +sq[1] - 1];

export const CLS = {
  brilliant: { sym: "!!", color: "#1baaa6", label: "Brilliant" },
  great: { sym: "!", color: "#5b8bb4", label: "Great" },
  best: { sym: "★", color: "#7fa650", label: "Best" },
  excellent: { sym: "👍", color: "#96bc4b", label: "Excellent", svg: '<svg viewBox="0 0 24 24" width="62%" height="62%" fill="#fff"><path d="M2 21h3V10H2zm20-10a2 2 0 0 0-2-2h-6.3l1-4.6v-.3a1.5 1.5 0 0 0-.4-1L13.2 2 7.6 7.6A2 2 0 0 0 7 9v10a2 2 0 0 0 2 2h9a2 2 0 0 0 1.8-1.2l3-7.1c.1-.2.2-.5.2-.7z"/></svg>' },
  good: { sym: "✓", color: "#95b776", label: "Good" },
  book: { sym: "📖", color: "#a88764", label: "Book", svg: '<svg viewBox="0 0 24 24" width="62%" height="62%" fill="#fff"><path d="M12 6.5C10.3 5.2 7.9 4.5 5 4.5c-1 0-2 .1-3 .3v14c1-.2 2-.3 3-.3 2.9 0 5.3.7 7 2 1.7-1.3 4.1-2 7-2 1 0 2 .1 3 .3v-14c-1-.2-2-.3-3-.3-2.9 0-5.3.7-7 2z"/></svg>' },
  inaccuracy: { sym: "?!", color: "#f7c045", label: "Inaccuracy" },
  mistake: { sym: "?", color: "#e58f2a", label: "Mistake" },
  miss: { sym: "✕", color: "#ee6b55", label: "Miss" },
  blunder: { sym: "??", color: "#ca3431", label: "Blunder" },
  forced: { sym: "□", color: "#97a29e", label: "Forced" },
};
export function badgeHTML(cls, size = "") {
  const c = CLS[cls]; if (!c) return "";
  return `<span class="cls-badge ${size}" style="background:${c.color}">${c.svg || c.sym}</span>`;
}

function parseFen(fen) {
  const rows = fen.split(" ")[0].split("/");
  const out = {};
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) f += +ch;
      else { out[sqName(f, 7 - r)] = (ch === ch.toUpperCase() ? "w" : "b") + ch.toUpperCase(); f++; }
    }
  }
  return out;
}

export function pieceURL(code, set) {
  return `pieces/${set || state().settings.pieces || "cburnett"}/${code}.svg`;
}

export class Board {
  constructor(el, o = {}) {
    this.el = el;
    this.o = Object.assign({ orientation: "w", fen: "start", movable: null, dests: null, onMove: null, onPremove: null, coords: true, interactive: true, small: false }, o);
    this.orientation = this.o.orientation;
    this.pieces = {}; // sq -> {code, el}
    this.selected = null;
    this.lastMove = null;
    this.check = null;
    this.premove = null;
    this.userArrows = [];
    this.arrows = [];
    this.badges = [];
    this.marks = {};
    el.classList.add("board");
    if (this.o.small) el.classList.add("small");
    el.innerHTML = `<div class="b-squares"></div><div class="b-hl"></div><div class="b-coords"></div><div class="b-pieces"></div><svg class="b-arrows" viewBox="0 0 8 8"></svg><div class="b-badges"></div><div class="b-overlay"></div>`;
    this.hl = el.querySelector(".b-hl");
    this.pl = el.querySelector(".b-pieces");
    this.svg = el.querySelector(".b-arrows");
    this.bl = el.querySelector(".b-badges");
    this.ov = el.querySelector(".b-overlay");
    this.coordsEl = el.querySelector(".b-coords");
    this.drawCoords();
    this.setFen(this.o.fen === "start" ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : this.o.fen, { animate: false });
    if (this.o.interactive) this.bind();
  }

  destroy() { this.unbind && this.unbind(); this.el.innerHTML = ""; }

  pos(sq) {
    const [f, r] = sqXY(sq);
    return this.orientation === "w" ? [f, 7 - r] : [7 - f, r];
  }
  sqAt(x, y) {
    const rect = this.el.getBoundingClientRect();
    const cx = Math.floor(((x - rect.left) / rect.width) * 8), cy = Math.floor(((y - rect.top) / rect.height) * 8);
    if (cx < 0 || cx > 7 || cy < 0 || cy > 7) return null;
    return this.orientation === "w" ? sqName(cx, 7 - cy) : sqName(7 - cx, cy);
  }

  drawCoords() {
    const s = state().settings.coords;
    this.coordsEl.innerHTML = "";
    this.el.classList.toggle("coords-outside", s === "outside");
    if (s === "off" || !this.o.coords) return;
    let html = "";
    for (let i = 0; i < 8; i++) {
      const rank = this.orientation === "w" ? 8 - i : i + 1;
      const file = this.orientation === "w" ? FILES[i] : FILES[7 - i];
      // rank labels on the left column, file labels on the bottom row; colour contrasts with the square
      const rankLight = (i % 2 === 0); // left column top square is light
      html += `<span class="co rk ${rankLight ? "on-l" : "on-d"}" style="top:${i * 12.5}%">${rank}</span>`;
      const fileLight = (i % 2 === 1);
      html += `<span class="co fl ${fileLight ? "on-l" : "on-d"}" style="left:${i * 12.5}%">${file}</span>`;
    }
    this.coordsEl.innerHTML = html;
  }

  setOrientation(c) { if (c !== this.orientation) { this.orientation = c; this.drawCoords(); this.renderAll(); } }
  flip() { this.setOrientation(this.orientation === "w" ? "b" : "w"); }

  place(el, sq) {
    const [x, y] = this.pos(sq);
    el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
  }

  renderAll() {
    for (const sq in this.pieces) this.place(this.pieces[sq].el, sq);
    this.renderHL(); this.renderArrows(); this.renderBadges();
  }

  setFen(fen, { animate = true, lastMove, check } = {}) {
    this.fen = fen;
    const next = parseFen(fen);
    const anim = animate && state().settings.anim;
    const old = this.pieces;
    const neu = {};
    const unused = [];
    // keep pieces that didn't move
    for (const sq in old) {
      if (next[sq] === old[sq].code) neu[sq] = old[sq];
      else unused.push({ sq, ...old[sq] });
    }
    for (const sq in next) {
      if (neu[sq]) continue;
      const code = next[sq];
      // find nearest unused old piece of the same code to slide
      let bi = -1, bd = 99;
      unused.forEach((u, i) => {
        if (u.code !== code || u.used) return;
        const [a, b] = sqXY(u.sq), [c, d] = sqXY(sq);
        const dist = Math.abs(a - c) + Math.abs(b - d);
        if (dist < bd) { bd = dist; bi = i; }
      });
      if (bi >= 0 && sq === this.noAnimSq) {
        const u = unused[bi]; u.used = true;
        neu[sq] = { code, el: u.el };
        this.place(u.el, sq);
      } else if (bi >= 0 && anim) {
        const u = unused[bi]; u.used = true;
        neu[sq] = { code, el: u.el };
        u.el.classList.add("anim");
        u.el.style.zIndex = 5;
        this.place(u.el, sq);
        setTimeout(() => { u.el.classList.remove("anim"); u.el.style.zIndex = ""; }, (state().settings.animMs || 160) + 30);
      } else {
        const el = document.createElement("div");
        el.className = "pc";
        el.style.backgroundImage = `url(${pieceURL(code)})`;
        this.place(el, sq);
        this.pl.appendChild(el);
        neu[sq] = { code, el };
        if (anim) { el.classList.add("fadein"); setTimeout(() => el.classList.remove("fadein"), 200); }
      }
    }
    for (const u of unused) if (!u.used) {
      if (anim) { u.el.classList.add("fadeout"); setTimeout(() => u.el.remove(), 180); } else u.el.remove();
    }
    this.pieces = neu;
    this.noAnimSq = null;
    if (lastMove !== undefined) this.lastMove = lastMove;
    if (check !== undefined) this.check = check;
    this.selected = null;
    this.renderHL();
  }

  // re-apply piece images after a piece-set change
  refreshPieces() { for (const sq in this.pieces) this.pieces[sq].el.style.backgroundImage = `url(${pieceURL(this.pieces[sq].code)})`; this.drawCoords(); }

  // movable: "w" | "b" | "both" | null; dests: Map from -> [to]
  setMovable(color, dests) { this.o.movable = color; this.o.dests = dests; if (this.selected && !(dests && dests.get(this.selected))) this.selected = null; this.renderHL(); }

  sqStyle(sq) { const [x, y] = this.pos(sq); return `left:${x * 12.5}%;top:${y * 12.5}%`; }

  renderHL() {
    let html = "";
    const st = state().settings;
    if (this.lastMove && st.lastMove !== false) for (const s of this.lastMove) html += `<div class="sq-hl last" style="${this.sqStyle(s)}"></div>`;
    if (this.premove) for (const s of this.premove) html += `<div class="sq-hl pre" style="${this.sqStyle(s)}"></div>`;
    for (const sq in this.marks) html += `<div class="sq-hl mark-${this.marks[sq]}" style="${this.sqStyle(sq)}"></div>`;
    if (this.check) html += `<div class="sq-hl check" style="${this.sqStyle(this.check)}"></div>`;
    if (this.selected) {
      html += `<div class="sq-hl sel" style="${this.sqStyle(this.selected)}"></div>`;
      const ds = (this.o.dests && this.o.dests.get(this.selected)) || this.preDests(this.selected);
      if (st.legal !== false) for (const d of ds) {
        const occ = this.pieces[d];
        html += `<div class="sq-hl ${occ ? "cap" : "dot"}" style="${this.sqStyle(d)}"></div>`;
      }
    }
    if (this.hover) html += `<div class="sq-hl hover" style="${this.sqStyle(this.hover)}"></div>`;
    this.hl.innerHTML = html;
  }

  setMarks(m) { this.marks = m || {}; this.renderHL(); }

  // arrows: [{from,to,color}] color in g|r|b|y|o
  setArrows(list) { this.arrows = list || []; this.renderArrows(); }
  renderArrows() {
    const all = [...this.arrows, ...this.userArrows];
    const col = { g: "#15781b", r: "#882020", b: "#003088", y: "#e68f00", o: "#f2a73b", t: "#1baaa6", w: "#ffffff" };
    let defs = "<defs>";
    for (const k in col) defs += `<marker id="ah-${k}-${this.uidm || (this.uidm = Math.random().toString(36).slice(2, 6))}" markerWidth="4" markerHeight="4" refX="2.05" refY="2" orient="auto"><path d="M0,0 V4 L3,2 Z" fill="${col[k]}"/></marker>`;
    defs += "</defs>";
    let body = "";
    for (const a of all) {
      const c = a.color || "g";
      if (a.from === a.to) {
        const [x, y] = this.pos(a.from);
        body += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.45" fill="none" stroke="${col[c]}" stroke-width="0.07" opacity="0.8"/>`;
        continue;
      }
      const [x1, y1] = this.pos(a.from), [x2, y2] = this.pos(a.to);
      const ax = x1 + 0.5, ay = y1 + 0.5, bx = x2 + 0.5, by = y2 + 0.5;
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
      const ex = bx - (dx / len) * 0.38, ey = by - (dy / len) * 0.38;
      const w = a.width || 0.16;
      // knight moves get an L-shaped arrow like chess sites do
      const isKnight = (Math.abs(x2 - x1) === 1 && Math.abs(y2 - y1) === 2) || (Math.abs(x2 - x1) === 2 && Math.abs(y2 - y1) === 1);
      if (isKnight) {
        const mx = Math.abs(dx) > Math.abs(dy) ? bx : ax, my = Math.abs(dx) > Math.abs(dy) ? ay : by;
        const ddx = bx - mx, ddy = by - my, l2 = Math.hypot(ddx, ddy);
        const ex2 = bx - (ddx / l2) * 0.38, ey2 = by - (ddy / l2) * 0.38;
        body += `<polyline points="${ax},${ay} ${mx},${my} ${ex2},${ey2}" fill="none" stroke="${col[c]}" stroke-width="${w}" stroke-linejoin="round" opacity="${a.opacity || 0.8}" marker-end="url(#ah-${c}-${this.uidm})"/>`;
      } else body += `<line x1="${ax}" y1="${ay}" x2="${ex}" y2="${ey}" stroke="${col[c]}" stroke-width="${w}" stroke-linecap="round" opacity="${a.opacity || 0.8}" marker-end="url(#ah-${c}-${this.uidm})"/>`;
    }
    this.svg.innerHTML = defs + body;
  }

  // badges: [{sq, cls}]
  setBadges(list) { this.badges = list || []; this.renderBadges(); }
  renderBadges() {
    let html = "";
    for (const b of this.badges) {
      const [x, y] = this.pos(b.sq);
      html += `<div class="sq-badge" style="left:${(x + 1) * 12.5}%;top:${y * 12.5}%">${badgeHTML(b.cls, "lg")}</div>`;
    }
    this.bl.innerHTML = html;
  }

  preDests(from) {
    // premove destinations: geometric moves of the piece, ignoring legality (like chess sites)
    if (!this.o.premoveColor) return [];
    const p = this.pieces[from]; if (!p || p.code[0] !== this.o.premoveColor) return [];
    const [f, r] = sqXY(from), t = p.code[1], out = [];
    const add = (a, b) => { if (a >= 0 && a < 8 && b >= 0 && b < 8) out.push(sqName(a, b)); };
    const ray = (df, dr) => { for (let i = 1; i < 8; i++) add(f + df * i, r + dr * i); };
    if (t === "N") [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([a, b]) => add(f + a, r + b));
    if (t === "B" || t === "Q") [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => ray(a, b));
    if (t === "R" || t === "Q") [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => ray(a, b));
    if (t === "K") { [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => add(f + a, r + b)); if ((p.code[0] === "w" && from === "e1") || (p.code[0] === "b" && from === "e8")) { add(6, r); add(2, r); } }
    if (t === "P") { const d = p.code[0] === "w" ? 1 : -1; add(f, r + d); if ((d === 1 && r === 1) || (d === -1 && r === 6)) add(f, r + 2 * d); add(f + 1, r + d); add(f - 1, r + d); }
    return out;
  }

  setPremove(pm) { this.premove = pm; this.renderHL(); }

  canPick(sq) {
    const p = this.pieces[sq]; if (!p) return false;
    const m = this.o.movable;
    if (m && (m === "both" || p.code[0] === m) && this.o.dests && this.o.dests.get(sq)) return true;
    if (this.o.premoveColor && p.code[0] === this.o.premoveColor && state().settings.premove) return true;
    return false;
  }

  isLegal(from, to) {
    const ds = this.o.dests && this.o.dests.get(from);
    return ds && ds.includes(to);
  }

  // castling by dropping the king on its own rook
  mapCastle(from, to) {
    const p = this.pieces[from], q = this.pieces[to];
    if (!p || !q || p.code[1] !== "K" || q.code !== p.code[0] + "R") return to;
    const r = from[1];
    const target = to[0] > from[0] ? "g" + r : "c" + r;
    return this.isLegal(from, target) ? target : to;
  }

  async tryMove(from, to) {
    to = this.mapCastle(from, to);
    const premoving = this.o.premoveColor && this.pieces[from] && this.pieces[from].code[0] === this.o.premoveColor && !this.isLegal(from, to);
    if (premoving) {
      if (this.preDests(from).includes(to)) { this.selected = null; this.o.onPremove && this.o.onPremove(from, to); }
      else this.selected = null;
      this.renderHL();
      return;
    }
    if (!this.isLegal(from, to)) { this.selected = null; this.renderHL(); return; }
    const p = this.pieces[from];
    let promo;
    if (p.code[1] === "P" && (to[1] === "8" || to[1] === "1")) {
      promo = state().settings.autoQueen ? "q" : await this.askPromotion(to, p.code[0]);
      if (!promo) { this.selected = null; this.renderHL(); return; }
    }
    this.selected = null;
    this.hover = null;
    this.o.onMove && this.o.onMove(from, to, promo);
  }

  askPromotion(sq, color) {
    return new Promise((res) => {
      const [x, y] = this.pos(sq);
      const down = y === 0;
      const opts = ["q", "n", "r", "b"];
      let html = `<div class="promo-back"></div>`;
      opts.forEach((o, i) => {
        const yy = down ? i : 7 - i;
        html += `<div class="promo-opt" data-p="${o}" style="left:${x * 12.5}%;top:${yy * 12.5}%;background-image:url(${pieceURL(color + o.toUpperCase())})"></div>`;
      });
      this.ov.innerHTML = html;
      this.ov.classList.add("on");
      const done = (v) => { this.ov.innerHTML = ""; this.ov.classList.remove("on"); res(v); };
      this.ov.onclick = (e) => { const t = e.target.closest(".promo-opt"); done(t ? t.dataset.p : null); };
    });
  }

  bind() {
    const el = this.el;
    let drag = null, rdrag = null;
    const down = (e) => {
      if (e.button === 2) { // right-drag: draw arrows
        const sq = this.sqAt(e.clientX, e.clientY); if (sq) rdrag = { from: sq, color: e.shiftKey ? "r" : e.altKey ? "b" : e.ctrlKey ? "y" : "g" };
        return;
      }
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (this.ov.classList.contains("on")) return;
      if (this.userArrows.length) { this.userArrows = []; this.renderArrows(); }
      const sq = this.sqAt(e.clientX, e.clientY);
      if (!sq) return;
      // second tap on a destination
      if (this.selected && sq !== this.selected && !(this.canPick(sq) && this.pieces[sq].code[0] === this.pieces[this.selected].code[0] && !this.isCastleRook(this.selected, sq))) {
        const from = this.selected;
        this.tryMove(from, sq);
        return;
      }
      if (this.premove && !this.canPick(sq)) { this.premove = null; this.o.onPremove && this.o.onPremove(null); this.renderHL(); }
      if (this.canPick(sq)) {
        const wasSelected = this.selected === sq;
        this.selected = sq;
        this.renderHL();
        sfx("select");
        const p = this.pieces[sq];
        const rect = el.getBoundingClientRect();
        drag = { from: sq, el: p.el, rect, started: false, sx: e.clientX, sy: e.clientY, wasSelected };
        el.setPointerCapture && el.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else { this.selected = null; this.renderHL(); }
    };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.started && Math.hypot(dx, dy) < 4) return;
      if (!drag.started) { drag.started = true; drag.el.classList.add("dragging"); }
      const sz = drag.rect.width / 8;
      const x = e.clientX - drag.rect.left - sz / 2, y = e.clientY - drag.rect.top - sz / 2;
      drag.el.style.transform = `translate(${x}px, ${y}px) scale(1.12)`;
      const hv = this.sqAt(e.clientX, e.clientY);
      if (hv !== this.hover) { this.hover = hv; this.renderHL(); }
    };
    const up = (e) => {
      if (rdrag) {
        const to = this.sqAt(e.clientX, e.clientY);
        if (to) {
          const i = this.userArrows.findIndex((a) => a.from === rdrag.from && a.to === to);
          if (i >= 0) this.userArrows.splice(i, 1); else this.userArrows.push({ from: rdrag.from, to, color: rdrag.color });
          this.renderArrows();
        }
        rdrag = null; return;
      }
      if (!drag) return;
      const d = drag; drag = null;
      d.el.classList.remove("dragging");
      this.hover = null;
      const to = this.sqAt(e.clientX, e.clientY);
      if (d.started) {
        this.place(d.el, d.from);
        if (to && to !== d.from) { this.noAnimSq = this.mapCastle(d.from, to); this.tryMove(d.from, to); }
        else this.renderHL();
      } else if (d.wasSelected && to === d.from) { this.selected = null; this.renderHL(); }
    };
    const ctx = (e) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", ctx);
    this.unbind = () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("contextmenu", ctx);
    };
  }

  isCastleRook(from, to) {
    const p = this.pieces[from], q = this.pieces[to];
    return p && q && p.code[1] === "K" && q.code === p.code[0] + "R" && this.mapCastle(from, to) !== to;
  }
}

// dests map from a chess.js instance
export function destsOf(chess) {
  const m = new Map();
  for (const mv of chess.moves({ verbose: true })) {
    if (!m.has(mv.from)) m.set(mv.from, []);
    if (!m.get(mv.from).includes(mv.to)) m.get(mv.from).push(mv.to);
  }
  return m;
}

export function checkSquare(chess) {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  const b = chess.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const p = b[r][f]; if (p && p.type === "k" && p.color === turn) return sqName(f, 7 - r); }
  return null;
}
