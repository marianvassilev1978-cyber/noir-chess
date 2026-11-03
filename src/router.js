// Hash router. Views register a render(root, params) that may return a cleanup function.
const views = {};
let cleanup = null, current = null;
export const routes = views;
export function register(name, render) { views[name] = render; }
export function go(path) {
  if (location.hash === "#/" + path) { renderRoute(); return; }
  location.hash = "#/" + path;
}
export const back = () => (history.length > 1 ? history.back() : go("home"));
export function currentRoute() { return current; }

export function renderRoute() {
  const raw = (location.hash || "#/home").slice(2) || "home";
  const [name, ...rest] = raw.split("/");
  const params = rest.map(decodeURIComponent);
  const view = views[name] || views.home;
  if (cleanup) { try { cleanup(); } catch (e) { console.warn(e); } cleanup = null; }
  const root = document.getElementById("view");
  root.className = "view";
  root.innerHTML = "";
  window.scrollTo(0, 0);
  current = name;
  document.body.classList.toggle("immersive", ["game", "review", "analysis", "lesson", "drill", "puzzle", "rush", "mistakes", "vision", "opening"].includes(name));
  document.querySelectorAll("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === navOf(name)));
  try { cleanup = view(root, params) || null; } catch (e) { console.error(e); root.innerHTML = `<div class="card">Something went wrong: ${String(e.message || e)}</div>`; }
}
function navOf(name) {
  if (["play", "game", "review", "analysis", "history"].includes(name)) return "play";
  if (["puzzles", "rush", "mistakes", "puzzle"].includes(name)) return "puzzles";
  if (["learn", "course", "lesson", "openings", "opening", "endgames", "drill", "vision", "library", "plan"].includes(name)) return "learn";
  if (["profile", "settings", "stats"].includes(name)) return "profile";
  return "home";
}
window.addEventListener("hashchange", renderRoute);
