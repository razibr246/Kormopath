import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_DASHBOARD_APPS,
  DASHBOARD_PRESETS,
  DEFAULT_PINNED_APPS,
  sanitizePinnedApps,
  reorderPinnedApps,
  togglePinnedApp,
} from "../lib/dashboard.ts";

test("dashboard: contains exactly 12 companion apps with complete metadata", () => {
  assert.equal(ALL_DASHBOARD_APPS.length, 12);
  const ids = ALL_DASHBOARD_APPS.map((a) => a.id);
  const expected = [
    "admitbuddy",
    "mediscan",
    "shohoj",
    "krishi",
    "field",
    "haatbazar",
    "rokkha",
    "legal",
    "probaho",
    "feeguard",
    "chuktiguard",
    "workspace",
  ];
  assert.deepEqual(ids, expected);

  for (const app of ALL_DASHBOARD_APPS) {
    assert.ok(app.id.length > 0);
    assert.ok(app.nameBn.length > 0);
    assert.ok(app.nameEn.length > 0);
    assert.ok(app.descBn.length > 0);
    assert.ok(app.href.startsWith("/"));
    assert.ok(app.icon.length > 0);
    assert.ok(app.tagBn.length > 0);
  }
});

test("dashboard: contains all 4 quick presets with exact Bangla labels and valid apps", () => {
  assert.ok(DASHBOARD_PRESETS.rural);
  assert.equal(DASHBOARD_PRESETS.rural.labelBn, "কৃষক ও পল্লী");
  assert.deepEqual(DASHBOARD_PRESETS.rural.appIds, ["krishi", "field", "haatbazar", "rokkha"]);

  assert.ok(DASHBOARD_PRESETS.student);
  assert.equal(DASHBOARD_PRESETS.student.labelBn, "শিক্ষার্থী ও ভর্তি");
  assert.deepEqual(DASHBOARD_PRESETS.student.appIds, ["admitbuddy", "probaho", "shohoj", "rokkha"]);

  assert.ok(DASHBOARD_PRESETS.freelancer);
  assert.equal(DASHBOARD_PRESETS.freelancer.labelBn, "পেশাজীবী ও ফ্রিল্যান্সার");
  assert.deepEqual(DASHBOARD_PRESETS.freelancer.appIds, ["workspace", "feeguard", "chuktiguard", "shohoj", "rokkha"]);

  assert.ok(DASHBOARD_PRESETS.all);
  assert.equal(DASHBOARD_PRESETS.all.labelBn, "সব অ্যাপ");
  assert.equal(DASHBOARD_PRESETS.all.appIds.length, 12);
});

test("dashboard: sanitizePinnedApps handles untrusted input safely", () => {
  assert.deepEqual(sanitizePinnedApps(null), DEFAULT_PINNED_APPS);
  assert.deepEqual(sanitizePinnedApps("string"), DEFAULT_PINNED_APPS);
  assert.deepEqual(sanitizePinnedApps({}), DEFAULT_PINNED_APPS);
  assert.deepEqual(sanitizePinnedApps([]), DEFAULT_PINNED_APPS);
  assert.deepEqual(sanitizePinnedApps(["unknown_app", "<script>"]), DEFAULT_PINNED_APPS);

  const mixed = ["krishi", "unknown", "krishi", "rokkha", 123, null];
  assert.deepEqual(sanitizePinnedApps(mixed), ["krishi", "rokkha"]);
});

test("dashboard: reorderPinnedApps shifts elements safely", () => {
  const initial = ["admitbuddy", "mediscan", "shohoj", "krishi"];

  // Move index 0 to index 2
  const movedForward = reorderPinnedApps(initial, 0, 2);
  assert.deepEqual(movedForward, ["mediscan", "shohoj", "admitbuddy", "krishi"]);

  // Move index 3 to index 1
  const movedBack = reorderPinnedApps(initial, 3, 1);
  assert.deepEqual(movedBack, ["admitbuddy", "krishi", "mediscan", "shohoj"]);

  // Out of bounds or identical returns copy without crashing
  assert.deepEqual(reorderPinnedApps(initial, -1, 2), initial);
  assert.deepEqual(reorderPinnedApps(initial, 1, 99), initial);
  assert.deepEqual(reorderPinnedApps(initial, 2, 2), initial);
});

test("dashboard: togglePinnedApp adds and removes items while keeping at least one", () => {
  const initial = ["krishi", "rokkha"];

  // Add new app
  const added = togglePinnedApp(initial, "admitbuddy");
  assert.deepEqual(added, ["krishi", "rokkha", "admitbuddy"]);

  // Remove existing app
  const removed = togglePinnedApp(added, "rokkha");
  assert.deepEqual(removed, ["krishi", "admitbuddy"]);

  // Refuse to remove last remaining app
  const oneApp = ["krishi"];
  const triedEmpty = togglePinnedApp(oneApp, "krishi");
  assert.deepEqual(triedEmpty, ["krishi"]);

  // Unknown app ignored
  assert.deepEqual(togglePinnedApp(initial, "invalid_app"), initial);
});
