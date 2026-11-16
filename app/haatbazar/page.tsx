"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sprout, Phone, CloudRain, Wind, Thermometer, Truck, NotebookPen, Trash2, AlertTriangle, CheckCircle2, CalendarDays, Bug, Camera, ExternalLink, Stethoscope, ShieldCheck, Check, PhoneCall } from "lucide-react";
import { AppHeader, SourceTag } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { AgriculturalLifecycle } from "@/components/AgriculturalLifecycle";
import { HaatMarket } from "@/components/HaatMarket";
import {
  tripMargin, shareTruck, priceAgeDays, seasonForMonth, SEASONS, RICE_SEASONS, DISTRICTS, CROP_DISEASES, CROPS, KG_PER_MAUND,
  calculateSensitivityCurve, diagnoseCropSymptom, type SensitivityPoint, type CropDiagnosticResult,
  type PriceNote, type WeatherHour, type SprayWindow,
} from "@/lib/haatbazar";
import { usePersistentState, storageKey, todayLocal } from "@/lib/clientStore";

const KIND_BN: Record<PriceNote["kind"], string> = { farmgate: "মাঠ/হাটে কৃষকের দাম", wholesale: "পাইকারি (আড়ত)", retail: "খুচরা" };
const r0 = (n: number) => Math.round(n).toLocaleString("en-IN");

interface StoredNote extends PriceNote { id: string }
const sanitizeNotes = (raw: unknown): StoredNote[] | null =>
  Array.isArray(raw)
    ? raw.filter((n): n is StoredNote => n && typeof n.id === "string" && typeof n.cropId === "string" && typeof n.market === "string" && typeof n.pricePerKg === "number" && n.pricePerKg > 0 && n.pricePerKg < 100000 && ["farmgate", "wholesale", "retail"].includes(n.kind) && /^\d{4}-\d{2}-\d{2}$/.test(n.date)).slice(0, 300)
    : null;

