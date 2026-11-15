"use client";

import { useRef, useState } from "react";
import { BACKUP_LIMIT, backupSummary, createBackup, isBackupKey, parseBackup, restoreBackup, type Backup } from "@/lib/backup";
import { downloadText } from "@/lib/clientStore";

export function DataBackup({ onRestore }: { onRestore: () => void }) {
  const selection = useRef(0);
  const [preview, setPreview] = useState<Backup | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-40";

  function exportAll() {
    setError(""); setMessage("");
    try {
      const backup = createBackup(localStorage, Object.keys(localStorage).filter(isBackupKey));
      if (!Object.keys(backup.data).length) { setMessage("সংরক্ষিত কোনো তথ্য নেই।"); return; }
      downloadText(`kormopath-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
      setMessage("ব্যাকআপ ডাউনলোড হয়েছে। ফাইলটি নিরাপদ স্থানে রাখুন।");
    } catch { setError("ব্যাকআপ তৈরি করা যায়নি। ব্রাউজারের সংরক্ষিত তথ্য পরীক্ষা করুন।"); }
  }

  async function selectFile(file?: File) {
    const request = ++selection.current;
    setPreview(null); setError(""); setMessage(""); setOverwrite(false);
    if (!file) return;
    try {
      if (file.size > BACKUP_LIMIT) throw new Error("Backup must be smaller than 5 MB.");
      const parsed = parseBackup(await file.text());
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
    <p className="text-xs text-amber-900">ব্যাকআপ এনক্রিপ্ট করা নয়। এতে স্বাস্থ্য, অর্থ ও ব্যক্তিগত তথ্য থাকতে পারে। শুধু নিজের বিশ্বস্ত ব্যাকআপ ব্যবহার করুন।</p>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className={button} onClick={exportAll}>সব ডেটা ব্যাকআপ করুন</button>
      <label className="text-sm font-semibold">ব্যাকআপ ফাইল খুলুন (JSON, সর্বোচ্চ 5 MB)
        <input type="file" accept=".json,application/json" className="mt-1 block max-w-full text-xs" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
    </div>
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
