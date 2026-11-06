// Phase 5: courses with covers + coach narration, lesson exercises, opening drills, play the opening vs a bot,
// the repertoire builder, the Endgame Gym.
import { test, expect } from "@playwright/test";
import fs from "fs";
import { Chess } from "chess.js";
import { boot, move, store, noErrors, shot } from "./helpers.mjs";

const C = (n) => JSON.parse(fs.readFileSync(new URL(`../../content/${n}.json`, import.meta.url), "utf8"));
// the first lesson that has an exercise, and the index of that step
function firstExercise() {
  for (const lv of C("lessons")) for (const l of lv.lessons) { const i = l.steps.findIndex((s) => s.type === "exercise"); if (i >= 0) return { lesson: l, i, step: l.steps[i] }; }
}
function uciMoves(fen, sans) { const c = new Chess(fen); return sans.map((san) => { try { const m = c.move(san); return m.from + m.to + (m.promotion || ""); } catch { const clean = san.replace(/[!?]+$/, ""); const mm = clean.match(/^([NBRQK])([a-h]?[1-8]?)(x?[a-h][1-8].*)$/); const m = c.move(mm ? mm[1] + mm[3] : clean); return m.from + m.to + (m.promotion || ""); } }); }

test("Learn hub: course cards with covers, progress rings and narrating coaches", async ({ page }) => {
  await boot(page, { route: "learn" });
  await expect(page.locator(".course-card")).toHaveCount(12, { timeout: 10000 });
  await expect(page.locator(".course-card .cover-svg").first()).toBeVisible();
  await expect(page.locator(".course-card .pring").first()).toBeVisible();
  await expect(page.locator(".rec-card")).toBeVisible();
  await shot(page, "p5-learn");
  await page.locator(".course-card").first().click();
  await expect(page.locator(".course-hero h1")).toBeVisible();
  await expect(page.locator(".ch-coach .txt")).not.toBeEmpty({ timeout: 8000 });
  await shot(page, "p5-course");
  await noErrors(page);
});

test("lesson exercise: the coach narrates, the exercise is solved on the board", async ({ page }) => {
  const { lesson, i, step } = firstExercise();
  await boot(page, { route: "lesson/" + lesson.id });
  await expect(page.locator(".lesson-coach .txt")).not.toBeEmpty({ timeout: 10000 });
  for (let k = 0; k < i; k++) { await page.locator(".nextb").click(); await page.waitForTimeout(200); }
  await expect(page.locator(".nextb")).toBeDisabled();
  const me = step.fen.split(" ")[1];
  const ucis = uciMoves(step.fen, step.solution);
  for (let k = 0; k < ucis.length; k += 2) { await page.waitForTimeout(400); await move(page, ucis[k].slice(0, 2), ucis[k].slice(2, 4), { orient: me, sel: ".lb .board" }); await page.waitForTimeout(800); }
  await expect(page.locator(".feedback.ok")).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".nextb")).toBeEnabled();
  await shot(page, "p5-exercise");
  // finish the lesson
  for (let k = 0; k < 40; k++) { const b = page.locator(".nextb"); if (!(await b.isVisible().catch(() => false))) break; if (await b.isDisabled()) { const show = page.locator(".show"); if (await show.count()) { await show.click(); await page.locator(".sheet .sheet-x").click(); } else break; } else await b.click(); await page.waitForTimeout(150); }
  await expect(page.locator("h2", { hasText: "Lesson complete" })).toBeVisible({ timeout: 10000 });
  const s = await store(page);
  expect(s.lessons[lesson.id].done).toBe(true);
  await noErrors(page);
});

test("opening drill from memory earns three stars and schedules a review", async ({ page }) => {
  const o = C("openings").find((x) => x.id === "vienna");
  const l = o.lines[0];
  await boot(page, { route: "opening/vienna" });
  await page.locator(`.lesson-row[data-l="${l.id}"]`).click();
  await page.locator(".sheet .drill").click();
  const ucis = uciMoves(new Chess().fen(), l.moves.map((m) => m.san));
  for (let k = 0; k < ucis.length; k += 2) { await page.waitForTimeout(700); await move(page, ucis[k].slice(0, 2), ucis[k].slice(2, 4), { orient: "w", sel: "#lt" }); }
  await expect(page.locator(".fb .feedback.ok")).toBeVisible({ timeout: 15000 });
  const s = await store(page);
  expect(s.openings[l.id].stars).toBe(3);
  expect(s.openings[l.id].due).toBeTruthy();
  await shot(page, "p5-drill");
  await noErrors(page);
});

test("play the opening vs a bot: the bot is forced into the line", async ({ page }) => {
  const o = C("openings").find((x) => x.id === "caro-kann");
  const l = o.lines[0];
  await boot(page, { route: "opening/caro-kann" });
  await page.locator(`.lesson-row[data-l="${l.id}"]`).click();
  await page.locator(".sheet .vsbot").click();
  await page.locator(".sheet .pb").first().click();
  await page.locator("#bd .pc").first().waitFor();
  // you are Black: the bot (White) must play the line's first move
  await expect.poll(() => page.evaluate(() => window.__noir.game && window.__noir.game.moves[0]), { timeout: 15000 }).toBe(l.moves[0].san);
  const g = await page.evaluate(() => window.__noir.game);
  expect(g.color).toBe("b");
  expect(g.forcedLine.moves[0]).toBe(l.moves[0].san);
  await noErrors(page);
});

test("repertoire builder: pick openings, drill them", async ({ page }) => {
  await boot(page, { route: "repertoire" });
  await page.locator('.rp[data-id="vienna"]').click();
  await page.locator('.rp[data-id="caro-kann"]').click();
  const s = await store(page);
  expect(s.repertoire.white).toContain("vienna");
  expect(s.repertoire.vsE4).toContain("caro-kann");
  await shot(page, "p5-repertoire");
  await page.locator(".drillrep").click();
  await expect(page.locator("#lt .pc").first()).toBeVisible({ timeout: 10000 });
  await noErrors(page);
});

test("Endgame Gym: the Professor runs it", async ({ page }) => {
  await boot(page, { route: "endgames" });
  await expect(page.locator(".gym-coach .who")).toContainText("Professor");
  await expect(page.locator(".lesson-row").first()).toBeVisible();
  await shot(page, "p5-gym");
  await noErrors(page);
});
