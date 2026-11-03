// Bot roster and move selection. Strong bots use Stockfish's own Elo limiter; weak bots sample from
// Stockfish's top lines with human-like noise, so they blunder like real beginners instead of randomly.
import { Chess } from "chess.js";
import { PLAY } from "./engine.js";
import { pick } from "./util.js";

const G = (a, b) => `linear-gradient(135deg,${a},${b})`;

export const BOT_GROUPS = [
  { id: "beginner", name: "Beginner", range: "100–500", bots: [
    { id: "pip", name: "Pip", elo: 150, av: "🐣", bg: G("#f6d365", "#fda085"), flag: "🇧🇬", style: "random", bio: "Just learned how the knight moves. Mostly.", hi: ["Hi! Which one is the horsey?", "Let's play!"] },
    { id: "nell", name: "Nell", elo: 300, av: "🌱", bg: G("#a8e063", "#56ab2f"), flag: "🇬🇧", style: "aggressive", bio: "Loves to grab pieces. Forgets to defend hers.", hi: ["I like taking things.", "Ready when you are."] },
    { id: "otto", name: "Otto", elo: 450, av: "🧸", bg: G("#c79081", "#dfa579"), flag: "🇩🇪", style: "solid", bio: "Plays slowly, still hangs a piece now and then.", hi: ["Guten Tag. Slowly, please."] },
  ]},
  { id: "novice", name: "Novice", range: "600–900", bots: [
    { id: "mila", name: "Mila", elo: 600, av: "🎒", bg: G("#89f7fe", "#66a6ff"), flag: "🇧🇬", style: "aggressive", book: [["e4", "e5", "Qh5"], ["e4", "e5", "Bc4", "Nc6", "Qh5"]], bio: "Goes for Scholar's Mate every game. Can you stop it?", hi: ["My queen comes out early. Just warning you."] },
    { id: "teo", name: "Teo", elo: 750, av: "🛹", bg: G("#fbc2eb", "#a6c1ee"), flag: "🇪🇸", style: "normal", bio: "Knows the opening principles, forgets them under pressure.", hi: ["¡Hola! Center, develop, castle. Right?"] },
    { id: "ravi", name: "Ravi", elo: 900, av: "🏏", bg: G("#f093fb", "#f5576c"), flag: "🇮🇳", style: "tactical", bio: "Sees forks. Doesn't always see yours.", hi: ["Let's see who forks first."] },
  ]},
  { id: "intermediate", name: "Intermediate", range: "1000–1300", bots: [
    { id: "ivo", name: "Ivo", elo: 1000, av: "⚽", bg: G("#43e97b", "#38f9d7"), flag: "🇧🇬", style: "normal", book: [["e4", "e5", "Nf3", "Nc6", "Bc4"]], bio: "Italian Game every time. Solid, not sharp.", hi: ["Italian Game? Of course."] },
    { id: "sara", name: "Sara", elo: 1150, av: "🎧", bg: G("#fa709a", "#fee140"), flag: "🇸🇪", style: "solid", book: [["d4", "d5", "Bf4"], ["d4", "Nf6", "Bf4"]], bio: "The London System. Every. Single. Game.", hi: ["Bf4 is coming. You know it."] },
    { id: "jules", name: "Jules", elo: 1300, av: "🎨", bg: G("#30cfd0", "#330867"), flag: "🇫🇷", style: "tactical", book: [["e4", "e6"], ["d4", "e6"]], bio: "French Defence fan. Patient, then punishes overextension.", hi: ["Bonjour. Push your pawns, I dare you."] },
  ]},
  { id: "club", name: "Club", range: "1400–1700", bots: [
    { id: "vlad", name: "Vlad", elo: 1400, av: "🐺", bg: G("#5f72bd", "#9b23ea"), flag: "🇷🇴", style: "aggressive", book: [["e4", "e5", "Nc3", "Nf6", "f4"], ["e4", "e5", "Nc3", "Nc6", "f4"]], bio: "Vienna Gambit specialist. Attacks from move 3.", hi: ["Nc3, then f4. Get ready."] },
    { id: "alien", name: "Zorg", elo: 1550, av: "👽", bg: G("#0ba360", "#3cba92"), flag: "🛸", style: "aggressive", white: true, book: [["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Nf6", "Ng5", "h6", "Nxf7", "Kxf7", "Bc4+"], ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng5", "Bg6", "N1f3", "h6", "Ne6"], ["e4", "c6", "d4", "d5", "Nc3"]], bio: "Plays the Alien and Martian gambits against the Caro-Kann. Take Black and play 1...c6.", hi: ["Caro-Kann? Bad idea against me."] },
    { id: "hana", name: "Hana", elo: 1700, av: "🗡️", bg: G("#ff0844", "#ffb199"), flag: "🇯🇵", style: "tactical", book: [["e4", "c5"], ["d4", "Nf6", "c4", "g6"]], bio: "Sicilian and King's Indian. Sharp, double-edged games.", hi: ["Let's make it complicated."] },
  ]},
  { id: "advanced", name: "Advanced", range: "1800–2100", bots: [
    { id: "marco", name: "Marco", elo: 1850, av: "🏛️", bg: G("#ab8a5c", "#5c4426"), flag: "🇮🇹", style: "solid", book: [["e4", "e5", "Nf3", "Nc6", "Bb5"], ["d4", "d5", "c4"]], bio: "Ruy Lopez and Queen's Gambit. Squeezes small edges.", hi: ["A classical game, then."] },
    { id: "nadia", name: "Nadia", elo: 2000, av: "♛", bg: G("#c471f5", "#fa71cd"), flag: "🇺🇦", style: "normal", bio: "Club champion. Your 2000 target lives here.", hi: ["Beat me and you're where you want to be."] },
    { id: "chen", name: "Chen", elo: 2100, av: "🐉", bg: G("#f83600", "#f9d423"), flag: "🇨🇳", style: "tactical", bio: "Fast, precise, brutal in the endgame.", hi: ["Good luck."] },
  ]},
  { id: "expert", name: "Expert", range: "2200–2400", bots: [
    { id: "elena", name: "Elena", elo: 2200, av: "🎻", bg: G("#13547a", "#80d0c7"), flag: "🇬🇷", style: "solid", bio: "Candidate Master. Rarely gives you anything.", hi: ["Let's begin."] },
    { id: "kofi", name: "Kofi", elo: 2350, av: "🦁", bg: G("#e65c00", "#f9d423"), flag: "🇬🇭", style: "aggressive", bio: "FIDE Master strength. Plays for mate.", hi: ["I came to attack."] },
  ]},
  { id: "master", name: "Master", range: "2500–2800", bots: [
    { id: "magda", name: "Magda", elo: 2500, av: "🏰", bg: G("#434343", "#000000"), flag: "🇵🇱", style: "normal", bio: "Grandmaster level.", hi: ["Show me your preparation."] },
    { id: "boris", name: "Boris", elo: 2700, av: "🐻", bg: G("#3a1c71", "#d76d77"), flag: "🇷🇺", style: "solid", bio: "Super-GM strength.", hi: ["Hm."] },
  ]},
  { id: "engine", name: "Engine", range: "3000+", bots: [
    { id: "noir", name: "Noir", elo: 3000, av: "♞", bg: G("#0f2027", "#2c5364"), flag: "⚙️", style: "normal", bio: "Stockfish 18, limited to 3000.", hi: ["…"] },
    { id: "max", name: "Stockfish Max", elo: 3200, av: "🐟", bg: G("#000428", "#004e92"), flag: "⚙️", style: "max", bio: "Full strength Stockfish 18. You will lose. Learn from how.", hi: ["Calculating."] },
  ]},
];

export const ALL_BOTS = BOT_GROUPS.flatMap((g) => g.bots.map((b) => ({ ...b, group: g.id })));
export const botById = (id) => ALL_BOTS.find((b) => b.id === id);

export function customBot(elo) {
  return { id: "custom-" + elo, name: "Custom bot", elo, av: "🎯", bg: G("#485563", "#29323c"), flag: "⚙️", style: "normal", bio: `Plays at about ${elo}.`, hi: ["Ready."] };
}

export const BOT_LINES = {
  win: ["Good game!", "gg — you played well.", "Well played. Rematch?"],
  lose: ["gg.", "That was fun. Again?", "Thanks for the game."],
  draw: ["A draw. Fair result.", "Nobody wins today."],
  blunderUser: ["Oh! Thank you.", "Hmm, are you sure?", "I'll take that."],
  blunderBot: ["Oops.", "That was a mistake, wasn't it?", "Ugh."],
};

// ------------------------------------------------------------------

function thinkTime(clock, ply) {
  if (!clock || clock.ms == null) return 600 + Math.random() * 900;
  const t = clock.ms, inc = clock.inc || 0;
  let base = t / 35 + inc * 0.7;
  if (ply < 12) base = Math.min(base * 0.2, 1800); // openings are fast
  base *= 0.6 + Math.random() * 0.8;
  return Math.max(150, Math.min(base, t * 0.15, 12000));
}

function bookMove(bot, history) {
  if (!bot.book || history.length > 22) return null;
  const lines = bot.book.filter((l) => l.length > history.length && history.every((m, i) => l[i] === m));
  if (!lines.length) return null;
  return pick(lines)[history.length];
}

// Choose among top lines with human-style noise. Returns UCI.
function sampleHuman(lines, elo, style, fen) {
  const c = new Chess(fen);
  const best = lines[0].score;
  // temperature in centipawns: big for beginners, small near 1300
  const T = Math.max(25, 420 - elo * 0.3);
  // chance to simply overlook a hanging piece / play a random legal move
  const pRandom = Math.max(0, 0.32 - elo / 1500);
  if (Math.random() < pRandom) {
    const ms = c.moves({ verbose: true });
    const caps = ms.filter((m) => m.captured);
    // beginners love captures
    const pool = style === "aggressive" && caps.length && Math.random() < 0.6 ? caps : ms;
    const m = pick(pool);
    return m.from + m.to + (m.promotion || "");
  }
  const weights = lines.map((l) => {
    let d = Math.min(1500, best - l.score);
    let w = Math.exp(-d / T);
    if (style === "aggressive" || style === "tactical") {
      try { const m = new Chess(fen).move({ from: l.move.slice(0, 2), to: l.move.slice(2, 4), promotion: l.move[4] }); if (m.captured || m.san.includes("+")) w *= 1.6; } catch {}
    }
    return w;
  });
  // weak bots don't always find mate in 1, but often do
  if (lines[0].mate != null && Math.abs(lines[0].mate) === 1 && Math.random() < 0.4 + elo / 1500) return lines[0].move;
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < lines.length; i++) { r -= weights[i]; if (r <= 0) return lines[i].move; }
  return lines[0].move;
}

export async function botMove(bot, fen, history, clock, { signal } = {}) {
  const t0 = performance.now();
  const want = thinkTime(clock, history.length);
  let uci = null;
  const bm = bookMove(bot, history);
  if (bm) {
    try { const c = new Chess(fen); const m = c.move(bm); uci = m.from + m.to + (m.promotion || ""); } catch { uci = null; }
  }
  if (!uci) {
    await PLAY.init();
    if (bot.style === "max" || bot.elo >= 3150) {
      const r = await PLAY.analyse(fen, { movetime: Math.max(200, Math.min(want, 3000)), noCache: true, signal });
      uci = r.best;
    } else if (bot.elo >= 1350) {
      const r = await PLAY.analyse(fen, { elo: Math.min(3190, bot.elo), movetime: Math.max(150, Math.min(want, 2500)), noCache: true, signal });
      uci = r.best;
    } else {
      const depth = Math.max(1, Math.min(8, Math.round(1 + bot.elo / 220)));
      const r = await PLAY.analyse(fen, { depth, multipv: bot.elo < 500 ? 8 : 5, noCache: true, signal });
      uci = r.lines.length ? sampleHuman(r.lines, bot.elo, bot.style, fen) : r.best;
    }
  }
  const spent = performance.now() - t0;
  if (spent < want) await new Promise((r) => setTimeout(r, Math.min(want - spent, 4000)));
  return uci;
}
