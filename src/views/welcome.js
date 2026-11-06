// Onboarding for a fresh install: your name and level (or 5 placement games), your coach, your board.
import { $, $$, esc } from "../util.js";
import { state, save } from "../store.js";
import { COACHES, fill } from "../coaches.js";
import { BOARDS, APP_THEMES, applyTheme, miniBoardStyle } from "../themes.js";
import { charSVG } from "../art/character.js";
import { bring, typeInto, slideUp, enterStagger } from "../art/motion.js";
import { logoMark } from "../art/scenes.js";
import { celebrate } from "../art/fx.js";
import { I } from "../icons.js";
import { go } from "../router.js";
import { startPlacement } from "./game.js";

const LEVELS = [["I just learned the rules", 400], ["I play sometimes and lose pieces a lot", 700], ["I know basic tactics and openings", 1000], ["I'm a club player", 1400], ["I'm strong (1800+ online)", 1800]];

export function render(root) {
  const s = state();
  let step = 0, level = null, placement = false;
  root.className = "view";
  const draw = () => {
    const dots = `<div class="ob-dots">${[0, 1, 2, 3].map((i) => `<i class="${i === step ? "on" : i < step ? "done" : ""}"></i>`).join("")}</div>`;
    if (step === 0) {
      root.innerHTML = `${dots}<div class="ob"><div class="ob-logo">${logoMark(92)}</div><h1 class="tc">Welcome to <i>Noir Chess</i></h1>
        <p class="tc muted">Bots that play like people, six coaches, real game reviews, puzzles and courses — all on your phone, even offline.</p>
        <div class="ob-cast">${COACHES.map((c) => `<div class="ob-face">${charSVG(c.look, { label: c.name })}</div>`).join("")}</div>
        <label class="eyebrow mt">What should we call you?</label><input type="text" class="nm mt-s" value="${s.settings.name === "You" ? "" : esc(s.settings.name)}" maxlength="20" placeholder="Your name">
        <button class="btn primary big mt nx">Get started</button></div>`;
      $$(".ob-face .char", root).forEach((c, i) => { const ctl = bring(c); setTimeout(() => ctl && ctl.expr("happy", 1500), 300 + i * 120); });
      $(".nx", root).onclick = () => { s.settings.name = $(".nm", root).value.trim() || "You"; step = 1; draw(); };
    } else if (step === 1) {
      root.innerHTML = `${dots}<div class="ob"><h1>How strong are you?</h1><p class="muted">This sets your first rating. It moves with every rated game.</p>
        <div class="col gap mt">${LEVELS.map(([t, r]) => `<button class="tile lv" data-r="${r}"><div class="grow"><div class="t">${t}</div><div class="s">Start around ${r}</div></div><span class="chev">›</span></button>`).join("")}
        <button class="tile lv-p"><div class="ic" style="background:linear-gradient(135deg,var(--acc2),var(--acc-d))">${I.target}</div><div class="grow"><div class="t">Find my level in 5 games</div><div class="s">Placement games against an adapting opponent</div></div><span class="chev">›</span></button></div></div>`;
      $$(".lv", root).forEach((b) => (b.onclick = () => { level = +b.dataset.r; placement = false; step = 2; draw(); }));
      $(".lv-p", root).onclick = () => { placement = true; level = null; step = 2; draw(); };
    } else if (step === 2) {
      root.innerHTML = `${dots}<div class="ob"><h1>Pick your coach</h1><p class="muted">Your coach runs your game reviews and the live coach. You can change any time.</p>
        <div class="ob-coaches">${COACHES.map((c) => `<button class="ob-coach ${s.settings.coach === c.id ? "on" : ""}" data-c="${c.id}" aria-label="${c.name}"><div class="ob-port">${charSVG(c.look, { label: c.name })}</div><b>${esc(c.short)}</b><span class="tiny muted">${esc(c.role)}</span></button>`).join("")}</div>
        <div class="bubble mt ob-say"><div class="who"></div><div class="txt small"></div></div>
        <button class="btn primary big mt nx">Continue</button></div>`;
      const say = (id) => { const c = COACHES.find((x) => x.id === id); $(".ob-say .who", root).textContent = c.name + " · " + c.role; const el = $(`.ob-coach[data-c="${id}"] .char`, root); typeInto($(".ob-say .txt", root), esc(fill(c.hello[0], { name: s.settings.name || "friend" })), { ctl: el && el.__ctl }); };
      $$(".ob-coach .char", root).forEach((c) => bring(c));
      $$(".ob-coach", root).forEach((b) => (b.onclick = () => { s.settings.coach = b.dataset.c; $$(".ob-coach", root).forEach((x) => x.classList.toggle("on", x === b)); const ch = b.querySelector(".char"); ch.__ctl && ch.__ctl.react("celebrate"); say(b.dataset.c); }));
      say(s.settings.coach || "amara");
      $(".nx", root).onclick = () => { step = 3; draw(); };
    } else {
      root.innerHTML = `${dots}<div class="ob"><h1>Your board</h1><p class="muted">Pick a board and a theme. Both are in Settings later.</p>
        <div class="swatches bds mt">${BOARDS.slice(0, 12).map((b) => `<button class="swatch ${s.settings.board === b.id ? "on" : ""}" data-b="${b.id}" aria-label="${b.name}"><div class="mini" style="${miniBoardStyle(b)}"></div><span>${b.name}</span></button>`).join("")}</div>
        <div class="chips mt ths">${APP_THEMES.map((t) => `<button class="chip ${s.settings.theme === t.id ? "on" : ""}" data-t="${t.id}"><span style="width:14px;height:14px;border-radius:50%;background:${t.bg};border:2px solid ${t.acc}"></span>${t.name}</button>`).join("")}</div>
        <button class="btn primary big mt ob-finish">${placement ? "Start placement game 1" : "Let's play"}</button></div>`;
      $$(".bds .swatch", root).forEach((b) => (b.onclick = () => { s.settings.board = b.dataset.b; $$(".bds .swatch", root).forEach((x) => x.classList.toggle("on", x === b)); applyTheme(); }));
      $$(".ths .chip", root).forEach((b) => (b.onclick = () => { s.settings.theme = b.dataset.t; $$(".ths .chip", root).forEach((x) => x.classList.toggle("on", x === b)); applyTheme(); }));
      $(".ob-finish", root).onclick = () => {
        s.onboarded = true;
        if (level) { s.placement = { rating: level, date: Date.now(), chosen: true }; for (const k of ["bullet", "blitz", "rapid", "classical"]) if (!s.ratings[k].r) s.ratings[k] = { r: level, rd: 250, vol: 0.06, games: 0, hist: [[Date.now(), level]], best: level, seeded: true }; if (!s.ratings.puzzle.r) s.ratings.puzzle = { r: level, rd: 250, vol: 0.06, games: 0, hist: [], best: level }; }
        save(); celebrate();
        if (placement) startPlacement(1000); else go("home", { replace: true });
      };
    }
    enterStagger($(".ob", root));
  };
  draw();
}
