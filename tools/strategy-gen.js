// Generator for content/course-strategy.json (Level 10 — Strategy II, Level 12 — Thinking Like a 2000).
// FENs of opening/master-game positions are computed from move lists so they are always legal.
// Usage: node tools/strategy-gen.js
const fs = require("fs");
const path = require("path");
const { Chess, play } = require("./strategy-lib.js");
const { enPrise } = require("./strategy-viz.js");

const T = (text) => ({ type: "text", text });
const B = (fen, text, extra = {}) => ({ type: "board", fen, text, ...extra });
// Choice: options are written with the correct one at index `answer`; they are then shuffled
// deterministically (seeded by the question text) so the right answer is not always first.
function seeded(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000000) / 1000000; }; }
const C = (fen, text, options, answer, explain) => {
  const rnd = seeded(text); const idx = options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const opts = idx.map((i) => options[i]); const ans = idx.indexOf(answer);
  return fen ? { type: "choice", fen, text, options: opts, answer: ans, explain } : { type: "choice", text, options: opts, answer: ans, explain };
};
const X = (fen, text, solution, hint, explain, extra = {}) => ({ type: "exercise", fen, text, solution, hint, explain, ...extra });
const PL = (fen, text, goal, maxMoves, hint, explain) => ({ type: "play", fen, text, goal, maxMoves, hint, explain });
const F = (moves) => play(moves).fen();
const after = (fen, line) => play(line, undefined, fen);
function assert(cond, msg) { if (!cond) throw new Error("ASSERT: " + msg); }
const V = (url, channel, title) => ({ title, channel, url });

// ---------- master games and opening lines ----------
const BOTV = "1.c4 e6 2.Nf3 d5 3.d4 Nf6 4.Bg5 Be7 5.Nc3 O-O 6.e3 Nbd7 7.Bd3 c5 8.O-O cxd4 9.exd4 dxc4 10.Bxc4 Nb6 11.Bb3 Bd7 12.Qd3 Nbd5 13.Ne5 Bc6 14.Rad1 Nb4 15.Qh3 Bd5 16.Nxd5 Nbxd5 17.f4 Rc8";
const BOTV18 = F(BOTV);
const BOTV21 = F(BOTV + " 18.f5 exf5 19.Rxf5 Qd6 20.Nxf7 Rxf7");
const FISCH = "1.c4 e6 2.Nf3 d5 3.d4 Nf6 4.Nc3 Be7 5.Bg5 O-O 6.e3 h6 7.Bh4 b6 8.cxd5 Nxd5 9.Bxe7 Qxe7 10.Nxd5 exd5 11.Rc1 Be6 12.Qa4 c5 13.Qa3 Rc8 14.Bb5 a6 15.dxc5 bxc5 16.O-O";
const FISCH16 = F(FISCH);
const FISCH20 = F(FISCH + " Ra7 17.Be2 Nd7 18.Nd4 Qf8 19.Nxe6 fxe6");
const FISCH38 = F(FISCH + " Ra7 17.Be2 Nd7 18.Nd4 Qf8 19.Nxe6 fxe6 20.e4 d4 21.f4 Qe7 22.e5 Rb8 23.Bc4 Kh8 24.Qh3 Nf8 25.b3 a5 26.f5 exf5 27.Rxf5 Nh7 28.Rcf1 Qd8 29.Qg3 Re7 30.h4 Rbb7 31.e6 Rbc7 32.Qe5 Qe8 33.a4 Qd8 34.R1f2 Qe8 35.R2f3 Qd8 36.Bd3 Qe8 37.Qe4 Nf6");
const PANOV = "1.e4 c6 2.d4 d5 3.exd5 cxd5 4.c4 Nf6 5.Nc3 e6 6.Nf3 Be7 7.cxd5 Nxd5 8.Bd3 Nc6 9.O-O O-O 10.Re1";
const PANOV10 = F(PANOV);
const PANOV11 = F(PANOV + " Bf6");
const QGDX = "1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.cxd5 exd5 5.Bg5 c6 6.e3 Be7 7.Bd3 Nbd7 8.Qc2 O-O 9.Nf3 Re8 10.O-O Nf8 11.Rab1";
const QGDX11 = F(QGDX);
const QGDX13 = F(QGDX + " Ng6 12.b4 Bd6 13.b5");
const QGDX15 = F(QGDX + " Ng6 12.b4 Bd6 13.b5 Bd7 14.bxc6 bxc6");
const CKEX = F("1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3");
const FRENCH3 = F("1.e4 e6 2.d4 d5 3.e5");
const KID9 = F("1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 9.Ne1");
const KID11 = F("1.d4 Nf6 2.c4 g6 3.Nc3 Bg7 4.e4 d6 5.Nf3 O-O 6.Be2 e5 7.O-O Nc6 8.d5 Ne7 9.Ne1 Nd7 10.Nd3 f5");
const MAROCZY = F("1.e4 c5 2.Nf3 Nc6 3.d4 cxd4 4.Nxd4 g6 5.c4 Bg7 6.Be3 Nf6 7.Nc3 O-O 8.Be2 d6 9.O-O Bd7");
const FRENCH6 = F("1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6 6.a3");
const RUY12 = F("1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 Na5 10.Bc2 c5 11.d4 Qc7 12.Nbd2");
const RUYEX = F("1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 dxc6 5.O-O f6 6.d4 exd4 7.Nxd4 c5 8.Nb3 Qxd1 9.Rxd1");
const GIUOCO = F("1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O 7.Re1 a6 8.Bb3 Ba7");

// ---------- visualization positions (checked by assertions) ----------
const VZ1 = F("1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.cxd5 exd5");
{ const c = after(VZ1, "6.Nxd5 Nxd5 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8");
  const cnt = (t, col) => c.board().flat().filter((s) => s && s.type === t && s.color === col).length;
  assert(cnt("n", "b") === 2 && cnt("n", "w") === 1 && cnt("q", "w") === 0 && cnt("q", "b") === 0 && cnt("p", "w") === 7 && cnt("p", "b") === 6 && cnt("b", "w") === 1 && cnt("b", "b") === 1, "VZ1 material"); }
const VZ2 = F("1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 g6");
assert(after(VZ2, "5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5").isCheckmate(), "VZ2 mate");
const VZ3 = F("1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Bg5 e6 7.f4 Qb6");
{ const c = after(VZ3, "8.Qd2 Qxb2 9.Rb1 Qa3 10.e5 dxe5 11.fxe5 Nfd7"); const ep = enPrise(c).join(" ");
  assert(/wPe5/.test(ep) && !/wB|wN|wQ|wR/.test(ep), "VZ3 hanging " + ep); }
const VZ4 = F("1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4");
{ const c = after(VZ4, "4.Nxe5 Qg5 5.Nxf7 Qxg2 6.Rf1 Qxe4+ 7.Be2");
  const mates = c.moves({ verbose: true }).filter((m) => { const d = new Chess(c.fen()); d.move(m.san); return d.isCheckmate(); }).map((m) => m.san);
  assert(mates.length === 1 && mates[0] === "Nf3#", "VZ4 mates " + mates); }

// ---------- verified Lichess puzzle positions (after the opponent's first move) ----------
const PZ = {
  d5break: "3q4/5pbk/p3pnp1/6Bp/1P1P1N2/r1r4P/4QPP1/3RR1K1 w - - 3 34", // 2EtMC
  d5black: "5rk1/1p2b2p/p1ppq3/4n3/1PP1Q3/P3B3/6PP/R4BK1 b - - 2 23", // 0X4eT
  rdc1: "r1b3k1/ppR2pp1/3p4/3P1np1/8/8/P4PPP/3R2K1 w - - 0 19", // 0IpeQ
  trapq: "5r1k/3q1pp1/Q1p3rp/P3n3/3pPB2/1P1P3P/2P2PP1/R3R2K b - - 4 27", // 1ZUh5
  rxg7: "8/6rk/7p/3p4/3P4/P7/6R1/5K2 w - - 3 46", // 203eo
  bxd5: "8/5p2/2k2p1p/p2b1P2/1pBP2P1/1PpK3P/2P5/8 w - - 1 49", // 1uCCI
  qd2: "8/1p3p1p/6pk/2P5/1P1Q4/2K3P1/q7/8 w - - 4 41", // 108AA
  re7: "4r1k1/R2Q1pbp/6p1/1pq1r3/5p2/2P2B1P/PP3PP1/3R2K1 b - - 0 29", // 3PRf6
  qd7: "q6k/pb4p1/7p/1Qp1p3/8/3B2RP/PPP2rP1/7K w - - 1 26", // 3WJoW
  qh4: "3q1k1r/pp3pp1/4b3/2p5/3BP1p1/8/PP2BPP1/1R1Q1RK1 b - - 0 20", // 18RSh
  h5: "5R2/6pk/4p2p/3qP3/pp2p1QP/3r4/P4PP1/6K1 w - - 3 34", // 1GPVT
  bb2: "2n2rk1/5p1p/pq1p2p1/5r2/2B5/B1Q4P/5PP1/4R1K1 w - - 11 28", // 3aYih
  bxe4: "r3r1k1/1p2qppp/p1pQ4/5b2/4N3/1B3N2/PPP3PP/4R1K1 b - - 2 20", // 2vfX0
  qe6: "8/p3kq2/2p5/8/3P3P/4QP1K/8/8 b - - 0 47", // 31p59
  rd8: "2r5/p3k1pp/4p3/1P6/2PK3P/3R2P1/8/8 b - - 2 47", // 1LcUT
  kb3: "6k1/2p2p1p/p4QpP/1p6/3P4/P4R2/1PK1rPP1/4q3 w - - 4 27", // 22GPd
};

const levels = [];

// =====================================================================================
// LEVEL 10 — STRATEGY II
// =====================================================================================
const L10 = { id: "l10", title: "Level 10 — Strategy II", subtitle: "Pawn structures, piece quality, trades and prophylaxis: how 1800 players decide what to do", band: "1400–1900", lessons: [] };
levels.push(L10);

