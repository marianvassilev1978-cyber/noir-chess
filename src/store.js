// Persistent state: localStorage always; Claude account db when running inside the Claude artifact.
import { today } from "./util.js";

const KEY = "noirchess.v2";
const OLD_KEY = "noirchess.v1";

export const TC_CATS = ["bullet", "blitz", "rapid", "classical"];

function rating0(r = null) { return { r, games: 0, hist: [], best: r || 0 }; }

export function defaults() {
  return {
    v: 2,
    updatedAt: 0,
    profile: { name: "You", avatar: "♞", country: "bg", joined: Date.now() },
    placement: null, // {rating, date}
    ratings: { bullet: rating0(), blitz: rating0(), rapid: rating0(), classical: rating0(), puzzle: rating0() },
    games: [],
    live: null,
    puzzle: { solved: 0, failed: 0, streak: 0, best: 0, seen: [], themeStats: {} },
    rush: { best: { r3: 0, r5: 0, survival: 0 }, hist: [] },
    mistakes: [],
    openings: {},
    lessons: {},
    drills: {},
    vision: { best: { white: 0, black: 0 }, hist: [] },
    daily: { date: today(), puzzles: 0, games: 0, lesson: 0, opening: 0, reviews: 0, drills: 0 },
    streak: { count: 0, last: null, best: 0 },
    xp: 0,
    achievements: {},
    settings: {
      sound: true, soundSet: "wood", volume: 0.9, soundOnSilent: true,
      board: "green", pieces: "cburnett", theme: "dark",
      coords: "inside", legal: true, anim: true, animMs: 160,
      autoQueen: false, premove: true, confirmResign: true,
      evalBar: false, coachLive: true, guard: false,
      classOnBoard: true, haptics: true, lastMove: true,
      name: "You",
    },
  };
}

let S = defaults();
let db = null, uidc = null, mode = "local", saveTimer = null, listeners = [];
export const state = () => S;
export const storageMode = () => mode;
export const onSync = (f) => listeners.push(f);

function merge(base, v) {
  const d = defaults();
  const o = Object.assign(d, base, v);
  for (const k of ["settings", "puzzle", "daily", "streak", "rush", "vision", "profile"]) o[k] = Object.assign(defaults()[k], (base || {})[k] || {}, (v || {})[k] || {});
  o.ratings = Object.assign(defaults().ratings, (v || {}).ratings || {});
  return o;
}

// v1 (first Noir Chess) -> v2
function migrate(o) {
  const n = defaults();
  n.updatedAt = o.updatedAt || 0;
  if (o.rating) {
    n.ratings.rapid = { r: Math.round(o.rating), games: o.ratingGames || 0, hist: (o.ratingHist || []).map((x) => Array.isArray(x) ? x : [x.t || x.date || Date.now(), x.r || x.rating || o.rating]), best: Math.round(o.rating) };
    n.ratings.blitz = { r: Math.round(o.rating), games: 0, hist: [], best: Math.round(o.rating) };
  }
  if (o.placement) n.placement = typeof o.placement === "object" ? o.placement : { rating: o.rating, date: Date.now() };
  if (o.puzzle) {
    n.ratings.puzzle = { r: o.puzzle.rating, games: (o.puzzle.solved || 0) + (o.puzzle.failed || 0), hist: [], best: o.puzzle.rating || 0 };
    Object.assign(n.puzzle, { solved: o.puzzle.solved || 0, failed: o.puzzle.failed || 0, streak: o.puzzle.streak || 0, best: o.puzzle.best || 0 });
  }
  n.puzzle.seen = (o.seen || []).slice(-3000);
  n.games = (o.games || []).filter((g) => g && (g.pgn || g.moves)).map((g) => ({ ...g, tc: g.tc || "rapid", cat: "rapid" }));
  n.mistakes = o.mistakes || [];
  n.openings = o.openings || {};
  n.lessons = o.lessons || {};
  if (o.rushBest) n.rush.best = { r3: o.rushBest.timed || 0, r5: 0, survival: o.rushBest.survival || 0 };
  if (o.streak) n.streak = { ...n.streak, ...o.streak };
  if (o.settings) { n.settings.sound = o.settings.sound !== false; n.settings.coachLive = o.settings.coach !== false; n.settings.guard = !!o.settings.guard; n.settings.name = o.settings.name || "You"; }
  n.migratedFrom = 1;
  return n;
}

export function load() {
  try {
    const t = localStorage.getItem(KEY);
    if (t) S = merge(defaults(), JSON.parse(t));
    else {
      const old = localStorage.getItem(OLD_KEY);
      if (old) { S = merge(defaults(), migrate(JSON.parse(old))); persistLocal(); }
    }
  } catch (e) { console.warn("load failed", e); }
  rollDay();
  return S;
}

export function rollDay() {
  const d = today();
  if (S.daily.date !== d) S.daily = { date: d, puzzles: 0, games: 0, lesson: 0, opening: 0, reviews: 0, drills: 0 };
}

