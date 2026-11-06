// Layered SVG characters, drawn in code (see public/art/STYLE.md).
// Every character shares the same anchors (240×240 bust): head centre (120,100), eyes at y≈107, mouth at y≈140,
// shoulders from y≈178. Groups are named for the motion system (src/art/motion.js):
// c-root › c-breath › (c-body, c-head › c-eyes/c-pupil/c-lid, c-brows, c-mouth, …, c-arms)
// Expressions (neutral, happy, impressed, worried, thinking) and poses (rest, think, cheer, explain) are variant
// groups shown by an opacity cross-fade, so changes use opacity and transforms only.

let UID = 0;
const r1 = (n) => Math.round(n * 10) / 10;

// ---------- colour ----------
function rgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(r, g, b) { return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join(""); }
// amt < 0: darker and a little cooler (shadow); amt > 0: lighter and a little warmer (highlight)
export function shade(h, amt) {
  let [r, g, b] = rgb(h);
  if (amt < 0) { const k = 1 + amt; r = r * k; g = g * k; b = b * k + -amt * 22; }
  else { r += (255 - r) * amt; g += (255 - g) * amt * 0.96; b += (255 - b) * amt * 0.86; }
  return hex(r, g, b);
}
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };

// ---------- face geometry ----------
const FACES = {
  oval: { w: 96, T: 44, B: 160, jaw: 0.38, chin: 0.34 },
  round: { w: 104, T: 46, B: 158, jaw: 0.22, chin: 0.56 },
  square: { w: 102, T: 44, B: 160, jaw: 0.78, chin: 0.72 },
  long: { w: 92, T: 40, B: 162, jaw: 0.46, chin: 0.4 },
  heart: { w: 100, T: 44, B: 160, jaw: 0.16, chin: 0.12 },
  kid: { w: 110, T: 48, B: 156, jaw: 0.18, chin: 0.62 },
};
function facePath(f) {
  const { w, T, B } = f, L = 120 - w / 2, R = 120 + w / 2, h = B - T;
  const cy = T + h * 0.52, cw = w * (0.1 + 0.3 * f.chin), jy = cy + h * (0.16 + 0.24 * f.jaw);
  return `M120 ${T}C${r1(120 + w * 0.47)} ${T} ${R} ${r1(T + h * 0.2)} ${R} ${r1(cy)}C${R} ${r1(jy)} ${r1(120 + cw)} ${B} 120 ${B}C${r1(120 - cw)} ${B} ${L} ${r1(jy)} ${L} ${r1(cy)}C${L} ${r1(T + h * 0.2)} ${r1(120 - w * 0.47)} ${T} 120 ${T}Z`;
}

// tapered brow: (x1,y1) outer end → (x2,y2) inner end, arch = control point lift
function brow(x1, y1, x2, y2, arch, th) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + arch;
  const t1 = th * 0.55, t2 = th, tc = th * 0.95;
  return `M${x1} ${r1(y1 - t1 / 2)}Q${mx} ${r1(my - tc / 2)} ${x2} ${r1(y2 - t2 / 2)}Q${r1(x2 + (x2 > x1 ? 2.5 : -2.5))} ${y2} ${x2} ${r1(y2 + t2 / 2)}Q${mx} ${r1(my + tc / 2)} ${x1} ${r1(y1 + t1 / 2)}Z`;
}
const BROWS = {
  neutral: [[86, 91, 112, 89, -5], [154, 91, 128, 89, -5]],
  happy: [[86, 88, 112, 86, -7], [154, 88, 128, 86, -7]],
  impressed: [[85, 82, 112, 79, -9], [155, 82, 128, 79, -9]],
  worried: [[86, 91, 112, 82, -1], [154, 91, 128, 82, -1]],
  thinking: [[86, 85, 112, 83, -7], [154, 93, 128, 92, -1]],
};
const EXPR = ["neutral", "happy", "impressed", "worried", "thinking"];
const xg = (exprs, body, extra = "") => `<g class="x ${exprs.split(" ").map((e) => "x-" + e).join(" ")}" ${extra}>${body}</g>`;

