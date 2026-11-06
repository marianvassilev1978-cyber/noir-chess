// Saves the report screenshots into screenshots/ (key screens at 390×844, themes, art sheets).
// node tools/screenshots.mjs   (needs a build in docs/)
import { chromium, devices } from "playwright";
import { build } from "esbuild";
import fs from "fs";
import { spawn } from "child_process";
const OUT = "screenshots"; fs.mkdirSync(OUT, { recursive: true });
const srv = spawn("node", ["tools/serve.cjs", "docs", "8919"], { stdio: "ignore" }); await new Promise((r) => setTimeout(r, 600));
const b = await chromium.launch();
const errors = [];

// ---- art sheets ----
await build({ entryPoints: ["tools/dev/art-entry.js"], bundle: true, outfile: "tools/dev/art.js", format: "iife", logLevel: "silent" });
const css = fs.readFileSync("src/art/art.css", "utf8");
fs.writeFileSync("tools/dev/art.html", `<!doctype html><meta charset=utf-8><style>${css} body{background:#0b0b0d;color:#ccc;font:12px system-ui;margin:10px} .row{display:flex;gap:6px;align-items:center;margin-bottom:6px} .row b{width:60px} .cell{width:150px;text-align:center} .cell .char{width:150px;height:150px;border-radius:14px} .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px} .cell.big{width:auto} .cell.big .char{width:100%;height:auto;border-radius:50%}</style><div id=a></div><script src="art.js"></script>`);
const ap = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1.5 });
for (const m of ["coaches", "bots", "avatars"]) { await ap.goto("file://" + process.cwd() + "/tools/dev/art.html?m=" + m); await ap.waitForTimeout(300); await ap.screenshot({ path: `${OUT}/art-${m}.png`, fullPage: true }); }

// ---- the app ----
const ctx = await b.newContext({ ...devices["iPhone 13"] });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto("http://127.0.0.1:8919/");
const fixture = fs.readFileSync("tools/fixtures/state-v2.json", "utf8");
async function setup(theme = "noir") {
  await p.evaluate(([s, theme]) => { const st = JSON.parse(s); st.live = null; st.settings.theme = theme; st.settings.board = "noir"; localStorage.setItem("noirchess.v2", JSON.stringify(st)); localStorage.setItem("noir.test", "1"); }, [fixture, theme]);
  await p.reload(); await p.waitForFunction(() => window.__noir && window.__noir.go); await p.waitForTimeout(400);
}
const go = async (r, wait = 2600) => { await p.evaluate((r) => window.__noir.go(r), r); await p.waitForTimeout(wait); };
for (const t of ["noir", "midnight", "forest", "royal", "ember", "ivory"]) { await setup(t); await go("home", 2400); await p.screenshot({ path: `${OUT}/theme-${t}.png` }); }
await setup("noir");
await go("home"); await p.screenshot({ path: `${OUT}/home.png` });
await go("play"); await p.screenshot({ path: `${OUT}/play-hub.png` });
await go("puzzles"); await p.screenshot({ path: `${OUT}/puzzles.png` });
await go("learn"); await p.screenshot({ path: `${OUT}/learn.png` });
await go("coaches"); await p.screenshot({ path: `${OUT}/coaches.png` });
await go("profile"); await p.screenshot({ path: `${OUT}/profile.png` });
await p.evaluate(() => window.__noir.checkAchievements({ delay: 99999 }));
await go("achievements"); await p.screenshot({ path: `${OUT}/badges.png`, fullPage: true });
// a game in progress
await p.evaluate(() => { window.__noir.botQueue = ["e5", "Nc6", "Bc5"]; window.__noir.newGame({ botId: "hana", color: "w", tc: "10+5", rated: true }); });
await p.waitForTimeout(1500);
const sq = async (from, to) => { const box = await p.locator("#bd").boundingBox(); const xy = (s) => [box.x + ("abcdefgh".indexOf(s[0]) + 0.5) * box.width / 8, box.y + (8 - +s[1] + 0.5) * box.height / 8]; const [a, c] = xy(from), [d, e] = xy(to); await p.mouse.click(a, c); await p.waitForTimeout(80); await p.mouse.click(d, e); await p.waitForTimeout(900); };
await sq("e2", "e4"); await sq("g1", "f3"); await sq("f1", "c4"); await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/game.png` });
// game review with the coach (a real game with a trap)
await p.evaluate(() => { const s = window.__noir.state(); s.live = null; s.games.push({ id: "shot", date: Date.now(), mode: "bot", botId: "hana", bot: { id: "hana", name: "Hana", elo: 1700 }, color: "w", tc: "10+0", cat: "rapid", rated: false, result: "0-1", termination: "checkmate", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4", "Nxe5", "Qg5", "Nxf7", "Qxg2", "Rf1", "Qxe4+", "Be2", "Nf3#"], startFen: null, score: 0, userRating: 1240 }); window.__noir.save(); window.__noir.go("review/shot"); });
await p.locator(".go-walk").waitFor({ timeout: 120000 }); await p.waitForTimeout(2500);
await p.screenshot({ path: `${OUT}/review-summary.png` });
await p.locator(".go-walk").click(); await p.waitForTimeout(800);
for (let i = 0; i < 6 && !(await p.locator(".c-retry").count()); i++) { await p.locator(".kn").click(); await p.waitForTimeout(500); }
await p.waitForTimeout(3500);
await p.screenshot({ path: `${OUT}/review-coach.png` });
console.log(errors.length ? "page errors:\n" + errors.join("\n") : "screenshots saved, no page errors");
await b.close(); srv.kill();
