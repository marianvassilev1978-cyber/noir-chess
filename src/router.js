// In-memory router with a back stack. Inside the Claude artifact the URL hash can't carry "#/path",
// so navigation never depends on it; on the standalone site the hash is mirrored for refresh/deep links.
const views = {};
const routeHooks = [];
export const onRoute = (f) => routeHooks.push(f);
const IMMERSIVE = ["game", "review", "analysis", "lesson", "drill", "puzzle", "rush", "mistakes", "vision", "opening", "duel"];
let cleanup = null, current = null, stack = [];
export const inClaude = /claude|anthropic/.test(location.hostname) || window.top !== window;
export const routes = views;
export function register(name, render) { views[name] = render; }

export function go(path, { replace = false } = {}) {
  if (replace) stack[stack.length - 1] = path; else if (stack[stack.length - 1] !== path) stack.push(path);
  if (stack.length > 60) stack = stack.slice(-60);
  renderPath(path);
}
export function back() {
  if (stack.length > 1) { stack.pop(); renderPath(stack[stack.length - 1]); }
  else go("home", { replace: true });
}
export const currentRoute = () => current;
export const currentPath = () => stack[stack.length - 1] || "home";
export function rerender() { renderPath(currentPath()); }

let mirroring = false;
function renderPath(raw) {
  const [name, ...rest] = (raw || "home").split("/");
  const params = rest.map(decodeURIComponent);
  const view = views[name] || views.home;
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  const root = document.getElementById("view");
  root.className = "view";
  root.innerHTML = "";
  window.scrollTo(0, 0);
  current = name;
  const immersive = IMMERSIVE.includes(name);
  document.body.classList.toggle("immersive", immersive);
  document.querySelectorAll("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === navOf(name)));
  if (!inClaude && raw.length < 300) { mirroring = true; try { history.replaceState(null, "", "#/" + raw); } catch {} mirroring = false; }
  try { cleanup = view(root, params) || null; } catch (e) { console.error(e); root.innerHTML = `<div class="card">Something went wrong: ${String(e.message || e)}</div>`; }
  for (const f of routeHooks) { try { f(name, root, immersive); } catch (e) { console.warn(e); } }
}

export function start() {
  let first = "home";
  if (!inClaude && location.hash.startsWith("#/")) { const h = location.hash.slice(2); if (h && !h.startsWith("game") && !h.startsWith("review")) first = h; }
  stack = first === "home" ? ["home"] : ["home", first];
  renderPath(first);
}
// keep old-style links (<a href="#/x">) working everywhere
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#/"]');
  if (!a) return;
  e.preventDefault();
  go(a.getAttribute("href").slice(2));
});
// hardware/browser back on the standalone site
window.addEventListener("popstate", () => { if (!mirroring && !inClaude) back(); });

function navOf(name) {
  if (["play", "game", "review", "analysis", "history"].includes(name)) return "play";
  if (["puzzles", "rush", "mistakes", "puzzle"].includes(name)) return "puzzles";
  if (["learn", "course", "lesson", "openings", "opening", "endgames", "drill", "vision", "library", "plan"].includes(name)) return "learn";
  if (["profile", "settings", "stats"].includes(name)) return "profile";
  return "home";
}
