# Noir Chess

A personal chess trainer with its own look: dark, premium, original animated art, and the depth of a top chess platform. It's built to take one player from zero to 2000.

**Open:** https://marianvassilev1978-cyber.github.io/noir-chess/. On iPhone: Safari → Share → Add to Home Screen. It works offline after the first load.

## What's inside
- **Play:** one-tap rated matchmaking against a pool of 2,000 generated players. Each has its own face, name, style, openings and habits, and you're always matched within ±50 of your rating. Plus 28 featured bots from 100 to 3200 in five tiers.
  - Bullet, blitz, rapid, classical and unlimited, rated or casual.
  - Premoves, confirm-move and browsing earlier positions during a game.
  - Bot chat, realistic draw offers and resignations, and a game-over sheet with your rating change and a quick accuracy.
- **Ratings:** Glicko-2, one per category (bullet, blitz, rapid, classical, puzzles). Provisional ("?") for the first 20 games.
- **Six original coaches** with their own voices: the Mentor, the Tactician, the Strategist, the Endgame Professor, the Opening Scientist and the Attacker.
- **Game Review:**
  - Every move classified, from brilliant to blunder.
  - Accuracy and estimated game rating, phase ratings, and an eval graph you can tap.
  - A coach walkthrough of the key moments with Show me, Why is my move bad? and Retry.
  - The Coach's verdict: three strengths, three fixes, and one exercise.
- **Analysis board:** a variation tree, top 3 engine lines with depth, an opening explorer, arrows and circles, PGN/FEN in and out, and practice against a bot from any position.
- **Puzzles:**
  - Rated puzzles, Puzzle Rush (3 min, 5 min, Survival), a Puzzle Duel against a bot, and the Daily Puzzle with a calendar streak.
  - Practice by theme, rating or your own mistakes.
  - Stats with a recommended theme.
- **Learn:**
  - 12 courses with animated covers, narrated by their coach.
  - 45 openings and gambits with Learn and Drill modes (spaced repetition) and "play this opening vs a bot".
  - A repertoire builder, the Endgame Gym, the vision trainer and "Recommended for you".
- **Profile:** an animated avatar, stats (rating history, results by colour, accuracy trend, openings report, records), 36 achievements, daily goals, and a searchable archive with PGN export.
- **Settings:**
  - Six animated themes, 21 boards, 16 piece sets and 3 sound sets.
  - Your coach, premoves, auto-queen, confirm moves and the default time control.
  - Backup and restore, plus credits.

## Build and test
- Build: `npm install && npm run build` writes `docs/`, which GitHub Pages serves. Every build gets a new service-worker cache version.
- Tests: `npx playwright test`. Headless Chromium runs in an iPhone 13 viewport against `docs/` (`tools/test/*.spec.mjs`). They cover the rules (checkmate, castling, en passant, promotion), premoves, abort/resign/leave, timeout, rating changes, Game Review, the analysis board, puzzles, Rush, Duel, lessons, opening drills, achievements, settings, backup and restore, the v2 → v3 migration, accessibility and a random-tap monkey test.
- Bot calibration: `node tools/calibrate.mjs` plays neighbouring bots against each other with native Stockfish and the app's own move-selection code (`src/botbrain.js`). It writes `src/bot-calibration.json` and `tools/calibration-log.md`.
- Content checks: `node tools/content-check.js`. Data builders: `tools/build-explorer.cjs`, `tools/build-eco.js`, `tools/make-sounds.cjs`.
- Architecture: see `ARCHITECTURE.md`. Art direction: see `public/art/STYLE.md`.

## Your progress
Everything is stored on the device (`localStorage`). Updates migrate old saves through versioned migrations (`src/store.js`, currently v3), and the untouched previous save is kept as `noirchess.backup.v2`. Use Settings → Backup to copy it.

## Credits
Stockfish 18 (GPLv3) via [stockfish.js](https://github.com/nmrugg/stockfish.js) · [chess.js](https://github.com/jhlywa/chess.js) (BSD-2) · puzzles and opening names from the [Lichess databases](https://database.lichess.org/) and [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0) · piece sets from [lichess-org/lila](https://github.com/lichess-org/lila) (licences listed in the app: GPLv2+, CC BY-NC-SA 4.0, CC BY 4.0, MIT, Apache 2.0, AGPLv3+, freeware) · default "Wood" sounds built from Kenney recordings ([Impact, Interface and Casino sounds](https://kenney.nl/assets/impact-sounds), CC0) · sounds "sfx" and "piano" by Enigmahack (AGPLv3+) · animation by [Motion](https://motion.dev) (MIT) · [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC) · iPhone haptics technique from [ios-haptics](https://github.com/tijnjh/ios-haptics) (MIT) · fonts [Inter](https://github.com/rsms/inter) and [Instrument Serif](https://github.com/Instrument/instrument-serif) (SIL OFL 1.1, files in `public/fonts`) · the achievement chime is synthesised by `tools/make-sounds.cjs`.

Every character, avatar, badge, course cover and background is original vector art drawn in code for this app (`src/art/`, style guide `public/art/STYLE.md`). This is a non-commercial personal project. Because it bundles GPL/AGPL components, the source is published here.
