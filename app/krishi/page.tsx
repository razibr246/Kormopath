"use client";
import "./krishi.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck, CalendarCheck, Radar, Satellite, ClipboardList, CloudRain, Fish, House, Landmark, LifeBuoy, Map, MessageSquare, Mic, Phone, Stethoscope, Sun, TrendingUp,
} from "lucide-react";
import { AppHeader, SourceTag } from "@/components/layout/AppHeader";
import { MaathSathiMark } from "@/components/apps/krishi/MaathSathiMark";
import { AppFooter } from "@/components/layout/AppFooter";
import { usePersistentState, storageKey, todayLocal } from "@/lib/clientStore";
import { DISTRICTS, seasonForMonth, type WeatherHour } from "@/lib/haatbazar";
import { bnNum, sanitizeHarvests, sanitizeHerds, sanitizeLogs, sanitizePlots, sanitizeTasks, taskBuckets, totalDecimals, type FarmLog, type FarmTask, type HarvestRec, type Herd, type Plot } from "@/lib/krishi";
import {
  AnimalSection, DoctorSection, FutureSection, HelpSection, LandSection, PlanSection, SmsSection, SupportSection, TodaySection, VoiceSection,
  uid, type BudgetRec, type Weather,
} from "@/components/apps/krishi/Sections";
import { FarmRecordSection } from "@/components/apps/krishi/FarmRecord";

const TABS = [
  { id: "home", bn: "হোম", icon: House },
  { id: "land", bn: "আমার জমি", icon: Map },
  { id: "plan", bn: "পরিকল্পনা", icon: ClipboardList },
  { id: "future", bn: "জমির ভবিষ্যৎ", icon: TrendingUp },
  { id: "today", bn: "আজকের কাজ", icon: CalendarCheck },
  { id: "voice", bn: "কথা বলে জানুন", icon: Mic },
  { id: "sms", bn: "এসএমএসে", icon: MessageSquare },
  { id: "doctor", bn: "ফসলের ডাক্তার", icon: Stethoscope },
  { id: "animals", bn: "পশু, হাঁস-মুরগি ও মাছ", icon: Fish },
  { id: "record", bn: "খামারের খাতা", icon: BookOpenCheck },
  { id: "support", bn: "সরকারি সহায়তা", icon: Landmark },
  { id: "help", bn: "সাহায্য", icon: LifeBuoy },
] as const;
type TabId = (typeof TABS)[number]["id"];

function sanitizeBudgets(raw: unknown): BudgetRec[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.slice(0, 50).flatMap((b) => {
    const o = (b ?? {}) as Record<string, unknown>;
    if (typeof o.plotId !== "string" || typeof o.cropId !== "string" || !Array.isArray(o.costs)) return [];
    const costs = o.costs.slice(0, 20).flatMap((c) => {
      const cc = (c ?? {}) as Record<string, unknown>;
      return typeof cc.label === "string" && typeof cc.taka === "number" && Number.isFinite(cc.taka) && cc.taka >= 0 ? [{ label: cc.label.slice(0, 40), taka: cc.taka }] : [];
    });
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
    return [{ plotId: o.plotId.slice(0, 40), cropId: o.cropId.slice(0, 30), costs, expectedKg: n(o.expectedKg), priceTaka: n(o.priceTaka), priceSource: typeof o.priceSource === "string" ? o.priceSource.slice(0, 80) : "" }];
  });
}