// ---------- 1. IQP ----------
L10.lessons.push({ id: "l10-iqp", title: "The isolated queen's pawn: with it and against it", minutes: 20, steps: [
  T("This lesson teaches the most common pawn structure in queen's-pawn openings: the **isolated queen's pawn (IQP)** — a pawn on d4 (or d5) with no friendly pawns on the c- and e-files. Level 5 named it. Here you learn **how to play it from both sides**, because between 1400 and 1900 you will get it from the Queen's Gambit, the Caro-Kann Panov, the Nimzo-Indian, the Alapin Sicilian and the Queen's Gambit Accepted — often several times a month.\n\nThe IQP is a trade: **dynamic strength now, static weakness later.**\n- **Strength (middlegame):** space, two half-open files (c and e) for the rooks, outposts on **e5 and c5** for the knights, and the **d4–d5 break**.\n- **Weakness (endgame):** the pawn cannot be defended by a pawn, and the square in front of it (**d5**) is a permanent hole where an enemy piece can sit forever.\n\nSo the rule of thumb is simple: **the IQP side wants a middlegame, the other side wants an endgame.**"),
  B(PANOV10, "A typical IQP from the Caro-Kann Panov. **White** will put a knight on **e5**, aim the bishop and queen at h7, and maybe lift a rook via e3 to the kingside. **Black** will fight for **d5**: ...Bf6, ...Nce7 or ...Ncb4, and trade pieces whenever possible.", { highlights: ["d4", "d5", "e5"], arrows: ["f3e5", "d4d5", "d3h7"] }),
  T("**Playing WITH the IQP (attacker's checklist):**\n1. **Avoid trades.** Every trade of minor pieces makes the pawn weaker and your attack smaller.\n2. **Knight to e5**, supported by d4. From there it eyes f7, c6 and g4.\n3. **Aim at the king**: bishop on d3/c2/b3, queen on d3 or h3 (or c2), a rook lift Re1–e3–g3/h3.\n4. **The d4–d5 break** — the key moment. Play it when your pieces are ready and the opponent's pieces are slightly misplaced: it opens files and diagonals in one move.\n5. **Do not wait.** If the attack stalls and pieces get traded, you are simply left with a weak pawn."),
  C(BOTV18, "**Botvinnik – Vidmar, Nottingham 1936.** White has the IQP and every white piece aims at the kingside: Ne5, Bg5, Bb3, Qh3, rooks on d1 and f1. White to move. Which move continues the IQP plan?",
    ["18.f5 — open the f-file and the e6-square for the attack", "18.a3 — a safe waiting move", "18.Bxd5 Nxd5 — trade a pair of minor pieces", "18.Rde1 — add support to the e-file"], 0,
    "**18.f5!** In the game Black took (18...exf5 19.Rxf5) and after 19...Qd6 20.Nxf7! the attack crashed through; Stockfish rates 18.f5 at about +3.4, clearly above the quiet moves (18.a3 about +2.2). The IQP side **must use its activity now**. a3 and Rde1 are slow, and 18.Bxd5? trades exactly the attacking bishop that makes the IQP worth having — after ...Nxd5 Black's knight blockades d5 and White's position loses its energy."),
  X(BOTV21, "Same game, after 18.f5 exf5 19.Rxf5 Qd6 20.Nxf7! Rxf7. White to move. Black's position is held together by the knight on **f6**, which protects the knight on **d5**. Remove the defender.",
    ["Bxf6"], "Take the knight that guards d5.",
    "**21.Bxf6!** After 21...Bxf6 22.Rxd5 (the game) White's rooks invade: 22...Qc6 23.Rd6 Qe8 24.Rd7 and Black resigned. If 21...Nxf6, then 22.Rxf6! opens the h3–c8 diagonal, and after any recapture 23.Qxc8+ wins the rook. Notice how the IQP did its job: d4 supported e5 and kept Black cramped while the pieces attacked. Stockfish gives about +7 after 21.Bxf6; the next best moves are clearly weaker."),
  T("**Playing AGAINST the IQP (defender's checklist):**\n1. **King safety first.** Most games lost against the IQP are lost to a kingside attack, not on the queenside.\n2. **Blockade d5.** The best blockader is a **knight** on d5: the pawn cannot attack it, and from d5 it touches c3, e3, b4 and f4.\n3. **Trade pieces** — especially White's attackers (the light-squared bishop, the e5-knight).\n4. **Pressure d4** with ...Nc6, ...Bf6, ...Rd8 and ...Qb6. A pinned or tied-up d-pawn means White's pieces become defenders.\n5. **Aim for the endgame.** With queens and two pairs of minor pieces off, the IQP is usually just a weakness.\n\nOne warning: trading on c3 (...Nxc3 bxc3) changes the structure into **hanging pawns** (c3+d4) — a different structure, which is the next lesson."),
  C(PANOV10, "Back to the Panov position. Black to move. Which plan fits the defender's checklist best?",
    ["...Bf6 and ...Nce7 or ...Ncb4: control and occupy d5, then trade pieces", "...f5 and ...Rf6: attack the white king first", "...e5: get rid of your own e-pawn to free the game", "...b5 and ...b4: start a queenside pawn storm"], 0,
    "**Control d5, then trade.** ...Bf6 hits d4, and a knight retreating to e7 (or jumping to b4) keeps a piece on d5 even after exchanges. Stockfish's top moves here are ...Bd7, ...Bf6 and ...Re8 — all quiet, all keeping the blockade. **...f5** weakens e6 and e5 and opens your own king (exactly what White wants). **...e5?** just loses a pawn: dxe5. **...b5** is a queenside storm with nothing to attack while White's pieces aim at your king."),
  X(PZ.d5break, "From a real game (Lichess puzzle). White has an IQP on d4, and Black's rooks have left the centre for the 3rd rank. The bishop on g5 pins the f6-knight to the black queen on d8. White to move — use the IQP's key break.",
    ["d5"], "The pawn break opens the d-file toward the queen and the e6-point.",
    "**34.d5!** After 34...exd5 35.Nxd5 the pinned f6-knight is attacked twice and cannot be held: Black has to give the queen (35...Qxd5 36.Rxd5 Nxd5), and White is clearly winning. Black's best is 34...Qc8, but 35.dxe6 fxe6 36.Nxe6 wins a pawn and opens the black king (Stockfish about +4). This is the d4–d5 break at its best: it opens lines **when the opponent's pieces are offside**."),
  T("**The rule to remember:** with the IQP, **attack before the endgame** — keep pieces, use e5 and the d4–d5 break. Against the IQP, **blockade d5 and trade pieces** — every exchange brings you closer to an ending where the pawn is just weak."),
], videos: [
  V("https://www.youtube.com/watch?v=QChF3qSHaP4", "ChessDojo", "How to Play Against the Isolated Queen Pawn"),
  V("https://www.youtube.com/watch?v=EfQflTtTDmA", "chessbrah", "How to Play with the Isolated Queen's Pawn | GM Yasser Seirawan"),
] });

// ---------- 2. Hanging pawns & chains ----------
L10.lessons.push({ id: "l10-pawn-breaks", title: "Hanging pawns and pawn chains: where to break", minutes: 20, steps: [
  T("This lesson teaches two structures where the whole game is about **one question: where do I put pressure, and which pawn break do I play?** Getting that right is what separates a 1500 plan (\"attack something\") from an 1800 plan (\"attack the one pawn that holds everything up\").\n\n**Hanging pawns** are two pawns side by side on the c- and d-files (c4+d4 for White, c5+d5 for Black) with **no pawns on the b- and e-files** next to them.\n- **Strong** while they stand side by side: they control four central squares and either one can advance to open lines.\n- **Weak** once one is forced to advance: the other becomes backward or isolated, and the square in front of the advanced pawn becomes a hole.\n\n**Against hanging pawns:** put rooks on the c- and d-files, attack the pawns with pieces, and **force one of them to move**. Then **blockade** the square in front of it."),
  B(FISCH16, "**Fischer – Spassky, World Championship game 6, Reykjavik 1972**, after 16.O-O. Black has **hanging pawns on c5 and d5**. Fischer's queen on a3 and rook on c1 already press on c5; the bishop on b5 controls the light squares. Black would like to play ...c4 or ...d4 only when it suits him — White's job is to make him do it at the wrong moment.", { highlights: ["c5", "d5"], arrows: ["a3c5", "c1c5"] }),
  C(FISCH20, "Same game, a few moves later (after 19...fxe6). Black's c5-d5 pawns now have an extra pawn on e6. Fischer played **20.e4!**. What does that move achieve?",
    ["It forces the pawns to commit: after ...d4 they are fixed, White gets a free e- and f-pawn majority and the light squares (Bc4 hits e6)", "It wins the d5-pawn by force", "It opens the e-file so the white rook can attack the black king", "It prepares Qa3-e7 with a mating attack"], 0,
    "**20.e4!** asks the pawns a question. If 20...dxe4, the c5-pawn is isolated and the e-pawns are weak. In the game Spassky chose **20...d4**: now d4 is a passed pawn, but it is **blockaded and immobile**, while White's e- and f-pawns roll forward (21.f4, 22.e5, later f5) and the bishop comes to c4 to hit e6. Stockfish rates the position as roughly equal at this exact moment — the point is long-term: Black's pawns lost their flexibility, and flexibility was their whole strength."),
  X(after(FISCH38, "38.Rxf6 gxf6").fen(), "The same game, move 39. Fischer's plan worked: the blockaded d4-pawn is useless, the e6-pawn is a monster, and Fischer has just given up a rook with **38.Rxf6! gxf6** to strip the black king. White to move — continue the attack.",
    ["Rxf6"], "Take the pawn that shields the king; your other rook joins the queen.",
    "**39.Rxf6!** — the king has no defenders left, and Qe5/Qf4 and Rxh6 ideas follow. The game went 39...Kg8 40.Bc4 Kh8 41.Qf4 and Spassky resigned (he is said to have joined the audience's applause). Stockfish: about +7.5 for 39.Rxf6, clearly more than any other move. The combination was only possible because the strategy came first: the hanging pawns were fixed, White's majority advanced and every white piece became active."),
  T("**Pawn chains: attack the base.** A pawn chain is a diagonal line of pawns, each protecting the next (for example White d4–e5 in the French, or d5–e4 in the King's Indian). The rear pawn — the **base** — is the only one not protected by a pawn. **If the base falls, the whole chain loses its support.** This idea comes from Nimzowitsch and it still decides games today.\n\nTwo practical rules:\n- **Break against the base first; hit the head (the front pawn) later**, when the base is fixed or the chain is already shaky.\n- **A chain points toward the side where its owner should attack.** White's d4–e5 points to the kingside, so White attacks there; Black, whose chain points the other way, plays on the queenside."),
  C(FRENCH3, "French Defence, Advance Variation. White's chain is **d4–e5**. Black to move. Which pawn break attacks the **base** of the chain?",
    ["...c5 — hits d4", "...f6 — hits e5", "...g5 — gains space", "...b6 — prepares ...Ba6"], 0,
    "**...c5** attacks d4, the base. Black follows with ...Nc6 and ...Qb6, piling up on d4; if d4 ever falls, e5 hangs too. **...f6** attacks the head and is also part of Black's plan — but usually **later**, after the pressure on d4 has tied White's pieces down. ...g5 and ...b6 don't touch the chain at all."),
  C(KID11, "King's Indian, Mar del Plata: White's chain is d5–e4, Black's is d6–e5, and Black has just played ...f5 (hitting e4, the base of White's chain). White to move. Which pawn break should White prepare?",
    ["c4–c5 — against d6, the base of Black's chain", "f2–f4 — against e5, the head of Black's chain", "g2–g4 — gain space on the kingside", "h2–h4 — open the h-file"], 0,
    "**c4–c5** (prepared with Bd2, f3, Rc1 or b4) attacks **d6, the base**. White's chain points to the queenside, so White attacks there; Black's chain points to the kingside, so Black plays ...f5–f4 and ...g5. This race is the whole opening. f2–f4 against the head is possible in other lines but does not fit this structure, and g4/h4 attack where Black is strongest."),
  X(PZ.d5black, "From a master game (Lichess puzzle). Black's d6-pawn is **backward** and White's queen sits on e4 in front of it. Black to move. Find the pawn break that frees the position with gain of time.",
    ["d5"], "A pawn break that attacks two things at once.",
    "**23...d5!** hits the queen on e4 and the c4-pawn at the same time. After 24.cxd5 cxd5 Black's backward pawn has become a strong central pawn, the queen must move, and the knight and bishop come alive (...Ng4 or ...Nc4 next). Stockfish rates it about +4 for Black; the quiet alternatives are only equal. **A good pawn break often gains a tempo** — that is why it works."),
  T("**The rule to remember:** against hanging pawns, **pressure them until one must advance, then blockade it**. Against a pawn chain, **break at the base** — and attack on the side your own chain points to."),
], videos: [
  V("https://www.youtube.com/watch?v=OlbF8j6_0KU", "Hanging Pawns", "Hanging Pawns | Chess Middlegames"),
  V("https://www.youtube.com/watch?v=ibe2x66VEdQ", "Hanging Pawns", "Pawn Breakthroughs | Chess Middlegames"),
] });

