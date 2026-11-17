"use client";
import { useEffect, useState } from "react";
import { Coins, Landmark, Plus, Scale, Trash2 } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState, storageKey } from "@/lib/clientStore";
import {
  CASH_KEYS, CASH_LABEL, PURITIES, PURITY_LABEL, ZAKAT_SOURCES, NISAB_GOLD_MG, NISAB_SILVER_MG, LUNAR_YEAR_DAYS_APPROX,
  bnDigits, computeZakat, emptyZakat, formatTaka, groupTaka, nextHawlApprox, parseTakaInput, parseWeightInput, sanitizeZakat,
  simpleMaturity, type Metal, type MetalHolding, type Purity, type SavingsItem, type SavingsKind, type WeightUnit, type ZakatState,
} from "@/lib/zakat";

const todayBd = () => new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);
const fieldCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-emerald-600";

/** Text box for an amount in taka; keeps what the person typed, saves poisha. */
function MoneyInput({ id, value, onChange, label }: { id: string; value: number; onChange: (p: number) => void; label: string }) {
  const [text, setText] = useState(value ? groupTaka(value) : "");
  useEffect(() => { setText((t) => (parseTakaInput(t) === value ? t : value ? groupTaka(value) : "")); }, [value]);
  const bad = parseTakaInput(text) === null;
  return (
    <label htmlFor={id} className="block">
      <span className="text-[13.5px] font-semibold text-slate-700">{label}</span>
      <span className="mt-1 flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-600">
        <span className="text-slate-500">৳</span>
        <input id={id} inputMode="decimal" value={text} aria-invalid={bad}
          onChange={(e) => { setText(e.target.value); const p = parseTakaInput(e.target.value); if (p !== null) onChange(p); }}
          className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-[15px] outline-none" />
      </span>
    </label>
  );
}

