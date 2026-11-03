// tactics-yt: search YouTube (results page) and list videoId | title | channel
const q = process.argv.slice(2).join(" ");
(async () => {
  const r = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(q) + "&hl=en", { headers: { "accept-language": "en-US,en;q=0.9", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } });
  const h = await r.text();
  const m = h.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return console.log("no data", h.length);
  const d = JSON.parse(m[1]);
  const out = [];
  const walk = (n) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === "object") { if (n.videoRenderer) { const v = n.videoRenderer; out.push([v.videoId, v.title?.runs?.[0]?.text, v.ownerText?.runs?.[0]?.text, v.lengthText?.simpleText, v.viewCountText?.simpleText].join(" | ")); } else Object.values(n).forEach(walk); } };
  walk(d);
  console.log(out.slice(0, 12).join("\n"));
})();