// ---------- 3. Minority attack ----------
L10.lessons.push({ id: "l10-minority", title: "The minority attack", minutes: 15, steps: [
  T("This lesson teaches a plan you can play for years: the **minority attack**. It arises in the Queen's Gambit Exchange (and, with colours reversed, in the Caro-Kann Exchange) — the **Carlsbad structure**: White pawns a2, b2, d4, e3 against Black pawns a7, b7, c6, d5.\n\nWhite has **two** queenside pawns (a, b) against **three** (a, b, c). Why attack with fewer pawns? Because the goal is not to break through — it is to **create a weakness**. White plays **b2–b4–b5** and exchanges on c6:\n- after **bxc6 bxc6**, Black has a **backward c6-pawn** on a half-open c-file, with a hole on c5 in front of it;\n- after **...cxb5**, Black's **d5-pawn is isolated**.\n\nThen White's pieces (Rc1, Qc2, a knight via a4 to c5) attack the new target. It is a slow plan, so you need to know it in advance — that is exactly why it is worth learning at 1600."),
  B(QGDX11, "The Carlsbad structure after 11.Rab1. The rook goes behind the b-pawn **before** the pawn moves. Next: b2–b4, a2–a4 (if needed) and b4–b5.", { highlights: ["c6", "d5"], arrows: ["b2b4", "b4b5"] }),
  C(QGDX15, "White has carried out the plan: 12.b4, 13.b5, 14.bxc6 bxc6. White to move. Which black pawn is now the long-term target, and why?",
    ["c6 — it is backward on the half-open c-file and no pawn can protect it", "d5 — it is isolated", "a7 — it is the last pawn on the a-file", "f7 — it is next to the black king"], 0,
    "**c6.** The b-pawn that could protect it is gone and the d-pawn is already ahead of it, so c6 can only be protected by pieces. White will play Rfc1, Qa4 or Qc2, and bring a knight via a4 to **c5** — the hole in front of c6. d5 is still protected by c6 here; it becomes the target only if Black recaptures differently."),
  C(QGDX13, "Here White has just played 13.b5. Suppose Black answers **13...cxb5** (instead of allowing bxc6). What has White achieved?",
    ["d5 is now an isolated pawn, and White gets the c-file and the b5-pawn as targets", "Nothing — the pawn structure is symmetrical", "White has won a pawn by force", "White's own king has become weak"], 0,
    "After ...cxb5 and Nxb5 (or Bxb5), Black's **d5-pawn has no neighbours**: it is an isolated pawn on a half-open file, and White's rooks are already waiting on the b- and c-files to attack it. Either way the minority attack has **created a weakness** — that was the whole aim."),
  C(QGDX11, "You are Black in this structure. What is the most common and most dangerous counterplay against the minority attack?",
    ["A kingside attack with pieces: ...Ne4, ...Ng6, ...f5, ...Qf6/...Rf6 — White's pieces are busy on the queenside", "Trading queens immediately", "Pushing ...h5–h4 to gain space", "Playing ...c5 at once to get hanging pawns"], 0,
    "**Go for the king.** White spends four or five moves on the queenside; Black uses them to build ...Ne4 (supported by d5 and ...f5), ...Ng6, ...Bd6 and a queen or rook swing to the kingside. Black can also meet b4–b5 with **...c5** in some lines, or stop it with ...a6 and ...b5 (accepting a hole on c5) — but the kingside plan is the classical answer. Trading queens without reason only helps White's slow plan."),
  C(CKEX, "Caro-Kann Exchange: 1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Nc6 5.c3. Who can play a minority attack here?",
    ["Black — with ...b5–b4 against White's a2-b2-c3 pawns", "White — with b2–b4–b5", "Nobody — the structure is symmetrical", "White — with f2–f4–f5"], 0,
    "**Black.** This is the Carlsbad structure with colours reversed: Black has two queenside pawns (a7, b7) against White's three (a2, b2, c3). So **Black** plays ...b5–b4 to leave White with a weak c3 or d4. Recognising the structure — not memorising the opening — tells you the plan."),
  T("**The rule to remember:** in the Carlsbad structure, **b4–b5 is not to break through, it is to create a weak pawn** (c6 or d5). Then attack that pawn with pieces — and watch for Black's kingside counterattack while you do it."),
], videos: [
  V("https://www.youtube.com/watch?v=IAQife0dSqc", "Hanging Pawns", "The Minority Attack | Chess Middlegames"),
  V("https://www.youtube.com/watch?v=kx-bKo7XB-w", "Chess Vibes", "Minority Attack Ideas, Concepts and Examples - A Clever Positional Strategy"),
  V("https://www.youtube.com/watch?v=WljySK5GZ0o", "Saint Louis Chess Club", "Minority Attack! | Pawn Structure - GM Yasser Seirawan - 2013.07.24"),
] });

// ---------- 4. Bishop pair ----------
L10.lessons.push({ id: "l10-bishop-pair", title: "The bishop pair and opening the position", minutes: 15, steps: [
  T("This lesson teaches how to **use** the two bishops — and how to fight against them. Level 5 told you the bishop pair is an advantage in open positions. At 1600–1900 the question is practical: **what do I actually do with them?**\n\nWhy the pair is strong: two bishops cover **both colours**, so there is no safe square for enemy pieces; they are long-range, so they work on **both wings** at once; and in endgames with pawns on both sides they are often worth about **half a pawn** extra.\n\n**With the bishop pair:**\n1. **Open the position** — pawn breaks and pawn exchanges create diagonals.\n2. **Take squares from the knights** — advance pawns so the knights have no outposts.\n3. **Don't trade one bishop cheaply.** Give one up only for a concrete gain (material, a wrecked structure, a good bishop against a bad knight).\n4. **Head for the endgame** — the bishops get stronger as the board empties.\n\n**Against the bishop pair:** keep the position **closed**, fix pawns, find **outposts** for your knights, and try to **trade one of the bishops** (then the pair is gone)."),
  B(RUYEX, "Ruy Lopez, Exchange Variation, after 9.Rxd1. White gave up the bishop pair on move 4 to damage Black's pawns: White has **four pawns against three** on the kingside, Black's queenside majority is doubled and cannot make a passed pawn by itself. Black's compensation is **the two bishops**. A whole opening is built on this trade.", { highlights: ["c8", "f8", "c6", "c5"] }),
  C(RUYEX, "In this Ruy Lopez Exchange position, what is White's long-term plan?",
    ["Trade pieces toward an endgame where the 4-against-3 kingside majority makes a passed pawn", "Open the position with c2–c4 and b2–b4", "Attack the black king with a pawn storm", "Win one of the bishops by force"], 0,
    "**Trade pieces and use the healthy majority.** In a pure pawn ending White would be winning, because Black's doubled c-pawns cannot make a passed pawn. Black wants the opposite: keep pieces, open lines for the bishops (...Bd7, ...O-O-O, ...Ne7–g6) and make the bishops matter before the endgame arrives. Both sides' plans follow from one trade — Bxc6 on move 4."),
  C("r4rk1/pp1n1pbp/3p2p1/2pPp3/2P1P3/8/PP1BBPPP/R4RK1 w - - 0 1", "White has the two bishops against bishop and knight, but the centre is locked (d5/e4 against d6/e5). White to move. What is the right plan?",
    ["Prepare a pawn break (a4 and b4, or g3 and f4) to open lines for the bishops", "Keep every pawn where it is and shuffle the pieces", "Trade the dark-squared bishop for the knight as soon as possible", "Push g4–g5 just to gain space, keeping the centre closed"], 0,
    "**Prepare a break.** In a locked centre the bishops have nothing to do — so you open a wing: a4 (also stopping ...b5) and later b4, or g3 and f4 against the e5-pawn. Stockfish's top moves here are a4 and g4 with about +0.7, which fits: White gains space first, then opens. Shuffling hands Black time for ...f5; trading a bishop for the knight throws away your trump."),
  C(null, "Your opponent has the bishop pair; you have bishop and knight. Which approach is best?",
    ["Keep the pawns fixed and the position closed, find an outpost for the knight, and look for a chance to trade one bishop", "Exchange as many pawns as possible to make the game simpler", "Attack immediately with a pawn storm on both wings", "Avoid any exchange of pieces"], 0,
    "**Closed position + outpost + trade one bishop.** Every pawn exchange opens a diagonal, so the side with the knight usually wants **fewer** pawn trades, not more. A pawn storm on both wings also opens lines. Trading one bishop (for your bishop or knight) ends the pair and turns the game into a normal minor-piece fight."),
  C(null, "When is it right to give up one bishop of your pair?",
    ["When the trade gains something concrete: material, a wrecked pawn structure, a good knight against a bad bishop, or a key defender removed", "Never — the pair is worth more than anything", "As soon as possible, to simplify the game", "Only in the opening"], 0,
    "**For a concrete gain.** The pair is a long-term edge of about half a pawn — a real tactic, a winning endgame or a ruined structure is worth more. In the Ruy Lopez Exchange, White gives up the pair on move 4 for exactly such a structural gain. What you must avoid is trading a bishop **for nothing**, just because a trade is available."),
  T("**The rule to remember:** with the two bishops, **open the position and head for the endgame**; against them, **keep it closed and trade one of them**."),
], videos: [
  V("https://www.youtube.com/watch?v=7_Qoh8B4b6A", "Hanging Pawns", "Power of the Bishop Pair | Chess Middlegames"),
  V("https://www.youtube.com/watch?v=0KSxYylEV5o", "Chess Vibes", "11 Ways To Use Your Bishops Effectively"),
] });

// ---------- 5. Space ----------
L10.lessons.push({ id: "l10-space", title: "Space advantage and what to do with it", minutes: 15, steps: [
  T("This lesson teaches what space is good for — and why so many players with more space still lose. **Space** means the squares behind your pawns where your pieces can move freely, plus the squares you control in the opponent's half. The side with more space can move pieces from wing to wing quickly; the cramped side's pieces get in each other's way.\n\n**With more space:**\n1. **Avoid exchanges.** Every trade gives the cramped side's remaining pieces more room.\n2. **Stop the freeing pawn breaks** — this is the main job (prophylaxis). The cramped side usually has one or two breaks that release everything.\n3. **Expand on the side where you have space**, and open the position when the opponent's pieces are badly placed.\n4. **Don't overextend**: advanced pawns can become targets, and the squares behind them can become holes.\n\n**With less space:** trade pieces (especially the opponent's best ones), prepare **one** freeing break well, and don't stay passive forever."),
  B(MAROCZY, "The **Maroczy Bind** (Sicilian Accelerated Dragon). White's pawns on **c4 and e4** control d5 and b5. Black's freeing breaks are **...b5** and **...d5** (sometimes ...f5). If they never come, Black is squeezed; if one comes at the right moment, Black is fine.", { highlights: ["d5", "b5"], arrows: ["c4d5", "e4d5"] }),
  C(MAROCZY, "You are White in the Maroczy Bind. White to move. Which plan fits the space advantage?",
    ["Avoid exchanges (Nc2 instead of allowing ...Nxd4), keep watching b5 and d5, then expand", "Trade knights with Nxc6 to simplify", "Push e4–e5 to win more space at once", "Play c4–c5 to open the c-file"], 0,
    "**Keep the pieces, keep the bind.** Stockfish's first choice is **10.Nc2**, sidestepping ...Nxd4 — exactly the space rule. Then White plays Qd2, Rac1/Rfd1, maybe f3 and b3, and meets ...a6 with a4 if ...b5 is coming. Nxc6 frees Black; e5 and c5 release the very squares (d5, b5) that make the bind work."),
  C(MAROCZY, "Same structure, but now you are **Black** and cramped. What is the right approach?",
    ["Trade pieces (especially a pair of knights), then prepare ...a6/...b5 or ...d5 carefully", "Wait passively and never move a pawn", "Attack the white king with ...h5–h4", "Play ...e5 at once and give White the d5-square"], 0,
    "**Trade, then break.** With fewer pieces, Black's position stops being cramped. Then one well-prepared break (...b5 or ...d5) equalises. ...h5–h4 attacks where Black has no space; ...e5 is a real idea in some Sicilians, but here it hands White a permanent outpost on d5 without freeing anything."),
  C(FRENCH6, "French Advance after 6.a3. White's pawn on **e5** gives White space on the kingside; Black's pawns on d5 and c5 give Black space on the queenside. Where should each side play?",
    ["White on the kingside (f4–f5, Bd3, Qg4 ideas), Black on the queenside (...c4, ...b5, pressure on d4)", "Both sides on the queenside", "White on the queenside, Black on the kingside", "Both sides should keep the position closed and wait"], 0,
    "**Play where you have space.** White's e5-pawn takes f6 and d6 from Black's pieces, so White's pieces have more room on the kingside — that is where White attacks. Black's space is on the queenside; that is where Black plays, attacking the base d4 (Level 10, lesson 2). Attacking where the opponent has more space means fighting with fewer pieces on a crowded wing."),
  C(null, "What is the main danger of a big space advantage?",
    ["Overextension: advanced pawns become targets and leave holes behind them", "The opponent will run out of moves and stalemate", "Your pieces will have too many squares", "There is no danger — more space is always good"], 0,
    "**Overextension.** Pawns cannot move back. A pawn on e5 or c5 is a strength while it is protected; if the cramped side manages to attack it and the protecting pawns are exchanged, it becomes a weakness and the squares behind it (d4, e4 ...) become entry points for enemy pieces. That is why the space side must keep its pieces coordinated **behind** its pawns."),
  T("**The rule to remember:** with more space, **avoid trades and stop the freeing break**; with less space, **trade pieces and prepare one break**."),
], videos: [
  V("https://www.youtube.com/watch?v=t81S1wLUOcU", "Hanging Pawns", "Space Advantage | Chess Middlegames"),
] });

