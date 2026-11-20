/**
 * Second-order dynamics for animation: a value that follows a moving target the way a body does, with inertia,
 * a little overshoot and settling, instead of sliding there in a straight line.
 *
 *   y + k1·y' + k2·y'' = x + k3·x'      k1 = z/(πf),  k2 = 1/(2πf)²,  k3 = r·z/(2πf)
 *
 * f is the natural frequency (Hz: how fast it responds), z the damping ratio (z < 1 overshoots, z = 1 settles without
 * overshoot, z > 1 is sluggish), r the initial response (r < 0 anticipates, r > 1 overshoots at the start).
 * Integrated with semi-implicit Euler; k2 is raised when needed so a long frame (a tab coming back) can never explode.
 * Pure, no imports: tested in tests/spring.test.ts.
 */
export type SpringParams = { f: number; z: number; r?: number };

export type Spring = { y: number; v: number; xp: number };

export const springInit = (x: number): Spring => ({ y: x, v: 0, xp: x });

export function springStep(s: Spring, x: number, dt: number, { f, z, r = 0 }: SpringParams): Spring {
  if (dt <= 0) return s;
  const w = 2 * Math.PI * f;
  const k1 = z / (Math.PI * f), k2 = 1 / (w * w), k3 = (r * z) / w;
  const xd = (x - s.xp) / dt;
  // Stability: semi-implicit Euler needs k2 ≥ dt·(dt + k1)/2 roughly; clamp it rather than blow up.
  const k2s = Math.max(k2, (dt * dt) / 2 + (dt * k1) / 2, dt * k1);
  const y = s.y + dt * s.v;
  const v = s.v + (dt * (x + k3 * xd - y - k1 * s.v)) / k2s;
  return { y, v, xp: x };
}

/** A bundle of springs keyed by channel name, each with its own parameters (default when unnamed). */
export function springSet(params: Record<string, SpringParams>, fallback: SpringParams) {
  const state: Record<string, Spring> = {};
  return {
    step(targets: Record<string, number>, dt: number): Record<string, number> {
      const out: Record<string, number> = {};
      for (const k in targets) {
        const s = state[k] ?? springInit(targets[k]);
        state[k] = springStep(s, targets[k], dt, params[k] ?? fallback);
        out[k] = state[k].y;
      }
      return out;
    },
    velocity: (k: string) => state[k]?.v ?? 0,
    snap(targets: Record<string, number>) { for (const k in targets) state[k] = springInit(targets[k]); },
  };
}

/**
 * Procedural stepping (as in games): each foot stays planted until the hips have moved too far from where it wants
 * to stand, then that one foot swings to a new spot in an arc (heel off, swing with lift, heel strike) while the
 * other holds the weight. Walking emerges from the hips moving; standing still, the feet stay exactly put.
 */
export type Foot = { x: number; from: number; to: number; k: number; strikeAt: number };
export const footAt = (x: number): Foot => ({ x, from: x, to: x, k: -1, strikeAt: -99 });

export const STEP_SECONDS = 0.26;
export const MAX_STRIDE = 34;

export function stepFeet(feet: { n: Foot; f: Foot }, want: { n: number; f: number }, dt: number, now: number, threshold = 9) {
  const swinging = feet.n.k >= 0 || feet.f.k >= 0;
  if (!swinging) {
    const en = Math.abs(want.n - feet.n.x), ef = Math.abs(want.f - feet.f.x);
    const side: "n" | "f" = en >= ef ? "n" : "f";
    const err = Math.max(en, ef);
    if (err > threshold) {
      const ft = feet[side], dir = Math.sign(want[side] - ft.x);
      // Step a little past where it wants to be (a lead), never further than a stride.
      ft.from = ft.x; ft.to = ft.x + dir * Math.min(MAX_STRIDE, err + Math.min(6, err * 0.2)); ft.k = 0;
    }
  }
  const out = { n: { lift: 0, roll: 0 }, f: { lift: 0, roll: 0 } };
  for (const side of ["n", "f"] as const) {
    const ft = feet[side];
    if (ft.k < 0) continue;
    ft.k += dt / STEP_SECONDS;
    if (ft.k >= 1) { ft.k = -1; ft.x = ft.to; ft.strikeAt = now; continue; }
    const e = ft.k * ft.k * (3 - 2 * ft.k);
    ft.x = ft.from + (ft.to - ft.from) * e;
    out[side].lift = Math.sin(Math.PI * ft.k) * 10;
    out[side].roll = ft.k < 0.35 ? 22 * (ft.k / 0.35) : -12 * (1 - ft.k); // toe-off, then heel-first landing
  }
  return out;
}
