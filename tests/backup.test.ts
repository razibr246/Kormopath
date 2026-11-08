import { test } from "node:test";
import assert from "node:assert/strict";
import { createBackup, parseBackup, restoreBackup, isBackupKey, BACKUP_LIMIT } from "../lib/backup.ts";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}
const key = "kormopath:shohoj:transactions.v2";
function fixture(data: Record<string, unknown>) {
  return { format: "kormopath-backup", version: 1, exportedAt: "2026-11-08T00:00:00.000Z", data };
}

test("backup round trip preserves Bangla, amounts, workspace and all app namespaces", () => {
  const source = new MemoryStorage();
  for (const ns of ["shohoj", "mediscan", "admitbuddy", "probaho", "haatbazar", "feeguard", "chuktiguard", "platform"]) source.setItem(`kormopath:${ns}:record`, JSON.stringify({ note: "আমার তথ্য", amount: 12345 }));
  source.setItem("kp-ledger", "[]");
  source.setItem("unrelated", '"private"');
  const backup = parseBackup("\uFEFF" + JSON.stringify(createBackup(source, [...source.data.keys()])));
  const target = new MemoryStorage();
  assert.equal(restoreBackup(target, backup), 9);
  assert.equal(target.getItem("unrelated"), null);
  assert.equal(target.getItem("kormopath:shohoj:record"), source.getItem("kormopath:shohoj:record"));
});

test("restore keeps existing records by default and only overwrites explicitly", () => {
  const storage = new MemoryStorage();
  storage.setItem(key, "[1]");
  const backup = parseBackup(JSON.stringify(fixture({ [key]: [2], "kp-ledger": [] })));
  assert.equal(restoreBackup(storage, backup), 1);
  assert.equal(storage.getItem(key), "[1]");
  assert.equal(restoreBackup(storage, backup, true), 2);
  assert.equal(storage.getItem(key), "[2]");
});

test("restore rejects unsupported versions, foreign keys, malformed and oversized files", () => {
  for (const bad of [null, [], {}, { ...fixture({ [key]: [] }), version: 2 }, fixture({ unrelated: [] }), fixture({}), fixture({ "kormopath:unknown:x": [] }), fixture({ "__proto__": null })]) assert.throws(() => parseBackup(JSON.stringify(bad)));
  assert.throws(() => parseBackup("x".repeat(BACKUP_LIMIT + 1)));
  assert.throws(() => parseBackup("{"));
  for (const badKey of ["kormopath:shohoj:", "kormopath:shohoj:x:y", "__proto__", "token"]) assert.equal(isBackupKey(badKey), false);
});

test("older per-app exports remain restorable", () => {
  const backup = parseBackup(JSON.stringify({ app: "Shohoj Budget", exportedAt: "2026-11-08", data: { [key]: [] } }));
  assert.deepEqual(backup.data[key], []);
});

test("quota failure rolls back previous writes and retains unrelated data", () => {
  const storage = new MemoryStorage();
  storage.setItem(key, "[1]"); storage.setItem("other", "keep");
  const original = storage.setItem.bind(storage);
  storage.setItem = (k, v) => { if (k === "kp-ledger" && v === "[3]") throw new Error("quota"); original(k, v); };
  assert.throws(() => restoreBackup(storage, parseBackup(JSON.stringify(fixture({ [key]: [2], "kormopath:platform:new": true, "kp-ledger": [3] }))), true), /preserved/);
  assert.equal(storage.getItem(key), "[1]");
  assert.equal(storage.getItem("kormopath:platform:new"), null);
  assert.equal(storage.getItem("other"), "keep");
});
