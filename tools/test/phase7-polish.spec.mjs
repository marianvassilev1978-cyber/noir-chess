// Phase 7: onboarding, settings, backup & restore, migration of an existing save, credits, accessibility, monkey test.
import { test, expect } from "@playwright/test";
import { boot, store, noErrors, shot, FIXTURE_V2 } from "./helpers.mjs";

test("migration: an existing v2 save upgrades to v3 without losing anything", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2 });
  const old = JSON.parse(FIXTURE_V2);
  const s = await page.evaluate(() => { window.__noir.save(); return JSON.parse(localStorage.getItem("noirchess.v2")); });
  expect(s.v).toBe(3);
  expect(s.ratings.rapid.r).toBe(1240);
  expect(s.ratings.rapid.games).toBe(37);
  expect(s.ratings.rapid.rd).toBeLessThan(100); // established
  expect(s.ratings.blitz.r).toBe(1180);
  expect(s.ratings.bullet.r).toBe(1240); // seeded from Rapid
  expect(s.ratings.bullet.games).toBe(0); // provisional
  expect(s.ratings.puzzle.r).toBe(1405);
  expect(s.games.length).toBe(old.games.length);
  expect(s.games[1].review.accW).toBe(old.games[1].review.accW);
  expect(s.puzzle.solved).toBe(180);
  expect(s.puzzle.themeStats.fork).toEqual(old.puzzle.themeStats.fork);
  expect(s.mistakes.length).toBe(1);
  expect(s.openings["vienna-gambit"].stars).toBe(3);
  expect(s.lessons["l1-board"].done).toBe(true);
  expect(s.streak.count).toBe(9);
  expect(s.xp).toBeGreaterThanOrEqual(2380);
  expect(s.settings.name).toBe("Mariyan");
  expect(s.settings.board).toBe("brown");
  expect(s.settings.theme).toBe("midnight");
  expect(s.live.moves).toEqual(["e4", "e5", "Nf3"]);
  expect(s.opponents.ivo.w).toBe(1);
  // the untouched v2 save is kept as a backup
  const backup = await page.evaluate(() => localStorage.getItem("noirchess.backup.v2"));
  expect(JSON.parse(backup).v).toBe(2);
  await noErrors(page);
});

test("onboarding: name, level, coach, board", async ({ page }) => {
  await boot(page, { route: "welcome" });
  await page.locator(".nm").fill("Mariyan");
  await page.locator(".nx").click();
  await page.locator('.lv[data-r="1000"]').click();
  await page.locator('.ob-coach[data-c="mira"]').click();
  await shot(page, "p7-onboarding");
  await page.locator(".nx").click();
  await page.locator('.bds .swatch[data-b="jade"]').click();
  await page.locator(".ob-finish").click();
  const s = await store(page);
  expect(s.settings.name).toBe("Mariyan");
  expect(s.settings.coach).toBe("mira");
  expect(s.settings.board).toBe("jade");
  expect(s.ratings.rapid.r).toBe(1000);
  expect(s.onboarded).toBe(true);
  await noErrors(page);
});

test("backup and restore round-trip", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "settings" });
  const backup = await page.evaluate(() => { const s = window.__noir.state(); window.__noir.save(); return JSON.stringify(s); });
  // wipe everything, then restore from the copied backup
  await page.evaluate(() => { localStorage.setItem("noirchess.v2", JSON.stringify({ v: 3, settings: { name: "Wiped" }, ratings: {}, games: [] })); });
  await page.reload(); await page.waitForFunction(() => window.__noir && window.__noir.go);
  await page.evaluate(() => window.__noir.go("settings"));
  await page.locator(".imb").click();
  await page.locator(".sheet .bk").fill(backup);
  await page.locator(".sheet .ok").click();
  await page.locator(".sheet .o").click();
  await expect(page.locator("#toast")).toContainText("restored");
  const s = await store(page);
  expect(s.settings.name).toBe("Mariyan");
  expect(s.ratings.rapid.r).toBe(1240);
  expect(s.games.length).toBe(2);
  await noErrors(page);
});

test("settings: credits list every licence; build id is shown", async ({ page }) => {
  await boot(page, { route: "settings" });
  await expect(page.locator(".bid")).not.toHaveText("dev");
  await shot(page, "p7-settings");
  await page.locator(".cred").click();
  for (const t of ["Stockfish", "chess.js", "Lichess puzzle", "Motion", "canvas-confetti", "Inter", "Instrument Serif", "Kenney"]) await expect(page.locator("#view")).toContainText(t);
  await noErrors(page);
});

test("accessibility: every button has an accessible name; images have text", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2 });
  for (const r of ["home", "play", "puzzles", "learn", "profile", "settings"]) {
    await page.evaluate((r) => window.__noir.go(r), r);
    await page.waitForTimeout(600);
    const bad = await page.evaluate(() => [...document.querySelectorAll("#view button, #nav button")].filter((b) => !b.getAttribute("aria-label") && !b.textContent.trim()).length);
    expect(bad, "unlabelled buttons on " + r).toBe(0);
    const imgs = await page.evaluate(() => [...document.querySelectorAll("#view svg.char")].filter((s) => !s.getAttribute("aria-label")).length);
    expect(imgs).toBe(0);
  }
  await noErrors(page);
});

test("monkey test (60 s): random taps across the app never crash it", async ({ page }) => {
  test.setTimeout((+process.env.MONKEY_MS || 60000) + 120000);
  await boot(page, { state: FIXTURE_V2 });
  const routes = ["home", "play", "puzzles", "learn", "profile", "settings", "analysis", "stats", "achievements", "coaches", "rush", "openings/openings", "endgames", "history", "daily", "repertoire"];
  const end = Date.now() + (+process.env.MONKEY_MS || 60000);
  let n = 0;
  while (Date.now() < end) {
    if (n % 25 === 0) await page.evaluate((r) => window.__noir.go(r), routes[Math.floor(Math.random() * routes.length)]);
    const vp = page.viewportSize();
    await page.mouse.click(Math.random() * vp.width, Math.random() * vp.height);
    if (Math.random() < 0.08) await page.keyboard.press("Escape");
    await page.waitForTimeout(80 + Math.random() * 200);
    n++;
  }
  console.log("monkey taps:", n);
  await noErrors(page);
});