// ---------- 6. Good and bad pieces ----------
L10.lessons.push({ id: "l10-pieces", title: "Good and bad pieces: improving your worst piece", minutes: 15, steps: [
  T("This lesson teaches how to **measure** a piece and how to **reroute** a bad one. Level 5 gave you the idea of the worst piece; here you learn to do it like a strong player, often over several moves.\n\nAsk four questions about each piece:\n1. **Mobility** — how many safe squares does it have?\n2. **Targets** — does it attack anything important?\n3. **Role** — is it defending something that matters? (A \"bad\" bishop that defends your weak pawns can be useful.)\n4. **Stability** — can a pawn chase it away?\n\nTypical bad pieces: a knight on the rim, a rook behind its own pawns, a bishop blocked by its own pawns, a queen tied to a pawn. **Typical fixes are journeys, not single moves**: Nb1–d2–f1–g3 in the Ruy Lopez, Nf3–e1–d3 in the King's Indian, a bishop going around its own chain (...Bd7–e8–h5), a rook lift (Ra1–a3–g3)."),
  B(RUY12, "Closed Ruy Lopez after 12.Nbd2. White's knight starts the classic journey **d2–f1–g3** (or e3), where it supports f5 and the kingside. Black's knight on **a5** is on the rim — it will come back via c6 after ...cxd4 cxd4, or go to c4.", { highlights: ["a5"], arrows: ["d2f1", "f1g3"] }),
  C(RUY12, "Same position, Black to move. Which black piece is the worst, and what is the fix?",
    ["The knight on a5 — bring it back to the centre with ...cxd4 and ...Nc6", "The bishop on e7 — trade it at once", "The queen on c7 — move it to b6", "The rook on f8 — it must go to e8 immediately"], 0,
    "**The a5-knight.** It attacks nothing and controls only rim squares. Stockfish's top lines start with **12...cxd4 13.cxd4** and ...Bd7 — after which the knight comes back via c6 (or jumps to c4), where it hits d4 and b4 instead of staring at the edge. The e7-bishop is passive but useful (it defends d6 and the king); the queen and rook are already on reasonable squares."),
  C(KID9, "King's Indian, 9.Ne1. Why did White retreat the knight from f3 to e1?",
    ["It is going to d3, where it supports the c4–c5 break and can also help f2–f4", "To defend the king against ...Ng4", "Because it was attacked", "To free f3 for the queen"], 0,
    "**Rerouting for the plan.** On f3 the knight blocks the f-pawn and does little for the queenside. On **d3** it supports **c5** (the break against the base of Black's chain, lesson 2) and covers f4. A good piece is not one on a \"nice\" square — it is one that **helps your plan**."),
  X(PZ.rdc1, "From a real game (Lichess puzzle). One white rook is already on the 7th rank. The other one stands behind your own d5-pawn — your worst piece. White to move.",
    ["Rdc1"], "Bring the passive rook to the open file.",
    "**19.Rdc1!** — the worst piece becomes the best. Now the bishop on c8 is attacked twice (Rc7 and Rc1) and defended only once (Ra8), and Rxc8+ is threatened. Black's best is to give the bishop back with 19...Be6 20.dxe6, and White is winning (Stockfish about +4.4). Notice: no check, no capture — just activation. Quiet passive moves like Re1 or f3 leave White worse."),
  X(PZ.trapq, "From a real game (Lichess puzzle). White's queen on **a6** went far away from the action — a typical \"bad piece\". Black to move. Punish it.",
    ["c5"], "Which black pawn stands between your g6-rook and the white queen?",
    "**27...c5!** The c6-pawn moves away and opens the 6th rank: now the rook on g6 attacks the queen — and every escape square is covered (b5, a7, b7 and c8 by the d7-queen, b6 by the rook, c4 by the knight, a8 by the f8-rook). White must give the queen for a rook: in the game 28.Qb6 Rxb6 29.axb6. A piece without squares is not only bad — it can be **trapped**. Stockfish rates 27...c5 at about +3.4; other moves are much weaker."),
  T("**The rule to remember:** every few moves, **find your worst piece and plan its journey** to a square where it helps your plan — and look for the opponent's worst piece to trap or exploit."),
], videos: [
  V("https://www.youtube.com/watch?v=jGqEtKqWL3U", "IM Zurability", "Improve the Position of Your Pieces | The \"Worst Piece\" Rule"),
  V("https://www.youtube.com/watch?v=-xBgogOs40g", "Dr. Can's Chess Clinic", "How to Identify and Fix Bad Pieces Like a Master!"),
] });

// ---------- 7. Two weaknesses ----------
L10.lessons.push({ id: "l10-two-weaknesses", title: "The principle of two weaknesses", minutes: 15, steps: [
  T("This lesson teaches how to win positions where you are better but there is no tactic: the **principle of two weaknesses**. It decides many games at 1800+, especially endgames.\n\n**One weakness can usually be defended.** The defender simply puts pieces next to it. But those pieces are now **passive**. So you **create a second weakness far away** — on the other wing, or in the king's position. The defender cannot cover both with the same pieces, and switching between them is slower for him than for you, because you choose where to strike.\n\nWhat counts as a weakness? A weak pawn, a hole, an entry square for your king or rook, an exposed king — and very often **a passed pawn**, because it forces a piece to stop it.\n\nThe method:\n1. **Fix and attack the first weakness** to tie the defender down.\n2. **Improve everything** — your king first in the endgame.\n3. **Open a second front** with a pawn advance on the other wing.\n4. **Switch** between the targets until something breaks."),
  B("2r3k1/p4ppp/2p1p3/2R5/8/1P2PP2/P5PP/6K1 w - - 0 1", "White's rook attacks **c6**; Black's rook defends it from c8 and is already passive. One weakness — it holds for now. White's plan: bring the king to the centre (Kf2–e2–d3–d4), then create a second target: a pawn advance on the kingside (e4, f4, g4–g5) or on the queenside (a4–a5, b4–b5).", { highlights: ["c6"], arrows: ["c5c6", "g1f2"] }),
  C("2r3k1/p4ppp/2p1p3/2R5/8/1P2PP2/P5PP/6K1 w - - 0 1", "In this position c6 is attacked once and defended once. White to move. What is the best plan?",
    ["Bring the king toward the centre first, then create a second weakness with a pawn advance", "Attack c6 again — with only one rook, there is nothing else to do", "Trade rooks at the first chance", "Push all the kingside pawns at once"], 0,
    "**King first, second front later.** Stockfish's top moves are **Kf2** and Kf1 (about +1.1) — exactly the plan. White cannot win c6 by attacking it alone, so the king walks to d4 and the pawns later make a second target. Trading rooks gives up the pressure; pushing every pawn at once creates weaknesses in your own camp."),
  C(null, "Why does the principle of two weaknesses work?",
    ["The defender's pieces cannot protect two targets far apart, and the attacker can switch faster", "Two weaknesses mean the opponent is two pawns down", "Because the attacker always has more pieces", "Because rook endings are always winning"], 0,
    "**Distance and time.** To defend one weakness, a piece must stand close to it. If the second weakness is on the other side of the board, the defending pieces must travel, while the attacker — who decides when and where to strike — is always one step ahead. That is why the second weakness should be **far** from the first."),
  C(null, "You have a lasting bind: your opponent's pieces are all passive and he can only wait. What should you do?",
    ["Improve every piece and your king before you break — there is no hurry", "Break through immediately before he can regroup", "Offer a draw", "Exchange all the pieces at once"], 0,
    "**Do not hurry.** When the opponent has no counterplay, every move you make improves your position and his cannot. Strong endgame players make several quiet improving moves before the decisive break, so that when they open the second front, everything is already in place. Rushing gives the defender exactly the activity he lacked."),
  C(null, "Which of these is **not** a typical way to create a second weakness?",
    ["Trading your last rook so the position becomes simpler", "Creating a passed pawn on the other wing", "Advancing pawns to fix enemy pawns on the colour of your bishop", "Opening a file toward the enemy king"], 0,
    "**Trading your last rook** usually kills the pressure — the weakness then has to be won by the king alone, which only works in specific pawn endings. A passed pawn, pawns fixed on your bishop's colour, and an open file toward the king are all classic second weaknesses."),
  T("**The rule to remember:** **one weakness is not enough — create a second one far away**, and switch between them. Improve everything first; do not hurry."),
], videos: [
  V("https://www.youtube.com/watch?v=KJ1jGqtIt2w", "Hanging Pawns", "The Principle of Two Weaknesses in the Endgame"),
  V("https://www.youtube.com/watch?v=XyjohMzvmUo", "Saint Louis Chess Club", "Principle of Two Weaknesses | Insane in the Endgame - GM Alex Lenderman"),
] });

