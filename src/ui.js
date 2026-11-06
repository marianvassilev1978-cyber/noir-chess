// Shared UI components: avatars, player bars, eval bar, move lists, eval graph, line viewer.
import { Chess } from "chess.js";
import { h, $, esc, sheet, md } from "./util.js";
import { Board, badgeHTML, pieceURL, checkSquare } from "./board.js";
import { winW, fmtEval, pvSan } from "./analysis.js";
import { moveSound } from "./sound.js";
import { I } from "./icons.js";
import { state } from "./store.js";
import { charSVG } from "./art/character.js";
import { BOT_LOOKS, AVATAR_LOOKS } from "./art/cast.js";
import { bring, typeInto } from "./art/motion.js";
import { sectionArt, emptyArt } from "./art/scenes.js";
import { playerById } from "./players.js";

// Avatar: original SVG art when the player has a look (bots, coaches, you); emoji only as a last resort.
export function lookOf(p) {
  if (!p) return null;
  if (p.look) return p.look;
  const id = p.id || p.botId || (p.name && String(p.name).toLowerCase().replace(/[^a-z]/g, ""));
  if (id && BOT_LOOKS[id]) return { ...BOT_LOOKS[id], id };
  if (id && AVATAR_LOOKS[id]) return { ...AVATAR_LOOKS[id], id };
  if (id === "stockfishmax") return { ...BOT_LOOKS.max, id: "max" };
  if (id && /^p\d+$/.test(id)) { const pl = playerById(id); if (pl) return pl.look; }
  return null;
}
export function avatar(p, size = 38, extra = "", cls = "") {
  if (!p) return "";
  const look = lookOf(p);
  if (look) return `<div class="av ${cls}" style="width:${size}px;height:${size}px;${extra}">${charSVG(look, { label: p.name || look.name || "Avatar" })}</div>`;
  const bg = p.bg || "linear-gradient(135deg,#3a3a40,#1c1c20)";
  return `<div class="av ${cls}" style="width:${size}px;height:${size}px;background:${bg};font-size:${Math.round(size * 0.56)}px;${extra}">${esc(p.av || "♟")}</div>`;
}
export function avatarRated(p, rating, size = 44) {
  return `<div class="avr">${avatar(p, size)}${rating ? `<span class="rbadge">${esc(rating)}</span>` : ""}</div>`;
}

export function userPlayer() {
  const s = state();
  const id = AVATAR_LOOKS[s.profile.avatar] ? s.profile.avatar : "a-knight";
  return { name: s.settings.name || "You", id, look: { ...AVATAR_LOOKS[id], id }, flag: s.profile.flag || "🇧🇬" };
}

// captured pieces + material advantage for one side
export function capturedHTML(chess, color) {
  const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of chess.board()) for (const p of row) if (p && p.type !== "k") have[p.color][p.type]++;
  const opp = color === "w" ? "b" : "w";
  const val = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  let html = "", mat = { w: 0, b: 0 };
  for (const c of ["w", "b"]) for (const t in val) mat[c] += have[c][t] * val[t];
  for (const t of ["p", "n", "b", "r", "q"]) {
    const n = Math.max(0, start[t] - have[opp][t]);
    if (!n) continue;
    html += `<span class="gap8"></span>`;
    for (let i = 0; i < n; i++) html += `<img src="${pieceURL(opp + t.toUpperCase())}" alt="">`;
  }
  const adv = mat[color] - mat[opp];
  if (adv > 0) html += `<span class="adv">+${adv}</span>`;
  return html.replace('<span class="gap8"></span>', "");
}

export function playerBar(p, { rating, color, clock, provisional } = {}) {
  return `<div class="pbar" data-color="${color}">
    ${avatar(p, 42)}
    <div class="grow">
      <div class="nm">${p.title ? `<span class="title-b">${esc(p.title)}</span>` : ""}<span class="pname">${esc(p.name)}</span> ${rating ? `<span class="rt">${rating}${provisional ? "?" : ""}</span>` : ""} <span class="tiny">${p.flag || ""}</span> <span class="think hide"><i></i><i></i><i></i></span></div>
      <div class="caps"></div>
    </div>
    ${clock ? `<div class="clock" data-color="${color}"><span class="t"></span></div>` : ""}
  </div>`;
}

