// tactics-build: builds content/course-tactics.json (Level 8 Tactics II, Level 11 Attacking the King)
// Exercise positions come straight from content/puzzles.json by Lichess id (first move applied, rest = solution).
const fs = require("fs");
const path = require("path");
const { Chess } = require("chess.js");
const P = require("../content/puzzles.json");
const byId = new Map(P.map((p) => [p[4], p]));

function ex(id, task, hint, explain, solOverride) {
  const p = byId.get(id);
  if (!p) throw new Error("no puzzle " + id);
  const [fen, mv, , th] = p;
  const t = Array.isArray(th) ? th : th.split(" ");
  const ms = mv.split(" ");
  const c = new Chess(fen);
  c.move({ from: ms[0].slice(0, 2), to: ms[0].slice(2, 4), promotion: ms[0][4] });
  const start = c.fen();
  let sol = ms.slice(1).map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  if (solOverride) { const cc = new Chess(start); sol = solOverride.map((m) => cc.move(m).san); }
  const side = new Chess(start).turn() === "w" ? "White" : "Black";
  const s = { type: "exercise", fen: start, text: `${side} to move. ${task}`, solution: sol, hint, explain };
  if (t.some((x) => /^mateIn\d/.test(x)) || c.isCheckmate()) s.goal = "mate";
  return s;
}
const text = (t) => ({ type: "text", text: t });
const board = (fen, t, arrows, highlights) => ({ type: "board", fen, text: t, ...(arrows ? { arrows } : {}), ...(highlights ? { highlights } : {}) });
const choice = (fen, q, options, answer, explain) => ({ type: "choice", ...(fen ? { fen } : {}), text: q, options, answer, explain });
const V = (url, title, channel) => ({ title, channel, url: "https://www.youtube.com/watch?v=" + url });
const fenAfter = (moves) => { const c = new Chess(); for (const m of moves.split(" ")) c.move(m); return c.fen(); };

