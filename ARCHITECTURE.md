# Noir Chess — architecture map

A static, offline-first PWA. No framework, no backend. `npm run build` bundles `src/` with esbuild into `docs/`, which GitHub Pages serves.

## Flow
- **`src/main.js`** builds the shell (bottom tab bar on phones, side rail on desktop, animated theme background), registers every view with the router, starts the engines and registers the service worker.
- **`src/router.js`**: an in-memory back stack (`go`, `back`, `rerender`). A view is `render(root, params) → cleanup?`. The URL hash mirrors the route on the standalone site so a reload lands on the same screen.
- **`src/store.js`**: the single state object, saved to `localStorage` (`noirchess.v2` key, versioned by `state.v`). `load()` runs versioned migrations (`v1 → v2 → v3`), never discarding data. Ratings use Glicko-2 (`src/glicko.js`), one per category (bullet, blitz, rapid, classical, puzzle).
- **`src/engine.js`**: two Stockfish 18 WASM workers. `PLAY` makes bot moves; `ANA` analyses (live coach, review, analysis board, hints). Each has a serial job queue and a result cache. All scores are from White's point of view.
- **`src/botbrain.js`**: pure move-selection logic (style re-weighting of MultiPV candidates, strength noise). It has no DOM access, so `tools/calibrate.mjs` runs the same code in Node against native Stockfish.
- **`src/bots.js`**: the bot roster (personality, style, openings, chat lines) and `botMove()`, which feeds the `PLAY` engine into `botbrain`.
- **`src/analysis.js`**: win-probability model, move classification, accuracy, phase ratings, full game review.
- **`src/coach.js`** + **`src/coaches.js`**: engine facts (material swing, hanging pieces, forks, mate threats, opening principles) turned into plain English, voiced by each coach's phrase templates.
- **`src/board.js`**: the interactive board (tap/drag, premoves, arrows and circles, badges, promotion picker).
- **`src/ui.js`** + **`src/util.js`**: shared components (player bars, eval bar/graph, line viewer, sheets, toasts, pills, rings) and helpers.
- **`src/art/`**: all original vector art. `motion.js` animates characters; `character.js` builds layered SVG characters; `badges.js`, `covers.js`, `scenes.js` draw badges, course covers, theme backgrounds and illustrations. Style rules: `public/art/STYLE.md`.
- **`src/views/*`**: one file per screen family.

## Content
`content/*.json` is loaded lazily with `loadJSON(name)` only when a screen needs it (puzzles, courses, openings, ECO names, explorer).

## Tests
`tools/test/*.spec.mjs` (Playwright, iPhone 13 viewport) run against the built `docs/`. `window.__noir` exposes test hooks (clock fast-forward, deterministic bot moves) only when `localStorage["noir.test"]` is set.
