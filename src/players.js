// The player pool: 2,000 generated opponents for rated matchmaking. Every player is derived from a seed, so the
// same id is always the same person: their face (drawn by the character builder), username, flag, rating, style,
// openings, habits (speed, tilt, endgame skill, resigning) and the way they chat.
import { STYLES, skillFor } from "./bots.js";

export const POOL_SIZE = 2000;

// small seeded RNG (mulberry32)
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pickR = (r, a) => a[Math.floor(r() * a.length)];

// ---------- usernames ----------
const ADJ = ["quiet", "swift", "lazy", "brave", "lucky", "silent", "rapid", "clever", "sneaky", "calm", "wild", "frozen", "golden", "iron", "midnight", "electric", "humble", "cosmic", "salty", "dusty", "fuzzy", "grumpy", "happy", "sleepy", "noble", "rogue", "rusty", "shadow", "sunny", "velvet", "polar", "crimson", "lunar", "tiny", "mighty", "honest", "nordic", "urban", "retro", "spicy"];
const NOUN = ["knight", "bishop", "rook", "pawn", "queen", "gambit", "fork", "pin", "castle", "tempo", "zugzwang", "fianchetto", "outpost", "endgame", "patzer", "owl", "fox", "tiger", "panda", "otter", "falcon", "wolf", "bear", "lynx", "raven", "badger", "mantis", "comet", "pixel", "pilot", "baker", "drummer", "monk", "sailor", "nomad", "wizard", "farmer", "dentist", "student", "teacher"];
const FIRST = ["alex", "marta", "jonas", "sofia", "kenji", "amir", "lena", "diego", "irina", "tomas", "yuki", "omar", "elif", "mateo", "nina", "lucas", "aiko", "ravi", "zara", "petra", "felix", "ines", "bogdan", "chloe", "emre", "hugo", "lina", "nikola", "olga", "pavel", "rosa", "sami", "tara", "viktor", "wei", "yara", "zoe", "malik", "anya", "bruno", "dara", "ezra", "freya", "goran", "hana", "ivan", "jun", "kemal", "luka", "maya", "noor", "oscar", "priya", "quinn", "reza", "stela", "theo", "ugo", "vera"];
const FLAGS = ["🇧🇬", "🇧🇬", "🇺🇸", "🇬🇧", "🇩🇪", "🇫🇷", "🇪🇸", "🇮🇹", "🇵🇱", "🇳🇱", "🇸🇪", "🇳🇴", "🇫🇮", "🇩🇰", "🇬🇷", "🇷🇴", "🇷🇸", "🇭🇷", "🇨🇿", "🇭🇺", "🇺🇦", "🇹🇷", "🇮🇳", "🇨🇳", "🇯🇵", "🇰🇷", "🇧🇷", "🇦🇷", "🇲🇽", "🇨🇦", "🇦🇺", "🇳🇬", "🇬🇭", "🇪🇬", "🇿🇦", "🇮🇷", "🇮🇱", "🇵🇹", "🇻🇳", "🇵🇭", "🇮🇩", "🇨🇴", "🇨🇱", "🇬🇪", "🇦🇲", "🇰🇿", "🇲🇳", "🇮🇪", "🇧🇪", "🇦🇹", "🇨🇭"];
function username(r) {
  const f = r();
  const num = r() < 0.6 ? String(Math.floor(r() * (r() < 0.5 ? 100 : 2000))) : "";
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  if (f < 0.32) return pickR(r, ADJ) + "_" + pickR(r, NOUN) + num;
  if (f < 0.55) return cap(pickR(r, ADJ)) + cap(pickR(r, NOUN)) + num;
  if (f < 0.78) return pickR(r, FIRST) + (r() < 0.5 ? "_" : ".") + pickR(r, NOUN) + (num || Math.floor(r() * 99));
  if (f < 0.9) return pickR(r, NOUN) + "_" + pickR(r, FIRST) + num;
  return "The" + cap(pickR(r, NOUN)) + cap(pickR(r, ["king", "slayer", "master", "machine", "whisperer", "enjoyer", "fan", "hunter"])) + num;
}

