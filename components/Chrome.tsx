"use client";
import Link from "next/link";
import { EcosystemLauncherButton } from "@/components/EcosystemHub";
import { AppSwitcherDropdown } from "@/components/AppSwitcherDropdown";
import { FX_FALLBACK } from "@/lib/data";
import { Globe, ShieldCheck, Compass, Sparkles, ExternalLink, ArrowUpRight } from "lucide-react";

export function PlatformBadge() {
  return null;
}

export function Navbar(props?: {
  lang?: "en" | "bn";
  setLang?: (l: "en" | "bn") => void;
  usdBdt?: number;
  fxLive?: boolean;
  onOpenEcosystem?: () => void;
  isEcosystemOpen?: boolean;
}) {
  const { lang = "en", setLang, usdBdt = FX_FALLBACK.usdBdt, fxLive = false, onOpenEcosystem, isEcosystemOpen = false } = props ?? {};

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d1e]/95 backdrop-blur-md text-white shadow-xl transition-colors">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Official Brand & Logo */}
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/15 bg-[#0a1226] p-0.5 shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/kormopath-logo.jpg"
                alt="KormoPath Logo"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex flex-col whitespace-nowrap">
              <span className="display text-[20px] font-extrabold leading-none tracking-tight">
                <span className="text-white">Kormo</span>
                <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-400 bg-clip-text text-transparent">Path</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">
                কর্মপথ • Autonomous AI
              </span>
            </div>
          </Link>

          {/* Center navigation: a few top-level destinations; individual apps live in the Ecosystem launcher. */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-1 text-[13px] font-semibold text-slate-300">
            <Link href="/workspace" className="rounded-lg px-3 py-1.5 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors text-orange-300 hover:text-orange-200">
              {lang === "bn" ? "ওয়ার্কস্পেস" : "Workspace"}
            </Link>
            <a href="/#apps-showcase" className="rounded-lg px-3 py-1.5 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors">
              {lang === "bn" ? "৬টি অ্যাপ" : "Apps"}
            </a>
            <Link href="/opportunities" className="rounded-lg px-3 py-1.5 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors">
              {lang === "bn" ? "আমার পথ" : "My Path"}
            </Link>
            <Link href="/judges" className="rounded-lg px-3 py-1.5 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors text-amber-300 hover:text-amber-200">
              {lang === "bn" ? "বিচারক গাইড" : "Judge tour"}
            </Link>
            <a href="/#faq" className="rounded-lg px-3 py-1.5 whitespace-nowrap hover:text-white hover:bg-white/10 transition-colors">
              FAQ
            </a>
          </nav>
        </div>

        {/* Right Utility Cluster: Seamless dark glass, unified heights, 0% wrapping */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* USD/BDT reference rate; marked live only when the API confirms it */}
          <div
            className="hidden xl:flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-mono text-slate-300 shadow-xs"
            title={fxLive ? "Latest available USD/BDT market reference rate" : "Fallback USD/BDT reference rate; live data unavailable"}
          >
            <span className={`h-2 w-2 rounded-full ${fxLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-slate-400 font-sans text-[11px]">$1 =</span>
            <span className="font-bold text-white">৳{usdBdt.toFixed(1)}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{fxLive ? "Live" : "Ref"}</span>
          </div>

          {/* Command Palette Trigger */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-slate-300 transition-colors shadow-xs"
            title="Search anything (Cmd+K / Ctrl+K)"
            aria-label="Search Command Palette"
          >
            <span className="text-slate-400">🔍</span>
            <span className="hidden 2xl:inline text-slate-300">Search</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-white/10">
              ⌘K
            </kbd>
          </button>

          {/* Language Switcher */}
          {setLang && (
            <button
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[12px] font-bold text-slate-200 transition-colors"
              title="Toggle English / বাংলা"
              aria-label={lang === "en" ? "বাংলায় দেখুন" : "View in English"}
            >
              <Globe size={14} className="text-amber-400" />
              <span className="hidden sm:inline">{lang === "en" ? "বাংলা" : "EN"}</span>
            </button>
          )}

          {/* 9-Dot Launcher Button */}
          {/* Hidden on phones: the app switcher next to it covers navigation there. */}
          {onOpenEcosystem && (
            <span className="hidden sm:inline-flex">
              <EcosystemLauncherButton onClick={onOpenEcosystem} isOpen={isEcosystemOpen} />
            </span>
          )}

          {/* 5-App Dropdown Switcher (Auto-detects current route) */}
          <span className={onOpenEcosystem ? "sm:hidden" : ""}>
            <AppSwitcherDropdown lang={lang} />
          </span>

          {/* Quick Action CTA Pill */}
          <Link
            href="/workspace"
            className="hidden xl:inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 px-3.5 py-2 text-[12px] font-bold text-white shadow-md shadow-orange-600/25 transition-all hover:scale-[1.02]"
          >
            <Sparkles size={13} />
            <span>{lang === "bn" ? "ওয়ার্কস্পেস চালান" : "Try the Workspace"}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4 pb-8 border-b border-line text-[14px]">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-3">
              <img
                src="/kormopath-logo.jpg"
                alt="KormoPath Logo"
                className="h-10 w-auto rounded-lg object-contain shadow-xs border border-slate-200"
              />
              <div>
                <span className="display text-[21px] font-extrabold block leading-tight">
                  <span className="text-[#070d1e]">Kormo</span>
                  <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">Path</span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 block leading-none">কর্মপথ • KormoPath</span>
              </div>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              The Autonomous Skill-to-Income, Legal &amp; FinOps Path for Bangladeshi Youth. Protecting 700K+ freelancers from commission drain and infrastructure blackouts.
            </p>
            <div className="rounded-lg bg-orange-50/70 border border-orange-200/60 p-2 text-[12px] text-ink font-semibold">
              🚀 Autonomous AI Platform for Bangladeshi Youth
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-[15px] text-ink">4-Stage Guided OS</h4>
            <ul className="space-y-1.5 text-[13px] text-muted">
              <li><a href="#pipeline" className="hover:text-kept transition-colors">1. Compass (Skill &amp; AI Auditor)</a></li>
              <li><a href="#pipeline" className="hover:text-kept transition-colors">2. VivaForge (Live Bug-Hunt Verifier)</a></li>
              <li><a href="#pipeline" className="hover:text-kept transition-colors">3. ChuktiGuard (Direct Pitch &amp; Contract)</a></li>
              <li><a href="#pipeline" className="hover:text-kept transition-colors">4. TakaFlow (Deterministic FinOps)</a></li>
              <li><a href="#pipeline" className="hover:text-kept transition-colors">5. Telemetry &amp; Guardrails Hub</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-[15px] text-ink">Ecosystem Innovations</h4>
            <ul className="space-y-1.5 text-[13px] text-muted">
              <li><a href="#ecosystem-preview" className="hover:text-kept transition-colors">AdmitBuddy (Education Matcher)</a></li>
              <li><a href="#ecosystem-preview" className="hover:text-kept transition-colors">MediScan BD (Prescription OCR)</a></li>
              <li><a href="#ecosystem-preview" className="hover:text-kept transition-colors">Shohoj Budget (Voice Expense AI)</a></li>
              <li><a href="#ecosystem-preview" className="hover:text-kept transition-colors">HaatBazar AI (64-District Mandi)</a></li>
              <li><a href="#ecosystem-preview" className="hover:text-kept transition-colors">Probaho (Viva Speaking Coach)</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2 text-[13px] text-muted">
            <h4 className="font-bold text-[15px] text-ink">Regulatory Grounding</h4>
            <p className="leading-relaxed">
              • <strong>NBR IT/ITES Exemption</strong>: 1 July 2024 – 30 June 2027 (Finance Act 2024).
            </p>
            <p className="leading-relaxed">
              • <strong>Bangladesh Bank Circular</strong>: 2.5% Cash Export Incentive for software/ITES individuals.
            </p>
            <p className="leading-relaxed">
              • <strong>Clause 4 Force-Majeure</strong>: 48-hour delivery buffer + UPS hardware SLA.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[13px] text-muted">
          <div>
            <p className="font-bold text-ink">
              KormoPath Autonomous Operating System for Bangladeshi Youth
            </p>
            <p className="text-[12px] text-muted">
              Designed and built in Dhaka &amp; Khulna, Bangladesh. Money math is deterministic and unit-tested.
            </p>
          </div>
          <div className="text-[12px] sm:text-right">
            <p>Information only; not formal legal or tax counsel.</p>
            <p className="text-muted/70">Check inward SWIFT parameters with your authorized dealer bank.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
