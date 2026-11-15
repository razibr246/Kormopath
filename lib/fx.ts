/** Validate the provider's USD/BDT quote before labelling it live. */
export function readFxQuote(raw: unknown, now = Date.now()): { rate: number; checked: string } {
  if (!raw || typeof raw !== "object") throw new Error("Unexpected exchange-rate response.");
  const value = raw as Record<string, unknown>;
  const rate = (value.rates as Record<string, unknown> | undefined)?.BDT;
  const updated = value.time_last_update_unix;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 80 || rate >= 250) throw new Error("Exchange rate outside supported range.");
  if (typeof updated !== "number" || !Number.isSafeInteger(updated) || updated <= 0 || updated * 1000 > now + 3600_000 || now - updated * 1000 > 48 * 3600_000) throw new Error("Exchange rate is missing a recent provider timestamp.");
  return { rate, checked: new Date(updated * 1000).toISOString() };
}
