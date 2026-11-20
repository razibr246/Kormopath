/*
 * Splits a reply into speakable chunks for faster voice: the first chunk is short (one sentence, about 90 characters)
 * so audio can start as soon as it is synthesised, and later chunks are larger (about 260 characters) so there are
 * few requests. Splits only at sentence ends (। ? ! . and line breaks), or at a comma when a sentence is too long.
 * No imports, so it is unit-tested in tests/speech-chunks.test.ts.
 */
export function splitSpeech(text: string, firstMax = 90, restMax = 260): string[] {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^।?!.\n]+[।?!.]*\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  const pieces: string[] = [];
  for (const s of sentences) {
    if (s.length <= restMax) { pieces.push(s); continue; }
    // A very long sentence: break at commas, then hard-wrap at a space.
    let cur = "";
    for (const part of s.split(/(?<=[,،;])\s*/)) {
      if ((cur + " " + part).trim().length > restMax && cur) { pieces.push(cur.trim()); cur = part; } else cur = (cur + " " + part).trim();
    }
    while (cur.length > restMax) { const cut = cur.lastIndexOf(" ", restMax) > 40 ? cur.lastIndexOf(" ", restMax) : restMax; pieces.push(cur.slice(0, cut).trim()); cur = cur.slice(cut).trim(); }
    if (cur) pieces.push(cur);
  }
  const chunks: string[] = [];
  for (const p of pieces) {
    const max = chunks.length === 0 ? firstMax : restMax;
    const last = chunks[chunks.length - 1];
    if (chunks.length > 1 && last && (last + " " + p).length <= max) chunks[chunks.length - 1] = `${last} ${p}`;
    else if (chunks.length === 1 && chunks[0].length < 25 && (chunks[0] + " " + p).length <= firstMax) chunks[0] = `${chunks[0]} ${p}`;
    else chunks.push(p);
  }
  return chunks;
}
