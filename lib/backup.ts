/** Portable browser backups. Never accept arbitrary localStorage keys. */
export const BACKUP_LIMIT = 5 * 1024 * 1024;
const namespaces = new Set(["shohoj", "mediscan", "admitbuddy", "probaho", "haatbazar", "krishi", "rokkha", "legal", "feeguard", "chuktiguard", "platform", "auth", "dashboard"]);
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
  const names: Record<string, string> = { shohoj: "Shohoj Budget", mediscan: "MediScan BD", admitbuddy: "AdmitBuddy", probaho: "Probaho Coach", haatbazar: "HaatBazar AI", krishi: "MaathSathi", rokkha: "Rokkha", legal: "আইনি সহায়তা", feeguard: "FeeGuard BD", chuktiguard: "ChuktiGuard", platform: "My Path ও প্রোফাইল", auth: "লগইন সেশন ও ইউজার প্রোফাইল", dashboard: "কাস্টমাইজেবল ড্যাশবোর্ড" };
  const counts = new Map<string, number>();
  for (const key of Object.keys(backup.data)) {
    const name = key === "kp-ledger" ? "Workspace" : key === "shohoj_expenses" ? names.shohoj : key === "kormopath_unified_profile_v1" ? names.platform : names[key.split(":")[1]];
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, items]) => ({ name, items }));
}

/*
 * Optional passphrase encryption (AES-GCM 256, key from PBKDF2-SHA256). Uses the standard Web
 * Crypto API, available in browsers and Node, so this module still needs no imports. Without the
 * passphrase the file cannot be read; KormoPath keeps no copy of it, so a lost passphrase means a
 * lost backup.
 */
export const ENCRYPTED_FORMAT = "kormopath-backup-encrypted";
export const PASSPHRASE_MIN = 8;
const PBKDF2_ITERATIONS = 310_000;
export type EncryptedBackup = { format: typeof ENCRYPTED_FORMAT; version: 1; kdf: "PBKDF2-SHA256"; iterations: number; salt: string; iv: string; ciphertext: string };

const toB64 = (bytes: Uint8Array) => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const fromB64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export function isEncryptedBackup(text: string): boolean {
  try {
    const raw = JSON.parse(text.replace(/^﻿/, ""));
    return raw?.format === ENCRYPTED_FORMAT;
  } catch { return false; }
}

export async function encryptBackup(backup: Backup, passphrase: string): Promise<EncryptedBackup> {
  if (passphrase.length < PASSPHRASE_MIN) throw new Error(`Passphrase must be at least ${PASSPHRASE_MIN} characters.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const plain = new TextEncoder().encode(JSON.stringify(backup));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain as BufferSource));
  return { format: ENCRYPTED_FORMAT, version: 1, kdf: "PBKDF2-SHA256", iterations: PBKDF2_ITERATIONS, salt: toB64(salt), iv: toB64(iv), ciphertext: toB64(cipher) };
}

/** Decrypts and then validates exactly like a plain backup. A wrong passphrase fails the AES-GCM tag check. */
export async function decryptBackup(text: string, passphrase: string): Promise<Backup> {
  // Base64 adds a third, so the encrypted envelope may be up to ~4/3 of the plain limit.
  if (new TextEncoder().encode(text).length > Math.ceil(BACKUP_LIMIT * 1.4)) throw new Error("Backup must be smaller than 5 MB.");
  const raw = JSON.parse(text.replace(/^﻿/, ""));
  if (raw?.format !== ENCRYPTED_FORMAT || raw.version !== 1 || raw.kdf !== "PBKDF2-SHA256" || !Number.isSafeInteger(raw.iterations) || raw.iterations < 100_000 || raw.iterations > 5_000_000
    || typeof raw.salt !== "string" || typeof raw.iv !== "string" || typeof raw.ciphertext !== "string") throw new Error("Unsupported encrypted backup.");
  let plain: ArrayBuffer;
  try {
    const key = await deriveKey(passphrase, fromB64(raw.salt), raw.iterations);
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(raw.iv) as BufferSource }, key, fromB64(raw.ciphertext) as BufferSource);
  } catch {
    throw new Error("Wrong passphrase, or the file was changed.");
  }
  return parseBackup(new TextDecoder().decode(plain));
}