// ---------- 8. Exchanges ----------
L10.lessons.push({ id: "l10-exchanges", title: "Exchanges: which pieces to trade and when", minutes: 20, steps: [
  T("This lesson teaches the skill that quietly decides most games between 1500 and 2000: **choosing the right exchanges**. Every trade changes the position permanently. Level 2 taught you trades that do not lose material; now the question is **which equal trades help you**.\n\n**The rules:**\n1. **Ahead in material → trade pieces, not pawns.** Behind → trade pawns, not pieces (fewer pawns means more drawing chances).\n2. **Trade your bad pieces, keep your good ones.** Trade the opponent's **best** piece (an outpost knight, an attacking bishop).\n3. **The cramped side wants trades; the side with space avoids them.**\n4. **The attacker avoids trades; the defender seeks them** — especially queens.\n5. **Trade the defenders** of what you are attacking.\n6. **Structure decides who wants the endgame**: the IQP side avoids it; the side with a healthy majority or a passed pawn wants it.\n7. **Before trading into a pawn ending, calculate it.** A king-and-pawn ending is pure calculation and there is no way back."),
  X(PZ.rxg7, "From a real game (Lichess puzzle). White to move. The rooks face each other on the g-file. Which trade wins?",
    ["Rxg7+"], "Imagine the position with no rooks at all. Who has the better pawns?",
    "**46.Rxg7+! Kxg7** and the pawn ending is winning: White's **a-pawn is an outside passed pawn**. 47.a4 — the black king must run to stop it, and the white king walks in and eats the d5- and h6-pawns. With rooks on (for example 46.a4 Ra7) the game is roughly equal. Stockfish: +7.5 after the trade, +0.3 without it. **Rule 7 in action — calculate the pawn ending, then trade.**"),
  X(PZ.bxd5, "From a real game (Lichess puzzle). White to move. Your opponent has offered a trade of bishops on d5. Accept it — but think about why first.",
    ["Bxd5+"], "Compare the kings and the pawns after the bishops are gone.",
    "**49.Bxd5+! Kxd5** — the king-and-pawn ending is winning for White (Stockfish about +6): after h4 the white king heads for c4, the d-pawn advances, and Black's king is overloaded between the d-pawn and its own queenside pawns. Any bishop move instead keeps a roughly equal bishop ending. Same lesson as before: the right trade is the one whose resulting position you have calculated."),
  X(PZ.qd2, "From a master game (Lichess puzzle). White to move. Black's queen is active and could start checking your king. Find the move that ends Black's counterplay for good.",
    ["Qd2+"], "A check that offers a trade Black cannot refuse.",
    "**41.Qd2+!** Black must trade queens (41...Qxd2+ 42.Kxd2) or lose more, and the king-and-pawn ending is winning even though Black has an extra pawn: White's **connected b- and c-pawns break through** (b5 and c6) while Black's king is far away on the kingside. Stockfish: about +6.5 after 41.Qd2+, below +0.5 for the quiet queen moves. The defender wanted queens on (perpetual check chances); the side with the better structure wanted them off."),
  C(null, "You are a pawn up in a middlegame with queens and rooks. Your opponent offers a queen trade. What should you usually do?",
    ["Accept — with fewer pieces the extra pawn counts more and his attacking chances disappear", "Refuse — you need the queen to attack", "Accept only if you can also trade all the pawns", "Refuse — never trade when you are ahead"], 0,
    "**Accept** (unless the endgame is bad for you for a specific reason, like a weak pawn structure or a much worse king). With less material on the board, a one-pawn advantage becomes relatively bigger, and the side that is behind loses its best hope: tactics against your king. That is rule 1 — trade pieces, not pawns."),
  C(null, "Your opponent has a knight on a protected outpost in the centre (for example on d5), and you have a knight and a bishop. Which trade should you want most?",
    ["Your minor piece for his outpost knight — even your good piece for it", "The queens", "A pair of rooks", "No trade at all"], 0,
    "**Trade the opponent's best piece.** A knight on a protected outpost can be worth more than a rook in practice, because nothing can chase it away. Giving a bishop or knight for it is usually correct, even if the piece you give is a good one. Queens or rooks do not change the real problem."),
  C(null, "You are a pawn down in a rook endgame (one rook each, four pawns against five). What should you try to trade?",
    ["Pawns — the fewer pawns remain, the closer you are to a known draw", "Rooks — a pawn ending will be easier to hold", "Nothing — keep everything", "Your king's pawns for his rook"], 0,
    "**Trade pawns, not pieces.** Rook endings with one extra pawn are often drawn, and every pawn exchange brings you closer to rook against rook-and-pawn, where the defensive techniques (Philidor, Level 6) hold. Trading rooks into a pawn ending a pawn down is usually lost — that is rule 7 working against you."),
  T("**The rule to remember:** before every trade ask **\"who wants the position that remains?\"** — material, structure, piece quality and king safety after the exchange decide it, not the exchange itself."),
], videos: [
  V("https://www.youtube.com/watch?v=IyCwrtM3BSk", "Remote Chess Academy", "When To Trade Pieces In Chess? [And When Not To]"),
  V("https://www.youtube.com/watch?v=rZb8mXs_QbE", "GothamChess", "When Should You Trade In Chess?"),
] });

// ---------- 9. Prophylaxis ----------
L10.lessons.push({ id: "l10-prophylaxis", title: "Prophylaxis at 1800: \"what does he want?\"", minutes: 20, steps: [
  T("This lesson teaches the habit that most separates 1800 players from 1500 players: **asking what the opponent wants before choosing your move.** Level 5 introduced prophylaxis. Here you turn it into a routine.\n\n**The question:** *\"If it were his move now, what would he play?\"* Imagine he could move twice in a row — find his best idea — then decide whether to stop it.\n\n**Kinds of prophylaxis:**\n1. **Stop a piece** from reaching a good square (h3 against ...Ng4 or ...Bg4).\n2. **Stop a pawn break** (a4 against ...b5; f4 against ...e5).\n3. **Overprotect** a key square or pawn before it is attacked.\n4. **King safety**: Kh1/...Kh8 out of a pin or check, a luft against back-rank tricks, ...Kb8 after queenside castling.\n5. **A prophylactic trade**: exchange the piece that would carry out his plan.\n\n**The cost rule:** prophylaxis must cost less than what it prevents. A move that stops nothing important, or stops a plan that was not dangerous, is just a lost tempo."),
  X(PZ.re7, "From a real game (Lichess puzzle). Black to move. Before you look for your own ideas: what does White want to play next? Then stop it.",
    ["R5e7", "Qxe7", "Rxe7"], "White's queen and rook are both on the 7th rank, aiming at f7 and g7.",
    "White threatens **Qxf7+** and then Qxg7# — the queen and the a7-rook together. **29...R5e7!** (the rook from e5) blocks the 7th rank and attacks the queen; after 30.Qxe7 Rxe7 Black has won the exchange and the 7th rank is closed (31.Ra8+ Bf8). Stockfish: +6.5. Natural-looking moves like 29...Qf8 or 29...R8e7 leave Black worse. **You only find this move if you ask what White wants first.**"),
  C(GIUOCO, "Italian Game (Giuoco Pianissimo). White to move. Black's pieces are ready for **...Ng4** (hitting f2 together with the a7-bishop) or **...Bg4** (pinning the f3-knight). Which move stops both?",
    ["h3", "Kh1", "Nbd2", "a4"], 0,
    "**9.h3** takes the g4-square from both the knight and the bishop. It is also Stockfish's first choice here. Kh1 removes the king from the a7–g1 diagonal but allows ...Bg4; Nbd2 is a useful developing move but does not stop either idea; a4 is useful against ...b5 but ignores the kingside. This is prophylaxis type 1: **stop a piece from reaching its square**."),
  C(MAROCZY, "Maroczy Bind, White to move. Black is planning ...a6 and ...b5 to break the bind. Which move would stop ...b5 once Black has played ...a6?",
    ["a2–a4", "b2–b4", "c4–c5", "Nd5"], 0,
    "**a4.** After ...a6, a4 means ...b5 can be met by axb5, and the c4-pawn keeps control of b5. It is prophylaxis type 2: **stop the freeing break**. The cost is the b4-square for a black knight — acceptable when nothing can use it. b4 invites ...a5; c5 gives up the bind; Nd5 trades pieces, which helps the cramped side (lesson 5)."),
  C(null, "What is the danger of too much prophylaxis?",
    ["You become passive: you stop ideas that were not dangerous and lose the time to make your own plan", "None — preventing ideas is always good", "You will run out of pawn moves", "It only matters in the endgame"], 0,
    "**Passivity.** Prophylaxis is a tool to keep control, not a way to avoid playing. Before a prophylactic move, ask: is his idea really dangerous? Does my move cost more than it saves? If not, play your own plan. The best players combine the two: a move that **stops his idea and improves your position at the same time**."),
  C(null, "Which routine fits the \"what does he want?\" habit best for an 1800 player in a 15+10 game?",
    ["Every move: 10 seconds asking what his last move wants and what his best plan is; longer at quiet moments when you choose a plan", "Only ask when he makes a check or capture", "Ask once per game, after the opening", "Never — calculate your own moves instead"], 0,
    "**Every move, briefly; longer at quiet moments.** The threat check from Level 2 handles immediate threats. The \"what does he want?\" question is its strategic big brother: it costs only seconds and it is most valuable exactly when nothing is happening — when beginners make random moves and strong players stop the opponent's plan."),
  T("**The rule to remember:** before every move ask **\"what would he play if it were his move?\"** — and stop it, if stopping it costs less than it saves."),
], videos: [
  V("https://www.youtube.com/watch?v=QgMVXBDJbZg", "Hanging Pawns", "Prophylaxis | Chess Middlegames"),
  V("https://www.youtube.com/watch?v=2wVVrS5DXKY", "Chessfactor", "Improve your Chess with Prophylaxis | Prophylactic Thinking | IM Andrey Ostrovskiy"),
  V("https://www.youtube.com/watch?v=N6WmHGKLaa8", "Chessable", "PROPHYLAXIS in Chess. GM Johan Hellsten explains."),
] });

// =====================================================================================
// LEVEL 12 — THINKING LIKE A 2000
// =====================================================================================
const L12 = { id: "l12", title: "Level 12 — Thinking Like a 2000", subtitle: "A real thinking process, deeper calculation, technique, defence, blitz skills, repertoire and an honest training plan", band: "1700–2000+", lessons: [] };
levels.push(L12);

// ---------- 1. Thinking process ----------
L12.lessons.push({ id: "l12-process", title: "A real thinking process for every move", minutes: 20, steps: [
  T("This lesson teaches a thinking process you can actually run every move — not a theory, a routine. Level 7 gave you candidates, forcing moves and the blunder check. At 1800–2000 the difference is **order and discipline**: the same five steps, every serious move, so nothing is skipped when you are nervous.\n\n**The five steps:**\n1. **Threat check.** What does his last move want? What would he play if it were his move? (Checks, captures, threats — and his plan.)\n2. **Candidates.** List 2–4 moves. Always include the forcing moves (checks, captures, threats) **and** one good quiet move.\n3. **Calculate the forcing lines first.** One line at a time, until the position is quiet.\n4. **Evaluate** the end positions: material, king safety, activity, structure. Compare candidates by their end positions, not by how they feel.\n5. **Blunder check** the chosen move: in the position after your move, what are **his** checks, captures and threats?\n\nTime: in a quiet position steps 1 and 5 take about 10 seconds each. Most of your thinking time belongs to steps 3 and 4 in critical positions."),
  C(PZ.qd7, "**Drill, step 1.** From a real game (Lichess puzzle). White to move. Before looking for your own move: what is Black threatening?",
    ["...Rxg2 or ...Bxg2+ — the rook on f2 and the bishop on b7 both hit g2, next to your king", "...Qf8, attacking f-file squares", "...e4, attacking the d3-bishop", "...c4, attacking the d3-bishop"], 0,
    "**g2.** The rook on f2 and the bishop on the long diagonal both attack g2, and the white king is on h1. ...Rxg2 or ...Bxg2+ will break the king's position (and the a8-queen behind the bishop makes it even stronger). ...e4 and ...c4 are threats too, but slower and smaller. **The biggest threat comes first.**"),
  X(PZ.qd7, "**Drill, steps 2–5.** Same position. Candidates: defend g2 passively (Kh2), grab a pawn (Qxc5), or something more forcing. White to move — find the move that meets the threat by creating a bigger one.",
    ["Qd7"], "Your rook on g3 already looks at g7. Add the queen — with a threat bigger than his.",
    "**26.Qd7!** threatens **Qxg7#** (queen and g3-rook together) and attacks the b7-bishop. Black's own threat comes too late: after 26...Bxg2+ 27.Kg1 Black must still stop the mate (27...Qf8), and 28.Rxg2 leaves White a piece up. Stockfish: about +5.7 for 26.Qd7, while passive moves like 26.Kh2 or 26.Qxc5 are only equal. **Steps 1 and 2 together found it**: knowing exactly what Black wanted (g2) pointed at the piece to attack (b7)."),
  C(PZ.qh4, "**Drill 2, step 1.** From a real game (Lichess puzzle). Black to move. What does White threaten?",
    ["Bxc5+ — a check that uncovers the white queen on d1 against your queen on d8", "Bxg7+ — winning the rook on h8", "e5, gaining space", "Bxg4 — winning a pawn"], 0,
    "**Bxc5+** is a **discovered attack**: the bishop leaves d4 with check, and the queen on d1 suddenly attacks your queen on d8. After the king moves, Qxd8 wins the queen. Bxg4 is also a threat, but a pawn is smaller than a queen. The threat check found the one thing you must deal with."),
  X(PZ.qh4, "**Drill 2, steps 2–5.** Same position. Your queen must leave the d-file — but where? Black to move.",
    ["Qh4"], "Get off the d-file with a threat of your own. Look at the h-file and the rook on h8.",
    "**20...Qh4!** leaves the d-file **and** threatens ...Qh1# (the rook on h8 supports the queen; f1, f2 and g2 are blocked by White's own pieces). If White plays 21.Bxc5+ Kg8 anyway, the mate threat is still there and he has to give up his queen with 22.Qd8+ Qxd8. Stockfish: about +7 for Black. Taking the bishop with 20...cxd4? runs into 21.Bxg4, and Black is clearly worse (about -3.4). **Steps 3–4 in action: the move that answers his threat with a bigger one wins.**"),
  X(PZ.h5, "**Drill 3: include the quiet candidate.** From a master game (Lichess puzzle). White to move. Checks and captures do not work here. Find the strong quiet move.",
    ["h5"], "Take the g6-square away from the black king.",
    "**34.h5!** threatens **Qg6#**: the h5-pawn protects g6, and the rook on f8 covers g8 and h8. Black has nothing better than desperate moves like 34...Rg3, and White wins (Stockfish about +6). The natural-looking 34.Rf4 or 34.a3 leave White worse, because Black's ...Rd1+ and ...Qxe5+ come first. A thinking process that only looks at forcing moves would never find this — **step 2 must always contain one quiet candidate**."),
  C(null, "You have found a strong move after calculating for 6 minutes. What should you do now?",
    ["Do the blunder check (his checks, captures, threats after your move), then play it", "Play it immediately — you already spent enough time", "Calculate all the other candidates again to be sure", "Look for an even better move for another 5 minutes"], 0,
    "**Blunder check, then play.** After a long calculation you are most likely to miss a simple reply in the final position — that is exactly when the 10-second check pays. Re-calculating everything or searching for a perfect move costs time you will need later; Level 7's rule holds: if a move takes more than about 5 minutes, you are often going in circles."),
  T("**The rule to remember:** **threat → candidates (forcing + one quiet) → calculate forcing lines → evaluate → blunder check.** Same order, every serious move."),
], videos: [
  V("https://www.youtube.com/watch?v=40rjYtAXuDQ", "Chess Thinking! with NM Dan Heisman", "Chess Thinking - 5 Essential Steps in Analytical Positions"),
  V("https://www.youtube.com/watch?v=O3tYz5gfx0A", "GM Noel Studer", "Inside a Grandmaster’s Thought Process (Blitz, Rapid, Classical)"),
] });

