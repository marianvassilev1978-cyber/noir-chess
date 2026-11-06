// Phase 3: coaches, Game Review (walkthrough, Show me, Why, Retry, verdict), analysis board, live coach.
import { test, expect } from "@playwright/test";
import { boot, move, startGame, store, noErrors, shot } from "./helpers.mjs";

// a real game where White (you) falls into a trap and gets mated
const TRAP = ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4", "Nxe5", "Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"];
async function withGame(page, moves = TRAP, extra = {}) {
  await boot(page);
  await page.waitForFunction(() => window.__noir && window.__noir.go);
  await page.evaluate(([moves, extra]) => {
    const s = window.__noir.state();
    s.games.push(Object.assign({ id: "t1", date: Date.now(), mode: "bot", botId: "hana", bot: { id: "hana", name: "Hana", elo: 1700 }, color: "w", tc: "10+0", cat: "rapid", rated: false, result: "0-1", termination: "checkmate", moves, startFen: null, score: 0, userRating: 1200 }, extra));
    window.__noir.save();
    window.__noir.go("review/t1");
  }, [moves, extra]);
  await page.locator(".go-walk").waitFor({ timeout: 120000 });
}

test("Game Review summary: accuracy, game rating, phases, opening, eval graph", async ({ page }) => {
  await withGame(page);
  await expect(page.locator(".accw")).not.toHaveText("–");
  await expect(page.locator(".phases .phr")).toHaveCount(3);
  await expect(page.locator(".graph-holder svg")).toHaveCount(1);
  await expect(page.locator(".card").first()).toContainText("Opening");
  await expect(page.locator(".sum-coach .txt")).toContainText("accuracy", { timeout: 8000 });
  const s = await store(page);
  const g = s.games.find((x) => x.id === "t1");
  expect(g.review.plies.length).toBe(TRAP.length);
  expect(s.mistakes.some((m) => m.gameId === "t1")).toBe(true); // mistakes feed "My mistakes"
  await shot(page, "p3-summary");
  await noErrors(page);
});

test("coach walkthrough: key moments, Show me, Why is my move bad, Retry, verdict", async ({ page }) => {
  await withGame(page);
  await page.locator(".go-walk").click();
  await expect(page.locator(".step-n")).toContainText("1 /");
  await expect(page.locator(".rv-coach .txt")).not.toBeEmpty({ timeout: 8000 });
  await page.waitForTimeout(2500);
  await shot(page, "p3-walkthrough");
  // find a key moment with the full set of buttons
  for (let i = 0; i < 8 && !(await page.locator(".c-retry").count()); i++) await page.locator(".kn").click();
  await expect(page.locator(".c-retry")).toHaveCount(1);
  // Show me: the better line plays with narration
  await page.locator(".c-best").click();
  await expect(page.locator(".sheet .lp-board .pc").first()).toBeVisible();
  await page.locator(".sheet .bn").click(); await page.waitForTimeout(600);
  await expect(page.locator(".sheet .lp-coach .txt")).toContainText(/White|Black/, { timeout: 6000 });
  await page.locator(".sheet .bl").click(); await page.waitForTimeout(1500);
  await expect(page.locator(".sheet .lp-coach .txt")).toContainText(/material|Checkmate|Evaluation/, { timeout: 8000 });
  await shot(page, "p3-showme");
  await page.locator(".sheet .sheet-x").click(); await page.waitForTimeout(400);
  // Why is my move bad?
  await page.locator(".c-why").click();
  await expect(page.locator(".sheet .lp-board")).toBeVisible();
  await page.locator(".sheet .sheet-x").click(); await page.waitForTimeout(400);
  // Retry: play the engine's best move
  const cur = await page.locator("#rml .m.cur").getAttribute("data-i");
  const best = await page.evaluate((i) => { const s = window.__noir.state(); return s.games.find((g) => g.id === "t1").review.plies[+i].best; }, cur);
  await page.locator(".c-retry").click();
  await page.waitForTimeout(300);
  await move(page, best.slice(0, 2), best.slice(2, 4), { sel: "#rbd" });
  await expect(page.locator(".rv-coach .txt")).toContainText(/top move|as good as/, { timeout: 15000 });
  // on to the verdict
  for (let i = 0; i < 10; i++) { const t = await page.locator(".kn").innerText().catch(() => ""); if (!t) break; await page.locator(".kn").click(); await page.waitForTimeout(250); if (/verdict/i.test(t)) break; }
  await expect(page.locator(".vlist").first().locator("li")).toHaveCount(3);
  await expect(page.locator(".vlist").nth(1).locator("li")).toHaveCount(3);
  await expect(page.locator(".tile.ex")).toBeVisible();
  await shot(page, "p3-verdict");
  await noErrors(page);
});

test("analysis board: lines with depth, variation tree, explorer, PGN with variations, practice", async ({ page }) => {
  await boot(page, { route: "analysis" });
  await expect(page.locator(".eng-d")).toContainText("depth", { timeout: 20000 });
  await expect(page.locator(".a-line")).toHaveCount(3);
  await move(page, "e2", "e4", { sel: "#abd" }); await move(page, "e7", "e5", { sel: "#abd" });
  await page.locator("#a-prev").click(); // back to after 1.e4
  await move(page, "c7", "c5", { sel: "#abd" }); // a variation: 1...c5
  await expect(page.locator(".tree .var")).toHaveCount(1);
  const pgn = await page.evaluate(async () => { let t = ""; const orig = navigator.clipboard.writeText; navigator.clipboard.writeText = async (x) => (t = x); document.querySelector("#a-copy").click(); await new Promise((r) => setTimeout(r, 100)); return t; });
  expect(pgn).toContain("(");
  await page.locator('.a-tabs button[data-t="explorer"]').click();
  await expect(page.locator(".exp-row").first()).toBeVisible({ timeout: 10000 });
  await shot(page, "p3-analysis");
  await page.locator("#a-practice").click();
  await page.locator(".pr").first().click();
  await page.locator("#bd .pc").first().waitFor();
  const g = await page.evaluate(() => window.__noir.game);
  expect(g.startFen).toContain("2p5"); // the c5 position
  expect(g.rated).toBe(false);
  await noErrors(page);
});

test("meet the coaches: pick a main coach", async ({ page }) => {
  await boot(page, { route: "coaches" });
  await expect(page.locator(".coach-card")).toHaveCount(6);
  await page.locator('.coach-card[data-id="niko"] .pickc').click();
  await page.waitForTimeout(900);
  expect((await store(page)).settings.coach).toBe("niko");
  await shot(page, "p3-coaches");
  await noErrors(page);
});

test("live coach in a casual game rates your move with one sentence", async ({ page }) => {
  await boot(page);
  await startGame(page, { botId: "ivo", color: "w", tc: "none", rated: false, botQueue: ["e5", "Qh4"] });
  await move(page, "f2", "f3");
  await expect(page.locator(".coach-area .bubble .head")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".coach-area .cls-badge")).toHaveCount(1);
  await noErrors(page);
});
