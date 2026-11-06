// Stockfish 18 (WASM) in a Web Worker, with a serial job queue.
// Two instances: PLAY (bot moves) and ANA (analysis, live coach, review), so a review never blocks the bot.
// All scores returned are from WHITE's point of view: cp (centipawns) or mate (moves, + = white mates).

const MATE = 100000;
const TEST = (() => { try { return !!localStorage.getItem("noir.test"); } catch { return false; } })();

class Engine {
  constructor(name) {
    this.name = name;
    this.w = null;
    this.kind = "loading";
    this.ready = false;
    this.queue = [];
    this.cur = null;
    this.cache = new Map();
    this.readyP = null;
    this.opts = {};
    this.lastMsg = 0;
    this.restarts = 0;
    this.dog = null;
    this.ping = 0;
    this.log = [];
  }
  _t(s) { if (TEST) { this.log.push(Math.round(performance.now()) + " " + s); if (this.log.length > 200) this.log.shift(); } }

  // Stockfish prints at least every few seconds while it searches (each depth, and currmove lines after 3 s).
  // Silence for 20 s with a job running = the worker is dead: start a new one and run the job again.
  _watch() {
    if (this.dog) return;
    this.dog = setInterval(() => {
      if (!this.ready || document.hidden) return;
      if (this.ping && performance.now() - this.ping > 5000) { this._t("no readyok: restart"); this._restart(); return; }
      if (this.cur && performance.now() - this.lastMsg > 20000) { this._t("silent: restart"); this._restart(); }
    }, 1000);
    // back from the background (iOS may have killed the worker): ask "isready" at once instead of finding out on the next move
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      this.lastMsg = performance.now();
      if (this.ready && this.w) { this.ping = performance.now(); this._send("isready"); }
    });
  }

  _restart() {
    const j = this.cur;
    this.cur = null;
    try { this.w && this.w.terminate(); } catch {}
    this.w = null; this.ready = false; this.readyP = null; this.opts = {}; this.ping = 0;
    this.restarts++;
    if (j) { if (j.aborted) j.reject(new DOMException("aborted", "AbortError")); else { j.lines = {}; this.queue.unshift(j); } }
    this.init();
  }

  init() {
    if (this.readyP) return this.readyP;
    this.readyP = (async () => {
      let wasm = typeof WebAssembly === "object";
      try { new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); } catch { wasm = false; }
      const tries = (wasm ? [["sf.js", 30000, "Stockfish 18"]] : []).concat([["sf-asm.js", 60000, "Stockfish 18 (compat)"]]);
      for (const [url, to, kind] of tries) {
        try { this._t("init " + url); await this._start(url, to); this._t("ready q" + this.queue.length); this.kind = kind; this.ready = true; this.lastMsg = performance.now(); this._watch(); this._next(); return true; }
        catch (e) { try { this.w && this.w.terminate(); } catch {} this.w = null; }
      }
      this.kind = "unavailable";
      return false;
    })();
    return this.readyP;
  }

  _start(url, timeout) {
    return new Promise((res, rej) => {
      let w;
      try { w = new Worker(url); } catch (e) { rej(e); return; }
      this.w = w;
      const t = setTimeout(() => rej(new Error("timeout")), timeout);
      w.onmessage = (e) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (line === "uciok") {
          clearTimeout(t);
          w.onmessage = (ev) => { this.lastMsg = performance.now(); this.ping = 0; if (typeof ev.data === "string") this._line(ev.data); };
          this._send("setoption name Hash value 16");
          this._send("isready");
          res();
        }
      };
      w.onerror = (e) => { clearTimeout(t); rej(e); };
      w.postMessage("uci");
    });
  }

  _send(c) { this.w && this.w.postMessage(c); }

  setOption(name, value) {
    if (this.opts[name] === value) return;
    this.opts[name] = value;
    this._send(`setoption name ${name} value ${value}`);
  }

  // job: {fen, depth, movetime, multipv, moves (uci list after fen), limit:{elo}|null, onInfo, resolve, reject, key}
  analyse(fen, o = {}) {
    const job = { fen, depth: o.depth, movetime: o.movetime, nodes: o.nodes, multipv: o.multipv || 1, elo: o.elo || null, onInfo: o.onInfo, prio: o.prio || 0, signal: o.signal };
    job.key = o.noCache || o.elo ? null : `${fen}|${job.depth || ""}|${job.movetime || ""}|${job.nodes || ""}|${job.multipv}`;
    if (job.key && this.cache.has(job.key)) return Promise.resolve(this.cache.get(job.key));
    return new Promise((resolve, reject) => {
      job.resolve = resolve; job.reject = reject;
      if (job.prio > 0) this.queue.unshift(job); else this.queue.push(job);
      this._t("queue d" + (job.depth || "") + " q" + this.queue.length + " ready=" + this.ready);
      if (job.signal) job.signal.addEventListener("abort", () => this.cancel(job));
      this._next();
    });
  }

  cancel(job) {
    const i = this.queue.indexOf(job);
    this._t("cancel inQueue=" + (i >= 0) + " cur=" + (this.cur === job));
    if (i >= 0) { this.queue.splice(i, 1); job.reject(new DOMException("aborted", "AbortError")); }
    else if (this.cur === job) { job.aborted = true; this._send("stop"); }
  }

  // drop all queued jobs (e.g. leaving a review screen)
  clear() {
    this._t("clear q" + this.queue.length + " cur=" + !!this.cur);
    for (const j of this.queue) j.reject(new DOMException("aborted", "AbortError"));
    this.queue = [];
    if (this.cur) { this.cur.aborted = true; this._send("stop"); }
  }

  stop() { if (this.cur) this._send("stop"); }

  newGame() { this._send("ucinewgame"); this._send("isready"); }

  _next() {
    if (!this.ready || this.cur || !this.queue.length) return;
    const j = (this.cur = this.queue.shift());
    this._t("start d" + (j.depth || "") + " " + j.fen.slice(0, 20));
    j.lines = {};
    this.lastMsg = performance.now();
    j.turn = j.fen.split(" ")[1];
    if (j.elo) { this.setOption("UCI_LimitStrength", "true"); this.setOption("UCI_Elo", Math.round(j.elo)); }
    else this.setOption("UCI_LimitStrength", "false");
    this.setOption("MultiPV", j.multipv);
    this._send("position fen " + j.fen);
    let go = "go";
    if (j.depth) go += " depth " + j.depth;
    if (j.movetime) go += " movetime " + j.movetime;
    if (j.nodes) go += " nodes " + j.nodes;
    if (go === "go") go += " depth 12";
    this._send(go);
  }

  _line(l) {
    const j = this.cur;
    if (!j) return;
    if (l.startsWith("info") && l.includes(" pv ")) {
      const mp = +(l.match(/ multipv (\d+)/) || [0, 1])[1];
      const depth = +(l.match(/ depth (\d+)/) || [0, 0])[1];
      const sm = l.match(/ score (cp|mate) (-?\d+)/);
      if (!sm) return;
      if (l.includes(" lowerbound") || l.includes(" upperbound")) return;
      const sign = j.turn === "w" ? 1 : -1;
      let cp = null, mate = null;
      if (sm[1] === "cp") cp = sign * +sm[2];
      else if (+sm[2] === 0) cp = -sign * MATE; // side to move is already mated
      else mate = sign * +sm[2];
      const pv = l.split(" pv ")[1].trim().split(" ");
      j.lines[mp] = { depth, cp, mate, move: pv[0], pv, score: scoreOf(cp, mate) };
      if (j.onInfo && mp === 1) j.onInfo(j.lines[1], j);
    } else if (l.startsWith("bestmove")) {
      this._t(l + " aborted=" + !!j.aborted);
      const best = l.split(" ")[1];
      const lines = Object.keys(j.lines).sort((a, b) => a - b).map((k) => j.lines[k]);
      const res = { best: best && best !== "(none)" ? best : null, lines, fen: j.fen };
      this.cur = null;
      if (j.aborted) j.reject(new DOMException("aborted", "AbortError"));
      else { if (j.key && lines.length) { this.cache.set(j.key, res); if (this.cache.size > 4000) this.cache.delete(this.cache.keys().next().value); } j.resolve(res); }
      this._next();
    }
  }
}

// single number for sorting/comparing: mate scores mapped beyond any cp
export function scoreOf(cp, mate) {
  if (mate != null) return mate > 0 ? MATE - mate * 10 : mate < 0 ? -MATE - mate * 10 : 0;
  return cp;
}

export const PLAY = new Engine("play");
export const ANA = new Engine("analysis");

export function engineName() { return ANA.kind; }

export async function initEngines() {
  await ANA.init();
  // stagger the second worker so phones don't load two 7MB wasm modules at the same instant
  setTimeout(() => PLAY.init(), 400);
}
