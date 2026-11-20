"use client";

// The signed-in home. Large web platforms keep two front doors: a public landing page for visitors and a personal
// home once you are signed in. KormoPath does the same with its three fictional demo profiles: this page shows who is
// signed in, their apps in the order they use them, quick tasks, what their plan includes (as a labelled demo), and the
// safety tools that are free for everyone. Nothing here is real account data and no figure is invented.
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Eye, Lock, LogOut, Repeat2, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import {
  PAID_FEATURES,
  PERSONAS,
  isAlwaysFreeApp,
  isAppUnlocked,
  saveStoredSession,
  type UserSession,
} from "@/lib/session";
import { PAID_FEATURE_LABELS, SAFETY_LINKS, greetingFor, type PersonaHome } from "@/lib/personaHome";

type Lang = "bn" | "en";
export type HomeApp = {
  id: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  name: { bn: string; en: string };
  line: { bn: string; en: string };
};

type Access = "free" | "plan" | "locked";
function accessOf(session: UserSession, appId: string): Access {
  if (isAlwaysFreeApp(appId) || !PAID_FEATURES[appId]) return "free";
  return isAppUnlocked(session, appId) ? "plan" : "locked";
}

function AccessChip({ access, bn }: { access: Access; bn: boolean }) {
  if (access === "free")
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-800 ring-1 ring-emerald-200"><Check size={11} aria-hidden="true" />{bn ? "ফ্রি" : "Free"}</span>;
  if (access === "plan")
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-semibold text-amber-900 ring-1 ring-amber-200"><Sparkles size={11} aria-hidden="true" />{bn ? "প্ল্যানে চালু · ডেমো" : "In plan · demo"}</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-700 ring-1 ring-slate-200"><Lock size={11} aria-hidden="true" />{bn ? "কিছু সুবিধা লক" : "Some extras locked"}</span>;
}

const AVATAR: Record<string, string> = { rahim_uddin: "🌾", lamia_akter: "🩺", najeeb_ahmed: "⭐" };

