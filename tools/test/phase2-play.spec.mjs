// Phase 2: the core loop — rules, clocks, premoves, resign/abort/leave, ratings, rematch, autosave.
import { test, expect } from "@playwright/test";
import { boot, move, drag, startGame, lastGame, store, noErrors, shot, FIXTURE_V2 } from "./helpers.mjs";

test("full game to checkmate (pass & play): result, sheet and review button", async ({ page }) => {
  await boot(page);
  await startGame(page, { mode: "friend", tc: "none" });
  await move(page, "f2", "f3"); await move(page, "e7", "e5"); await move(page, "g2", "g4"); await move(page, "d8", "h4");
  await expect(page.locator(".result-card .res-t")).toHaveText("Black won", { timeout: 8000 });
  await expect(page.locator(".result-card .res-s")).toContainText("checkmate");
  const g = await lastGame(page);
  expect(g.result).toBe("0-1");
  expect(g.moves).toEqual(["f3", "e5", "g4", "Qh4#"]);
  await shot(page, "p2-checkmate");
  await noErrors(page);
});

test("castling both ways, including dropping the king on the rook", async ({ page }) => {
  await boot(page);
  await startGame(page, { mode: "friend", tc: "none", startFen: "r3k2r/pppqbppp/2n1pn2/3p4/3P4/2N1PN2/PPPQBPPP/R3K2R w KQkq - 0 1" });
  await move(page, "e1", "g1"); // short castle by tapping the destination
  await drag(page, "e8", "a8"); // long castle by dropping the king on its rook
  const moves = await page.evaluate(() => window.__noir.game.moves);
  expect(moves).toEqual(["O-O", "O-O-O"]);
  await noErrors(page);
});

test("en passant and promotion with the picker", async ({ page }) => {
  await boot(page, { settings: { autoQueen: false } });
  await startGame(page, { mode: "friend", tc: "none", startFen: "4k3/1P6/8/8/4p3/8/3P4/4K3 w - - 0 1" });
  await move(page, "d2", "d4"); // black can now take en passant
  await move(page, "e4", "d3");
  let moves = await page.evaluate(() => window.__noir.game.moves);
  expect(moves[1]).toBe("exd3");
  await move(page, "b7", "b8");
  await expect(page.locator(".promo-opt")).toHaveCount(4);
  await page.locator('.promo-opt[data-p="n"]').click();
  await page.waitForTimeout(200);
  moves = await page.evaluate(() => window.__noir.game.moves);
  expect(moves[2]).toBe("b8=N");
  await noErrors(page);
});

test("premove: queued while the bot thinks, played instantly after", async ({ page }) => {
  await boot(page);
  await startGame(page, { botId: "ivo", color: "b", tc: "none", rated: false, botQueue: ["e4", "d4"] });
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.length)).toBe(1);
  await move(page, "e7", "e5", { orient: "b" });
  // the bot answers d4; now premove exd4 is not possible before d4 is played, so premove Nc6 during its think
  await move(page, "b8", "c6", { orient: "b" });
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.slice(0, 4).join(" ")), { timeout: 8000 }).toBe("e4 e5 d4 Nc6");
  await noErrors(page);
});

test("abort before two moves changes nothing", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2 });
  const before = (await store(page)).ratings;
  await startGame(page, { botId: "ivo", color: "w", tc: "10+0", rated: true, botQueue: ["e5"] });
  await move(page, "e2", "e4");
  await page.locator("#a-abort").click();
  await expect(page.locator("#toast")).toContainText("aborted");
  const s = await store(page);
  expect(s.ratings.rapid.r).toBe(before.rapid.r);
  expect(s.live).toBe(null);
  await noErrors(page);
});

