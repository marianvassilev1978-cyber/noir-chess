// The bot roster (28 original characters, 100–3200) and botMove(), which feeds the PLAY engine into botbrain.
import { Chess } from "chess.js";
import { PLAY } from "./engine.js";
import { BOT_LOOKS } from "./art/cast.js";
import { chooseMove, bookMove, strength, thinkTime } from "./botbrain.js";
import { loadJSON, loadJSONOpt, pick } from "./util.js";
import CAL from "./bot-calibration.json";

export const STYLES = {
  aggressive: { name: "Aggressive", note: "Checks, sacrifices, king attacks" },
  positional: { name: "Positional", note: "Solid, patient, squeezes small edges" },
  trickster: { name: "Trickster", note: "Sets traps and threats" },
  defensive: { name: "Defensive", note: "Safe king, hard to break" },
  chaotic: { name: "Wild", note: "Anything can happen" },
  engine: { name: "Engine", note: "Pure calculation" },
};

const B = (id, name, elo, tier, style, flag, bio, white, black, L, extra = {}) => ({ id, name, elo, tier, style, flag, bio, white, black, lines: L, look: { ...BOT_LOOKS[id], id }, ...extra });
// chat: hi, oops (bot blundered), thanks (you blundered), up (bot winning), down (bot losing), win (bot won), lose (bot lost), draw
const RAW = [
  B("bean", "Bean", 100, "beginner", "chaotic", "🇺🇸", "Seven years old. Knows the knight moves in an L. Mostly.", ["italian"], ["e4-e5-black"],
    { hi: ["Hi!! Which one is the horsey?"], oops: ["Wait, can I undo that?"], thanks: ["Yay, a free piece!"], up: ["I'm winning?! Mom!"], down: ["Hmm. This is hard."], win: ["I WON! Good game!"], lose: ["Good game! Again?"], draw: ["We both win!"] }),
  B("pip", "Pip", 200, "beginner", "aggressive", "🐣", "A fearless chick who pecks at every piece in reach.", ["vienna"], ["e4-e5-black"],
    { hi: ["Peep! Let's go!"], oops: ["Peep… oops."], thanks: ["Peck! Mine now."], up: ["Peep peep peep!"], down: ["Ruffled feathers."], win: ["PEEEP! Victory!"], lose: ["Peep. Good game."], draw: ["Peep? A tie!"] }),
  B("nell", "Nell", 300, "beginner", "defensive", "🇬🇧", "Grows tomatoes and pawn chains. Protects everything, slowly.", ["london"], ["caro-kann"],
    { hi: ["Hello! I'll be careful today."], oops: ["Oh no, I forgot to water that one."], thanks: ["Thank you kindly!"], up: ["Things are growing nicely."], down: ["My garden is in trouble."], win: ["Lovely game!"], lose: ["Well played, you!"], draw: ["A fair harvest for both."] }),
  B("otto", "Otto", 450, "beginner", "defensive", "🇩🇪", "Plays slowly and solidly. Still hangs a piece after lunch.", ["london"], ["qgd-black"],
    { hi: ["Guten Tag. Slowly, please."], oops: ["Ach. Too much coffee."], thanks: ["Danke schön."], up: ["Hm. This looks good."], down: ["Not ideal."], win: ["Gut gespielt."], lose: ["Well played. Again tomorrow."], draw: ["Remis. Fair."] }),
  B("mila", "Mila", 600, "beginner", "chaotic", "🇧🇬", "Goes for Scholar's Mate every single game. Can you stop it?", ["italian"], ["e4-e5-black"],
    { hi: ["My queen comes out early. Just saying."], oops: ["That wasn't the plan!"], thanks: ["Hehe, thank you!"], up: ["Queen power!"], down: ["Okay, okay, you saw it."], win: ["Told you about the queen!"], lose: ["Next time, Scholar's Mate!"], draw: ["A draw? Boring!"] }, { opening: [["e4", "e5", "Bc4", "Nc6", "Qh5"], ["e4", "e5", "Qh5"], ["e4", "e5", "Qf3", "Nc6", "Bc4"]] }),
  B("teo", "Teo", 750, "beginner", "aggressive", "🇪🇸", "Football fan. Centre, develop, castle… and then charge.", ["italian", "scotch"], ["e4-e5-black"],
    { hi: ["¡Hola! Kick-off!"], oops: ["Own goal…"], thanks: ["¡Gracias, amigo!"], up: ["We're scoring today!"], down: ["Need a comeback."], win: ["¡Gol! Good game!"], lose: ["Good match, friend."], draw: ["One all."] }),
  B("ravi", "Ravi", 900, "intermediate", "trickster", "🇮🇳", "Sees forks everywhere. Doesn't always see yours.", ["scotch-gambit", "italian"], ["e4-e5-black", "traxler"],
    { hi: ["Let's see who forks first."], oops: ["Ah, I missed that."], thanks: ["Forked!"], up: ["The trap worked!"], down: ["Clever. Very clever."], win: ["Good game! Tactics win."], lose: ["You saw everything. Well played."], draw: ["Even trade."] }),
  B("ivo", "Ivo", 1000, "intermediate", "positional", "🇧🇬", "Italian Game every time. Solid, not sharp.", ["italian"], ["e4-e5-black", "qgd-black"],
    { hi: ["Italian Game? Of course."], oops: ["That was sloppy."], thanks: ["I'll take that, thanks."], up: ["Slowly, slowly."], down: ["You're pressing well."], win: ["Solid game."], lose: ["Well played, really."], draw: ["Balanced to the end."] }),
  B("sara", "Sara", 1100, "intermediate", "positional", "🇸🇪", "The London System. Every. Single. Game.", ["london"], ["slav-black", "caro-kann"],
    { hi: ["Bf4 is coming. You know it."], oops: ["Not very London of me."], thanks: ["Thanks for the gift."], up: ["The system works."], down: ["Hmm, cracks in the wall."], win: ["London wins again."], lose: ["You broke the system. GG."], draw: ["Draw. Very English of us."] }),
  B("bruno", "Bruno", 1200, "intermediate", "trickster", "🇮🇹", "Bakes bread at 4am, sets traps by move 4. Loves dubious gambits.", ["halloween-gambit", "blackmar-diemer"], ["englund-gambit", "latvian-gambit"],
    { hi: ["Fresh gambits, just out of the oven!"], oops: ["Burnt that one."], thanks: ["Mamma mia, delicious!"], up: ["The trap is baked."], down: ["My bread didn't rise."], win: ["Bravissimo!"], lose: ["You resisted my bread. Respect."], draw: ["Half a loaf each."] }),
  B("jules", "Jules", 1300, "intermediate", "defensive", "🇫🇷", "French Defence devotee. Patient, then punishes overextension.", ["london"], ["french"],
    { hi: ["Bonjour. Push your pawns, I dare you."], oops: ["Zut."], thanks: ["Merci beaucoup."], up: ["Your centre is falling."], down: ["C'est difficile."], win: ["Patience pays."], lose: ["Chapeau. Well played."], draw: ["Égalité."] }),
  B("vlad", "Vlad", 1400, "intermediate", "aggressive", "🇷🇴", "Vienna Gambit specialist. Attacks from move 3.", ["vienna", "kings-gambit"], ["e4-e5-black", "sicilian"],
    { hi: ["Nc3, then f4. Get ready."], oops: ["Too fast, too reckless."], thanks: ["Into the attack!"], up: ["Your king is cold."], down: ["The attack stalled."], win: ["Attack wins games."], lose: ["You defended like a fortress."], draw: ["Perpetual storm."] }),
  B("zorg", "Zorg", 1500, "advanced", "aggressive", "🛸", "Came a long way to play the Alien and Martian gambits against the Caro-Kann.", ["alien-gambit", "martian-gambit", "vienna"], ["vs-alien-gambit", "scandinavian"],
    { hi: ["Greetings. Caro-Kann? Bad idea."], oops: ["Error in sector f7."], thanks: ["Your material: abducted."], up: ["Invasion proceeding."], down: ["Retreat to the mothership!"], win: ["Earth defeated. Rematch?"], lose: ["Impressive, human."], draw: ["Truce between worlds."] }),
  B("wren", "Wren", 1600, "advanced", "trickster", "🦉", "A night owl librarian who knows every trap in the book. Literally.", ["danish-gambit", "scotch-gambit"], ["traxler", "budapest-gambit"],
    { hi: ["Hoo. Shall we begin?"], oops: ["Hoo… a misread page."], thanks: ["Chapter 7: the trap. Hoo!"], up: ["You fell for page 112."], down: ["You've read the same book."], win: ["The book was right."], lose: ["A new chapter for me. Well played."], draw: ["A quiet ending."] }),
  B("hana", "Hana", 1700, "advanced", "aggressive", "🇯🇵", "Sicilian and King's Indian. Sharp, double-edged games only.", ["alapin", "vienna"], ["sicilian", "kings-indian"],
    { hi: ["Let's make it complicated."], oops: ["Too sharp, even for me."], thanks: ["Thank you. Now it's mine."], up: ["The storm is coming."], down: ["You kept your nerve."], win: ["Sharp and clean."], lose: ["Beautiful defence."], draw: ["Balanced on a blade."] }),
  B("ada", "Ada", 1800, "advanced", "defensive", "🇳🇬", "Engineer. Caro-Kann and the London: nothing loose, ever.", ["london", "jobava-london"], ["caro-kann", "slav-black"],
    { hi: ["Let's build something solid."], oops: ["A loose bolt. Annoying."], thanks: ["Structural failure on your side."], up: ["Everything is load-bearing."], down: ["You found the weak beam."], win: ["Built to last."], lose: ["Good engineering. Well played."], draw: ["Equal tolerance."] }),
  B("marco", "Marco", 1900, "advanced", "positional", "🇮🇹", "Ruy Lopez and the Queen's Gambit. Squeezes the tiniest edges.", ["ruy-lopez", "queens-gambit"], ["qgd-black", "e4-e5-black"],
    { hi: ["A classical game, then."], oops: ["Uncharacteristic."], thanks: ["That will cost you."], up: ["The squeeze begins."], down: ["You played precisely."], win: ["Classical chess."], lose: ["Complimenti."], draw: ["A fair draw."] }),
  B("nadia", "Nadia", 2000, "advanced", "positional", "🇺🇦", "Club champion. Your 2000 target lives here.", ["queens-gambit", "english"], ["najdorf-deep", "nimzo-indian"],
    { hi: ["Beat me and you're where you want to be."], oops: ["Careless of me."], thanks: ["That's a club-level slip."], up: ["Converting now."], down: ["You're playing at 2000 today."], win: ["Keep training. You're close."], lose: ["That's a 2000 game. Proud of you."], draw: ["A draw with the champion. Not bad."] }, { title: "CM" }),
  B("chen", "Chen", 2100, "advanced", "positional", "🇨🇳", "Fast, precise, ruthless in the endgame.", ["english", "kia"], ["grunfeld", "accelerated-dragon"],
    { hi: ["Good luck."], oops: ["Hm."], thanks: ["Precise play wins."], up: ["The endgame will be mine."], down: ["Interesting."], win: ["Clean."], lose: ["Well played."], draw: ["Fine."] }, { title: "CM" }),
  B("elena", "Elena", 2200, "master", "defensive", "🇬🇷", "Candidate Master. Rarely gives you anything.", ["italian", "queens-gambit"], ["caro-kann-deep", "qgd-black"],
    { hi: ["Let's begin."], oops: ["I'll fix that."], thanks: ["Noted."], up: ["Under control."], down: ["You're pressing well."], win: ["Thank you for the game."], lose: ["Excellent play."], draw: ["Draw agreed."] }, { title: "CM" }),
  B("kofi", "Kofi", 2350, "master", "aggressive", "🇬🇭", "FIDE Master strength. Plays for mate from move one.", ["kings-gambit", "vienna"], ["kings-indian", "sicilian"],
    { hi: ["I came to attack."], oops: ["Overpressed."], thanks: ["Now the king is open."], up: ["Smell the mate?"], down: ["You held. Respect."], win: ["Attack and mate."], lose: ["Great defence."], draw: ["We both survived."] }, { title: "FM" }),
  B("magda", "Magda", 2500, "master", "positional", "🇵🇱", "Grandmaster level. Calm, deep, inevitable.", ["queens-gambit", "ruy-lopez"], ["nimzo-indian", "qgd-black"],
    { hi: ["Show me your preparation."], oops: ["Inexact."], thanks: ["That decides it."], up: ["The position speaks."], down: ["Hm. You prepared."], win: ["Good game."], lose: ["Impressive."], draw: ["A correct draw."] }, { title: "IM" }),
  B("leon", "Leon", 2600, "master", "trickster", "🇫🇷", "Speed-chess hustler with a Benko and a Jobava for every occasion.", ["jobava-london", "danish-gambit"], ["benko-gambit", "budapest-gambit"],
    { hi: ["Let's have some fun."], oops: ["Ha, that was a bluff."], thanks: ["Gotcha."], up: ["Trap sprung."], down: ["You didn't bite. Nice."], win: ["Too tricky for you today."], lose: ["You're not fooled easily."], draw: ["Even hustlers draw."] }, { title: "IM" }),
  B("boris", "Boris", 2700, "master", "defensive", "🇷🇺", "Super-GM strength. A fortress with a beard.", ["english", "queens-gambit"], ["e4-e5-black", "slav-black"],
    { hi: ["Hm."], oops: ["Hm!"], thanks: ["Thank you."], up: ["It is over."], down: ["Hm…"], win: ["Good."], lose: ["Very good."], draw: ["Draw."] }, { title: "GM" }),
  B("yara", "Yara", 2800, "master", "aggressive", "🇪🇬", "World-class attacker. Najdorf, Dragon and sacrifices on every square.", ["vienna", "scotch"], ["najdorf-deep", "accelerated-dragon"],
    { hi: ["Let's play real chess."], oops: ["A rare slip."], thanks: ["The sacrifice was coming anyway."], up: ["Your king has nowhere to hide."], down: ["Beautiful. Keep going."], win: ["What a game."], lose: ["You beat a world-class player."], draw: ["Fire meets ice."] }, { title: "GM" }),
  B("atlas", "Atlas", 2900, "engine", "engine", "⚙️", "A training engine with a tiny bit of doubt left in it.", ["queens-gambit", "ruy-lopez"], ["nimzo-indian", "caro-kann"],
    { hi: ["SYSTEM READY."], oops: ["RECALCULATING."], thanks: ["ADVANTAGE REGISTERED."], up: ["EVALUATION: WINNING."], down: ["ANOMALY DETECTED."], win: ["GAME COMPLETE."], lose: ["UNEXPECTED. LOGGING."], draw: ["EQUILIBRIUM."] }),
  B("noir", "Noir", 3000, "engine", "engine", "⚙️", "Stockfish 18, limited to about 3000. The house engine.", [], [],
    { hi: ["…"], oops: ["…?"], thanks: ["…"], up: ["…"], down: ["!?"], win: ["…"], lose: ["Remarkable."], draw: ["…"] }),
  B("max", "Stockfish Max", 3200, "engine", "engine", "⚙️", "Full-strength Stockfish 18. You will lose. Learn from how.", [], [],
    { hi: ["Calculating."], oops: [""], thanks: ["Calculated."], up: ["Calculated."], down: ["Recalculating."], win: ["Calculated."], lose: ["Impossible."], draw: ["Calculated."] }),
];
export const ALL_BOTS = RAW.map((b) => ({ ...b, skill: (CAL.skill && CAL.skill[b.id]) || b.elo }));
export const TIERS = [
  { id: "beginner", name: "Beginner", range: "100–750" },
  { id: "intermediate", name: "Intermediate", range: "900–1400" },
  { id: "advanced", name: "Advanced", range: "1500–2100" },
  { id: "master", name: "Master", range: "2200–2800" },
  { id: "engine", name: "Engine", range: "2900–3200" },
];
export const BOT_GROUPS = TIERS.map((t) => ({ ...t, bots: ALL_BOTS.filter((b) => b.tier === t.id) }));
export const botById = (id) => ALL_BOTS.find((b) => b.id === id);

