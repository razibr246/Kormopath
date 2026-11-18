"use client";
import "./haatbazar.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Sprout, Phone, CloudRain, Wind, Thermometer, Truck, NotebookPen, Trash2, AlertTriangle, CheckCircle2, CalendarDays, Bug,
  Camera, ExternalLink, Stethoscope, PhoneCall, ArrowDown, Store, MapPin, SprayCan, TrendingUp, Users, Sun,
  Download, Sparkles, Route, FileDown, Check, Layers, Search, Navigation,
} from "lucide-react";
import { AppHeader, SourceTag } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { AgriculturalLifecycle } from "@/components/apps/AgriculturalLifecycle";
import { HaatMarket } from "@/components/apps/HaatMarket";
import { HaatLiveMap } from "@/components/apps/HaatLiveMap";
import {
  tripMargin, shareTruck, priceAgeDays, seasonForMonth, SEASONS, RICE_SEASONS, DISTRICTS, CROP_DISEASES, CROPS, KG_PER_MAUND,
  calculateSensitivityCurve, diagnoseCropSymptom,
  CROP_PRESETS, TRANSIT_CORRIDORS, MANDI_HUBS, type CropPreset, type MandiHub,
  type PriceNote, type WeatherHour, type SprayWindow,
} from "@/lib/haatbazar";
import { usePersistentState, storageKey, todayLocal, downloadText } from "@/lib/clientStore";
import { allDayIcs, isIsoDate } from "@/lib/ics";

const KIND_BN: Record<PriceNote["kind"], string> = { farmgate: "মাঠ/হাটে কৃষকের দাম", wholesale: "পাইকারি (আড়ত)", retail: "খুচরা" };
const r0 = (n: number) => Math.round(n).toLocaleString("en-IN");

interface StoredNote extends PriceNote { id: string }
const sanitizeNotes = (raw: unknown): StoredNote[] | null =>
  Array.isArray(raw)
    ? raw.filter((n): n is StoredNote => n && typeof n.id === "string" && typeof n.cropId === "string" && typeof n.market === "string" && typeof n.pricePerKg === "number" && n.pricePerKg > 0 && n.pricePerKg < 100000 && ["farmgate", "wholesale", "retail"].includes(n.kind) && /^\d{4}-\d{2}-\d{2}$/.test(n.date)).slice(0, 300)
    : null;

/** Example numbers until the farmer types their own; labelled as an example in the UI. */
const EXAMPLE_TRIP = { quantityKg: 1000, localPricePerKg: 38, distantPricePerKg: 46, transportPerMaund: 65, commissionPct: 5, labourPerMaund: 10, lossPct: 2, otherCosts: 300 };
type Trip = typeof EXAMPLE_TRIP;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Eases a displayed number toward its target. The target is always the engine's value; only the display animates. */
function useCountUp(target: number, ms = 650): number {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced) { setShown(target); from.current = target; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const v = a + (target - a) * e;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);
  return shown;
}

export default function HaatBazarPage() {
  const [today, setToday] = useState("");
  const [district, setDistrict] = usePersistentState<string>(storageKey("haatbazar", "district"), "bogura", (r) => (typeof r === "string" && DISTRICTS.some((d) => d.id === r) ? r : null));
  const [notes, setNotes] = usePersistentState<StoredNote[]>(storageKey("haatbazar", "priceNotes"), [], sanitizeNotes);
  const [trip, setTrip] = useState<Trip>(EXAMPLE_TRIP);
  const [touched, setTouched] = useState(false);
  const [spray, setSpray] = useState<SprayWindow | null>(null);
  const [activeCrop, setActiveCrop] = useState<CropPreset | null>(CROP_PRESETS[0]);
  useEffect(() => setToday(todayLocal()), []);
  const month = today ? Number(today.slice(5, 7)) : 0;
  const season = month ? seasonForMonth(month) : null;
  const result = useMemo(() => tripMargin(trip), [trip]);

  const handleSelectHub = (hub: MandiHub) => {
    if (DISTRICTS.some((d) => d.id === hub.districtId)) {
      setDistrict(hub.districtId);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f1] text-stone-900 antialiased">
      <AppHeader taglineEn="Farm costs, weather & crop info" appId="haatbazar" href="/haatbazar" name="HaatBazar AI" taglineBn="কৃষকের হিসাব, আবহাওয়া ও ফসলের তথ্য" icon={<Sprout size={22} />} accent="from-lime-600 to-green-800" />

      <div className="border-b border-green-200 bg-green-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] text-green-950 sm:px-6">
          <a href="tel:16123" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-green-800 px-4 font-bold text-white shadow-sm hover:bg-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2">
            <Phone size={15} aria-hidden /> কৃষি কল সেন্টার: <span className="font-mono">16123</span>
          </a>
          <span>রোগ, সার ও ওষুধের পরামর্শ: উপজেলা কৃষি অফিস বা উপসহকারী কৃষি কর্মকর্তা</span>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-7">
        <TripHero trip={trip} result={result} touched={touched} season={season} spray={spray} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <TripCalculator
            v={trip}
            setV={(n) => { setTouched(true); setTrip(n); }}
            touched={touched}
            notes={notes}
            activeCrop={activeCrop}
            setActiveCrop={setActiveCrop}
          />
          <WeatherPanel district={district} setDistrict={setDistrict} onSpray={setSpray} />
        </div>

        {/* Live Agri-Transit Corridor & Mandi Tracking Map */}
        <HaatLiveMap
          currentTrip={{
            quantityKg: trip.quantityKg,
            localPricePerKg: trip.localPricePerKg,
            distantPricePerKg: trip.distantPricePerKg,
            cropNameBn: activeCrop?.nameBn,
          }}
          selectedDistrictId={district}
          onSelectHub={handleSelectHub}
        />

        <HaatMarket />

        <PriceNotebook notes={notes} setNotes={setNotes} today={today} />

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="dis-h" className="hb-card p-5 sm:p-6">
            <SectionTitle id="dis-h" icon={<Bug size={20} aria-hidden />} title="ফসলের সাধারণ সমস্যা চিনুন" />
            <p className="mt-2 text-[13px] text-stone-600">লক্ষণ মিলিয়ে দেখুন। নিশ্চিত হতে ও ওষুধের মাত্রা জানতে কৃষি অফিসে যোগাযোগ করুন — আমরা কোনো কীটনাশকের মাত্রা দিই না।</p>
            <DiseaseReference />
          </section>

          <section aria-labelledby="cal-h" className="hb-card space-y-4 p-5 sm:p-6">
            <SectionTitle id="cal-h" icon={<CalendarDays size={20} aria-hidden />} title="মৌসুম ও ধানের সময়সূচি" />
            <ol className="grid gap-2 sm:grid-cols-3">
              {SEASONS.map((s) => {
                const now = season?.id === s.id;
                return (
                  <li key={s.id} className={`relative rounded-2xl border p-3 text-[13px] transition-colors ${now ? "border-lime-500 bg-lime-50 shadow-sm" : "border-stone-200 bg-white"}`}>
                    {now && <span className="absolute -top-2 right-3 rounded-full bg-lime-600 px-2 py-0.5 text-[10px] font-bold text-white">এখন</span>}
                    <strong className="block text-[14px]">{s.nameBn}</strong>
                    <span className="block text-[12px] text-stone-500">{s.monthsBn}</span>
                    <span className="mt-1 block text-stone-700">{s.cropsBn}</span>
                  </li>
                );
              })}
            </ol>
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-stone-50 text-[11px] text-stone-500"><tr><th className="px-3 py-2">ধান</th><th className="py-2">রোপণ/বপন</th><th className="py-2 pr-3">কাটা</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {RICE_SEASONS.map((r) => <tr key={r.nameBn}><td className="px-3 py-2 font-semibold">{r.nameBn}</td><td>{r.plantBn}</td><td className="pr-3">{r.harvestBn}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-stone-500">মৌসুমের সীমা উৎসভেদে কিছুটা আলাদা; এলাকা ও জাত অনুযায়ী সময় বদলায়। <SourceTag confidence="reported" label="Banglapedia: Crop" url="https://en.banglapedia.org/index.php/Crop" checked="2026-11-05" /></p>
          </section>
        </div>

        <section className="hb-card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6">
          <span className="hb-icon-tile"><Camera size={20} aria-hidden /></span>
          <div>
            <h2 className="text-[17px] font-bold">ছবি দিয়ে রোগ শনাক্ত?</h2>
            <p className="mt-1 text-[13px] text-stone-600">
              এই অ্যাপে ছবি দেখে রোগ নির্ণয় এখনো নেই — নির্ভরযোগ্য মডেল ও যাচাই ছাড়া ভুল ওষুধের পরামর্শ ক্ষতি করতে পারে। সরকারি “কৃষকের জানালা” সেবায় ছবি ও লক্ষণ দেখে মিলিয়ে নিতে পারেন, অথবা আক্রান্ত গাছের ছবি তুলে উপসহকারী কৃষি কর্মকর্তাকে দেখান।
            </p>
          </div>
        </section>

        <section aria-label="কৃষি চক্র">
          <AgriculturalLifecycle />
        </section>

        <p className="text-[12px] text-stone-600">
          এটি সাধারণ তথ্য ও হিসাবের যন্ত্র। ফলন বা লাভের নিশ্চয়তা নয়। <Link href="/settings" className="rounded font-semibold text-green-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">সংরক্ষিত ডেটা</Link>
        </p>
      </main>
      <AppFooter lang="bn" />
    </div>
  );
}

