"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardCopy, Phone, Printer, ScrollText, ShieldAlert } from "lucide-react";
import { SourceTag } from "@/components/layout/AppHeader";
import { usePersistentState } from "@/lib/clientStore";
import { BD_DISTRICTS } from "@/lib/legal/districts";
import { PROBLEM_CATEGORIES, getProblemCategory, listSubcategoryOptions } from "@/lib/legal/taxonomy";
import { classifySeverity } from "@/lib/legal/severity";
import { validateBangladeshPhone } from "@/lib/legal/phone";
import { HELPLINES, NLASO_DISTRICT_OFFICES, NLASO_HELPLINE_PAGE, NOT_LEGAL_ADVICE_BN, NOT_LEGAL_ADVICE_EN } from "@/lib/legal/data";
import { applicationText, newCaseFile, sanitizeCaseFiles, validateNewCaseFile, type ApplicantInfo, type CaseFile } from "@/lib/legal/caseFile";
import { LEGAL_CASES_KEY, composeProblem, severityAdvice } from "@/lib/legal/citizen";
import { DocumentChecklist } from "./DocumentChecklist";

type Lang = "bn" | "en";
type Tri = boolean | null;

const STEPS = [
  { bn: "আপনার তথ্য", en: "About you" },
  { bn: "সমস্যা", en: "The problem" },
  { bn: "অপর পক্ষ", en: "The other side" },
  { bn: "কাগজপত্র", en: "Papers" },
  { bn: "দেখে নিন", en: "Review" },
] as const;

const ADVICE_TONE = {
  danger: "border-red-500 bg-red-50 text-red-950",
  urgent: "border-amber-400 bg-amber-50 text-amber-950",
  soon: "border-indigo-300 bg-indigo-50 text-indigo-950",
  normal: "border-slate-200 bg-slate-50 text-slate-800",
} as const;

const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[15px] leading-[1.5]";
const label = "block text-[14px] font-semibold text-slate-800";
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14));

/**
 * The application draft, step by step. Ported from the Digital Legal Aid System's citizen application and voice intake
 * (taxonomy, severity and phone rules from lib/legal), but it never files anything: it prepares a printable draft,
 * saved on this phone only after the person reviews it, and says where to take it.
 */
