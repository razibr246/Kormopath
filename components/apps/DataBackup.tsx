"use client";

import { useRef, useState } from "react";
import { BACKUP_LIMIT, PASSPHRASE_MIN, backupSummary, createBackup, decryptBackup, encryptBackup, isBackupKey, isEncryptedBackup, parseBackup, restoreBackup, type Backup } from "@/lib/backup";
import { downloadText } from "@/lib/clientStore";

export function DataBackup({ onRestore }: { onRestore: () => void }) {
  const selection = useRef(0);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // Optional passphrase lock for exports, and the pending encrypted file waiting for its passphrase.
  const [exportPass, setExportPass] = useState("");
  const [lockedText, setLockedText] = useState<string | null>(null);
  const [importPass, setImportPass] = useState("");
  const [busy, setBusy] = useState(false);
  const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-40";

  async function exportAll() {
    setError(""); setMessage("");
    if (exportPass && exportPass.length < PASSPHRASE_MIN) { setError(`পাসওয়ার্ড অন্তত ${PASSPHRASE_MIN} অক্ষরের দিন, অথবা খালি রাখুন।`); return; }
    setBusy(true);
    try {
      const backup = createBackup(localStorage, Object.keys(localStorage).filter(isBackupKey));
      if (!Object.keys(backup.data).length) { setMessage("সংরক্ষিত কোনো তথ্য নেই।"); return; }
      const date = new Date().toISOString().slice(0, 10);
      if (exportPass) {
        const sealed = await encryptBackup(backup, exportPass);
        downloadText(`kormopath-backup-${date}.locked.json`, JSON.stringify(sealed), "application/json;charset=utf-8");
        setMessage("পাসওয়ার্ড দিয়ে লক করা ব্যাকআপ ডাউনলোড হয়েছে। পাসওয়ার্ড হারালে এই ফাইল আর খোলা যাবে না; আমরা কোনো কপি রাখি না।");
        setExportPass("");
      } else {
        downloadText(`kormopath-backup-${date}.json`, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
        setMessage("ব্যাকআপ ডাউনলোড হয়েছে। ফাইলটি নিরাপদ স্থানে রাখুন।");
      }
    } catch { setError("ব্যাকআপ তৈরি করা যায়নি। ব্রাউজারের সংরক্ষিত তথ্য পরীক্ষা করুন।"); }
    finally { setBusy(false); }
  }

  async function unlock() {
    if (!lockedText) return;
    const request = selection.current;
    setBusy(true); setError("");
    try {
      const parsed = await decryptBackup(lockedText, importPass);
      if (request === selection.current) { setPreview(parsed); setLockedText(null); setImportPass(""); }
    } catch (e) { if (request === selection.current) setError(e instanceof Error && /Wrong passphrase/.test(e.message) ? "পাসওয়ার্ড ভুল, অথবা ফাইলটি বদলানো হয়েছে।" : e instanceof Error ? e.message : "Invalid backup file."); }
    finally { setBusy(false); }
  }

  async function selectFile(file?: File) {
    const request = ++selection.current;
    setPreview(null); setError(""); setMessage(""); setOverwrite(false); setLockedText(null); setImportPass("");
    if (!file) return;
    try {
      if (file.size > Math.ceil(BACKUP_LIMIT * 1.4)) throw new Error("Backup must be smaller than 5 MB.");
      const text = await file.text();
      if (isEncryptedBackup(text)) { if (request === selection.current) setLockedText(text); return; }
      if (file.size > BACKUP_LIMIT) throw new Error("Backup must be smaller than 5 MB.");
      const parsed = parseBackup(text);
      if (request === selection.current) setPreview(parsed);
    } catch (e) { if (request === selection.current) setError(e instanceof Error ? e.message : "Invalid backup file."); }
  }

  function restore() {
    if (!preview) return;
    try {
      const count = restoreBackup(localStorage, preview, overwrite);
      setMessage(`${count}টি আইটেম পুনরুদ্ধার হয়েছে। অ্যাপ খুললে তথ্য দেখা যাবে।`);
      setError(""); setPreview(null); onRestore();
    } catch (e) { setError(e instanceof Error ? e.message : "Restore failed."); }
  }

  return <section aria-labelledby="backup-heading" className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-5">
    <h2 id="backup-heading" className="text-lg font-bold">ব্যাকআপ ও পুনরুদ্ধার</h2>
    <p className="text-sm text-slate-600">সব অ্যাপ ও Workspace-এর সংরক্ষিত তথ্য এক ফাইলে রাখুন। অন্য ব্রাউজার বা ডিভাইসে এই ফাইল দিয়ে তথ্য ফিরিয়ে আনতে পারবেন। ফাইল আপনার ডিভাইসেই পড়া হয়, আপলোড হয় না।</p>
    <p className="text-xs text-amber-900">ব্যাকআপে স্বাস্থ্য, অর্থ ও ব্যক্তিগত তথ্য থাকতে পারে। পাসওয়ার্ড দিলে ফাইলটি এনক্রিপ্ট (AES-256) হয়; পাসওয়ার্ড ছাড়া ফাইল সাধারণ লেখা হিসেবে পড়া যায়।</p>
    <label className="block max-w-sm text-sm font-semibold">পাসওয়ার্ড দিয়ে লক করুন (ঐচ্ছিক, অন্তত {PASSPHRASE_MIN} অক্ষর)
      <input type="password" autoComplete="new-password" value={exportPass} onChange={(event) => setExportPass(event.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm" placeholder="খালি রাখলে লক হবে না" />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={button} disabled={busy} onClick={() => void exportAll()}>{exportPass ? "লক করা ব্যাকআপ নিন" : "সব ডেটা ব্যাকআপ করুন"}</button>
      <label className="text-sm font-semibold">ব্যাকআপ ফাইল খুলুন (JSON, সর্বোচ্চ 5 MB)
        <input type="file" accept=".json,application/json" className="mt-1 block max-w-full text-xs" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
    </div>
    {lockedText && <form className="space-y-2 rounded-xl bg-amber-50 p-3" onSubmit={(event) => { event.preventDefault(); void unlock(); }}>
      <label className="block text-sm font-semibold">এই ব্যাকআপ পাসওয়ার্ড দিয়ে লক করা। পাসওয়ার্ড দিন
        <input type="password" autoComplete="current-password" value={importPass} onChange={(event) => setImportPass(event.target.value)} className="mt-1 block w-full max-w-sm rounded-lg border px-3 py-2 text-sm" autoFocus />
      </label>
      <div className="flex gap-2"><button type="submit" className={button} disabled={busy || !importPass}>খুলুন</button><button type="button" className={button} onClick={() => { setLockedText(null); setImportPass(""); }}>বাতিল</button></div>
    </form>}
    {preview && <div className="space-y-3 rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold">{Object.keys(preview.data).length}টি আইটেম · {new Date(preview.exportedAt).toLocaleString("bn-BD")}</p>
      <ul className="max-h-40 overflow-auto break-all text-xs text-slate-600">{backupSummary(preview).map((app) => <li key={app.name}>{app.name} · {app.items}টি আইটেম</li>)}</ul>
      <p className="text-xs text-slate-600">একই আইটেম আগে থাকলে সেটি রাখা হবে। আলাদা তালিকার রেকর্ড একত্র করা হয় না।</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} /> একই আইটেমের বর্তমান তথ্য ব্যাকআপ দিয়ে প্রতিস্থাপন করুন</label>
      <div className="flex gap-2"><button type="button" className={button} onClick={restore}>পুনরুদ্ধার করুন</button><button type="button" className={button} onClick={() => setPreview(null)}>বাতিল</button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
  </section>;
}