// interpolate an internal skill for any Elo from the calibrated roster
export function skillFor(elo) {
  const list = ALL_BOTS.slice().sort((a, b) => a.elo - b.elo);
  if (elo <= list[0].elo) return list[0].skill - (list[0].elo - elo);
  for (let i = 1; i < list.length; i++) if (elo <= list[i].elo) { const a = list[i - 1], b = list[i], t = (elo - a.elo) / (b.elo - a.elo); return a.skill + t * (b.skill - a.skill); }
  return list[list.length - 1].skill;
}
// "Echo": a sparring partner generated at any rating, used when no roster bot is within ±50 of you
export function customBot(elo, base) {
  const near = base || ALL_BOTS.reduce((a, b) => (Math.abs(b.elo - elo) < Math.abs(a.elo - elo) ? b : a), ALL_BOTS[0]);
  return { id: "echo-" + elo, name: "Echo", elo, tier: near.tier, style: near.style === "engine" ? "positional" : near.style, flag: "🪞", custom: true,
    bio: `A sparring partner who mirrors your level: about ${elo}, playing ${STYLES[near.style === "engine" ? "positional" : near.style].name.toLowerCase()} chess.`,
    white: near.white, black: near.black, lines: GENERIC, look: { kind: "robot", body: "#8a96aa", led: "#e2b45e", round: true, bg: ["#3a3a48", "#0c0c12"], pattern: "dots", id: "echo" }, skill: skillFor(elo) };
}
const GENERIC = { hi: ["Ready when you are."], oops: ["Oops."], thanks: ["Thank you!"], up: ["Looking good for me."], down: ["You're playing well."], win: ["Good game!"], lose: ["Well played!"], draw: ["A fair draw."] };
export function botLine(bot, key) { const L = (bot.lines && bot.lines[key]) || GENERIC[key] || [""]; return pick(L); }