export function ApplyWizard({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const T = (b: string, e: string) => (bn ? b : e);
  const [files, setFiles] = usePersistentState<CaseFile[]>(LEGAL_CASES_KEY, [], sanitizeCaseFiles);

  const [step, setStep] = useState(0);
  const [applicant, setApplicant] = useState<ApplicantInfo>({ name: "", phone: "", gender: "", isChild: null, hasDisability: null, cannotAffordLawyer: null });
  const [districtId, setDistrictId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [story, setStory] = useState("");
  const [other, setOther] = useState({ name: "", relation: "", address: "" });
  const [documents, setDocuments] = useState<string[]>([]);
  const [saved, setSaved] = useState<CaseFile | null>(null);
  const [msg, setMsg] = useState("");

  // /legal/apply?topic=<category id> starts with that problem type picked.
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    if (topic && getProblemCategory(topic)) setCategoryId(topic);
  }, []);

  const phoneCheck = applicant.phone ? validateBangladeshPhone(applicant.phone) : null;
  const subs = listSubcategoryOptions(categoryId);
  const severity = useMemo(() => (story.trim().length >= 6 || subcategoryId ? classifySeverity(story, { categoryId, subcategoryId }) : null), [story, categoryId, subcategoryId]);
  const advice = severity && severity.severity !== "standard" ? severityAdvice(severity.severity) : null;

  const draftInput = { categoryId, subcategoryId, districtId, problem: composeProblem(story, other), applicant, documents };
  const issues = validateNewCaseFile(draftInput);
  const preview = useMemo(() => (issues.length ? "" : applicationText(newCaseFile(draftInput, "preview", new Date().toISOString()))), [JSON.stringify(draftInput), issues.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepOk = [
    !!districtId && (!phoneCheck || phoneCheck.valid),
    !!categoryId && story.normalize("NFC").trim().length >= 10,
    true,
    true,
    issues.length === 0,
  ];

  const save = () => {
    if (issues.length) return;
    const now = new Date().toISOString();
    const file = newCaseFile(draftInput, newId(), now);
    setFiles((prev) => [file, ...prev].slice(0, 20));
    setSaved(file);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMsg(T("কপি হয়েছে", "Copied")); }
    catch { setMsg(T("কপি করা যায়নি", "Could not copy")); }
    window.setTimeout(() => setMsg(""), 2500);
  };
  const triButtons = (value: Tri, onSet: (v: Tri) => void, name: string) => (
    <span className="flex gap-1.5" role="group" aria-label={name}>
      {([true, false] as const).map((v) => (
        <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => onSet(value === v ? null : v)}
          className={`kp-chip !h-10 min-w-[56px] justify-center !text-[14px] font-semibold ${value === v ? "kp-chip-on" : ""}`}>{v ? T("হ্যাঁ", "Yes") : T("না", "No")}</button>
      ))}
    </span>
  );

  // ---------------- saved draft ----------------
  if (saved) {
    const text = applicationText(saved);
    const legalAid = HELPLINES.find((h) => h.id === "legal_aid");
    return (
      <section aria-labelledby="lg-draft-h" data-testid="apply-draft" className="space-y-4">
        <div className="lg-card relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="kp-eyebrow">{T("এই ফোনে সংরক্ষিত", "Saved on this phone")}</p>
              <h2 id="lg-draft-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{T("আপনার আবেদনের খসড়া তৈরি", "Your application draft is ready")}</h2>
              <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{T("এটি কোথাও জমা হয়নি। প্রিন্ট বা কপি করে জেলা লিগ্যাল এইড অফিসে নিয়ে যান, অথবা ১৬৬৯৯-এ ফোন করে পড়ে শোনান।", "It has not been sent anywhere. Print or copy it and take it to your district legal aid office, or call 16699 and read it out.")}</p>
            </div>
            <span className="lg-seal lg-seal-in shrink-0 text-[14px]" aria-label={T("খসড়া — আবেদন জমা হয়নি", "Draft — not submitted")}>খসড়া · আবেদন জমা হয়নি</span>
          </div>
          <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-[14.5px] leading-[1.7] text-slate-900 print:max-h-none print:border-0 print:bg-white">{text}</pre>
          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px]"><Printer size={18} aria-hidden /> {T("প্রিন্ট", "Print")}</button>
            <button type="button" onClick={() => copy(text)} className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px]"><ClipboardCopy size={18} aria-hidden /> {T("কপি", "Copy")}</button>
            <Link href="/legal/track" className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px]"><ScrollText size={18} aria-hidden /> {T("আমার কেসে দেখুন", "Open in My case")}</Link>
          </div>
          {msg && <p role="status" className="mt-2 text-[14px] font-semibold text-emerald-800">{msg}</p>}
        </div>

        <div className="lg-card space-y-3 print:hidden">
          <h3 className="text-[18px] font-bold text-slate-900">{T("এখন কী করবেন", "What to do now")}</h3>
          <ol className="space-y-2 text-[15px] leading-relaxed text-slate-700">
            <li>১. {T("১৬৬৯৯-এ ফোন করুন — সরকারি আইন সহায়তার জাতীয় হেল্পলাইন। খসড়াটি পাশে রাখুন।", "Call 16699, the national government legal aid helpline. Keep the draft at hand.")}</li>
            <li>২. {T("জেলা লিগ্যাল এইড অফিসে খসড়া ও টিক দেওয়া কাগজপত্র নিয়ে যান। অফিসের নির্দিষ্ট ফরম লাগতে পারে।", "Take the draft and the ticked papers to your district legal aid office. It may ask you to fill in its own form.")}</li>
            <li>৩. {T("যা ঘটছে তা 'আমার কেস'-এ নিজে লিখে রাখুন।", "Note what happens yourself in My case.")}</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            {legalAid && <a href={`tel:${legalAid.number}`} className="kp-btn-sun inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px]"><Phone size={18} aria-hidden /> {T("১৬৬৯৯-এ ফোন", "Call 16699")}</a>}
            <a href={NLASO_DISTRICT_OFFICES.url} target="_blank" rel="noopener noreferrer" className="kp-btn-ghost inline-flex min-h-[48px] items-center px-4 text-[15px]">{T("জেলা অফিসের খোঁজ", "Find the district office")}</a>
          </div>
          <div className="flex flex-wrap gap-2">
            <SourceTag confidence="official" label={NLASO_HELPLINE_PAGE.label} url={NLASO_HELPLINE_PAGE.url} checked={NLASO_HELPLINE_PAGE.checked} />
            <SourceTag confidence="official" label={NLASO_DISTRICT_OFFICES.label} url={NLASO_DISTRICT_OFFICES.url} checked={NLASO_DISTRICT_OFFICES.checked} />
          </div>
        </div>
        <button type="button" onClick={() => { setSaved(null); setStep(0); setStory(""); setOther({ name: "", relation: "", address: "" }); setDocuments([]); setSubcategoryId(""); }} className="kp-btn-ghost inline-flex min-h-[44px] items-center px-4 text-[14.5px] print:hidden">{T("আরেকটি খসড়া", "Another draft")}</button>
      </section>
    );
  }

  // ---------------- wizard ----------------
  return (
    <section aria-labelledby="lg-apply-h" className="lg-card space-y-5" data-testid="apply-wizard" data-step={step}>
      <div>
        <p className="kp-eyebrow">{T(`ধাপ ${["১", "২", "৩", "৪", "৫"][step]} / ৫`, `Step ${step + 1} of 5`)}</p>
        <h2 id="lg-apply-h" className="mt-1 text-[clamp(21px,3vw,27px)] font-semibold leading-tight text-slate-900">{bn ? STEPS[step].bn : STEPS[step].en}</h2>
        <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label={T("ধাপগুলো", "Steps")}>
          {STEPS.map((s, i) => (
            <li key={s.en} className="min-w-0">
              <span className={`block h-1.5 rounded-full transition-colors duration-300 ${i <= step ? "bg-indigo-700" : "bg-slate-200"}`} aria-hidden />
              <span className={`mt-1 hidden truncate text-[12.5px] sm:block ${i === step ? "font-bold text-slate-900" : "text-slate-500"}`}>{bn ? s.bn : s.en}</span>
            </li>
          ))}
        </ol>
      </div>

      <div key={step} className="motion-safe:animate-rise-in space-y-4">
        {step === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>{T("আপনার নাম (ইচ্ছা হলে)", "Your name (optional)")}<input value={applicant.name} maxLength={80} onChange={(e) => setApplicant({ ...applicant, name: e.target.value })} className={input} autoComplete="name" data-testid="apply-name" /></label>
              <label className={label}>{T("মোবাইল নম্বর (ইচ্ছা হলে)", "Mobile number (optional)")}<input value={applicant.phone} inputMode="tel" maxLength={16} onChange={(e) => setApplicant({ ...applicant, phone: e.target.value })} className={input} autoComplete="tel" />
                {phoneCheck && !phoneCheck.valid && <span className="mt-1 block text-[13.5px] font-normal text-red-700">{phoneCheck.reasonBn}</span>}
              </label>
              <label className={label}>{T("জেলা", "District")}
                <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} className={input} data-testid="apply-district">
                  <option value="">{T("বেছে নিন", "Choose")}</option>
                  {[...BD_DISTRICTS].sort((a, b) => a.bn.localeCompare(b.bn, "bn")).map((d) => <option key={d.en} value={d.en}>{bn ? d.bn : d.en}</option>)}
                </select>
              </label>
              <div>
                <span className={label}>{T("আপনি", "You are")}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {([["female", "নারী", "Woman"], ["male", "পুরুষ", "Man"], ["other", "অন্যান্য", "Other"]] as const).map(([v, b, e]) => (
                    <button key={v} type="button" aria-pressed={applicant.gender === v} onClick={() => setApplicant({ ...applicant, gender: applicant.gender === v ? "" : v })} className={`kp-chip !h-10 !text-[14px] font-semibold ${applicant.gender === v ? "kp-chip-on" : ""}`}>{T(b, e)}</button>
                  ))}
                </span>
              </div>
            </div>
            <ul className="space-y-2">
              {([["cannotAffordLawyer", "আইনজীবীর খরচ দিতে পারবেন না?", "You cannot afford a lawyer?"], ["isChild", "যার জন্য আবেদন, সে কি শিশু?", "Is the applicant a child?"], ["hasDisability", "কোনো প্রতিবন্ধিতা আছে?", "Any disability?"]] as const).map(([k, b, e]) => (
                <li key={k} className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2">
                  <span className="text-[15px] text-slate-800">{T(b, e)}</span>
                  {triButtons(applicant[k], (v) => setApplicant({ ...applicant, [k]: v }), T(b, e))}
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <fieldset>
              <legend className={label}>{T("সমস্যার ধরন", "Type of problem")}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PROBLEM_CATEGORIES.map((c) => (
                  <button key={c.id} type="button" aria-pressed={categoryId === c.id} data-category={c.id} onClick={() => { setCategoryId(c.id); setSubcategoryId(""); }}
                    className={`min-h-[52px] rounded-xl border px-3 py-2 text-left text-[15px] leading-snug transition-colors ${categoryId === c.id ? "border-indigo-700 bg-indigo-50 font-semibold text-indigo-950" : "border-slate-200 bg-white text-slate-800 hover:border-indigo-300"}`}>
                    {bn ? c.bn : c.en}
                  </button>
                ))}
              </div>
            </fieldset>
            {subs.length > 0 && (
              <fieldset>
                <legend className={label}>{T("কোনটি আপনার সঙ্গে মেলে?", "Which is closest to yours?")}</legend>
                <div className="mt-2 grid gap-2">
                  {subs.map((s) => (
                    <button key={s.id} type="button" aria-pressed={subcategoryId === s.id} onClick={() => setSubcategoryId(subcategoryId === s.id ? "" : s.id)}
                      className={`min-h-[48px] rounded-xl border px-3 py-2 text-left text-[14.5px] leading-snug ${subcategoryId === s.id ? "border-indigo-700 bg-indigo-50 font-semibold text-indigo-950" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"}`}>
                      {bn ? s.bn : s.en}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <label className={label}>{T("কী হয়েছে, নিজের ভাষায় লিখুন", "What happened, in your own words")}
              <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={5} maxLength={1800} className={`${input} leading-[1.7]`} data-testid="apply-story"
                placeholder={T("কবে, কোথায়, কে জড়িত, এখন কী অবস্থা…", "When, where, who is involved, how things stand now…")} />
              <span className="mt-1 block text-[13px] font-normal text-slate-500">{T("অন্তত এক-দুই লাইন লিখুন।", "Write at least a line or two.")}</span>
            </label>
            {advice && (
              <div aria-live="polite" data-testid="apply-severity" data-tone={advice.tone} className={`flex gap-3 rounded-2xl border-2 p-4 ${ADVICE_TONE[advice.tone]}`}>
                <ShieldAlert size={22} className="mt-0.5 shrink-0" aria-hidden />
                <div className="space-y-2">
                  <p className="text-[15.5px] font-bold leading-snug">{bn ? advice.bn : advice.en}</p>
                  <div className="flex flex-wrap gap-2">
                    {advice.call.map((id) => HELPLINES.find((h) => h.id === id)).filter(Boolean).map((h) => (
                      <a key={h!.id} href={`tel:${h!.number}`} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/80 px-3 text-[14.5px] font-bold"><Phone size={16} aria-hidden /> {h!.number} · {bn ? h!.bn : h!.en}</a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{T("যার বিরুদ্ধে বা যার সঙ্গে বিরোধ — জানা থাকলে লিখুন। না জানলে ফাঁকা রাখুন।", "Who the dispute is with — if you know. Leave it blank if not.")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>{T("নাম", "Name")}<input value={other.name} maxLength={80} onChange={(e) => setOther({ ...other, name: e.target.value })} className={input} /></label>
              <label className={label}>{T("আপনার সঙ্গে সম্পর্ক", "Relation to you")}<input value={other.relation} maxLength={60} onChange={(e) => setOther({ ...other, relation: e.target.value })} placeholder={T("যেমন: স্বামী, বাড়িওয়ালা, প্রতিবেশী", "e.g. husband, landlord, neighbour")} className={input} /></label>
              <label className={`${label} sm:col-span-2`}>{T("ঠিকানা", "Address")}<input value={other.address} maxLength={160} onChange={(e) => setOther({ ...other, address: e.target.value })} className={input} /></label>
            </div>
          </div>
        )}

        {step === 3 && <DocumentChecklist lang={lang} categoryId={categoryId || null} value={documents} onChange={setDocuments} />}

        {step === 4 && (
          <div className="space-y-3" data-testid="apply-review">
            <p className="max-w-[62ch] text-[15px] leading-relaxed text-slate-700">{T("নিচের খসড়াটি পড়ে দেখুন। ঠিক থাকলে সংরক্ষণ করুন — শুধু এই ফোনে থাকবে, কোথাও পাঠানো হবে না।", "Read the draft below. If it is right, save it — it stays on this phone only and is not sent anywhere.")}</p>
            {issues.length > 0 ? (
              <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[14.5px] text-amber-950">{issues.map((i) => <li key={i}>• {i}</li>)}</ul>
            ) : (
              <pre tabIndex={0} className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-sans text-[14.5px] leading-[1.7] text-slate-900">{preview}</pre>
            )}
            <p className="text-[13.5px] text-slate-600">{bn ? NOT_LEGAL_ADVICE_BN : NOT_LEGAL_ADVICE_EN}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="kp-btn-ghost inline-flex min-h-[48px] items-center gap-2 px-4 text-[15px] disabled:opacity-40"><ArrowLeft size={18} aria-hidden /> {T("আগের ধাপ", "Back")}</button>
        {step < STEPS.length - 1 ? (
          <button type="button" data-testid="apply-next" onClick={() => setStep((s) => s + 1)} disabled={!stepOk[step]} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 px-5 text-[15px] disabled:opacity-50">{T("পরের ধাপ", "Next")} <ArrowRight size={18} aria-hidden /></button>
        ) : (
          <button type="button" data-testid="apply-save" onClick={save} disabled={!stepOk[4]} className="kp-btn-primary inline-flex min-h-[48px] items-center gap-2 px-5 text-[15px] disabled:opacity-50"><Check size={18} aria-hidden /> {T("ঠিক আছে, খসড়া সংরক্ষণ করুন", "Looks right — save the draft")}</button>
        )}
      </div>
      {files.length > 0 && <p className="text-[13.5px] text-slate-600">{T(`এই ফোনে আগের ${files.length.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)])}টি খসড়া আছে — `, `${files.length} earlier draft(s) on this phone — `)}<Link href="/legal/track" className="font-semibold text-indigo-800 underline">{T("আমার কেস", "My case")}</Link></p>}
    </section>
  );
}