// ---------- hair ----------
// Each style returns {back, front}; designed for the standard face (L=71, R=169, T=44) and scaled to the face width.
function hairStyle(name, c, f) {
  const d = shade(c, -0.28), hi = shade(c, 0.22);
  const P = (p, fill = c) => `<path d="${p}" fill="${fill}"/>`;
  const streak = (p, w = 4) => `<path d="${p}" stroke="${hi}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity=".55"/>`;
  const groove = (p, w = 2.4) => `<path d="${p}" stroke="${d}" stroke-width="${w}" stroke-linecap="round" fill="none" opacity=".8"/>`;
  switch (name) {
    case "short": return { back: "", front:
      P("M67 112C60 80 72 38 118 33C160 29 182 58 173 104L169 112C167 96 163 84 156 76C142 78 120 76 104 66C96 80 84 86 78 98C75 104 72 108 71 113Z") +
      P("M104 66C120 76 142 78 156 76C150 70 138 64 124 63C116 63 109 64 104 66Z", d) + streak("M80 64C90 48 106 40 124 39") };
    case "spiky": return { back: "", front:
      P("M66 108C60 90 62 70 70 58L66 40L84 46L86 22L104 36L114 10L128 32L144 12L150 38L170 28L166 54L180 62L174 82C178 92 176 100 171 110L168 112C166 96 162 84 155 77C140 80 120 78 104 68C96 80 84 88 78 98C75 104 72 108 70 113Z") +
      P("M104 68C120 78 140 80 155 77C150 70 138 64 124 64C116 64 109 66 104 68Z", d) + streak("M86 50L92 36M112 30L118 20M140 30L144 22", 3.5) };
    case "slick": return { back: P("M70 70C64 90 64 112 68 124L172 124C176 108 176 88 170 70Z", d), front:
      P("M67 108C60 72 82 32 124 30C164 30 184 58 173 104L169 110C167 90 160 74 146 68C128 62 108 61 94 68C82 76 75 90 71 110Z") +
      P("M94 68C104 62 112 66 120 74C128 66 138 62 146 68C134 60 106 60 94 68Z", c) + streak("M92 54C108 44 130 42 152 48", 3) + streak("M86 64C104 54 130 52 158 60", 2.4) + streak("M100 40C114 34 132 34 146 40", 4) };
    case "bald": return { back: "", front: `<ellipse cx="96" cy="58" rx="16" ry="9" fill="#fff" opacity=".16" transform="rotate(-22 96 58)"/>` };
    case "sidetufts": { let t = ""; for (const [x, y, rr] of [[62, 86, 9], [56, 98, 10], [60, 112, 9], [68, 120, 7], [70, 80, 7], [178, 86, 9], [184, 98, 10], [180, 112, 9], [172, 120, 7], [170, 80, 7]]) t += `<circle cx="${x}" cy="${y}" r="${rr}" fill="${c}"/>`; return { back: t + `<circle cx="56" cy="94" r="4" fill="${hi}" opacity=".6"/><circle cx="184" cy="94" r="4" fill="${hi}" opacity=".6"/>`, front:
      P("M66 112C60 100 64 84 72 82C70 92 74 100 70 112Z", d) + P("M174 112C180 100 176 84 168 82C170 92 166 100 170 112Z", d) + `<ellipse cx="98" cy="56" rx="17" ry="9" fill="#fff" opacity=".18" transform="rotate(-22 98 56)"/>` }; }
    case "bun": return { back:
      `<circle cx="120" cy="30" r="20" fill="${c}"/><path d="M106 22C112 16 126 14 134 22" stroke="${hi}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/><path d="M104 40C112 46 128 46 136 40" stroke="${d}" stroke-width="4" fill="none"/>` + P("M66 120C58 80 78 40 120 38C162 40 182 80 174 120Z", d), front:
      P("M68 112C62 78 82 42 120 40C158 42 178 78 172 112L168 112C166 92 158 74 140 62C132 58 124 56 120 56C116 56 108 58 100 62C82 74 74 92 72 112Z") +
      P("M120 56C126 58 132 60 138 64C130 52 124 46 120 44C116 46 110 52 102 64C108 60 114 58 120 56Z", d) + streak("M84 70C92 56 104 48 116 46") + streak("M156 70C150 58 142 52 132 49", 3) };
    case "afro": {
      let bumps = "";
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; bumps += `<circle cx="${r1(120 + Math.cos(a) * 64)}" cy="${r1(84 + Math.sin(a) * 58)}" r="18" fill="${c}"/>`; }
      return { back: `<ellipse cx="120" cy="84" rx="68" ry="62" fill="${c}"/>` + bumps + `<ellipse cx="120" cy="90" rx="60" ry="52" fill="${d}" opacity=".35"/>` + `<path d="M76 46C88 30 104 24 120 24" stroke="${hi}" stroke-width="7" stroke-linecap="round" fill="none" opacity=".35"/>`, front:
        P("M68 104C64 66 88 38 120 38C152 38 176 66 172 104C166 88 152 74 120 72C90 74 74 88 68 104Z") + `<path d="M86 52C96 44 108 40 120 40" stroke="${hi}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".3"/>` };
    }
    case "curlybob": {
      let sc = "";
      for (let i = 0; i < 7; i++) sc += `<circle cx="${78 + i * 14}" cy="${72 + (i % 2) * 3}" r="11" fill="${c}"/>`;
      let rim = "";
      for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.02 + i / 12 * 0.96); rim += `<circle cx="${r1(120 + Math.cos(a) * 66)}" cy="${r1(84 + Math.sin(a) * 58)}" r="15" fill="${c}"/>`; }
      for (const [x, y] of [[58, 100], [56, 120], [60, 140], [182, 100], [184, 120], [180, 140], [72, 154], [168, 154]]) rim += `<circle cx="${x}" cy="${y}" r="14" fill="${c}"/><circle cx="${x - 3}" cy="${y - 4}" r="5" fill="${hi}" opacity=".3"/>`;
      return { back: P("M56 74C56 40 86 28 120 28C154 28 184 40 184 74L186 146C182 156 170 158 166 150L150 124L90 124L74 150C70 158 58 156 54 146Z") + rim, front:
        P("M66 96C64 66 86 38 120 38C154 38 176 66 174 96C170 82 160 76 150 76C130 74 108 74 90 76C80 78 70 84 66 96Z") + sc + streak("M88 50C100 42 114 40 128 41", 5) };
    }
    case "long": return { back: P("M60 80C58 46 86 28 120 28C154 28 182 46 180 80L186 196C176 206 160 206 150 196L148 130L92 130L90 196C80 206 64 206 54 196Z"), front:
      P("M66 116C58 78 80 38 120 36C160 38 182 78 174 116L170 116C168 92 160 72 140 62C124 74 100 82 78 88C74 96 72 106 70 116Z") +
      P("M140 62C124 74 100 82 78 88C88 70 104 60 124 58C130 58 136 60 140 62Z", d) + streak("M90 52C100 44 114 40 128 40") + streak("M64 140L66 180M176 140L174 180", 3) };
    case "wavy": return { back: P("M60 78C58 46 86 30 120 30C154 30 182 46 180 78L184 150C178 162 168 158 166 150C162 162 150 160 150 150L150 124L90 124L90 150C90 160 78 162 74 150C72 158 62 162 56 150Z"), front:
      P("M66 112C60 74 82 38 120 36C158 38 180 74 174 112C168 98 164 86 156 80C146 86 134 78 124 82C112 88 100 78 90 84C82 88 76 98 70 112Z") + streak("M86 54C98 44 112 40 128 40") };
    case "ponytail": return { back: P("M166 64C190 70 200 100 192 132C188 150 178 166 170 172C176 150 180 126 172 104Z") + P("M66 116C58 80 80 40 120 38C160 40 182 80 174 116Z", d), front:
      P("M68 110C62 78 82 42 120 40C158 42 178 78 172 110L168 110C166 88 156 72 136 64C120 72 98 76 80 82C76 90 72 100 70 110Z") + `<rect x="160" y="66" width="12" height="10" rx="4" fill="${shade(c, -0.5)}" transform="rotate(25 166 71)"/>` + streak("M88 54C100 46 114 42 128 42") };
    case "buzz": return { back: "", front: P("M70 104C66 72 84 44 120 42C156 44 174 72 170 104C168 92 164 82 158 76C140 70 100 70 82 76C76 82 72 92 70 104Z", c) + `<path d="M76 80C90 70 150 70 164 80" stroke="${d}" stroke-width="2" fill="none" opacity=".5"/>` };
    case "mohawk": return { back: "", front: P("M104 72C100 50 104 22 120 8C136 22 140 50 136 72C128 66 112 66 104 72Z") + streak("M116 20L114 56", 3) + P("M72 100C70 84 76 70 86 64C82 76 80 88 80 100Z", shade(c, -0.1)) + P("M168 100C170 84 164 70 154 64C158 76 160 88 160 100Z", shade(c, -0.1)) };
    case "braids": {
      let br = "";
      for (const x of [66, 174]) for (let i = 0; i < 5; i++) br += `<ellipse cx="${x}" cy="${128 + i * 16}" rx="10" ry="9" fill="${i % 2 ? d : c}"/>`;
      return { back: br + P("M64 120C56 80 80 40 120 38C160 40 184 80 176 120Z", d), front:
        P("M68 110C62 78 82 42 120 40C158 42 178 78 172 110L168 110C164 86 150 66 120 62C90 66 76 86 72 110Z") + groove("M120 42L120 62", 2.5) + streak("M92 52C100 46 108 44 116 44") };
    }
    case "pigtails": return { back: `<circle cx="56" cy="74" r="22" fill="${c}"/><circle cx="184" cy="74" r="22" fill="${c}"/><circle cx="50" cy="68" r="8" fill="${hi}" opacity=".4"/>` + P("M66 116C58 80 80 42 120 40C160 42 182 80 174 116Z", d), front:
      P("M68 106C64 76 84 46 120 44C156 46 176 76 172 106C166 92 158 82 146 76C138 84 126 80 120 74C114 80 102 84 94 76C82 82 74 92 68 106Z") + streak("M90 58C100 50 112 47 124 47") };
    case "curls": {
      let cu = "";
      const pts = [[76, 74], [88, 56], [104, 46], [120, 42], [136, 46], [152, 56], [164, 74], [96, 64], [120, 58], [144, 64]];
      for (const [x, y] of pts) cu += `<circle cx="${x}" cy="${y}" r="14" fill="${c}"/><circle cx="${x - 4}" cy="${y - 4}" r="5" fill="${hi}" opacity=".35"/>`;
      return { back: "", front: cu + `<circle cx="72" cy="90" r="10" fill="${c}"/><circle cx="168" cy="90" r="10" fill="${c}"/>` };
    }
    case "fringe": return { back: P("M60 80C58 46 86 30 120 30C154 30 182 46 180 80L180 146C170 152 160 150 156 142L152 124L88 124L84 142C80 150 70 152 60 146Z"), front:
      P("M66 106C62 68 84 38 120 38C156 38 178 68 174 106C172 96 170 88 168 84L72 84C70 88 68 96 66 106Z") + P("M72 84L168 84C164 70 146 60 120 60C94 60 76 70 72 84Z", c) + groove("M96 66L94 84M112 62L111 84M128 62L129 84M144 66L146 84", 1.8) + streak("M86 48C100 40 116 38 132 40") };
    case "receding": return { back: P("M64 116C58 98 62 84 70 76L72 112Z", d) + P("M176 116C182 98 178 84 170 76L168 112Z", d), front:
      P("M70 112C66 90 70 74 80 66C84 76 82 90 80 100C78 104 76 108 74 114Z") + P("M170 112C174 90 170 74 160 66C156 76 158 90 160 100C162 104 164 108 166 114Z") + P("M98 50C108 44 132 44 142 50C134 48 106 48 98 50Z") + `<ellipse cx="100" cy="58" rx="14" ry="8" fill="#fff" opacity=".14" transform="rotate(-22 100 58)"/>` };
    default: return { back: "", front: "" };
  }
}

