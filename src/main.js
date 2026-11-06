// Noir Chess 2 — app entry.
import "./styles.css";
import { load, initCloud, onSync } from "./store.js";
import { applyTheme } from "./themes.js";
import { initEngines } from "./engine.js";
import { initClaude } from "./coach.js";
import { register, start, go, rerender, currentRoute, inClaude, onRoute } from "./router.js";
import { I } from "./icons.js";
import { installPress, enterStagger, animate, reduced } from "./art/motion.js";
import { logoMark } from "./art/scenes.js";
import * as Home from "./views/home.js";
import * as Play from "./views/play.js";
import * as Game from "./views/game.js";
import * as Review from "./views/review.js";
import * as Analysis from "./views/analysis.js";
import * as Puzzles from "./views/puzzles.js";
import * as Learn from "./views/learn.js";
import * as Openings from "./views/openings.js";
import * as X from "./views/extras.js";
import * as Profile from "./views/profile.js";

load();
applyTheme();

const NAV = [["home", "Home", I.home], ["play", "Play", I.play], ["puzzles", "Puzzles", I.puzzle], ["learn", "Learn", I.learn], ["profile", "Profile", I.more]];
document.getElementById("app").innerHTML = `
  <div id="bg" aria-hidden="true"></div>
  <aside id="side"><div class="logo">${logoMark(34, { glow: false })} Noir Chess</div>${NAV.map(([k, n, ic]) => `<button data-nav="${k}">${ic}${n}</button>`).join("")}
    <button data-nav="analysis-link">${I.analysis}Analysis</button><div class="side-foot">Stockfish 18 · Lichess data</div></aside>
  <main id="main"><div class="view" id="view"></div></main>
  <nav id="nav" aria-label="Main"><span class="ind"></span>${NAV.map(([k, n, ic]) => `<button data-nav="${k}" aria-label="${n}">${ic}<span>${n}</span></button>`).join("")}</nav>`;
document.querySelectorAll("[data-nav]").forEach((b) => (b.onclick = () => go(b.dataset.nav === "analysis-link" ? "analysis" : b.dataset.nav)));
installPress();
applyTheme();

// tab-bar indicator glides to the active tab (spring)
function moveIndicator() {
  const nav = document.getElementById("nav"), ind = nav.querySelector(".ind"), on = nav.querySelector("button.on");
  if (!on) { ind.style.opacity = "0"; return; }
  const x = on.offsetLeft - 6, w = on.offsetWidth;
  ind.style.opacity = "1"; ind.style.width = w + "px";
  if (reduced() || !ind.dataset.ready) { ind.style.transform = `translateX(${x}px)`; ind.dataset.ready = "1"; return; }
  animate(ind, { x }, { type: "spring", stiffness: 420, damping: 32 });
}
onRoute((name, root, immersive) => {
  moveIndicator();
  if (reduced()) return;
  if (immersive) animate(root, { opacity: [0, 1] }, { duration: 0.25 });
  else { animate(root, { opacity: [0, 1], y: [10, 0] }, { type: "spring", bounce: 0.15, duration: 0.45 }); enterStagger(root, ":scope > *:not(.topbar), :scope > .grid > *"); }
});
window.addEventListener("resize", moveIndicator);

register("home", Home.render);
register("play", Play.render);
register("history", Play.renderHistory);
register("game", Game.render);
register("review", Review.render);
register("analysis", Analysis.render);
register("puzzles", Puzzles.renderHub);
register("puzzle", Puzzles.renderTrainer);
register("rush", Puzzles.renderRush);
register("mistakes", Puzzles.renderMistakes);
register("learn", Learn.renderHub);
register("course", Learn.renderCourse);
register("lesson", Learn.renderLesson);
register("openings", Openings.renderList);
register("opening", Openings.renderOpening);
register("endgames", (r) => X.renderGym(r, []));
register("drill", X.renderGym);
register("vision", X.renderVision);
register("plan", X.renderPlan);
register("library", X.renderLibrary);
register("profile", Profile.render);
register("settings", Profile.renderSettings);

document.body.classList.toggle("in-claude", inClaude);
// test hooks (only when localStorage["noir.test"] is set by the Playwright suite)
if (localStorage.getItem("noir.test")) {
  import("./store.js").then((st) => { window.__noir = Object.assign(window.__noir || {}, { go, state: st.state, save: st.save, previewGame: st.previewGame, newGame: Game.newGame, botQueue: (window.__noir && window.__noir.botQueue) || [] }); });
}
start();
const sp = document.getElementById("splash");
if (sp) setTimeout(() => { sp.style.opacity = "0"; setTimeout(() => sp.remove(), 460); }, 350);

initEngines().then(() => { if (currentRoute() === "home") rerender(); });
initClaude();
initCloud();
onSync(() => { applyTheme(); if (!["game", "lesson", "review", "puzzle", "rush", "drill", "opening"].includes(currentRoute())) rerender(); });

// register service worker only on the standalone site (not inside Claude)
try {
  if ("serviceWorker" in navigator && window.top === window && !/claude|anthropic/.test(location.hostname) && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
} catch {}
