// Phase 6: profile, avatar picker, stats, achievements with the unlock animation, daily goals, archive.
import { test, expect } from "@playwright/test";
import { boot, store, noErrors, shot, FIXTURE_V2 } from "./helpers.mjs";

test("profile: rating badges per category, avatar picker persists", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "profile" });
  await expect(page.locator('.rb[data-k="rapid"] .v')).toContainText("1240");
  await expect(page.locator('.rb[data-k="bullet"] .v')).toContainText("?"); // seeded from Rapid, provisional
  await expect(page.locator(".prof-head")).toContainText("member since");
  await page.locator(".prof-av").click();
  await page.locator('.av-pick[data-a="a-owl"]').click();
  await page.locator(".sheet .sv").click();
  expect((await store(page)).profile.avatar).toBe("a-owl");
  await shot(page, "p6-profile");
  await noErrors(page);
});

test("stats: rating graph with time ranges, results by colour, openings report, records", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "stats" });
  await expect(page.locator(".wdl")).toHaveCount(3);
  await page.locator('.ranges button[data-r="30"]').click();
  await expect(page.locator(".chart-box")).toBeVisible();
  await page.locator('.cats .chip[data-k="puzzle"]').click();
  await expect(page.locator(".chart-box svg, .chart-box .empty")).toHaveCount(1);
  await shot(page, "p6-stats");
  await noErrors(page);
});

test("achievements unlock with an animation; the badge wall shows them", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2 });
  await page.waitForFunction(() => window.__noir && window.__noir.checkAchievements);
  const fresh = await page.evaluate(() => window.__noir.checkAchievements({ delay: 50 }).map((a) => a.id));
  expect(fresh).toContain("first-win");
  await expect(page.locator(".ach-pop")).toBeVisible({ timeout: 5000 });
  await shot(page, "p6-unlock");
  await page.evaluate(() => window.__noir.go("achievements"));
  await expect(page.locator(".ach.on").first()).toBeVisible();
  expect(await page.locator(".ach").count()).toBeGreaterThanOrEqual(30);
  await page.locator(".ach.on").first().click();
  await expect(page.locator(".sheet .ach-big")).toBeVisible();
  await shot(page, "p6-achievements");
  await noErrors(page);
});

test("daily goals reward you when they are done", async ({ page }) => {
  await boot(page);
  await page.waitForFunction(() => window.__noir && window.__noir.checkAchievements);
  const xp0 = await page.evaluate(() => window.__noir.state().xp);
  await page.evaluate(() => { const s = window.__noir.state(); s.daily.puzzles = 15; window.__noir.save(); window.__noir.checkAchievements({ delay: 50 }); });
  await expect(page.locator("#toast")).toContainText("Goal done", { timeout: 6000 });
  const s = await store(page);
  expect(s.xp).toBeGreaterThan(xp0);
  expect(s.dailyAward.done).toContain("puzzles");
  await noErrors(page);
});

test("game archive: search and filter, tap opens the review", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2, route: "history" });
  await expect(page.locator(".list-row")).toHaveCount(2);
  await page.locator(".q").fill("sara");
  await expect(page.locator(".list-row")).toHaveCount(1);
  await page.locator(".q").fill("");
  await page.locator('.hf .chip[data-f="won"]').click();
  await expect(page.locator(".list-row")).toHaveCount(1);
  await page.locator(".list-row").first().click();
  await expect(page.locator(".go-walk, .rv-ring")).toHaveCount(1, { timeout: 20000 });
  await noErrors(page);
});
