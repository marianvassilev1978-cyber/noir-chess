// Glicko-2 (Glickman, 2012). One game = one rating period. Ratings in the Glicko scale (1500 / 350 / 0.06 start).
const TAU = 0.5, EPS = 1e-6, Q = 173.7178;
const g = (phi) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu, muj, phij) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

// player {r, rd, vol}; opp {r, rd}; score 1 / 0.5 / 0. Returns the new {r, rd, vol}.
export function update(player, opp, score) {
  const mu = (player.r - 1500) / Q, phi = player.rd / Q, sigma = player.vol || 0.06;
  const muj = (opp.r - 1500) / Q, phij = opp.rd / Q;
  const gj = g(phij), Ej = E(mu, muj, phij);
  const v = 1 / (gj * gj * Ej * (1 - Ej));
  const delta = v * gj * (score - Ej);
  // volatility (Illinois iteration)
  const a = Math.log(sigma * sigma);
  const f = (x) => (Math.exp(x) * (delta * delta - phi * phi - v - Math.exp(x))) / (2 * Math.pow(phi * phi + v + Math.exp(x), 2)) - (x - a) / (TAU * TAU);
  let A = a, B;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else { let k = 1; while (f(a - k * TAU) < 0) k++; B = a - k * TAU; }
  let fA = f(A), fB = f(B);
  for (let i = 0; i < 60 && Math.abs(B - A) > EPS; i++) {
    const C = A + ((A - B) * fA) / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2;
    B = C; fB = fC;
  }
  const sigma2 = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + sigma2 * sigma2);
  const phi2 = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const mu2 = mu + phi2 * phi2 * gj * (score - Ej);
  return { r: 1500 + Q * mu2, rd: Math.max(45, Math.min(350, Q * phi2)), vol: sigma2 };
}

// what a result would do (for "+X if you win / −Y if you lose")
export function preview(player, opp) {
  const d = (s) => Math.round(update(player, opp, s).r - player.r);
  return { win: d(1), draw: d(0.5), loss: d(0) };
}
export const expected = (r, opp) => 1 / (1 + Math.pow(10, (opp - r) / 400));
