// Achievements: 36 original badges. checkAchievements(ctx) runs after games, puzzles, lessons and reviews.
import { state, save, bestRating } from "./store.js";
import { badgeSVG } from "./art/badges.js";
import { play as sfx } from "./sound.js";
import { burst, haptic } from "./art/fx.js";
import { animate } from "./art/motion.js";

const won = (s) => s.games.filter((g) => g.mode !== "friend" && g.score === 1);
const rated = (s) => s.games.filter((g) => g.rated);
const openingWins = (s, re) => won(s).filter((g) => g.opening && re.test(g.opening)).length;
const maxR = (s) => Math.max(0, ...["bullet", "blitz", "rapid", "classical"].map((k) => (s.ratings[k] && !s.ratings[k].seeded ? s.ratings[k].best || 0 : 0)));
const lessonsDone = (s) => Object.values(s.lessons).filter((x) => x.done).length;

export const ACH = [
  { id: "first-game", name: "First Move", desc: "Finish your first game.", emblem: "pawn", metal: "bronze", shape: "circle", test: (s) => s.games.some((g) => g.mode !== "friend") },
  { id: "first-win", name: "First Victory", desc: "Win your first game.", emblem: "trophy", metal: "bronze", shape: "shield", test: (s) => won(s).length >= 1 },
  { id: "wins-10", name: "Ten Down", desc: "Win 10 games.", emblem: "trophy", metal: "silver", shape: "shield", test: (s) => won(s).length >= 10 },
  { id: "wins-50", name: "Fifty Wins", desc: "Win 50 games.", emblem: "trophy", metal: "gold", shape: "shield", test: (s) => won(s).length >= 50 },
  { id: "wins-200", name: "Veteran", desc: "Win 200 games.", emblem: "crown", metal: "obsidian", shape: "star", test: (s) => won(s).length >= 200 },
  { id: "mate", name: "Checkmate!", desc: "Win a game by checkmate.", emblem: "king", metal: "bronze", shape: "hex", test: (s) => won(s).some((g) => g.termination === "checkmate") },
  { id: "giant", name: "Giant Slayer", desc: "Beat an opponent rated 200+ above you.", emblem: "swords", metal: "gold", shape: "star", test: (s) => won(s).some((g) => g.userRating && g.bot.elo >= g.userRating + 200) },
  { id: "giant-400", name: "David", desc: "Beat an opponent rated 400+ above you.", emblem: "rocket", metal: "obsidian", shape: "star", test: (s) => won(s).some((g) => g.userRating && g.bot.elo >= g.userRating + 400) },
  { id: "vienna", name: "Viennese Waltz", desc: "Win a game with the Vienna.", emblem: "knight", metal: "silver", shape: "hex", test: (s) => openingWins(s, /Vienna/i) >= 1 },
  { id: "caro", name: "Caro Fortress", desc: "Win a game with the Caro-Kann.", emblem: "shield", metal: "silver", shape: "hex", test: (s) => openingWins(s, /Caro-Kann/i) >= 1 },
  { id: "gambit", name: "Gambiteer", desc: "Win a game that opened with a gambit.", emblem: "flame", metal: "silver", shape: "hex", test: (s) => openingWins(s, /Gambit/i) >= 1 },
  { id: "brilliant", name: "Brilliant!", desc: "Play a brilliant move (!!) in a game.", emblem: "gem", metal: "gold", shape: "star", test: (s) => s.games.some((g) => (g.cls || []).some((c, i) => c === "brilliant" && ((i % 2 === 0) === (g.color === "w")))) || s.games.some((g) => g.review && g.review.counts && g.review.counts[g.color] && g.review.counts[g.color].brilliant) },
  { id: "acc-90", name: "Surgeon", desc: "Reach 90% accuracy in a reviewed game of 20+ moves.", emblem: "target", metal: "gold", shape: "circle", test: (s) => s.games.some((g) => g.review && g.moves.length >= 40 && (g.color === "w" ? g.review.accW : g.review.accB) >= 90) },
  { id: "review-1", name: "Self-Critic", desc: "Run your first Game Review.", emblem: "eye", metal: "bronze", shape: "circle", test: (s) => s.games.some((g) => g.review) },
  { id: "review-25", name: "Student of the Game", desc: "Review 25 games.", emblem: "brain", metal: "gold", shape: "circle", test: (s) => s.games.filter((g) => g.review).length >= 25 },
  { id: "r-1000", name: "Four Digits", desc: "Reach 1000 in any game category.", emblem: "medal", metal: "bronze", shape: "circle", test: (s) => maxR(s) >= 1000 },
  { id: "r-1200", name: "Rising", desc: "Reach 1200.", emblem: "chart", metal: "bronze", shape: "circle", test: (s) => maxR(s) >= 1200 },
  { id: "r-1500", name: "Club Player", desc: "Reach 1500.", emblem: "chart", metal: "silver", shape: "circle", test: (s) => maxR(s) >= 1500 },
  { id: "r-1800", name: "Expert in the Making", desc: "Reach 1800.", emblem: "mountain", metal: "gold", shape: "hex", test: (s) => maxR(s) >= 1800 },
  { id: "r-2000", name: "Two Thousand", desc: "Reach 2000. The goal.", emblem: "crown", metal: "obsidian", shape: "star", test: (s) => maxR(s) >= 2000 },
  { id: "streak-3", name: "Habit Forming", desc: "Train 3 days in a row.", emblem: "flame", metal: "bronze", shape: "circle", test: (s) => (s.streak.best || 0) >= 3 },
  { id: "streak-7", name: "Week of Fire", desc: "Train 7 days in a row.", emblem: "flame", metal: "silver", shape: "shield", test: (s) => (s.streak.best || 0) >= 7 },
  { id: "streak-30", name: "Unstoppable", desc: "Train 30 days in a row.", emblem: "flame", metal: "gold", shape: "star", test: (s) => (s.streak.best || 0) >= 30 },
  { id: "pz-100", name: "Puzzler", desc: "Solve 100 puzzles.", emblem: "puzzle", metal: "bronze", shape: "hex", test: (s) => s.puzzle.solved >= 100 },
  { id: "pz-1000", name: "Puzzle Machine", desc: "Solve 1,000 puzzles.", emblem: "puzzle", metal: "gold", shape: "hex", test: (s) => s.puzzle.solved >= 1000 },
  { id: "pz-streak", name: "On a Roll", desc: "Solve 10 rated puzzles in a row.", emblem: "bolt", metal: "silver", shape: "circle", test: (s) => (s.puzzle.best || 0) >= 10 },
  { id: "rush-20", name: "Rush Hour", desc: "Score 20+ in Puzzle Rush.", emblem: "hourglass", metal: "silver", shape: "shield", test: (s) => Math.max(s.rush.best.r3 || 0, s.rush.best.r5 || 0, s.rush.best.survival || 0) >= 20 },
  { id: "rush-35", name: "Lightning Brain", desc: "Score 35+ in Puzzle Rush.", emblem: "bolt", metal: "gold", shape: "star", test: (s) => Math.max(s.rush.best.r3 || 0, s.rush.best.r5 || 0, s.rush.best.survival || 0) >= 35 },
  { id: "duel", name: "Duelist", desc: "Win a Puzzle Duel against a bot.", emblem: "swords", metal: "silver", shape: "hex", test: (s) => (s.duels || []).some((d) => d.won) },
  { id: "daily-7", name: "Daily Ritual", desc: "Solve the Daily Puzzle 7 times.", emblem: "calendar", metal: "silver", shape: "circle", test: (s) => Object.keys(s.dailyPuzzle || {}).length >= 7 },
  { id: "lesson-1", name: "First Lesson", desc: "Finish a lesson.", emblem: "book", metal: "bronze", shape: "circle", test: (s) => lessonsDone(s) >= 1 },
  { id: "course", name: "Graduate", desc: "Finish every lesson of a course level.", emblem: "book", metal: "gold", shape: "shield", test: (s, ctx) => !!(s.levelsDone && s.levelsDone.length) },
  { id: "lessons-25", name: "Bookworm", desc: "Finish 25 lessons.", emblem: "book", metal: "silver", shape: "shield", test: (s) => lessonsDone(s) >= 25 },
  { id: "opening-3", name: "Memory Palace", desc: "Master 3 opening lines (3 stars).", emblem: "star", metal: "silver", shape: "hex", test: (s) => Object.values(s.openings).filter((x) => x && x.stars >= 3).length >= 3 },
  { id: "endgame-5", name: "Technician", desc: "Complete 5 Endgame Gym drills.", emblem: "rook", metal: "silver", shape: "shield", test: (s) => Object.values(s.drills).filter((x) => x.done).length >= 5 },
  { id: "engine", name: "Machine Tamer", desc: "Draw or beat an Engine-tier bot.", emblem: "sparkle", metal: "obsidian", shape: "star", test: (s) => s.games.some((g) => g.bot && g.bot.elo >= 2900 && g.score >= 0.5) },
];
export const achById = (id) => ACH.find((a) => a.id === id);

