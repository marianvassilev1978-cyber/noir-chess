// Small DOM + formatting helpers shared by every view.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Minimal markdown: paragraphs, **bold**, *italic*, `code`, [link](url), "- " lists, "1. " lists, ### headings.
export function md(src) {
  if (!src) return "";
  const inline = (s) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<i>$2</i>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const blocks = String(src).replace(/\r/g, "").split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split("\n");
      if (lines.every((l) => /^\s*[-•]\s+/.test(l)))
        return "<ul>" + lines.map((l) => "<li>" + inline(l.replace(/^\s*[-•]\s+/, "")) + "</li>").join("") + "</ul>";
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
        return "<ol>" + lines.map((l) => "<li>" + inline(l.replace(/^\s*\d+[.)]\s+/, "")) + "</li>").join("") + "</ol>";
      if (/^#{1,4}\s/.test(b)) return "<h4>" + inline(b.replace(/^#+\s/, "")) + "</h4>";
      // mixed: a paragraph followed by list lines
      let out = "", list = [];
      const flush = () => { if (list.length) { out += "<ul>" + list.map((l) => "<li>" + inline(l) + "</li>").join("") + "</ul>"; list = []; } };
      let para = [];
      for (const l of lines) {
        if (/^\s*[-•]\s+/.test(l)) { if (para.length) { out += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; } list.push(l.replace(/^\s*[-•]\s+/, "")); }
        else { flush(); para.push(l); }
      }
      flush();
      if (para.length) out += "<p>" + para.map(inline).join("<br>") + "</p>";
      return out;
    })
    .join("");
}

export function fmtClock(ms) {
  if (ms == null || !isFinite(ms)) return "∞";
  ms = Math.max(0, ms);
  const s = ms / 1000;
  if (s < 20) return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") + "." + Math.floor((ms % 1000) / 100);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
  return (hh ? hh + ":" + String(mm).padStart(2, "0") : mm) + ":" + String(ss).padStart(2, "0");
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

let toastTimer;
export function toast(msg, ms = 2200) {
  let t = $("#toast");
  if (!t) { t = h('<div id="toast"></div>'); document.body.appendChild(t); }
  t.innerHTML = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

// Bottom sheet / modal. Returns {el, close}. content is html string or element.
export function sheet(content, { title = "", onClose, wide = false, dismissable = true, footer = "" } = {}) {
  const back = h(`<div class="sheet-back"><div class="sheet ${wide ? "wide" : ""} ${footer ? "has-foot" : ""}" role="dialog" aria-modal="true">
    <div class="sheet-head ${title ? "" : "bare"}">${title ? `<h3>${title}</h3>` : ""}${dismissable ? '<button class="icon-btn sheet-x" aria-label="Close">✕</button>' : ""}</div>
    <div class="sheet-body"></div>${footer ? `<div class="sheet-foot">${footer}</div>` : ""}</div></div>`);
  const body = $(".sheet-body", back);
  if (typeof content === "string") body.innerHTML = content; else body.appendChild(content);
  document.body.appendChild(back);
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => back.classList.add("open"));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.classList.remove("open");
    setTimeout(() => { back.remove(); if (!document.querySelector(".sheet-back")) document.body.classList.remove("sheet-open"); }, 220);
    onClose && onClose();
  };
  if (dismissable) {
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    const x = $(".sheet-x", back); if (x) x.onclick = close;
  }
  return { el: back, body, close };
}

export function confirmSheet(text, okLabel = "OK", cancelLabel = "Cancel") {
  return new Promise((res) => {
    const s = sheet(`<p class="confirm-text">${text}</p><div class="row gap"><button class="btn ghost c">${cancelLabel}</button><button class="btn primary o">${okLabel}</button></div>`, { onClose: () => res(false) });
    $(".c", s.el).onclick = () => { s.close(); res(false); };
    $(".o", s.el).onclick = () => { res(true); s.close(); };
  });
}

export async function copyText(s) {
  try { await navigator.clipboard.writeText(s); toast("Copied"); return true; }
  catch { const ta = h("<textarea></textarea>"); ta.value = s; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Copied"); } catch { toast("Copy failed"); } ta.remove(); return false; }
}

export function download(name, text, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

const cache = {};
export function loadJSON(name) {
  if (!cache[name]) cache[name] = fetch("content/" + name + ".json").then((r) => { if (!r.ok) throw new Error(name + " " + r.status); return r.json(); }).catch((e) => { delete cache[name]; throw e; });
  return cache[name];
}
export async function loadJSONOpt(name, fallback) { try { return await loadJSON(name); } catch { return fallback; } }

export const timeAgo = (t) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
  return new Date(t).toLocaleDateString();
};