// ---------- opening book (built from the course data, lazily) ----------
let BOOK = null;
async function book() {
  if (BOOK) return BOOK;
  const [o, x, g] = await Promise.all([loadJSON("openings"), loadJSONOpt("openings-extra", []), loadJSON("gambits")]);
  BOOK = {};
  for (const op of [...o, ...x, ...g]) BOOK[op.id] = op.lines.map((l) => ({ side: op.side, type: l.type, moves: l.moves.map((m) => m.san), dubious: l.moves.map((m) => !!m.dubious), name: l.name }));
  return BOOK;
}
export async function bookFor(bot, color) {
  const bk = await book().catch(() => ({}));
  const ids = color === "w" ? bot.white || [] : bot.black || [];
  const lines = ids.flatMap((id) => bk[id] || []);
  if (bot.opening) for (const mv of bot.opening) lines.push({ side: color, type: "main", moves: mv, dubious: [] });
  return lines;
}
export async function lineById(openingId, lineId) { const bk = await book(); const o = bk[openingId]; return o ? o.find((l, i) => l.name === lineId || String(i) === String(lineId)) || o[0] : null; }

function materialFor(c, color) {
  const V = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }; let me = 0, them = 0;
  for (const row of c.board()) for (const p of row) if (p) { if (p.color === color) me += V[p.type]; else them += V[p.type]; }
  return { diff: me - them, total: me + them };
}
// SAN history → canonical SAN (book lines use the course's SAN)
function sanFix(fen, san) { try { const c = new Chess(fen); return c.move(san).san; } catch { return null; } }

