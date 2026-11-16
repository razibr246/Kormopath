import { test } from "node:test";
import assert from "node:assert/strict";
import { allDayIcs, isIsoDate } from "../lib/ics.ts";

test("allDayIcs writes valid all-day events with alarms and skips bad dates", () => {
  const ics = allDayIcs([
    { uid: "m1", date: "2026-12-01", title: "মাইলস্টোন ১: ডিজাইন জমা, Acme Ltd", description: "৳ amount; line\nnext" },
    { uid: "bad", date: "2026-02-30", title: "invalid" },
  ], "ChuktiGuard", new Date("2026-11-16T10:00:00Z"));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261201\r\nDTEND;VALUE=DATE:20261202/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1, "invalid date must be skipped");
  assert.match(ics, /Acme Ltd/);
  assert.ok(ics.includes("\\,") && ics.includes("\;") && ics.includes("\\n"), "text must be escaped");
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line}`);
});

test("isIsoDate rejects impossible dates", () => {
  assert.equal(isIsoDate("2026-02-28"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("26-2-3"), false);
});
