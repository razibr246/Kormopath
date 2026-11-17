"use client";
import { useMemo, useState } from "react";
import { Check, Download, Plus, Printer, Trash2 } from "lucide-react";
import { downloadText } from "@/lib/clientStore";
import {
  FARM_CROPS, addDays, bnNum, buildFarmRecord, cropBn, farmRecordJson, fromPoisha, toPoisha,
  type FarmLog, type FarmTask, type HarvestRec, type Herd, type PlanBudget, type Plot,
} from "@/lib/krishi";

const fieldCls = "w-full min-h-[48px] rounded-xl border border-line bg-white px-3 text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-emerald-600";
const labelCls = "block text-[14px] font-semibold text-slate-700";
const taka = (p: number) => `৳${bnNum(fromPoisha(p).toLocaleString("en-IN", { maximumFractionDigits: 2 }))}`;
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Only the record is printed; the rest of the page is hidden on paper. */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #farm-record, #farm-record * { visibility: visible !important; }
  #farm-record { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; }
  .no-print { display: none !important; }
}`;

export function FarmRecordSection({ plots, tasks, herds, logs, budgets, harvests, setHarvests, today }: {
  plots: Plot[]; tasks: FarmTask[]; herds: Herd[]; logs: FarmLog[]; budgets: PlanBudget[];
  harvests: HarvestRec[]; setHarvests: (f: (h: HarvestRec[]) => HarvestRec[]) => void; today: string;
}) {
  const [from, setFrom] = useState(() => addDays(today, -365));
  const [to, setTo] = useState(today);
  const [plotId, setPlotId] = useState("");
  const [cropId, setCropId] = useState("rice");
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");
  const [soldKg, setSoldKg] = useState("");
  const [saleTaka, setSaleTaka] = useState("");
  const [buyer, setBuyer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activePlot = plotId || plots[0]?.id || "";

  const { record, recordErr } = useMemo(() => {
    try { return { record: buildFarmRecord({ plots, tasks, herds, logs, harvests, budgets, from, to, generatedOn: today }), recordErr: null }; }
    catch (e) { return { record: null, recordErr: (e as Error).message }; }
  }, [plots, tasks, herds, logs, harvests, budgets, from, to, today]);

  const addHarvest = () => {
    try {
      const k = Number(kg);
      if (!activePlot) throw new Error("আগে “আমার জমি”-তে একটি জমি যোগ করুন।");
      if (!kg.trim() || !Number.isFinite(k) || k < 0) throw new Error("কত কেজি তুললেন, সংখ্যায় লিখুন।");
      const s = soldKg.trim() ? Number(soldKg) : undefined;
      if (s !== undefined && (!Number.isFinite(s) || s < 0 || s > k)) throw new Error("বিক্রি করা কেজি তোলা কেজির চেয়ে বেশি হতে পারে না।");
      const salePoisha = saleTaka.trim() ? toPoisha(Number(saleTaka)) : undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("তারিখ দিন।");
      setHarvests((all) => [...all, { id: uid(), plotId: activePlot, cropId, date, kg: k, soldKg: s, salePoisha, buyer: buyer.trim().slice(0, 80) || undefined }]);
      setKg(""); setSoldKg(""); setSaleTaka(""); setBuyer(""); setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  const exportJson = () => {
    if (!record) return;
    downloadText(`maathsathi-farm-record-${to}.json`, farmRecordJson(record, plots, herds), "application/json");
  };

  return (
    <section className="ms-enter space-y-4">
      <style>{PRINT_CSS}</style>
      <header className="no-print">
        <h2 className="text-[26px] font-semibold leading-tight text-slate-900">খামারের খাতা</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-slate-600">আপনার জমি, শেষ করা কাজ, ফসল তোলা আর পশুপাখির খাতা মিলিয়ে একটি মৌসুম-সারাংশ। প্রিন্ট করুন বা JSON ফাইল নিন — ঋণ কর্মকর্তা, বিমাকারী বা সমবায়কে দেখাতে পারেন।</p>
      </header>

      <div className="no-print ms-card space-y-3 p-4">
        <p className="text-[15px] font-bold text-ink">ফসল তোলা ও বিক্রি লিখুন</p>
        {plots.length === 0 ? <p className="text-[14px] text-slate-500">আগে “আমার জমি”-তে একটি জমি যোগ করুন।</p> : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={labelCls}>জমি<select className={fieldCls} value={activePlot} onChange={(e) => setPlotId(e.target.value)}>{plots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label className={labelCls}>ফসল<select className={fieldCls} value={cropId} onChange={(e) => setCropId(e.target.value)}>{FARM_CROPS.map((c) => <option key={c.id} value={c.id}>{c.bn}</option>)}</select></label>
              <label className={labelCls}>তোলার তারিখ<input type="date" className={fieldCls} value={date} onChange={(e) => setDate(e.target.value)} /></label>
              <label className={labelCls}>কত কেজি তুললেন<input className={`${fieldCls} font-mono`} inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="যেমন: ৬৫০" /></label>
              <label className={labelCls}>কত কেজি বিক্রি (ঐচ্ছিক)<input className={`${fieldCls} font-mono`} inputMode="decimal" value={soldKg} onChange={(e) => setSoldKg(e.target.value)} /></label>
              <label className={labelCls}>মোট কত টাকা পেলেন (ঐচ্ছিক)<input className={`${fieldCls} font-mono`} inputMode="decimal" value={saleTaka} onChange={(e) => setSaleTaka(e.target.value)} /></label>
            </div>
            <label className={labelCls}>কার কাছে / কোন বাজারে (ঐচ্ছিক)<input className={fieldCls} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="যেমন: স্থানীয় আড়ত" /></label>
            <button type="button" onClick={addHarvest} className="kp-btn-primary ms-big-btn w-full justify-center sm:w-auto"><Plus size={16} /> লিখে রাখুন</button>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[14px] text-rose-800">{error}</p>}
            {harvests.length > 0 && (
              <ul className="space-y-1">{[...harvests].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-[14.5px]">
                  <span>{h.date} · {plots.find((p) => p.id === h.plotId)?.name ?? "—"} · {cropBn(h.cropId)} {bnNum(h.kg)} কেজি{h.salePoisha !== undefined ? ` · ${taka(h.salePoisha)}` : ""}</span>
                  <button type="button" className="kp-icon-btn" aria-label="মুছুন" onClick={() => setHarvests((all) => all.filter((x) => x.id !== h.id))}><Trash2 size={15} /></button>
                </li>
              ))}</ul>
            )}
          </>
        )}
      </div>

      <div className="no-print ms-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className={labelCls}>শুরু<input type="date" className={fieldCls} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className={labelCls}>শেষ<input type="date" className={fieldCls} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="kp-btn-primary ms-big-btn" disabled={!record} onClick={() => window.print()}><Printer size={16} /> প্রিন্ট / PDF</button>
          <button type="button" className="kp-btn-ghost ms-big-btn" disabled={!record} onClick={exportJson}><Download size={16} /> JSON (farmOS ধাঁচে)</button>
        </div>
      </div>
      {recordErr && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[14px] text-rose-800">{recordErr}</p>}

      {record && (
        <article id="farm-record" className="ms-card space-y-4 bg-white p-5" aria-label="খামারের খাতা">
          <header>
            <h3 className="text-[22px] font-bold text-ink">খামারের খাতা · মাঠসাথী</h3>
            <p className="text-[14px] text-slate-600">সময়কাল: {record.period.from} থেকে {record.period.to} · তৈরি: {record.generatedOn}</p>
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[14px] text-amber-900" role="note">⚠ {record.disclaimerBn}<br /><span lang="en">{record.disclaimerEn}</span></p>
          </header>

          <p className="text-[15px] text-slate-800">মোট ফসল তোলা: <strong className="font-mono">{bnNum(record.totals.harvestKg)} কেজি</strong> · ফসল বিক্রি থেকে পাওয়া: <strong className="font-mono">{taka(record.totals.salePoisha)}</strong> · খাতায় {bnNum(record.totals.logCount)}টি লেখা</p>

          {record.plots.length === 0 && <p className="text-[14px] text-slate-500">কোনো জমি লেখা নেই।</p>}
          {record.plots.map((p) => (
            <section key={p.plotId} className="break-inside-avoid rounded-2xl border border-line p-4">
              <h4 className="text-[18px] font-bold text-ink">{p.name} <span className="text-[14px] font-normal text-slate-600">· {bnNum(p.decimals)} শতাংশ</span></h4>
              <dl className="mt-2 grid gap-1.5 text-[14.5px] text-slate-800">
                <div><dt className="inline font-semibold">কী চাষ হয়েছে: </dt><dd className="inline">{p.cropsGrown.length ? p.cropsGrown.map((c) => `${c.season}: ${c.cropBn}`).join(" · ") : "লেখা নেই"}{p.plannedCropBn ? ` · পরিকল্পনায়: ${p.plannedCropBn}` : ""}</dd></div>
                <div><dt className="inline font-semibold">কবে বোনা/রোপণ: </dt><dd className="inline">{p.sown.length ? p.sown.map((s) => `${s.date} (${s.title})`).join(" · ") : "শেষ করা কাজে লেখা নেই"}</dd></div>
                <div><dt className="inline font-semibold">সার, স্প্রে, সেচ: </dt><dd className="inline">{p.inputs.length ? p.inputs.map((s) => `${s.date} ${s.kindBn}: ${s.title}`).join(" · ") : "লেখা নেই"}</dd></div>
                {p.otherWork.length > 0 && <div><dt className="inline font-semibold">অন্য কাজ: </dt><dd className="inline">{p.otherWork.map((s) => `${s.date} ${s.title}`).join(" · ")}</dd></div>}
                <div><dt className="inline font-semibold">ফসল তোলা: </dt><dd className="inline">{p.harvests.length ? p.harvests.map((h) => `${h.date} ${h.cropBn} ${bnNum(h.kg)} কেজি${h.soldKg !== null ? `, বিক্রি ${bnNum(h.soldKg)} কেজি` : ""}${h.salePoisha !== null ? `, ${taka(h.salePoisha)}` : ""}${h.buyer ? ` (${h.buyer})` : ""}`).join(" · ") : "লেখা নেই"}</dd></div>
                {p.plannedCostPoisha !== null && <div><dt className="inline font-semibold">পরিকল্পিত খরচ (রসিদ নয়): </dt><dd className="inline font-mono">{taka(p.plannedCostPoisha)}</dd></div>}
                {p.soilTest && <div><dt className="inline font-semibold">মাটি পরীক্ষা (কৃষকের কার্ড থেকে): </dt><dd className="inline">{p.soilTest}</dd></div>}
              </dl>
            </section>
          ))}

          {record.unassignedWork.length > 0 && <p className="text-[14px] text-slate-700"><strong>জমি উল্লেখ নেই এমন কাজ:</strong> {record.unassignedWork.map((w) => `${w.date} ${w.title}`).join(" · ")}</p>}

          {record.herds.length > 0 && (
            <section className="break-inside-avoid rounded-2xl border border-line p-4">
              <h4 className="text-[18px] font-bold text-ink">পশু, হাঁস-মুরগি ও মাছ</h4>
              <ul className="mt-2 space-y-1 text-[14.5px] text-slate-800">
                {record.herds.map((h) => (
                  <li key={h.id}>{h.kindBn} · {h.name} · {bnNum(h.count)} {h.unitBn}: দুধ {bnNum(h.milkL)} লি., ডিম {bnNum(h.eggs)}টি, মাছ {bnNum(h.fishKg)} কেজি, খাবার {bnNum(h.feedKg)} কেজি, বিক্রি {taka(h.salePoisha)}, খরচ {taka(h.expensePoisha)}{h.vaccinations.length ? ` · টিকা: ${h.vaccinations.join(", ")}` : ""}{h.illnesses.length ? ` · অসুখ: ${h.illnesses.join("; ")}` : ""}</li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-[12.5px] text-slate-500">সব সংখ্যা কৃষকের নিজের লেখা; অ্যাপ কোনো ফলন, দাম বা মাত্রা যোগ করেনি। কাজের তারিখ = কাজের তালিকায় যে দিন ঠিক করা ছিল। JSON ফাইলের লেখাগুলো farmOS-এর log (activity, input, harvest, observation) ধাঁচে সাজানো, তবে এটি farmOS-এর অফিসিয়াল এক্সপোর্ট নয়।</p>
          <p className="no-print text-[13px] text-emerald-800"><Check size={14} className="inline" aria-hidden /> তথ্য শুধু এই ফোনে থাকে; ফাইল আপনি নিজে কাউকে দিলে তবেই যায়।</p>
        </article>
      )}
    </section>
  );
}
