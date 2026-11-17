// Which language each sentence of a reply is in, so a mixed reply is spoken with the right voice for each part: a
// Bangla sentence by the Bangladeshi voice, an English one by the British voice. Pure; used by src/voice/speech.js.
// A Bangla sentence that only carries an English name ("FieldShift 360", "Landsat") stays Bangla.

const BN = /[\u0980-\u09E5\u09F0-\u09FF]/g; // Bangla letters and signs, not its digits
const LATIN_WORD = /[A-Za-z]{2,}/g;
export function sentenceLang(s, fallback = 'en') {
  const bn = (s.match(BN) ?? []).length;
  const en = (s.match(LATIN_WORD) ?? []).length;
  if (!bn && !en) return fallback;
  if (!bn) return 'en';
  if (en >= 4 && en * 6 > bn) return 'en'; // mostly English words with a Bangla name in it
  return 'bn';
}

// [{ text, lang }], neighbouring sentences in the same language joined, in order.
export function segmentsByLanguage(text, fallback = 'en') {
  const parts = String(text ?? '').split(/(?<=[।.?!])\s+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const lang = sentenceLang(p, out.at(-1)?.lang ?? fallback);
    if (out.at(-1)?.lang === lang) out.at(-1).text += ` ${p}`;
    else out.push({ text: p, lang });
  }
  return out;
}