// ---------- 2. Visualization ----------
L12.lessons.push({ id: "l12-visualize", title: "Calculation depth and visualization drills", minutes: 20, steps: [
  T("This lesson trains the engine behind calculation: **seeing the board after several moves without moving the pieces.** At 1500 most players see 2–3 half-moves clearly; at 2000 you need 6–8 half-moves in forcing lines, with the final position still clear enough to evaluate.\n\n**How to train it:**\n1. **Read moves, then answer.** Each drill below gives you a start position and a sequence. Play it in your head — do **not** touch the board — then answer the question.\n2. **Name the pieces that moved.** At the end of a line, list where each moved piece now stands. Errors almost always come from a piece you \"forgot\" moved (or was captured).\n3. **Check the end position like a real one:** what is attacked, what is defended, whose move is it?\n4. **Solve puzzles from the diagram** to the end of the line before making the first move. If you are wrong, find exactly which square you mis-saw."),
  C(VZ1, "**Drill 1 (8 half-moves).** Start position on the board, White to move. In your head, play: **6.Nxd5 Nxd5 7.Bxd8 Bb4+ 8.Qd2 Bxd2+ 9.Kxd2 Kxd8**. What is the material balance at the end?",
    ["Black is up a knight for a pawn", "Material is equal", "White is up a pawn", "Black is up a queen for a bishop"], 0,
    "This is the famous **Elephant Trap** in the Queen's Gambit Declined. White won a pawn (Nxd5) and a queen (Bxd8); Black won a knight (Nxd5), a queen (Bxd2+) and a bishop (Kxd8); White also won Black's bishop (Kxd2). Net: **Black has an extra knight, White an extra pawn.** If you got it wrong, find the capture you lost track of — usually the check 7...Bb4+, which is why White cannot keep the queen."),
  C(VZ2, "**Drill 2 (5 half-moves).** White to move. Play in your head: **5.Nxe5 Bxd1 6.Bxf7+ Ke7 7.Nd5**. What is the final position?",
    ["Checkmate — Black's king has no squares", "Check, but the king escapes to e6", "Black is simply a queen up", "Stalemate"], 0,
    "**Checkmate — Légal's Mate.** The d5-knight checks the king on e7. Its squares: d6, d8 and f8 are blocked by Black's own pawn, queen and bishop; d7 is covered by the e5-knight; e6 and e8 by the f7-bishop; f6 by the d5-knight; and the bishop on f7 cannot be taken because the e5-knight protects it. Visualising exactly which piece covers which square is the skill. White gave up the queen and mated with three minor pieces."),
  C(VZ3, "**Drill 3 (8 half-moves).** Najdorf Poisoned Pawn. White to move. Play: **8.Qd2 Qxb2 9.Rb1 Qa3 10.e5 dxe5 11.fxe5 Nfd7**. Which white unit is now attacked and not defended?",
    ["The pawn on e5", "The bishop on g5", "The knight on c3", "The knight on d4"], 0,
    "**e5.** The knight on d7 attacks it and nothing defends it (the f-pawn itself went to e5, and the d4-knight does not cover e5). The c3-knight is attacked by the queen on a3 but defended by the queen on d2; the g5-bishop and d4-knight are not attacked at all. If you said c3, you forgot that Qd2 defends it."),
  C(VZ4, "**Drill 4 (7 half-moves).** White to move. Play: **4.Nxe5 Qg5 5.Nxf7 Qxg2 6.Rf1 Qxe4+ 7.Be2**. Black to move now. What wins at once?",
    ["7...Nf3#", "7...Qxe2+", "7...Nxc2+", "7...Qxc2"], 0,
    "**7...Nf3# — a smothered mate.** The knight checks the king on e1, and every square around the king is occupied by White's own pieces: d1 queen, f1 rook, d2 and f2 pawns, e2 bishop. The bishop on e2 could take the knight — but it is **pinned** by the queen on e4. 7...Qxe2+ looks strong, but White simply plays Qxe2. This is the Blackburne Shilling Gambit trap — every capture White made was greedy."),
  X(PZ.bb2, "**Drill 5: calculate a long line first.** From a master game (Lichess puzzle). White to move. The quiet first move starts a long forcing sequence. Calculate it fully before you play.",
    ["Bb2", "Qxf2+", "Kh1", "Re5", "Rxe5"], "Put the bishop on the long diagonal; if Black grabs on f2, your king hides on h1 and the e-file decides.",
    "**28.Bb2!** — the bishop joins the queen on the long diagonal. After 28...Qxf2+ 29.Kh1 White threatens **Qg7#**, and Black's queen on f2 is too far away to help. 29...Re5 blocks the diagonal, but **30.Rxe5!** removes the blocker: 30...dxe5 31.Qxe5 renews the mate threat (the game went 31...Qxb2 32.Qxb2), and other moves leave White a rook ahead. Stockfish: about +5. Five white moves, all clear only if you see the **final position**: queen and bishop on the long diagonal, black king without defenders."),
  X(PZ.bxe4, "**Drill 6.** From a real game (Lichess puzzle). Black to move. White's queen on d6 is attacking yours. Calculate the line to the end — the point comes on move four.",
    ["Bxe4", "Qxe7", "Rxe7", "Ng5", "Rae8"], "Take on e4 first. After the queens come off, the e-file pins are the point.",
    "**20...Bxe4!** 21.Qxe7 Rxe7 — Black has won a knight, and the bishop on e4 is defended by the rook. 22.Ng5 attacks it again (and eyes f7), but **22...Rae8!** defends it a second time. White cannot win the piece back: 23.Rxe4 Rxe4 24.Bxf7+ Kf8 25.Bxe8 Rxe8 leaves Black a knight up for a pawn. Stockfish: about +6. The key was seeing, four moves ahead, that the e-file belongs to Black."),
  T("**The rule to remember:** calculation is only as good as your **picture of the final position**. Train it daily: read a line, hold the board in your head, then check every moved piece before you evaluate."),
], videos: [
  V("https://www.youtube.com/watch?v=3jiJn8bjtYk", "ChessDojo", "Board Visualization Training for Chess Players"),
  V("https://www.youtube.com/watch?v=WChrD2tXiWQ", "Chessfactor", "How to Improve your Chess Visualization? | Chess Vision and Calculation Training | Alex Astaneh"),
] });

// ---------- 3. Converting ----------
L12.lessons.push({ id: "l12-convert", title: "Converting a winning position without counterplay", minutes: 20, steps: [
  T("This lesson teaches **technique**: turning +3 into a win without giving the opponent a single chance. Between 1700 and 2000 a huge number of points are lost here — players reach winning positions and then lose or draw them, because they keep playing for tactics instead of shutting the position down.\n\n**The technique:**\n1. **Kill counterplay first.** Ask \"what is his only hope?\" (a check sequence, a passed pawn, an attack on my king) and remove it — even before you push your own pawns.\n2. **Trade pieces, especially his active ones.** Every trade reduces his chances to swindle.\n3. **Keep your king safe** until the queens are off; then **activate it**.\n4. **Choose the simplest win, not the fastest.** A line that wins in 40 moves with no risk beats a line that wins in 15 moves if you calculated it right.\n5. **Giving back some material is fine** if it kills all counterplay.\n6. **Do not hurry** — when he has no play, every move of yours improves the position."),
  X(PZ.qe6, "From a real game (Lichess puzzle). Black to move — you are in check. You are even a pawn down, but your king is far more active. Queen endings are full of perpetual checks. Convert.",
    ["Qe6+", "Qxe6+", "Kxe6"], "Force the queens off with check.",
    "**47...Qe6+!** blocks the check with a counter-check and forces 48.Qxe6+ Kxe6 — the king-and-pawn ending is winning for Black: the king takes the d4-pawn and the a- and c-pawns run, while White's king on h3 is far away. Stockfish: about +5.5, while 47...Kd7 is only equal — the queens stay on and White checks forever. **Technique rule 2: trade his active piece, and the queen is the most active of all.**"),
  X(PZ.rd8, "From a master game (Lichess puzzle). Black to move. Material is equal, and White's king looks active on d4. Find the trade that wins.",
    ["Rd8+", "Ke3", "Rxd3+", "Kxd3", "Kd6"], "Check first, then trade on d3, then the king races to the centre.",
    "**47...Rd8+!** The white king must stay next to its rook (48.Kc5?? Rxd3), so 48.Ke3 **48...Rxd3+ 49.Kxd3 Kd6** — and the pawn ending is winning for Black: his king heads for c5, White's b5- and c4-pawns become targets, and Black's kingside majority will make a passed pawn. Stockfish: about +2.4, while 47...e5+ or ...Kd6 give White the advantage. Trading the rooks removed **all** counterplay; the king then did the rest."),
  X(PZ.kb3, "From a real game (Lichess puzzle). White to move. You are winning (Black's king is in a mating net on the dark squares), but your own king is in check from the rook on e2. Choose the safe square.",
    ["Kb3", "Qd1+", "Ka2"], "Your king must be safe from all the queen checks that follow.",
    "**27.Kb3!** Not 27.Kd3?? Qd2#. After 27...Qd1+ 28.Ka2 the king is safe, Black has only desperate sacrifices left, and White's threat Qg7# remains. Stockfish: about +7. Technique rule 3: **a winning position is only winning if your king survives** — the blunder check here is a king walk."),
  C(null, "You are a full piece up in a middlegame. Your opponent has one idea: a pawn storm against your king. What is the technical approach?",
    ["First neutralise the storm (trade pieces near your king, close the file, or give back a pawn), then use the extra piece", "Ignore it and attack on the other wing as fast as possible", "Keep all pieces on the board to have more attacking power", "Offer a draw to avoid risk"], 0,
    "**Neutralise first.** An extra piece wins by itself in the long run — it needs no hurry. The only way to lose is to let his single idea work. Trading the pieces near your king, closing the file he wants to open, or returning a pawn to stop the storm are all good technique. Racing on the other wing gives him the game he wants."),
  C(null, "Which of these is the best reason to choose a slower winning line over a faster one?",
    ["The slower line gives the opponent no counterplay at any point", "The slower line uses more of the clock", "The faster line wins more material", "The slower line keeps more pieces on the board"], 0,
    "**No counterplay at any point.** Technique is not about speed — it is about removing chances. The faster line is better only if you have calculated it to the end with certainty. In practical games, especially with less time, the safe line converts more often."),
  PL("6k1/5pp1/7p/8/8/7P/5PP1/R5K1 w - - 0 1", "**Play it out.** You are a full rook up against full-strength Stockfish. Win by checkmate — with no accidents.", "win", 50,
    "Activate the rook (Ra6 or Ra7 ties down the pawns), bring the king up, win a pawn or create a passed pawn, promote, then mate.",
    "Technique summary: **first make the extra piece active** (rook on the 6th or 7th rank, attacking pawns from the side), **then bring the king**, keep your own pawns safe, win a black pawn or make a passed pawn, push it with the king's support, and promote. Avoid back-rank accidents and never let the black king attack your pawns for free."),
  T("**The rule to remember:** in a winning position, **first ask what his only hope is and take it away** — then trade pieces, activate the king and win slowly."),
], videos: [
  V("https://www.youtube.com/watch?v=EGkjoDqXcTY", "Daniel Naroditsky", "Lesson with Levy (GothamChess)!! | Converting Winning Positions, Part 1 | GM Naroditsky"),
  V("https://www.youtube.com/watch?v=rK9W7ycNOpY", "GMBenjaminFinegold", "Converting Winning Positions with GM Ben Finegold"),
  V("https://www.youtube.com/watch?v=6z-pBnRNFl4", "Remote Chess Academy", "How to Convert Advantage into a Win"),
] });

