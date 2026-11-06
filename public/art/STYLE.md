# Noir Chess — art direction

Every character, avatar, badge, cover, background and illustration in Noir Chess is original vector art drawn in code (SVG), animated with CSS transforms and opacity. No image generators, stock art, photos or downloaded art.

## The look
- **Bold flat vector.** Clean filled shapes, no black outlines. Edges are defined by colour and tone, not strokes. The only strokes are fine detail lines (lashes, the closed-eye line, mouth lines, glasses).
- **2–3 tones per material.** Every surface has a base tone, one shadow tone (about 18% darker, slightly cooler) and, where it helps, one highlight (about 12% lighter, warmer). Shadows fall to the lower right; light comes from the upper left.
- **Thick, simple shapes.** Big readable silhouettes that still work at 40 px. Hair is drawn as two or three large masses, never single strands.
- **Limited palette per character.** Skin (3 tones), hair (3 tones), one outfit colour (3 tones), one accent colour, eye colour. Nothing else.
- **Dark, premium backgrounds.** Charcoal and near-black with soft radial glows in the theme accent. Glows are low-contrast (max ~18% opacity) so text stays readable.

## Characters
- **Proportions (240 × 240 viewBox, bust):** head centre at (120, 100), head ~100 px wide and ~112 px tall, eyes on the vertical centre of the head at y ≈ 106, 40 px apart; mouth at y ≈ 138; shoulders start at y ≈ 178. Every character uses these anchors, so expressions and props line up across the cast.
- **Eyes carry the personality.** Large irises (r 6), a pupil (r 3) and one white glint at the upper left. Eyelids are separate shapes in skin colour (for blinking).
- **Layered groups, driven by code:** `c-root` › `c-body` (torso, clothes, `c-arms`) and `c-head` (`c-hair-back`, ears, face, `c-eyes` › `c-pupil` + `c-lid`, `c-brows`, nose, `c-mouth`, cheeks, `c-hair-front`, `c-acc`).
- **Expressions:** neutral, happy, impressed, worried, thinking. Each has its own brow and mouth shape; switching is an opacity cross-fade of 200–300 ms. Arms have poses (rest, think, cheer, explain).
- **Distinct people.** Each coach differs in at least three of: silhouette (hair or headwear), face shape, skin tone, age markers (lines, grey hair), accessory, outfit colour.
- **Creatures and machines** (bots such as the owl, the chick, the alien and the robots) use the same eye, brow and mouth anchors, so the motion system works on them unchanged.
- Never draw a real person, a real brand's mascot, or a character from an existing show or game.

## Motion (src/art/motion.js)
- Transforms and opacity only. Idle breathing (1.5% torso scale, 4.2 s), blinking every 2–6 s (140 ms), pupils that follow the last move, a gentle head tilt, a talking mouth loop while text types, celebrate and disappointment reactions, enter and exit.
- `prefers-reduced-motion`: no idle loops or reactions, only expression cross-fades.
- Anything off-screen is paused (IntersectionObserver), and blink timers stop.

## Badges and covers
- Badges are medallions (circle, shield, hexagon or star) in four metals: bronze, silver, gold, obsidian. A single emblem in the middle, a rim with a highlight arc, and a shine sweep on unlock.
- Course covers are 16:9 cards: a deep gradient in the course colour, a large central motif built from simple chess silhouettes, and slow drifting light.

## Accessibility
Every image gets a text alternative (`role="img"` + `aria-label`). Decorative backgrounds are `aria-hidden`.

## Motion craft (rules adopted from our animation study: the Kurzgesagt style guide and the Ben Marriott / Alan Becker lessons)
- **One light model.** Light from the upper left. Every character has a lit side, a soft shadow side, a 2–4%-wide **rim light** on the shadow edge, a **bounce light** under the chin (~30%), and a highlight toward the light.
- **Nothing is ever still.** Backgrounds drift, particles move on three parallax layers with one shared "wind", and glows breathe. No full-frame grain; texture lives only inside a hero shape.
- **Glows are stacked, wide and soft:** 3–4 discs, with intensity falling with radius (strength ~0.2), never a hard bloom.
- **Anticipation → action → settle.** A hero move has a wind-up (3–8% counter-move, or 0.9 scale) before it. Entrances overshoot 4–10% and settle within ~300 ms; text overshoots at most 4% and never bounces. Exits ease in (back-ease); impacts are not eased into.
- **Stagger.** Never start three or more siblings on the same frame. Use 50–100 ms gaps, ordered centre-out or by importance.
- **Follow-through.** Hair and accessories lag the head by 3–6 frames and swing a little further.
- **Eyes.** Blinks close in 4–5 frames, hold 1–2 and open in 8–10, 1.5–4 s apart, with one right after a look change. Looks (saccades) take 6–10 frames on a slight arc, then hold for at least 0.5 s. Breathing is about 1.5%.
- **Big moments get a burst:** a stacked glow, an impact ring growing to about 4×, and radial dashes. Used for brilliant moves, wins, solved puzzles and unlocked badges.
- **Text entrance:** a rise of at most 24 px, plus fade, plus a 6 px → 0 blur, on a steep ease-out.
