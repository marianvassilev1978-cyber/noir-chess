// Noir Chess 2 — app entry.
import "./styles.css";
import { load, initCloud, onSync } from "./store.js";
import { applyTheme } from "./themes.js";
import { initEngines } from "./engine.js";
import { initClaude } from "./coach.js";
import { register, start, go, rerender, currentRoute, inClaude } from "./router.js";
import { I } from "./icons.js";
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
  <aside id="side"><div class="logo"><b>♞</b> Noir Chess</div>${NAV.map(([k, n, ic]) => `<button data-nav="${k}">${ic}${n}</button>`).join("")}
    <button data-nav="analysis-link">${I.analysis}Analysis</button><div class="side-foot">Stockfish 18 · Lichess data</div></aside>
  <main id="main"><div class="view" id="view"></div></main>
  <nav id="nav">${NAV.map(([k, n, ic]) => `<button data-nav="${k}">${ic}${n}</button>`).join("")}</nav>`;
document.querySelectorAll("[data-nav]").forEach((b) => (b.onclick = () => go(b.dataset.nav === "analysis-link" ? "analysis" : b.dataset.nav)));

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
start();
const sp = document.getElementById("splash");
if (sp) { sp.style.opacity = "0"; setTimeout(() => sp.remove(), 300); }

initEngines().then(() => { if (currentRoute() === "home") rerender(); });
initClaude();
initCloud();
onSync(() => { applyTheme(); if (!["game", "lesson", "review", "puzzle", "rush", "drill", "opening"].includes(currentRoute())) rerender(); });

// register service worker only on the standalone site (not inside Claude)
try {
  if ("serviceWorker" in navigator && window.top === window && !/claude|anthropic/.test(location.hostname) && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
} catch {}
