import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_CHECKLIST_TEMPLATE,
  EMPTY_BOARD,
  isFollowUpDate,
  isFollowUpDue,
  normalizeOpportunityUrl,
  opportunitiesToCsv,
  sanitizeOpportunityBoard,
  VERIFIED_OPPORTUNITIES,
  type SavedOpportunity,
} from "../lib/opportunities.ts";

const legacyBookmark = {
  id: "existing",
  title: "Frontend internship",
  url: "https://EXAMPLE.com:443",
  track: "freelance",
  savedAt: "2026-11-07T10:00:00.000Z",
} as const;

test("existing bookmarks and checklist progress survive the tracker upgrade", () => {
  const board = sanitizeOpportunityBoard({
    path: "study",
    completedByPath: { study: ["admission"] },
    saved: [legacyBookmark],
  });
  assert.deepEqual(board, {
    path: "study",
    completedByPath: { study: ["admission"] },
    saved: [{ ...legacyBookmark, url: "https://example.com/", status: "saved", followUp: "", note: "" }],
  });
});

test("stored tracker progress retains valid data and repairs invalid fields", () => {
  const board = sanitizeOpportunityBoard({
    ...EMPTY_BOARD,
    saved: [
      { ...legacyBookmark, status: "applied", followUp: "2028-02-29", note: "Interview scheduled" },
      { ...legacyBookmark, id: "bad-fields", status: "constructor", followUp: "2026-02-29", note: "x".repeat(550) },
      { ...legacyBookmark, id: "bad-url", url: "javascript:alert(1)" },
    ],
  });
  assert.equal(board?.saved.length, 2);
  assert.equal(board?.saved[0].status, "applied");
  assert.equal(board?.saved[0].followUp, "2028-02-29");
  assert.equal(board?.saved[0].note, "Interview scheduled");
  assert.equal(board?.saved[1].status, "saved");
  assert.equal(board?.saved[1].followUp, "");
  assert.equal(board?.saved[1].note.length, 500);
});

test("opportunity links accept only HTTP(S) URLs without credentials", () => {
  assert.equal(normalizeOpportunityUrl(" https://EXAMPLE.com:443 "), "https://example.com/");
  assert.equal(normalizeOpportunityUrl("http://example.com/post?id=12#apply"), "http://example.com/post?id=12#apply");
  for (const url of ["https://person:password@example.com/", "/jobs", "javascript:alert(1)", "mailto:user@example.com"]) {
    assert.equal(normalizeOpportunityUrl(url), null);
  }
});

test("follow-ups validate calendar dates and exclude accepted or closed opportunities", () => {
  for (const date of ["2026-02-29", "2026-04-31", "2026-1-01", "0000-01-01", ""]) {
    assert.equal(isFollowUpDate(date), false);
  }
  assert.equal(isFollowUpDate("2028-02-29"), true);
  const item = { status: "applied", followUp: "2026-11-07", note: "" } as const;
  assert.equal(isFollowUpDue(item, "2026-11-06"), false);
  assert.equal(isFollowUpDue(item, "2026-11-07"), true);
  assert.equal(isFollowUpDue(item, "2026-11-08"), true);
  assert.equal(isFollowUpDue({ ...item, followUp: "" }, "2026-11-08"), false);
  assert.equal(isFollowUpDue({ ...item, status: "accepted" }, "2026-11-08"), false);
  assert.equal(isFollowUpDue({ ...item, status: "closed" }, "2026-11-08"), false);
});

test("tracker CSV keeps multiline notes and escapes potential spreadsheet formulas", () => {
  const opportunity: SavedOpportunity = {
    ...legacyBookmark,
    title: 'ঢাকা, "ইন্টার্নশিপ"',
    status: "response",
    followUp: "2026-11-08",
    note: '  =SUM(1,2)\r\nবলেছে "আসুন"',
  };
  const csv = opportunitiesToCsv([opportunity]);
  assert.equal(csv, [
    '"title","url","path","status","follow_up_date","note","saved_at"',
    `"ঢাকা, ""ইন্টার্নশিপ""","https://EXAMPLE.com:443","freelance","response","2026-11-08","'  =SUM(1,2)\r\nবলেছে ""আসুন""","2026-11-07T10:00:00.000Z"`,
  ].join("\r\n"));
});

test("VERIFIED_OPPORTUNITIES: Catalog contains verified domestic & global opportunities with schema integrity", () => {
  assert.ok(Array.isArray(VERIFIED_OPPORTUNITIES) && VERIFIED_OPPORTUNITIES.length >= 10);
  const validCategories = ["job", "internship", "scholarship", "grant", "agri"];
  const validPaths = ["freelance", "study", "farm", "home"];

  for (const opp of VERIFIED_OPPORTUNITIES) {
    assert.ok(opp.id.length > 0);
    assert.ok(opp.titleBn.length > 0);
    assert.ok(opp.providerBn.length > 0);
    assert.ok(validCategories.includes(opp.category));
    assert.ok(validPaths.includes(opp.path));
    assert.ok(opp.url.startsWith("http://") || opp.url.startsWith("https://"));
    assert.ok(opp.verifiedSource.length > 0);
    assert.ok(opp.tags.length > 0);
  }
});

test("APPLICATION_CHECKLIST_TEMPLATE: Contains required document milestones for job & scholarship applications", () => {
  assert.ok(Array.isArray(APPLICATION_CHECKLIST_TEMPLATE) && APPLICATION_CHECKLIST_TEMPLATE.length >= 5);
  const ids = APPLICATION_CHECKLIST_TEMPLATE.map((item) => item.id);
  assert.ok(ids.includes("cv"));
  assert.ok(ids.includes("transcript"));
  assert.ok(ids.includes("nid"));
  assert.ok(ids.includes("sop"));
});

test("stored tracker progress retains valid checklist array and strips invalid types", () => {
  const board = sanitizeOpportunityBoard({
    ...EMPTY_BOARD,
    saved: [
      {
        ...legacyBookmark,
        status: "applied",
        checklist: ["cv", "nid", "invalid_id_not_string", 12345],
      },
    ],
  });
  assert.equal(board?.saved.length, 1);
  assert.deepEqual(board?.saved[0].checklist, ["cv", "nid"]);
});
