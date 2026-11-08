"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { failedStorageKeys } from "@/lib/clientStore";

/** A shared save failure must be visible even when a screen ignores hook metadata. */
export function StorageNotice() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => setFailed(failedStorageKeys().length > 0);
    update();
    window.addEventListener("kormopath:storage-status", update);
    return () => window.removeEventListener("kormopath:storage-status", update);
  }, []);
  if (!failed) return null;
  return <aside role="alert" className="sticky top-0 z-50 border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 print:hidden">
    <div className="mx-auto max-w-7xl"><strong>পরিবর্তন ব্রাউজারে সংরক্ষণ করা যায়নি।</strong> ট্যাব বন্ধ করলে সর্বশেষ তথ্য হারাতে পারেন। ব্রাউজারের storage অনুমতি ও খালি জায়গা পরীক্ষা করুন। <Link href="/settings" className="font-bold underline">ডেটা ব্যাকআপ</Link></div>
  </aside>;
}