// ---------- headwear (accessories drawn over the hair) ----------
function headwear(kind, col, f) {
  const d = shade(col, -0.25), hi = shade(col, 0.2);
  if (kind === "beanie") return `<path d="M64 92C60 52 86 28 120 28C154 28 180 52 176 92Z" fill="${col}"/><path d="M84 40C96 32 110 30 122 30" stroke="${hi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>` +
    `<rect x="60" y="80" width="120" height="20" rx="9" fill="${d}"/>` + [72, 86, 100, 114, 128, 142, 156, 170].map((x) => `<rect x="${x}" y="83" width="3" height="14" rx="1.5" fill="${shade(col, -0.4)}" opacity=".45"/>`).join("") +
    `<circle cx="120" cy="24" r="11" fill="${hi}"/>`;
  if (kind === "cap") return `<path d="M68 86C66 54 88 34 120 34C152 34 174 54 172 86Z" fill="${col}"/><path d="M68 84C96 76 150 76 172 84L186 92C176 98 150 94 120 92C94 92 76 92 66 92Z" fill="${d}"/><circle cx="120" cy="36" r="4" fill="${d}"/><path d="M120 36L120 82" stroke="${d}" stroke-width="2" opacity=".6"/><path d="M86 48C96 40 108 38 118 38" stroke="${hi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>`;
  if (kind === "beret") return `<path d="M64 76C58 50 92 34 128 36C162 38 184 54 176 74C160 82 90 84 64 76Z" fill="${col}"/><path d="M66 74C96 82 150 82 176 72L176 78C150 88 96 88 66 80Z" fill="${d}"/><path d="M126 36L130 26" stroke="${d}" stroke-width="4" stroke-linecap="round"/>`;
  if (kind === "headband") return `<path d="M70 82C92 70 148 70 170 82L170 94C148 82 92 82 70 94Z" fill="${col}"/><path d="M74 84C96 74 144 74 166 84" stroke="${hi}" stroke-width="2" fill="none" opacity=".6"/>`;
  if (kind === "headphones") return `<path d="M64 104C60 52 88 26 120 26C152 26 180 52 176 104" stroke="${d}" stroke-width="9" fill="none" stroke-linecap="round"/><rect x="54" y="94" width="20" height="34" rx="9" fill="${col}"/><rect x="166" y="94" width="20" height="34" rx="9" fill="${col}"/><rect x="58" y="100" width="6" height="22" rx="3" fill="${hi}" opacity=".5"/>`;
  if (kind === "headwrap") return `<path d="M60 92C52 46 88 18 124 20C164 22 190 54 178 94C164 80 150 76 120 76C92 76 76 80 60 92Z" fill="${col}"/><path d="M120 22C140 26 156 40 160 60M100 24C86 36 80 50 80 66" stroke="${d}" stroke-width="3" fill="none" opacity=".7"/><path d="M146 22C158 10 172 14 170 28C166 38 154 34 152 28" fill="${hi}"/>`;
  if (kind === "crown") return `<path d="M82 52L88 22L104 40L120 16L136 40L152 22L158 52Z" fill="${col}"/><rect x="82" y="48" width="76" height="10" rx="3" fill="${d}"/><circle cx="120" cy="34" r="4" fill="#e9455b"/>`;
  return "";
}

