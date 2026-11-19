"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { FX_FALLBACK } from "@/lib/data";
import { fmtBdt, splitMilestoneUsd } from "@/lib/finops";
import { downloadText, storageKey, usePersistentState } from "@/lib/clientStore";
import { allDayIcs, isIsoDate } from "@/lib/ics";
import { CalendarPlus } from "lucide-react";
import { playClick, playSuccessChime } from "@/lib/sound";
import {
  type ChuktiInvoice,
  type InvoiceMilestone,
  SAMPLE_CHUKTI_PRESETS,
  generateClause4Text,
  calculateInvoiceFinOps,
  NBR_ITES_DECLARATION,
} from "@/lib/chuktiguard";
import {
  buildDncrpPetition,
  buildFreelancerPaymentDemand,
  type DncrpPetitionInput,
  type FreelancerDemandInput,
} from "@/lib/contract";
import {
  ShieldCheck,
  FileText,
  Plus,
  Trash2,
  Copy,
  Printer,
  Sparkles,
  Download,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Percent,
  Check,
  ExternalLink,
  Lock,
} from "lucide-react";

export default function ChuktiGuardPage() {
  const [invoice, setInvoice] = useState<ChuktiInvoice>(SAMPLE_CHUKTI_PRESETS[0]);
  const [usdBdt, setUsdBdt] = useState(FX_FALLBACK.usdBdt);
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "clause4" | "dispute">("preview");
  // Deep link: /chuktiguard#dncrp opens the consumer-complaint (DNCRP) studio.
  useEffect(() => { if (window.location.hash === "#dncrp") setActiveTab("dispute"); }, []);
  const [clauseLang, setClauseLang] = useState<"en" | "bn">("en");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedClause, setCopiedClause] = useState(false);
  const [copiedDispute, setCopiedDispute] = useState(false);

  // Dispute Protection State
  const [disputeType, setDisputeType] = useState<"dncrp" | "freelancer">("dncrp");
  const [disputeLang, setDisputeLang] = useState<"bn" | "en">("bn");
  const [dncrpInput, setDncrpInput] = useState<DncrpPetitionInput>({
    complainantName: "আব্দুর রহিম",
    complainantPhone: "01711223344",
    complainantAddress: "মিরপুর-১০, ঢাকা-১২১৬",
    complainantNid: "19942691234567890",
    accusedParty: "অনলাইন গ্যাজেট শপ বিডি",
    accusedPhone: "01899887766",
    accusedAddress: "ফেসবুক পেজ / শপ নং ৪, উত্তরা, ঢাকা",
    transactionDate: "2026-11-05",
    transactionChannel: "bKash",
    transactionTrxId: "BK992817AX",
    claimedAmountBdt: 8500,
    productOrService: "ওয়্যারলেস মেকানিক্যাল কিবোর্ড ও আনুষঙ্গিক সেবা",
    disputeSummary: "বিকাশে সম্পূর্ণ মূল্য অগ্রিম পরিশোধ করা সত্ত্বেও বিক্রেতা পণ্য ডেলিভারি দেয়নি এবং যোগাযোগের নম্বর ব্লক করে দিয়েছে।",
    remedySought: "full_refund",
  });

  const [freelancerDemand, setFreelancerDemand] = useState<FreelancerDemandInput>({
    freelancerName: "তানভীর হাসান",
    freelancerEmail: "tanvir@kormopath.org",
    freelancerCountry: "Bangladesh",
    clientName: "John Smith",
    clientCompany: "Apex Software LLC",
    clientCountry: "United States",
    projectTitle: "Next.js SaaS Dashboard & API",
    invoiceNumber: "INV-2026-089",
    invoiceDate: "2026-11-01",
    dueDate: "2026-11-08",
    amountOwed: 2500,
    currency: "USD",
    milestoneDelivered: "Milestone 2: Production API & Webhook Integration",
    curePeriodDays: 7,
  });
  type ServicePack = { id: string; title: string; scope: string; timeline: string; amountUsd: number };
  const sanitizePacks = (v: unknown): ServicePack[] | null => Array.isArray(v) ? v.filter((p): p is ServicePack => !!p && typeof p.id === "string" && typeof p.title === "string" && typeof p.scope === "string" && typeof p.timeline === "string" && Number.isFinite(p.amountUsd) && p.amountUsd > 0 && p.amountUsd < 1_000_000).slice(0, 30) : null;
  const [packs, setPacks] = usePersistentState<ServicePack[]>(storageKey("chuktiguard", "servicePackages.v1"), [], sanitizePacks);
  const [packTitle, setPackTitle] = useState(""); const [packScope, setPackScope] = useState(""); const [packTimeline, setPackTimeline] = useState(""); const [packAmount, setPackAmount] = useState("");
  const [packError, setPackError] = useState("");
  const savePack = () => {
    setPackError("");
    const amount = Number(packAmount);
    const deliverables = packScope.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (!packTitle.trim() || !deliverables.length) { setPackError("Enter a package name and at least one deliverable."); return; }
    try { splitMilestoneUsd(amount, deliverables.length); }
    catch (error) { setPackError(error instanceof Error ? error.message : "Check package details."); return; }
    setPacks((all) => [{ id: crypto.randomUUID(), title: packTitle.trim(), scope: packScope.trim(), timeline: packTimeline.trim(), amountUsd: amount }, ...all].slice(0, 30));
    setPackTitle(""); setPackScope(""); setPackTimeline(""); setPackAmount("");
  };
  const applyPack = (pack: ServicePack) => {
    setPackError("");
    const deliverables = pack.scope.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    try {
      const amounts = splitMilestoneUsd(pack.amountUsd, deliverables.length);
      const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      setInvoice({ ...invoice, serviceCategory: pack.title, milestones: deliverables.map((title, index) => ({ id: `pack-${Date.now()}-${index}`, title, amountUsd: amounts[index], dueDate: due, status: "pending" })) });
      setActiveTab("editor");
    } catch (error) { setPackError(error instanceof Error ? error.message : "Check package details."); }
  };

  // FinOps calculation
  const finops = useMemo(() => {
    return calculateInvoiceFinOps(invoice.milestones, usdBdt, invoice.paymentRail);
  }, [invoice.milestones, usdBdt, invoice.paymentRail]);

  // Clause 4 generator
  const clause4 = useMemo(() => {
    return generateClause4Text({
      freelancerName: invoice.contractor.name,
      clientCompany: invoice.client.company || invoice.client.name,
      gracePeriodHours: 72,
    });
  }, [invoice.contractor.name, invoice.client.company, invoice.client.name]);

  // Dispute notice generator (DNCRP & Payment Demand)
  const disputeNotice = useMemo(() => {
    return disputeType === "dncrp"
      ? buildDncrpPetition(dncrpInput, disputeLang)
      : buildFreelancerPaymentDemand(freelancerDemand, disputeLang);
  }, [disputeType, dncrpInput, freelancerDemand, disputeLang]);

  // Handlers for milestones
  const handleAddMilestone = () => {
    playClick();
    const newMilestone: InvoiceMilestone = {
      id: `m-${Date.now()}`,
      title: "New Deliverable / Feature Sprint",
      amountUsd: 500,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      status: "pending",
    };
    setInvoice({
      ...invoice,
      milestones: [...invoice.milestones, newMilestone],
    });
  };

  const handleUpdateMilestone = (id: string, updates: Partial<InvoiceMilestone>) => {
    setInvoice({
      ...invoice,
      milestones: invoice.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  };

  const handleRemoveMilestone = (id: string) => {
    playClick();
    if (invoice.milestones.length <= 1) return;
    setInvoice({
      ...invoice,
      milestones: invoice.milestones.filter((m) => m.id !== id),
    });
  };

  const handleCopyClause4 = () => {
    playSuccessChime();
    navigator.clipboard.writeText(clauseLang === "en" ? clause4.en : clause4.bn);
    setCopiedClause(true);
    setTimeout(() => setCopiedClause(false), 2000);
  };

  const handleCopyShareLink = () => {
    playSuccessChime();
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    playClick();
    window.print();
  };

  const handleSelectPreset = (index: number) => {
    playClick();
    setInvoice(SAMPLE_CHUKTI_PRESETS[index]);
  };

  // Milestone completion stats
  const completedMilestones = invoice.milestones.filter(
    (m) => m.status === "approved" || m.status === "paid"
  ).length;
  const progressPct =
    invoice.milestones.length > 0
      ? Math.round((completedMilestones / invoice.milestones.length) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased print:bg-white print:text-black">
      {/* Top Navbar */}
      <AppHeader
        appId="chuktiguard"
        href="/chuktiguard"
        name="ChuktiGuard"
        taglineBn="বি২বি ইনভয়েস ও ইন্টারনেট ব্ল্যাকআউট শিল্ড"
        taglineEn="B2B Invoices & Contract Studio"
        icon={<ShieldCheck size={22} />}
        accent="from-indigo-600 to-blue-700"
        right={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-mono text-slate-700">
              <span className="text-slate-400">$1 =</span>
              <span className="font-bold text-indigo-700">৳{usdBdt.toFixed(1)}</span>
            </div>

            <button
              onClick={() => {
                // Only the due dates entered on this invoice; paid milestones are skipped.
                const events = invoice.milestones
                  .filter((m) => m.status !== "paid" && isIsoDate(m.dueDate))
                  .map((m) => ({
                    uid: `${invoice.invoiceNumber}-${m.id}`,
                    date: m.dueDate,
                    title: `${m.title} · $${m.amountUsd} · ${invoice.client.company || invoice.client.name}`,
                    description: `Invoice ${invoice.invoiceNumber}. Due date as entered in ChuktiGuard.`,
                  }));
                if (!events.length) { alert("ক্যালেন্ডারে যোগ করার মতো কোনো অপরিশোধিত মাইলস্টোনের তারিখ নেই।"); return; }
                downloadText(`chuktiguard-${invoice.invoiceNumber || "invoice"}-due-dates.ics`, allDayIcs(events, "ChuktiGuard"), "text/calendar;charset=utf-8");
              }}
              aria-label="Add unpaid milestone due dates to your calendar"
              title="অপরিশোধিত মাইলস্টোনের তারিখ ক্যালেন্ডারে (.ics)"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <CalendarPlus size={15} />
              <span className="hidden md:inline">ক্যালেন্ডার</span>
            </button>

            <button
              onClick={handlePrint}
              aria-label="Print invoice or save PDF"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Printer size={15} />
              <span className="hidden md:inline">Print / PDF</span>
            </button>

            <button
              onClick={handleCopyShareLink}
              aria-label={copiedLink ? "Copied link" : "Share link"}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors shadow-xs"
            >
              {copiedLink ? <Check size={15} /> : <Copy size={15} />}
              <span className="hidden sm:inline">{copiedLink ? "Copied Link!" : "Share Link"}</span>
            </button>
          </div>
        }
      />

      {/* Hero / Action Bar */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-indigo-50/70 via-white to-white px-4 py-6 sm:px-6 print:hidden">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-0.5 text-[12px] font-bold text-indigo-800 mb-2">
                <Sparkles size={14} /> Bilingual contract templates · fixed clauses
              </div>
              <h1 className="text-[26px] sm:text-[34px] font-extrabold tracking-tight text-slate-900 leading-tight">
                Client Invoices &amp; Contract Studio
              </h1>
              <p className="mt-1 text-[14px] text-slate-600 max-w-2xl">
                Build milestone invoices, compare estimated payout costs and fill bilingual contract templates. Set your own scope, dates and fees before sharing with a client.
              </p>
            </div>

            {/* Presets & Tab Switcher */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "preview"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Document View
                </button>
                <button
                  onClick={() => setActiveTab("editor")}
                  className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "editor"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Editor &amp; Milestones
                </button>
                <button
                  onClick={() => setActiveTab("clause4")}
                  className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "clause4"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Clause 4 Shield
                </button>
                <button
                  onClick={() => setActiveTab("dispute")}
                  className={`inline-flex min-h-[44px] items-center rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "dispute"
                      ? "bg-white text-rose-700 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ভোক্তা বিরোধ (DNCRP)
                </button>
              </div>

              {/* Sample switcher */}
              <div className="flex items-center gap-1 text-[12px]">
                <span className="text-slate-500 font-medium">Presets:</span>
                <button
                  onClick={() => handleSelectPreset(0)}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Dev Sprint
                </button>
                <button
                  onClick={() => handleSelectPreset(1)}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  UI/UX Design
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Invoiced</span>
              <div className="text-[20px] font-extrabold text-slate-900">${finops.totalUsd}</div>
              <span className="text-[11px] text-slate-500 font-mono">≈ {finops.formattedGross}</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">+2.5% Cash Incentive</span>
              <div className="text-[20px] font-extrabold text-emerald-800">+{finops.formattedIncentive}</div>
              <span className="text-[12px] text-emerald-700">As reported · your bank decides</span>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Net Retained Take-Home</span>
              <div className="text-[20px] font-extrabold text-indigo-900">{finops.formattedNet}</div>
              <span className="text-[11px] text-indigo-600 font-semibold">{finops.keptPct}% kept ({invoice.paymentRail.toUpperCase()})</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Milestone Progress</span>
              <div className="text-[20px] font-extrabold text-slate-900">{progressPct}%</div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 rounded-2xl border border-indigo-200 bg-white p-5 print:hidden">
          <h2 className="text-xl font-extrabold">Service packages → client-ready milestones</h2>
          <p className="mt-1 text-sm text-slate-600">আপনার নিজের scope, সময় ও fee দিয়ে package বানান। নির্বাচিত package invoice editor-এ milestone হিসেবে যাবে; মূল্য হিসাব বা নির্ধারণ করবে না।</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={packTitle} onChange={(e)=>setPackTitle(e.target.value)} placeholder="Package name" aria-label="Package name" maxLength={160} className="min-w-0 rounded-lg border px-3 py-2"/><input value={packTimeline} onChange={(e)=>setPackTimeline(e.target.value)} placeholder="সময়সীমা (আপনার শর্ত)" aria-label="Package timeline" maxLength={160} className="min-w-0 rounded-lg border px-3 py-2"/><textarea value={packScope} onChange={(e)=>setPackScope(e.target.value)} placeholder="Deliverable লিখুন, প্রতি লাইনে একটি" aria-label="Package deliverables" maxLength={5000} className="min-w-0 min-h-20 rounded-lg border px-3 py-2 sm:col-span-2"/><div className="flex gap-2"><input type="number" min="0.01" step="0.01" value={packAmount} onChange={(e)=>setPackAmount(e.target.value)} placeholder="আপনার মোট fee (USD)" aria-label="Package fee in USD" className="min-w-0 w-full rounded-lg border px-3 py-2"/><button onClick={savePack} className="rounded-lg bg-indigo-700 px-4 font-bold text-white">Save package</button></div></div>
          {packError && <p role="alert" className="mt-2 text-sm text-red-700">{packError}</p>}
          {!!packs.length && <div className="mt-3 grid gap-2 sm:grid-cols-2">{packs.map((p)=><article key={p.id} className="flex min-w-0 items-start justify-between gap-2 rounded-xl border p-3"><div className="min-w-0 break-words"><strong>{p.title}</strong><p className="text-sm text-slate-600">{p.timeline} · ${p.amountUsd.toFixed(2)}</p><p className="whitespace-pre-wrap text-xs text-slate-500">{p.scope}</p><button onClick={()=>applyPack(p)} className="mt-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-800">Use in invoice editor</button></div><button aria-label="Delete package" onClick={()=>setPacks((all)=>all.filter((x)=>x.id!==p.id))} className="text-xs text-slate-500">Delete</button></article>)}</div>}
          <p className="mt-2 text-xs text-slate-500">Packages stay in this browser. Deliverable amounts are split evenly from the total you entered; edit milestone amounts before sharing. Draft due dates default to seven days from today; set the agreed dates in the editor.</p>
        </section>
        {/* TAB 1: DOCUMENT PREVIEW */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            {/* The Formal Document Sheet */}
            <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-md print:border-none print:shadow-none print:p-0">
              {/* Document Header */}
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                      <ShieldCheck size={20} />
                    </span>
                    <span className="text-[24px] font-black tracking-tight text-slate-900">
                      {invoice.contractor.organization || invoice.contractor.name}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-600 font-medium">{invoice.contractor.designation}</p>
                  <p className="text-[12px] text-slate-500">{invoice.contractor.city}, {invoice.contractor.country}</p>
                  {invoice.contractor.tin && (
                    <p className="text-[11px] font-mono text-slate-500">TIN: {invoice.contractor.tin}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1 text-[13px] font-extrabold tracking-wider text-indigo-700 uppercase">
                    Commercial B2B Invoice
                  </span>
                  <div className="mt-2 text-[18px] font-mono font-bold text-slate-900">
                    {invoice.invoiceNumber}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500 space-y-0.5">
                    <div>Issued: <strong className="text-slate-700">{invoice.date}</strong></div>
                    <div>Payment Due: <strong className="text-indigo-700">{invoice.dueDate}</strong></div>
                  </div>
                </div>
              </div>

              {/* Bill From / Bill To Grid */}
              <div className="grid gap-6 sm:grid-cols-2 py-6 border-b border-slate-200">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Billed From (Contractor / Supplier):
                  </span>
                  <div className="font-bold text-slate-900 text-[15px]">{invoice.contractor.name}</div>
                  <div className="text-[13px] text-slate-600">{invoice.contractor.email}</div>
                  <div className="text-[13px] text-slate-600">{invoice.contractor.phone}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Billed To (Client / Entity):
                  </span>
                  <div className="font-bold text-slate-900 text-[15px]">{invoice.client.company || invoice.client.name}</div>
                  <div className="text-[13px] text-slate-600">Attn: {invoice.client.name}</div>
                  <div className="text-[13px] text-slate-600">{invoice.client.email}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">{invoice.client.address}</div>
                </div>
              </div>

              {/* Scope & Service */}
              <div className="py-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Service Scope / Deliverable Category:
                </span>
                <span className="text-[14px] font-semibold text-slate-800">
                  {invoice.serviceCategory}
                </span>
              </div>

              {/* Milestones Table */}
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3">Milestone / Scope Item</th>
                      <th className="py-3 px-3">Target Due</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.milestones.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/40">
                        <td className="py-3 px-3 font-medium text-slate-900">
                          <span className="font-mono text-slate-400 mr-2">0{idx + 1}.</span>
                          {m.title}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[12px]">
                          {m.dueDate}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              m.status === "paid" || m.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : m.status === "delivered"
                                ? "bg-blue-100 text-blue-800"
                                : m.status === "in_progress"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {m.status === "paid" && <Check size={11} />}
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ${m.amountUsd.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals Calculation Box */}
              <div className="mt-6 border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-[12px] text-slate-500 max-w-sm">
                  {invoice.notes && <p className="italic">Note: {invoice.notes}</p>}
                </div>

                <div className="w-full sm:w-72 space-y-2 text-[13px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal USD:</span>
                    <span className="font-mono font-semibold">${finops.totalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Applicable VAT / Tax:</span>
                    <span className="font-mono font-semibold text-emerald-600">0.00% (Export Exempt)</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-[16px] font-extrabold text-slate-900">
                    <span>Total Invoiced:</span>
                    <span className="font-mono text-indigo-700">${finops.totalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[12px] text-slate-500 font-mono">
                    <span>Converted @ ৳{usdBdt.toFixed(1)}:</span>
                    <span>{finops.formattedGross}</span>
                  </div>
                </div>
              </div>

              {/* Wire Details & Remittance Routing Box */}
              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={16} className="text-indigo-600" />
                  <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">
                    Official Remittance &amp; Wire Payment Instructions:
                  </span>
                </div>

                {invoice.paymentRail === "swift" && (
                  <div className="grid gap-3 sm:grid-cols-2 text-[12px]">
                    <div>
                      <span className="text-slate-400 block font-mono">Beneficiary Bank:</span>
                      <strong className="text-slate-800">{invoice.paymentDetails.bankName || "BRAC Bank PLC"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Account Holder:</span>
                      <strong className="text-slate-800">{invoice.paymentDetails.accountHolder || invoice.contractor.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">SWIFT / BIC Code:</span>
                      <strong className="text-slate-800 font-mono">{invoice.paymentDetails.swiftBic || "BRAKBDDH"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Account Number:</span>
                      <strong className="text-slate-800 font-mono">{invoice.paymentDetails.accountNumber || "1501204928172001"}</strong>
                    </div>
                  </div>
                )}

                {invoice.paymentRail === "payoneer" && (
                  <div className="text-[12px]">
                    <span className="text-slate-400 block font-mono">Payoneer Receiving Email:</span>
                    <strong className="text-slate-800 font-mono">{invoice.paymentDetails.payoneerEmail || invoice.contractor.email}</strong>
                  </div>
                )}
              </div>

              {/* Embedded Clause 4 Outage Shield Box */}
              {invoice.includeClause4Shield && (
                <div className="mt-6 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 p-5">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-[13px] mb-2">
                    <ShieldCheck size={18} className="text-indigo-600" />
                    <span>Clause 4: Telecommunication &amp; Infrastructure Blackout Shield (Force Majeure)</span>
                  </div>
                  <p className="text-[12px] text-slate-700 leading-relaxed">
                    Under mutual contractual covenants, any involuntary national or ISP-level telecom blackout officially logged by global internet telemetry (Cloudflare Radar / NetBlocks) grants an automatic <strong>72-hour delivery grace buffer</strong> upon connection restoration. Delays during verified blackouts do not constitute default or cause escrow cancellation.
                  </p>
                </div>
              )}

              {/* Tax note (information, not a statutory notice): sourced text from lib/chuktiguard.ts */}
              {invoice.includeNbrExemption && (
                <div className="mt-6 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-[13px] mb-1">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Tax note (information) · কর বিষয়ক তথ্য</span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{NBR_ITES_DECLARATION.en}</p>
                </div>
              )}

              {/* Signature Block */}
              <div className="mt-10 pt-6 border-t border-slate-200 grid sm:grid-cols-2 gap-8 text-[12px]">
                <div>
                  <div className="font-mono text-slate-400 mb-1">Authorized Contractor Signature:</div>
                  <div className="font-serif italic text-[18px] text-slate-800 font-bold border-b border-slate-300 pb-1 w-48">
                    {invoice.contractor.name}
                  </div>
                  <div className="text-slate-500 mt-1 font-mono">{invoice.contractor.designation}</div>
                </div>

                <div>
                  <div className="font-mono text-slate-400 mb-1">Client Acceptance / Authorization:</div>
                  <div className="border-b border-slate-300 pb-1 w-48 text-slate-400 italic">
                    Signed electronically on handoff
                  </div>
                  <div className="text-slate-500 mt-1 font-mono">{invoice.client.company}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVOICE & MILESTONE EDITOR */}
        {activeTab === "editor" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-[18px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-indigo-600" />
                Invoice Metadata &amp; Parties
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-[12px] font-bold text-slate-600 block mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoice.invoiceNumber}
                    onChange={(e) => setInvoice({ ...invoice, invoiceNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-600 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={invoice.date}
                    onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-slate-600 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={invoice.dueDate}
                    onChange={(e) => setInvoice({ ...invoice, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contractor & Client Details */}
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {/* Contractor */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <span className="text-[12px] font-bold text-indigo-700 block uppercase">Contractor / You</span>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={invoice.contractor.name}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        contractor: { ...invoice.contractor, name: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                  <input
                    type="text"
                    placeholder="Designation / Role"
                    value={invoice.contractor.designation}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        contractor: { ...invoice.contractor, designation: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={invoice.contractor.email}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        contractor: { ...invoice.contractor, email: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={`${invoice.contractor.city}, ${invoice.contractor.country}`}
                    onChange={(e) => {
                      const [city, country] = e.target.value.split(",");
                      setInvoice({
                        ...invoice,
                        contractor: {
                          ...invoice.contractor,
                          city: city?.trim() || "",
                          country: country?.trim() || "Bangladesh",
                        },
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                </div>

                {/* Client */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <span className="text-[12px] font-bold text-slate-700 block uppercase">Client / Company</span>
                  <input
                    type="text"
                    placeholder="Client Company Name"
                    value={invoice.client.company}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        client: { ...invoice.client, company: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person Name"
                    value={invoice.client.name}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        client: { ...invoice.client, name: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                  <input
                    type="email"
                    placeholder="Billing Email"
                    value={invoice.client.email}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        client: { ...invoice.client, email: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                  <input
                    type="text"
                    placeholder="Client Address & Country"
                    value={invoice.client.address}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        client: { ...invoice.client, address: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Milestones Editor */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[18px] font-bold text-slate-900">Project Sprints &amp; Milestones</h3>
                  <p className="text-[12px] text-slate-500">Each milestone generates a clear deliverable obligation.</p>
                </div>
                <button
                  onClick={handleAddMilestone}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={16} /> Add Milestone
                </button>
              </div>

              <div className="space-y-3">
                {invoice.milestones.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                  >
                    <span className="font-mono text-slate-400 text-[12px] font-bold">#{idx + 1}</span>
                    <input
                      type="text"
                      value={m.title}
                      onChange={(e) => handleUpdateMilestone(m.id, { title: e.target.value })}
                      placeholder="Milestone Scope Title"
                      aria-label={`Milestone ${idx + 1} title`}
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] w-full"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] text-slate-400 font-mono">$</span>
                        <input
                          type="number"
                          value={m.amountUsd}
                          min="0" step="0.01" aria-label={`Milestone ${idx + 1} amount in USD`}
                          onChange={(e) => handleUpdateMilestone(m.id, { amountUsd: Number(e.target.value) || 0 })}
                          className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] font-mono font-bold"
                        />
                      </div>

                      <select
                        value={m.status}
                        aria-label={`Milestone ${idx + 1} status`}
                        onChange={(e) =>
                          handleUpdateMilestone(m.id, {
                            status: e.target.value as InvoiceMilestone["status"],
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[12px] font-semibold"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="delivered">Delivered</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                      </select>

                      <button
                        aria-label={`Remove milestone ${idx + 1}`}
                        onClick={() => handleRemoveMilestone(m.id)}
                        disabled={invoice.milestones.length <= 1}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Rails & Compliance Toggles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-[18px] font-bold text-slate-900 mb-4">Payment Rail &amp; Statutory Protection</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[12px] font-bold text-slate-600 block mb-1">Receiving Channel</label>
                  <select
                    value={invoice.paymentRail}
                    onChange={(e) =>
                      setInvoice({
                        ...invoice,
                        paymentRail: e.target.value as ChuktiInvoice["paymentRail"],
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[14px] font-semibold"
                  >
                    <option value="swift">Direct Bank SWIFT Wire (Incentive estimate)</option>
                    <option value="payoneer">Payoneer Direct Billing Account</option>
                    <option value="wise">Wise Multi-Currency Receiving Account</option>
                    <option value="bkash_remit">Direct MFS Inward Remittance (bKash)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoice.includeClause4Shield}
                      onChange={(e) => setInvoice({ ...invoice, includeClause4Shield: e.target.checked })}
                      className="h-4 w-4 rounded accent-indigo-600"
                    />
                    <span>Include Clause 4 Outage Shield (72h Force Majeure Buffer)</span>
                  </label>

                  <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invoice.includeNbrExemption}
                      onChange={(e) => setInvoice({ ...invoice, includeNbrExemption: e.target.checked })}
                      className="h-4 w-4 rounded accent-indigo-600"
                    />
                    <span>Include a tax note (information, not tax advice)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLAUSE 4 STANDALONE SHIELD */}
        {activeTab === "clause4" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                    <ShieldCheck size={26} />
                  </span>
                  <div>
                    <h2 className="text-[20px] font-extrabold text-slate-900 leading-tight">
                      Clause 4: Blackout Shield Addendum
                    </h2>
                    <span className="text-[12px] text-slate-500">
                      Standard Force Majeure addendum ready to paste into any direct agreement.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[12px] font-bold">
                    <button
                      onClick={() => setClauseLang("en")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        clauseLang === "en" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setClauseLang("bn")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        clauseLang === "bn" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>

                  <button
                    onClick={handleCopyClause4}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-[13px] font-bold text-white hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    {copiedClause ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedClause ? "Copied!" : "Copy Clause"}</span>
                  </button>
                </div>
              </div>

              {/* Legal Text Display */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 font-mono text-[13px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                {clauseLang === "en" ? clause4.en : clause4.bn}
              </div>

              {/* Explanatory notes */}
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-[12px] text-amber-900 space-y-1">
                <strong>Why this is essential for South Asian remote tech contractors:</strong>
                <p>
                  International clients on Upwork/Fiverr often cancel contracts or issue chargebacks if you go offline for 48 hours due to telecom cuts or submarine cable disruptions. Having this clause in your direct B2B master services agreement provides written contractual immunity and establishes an automatic 72-hour delivery buffer without dispute.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DISPUTE & DNCRP COMPLAINT STUDIO */}
        {activeTab === "dispute" && (
          <div className="space-y-6">
            {/* Dispute Studio Header */}
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/60 p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
                    <ShieldCheck size={26} />
                  </span>
                  <div>
                    <h2 className="text-[20px] font-extrabold text-slate-900 leading-tight">
                      ভোক্তা ও ক্লায়েন্ট বিরোধ নিষ্পত্তি স্টুডিও (DNCRP Dispute Studio)
                    </h2>
                    <span className="text-[12.5px] text-slate-600">
                      ভোক্তা অধিকার সংরক্ষণ আইন ২০০৯ (ধারা ৪৫ ও ৫২) এবং চুক্তি আইন ১৮৭২ অনুযায়ী সংবিধিবদ্ধ আইনি অভিযোগপত্র
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Language Selector */}
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[12px] font-bold">
                    <button
                      onClick={() => setDisputeLang("bn")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        disputeLang === "bn" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      বাংলা
                    </button>
                    <button
                      onClick={() => setDisputeLang("en")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        disputeLang === "en" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      English
                    </button>
                  </div>

                  {/* 1-Click Copy */}
                  <button
                    onClick={() => {
                      playClick();
                      const fullText = `${disputeNotice.title}\n${disputeNotice.statutoryReference}\n\n` +
                        disputeNotice.clauses.map((c) => `[${c.heading}]\n${c.body}`).join("\n\n") +
                        `\n\n[Submission Details]\nAuthority: ${disputeNotice.submissionInstructions.authority}\nEmail: ${disputeNotice.submissionInstructions.email}\nHotline: ${disputeNotice.submissionInstructions.hotline}`;
                      navigator.clipboard.writeText(fullText);
                      setCopiedDispute(true);
                      setTimeout(() => setCopiedDispute(false), 2500);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-bold text-white hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    {copiedDispute ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    <span>{copiedDispute ? "কপি হয়েছে!" : "পিটিশন কপি করুন"}</span>
                  </button>

                  {/* Print */}
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-[13px] font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-xs"
                  >
                    <Printer size={16} />
                    <span>প্রিন্ট</span>
                  </button>
                </div>
              </div>

              {/* Dispute Type Switcher */}
              <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-rose-100">
                <button
                  onClick={() => {
                    playClick();
                    setDisputeType("dncrp");
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all ${
                    disputeType === "dncrp"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-rose-50"
                  }`}
                >
                  <span>🏛️ জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তর (DNCRP) অভিযোগ</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">আইন ২০০৯</span>
                </button>

                <button
                  onClick={() => {
                    playClick();
                    setDisputeType("freelancer");
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all ${
                    disputeType === "freelancer"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>⚖️ ক্লায়েন্ট বকেয়া পারিশ্রমিক দাবি নোটিশ</span>
                  <span className="rounded-full bg-slate-200 text-slate-800 px-2 py-0.5 text-[11px]">চুক্তি আইন ১৮৭২</span>
                </button>
              </div>
            </div>

            {/* Split View: Inputs & Live Notice Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Inputs */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[14px] font-bold text-slate-900">
                    {disputeType === "dncrp" ? "অভিযোগ ও লেনদেনের তথ্য" : "বকেয়া বিল ও ক্লায়েন্টের তথ্য"}
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    সরাসরি প্রস্তুত
                  </span>
                </div>

                {disputeType === "dncrp" ? (
                  <div className="space-y-3 text-[13px]">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">অভিযোগকারীর নাম ও মোবাইল</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={dncrpInput.complainantName}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, complainantName: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                          placeholder="আপনার নাম"
                        />
                        <input
                          type="text"
                          value={dncrpInput.complainantPhone}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, complainantPhone: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                          placeholder="মোবাইল নম্বর"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[12px] font-semibold text-slate-700 mb-1">এনআইডি নম্বর (ঐচ্ছিক)</label>
                        <input
                          type="text"
                          value={dncrpInput.complainantNid || ""}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, complainantNid: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                          placeholder="NID নম্বর"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-semibold text-slate-700 mb-1">বর্তমান ঠিকানা</label>
                        <input
                          type="text"
                          value={dncrpInput.complainantAddress}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, complainantAddress: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                          placeholder="ঠিকানা"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">অভিযুক্ত প্রতিষ্ঠান / বিক্রেতার নাম ও নম্বর</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={dncrpInput.accusedParty}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, accusedParty: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                          placeholder="প্রতিষ্ঠানের নাম"
                        />
                        <input
                          type="text"
                          value={dncrpInput.accusedPhone || ""}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, accusedPhone: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                          placeholder="বিক্রেতার ফোন"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                        <select
                          value={dncrpInput.transactionChannel}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, transactionChannel: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                        >
                          <option value="bKash">bKash</option>
                          <option value="Nagad">Nagad</option>
                          <option value="Rocket">Rocket</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">TrxID</label>
                        <input
                          type="text"
                          value={dncrpInput.transactionTrxId}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, transactionTrxId: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-mono"
                          placeholder="TrxID"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">টাকার পরিমাণ (৳)</label>
                        <input
                          type="number"
                          value={dncrpInput.claimedAmountBdt}
                          onChange={(e) => setDncrpInput({ ...dncrpInput, claimedAmountBdt: Number(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">পণ্য বা সেবার বিবরণ</label>
                      <input
                        type="text"
                        value={dncrpInput.productOrService}
                        onChange={(e) => setDncrpInput({ ...dncrpInput, productOrService: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                        placeholder="যেমন: মোবাইল ফোন, কোর্স, কিবোর্ড"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">প্রতারণা বা প্রতিশ্রুত ব্যর্থতার বিবরণ</label>
                      <textarea
                        rows={3}
                        value={dncrpInput.disputeSummary}
                        onChange={(e) => setDncrpInput({ ...dncrpInput, disputeSummary: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 p-2.5 text-[12.5px] leading-relaxed"
                        placeholder="কী ঘটেছিল সংক্ষেপে লিখুন…"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">প্রার্থিত প্রতিকার</label>
                      <select
                        value={dncrpInput.remedySought}
                        onChange={(e) => setDncrpInput({ ...dncrpInput, remedySought: e.target.value as "full_refund" | "compensation" | "delivery" | "action" })}
                        className="w-full rounded-lg border border-slate-200 p-2 text-[12.5px]"
                      >
                        <option value="full_refund">সম্পূর্ণ অর্থ ফেরত (Full Refund)</option>
                        <option value="compensation">ক্ষতিপূরণসহ অর্থ ফেরত (Compensation)</option>
                        <option value="delivery">প্রতিশ্রুত পণ্য/সেবা অবিলম্বে সরবরাহ (Delivery)</option>
                        <option value="action">আইনগত দৃষ্টান্তমূলক শাস্তি ও প্রতিকার</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-[13px]">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">ফ্রিল্যান্সারের নাম ও ইমেইল</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={freelancerDemand.freelancerName}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, freelancerName: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                        />
                        <input
                          type="text"
                          value={freelancerDemand.freelancerEmail}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, freelancerEmail: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">ক্লায়েন্টের নাম ও দেশ</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={freelancerDemand.clientName}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, clientName: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                        />
                        <input
                          type="text"
                          value={freelancerDemand.clientCountry}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, clientCountry: e.target.value })}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">ইনভয়েস নং</label>
                        <input
                          type="text"
                          value={freelancerDemand.invoiceNumber}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, invoiceNumber: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">মুদ্রা</label>
                        <select
                          value={freelancerDemand.currency}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, currency: e.target.value as "USD" | "BDT" })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="BDT">BDT (৳)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">বকেয়া পরিমাণ</label>
                        <input
                          type="number"
                          value={freelancerDemand.amountOwed}
                          onChange={(e) => setFreelancerDemand({ ...freelancerDemand, amountOwed: Number(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[12px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">সরবরাহকৃত মাইলস্টোন / কাজ</label>
                      <input
                        type="text"
                        value={freelancerDemand.milestoneDelivered}
                        onChange={(e) => setFreelancerDemand({ ...freelancerDemand, milestoneDelivered: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">নোটিশের সময়সীমা (দিন)</label>
                      <input
                        type="number"
                        value={freelancerDemand.curePeriodDays}
                        onChange={(e) => setFreelancerDemand({ ...freelancerDemand, curePeriodDays: Number(e.target.value) || 7 })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Printable Legal Notice Preview */}
              <div className="lg:col-span-7 rounded-2xl border-2 border-slate-800 bg-white shadow-md p-6 sm:p-8 space-y-6 print:border-none print:shadow-none">
                {/* Formal Header */}
                <div className="border-b-2 border-slate-900 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                      {disputeNotice.statutoryReference}
                    </span>
                    <span className="text-[12px] font-bold text-slate-500">
                      তারিখ: {disputeType === "dncrp" ? dncrpInput.transactionDate : freelancerDemand.invoiceDate}
                    </span>
                  </div>
                  <h3 className="mt-3 text-[19px] sm:text-[22px] font-black tracking-tight text-slate-900 leading-snug">
                    {disputeNotice.title}
                  </h3>
                </div>

                {/* Clauses Body */}
                <div className="space-y-4 text-slate-800">
                  {disputeNotice.clauses.map((clause, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 text-[13.5px] leading-relaxed ${
                        clause.highlight
                          ? "bg-rose-50/70 border border-rose-200 font-medium text-rose-950"
                          : "bg-slate-50 border border-slate-100"
                      }`}
                    >
                      <strong className="block text-[13px] font-bold text-slate-900 mb-1">
                        {clause.heading}
                      </strong>
                      <p className="whitespace-pre-wrap">{clause.body}</p>
                    </div>
                  ))}
                </div>

                {/* Submission Instructions Box */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-2 text-[12.5px] text-indigo-950">
                  <div className="flex items-center gap-2 font-bold text-indigo-900">
                    <Building2 size={16} />
                    <span>অভিযোগ জমা দেওয়ার প্রাতিষ্ঠানিক নির্দেশিকা:</span>
                  </div>
                  <p>• <strong>কর্তৃপক্ষ:</strong> {disputeNotice.submissionInstructions.authority}</p>
                  <p>• <strong>সরাসরি ইমেইল:</strong> <a href={`mailto:${disputeNotice.submissionInstructions.email}`} className="text-indigo-700 underline font-semibold">{disputeNotice.submissionInstructions.email}</a></p>
                  <p>• <strong>হটলাইন:</strong> {disputeNotice.submissionInstructions.hotline} (টোল-ফ্রি অভিযোগ কেন্দ্র)</p>
                  <p>• <strong>ওয়েবসাইট ও পোর্টাল:</strong> <a href={disputeNotice.submissionInstructions.portalUrl} target="_blank" rel="noreferrer" className="text-indigo-700 underline font-semibold inline-flex items-center gap-1">{disputeNotice.submissionInstructions.portalUrl} <ExternalLink size={12} /></a></p>
                  <p>• <strong>ঠিকানা:</strong> {disputeNotice.submissionInstructions.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <AppFooter lang="bn" />
    </div>
  );
}