// Mark today as an active day for the streak (call when the user does real training).
export function touchStreak() {
  const d = today();
  if (S.streak.last === d) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yd = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
  S.streak.count = S.streak.last === yd ? S.streak.count + 1 : 1;
  S.streak.last = d;
  S.streak.best = Math.max(S.streak.best || 0, S.streak.count);
}

function trim() {
  if (S.games.length > 300) S.games = S.games.slice(-300);
  if (S.puzzle.seen.length > 4000) S.puzzle.seen = S.puzzle.seen.slice(-4000);
  if (S.mistakes.length > 400) S.mistakes = S.mistakes.slice(-400);
  for (const k in S.ratings) if (S.ratings[k].hist.length > 600) S.ratings[k].hist = S.ratings[k].hist.slice(-600);
  if (S.rush.hist.length > 200) S.rush.hist = S.rush.hist.slice(-200);
}

function persistLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) {
    // quota: drop old game details
    S.games = S.games.slice(-80).map((g, i, a) => (i < a.length - 30 ? { ...g, review: g.review ? { acc: g.review.acc, counts: g.review.counts } : null } : g));
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  }
}

export function save() {
  S.updatedAt = Date.now();
  trim();
  persistLocal();
  if (db) { clearTimeout(saveTimer); saveTimer = setTimeout(pushCloud, 2000); }
}

async function pushCloud() {
  if (!db) return;
  try {
    const slim = { ...S, games: S.games.slice(-120) };
    await db.doc("data/users/" + uidc + "/progress2").set({ json: JSON.stringify(slim), updatedAt: S.updatedAt });
    mode = "cloud";
  } catch (e) { console.warn("cloud save failed", e); }
}

// Inside the Claude artifact: sync with the account db.
export async function initCloud() {
  try {
    if (!window.claude || !window.claude.use) return;
    const [d, u] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
    if (!d || !u) return;
    const id = await u.id();
    if (!id) return;
    db = d; uidc = id;
    const timeout = new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000));
    let snap = await Promise.race([db.doc("data/users/" + id + "/progress2").get(), timeout]);
    let remote = null;
    if (snap.exists) remote = JSON.parse(snap.data().json || "{}");
    else {
      const old = await Promise.race([db.doc("data/users/" + id + "/progress").get(), timeout]).catch(() => null);
      if (old && old.exists) remote = migrate(JSON.parse(old.data().json || "{}"));
    }
    if (remote && (remote.updatedAt || 0) > (S.updatedAt || 0)) { S = merge(defaults(), remote); rollDay(); persistLocal(); }
    else if (S.updatedAt) pushCloud();
    mode = "cloud";
    listeners.forEach((f) => f());
  } catch (e) { console.warn("cloud init", e); mode = "local"; }
}

export function exportBackup() { return JSON.stringify(S); }
export function importBackup(text) {
  let o = JSON.parse(text);
  if (!o.v || o.v === 1) o = migrate(o);
  S = merge(defaults(), o);
  rollDay();
  save();
}
export function resetAll() { S = defaults(); save(); }

// ---------- ratings ----------
export function catOf(tc) {
  if (!tc || tc === "none") return "classical";
  const [m, inc] = tc.split("+").map(Number);
  const est = m * 60 + (inc || 0) * 40; // chess.com style estimate
  if (est < 180) return "bullet";
  if (est < 600) return "blitz";
  if (est < 1800) return "rapid";
  return "classical";
}

export function currentRating(cat = "rapid") {
  const R = S.ratings;
  if (R[cat] && R[cat].r) return R[cat].r;
  // fall back to any known rating
  for (const k of ["rapid", "blitz", "bullet", "classical"]) if (R[k] && R[k].r) return R[k].r;
  if (S.placement) return S.placement.rating;
  return null;
}

export function bestRating() {
  let b = 0;
  for (const k of TC_CATS) b = Math.max(b, S.ratings[k].r || 0);
  return b || (S.placement ? S.placement.rating : 0);
}

// Elo update with a provisional (higher) K for the first 20 games.
export function rateGame(cat, opp, score) {
  const R = S.ratings[cat] || (S.ratings[cat] = rating0());
  if (!R.r) R.r = currentRating(cat) || 800;
  const k = R.games < 10 ? 60 : R.games < 25 ? 40 : 24;
  const exp = 1 / (1 + Math.pow(10, (opp - R.r) / 400));
  const delta = Math.round(k * (score - exp));
  R.r = Math.max(100, R.r + delta);
  R.games++;
  R.best = Math.max(R.best || 0, R.r);
  R.hist.push([Date.now(), R.r]);
  return delta;
}

export function ratePuzzle(prating, solved) {
  const R = S.ratings.puzzle;
  if (!R.r) R.r = Math.max(400, (currentRating() || 800));
  const k = R.games < 20 ? 50 : 22;
  const exp = 1 / (1 + Math.pow(10, (prating - R.r) / 400));
  const delta = Math.round(k * ((solved ? 1 : 0) - exp));
  R.r = Math.max(100, R.r + delta);
  R.games++;
  R.best = Math.max(R.best || 0, R.r);
  R.hist.push([Date.now(), R.r]);
  return delta;
}
