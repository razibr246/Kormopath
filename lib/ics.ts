/**
 * Minimal RFC 5545 calendar builder for all-day reminders. No imports, so tests load it directly.
 * Used for dates the user entered (invoice due dates, a farm-work day); never for invented dates.
 */
export interface AllDayEvent {
  uid: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  url?: string;
}

export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().startsWith(value);

const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");

/** Fold lines at 75 UTF-8 octets without splitting a codepoint (Bangla is 3 bytes per char). */
function fold(line: string): string {
  const out: string[] = [];
  let part = "";
  let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) { out.push(part); part = " "; bytes = 1; }
    part += char;
    bytes += size;
  }
  out.push(part);
  return out.join("\r\n");
}

export function allDayIcs(events: AllDayEvent[], product: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//KormoPath//${product}//BN`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const event of events) {
    if (!isIsoDate(event.date)) continue;
    const next = new Date(Date.parse(event.date + "T00:00:00Z") + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(event.uid).slice(0, 120)}@${product.toLowerCase().replace(/[^a-z0-9]/g, "")}.kormopath`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${escape(event.title.slice(0, 200))}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escape(event.description.slice(0, 1000))}`);
    if (event.url && /^https?:\/\//.test(event.url)) lines.push(`URL:${event.url}`);
    // A reminder at 9:00 the day before (all-day events start at local midnight).
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT15H", `DESCRIPTION:${escape(event.title.slice(0, 200))}`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