function SectionTitle({ id, icon, title, aside }: { id: string; icon: React.ReactNode; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2.5 text-[18px] font-bold leading-tight">
        <span className="hb-icon-tile">{icon}</span>
        {title}
      </h2>
      {aside}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Hero: the answer first. Uses only tripMargin's outputs; nothing here is a price we invented. */
/* ------------------------------------------------------------------------------------------ */
function TripHero({ trip, result: r, touched, season, spray }: {
  trip: Trip; result: ReturnType<typeof tripMargin>; touched: boolean;
  season: ReturnType<typeof seasonForMonth> | null; spray: SprayWindow | null;
}) {
  const shown = useCountUp(r.extraVsLocal);
  const good = r.worthIt;
  // Waterfall from the engine's own outputs: all goods at the mokam price, then each loss/cost, then what is left.
  const gross = trip.quantityKg * trip.distantPricePerKg;
  const transitLoss = Math.max(0, gross - r.distantRevenue);
  const steps = [
    { label: "আড়তের দামে সব মাল", value: gross, kind: "gross" as const },
    { label: "পথে ঘাটতি", value: transitLoss, kind: "cost" as const },
    { label: "আড়তদারের কমিশন", value: r.commission, kind: "cost" as const },
    { label: "পরিবহন ভাড়া", value: r.transport, kind: "cost" as const },
    { label: "লোড-আনলোড, বস্তা", value: r.labour, kind: "cost" as const },
    { label: "টোল ও অন্যান্য", value: r.otherCosts, kind: "cost" as const },
  ].filter((s) => s.kind === "gross" || s.value > 0.5);
  const scale = Math.max(gross, r.localRevenue, 1);
  let running = gross;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / scale) * 100))}%`;

  return (
    <section aria-labelledby="hero-h" className="hb-hero px-4 pb-20 pt-5 sm:px-8 sm:pb-20 sm:pt-8">
      <div className="hb-scene" aria-hidden="true">
        <div className="hb-field" />
        <div className="hb-road" />
        <span className="hb-pin" style={{ left: "10px" }}><i style={{ color: "oklch(0.55 0.12 150)" }} />হাট</span>
        <span className="hb-pin" style={{ right: "10px" }}><i style={{ color: "oklch(0.6 0.15 45)" }} />মোকাম</span>
        <svg className="hb-truck" viewBox="0 0 54 30" role="presentation">
          <rect x="1" y="5" width="32" height="17" rx="3" fill="oklch(0.62 0.15 45)" />
          <rect x="4" y="8" width="26" height="5" rx="1.5" fill="oklch(0.86 0.1 85)" />
          <path d="M33 10h10l7 7v5H33z" fill="oklch(0.45 0.1 155)" />
          <rect x="37" y="12" width="7" height="5" rx="1" fill="#dff3ff" />
          <circle cx="11" cy="24" r="4" fill="#2b1d12" /><circle cx="11" cy="24" r="1.6" fill="#cfc4b8" />
          <circle cx="42" cy="24" r="4" fill="#2b1d12" /><circle cx="42" cy="24" r="1.6" fill="#cfc4b8" />
        </svg>
      </div>
      <div className="hb-sun" aria-hidden="true" />

      <div className="hb-reveal relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
            {season && (
              <span className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-lime-300 bg-white/85 px-3 text-lime-950">
                <Sun size={14} aria-hidden /> এখন {season.nameBn}
              </span>
            )}
            {spray && (
              <a href="#wx-h" className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3 ${spray.ok ? "border-green-300 bg-white/85 text-green-900" : "border-amber-300 bg-amber-50/90 text-amber-950"}`}>
                <SprayCan size={14} aria-hidden /> {spray.ok ? "স্প্রে: আবহাওয়া ঠিক আছে" : "স্প্রে: এখন অপেক্ষা করুন"}
              </a>
            )}
          </div>
          <h1 id="hero-h" className="max-w-[16ch] text-[30px] font-semibold leading-[1.12] tracking-tight text-stone-900 sm:text-[42px]">
            দূরের মোকামে নেবেন, নাকি <em className="kp-em">হাটেই বেচবেন?</em>
          </h1>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-stone-700">
            আপনার শোনা দাম বসান; পরিবহন, কমিশন আর পথের ঘাটতি বাদ দিয়ে আসল লাভ দেখুন। আমরা নিজে থেকে কোনো বাজারদর বানাই না।
          </p>

          <div className="hb-verdict p-4 sm:p-5" data-good={good} aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-stone-600">{good ? "মোকামে নিলে বাড়তি থাকে" : "মোকামে নিলে কম থাকে"}</span>
              {!touched ? <SourceTag confidence="example" label="নিজের সংখ্যা বসান" /> : <span className="text-[11px] font-semibold text-stone-500">আপনার দেওয়া সংখ্যায়</span>}
            </div>
            <p className={`hb-figure mt-2 text-[44px] font-extrabold sm:text-[56px] ${good ? "text-green-800" : "text-amber-700"}`} aria-hidden="true">
              {shown >= 0 ? "+" : "−"}৳{r0(Math.abs(shown))}
            </p>
            <p className="mt-2 flex items-start gap-2 text-[15px] font-bold leading-snug">
              {good ? <CheckCircle2 className="mt-0.5 shrink-0 text-green-700" size={20} aria-hidden /> : <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} aria-hidden />}
              {good ? `দূরের মোকামে নিলে হাটের চেয়ে প্রায় ৳${r0(r.extraVsLocal)} বেশি থাকে।` : `দূরের মোকামে নিলে হাটের চেয়ে ৳${r0(-r.extraVsLocal)} কম থাকে — হাটেই বিক্রি ভালো।`}
            </p>
            <p className="mt-2 text-[13px] text-stone-600">
              লাভ পেতে আড়তে অন্তত <strong className="font-mono text-stone-900">৳{Number.isFinite(r.breakEvenDistantPrice) ? r.breakEvenDistantPrice.toFixed(2) : "—"}/কেজি</strong> পাইকারি দাম লাগবে।
            </p>
            <a href="#trip-h" className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-[14px] font-bold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">
              <ArrowDown size={16} aria-hidden /> নিজের সংখ্যা বসান
            </a>
          </div>
        </div>

        <figure className="hb-verdict p-4 sm:p-5">
          <figcaption className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-bold">টাকাটা কোথায় যায়</span>
            <span className="text-[11px] text-stone-500">{r0(trip.quantityKg)} কেজি · {(trip.quantityKg / KG_PER_MAUND).toFixed(1)} মণ</span>
          </figcaption>
          <ol className="mt-3 space-y-2 text-[12.5px]">
            {steps.map((s, i) => {
              let left = 0;
              let width = s.value;
              if (s.kind === "cost") { running -= s.value; left = running; }
              return (
                <li key={s.label} className="hb-wf-row">
                  <span className="truncate text-stone-700">{s.label}</span>
                  <span className="hb-wf-track" aria-hidden="true">
                    <span className="hb-wf-bar" data-kind={s.kind} style={{ left: pct(left), width: pct(width), ["--i" as string]: i } as React.CSSProperties} />
                  </span>
                  <span className={`font-mono font-bold tabular-nums ${s.kind === "cost" ? "text-red-700" : "text-stone-900"}`}>{s.kind === "cost" ? "−" : ""}৳{r0(s.value)}</span>
                </li>
              );
            })}
            <li className="hb-wf-row border-t border-stone-200 pt-2">
              <span className="font-bold text-stone-900">হাতে থাকে</span>
              <span className="hb-wf-track" aria-hidden="true">
                <span className="hb-wf-bar" data-kind={good ? "net" : "net-bad"} style={{ left: 0, width: pct(Math.max(0, r.distantNet)), ["--i" as string]: steps.length } as React.CSSProperties} />
                <span className="hb-wf-marker" style={{ left: pct(r.localRevenue) }} />
              </span>
              <span className={`font-mono font-extrabold tabular-nums ${good ? "text-green-800" : "text-amber-700"}`}>৳{r0(r.distantNet)}</span>
            </li>
          </ol>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-stone-600">
            <span className="inline-block h-3.5 w-0.5 bg-stone-800" aria-hidden="true" />
            দাগটি: হাটেই সব বেচলে <strong className="font-mono text-stone-900">৳{r0(r.localRevenue)}</strong>
          </p>
          <p className="mt-1 text-[11px] text-stone-500">শুধু আপনার দেওয়া সংখ্যার হিসাব। পৌঁছানোর দিনে দাম বদলে যেতে পারে — লাভের নিশ্চয়তা নয়।</p>
        </figure>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
