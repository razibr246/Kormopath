/** Portable browser backups. Never accept arbitrary localStorage keys. */
export const BACKUP_LIMIT = 5 * 1024 * 1024;
const namespaces = new Set(["shohoj", "mediscan", "admitbuddy", "probaho", "haatbazar", "feeguard", "chuktiguard", "platform"]);
const legacy = new Set(["shohoj_expenses", "kormopath_unified_profile_v1", "kp-ledger"]);
export type Backup = { format: "kormopath-backup"; version: 1; exportedAt: string; data: Record<string, unknown> };
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isBackupKey(key: string): boolean {
  const parts = key.split(":");
  return legacy.has(key) || (parts.length === 3 && parts[0] === "kormopath" && namespaces.has(parts[1]) && /^[a-zA-Z0-9._-]{1,100}$/.test(parts[2]));
}

export function createBackup(storage: StorageAccess, keys: string[]): Backup {
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    if (!isBackupKey(key)) continue;
    const raw = storage.getItem(key);
    if (raw === null) continue;
    // Fail explicitly rather than silently lose malformed saved records.
    data[key] = JSON.parse(raw);
  }
  return { format: "kormopath-backup", version: 1, exportedAt: new Date().toISOString(), data };
}

export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > BACKUP_LIMIT) throw new Error("Backup must be smaller than 5 MB.");
  const raw = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid backup file.");
  // Also read the existing per-app exports, so old backups remain useful.
  const current = raw.format === "kormopath-backup" && raw.version === 1;
  const previous = raw.format === undefined && typeof raw.app === "string";
  if ((!current && !previous) || typeof raw.exportedAt !== "string" || !Number.isFinite(Date.parse(raw.exportedAt)) || !raw.data || typeof raw.data !== "object" || Array.isArray(raw.data)) throw new Error("Unsupported backup format.");
  const entries = Object.entries(raw.data);
  if (!entries.length || entries.length > 200 || entries.some(([key]) => !isBackupKey(key))) throw new Error("Backup contains empty or unsupported app data.");
  return { format: "kormopath-backup", version: 1, exportedAt: raw.exportedAt, data: raw.data };
}

export function restoreBackup(storage: StorageAccess, backup: Backup, overwrite = false): number {
  // Revalidate at the write boundary, even if callers bypass the preview.
  const validated = parseBackup(JSON.stringify(backup));
  const writes = Object.entries(validated.data).filter(([key]) => overwrite || storage.getItem(key) === null);
  const before = writes.map(([key]) => [key, storage.getItem(key)] as const);
  try {
    for (const [key, value] of writes) storage.setItem(key, JSON.stringify(value));
  } catch {
    let recovered = true;
    for (const [key, value] of before) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch { recovered = false; }
    }
    throw new Error(recovered ? "Restore failed. Your previous data was preserved. Check browser storage space." : "Restore failed and recovery was incomplete. Keep your backup file and retry after freeing browser storage.");
  }
  return writes.length;
}

export function backupSummary(backup: Backup): { name: string; items: number }[] {
  const names: Record<string, string> = { shohoj: "Shohoj Budget", mediscan: "MediScan BD", admitbuddy: "AdmitBuddy", probaho: "Probaho Coach", haatbazar: "HaatBazar AI", feeguard: "FeeGuard BD", chuktiguard: "ChuktiGuard", platform: "My Path ও প্রোফাইল" };
  const counts = new Map<string, number>();
  for (const key of Object.keys(backup.data)) {
    const name = key === "kp-ledger" ? "Workspace" : key === "shohoj_expenses" ? names.shohoj : key === "kormopath_unified_profile_v1" ? names.platform : names[key.split(":")[1]];
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, items]) => ({ name, items }));
}
