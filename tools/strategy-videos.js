// Find candidate YouTube videos for a query and verify via oEmbed. Usage: node strategy-videos.js "query" [n]
const { execFileSync } = require("child_process");
const q = process.argv[2], n = +(process.argv[3] || 10);
const html = execFileSync("curl", ["-s", "-m", "25", "-H", "Accept-Language: en-US", "https://www.youtube.com/results?search_query=" + encodeURIComponent(q)], { maxBuffer: 1 << 26 }).toString();
const ids = [...new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1]))].slice(0, n);
for (const id of ids) {
  const url = "https://www.youtube.com/watch?v=" + id;
  try {
    const j = JSON.parse(execFileSync("curl", ["-s", "-m", "15", "https://www.youtube.com/oembed?url=" + encodeURIComponent(url) + "&format=json"]).toString());
    console.log([url, j.author_name, j.title].join("\t"));
  } catch (e) { console.log(url + "\tFAILED"); }
}
