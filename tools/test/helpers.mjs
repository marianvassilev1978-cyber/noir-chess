// Shared test helpers.
import fs from "fs";
import { expect } from "@playwright/test";
export const FIXTURE_V2 = fs.readFileSync(new URL("../fixtures/state-v2.json", import.meta.url), "utf8");
export const SHOTS = new URL("../../test-results/shots/", import.meta.url).pathname;
fs.mkdirSync(SHOTS, { recursive: true });

// Boot the app. state: a JSON string to put in localStorage first (or null for a fresh install).
export async function boot(page, { state = null, route = "home", test = true, settings = null } = {}) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERR " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|tablebase\.lichess|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(([st, t, set]) => {
    if (sessionStorage.getItem("__booted")) return;
    sessionStorage.setItem("__booted", "1");
    localStorage.clear();
    if (st) localStorage.setItem("noirchess.v2", st);
    if (set) { const s = JSON.parse(localStorage.getItem("noirchess.v2") || '{"v":2,"settings":{}}'); s.settings = Object.assign(s.settings || {}, set); localStorage.setItem("noirchess.v2", JSON.stringify(s)); }
    if (t) localStorage.setItem("noir.test", "1");
  }, [state, test, settings]);
  await page.goto("./#/" + route);
  await page.waitForFunction(() => !document.getElementById("splash"));
  page.errors = errors;
  return errors;
}
export const go = (page, route) => page.evaluate((r) => window.__noir && window.__noir.go ? window.__noir.go(r) : (location.hash = "#/" + r), route);
export const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("noirchess.v2")));
export async function noErrors(page) { expect(page.errors || [], (page.errors || []).join("\n")).toEqual([]); }
export async function shot(page, name) { await page.screenshot({ path: SHOTS + name + ".png" }); }

// tap a move on the board (orient = the side at the bottom)
export async function move(page, from, to, { orient = "w", sel = "#bd" } = {}) {
  const box = await page.locator(sel).boundingBox();
  const xy = (s) => { let f = "abcdefgh".indexOf(s[0]), r = +s[1] - 1; if (orient === "b") { f = 7 - f; r = 7 - r; } return [box.x + (f + 0.5) * box.width / 8, box.y + (7 - r + 0.5) * box.height / 8]; };
  const [a, b] = xy(from), [c, d] = xy(to);
  await page.mouse.click(a, b); await page.waitForTimeout(60); await page.mouse.click(c, d); await page.waitForTimeout(120);
}
// drag a piece (pointer down, move in steps, up)
export async function drag(page, from, to, { orient = "w", sel = "#bd" } = {}) {
  const box = await page.locator(sel).boundingBox();
  const xy = (s) => { let f = "abcdefgh".indexOf(s[0]), r = +s[1] - 1; if (orient === "b") { f = 7 - f; r = 7 - r; } return [box.x + (f + 0.5) * box.width / 8, box.y + (7 - r + 0.5) * box.height / 8]; };
  const [a, b] = xy(from), [c, d] = xy(to);
  await page.mouse.move(a, b); await page.mouse.down(); await page.mouse.move((a + c) / 2, (b + d) / 2, { steps: 5 }); await page.mouse.move(c, d, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(150);
}
// start a game through the test hook. cfg: {botId, color, tc, rated, mode, startFen, botQueue}
export async function startGame(page, cfg) {
  await page.waitForFunction(() => window.__noir && window.__noir.newGame);
  await page.evaluate((cfg) => {
    window.__noir.botQueue = cfg.botQueue || [];
    const bot = cfg.mode === "friend" ? { id: "friend", name: "Friend", elo: 0 } : undefined;
    window.__noir.newGame({ ...cfg, bot });
  }, cfg);
  await page.locator("#bd .pc").first().waitFor();
  await page.waitForTimeout(300);
}
export const lastGame = (page) => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("noirchess.v2")); return s.games[s.games.length - 1]; });
export const fenOf = (page) => page.evaluate(() => window.__noir.game && window.__noir.game.moves.length);
