// Meet the coaches: portraits, bios, specialties; pick your main coach.
import { $, $$, esc, pick } from "../util.js";
import { state, save } from "../store.js";
import { COACHES, fill } from "../coaches.js";
import { charSVG } from "../art/character.js";
import { bring, typeInto } from "../art/motion.js";
import { sectionHead } from "../ui.js";
import { I } from "../icons.js";
import { back } from "../router.js";

export function render(root) {
  const s = state();
  root.innerHTML = `${sectionHead("coaches", "Meet the coaches", "Six coaches, six voices. Your main coach runs Game Review and the live coach; each course is taught by its specialist.", `<button class="back" aria-label="Back">‹</button>`)}
    <div class="grid" style="max-width:760px">${COACHES.map((c) => `<div class="card coach-card ${s.settings.coach === c.id ? "main" : ""}" data-id="${c.id}">
      <div class="cc-top"><div class="cc-port">${charSVG(c.look, { label: c.name })}</div>
        <div class="grow"><div class="eyebrow" style="color:var(--acc2)">${esc(c.role)}</div><h3 class="cc-name">${esc(c.name)}</h3>
        <div class="small muted">${c.flag} ${esc(c.country)} · ${c.age}</div><div class="small mt-s"><b>Specialty:</b> ${esc(c.specialty)}</div></div></div>
      <p class="small mt">${esc(c.bio)}</p>
      <div class="bubble small cc-say"><div class="txt"></div></div>
      <div class="row gap mt"><button class="btn sm ${s.settings.coach === c.id ? "primary" : ""} pickc">${s.settings.coach === c.id ? I.check + " Your main coach" : "Make my main coach"}</button><button class="btn sm ghost hear">${I.play2} Hear ${esc(c.short)}</button></div>
    </div>`).join("")}</div>`;
  $(".back", root).onclick = () => back();
  $$(".coach-card", root).forEach((el) => {
    const c = COACHES.find((x) => x.id === el.dataset.id);
    const ctl = bring(el.querySelector(".char"));
    el.querySelector(".cc-say .txt").textContent = c.voice;
    $(".hear", el).onclick = () => { if (ctl) ctl.expr("happy", 1800); typeInto(el.querySelector(".cc-say .txt"), esc(fill(pick(c.hello), { name: s.settings.name || "friend" })), { ctl }); };
    $(".pickc", el).onclick = () => { s.settings.coach = c.id; save(); if (ctl) ctl.react("celebrate"); setTimeout(() => render(root), 600); };
  });
}
