"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { AppSwitcherDropdown } from "@/components/AppSwitcherDropdown";
import { FX_FALLBACK } from "@/lib/data";
import { fmtBdt, splitMilestoneUsd } from "@/lib/finops";
import { storageKey, usePersistentState } from "@/lib/clientStore";
import { playClick, playSuccessChime } from "@/lib/sound";
import {
  type ChuktiInvoice,
  type InvoiceMilestone,
  SAMPLE_CHUKTI_PRESETS,
  NBR_ITES_DECLARATION,
  generateClause4Text,
  calculateInvoiceFinOps,
} from "@/lib/chuktiguard";
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
  const [activeTab, setActiveTab] = useState<"editor" | "preview" | "clause4">("preview");
  const [clauseLang, setClauseLang] = useState<"en" | "bn">("en");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedClause, setCopiedClause] = useState(false);
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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/chuktiguard" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md">
                <ShieldCheck size={22} />
              </span>
              <div>
                <span className="text-[19px] font-extrabold tracking-tight text-slate-900 block leading-tight">
                  ChuktiGuard
                </span>
                <span className="text-[11px] font-semibold text-indigo-700 block leading-none">
                  বি২বি ইনভয়েস ও ইন্টারনেট ব্ল্যাকআউট শিল্ড
                </span>
              </div>
            </Link>

            <Link
              href="/"
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-600 hover:border-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <img src="/kormopath-logo.jpg" alt="" className="h-4 w-auto rounded" />
              <span>← KormoPath</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-mono text-slate-700">
              <span className="text-slate-400">$1 =</span>
              <span className="font-bold text-indigo-700">৳{usdBdt.toFixed(1)}</span>
            </div>

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

            <AppSwitcherDropdown currentAppId="chuktiguard" lang="bn" variant="light" />
          </div>
        </div>
      </header>

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
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "preview"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Document View
                </button>
                <button
                  onClick={() => setActiveTab("editor")}
                  className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "editor"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Editor &amp; Milestones
                </button>
                <button
                  onClick={() => setActiveTab("clause4")}
                  className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition-all ${
                    activeTab === "clause4"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Clause 4 Shield
                </button>
              </div>

              {/* Sample switcher */}
              <div className="flex items-center gap-1 text-[12px]">
                <span className="text-slate-500 font-medium">Presets:</span>
                <button
                  onClick={() => handleSelectPreset(0)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Dev Sprint
                </button>
                <button
                  onClick={() => handleSelectPreset(1)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  UI/UX Design
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced</span>
              <div className="text-[20px] font-extrabold text-slate-900">${finops.totalUsd}</div>
              <span className="text-[11px] text-slate-500 font-mono">≈ ৳{finops.formattedGross}</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Incentive estimate</span>
              <div className="text-[20px] font-extrabold text-emerald-800">+৳{finops.formattedIncentive}</div>
              <span className="text-[11px] text-emerald-600">Bangladesh Bank FE Circular 02</span>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Net Retained Take-Home</span>
              <div className="text-[20px] font-extrabold text-indigo-900">৳{finops.formattedNet}</div>
              <span className="text-[11px] text-indigo-600 font-semibold">{finops.keptPct}% kept ({invoice.paymentRail.toUpperCase()})</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Milestone Progress</span>
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Billed From (Contractor / Supplier):
                  </span>
                  <div className="font-bold text-slate-900 text-[15px]">{invoice.contractor.name}</div>
                  <div className="text-[13px] text-slate-600">{invoice.contractor.email}</div>
                  <div className="text-[13px] text-slate-600">{invoice.contractor.phone}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
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
                    <span>৳{finops.formattedGross}</span>
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

              {/* Statutory NBR ITES Tax Exemption Stamp */}
              {invoice.includeNbrExemption && (
                <div className="mt-6 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-5">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-[13px] mb-1">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Statutory NBR ITES Export Tax-Exemption Declaration</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                    Sixth Schedule (Part A, Para 33) &amp; Section 52 of Income Tax Act 2023 (Bangladesh). IT &amp; software export proceeds received via formal banking channels are 100% tax-free from withholding (AIT) and eligible for the 2.5% Bangladesh Bank inward cash incentive.
                  </p>
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
                    <span>Include NBR Section 52 ITES Tax-Exemption Declaration</span>
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
      </main>
    </div>
  );
}
