"use client";
import { useMemo, useRef, useState } from "react";
import { Check, Copy, Mic, Phone, Plus, Trash2, Volume2 } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import {
  ANIMAL_KINDS, FARM_CROPS, cropBn, cropBudget, doctorVerdict, fromDecimals, fromPoisha, herdSummary, holdingClass,
  parseTaskUtterance, rotationCheck, smsInfo, supportPath, taskBuckets, taskWeatherWarnings, toDecimals, toPoisha,
  totalDecimals, bnNum, composeFarmSms,
  type AnimalKind, type FarmLog, type FarmLogKind, type FarmTask, type Herd, type LandUnit, type ParsedTask, type Plot, type TaskKind,
} from "@/lib/krishi";
import { HELPLINES, SUPPORT, HOLDING_SOURCE, ROTATION_SOURCE } from "@/lib/krishiData";
import { CROP_DISEASES, diagnoseCropSymptom, RICE_SEASONS, SEASONS } from "@/lib/haatbazar";

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
/** "2026-11-18" → "১৮ নভেম্বর" (local display only; stored dates stay ISO). */
export const dateBn = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("bn-BD", { day: "numeric", month: "long" });
};
const taka = (p: number) => `৳${bnNum(fromPoisha(p).toLocaleString("en-IN", { maximumFractionDigits: 2 }))}`;
const fieldCls = "w-full min-h-[48px] rounded-xl border border-line bg-white px-3 text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-emerald-600";
const labelCls = "block text-[14px] font-semibold text-slate-700";

export const TASK_KINDS: Array<{ id: TaskKind; bn: string; emoji: string }> = [
  { id: "irrigate", bn: "সেচ", emoji: "💧" }, { id: "fertilise", bn: "সার", emoji: "🌱" }, { id: "spray", bn: "স্প্রে", emoji: "🧴" },
  { id: "weed", bn: "নিড়ানি", emoji: "🌿" }, { id: "sow", bn: "বপন/রোপণ", emoji: "🌾" }, { id: "harvest", bn: "ফসল তোলা", emoji: "🧺" },
  { id: "market", bn: "হাটে বিক্রি", emoji: "🛒" }, { id: "animal", bn: "পশুপাখি", emoji: "🐄" }, { id: "fish", bn: "মাছ", emoji: "🐟" }, { id: "other", bn: "অন্য কাজ", emoji: "📝" },
];
const kindBn = (k: TaskKind) => TASK_KINDS.find((x) => x.id === k)!;

