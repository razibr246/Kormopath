/*
 * Model cooldown for the Gemini failover chain (no imports, so it is unit-testable).
 *
 * When a model is rate-limited on every key, or times out, the next request would pay the same
 * penalty again (up to the 12 s attempt cap) before reaching the lighter model. A model that just
 * failed that way is therefore moved to the END of the chain for a few minutes: still tried if
 * every other model fails, never silently dropped. Callers log each deferral in the route trace.
 */

export const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
export const TIMEOUT_COOLDOWN_MS = 2 * 60_000;

export type Cooldown = {
  /** Defer this model for ms, doubled for each failure since its last success (capped). */
  mark(model: string, ms: number): void;
  /** Forget a deferral, e.g. after the model answered. */
  clear(model: string): void;
  /** Milliseconds left on a model's deferral (0 when it is not deferred). */
  remainingMs(model: string): number;
  /** Same models, with deferred ones moved to the end in their original order. */
  order(models: readonly string[]): string[];
};

/** Repeated failures double the deferral (2 min → 4 → 8 …) up to this cap; a success resets it. */
export const MAX_COOLDOWN_MS = 30 * 60_000;

export function createCooldown(now: () => number = () => Date.now()): Cooldown {
  const until = new Map<string, number>();
  const strikes = new Map<string, number>();
  const remainingMs = (model: string) => {
    const t = until.get(model);
    if (t === undefined) return 0;
    const left = t - now();
    if (left <= 0) { until.delete(model); return 0; }
    return left;
  };
  return {
    mark: (model, ms) => {
      const n = strikes.get(model) ?? 0;
      strikes.set(model, n + 1);
      until.set(model, now() + Math.min(Math.max(0, ms) * 2 ** n, MAX_COOLDOWN_MS));
    },
    clear: (model) => { until.delete(model); strikes.delete(model); },
    remainingMs,
    order: (models) => [
      ...models.filter((m) => remainingMs(m) === 0),
      ...models.filter((m) => remainingMs(m) > 0),
    ],
  };
}