// ---------- faces ----------
const SKINS = ["#f3cfb3", "#ecbf9b", "#e2aa82", "#cf9a6c", "#b97d52", "#93603c", "#6e4429", "#5a3520", "#f0c3a4", "#d8a47a"];
const HAIRC = ["#1a1412", "#2a1d16", "#3a2a20", "#5a3a22", "#7a4a26", "#a8682e", "#d9732e", "#e9d08a", "#c9ccd2", "#8a8480", "#141018", "#6a2a1a"];
const STY_M = ["short", "spiky", "slick", "buzz", "receding", "curls", "mohawk", "bald", "wavy", "afro"];
const STY_F = ["long", "bun", "ponytail", "curlybob", "wavy", "fringe", "braids", "afro", "pigtails", "buzz"];
const OUTFITS = ["tee", "hoodie", "collar", "blazer", "sweater", "turtleneck", "jacket", "cardigan", "vest"];
const COLORS = ["#3d4a5c", "#e04a3a", "#3fa7ff", "#5fb85a", "#7c6a9e", "#f08a24", "#1d1d22", "#c2263a", "#2f7f7b", "#d99a2b", "#6a3fa0", "#2a3a5a", "#9cc8e8", "#f4f1ea", "#3f6f5a", "#ff5f8f", "#5a3e2b", "#141418"];
const BGS = [["#ff9f43", "#7a2e12"], ["#3fb0a4", "#0d3d3d"], ["#9a7bff", "#251454"], ["#e2453b", "#3a0b0b"], ["#f2b84b", "#5a3208"], ["#7cc8ff", "#1b4d7a"], ["#9be07a", "#1f5a1a"], ["#b3a3d9", "#3a2d5a"], ["#ff8fb0", "#6a1233"], ["#5ed39a", "#0c4a2e"], ["#6f9cff", "#14275e"], ["#c04a6a", "#3a0a1a"], ["#6a6a72", "#121216"], ["#d9b45c", "#2a2008"]];
function look(r, id) {
  const k = r();
  const bg = pickR(r, BGS), pattern = pickR(r, ["dots", "rays", "checks", "stars", ""]);
  if (k < 0.04) return { kind: "robot", body: pickR(r, ["#b8c0ca", "#8a96aa", "#d9b45c", "#5a6270", "#9a7a5a"]), led: pickR(r, ["#7cf2ff", "#8aff9a", "#ffd166", "#ff7aa2"]), round: r() < 0.5, bg, pattern, id };
  if (k < 0.07) return { kind: "owl", body: pickR(r, ["#8a6a4a", "#4a5a7a", "#6a5a4a", "#9a8a6a"]), disc: "#e8d6b8", beak: "#e6a23a", bg, pattern: "stars", id };
  if (k < 0.09) return { kind: "alien", body: pickR(r, ["#7fd35f", "#9a8aff", "#5fd3c8", "#ff9ad0"]), glow: "#ffe27a", outfit: "hoodie", outfitColor: pickR(r, COLORS), outfitColor2: "#ffe27a", bg, pattern: "stars", id };
  const fem = r() < 0.42, old = r() < 0.16, kid = !old && r() < 0.06;
  const hair = old ? pickR(r, ["#c9ccd2", "#8a8480", "#e6e6e3", "#5a5550"]) : pickR(r, HAIRC);
  const L = {
    id, face: kid ? "kid" : pickR(r, ["oval", "round", "square", "long", "heart"]), skin: pickR(r, SKINS), hair,
    hairStyle: pickR(r, fem ? STY_F : STY_M), eyes: pickR(r, ["round", "almond", "small"]), eyeColor: pickR(r, ["#3a2416", "#2a1a10", "#4a7aa8", "#3d6b2d", "#5b3a24", "#3f6f86", "#2d1b14"]),
    lashes: fem, outfit: pickR(r, OUTFITS), outfitColor: pickR(r, COLORS), outfitColor2: pickR(r, ["#f4f1ea", "#fff7e8", "#1a1a1e", "#e2b45e", "#c33"]),
    nose: pickR(r, ["button", "long", "wide"]), bg, pattern, lines: old, freckles: r() < 0.12, blush: kid || r() < 0.1,
  };
  if (!fem && !kid && r() < 0.35) { L.beard = pickR(r, ["stubble", "full", "goatee", "mustache", "walrus"]); L.beardColor = hair; }
  if (r() < 0.22) { L.glasses = pickR(r, ["round", "square", "big", "half", "shades"]); L.glassesColor = pickR(r, ["#1d1b1a", "#6b4f3a", "#3b2d6b", "#7a5a2a"]); }
  if (r() < 0.16) { L.hat = pickR(r, ["beanie", "cap", "beret", "headphones", "headband", "headwrap"]); L.hatColor = pickR(r, COLORS); }
  if (fem && r() < 0.4) L.earrings = pickR(r, ["hoops", "studs"]);
  if (r() < 0.1) { L.neck = pickR(r, ["scarf", "tie", "bowtie", "pendant"]); L.neckColor = pickR(r, ["#c8312c", "#3a6aa8", "#d9b45c", "#1e9a8a"]); }
  return L;
}

