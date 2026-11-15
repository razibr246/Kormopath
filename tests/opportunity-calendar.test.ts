import { test } from "node:test";
import assert from "node:assert/strict";
import { opportunitiesToIcs, type SavedOpportunity } from "../lib/opportunities.ts";
const item: SavedOpportunity = { id: "test", title: "ইন্টার্নশিপ", url: "https://example.com/jobs", track: "freelance", status: "applied", followUp: "2028-02-29", note: "কল করুন", savedAt: "2026-11-08" };
const now = new Date("2026-11-08T00:00:00Z");
test("follow-up calendar exports all-day leap-day event and stable ID", () => {
  const ics = opportunitiesToIcs([item], now);
  assert.match(ics, /DTSTART;VALUE=DATE:20280229/);
  assert.match(ics, /DTEND;VALUE=DATE:20280301/);
  assert.match(ics, /UID:test@mypath.kormopath/);
  assert.match(ics, /DTSTAMP:20261108T000000Z/);
  assert.equal(opportunitiesToIcs([item], now), ics);
});
test("completed, unscheduled and impossible follow-ups are omitted", () => {
  for (const partial of [{ status: "closed" }, { status: "accepted" }, { followUp: "" }, { followUp: "2026-02-30" }]) assert.doesNotMatch(opportunitiesToIcs([{ ...item, ...partial } as SavedOpportunity], now), /BEGIN:VEVENT/);
});
test("calendar escapes content injection and folds Bangla without corrupting it", () => {
  const title = "কাজ".repeat(100) + "\r\nBEGIN:VEVENT";
  const ics = opportunitiesToIcs([{ ...item, id: "bad\r\nid", title, note: "one,two;three\\four\nfive" }], now);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2); // one actual event, one escaped text fragment
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
  const unfolded = ics.replace(/\r\n /g, "");
  assert.match(unfolded, /one\\,two\\;three\\\\four\\nfive/);
  assert.ok(unfolded.includes("SUMMARY:Follow up: " + title.replace(/\r\n/g, "\\n")));
  assert.equal(unfolded.split("\r\n").filter((line) => line === "BEGIN:VEVENT").length, 1);
});
