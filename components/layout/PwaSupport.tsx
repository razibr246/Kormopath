"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { storageKey, usePersistentState } from "@/lib/clientStore";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * Registers the offline service worker (production only) and offers "install as app" when the
 * browser says it is possible. The offer is shown once until dismissed; the choice stays on this device.
 */
export function PwaSupport() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  // Offer install only once someone has opened a second page: never nag on the first visit.
  const pathname = usePathname();
  const [pagesSeen, setPagesSeen] = useState<string[]>([]);
  useEffect(() => { setPagesSeen((p) => (p.includes(pathname) ? p : [...p, pathname].slice(-5))); }, [pathname]);
  const [dismissed, setDismissed] = usePersistentState<boolean>(storageKey("platform", "installDismissed"), false, (raw) => (typeof raw === "boolean" ? raw : null));

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Dev chunk names carry no content hash, so a worker left over from a production run on this localhost port
      // would keep serving old code and cause hydration errors. In development, remove it and its caches.
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      if ("caches" in window) caches.keys().then((keys) => keys.filter((k) => k.startsWith("kp-")).forEach((k) => caches.delete(k))).catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline support is optional; the site works without it */ });
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent || dismissed || pagesSeen.length < 2) return null;

  return (
    <div role="dialog" aria-label="কর্মপথ অ্যাপ হিসেবে ইনস্টল করুন" className="fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-7rem)] items-center gap-3 rounded-2xl border border-line bg-[#fffdf9]/95 p-3 pr-2 shadow-[0_18px_40px_-18px_rgba(60,36,18,.45)] backdrop-blur print:hidden sm:max-w-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"><Download size={18} /></span>
      <span className="min-w-0 text-[13.5px] leading-snug text-slate-700">
        <strong className="block text-slate-900">অ্যাপ হিসেবে ইনস্টল করুন</strong>
        আগে খোলা টুল অফলাইনেও খুলবে।
      </span>
      <button
        type="button"
        className="kp-btn-primary !min-h-9 !px-3 !text-[13px]"
        onClick={async () => {
          await installEvent.prompt();
          await installEvent.userChoice.catch(() => null);
          setInstallEvent(null);
        }}
      >
        ইনস্টল
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="বন্ধ করুন">
        <X size={16} />
      </button>
    </div>
  );
}
