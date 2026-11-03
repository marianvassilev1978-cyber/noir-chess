const s = require("fs").readFileSync(process.argv[2], "utf8");
const re = /(["`])((?:\\.|(?!\1)[^\\])*)\1/gs;
let m, out = [];
while ((m = re.exec(s))) {
  if (m[2].length > 20000) out.push([m.index, m[2].length, m[2].slice(0, 300)]);
}
console.log(out);
