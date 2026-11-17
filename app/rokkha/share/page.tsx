"use client";
import { useEffect } from "react";

/*
 * Fallback for the share target (app/manifest.ts). Normally public/sw.js answers /rokkha/share on the
 * phone and this page never loads. If the service worker is not running yet, the shared text arrives
 * here in the query string; move it after "#" and replace the history entry so it does not stay in the
 * address bar or history. Nothing is stored.
 */
export default function RokkhaShare() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const shared = ["title", "text", "url"].map((k) => p.get(k) || "").filter(Boolean).join("\n").slice(0, 5000);
    window.location.replace("/rokkha#share=" + encodeURIComponent(shared));
  }, []);
  return <p className="p-6 text-center text-slate-600">রক্ষা খুলছে… / Opening Rokkha…</p>;
}
