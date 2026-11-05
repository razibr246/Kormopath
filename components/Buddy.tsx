"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";

const APPS = [
  { id: "kormopath", name: "KormoPath Core" },
  { id: "path", name: "My Path Board" },
  { id: "chuktiguard", name: "ChuktiGuard" },
  { id: "feeguard", name: "FeeGuard BD" },
  { id: "admitbuddy", name: "AdmitBuddy" },
  { id: "mediscan", name: "MediScan BD" },
  { id: "shohoj", name: "Shohoj Budget" },
  { id: "haatbazar", name: "HaatBazar AI" },
  { id: "probaho", name: "Probaho Coach" },
] as const;
type AppId = (typeof APPS)[number]["id"];
type Message = { role: "user" | "assistant"; content: string };

function BuddyOrb({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden className={`buddy-orb relative grid shrink-0 place-items-center overflow-hidden rounded-full ${small ? "h-8 w-8" : "h-10 w-10"}`}>
      <span className={`buddy-orb-core absolute rounded-full ${small ? "inset-[3px]" : "inset-[4px]"}`} />
      <Sparkles size={small ? 14 : 17} strokeWidth={1.7} className="relative z-10 text-amber-100 drop-shadow-[0_0_5px_rgba(255,255,255,.75)]" />
    </span>
  );
}

function appForPath(path: string | null): AppId {
  if (path?.startsWith("/opportunities")) return "path";
  if (path?.startsWith("/chuktiguard")) return "chuktiguard";
  if (path?.startsWith("/feeguard")) return "feeguard";
  if (path?.startsWith("/admitbuddy")) return "admitbuddy";
  if (path?.startsWith("/mediscan")) return "mediscan";
  if (path?.startsWith("/shohoj-budget")) return "shohoj";
  if (path?.startsWith("/haatbazar")) return "haatbazar";
  if (path?.startsWith("/probaho")) return "probaho";
  return "kormopath";
}

export function Buddy() {
  const pathname = usePathname();
  const routeApp = appForPath(pathname);
  const [selectedApp, setSelectedApp] = useState<AppId>(routeApp);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const appName = APPS.find((app) => app.id === selectedApp)?.name ?? "KormoPath";

  useEffect(() => {
    setSelectedApp(routeApp);
    setMessages([]);
    setError("");
  }, [routeApp]);

  const send = async (event?: FormEvent<HTMLFormElement>, suggested?: string) => {
    event?.preventDefault();
    const content = (suggested ?? input).trim();
    if (!content || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/buddy/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appId: selectedApp, messages: nextMessages.slice(-8) }),
      });
      const data = await response.json().catch(() => ({})) as { reply?: string; error?: string };
      if (!response.ok || typeof data.reply !== "string") throw new Error(data.error || "এখন উত্তর পাওয়া গেল না।");
      setMessages((current) => [...current, { role: "assistant", content: data.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(undefined);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[70] print:hidden">
      {open ? (
        <section aria-label="Buddy assistant" className="buddy-panel flex h-[min(690px,82dvh)] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl shadow-slate-950/40">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <BuddyOrb />
              <div className="min-w-0"><strong className="block text-[17px] leading-tight">Buddy</strong><span className="block truncate text-[11px] text-slate-400">সব KormoPath অ্যাপের সহকারী</span></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Buddy বন্ধ করুন" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20"><X size={19} /></button>
          </header>

          <div className="border-b border-white/10 px-4 py-3">
            <label htmlFor="buddy-app" className="mb-1 block text-[11px] font-semibold text-slate-400">কোন অ্যাপ নিয়ে সাহায্য চান?</label>
            <select id="buddy-app" value={selectedApp} onChange={(event) => { setSelectedApp(event.target.value as AppId); setMessages([]); setError(""); }} className="buddy-field w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-[13px] text-white outline-none focus:border-emerald-400">
              {APPS.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 ? <div className="buddy-intro rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <span className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300"><Sparkles size={14} /> {appName}</span>
              <p className="text-[14px] leading-relaxed text-slate-200">হ্যালো, আমি Buddy। {appName} নিয়ে কী জানতে চান? আমি অ্যাপের নিয়ম মেনে ধাপে ধাপে সাহায্য করব।</p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">আমি আপনার ডিভাইসে সেভ করা তথ্য দেখতে পাই না। উত্তর তৈরি করতে বার্তাটি Google Gemini-তে পাঠানো হয়; ব্যক্তিগত বা সংবেদনশীল তথ্য পাঠাবেন না।</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["এই অ্যাপে কীভাবে শুরু করব?", "ফলাফলগুলো বুঝিয়ে বলো", "কোন তথ্য যাচাই করা জরুরি?"].map((question) => <button key={question} type="button" disabled={loading} onClick={() => void send(undefined, question)} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-left text-[11px] text-slate-200 hover:border-emerald-400/70 hover:bg-emerald-500/10 disabled:opacity-50">{question}</button>)}
              </div>
            </div> : messages.map((message, index) => <div key={`${index}-${message.role}`} className={`buddy-message max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${message.role === "user" ? "buddy-user ml-auto bg-emerald-700 text-white" : "buddy-reply border border-white/10 bg-white/[0.06] text-slate-100"}`}>{message.content}</div>)}
            {loading && <p className="text-[12px] text-slate-400" role="status">Buddy ভাবছে…</p>}
            {error && <p className="rounded-xl border border-red-400/30 bg-red-950/50 p-3 text-[12px] text-red-200" role="alert">{error}</p>}
          </div>

          <form onSubmit={(event) => void send(event)} className="flex items-end gap-2 border-t border-white/10 bg-slate-900 p-3">
            <label htmlFor="buddy-input" className="sr-only">Buddy-কে বার্তা লিখুন</label>
            <textarea id="buddy-input" value={input} maxLength={1200} rows={2} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="প্রশ্ন লিখুন…" className="buddy-field max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-slate-400 focus:border-emerald-400" />
            <button type="submit" disabled={!input.trim() || loading} aria-label="বার্তা পাঠান" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} /></button>
          </form>
        </section>
      ) : <button type="button" onClick={() => setOpen(true)} aria-label="Buddy খুলুন" className="group flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-950 px-4 py-3 text-white shadow-xl shadow-slate-950/25 transition hover:-translate-y-0.5 hover:bg-slate-900">
        <BuddyOrb small />
        <span className="pr-1 text-[13px] font-bold">Buddy</span><MessageCircle size={15} className="text-emerald-300" aria-hidden />
      </button>}
    </div>
  );
}