export default function HaatBazarPage() {
  const [today, setToday] = useState("");
  const [district, setDistrict] = usePersistentState<string>(storageKey("haatbazar", "district"), "bogura", (r) => (typeof r === "string" && DISTRICTS.some((d) => d.id === r) ? r : null));
  const [notes, setNotes] = usePersistentState<StoredNote[]>(storageKey("haatbazar", "priceNotes"), [], sanitizeNotes);
  useEffect(() => setToday(todayLocal()), []);
  const month = today ? Number(today.slice(5, 7)) : 0;
  const season = month ? seasonForMonth(month) : null;

  return (
    <div className="min-h-screen bg-[#f8f7f1] text-stone-900 antialiased">
      <AppHeader taglineEn="Farm costs, weather & crop info" appId="haatbazar" href="/haatbazar" name="HaatBazar AI" taglineBn="কৃষকের হিসাব, আবহাওয়া ও ফসলের তথ্য" icon={<Sprout size={22} />} accent="from-lime-600 to-green-800" />

      <div className="border-b border-green-200 bg-green-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-[13px] text-green-950 sm:px-6">
          <span className="inline-flex items-center gap-1.5 font-bold"><Phone size={14} aria-hidden /> কৃষি কল সেন্টার: <a href="tel:16123" className="underline">16123</a></span>
          <span>ফসলের রোগ, সার ও ওষুধের পরামর্শের জন্য উপজেলা কৃষি অফিস বা উপসহকারী কৃষি কর্মকর্তা</span>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 motion-safe:animate-rise-in">
        <section className="rounded-2xl border border-stone-200/80 bg-white/80 backdrop-blur-md p-5 sm:p-6 shadow-xs hover:shadow-md transition-all">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-stone-900 sm:text-[32px]">দূরের মোকামে নেবেন, নাকি হাটেই বেচবেন? আগে হিসাব করে নিন।</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-stone-600">
            আজ যে দাম শুনেছেন তা লিখে রাখুন, পরিবহন-কমিশন-ঘাটতি বাদ দিয়ে আসল লাভ দেখুন, স্প্রে করার আগে আবহাওয়া দেখুন। আমরা নিজে থেকে কোনো বাজারদর বানাই না; দাম আপনার দেওয়া বা উৎসসহ দেখানো।
          </p>
          {season && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl bg-lime-50/90 border border-lime-200/80 px-3 py-2 text-[13px] text-lime-950 font-medium">
              <CalendarDays size={15} aria-hidden /> এখন <strong>{season.nameBn}</strong> ({season.monthsBn}) — প্রধান ফসল: {season.cropsBn}
            </p>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <TripCalculator notes={notes} />
          <WeatherPanel district={district} setDistrict={setDistrict} />
        </div>

        <HaatMarket />

        <PriceNotebook notes={notes} setNotes={setNotes} today={today} />

        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="dis-h" className="rounded-2xl border border-stone-200 bg-white p-5">
            <h2 id="dis-h" className="flex items-center gap-1.5 text-[17px] font-bold"><Bug size={18} aria-hidden /> ফসলের সাধারণ সমস্যা চিনুন</h2>
            <p className="mt-1 text-[12px] text-stone-500">লক্ষণ মিলিয়ে দেখুন। নিশ্চিত হতে ও ওষুধের মাত্রা জানতে কৃষি অফিসে যোগাযোগ করুন — আমরা কোনো কীটনাশকের মাত্রা দিই না।</p>
            <DiseaseReference />
          </section>

          <section aria-labelledby="cal-h" className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
            <h2 id="cal-h" className="flex items-center gap-1.5 text-[17px] font-bold"><CalendarDays size={18} aria-hidden /> মৌসুম ও ধানের সময়সূচি</h2>
            <ul className="space-y-2">
              {SEASONS.map((s) => (
                <li key={s.id} className={`rounded-xl border p-3 text-[13px] ${season?.id === s.id ? "border-lime-500 bg-lime-50" : "border-stone-200"}`}>
                  <strong>{s.nameBn}</strong> <span className="text-stone-500">· {s.monthsBn}</span>
                  <span className="block text-stone-700">{s.cropsBn}</span>
                </li>
              ))}
            </ul>
            <table className="w-full text-left text-[13px]">
              <thead className="text-[11px] uppercase text-stone-500"><tr><th className="py-1">ধান</th><th>রোপণ/বপন</th><th>কাটা</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {RICE_SEASONS.map((r) => <tr key={r.nameBn}><td className="py-1.5 font-semibold">{r.nameBn}</td><td>{r.plantBn}</td><td>{r.harvestBn}</td></tr>)}
              </tbody>
            </table>
            <p className="text-[11px] text-stone-500">মৌসুমের সীমা উৎসভেদে কিছুটা আলাদা; এলাকা ও জাত অনুযায়ী সময় বদলায়। <SourceTag confidence="reported" label="Banglapedia: Crop" url="https://en.banglapedia.org/index.php/Crop" checked="2026-11-05" /></p>
          </section>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="flex items-center gap-1.5 text-[16px] font-bold"><Camera size={17} aria-hidden /> ছবি দিয়ে রোগ শনাক্ত?</h2>
          <p className="mt-1 text-[13px] text-stone-600">
            এই অ্যাপে ছবি দেখে রোগ নির্ণয় এখনো নেই — নির্ভরযোগ্য মডেল ও যাচাই ছাড়া ভুল ওষুধের পরামর্শ ক্ষতি করতে পারে। সরকারি “কৃষকের জানালা” সেবায় ছবি ও লক্ষণ দেখে মিলিয়ে নিতে পারেন, অথবা আক্রান্ত গাছের ছবি তুলে উপসহকারী কৃষি কর্মকর্তাকে দেখান।
          </p>
        </section>

        <section aria-label="কৃষি চক্র">
          <AgriculturalLifecycle />
        </section>

        <p className="text-[12px] text-stone-600">
          এটি সাধারণ তথ্য ও হিসাবের যন্ত্র। ফলন বা লাভের নিশ্চয়তা নয়। <Link href="/settings" className="font-semibold text-green-800 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007aff] rounded">সংরক্ষিত ডেটা</Link>
        </p>
      </main>
      <AppFooter lang="bn" />
    </div>
  );
}

function TripCalculator({ notes }: { notes: StoredNote[] }) {
  const [v, setV] = useState({ quantityKg: 1000, localPricePerKg: 38, distantPricePerKg: 46, transportPerMaund: 65, commissionPct: 5, labourPerMaund: 10, lossPct: 2, otherCosts: 300 });
  const [touched, setTouched] = useState(false);
  const [sensitivityDelta, setSensitivityDelta] = useState(0);
  const r = useMemo(() => tripMargin(v), [v]);
  const sensitivityCurve = useMemo(() => calculateSensitivityCurve(v), [v]);
  const activePoint = useMemo(
    () => sensitivityCurve.find((p) => p.deltaPct === sensitivityDelta) ?? sensitivityCurve.find((p) => p.deltaPct === 0)!,
    [sensitivityCurve, sensitivityDelta]
  );
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => { setTouched(true); setV({ ...v, [k]: Math.max(0, Number(e.target.value) || 0) }); };
  const [farmers, setFarmers] = useState("10, 10, 5");
  const [fare, setFare] = useState(4500);
  const loads = farmers.split(/[,\s]+/).map(Number).filter((n) => n > 0).slice(0, 20);
  const shares = shareTruck(fare, loads);
  const wholesaleNotes = notes.filter((n) => n.kind === "wholesale").slice(0, 5);
  const localNotes = notes.filter((n) => n.kind === "farmgate").slice(0, 5);

  const field = (k: keyof typeof v, label: string, suffix: string, step = 1) => (
    <label className="text-[12px] font-bold text-stone-600">
      {label}
      <span className="mt-1 flex items-center rounded-lg border border-stone-200 bg-white focus-within:border-green-700">
        <input type="number" min={0} step={step} value={v[k]} onChange={set(k)} className="w-full rounded-lg px-2 py-1.5 text-[14px] font-bold text-stone-900 outline-none" />
        <span className="pr-2 text-[11px] font-normal text-stone-500">{suffix}</span>
      </span>
    </label>
  );

  return (
    <section aria-labelledby="trip-h" className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="trip-h" className="flex items-center gap-1.5 text-[17px] font-bold"><Truck size={18} aria-hidden /> দূরের মোকামে নেওয়ার হিসাব</h2>
        {!touched && <SourceTag confidence="example" label="নিজের সংখ্যা বসান" />}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {field("quantityKg", "পরিমাণ", `কেজি (${(v.quantityKg / KG_PER_MAUND).toFixed(1)} মণ)`, 10)}
        {field("localPricePerKg", "হাটে দাম", "৳/কেজি", 0.5)}
        {field("distantPricePerKg", "দূরের আড়তে পাইকারি দাম", "৳/কেজি", 0.5)}
        {field("transportPerMaund", "পরিবহন ভাড়া", "৳/মণ")}
        {field("commissionPct", "আড়তদারের কমিশন", "%", 0.5)}
        {field("labourPerMaund", "লোড-আনলোড, বস্তা", "৳/মণ")}
        {field("lossPct", "পথে ঘাটতি/নষ্ট", "%", 0.5)}
        {field("otherCosts", "টোল, খাজনা, অন্যান্য", "৳")}
      </div>
      {(wholesaleNotes.length > 0 || localNotes.length > 0) && (
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="self-center text-stone-500">আপনার নোট থেকে:</span>
          {localNotes.map((n) => <button key={n.id} onClick={() => { setTouched(true); setV({ ...v, localPricePerKg: n.pricePerKg }); }} className="rounded bg-stone-100 px-2 py-1">হাট: {CROPS.find((c) => c.id === n.cropId)?.nameBn} ৳{n.pricePerKg} ({n.date})</button>)}
          {wholesaleNotes.map((n) => <button key={n.id} onClick={() => { setTouched(true); setV({ ...v, distantPricePerKg: n.pricePerKg }); }} className="rounded bg-stone-100 px-2 py-1">{n.market}: ৳{n.pricePerKg} ({n.date})</button>)}
        </div>
      )}
      <p className="text-[11px] text-stone-500">দূরের দামে <strong>খুচরা নয়, পাইকারি</strong> দাম বসান — কৃষক আড়তে খুচরা দাম পান না।</p>

      <div className={`rounded-xl border-2 p-4 ${r.worthIt ? "border-green-600 bg-green-50" : "border-amber-500 bg-amber-50"}`}>
        <div className="flex items-start gap-2">
          {r.worthIt ? <CheckCircle2 className="mt-0.5 shrink-0 text-green-700" size={20} aria-hidden /> : <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={20} aria-hidden />}
          <p className="text-[15px] font-bold">
            {r.worthIt ? `দূরের মোকামে নিলে হাটের চেয়ে প্রায় ৳${r0(r.extraVsLocal)} বেশি থাকে।` : `দূরের মোকামে নিলে হাটের চেয়ে ৳${r0(-r.extraVsLocal)} কম থাকে — হাটেই বিক্রি ভালো।`}
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
          <div><dt className="text-stone-500">হাটে বিক্রি</dt><dd className="font-mono font-bold">৳{r0(r.localRevenue)}</dd></div>
          <div><dt className="text-stone-500">আড়তে বিক্রি ({r0(r.sellableKg)} কেজি)</dt><dd className="font-mono font-bold">৳{r0(r.distantRevenue)}</dd></div>
          <div><dt className="text-stone-500">কমিশন</dt><dd className="font-mono text-red-700">−৳{r0(r.commission)}</dd></div>
          <div><dt className="text-stone-500">পরিবহন</dt><dd className="font-mono text-red-700">−৳{r0(r.transport)}</dd></div>
          <div><dt className="text-stone-500">লোড-আনলোড</dt><dd className="font-mono text-red-700">−৳{r0(r.labour)}</dd></div>
          <div><dt className="text-stone-500">অন্যান্য</dt><dd className="font-mono text-red-700">−৳{r0(r.otherCosts)}</dd></div>
        </dl>
        <p className="mt-2 border-t border-stone-200 pt-2 text-[13px]">
          আড়তে সব খরচের পর হাতে থাকে <strong className="font-mono">৳{r0(r.distantNet)}</strong>। লাভ পেতে আড়তে অন্তত <strong>৳{Number.isFinite(r.breakEvenDistantPrice) ? r.breakEvenDistantPrice.toFixed(2) : "—"}/কেজি</strong> পাইকারি দাম লাগবে।
        </p>
        <p className="mt-1 text-[11px] text-stone-500">শুধু আপনার দেওয়া সংখ্যার হিসাব। পৌঁছানোর দিনে দাম বদলে যেতে পারে — লাভের নিশ্চয়তা নয়।</p>
      </div>

      {/* Profit Sensitivity Section */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[14px] font-bold text-stone-900">পাইকারি দর সংবেদনশীলতা (Profit Sensitivity)</h3>
            <p className="text-[12px] text-stone-500">
              মোকামে পৌঁছানোর পর যদি পাইকারি দর কমে বা বাড়ে, তবে আপনার আসল লাভ কেমন থাকবে?
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${activePoint.worthIt ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {sensitivityDelta > 0 ? `+${sensitivityDelta}%` : `${sensitivityDelta}%`} দর তারতম্য
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
            <span className="text-red-700">-১৫% দর পতন</span>
            <span className="text-stone-700">বর্তমান দর (৳{v.distantPricePerKg}/কেজি)</span>
            <span className="text-green-700">+১৫% দর বৃদ্ধি</span>
          </div>
          <input
            type="range"
            min={-15}
            max={15}
            step={5}
            value={sensitivityDelta}
            onChange={(e) => setSensitivityDelta(Number(e.target.value))}
            className="mt-1.5 h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200 accent-green-800"
            aria-label="পাইকারি দর তারতম্য স্লাইডার"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-lg bg-stone-50 p-2.5 text-[12px]">
          <div>
            <span className="text-stone-500">পরিবর্তিত দর:</span>
            <p className="font-mono font-bold">৳{activePoint.adjustedWholesalePrice.toFixed(2)}/কেজি</p>
          </div>
          <div>
            <span className="text-stone-500">আড়তে নিট আয়:</span>
            <p className="font-mono font-bold">৳{r0(activePoint.distantNet)}</p>
          </div>
          <div>
            <span className="text-stone-500">হাটের চেয়ে পার্থক্য:</span>
            <p className={`font-mono font-bold ${activePoint.extraVsLocal >= 0 ? "text-green-700" : "text-amber-700"}`}>
              {activePoint.extraVsLocal >= 0 ? `+৳${r0(activePoint.extraVsLocal)}` : `−৳${r0(-activePoint.extraVsLocal)}`}
            </p>
          </div>
          <div>
            <span className="text-stone-500">সিদ্ধান্ত:</span>
            <p className={`font-bold ${activePoint.worthIt ? "text-green-800" : "text-amber-800"}`}>
              {activePoint.worthIt ? "মোকামে লাভজনক" : "হাটেই বিক্রি শ্রেয়"}
            </p>
          </div>
        </div>

        {/* Responsive compact curve matrix */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[12px]">
            <thead className="border-b border-stone-200 text-[10px] uppercase text-stone-500">
              <tr>
                <th className="py-1">দর তারতম্য</th>
                <th>পাইকারি দর</th>
                <th>আড়তে নিট</th>
                <th>পার্থক্য</th>
                <th>সিদ্ধান্ত</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sensitivityCurve.map((pt) => (
                <tr
                  key={pt.deltaPct}
                  onClick={() => setSensitivityDelta(pt.deltaPct)}
                  className={`cursor-pointer transition-colors ${pt.deltaPct === sensitivityDelta ? "bg-green-50/70 font-semibold" : "hover:bg-stone-50"}`}
                >
                  <td className="py-1 font-mono">{pt.deltaPct > 0 ? `+${pt.deltaPct}%` : pt.deltaPct === 0 ? "০% (ভিত্তি)" : `${pt.deltaPct}%`}</td>
                  <td className="font-mono">৳{pt.adjustedWholesalePrice.toFixed(2)}</td>
                  <td className="font-mono">৳{r0(pt.distantNet)}</td>
                  <td className={`font-mono ${pt.extraVsLocal >= 0 ? "text-green-700" : "text-amber-700"}`}>
                    {pt.extraVsLocal >= 0 ? `+৳${r0(pt.extraVsLocal)}` : `−৳${r0(-pt.extraVsLocal)}`}
                  </td>
                  <td>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${pt.worthIt ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {pt.worthIt ? "লাভজনক" : "ঝুঁকিপূর্ণ"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-stone-50 p-3">
        <h3 className="text-[13px] font-bold">একসাথে ট্রাক ভাড়া — কে কত দেবেন</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="text-[12px] text-stone-600">মোট ভাড়া (৳)<input type="number" min={0} value={fare} onChange={(e) => setFare(Math.max(0, Number(e.target.value) || 0))} className="mt-1 block w-28 rounded border border-stone-200 px-2 py-1 font-bold" /></label>
          <label className="min-w-[180px] flex-1 text-[12px] text-stone-600">প্রত্যেকের মণ (কমা দিয়ে)<input value={farmers} onChange={(e) => setFarmers(e.target.value)} className="mt-1 block w-full rounded border border-stone-200 px-2 py-1 font-mono" /></label>
        </div>
        {loads.length > 0 && (
          <p className="mt-2 text-[13px]">
            {shares.map((s, i) => <span key={i} className="mr-3 inline-block">কৃষক {i + 1} ({loads[i]} মণ): <strong>৳{s}</strong></span>)}
          </p>
        )}
      </div>
    </section>
  );
}

function WeatherPanel({ district, setDistrict }: { district: string; setDistrict: (d: string) => void }) {
  const [data, setData] = useState<{ hours: WeatherHour[]; spray: SprayWindow; fetchedAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/weather?d=${encodeURIComponent(district)}`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok || !Array.isArray(d.hours)) {
          setError("পূর্বাভাস পাওয়া যায়নি। ইন্টারনেট সংযোগ দেখুন বা পরে চেষ্টা করুন।");
          setData(null);
        } else setData(d);
      })
      .catch(() => !cancelled && setError("পূর্বাভাস পাওয়া যায়নি। ইন্টারনেট সংযোগ দেখুন।"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [district]);

  const h = data?.hours ?? [];
  const maxRain = h.length ? Math.max(...h.slice(0, 24).map((x) => x.precipProbability)) : 0;
  const totalRain = h.slice(0, 24).reduce((a, x) => a + x.precipitationMm, 0);
  const temps = h.slice(0, 24).map((x) => x.temperatureC);

  return (
    <section aria-labelledby="wx-h" className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="wx-h" className="flex items-center gap-1.5 text-[17px] font-bold"><CloudRain size={18} aria-hidden /> আবহাওয়া ও স্প্রের সময়</h2>
        <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="জেলা" className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[13px] font-semibold">
          {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.nameBn}</option>)}
        </select>
      </div>
      {loading && <p className="text-[13px] text-stone-400">পূর্বাভাস আনা হচ্ছে…</p>}
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-2 text-[13px] text-amber-900">{error}</p>}
      {data && !loading && (
        <>
          <div className={`rounded-xl border-2 p-3 text-[14px] ${data.spray.ok ? "border-green-600 bg-green-50" : "border-amber-500 bg-amber-50"}`}>
            <strong className="block">{data.spray.ok ? "এখন স্প্রে করার মতো আবহাওয়া" : "এখন স্প্রে না করাই ভালো"}</strong>
            <span className="text-[13px]">{data.spray.reasonBn}</span>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-[12px]">
            <div className="rounded-lg bg-stone-50 p-2"><dt className="flex items-center gap-1 text-stone-500"><CloudRain size={13} aria-hidden /> ২৪ ঘণ্টায় বৃষ্টি</dt><dd className="font-bold">{maxRain}% · {totalRain.toFixed(1)} মিমি</dd></div>
            <div className="rounded-lg bg-stone-50 p-2"><dt className="flex items-center gap-1 text-stone-500"><Thermometer size={13} aria-hidden /> তাপমাত্রা</dt><dd className="font-bold">{Math.round(Math.min(...temps))}–{Math.round(Math.max(...temps))}°C</dd></div>
            <div className="rounded-lg bg-stone-50 p-2"><dt className="flex items-center gap-1 text-stone-500"><Wind size={13} aria-hidden /> সর্বোচ্চ বাতাস</dt><dd className="font-bold">{Math.round(Math.max(...h.slice(0, 24).map((x) => x.windKmh)))} কিমি/ঘ</dd></div>
          </dl>
          <div className="flex h-16 items-end gap-0.5" aria-label="আগামী ২৪ ঘণ্টার বৃষ্টির সম্ভাবনা">
            {h.slice(0, 24).map((x) => (
              <div key={x.time} title={`${x.time.slice(11, 16)} — ${x.precipProbability}%`} className="flex-1 rounded-t bg-sky-400/80" style={{ height: `${Math.max(3, x.precipProbability)}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone-400"><span>{h[0]?.time.slice(11, 16)}</span><span>বৃষ্টির সম্ভাবনা, প্রতি ঘণ্টা</span><span>{h[Math.min(23, h.length - 1)]?.time.slice(11, 16)}</span></div>
          <p className="text-[11px] text-stone-500">
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">Weather data by Open-Meteo.com</a> (CC BY 4.0) · আনা হয়েছে {new Date(data.fetchedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} · জেলা শহরের পূর্বাভাস; আপনার গ্রামে ভিন্ন হতে পারে। দুর্যোগ সতর্কবার্তার জন্য বাংলাদেশ আবহাওয়া অধিদপ্তর (BMD) দেখুন।
          </p>
        </>
      )}
    </section>
  );
}

function PriceNotebook({ notes, setNotes, today }: { notes: StoredNote[]; setNotes: (n: StoredNote[] | ((p: StoredNote[]) => StoredNote[])) => void; today: string }) {
  const [cropId, setCropId] = useState("potato");
  const [market, setMarket] = useState("");
  const [price, setPrice] = useState("");
  const [kind, setKind] = useState<PriceNote["kind"]>("farmgate");
  const [heardFrom, setHeardFrom] = useState("নিজে হাটে");
  const [date, setDate] = useState("");
  useEffect(() => { if (today && !date) setDate(today); }, [today, date]);
  const valid = Number(price) > 0 && market.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <section aria-labelledby="pn-h" className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pn-h" className="flex items-center gap-1.5 text-[17px] font-bold"><NotebookPen size={18} aria-hidden /> দামের খাতা</h2>
        <a href="http://www.dam.gov.bd/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-green-800 underline">
          সরকারি দৈনিক বাজারদর: কৃষি বিপণন অধিদপ্তর (DAM) <ExternalLink size={12} aria-hidden />
        </a>
      </div>
      <p className="mt-1 text-[12px] text-stone-500">যে দাম শুনেছেন তা কোথা থেকে, কবে — সহ লিখে রাখুন। ৩ দিনের পুরনো দাম আলাদা করে চিহ্নিত হবে। শুধু এই ডিভাইসে থাকে।</p>
      <form
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          setNotes((p) => [{ id: Math.random().toString(36).slice(2), cropId, market: market.trim().slice(0, 60), pricePerKg: Number(price), kind, heardFrom: heardFrom.trim().slice(0, 40), date }, ...p].slice(0, 300));
          setPrice("");
        }}
      >
        <label className="text-[11px] font-bold text-stone-600">ফসল<select value={cropId} onChange={(e) => setCropId(e.target.value)} className="mt-1 block w-full rounded border border-stone-200 bg-white px-1.5 py-1.5 text-[13px]">{CROPS.map((c) => <option key={c.id} value={c.id}>{c.nameBn}</option>)}</select></label>
        <label className="text-[11px] font-bold text-stone-600">হাট/মোকাম<input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="যেমন: মহাস্থান হাট" className="mt-1 block w-full rounded border border-stone-200 px-1.5 py-1.5 text-[13px]" /></label>
        <label className="text-[11px] font-bold text-stone-600">ধরন<select value={kind} onChange={(e) => setKind(e.target.value as PriceNote["kind"])} className="mt-1 block w-full rounded border border-stone-200 bg-white px-1.5 py-1.5 text-[13px]">{Object.entries(KIND_BN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="text-[11px] font-bold text-stone-600">দাম (৳/কেজি)<input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} className="mt-1 block w-full rounded border border-stone-200 px-1.5 py-1.5 text-[13px]" /></label>
        <label className="text-[11px] font-bold text-stone-600">কোথা থেকে জেনেছেন<input value={heardFrom} onChange={(e) => setHeardFrom(e.target.value)} className="mt-1 block w-full rounded border border-stone-200 px-1.5 py-1.5 text-[13px]" /></label>
        <label className="text-[11px] font-bold text-stone-600">তারিখ<input type="date" value={date} max={today || undefined} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded border border-stone-200 px-1.5 py-1.5 text-[13px]" /></label>
        <button type="submit" disabled={!valid} className="self-end rounded-lg bg-green-800 px-3 py-2 text-[13px] font-bold text-white disabled:opacity-40">যোগ করুন</button>
      </form>
      {notes.length === 0 ? (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-center text-[13px] text-stone-500">এখনো কোনো দাম লেখা নেই। আজ হাটে বা আড়তদারের কাছে যা শুনলেন, এখানে লিখুন — পরে তুলনা করতে কাজে লাগবে।</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="text-[11px] uppercase text-stone-500"><tr><th className="py-1">তারিখ</th><th>ফসল</th><th>হাট/মোকাম</th><th>ধরন</th><th className="text-right">৳/কেজি</th><th className="text-right">৳/মণ</th><th>উৎস</th><th /></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {notes.map((n) => {
                const age = today ? priceAgeDays(n.date, today) : 0;
                return (
                  <tr key={n.id} className={age > 3 ? "text-stone-400" : ""}>
                    <td className="py-1.5">{n.date}{age > 3 && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">{age} দিন পুরনো</span>}</td>
                    <td>{CROPS.find((c) => c.id === n.cropId)?.nameBn ?? n.cropId}</td>
                    <td>{n.market}</td>
                    <td>{KIND_BN[n.kind]}</td>
                    <td className="text-right font-mono font-bold">{n.pricePerKg}</td>
                    <td className="text-right font-mono">{r0(n.pricePerKg * KG_PER_MAUND)}</td>
                    <td className="text-[12px]">{n.heardFrom}</td>
                    <td><button onClick={() => setNotes((p) => p.filter((x) => x.id !== n.id))} aria-label="মুছুন" className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DiseaseReference() {
  const [viewMode, setViewMode] = useState<"doctor" | "catalog">("doctor");
  const [selectedCrop, setSelectedCrop] = useState("rice");
  const [activeSymptoms, setActiveSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [catalogId, setCatalogId] = useState(CROP_DISEASES[0].id);

  // Suggested symptoms for the selected crop
  const cropDiseases = useMemo(() => {
    const cropBnMap: Record<string, string> = {
      rice: "ধান",
      potato: "আলু",
      brinjal: "বেগুন",
      tomato: "টমেটো",
      onion: "পেঁয়াজ",
      jute: "পাট",
      mango: "আম",
    };
    const targetBn = cropBnMap[selectedCrop] || selectedCrop;
    return CROP_DISEASES.filter((d) => d.cropNameBn === targetBn);
  }, [selectedCrop]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const d of cropDiseases) {
      for (const t of d.symptomTags) {
        tags.add(t);
      }
    }
    return Array.from(tags);
  }, [cropDiseases]);

  // Run deterministic diagnostic engine
  const diagnostic = useMemo(() => {
    return diagnoseCropSymptom(selectedCrop, activeSymptoms);
  }, [selectedCrop, activeSymptoms]);

  const toggleSymptom = (tag: string) => {
    setActiveSymptoms((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymptom.trim()) return;
    if (!activeSymptoms.includes(customSymptom.trim())) {
      setActiveSymptoms((prev) => [...prev, customSymptom.trim()]);
    }
    setCustomSymptom("");
  };

  const d = CROP_DISEASES.find((x) => x.id === catalogId) ?? CROP_DISEASES[0];

  return (
    <div className="mt-3 space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode("doctor")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${
              viewMode === "doctor"
                ? "bg-green-800 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <Stethoscope size={14} /> ফসল ডাক্তার (Crop Doctor)
          </button>
          <button
            type="button"
            onClick={() => setViewMode("catalog")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all ${
              viewMode === "catalog"
                ? "bg-green-800 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <Bug size={14} /> ১২টি রোগের ক্যাটালগ
          </button>
        </div>
        <a
          href="tel:16123"
          className="inline-flex items-center gap-1 rounded-lg bg-lime-100 px-2 py-1 text-[11px] font-bold text-green-900 hover:bg-lime-200"
        >
          <PhoneCall size={12} /> ১৬১২৩
        </a>
      </div>

      {viewMode === "doctor" ? (
        <div className="space-y-4">
          {/* Crop Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
              ফসল নির্বাচন করুন
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "rice", label: "ধান" },
                { id: "potato", label: "আলু" },
                { id: "brinjal", label: "বেগুন" },
                { id: "tomato", label: "টমেটো" },
                { id: "onion", label: "পেঁয়াজ" },
                { id: "jute", label: "পাট" },
                { id: "mango", label: "আম" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCrop(c.id);
                    setActiveSymptoms([]);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-all ${
                    selectedCrop === c.id
                      ? "border border-green-700 bg-green-50 text-green-900 font-bold"
                      : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Symptoms Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase text-stone-500">
                মাঠে যে লক্ষণ দেখছেন (ক্লিক করে নির্বাচন করুন):
              </span>
              {activeSymptoms.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSymptoms([])}
                  className="text-[11px] text-red-600 underline"
                >
                  সব মুছুন
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = activeSymptoms.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleSymptom(tag)}
                    className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-all ${
                      isSelected
                        ? "bg-green-700 text-white font-bold shadow-2xs"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom symptom input */}
            <form onSubmit={handleAddCustom} className="mt-2 flex gap-1.5">
              <input
                type="text"
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                placeholder="অন্য কোনো লক্ষণ থাকলে লিখুন..."
                className="flex-1 rounded-lg border border-stone-200 px-2.5 py-1 text-[12px] outline-none focus:border-green-700"
              />
              <button
                type="submit"
                disabled={!customSymptom.trim()}
                className="rounded-lg bg-stone-100 px-3 py-1 text-[12px] font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-40"
              >
                যোগ
              </button>
            </form>
          </div>

          {/* Diagnostic Result */}
          {activeSymptoms.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-[12px] text-stone-600">
              <p>
                মাঠের ফসলে কোনো দাগ, পোকার ক্ষতি বা পাতার শুকিয়ে যাওয়া লক্ষ্য করলে ওপরের লক্ষণগুলোতে ক্লিক করুন। ইঞ্জিন তাৎক্ষণিক লক্ষণ মিলিয়ে রোগ ও সমন্বিত বালাই ব্যবস্থাপনা (IPM) দেখাবে।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnostic.topMatch ? (
                <div className="rounded-xl border-2 border-green-600 bg-green-50/90 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[14px] font-extrabold text-green-950">
                      <CheckCircle2 size={16} className="text-green-700" />
                      সম্ভাব্য রোগ: {diagnostic.topMatch.disease.diseaseNameBn}
                    </span>
                    <span className="rounded-full bg-green-200/90 px-2 py-0.5 text-[11px] font-bold text-green-900">
                      {diagnostic.topMatch.matchScore}% লক্ষণ মিল
                    </span>
                  </div>

                  <p className="text-[13px] text-stone-800">
                    <strong>স্বাভাবিক লক্ষণ:</strong> {diagnostic.topMatch.disease.symptomsBn}
                  </p>

                  <p className="text-[12px] text-stone-600">
                    <strong>আবহাওয়া অনুকূল হলে বাড়ে:</strong> {diagnostic.topMatch.disease.favouredByBn}
                  </p>

                  <div className="rounded-lg bg-white/90 p-2.5 text-[12px] space-y-1 border border-green-100">
                    <span className="font-bold text-green-900 block">
                      সমন্বিত বালাই ব্যবস্থাপনা (রাসায়নিক ছাড়া জৈব পদক্ষেপ):
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-stone-700">
                      <li>{diagnostic.topMatch.disease.preventiveActionBn}</li>
                      <li>{diagnostic.topMatch.disease.nonChemicalBn}</li>
                    </ul>
                  </div>

                  <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-950">
                    <AlertTriangle size={13} className="mr-1 inline text-amber-700" />
                    {diagnostic.topMatch.disease.chemicalNoteBn}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-[12px] text-amber-950">
                  <p className="font-bold">সরাসরি কোনো নির্দিষ্ট রোগের সাথে পুরোপুরি মেলেনি।</p>
                  <p className="mt-1">
                    ভুল চিকিৎসার ঝুঁকি এড়াতে আক্রান্ত পাতার নমুনা নিয়ে নিকটস্থ উপজেলা কৃষি অফিস বা উপসহকারী কৃষি কর্মকর্তার কাছে যান। অথবা সরাসরি কল করুন:
                  </p>
                  <div className="mt-2">
                    <a
                      href="tel:16123"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-800 px-3 py-1.5 text-[12px] font-bold text-white shadow-xs"
                    >
                      <PhoneCall size={13} /> কৃষি কল সেন্টার ১৬১২৩-এ কল করুন
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Catalog View */
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="ফসলের সমস্যা">
            {CROP_DISEASES.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={x.id === catalogId}
                onClick={() => setCatalogId(x.id)}
                className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${
                  x.id === catalogId ? "border-green-700 bg-green-50 text-green-900" : "border-stone-200 text-stone-600"
                }`}
              >
                {x.cropNameBn}: {x.diseaseNameBn}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="space-y-2 text-[13px]">
            <p><strong>লক্ষণ:</strong> {d.symptomsBn}</p>
            <p><strong>যখন বাড়ে:</strong> {d.favouredByBn}</p>
            <p><strong>প্রতিরোধ:</strong> {d.preventiveActionBn}</p>
            <p><strong>রাসায়নিক ছাড়া:</strong> {d.nonChemicalBn}</p>
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-950">
              <AlertTriangle size={14} className="mr-1 inline" aria-hidden />
              {d.chemicalNoteBn}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