// ---------- 4. Defending ----------
L12.lessons.push({ id: "l12-defend", title: "Defending bad positions and swindling", minutes: 20, steps: [
  T("This lesson teaches the other side of technique: **how to save bad positions.** At 1700–2000 many games are decided not by who played better but by who defended better. Opponents at this level often do not know the conversion technique from the last lesson — so a stubborn defence wins real points.\n\n**The defender's toolbox:**\n1. **Activity over material.** A pawn down with active pieces is often better than material equality with passive ones. Give a pawn back to activate a rook.\n2. **Look for drawing mechanisms**: perpetual check, stalemate tricks, **fortresses** (positions the stronger side cannot break), opposite-coloured bishops, rook endings (\"all rook endings are drawn\" is an exaggeration with a lot of truth), the wrong rook pawn.\n3. **Trade the right things**: pawns, not pieces (when material down) — or trade into a known drawn ending.\n4. **Set problems.** Choose moves that make the opponent think, not moves that make his life easy. Most swindles happen when the stronger side is short of time or relaxed.\n5. **Never resign a position you have not checked for perpetual check and stalemate.**"),
  X("5rk1/5p1p/8/8/8/8/qr1Q1PPP/6K1 w - - 0 1", "White to move. You are two rooks down, your queen is attacked by the rook on b2, and Black threatens mate on the back rank (...Rb1+). Save the game.",
    ["Qg5+", "Kh8", "Qf6+", "Kg8", "Qg5+"], "Look at the two dark squares next to the black king: g5 gives check on the open g-file, f6 on the long diagonal.",
    "**Qg5+ Kh8 Qf6+ Kg8 Qg5+** — perpetual check. The black king cannot escape: f8 is blocked by its own rook, h7 has its own pawn, and no black piece can block g7 or the g-file in time. Anything else loses at once (Black mates with ...Rb1+). Stockfish: 0.00 for Qg5+, -12 or worse for everything else. **Perpetual check is the defender's best friend — always look for it before resigning.**"),
  PL("7k/5R2/6K1/8/8/8/8/3b4 b - - 0 1", "**Hold the fortress.** Rook against bishop: you are Black, defending against full-strength Stockfish. Your king is in the corner h8, which is a **dark** square — the opposite colour of your light-squared bishop. Draw the game.", "draw", 30,
    "Keep your king in the corner that your bishop does NOT control (h8 here) and keep the bishop far away, checking the white king from a distance. Never put the bishop next to your king where it can be pinned or attacked with tempo.",
    "Rook against bishop is a draw when the defending king sits in the corner of the **opposite colour** to the bishop: from there, every mating try needs the white king on g6 and the rook on the 8th rank, and your bishop blocks or checks at the right moment. The losing mistakes are putting the bishop where it can be attacked with check, or letting the king be driven to the other corner (a8 or h1 — the light corners), where mating nets work. Tablebase: draw."),
  C(null, "You are a pawn down in a rook ending with pawns on both wings. Your rook is passive, defending a pawn from behind. What is usually best?",
    ["Activate the rook, even if it costs the weak pawn — an active rook draws more often than a passive one", "Keep defending the pawn passively", "Trade rooks to reach a pawn ending", "Advance all your pawns to create a passed pawn"], 0,
    "**Activity first.** A rook that attacks pawns or cuts off the enemy king creates counterplay; a rook tied to a pawn is just a target. Many rook endings two pawns down are still drawn with an active rook, while one pawn down with a passive rook often loses. Trading into a pawn ending a pawn down usually loses (Level 10, exchanges)."),
  C(null, "You are worse, with bishops of opposite colours and queens and rooks still on the board. What should you think about trading?",
    ["Trade queens and rooks if you can — pure opposite-coloured bishop endings are very drawish", "Avoid all trades — with pieces you can attack", "Trade your bishop for a rook", "Trade only pawns"], 0,
    "**Go for the pure bishop ending.** With queens and rooks, opposite-coloured bishops often help the **attacker** (each side's bishop attacks squares the other cannot defend). In a pure bishop ending, they become one of the most drawish endings in chess: even two pawns down can be a draw if the defending bishop and king blockade on the bishop's colour."),
  C(null, "Your position is lost if your opponent plays well. He is down to 2 minutes; you have 10. Which approach gives you the best practical chances?",
    ["Keep pieces on, avoid clear simplifications, and make moves that ask concrete questions each move", "Trade everything so you have less to think about", "Play the quickest moves possible to flag him", "Resign — the position is objectively lost"], 0,
    "**Make him solve problems.** A short clock plus a complicated position is where swindles happen. Trades make his task easier; random quick moves let him play simple safe moves; and resigning a position that still requires accurate play throws away real chances. Note: this is fair play — creating problems is the game. (Lesson 5 covers clock tactics and flagging.)"),
  T("**The rule to remember:** when worse, **make your pieces active, look for drawing mechanisms (perpetual, fortress, stalemate, the right trades), and make every move a question**."),
], videos: [
  V("https://www.youtube.com/watch?v=RNi1WhlInyE", "Hanging Pawns", "The Art of Swindling – How to Fight in Lost Positions"),
  V("https://www.youtube.com/watch?v=hF7JCxBRPxY", "GothamChess", "Chess Tips: How To Defend"),
] });

// ---------- 5. Blitz and rapid ----------
L12.lessons.push({ id: "l12-blitz", title: "Practical blitz and rapid skills", minutes: 15, steps: [
  T("This lesson teaches the practical skills for faster games. Online, most of your rated games will be rapid or blitz, and a 2000 player loses far fewer games to the clock than a 1600 player of similar chess knowledge.\n\n**Time spending rules (rapid, 15+10):**\n- Opening: fast, if you know it. Aim to have **at least 2/3 of your time** at move 15.\n- **Critical moments** (captures available, his move changed the position, choosing a plan, entering an endgame) — spend real time here, up to 2–4 minutes.\n- **No single move over about 10% of your starting time**, unless the game is decided right there.\n\n**Blitz (3+2, 5+0):**\n- **Premove only when safe**: forced recaptures, or moves that are good against **every** reply. Never premove in open positions with checks and captures in the air.\n- In a **winning** position, play fast and safe: protect everything, trade pieces, avoid long calculations.\n- **Low on time** (under 20 seconds): simple moves, keep pieces protected, make luft for your king, push passed pawns, use the increment rhythm — and never spend 10 seconds looking for a brilliant move.\n- Moves you can make quickly: those that improve the king's safety or keep the structure, not those that start complications."),
  C(null, "Blitz, 5+0. You have 12 seconds, your opponent has 50. The position is equal, with many pieces on the board. What is your best approach?",
    ["Play simple, safe moves quickly: keep pieces protected, avoid complications, aim for trades", "Find the objectively best move each time, however long it takes", "Start a sacrificial attack to confuse him", "Premove every move to save time"], 0,
    "**Simple and safe.** With 12 seconds you cannot calculate; you can only avoid blunders. Protected pieces and clear positions let you move instantly. Premoving every move in a position full of pieces is how you hang a queen; a sacrificial attack requires exactly the calculation you have no time for."),
  C(null, "Blitz. You want to save time by premoving your next move while the opponent thinks. When is a premove safest?",
    ["When Black's reply is forced, for example a recapture after an exchange you start", "Always in the opening — nothing happens there", "Whenever you are short of time, in any position", "Never — premoves are against the rules"], 0,
    "**When his reply is forced.** If you start an exchange and his recapture is the only sensible move, premoving your next move is relatively safe. In the opening with pieces developing, a premove can walk straight into a fork or a pin. Premoves are legal on all major sites."),
  C(null, "Rapid 15+10. It is move 18; you have 4 minutes left, your opponent has 13. What does this tell you?",
    ["You spent too much time earlier — from now on use the increment and simplify, and review later where the time went", "Nothing — the clock does not matter in rapid", "You should play the next moves with premoves", "You should offer a draw"], 0,
    "**Time trouble is a mistake you made earlier.** With 10 seconds increment you can still play, but you must now make simple decisions. After the game, find the one or two moves where you spent 3+ minutes — were they critical moments? If not, that is the habit to fix."),
  C(null, "Your opponent has only a king left; you have a rook and pawns. Your clock runs out. What is the result on Lichess or Chess.com?",
    ["Usually a draw: if the opponent has no way at all to checkmate, losing on time is scored as a draw", "You lose — time is time", "You win — you have more material", "The game continues with no clock"], 0,
    "**A draw** — on both major sites, when your flag falls and the opponent cannot possibly checkmate (for example he has only a king), the game is drawn instead of lost (the exact rules for king + one minor piece differ slightly between sites). Flagging — winning on time — is a legal and normal part of blitz. What is unsporting is stalling in a dead position or abusing the opponent; over-the-board, follow the event's rules and the arbiter."),
  T("**The rule to remember:** **the clock is part of the position.** Spend time at critical moments, play simple safe moves when short, and premove only forced replies."),
], videos: [
  V("https://www.youtube.com/watch?v=K7131Lmks9g", "GMBenjaminFinegold", "GM Ben Finegold's Most Important Rules in Blitz"),
  V("https://www.youtube.com/watch?v=d_K8Xe3obMM", "GothamChess", "Time Management In Chess"),
  V("https://www.youtube.com/watch?v=I9xiTagD1cI", "ChessDojo", "How to Manage Your Time in a #chessgame"),
] });

