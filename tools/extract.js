// Extract data modules + puzzle array from the minified Noir Chess bundle.
const fs = require("fs");
const s = fs.readFileSync(process.argv[2], "utf8");
const outDir = process.argv[3];
fs.mkdirSync(outDir, { recursive: true });

// scan a JS expression starting at i (which points at '[' or '{'), return end index (exclusive)
function scanBalanced(i) {
  const open = s[i];
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      j++;
      while (j < s.length && s[j] !== q) {
        if (s[j] === "\\") j++;
        j++;
      }
      continue;
    }
    if (c === "[" || c === "{" || c === "(") depth++;
    else if (c === "]" || c === "}" || c === ")") {
      depth--;
      if (depth === 0) return j + 1;
    }
  }
  throw new Error("unbalanced from " + i + " " + open);
}

const mods = {};
const re = /var ([A-Za-z0-9_$]+)=D1\(\(([A-Za-z0-9_$]+),([A-Za-z0-9_$]+)\)=>\{\3\.exports=/g;
let m;
const names = ["openings", "lessons", "gambits"];
let k = 0;
while ((m = re.exec(s))) {
  const start = m.index + m[0].length;
  const end = scanBalanced(start);
  const expr = s.slice(start, end);
  const val = new Function("return " + expr)();
  const name = names[k++] || "mod" + k;
  mods[name] = val;
  fs.writeFileSync(outDir + "/" + name + ".json", JSON.stringify(val, null, 1));
  console.log(name, Array.isArray(val) ? val.length : typeof val, expr.length);
}

// puzzles: find first occurrence of [["<fen>","<moves>",rating,"themes","id"]
const pm = /\[\["[rnbqkpRNBQKP1-8]+\/[^"]+","[a-h1-8qrbn ]+",\d+,"[^"]*","[A-Za-z0-9]+"\]/.exec(s);
if (pm) {
  const start = pm.index;
  const end = scanBalanced(start);
  const val = new Function("return " + s.slice(start, end))();
  fs.writeFileSync(outDir + "/puzzles.json", JSON.stringify(val));
  console.log("puzzles", val.length);
}
