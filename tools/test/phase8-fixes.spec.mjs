// Fixes from Mariyan's first real use (2026-11-06): leaving a finished game, the game-over sheet on small phones,
// choosing your opponent, jumping to moves from the review table.
import { test, expect, devices } from "@playwright/test";
import { boot, move, startGame, store, noErrors, shot } from "./helpers.mjs";

async function winFast(page) {
  await startGame(page, { botId: "ivo", color: "b", tc: "10+0", rated: true, botQueue: ["f3", "g4"] });
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.length)).toBe(1);
  await move(page, "e7", "e5", { orient: "b" });
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.length)).toBe(3);
  await move(page, "d8", "h4", { orient: "b" });
  await expect(page.locator(".result-card")).toBeVisible();
}

test.describe("small iPhone (SE)", () => {
  const { defaultBrowserType, ...se } = devices["iPhone SE"];
  test.use(se);
  test("game over: the sheet's buttons are on screen, it has a close button, Exit leaves the game", async ({ page }) => {
    await boot(page, { route: "play" });
    await winFast(page);
    await page.waitForTimeout(800); // the sheet's slide-in
    const vh = await page.evaluate(() => innerHeight);
    for (const sel of [".sheet .r-review", ".sheet .r-rematch", ".sheet .r-exit", ".sheet .sheet-x"]) {
      const b = await page.locator(sel).boundingBox();
      expect(b && b.y + b.height, sel).toBeLessThanOrEqual(vh);
    }
    await shot(page, "p8-sheet-se");
    await page.locator(".sheet .r-exit").click();
    await expect.poll(() => page.evaluate(() => location.hash)).not.toContain("game");
    expect((await store(page)).live).toBe(null);
    await noErrors(page);
  });
});

test("the shown rating after a first rated game is the real new rating", async ({ page }) => {
  await boot(page, { route: "play" });
  await winFast(page);
  await page.waitForTimeout(1800);
  const shown = +(await page.locator(".rr").innerText());
  const s = await store(page);
  expect(shown).toBe(s.ratings.rapid.r);
  await noErrors(page);
});

test("a finished game can always be closed: ✕ in the header and Exit in the action bar", async ({ page }) => {
  await boot(page, { route: "play" });
  await winFast(page);
  await page.locator(".sheet .sheet-x").click();
  await expect(page.locator("#a-exit")).toBeVisible();
  await page.locator(".g-close").click();
  await expect.poll(() => page.evaluate(() => location.hash)).toContain("play");
  await noErrors(page);
});

test("✕ during a game: before two moves it aborts, later it asks before resigning", async ({ page }) => {
  await boot(page, { route: "play" });
  await startGame(page, { botId: "ivo", color: "w", tc: "10+0", rated: false, botQueue: ["e5", "Nc6"] });
  await move(page, "e2", "e4"); await page.waitForTimeout(400);
  await move(page, "g1", "f3"); await page.waitForTimeout(500);
  await page.locator(".g-close").click();
  await expect(page.locator(".confirm-text")).toContainText("Leave");
  await page.locator(".sheet .c").click(); // stay
  await expect(page.locator(".g-close")).toBeVisible();
  await noErrors(page);
});

test("choose your opponent: players by rating, featured bots, custom strength", async ({ page }) => {
  await boot(page, { route: "play" });
  await page.locator(".choose").click();
  await page.locator('.op-tabs button[data-t="players"]').click();
  await page.locator(".tr").evaluate((el) => { el.value = "2000"; el.dispatchEvent(new Event("change")); });
  await expect(page.locator(".tv")).toHaveText("2000");
  await shot(page, "p8-picker");
  await page.locator(".op-row").nth(10).click();
  await expect(page.locator(".hero .eyebrow")).toContainText("Your pick");
  await page.locator(".start").click();
  await page.locator("#bd .pc").first().waitFor();
  const g = await page.evaluate(() => window.__noir.game);
  expect(Math.abs(g.bot.elo - 2000)).toBeLessThanOrEqual(150);
  // featured bots and custom strength
  await page.locator(".g-close").click(); // fewer than 2 moves each: aborts
  await page.evaluate(() => window.__noir.go("play"));
  await page.locator(".choose").click();
  await page.locator('.op-tabs button[data-t="custom"]').click();
  await page.locator(".cr2").evaluate((el) => { el.value = "1550"; el.dispatchEvent(new Event("input")); });
  await page.locator(".cgo").click();
  await expect(page.locator(".opp")).toContainText("1550");
  await noErrors(page);
});

test("review: tap a classification row to jump to those moves", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => window.__noir && window.__noir.go);
  await page.evaluate(() => { const s = window.__noir.state(); s.games.push({ id: "t8", date: Date.now(), mode: "bot", botId: "hana", bot: { id: "hana", name: "Hana", elo: 1700 }, color: "w", tc: "10+0", cat: "rapid", rated: false, result: "0-1", termination: "checkmate", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4", "Nxe5", "Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"], startFen: null, score: 0, userRating: 1200 }); window.__noir.save(); window.__noir.go("review/t8"); });
  await page.locator(".go-walk").waitFor({ timeout: 120000 });
  await page.locator('.cls-table .c[data-k="book"]').click();
  await expect(page.locator(".cyc-bar")).toBeVisible();
  await expect(page.locator(".cy-t")).toContainText("Book");
  await page.locator(".cy-n").click();
  await expect(page.locator(".cy-t")).toContainText("2 of");
  await page.locator(".rv-close2").click();
  await expect.poll(() => page.evaluate(() => location.hash)).toContain("play");
  await noErrors(page);
});

test("a dead engine worker (iOS kills them in the background) is restarted and the analysis comes back", async ({ page }) => {
  test.setTimeout(90000);
  const wlog = [];
  page.on("worker", (w) => wlog.push("worker " + w.url().split("/").pop()));
  page.on("console", (m) => wlog.push(m.type() + " " + m.text().slice(0, 140)));
  page.on("requestfailed", (r) => wlog.push("reqfail " + r.url().split("/").pop() + " " + (r.failure() || {}).errorText));
  await boot(page, { route: "analysis" });
  try { await expect(page.locator(".eng-d")).toContainText("depth", { timeout: 30000 }); }
  catch (e) { console.log("DIAG", JSON.stringify(await page.evaluate(() => window.__noir.engines())), wlog.join(" | "), "\nLOG " + (await page.evaluate(() => window.__noir.engineLog())).join("\n    ")); throw e; }
  await page.evaluate(() => window.__noir.killEngine());
  await move(page, "e2", "e4", { sel: "#abd" });
  await expect.poll(() => page.evaluate(() => window.__noir.engines()[0].restarts), { timeout: 40000 }).toBe(1);
  await expect(page.locator(".a-line").first()).toContainText(/[a-h][1-8]/, { timeout: 30000 });
  const e = await page.evaluate(() => window.__noir.engines()[0]);
  expect(e.ready).toBe(true);
  await noErrors(page);
});

test("back from the background: a dead engine is found by a ping and restarted before the next move", async ({ page }) => {
  await boot(page, { route: "analysis" });
  await expect(page.locator(".eng-d")).toContainText("depth", { timeout: 30000 });
  await page.evaluate(() => window.__noir.killEngine());
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => page.evaluate(() => window.__noir.engines()[0].restarts), { timeout: 12000 }).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__noir.engines()[0].ready), { timeout: 15000 }).toBe(true);
  await move(page, "e2", "e4", { sel: "#abd" });
  await expect(page.locator(".eng-d")).toContainText("depth", { timeout: 15000 });
  await noErrors(page);
});