export async function botMove(bot, fen, history, clock, { signal, forcedLine = null, startFen = null } = {}) {
  const t0 = performance.now();
  const c = new Chess(fen);
  const color = c.turn();
  let uci = null, lines = null;
  // habits of generated players: endgame strength, tilt after losing material, how deep they know their book
  const H = bot.habits || {};
  const mat = materialFor(c, color);
  let skill = bot.skill ?? bot.elo;
  if (H.endgame && mat.total <= 26) skill += H.endgame;
  if (H.tilt && mat.diff <= -2) skill -= H.tilt * 260;
  bot = { ...bot, skill };
  const bookDepth = Math.round(24 * (H.opening || 1));
  // the book only applies from the normal start position
  if (!startFen && history.length < bookDepth) {
    const lines0 = forcedLine ? [forcedLine] : await bookFor(bot, color);
    const bm = bookMove(bot, history, color, lines0, Math.random, forcedLine);
    if (bm) { const san = sanFix(fen, bm); if (san) { const m = new Chess(fen).move(san); uci = m.from + m.to + (m.promotion || ""); } }
  }
  if (!uci) {
    await PLAY.init();
    const S = strength(bot.skill ?? bot.elo);
    const test = typeof localStorage !== "undefined" && localStorage.getItem("noir.test");
    const r = S.full
      ? await PLAY.analyse(fen, { movetime: test ? 200 : Math.max(300, Math.min(clock && clock.ms ? clock.ms / 30 : 2000, 3000)), noCache: true, signal })
      : await PLAY.analyse(fen, { nodes: S.nodes, multipv: S.multipv, noCache: true, signal });
    lines = r.lines;
    uci = chooseMove({ bot, fen, lines: r.lines, ply: history.length }).uci || r.best;
  }
  const test = typeof localStorage !== "undefined" && localStorage.getItem("noir.test");
  const want = test ? 60 : thinkTime({ bot, fen, lines, clock, ply: history.length }) * (H.speed || 1);
  const spent = performance.now() - t0;
  if (spent < want) await new Promise((r) => setTimeout(r, Math.min(want - spent, 15000)));
  return uci;
}