let queue = [], showing = false;
export function checkAchievements(ctx = {}) {
  const s = state();
  const fresh = [];
  for (const a of ACH) {
    if (s.achievements[a.id]) continue;
    let ok = false; try { ok = a.test(s, ctx); } catch {}
    if (ok) { s.achievements[a.id] = Date.now(); fresh.push(a); }
  }
  if (fresh.length) { s.xp += fresh.length * 25; save(); queue.push(...fresh); if (!showing) setTimeout(nextUnlock, ctx.delay ?? 1600); }
  return fresh;
}

function nextUnlock() {
  const a = queue.shift();
  if (!a) { showing = false; return; }
  showing = true;
  const el = document.createElement("div");
  el.className = "ach-pop";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="ach-badge">${badgeSVG(a, { size: 64, shine: true })}</div><div><div class="eyebrow" style="color:var(--acc2)">Achievement unlocked</div><b>${a.name}</b><div class="small muted">${a.desc}</div></div>`;
  document.body.appendChild(el);
  sfx("achievement"); haptic("medium");
  animate(el, { y: [-40, 0], opacity: [0, 1], scale: [0.9, 1] }, { type: "spring", bounce: 0.4, duration: 0.6 });
  setTimeout(() => burst(el.querySelector(".ach-badge"), { size: 90 }), 250);
  el.onclick = () => close();
  const t = setTimeout(close, 3800);
  function close() { clearTimeout(t); animate(el, { y: -30, opacity: 0 }, { duration: 0.25 }).finished.then(() => { el.remove(); setTimeout(nextUnlock, 250); }); }
}
export const testUnlock = () => { queue.push(ACH[0]); nextUnlock(); };
