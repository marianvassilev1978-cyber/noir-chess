// Phase 4: rated puzzles, Puzzle Rush, Puzzle Duel, Daily Puzzle, custom practice, stats.
import { test, expect } from "@playwright/test";
import { boot, store, noErrors, shot, solvePuzzle, failPuzzle, FIXTURE_V2 } from "./helpers.mjs";

test("rated puzzle: solve → rating up, streak, timer, theme tags, history", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "puzzle/rated", settings: { autoQueen: false } });
  const before = (await store(page)).ratings.puzzle;
  await expect(page.locator(".pz-stake")).toContainText("Puzzle");
  await solvePuzzle(page, "#pzb .board");
  await expect(page.locator(".pz-status.ok")).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".pr .delta.up")).toBeVisible();
  await expect(page.locator(".tags .chip").first()).toBeVisible();
  const s = await store(page);
  expect(s.ratings.puzzle.r).toBeGreaterThan(before.r);
  expect(s.puzzle.streak).toBe(5); // the fixture had a streak of 4
  expect(s.puzzleHist.length).toBe(1);
  await shot(page, "p4-rated");
  await noErrors(page);
});

test("rated puzzle: a wrong move fails it, rating goes down, retry offered; hint counts as a fail", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "puzzle/rated" });
  const before = (await store(page)).ratings.puzzle.r;
  await failPuzzle(page, "#pzb .board");
  await expect(page.locator(".pz-status.bad")).toBeVisible();
  await expect(page.locator(".rt")).toBeVisible();
  let s = await store(page);
  expect(s.ratings.puzzle.r).toBeLessThan(before);
  expect(s.puzzle.streak).toBe(0);
  // next puzzle: use a hint, then solve → still counted as a fail
  await page.locator(".next").click();
  const r1 = s.ratings.puzzle.r;
  await page.waitForTimeout(800);
  await page.locator(".hint").click();
  await solvePuzzle(page, "#pzb .board");
  await expect(page.locator(".next")).toBeVisible();
  s = await store(page);
  expect(s.ratings.puzzle.r).toBeLessThan(r1);
  await noErrors(page);
});

test("Puzzle Rush: solve, strike out, results list with review", async ({ page }) => {
  await boot(page, { route: "rush", settings: { autoQueen: false } });
  await page.locator('[data-k="r3"]').click();
  await solvePuzzle(page, "#rb .board");
  await expect(page.locator(".sc")).toHaveText("1", { timeout: 6000 });
  for (let i = 0; i < 3; i++) { await page.waitForTimeout(400); await failPuzzle(page, "#rb .board"); await page.waitForTimeout(900); }
  await expect(page.locator(".fsc")).toBeVisible({ timeout: 8000 });
  await expect(page.locator(".rr")).toHaveCount(4);
  await page.locator(".rr").first().click();
  await expect(page.locator(".sheet .lp-board")).toBeVisible();
  const s = await store(page);
  expect(s.rush.best.r3).toBe(1);
  await shot(page, "p4-rush-results");
  await noErrors(page);
});

test("Puzzle Duel: race a bot on the same clock, result recorded", async ({ page }) => {
  await boot(page, { route: "duel", settings: { autoQueen: false } });
  await page.locator("[data-id]").first().click();
  await solvePuzzle(page, "#db .board");
  await expect(page.locator(".msc")).toHaveText("1", { timeout: 6000 });
  await expect(page.locator(".result-card")).toBeVisible({ timeout: 30000 });
  const s = await store(page);
  expect(s.duels.length).toBe(1);
  expect(s.duels[0].me).toBeGreaterThanOrEqual(1);
  await shot(page, "p4-duel");
  await noErrors(page);
});

test("Daily puzzle: calendar streak marks today", async ({ page }) => {
  await boot(page, { route: "daily", settings: { autoQueen: false } });
  await expect(page.locator(".cal i.today")).toHaveCount(1);
  await page.locator(".go").click();
  await solvePuzzle(page, "#pzb .board");
  await expect(page.locator(".next")).toBeVisible({ timeout: 8000 });
  await page.locator(".next").click();
  await expect(page.locator(".cal i.today.ok")).toHaveCount(1);
  await shot(page, "p4-daily");
  await noErrors(page);
});

test("custom practice by theme and rating range; stats recommend a theme", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "puzzle/custom/fork/800-1600" });
  await page.waitForFunction(() => window.__noir && window.__noir.pz);
  const p = await page.evaluate(() => window.__noir.pz);
  expect(p.themes).toContain("fork");
  expect(p.rating).toBeGreaterThanOrEqual(800);
  expect(p.rating).toBeLessThanOrEqual(1600);
  await page.evaluate(() => window.__noir.go("puzzle-stats"));
  await expect(page.locator(".recm")).toContainText("Recommended");
  await expect(page.locator(".tbar").first()).toBeVisible();
  await shot(page, "p4-stats");
  await noErrors(page);
});
