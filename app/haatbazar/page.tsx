"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sprout, Phone, CloudRain, Wind, Thermometer, Truck, NotebookPen, Trash2, AlertTriangle, CheckCircle2, CalendarDays, Bug, Camera, ExternalLink } from "lucide-react";
import { AppHeader, SourceTag } from "@/components/AppHeader";
import { AgriculturalLifecycle } from "@/components/AgriculturalLifecycle";
import { HaatMarket } from "@/components/HaatMarket";
import {
  tripMargin, shareTruck, priceAgeDays, seasonForMonth, SEASONS, RICE_SEASONS, DISTRICTS, CROP_DISEASES, CROPS, KG_PER_MAUND,
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

      <main id="main" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px]">দূরের মোকামে নেবেন, নাকি হাটেই বেচবেন? আগে হিসাব করে নিন।</h1>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-stone-600">
            আজ যে দাম শুনেছেন তা লিখে রাখুন, পরিবহন-কমিশন-ঘাটতি বাদ দিয়ে আসল লাভ দেখুন, স্প্রে করার আগে আবহাওয়া দেখুন। আমরা নিজে থেকে কোনো বাজারদর বানাই না; দাম আপনার দেওয়া বা উৎসসহ দেখানো।
          </p>
          {season && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl bg-lime-50 px-3 py-2 text-[13px] text-lime-950">
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

        <p className="text-[11px] text-stone-500">
          এটি সাধারণ তথ্য ও হিসাবের যন্ত্র। ফলন বা লাভের নিশ্চয়তা নয়। <Link href="/settings" className="font-semibold text-green-800 underline">সংরক্ষিত ডেটা</Link>
        </p>
      </main>
    </div>
  );
}

function TripCalculator({ notes }: { notes: StoredNote[] }) {
  const [v, setV] = useState({ quantityKg: 1000, localPricePerKg: 38, distantPricePerKg: 46, transportPerMaund: 65, commissionPct: 5, labourPerMaund: 10, lossPct: 2, otherCosts: 300 });
  const [touched, setTouched] = useState(false);
  const r = useMemo(() => tripMargin(v), [v]);
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
  const [id, setId] = useState(CROP_DISEASES[0].id);
  const d = CROP_DISEASES.find((x) => x.id === id) ?? CROP_DISEASES[0];
  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="ফসলের সমস্যা">
        {CROP_DISEASES.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === id} onClick={() => setId(x.id)} className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${x.id === id ? "border-green-700 bg-green-50 text-green-900" : "border-stone-200 text-stone-600"}`}>
            {x.cropNameBn}: {x.diseaseNameBn}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="space-y-2 text-[13px]">
        <p><strong>লক্ষণ:</strong> {d.symptomsBn}</p>
        <p><strong>যখন বাড়ে:</strong> {d.favouredByBn}</p>
        <p><strong>প্রতিরোধ:</strong> {d.preventiveActionBn}</p>
        <p><strong>রাসায়নিক ছাড়া:</strong> {d.nonChemicalBn}</p>
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-950"><AlertTriangle size={14} className="mr-1 inline" aria-hidden />{d.chemicalNoteBn}</p>
      </div>
    </div>
  );
}