function TripCalculator({
  v,
  setV,
  touched,
  notes,
  activeCrop,
  setActiveCrop,
}: {
  v: Trip;
  setV: (n: Trip) => void;
  touched: boolean;
  notes: StoredNote[];
  activeCrop: CropPreset | null;
  setActiveCrop: (c: CropPreset | null) => void;
}) {
  const [sensitivityDelta, setSensitivityDelta] = useState(0);
  const sensitivityCurve = useMemo(() => calculateSensitivityCurve(v), [v]);
  const activePoint = useMemo(
    () => sensitivityCurve.find((p) => p.deltaPct === sensitivityDelta) ?? sensitivityCurve.find((p) => p.deltaPct === 0)!,
    [sensitivityCurve, sensitivityDelta],
  );
  const maxAbs = Math.max(1, ...sensitivityCurve.map((p) => Math.abs(p.extraVsLocal)));
  const set = (k: keyof Trip) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Math.max(0, Number(e.target.value) || 0) });
  const [farmers, setFarmers] = useState("10, 10, 5");
  const [fare, setFare] = useState(4500);
  const loads = farmers.split(/[,\s]+/).map(Number).filter((n) => n > 0).slice(0, 20);
  const shares = shareTruck(fare, loads);
  const wholesaleNotes = notes.filter((n) => n.kind === "wholesale").slice(0, 5);
  const localNotes = notes.filter((n) => n.kind === "farmgate").slice(0, 5);

  const localMaunds = v.quantityKg / KG_PER_MAUND;
  const localNetTaka = v.quantityKg * v.localPricePerKg;
  const distantResult = tripMargin(v);

  const field = (k: keyof Trip, label: string, suffix: string, step = 1, hint?: string) => (
    <label className="text-[12.5px] font-bold text-stone-700">
      {label}
      <span className="mt-1 flex min-h-[44px] items-center rounded-xl border border-stone-200 bg-white transition-shadow focus-within:border-green-700 focus-within:ring-2 focus-within:ring-green-600/30">
        <input type="number" min={0} step={step} value={v[k]} onChange={set(k)} className="w-full min-w-0 rounded-xl bg-transparent px-3 py-2 font-mono text-[16px] font-bold text-stone-900 outline-none" />
        <span className="shrink-0 pr-3 text-[11px] font-normal text-stone-500">{suffix}</span>
      </span>
      {hint && <span className="mt-1 block text-[11px] font-normal text-stone-500">{hint}</span>}
    </label>
  );

  return (
    <section aria-labelledby="trip-h" className="hb-card scroll-mt-24 space-y-5 p-5 sm:p-6">
      <SectionTitle id="trip-h" icon={<Truck size={20} aria-hidden />} title="দূরের মোকামে নেওয়ার হিসাব" aside={!touched ? <SourceTag confidence="example" label="নিজের সংখ্যা বসান" /> : undefined} />

      {/* 1-Click Benchmark Crop Presets */}
      <div className="rounded-2xl border border-line bg-stone-50/70 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-stone-900">
            <Sparkles size={14} className="text-amber-600" aria-hidden />
            ১ ক্লিকে ফসলের নমুনা মান বসান:
          </span>
          <span className="text-[11px] text-stone-500">পরিবর্তনযোগ্য সাধারণ বেঞ্চমার্ক</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CROP_PRESETS.map((cp) => {
            const on = activeCrop?.id === cp.id;
            return (
              <button
                key={cp.id}
                type="button"
                onClick={() => {
                  setActiveCrop(cp);
                  setV({
                    quantityKg: cp.defaultQuantityKg,
                    localPricePerKg: cp.benchmarkLocalPrice,
                    distantPricePerKg: cp.benchmarkDistantPrice,
                    transportPerMaund: cp.benchmarkTransportPerMaund,
                    commissionPct: cp.benchmarkCommissionPct,
                    labourPerMaund: cp.benchmarkLabourPerMaund,
                    lossPct: cp.benchmarkLossPct,
                    otherCosts: cp.benchmarkOtherCosts,
                  });
                }}
                className={`rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                  on
                    ? "border-green-700 bg-green-50 font-bold text-green-950 shadow-2xs ring-1 ring-green-600/30"
                    : "border-line bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {cp.nameBn}
              </button>
            );
          })}
        </div>
        {activeCrop?.perishableAlertBn && (
          <p className="mt-2 text-[12px] text-stone-700">
            <span className="font-bold text-emerald-900">পরামর্শ ({activeCrop.nameBn}):</span> {activeCrop.perishableAlertBn} (সংরক্ষণ স্থায়িত্ব: ~{activeCrop.shelfLifeDays} দিন)
          </p>
        )}
      </div>

      {/* Quick Corridor Selection */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
        <span className="font-bold text-stone-600">মহাসড়ক রুট প্রিসেট:</span>
        {TRANSIT_CORRIDORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setV({
                ...v,
                transportPerMaund: c.highwayCode === "N5" ? 55 : c.highwayCode === "N8" ? 65 : 75,
                otherCosts: c.tollBridgesBn.length > 0 ? 500 : 300,
              });
            }}
            className="rounded-lg border border-line bg-white px-2 py-0.5 text-stone-700 hover:border-emerald-600 hover:bg-emerald-50/60"
          >
            {c.nameBn.split(" ")[0]} ({c.distanceKm} কিমি)
          </button>
        ))}
      </div>

      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-[12px] font-bold text-green-900"><Store size={14} aria-hidden /> মাল ও দাম</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {field("quantityKg", "পরিমাণ", "কেজি", 10, `= ${(v.quantityKg / KG_PER_MAUND).toFixed(1)} মণ`)}
          {field("localPricePerKg", "হাটে দাম", "৳/কেজি", 0.5)}
          {field("distantPricePerKg", "দূরের আড়তে পাইকারি দাম", "৳/কেজি", 0.5)}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-[12px] font-bold text-red-800"><Truck size={14} aria-hidden /> পথের খরচ</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {field("transportPerMaund", "পরিবহন ভাড়া", "৳/মণ")}
          {field("commissionPct", "আড়তদারের কমিশন", "%", 0.5)}
          {field("labourPerMaund", "লোড-আনলোড, বস্তা", "৳/মণ")}
          {field("lossPct", "পথে ঘাটতি/নষ্ট", "%", 0.5)}
          {field("otherCosts", "টোল, খাজনা, অন্যান্য", "৳")}
        </div>
      </fieldset>

      {/* Side-by-side Decision Comparison Box */}
      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50/70 p-3.5 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-3 text-[12.5px]">
          <strong className="block text-[13px] text-stone-800">১. স্থানীয় হাটে বিক্রি করলে</strong>
          <p className="mt-1 font-mono text-[16px] font-bold text-stone-900">৳{r0(localNetTaka)}</p>
          <span className="text-[11px] text-stone-500">৳{v.localPricePerKg}/কেজি · ৳{r0(v.localPricePerKg * KG_PER_MAUND)}/মণ</span>
          <p className="mt-1.5 text-[11px] text-emerald-800">✓ শূন্য পরিবহন ঝুঁকি, নগদে তাৎক্ষণিক খালাস</p>
        </div>
        <div className={`rounded-xl border p-3 text-[12.5px] ${distantResult.worthIt ? "border-green-300 bg-green-50/70" : "border-amber-300 bg-amber-50/70"}`}>
          <strong className="block text-[13px] text-stone-800">২. মোকামে ট্রাকে পাঠালে</strong>
          <p className={`mt-1 font-mono text-[16px] font-extrabold ${distantResult.worthIt ? "text-green-800" : "text-amber-800"}`}>
            ৳{r0(distantResult.distantNet)}
          </p>
          <span className="text-[11px] text-stone-600">সব খরচ বাদে নিট দর: ৳{(distantResult.distantNet / v.quantityKg).toFixed(1)}/কেজি</span>
          <p className="mt-1.5 text-[11px] font-bold">
            {distantResult.worthIt
              ? `✓ হাটের চেয়ে প্রায় ৳${r0(distantResult.extraVsLocal)} বেশি থাকে`
              : `⚠ হাটের চেয়ে ৳${r0(-distantResult.extraVsLocal)} কম থাকে (লোকসান)`}
          </p>
        </div>
      </div>

      {(wholesaleNotes.length > 0 || localNotes.length > 0) && (
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="self-center text-stone-500">আপনার নোট থেকে:</span>
          {localNotes.map((n) => <button key={n.id} onClick={() => setV({ ...v, localPricePerKg: n.pricePerKg })} className="min-h-[40px] rounded-full border border-stone-200 bg-stone-50 px-3 hover:bg-white">হাট: {CROPS.find((c) => c.id === n.cropId)?.nameBn} ৳{n.pricePerKg} ({n.date})</button>)}
          {wholesaleNotes.map((n) => <button key={n.id} onClick={() => setV({ ...v, distantPricePerKg: n.pricePerKg })} className="min-h-[40px] rounded-full border border-stone-200 bg-stone-50 px-3 hover:bg-white">{n.market}: ৳{n.pricePerKg} ({n.date})</button>)}
        </div>
      )}
      <p className="rounded-xl bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950">দূরের দামে <strong>খুচরা নয়, পাইকারি</strong> দাম বসান — কৃষক আড়তে খুচরা দাম পান না।</p>

      {/* Sensitivity: what if the wholesale price moves before you arrive? */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-stone-900"><TrendingUp size={16} aria-hidden /> পৌঁছানোর আগে দর বদলালে?</h3>
            <p className="text-[12px] text-stone-600">মোকামে পাইকারি দর ১৫% পর্যন্ত কমলে বা বাড়লে হাটের তুলনায় কত থাকে।</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${activePoint.worthIt ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {sensitivityDelta > 0 ? `+${sensitivityDelta}%` : `${sensitivityDelta}%`} দর তারতম্য
          </span>
        </div>
        <input
          type="range" min={-15} max={15} step={5} value={sensitivityDelta}
          onChange={(e) => setSensitivityDelta(Number(e.target.value))}
          className="mt-3 h-11 w-full cursor-pointer accent-green-800"
          aria-label="পাইকারি দর তারতম্য স্লাইডার"
          aria-valuetext={`${sensitivityDelta}%: ${activePoint.worthIt ? "মোকামে লাভজনক" : "হাটেই বিক্রি শ্রেয়"}`}
        />
        <ul className="mt-2 space-y-1.5" aria-label="দর তারতম্য অনুযায়ী ফলাফল">
          {sensitivityCurve.map((pt) => {
            const w = `${(Math.abs(pt.extraVsLocal) / maxAbs) * 50}%`;
            const on = pt.deltaPct === sensitivityDelta;
            return (
              <li key={pt.deltaPct}>
                <button
                  type="button"
                  onClick={() => setSensitivityDelta(pt.deltaPct)}
                  aria-pressed={on}
                  className={`grid min-h-[40px] w-full grid-cols-[3.4rem_minmax(0,1fr)_5.6rem] items-center gap-2 rounded-xl px-2 text-left text-[12px] transition-colors ${on ? "bg-white shadow-sm ring-1 ring-green-600/40" : "hover:bg-white/70"}`}
                >
                  <span className="font-mono font-bold">{pt.deltaPct > 0 ? `+${pt.deltaPct}%` : `${pt.deltaPct}%`}</span>
                  <span className="relative h-3.5" aria-hidden="true">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-stone-300" />
                    <span
                      className={`hb-div-bar absolute top-0 ${pt.extraVsLocal >= 0 ? "left-1/2 bg-green-600" : "right-1/2 bg-amber-500"}`}
                      style={{ width: w }}
                    />
                  </span>
                  <span className={`text-right font-mono font-bold ${pt.extraVsLocal >= 0 ? "text-green-800" : "text-amber-700"}`}>
                    {pt.extraVsLocal >= 0 ? `+৳${r0(pt.extraVsLocal)}` : `−৳${r0(-pt.extraVsLocal)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12px] text-stone-600">
          {sensitivityDelta === 0 ? "আজকের দরে" : `দর ${sensitivityDelta > 0 ? "বাড়লে" : "কমলে"} (৳${activePoint.adjustedWholesalePrice.toFixed(2)}/কেজি)`}: আড়তে নিট <strong className="font-mono">৳{r0(activePoint.distantNet)}</strong> — <strong className={activePoint.worthIt ? "text-green-800" : "text-amber-800"}>{activePoint.worthIt ? "মোকামে লাভজনক" : "হাটেই বিক্রি শ্রেয়"}</strong>
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 p-4">
        <h3 className="flex items-center gap-1.5 text-[15px] font-bold"><Users size={16} aria-hidden /> একসাথে ট্রাক ভাড়া — কে কত দেবেন</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <label className="text-[12.5px] font-bold text-stone-700">মোট ভাড়া (৳)<input type="number" min={0} value={fare} onChange={(e) => setFare(Math.max(0, Number(e.target.value) || 0))} className="hb-input mt-1 font-mono font-bold" /></label>
          <label className="text-[12.5px] font-bold text-stone-700">প্রত্যেকের মণ (কমা দিয়ে)<input value={farmers} onChange={(e) => setFarmers(e.target.value)} className="hb-input mt-1 font-mono" /></label>
        </div>
        {loads.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
            {shares.map((s, i) => (
              <li key={i} className="rounded-xl bg-stone-50 px-3 py-2">কৃষক {i + 1} ({loads[i]} মণ): <strong className="font-mono">৳{s}</strong></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
function WeatherPanel({ district, setDistrict, onSpray }: { district: string; setDistrict: (d: string) => void; onSpray: (s: SprayWindow | null) => void }) {
  const [data, setData] = useState<{ hours: WeatherHour[]; spray: SprayWindow; fetchedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    onSpray(null);
    fetch(`/api/weather?d=${encodeURIComponent(district)}`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok || !Array.isArray(d.hours)) {
          setError("পূর্বাভাস পাওয়া যায়নি। ইন্টারনেট সংযোগ দেখুন বা পরে চেষ্টা করুন।");
          setData(null);
        } else { setData(d); onSpray(d.spray ?? null); }
      })
      .catch(() => !cancelled && setError("পূর্বাভাস পাওয়া যায়নি। ইন্টারনেট সংযোগ দেখুন।"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // onSpray is a stable state setter from the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [district]);

  const h = data?.hours ?? [];
  const day = h.slice(0, 24);
  const maxRain = day.length ? Math.max(...day.map((x) => x.precipProbability)) : 0;
  const totalRain = day.reduce((a, x) => a + x.precipitationMm, 0);
  const temps = day.map((x) => x.temperatureC);

  return (
    <section aria-labelledby="wx-h" className="hb-card scroll-mt-24 space-y-4 p-5 sm:p-6">
      <SectionTitle
        id="wx-h"
        icon={<CloudRain size={20} aria-hidden />}
        title="আবহাওয়া ও স্প্রের সময়"
        aside={
          <label className="inline-flex items-center gap-1.5 text-[12px] font-bold text-stone-600">
            <MapPin size={14} aria-hidden />
            <span className="sr-only">জেলা</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="জেলা" className="min-h-[44px] rounded-xl border border-stone-200 bg-white px-3 text-[14px] font-semibold text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600">
              {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.nameBn}</option>)}
            </select>
          </label>
        }
      />
      {loading && (
        <div className="space-y-2" aria-live="polite">
          <p className="text-[13px] text-stone-500">পূর্বাভাস আনা হচ্ছে…</p>
          <div className="h-20 animate-pulse rounded-2xl bg-stone-100 motion-reduce:animate-none" />
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900">{error}</p>}
      {data && !loading && (
        <>
          <div className={`flex items-start gap-3 rounded-2xl border-2 p-4 ${data.spray.ok ? "border-green-600 bg-green-50" : "border-amber-500 bg-amber-50"}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${data.spray.ok ? "bg-green-600 text-white" : "bg-amber-500 text-white"}`}>
              {data.spray.ok ? <CheckCircle2 size={22} aria-hidden /> : <AlertTriangle size={22} aria-hidden />}
            </span>
            <div className="text-[14px]">
              <strong className="block text-[15px]">{data.spray.ok ? "এখন স্প্রে করার মতো আবহাওয়া" : "এখন স্প্রে না করাই ভালো"}</strong>
              <span className="text-[13px] text-stone-700">{data.spray.reasonBn}</span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-[12px]">
            <div className="rounded-2xl bg-sky-50 p-3"><dt className="flex items-center gap-1 text-sky-900"><CloudRain size={14} aria-hidden /> ২৪ ঘণ্টায় বৃষ্টি</dt><dd className="mt-1 font-mono text-[15px] font-bold">{maxRain}%</dd><dd className="font-mono text-[11px] text-stone-600">{totalRain.toFixed(1)} মিমি</dd></div>
            <div className="rounded-2xl bg-orange-50 p-3"><dt className="flex items-center gap-1 text-orange-900"><Thermometer size={14} aria-hidden /> তাপমাত্রা</dt><dd className="mt-1 font-mono text-[15px] font-bold">{Math.round(Math.min(...temps))}–{Math.round(Math.max(...temps))}°C</dd></div>
            <div className="rounded-2xl bg-stone-100 p-3"><dt className="flex items-center gap-1 text-stone-700"><Wind size={14} aria-hidden /> সর্বোচ্চ বাতাস</dt><dd className="mt-1 font-mono text-[15px] font-bold">{Math.round(Math.max(...day.map((x) => x.windKmh)))}</dd><dd className="text-[11px] text-stone-600">কিমি/ঘণ্টা</dd></div>
          </dl>
          <div>
            <div className="flex h-20 items-end gap-[3px] rounded-2xl bg-gradient-to-b from-sky-50/0 to-sky-50 px-1 pt-2" role="img" aria-label={`আগামী ২৪ ঘণ্টায় বৃষ্টির সম্ভাবনা, সর্বোচ্চ ${maxRain}%`}>
              {day.map((x, i) => (
                <div key={x.time} title={`${x.time.slice(11, 16)} — ${x.precipProbability}%`} className="hb-rain-bar flex-1 rounded-t bg-sky-500/80" style={{ height: `${Math.max(4, x.precipProbability)}%`, ["--i" as string]: i } as React.CSSProperties} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10.5px] text-stone-600"><span className="font-mono">{h[0]?.time.slice(11, 16)}</span><span>বৃষ্টির সম্ভাবনা, প্রতি ঘণ্টা</span><span className="font-mono">{h[Math.min(23, h.length - 1)]?.time.slice(11, 16)}</span></div>
          </div>
          <FarmReminder districtName={DISTRICTS.find((d) => d.id === district)?.nameBn ?? ""} />
          <p className="text-[11px] text-stone-500">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">Weather data by Open-Meteo.com</a> (CC BY 4.0) · আনা হয়েছে {new Date(data.fetchedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} · জেলা শহরের পূর্বাভাস; আপনার গ্রামে ভিন্ন হতে পারে। দুর্যোগ সতর্কবার্তার জন্য বাংলাদেশ আবহাওয়া অধিদপ্তর (BMD) দেখুন।
          </p>
        </>
      )}
    </section>
  );
}

/** Calendar reminder for a farm-work day the farmer chooses. It never suggests a date or a dose. */
function FarmReminder({ districtName }: { districtName: string }) {
  const [date, setDate] = useState("");
  const [work, setWork] = useState("স্প্রে");
  const valid = isIsoDate(date);
  return (
    <div className="grid gap-2 rounded-2xl border border-stone-200 bg-stone-50/70 p-3 text-[13px] sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1 font-semibold">কাজ
        <select value={work} onChange={(e) => setWork(e.target.value)} className="hb-input">
          {["স্প্রে", "সেচ", "সার দেওয়া", "বীজ বোনা", "ফসল কাটা"].map((w) => <option key={w}>{w}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-semibold">কবে
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="hb-input" />
      </label>
      <button
        type="button"
        disabled={!valid}
        onClick={() => downloadText(`haatbazar-${work}-${date}.ics`, allDayIcs([{
          uid: `${work}-${date}-${districtName}`,
          date,
          title: `${work}: ${districtName}`,
          description: "সেদিন সকালে হাটবাজারে আবহাওয়া আবার দেখুন (বৃষ্টি ও বাতাস)। পণ্যের লেবেলের নির্দেশনা মানুন; প্রশ্ন থাকলে কৃষি কল সেন্টার ১৬১২৩।",
        }], "HaatBazar"), "text/calendar;charset=utf-8")}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-green-700 px-4 font-bold text-white hover:bg-green-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
      >
        <CalendarDays size={15} aria-hidden /> ক্যালেন্ডারে মনে করিয়ে দিন
      </button>
      <p className="text-[12px] text-stone-500 sm:col-span-3">তারিখ আপনি বেছে নিন। সেদিনের আবহাওয়া আগাম বলা যায় না, তাই রিমাইন্ডারে সকালে আবার যাচাই করতে বলা থাকবে।</p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
function PriceNotebook({ notes, setNotes, today }: { notes: StoredNote[]; setNotes: (n: StoredNote[] | ((p: StoredNote[]) => StoredNote[])) => void; today: string }) {
  const [cropId, setCropId] = useState("potato");
  const [market, setMarket] = useState("");
  const [price, setPrice] = useState("");
  const [kind, setKind] = useState<PriceNote["kind"]>("farmgate");
  const [heardFrom, setHeardFrom] = useState("নিজে হাটে");
  const [date, setDate] = useState("");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  useEffect(() => { if (today && !date) setDate(today); }, [today, date]);
  const valid = Number(price) > 0 && market.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const filteredNotes = filterCrop === "all" ? notes : notes.filter((n) => n.cropId === filterCrop);

  const exportCsv = () => {
    if (notes.length === 0) return;
    const header = "ফসল,হাট_বা_মোকাম,ধরন,দাম_টাকা_কেজি,দাম_টাকা_মণ,উৎস,তারিখ\n";
    const rows = notes
      .map(
        (n) =>
          `"${CROPS.find((c) => c.id === n.cropId)?.nameBn ?? n.cropId}","${n.market}","${KIND_BN[n.kind]}",${n.pricePerKg},${n.pricePerKg * KG_PER_MAUND},"${n.heardFrom}","${n.date}"`
      )
      .join("\n");
    downloadText(`haatbazar-price-notebook-${today || "export"}.csv`, "\uFEFF" + header + rows, "text/csv;charset=utf-8");
  };

  return (
    <section aria-labelledby="pn-h" className="hb-card p-5 sm:p-6">
      <SectionTitle
        id="pn-h"
        icon={<NotebookPen size={20} aria-hidden />}
        title="দামের খাতা"
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {notes.length > 0 && (
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 text-[12px] font-bold text-stone-800 shadow-2xs hover:bg-stone-50"
              >
                <FileDown size={14} aria-hidden /> CSV ডাউনলোড ({notes.length})
              </button>
            )}
            <a href="http://www.dam.gov.bd/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 text-[12px] font-semibold text-green-900 hover:bg-green-100">
              সরকারি দৈনিক বাজারদর: DAM <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        }
      />
      <p className="mt-2 text-[13px] text-stone-600">যে দাম শুনেছেন তা কোথা থেকে, কবে — সহ লিখে রাখুন। ৩ দিনের পুরনো দাম আলাদা করে চিহ্নিত হবে। শুধু এই ডিভাইসে থাকে।</p>
      <form
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          setNotes((p) => [{ id: Math.random().toString(36).slice(2), cropId, market: market.trim().slice(0, 60), pricePerKg: Number(price), kind, heardFrom: heardFrom.trim().slice(0, 40), date }, ...p].slice(0, 300));
          setPrice("");
        }}
      >
        <label className="text-[12px] font-bold text-stone-700">ফসল<select value={cropId} onChange={(e) => setCropId(e.target.value)} className="hb-input mt-1">{CROPS.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}</select></label>
        <label className="text-[12px] font-bold text-stone-700">হাট/মোকাম<input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="যেমন: মহাস্থান হাট" className="hb-input mt-1" /></label>
        <label className="text-[12px] font-bold text-stone-700">ধরন<select value={kind} onChange={(e) => setKind(e.target.value as PriceNote["kind"])} className="hb-input mt-1">{Object.entries(KIND_BN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-[12px] font-bold text-stone-700">দাম (৳/কেজি)<input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="hb-input mt-1 font-mono" /></label>
        <label className="text-[12px] font-bold text-stone-700">কোথা থেকে জেনেছেন<input value={heardFrom} onChange={(e) => setHeardFrom(e.target.value)} className="hb-input mt-1" /></label>
        <label className="text-[12px] font-bold text-stone-700">তারিখ<input type="date" value={date} max={today || undefined} onChange={(e) => setDate(e.target.value)} className="hb-input mt-1" /></label>
        <button type="submit" disabled={!valid} className="col-span-2 min-h-[44px] self-end rounded-xl bg-green-800 px-4 text-[14px] font-bold text-white hover:bg-green-900 disabled:opacity-40 sm:col-span-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2">যোগ করুন</button>
      </form>

      {/* Filter by Crop */}
      {notes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="font-bold text-stone-600">ফিল্টার:</span>
          <button
            type="button"
            onClick={() => setFilterCrop("all")}
            className={`rounded-full px-3 py-1 font-semibold transition-colors ${
              filterCrop === "all" ? "bg-stone-900 text-white" : "border border-line bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            সব ফসল ({notes.length})
          </button>
          {Array.from(new Set(notes.map((n) => n.cropId))).map((cid) => {
            const count = notes.filter((n) => n.cropId === cid).length;
            const cName = CROPS.find((c) => c.id === cid)?.nameBn ?? cid;
            return (
              <button
                key={cid}
                type="button"
                onClick={() => setFilterCrop(cid)}
                className={`rounded-full px-3 py-1 font-semibold transition-colors ${
                  filterCrop === cid ? "bg-green-800 text-white" : "border border-line bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                {cName} ({count})
              </button>
            );
          })}
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center text-[13px] text-stone-600">
          {notes.length === 0
            ? "এখনো কোনো দাম লেখা নেই। আজ হাটে বা আড়তদারের কাছে যা শুনলেন, এখানে লিখুন — পরে তুলনা করতে কাজে লাগবে।"
            : "এই ফসলের কোনো দাম লেখা নেই।"}
        </p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((n) => {
            const age = today ? priceAgeDays(n.date, today) : 0;
            const stale = age > 3;
            return (
              <li key={n.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-3 ${stale ? "border-stone-200 bg-stone-50 text-stone-500" : "border-green-200 bg-white"}`}>
                <div className="min-w-0 text-[13px]">
                  <p className="font-bold text-stone-900">{CROPS.find((c) => c.id === n.cropId)?.nameBn ?? n.cropId} · {n.market}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <strong className="font-mono text-[18px] text-stone-900">৳{n.pricePerKg}</strong><span className="text-[11px]">/কেজি</span>
                    <span className="font-mono text-[12px]">৳{r0(n.pricePerKg * KG_PER_MAUND)}/মণ</span>
                  </p>
                  <p className="mt-1 text-[11.5px]">{KIND_BN[n.kind]} · {n.heardFrom} · {n.date}{stale && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">{age} দিন পুরনো</span>}</p>
                </div>
                <button onClick={() => setNotes((p) => p.filter((x) => x.id !== n.id))} aria-label="মুছুন" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------------------------------ */
const DOCTOR_CROPS = [
  { id: "rice", label: "ধান" }, { id: "potato", label: "আলু" }, { id: "brinjal", label: "বেগুন" }, { id: "tomato", label: "টমেটো" },
  { id: "onion", label: "পেঁয়াজ" }, { id: "jute", label: "পাট" }, { id: "mango", label: "আম" },
];

function DiseaseReference() {
  const [viewMode, setViewMode] = useState<"doctor" | "catalog">("doctor");
  const [selectedCrop, setSelectedCrop] = useState("rice");
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [symptomSearch, setSymptomSearch] = useState("");
  const [catalogId, setCatalogId] = useState(CROP_DISEASES[0].id);

  const cropDiseases = useMemo(() => {
    const targetBn = DOCTOR_CROPS.find((c) => c.id === selectedCrop)?.label ?? selectedCrop;
    return CROP_DISEASES.filter((d) => d.cropNameBn === targetBn);
  }, [selectedCrop]);
  const availableTags = useMemo(() => Array.from(new Set(cropDiseases.flatMap((d) => d.symptomTags))), [cropDiseases]);
  const filteredTags = useMemo(() => {
    if (!symptomSearch.trim()) return availableTags;
    return availableTags.filter((tag) => tag.toLowerCase().includes(symptomSearch.trim().toLowerCase()));
  }, [availableTags, symptomSearch]);

  const diagnostic = useMemo(() => diagnoseCropSymptom(selectedCrop, activeSymptoms), [selectedCrop, activeSymptoms]);
  const toggleSymptom = (tag: string) => setActiveSymptoms((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const s = customSymptom.trim();
    if (!s) return;
    if (!activeSymptoms.includes(s)) setActiveSymptoms((prev) => [...prev, s]);
    setCustomSymptom("");
  };
  const d = CROP_DISEASES.find((x) => x.id === catalogId) ?? CROP_DISEASES[0];
  const tab = (mode: "doctor" | "catalog", icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setViewMode(mode)}
      aria-pressed={viewMode === mode}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold transition-colors ${viewMode === mode ? "bg-green-800 text-white shadow-sm" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div className="flex flex-wrap gap-2">
          {tab("doctor", <Stethoscope size={15} aria-hidden />, "ফসল ডাক্তার (Crop Doctor)")}
          {tab("catalog", <Bug size={15} aria-hidden />, "১২টি রোগের ক্যাটালগ")}
        </div>
        <a href="tel:16123" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-lime-100 px-3 text-[13px] font-bold text-green-900 hover:bg-lime-200">
          <PhoneCall size={14} aria-hidden /> ১৬১২৩
        </a>
      </div>

      {viewMode === "doctor" ? (
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-[12px] font-bold text-stone-600">ফসল নির্বাচন করুন</span>
            <div className="flex flex-wrap gap-2">
              {DOCTOR_CROPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={selectedCrop === c.id}
                  onClick={() => { setSelectedCrop(c.id); setActiveSymptoms([]); }}
                  className={`min-h-[44px] rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${selectedCrop === c.id ? "border-green-700 bg-green-50 font-bold text-green-900" : "border-stone-200 text-stone-700 hover:bg-stone-50"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-stone-600">মাঠে যে লক্ষণ দেখছেন (ছুঁয়ে বেছে নিন):</span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-stone-400" aria-hidden />
                  <input
                    type="text"
                    value={symptomSearch}
                    onChange={(e) => setSymptomSearch(e.target.value)}
                    placeholder="লক্ষণ ফিল্টার..."
                    className="rounded-lg border border-stone-200 bg-white py-1 pl-7 pr-2 text-[11.5px] text-stone-800 placeholder-stone-400 focus:border-green-600 focus:outline-none"
                  />
                </div>
                {activeSymptoms.length > 0 && (
                  <button type="button" onClick={() => setActiveSymptoms([])} className="min-h-[32px] px-1 text-[11.5px] font-semibold text-red-700 hover:underline">সব মুছুন</button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => {
                const on = activeSymptoms.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSymptom(tag)}
                    className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-medium transition-colors ${on ? "bg-green-700 font-bold text-white shadow-sm" : "bg-stone-100 text-stone-800 hover:bg-stone-200"}`}
                  >
                    {on ? "✓ " : "+ "}{tag}
                  </button>
                );
              })}
            </div>
            <form onSubmit={handleAddCustom} className="mt-2 flex gap-2">
              <label className="sr-only" htmlFor="custom-symptom">অন্য লক্ষণ</label>
              <input id="custom-symptom" type="text" value={customSymptom} onChange={(e) => setCustomSymptom(e.target.value)} placeholder="অন্য কোনো লক্ষণ থাকলে লিখুন..." className="hb-input flex-1" />
              <button type="submit" disabled={!customSymptom.trim()} className="min-h-[44px] rounded-xl bg-stone-100 px-4 text-[13px] font-bold text-stone-800 hover:bg-stone-200 disabled:opacity-40">যোগ</button>
            </form>
          </div>

          {activeSymptoms.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-[13px] text-stone-600">
              মাঠের ফসলে কোনো দাগ, পোকার ক্ষতি বা পাতার শুকিয়ে যাওয়া লক্ষ্য করলে ওপরের লক্ষণগুলোতে ছুঁয়ে দিন। লক্ষণ মিলিয়ে সম্ভাব্য রোগ ও সমন্বিত বালাই ব্যবস্থাপনা (IPM) দেখাবে।
            </div>
          ) : diagnostic.topMatch ? (
            <div className="hb-reveal space-y-2 rounded-2xl border-2 border-green-600 bg-green-50/90 p-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-green-950">
                  <CheckCircle2 size={17} className="text-green-700" aria-hidden /> সম্ভাব্য রোগ: {diagnostic.topMatch.disease.diseaseNameBn}
                </span>
                <span className="rounded-full bg-green-200/90 px-2.5 py-1 text-[11px] font-bold text-green-900">{diagnostic.topMatch.matchScore}% লক্ষণ মিল</span>
              </div>
              <p className="text-[13px] text-stone-800"><strong>স্বাভাবিক লক্ষণ:</strong> {diagnostic.topMatch.disease.symptomsBn}</p>
              <p className="text-[12.5px] text-stone-700"><strong>আবহাওয়া অনুকূল হলে বাড়ে:</strong> {diagnostic.topMatch.disease.favouredByBn}</p>
              <div className="space-y-1 rounded-xl border border-green-100 bg-white/90 p-3 text-[12.5px]">
                <span className="block font-bold text-green-900">সমন্বিত বালাই ব্যবস্থাপনা (রাসায়নিক ছাড়া জৈব পদক্ষেপ):</span>
                <ul className="list-disc space-y-0.5 pl-4 text-stone-700">
                  <li>{diagnostic.topMatch.disease.preventiveActionBn}</li>
                  <li>{diagnostic.topMatch.disease.nonChemicalBn}</li>
                </ul>
              </div>
              <p className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[12px] text-amber-950">
                <AlertTriangle size={13} className="mr-1 inline text-amber-700" aria-hidden />{diagnostic.topMatch.disease.chemicalNoteBn}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-950">
              <p className="font-bold">সরাসরি কোনো নির্দিষ্ট রোগের সাথে পুরোপুরি মেলেনি।</p>
              <p className="mt-1">ভুল চিকিৎসার ঝুঁকি এড়াতে আক্রান্ত পাতার নমুনা নিয়ে নিকটস্থ উপজেলা কৃষি অফিস বা উপসহকারী কৃষি কর্মকর্তার কাছে যান। অথবা সরাসরি কল করুন:</p>
              <a href="tel:16123" className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-green-800 px-4 text-[13px] font-bold text-white shadow-sm">
                <PhoneCall size={14} aria-hidden /> কৃষি কল সেন্টার ১৬১২৩-এ কল করুন
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="ফসলের সমস্যা">
            {CROP_DISEASES.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={x.id === catalogId}
                onClick={() => setCatalogId(x.id)}
                className={`min-h-[40px] rounded-xl border px-3 text-[12.5px] font-semibold ${x.id === catalogId ? "border-green-700 bg-green-50 text-green-900" : "border-stone-200 text-stone-700 hover:bg-stone-50"}`}
              >
                {x.cropNameBn}: {x.diseaseNameBn}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 text-[13px]">
            <p><strong>লক্ষণ:</strong> {d.symptomsBn}</p>
            <p><strong>যখন বাড়ে:</strong> {d.favouredByBn}</p>
            <p><strong>প্রতিরোধ:</strong> {d.preventiveActionBn}</p>
            <p><strong>রাসায়নিক ছাড়া:</strong> {d.nonChemicalBn}</p>
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-amber-950">
              <AlertTriangle size={14} className="mr-1 inline" aria-hidden />{d.chemicalNoteBn}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