export function SignedInHome({ session, home, apps, lang, onShowPublic, onSwitchProfile }: {
  session: UserSession;
  home: PersonaHome;
  apps: HomeApp[];
  lang: Lang;
  onShowPublic: () => void;
  onSwitchProfile: () => void;
}) {
  const bn = lang === "bn";
  const persona = PERSONAS[session.personaId as keyof typeof PERSONAS];
  // The hour is read after mount (Asia/Dhaka), so the server and first client render agree.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    setHour(Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Dhaka" }).format(new Date())));
  }, []);
  const greet = hour === null ? { bn: "স্বাগতম", en: "Welcome back" } : greetingFor(hour);
  const firstName = (bn ? session.nameBn : session.nameEn).split(" ")[0];

  const byId = new Map(apps.map((a) => [a.id, a]));
  const ordered = home.apps.map((id) => byId.get(id)).filter((a): a is HomeApp => !!a);
  const mine = ordered.slice(0, 4);
  const rest = ordered.slice(4);

  // Plan summary from the engine's own lists: what this profile has on, and what stays locked.
  const paid = Object.entries(PAID_FEATURES).flatMap(([app, feats]) => feats.map((f) => ({ app, key: `${app}:${f}` })));
  const on = paid.filter((p) => isAppUnlocked(session, p.app));
  const off = paid.filter((p) => !isAppUnlocked(session, p.app));
  const label = (k: string) => (bn ? PAID_FEATURE_LABELS[k]?.bn : PAID_FEATURE_LABELS[k]?.en) ?? k;
  const appName = (id: string) => { const a = byId.get(id); return a ? (bn ? a.name.bn : a.name.en) : id; };

  return (
    <div className="pb-16 pt-8 sm:pt-12" data-testid="signed-in-home">
      {/* ===== Who is signed in ===== */}
      <section aria-labelledby="me-title" className="kp-rise flex flex-col gap-5 rounded-[28px] border border-line bg-white/80 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[30px] ring-1 ring-emerald-200" aria-hidden="true">{AVATAR[session.personaId] ?? "🙂"}</span>
          <div className="min-w-0">
            <p className="kp-eyebrow">{bn ? "আপনার হোম" : "Your home"}</p>
            <h1 id="me-title" className="mt-1 text-[clamp(26px,3.6vw,38px)] font-semibold leading-tight text-slate-900">
              {bn ? `${greet.bn}, ${firstName}` : `${greet.en}, ${firstName}`}
            </h1>
            <p className="mt-1 text-[14.5px] text-slate-600">
              {persona ? (bn ? `${persona.roleBn} · ${persona.locationBn}` : `${persona.roleEn} · ${persona.locationEn}`) : null}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-200">{persona ? (bn ? persona.badgeBn : persona.badgeEn) : (bn ? "ডেমো প্রোফাইল" : "Demo profile")}</span>
              <span className="text-slate-500">{bn ? home.focusBn : home.focusEn}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={onSwitchProfile} className="kp-btn-ghost" data-testid="home-switch-profile">
            <Repeat2 size={16} aria-hidden="true" /> {bn ? "প্রোফাইল বদলান" : "Switch profile"}
          </button>
          <button type="button" onClick={onShowPublic} className="kp-btn-ghost" data-testid="home-show-public">
            <Eye size={16} aria-hidden="true" /> {bn ? "পাবলিক পেজ দেখুন" : "View public page"}
          </button>
          <button type="button" onClick={() => saveStoredSession(null)} className="kp-btn-ghost" data-testid="home-sign-out">
            <LogOut size={16} aria-hidden="true" /> {bn ? "সাইন আউট" : "Sign out"}
          </button>
        </div>
      </section>
      <p className="mt-2 px-1 text-[12.5px] text-slate-500">
        {bn ? "কাল্পনিক ডেমো প্রোফাইল: কোনো আসল অ্যাকাউন্ট বা টাকা নেই, সব তথ্য এই ডিভাইসেই থাকে।" : "A fictional demo profile: no real account or money, and everything stays on this device."}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {/* ===== Quick tasks ===== */}
          <section aria-labelledby="quick-title">
            <h2 id="quick-title" className="text-[20px] font-semibold text-slate-900">{bn ? "আজ কী করবেন" : "What to do today"}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {home.quick.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} prefetch={!q.href.includes("#")} className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-[15px] font-medium text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50/40">
                    {bn ? q.bn : q.en}
                    <ArrowUpRight size={16} className="shrink-0 text-slate-400 group-hover:text-emerald-700" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ===== My apps ===== */}
          <section aria-labelledby="mine-title">
            <h2 id="mine-title" className="text-[20px] font-semibold text-slate-900">{bn ? "আপনার অ্যাপ" : "Your apps"}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {mine.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <Link href={a.href} prefetch={!a.href.includes("#")} className="group flex h-full gap-3 rounded-2xl border border-line bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`my-app-${a.id}`}>
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${a.tone}`}><Icon size={20} aria-hidden="true" /></span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[16px] font-semibold text-slate-900">{bn ? a.name.bn : a.name.en}</span>
                          <AccessChip access={accessOf(session, a.id)} bn={bn} />
                        </span>
                        <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-slate-600">{bn ? a.line.bn : a.line.en}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ===== Everything else ===== */}
          <section aria-labelledby="more-title">
            <h2 id="more-title" className="text-[20px] font-semibold text-slate-900">{bn ? "আরও অ্যাপ" : "More apps"}</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
              {rest.map((a) => {
                const Icon = a.icon;
                return (
                  <li key={a.id}>
                    <Link href={a.href} prefetch={!a.href.includes("#")} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${a.tone}`}><Icon size={17} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-800">{bn ? a.name.bn : a.name.en}</span>
                      <AccessChip access={accessOf(session, a.id)} bn={bn} />
                      <ChevronRight size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="space-y-6" aria-label={bn ? "প্ল্যান ও সুরক্ষা" : "Plan and safety"}>
          {/* ===== Plan ===== */}
          <section aria-labelledby="plan-title" className="rounded-2xl border border-line bg-white p-5">
            <h2 id="plan-title" className="text-[18px] font-semibold text-slate-900">{bn ? "আপনার প্ল্যান" : "Your plan"}</h2>
            <p className="mt-1 text-[13.5px] text-slate-600">{persona ? (bn ? persona.badgeBn : persona.badgeEn) : null}</p>
            {on.length > 0 && (
              <>
                <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-slate-500">{bn ? "চালু (ডেমো, কোনো টাকা নেওয়া হয়নি)" : "On (demo, no money taken)"}</h3>
                <ul className="mt-2 space-y-1.5 text-[14px] text-slate-800" data-testid="plan-on">
                  {on.map((p) => <li key={p.key} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />{label(p.key)} <span className="text-slate-500">· {appName(p.app)}</span></li>)}
                </ul>
              </>
            )}
            {off.length > 0 && (
              <>
                <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-slate-500">{bn ? "পেইড প্ল্যানে" : "In a paid plan"}</h3>
                <ul className="mt-2 space-y-1.5 text-[14px] text-slate-600" data-testid="plan-off">
                  {off.map((p) => <li key={p.key} className="flex gap-2"><Lock size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />{label(p.key)} <span className="text-slate-500">· {appName(p.app)}</span></li>)}
                </ul>
              </>
            )}
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-[13px] leading-snug text-emerald-900 ring-1 ring-emerald-200">
              {bn ? "বাকি সব অ্যাপ আর সব সুরক্ষা সেবা সবার জন্য ফ্রি, সব সময়।" : "Every other app and every safety service is free for everyone, always."}
            </p>
            <Link href="/pricing" className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-emerald-800 hover:underline">
              {bn ? "ফ্রি ও পেইড প্ল্যান দেখুন" : "See free and paid plans"} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </section>

          {/* ===== Safety, always free ===== */}
          <section aria-labelledby="safety-title" className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
            <h2 id="safety-title" className="flex items-center gap-2 text-[18px] font-semibold text-slate-900"><ShieldCheck size={18} className="text-rose-700" aria-hidden="true" />{bn ? "সুরক্ষা · সবার জন্য ফ্রি" : "Safety · free for all"}</h2>
            <ul className="mt-3 space-y-2">
              {SAFETY_LINKS.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} prefetch={!s.href.includes("#")} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[14.5px] font-medium text-slate-800 ring-1 ring-rose-100 hover:ring-rose-300">
                    {bn ? s.bn : s.en} <ChevronRight size={15} className="text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
