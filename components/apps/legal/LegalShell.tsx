"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveTabIntoView } from "@/components/layout/useActiveTabIntoView";
import { Bot, ClipboardList, Handshake, Home, Phone, Scale, ScrollText, Users } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { HELPLINES } from "@/lib/legal/data";
import "./legal.css";

/*
 * Frame for every /legal page: KormoPath header, the section nav, the always-visible help strip and the footer.
 * Ported features come from the Digital Legal Aid System (razibr246, AdribMahmud101); the look is KormoPath's.
 * Design rules: docs/apps/legal/DESIGN_BRIEF.md.
 */
export const LEGAL_NAV = [
  { href: "/legal", bn: "শুরু", en: "Start", icon: Home },
  { href: "/legal/assistant", bn: "জিজ্ঞাসা করুন", en: "Ask", icon: Bot },
  { href: "/legal/apply", bn: "আবেদনের খসড়া", en: "Application draft", icon: ClipboardList },
  { href: "/legal/track", bn: "আমার কেস", en: "My case", icon: ScrollText },
  { href: "/legal/mediation", bn: "মীমাংসা", en: "Mediation", icon: Handshake },
  { href: "/legal/demo", bn: "অফিস ডেমো", en: "Office demo", icon: Users },
] as const;

const STRIP = ["emergency", "women_children", "legal_aid"] as const;
// Short names so the strip fits one row on a phone; the full name shows from sm up and in the title.
const SHORT_BN: Record<string, string> = { emergency: "জরুরি", women_children: "নারী ও শিশু", legal_aid: "আইনি সহায়তা" };

export function HelpStrip() {
  const lines = STRIP.map((id) => HELPLINES.find((h) => h.id === id)!).filter(Boolean);
  return (
    <aside aria-label="জরুরি সাহায্য" className="lg-strip items-center" data-testid="legal-help-strip">
      {lines.map((h) => (
        <a key={h.id} href={`tel:${h.number}`} className={`lg-strip-call ${h.id === "emergency" ? "lg-strip-urgent" : ""}`} title={`${h.bn} — উৎস: ${h.source.label}`}>
          <Phone size={15} aria-hidden />
          <span className="font-mono text-[15px] font-bold">{h.number.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)])}</span>
          <span className="text-[13px] sm:hidden">{SHORT_BN[h.id]}</span>
          <span className="hidden text-[13px] sm:inline">{h.bn}</span>
        </a>
      ))}
      <button
        type="button"
        onClick={() => window.location.replace("https://www.google.com")}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white/90 px-3 py-1.5 text-[12px] font-bold text-red-700 shadow-2xs hover:bg-red-50 hover:border-red-300 transition-colors"
        title="তাৎক্ষণিকভাবে অন্য সাইটে চলে যান (ব্রাউজার স্ক্রিন সুরক্ষিত রাখতে)"
        aria-label="নিরাপদ প্রস্থান (Quick Exit)"
      >
        <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" aria-hidden="true" />
        <span className="hidden sm:inline">নিরাপদ প্রস্থান (Quick Exit)</span>
        <span className="sm:hidden">প্রস্থান</span>
      </button>
    </aside>
  );
}

export function LegalShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/legal";
  const active = (href: string) => (href === "/legal" ? path === "/legal" : path.startsWith(href));
  const tabBar = useActiveTabIntoView<HTMLDivElement>(path);
  return (
    <div className="lg-root min-h-screen bg-paper">
      <AppHeader
        appId="legal"
        href="/legal"
        name="আইনি সহায়তা"
        taglineBn="বিনামূল্যে আইনি সাহায্যের পথ"
        taglineEn="Your path to free legal aid"
        icon={<Scale size={22} />}
        accent="from-indigo-500 to-amber-500"
        hotline={{ number: "16699", label: "টোল-ফ্রি" }}
      />
      <nav aria-label="আইনি সহায়তার অংশ" className="lg-nav sticky top-[68px] sm:top-[76px] z-30 transition-all shadow-2xs" data-testid="legal-nav">
        <div ref={tabBar} className="kp-tabbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none]">
          {LEGAL_NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`lg-tab ${active(n.href) ? "lg-tab-on" : ""}`}>
              <n.icon size={16} aria-hidden /> {n.bn}
            </Link>
          ))}
        </div>
      </nav>
      <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-4 sm:px-6">
        <HelpStrip />
        {children}
      </main>
      <AppFooter lang="bn" />
    </div>
  );
}
