// Date shown back to the family in words, beside the native date picker (which follows the phone's own locale).
// No imports, so tests/bn-date.test.ts can load it directly.

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const bnNum = (v: string) => v.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** "2026-11-05" -> "৫ নভেম্বর ২০২৬" (bn) or "5 November 2026" (en). Anything that is not a real YYYY-MM-DD date gives "". */
export function readableDate(iso: string, bn: boolean): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (month < 0 || month > 11 || day < 1) return "";
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  if (day > daysInMonth) return "";
  return bn ? `${bnNum(String(day))} ${BN_MONTHS[month]} ${bnNum(m[1])}` : `${day} ${EN_MONTHS[month]} ${m[1]}`;
}