export class EvalBar {
  constructor(el) { this.el = el; el.classList.add("evalbar"); el.innerHTML = '<i></i><span class="top"></span><span class="bot"></span>'; this.flip = false; }
  set(e, orientation = "w") {
    if (!e) return;
    const w = winW(e);
    const bar = this.el.querySelector("i"), top = this.el.querySelector(".top"), bot = this.el.querySelector(".bot");
    bar.style.height = w + "%";
    bar.style.top = orientation === "w" ? "auto" : "0";
    bar.style.bottom = orientation === "w" ? "0" : "auto";
    const t = fmtEval(e).replace("+", "").replace("-", "");
    const whiteBetter = w >= 50;
    const whiteAtBottom = orientation === "w";
    const labelBottom = whiteBetter === whiteAtBottom;
    top.textContent = labelBottom ? "" : t;
    bot.textContent = labelBottom ? t : "";
    (labelBottom ? bot : top).style.color = whiteBetter ? "#222" : "#fff";
  }
}

// horizontal move strip (mobile) — moves: SAN list, cls: optional list of classifications
export function moveStrip(el, moves, cur, cls, onPick, startNo = 1, startColor = "w") {
  let html = "";
  let n = startNo;
  moves.forEach((m, i) => {
    const white = (i + (startColor === "b" ? 1 : 0)) % 2 === 0;
    if (white || i === 0) html += `<span class="n">${n}.${white ? "" : ".."}</span>`;
    html += `<span class="m ${i === cur ? "cur" : ""}" data-i="${i}">${cls && cls[i] && ["brilliant", "great", "inaccuracy", "mistake", "miss", "blunder"].includes(cls[i]) ? badgeHTML(cls[i]) : ""}${esc(m)}</span>`;
    if (!white) n++;
  });
  el.innerHTML = html || '<span class="dim small">Moves appear here</span>';
  el.onclick = (e) => { const t = e.target.closest(".m"); if (t) onPick(+t.dataset.i); };
  const c = el.querySelector(".m.cur");
  if (c) c.scrollIntoView({ block: "nearest", inline: "center" });
  else el.scrollLeft = el.scrollWidth;
}

export function moveTable(el, moves, cur, cls, onPick) {
  let html = "";
  for (let i = 0; i < moves.length; i += 2) {
    html += `<div class="n">${i / 2 + 1}</div>`;
    for (const j of [i, i + 1]) {
      if (j >= moves.length) { html += "<div></div>"; continue; }
      html += `<div class="m ${j === cur ? "cur" : ""}" data-i="${j}">${cls && cls[j] && cls[j] !== "book" ? badgeHTML(cls[j]) : ""}${esc(moves[j])}</div>`;
    }
  }
  el.innerHTML = html;
  el.onclick = (e) => { const t = e.target.closest(".m"); if (t) onPick(+t.dataset.i); };
  const c = el.querySelector(".m.cur"); if (c) c.scrollIntoView({ block: "nearest" });
}

// eval graph SVG (white area = white advantage)
export function evalGraph(evals, cur, onPick, marks = []) {
  const W = 600, H = 90, n = Math.max(1, evals.length - 1);
  const ys = evals.map((e) => H - (winW(e) / 100) * H);
  let d = `M0,${H} `;
  ys.forEach((y, i) => (d += `L${(i / n) * W},${y.toFixed(1)} `));
  d += `L${W},${H} Z`;
  let dots = "";
  for (const m of marks) {
    const x = ((m.i + 1) / n) * W, y = ys[m.i + 1];
    dots += `<circle cx="${x}" cy="${y}" r="5" fill="${m.color}" stroke="#222" stroke-width="1.5"/>`;
  }
  const cx = cur != null ? ((cur + 1) / n) * W : -10;
  const svg = h(`<svg class="graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <path d="${d}" fill="#fff"/>
    <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#888" stroke-width="1" stroke-dasharray="4 4" opacity=".6"/>
    <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="var(--acc)" stroke-width="3"/>
    ${dots}</svg>`);
  svg.addEventListener("click", (e) => {
    const r = svg.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * n) - 1;
    onPick(Math.max(-1, Math.min(evals.length - 2, i)));
  });
  return svg;
}

