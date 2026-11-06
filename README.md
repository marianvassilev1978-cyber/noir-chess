# Noir Chess

A personal chess trainer, built to take one player from zero to 2000.

**Open:** https://marianvassilev1978-cyber.github.io/noir-chess/ — on iPhone: Safari → Share → Add to Home Screen.

- Play 19 bots from 150 to full-strength Stockfish 18, in bullet, blitz, rapid, classical or unlimited, rated or practice, with premoves
- Live coach that classifies every move (Brilliant → Blunder), Game Review with accuracy, game rating, eval graph, better lines and retry
- Zero-to-2000 course: 12 levels, 77 lessons, 270 Stockfish-verified exercises, 94 linked videos
- 45 openings and gambits (202 lines) with learn and drill modes and spaced repetition; a Road-to-2000 repertoire
- Endgame Gym: 33 positions played against Stockfish and the Lichess tablebase
- 5,178 Lichess puzzles: rated, by theme, Puzzle Rush, daily; your own mistakes become puzzles
- Analysis board, vision trainer, 20 boards, 16 piece sets, 6 themes, works offline once installed

Build: `npm install && npm run build` → `docs/`.

## Credits
Stockfish 18 (GPLv3) via [stockfish.js](https://github.com/nmrugg/stockfish.js) · [chess.js](https://github.com/jhlywa/chess.js) (BSD-2) · puzzles and opening names from the [Lichess databases](https://database.lichess.org/) and [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0) · piece sets from [lichess-org/lila](https://github.com/lichess-org/lila) (licences listed in the app: GPLv2+, CC BY-NC-SA 4.0, CC BY 4.0, MIT, Apache 2.0, AGPLv3+, freeware) · default "Wood" sounds built from Kenney recordings ([Impact, Interface and Casino sounds](https://kenney.nl/assets/impact-sounds), CC0) · sounds "sfx" and "piano" by Enigmahack (AGPLv3+). Animation by [Motion](https://motion.dev) (MIT) · [canvas-confetti](https://github.com/catdad/canvas-confetti) (ISC) · iPhone haptics technique from [ios-haptics](https://github.com/tijnjh/ios-haptics) (MIT) · fonts [Inter](https://github.com/rsms/inter) and [Instrument Serif](https://github.com/Instrument/instrument-serif) (SIL OFL 1.1, files in `public/fonts`) · the achievement chime is synthesised by `tools/make-sounds.cjs`. Every character, avatar, badge, course cover and background is original vector art drawn in code for this app (`src/art/`, style guide `public/art/STYLE.md`). Non-commercial personal project. Because it bundles GPL/AGPL components, the source is published here.
