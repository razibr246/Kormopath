/*
 * Guardrails for the FieldShift360 routes (app/api/field360/*). NO imports — pure and unit-tested
 * (tests/field360.test.ts).
 *
 * KormoPath's farm rule: never give a pesticide, fertilizer or animal-medicine dose. The model may name an
 * active-ingredient group, but any amount (number + unit, or a rate such as "per litre") is rejected, so the
 * schema's superRefine sends the answer back through the repair loop.
 */

const BN = "০১২৩৪৫৬৭৮৯";
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));

// number followed by a dose unit, in English or Bangla
const AMOUNT = /\d+(?:[.,]\d+)?\s*(?:-|–|to)?\s*\d*(?:[.,]\d+)?\s*(?:ml|mL|millilit(?:re|er)s?|l\b|lit(?:re|er)s?|g\b|grams?|gm\b|kg\b|kilograms?|mg\b|cc\b|%|ppm|মিলি|মি\.লি|লিটার|গ্রাম|কেজি|সিসি|শতাংশ)/i;
const RATE = /\b(?:per|\/)\s*(?:litre|liter|l|acre|bigha|decimal|hectare|ha|tank|16\s*l)\b|প্রতি\s*(?:লিটার|একর|বিঘা|শতাংশ|শতক|হেক্টর|ট্যাংক)/i;

/** The text that would read as a dose, or null when there is none. */
export function doseIn(text: string): string | null {
  const t = toAscii(text ?? "");
  const m = t.match(AMOUNT) ?? t.match(RATE);
  return m ? m[0].trim() : null;
}
