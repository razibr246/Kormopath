// Evidence checks. The model must quote the source for every claim it makes;
// we then look for that quote in the source ourselves. No imports so it can be unit-tested.

export type Verdict = "verified" | "partial" | "unverified";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[^\p{L}\p{N}+#./%$-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return normalize(s).split(" ").filter((t) => t.length > 1);
}

/**
 * Checks that `evidence` actually appears in `source`.
 * - verified: exact (normalized) substring
 * - partial: at least 80% of its words appear in one window of the source
 * - unverified: anything else; the claim is dropped from scoring
 */
export function verifyEvidence(evidence: string, source: string): { verdict: Verdict; score: number } {
  const ev = normalize(evidence);
  const src = normalize(source);
  if (!ev) return { verdict: "unverified", score: 0 };
  if (src.includes(ev)) return { verdict: "verified", score: 1 };

  const evT = tokens(evidence);
  const srcT = tokens(source);
  if (evT.length === 0) return { verdict: "unverified", score: 0 };
  const win = Math.max(evT.length * 2, 8);
  let bestHit = 0;
  for (let i = 0; i < Math.max(1, srcT.length - win + 1); i++) {
    const windowSet = new Set(srcT.slice(i, i + win));
    const hit = evT.filter((t) => windowSet.has(t)).length / evT.length;
    if (hit > bestHit) bestHit = hit;
    if (bestHit === 1) break;
  }
  const score = Math.round(bestHit * 100) / 100;
  return { verdict: score >= 0.8 ? "partial" : "unverified", score };
}

/** A number the model reports (e.g. a receipt amount) must literally appear in the OCR text. */
export function numberAppears(value: number, source: string): boolean {
  const plain = source.replace(/,/g, "");
  const candidates = [value.toFixed(2), value.toString(), Math.round(value).toString()];
  return candidates.some((c) => new RegExp(`(^|[^0-9.])${c.replace(".", "\\.")}([^0-9]|$)`).test(plain));
}

/** Every dollar amount in generated text must be one we gave the model. */
export function unknownAmounts(text: string, allowed: number[]): number[] {
  const found = [...text.matchAll(/\$\s?([0-9][0-9,]*(?:\.[0-9]+)?)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  return found.filter((n) => !allowed.some((a) => Math.abs(a - n) < 0.5));
}