// ---------------------------------------------------------------- LEVEL 8
const L8 = {
  id: "l8", title: "Level 8 — Tactics II", band: "1000–1500",
  subtitle: "Deeper tactics: queen double attacks, x-rays, interference, decoys, quiet moves and two-motif combinations",
  lessons: [
    {
      id: "l8-queen-double", title: "Double attacks with the queen", minutes: 15,
      steps: [
        text("Level 4 showed forks with knights and pawns. This lesson is about the **queen**, because between 1000 and 1500 most games are decided by a queen move that hits two things at once.\n\nThe queen moves in eight directions, so from one square she can attack the king and a piece far away on the other side of the board. Three things make a queen double attack work:\n\n- **One of the targets is the king** (a check), so the opponent has no time to save the other piece.\n- **The other target is loose** — not protected. The queen is worth 9, so attacking a protected knight with her wins nothing.\n- **The queen herself is safe** on the forking square.\n\nHabit: every move, ask **\"which enemy pieces are loose?\"** and then **\"which queen check also looks at one of them?\"**"),
        board("r4rk1/p3ppbp/Pp1q1np1/3PpbB1/2B5/2N2P2/1PPQ2PP/3RR1K1 b - - 0 18",
          "Black to move. The bishop on c4 has no defender. **...Qc5+** checks the king on g1 along the diagonal and attacks the bishop on the c-file at the same time. After the king moves, ...Qxc4 wins a piece.",
          ["d6c5", "c5g1", "c5c4"], ["c4"]),
        ex("38UYJ", "White's rook on g5 is loose. Win it.",
          "Find a queen check along the first rank that also looks down a diagonal toward g5.",
          "**...Qc1+** checks the king on f1 along the first rank, and from c1 the queen also sees g5 along the c1–h6 diagonal (d2, e3, f4 are empty). After **Ke2**, **...Qxg5** wins a whole rook."),
        ex("2Tp8t", "Black's rook on c2 is loose. Win it with two queen checks.",
          "The fork square d3 only gives check if the black king stands on h7. Make it go there first.",
          "**Qd8+ Kh7** puts the king on the b1–h7 diagonal. Now **Qd3+** checks the king *and* attacks the rook on c2 along the b1–h7 diagonal. After **...f5** (blocking), **Qxc2** wins the rook. The first check is there only to put the king on the right square for the fork."),
        ex("2iYrA", "Black's rook on f2 is not protected. Find the queen check that wins it.",
          "Look at the d4-square: from there the queen sees d6 and the f2-rook on a diagonal.",
          "**Qd4+** checks the king on d6 along the d-file and attacks the rook on f2 along the d4–f2 diagonal. The bishop on b2 protects your queen, so the king cannot take it. After **...Ke7**, **Qxf2** wins the rook."),
        ex("0TxiG", "Black's knight on e4 is undefended. Win it.",
          "A queen check from the queenside that also sees along the fourth rank.",
          "**Qa4+** checks along the a4–e8 diagonal and attacks the knight on e4 along the fourth rank (b4, c4, d4 are empty). Black blocks with **...Nd7**, and **Qxe4** wins the knight. Early in the game, knights jump into the center with no defender — watch for this."),
        ex("1Ch2u", "Black has just taken a pawn with the knight on b4. Punish it.",
          "The diagonal from b3 to g8 is open. What else does the queen see from b3?",
          "**Qb3+** checks the king along the b3–g8 diagonal (c4, d5, e6, f7 are empty) and attacks the loose knight on b4 along the b-file. After **...Kh8**, **Qxb4** wins the piece. A knight that grabs a pawn on the edge is often loose."),
        ex("3asmS", "The bishop on c5 is loose. Win it.",
          "A queen check on the h5–e8 diagonal that also looks along the fifth rank.",
          "**Qh5+** checks the king on e8 along the diagonal (g6 and f7 are empty) and attacks the bishop on c5 along the fifth rank. After **...Kf8**, **Qxc5+** wins the bishop with check."),
        ex("30eXF", "Not every queen double attack is a check. Find the quiet one.",
          "Black's rook on d4 and knight on f6 are both loose. Which square attacks both?",
          "**Qe5!** attacks the rook on d4 (along the diagonal) and the knight on f6 (along the diagonal the other way) — both are undefended. Black can save only one: after **...Qc6** protects the knight, **Qxd4+** takes the rook with check. A double attack without check still works when **both** targets are loose."),
        text("**The rule to remember:** before every move, list the opponent's **loose pieces**. Then look for a **queen check** that also attacks one of them. Check + loose piece = material.")
      ],
      videos: [V("rxA3xUa70cM", "Chess Tactics: Double Attack", "Chess.com"), V("_2CBlNGLwUw", "Double Attack! | Chess Tactics | ChessKid", "ChessKid")]
    },
    {
      id: "l8-xray", title: "X-rays and batteries", minutes: 15,
      steps: [
        text("A **battery** is two long-range pieces on the same line: queen and rook on a file, two rooks doubled, or queen and bishop on a diagonal. An **x-ray** is a piece that attacks (or defends) a square **through** another piece: as soon as the piece in front disappears, the one behind takes over.\n\nWhy this matters at 1000–1500: players count attackers and defenders but forget the piece **standing behind**. Then a capture that looks safe loses, and a sacrifice that looks crazy works.\n\nWhen you count a square, look **behind** every piece on the line — yours and the opponent's."),
        board("r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2PBPN2/PPQ2PPP/RNB2RK1 w - - 0 9",
          "A classic battery: the bishop on d3 in front, the queen on c2 behind it, both aiming at h7. Right now the knight on f6 defends h7. If that knight is chased away (for example by e4–e5), the battery turns into a real threat.",
          ["c2h7"], ["h7"]),
        ex("3J378", "Your queen on e5 is looking at c7 through Black's queen. Use it.",
          "A rook check on c7 seems to hang the rook. Who takes back if Black captures?",
          "**Rc7+!** If **...Qxc7**, the black queen has left d6 and your queen on e5 sees all the way to c7: **Qxc7+** wins the queen for a rook. Your queen was x-raying c7 through the black queen."),
        ex("1wmfL", "Black's rook on f7 seems to block your rook on f1. Look again.",
          "After you capture on f8 and Black recaptures with the f7-rook, what can the f1-rook see?",
          "**Rxf8+!** The king can't take because the knight on e6 covers f8, so Black recaptures **...Rxf8**. That rook has left f7, so your f1-rook sees the whole file: **Rxf8#**. The f1-rook was x-raying f8 through the black rook."),
        ex("3eeGQ", "Put a rook in front of your queen on the e-file.",
          "A rook check on e6 also attacks Black's queen on e5. What stands behind it?",
          "**Re6+** — now rook and queen form a battery on the e-file. The rook checks and attacks the queen on e5. If **...Qxe6**, **Qxe6+** takes back: rook for queen. If the king moves instead, Rxe5 wins the queen anyway."),
        ex("1OKn5", "Your rook on b1 x-rays through White's rook on c1. Mate in two.",
          "Take on d1 with the queen. Which white rook can recapture, and what happens on b1 then?",
          "**...Qxd1+!** White must take back with the c1-rook (**Rxd1**). But the c1-rook has left, so your b1-rook now sees d1: **...Rxd1#** — back-rank mate. White's rooks looked like they defended each other, but only one of them can recapture."),
        ex("1nBNY", "Your rooks are doubled on the e-file, with White's queen on e4 in the way. Mate in two.",
          "Give a queen check on e1. If White's queen takes, what does your e5-rook see?",
          "**...Qe1+!** The only answer is **Qxe1**, and now the white queen has left e4. Your e5-rook sees all the way down the file: **...Rxe1#**. The g2-pawn blocks the rook on g6 from defending g1."),
        ex("20Qi9", "Use the x-ray on the d-file and on the e-file. Mate in three.",
          "Sacrifice the queen on d8: Black's rook must take, and your d1-rook takes back with check.",
          "**Qd8+!** Black's rook on d5 must take (**...Rxd8**), and your d1-rook, x-raying through it, recaptures with check: **Rxd8+**. After **...Qe8**, **Rxe8#**. Black's king had no escape square because of the bishop on h7 and the pawns on f7 and g7."),
        text("**The rule to remember:** when you count attackers and defenders on a square, also count the pieces **standing behind** them on the same line. The piece behind is often the one that decides.")
      ],
      videos: [V("Bw8VIZGhfgI", "Chess Tactics: X Ray", "thechesswebsite"), V("18e4AgaSrU8", "What is the X-Ray Tactic in Chess | Chess Beginner Tactics", "Chessfactor"), V("p8xlK_Enz54", "The Powerful Queen and Bishop Battery | Chess Middlegame | Improver Level | IM Andrey Ostrovskiy", "Chessfactor")]
    },
    {
      id: "l8-interference", title: "Interference and clearance", minutes: 18,
      steps: [
        text("Two ideas about **lines** (files, ranks, diagonals):\n\n- **Interference:** put a piece **between** an enemy piece and the thing it defends. The line is cut, so the defended piece becomes loose.\n- **Clearance:** move **your own** piece out of the way — often with a check or a capture, so the opponent has no time — to open a line or a square for another of your pieces.\n\nWhy this matters at 1000–1500: you already see simple forks and pins. The next step is to see that **a piece in the way can be moved with tempo**, and that **a defender's line can be blocked**."),
        ex("3YZMp", "Black's knight on b3 attacks your rook. It is defended only by the queen on d5. Cut that line.",
          "Which pawn move steps onto the d5–b3 diagonal and attacks the queen at the same time?",
          "**c4!** The pawn stands between the queen and the knight, so the knight loses its only defender. The pawn also attacks the queen, so Black has no time: after **...Qd7**, **Qxb3** wins the knight. The c4-pawn is safe because the d3-pawn protects it."),
        ex("1jDJy", "Your queen is attacked by the rook on h8. Before you move it, look at Black's knight on g4.",
          "The knight on g4 is protected only by the queen on d7, along the d7–g4 diagonal. Block that diagonal with gain of time.",
          "**e6!** The pawn attacks Black's queen and blocks the d7–g4 diagonal. After **...fxe6**, the knight on g4 has no defender, and **Qxg4** wins it — your queen also escapes from the rook's attack."),
        ex("0jY9H", "Your queen on d3 aims at h7, but your own knight on e4 is in the way. Mate in two.",
          "Move the knight off the diagonal with check.",
          "**Nf6+!** The knight leaves the d3–h7 diagonal with check, so Black has no time to defend h7. After **...Qxf6**, **Qh7#** — the knight on g5 protects the queen. This is a **clearance** sacrifice: the knight gives itself up to open the line."),
        ex("22V3G", "Your queen and bishop aim at h2, but your knight on e5 blocks the diagonal. Mate in two.",
          "Clear the d6–h2 diagonal with a knight check.",
          "**...Nf3+!** clears the diagonal with check. After **gxf3**, **...Qh2#** — the queen is protected by the bishop on c7 standing behind it on the same diagonal. The f1-rook and f2-pawn take the king's last squares."),
        ex("0uzjZ", "Your bishop on f6 blocks the queen's way to g5. Clear it with tempo.",
          "Trade the bishop off with a capture, then use the open d8–g5 diagonal.",
          "**...Bxb2!** The bishop leaves f6 by taking a piece, so White must recapture: **Qxb2**. Now the d8–g5 diagonal is open, and **...Qg5+** checks the king and attacks the loose bishop on f5. Next move ...Qxf5 wins it."),
        ex("2wdc8", "Your bishop on f5 stands in front of your rook on the f-file.",
          "Remove the bishop from the file by capturing, then the rook has a strong square.",
          "**...Bxe4!** clears the f-file and takes a knight, so White must recapture: **Qxe4**. Now **...Rf4!** attacks the queen and the bishop on h4 at once, and the e5-pawn protects the rook. After **Qe3**, **...Rxh4** wins a piece."),
        ex("0M3hd", "Your knight on d4 blocks both your queen (d-file) and your bishop (f6–c3 diagonal).",
          "Move the knight with check, then the queen goes to d4 with a double attack.",
          "**...Nxf3+!** clears the d-file and the long diagonal with check. After **Rxf3**, **...Qd4+** checks the king and attacks the knight on c3, which is now attacked twice (queen and bishop) and defended once. After **Kf1 Qxc3 Qxc3 Bxc3** you are a piece up."),
        text("**The rule to remember:** if your own piece blocks a strong line, look for a way to move it **with check or with a capture**. If an enemy piece is defended along a line, look for a way to **step into that line**.")
      ],
      videos: [V("0ehLrDd2pn4", "4 Levels of INTERFERENCE (Chess Tactic)", "Chess Vibes"), V("uz-CpSlUEbY", "10 Levels of Tactics: Master the Clearance Sacrifice", "the chess nerd"), V("FKWgi4N2CJ8", "Clearance Sacrifice in Chess | Chess Tactics", "ChessKid")]
    },
    {
      id: "l8-attraction", title: "Attraction: decoy sacrifices toward the king", minutes: 18,
      steps: [
        text("Level 4 introduced the decoy. Here we go deeper into the most common kind: **attraction** — a sacrifice that **forces the enemy king** onto a bad square.\n\nThe king usually has to take the piece (or it is check), so you decide where it stands next move. Good squares to pull the king to:\n\n- a square where it can be **mated** by the next check (h7 on an open h-file, a2 in front of a pawn storm);\n- a square where it is **forked** with another piece;\n- a square on the **line** of your queen, rook or bishop.\n\nBefore you sacrifice, play the position **after the king takes** in your head and ask: **what is my next check, and where can the king go?**"),
        ex("35V9J", "Mate in two. Bring the king to h7.",
          "After the king takes on h7, which of your pieces can give check on the h-file?",
          "**Rxh7+!** drags the king to h7. After **...Kxh7**, **Qh3#**: the queen checks along the h-file, the bishop on b3 covers g8 (through c4, d5, e6, f7) and the f5-pawn covers g6."),
        ex("2g9aT", "Mate in three. Pull the king onto the b1–h7 diagonal.",
          "A rook check on g8 forces the king to take. Then your queen and bishop battery is ready.",
          "**Rg8+!** **...Kxg8** — the king is pulled to g8, onto the diagonal of your queen on d3 and bishop on c2. **Qh7+ Kf8 Qh8#**: the queen covers g7 and the whole eighth rank, and the e7-rook and f7-pawn block the king's escape."),
        ex("0oWW8", "Mate in two. White's king hides on a1.",
          "Sacrifice the queen to bring the king to a2. Then which rook move gives mate on the a-file?",
          "**...Qxa2+!** forces **Kxa2**. Now **...Ra4#**: the rook checks along the a-file, the c4-pawn covers b3, and the b1-rook and b2-pawn are White's own pieces in the way."),
        ex("2Dx8P", "Mate in three. Open the h-file with a queen sacrifice.",
          "Take on h7 with the queen. After the king takes, your rook swings to the h-file with check.",
          "**Qxh7+!!** **...Kxh7** — the king is on the open h-file. **Rh4+** checks, and the only block is **...Qh6**, then **Rxh6#**. The g5-pawn protects the rook, the f6-pawn covers g7, and Black's own rook on g8 and pawn on g6 take the last squares."),
        ex("0Ft2o", "Black threatens your king. You have one move that ends the game first.",
          "Sacrifice the queen on h7. Then a rook check on the h-file.",
          "**Qxh7+!** **...Kxh7** and **Rh4#**. The f6-pawn covers g7, Black's own rook and pawn block g8 and g6, and the rook on h4 controls h6 and h8. When both kings are in danger, **checks come first**."),
        ex("2Hxcn", "Mate in two. Pull the king out to f7.",
          "A bishop sacrifice on f7. Where can your queen then give check, protected by the rook on e8?",
          "**Bxf7+!** **...Kxf7** — the king is pulled into the open. **Qe6#**: the queen is protected by the rook on e8, covers f6, g6 and g8, and the bishop on f8 blocks its own king."),
        ex("0INxZ", "Win material. Pull White's king to e3 first.",
          "After a queen trade on e3, which knight check forks the king and the bishop on d6?",
          "**...Qxe3+!** trades queens and forces **Kxe3** — the king now stands on e3. **...Nf5+** forks the king and the loose bishop on d6. After **Kf2**, **...Nxd6** wins a piece. Attraction does not always mean mate: it can also pull the king into a **fork**."),
        text("**The rule to remember:** a sacrifice that the king **must take** lets you choose where the king stands. Before you play it, ask: **what is my next check from there, and where can the king run?**")
      ],
      videos: [V("UdI2WjxGQU4", "10 Levels of Tactics: Master the Decoy", "the chess nerd"), V("9cwNsRA3txY", "Chess lesson # 38: Decoy vs Deflection | Chess tactics with National Master Robert Ramirez", "NM Robert Ramirez")]
    },
    {
      id: "l8-trapped", title: "Trapped pieces", minutes: 15,
      steps: [
        text("A piece is **trapped** when it is attacked and has **no safe square** to go to. You do not need a fork or a pin — you just take its squares away and then attack it.\n\nWhich pieces get trapped at 1000–1500?\n\n- A **queen that grabs pawns** deep in the enemy camp (b2 and b7 are famous).\n- A **bishop** on a2/a7, b3/b6 or h7 that can be closed in by pawns.\n- A **knight** on the edge (a- or h-file) or deep in enemy territory.\n\nMethod: when an enemy piece goes far from home, **count its squares**. If it has only one or two, look for a move that takes those away **with an attack**."),
        ex("3EmHL", "Black's queen on d4 has gone deep. Trap it.",
          "Attack the queen with a pawn. Then count its escape squares.",
          "**c3!** attacks the queen, and every square is covered: c4 and e4 by the d3-pawn, e3 by the f2-pawn, b4 by the a3-pawn, c3 by the b2-pawn, d3 by the bishop on f1 and the queen on d1, a4 by the queen on d1, f4 and h4 by the bishop on g3, g4 by the f3-pawn, e5 by the bishop on g3. Black's best is **...Qxe5+ Bxe5**, giving the queen for a pawn."),
        ex("2MI90", "White's queen on h7 is deep in your camp. Trap it.",
          "Attack the queen with a rook. Which squares can it reach then?",
          "**...Rh8!** attacks the queen. It cannot go to g8 (both rooks cover it), cannot take on g7 (the bishop on f6 protects the pawn) and cannot take on h6 (the g7-pawn protects it). White has to give the queen for a rook: **Qxh8 Rxh8**."),
        ex("3XPrk", "Black's queen on h4 has very few squares. Take them away.",
          "Put a rook on the h-file. Look at g5, f4, g4 and h2.",
          "**Rh1!** attacks the queen. The bishop on e3 covers g5 and f4, the f3-pawn covers g4, the rook covers h2 and h3, and moving along the h-file does not escape the rook. Black can only make a desperate move like **...f4**, and **Rxh4** wins the queen."),
        ex("2ueVI", "Black's queen took the b2-pawn. Punish the greed.",
          "A knight move attacks the queen and the bishop on c5 at once. Where can the queen go then?",
          "**Na4!** attacks the queen on b2 and the bishop on c5. The queen has no good square — the best Black has is to grab the rook, **...Qxa1**, and **Qxa1** wins the queen for a rook. The pawn on b2 is called \"poisoned\" for a reason."),
        ex("0vAqE", "White's bishop on b3 has almost no squares. Trap it with pawns.",
          "First gain time on the white queen, then push the pawn that attacks the bishop.",
          "**...c5!** attacks the queen. After **Qe3**, **...c4!** attacks the bishop on b3: a4 is covered by the b5-pawn, a2 and c2 hold White's own pawns. The bishop is lost: **Bxc4 bxc4**. This pawn trap on b3 is a well-known opening pattern (the \"Noah's Ark\" trap)."),
        ex("0egrS", "Black's queen just took on d4. Trap it in the middle of the board.",
          "Attack the queen with a rook. Your knight on d3 controls many of its squares.",
          "**Rc4!** attacks the queen. The knight on d3 covers e5, c5, b4 and f4; the rook covers e4; the f2-pawn covers e3; the b2-pawn covers c3; your queen on b3 protects d3. There is no escape, so Black gives the queen for the rook: **...Qxc4 Qxc4**."),
        ex("3DvUC", "Black's queen on h5 has gone to the edge. Trap it.",
          "One pawn move attacks the queen. Then check every square on the fifth rank and the h-file.",
          "**g4!** attacks the queen. The f4-pawn covers g5 and e5, the g4-pawn covers f5, the rook on d1 covers d5, the rook on c4 covers c5, your queen covers h4. The queen is trapped and Black can only take a pawn with it: **...Qxh3+ Kxh3**."),
        text("**The rule to remember:** when an enemy piece goes deep into your half or to the edge, **count its squares**. If it has two or fewer, look for a move that attacks it — often a simple pawn move.")
      ],
      videos: [V("IdVjlHqNOV8", "8 Ways To TRAP Pieces In Chess", "Chess Vibes"), V("9ILa_WlCYLU", "Chess Tactics: Trapped Pieces!", "Chess.com")]
    },
    {
      id: "l8-desperado", title: "Desperado and counter-attack", minutes: 15,
      steps: [
        text("Two ways to answer a threat without simply retreating:\n\n- **Desperado:** a piece that is going to be lost anyway **takes something on the way out** — best of all with check. Then you recapture what the opponent took.\n- **Counter-attack:** when your piece is attacked, first make a **bigger threat** (a check, a capture, an attack on the queen). The opponent must answer it, and you save your piece later.\n\nWhy this matters at 1000–1500: in exchanges, players recapture automatically. Stronger players first ask: **\"before I take back, is there a capture or a check that gains something?\"**"),
        choice(null, "Your knight is attacked and cannot be saved. The opponent's bishop is also attacked by your rook. What should you look for first?",
          ["Retreat the knight to the safest square, even if it is lost later", "A capture or check with the knight before it is taken", "Trade off the rook so the position is simpler"], 1,
          "A piece that is lost anyway should **sell itself dearly**: take a pawn or a piece, ideally with check, before it disappears. That is the desperado idea."),
        ex("0GiDX", "Black just took your rook on a1, and your knight on e8 is attacked. Don't recapture yet.",
          "Your knight on e8 can take something with check.",
          "**Nxf6+!** — the knight was attacked, so it takes a knight *with check* before it dies. After **...Nxf6**, **Rxa1** takes back the bishop. You came out a piece ahead instead of just trading."),
        ex("1lvlB", "Black just took your queen on d4. Your bishop on f6 can't recapture — the rook on e5 is in the way.",
          "Move the rook off the diagonal with check, taking something.",
          "**Rxe6+!** — the rook leaves the f6–d4 diagonal by taking a bishop with check. After **...fxe6**, **Bxd4** wins the queen back. You traded a rook for a bishop and a queen."),
        ex("326G7", "White just took your bishop on c5. Before taking back, use your attacked knight on e5.",
          "The knight on e5 is attacked by the knight on f3. Can it take that knight with check?",
          "**...Nxf3+!** — the knight was attacked anyway, so it takes the knight with check. After **Bxf3**, **...Qxc5** recaptures the bishop. If you had taken on c5 first, Nxe5 would have won your knight."),
        ex("1aqEU", "Black's knight on e4 attacks your queen, and Black's rook sits on d2. Don't just retreat.",
          "Move the queen with check, so you have time to take the rook next move.",
          "**Qxe5+!** — the queen escapes *with check* and takes a pawn. After **...Nf6** (blocking), **Nxd2** wins the rook that the knight on f3 was already attacking. A counter-attack (check) first, then the capture."),
        ex("0qrCn", "Black took on e4 and your bishop on h4 is attacked by the bishop on e7.",
          "If you recapture on e4 now, Black takes your bishop. Take first, with a threat.",
          "**Bxe7!** takes the bishop that attacked yours, and now your bishop attacks the queen on d8. After **...Qxe7**, **Nxe4** takes back the knight. You won a piece by putting the capture in the right order."),
        ex("0BoYj", "White's queen on h4 attacks your queen on e7. It is protected by the knight on f3.",
          "Remove the defender of the white queen with check.",
          "**...Nxf3+!** takes the knight that protected the queen, and it is check, so White has no time to save the queen. After **gxf3**, **...Qxh4** wins the queen."),
        text("**The rule to remember:** before you recapture or retreat, ask **\"is there a check or a capture first?\"** A piece that is lost anyway should take something on its way out.")
      ],
      videos: [V("L9B9mQO-CvI", "Chess Lesson # 45: Desperado Chess Tactic", "NM Robert Ramirez"), V("VGey5jo-SWk", "10 Levels of Tactics: Master the Desperado", "the chess nerd")]
    },
    {
      id: "l8-quiet", title: "Quiet moves in combinations", minutes: 15,
      steps: [
        text("Most tactics are **forcing**: checks, captures, threats. But some of the strongest moves are **quiet** — no check, no capture — and still win, because they create a threat the opponent **cannot meet**.\n\nTypical quiet moves:\n\n- **lining up** a battery (bishop behind queen, rooks doubled) so a mate threat appears;\n- **stepping aside** with a piece so another piece can use its square;\n- **bringing a knight closer** to support a mate.\n\nWhy this matters: at 1000–1500 players only look at checks and captures. When there is no forcing move, ask: **\"what would I do if it were my move again?\"** — and find the quiet move that prepares it."),
        ex("2bKoj", "No check works yet. Prepare one.",
          "Double your rooks on the h-file. What do you threaten then?",
          "**...Rah8!** — quiet, but it threatens ...Rh1#. White has no good defence: after **f4** (to give the king f2), **...Rh1+ Kf2 Rxa1** wins the rook, because the check on h1 also lines up the rook with a1."),
        ex("2KpQs", "Find a quiet bishop move that creates two threats.",
          "Move the bishop off the a-file to a square where it stands behind your queen.",
          "**...Bb8!** does two things. The queen and bishop now aim at h2 (threat **...Qxh2#**), and the a-file is open, so your rook on a8 attacks the rook on a1. White stops the mate with **g3**, and **...Rxa1** wins a rook."),
        ex("1RVTM", "Your queen is on h6. Bring one more piece to attack h7.",
          "A knight move to g5 supports a queen move to h7.",
          "**Ng5!** threatens **Qh7#**, with the knight protecting the queen. Black's best defence gives up material: **...Rxf1+ Rxf1 Qxg5 Qxg5**, and you have won the queen for a knight."),
        ex("1MIA6", "Your queen and bishop are on the long diagonal. Find the quiet move that makes a mate threat.",
          "The bishop on e5 stands in front of the queen. Move it out of the way — but to which square?",
          "**Bh8!!** The bishop goes to the corner. Now the queen on d4 sees g7, and the bishop protects it there: the threat is **Qg7#**. Black has nothing better than a spite check, **...Nf3+**, and **Bxf3** takes the knight with the mate threat still on."),
        ex("00In2", "Your queen on f6 is close to the black king. Add one piece behind it.",
          "Put the bishop on the long diagonal so the queen can go to g7 or h8 with support.",
          "**Bb2!** — quiet, but it threatens Qg7# and Qh8# along the long diagonal. Black's best is to take the bishop, **...Qxb2**, and **Qxb2** wins the queen for a bishop."),
        ex("0QNe4", "Your queen on e4 and knight on h5 are near Black's king. Find the quiet move.",
          "Put the bishop behind the queen on the b1–h7 diagonal.",
          "**Bd3!** lines up the bishop behind the queen: the threat is **Qh7#**. Black blocks with **...f5**, but that pawn was the only defender of the knight on e6, so **Qxe6** wins a piece."),
        ex("0leqW", "Same idea, different position. Create the threat Qh7#.",
          "Your queen is on e4. Which bishop move puts a second attacker on h7?",
          "**Bd3!** — now queen and bishop aim at h7, and Qh7# is threatened. Black blocks the diagonal with **...Rf5**, but **Qxf5** simply wins the rook (the bishop on d3 protects the queen)."),
        text("**The rule to remember:** when there is no good check or capture, look for a **quiet move that creates a threat the opponent cannot stop** — usually a battery aimed at a square next to the king.")
      ],
      videos: [V("QEelw0SZRxY", "Tactics and Quiet Moves | Kids' Class - GM Varuzhan Akobian", "Saint Louis Chess Club")]
    },
    {
      id: "l8-combine", title: "Combining two motifs", minutes: 18,
      steps: [
        text("Real tactics rarely use one idea alone. A **combination** links two motifs: the first move **creates** the target, the second move **hits** it.\n\nCommon pairs:\n\n- **attraction + fork:** a sacrifice pulls the king onto a fork square;\n- **trade + fork:** an exchange brings an enemy piece onto a forkable square;\n- **pin + double attack**, **discovered check + capture**, **deflection + fork**.\n\nHow to find them: if you see a tactic that *almost* works (a fork that misses by one square, a pin that is one defender short), ask **which forcing move would fix that one detail**."),
        ex("1M4mD", "Win material by combining a double attack with a skewer.",
          "A rook move to c8 attacks two pieces. Black can't take it because of the back rank.",
          "**Rc8!** attacks the bishop on b8 and the rook on e8 (if ...Rxc8, Rxc8+ is back-rank mate). After **...Kf8 Rxe8+ Kxe8**, **Rc8+** checks the king and hits the bishop again, and **...Kd7 Rxb8** wins it. Double attack + back rank + check."),
        ex("27QE2", "Attraction + fork. Win a piece.",
          "Trade queens so the black king must stand on c7. Then find a knight check.",
          "**Qxc7+!** forces **...Kxc7**. Now **Nd5+** forks the king on c7 and the loose bishop on b4. After **...Kc8**, **Nxb4** wins the piece. The queen trade was there only to put the king on the fork square."),
        ex("259IB", "Attraction + discovered attack. Win material.",
          "After Bxd7+ Kxd7, a pawn check opens the long diagonal for your bishop on b2.",
          "**Bxd7+ Kxd7** brings the king to d7. Now **e6+!** — the pawn checks, and moving off e5 it opens the b2–g7 diagonal. After **...Kxe6**, **Bxg7** wins the bishop and attacks the rook on h8."),
        ex("2OaBy", "Discovered attack with check. Your knight on c5 stands between your queen and Black's rook on e7.",
          "Move the knight with check so Black has no time to save the rook.",
          "**Nxa6+!** — the knight takes a pawn with check, and the queen on b4 now attacks the rook on e7. After **...Ka7**, **Qxe7** wins the rook. Check + discovered attack: the opponent can only answer one of them."),
        ex("2plZC", "Attraction + fork. Win White's rook on d1.",
          "Sacrifice the rook to bring the king to g2. Then a queen check also hits d1.",
          "**...Rxg2+!** takes the bishop and forces **Kxg2**. Now **...Qe2+** checks the king and attacks the rook on d1 along the diagonal. After **Kg1**, **...Qxd1+** wins it. You gave a rook for a bishop and won a rook back."),
        ex("1VIFf", "Trade first, then fork.",
          "After the rooks are traded on h5, the white rook stands on a square your knight can attack.",
          "**...Rxh5 Rxh5** — the trade brings White's rook to h5. Now **...Nf4!** forks the queen on e2, the rook on h5 and the bishop on d3. After **Qe3** (attacking the knight), **...Nxh5** wins the rook."),
        ex("2V7iu", "Deflection + fork. Black's rooks are on g8 and e6.",
          "Attack the g8-rook. Black has to defend it — then which knight check hits king and rook?",
          "**Rh8!** attacks the rook on g8 (if ...Rxh8, gxh8=Q+). Black defends with **...Ree8**, and now **Nd6+** forks the king on c8 and the rook on e8. After **...Kd7**, **Nxe8** wins it."),
        text("**The rule to remember:** when a tactic *almost* works, look for the **forcing move that fixes the missing detail** — a sacrifice or trade that puts the enemy piece on the right square.")
      ],
      videos: [V("-kh_6mjGOP0", "10 Levels of Tactics: Master the Combination", "the chess nerd"), V("yKBuDJzYBRA", "What Are Combinations In Chess? | Chess Terms | ChessKid", "ChessKid")]
    },
    {
      id: "l8-mates", title: "Mate in 2 and mate in 3", minutes: 20,
      steps: [
        text("Practice calculation with short mates. For each position use the same order:\n\n1. **Look at the enemy king's squares.** Which are free, which are covered?\n2. **Checks first** — every check, even \"crazy\" sacrifices.\n3. For each check, list **every** reply (king moves, blocks, captures) and make sure each one loses.\n\nThe goal is not speed. The goal is to **see the final position** before you move. Positions get harder as you go."),
        ex("1hoME", "Mate in two.",
          "Take the g6-pawn with the queen. Your knight on e5 protects it.",
          "**Qxg6+** — the knight on e5 protects the queen. After **...Kh8**, **Nf7#**: the queen covers g7, g8 and h7. If ...Kf8 instead, Qf7# — the knight protects f7 too."),
        ex("1z8RA", "Mate in two.",
          "The knight on f6 is Black's only defender of h7. Remove it with check.",
          "**Nxf6+** removes the defender with check. After **...Qxf6**, **Qh7#** — the knight on g5 protects the queen and the black rook on f8 blocks its own king."),
        ex("17nfP", "Mate in two.",
          "A bishop check drives the king to g1. Then your doubled rooks finish.",
          "**...Bd3+ Kg1 Rh1#**. The rooks on h4 and h5 protect each other, so the king cannot take on h1; the bishop covers f1 and White's own pawns block f2 and g2."),
        ex("3OItw", "Mate in two. The g2-pawn cannot move — why?",
          "The bishop on e4 pins the g2-pawn to the king. Sacrifice on h3.",
          "**...Qxh3+!** The g2-pawn is pinned by the bishop on e4, so only the knight can take: **Nxh3**. Then **...Rxh3#** — the rook covers h2, the bishop on c5 covers g1, and g2 is blocked by White's own pinned pawn."),
        ex("1rzK1", "Mate in three.",
          "Check on the back rank first. Then a queen check from f5.",
          "**Rd8+ Kh7** (the only move). **Qf5+** — the fifth rank is open now. After **...g6**, **Qxf7#**: the rook covers g8 and h8, the queen covers g7."),
        ex("2fjiI", "Mate in three.",
          "Take the rook with check. After the bishop blocks, f7 is the key square — your knight protects it.",
          "**Qxe8+ Bf8** (the only block). **Qf7+ Kh8**, and **Qxf8#** — the queen covers g7 and g8, and the knight on g5 covers h7."),
        ex("2qeXI", "Mate in three with rook and knight.",
          "Take the g4-pawn with check, then use your rook on the first rank.",
          "**...Nxg4+ Kg1**. **...Ra1+ Rc1**, **...Rxc1#**: the knight on g4 covers f2 and h2, and the g2-pawn blocks the king."),
        ex("2aPoD", "Mate in three. Black's back rank is weak and the f7-pawn is pinned.",
          "Sacrifice the queen on f7. After the rook takes, it is pinned by your bishop.",
          "**Qxf7+! Rxf7** — now the rook on f7 is pinned by the bishop on b3 and can't go back to f8. **Rd8+ Qe8** (the only block), **Rxe8#**."),
        text("**The rule to remember:** in every mating attack, look at the king's **free squares** first, then try **every check**, and for each check list **every** defence. Only move when you see the mate in your head.")
      ],
      videos: [V("iBZLU1FXhcI", "6 Checkmate Patterns YOU MUST KNOW", "GothamChess"), V("Bo93mIhnDz4", "The Top 23 Checkmate Patterns | Most Important Mating Patterns In Chess | Chess Tactics and Ideas", "Chess Vibes")]
    }
  ]
};

