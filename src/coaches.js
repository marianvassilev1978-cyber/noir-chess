// The six coaches: original characters with their own specialty and voice. Art: src/art/cast.js (COACH_LOOKS).
import { COACH_LOOKS } from "./art/cast.js";
import { state } from "./store.js";

export const COACHES = [
  {
    id: "amara", name: "Amara Bello", short: "Amara", role: "The Mentor", flag: "🇳🇬", country: "Nigeria / UK", age: 45,
    specialty: "Game Review, mindset and the blunder-check habit", areas: ["review", "mindset", "beginner"],
    bio: "Amara taught chess in community halls in Lagos and London for twenty years. She has watched thousands of beginners become club players, and she believes every loss is a lesson that has not been read yet.",
    voice: "Warm, encouraging, practical. Calls you 'friend'. Always finds the good before the fix.",
    hello: ["Welcome back, {name}. Every game you review is rating you keep.", "Hi {name}. One good habit today beats ten tricks.", "Ready, {name}? Check, capture, threat — then move."],
  },
  {
    id: "niko", name: "Niko Stavrev", short: "Niko", role: "The Tactician", flag: "🇧🇬", country: "Bulgaria", age: 26,
    specialty: "Tactics, forks, sacrifices and Puzzle Rush", areas: ["tactics", "rush"],
    bio: "Niko solved his first thousand puzzles on a cracked phone on the bus to school. He now holds absurd Puzzle Rush records and gets visibly excited about knight forks.",
    voice: "Fast, energetic, playful. Lots of exclamation marks. Loves a sacrifice.",
    hello: ["Yo {name}! Something on that board is hanging. Let's find it.", "{name}! Forks first, questions later.", "Warm-up time, {name}: three puzzles, no hints!"],
  },
  {
    id: "mira", name: "Mira Halden", short: "Mira", role: "The Strategist", flag: "🇳🇴", country: "Norway", age: 58,
    specialty: "Pawn structure, plans and positional play", areas: ["strategy", "plans"],
    bio: "Mira played correspondence chess for three decades, one slow move a day. She sees a position like a landscape: where the pawns are, the plans follow.",
    voice: "Calm, wise, unhurried. Speaks in images. Asks you what the position wants.",
    hello: ["Good to see you, {name}. Shall we look at the pawns first?", "Patience, {name}. A good plan is worth more than a quick trick.", "Every position asks a question, {name}. Let's listen."],
  },
  {
    id: "anselm", name: "Prof. Anselm Krauss", short: "Professor", role: "The Endgame Professor", flag: "🇦🇹", country: "Austria", age: 67,
    specialty: "Endgames and technique (runs the Endgame Gym)", areas: ["endgame", "technique"],
    bio: "The Professor taught mathematics for forty years and endgames for fifty. Strict, precise, secretly delighted when a student finds the only move.",
    voice: "Strict but fair, precise, a little formal. Expects technique. Rarely praises, means it when he does.",
    hello: ["Good day, {name}. Technique wins games. Shall we practise?", "{name}. King activity. Always king activity.", "Precision, {name}. The endgame forgives nothing."],
  },
  {
    id: "juno", name: "Dr. Juno Park", short: "Dr. Juno", role: "The Opening Scientist", flag: "🇨🇦", country: "Canada / Korea", age: 31,
    specialty: "Openings and gambits, including the Alien and the Martian", areas: ["openings", "gambits"],
    bio: "Juno has a PhD in biochemistry and a spreadsheet of 40,000 opening lines. She treats every gambit like an experiment: hypothesis, test, result.",
    voice: "Curious, nerdy, enthusiastic. Explains the why behind each move. Uses lab metaphors.",
    hello: ["Hypothesis, {name}: you know your first 6 moves. Let's test it.", "New data, {name}! Shall we run an opening drill?", "Hi {name}! Today's experiment: the Vienna Gambit."],
  },
  {
    id: "dante", name: "Dante Rocha", short: "Dante", role: "The Attacker", flag: "🇧🇷", country: "Brazil", age: 38,
    specialty: "King attacks, initiative and gambit drills", areas: ["attack", "gambits"],
    bio: "Dante learned chess on the beaches of Salvador, where the loser buys coconuts. He has never once offered a draw. He plays for mate, and he wants you to as well.",
    voice: "Bold, dramatic, theatrical. Talks about storms and kings. Hates passive moves.",
    hello: ["{name}! Somewhere there is a king that needs attacking.", "No passive moves today, {name}. Bring the pieces!", "Smell that, {name}? That is the initiative."],
  },
].map((c) => ({ ...c, look: COACH_LOOKS[c.id] }));

export const coachById = (id) => COACHES.find((c) => c.id === id) || COACHES[0];
export const mainCoach = () => coachById(state().settings.coach || "amara");
// the coach who owns a topic (course narration)
export function coachFor(area) { return COACHES.find((c) => c.areas.includes(area)) || mainCoach(); }
export const fill = (t, vars = {}) => String(t).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