// Sheet that plays a line out on a board: steps of {uci,san,note}
export function lineViewer({ title, fen, pv, intro = "", outro = "", orientation = "w", maxPlies = 10 }) {
  const c = new Chess(fen);
  const steps = [];
  for (const u of pv.slice(0, maxPlies)) {
    try { const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); steps.push({ m, fen: c.fen(), check: checkSquare(c) }); } catch { break; }
  }
  const s = sheet(`<div class="lp-board" style="max-width:min(100%,52vh);margin:0 auto"></div>
    <div class="movelist mt-s lp-moves" style="border-radius:8px"></div>
    <div class="small mt-s lp-cap">${md(intro)}</div>
    <div class="ctrl" style="background:none;padding:8px 0 0">
      <button class="icon-btn b0">${I.first}</button><button class="icon-btn bp">${I.prev}</button>
      <button class="icon-btn ba" style="flex:2">${I.play2}</button>
      <button class="icon-btn bn">${I.next}</button><button class="icon-btn bl">${I.last}</button></div>`, { title, wide: false });
  const b = new Board($(".lp-board", s.el), { fen, orientation, interactive: false });
  let i = -1, timer = null;
  const sans = steps.map((x) => x.m.san);
  const show = (k, sound = true) => {
    i = Math.max(-1, Math.min(steps.length - 1, k));
    if (i < 0) b.setFen(fen, { lastMove: null, check: null });
    else { const st = steps[i]; b.setFen(st.fen, { lastMove: [st.m.from, st.m.to], check: st.check }); if (sound) moveSound(st.m); }
    b.setArrows(i + 1 < steps.length ? [{ from: steps[i + 1].m.from, to: steps[i + 1].m.to, color: "o", opacity: 0.55 }] : []);
    const startNo = +fen.split(" ")[5] || 1;
    moveStrip($(".lp-moves", s.el), sans, i, null, (j) => { stop(); show(j); }, startNo, fen.split(" ")[1]);
    $(".lp-cap", s.el).innerHTML = md(i === steps.length - 1 && outro ? outro : intro);
  };
  const stop = () => { clearInterval(timer); timer = null; $(".ba", s.el).innerHTML = I.play2; };
  $(".b0", s.el).onclick = () => { stop(); show(-1); };
  $(".bp", s.el).onclick = () => { stop(); show(i - 1); };
  $(".bn", s.el).onclick = () => { stop(); show(i + 1); };
  $(".bl", s.el).onclick = () => { stop(); show(steps.length - 1); };
  $(".ba", s.el).onclick = () => {
    if (timer) return stop();
    if (i >= steps.length - 1) show(-1, false);
    $(".ba", s.el).innerHTML = I.pause;
    timer = setInterval(() => { if (i >= steps.length - 1) return stop(); show(i + 1); }, 1100);
  };
  show(-1, false);
  setTimeout(() => $(".ba", s.el).click(), 500);
  return s;
}