export default function KrishiPage() {
  const [tab, setTab] = useState<TabId>("home");
  const [today, setToday] = useState("2026-01-01");
  useEffect(() => setToday(todayLocal()), []);
  const month = Number(today.slice(5, 7)) || 1;

  const [district, setDistrict] = usePersistentState<string>(storageKey("krishi", "district"), "bogura", (r) => (typeof r === "string" && DISTRICTS.some((d) => d.id === r) ? r : null));
  const [plots, setPlots] = usePersistentState<Plot[]>(storageKey("krishi", "plots"), [], sanitizePlots);
  const [tasks, setTasks] = usePersistentState<FarmTask[]>(storageKey("krishi", "tasks"), [], sanitizeTasks);
  const [herds, setHerds] = usePersistentState<Herd[]>(storageKey("krishi", "herds"), [], sanitizeHerds);
  const [logs, setLogs] = usePersistentState<FarmLog[]>(storageKey("krishi", "logs"), [], sanitizeLogs);
  const [budgets, setBudgets] = usePersistentState<BudgetRec[]>(storageKey("krishi", "budgets"), [], sanitizeBudgets);
  const [harvests, setHarvests] = usePersistentState<HarvestRec[]>(storageKey("krishi", "harvests"), [], sanitizeHarvests);

  const [weather, setWeather] = useState<Weather>(null);
  const [weatherErr, setWeatherErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setWeather(null); setWeatherErr(null);
    fetch(`/api/weather?d=${encodeURIComponent(district)}`)
      .then((r) => r.json())
      .then((d: { hours?: WeatherHour[]; spray?: { ok: boolean; reasonBn: string }; source?: { label: string; url: string }; error?: string }) => {
        if (!live) return;
        if (!d.hours?.length || !d.spray) { setWeatherErr(d.error ? "আবহাওয়ার পূর্বাভাস এখন পাওয়া যাচ্ছে না।" : "পূর্বাভাস পাওয়া যায়নি।"); return; }
        const six = d.hours.slice(0, 6);
        const maxRain = Math.max(...six.map((h) => h.precipProbability));
        setWeather({ sprayOk: d.spray.ok, sprayBn: d.spray.reasonBn, rainLikely: maxRain >= 50, maxRain, temp: Number.isFinite(d.hours[0]?.temperatureC) ? Math.round(d.hours[0].temperatureC) : null, source: d.source ?? { label: "Open-Meteo.com", url: "https://open-meteo.com/" } });
      })
      .catch(() => live && setWeatherErr("আবহাওয়ার পূর্বাভাস এখন পাওয়া যাচ্ছে না।"));
    return () => { live = false; };
  }, [district]);

  const buckets = taskBuckets(tasks, today);
  const season = seasonForMonth(month);
  const districtBn = DISTRICTS.find((d) => d.id === district)?.nameBn ?? "";
  const summaryBn = useMemo(() => {
    const t = [...buckets.overdue, ...buckets.today];
    return `আজ ${districtBn} জেলা। ${weather ? weather.sprayBn : "আবহাওয়ার তথ্য পাওয়া যায়নি।"} ${t.length ? `আজকের কাজ ${bnNum(t.length)}টি: ${t.slice(0, 3).map((x) => x.title).join(", ")}।` : "আজ কোনো কাজ লেখা নেই।"} প্রশ্ন থাকলে কৃষি কল সেন্টার এক ছয় এক দুই তিন।`;
  }, [buckets.overdue, buckets.today, districtBn, weather]);

  const go = (id: TabId) => { setTab(id); if (typeof window !== "undefined") document.getElementById("ms-main")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const drops = useMemo(() => Array.from({ length: 22 }, (_, i) => ({ left: (i * 4.6 + 3) % 100, delay: (i % 7) * 0.13 })), []);

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader
        appId="krishi"
        href="/krishi"
        name="মাঠসাথী"
        taglineBn="খামারের খাতা"
        icon={<MaathSathiMark />}
        accent="from-transparent to-transparent"
        right={
          <span
            className="kp-chip hidden !h-8 !rounded-full !text-[12px] font-semibold sm:inline-flex"
            title={weather ? `${DISTRICTS.find((d) => d.id === district)?.nameBn ?? ""} · পরের ৬ ঘণ্টা (${weather.source.label})` : "আবহাওয়া লোড হচ্ছে"}
          >
            {weather?.rainLikely ? <CloudRain size={14} className="text-sky-700" aria-hidden /> : <Sun size={14} className="text-amber-600" aria-hidden />}
            <span>{season.nameBn}</span>
            {weather?.temp != null && <span className="font-mono text-ink">· {bnNum(weather.temp)}°</span>}
          </span>
        }
      />

      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-4 sm:px-6">
        {/* Hero: a living field. Rain falls when the next 6 hours look wet. */}
        <section className="ms-scene min-h-[300px] p-5 sm:min-h-[340px] sm:p-8" data-sky={weather?.rainLikely ? "rain" : "sun"} aria-label="আজকের মাঠ">
          <div className="ms-sun" aria-hidden />
          <div className="ms-cloud" style={{ top: "14%", width: 70 }} aria-hidden />
          <div className="ms-cloud" style={{ top: "26%", width: 50, animationDelay: "-17s" }} aria-hidden />
          <div className="ms-field" aria-hidden />
          <div className="ms-rows" aria-hidden>{Array.from({ length: 14 }, (_, i) => <span key={i} className="ms-stalk" />)}</div>
          {weather?.rainLikely && <div className="ms-rain" aria-hidden>{drops.map((d, i) => <i key={i} style={{ left: `${d.left}%`, animationDelay: `${d.delay}s` }} />)}</div>}
          <div className="relative z-10 max-w-xl">
            <p className="kp-eyebrow">মাঠ · {season.nameBn}</p>
            <h1 className="mt-2 text-[clamp(30px,5vw,50px)] font-semibold leading-[1.08] text-slate-900">মাঠের কাজ, <em className="kp-em">এক হাতের মুঠোয়</em></h1>
            <p className="mt-2 max-w-[44ch] text-[15.5px] leading-relaxed text-slate-700">জমির হিসাব, আজকের কাজ, ফসলের রোগ, পশুপাখির খাতা আর সরকারি সহায়তা — বাংলায়, কথা বলে, ইন্টারনেট দুর্বল হলেও। তথ্য থাকে শুধু আপনার ফোনে।</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="ms-district">জেলা</label>
              <select id="ms-district" value={district} onChange={(e) => setDistrict(e.target.value)} className="min-h-[46px] rounded-xl border border-line bg-white/90 px-3 text-[15px] font-semibold">
                {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.nameBn}</option>)}
              </select>
              <button type="button" onClick={() => go("voice")} className="kp-btn-sun ms-big-btn"><Mic size={18} /> বলে কাজ যোগ করুন</button>
            </div>
          </div>
        </section>

        {/* FieldShift360 field tools (field360/, /krishi/field). Plain <a>: a full page load, so its own stylesheet
            never stays behind on MaathSathi's pages. */}
        <section className="ms-card ms-field360 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6" aria-labelledby="ms-f360-h" data-testid="ms-field360">
          <div className="min-w-0">
            <p className="kp-eyebrow">মাঠসাথী · জমির পরিকল্পনা</p>
            <h2 id="ms-f360-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">কী লাগাবেন, <em className="kp-em">আজ কী করবেন</em></h2>
            <p className="mt-1 max-w-[62ch] text-[14.5px] leading-relaxed text-slate-700">নাসার ২৫ মৌসুমের আবহাওয়া, সেন্টিনেলের মাঠের ছবি আর ISRIC মাটির তথ্য দিয়ে মৌসুম পরিকল্পনা, আজ সেচ লাগবে কি না, ফসলের ডাক্তার, জমির ভবিষ্যৎ আর রোপণ রাডার। এই খাতার কাজ, পশুপাখি আর খরচের পাশাপাশি। নমুনা কৃষকের জমি দিয়ে দেখানো; আসল তথ্যের উৎস প্রতিটি পাতায় লেখা।</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col">
            <a href="/krishi/field#/farmer" className="kp-btn-primary ms-big-btn" data-testid="ms-field360-open"><Satellite size={18} aria-hidden /> জমির পরিকল্পনা</a>
            <a href="/krishi/field#/farmer/radar" className="kp-btn-ghost ms-big-btn"><Radar size={18} aria-hidden /> রোপণ রাডার</a>
          </div>
        </section>

        <nav className="ms-nav" role="tablist" aria-label="মাঠসাথীর অংশ">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-controls="ms-main" onClick={() => go(t.id)} className="ms-tab">
              <t.icon size={18} aria-hidden /> {t.bn}
            </button>
          ))}
        </nav>

        <div id="ms-main" role="tabpanel" className="scroll-mt-[150px] sm:scroll-mt-[160px]">
          {tab === "home" && (
            <section className="ms-enter grid gap-4 md:grid-cols-3">
              <div className="ms-card ms-tilt p-5 md:col-span-1">
                <p className="text-[13px] font-semibold text-slate-500">{districtBn} · পরের ৬ ঘণ্টা</p>
                {weather ? (
                  <>
                    <p className="mt-1 font-mono text-[40px] font-bold leading-none text-ink">{weather.temp !== null ? `${bnNum(weather.temp)}°` : "—"}</p>
                    <p className="mt-1 text-[14px] text-slate-600">বৃষ্টির সম্ভাবনা সর্বোচ্চ {bnNum(weather.maxRain)}%</p>
                    <p className={`mt-3 rounded-xl px-3 py-2 text-[14.5px] ${weather.sprayOk ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{weather.sprayOk ? "✓ " : "⚠ "}{bnNum(weather.sprayBn)}</p>
                    <div className="mt-2"><SourceTag confidence="reported" label={weather.source.label} url={weather.source.url} /></div>
                  </>
                ) : <p className="mt-2 text-[14.5px] text-slate-600">{weatherErr ?? "পূর্বাভাস আনা হচ্ছে…"}</p>}
              </div>
              <button type="button" onClick={() => go("today")} className="ms-card p-5 text-left transition hover:-translate-y-0.5">
                <p className="text-[13px] font-semibold text-slate-500">আজকের কাজ</p>
                <p className="mt-1 font-mono text-[40px] font-bold leading-none text-emerald-800">{bnNum(buckets.today.length + buckets.overdue.length)}</p>
                <p className="mt-1 text-[14px] text-slate-600">{buckets.overdue.length ? `${bnNum(buckets.overdue.length)}টি বাকি পড়ে আছে · ` : ""}এই সপ্তাহে আরও {bnNum(buckets.upcoming.length)}টি</p>
                <p className="mt-3 text-[14px] font-semibold text-emerald-800">তালিকা দেখুন →</p>
              </button>
              <button type="button" onClick={() => go("land")} className="ms-card p-5 text-left transition hover:-translate-y-0.5">
                <p className="text-[13px] font-semibold text-slate-500">আমার জমি</p>
                <p className="mt-1 font-mono text-[40px] font-bold leading-none text-ink">{bnNum(totalDecimals(plots))}</p>
                <p className="mt-1 text-[14px] text-slate-600">শতাংশ · {bnNum(plots.length)} টুকরা · {bnNum(herds.length)}টি পশুপাখি/পুকুরের দল</p>
                <p className="mt-3 text-[14px] font-semibold text-emerald-800">জমি সাজান →</p>
              </button>
              <div className="ms-card p-5 md:col-span-3">
                <p className="text-[15px] font-bold text-ink">এক নজরে যা করা যায়</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TABS.slice(1).map((t) => (
                    <button key={t.id} type="button" onClick={() => go(t.id)} className="flex min-h-[76px] flex-col items-start justify-between rounded-2xl bg-paper p-3 text-left ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-emerald-300">
                      <t.icon size={22} className="text-emerald-700" aria-hidden />
                      <span className="text-[14.5px] font-semibold text-ink">{t.bn}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="ms-card flex flex-col gap-3 p-5 md:col-span-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[15px] text-slate-700">ফসল বিক্রির আগে হাট বনাম আড়তের লাভ, ট্রাক ভাড়া ভাগ আর স্প্রের সময় দেখুন <strong>হাটবাজার</strong>-এ।</p>
                <div className="flex gap-2">
                  <Link href="/haatbazar" className="kp-btn-ghost ms-big-btn">হাটবাজার খুলুন →</Link>
                  <a href="tel:16123" className="kp-btn-primary ms-big-btn"><Phone size={16} /> ১৬১২৩</a>
                </div>
              </div>
            </section>
          )}
          {tab === "land" && <LandSection plots={plots} setPlots={setPlots} />}
          {tab === "plan" && <PlanSection plots={plots} budgets={budgets} setBudgets={setBudgets} month={month} />}
          {tab === "future" && <FutureSection plots={plots} setPlots={setPlots} />}
          {tab === "today" && <TodaySection tasks={tasks} setTasks={setTasks} today={today} weather={weather} plots={plots} />}
          {tab === "voice" && <VoiceSection today={today} summaryBn={summaryBn} onAddTask={(p) => setTasks((all) => [...all, { id: uid(), title: p.title, kind: p.kind, date: p.date, done: false }])} />}
          {tab === "sms" && <SmsSection tasks={tasks} today={today} weather={weather} />}
          {tab === "doctor" && <DoctorSection />}
          {tab === "animals" && <AnimalSection herds={herds} setHerds={setHerds} logs={logs} setLogs={setLogs} today={today} />}
          {tab === "record" && <FarmRecordSection plots={plots} tasks={tasks} herds={herds} logs={logs} budgets={budgets} harvests={harvests} setHarvests={setHarvests} today={today} />}
          {tab === "support" && <SupportSection decimals={totalDecimals(plots)} />}
          {tab === "help" && <HelpSection />}
        </div>

        <p className="text-center text-[12.5px] text-slate-500">মাঠসাথী কোনো ওষুধ বা সারের মাত্রা দেয় না, দাম বা ফলন অনুমান করে না। অনুপ্রেরণা: FieldShift 360 (NASA Space Apps)। সমস্যায় কৃষি কল সেন্টার ১৬১২৩।</p>
      </main>
      <AppFooter />
    </div>
  );
}