// ---------------------------------------------------------------- LEVEL 11
const GG_WORKS = "rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 6 7";
const GG_BE7 = "rnbq1rk1/pppnbppp/4p3/3pP3/3P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 6 7";
const GG_NF6 = "rnbq1rk1/ppp1bppp/4pn2/3p4/3P4/2NBPN2/PPP2PPP/R1BQK2R w KQ - 0 6";
const YUGO = fenAfter("e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3 Ne5");
const L11 = {
  id: "l11", title: "Level 11 — Attacking the King", band: "1500–2000",
  subtitle: "The Greek gift, pawn storms, sacrifices on f7/g7/e6, rook lifts, the exchange sacrifice — and how to defend",
  lessons: [
    {
      id: "l11-greek-gift", title: "The Greek gift (Bxh7+) and when it works", minutes: 22,
      steps: [
        text("Level 5 showed the basic **Greek gift**: Bxh7+ Kxh7 Ng5+ and Qh5. At 1500–2000 you must know **when it works and when it is just a lost bishop**. Use this checklist before you sacrifice:\n\n- **Bishop** on d3 (or the b1–h7 diagonal) can take h7 **with check**.\n- **Knight** can reach g5 safely — no black bishop on e7/f6 and no pawn on h6 that can take it.\n- **Queen** reaches h5 (or the h-file) in one move.\n- **No black knight on f6** (a white pawn on e5 helps: it kicks the knight away and keeps it away).\n- Check **all three king moves** after Ng5+: ...Kg8, ...Kg6 and ...Kh6. If one of them escapes, the sacrifice fails.\n\nExtras that help: a pawn on h4 (after ...Bxg5 hxg5 the h-file opens), a rook that can lift to h3, a bishop on c1 that recaptures on g5."),
        choice(GG_WORKS, "White to move. Is the Greek gift Bxh7+ good here?",
          ["Yes — Bxh7+ Kxh7 Ng5+ wins: the queen comes to h5 and Black's queen is lost", "No — Black's bishop can take the knight on g5", "No — Black's knight defends h7"], 0,
          "Every point of the checklist is there: bishop on d3, knight to g5, queen to h5, no knight on f6 (the e5-pawn sent it to d7), and no black piece can take on g5. After **Bxh7+ Kxh7 Ng5+ Kg8 Qh5** Black must give up the queen to stop Qh7#. If ...Qxg5, the bishop on c1 takes back."),
        choice(GG_BE7, "White to move. Same structure, but Black's bishop stands on e7 instead of b4. Is Bxh7+ good now?",
          ["Yes — the attack is the same as before", "No — after Bxh7+ Kxh7 Ng5+ Black plays ...Bxg5, and the attack is gone", "No — the white queen cannot reach h5"], 1,
          "One detail changed the whole evaluation. The bishop on e7 **guards g5**, so after Bxh7+ Kxh7 Ng5+ Bxg5 Bxg5 Qxg5 White is simply down a piece. That is why strong players often prepare the sacrifice with h4 (so that hxg5 opens the h-file) — and why defenders like to keep a bishop on e7."),
        choice(GG_NF6, "White to move. Is Bxh7+ good here?",
          ["Yes — it always works when Black has castled short", "No — the knight on f6 takes back on h7, and White has lost a piece for a pawn", "Yes — after ...Nxh7 the queen goes to h5"], 1,
          "With a **knight on f6**, h7 is defended: Bxh7+ Nxh7 just loses a bishop for a pawn. This is why White first plays **e4–e5** in these structures — to push the f6-knight away before the bishop sacrifice."),
        ex("3MLXE", "A bishop check on h7 can win material even without a mating attack. Find it.",
          "When the bishop leaves d3 with check, what does your rook on d1 attack?",
          "**Bxh7+!** — the bishop gives check, and by leaving d3 it uncovers your rook on d1 against the rook on d5. After **...Kxh7**, **Rxd5** wins the rook. Always check what your bishop **uncovers** when it goes to h7."),
        ex("11pui", "Your knight on f3 is pinned to the queen by the bishop on g4. Use the Greek gift to break the pin.",
          "After Bxh7+ Kxh7, the knight jumps out of the pin with check.",
          "**Bxh7+! Kxh7 Ng5+** — the knight leaves the pin *with check*, and now your queen on e2 attacks the bishop on g4. After **...Kg8**, **Qxg4**: you have won the h7-pawn, your queen is on the kingside and Black's king is open."),
        ex("1SHuN", "Your bishop on f5 can take on h7. Find the full attack.",
          "Bxh7+ Kxh7, Qh5+ Kg8 — and then a pawn move takes f7 away from the king and threatens mate.",
          "**Bxh7+ Kxh7 Qh5+ Kg8 g6!** — the pawn takes f7 from the king and threatens **Qh7#**. Black's best is to give the queen with **...Qxh4**, and **Qxh4** leaves you a queen for a bishop."),
        ex("266wI", "Black's knight on f8 is the key defender: it guards h7, g6 and e6. Remove it.",
          "Bxh7+ forces the knight to take. Then e6 and g6 are undefended.",
          "**Bxh7+! Nxh7** — the knight has left f8. Now **Qxe6+ Kf8 Ng6#**: the queen covers f7 and g8, the bishop on e7 and rook on e8 block the king, and the knight on g6 gives mate."),
        ex("19uc1", "Check the list: bishop takes h7 with check, queen reaches the h-file, knight reaches g5, no black knight defends. Go.",
          "Bxh7+ Kxh7, then the queen swings to the h-file along the fourth rank.",
          "**Bxh7+ Kxh7 Qh4+ Kg8 Ng5** — the threat is **Qh7#**, and Black has no knight to defend. Black must give back material to survive. Note the route: the queen reached the h-file along the fourth rank, not via h5."),
        ex("0P79x", "The Greek gift works for Black too: Bxh2+. Find the follow-up.",
          "After ...Bxh2+ Kxh2, the queen comes to h4 with check — and then f2 is weak.",
          "**...Bxh2+ Kxh2 Qh4+ Kg1 Qxf2+** — your rook on f8 supports f2, so queen and rook break in on the f-file. White's king has no defenders left near it."),
        text("**The rule to remember:** before Bxh7+, go through the list — **bishop, knight to g5, queen to the h-file, no knight on f6, and all three king moves** after Ng5+. One missing detail turns a winning attack into a lost bishop.")
      ],
      videos: [V("mo_brhZfj1k", "The Greek Gift Sacrifice | Chess Middlegames", "Hanging Pawns"), V("qbCdJgBX8M4", "How I Used The Greek Gift Sacrifice To Beat Even Titled Players", "Remote Chess Academy"), V("30ku1crutGM", "The Greek Gift | Chess Tactics | ChessKid", "ChessKid")]
    },
    {
      id: "l11-opposite-castling", title: "Opposite-side castling and pawn storms", minutes: 20,
      steps: [
        text("When the kings castle on **opposite sides**, the game becomes a **race**. Pushing the pawns in front of the enemy king does **not** weaken your own king, because your king is on the other wing. So:\n\n- **Throw your pawns** at the enemy king (a **pawn storm**) to open files for your rooks and queen.\n- **Speed beats material.** A pawn or even a piece is a fair price for opening a file one move earlier.\n- A pawn the defender has pushed (for example ...h6 or ...b5) gives you a **hook**: your pawn hits it and the file opens faster.\n- Do not spend moves defending unless you must — every defensive move is a move your attack does not get.\n\nWhy this matters at 1500–2000: many openings (Sicilian Dragon, Caro-Kann, some Queen's Gambit lines) lead to opposite castling, and the player who knows the race wins."),
        choice(YUGO, "Sicilian Dragon, Yugoslav Attack. White has castled long, Black short. What is White's main plan?",
          ["Push the h- and g-pawns (h4–h5, g4) to open the h-file against Black's king", "Push the queenside pawns (a4, b4) to gain space", "Play slowly in the center and wait for Black to attack"], 0,
          "White's king is on c1, so pushing the kingside pawns costs nothing in king safety. **h4–h5** opens the h-file, the queen on d2 and bishop on e3 come to h6 to trade Black's best defender, the bishop on g7. Black races on the other side with ...Nc4, ...Rxc3 ideas and ...b5."),
        choice(null, "In an opposite-castling race, your opponent's pawns are about to reach your king. Which defensive idea is usually best?",
          ["Push your own pawns on that wing to block his", "Keep attacking on the other wing, and if you must defend, trade off his most dangerous attacking piece", "Move your king to the corner and put all pieces around it"], 1,
          "Passive defence usually loses the race. The two best answers are **speed** (keep your own attack going) and **trading his best attacker** (often the dark-squared bishop or the queen). Pushing pawns in front of your own king only gives him more hooks."),
        ex("3RdiS", "Your g-pawn has stormed to g6. Finish the attack. Mate in two.",
          "Take on f7 with check. Which white pieces then give check together?",
          "**gxf7+!** — a **double check**: the pawn checks g8 and your rook on g1 checks along the opened g-file. After **...Kxf7**, **Qg7#** — the rook protects the queen and the knight on c7 covers e8. This is the dream of every pawn storm: the pawn arrives and tears the king open."),
        ex("1DJdH", "You castled long, White short. Your rooks are ready on the h-file. Mate in two.",
          "Sacrifice the rook on h2 to bring the king onto the open file.",
          "**...Rxh2+!** **Kxh2 Rh8#** — the second rook arrives on the open h-file, and your queen on b6 covers g1 along the long diagonal. Doubled rooks on an open file in front of the enemy king are often enough by themselves."),
        ex("2Z5FJ", "White pushed b4 to attack your queen — but that pawn move opened his own king. Mate in two.",
          "Check on a3, then the queen goes to b2.",
          "**...Qa3+ Kd2 Qb2#** — the queen covers c1, c2 and e2 (along the rank), the bishop on f5 covers d3 and the bishop on c5 covers e3. When you have castled on opposite sides, **every pawn move in front of your own king** is a gift to the opponent."),
        ex("3IPJo", "White's king is on c1, Black's on g8. The h-file is open. Mate in two.",
          "Your queen and knight are ready on the h-file. Check first.",
          "**Qh7+** — the knight on g5 protects the queen, so the king must go to f8. **Qxh8#** — the queen covers the eighth rank and g7. An open h-file plus a knight on g5 is the typical result of a successful pawn storm."),
        ex("1jbYE", "Black has castled long (king on b8). His back rank is weak. Mate in three.",
          "Deflect the rook on h8 with a queen sacrifice, then your rooks take over the back rank.",
          "**Qf8+!** forces **...Rxf8**. **Rxf8+ Bxf8**, and **Rd8#** — the king on b8 is boxed in by its own pawns on a7, b7 and c7. A king castled long has a back rank too."),
        ex("2FQwy", "Black's king is on a7 with an open a-file. Destroy the shelter. Mate in three.",
          "Sacrifice the queen on a6, then take the bishop on a1 with check.",
          "**Qxa6+!!** **Kxa6** — the pawn shield is gone. **Rxa1+** takes the bishop with check on the open a-file; after **...Qa4** (the only block), **Rxa4#**: the c4-pawn covers b5 and the bishop on f3 covers b7."),
        text("**The rule to remember:** with opposite-side castling, **open files against the enemy king as fast as you can** — your pawns are free to advance. Count tempi, not pawns.")
      ],
      videos: [V("h83Yd-gOE-c", "Positions with Opposite Side Castling | Chess Middlegames", "Hanging Pawns"), V("3omrdCztGnE", "Pawn Storm Principles You Need To Know", "Chess Vibes"), V("BtUneWJ1z7Q", "Opposite Side Castling in Chess | ChessKid", "ChessKid")]
    },
    {
      id: "l11-sacrifices", title: "Sacrifices on f7, g7 and e6", minutes: 20,
      steps: [
        text("Three squares around a castled or uncastled black king are classic targets (for White it is f2, g2 and e3):\n\n- **f7** — at the start defended only by the king. Taking there pulls the king out or deflects it from defending.\n- **g7** — the key pawn in front of a castled king. Taking it opens the g-file and the long diagonal a1–h8.\n- **e6** — after ...e6 or ...f7–e6 structures, a sacrifice there opens the e-file and the a2–g8 diagonal, and often removes the bishop that defends the light squares.\n\nBefore you sacrifice, ask: **what opens** (which file or diagonal), and **which of my pieces uses it** on the next move?"),
        ex("0jiUb", "Black's queen on d8 is protected only by the king. Exploit it.",
          "f7 is also protected only by the king. Take it with check.",
          "**Bxf7+!** — f7 was defended only by the king. After **...Kxf7**, the king no longer defends d8, and **Qxd8** wins the queen."),
        ex("0UEMM", "Sacrifice the knight on f7 to open the black king.",
          "Nxf7 attacks the queen and the rook. If the king takes, your queen and bishop battery checks on g6.",
          "**Nxf7!** forks the queen on d6 and rook on h8. After **...Kxf7**, **Qg6+** (the bishop on c2 supports the queen) **Ke7 Qg7+**, and the rook on h8 falls next. The king was pulled out of its shelter."),
        ex("2VFBs", "White's king is on h2. Break in on f2.",
          "Take f2 with the rook and check. After the bishop blocks, take it too.",
          "**...Rxf2+ Bg2 Rxg2+! Kh1 Nf2#** — the knight from h3 gives mate; the rook on g2, protected by the knight on h4, takes g1 and h2 from the king."),
        ex("1eZO2", "White's king is still in the center. Sacrifice on f2. Mate in three.",
          "...Bxf2+ forces the king to e2. Then a bishop check and the rook on the open d-file.",
          "**...Bxf2+ Ke2 Bg4+ Kf1 Rd1#** — the bishop on g4 covers e2, the bishop on f2 covers e1 and g1, and the rook mates on the open d-file. A king in the center is the best target for an f2/f7 sacrifice."),
        ex("3HHsi", "Take the g7-pawn — the shield in front of Black's king. Mate in three.",
          "Rgxg7+ first. Then a knight check and the other rook on the 8th rank.",
          "**Rgxg7+! Kf8 Ng6+ Ke8 Rc8#** — the rook on g7 covers the 7th rank, the knight covers f8, and the rook on c8 mates. Removing the g7-pawn opened the king to your rooks."),
        ex("0abW9", "Sacrifice the exchange on e6 to open lines.",
          "Rxe6 removes the bishop and pulls the f7-pawn away. Then the queen comes to f6 with check.",
          "**Rxe6! fxe6** — the f-file and the f6-square are open now. **Qf6+** (protected by the e5-pawn) checks the king and attacks the rook on h8. After **...Ke8**, **Qxh8+** — you gave a rook for a bishop and won a rook back."),
        ex("0B4cF", "Sacrifice the queen on g7. What does your bishop on c3 do afterwards?",
          "After Qxg7+ Kxg7, the black king stands on the long diagonal. A pawn move uncovers your bishop.",
          "**Qxg7+!!** **Kxg7** — the king is pulled onto the long diagonal. **d5+** is a discovered check from the bishop on c3, and the pawn also attacks the queen on c6. After **...Kf7**, **dxc6** wins the queen back: you are a bishop up."),
        text("**The rule to remember:** a sacrifice on f7, g7 or e6 is good when it **opens a line that your next move uses at once** — with check or a threat. If nothing uses the open line, it is just lost material.")
      ],
      videos: [V("a6uV491btII", "Win Easily [by Sacrificing on f7] In 10 Popular Chess Openings", "Remote Chess Academy"), V("Yh3g6Nx8Nz8", "Attacking The Castled King Tactics! Concepts + Examples of Checkmating Your Opponent's Castled King", "Chess Vibes")]
    },
    {
      id: "l11-rook-lift", title: "Rook lifts and the open h-file", minutes: 18,
      steps: [
        text("Rooks are slow to join a kingside attack because pawns block them. Two solutions:\n\n- **Rook lift:** the rook goes up the board first (Re1–e3–h3, Rf1–f3–h3, Rd1–d3–g3) and then sideways to the h- or g-file. On the third rank it is safe behind its own pawns.\n- **Open the h-file:** a knight or queen sacrifice on h7 / g6, or a pawn exchange, removes the h-pawn. Then a rook on the h-file gives mate on h7 or h8.\n\nWhy this matters at 1500–2000: an attack with queen and one minor piece is often one piece short. The **rook lift brings the missing piece**."),
        board("r1bq1rk1/pp3ppp/2n1pn2/3p4/3P4/2PBPN2/PP3PPP/R2QR1K1 w - - 0 10",
          "A typical rook lift route: the rook on e1 goes to e3 and then to h3, where it attacks h7 together with the bishop on d3. On the third rank the rook is protected and cannot be blocked by pawns.",
          ["e1e3", "e3h3"], ["h7"]),
        ex("3cMOY", "Your rook is already lifted to f3. Mate in two.",
          "Sacrifice the queen on h3 to open the h-file for the rook.",
          "**...Qxh3+!** **gxh3 Rxh3#** — the rook on f3 swings to the h-file. The rook on c2 covers the second rank, so the king has no escape."),
        ex("1fU5n", "Your rook on d6 can lift to the h-file. Mate in two.",
          "Sacrifice the queen on h2 to bring the king to the h-file.",
          "**...Qxh2+!** **Kxh2 Rh6#** — the rook goes along the sixth rank to h6. The knight on e2 covers g1 and g3, and White's own pawn on g2 blocks the last square."),
        ex("1Fz5t", "Your rook on f4 is one step from the h-file. Open it. Mate in two.",
          "A knight check on g6 forces ...hxg6.",
          "**Ng6+!** **hxg6** — the h-file is open. **Rh4#**: the rook swings from f4 to h4, and the bishop on c4 covers g8."),
        ex("0jhx4", "Your rook is lifted to h4 and the g7-pawn is pinned by the rook on g1. Mate in two.",
          "A knight check on f6 drives the king to the corner.",
          "**Nf6+** — the g7-pawn cannot take, because it is pinned by your rook on g1. After **...Kh8**, **Rxh7#**: the knight protects the rook on h7."),
        ex("2Q6p6", "Your rook on f3 can reach h3. Mate in two.",
          "Sacrifice the queen on h7 so the king stands on the h-file.",
          "**Qxh7+!!** **Kxh7 Rh3#** — the rook lifts from f3 to h3. The f6-pawn covers g7, and Black's own pawn on g6 and rook on g8 block the king."),
        ex("3ZzhJ", "Use the open h-file to win material.",
          "A rook check on h8, then a knight check that forks the king and the rook on e6.",
          "**Rh8+!** **Kf7 Ng5+** — the knight forks the king and the rook on e6. After **...Kg6 Nxe6 Rxh8 Bxh8**, you have won a whole rook. The open h-file gave the first check."),
        text("**The rule to remember:** if your kingside attack is one piece short, look for a **rook lift** (to the third rank and across) or a sacrifice that **opens the h-file** for a rook.")
      ],
      videos: [V("UFDyNgkIFuw", "The powerful Rook Lift | Chess Attacking Strategy | GM Dejan Bojkov", "Chessfactor"), V("DnBBmPGL1uA", "The Immortal Rook Lift by 11-year old Josh Waitzkin", "agadmator's Chess Channel")]
    },
    {
      id: "l11-exchange-sac", title: "The exchange sacrifice", minutes: 20,
      steps: [
        text("The **exchange sacrifice** gives a rook (5) for a bishop or knight (3). It is the most common sacrifice in strong players' games, because a rook often has **nothing to do** while a minor piece is a key defender.\n\nGive the exchange when:\n\n- the minor piece you take is the **key defender** of the king or of an important square;\n- it **breaks the pawn shield** in front of the king (for example ...Rxc3 against a king on c1);\n- it **wins time** for a check, a pin or a fork that wins more back;\n- your remaining minor piece becomes **much stronger** than the opponent's rook.\n\nPetrosian made the positional exchange sacrifice famous; in attacks it is usually tactical: you get the material back or mate."),
        choice(YUGO, "In this Dragon position Black often plays ...Rxc3 later in the game, giving a rook for the knight. What does Black get for the exchange?",
          ["The pawns in front of White's king get broken (bxc3), the knight that guards d5 and e4 disappears, and Black's attack becomes very fast", "Nothing — it is a beginner's mistake", "It forces an immediate draw"], 0,
          "After ...Rxc3 bxc3 White's king on c1 has broken pawns in front of it, and the Dragon bishop on g7 points straight at them. Black also removes the knight that controls d5 and e4. That is a lot for one exchange."),
        ex("099OA", "Give back the exchange to win the queen.",
          "A rook check on e1 forces the bishop to take. Then the other rook recaptures with check.",
          "**...Re1+!** **Bxe1 Rxe1+ Rxe1** — the bishop that protected the queen on d4 has been pulled away from c3. Now **...Qxd4+** wins the queen with check. You gave the exchange to remove the one piece that held White's position together."),
        ex("0a6n3", "Sacrifice the exchange on f6 to set up a pin.",
          "Rxf6+ removes the bishop. After the queen recaptures, your other rook pins it.",
          "**Rxf6+!** **Qxf6** — the black queen now stands on the f-file in front of the king. **Rf1** pins it: the queen is attacked by the rook and cannot leave the file. After **...Qxf1+ Kxf1** you have given two rooks and got the queen and a bishop."),
        ex("2aKhv", "Give the exchange on e3 to win more.",
          "Take the bishop on e3. After the queen recaptures, the knight on d4 is attacked twice.",
          "**...Rxe3!** **Qxe3 Bxd4** — the bishop takes the knight and pins the queen on e3 to the king on g1 (d4–e3–f2–g1). After **Qxd4**, **...Qxd4+** recaptures with check down the open d-file. You gave a rook and won a bishop, a knight and the queen for a bishop."),
        ex("1qtuf", "Give the exchange on d2 to win a whole rook.",
          "After ...Rxd2 Nxd2, a bishop check also attacks the rook on a7.",
          "**...Rxd2!** **Nxd2 Bd4+** — the bishop checks the king and attacks the rook on a7 along the same diagonal. After **Kf1**, **...Bxa7** — you gave the exchange and won a rook back."),
        ex("1sDVw", "Sacrifice the exchange on g6 to win time for a pin.",
          "Rxg6+ removes the bishop with check. Then your queen takes on e5 with check.",
          "**Rxg6+!** **fxg6 Qxe5+ Rxe5 Bd4** — the bishop pins the rook on e5 to the king on g7. The rook is attacked and cannot move, so Black loses it and you are winning."),
        ex("1reIV", "Give the exchange on d7 to win more material.",
          "Take the knight on d7. Then a bishop check on e5 attacks the rook on b8.",
          "**Rxd7!** **Rxd7 Bxe5+** — the bishop takes a pawn with check and attacks the rook on b8. After **...Ke7**, **Bxb8** — you gave a rook for a knight and won a rook and a pawn back."),
        text("**The rule to remember:** a rook is worth more than a minor piece **only if it has work to do**. If the minor piece is a key defender, or the sacrifice gains time for a check or pin, give the exchange.")
      ],
      videos: [V("7-k9lBO91Wg", "Exchange Sacrifice | Chess Middlegames", "Hanging Pawns"), V("smTv5RZVj9w", "Exchange Sacrifices | Garry Kasparov, Anatoly Karpov - GM Ben Finegold - 2013.07.10", "Saint Louis Chess Club"), V("4dvLcM-ZIPM", "What Is An Exchange Sacrifice In Chess? | ChessKid", "ChessKid")]
    },
    {
      id: "l11-defense", title: "Defending against an attack", minutes: 20,
      steps: [
        text("You will be attacked too. Good defence is **active**. The main tools:\n\n- **Trade the attackers.** Every attacking piece you exchange makes the attack weaker. Offer a queen trade when you can.\n- **Kick the attackers with tempo** — a pawn move that blocks a check *and* attacks a piece.\n- **Counter-attack**, especially in the **center**: an attack on the wing is best met by opening the center.\n- **Give back material.** If you are a pawn or an exchange up, returning it to kill the attack is often the best move.\n- **The king walk.** Sometimes the king itself runs to safety or even helps — a king that attacks an enemy piece is a defender too.\n\nAnd the basic rule: **take what is offered only after you have looked at the opponent's next threat.**"),
        choice(null, "You are a pawn up, but your opponent has a dangerous attack against your king. Which decision is usually best?",
          ["Keep the extra pawn at any cost", "Give the pawn back if that trades queens or kills the attack — an endgame a pawn up or equal is better than getting mated", "Ignore the attack and push your passed pawn"], 1,
          "Material is worth nothing if you are mated. Strong defenders **return material** to trade the attacking pieces, especially the queen. Without the queen, most attacks stop."),
        choice(null, "Your opponent is attacking on the kingside with pawns and pieces. Your center is not closed. What is the classic answer?",
          ["A pawn break in the center (for example ...d5 or ...e5) to open lines and hit his pieces", "Push your own kingside pawns to block him", "Retreat all your pieces to the back rank"], 0,
          "\"An attack on the wing is best met by a counter-attack in the center.\" Opening the center threatens his king and his pieces, and his attacking pieces must come back to defend."),
        ex("1naNb", "You are in check from the queen on d4. White's rook and knight are near your king. Defend actively.",
          "Block the check with a pawn that also attacks one of White's attackers.",
          "**...f6!** blocks the check and attacks the rook on g5 — defence with tempo. Now White's attackers are targets. If the rook runs with **Rf5**, then **...Bxh2+!** moves the bishop off the d-file with check, and your rook on d8 wins the queen on d4. One pawn move turned the attack around.", ["f6"]),
        ex("1qtwB", "You are in check on the long diagonal. Turn defence into attack.",
          "Block with the e-pawn — even if White takes it. Then block again with the f-pawn and bring your rook to the g-file.",
          "**...e5!** gives a pawn to block. After **Qxe5+ f6**, the queen must retreat to protect g2: **Qg3**. Now **...Rg8!** — your rook, queen and bishop all aim at g2. You gave a pawn and turned White's attack into your own."),
        ex("3PRf6", "White's queen and rook have invaded your 7th rank. Trade the attackers.",
          "Attack the queen with a rook that is protected by your other rook.",
          "**...R5e7!** attacks the queen and offers to trade. After **Qxe7 Rxe7**, White has lost the queen for a rook. **Ra8+ Bf8** — your back rank holds, and you are much better."),
        ex("3abIN", "Black's knight just took on d4. Take it — but see Black's next idea.",
          "Trade queens on d4. After that, Black will attack your bishop on e4, which is tied to the rook on e1.",
          "**Qxd4! Qxd4 Nxd4** — you are a piece up and the queens are off. Black hits your bishop again with **...Rae8**, and the calm **f3!** protects it. Trade first, then stop the opponent's last threat."),
        ex("0D9zG", "Black's knight checked your king. Use the king actively.",
          "The king can attack the knight on h4 and the pawn on g3 by itself.",
          "**Kh3!** — the king attacks the knight and the g3-pawn, so Black must save the knight with **...Ng6**. Then **Re8+! Kxe8 a8=Q+** — the rook deflects the king and your pawn promotes with check. An active king was the key defender."),
        ex("3ePBu", "Grab material with your queen — but remember White's threat on g7.",
          "Take on h3 with check, then take the bishop on d3. Then look at Qxg7#.",
          "**...Qxh3+** takes a pawn with check, and after **Qh2**, **...Qxd3** takes the bishop. Now White plays **Qg2**, threatening **Qxg7#** with queen and rook on the g-file — and **...g6!** closes the file. Take when it is safe, but always check the opponent's next threat."),
        text("**The rule to remember:** defend **actively** — trade attackers, block with tempo, counter-attack in the center, and give back material when it kills the attack. Before taking anything, look at the opponent's **next threat**.")
      ],
      videos: [V("hF7JCxBRPxY", "Chess Tips: How To Defend", "GothamChess"), V("XUTsWcWyYnw", "Master Tips To Defend In Chess - 10 Ways To Defend - How To Defend Your King In Chess, Chess Defense", "Chess Vibes"), V("OtFQhd-pSZQ", "A Technique To Survive Pawn Storms On Your King", "Chess Vibes")]
    },
    {
      id: "l11-queen-knight", title: "Attacking with queen and knight", minutes: 18,
      steps: [
        text("Queen and knight are the strongest attacking pair against a king. The reason: they **never block each other**. The queen controls lines; the knight jumps to squares the queen cannot reach and gives **checks that cannot be blocked**.\n\nPatterns to know:\n\n- Knight on **g5** (or f6) + queen on **h7** — mate on h7, or the queen on h7 with the knight covering f7.\n- Knight on **e6** or **f5** + queen on **g7**.\n- The queen takes away the king's squares, the knight gives the check — the mate often happens in the **middle** of the board or on the first rank.\n- A knight sacrifice on g6 or f6 opens the king for the queen.\n\nWhy this matters at 1500–2000: endgames and middlegames with queen + knight against the king are common, and the mates are hard to see because the knight moves strangely."),
        board("5rk1/5ppQ/8/6N1/8/8/5PPP/6K1 b - - 0 1",
          "The basic pattern: the queen on h7 gives mate because the knight on g5 protects it. The king has no square: f8 is blocked by its own rook, f7 is covered by the knight.",
          null, ["h7", "g5"]),
        ex("2rhGz", "Mate in two with queen and knight.",
          "The knight check on h3 is also a discovered check from your queen on d4.",
          "**...Nh3+** — a **double check** from the knight and the queen (along d4–g1). After **Kf1**, **...Qd1#**: the queen covers e1, e2 and the first rank, the knight covers f2 and g1."),
        ex("1vHZo", "Mate in two. Remove the knight that defends h7.",
          "Take on f6 with check. Then the queen goes to h7, supported by the bishop on b1.",
          "**Nxf6+! gxf6 Qh7#** — the knight removed the defender of h7, and the queen mates with the bishop on b1 behind it on the diagonal."),
        ex("05bd6", "Mate in three. Start with a quiet knight move.",
          "The knight joins the queen from g5, threatening Qf7# and Nxe6+.",
          "**Ng5!** — quiet, threatening **Qf7#** (the knight protects f7). After **...Qe8** defends f7, **Nxe6+ Kg8 Qxg7#** — the knight on e6 protects the queen on g7."),
        ex("1InPf", "Mate in two. Black's king is on e8 and its own pieces block it.",
          "Sacrifice the queen on d8 so Black's rook fills the last free square.",
          "**Qd8+!** forces **...Rxd8**. Now **Nc7#** — the knight checks, d8 is blocked by Black's own rook, d7 and f8 by Black's own bishops, and the bishop on h4 covers e7."),
        ex("2fLrG", "Mate in two. Black's g7-pawn is pinned by your rook on g3.",
          "A queen check on d6, then a knight check on f6.",
          "**Qd6+ Kg8 Nf6#** — the g7-pawn cannot take the knight, because it is pinned by the rook on g3. The rook on h1 covers h7 and h8. The queen took the king's squares, the knight gave the check."),
        ex("2N9KU", "Mate in two. Open the h-file with the knight.",
          "A knight check on g6 forces ...hxg6. Then the queen reaches the h-file.",
          "**Ng6+! hxg6 Qh3#** — the queen goes to h3 along the e6–h3 diagonal, and the bishop on b3 covers g8. The knight sacrifice opened the h-file for the queen."),
        ex("0Jjos", "Mate in two in the middle of the board.",
          "A queen check on d2 drives the king to f1. Which knight move gives mate there?",
          "**...Qd2+ Kf1 Ne3#** — the queen covers e1, e2 and f2, and the knight on e3 checks and covers g2. The queen took the squares, the knight gave the check: the typical queen + knight mate."),
        text("**The rule to remember:** with queen and knight, let the **queen take the king's squares** and let the **knight give the check**. Look for knight checks on g5, f6, e6, f5 and h6 next to your queen.")
      ],
      videos: [V("Bo93mIhnDz4", "The Top 23 Checkmate Patterns | Most Important Mating Patterns In Chess | Chess Tactics and Ideas", "Chess Vibes"), V("fvNxQBrx86I", "Chess Tips: Attacking The King, Rule of +2", "GothamChess")]
    }
  ]
};

const out = [L8, L11];
fs.writeFileSync(path.join(__dirname, "..", "content", "course-tactics.json"), JSON.stringify(out, null, 1));
const n = out.flatMap((l) => l.lessons).flatMap((l) => l.steps);
console.log("written:", out.map((l) => l.id + " " + l.lessons.length + " lessons").join(", "), "| exercises", n.filter((s) => s.type === "exercise").length, "| choices", n.filter((s) => s.type === "choice").length);
