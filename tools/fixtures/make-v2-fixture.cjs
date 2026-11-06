// Builds a realistic saved state in the v2 format (the format before the v3 upgrade), for migration tests.
const { Chess } = require("chess.js");
const fs = require("fs");
const day = 86400000, now = Date.parse("2026-11-05T18:00:00Z");
function game(id, moves, extra) {
  const c = new Chess(); for (const m of moves) c.move(m);
  return Object.assign({ id, date: now - 3 * day, mode: "bot", botId: "ivo", bot: { name: "Ivo", elo: 1000, av: "⚽", bg: "linear-gradient(135deg,#43e97b,#38f9d7)" }, color: "w", tc: "10+0", cat: "rapid", rated: true, result: "1-0", termination: "checkmate", moves: c.history(), startFen: null, delta: 9, score: 1, userRating: 1231, placement: null, review: null, cls: [] }, extra);
}
const scholar = ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"];
const g2moves = ["d4", "d5", "Bf4", "Nf6", "e3", "e6", "Nf3", "c5", "c3", "Nc6", "Nbd2", "Bd6", "Bg3", "O-O", "Bd3", "Qe7", "Ne5", "Nd7", "Nxc6", "bxc6"];
const g2 = game("g2", g2moves, { date: now - 2 * day, botId: "sara", bot: { name: "Sara", elo: 1150, av: "🎧", bg: "x" }, result: "0-1", termination: "resignation", score: 0, delta: -11, color: "w" });
const plies = g2moves.map((_, i) => ({ cls: i === 9 ? "blunder" : i === 4 ? "inaccuracy" : "best", loss: i === 9 ? 25 : 0, acc: i === 9 ? 30 : 95, wBest: 50, wAfter: 50, best: "e2e4", bestPv: ["e2e4"], replyPv: [], evalBefore: { cp: 20, mate: null }, evalAfter: { cp: 10, mate: null } }));
g2.review = { accW: 81.2, accB: 77.5, ratingW: 1450, ratingB: 1300, counts: { w: { best: 8, inaccuracy: 1, mistake: 1 }, b: { best: 9, blunder: 1 } }, depth: 14, evals: Array(g2moves.length + 1).fill({ cp: 15, mate: null }), plies };
const state = {
  v: 2, updatedAt: now,
  profile: { name: "You", avatar: "🦁", country: "bg", joined: now - 40 * day },
  placement: { rating: 1000, date: now - 39 * day },
  ratings: {
    bullet: { r: null, games: 0, hist: [], best: 0 },
    blitz: { r: 1180, games: 12, hist: [[now - 10 * day, 1150], [now - 5 * day, 1180]], best: 1195 },
    rapid: { r: 1240, games: 37, hist: [[now - 30 * day, 1000], [now - 20 * day, 1100], [now - 10 * day, 1190], [now - 2 * day, 1240]], best: 1262 },
    classical: { r: null, games: 0, hist: [], best: 0 },
    puzzle: { r: 1405, games: 220, hist: [[now - 9 * day, 1300], [now - day, 1405]], best: 1430 },
  },
  games: [game("g1", scholar, {}), g2],
  live: { id: "live1", date: now - 3600000, mode: "bot", bot: { id: "ivo", name: "Ivo", elo: 1000, av: "⚽", bg: "x", style: "normal", hi: ["hi"] }, botId: "ivo", color: "w", tc: "10+0", cat: "rapid", rated: true, startFen: null, moves: ["e4", "e5", "Nf3"], clocks: { w: 540000, b: 571000 }, inc: 0, result: null, termination: null, takebacks: 0, hints: 0, cls: [], placement: null, startedAt: now - 3600000, lastTick: null, userRating: 1240, drawOffered: 0 },
  puzzle: { solved: 180, failed: 40, streak: 4, best: 17, seen: ["36CI0", "00008"], themeStats: { fork: { n: 30, ok: 21 }, pin: { n: 12, ok: 5 }, mateIn2: { n: 20, ok: 16 } }, dailyDone: "2026-11-05" },
  rush: { best: { r3: 14, r5: 18, survival: 22 }, hist: [[now - 4 * day, "r3", 14]] },
  mistakes: [{ id: "g2:9", fen: "r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P1B2/2P1PN2/PP1N1PPP/R2QKB1R b KQkq - 1 6", best: "f8d6", bestSan: "Bd6", played: "Bd6", cls: "blunder", gameId: "g2", date: now - 2 * day, solved: 1 }],
  openings: { "vienna-gambit": { stars: 3, box: 2, due: "2026-11-04", last: now - 5 * day } },
  lessons: { "l1-board": { done: true, score: 3, tasks: 3, best: 1, date: now - 30 * day } },
  drills: { "eg-kqk-1": { tries: 2, done: true, best: 14 } },
  vision: { best: { white: 24, black: 19 }, hist: [[now - 6 * day, "w", 24]] },
  daily: { date: "2026-11-05", puzzles: 6, games: 1, lesson: 0, opening: 1, reviews: 0, drills: 0 },
  streak: { count: 9, last: "2026-11-05", best: 14 },
  xp: 2380, achievements: {},
  settings: { sound: true, soundSet: "wood", volume: 0.7, soundOnSilent: true, board: "brown", pieces: "staunty", theme: "midnight", coords: "inside", legal: true, anim: true, animMs: 160, autoQueen: true, premove: true, confirmResign: true, evalBar: true, coachLive: true, guard: false, classOnBoard: true, haptics: true, lastMove: true, name: "Mariyan", lastBot: "sara", lastTc: "5+3", lastColor: "w", lastRated: true, lastCustom: 1200 },
};
fs.writeFileSync(__dirname + "/state-v2.json", JSON.stringify(state, null, 1));
console.log("wrote state-v2.json");
