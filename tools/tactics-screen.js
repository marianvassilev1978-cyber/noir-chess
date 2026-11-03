// tactics-screen: run verify.js on a pool file, write the clean (OK, no WARN) exercises to <pool>.ok.json
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs");
const f = process.argv[2];
const r = spawnSync("node", [__dirname + "/verify.js", f, process.argv[3] || "18"], { encoding: "utf8", maxBuffer: 1e8 });
const bad = new Set();
for (const line of r.stdout.split("\n")) { const m = line.match(/^(FAIL|WARN) \[.*?#(\d+)\]/); if (m) bad.add(+m[2] - 1); }
const data = JSON.parse(fs.readFileSync(f, "utf8"));
const steps = data[0].steps;
const ok = steps.filter((s, i) => !bad.has(i));
fs.writeFileSync(f.replace(/\.json$/, ".ok.json"), JSON.stringify(ok, null, 1));
console.log(f, "total", steps.length, "clean", ok.length, "|", r.stdout.trim().split("\n").pop());