export type Weather = { sprayOk: boolean; sprayBn: string; rainLikely: boolean; maxRain: number; temp: number | null; source: { label: string; url: string } } | null;

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="ms-enter space-y-4">
      <header>
        <h2 className="text-[26px] font-semibold leading-tight text-slate-900">{title}</h2>
        {sub ? <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-slate-600">{sub}</p> : null}
      </header>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ আমার জমি
export function LandSection({ plots, setPlots }: { plots: Plot[]; setPlots: (f: (p: Plot[]) => Plot[]) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<LandUnit>("decimal");
  const [bigha, setBigha] = useState("33");
  const [level, setLevel] = useState<Plot["level"]>("medium");
  const [water, setWater] = useState<Plot["water"]>("shallow-tubewell");
  const [error, setError] = useState<string | null>(null);
  const total = totalDecimals(plots);

  const add = () => {
    try {
      const decimals = toDecimals(Number(amount), unit, Number(bigha));
      if (!name.trim()) throw new Error("জমির একটি নাম দিন, যেমন “বাড়ির পাশের জমি”।");
      setPlots((p) => [...p, { id: uid(), name: name.trim().slice(0, 60), decimals, level, water, history: [] }]);
      setName(""); setAmount(""); setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <Section title="আমার জমি" sub="প্রতিটি জমির নাম, মাপ, উঁচু-নিচু আর পানির উৎস লিখে রাখুন। মাপ যেকোনো এককে দিন — বিঘা আপনার এলাকায় কত শতাংশ, সেটাও আপনিই বলবেন।">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="ms-card p-4"><p className="text-[13px] text-slate-500">মোট জমি</p><p className="font-mono text-[26px] font-bold text-ink">{bnNum(total)} <span className="text-[15px]">শতাংশ</span></p><p className="text-[13px] text-slate-500">= {bnNum(fromDecimals(total, "acre"))} একর</p></div>
        <div className="ms-card p-4"><p className="text-[13px] text-slate-500">জমির টুকরা</p><p className="font-mono text-[26px] font-bold text-ink">{bnNum(plots.length)}</p></div>
        <div className="ms-card p-4"><p className="text-[13px] text-slate-500">খামারের শ্রেণি</p><p className="text-[20px] font-bold text-ink">{{ landless: "ভূমিহীন", marginal: "প্রান্তিক", small: "ক্ষুদ্র", medium: "মাঝারি", large: "বড়" }[holdingClass(total)]}</p><SourceTag confidence="reported" label={HOLDING_SOURCE.label} url={HOLDING_SOURCE.url} checked={HOLDING_SOURCE.checked} /></div>
      </div>

      <div className="ms-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelCls}>জমির নাম<input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="যেমন: পুকুরপাড়ের জমি" /></label>
        <label className={labelCls}>মাপ<input className={fieldCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="যেমন: ৩৩" /></label>
        <label className={labelCls}>একক
          <select className={fieldCls} value={unit} onChange={(e) => setUnit(e.target.value as LandUnit)}>
            <option value="decimal">শতাংশ (ডেসিমাল)</option><option value="bigha">বিঘা</option><option value="acre">একর</option><option value="hectare">হেক্টর</option>
          </select>
        </label>
        {unit === "bigha" && <label className={labelCls}>আপনার এলাকায় ১ বিঘা = কত শতাংশ?<input className={fieldCls} inputMode="decimal" value={bigha} onChange={(e) => setBigha(e.target.value)} /></label>}
        <label className={labelCls}>জমির ধরন
          <select className={fieldCls} value={level} onChange={(e) => setLevel(e.target.value as Plot["level"])}>
            <option value="high">উঁচু জমি</option><option value="medium">মাঝারি উঁচু</option><option value="low">নিচু জমি (পানি জমে)</option>
          </select>
        </label>
        <label className={labelCls}>সেচের পানি
          <select className={fieldCls} value={water} onChange={(e) => setWater(e.target.value as Plot["water"])}>
            <option value="rain">শুধু বৃষ্টি</option><option value="shallow-tubewell">অগভীর নলকূপ</option><option value="deep-tubewell">গভীর নলকূপ</option><option value="canal-river">খাল/নদী</option><option value="pond">পুকুর</option><option value="other">অন্যান্য</option>
          </select>
        </label>
        <div className="flex items-end"><button type="button" onClick={add} className="kp-btn-primary ms-big-btn w-full justify-center"><Plus size={18} /> জমি যোগ করুন</button></div>
        {error && <p role="alert" className="sm:col-span-3 rounded-xl bg-rose-50 px-3 py-2 text-[14px] text-rose-800">{error}</p>}
      </div>

      {plots.length === 0 ? (
        <p className="ms-card p-5 text-[15px] text-slate-600">এখনো কোনো জমি নেই। ওপরে প্রথম জমিটি যোগ করুন — তথ্য শুধু এই ফোনেই থাকে।</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {plots.map((p) => (
            <li key={p.id} className="ms-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[18px] font-bold text-ink">{p.name}</p>
                  <p className="text-[14px] text-slate-600">{bnNum(p.decimals)} শতাংশ · {{ high: "উঁচু", medium: "মাঝারি উঁচু", low: "নিচু" }[p.level]} · {{ rain: "বৃষ্টিনির্ভর", "shallow-tubewell": "অগভীর নলকূপ", "deep-tubewell": "গভীর নলকূপ", "canal-river": "খাল/নদী", pond: "পুকুর", other: "অন্যান্য" }[p.water]}</p>
                </div>
                <button type="button" aria-label={`${p.name} মুছুন`} onClick={() => setPlots((all) => all.filter((x) => x.id !== p.id))} className="kp-icon-btn"><Trash2 size={16} /></button>
              </div>
              <SoilTestEditor plot={p} onSave={(soilTest) => setPlots((all) => all.map((x) => (x.id === p.id ? { ...x, soilTest } : x)))} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function SoilTestEditor({ plot, onSave }: { plot: Plot; onSave: (s: Plot["soilTest"]) => void }) {
  const [ph, setPh] = useState(plot.soilTest?.ph?.toString() ?? "");
  const [om, setOm] = useState(plot.soilTest?.organicMatterPct?.toString() ?? "");
  const [date, setDate] = useState(plot.soilTest?.tested ?? "");
  return (
    <details className="mt-3 rounded-xl bg-paper px-3 py-2">
      <summary className="cursor-pointer text-[14px] font-semibold text-emerald-800">মাটি পরীক্ষার ফল {plot.soilTest?.ph !== undefined ? `· pH ${bnNum(plot.soilTest.ph)}` : "লিখুন"}</summary>
      <p className="mt-2 text-[13px] text-slate-600">SRDI বা উপজেলা কৃষি অফিসের মাটি পরীক্ষার কার্ড থেকে নিজে লিখুন। অ্যাপ নিজে কোনো মান বসায় না।</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <label className="text-[13px]">pH<input className={fieldCls} inputMode="decimal" value={ph} onChange={(e) => setPh(e.target.value)} /></label>
        <label className="text-[13px]">জৈব পদার্থ %<input className={fieldCls} inputMode="decimal" value={om} onChange={(e) => setOm(e.target.value)} /></label>
        <label className="text-[13px]">তারিখ<input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
      <button type="button" className="kp-btn-ghost mt-2" onClick={() => {
        const n = (v: string, hi: number) => { const x = Number(v); return v.trim() && Number.isFinite(x) && x >= 0 && x <= hi ? x : undefined; };
        onSave({ ph: n(ph, 14), organicMatterPct: n(om, 100), tested: date || undefined });
      }}><Check size={15} /> সংরক্ষণ</button>
    </details>
  );
}

// ------------------------------------------------------------------ পরিকল্পনা (budget + season)
export type BudgetRec = { plotId: string; cropId: string; costs: Array<{ label: string; taka: number }>; expectedKg: number; priceTaka: number; priceSource: string };

export function PlanSection({ plots, budgets, setBudgets, month }: { plots: Plot[]; budgets: BudgetRec[]; setBudgets: (f: (b: BudgetRec[]) => BudgetRec[]) => void; month: number }) {
  const season = SEASONS.find((s) => s.months.includes(month)) ?? SEASONS[0];
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const current = budgets.find((b) => b.plotId === plotId) ?? { plotId, cropId: "rice", costs: [{ label: "বীজ/চারা", taka: 0 }, { label: "সার", taka: 0 }, { label: "সেচ", taka: 0 }, { label: "শ্রমিক", taka: 0 }], expectedKg: 0, priceTaka: 0, priceSource: "" };
  const plot = plots.find((p) => p.id === plotId);
  const update = (patch: Partial<BudgetRec>) => setBudgets((all) => [...all.filter((b) => b.plotId !== plotId), { ...current, ...patch, plotId }]);

  let result: ReturnType<typeof cropBudget> | null = null;
  let err: string | null = null;
  try {
    result = cropBudget({ costs: current.costs.map((c) => ({ label: c.label, poisha: toPoisha(c.taka || 0) })), expectedKg: current.expectedKg || 0, pricePerKgPoisha: toPoisha(current.priceTaka || 0), decimals: plot?.decimals ?? 0 });
  } catch (e) { err = (e as Error).message; }

  return (
    <Section title="পরিকল্পনা" sub="এই মৌসুমে কোন জমিতে কী করবেন, আর তাতে খরচ-লাভ কত — নিজের দাম আর নিজের আশা করা ফলন দিয়ে। অ্যাপ কোনো দাম বা ফলন অনুমান করে না।">
      <div className="ms-card p-4">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-emerald-800">এখনকার মৌসুম</p>
        <p className="text-[22px] font-bold text-ink">{season.nameBn}</p>
        <p className="text-[14px] text-slate-600">{season.monthsBn} · সাধারণ ফসল: {season.cropsBn}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
          {RICE_SEASONS.map((r) => <span key={r.nameBn} className="kp-chip">{r.nameBn}: রোপণ {r.plantBn}, কাটা {r.harvestBn}</span>)}
        </div>
        <p className="mt-2 text-[12px] text-slate-500">মৌসুমের সীমা এলাকা ও জাতভেদে বদলায়। <SourceTag confidence="reported" label="Banglapedia: Crop" url="https://en.banglapedia.org/index.php/Crop" checked="2026-11-05" /></p>
      </div>

      {plots.length === 0 ? <p className="ms-card p-5 text-[15px] text-slate-600">আগে “আমার জমি”-তে একটি জমি যোগ করুন।</p> : (
        <div className="ms-card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelCls}>জমি<select className={fieldCls} value={plotId} onChange={(e) => setPlotId(e.target.value)}>{plots.map((p) => <option key={p.id} value={p.id}>{p.name} ({bnNum(p.decimals)} শতাংশ)</option>)}</select></label>
            <label className={labelCls}>ফসল<select className={fieldCls} value={current.cropId} onChange={(e) => update({ cropId: e.target.value })}>{FARM_CROPS.map((c) => <option key={c.id} value={c.id}>{c.bn}</option>)}</select></label>
          </div>
          <p className="text-[14px] font-semibold text-slate-700">খরচ (টাকা)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {current.costs.map((c, k) => (
              <div key={k} className="flex gap-2">
                <input aria-label="খরচের নাম" className={fieldCls} value={c.label} onChange={(e) => update({ costs: current.costs.map((x, j) => (j === k ? { ...x, label: e.target.value.slice(0, 40) } : x)) })} />
                <input aria-label={`${c.label} টাকা`} className={`${fieldCls} max-w-[9rem] font-mono`} inputMode="decimal" value={c.taka || ""} placeholder="০" onChange={(e) => update({ costs: current.costs.map((x, j) => (j === k ? { ...x, taka: Number(e.target.value) || 0 } : x)) })} />
              </div>
            ))}
          </div>
          <button type="button" className="kp-btn-ghost" onClick={() => update({ costs: [...current.costs, { label: "অন্যান্য", taka: 0 }] })}><Plus size={15} /> খরচ যোগ</button>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={labelCls}>আশা করা ফলন (কেজি)<input className={`${fieldCls} font-mono`} inputMode="decimal" value={current.expectedKg || ""} onChange={(e) => update({ expectedKg: Number(e.target.value) || 0 })} /></label>
            <label className={labelCls}>প্রতি কেজি দাম (টাকা)<input className={`${fieldCls} font-mono`} inputMode="decimal" value={current.priceTaka || ""} onChange={(e) => update({ priceTaka: Number(e.target.value) || 0 })} /></label>
            <label className={labelCls}>দামটা কোথা থেকে জানলেন?<input className={fieldCls} value={current.priceSource} placeholder="যেমন: স্থানীয় আড়তদার, ১৫ নভেম্বর" onChange={(e) => update({ priceSource: e.target.value.slice(0, 80) })} /></label>
          </div>
          {err ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[14px] text-rose-800">{err}</p> : result && (
            <div className="grid gap-2 sm:grid-cols-4">
              {[["মোট খরচ", taka(result.totalCostPoisha)], ["আয়", taka(result.revenuePoisha)], [result.profitPoisha >= 0 ? "লাভ" : "লোকসান", taka(Math.abs(result.profitPoisha))], ["কেজিপ্রতি সমান-সমান দাম", result.breakEvenPerKgPoisha === null ? "—" : taka(result.breakEvenPerKgPoisha)]].map(([k, v], i) => (
                <div key={k} className={`rounded-2xl p-3 ${i === 2 ? (result!.profitPoisha >= 0 ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900") : "bg-paper"}`}>
                  <p className="text-[12.5px]">{k}</p><p className="font-mono text-[20px] font-bold">{v}</p>
                </div>
              ))}
              <p className="sm:col-span-4 text-[12.5px] text-slate-500">হিসাব পয়সায় নির্দিষ্ট নিয়মে করা; আয় − খরচ = লাভ মিলেছে {result.reconciles ? "✓" : "✗"}। {current.priceSource ? `দামের উৎস: ${current.priceSource}` : <SourceTag confidence="example" label="দামের উৎস লিখুন" />}</p>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ জমির ভবিষ্যৎ (rotation)
export function FutureSection({ plots, setPlots }: { plots: Plot[]; setPlots: (f: (p: Plot[]) => Plot[]) => void }) {
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [season, setSeason] = useState("");
  const [crop, setCrop] = useState("rice");
  const plot = plots.find((p) => p.id === plotId);
  const check = plot ? rotationCheck(plot.history) : null;
  return (
    <Section title="জমির ভবিষ্যৎ" sub="একই জমিতে বছরের পর বছর একই ফসল করলে একই রোগ-পোকা থেকে যায়। আগের মৌসুমগুলোর ফসল লিখুন — অ্যাপ ফসলের গোত্র মিলিয়ে বলবে পালাক্রম কতটা বৈচিত্র্যময়।">
      {!plot ? <p className="ms-card p-5 text-[15px] text-slate-600">আগে “আমার জমি”-তে একটি জমি যোগ করুন।</p> : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="ms-card space-y-3 p-4">
            <label className={labelCls}>জমি<select className={fieldCls} value={plotId} onChange={(e) => setPlotId(e.target.value)}>{plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className={fieldCls} value={season} onChange={(e) => setSeason(e.target.value)} placeholder="মৌসুম, যেমন: আমন ২০২৫" aria-label="মৌসুম" />
              <select className={fieldCls} value={crop} onChange={(e) => setCrop(e.target.value)} aria-label="ফসল">{FARM_CROPS.map((c) => <option key={c.id} value={c.id}>{c.bn}</option>)}</select>
              <button type="button" className="kp-btn-primary ms-big-btn justify-center" onClick={() => { if (!season.trim()) return; setPlots((all) => all.map((p) => (p.id === plotId ? { ...p, history: [...p.history, { season: season.trim().slice(0, 40), cropId: crop }].slice(-30) } : p))); setSeason(""); }}><Plus size={16} /> যোগ</button>
            </div>
            <ol className="flex flex-wrap items-center gap-2">
              {plot.history.map((h, k) => (
                <li key={k} className="flex items-center gap-1">
                  <span className="kp-chip">{h.season}: <strong>{cropBn(h.cropId)}</strong></span>
                  {k < plot.history.length - 1 && <span aria-hidden className="text-slate-400">→</span>}
                </li>
              ))}
            </ol>
          </div>
          {check && (
            <div className="ms-card ms-tilt p-4">
              <p className="text-[13px] font-semibold text-slate-500">পালাক্রমের বৈচিত্র্য</p>
              <div className="mt-1 flex items-end gap-3">
                <p className="font-mono text-[44px] font-bold leading-none text-emerald-800">{bnNum(check.diversityScore)}</p><p className="pb-1 text-[14px] text-slate-500">/ ১০০</p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-[width] duration-700" style={{ width: `${check.diversityScore}%` }} /></div>
              <p className="mt-2 text-[14px] text-slate-600">{bnNum(check.seasons)} মৌসুম · {bnNum(check.distinctFamilies)} গোত্রের ফসল · ডাল ফসল শেষ ৩ মৌসুমে {check.legumeInLast3 ? "আছে" : "নেই"}</p>
              <ul className="mt-2 space-y-1.5 text-[14.5px] text-slate-800">{check.notesBn.map((n) => <li key={n}>• {n}</li>)}</ul>
              <p className="mt-2 text-[12px] text-slate-500">এটি ফলনের পূর্বাভাস নয়, শস্য-পালাক্রমের সাধারণ নীতি। কোন জাত ও সময় — উপজেলা কৃষি অফিসে জেনে নিন। <SourceTag confidence="reported" label={ROTATION_SOURCE.label} url={ROTATION_SOURCE.url} checked={ROTATION_SOURCE.checked} /></p>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------------ আজকের কাজ
export function TodaySection({ tasks, setTasks, today, weather, plots }: { tasks: FarmTask[]; setTasks: (f: (t: FarmTask[]) => FarmTask[]) => void; today: string; weather: Weather; plots: Plot[] }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<TaskKind>("irrigate");
  const [date, setDate] = useState(today);
  const b = taskBuckets(tasks, today);
  const warnings = taskWeatherWarnings(b.today, weather ? { sprayOk: weather.sprayOk, rainLikely: weather.rainLikely } : null);
  const row = (t: FarmTask) => {
    const w = warnings.filter((x) => x.taskId === t.id);
    return (
      <li key={t.id} className="flex items-start gap-3 rounded-2xl bg-white/90 p-3 ring-1 ring-line">
        <button type="button" aria-label={`${t.title} সম্পন্ন`} onClick={() => setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, done: true } : x)))} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"><Check size={16} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-ink"><span aria-hidden>{kindBn(t.kind).emoji}</span> {t.title}</p>
          <p className="text-[13px] text-slate-500">{kindBn(t.kind).bn} · {dateBn(t.date)}{t.plotId ? ` · ${plots.find((p) => p.id === t.plotId)?.name ?? ""}` : ""}</p>
          {w.map((x) => <p key={x.bn} className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[13px] text-amber-900">⚠ {x.bn}</p>)}
        </div>
        <button type="button" aria-label={`${t.title} মুছুন`} onClick={() => setTasks((all) => all.filter((x) => x.id !== t.id))} className="kp-icon-btn"><Trash2 size={15} /></button>
      </li>
    );
  };
  return (
    <Section title="আজকের কাজ" sub="নিজের কাজের তালিকা। আবহাওয়ার পূর্বাভাস দেখে স্প্রে বা সেচের দিনে সতর্ক করে।">
      <div className="ms-card grid gap-2 p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
        <input className={fieldCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="কী করবেন? যেমন: আলুর জমিতে সেচ" aria-label="কাজ" />
        <select className={fieldCls} value={kind} onChange={(e) => setKind(e.target.value as TaskKind)} aria-label="কাজের ধরন">{TASK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.emoji} {k.bn}</option>)}</select>
        <input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} aria-label="তারিখ" />
        <button type="button" className="kp-btn-primary ms-big-btn justify-center" onClick={() => { if (!title.trim()) return; setTasks((all) => [...all, { id: uid(), title: title.trim().slice(0, 120), kind, date, done: false }]); setTitle(""); }}><Plus size={16} /> যোগ</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {b.overdue.length > 0 && <><h3 className="text-[15px] font-bold text-rose-800">বাকি পড়ে আছে ({bnNum(b.overdue.length)})</h3><ul className="space-y-2">{b.overdue.map(row)}</ul></>}
          <h3 className="text-[15px] font-bold text-emerald-800">আজ ({bnNum(b.today.length)})</h3>
          {b.today.length ? <ul className="space-y-2">{b.today.map(row)}</ul> : <p className="text-[14px] text-slate-500">আজকের জন্য কোনো কাজ লেখা নেই।</p>}
        </div>
        <div className="space-y-2">
          <h3 className="text-[15px] font-bold text-slate-700">এই সপ্তাহে ({bnNum(b.upcoming.length)})</h3>
          {b.upcoming.length ? <ul className="space-y-2">{b.upcoming.map(row)}</ul> : <p className="text-[14px] text-slate-500">সামনের ৭ দিনে কিছু নেই।</p>}
          {b.later.length > 0 && <p className="text-[13px] text-slate-500">পরে আরও {bnNum(b.later.length)}টি কাজ · সম্পন্ন {bnNum(b.done)}টি</p>}
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ কথা বলে জানুন
type SR = { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };

export function VoiceSection({ today, onAddTask, summaryBn }: { today: string; onAddTask: (t: ParsedTask) => void; summaryBn: string }) {
  const [heard, setHeard] = useState("");
  const [listening, setListening] = useState(false);
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const supported = typeof window !== "undefined" && Boolean((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  const understand = (text: string) => {
    setHeard(text);
    const p = parseTaskUtterance(text, today);
    setParsed(p);
    setNote(p ? null : "এটা কোনো কাজ হিসেবে বুঝতে পারিনি। যেমন বলুন: “কাল সকালে সেচ দিতে হবে”।");
  };
  const listen = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "bn-BD"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => understand(e.results[0][0].transcript);
    rec.onerror = () => setNote("শুনতে পাইনি। মাইক্রোফোনের অনুমতি দিন বা লিখে দিন।");
    rec.onend = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  };
  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setNote("এই ব্রাউজারে পড়ে শোনানো যায় না।"); return; }
    const u = new SpeechSynthesisUtterance(summaryBn);
    u.lang = "bn-BD"; u.rate = 0.95;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };
  return (
    <Section title="কথা বলে জানুন" sub="বাংলায় মুখে বলুন, কাজটা তালিকায় উঠবে — তবে আপনি নিশ্চিত করার পরেই। আজকের সারাংশ পড়ে শোনানোর ব্যবস্থাও আছে। গলার আওয়াজ ফোনের ব্রাউজারে প্রক্রিয়া হয়।">
      <div className="ms-card space-y-4 p-5 text-center">
        <button type="button" disabled={!supported || listening} onClick={listen} data-on={listening} className="ms-mic mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-xl disabled:opacity-50" aria-label="বলতে চাপুন">
          <Mic size={42} />
        </button>
        <p className="text-[15px] text-slate-600">{listening ? "শুনছি…" : supported ? "চাপ দিয়ে বলুন" : "এই ব্রাউজারে ভয়েস নেই — নিচে লিখে দিন"}</p>
        <form className="mx-auto flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); understand(heard); }}>
          <input className={fieldCls} value={heard} onChange={(e) => setHeard(e.target.value)} placeholder="যেমন: পরশু সরিষার জমিতে নিড়ানি" aria-label="যা বললেন" />
          <button className="kp-btn-ghost shrink-0">বুঝুন</button>
        </form>
        {note && <p role="status" className="text-[14px] text-amber-800">{note}</p>}
        {parsed && (
          <div className="mx-auto max-w-xl rounded-2xl bg-emerald-50 p-4 text-left ring-1 ring-emerald-200">
            <p className="text-[13px] font-semibold text-emerald-800">যা বুঝলাম — ঠিক আছে কি?</p>
            <p className="mt-1 text-[17px] font-bold text-ink">{kindBn(parsed.kind).emoji} {kindBn(parsed.kind).bn} · {dateBn(parsed.date)}{parsed.dayWord ? ` (${parsed.dayWord})` : " (আজ ধরে নিলাম)"}</p>
            <p className="text-[14px] text-slate-600">“{parsed.title}”</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="kp-btn-primary" onClick={() => { onAddTask(parsed); setParsed(null); setHeard(""); setNote("কাজটি “আজকের কাজ”-এ যোগ হয়েছে।"); }}><Check size={16} /> হ্যাঁ, যোগ করুন</button>
              <button type="button" className="kp-btn-ghost" onClick={() => setParsed(null)}>না</button>
            </div>
          </div>
        )}
        <button type="button" onClick={speak} className="kp-btn-ghost mx-auto"><Volume2 size={16} /> আজকের সারাংশ শুনুন</button>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ এসএমএসে
export function SmsSection({ tasks, today, weather }: { tasks: FarmTask[]; today: string; weather: Weather }) {
  const b = taskBuckets(tasks, today);
  const d = new Date(today + "T00:00:00");
  const dateBn = d.toLocaleDateString("bn-BD", { day: "numeric", month: "long" });
  const [text, setText] = useState(() => composeFarmSms({ dateBn, sprayBn: weather ? (weather.sprayOk ? "এখন চলবে" : "এখন নয়") : null, tasks: [...b.overdue, ...b.today], helpline: "কৃষি কল সেন্টার ১৬১২৩" }));
  const info = smsInfo(text);
  const [copied, setCopied] = useState(false);
  return (
    <Section title="এসএমএসে" sub="স্মার্টফোন নেই এমন পরিবারের কারও বাটন ফোনে আজকের কাজ পাঠান। বাংলা এসএমএসে ৭০ অক্ষরে একটি মেসেজ হয়; বেশি হলে কয়েক ভাগে যায়, প্রতিটির আলাদা খরচ।">
      <div className="ms-card space-y-3 p-4">
        <textarea className={`${fieldCls} min-h-[140px] py-3 leading-relaxed`} value={text} onChange={(e) => setText(e.target.value.slice(0, 600))} aria-label="এসএমএস" />
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="kp-chip font-mono">{bnNum(info.units)} অক্ষর</span>
          <span className={`kp-chip font-mono ${info.segments > 2 ? "kp-chip-on" : ""}`}>{bnNum(info.segments)}টি এসএমএস</span>
          <span className="kp-chip">{info.encoding === "UCS-2" ? "বাংলা (UCS-2)" : "ইংরেজি (GSM-7)"} · প্রতি ভাগে {bnNum(info.perSegment)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="kp-btn-primary ms-big-btn" href={`sms:?&body=${encodeURIComponent(text)}`}><Phone size={16} /> এসএমএস অ্যাপে খুলুন</a>
          <button type="button" className="kp-btn-ghost ms-big-btn" onClick={() => { navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false)); }}><Copy size={16} /> {copied ? "কপি হয়েছে" : "কপি"}</button>
        </div>
        <p className="text-[12px] text-slate-500">অক্ষর গোনা 3GPP TS 23.038 অনুযায়ী (বাংলা = UCS-2)। মেসেজ পাঠায় আপনার ফোন; KormoPath কিছু পাঠায় না।</p>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ ফসলের ডাক্তার
export function DoctorSection() {
  const crops = useMemo(() => [...new Set(CROP_DISEASES.map((d) => d.cropNameBn))], []);
  const [crop, setCrop] = useState(crops[0] ?? "ধান");
  const [picked, setPicked] = useState<string[]>([]);
  const tags = useMemo(() => [...new Set(CROP_DISEASES.filter((d) => d.cropNameBn === crop).flatMap((d) => d.symptomTags))].slice(0, 18), [crop]);
  const r = diagnoseCropSymptom(crop, picked);
  const top = r.topMatch;
  const v = doctorVerdict(top?.matchScore ?? 0, top?.matchedSymptoms.length ?? 0, picked.length);
  const tone = v.verdict === "likely" ? "bg-emerald-50 ring-emerald-200" : v.verdict === "possible" ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-200";
  return (
    <Section title="ফসলের ডাক্তার" sub="ফসল আর যা দেখছেন সেই লক্ষণগুলো বেছে নিন। মিল কম হলে আমরা সোজাসুজি বলি “নিশ্চিত নই”। ওষুধের নাম বা মাত্রা কখনো বলি না — সেটা লেবেল আর ১৬১২৩।">
      <div className="ms-card space-y-3 p-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ফসল">
          {crops.map((c) => <button type="button" key={c} role="radio" aria-checked={c === crop} onClick={() => { setCrop(c); setPicked([]); }} className="ms-tab" aria-selected={c === crop}>{c}</button>)}
        </div>
        <p className="text-[14px] font-semibold text-slate-700">কী দেখছেন? (যতগুলো মেলে)</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => <button type="button" key={t} aria-pressed={picked.includes(t)} onClick={() => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} className={`rounded-full border px-3 py-2 text-[14px] ${picked.includes(t) ? "border-emerald-700 bg-emerald-700 text-white" : "border-line bg-white text-slate-700"}`}>{t}</button>)}
        </div>
      </div>
      <div className={`ms-card p-4 ring-1 ${tone}`} aria-live="polite">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{{ likely: "সম্ভাব্য রোগ", possible: "হতে পারে", unsure: "নিশ্চিত নই" }[v.verdict]}</p>
        {top && v.verdict !== "unsure" ? <p className="text-[22px] font-bold text-ink">{top.disease.diseaseNameBn}</p> : null}
        <p className="mt-1 text-[15px] text-slate-700">{v.bn}</p>
        {top && v.verdict !== "unsure" && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 text-[14px] text-slate-700">
            <p><strong>লক্ষণ:</strong> {top.disease.symptomsBn}</p>
            <p><strong>কখন বাড়ে:</strong> {top.disease.favouredByBn}</p>
            <p><strong>প্রতিরোধ:</strong> {top.disease.preventiveActionBn}</p>
            <p><strong>ওষুধ ছাড়া:</strong> {top.disease.nonChemicalBn}</p>
          </div>
        )}
        <p className="mt-3 rounded-xl bg-white/80 p-3 text-[13.5px] text-slate-700">🧪 {r.safetyDisclaimer}</p>
        <a href="tel:16123" className="kp-btn-primary ms-big-btn mt-3"><Phone size={16} /> ১৬১২৩-এ ফোন করুন</a>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ প্রাণিসম্পদ, হাঁস-মুরগি ও মাছ
const LOG_KINDS: Array<{ id: FarmLogKind; bn: string; unit: string }> = [
  { id: "milk-l", bn: "দুধ", unit: "লিটার" }, { id: "eggs", bn: "ডিম", unit: "টি" }, { id: "fish-kg", bn: "মাছ ধরা", unit: "কেজি" },
  { id: "feed-kg", bn: "খাবার দেওয়া", unit: "কেজি" }, { id: "expense", bn: "খরচ", unit: "টাকা" }, { id: "sale", bn: "বিক্রি", unit: "টাকা" },
  { id: "vaccination", bn: "টিকা দেওয়া", unit: "" }, { id: "illness", bn: "অসুখ", unit: "" },
];

export function AnimalSection({ herds, setHerds, logs, setLogs, today }: { herds: Herd[]; setHerds: (f: (h: Herd[]) => Herd[]) => void; logs: FarmLog[]; setLogs: (f: (l: FarmLog[]) => FarmLog[]) => void; today: string }) {
  const [kind, setKind] = useState<AnimalKind>("cow");
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [herdId, setHerdId] = useState("");
  const [logKind, setLogKind] = useState<FarmLogKind>("milk-l");
  const [amount, setAmount] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [note, setNote] = useState("");
  const monthStart = today.slice(0, 8) + "01";
  const s = herdSummary(logs, monthStart, today, today);
  const active = herdId || herds[0]?.id || "";
  const lk = LOG_KINDS.find((k) => k.id === logKind)!;
  return (
    <Section title="গবাদিপশু, হাঁস-মুরগি ও মাছ" sub="কোন পশু কয়টি, দুধ-ডিম-মাছ কত হলো, খরচ-বিক্রি কত — নিজের খাতা। টিকার পরের তারিখ প্রাণিসম্পদ অফিস যা বলবে সেটাই লিখুন; অ্যাপ নিজে টিকার সূচি বানায় না।">
      <div className="grid gap-3 sm:grid-cols-4">
        {[["এ মাসে দুধ", `${bnNum(s.milkL)} লি.`], ["এ মাসে ডিম", `${bnNum(s.eggs)}টি`], ["এ মাসে মাছ", `${bnNum(s.fishKg)} কেজি`], [s.netPoisha >= 0 ? "এ মাসে নিট আয়" : "এ মাসে নিট ঘাটতি", taka(Math.abs(s.netPoisha))]].map(([k, v]) => (
          <div key={k} className="ms-card p-4"><p className="text-[13px] text-slate-500">{k}</p><p className="font-mono text-[22px] font-bold text-ink">{v}</p></div>
        ))}
      </div>
      {s.vaccinationsDue.length > 0 && (
        <ul className="space-y-1">{s.vaccinationsDue.map((v) => <li key={v.herdId} className={`rounded-xl px-3 py-2 text-[14px] ${v.overdue ? "bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-900"}`}>💉 {herds.find((h) => h.id === v.herdId)?.name ?? "পশু"}: টিকার তারিখ {dateBn(v.date)} {v.overdue ? "— পেরিয়ে গেছে" : ""}</li>)}</ul>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ms-card space-y-2 p-4">
          <p className="text-[15px] font-bold text-ink">নতুন দল যোগ করুন</p>
          <div className="grid grid-cols-2 gap-2">
            <select className={fieldCls} value={kind} onChange={(e) => setKind(e.target.value as AnimalKind)} aria-label="ধরন">{ANIMAL_KINDS.map((k) => <option key={k.id} value={k.id}>{k.bn}</option>)}</select>
            <input className={`${fieldCls} font-mono`} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} aria-label={`সংখ্যা (${ANIMAL_KINDS.find((k) => k.id === kind)!.unitBn})`} />
          </div>
          <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম, যেমন: লালি গাই বা বাড়ির পুকুর" aria-label="নাম" />
          <button type="button" className="kp-btn-primary ms-big-btn w-full justify-center" onClick={() => { const n = Number(count); if (!name.trim() || !Number.isInteger(n) || n < 0) return; const id = uid(); setHerds((h) => [...h, { id, kind, name: name.trim().slice(0, 60), count: n }]); setHerdId(id); setName(""); }}><Plus size={16} /> যোগ</button>
          <ul className="space-y-1">{herds.map((h) => <li key={h.id} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-[15px]"><span>{ANIMAL_KINDS.find((k) => k.id === h.kind)!.bn} · {h.name} · {bnNum(h.count)} {ANIMAL_KINDS.find((k) => k.id === h.kind)!.unitBn}</span><button type="button" className="kp-icon-btn" aria-label={`${h.name} মুছুন`} onClick={() => { setHerds((all) => all.filter((x) => x.id !== h.id)); setLogs((all) => all.filter((l) => l.herdId !== h.id)); }}><Trash2 size={15} /></button></li>)}</ul>
        </div>
        <div className="ms-card space-y-2 p-4">
          <p className="text-[15px] font-bold text-ink">খাতায় লিখুন</p>
          {herds.length === 0 ? <p className="text-[14px] text-slate-500">আগে বাঁ দিকে একটি দল যোগ করুন।</p> : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <select className={fieldCls} value={active} onChange={(e) => setHerdId(e.target.value)} aria-label="দল">{herds.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
                <select className={fieldCls} value={logKind} onChange={(e) => setLogKind(e.target.value as FarmLogKind)} aria-label="কী">{LOG_KINDS.map((k) => <option key={k.id} value={k.id}>{k.bn}</option>)}</select>
              </div>
              {lk.unit && <input className={`${fieldCls} font-mono`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`পরিমাণ (${lk.unit})`} aria-label="পরিমাণ" />}
              {logKind === "vaccination" && <label className={labelCls}>পরের টিকার তারিখ (অফিস যা বলেছে)<input type="date" className={fieldCls} value={nextDue} onChange={(e) => setNextDue(e.target.value)} /></label>}
              <input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="নোট (ঐচ্ছিক)" aria-label="নোট" />
              <button type="button" className="kp-btn-primary ms-big-btn w-full justify-center" onClick={() => {
                const raw = Number(amount);
                const value = lk.unit ? raw : 0;
                if (lk.unit && (!Number.isFinite(raw) || raw <= 0)) return;
                const stored = logKind === "expense" || logKind === "sale" ? toPoisha(value) : value;
                setLogs((all) => [...all, { id: uid(), herdId: active, date: today, kind: logKind, amount: stored, note: note.trim().slice(0, 160) || undefined, nextDue: logKind === "vaccination" && nextDue ? nextDue : undefined }]);
                setAmount(""); setNote(""); setNextDue("");
              }}><Check size={16} /> লিখে রাখুন</button>
            </>
          )}
          <p className="text-[12.5px] text-slate-500">পশুর অসুখে ওষুধের মাত্রা প্রাণিসম্পদ অফিস বা কল সেন্টার ১৬৩৫৮ থেকে জেনে নিন। <SourceTag confidence="official" label="DLS কল সেন্টার" url="https://dls.gov.bd" checked="2026-11-17" /></p>
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ সরকারি সহায়তা
export function SupportSection({ decimals }: { decimals: number }) {
  const [has, setHas] = useState<string[]>([]);
  const path = supportPath(SUPPORT, { decimals, has });
  return (
    <Section title="সরকারি সহায়তা" sub="শুধু সেসব সেবা দেখাচ্ছি যার তথ্য সরকারি ওয়েবসাইটে মিলিয়ে দেখা হয়েছে। টাকার অঙ্ক মৌসুমভেদে বদলায়, তাই দেখাই না — আবেদনের আগে ইউনিয়নের উপসহকারী কৃষি কর্মকর্তাকে জিজ্ঞাসা করুন।">
      <ol className="grid gap-3 md:grid-cols-2">
        {SUPPORT.map((p, k) => {
          const needs = path.needsFirst.find((n) => n.id === p.id);
          return (
            <li key={p.id} className="ms-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[18px] font-bold text-ink">{bnNum(k + 1)}. {p.nameBn}</p>
                <label className="flex shrink-0 items-center gap-1.5 text-[13px] text-slate-600"><input type="checkbox" className="h-5 w-5 accent-emerald-700" checked={has.includes(p.id)} onChange={(e) => setHas((h) => (e.target.checked ? [...h, p.id] : h.filter((x) => x !== p.id)))} /> আছে</label>
              </div>
              <p className="text-[13px] text-slate-500">{p.byBn}</p>
              <p className="mt-2 text-[15px] text-slate-800">{p.benefitBn}</p>
              <p className="mt-2 text-[14px]"><strong>কারা:</strong> {p.whoBn}</p>
              {p.docsBn.length > 0 && <p className="text-[14px]"><strong>কাগজ:</strong> {p.docsBn.join(" · ")}</p>}
              <p className="text-[14px]"><strong>কোথায়:</strong> {p.whereBn}</p>
              {needs && !has.includes(p.id) && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[13px] text-amber-900">আগে লাগবে: {needs.missing.map((m) => SUPPORT.find((s) => s.id === m)?.nameBn ?? m).join(", ")}</p>}
              <div className="mt-2"><SourceTag confidence="official" label={p.source.label} url={p.source.url} checked={p.source.checked} /></div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

// ------------------------------------------------------------------ সাহায্য
export function HelpSection() {
  return (
    <Section title="সাহায্য" sub="নম্বরগুলো সরকারি ওয়েবসাইট থেকে মিলিয়ে নেওয়া। ফোনের খরচ ও সময় নিচে লেখা আছে।">
      <ul className="grid gap-3 md:grid-cols-2">
        {HELPLINES.map((h) => (
          <li key={h.number} className="ms-card ms-tilt flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[18px] font-bold text-ink">{h.nameBn}</p><p className="text-[13px] text-slate-500">{h.nameEn}</p></div>
              <a href={`tel:${h.number}`} className="kp-btn-primary ms-big-btn shrink-0 font-mono text-[20px]"><Phone size={18} /> {h.numberBn}</a>
            </div>
            <p className="text-[15px] text-slate-700">{h.forBn}</p>
            <p className="text-[13.5px] text-slate-600">🕗 {h.hoursBn}{h.costBn ? ` · ${h.costBn}` : ""}</p>
            <SourceTag confidence="official" label={h.source.label} url={h.source.url} checked={h.source.checked} />
          </li>
        ))}
      </ul>
      <p className="ms-card p-4 text-[14.5px] text-slate-700">মাছ চাষের প্রশ্নে উপজেলা মৎস্য কর্মকর্তার অফিসে যোগাযোগ করুন। মৎস্য বিষয়ে আলাদা কোনো কল সেন্টার নম্বর আমরা সরকারি সাইটে নিশ্চিত করতে পারিনি, তাই এখানে দিইনি।</p>
    </Section>
  );
}