test("resign in a rated game loses rating by the Glicko-2 amount", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, settings: { confirmResign: true } });
  const pre = await page.evaluate(() => window.__noir.previewGame("rapid", 1000));
  const r0 = (await store(page)).ratings.rapid.r;
  await startGame(page, { botId: "ivo", color: "w", tc: "10+0", rated: true, botQueue: ["e5", "Nc6", "Nf6"] });
  await move(page, "e2", "e4"); await page.waitForTimeout(400);
  await move(page, "g1", "f3"); await page.waitForTimeout(400);
  await move(page, "f1", "c4"); await page.waitForTimeout(400);
  await page.locator("#a-resign").click();
  await page.locator(".sheet .o").click();
  await expect(page.locator(".result-card")).toBeVisible();
  const g = await lastGame(page);
  expect(g.termination).toBe("resignation");
  expect(g.delta).toBe(pre.loss);
  expect(g.delta).toBeLessThan(0);
  expect((await store(page)).ratings.rapid.r).toBe(r0 + pre.loss);
  await shot(page, "p2-resign-sheet");
  await noErrors(page);
});

test("a rated win gains the previewed amount; rematch swaps colours", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2 });
  const pre = await page.evaluate(() => window.__noir.previewGame("rapid", 1000));
  await startGame(page, { botId: "ivo", color: "b", tc: "10+0", rated: true, botQueue: ["f3", "g4"] });
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.length)).toBe(1);
  await move(page, "e7", "e5", { orient: "b" });
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.length)).toBe(3);
  await move(page, "d8", "h4", { orient: "b" });
  await expect(page.locator(".result-card .res-t")).toHaveText("You won!");
  const g = await lastGame(page);
  expect(g.delta).toBe(pre.win);
  expect(g.delta).toBeGreaterThan(0);
  await page.locator(".r-rematch").click();
  await expect.poll(() => page.evaluate(() => window.__noir.game && window.__noir.game.color)).toBe("w");
  await noErrors(page);
});

test("leaving a rated game counts as a resignation", async ({ page }) => {
  await boot(page);
  await startGame(page, { botId: "ivo", color: "w", tc: "10+0", rated: true, botQueue: ["e5", "Nc6"] });
  await move(page, "e2", "e4"); await page.waitForTimeout(400);
  await move(page, "g1", "f3"); await page.waitForTimeout(400);
  await page.locator("#a-leave").click();
  await page.locator(".sheet .o").click();
  const g = await lastGame(page);
  expect(g.termination).toContain("resignation");
  expect(g.score).toBe(0);
  await noErrors(page);
});

test("timeout: the flag falls and the game ends on time", async ({ page }) => {
  await boot(page);
  await startGame(page, { botId: "ivo", color: "w", tc: "1+0", rated: false, botQueue: ["e5", "Nc6"] });
  await move(page, "e2", "e4"); await page.waitForTimeout(500);
  await page.evaluate(() => window.__noir.setClock("w", 700));
  await expect(page.locator(".result-card .res-s")).toContainText("timeout", { timeout: 6000 });
  const g = await lastGame(page);
  expect(g.result).toBe("0-1");
  await noErrors(page);
});

test("an unfinished game autosaves and resumes after a reload", async ({ page }) => {
  await boot(page);
  await startGame(page, { botId: "ivo", color: "w", tc: "none", rated: false, botQueue: ["e5"] });
  await move(page, "e2", "e4");
  await expect.poll(() => page.evaluate(() => window.__noir.game.moves.length)).toBe(2);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById("splash"));
  await page.locator(".resume").click();
  await expect.poll(() => page.evaluate(() => window.__noir.game && window.__noir.game.moves.join(" "))).toBe("e4 e5");
  await noErrors(page);
});

test("Play hub: one tap starts a rated game vs a matched player within ±50", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "play" });
  await page.locator(".start").click();
  await page.locator("#bd .pc").first().waitFor();
  const g = await page.evaluate(() => window.__noir.game);
  const s = await store(page);
  const mine = s.ratings[g.cat].r;
  expect(g.rated).toBe(true);
  expect(Math.abs(g.bot.elo - mine)).toBeLessThanOrEqual(50);
  await shot(page, "p2-game");
  await noErrors(page);
});