export function ZakatHub() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const N = (s: string | number) => (bn ? bnDigits(String(s)) : String(s));
  const tk = (p: number) => formatTaka(p, lang);
  const [s, setS] = usePersistentState<ZakatState>(storageKey("shohoj", "zakat"), emptyZakat(), sanitizeZakat);
  const [today, setToday] = useState("");
  useEffect(() => setToday(todayBd()), []);
  const up = (patch: Partial<ZakatState>) => setS((prev) => ({ ...prev, ...patch }));
  const r = computeZakat(s);
  const hawl = today ? nextHawlApprox(s.hawlStart, today) : null;
  const metalName = (m: Metal) => (m === "gold" ? T("সোনা", "Gold") : T("রুপা", "Silver"));
  const unitName = (u: WeightUnit) => (u === "bhori" ? T("ভরি", "bhori") : T("গ্রাম", "gram"));

  const setRate = (m: Metal, p: Purity, poisha: number, unit: WeightUnit) =>
    setS((prev) => ({ ...prev, rates: { ...prev.rates, [m]: { ...prev.rates[m], [p]: poisha > 0 ? { poisha, unit } : undefined } } }));
  const setHolding = (id: string, patch: Partial<MetalHolding>) => up({ holdings: s.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  const setSaving = (id: string, patch: Partial<SavingsItem>) => up({ savings: s.savings.map((x) => (x.id === id ? { ...x, ...patch } : x)) });

  // Which metal/purity rows need a price: every holding's, plus the one used for the nisab.
  const rateRows = [...new Map([...s.holdings.map((h) => [`${h.metal}:${h.purity}`, { metal: h.metal, purity: h.purity }] as const), [`${s.basis}:${s.nisabPurity}`, { metal: s.basis, purity: s.nisabPurity }] as const]).values()];

  return (
    <section data-testid="zakat-hub" aria-labelledby="zakat-h" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="zakat-h" className="flex items-center gap-2 text-[19px] font-extrabold text-slate-900"><Scale size={21} className="text-amber-700" aria-hidden /> {T("যাকাত ও সঞ্চয়", "Zakat and savings")}</h2>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-slate-700">{T(
            "আপনার সম্পদ, সোনা-রুপা আর ধার লিখুন; আজকের সোনা-রুপার দাম আপনি নিজে বাজুস বা দোকান থেকে দেখে বসাবেন। হিসাব হয় এই ফোনেই, কোথাও পাঠানো হয় না।",
            "Enter your assets, gold, silver and debts; you type today's gold and silver rate yourself from BAJUS or your jeweller. Everything is worked out on this phone and sent nowhere.",
          )}</p>
        </div>
        <button type="button" onClick={() => setLang(bn ? "en" : "bn")} className="kp-chip !h-8 !rounded-full !text-[12px] font-semibold" aria-label={bn ? "Switch to English" : "বাংলায় দেখুন"}>{bn ? "EN" : "বাং"}</button>
      </div>

      {/* 1. Cash-like assets and debts */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-1.5 text-[15.5px] font-bold text-slate-900"><Landmark size={17} aria-hidden /> {T("টাকা ও সমজাতীয় সম্পদ", "Cash and similar assets")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {CASH_KEYS.map((k) => <MoneyInput key={k} id={`zk-${k}`} label={bn ? CASH_LABEL[k].bn : CASH_LABEL[k].en} value={s.cash[k]} onChange={(p) => up({ cash: { ...s.cash, [k]: p } })} />)}
          <MoneyInput id="zk-debts" label={T("এখনই শোধ করতে হবে এমন দেনা (বাদ যাবে)", "Debts due now (deducted)")} value={s.debtsPoisha} onChange={(p) => up({ debtsPoisha: p })} />
        </div>
      </fieldset>

      {/* 2. Gold and silver */}
      <fieldset className="space-y-3">
        <legend className="flex items-center gap-1.5 text-[15.5px] font-bold text-slate-900"><Coins size={17} aria-hidden /> {T("সোনা ও রুপা", "Gold and silver")}</legend>
        {s.holdings.length === 0 && <p className="text-[14px] text-slate-600">{T("কোনো গয়না বা সোনা-রুপা যোগ করা হয়নি।", "No gold or silver added.")}</p>}
        <ul className="space-y-2">
          {s.holdings.map((h) => {
            const v = r.metals.find((m) => m.id === h.id);
            return (
              <li key={h.id} data-testid="zk-holding" className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
                <label className="text-[13px] font-semibold text-slate-700">{T("ধাতু", "Metal")}
                  <select value={h.metal} onChange={(e) => setHolding(h.id, { metal: e.target.value as Metal })} className={`${fieldCls} mt-1`}><option value="gold">{metalName("gold")}</option><option value="silver">{metalName("silver")}</option></select>
                </label>
                <label className="text-[13px] font-semibold text-slate-700">{T("মান", "Purity")}
                  <select value={h.purity} onChange={(e) => setHolding(h.id, { purity: e.target.value as Purity })} className={`${fieldCls} mt-1`}>{PURITIES.map((p) => <option key={p} value={p}>{bn ? PURITY_LABEL[p].bn : PURITY_LABEL[p].en}</option>)}</select>
                </label>
                <label className="text-[13px] font-semibold text-slate-700">{T("ওজন", "Weight")}
                  <WeightInput value={h.weightMilli} onChange={(w) => setHolding(h.id, { weightMilli: w })} />
                </label>
                <label className="text-[13px] font-semibold text-slate-700">{T("একক", "Unit")}
                  <select value={h.unit} onChange={(e) => setHolding(h.id, { unit: e.target.value as WeightUnit })} className={`${fieldCls} mt-1`}><option value="bhori">{unitName("bhori")}</option><option value="gram">{unitName("gram")}</option></select>
                </label>
                <button type="button" onClick={() => up({ holdings: s.holdings.filter((x) => x.id !== h.id) })} className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-3 text-red-700" aria-label={T("মুছুন", "Remove")}><Trash2 size={17} /></button>
                <label className="flex items-center gap-2 text-[14px] sm:col-span-3">
                  <input type="checkbox" checked={h.worn} onChange={(e) => setHolding(h.id, { worn: e.target.checked })} className="h-5 w-5" /> {T("নিয়মিত পরা গয়না", "Jewellery worn regularly")}
                </label>
                <p className="text-[13.5px] text-slate-700 sm:col-span-2 sm:text-right">
                  {N((v?.mg ?? 0) / 1000)} {T("গ্রাম", "g")} · {v?.poisha != null ? tk(v.poisha) : T("দাম বসানো হয়নি", "no rate yet")}{v && !v.counted ? ` · ${T("হিসাবে ধরা হয়নি", "not counted")}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
        <button type="button" data-testid="zk-add-holding" onClick={() => up({ holdings: [...s.holdings, { id: uid(), metal: "gold", purity: "22K", unit: "bhori", weightMilli: 0, worn: true, note: "" }] })} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[14.5px] font-semibold"><Plus size={17} aria-hidden /> {T("সোনা বা রুপা যোগ করুন", "Add gold or silver")}</button>
        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[14px] text-slate-800">
          <input type="checkbox" checked={s.includeWorn} onChange={(e) => up({ includeWorn: e.target.checked })} className="mt-0.5 h-5 w-5" />
          <span>{T("নিয়মিত পরা গয়নাও হিসাবে ধরুন। এ বিষয়ে মাযহাবগুলোর মত ভিন্ন; আপনার আলেমের মত অনুযায়ী বেছে নিন।", "Count jewellery worn regularly too. The schools of law differ on this; choose as your own scholar advises.")}</span>
        </label>
      </fieldset>

      {/* 3. Today's rates, typed by the person */}
      <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4">
        <legend className="px-1 text-[15.5px] font-bold text-slate-900">{T("আজকের দাম (আপনি বসাবেন)", "Today's rates (you enter them)")}</legend>
        <p className="text-[13.5px] text-slate-700">{T("দাম প্রায়ই বদলায়। বাজুসের সাইট বা আপনার দোকান থেকে দেখে লিখুন, সঙ্গে কোথা থেকে আর কবে দেখেছেন।", "Rates change often. Copy them from the BAJUS site or your jeweller, with where and when you saw them.")}{" "}
          <a href="https://www.bajus.org/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-800 underline">bajus.org</a></p>
        <div className="grid gap-3 sm:grid-cols-2">
          {rateRows.map(({ metal, purity }) => {
            const rate = s.rates[metal][purity];
            const unit = rate?.unit ?? "bhori";
            return (
              <div key={`${metal}:${purity}`} className="grid grid-cols-[1fr_auto] items-end gap-2">
                <MoneyInput id={`zk-rate-${metal}-${purity}`} label={`${metalName(metal)} ${bn ? PURITY_LABEL[purity].bn : PURITY_LABEL[purity].en} — ${T("প্রতি", "per")} ${unitName(unit)}`} value={rate?.poisha ?? 0} onChange={(p) => setRate(metal, purity, p, unit)} />
                <select aria-label={T("দামের একক", "Rate unit")} value={unit} onChange={(e) => rate && setRate(metal, purity, rate.poisha, e.target.value as WeightUnit)} className="h-[46px] rounded-xl border border-slate-300 bg-white px-2 text-[14px]">
                  <option value="bhori">{unitName("bhori")}</option><option value="gram">{unitName("gram")}</option>
                </select>
              </div>
            );
          })}
          <label className="block text-[13.5px] font-semibold text-slate-700">{T("দাম দেখার তারিখ", "Date of these rates")}
            <input type="date" value={s.rateDate} max={today || undefined} onChange={(e) => up({ rateDate: e.target.value })} className={`${fieldCls} mt-1`} />
          </label>
          <label className="block text-[13.5px] font-semibold text-slate-700">{T("কোথা থেকে", "Source")}
            <input value={s.rateSource} maxLength={120} placeholder={T("যেমন: বাজুস, বা দোকানের নাম", "e.g. BAJUS, or the shop's name")} onChange={(e) => up({ rateSource: e.target.value })} className={`${fieldCls} mt-1`} />
          </label>
        </div>
      </fieldset>

      {/* 4. Nisab basis and hawl */}
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-[15.5px] font-bold text-slate-900">{T("নিসাব ও হাওল", "Nisab and hawl")}</legend>
        <div className="space-y-2">
          {(["silver", "gold"] as Metal[]).map((m) => (
            <label key={m} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-[14px] ${s.basis === m ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
              <input type="radio" name="zk-basis" checked={s.basis === m} onChange={() => up({ basis: m })} className="mt-0.5 h-5 w-5" />
              <span>{m === "silver"
                ? T(`রুপার নিসাব: ${N(NISAB_SILVER_MG / 1000)} গ্রাম রুপার দাম। এটি নিচের সীমা; অনেক আলেম সতর্কতার জন্য এটি ধরতে বলেন।`, `Silver nisab: the value of ${NISAB_SILVER_MG / 1000} g of silver. It is the lower threshold; many scholars advise it for caution.`)
                : T(`সোনার নিসাব: ${N(NISAB_GOLD_MG / 1000)} গ্রাম সোনার দাম।`, `Gold nisab: the value of ${NISAB_GOLD_MG / 1000} g of gold.`)}</span>
            </label>
          ))}
          <label className="block text-[13.5px] font-semibold text-slate-700">{T("নিসাবে কোন মানের দাম ধরবেন", "Purity used for the nisab rate")}
            <select value={s.nisabPurity} onChange={(e) => up({ nisabPurity: e.target.value as Purity })} className={`${fieldCls} mt-1`}>{PURITIES.map((p) => <option key={p} value={p}>{bn ? PURITY_LABEL[p].bn : PURITY_LABEL[p].en}</option>)}</select>
          </label>
        </div>
        <div>
          <label className="block text-[13.5px] font-semibold text-slate-700">{T("নিসাব পূর্ণ হওয়ার দিন (হাওলের শুরু)", "Day your wealth first reached nisab (hawl start)")}
            <input type="date" value={s.hawlStart} max={today || undefined} onChange={(e) => up({ hawlStart: e.target.value })} className={`${fieldCls} mt-1`} />
          </label>
          {hawl && <p className="mt-2 text-[14px] text-slate-800" data-testid="zk-hawl">{T(`পরের হাওল পূর্ণ হবে আনুমানিক ${N(hawl.date)} (আরও প্রায় ${N(hawl.daysLeft)} দিন)। চাঁদের হিসাবে প্রায় ${N(LUNAR_YEAR_DAYS_APPROX)} দিনে এক বছর ধরা; সঠিক তারিখ হিজরি ক্যালেন্ডার দেখে নিন।`, `Your next hawl completes around ${hawl.date} (about ${hawl.daysLeft} days). A lunar year is taken as about ${LUNAR_YEAR_DAYS_APPROX} days; check the Hijri calendar for the exact date.`)}</p>}
        </div>
      </fieldset>

      {/* 5. Result */}
      <div aria-live="polite" data-testid="zk-result" data-reaches={String(r.reachesNisab)} className={`rounded-2xl border-2 p-4 ${r.reachesNisab ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50"}`}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[14.5px] sm:grid-cols-4">
          <dt className="text-slate-600">{T("মোট সম্পদ", "Total assets")}</dt><dd className="font-mono font-semibold">{tk(r.grossPoisha)}</dd>
          <dt className="text-slate-600">{T("দেনা বাদ", "Less debts")}</dt><dd className="font-mono font-semibold">{tk(r.debtsPoisha)}</dd>
          <dt className="text-slate-600">{T("নিট সম্পদ", "Net assets")}</dt><dd className="font-mono font-semibold">{tk(r.netPoisha)}</dd>
          <dt className="text-slate-600">{T("নিসাব", "Nisab")}</dt><dd className="font-mono font-semibold">{r.nisabPoisha !== null ? tk(r.nisabPoisha) : "—"}</dd>
        </dl>
        <p className="mt-3 text-[18px] font-extrabold text-slate-900">
          {r.reachesNisab === null
            ? T(`নিসাব জানতে ${metalName(s.basis)} (${bn ? PURITY_LABEL[s.nisabPurity].bn : PURITY_LABEL[s.nisabPurity].en})-এর আজকের দাম বসান।`, `Enter today's ${metalName(s.basis).toLowerCase()} (${PURITY_LABEL[s.nisabPurity].en}) rate to see the nisab.`)
            : r.reachesNisab
              ? T(`নিট সম্পদ নিসাব ছুঁয়েছে: যাকাত ২.৫% = ${tk(r.duePoisha)}`, `Net assets reach the nisab: zakat at 2.5% = ${tk(r.duePoisha)}`)
              : T("নিট সম্পদ নিসাবের নিচে: এই হিসাবে যাকাত ফরজ হয়নি।", "Net assets are below the nisab: on this calculation no zakat is due.")}
        </p>
        {r.missingRates.length > 0 && <p className="mt-1 text-[13.5px] font-semibold text-amber-800">{T("যেগুলোর দাম বসানো হয়নি সেগুলো যোগ হয়নি: ", "Not added yet, no rate entered: ")}{r.missingRates.map((m) => `${metalName(m.metal)} ${bn ? PURITY_LABEL[m.purity].bn : PURITY_LABEL[m.purity].en}`).join(", ")}</p>}
        {r.reachesNisab !== null && <p className="mt-1 text-[13px] text-slate-700">{T(`দাম: ${s.rateDate ? N(s.rateDate) : "তারিখ লেখা হয়নি"}${s.rateSource ? `, ${s.rateSource}` : ""} — আপনার বসানো।`, `Rates: ${s.rateDate || "date not entered"}${s.rateSource ? `, ${s.rateSource}` : ""} — as you entered them.`)}</p>}
        <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{T("এটি একটি হিসাবযন্ত্র, ফতোয়া নয়। নিজের অবস্থার জন্য বিশ্বস্ত আলেমের কাছে জেনে নিন।", "This is a calculator, not a fatwa. Ask a trusted scholar about your own situation.")}</p>
      </div>

      {/* 6. Savings list: estimate at the person's own rate */}
      <fieldset className="space-y-3">
        <legend className="text-[15.5px] font-bold text-slate-900">{T("ডিপিএস ও সঞ্চয়পত্র", "DPS and Sanchaypatra")}</legend>
        <p className="text-[13.5px] text-slate-700">{T("মুনাফার হার আপনার কাগজ বা ব্যাংক থেকে দেখে বসান। মেয়াদ শেষের অঙ্কটি সরল হারে একটি আনুমানিক হিসাব; কর, চার্জ বা আগে ভাঙানোর কর্তন ধরা হয়নি।", "Type the profit rate from your certificate or bank. The maturity figure is a simple-rate estimate; tax, charges and early-encashment cuts are not included.")}</p>
        <ul className="space-y-2">
          {s.savings.map((x) => {
            const est = simpleMaturity(x);
            return (
              <li key={x.id} data-testid="zk-saving" className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">
                <label className="text-[13px] font-semibold text-slate-700">{T("ধরন", "Type")}
                  <select value={x.kind} onChange={(e) => setSaving(x.id, { kind: e.target.value as SavingsKind })} className={`${fieldCls} mt-1`}>
                    <option value="dps">{T("ডিপিএস", "DPS")}</option><option value="sanchaypatra">{T("সঞ্চয়পত্র", "Sanchaypatra")}</option><option value="fdr">{T("এফডিআর", "FDR")}</option><option value="other">{T("অন্যান্য", "Other")}</option>
                  </select>
                </label>
                <label className="text-[13px] font-semibold text-slate-700">{T("নাম", "Name")}
                  <input value={x.name} maxLength={60} onChange={(e) => setSaving(x.id, { name: e.target.value })} className={`${fieldCls} mt-1`} />
                </label>
                <MoneyInput id={`zk-sp-${x.id}`} label={T("জমা/মূল টাকা", "Principal")} value={x.principalPoisha} onChange={(p) => setSaving(x.id, { principalPoisha: p })} />
                <label className="text-[13px] font-semibold text-slate-700">{T("বার্ষিক হার (%)", "Yearly rate (%)")}
                  <input inputMode="decimal" defaultValue={x.rateBps ? String(x.rateBps / 100) : ""} onChange={(e) => { const p = parseTakaInput(e.target.value); if (p !== null) setSaving(x.id, { rateBps: Math.min(10_000, p) }); }} className={`${fieldCls} mt-1 font-mono`} />
                </label>
                <label className="text-[13px] font-semibold text-slate-700">{T("শুরু", "Start")}
                  <input type="date" value={x.startDate} onChange={(e) => setSaving(x.id, { startDate: e.target.value })} className={`${fieldCls} mt-1`} />
                </label>
                <label className="text-[13px] font-semibold text-slate-700">{T("মেয়াদ শেষ", "Maturity")}
                  <input type="date" value={x.maturityDate} onChange={(e) => setSaving(x.id, { maturityDate: e.target.value })} className={`${fieldCls} mt-1`} />
                </label>
                <div className="flex items-center justify-between gap-2 sm:col-span-3">
                  <p className="text-[14px] text-slate-800">{est ? T(`আনুমানিক মেয়াদ শেষে ${tk(est.totalPoisha)} (মুনাফা ${tk(est.profitPoisha)})`, `Estimated at maturity ${tk(est.totalPoisha)} (profit ${tk(est.profitPoisha)})`) : T("টাকা, হার আর দুটি তারিখ দিলে আনুমানিক হিসাব দেখাবে।", "Enter amount, rate and both dates to see an estimate.")}</p>
                  <button type="button" onClick={() => up({ savings: s.savings.filter((y) => y.id !== x.id) })} className="inline-flex h-10 items-center rounded-xl border border-slate-300 px-3 text-red-700" aria-label={T("মুছুন", "Remove")}><Trash2 size={16} /></button>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => up({ savings: [...s.savings, { id: uid(), kind: "dps", name: "", principalPoisha: 0, rateBps: 0, startDate: "", maturityDate: "" }] })} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[14.5px] font-semibold"><Plus size={17} aria-hidden /> {T("ডিপিএস বা সঞ্চয়পত্র যোগ করুন", "Add DPS or Sanchaypatra")}</button>
      </fieldset>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        {ZAKAT_SOURCES.map((x) => <SourceTag key={x.url} confidence={x.url.includes("bajus") ? "official" : "reported"} label={x.label} url={x.url} checked={x.checked} />)}
      </div>
    </section>
  );
}

/** Weight box (bhori or gram); keeps what the person typed, saves thousandths. */
function WeightInput({ value, onChange }: { value: number; onChange: (w: number) => void }) {
  const [text, setText] = useState(value ? String(value / 1000) : "");
  return (
    <input inputMode="decimal" value={text} aria-invalid={parseWeightInput(text) === null}
      onChange={(e) => { setText(e.target.value); const w = parseWeightInput(e.target.value); if (w !== null) onChange(w); }}
      className={`${fieldCls} mt-1 font-mono`} />
  );
}