// ---------- 6. Repertoire ----------
L12.lessons.push({ id: "l12-repertoire", title: "Building and maintaining a repertoire", minutes: 15, steps: [
  T("This lesson teaches how to build an opening repertoire that **grows with you** to 2000 — without spending most of your study time on openings.\n\n**What a repertoire is:** one plan for each first move you face. As White: one first move (1.e4 or 1.d4), with one answer prepared against each main Black defence. As Black: **one defence against 1.e4, one against 1.d4**, and a simple system against 1.c4, 1.Nf3 and others.\n\n**How to build it:**\n1. **Choose by structure, not by traps.** Prefer openings whose typical pawn structures you understand (IQP, Carlsbad, French chain...) — then Level 10 helps your openings directly.\n2. **Depth by rating:** at 1600–1900, know the main lines to about move 10–12, and the **ideas** (plans, typical breaks, typical endgames) much better than the moves.\n3. **Write it down** in one place — a Lichess Study (free), with one chapter per line.\n4. **Update after every game:** find the move where you left your preparation, check it with a database and engine, and add **one** move or idea. Your repertoire grows from your own games.\n5. **Review with repetition**: replay the lines from memory once a week.\n6. **Don't switch openings after a loss.** Judge an opening after 30–50 games, not one."),
  C(null, "You lost two games this week in the same opening as Black. What is the right reaction?",
    ["Find the exact moves where the games went wrong, fix them in your repertoire file, and keep the opening", "Switch to a different opening immediately", "Stop playing openings and only play 1...a6", "Memorise 25 more moves of main lines"], 0,
    "**Fix, don't switch.** Two losses tell you where your knowledge has a gap — usually a single line or a misunderstood plan. Switching throws away everything you know and gives you a new set of gaps. Memorising 25 more moves of the main line does not fix a plan you do not understand."),
  C(null, "Which repertoire fits a 1700 player best?",
    ["A small set of openings with related structures, known to move 10–12 with clear plans", "A different opening every week to surprise opponents", "Only gambits and traps", "The sharpest main lines known to move 25"], 0,
    "**Small, related, understood.** At 1700 most games leave theory by move 10–15 anyway, and the player who knows the resulting middlegame better wins. A narrow repertoire also means you see the same structures again and again — the fastest way to learn them. Traps work against weak players but not against 1800s; 25-move theory without understanding collapses the first time the opponent deviates."),
  C(null, "Your opponent plays an unusual move on move 4 that you have never seen. What is your best approach?",
    ["Use opening principles and your repertoire's typical structure, spend some time, then check the line after the game and add it to your file", "Panic and play the first move you see", "Play the move your opening book gives for a different line", "Offer a draw"], 0,
    "**Principles now, preparation later.** Unusual moves are usually objectively worse, so a solid principled reply gives you a good game. After the game you add the line to your repertoire file — that is how the file grows from your own games. Copying a move from a different line ignores what changed."),
  C(null, "How should you split your study time at 1700–1900?",
    ["Mostly calculation, middlegames and endgames; openings around 10–20%", "Mostly openings — they decide most games", "Only playing games", "Only endgames"], 0,
    "**Openings are a minority of your time.** At this level games are decided in the middlegame and endgame far more often than in the opening. Openings deserve 10–20% — enough to reach a playable position you understand — and the rest goes where the points are actually lost. The next lesson makes this concrete."),
  T("**The rule to remember:** **a repertoire is a living file** — small, built around structures you understand, and updated with one move after every game."),
], videos: [
  V("https://www.youtube.com/watch?v=nr-_W6Eujzg", "Hanging Pawns", "How to Build an Opening Repertoire | Chess Meditations"),
  V("https://www.youtube.com/watch?v=xGdqaXZWZC8", "Eric Rosen", "Building an Opening Repertoire using lichess.org"),
] });

// ---------- 7. Training plan ----------
L12.lessons.push({ id: "l12-training-plan", title: "The 1200→2000 training plan by rating band", minutes: 25, steps: [
  T("This lesson gives you a concrete, honest plan from 1200 to 2000: what to study in each band, how many puzzles, games and reviews per week, how to review a loss, and what plateaus look like.\n\n**First, honesty about time.** Going from 1200 to 2000 is a big climb. For a motivated teenager training seriously every day, **2 to 4 years** is a realistic range; some do it faster, many adults stop between 1500 and 1800. Progress is fast at first (you stop blundering), then slower, and it comes in **steps, not a line** — weeks of no change, then a jump.\n\nSecond: **ratings differ by site and pool.** Lichess rapid numbers are usually higher than Chess.com rapid numbers, and both differ from FIDE ratings. Pick one pool to measure yourself — and measure the **trend over 2–3 months**, not one week."),
  T("**Band 1 — 1200 to 1400: stop giving things away.**\n- Puzzles: **5–6 days a week, 30 min** (about 150–250 puzzles a week), accuracy before speed.\n- Games: **3–5 rapid games (15+10)** a week, each with the blunder check on every move.\n- Review: **every loss**, 10–15 minutes.\n- Endgames: king and pawn, the basic mates (Levels 2 and 6).\n- Openings: principles only (about 10% of time).\n\n**Band 2 — 1400 to 1600: tactics deep, first strategy.**\n- Puzzles: 5 days, 30 min, now harder (rated 1600–1900); 2 days a week solve **without moving pieces** until the end of the line.\n- Games: 3–4 rapid games, at least one longer game (30+0 or club) a week.\n- Review: every loss and one win, 15–20 minutes each.\n- Study: Level 5 and Level 10 lessons, **one annotated master game a week**, rook endgames (Lucena, Philidor).\n\n**Band 3 — 1600 to 1800: calculation and plans.**\n- Calculation: 4–5 days, 30–40 min of harder puzzles and long combinations (3–5 moves deep).\n- Games: 3 serious games (30 min or longer, or OTB), plus some rapid.\n- Strategy: model games **in your own openings' structures** (IQP, Carlsbad, French...).\n- Endgames: one session a week — rook endings above all.\n- Openings: build the repertoire file (lesson 6), 15% of time.\n\n**Band 4 — 1800 to 2000: depth and honesty.**\n- Calculation: repetition of hard puzzle sets (solve the same set again until you are fast and accurate — the method of *The Woodpecker Method* book), plus long calculation exercises.\n- Games: classical/OTB tournament games whenever possible; deep analysis of every serious game, **your own analysis first**, engine second.\n- Endgames: theoretical positions plus practical endgame technique (conversion, defence — Level 12, lessons 3–4).\n- Openings: model games and typical plans, updated from your own games."),
  T("**A typical week at 1600–1900** (about 8–10 hours):\n- Mon–Fri: 30–40 min calculation/puzzles every day.\n- 3 serious games a week, each reviewed within 24 hours.\n- 1 endgame session (45–60 min).\n- 1 annotated master game in your openings (45 min).\n- 1 repertoire update (20 min, from your own games).\n- Blitz: only as a separate, small part — it is practice for quick decisions, not training.\n\n**How to review a loss (20–30 minutes):**\n1. **Before the engine**, write down the 2–3 moments you felt unsure, and what you were thinking.\n2. Find the **turning point** — the move where the evaluation changed most.\n3. **Classify it**: missed threat · missed tactic · calculation error (saw it but mis-calculated) · wrong plan · endgame technique · opening gap · time trouble.\n4. **Then** use the engine. For each big mistake, understand *why* the engine move is better — play it out a few moves.\n5. Write **one sentence** in your mistake notebook. Every week, count the categories: the most common one is **next week's focus**."),
  T("**Plateaus — what they look like and how to break them.**\nA plateau is 2–3 months with no rating progress despite training. It is normal; almost every player has several between 1200 and 2000. Typical causes and fixes:\n- **Same mistake category keeps repeating** (your notebook shows it) → 4 weeks of targeted work on exactly that: e.g. calculation drills, or rook endgames.\n- **Playing too fast** (most losses come with lots of time left) → longer time controls, and the 5-step process from lesson 1 on every move.\n- **Only puzzles, few serious games** → play and review more long games; puzzles train patterns, games train decisions.\n- **Tilt** (rating falls after 2–3 losses in a row) → a hard rule: after two losses in a row, stop rated play for that day and review the games instead.\n- **Openings you don't understand** → replace memorised moves with model games in those structures.\n\nThe honest part: sometimes a plateau simply means the skills are being built and the rating has not caught up yet. If your notebook shows **fewer repeated mistakes**, you are improving even when the number is flat."),
  C(null, "You are 1650 and your mistake notebook from the last month shows: 9 losses — 5 calculation errors, 2 missed threats, 1 endgame, 1 opening. What should next month's focus be?",
    ["Calculation: daily long-line exercises solved without moving pieces, and the full 5-step process in games", "A new opening repertoire", "Only blitz to get more games", "Endgame theory"], 0,
    "**The notebook decides.** Five of nine losses come from the same category, so that category gets the next four weeks. Openings caused one loss — changing the repertoire would attack the smallest problem. This is the most important habit in the whole plan: **train what actually loses your games**, not what is fun or fashionable."),
  C(null, "Which weekly schedule is closest to the plan for a 1500 player with about 8 hours a week?",
    ["5 × 30 min puzzles, 3–4 rapid/long games each reviewed, 1 endgame session, 1 annotated game", "Two hours of openings every day", "Twenty blitz games a day, no review", "Only reading chess books, no games"], 0,
    "**Puzzles + serious games + reviews + endgames + one master game.** The balance matters more than the exact numbers: tactics every day, games that are long enough to think, and every loss turned into a lesson. Heavy openings work, blitz without review, or theory without games are the three most common ways to stay at the same rating for years."),
  C(null, "After two months of daily training, your rating is the same. Your notebook shows far fewer \"missed threat\" losses than before. What is the honest reading?",
    ["You are improving; the rating usually catches up later — keep the plan and target the next most common mistake", "The training does not work — stop it", "You have reached your natural limit", "Change everything at once"], 0,
    "**You are improving.** Ratings lag behind skill; the notebook measures the skill directly. Fewer repeated mistakes is real progress. Keep the system and move the focus to the next most common category. Changing everything at once destroys the information your notebook gives you."),
  C(null, "Which is the best use of blitz in a training plan toward 2000?",
    ["A small, separate part of the week for fast decision-making and openings practice — never instead of long games", "The main way to train, because you get more games", "Nothing — never play blitz", "Only when you are tilted after a loss"], 0,
    "**Small and separate.** Blitz trains quick pattern use and lets you test opening lines, but it does not leave time for calculation or the thinking process — the skills that take you from 1600 to 2000. Playing blitz when tilted is the fastest way to lose 100 points in an evening."),
  T("**Your next target:** start (or continue) the mistake notebook today. After your next 10 serious games, count the categories — the biggest one is your first focus. **The rule to remember:** train what actually loses your games, measure the trend over months, and review every loss before the engine tells you anything."),
], videos: [
  V("https://www.youtube.com/watch?v=M7XGciOnBsA", "GM Noel Studer", "How I’d Train Chess If I Were Under 2000 Elo"),
  V("https://www.youtube.com/watch?v=gxfBW41YD14", "Remote Chess Academy", "Chess Study Plan To Reach 2000 ELO Faster | 30-Minutes Training Daily"),
  V("https://www.youtube.com/watch?v=ERji3r2-Zso", "Hanging Pawns", "How I would study chess if I could start over"),
] });

// ---------- write ----------
const out = path.join(__dirname, "..", "content", "course-strategy.json");
fs.writeFileSync(out, JSON.stringify(levels, null, 2));
let ex = 0, ch = 0, pl = 0, steps = 0;
for (const L of levels) for (const l of L.lessons) for (const s of l.steps) { steps++; if (s.type === "exercise") ex++; if (s.type === "choice") ch++; if (s.type === "play") pl++; }
console.log("wrote", out, levels.length, "levels", levels.reduce((a, L) => a + L.lessons.length, 0), "lessons", steps, "steps", ex, "exercises", ch, "choices", pl, "play");