// ---------- outfits ----------
const TORSO = "M26 240C28 206 52 188 92 180L148 180C188 188 212 206 214 240Z";
function outfit(o, col, col2, skin) {
  const d = shade(col, -0.25), hi = shade(col, 0.16);
  const base = `<path d="${TORSO}" fill="${col}"/><path d="M148 180C188 188 212 206 214 240" stroke="${shade(col, 0.4)}" stroke-width="2.4" fill="none" opacity=".5"/><path d="M148 180C188 188 212 206 214 240L170 240C176 214 168 196 148 186Z" fill="${d}" opacity=".55"/><path d="M40 222C48 204 62 194 82 188" stroke="${hi}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".45"/>`;
  const c2 = col2 || shade(col, 0.5), c2d = shade(c2, -0.2);
  switch (o) {
    case "tee": return base + `<path d="M100 181Q120 200 140 181" stroke="${d}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    case "hoodie": return `<path d="M68 200C66 170 90 158 120 158C150 158 174 170 172 200Z" fill="${d}"/>` + base + `<path d="M98 182Q120 202 142 182" stroke="${d}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M110 192L108 222M130 192L132 222" stroke="${c2}" stroke-width="3" stroke-linecap="round"/><circle cx="108" cy="224" r="3" fill="${c2}"/><circle cx="132" cy="224" r="3" fill="${c2}"/>`;
    case "collar": return base + `<path d="M104 180L120 202L136 180Z" fill="${skin}"/><path d="M100 178L94 198L118 200L104 180Z" fill="${c2}"/><path d="M140 178L146 198L122 200L136 180Z" fill="${c2}"/><path d="M120 204L120 240" stroke="${d}" stroke-width="2"/><circle cx="120" cy="214" r="2" fill="${d}"/><circle cx="120" cy="228" r="2" fill="${d}"/>`;
    case "blazer": return base + `<path d="M100 180L120 230L140 180Z" fill="${c2}"/><path d="M104 180L120 200L136 180" fill="${shade(c2, -0.12)}"/><path d="M98 180L84 206L102 214L120 232L106 196Z" fill="${d}"/><path d="M142 180L156 206L138 214L120 232L134 196Z" fill="${d}"/><circle cx="124" cy="236" r="2.4" fill="${hi}"/>`;
    case "labcoat": return `<path d="${TORSO}" fill="#eceef0"/><path d="M148 180C188 188 212 206 214 240L170 240C176 214 168 196 148 186Z" fill="#cfd4da"/>` +
      `<path d="M102 180L120 226L138 180Z" fill="${col}"/><path d="M106 180L120 200L134 180" fill="${d}"/><path d="M98 180L82 212L104 216L120 236L106 194Z" fill="#dde1e6"/><path d="M142 180L158 212L136 216L120 236L134 194Z" fill="#c9ced5"/><rect x="150" y="214" width="20" height="14" rx="2" fill="#cfd4da"/><path d="M155 214L155 206M161 214L161 204" stroke="${c2}" stroke-width="2.4" stroke-linecap="round"/>`;
    case "sweater": return base + `<path d="M98 180Q120 204 142 180" stroke="${d}" stroke-width="10" fill="none" stroke-linecap="round"/>` + [60, 80, 160, 180].map((x) => `<path d="M${x} 214l6 8l6-8" stroke="${hi}" stroke-width="2.4" fill="none" opacity=".5"/>`).join("");
    case "turtleneck": return base + `<path d="M104 150L136 150L140 190Q120 198 100 190Z" fill="${col}"/><path d="M104 160Q120 166 136 160M103 170Q120 176 137 170M102 180Q120 186 138 180" stroke="${d}" stroke-width="2.2" fill="none"/>`;
    case "jacket": return base + `<path d="M118 180L118 240" stroke="${shade(col, -0.5)}" stroke-width="3"/><path d="M96 178L86 200L110 196L116 182Z" fill="${d}"/><path d="M144 178L154 200L130 196L124 182Z" fill="${d}"/><path d="M104 180L120 196L136 180Z" fill="${c2}"/>` + `<path d="M50 230L70 226" stroke="${hi}" stroke-width="2" opacity=".4"/>`;
    case "cardigan": return base + `<path d="M102 180L120 226L138 180Z" fill="${c2}"/><path d="M106 180Q120 192 134 180" stroke="${c2d}" stroke-width="3" fill="none"/>` + [196, 212, 228].map((y) => `<circle cx="${y > 220 ? 126 : 124 + (226 - y) * 0.2}" cy="${y}" r="2.6" fill="${hi}"/>`).join("") + `<path d="M102 180L120 226M138 180L120 226" stroke="${d}" stroke-width="3"/>`;
    case "robe": return base + `<path d="M98 180L120 240L142 180" stroke="${c2}" stroke-width="8" fill="none"/>`;
    case "vest": return `<path d="${TORSO}" fill="${c2}"/>` + `<path d="M26 240C28 206 52 188 92 180L106 180L120 240Z" fill="${col}"/><path d="M214 240C212 206 188 188 148 180L134 180L120 240Z" fill="${d}"/><path d="M106 180L120 200L134 180Z" fill="${skin}"/>`;
    default: return base;
  }
}
function neckwear(kind, col) {
  const d = shade(col, -0.28);
  if (kind === "bowtie") return `<path d="M120 190L102 180L102 200Z M120 190L138 180L138 200Z" fill="${col}"/><rect x="115" y="185" width="10" height="10" rx="3" fill="${d}"/>`;
  if (kind === "tie") return `<path d="M115 186L125 186L128 194L120 232L112 194Z" fill="${col}"/><path d="M115 186L125 186L122 194L118 194Z" fill="${d}"/>`;
  if (kind === "scarf") return `<path d="M98 172C110 186 130 186 142 172L148 186C132 200 108 200 92 186Z" fill="${col}"/><path d="M128 190L136 236L150 232L140 186Z" fill="${d}"/><path d="M134 204L146 202M136 216L148 214" stroke="${shade(col, 0.25)}" stroke-width="2.4"/>`;
  if (kind === "pendant") return `<path d="M104 182Q120 206 136 182" stroke="#d9b45c" stroke-width="1.6" fill="none"/><path d="M120 200L125 206L120 214L115 206Z" fill="#d9b45c"/>`;
  if (kind === "medal") return `<path d="M108 182L116 206M132 182L124 206" stroke="#c33" stroke-width="5"/><circle cx="120" cy="210" r="8" fill="#e2b94d"/><circle cx="120" cy="210" r="4" fill="#f4d98a"/>`;
  return "";
}

// ---------- facial hair ----------
function beard(kind, c, f) {
  const d = shade(c, -0.25);
  const { w, B } = f, L = 120 - w / 2, R = 120 + w / 2;
  if (kind === "full") return `<path d="M${L + 1} 118C${L + 2} 146 96 ${B + 10} 120 ${B + 12}C144 ${B + 10} ${R - 2} 146 ${R - 1} 118C${R - 8} 134 150 142 138 140C128 134 112 134 102 140C90 142 ${L + 8} 134 ${L + 1} 118Z" fill="${c}"/><path d="M104 134C112 128 128 128 136 134C130 132 110 132 104 134Z" fill="${d}"/><path d="M106 132C112 126 128 126 134 132C128 136 112 136 106 132Z" fill="${c}"/>`;
  if (kind === "goatee") return `<path d="M108 132C114 128 126 128 132 132C130 136 110 136 108 132Z" fill="${c}"/><path d="M110 148C112 160 128 160 130 148C126 152 114 152 110 148Z" fill="${c}"/>`;
  if (kind === "mustache") return `<path d="M120 132C112 126 100 128 96 136C104 134 112 136 120 136C128 136 136 134 144 136C140 128 128 126 120 132Z" fill="${c}"/><path d="M98 135C106 132 114 134 120 134" stroke="${d}" stroke-width="1.6" fill="none"/>`;
  if (kind === "walrus") return `<path d="M120 130C110 124 96 126 92 138C98 144 108 142 120 140C132 142 142 144 148 138C144 126 130 124 120 130Z" fill="${c}"/><path d="M100 136C108 132 116 134 120 134C124 134 132 132 140 136" stroke="${d}" stroke-width="2" fill="none"/>`;
  if (kind === "stubble") { let s = ""; for (let i = 0; i < 46; i++) { const a = Math.PI * (0.12 + 0.76 * (i / 46)); const rr = 34 + (i % 3) * 5; s += `<circle cx="${r1(120 + Math.cos(a) * rr * (w / 96))}" cy="${r1(120 + Math.sin(a) * rr * 0.95)}" r="0.9" fill="${c}" opacity=".55"/>`; } return `<path d="M${L + 4} 124C${L + 6} 146 98 ${B + 4} 120 ${B + 5}C142 ${B + 4} ${R - 6} 146 ${R - 4} 124C${R - 10} 138 150 146 120 146C90 146 ${L + 10} 138 ${L + 4} 124Z" fill="${c}" opacity=".18"/>` + s; }
  return "";
}

// ---------- eyes ----------
function eyeShape(kind, x, y) {
  if (kind === "almond") return `M${x - 11} ${y}C${x - 7} ${y - 8} ${x + 7} ${y - 8} ${x + 11} ${y - 1}C${x + 7} ${y + 6} ${x - 7} ${y + 6} ${x - 11} ${y}Z`;
  if (kind === "small") return `M${x - 7.5} ${y}C${x - 5} ${y - 6.5} ${x + 5} ${y - 6.5} ${x + 7.5} ${y}C${x + 5} ${y + 6} ${x - 5} ${y + 6} ${x - 7.5} ${y}Z`;
  // round
  return `M${x - 9.5} ${y}C${x - 9.5} ${y - 12} ${x + 9.5} ${y - 12} ${x + 9.5} ${y}C${x + 9.5} ${y + 11} ${x - 9.5} ${y + 11} ${x - 9.5} ${y}Z`;
}

function eyes(sp, u, skin, opts) {
  const kind = sp.eyes || "round", col = sp.eyeColor || "#5b3a24", lash = sp.lash || "#2a1c16";
  const fem = !!sp.lashes;
  const sleepy = sp.sleepy;
  let out = `<g class="c-eyes">`;
  for (const [x, side] of [[101, "l"], [139, "r"]]) {
    const y = 107, path = eyeShape(kind, x, y);
    const ir = kind === "small" ? 5 : 6.2;
    out += `<clipPath id="${u}e${side}"><path d="${path}"/></clipPath>`;
    out += `<path d="${path}" fill="#f7f3ee"/>`;
    out += `<g clip-path="url(#${u}e${side})"><g class="c-px"><g class="c-pupil"><circle cx="${x}" cy="${y + 0.5}" r="${ir}" fill="${col}"/><circle cx="${x}" cy="${y + 0.5}" r="${ir}" fill="url(#${u}iris)"/><circle cx="${x}" cy="${y + 0.5}" r="${ir * 0.5}" fill="#160f0c"/><circle cx="${x - ir * 0.36}" cy="${y - ir * 0.32}" r="${ir * 0.3}" fill="#fff"/><circle cx="${x + ir * 0.4}" cy="${y + ir * 0.42}" r="${ir * 0.13}" fill="#fff" opacity=".8"/></g></g>`;
    if (sleepy) out += `<path d="M${x - 13} ${y - 12}L${x + 13} ${y - 12}L${x + 13} ${y - 2}C${x + 5} ${y - 4} ${x - 5} ${y - 4} ${x - 13} ${y - 2}Z" fill="${skin}"/>`;
    // happy "smile" lower lids
    out += xg("happy", `<path d="M${x - 13} ${y + 13}C${x - 8} ${y + 3} ${x + 8} ${y + 3} ${x + 13} ${y + 13}Z" fill="${skin}"/><path d="M${x - 9} ${y + 6}C${x - 4} ${y + 3} ${x + 4} ${y + 3} ${x + 9} ${y + 6}" stroke="${shade(skin, -0.25)}" stroke-width="1.4" fill="none"/>`);
    out += `</g>`;
    // blink lid
    out += `<g class="c-lid"><path d="M${x - 12.5} ${y - 13}L${x + 12.5} ${y - 13}L${x + 12.5} ${y + 2}C${x + 7} ${y + 8} ${x - 7} ${y + 8} ${x - 12.5} ${y + 2}Z" fill="${skin}"/><path d="M${x - 10.5} ${y + 2}C${x - 5} ${y + 7} ${x + 5} ${y + 7} ${x + 10.5} ${y + 2}" stroke="${lash}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
    // upper lash line
    const top = kind === "almond" ? `M${x - 11} ${y}C${x - 7} ${y - 8} ${x + 7} ${y - 8} ${x + 11} ${y - 1}` : kind === "small" ? `M${x - 7.5} ${y}C${x - 5} ${y - 6.5} ${x + 5} ${y - 6.5} ${x + 7.5} ${y}` : `M${x - 9.5} ${y - 1}C${x - 9.5} ${y - 12} ${x + 9.5} ${y - 12} ${x + 9.5} ${y - 1}`;
    out += `<path d="${top}" stroke="${lash}" stroke-width="${fem ? 3 : 2.4}" fill="none" stroke-linecap="round"/>`;
    if (fem) { const ox = side === "l" ? x - 10 : x + 10, dir = side === "l" ? -1 : 1; out += `<path d="M${ox} ${y - 3}l${dir * 4} -4" stroke="${lash}" stroke-width="2.4" stroke-linecap="round"/>`; }
  }
  return out + `</g>`;
}

