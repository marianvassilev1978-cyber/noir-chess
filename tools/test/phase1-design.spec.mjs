// Phase 1: design system, themes, characters, settings persistence, existing progress.
import { test, expect } from "@playwright/test";
import { boot, store, noErrors, shot, FIXTURE_V2 } from "./helpers.mjs";

for (const theme of ["noir", "midnight", "forest", "royal", "ember", "ivory"]) {
  test(`theme ${theme}: animated background, no console errors`, async ({ page }) => {
    await boot(page, { settings: { theme } });
    await expect(page.locator("#bg svg")).toHaveCount(1);
    await expect(page.locator("body")).toHaveAttribute("data-theme", theme);
    await expect(page.locator(".hero .char")).toBeVisible();
    await shot(page, "theme-" + theme);
    await noErrors(page);
  });
}

test("existing v2 progress is shown on Home", async ({ page }) => {
  await boot(page, { state: FIXTURE_V2 });
  await expect(page.locator(".rnum")).toHaveText("1240", { timeout: 8000 });
  await expect(page.locator(".streak")).toContainText("9");
  await noErrors(page);
});

test("coach character: expressions, poses and blinking are driven by code", async ({ page }) => {
  await boot(page);
  const svg = page.locator(".hero .char");
  await expect(svg).toHaveClass(/live/);
  await expect(svg).not.toHaveClass(/talking/, { timeout: 10000 }); // the greeting has finished typing
  for (const e of ["happy", "impressed", "worried", "thinking", "neutral"]) {
    await svg.evaluate((el, e) => el.__ctl.expr(e), e);
    await expect.poll(() => svg.evaluate((el, e) => getComputedStyle(el.querySelector(".c-mouth .x-" + e)).opacity, e)).toBe("1");
  }
  // blink happens on its own within ~6 s
  const blinked = await svg.evaluate((el) => new Promise((res) => { const t = setTimeout(() => res(false), 7000); new MutationObserver(() => { if (el.classList.contains("blink")) { clearTimeout(t); res(true); } }).observe(el, { attributes: true }); }));
  expect(blinked).toBe(true);
  await noErrors(page);
});

test("settings persist across a reload", async ({ page }) => {
  await boot(page, { route: "settings" });
  await page.locator('.bds .swatch[data-b="jade"]').click();
  await page.locator('.ths .chip[data-t="ember"]').click();
  await page.reload();
  await page.waitForFunction(() => !document.getElementById("splash"));
  const s = await store(page);
  expect(s.settings.board).toBe("jade");
  expect(s.settings.theme).toBe("ember");
  await expect(page.locator("body")).toHaveAttribute("data-theme", "ember");
  await noErrors(page);
});