// ---------- personality ----------
const WHITE_OPS = ["italian", "vienna", "london", "queens-gambit", "ruy-lopez", "scotch", "english", "kia", "jobava-london", "alapin", "petrov-stafford-white", "kings-gambit", "danish-gambit", "scotch-gambit", "blackmar-diemer", "alien-gambit", "martian-gambit", "halloween-gambit"];
const BLACK_OPS = ["caro-kann", "e4-e5-black", "qgd-black", "slav-black", "french", "sicilian", "kings-indian", "scandinavian", "nimzo-indian", "qid-bogo", "grunfeld", "dutch", "pirc-modern", "najdorf-deep", "accelerated-dragon", "vs-london-black", "englund-gambit", "budapest-gambit", "latvian-gambit", "elephant-gambit", "traxler", "benko-gambit", "caro-kann-deep"];
const GAMBIT = new Set(["kings-gambit", "danish-gambit", "scotch-gambit", "blackmar-diemer", "alien-gambit", "martian-gambit", "halloween-gambit", "englund-gambit", "budapest-gambit", "latvian-gambit", "elephant-gambit", "traxler", "benko-gambit"]);
const MOODS = {
  friendly: { hi: ["hi! have fun", "hey, good luck!", "hello :) gl hf", "hi there, gl"], oops: ["oops", "ugh, misclick", "ah no", "noooo"], thanks: ["ty :)", "thanks!", "oh nice"], up: ["going well", "feeling good about this"], down: ["you're good!", "nice moves", "hmm tough"], win: ["gg! well played", "gg, fun game", "gg wp :)"], lose: ["gg, well played!", "gg, you were better", "wp! rematch?"], draw: ["gg, fair draw", "draw, gg"] },
  quiet: { hi: ["gl", "hi", "hf"], oops: ["…"], thanks: [""], up: [""], down: [""], win: ["gg"], lose: ["gg"], draw: ["gg"] },
  cocky: { hi: ["prepare to lose", "this won't take long", "warm-up game"], oops: ["intentional.", "that was a test"], thanks: ["lol thanks", "free real estate"], up: ["told you", "easy"], down: ["lucky", "not over yet"], win: ["ez", "as expected"], lose: ["you got lucky.", "rematch. now.", "lag."], draw: ["you escaped"] },
  polite: { hi: ["Good luck, have a nice game.", "Hello, enjoy the game."], oops: ["Oh dear."], thanks: ["Thank you."], up: ["Hm, interesting."], down: ["Very well played."], win: ["Thank you for the game."], lose: ["Congratulations, well played.", "Good game, thank you."], draw: ["A fair result, thank you."] },
  funny: { hi: ["my cat is watching, don't embarrass me", "playing with one hand, eating with the other", "my rating is a lie, beware"], oops: ["my mouse slipped (I'm on a phone)", "that was my evil twin", "bold strategy"], thanks: ["christmas came early", "is this a trap? taking it anyway"], up: ["mom get the camera"], down: ["send help", "I'm calling my lawyer"], win: ["gg, I'll frame this one", "gg! telling everyone"], lose: ["gg, my cat is disappointed", "gg, I blame the coffee"], draw: ["we shall call it friendship"] },
};

