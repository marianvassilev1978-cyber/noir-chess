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
