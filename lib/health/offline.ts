/*
 * When the model is not used (no key, call failed, answer failed the guard, or no connection), answers come
 * from fixed rules. People must be able to tell: such answers carry the label "অফলাইন উত্তর / Offline answer".
 * NO imports, so tests can load it directly.
 */

/** True when the answer did not come from the AI model. Unknown or empty engine counts as offline. */
export function isOfflineEngine(engine: string | null | undefined): boolean {
  const e = (engine ?? "").trim().toLowerCase();
  return e === "" || /rule-based|template|offline|fallback/.test(e);
}

export const OFFLINE_LABEL = { bn: "অফলাইন উত্তর", en: "Offline answer" } as const;