export function player(i) {
  const r = rng(0x9e3779b1 ^ (i * 2654435761));
  const id = "p" + i;
  // ratings: spread over 100–3200, denser where most players are (≈ 600–1900)
  const u = (i + 0.5) / POOL_SIZE;
  const bell = 1 / (1 + Math.exp(-(u - 0.5) * 7));
  const elo = Math.round(100 + 3100 * (0.62 * u + 0.38 * bell) + (r() - 0.5) * 60);
  const rating = Math.max(100, Math.min(3200, elo));
  const style = pickR(r, ["aggressive", "aggressive", "positional", "positional", "trickster", "defensive", "chaotic"].slice(0, rating > 1800 ? 6 : 7));
  const gambiteer = style === "aggressive" || style === "trickster" || style === "chaotic";
  const wPool = WHITE_OPS.filter((o) => gambiteer || !GAMBIT.has(o)), bPool = BLACK_OPS.filter((o) => gambiteer || !GAMBIT.has(o));
  const white = [pickR(r, wPool)]; if (r() < 0.6) white.push(pickR(r, wPool));
  const black = [pickR(r, bPool)]; if (r() < 0.6) black.push(pickR(r, bPool));
  const mood = pickR(r, ["friendly", "friendly", "quiet", "quiet", "polite", "cocky", "funny"]);
  const habits = {
    speed: +(0.45 + r() * 1.3).toFixed(2), // think-time multiplier
    tilt: +(r() * (rating < 1600 ? 1 : 0.5)).toFixed(2), // how much worse they play after losing material
    endgame: Math.round((r() - 0.5) * (rating < 1500 ? 420 : 240)), // skill offset in endgames
    opening: +(0.4 + r() * 0.6).toFixed(2), // how deep they follow their book (share of the line)
    resign: pickR(r, ["early", "normal", "never"]),
    chatty: +(mood === "quiet" ? r() * 0.2 : 0.35 + r() * 0.6).toFixed(2),
  };
  const name = username(r);
  const flag = pickR(r, FLAGS);
  const title = rating >= 2500 && r() < 0.5 ? (rating >= 2600 ? "GM" : "IM") : rating >= 2300 && r() < 0.35 ? "FM" : rating >= 2200 && r() < 0.25 ? "CM" : "";
  return {
    id, name, elo: rating, flag, title, style, white, black, mood, habits, generated: true,
    tier: rating < 800 ? "beginner" : rating < 1500 ? "intermediate" : rating < 2200 ? "advanced" : rating < 2900 ? "master" : "engine",
    bio: `${STYLES[style].name} player · ${habits.speed < 0.75 ? "moves fast" : habits.speed > 1.3 ? "takes their time" : "steady pace"} · ${habits.endgame > 80 ? "strong in endgames" : habits.endgame < -80 ? "shaky in endgames" : "balanced"}`,
    lines: MOODS[mood], look: look(r, id), skill: skillFor(rating),
  };
}

const cache = new Map();
export function playerById(id) { const i = +String(id).slice(1); if (!(i >= 0 && i < POOL_SIZE)) return null; if (!cache.has(i)) cache.set(i, player(i)); return cache.get(i); }

// matchmaking: someone within ±range of your rating you haven't faced recently
export function findOpponent(rating, { recent = [], range = 50, rand = Math.random } = {}) {
  const cands = [];
  for (let w = range; w <= 400 && cands.length < 3; w += 50) {
    cands.length = 0;
    for (let i = 0; i < POOL_SIZE; i++) { const p = playerById("p" + i); if (Math.abs(p.elo - rating) <= w && !recent.includes(p.id)) cands.push(p); }
  }
  if (!cands.length) return playerById("p" + Math.floor(rand() * POOL_SIZE));
  return cands[Math.floor(rand() * cands.length)];
}