export function ratingChart(hist, { height = 160 } = {}) {
  if (!hist || hist.length < 2) return '<div class="empty small">Play a few games to see your graph.</div>';
  const W = 600, H = height, pad = 24;
  const vals = hist.map((x) => x[1]);
  const lo = Math.floor((Math.min(...vals) - 20) / 50) * 50, hi = Math.ceil((Math.max(...vals) + 20) / 50) * 50;
  const X = (i) => pad + (i / (hist.length - 1)) * (W - pad * 2), Y = (v) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - pad * 2);
  let d = "", area = `M${X(0)},${H - pad} `;
  hist.forEach((x, i) => { d += (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(x[1]).toFixed(1) + " "; area += "L" + X(i).toFixed(1) + "," + Y(x[1]).toFixed(1) + " "; });
  area += `L${X(hist.length - 1)},${H - pad} Z`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".45"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
    <text x="2" y="${Y(hi) + 4}" fill="var(--dim)" font-size="11">${hi}</text><text x="2" y="${Y(lo) + 4}" fill="var(--dim)" font-size="11">${lo}</text>
    <path d="${area}" fill="url(#rg)"/><path d="${d}" fill="none" stroke="var(--acc2)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
    <circle cx="${X(hist.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="4" fill="var(--acc2)"/></svg>`;
}

export function videoList(videos = [], links = []) {
  if (!videos.length && !links.length) return "";
  const vid = (u) => { const m = String(u).match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/); return m && m[1]; };
  let html = '<div class="sec-title">Watch & read</div>';
  for (const v of videos) {
    const id = vid(v.url);
    html += `<a class="video-card" href="${esc(v.url)}" target="_blank" rel="noopener"><div class="thumb" style="background-image:url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)"></div><div class="grow"><div class="bold small">${esc(v.title)}</div><div class="tiny muted">${esc(v.channel || "")}</div></div></a>`;
  }
  for (const l of links) html += `<a class="video-card" href="${esc(l.url)}" target="_blank" rel="noopener"><div class="thumb" style="background:var(--bg3);display:flex"></div><div class="grow"><div class="bold small">${esc(l.title)}</div><div class="tiny muted">${esc(new URL(l.url).hostname)}</div></div></a>`;
  return html;
}

// ---------- design-system components ----------
// progress ring: pct 0..1
export function ring(pct, { size = 56, stroke = 6, label = "", cls = "" } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct || 0)));
  return `<div class="pring ${cls}" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="tr" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/><circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg><b>${label}</b></div>`;
}
export function deltaPill(d) {
  if (d == null) return "";
  const cls = d > 0 ? "up" : d < 0 ? "down" : "zero";
  return `<span class="delta ${cls}">${d > 0 ? "+" + d : d < 0 ? "−" + Math.abs(d) : "±0"}</span>`;
}
export function skeleton(lines = 3) { return `<div class="col gap">${Array.from({ length: lines }, (_, i) => `<div class="skel" style="height:${i ? 16 : 24}px;width:${i ? 60 + ((i * 17) % 35) : 45}%"></div>`).join("")}</div>`; }
export function emptyState(title, text = "", cta = "") { return `<div class="empty">${emptyArt()}<b>${esc(title)}</b>${text ? `<div class="small">${esc(text)}</div>` : ""}${cta}</div>`; }
// section header with animated art banner
export function sectionHead(kind, title, sub = "", right = "") {
  return `<div class="shead"><div class="shead-art">${sectionArt(kind)}</div><div class="shead-body"><div class="grow"><h1>${title}</h1>${sub ? `<div class="small muted">${sub}</div>` : ""}</div>${right}</div></div>`;
}
// coach speech bubble with an animated face; returns {el, ctl, say(html, expr)}
export function coachBubble(container, coach, html = "", { expr = "neutral", size = 56 } = {}) {
  container.innerHTML = `<div class="coachbox"><div class="face" style="width:${size}px;height:${size}px">${charSVG(coach.look, { label: coach.name })}</div><div class="bubble"><div class="who">${esc(coach.short || coach.name)}</div><div class="txt"></div></div></div>`;
  const ctl = bring(container.querySelector(".char"));
  const txt = container.querySelector(".txt");
  const api = {
    el: container.firstElementChild, ctl,
    say(h, e) { if (e) ctl && ctl.expr(e, e === "neutral" ? 0 : 2600); return typeInto(txt, md(h).replace(/^<p>|<\/p>$/g, ""), { ctl }); },
  };
  if (html) api.say(html, expr);
  return api;
}