function brows(sp) {
  const col = sp.browColor || shade(sp.hair || "#3a2a20", -0.15);
  const th = sp.browTh || 5.5;
  let out = `<g class="c-brows">`;
  for (const e of EXPR) out += xg(e, BROWS[e].map(([a, b, c2, d, arch]) => `<path d="${brow(a, b, c2, d, arch, th)}" fill="${col}"/>`).join(""));
  return out + `</g>`;
}

function mouth(sp, skin) {
  const lip = sp.lip || shade(skin, -0.42), inside = "#4a1f22", tongue = "#e0707a", teeth = "#fbf7f2";
  const M = {
    neutral: `<path d="M107 140Q120 147 133 140" stroke="${lip}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    happy: `<path d="M103 136Q120 138 137 136Q134 156 120 156Q106 156 103 136Z" fill="${inside}"/><path d="M105 137Q120 139 135 137L134 142Q120 144 106 142Z" fill="${teeth}"/><ellipse cx="120" cy="151" rx="8" ry="4" fill="${tongue}"/>`,
    impressed: `<ellipse cx="120" cy="143" rx="7" ry="8.5" fill="${inside}"/><ellipse cx="120" cy="148" rx="4.5" ry="3" fill="${tongue}"/>`,
    worried: `<path d="M107 145Q113 139 120 143Q127 147 133 141" stroke="${lip}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
    thinking: `<path d="M114 143Q123 139 131 141" stroke="${lip}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
  };
  let out = `<g class="c-mouth">`;
  for (const e of EXPR) out += xg(e, M[e]);
  out += `<g class="m-talk m-a"><path d="M107 139Q120 141 133 139Q130 152 120 152Q110 152 107 139Z" fill="${inside}"/><ellipse cx="120" cy="148" rx="6" ry="3" fill="${tongue}"/></g>`;
  out += `<g class="m-talk m-b"><path d="M108 140Q120 145 132 140Q128 146 120 146Q112 146 108 140Z" fill="${inside}"/></g>`;
  return out + `</g>`;
}

function glasses(kind, col = "#1d1b1a") {
  if (!kind) return "";
  const lens = `fill="#bfe3ff" fill-opacity=".1"`;
  let s = "";
  if (kind === "round") s = `<circle cx="101" cy="107" r="14" stroke="${col}" stroke-width="3" ${lens}/><circle cx="139" cy="107" r="14" stroke="${col}" stroke-width="3" ${lens}/>`;
  else if (kind === "big") s = `<rect x="83" y="92" width="34" height="30" rx="9" stroke="${col}" stroke-width="3.6" ${lens}/><rect x="123" y="92" width="34" height="30" rx="9" stroke="${col}" stroke-width="3.6" ${lens}/>`;
  else if (kind === "half") s = `<path d="M86 108L116 108L114 118Q101 124 88 118Z" stroke="${col}" stroke-width="2.6" ${lens}/><path d="M124 108L154 108L152 118Q139 124 126 118Z" stroke="${col}" stroke-width="2.6" ${lens}/>`;
  else if (kind === "shades") s = `<path d="M84 98L118 98L116 112Q101 122 86 112Z" fill="${col}"/><path d="M122 98L156 98L154 112Q139 122 124 112Z" fill="${col}"/><path d="M90 102L104 102" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/>`;
  else s = `<rect x="86" y="96" width="30" height="22" rx="5" stroke="${col}" stroke-width="3" ${lens}/><rect x="124" y="96" width="30" height="22" rx="5" stroke="${col}" stroke-width="3" ${lens}/>`;
  const bridge = kind === "half" ? `<path d="M116 108Q120 104 124 108" stroke="${col}" stroke-width="2.4" fill="none"/>` : `<path d="M${kind === "round" ? 115 : 117} 104Q120 100 ${kind === "round" ? 125 : 123} 104" stroke="${col}" stroke-width="3" fill="none"/>`;
  return `<g class="c-glasses">${s}${bridge}<path d="M84 104L72 100M156 104L168 100" stroke="${col}" stroke-width="3" stroke-linecap="round"/>${kind !== "shades" ? `<path d="M92 99L98 97M130 99L136 97" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>` : ""}</g>`;
}

// ---------- arms (poses) ----------
// forearm from (x1,y1) (off-frame) to the wrist (x2,y2); hands are drawn as separate small shapes.
function forearm(x1, y1, x2, y2, sl, w = 30) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const a = w / 2, b = w * 0.36;
  const p = [[x1 + nx * a, y1 + ny * a], [x2 + nx * b, y2 + ny * b], [x2 - nx * b, y2 - ny * b], [x1 - nx * a, y1 - ny * a]].map(([x, y]) => r1(x) + " " + r1(y));
  const cx = x2 - (dx / L) * 7, cy = y2 - (dy / L) * 7;
  return `<path d="M${p[0]}L${p[1]}Q${r1(x2 + (dx / L) * 4)} ${r1(y2 + (dy / L) * 4)} ${p[2]}L${p[3]}Z" fill="${sl}"/><path d="M${p[1]}L${p[0]}L${r1(x1 + nx * a * 0.2)} ${r1(y1 + ny * a * 0.2)}L${r1(x2 + nx * b * 0.15)} ${r1(y2 + ny * b * 0.15)}Z" fill="${shade(sl, -0.2)}" opacity=".5"/>` +
    `<path d="M${r1(cx + nx * (b + 1))} ${r1(cy + ny * (b + 1))}L${r1(cx - nx * (b + 1))} ${r1(cy - ny * (b + 1))}" stroke="${shade(sl, -0.3)}" stroke-width="5" stroke-linecap="round"/>`;
}
function fistUp(x, y, sk, skd, flip = 1) {
  // a raised fist seen from the front: knuckles on top, thumb across
  return `<g><rect x="${x - 13}" y="${y - 14}" width="26" height="26" rx="10" fill="${sk}"/>` +
    `<path d="M${x - 11} ${y - 6}h22M${x - 4} ${y - 14}v7M${x + 4} ${y - 14}v7" stroke="${skd}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M${x - 12 * flip} ${y + 2}Q${x} ${y + 6} ${x + 8 * flip} ${y}" stroke="${skd}" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
}
function pointUp(x, y, sk, skd) {
  return `<g><rect x="${x - 12}" y="${y - 10}" width="24" height="24" rx="10" fill="${sk}"/><rect x="${x - 5}" y="${y - 32}" width="10" height="28" rx="5" fill="${sk}"/>` +
    `<path d="M${x - 10} ${y - 1}h20M${x - 10} ${y + 6}h18" stroke="${skd}" stroke-width="1.6" stroke-linecap="round"/><path d="M${x - 3} ${y - 28}h6" stroke="${shade(sk, 0.25)}" stroke-width="2" stroke-linecap="round"/></g>`;
}
function arms(sp, skin) {
  const sl = sp.sleeve || sp.outfitColor || "#444", sk = skin, skd = shade(skin, -0.22);
  return `<g class="c-arms">
    <g class="pose p-think">${forearm(204, 262, 150, 186, sl)}<g><rect x="128" y="160" width="28" height="22" rx="10" fill="${sk}"/><rect x="146" y="138" width="9" height="26" rx="4.5" fill="${sk}" transform="rotate(14 150 150)"/><path d="M132 168h18M132 175h16" stroke="${skd}" stroke-width="1.6" stroke-linecap="round"/></g></g>
    <g class="pose p-cheer"><g class="arm-l">${forearm(58, 262, 50, 176, sl)}${fistUp(50, 166, sk, skd, 1)}</g><g class="arm-r">${forearm(182, 262, 190, 176, sl)}${fistUp(190, 166, sk, skd, -1)}</g></g>
    <g class="pose p-explain">${forearm(56, 262, 54, 184, sl)}${pointUp(54, 172, sk, skd)}</g>
  </g>`;
}

// ---------- creatures and machines ----------
function creature(sp, u) {
  const k = sp.kind;
  if (k === "robot") return robot(sp, u);
  const body = sp.body || "#f4c84a", d = shade(body, -0.22), hi = shade(body, 0.3), beak = sp.beak || "#f08a2b", beakD = shade(beak, -0.25);
  let head = "", eyeX = [101, 139], eyeY = 104, er = 13, browCol = sp.browColor || shade(body, -0.45);
  if (k === "chick") {
    head = `<ellipse cx="120" cy="112" rx="64" ry="62" fill="${body}"/><path d="M168 96C186 126 172 168 120 174C150 160 168 132 168 96Z" fill="${d}" opacity=".6"/><ellipse cx="96" cy="76" rx="20" ry="12" fill="${hi}" opacity=".55" transform="rotate(-20 96 76)"/>` +
      `<path d="M112 52C108 36 116 26 124 28C120 36 130 38 128 50C134 42 142 44 140 52" fill="${body}" stroke="${body}" stroke-width="4" stroke-linejoin="round"/>` +
      `<ellipse cx="86" cy="134" rx="10" ry="6" fill="#ff8f8f" opacity=".45"/><ellipse cx="154" cy="134" rx="10" ry="6" fill="#ff8f8f" opacity=".45"/>`;
  } else if (k === "owl") {
    head = `<path d="M60 70L66 34L92 56Z" fill="${d}"/><path d="M180 70L174 34L148 56Z" fill="${d}"/><ellipse cx="120" cy="108" rx="66" ry="64" fill="${body}"/><path d="M174 90C190 130 170 170 120 176C156 158 176 128 174 90Z" fill="${d}" opacity=".55"/>` +
      `<circle cx="99" cy="104" r="25" fill="${sp.disc || shade(body, 0.45)}"/><circle cx="141" cy="104" r="25" fill="${sp.disc || shade(body, 0.45)}"/>` +
      [0, 1, 2].map((i) => `<path d="M${104 + i * 12} 150l6 6l6-6" stroke="${d}" stroke-width="2.4" fill="none"/>`).join("");
    eyeX = [99, 141]; er = 15;
  } else if (k === "alien") {
    head = `<path d="M96 46L82 14M144 46L158 14" stroke="${d}" stroke-width="5" stroke-linecap="round"/><circle cx="82" cy="12" r="8" fill="${sp.glow || "#c6ff6b"}"/><circle cx="158" cy="12" r="8" fill="${sp.glow || "#c6ff6b"}"/>` +
      `<path d="M120 36C172 36 188 76 180 110C172 146 146 170 120 170C94 170 68 146 60 110C52 76 68 36 120 36Z" fill="${body}"/><path d="M178 92C184 134 160 166 120 170C150 156 170 128 170 92Z" fill="${d}" opacity=".6"/><ellipse cx="94" cy="62" rx="18" ry="10" fill="${hi}" opacity=".5" transform="rotate(-24 94 62)"/>`;
    eyeX = [98, 142]; eyeY = 106; er = 16;
  }
  // eyes (big, cartoon)
  let ey = `<g class="c-eyes">`;
  for (const [i, x] of eyeX.entries()) {
    const side = i ? "r" : "l";
    const shape = k === "alien" ? `M${x - 17} ${eyeY}C${x - 14} ${eyeY - 16} ${x + 10} ${eyeY - 16} ${x + 15} ${eyeY - 4}C${x + 12} ${eyeY + 12} ${x - 12} ${eyeY + 14} ${x - 17} ${eyeY}Z` : `M${x - er} ${eyeY}a${er} ${er} 0 1 0 ${er * 2} 0a${er} ${er} 0 1 0 ${-er * 2} 0Z`;
    ey += `<clipPath id="${u}e${side}"><path d="${shape}" transform="${k === "alien" && i ? `translate(${x * 2} 0) scale(-1 1)` : ""}"/></clipPath>`;
    ey += `<path d="${shape}" fill="${k === "alien" ? "#1a1626" : "#fbf8f2"}" transform="${k === "alien" && i ? `translate(${x * 2} 0) scale(-1 1)` : ""}"/>`;
    const ir = k === "alien" ? 6 : er * 0.62;
    ey += `<g clip-path="url(#${u}e${side})"><g class="c-px"><g class="c-pupil">${k === "alien" ? `<circle cx="${x - 4}" cy="${eyeY - 5}" r="5" fill="#fff" opacity=".9"/><circle cx="${x + 5}" cy="${eyeY + 5}" r="2.4" fill="#fff" opacity=".6"/>` : `<circle cx="${x}" cy="${eyeY + 1}" r="${ir}" fill="${sp.eyeColor || "#2b1d14"}"/><circle cx="${x - ir * 0.35}" cy="${eyeY - ir * 0.35}" r="${ir * 0.32}" fill="#fff"/><circle cx="${x + ir * 0.4}" cy="${eyeY + ir * 0.4}" r="${ir * 0.14}" fill="#fff"/>`}</g></g>`;
    ey += xg("happy", `<path d="M${x - er - 3} ${eyeY + er + 4}C${x - 8} ${eyeY + 2} ${x + 8} ${eyeY + 2} ${x + er + 3} ${eyeY + er + 4}Z" fill="${k === "owl" ? sp.disc || shade(body, 0.45) : body}"/>`) + `</g>`;
    ey += `<g class="c-lid"><path d="M${x - er - 2} ${eyeY - er - 2}h${er * 2 + 4}v${er + 2}c-6 6-${er * 2 - 8} 6-${er * 2 + 4} 0Z" fill="${k === "owl" ? sp.disc || shade(body, 0.45) : body}"/><path d="M${x - er + 1} ${eyeY}c6 5 ${er * 2 - 8} 5 ${er * 2 - 2} 0" stroke="${browCol}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
  }
  ey += `</g>`;
  // brows: simple strokes, offset per creature
  const by = eyeY - er - 8;
  const B = { neutral: [[0, 0], [0, 0]], happy: [[-3, -3], [-3, -3]], impressed: [[-8, -6], [-8, -6]], worried: [[2, -6], [2, -6]], thinking: [[-4, -3], [3, 2]] };
  let br = `<g class="c-brows">`;
  for (const e of EXPR) br += xg(e, eyeX.map((x, i) => { const [o, inn] = B[e][i]; const dir = i ? -1 : 1; return `<path d="M${x - dir * 13} ${by + o}Q${x} ${by + Math.min(o, inn) - 5} ${x + dir * 11} ${by + inn}" stroke="${browCol}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`; }).join(""));
  br += `</g>`;
  // mouth: beak for birds, small mouth for the alien
  let mo = `<g class="c-mouth">`;
  if (k === "chick" || k === "owl") {
    const cy = k === "owl" ? 128 : 132;
    const closed = `<path d="M108 ${cy}L132 ${cy}L120 ${cy + 14}Z" fill="${beak}"/><path d="M108 ${cy}L132 ${cy}L120 ${cy + 5}Z" fill="${shade(beak, 0.2)}"/>`;
    const open = `<path d="M106 ${cy - 3}L134 ${cy - 3}L120 ${cy + 5}Z" fill="${beak}"/><path d="M110 ${cy + 4}L130 ${cy + 4}L120 ${cy + 18}Z" fill="${beakD}"/><path d="M113 ${cy + 4}L127 ${cy + 4}L120 ${cy + 11}Z" fill="#7a2a2a"/>`;
    const M = { neutral: closed, happy: open, impressed: open.replace(/L120 \d+Z" fill="#7a2a2a"/, (m) => m), worried: `<path d="M110 ${cy + 1}L130 ${cy + 1}L120 ${cy + 11}Z" fill="${beak}"/>`, thinking: `<path d="M112 ${cy}L134 ${cy + 2}L122 ${cy + 12}Z" fill="${beak}"/>` };
    for (const e of EXPR) mo += xg(e, M[e]);
    mo += `<g class="m-talk m-a">${open}</g><g class="m-talk m-b">${closed}</g>`;
  } else {
    const lip = shade(body, -0.5);
    const M = { neutral: `<path d="M110 142Q120 148 130 142" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`, happy: `<path d="M106 140Q120 142 134 140Q130 154 120 154Q110 154 106 140Z" fill="#3a1830"/>`, impressed: `<ellipse cx="120" cy="146" rx="6" ry="7.5" fill="#3a1830"/>`, worried: `<path d="M110 147Q115 141 120 145Q125 149 130 143" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>`, thinking: `<path d="M114 146Q122 142 130 144" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/>` };
    for (const e of EXPR) mo += xg(e, M[e]);
    mo += `<g class="m-talk m-a"><ellipse cx="120" cy="146" rx="8" ry="6" fill="#3a1830"/></g><g class="m-talk m-b"><path d="M111 144Q120 148 129 144" stroke="${lip}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  }
  mo += `</g>`;
  const extra = xg("happy impressed", `<ellipse cx="${eyeX[0] - 8}" cy="${eyeY + 26}" rx="9" ry="5" fill="#ff7a8a" opacity=".45"/><ellipse cx="${eyeX[1] + 8}" cy="${eyeY + 26}" rx="9" ry="5" fill="#ff7a8a" opacity=".45"/>`) + sweat();
  // small body (wings / shoulders)
  const torso = k === "alien" ? outfit(sp.outfit || "jacket", sp.outfitColor || "#2b2f45", sp.outfitColor2 || "#9be15d", body) :
    `<path d="M40 240C40 196 74 170 120 170C166 170 200 196 200 240Z" fill="${shade(body, -0.08)}"/><path d="M52 236C48 214 58 196 74 188C70 206 70 222 74 238Z" fill="${d}"/><path d="M188 236C192 214 182 196 166 188C170 206 170 222 166 238Z" fill="${d}"/>` + (sp.neck ? neckwear(sp.neck, sp.neckColor || "#c33") : "");
  return { torso, head: head + ey + br + mo + extra + (sp.hat ? headwear(sp.hat, sp.hatColor || "#c33") : "") + (sp.glasses ? glasses(sp.glasses) : ""), neckSkin: "" };
}

function robot(sp, u) {
  const m = sp.body || "#9aa3ad", d = shade(m, -0.3), hi = shade(m, 0.35), led = sp.led || "#55e0ff", ledD = shade(led, -0.55);
  let head = `<path d="M120 40L120 22" stroke="${d}" stroke-width="5"/><circle cx="120" cy="18" r="7" fill="${led}"/><circle cx="120" cy="18" r="12" fill="${led}" opacity=".2"/>` +
    `<rect x="58" y="62" width="14" height="40" rx="6" fill="${d}"/><rect x="168" y="62" width="14" height="40" rx="6" fill="${d}"/>` +
    `<rect x="66" y="40" width="108" height="114" rx="${sp.round ? 46 : 28}" fill="${m}"/><path d="M174 80L174 126C174 142 162 154 146 154L120 154C150 144 166 120 166 80Z" fill="${d}" opacity=".45"/><path d="M80 56C92 48 108 46 124 46" stroke="${hi}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".7"/>` +
    `<rect x="76" y="84" width="88" height="44" rx="16" fill="#12151b"/><rect x="80" y="88" width="80" height="12" rx="6" fill="#fff" opacity=".05"/>` +
    [0, 1, 2].map((i) => `<circle cx="${84 + i * 8}" cy="142" r="2.4" fill="${d}"/>`).join("");
  let ey = `<g class="c-eyes">`;
  for (const [i, x] of [101, 139].entries()) {
    const side = i ? "r" : "l";
    ey += `<clipPath id="${u}e${side}"><rect x="${x - 13}" y="94" width="26" height="24" rx="7"/></clipPath>`;
    ey += `<g clip-path="url(#${u}e${side})"><rect x="${x - 13}" y="94" width="26" height="24" rx="7" fill="${ledD}" opacity=".5"/><g class="c-px"><g class="c-pupil"><rect x="${x - 7}" y="100" width="14" height="13" rx="4" fill="${led}"/><rect x="${x - 5}" y="102" width="5" height="4" rx="1.5" fill="#fff" opacity=".8"/></g></g>${xg("happy", `<path d="M${x - 14} 119C${x - 6} 108 ${x + 6} 108 ${x + 14} 119Z" fill="#12151b"/>`)}</g>`;
    ey += `<g class="c-lid"><rect x="${x - 14}" y="93" width="28" height="26" rx="7" fill="#12151b"/><path d="M${x - 10} 106h20" stroke="${led}" stroke-width="2.4" stroke-linecap="round" opacity=".8"/></g>`;
  }
  ey += `</g>`;
  const B = { neutral: [[0, 0], [0, 0]], happy: [[-2, -2], [-2, -2]], impressed: [[-6, -6], [-6, -6]], worried: [[3, -5], [3, -5]], thinking: [[-4, -4], [3, 3]] };
  let br = `<g class="c-brows">`;
  for (const e of EXPR) br += xg(e, [101, 139].map((x, i) => { const [o, inn] = B[e][i]; const dir = i ? -1 : 1; return `<path d="M${x - dir * 12} ${84 + o}L${x + dir * 10} ${84 + inn}" stroke="${led}" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>`; }).join(""));
  br += `</g>`;
  const bar = (w, h, extra = "") => `<rect x="${120 - w / 2}" y="${140 - h / 2}" width="${w}" height="${h}" rx="${Math.min(4, h / 2)}" fill="${led}" ${extra}/>`;
  let mo = `<g class="c-mouth">`;
  const M = { neutral: bar(28, 5), happy: `<path d="M104 136Q120 150 136 136" stroke="${led}" stroke-width="5" fill="none" stroke-linecap="round"/>`, impressed: `<circle cx="120" cy="140" r="7" stroke="${led}" stroke-width="4" fill="none"/>`, worried: `<path d="M104 142l6-5l6 5l6-5l6 5l6-5" stroke="${led}" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`, thinking: bar(16, 5, 'transform="translate(8 0)"') };
  for (const e of EXPR) mo += xg(e, M[e]);
  mo += `<g class="m-talk m-a">${bar(32, 11)}</g><g class="m-talk m-b">${bar(24, 4)}</g></g>`;
  const torso = `<path d="M30 240C32 206 56 186 96 180L144 180C184 186 208 206 210 240Z" fill="${shade(m, -0.12)}"/><path d="M144 180C184 186 208 206 210 240L170 240C176 214 166 194 144 186Z" fill="${d}" opacity=".6"/><rect x="104" y="156" width="32" height="28" rx="6" fill="${d}"/>` +
    `<rect x="94" y="198" width="52" height="26" rx="8" fill="#12151b"/><circle cx="108" cy="211" r="5" fill="${led}" opacity=".9"/><rect x="118" y="207" width="20" height="3" rx="1.5" fill="${led}" opacity=".6"/><rect x="118" y="213" width="14" height="3" rx="1.5" fill="${led}" opacity=".4"/>`;
  return { torso, head: head + ey + br + mo + sweat(), neckSkin: "" };
}

const sweat = () => xg("worried", `<path d="M170 78C174 86 178 92 174 96C170 100 164 96 166 90C167 86 168 82 170 78Z" fill="#9fd7ff" opacity=".85"/>`) +
  xg("impressed", `<path d="M182 56l3 8l8 3l-8 3l-3 8l-3-8l-8-3l8-3Z" fill="#ffe27a"/><path d="M58 70l2 5l5 2l-5 2l-2 5l-2-5l-5-2l5-2Z" fill="#ffe27a" opacity=".8"/>`);

// ---------- the builder ----------
// sp: character spec (see coaches.js / bots.js); opts: {bg:true, size, label, expr, pose, crop:"circle"|"none"}
export function charSVG(sp, opts = {}) {
  const u = "c" + (++UID).toString(36);
  const label = opts.label || sp.name || "Character";
  const bgA = (sp.bg && sp.bg[0]) || "#2a2a30", bgB = (sp.bg && sp.bg[1]) || shade(bgA, -0.45);
  let defs = `<radialGradient id="${u}bg" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></radialGradient>`;
  defs += `<radialGradient id="${u}iris" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>`;
  let body = "", head = "";
  if (sp.kind && sp.kind !== "human") {
    const c = creature(sp, u);
    body = c.torso; head = c.head;
  } else {
    const f = { ...FACES[sp.face || "oval"] };
    const skin = sp.skin || "#e8b896", skinD = shade(skin, -0.2), skinH = shade(skin, 0.18);
    const hairC = sp.hair || "#3a2a20";
    const fp = facePath(f);
    defs += `<clipPath id="${u}f"><path d="${fp}"/></clipPath>`;
    const sx = f.w / 98;
    const hs = hairStyle(sp.hairStyle || "short", hairC, f);
    const scaleHair = (g) => (g ? `<g transform="translate(120 0) scale(${r1(sx * 100) / 100} 1) translate(-120 0)">${g}</g>` : "");
    const L = 120 - f.w / 2, R = 120 + f.w / 2;
    // neck + body
    body = `<path d="M105 136L105 186Q120 196 135 186L135 136Z" fill="${skin}"/><path d="M105 150Q120 166 135 150L135 172Q120 180 105 172Z" fill="${skinD}" opacity=".7"/>` +
      outfit(sp.outfit || "tee", sp.outfitColor || "#3d4a5c", sp.outfitColor2, skin) + (sp.neck ? neckwear(sp.neck, sp.neckColor || "#b33") : "");
    // head
    head = `<g class="c-hair-back">${scaleHair(hs.back)}</g>`;
    head += `<g class="c-ears"><ellipse cx="${L + 1}" cy="112" rx="9" ry="13" fill="${skin}"/><ellipse cx="${R - 1}" cy="112" rx="9" ry="13" fill="${skin}"/><ellipse cx="${L + 1}" cy="113" rx="4.5" ry="7.5" fill="${skinD}"/><ellipse cx="${R - 1}" cy="113" rx="4.5" ry="7.5" fill="${skinD}"/>` +
      (sp.earrings ? `<circle cx="${L}" cy="130" r="${sp.earrings === "hoops" ? 7 : 3}" ${sp.earrings === "hoops" ? `stroke="#e0b450" stroke-width="2.6" fill="none"` : `fill="#e0b450"`}/><circle cx="${R}" cy="130" r="${sp.earrings === "hoops" ? 7 : 3}" ${sp.earrings === "hoops" ? `stroke="#e0b450" stroke-width="2.6" fill="none"` : `fill="#e0b450"`}/>` : "") + `</g>`;
    head += `<path d="${fp}" fill="${skin}"/>`;
    head += `<g clip-path="url(#${u}f)"><ellipse cx="${R + 8}" cy="${f.B - 26}" rx="${f.w * 0.3}" ry="${(f.B - f.T) * 0.62}" fill="${skinD}" opacity=".5"/><ellipse cx="96" cy="70" rx="22" ry="14" fill="${skinH}" opacity=".45" transform="rotate(-20 96 70)"/><path d="M${L} ${f.B - 30}C${L + 20} ${f.B + 4} ${R - 20} ${f.B + 4} ${R} ${f.B - 30}L${R} ${f.B + 10}L${L} ${f.B + 10}Z" fill="${skinD}" opacity=".18"/>` +
      `<path d="${fp}" fill="none" stroke="url(#${u}rim)" stroke-width="6"/><ellipse cx="120" cy="${f.B + 1}" rx="${r1(f.w * 0.26)}" ry="5" fill="${shade(skin, 0.3)}" opacity=".28"/></g>`;
    defs += `<linearGradient id="${u}rim" gradientUnits="userSpaceOnUse" x1="${r1(120 + f.w * 0.1)}" y1="0" x2="${R}" y2="0"><stop offset="0" stop-color="#fff6e6" stop-opacity="0"/><stop offset="1" stop-color="#fff6e6" stop-opacity=".55"/></linearGradient>`;
    if (sp.lines) head += `<path d="M84 112l-6 -2M84 117l-6 2M156 112l6 -2M156 117l6 2" stroke="${skinD}" stroke-width="1.6" stroke-linecap="round"/><path d="M104 128Q100 138 104 146M136 128Q140 138 136 146" stroke="${skinD}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/><path d="M100 70Q120 66 140 70M104 76Q120 73 136 76" stroke="${skinD}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>`;
    if (sp.freckles) head += [[92, 124], [97, 128], [88, 128], [148, 124], [143, 128], [152, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${shade(skin, -0.32)}"/>`).join("");
    if (sp.beard) head += beard(sp.beard, sp.beardColor || hairC, f);
    head += eyes(sp, u, skin);
    head += brows(sp);
    // nose
    const nose = sp.nose || "button";
    if (nose === "long") head += `<path d="M118 108C117 118 112 126 116 129C119 131 124 130 126 127" stroke="${skinD}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    else if (nose === "wide") head += `<path d="M110 126C108 120 114 118 116 122M130 126C132 120 126 118 124 122" stroke="${skinD}" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="120" cy="124" rx="9" ry="6" fill="${skinD}" opacity=".45"/>`;
    else head += `<path d="M116 122C118 127 124 127 126 122" stroke="${skinD}" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="121" cy="118" rx="4" ry="6" fill="${skinD}" opacity=".35"/>`;
    head += `<ellipse cx="117" cy="115" rx="2.2" ry="3" fill="${skinH}" opacity=".6"/>`;
    head += mouth(sp, skin);
    head += xg("happy impressed", `<ellipse cx="92" cy="128" rx="9" ry="5.5" fill="#ff6d78" opacity=".32"/><ellipse cx="148" cy="128" rx="9" ry="5.5" fill="#ff6d78" opacity=".32"/>`);
    if (sp.blush) head += `<ellipse cx="92" cy="128" rx="9" ry="5.5" fill="#ff6d78" opacity=".2"/><ellipse cx="148" cy="128" rx="9" ry="5.5" fill="#ff6d78" opacity=".2"/>`;
    if (sp.mole) head += `<circle cx="${sp.mole[0]}" cy="${sp.mole[1]}" r="1.8" fill="${shade(skin, -0.45)}"/>`;
    head += sweat();
    head += `<g class="c-hair-front">${scaleHair(hs.front)}</g>`;
    if (sp.hat) head += headwear(sp.hat, sp.hatColor || "#c33", f);
    head += glasses(sp.glasses, sp.glassesColor);
    body += "";
    sp = { ...sp, _skin: skin };
  }
  const skin = sp._skin || sp.body || "#e8b896";
  const armSp = sp.kind === "robot" ? { ...sp, sleeve: shade(sp.body || "#9aa3ad", -0.12) } : sp.kind && sp.kind !== "human" && sp.kind !== "alien" ? { ...sp, sleeve: shade(sp.body || "#f4c84a", -0.1) } : sp;
  const armSkin = sp.kind === "robot" ? shade(sp.body || "#9aa3ad", 0.1) : skin;
  defs += `<clipPath id="${u}bx"><rect width="240" height="240"/></clipPath>`;
  const bg = opts.bg === false ? "" : `<g class="c-bg" clip-path="url(#${u}bx)"><rect width="240" height="240" fill="url(#${u}bg)"/><circle cx="62" cy="58" r="70" fill="#fff" opacity=".05"/>${sp.pattern ? bgPattern(sp.pattern, bgA) : ""}</g>`;
  return `<svg class="char" viewBox="0 0 240 240" role="img" aria-label="${label.replace(/"/g, "")}" data-expr="${opts.expr || "neutral"}" data-pose="${opts.pose || "rest"}" data-char="${sp.id || ""}"><defs>${defs}</defs>${bg}<g class="c-root"><g class="c-breath"><g class="c-body">${body}</g><g class="c-head">${head}</g>${arms(armSp, armSkin)}</g></g></svg>`;
}

function bgPattern(kind, c) {
  const l = shade(c, 0.25);
  if (kind === "checks") { let s = ""; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) s += `<rect x="${i * 40}" y="${j * 40}" width="40" height="40" fill="${l}" opacity=".07"/>`; return s; }
  if (kind === "rays") { let s = ""; for (let i = 0; i < 12; i++) s += `<path d="M120 120L${120 + Math.cos((i / 12) * 6.283) * 220} ${120 + Math.sin((i / 12) * 6.283) * 220}L${120 + Math.cos(((i + 0.5) / 12) * 6.283) * 220} ${120 + Math.sin(((i + 0.5) / 12) * 6.283) * 220}Z" fill="${l}" opacity=".06"/>`; return s; }
  if (kind === "dots") { let s = ""; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) s += `<circle cx="${i * 32 + 8}" cy="${j * 32 + 8}" r="2" fill="${l}" opacity=".14"/>`; return s; }
  if (kind === "stars") return [[30, 40], [200, 30], [180, 90], [40, 170], [210, 200], [70, 110]].map(([x, y], i) => `<path d="M${x} ${y - 4}l1.2 2.8l2.8 1.2l-2.8 1.2l-1.2 2.8l-1.2-2.8l-2.8-1.2l2.8-1.2Z" fill="#fff" opacity="${0.25 + (i % 3) * 0.12}"/>`).join("");
  return "";
}

// Small avatar (no arms visible, circle crop is done in CSS).
export const avatarSVG = (sp, opts = {}) => charSVG(sp, { ...opts, pose: "rest" });
