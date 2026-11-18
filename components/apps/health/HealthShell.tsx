"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ambulance, Bot, CalendarCheck, HeartPulse, Hospital, Pill, ShieldCheck, Stethoscope } from "lucide-react";
import { Phone } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

/*
 * Frame for every MediScan (KormoPath health) page: header, the section nav, the always-visible emergency strip and
 * the footer. Each page renders its own <main id="main">. Emergency help never needs an account or a payment.
 */
export const HEALTH_NAV = [
  { href: "/mediscan/emergency", bn: "জরুরি হাসপাতাল", en: "Emergency hospital", icon: Hospital, urgent: true },
  { href: "/mediscan", bn: "প্রেসক্রিপশন", en: "Prescription", icon: Pill },
  { href: "/mediscan/doctors", bn: "ডাক্তার খুঁজুন", en: "Find a doctor", icon: Stethoscope },
  { href: "/mediscan/appointments", bn: "আমার অ্যাপয়েন্টমেন্ট", en: "My appointments", icon: CalendarCheck },
  { href: "/mediscan/assistant", bn: "কোন ডাক্তার দেখাব?", en: "Which doctor?", icon: Bot },
  { href: "/mediscan/services", bn: "অ্যাম্বুলেন্স ও সেবা", en: "Ambulance & services", icon: Ambulance },
  { href: "/mediscan/admin", bn: "অ্যাডমিন ডেমো", en: "Admin demo", icon: ShieldCheck },
] as const;

export function HealthShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/mediscan";
  const active = (href: string) => (href === "/mediscan" ? path === "/mediscan" : path.startsWith(href));
  return (
    <div className="min-h-screen bg-paper text-slate-900 antialiased">
      <AppHeader taglineEn="Prescriptions, doctors and emergency care"
        appId="mediscan"
        href="/mediscan"
        name="MediScan BD"
        taglineBn="প্রেসক্রিপশন, ডাক্তার ও জরুরি সেবা · রোগ নির্ণয় নয়"
        icon={<HeartPulse size={22} />}
        accent="from-sky-600 to-cyan-700"
      />

      {/* Always-visible emergency strip: no account, no payment, never behind a step. */}
      <div className="border-b border-red-200 bg-red-50 print:hidden" data-testid="health-emergency-strip">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] text-red-900 sm:px-6">
          <span className="inline-flex items-center gap-1.5 font-bold"><Phone size={14} aria-hidden /> জরুরি অবস্থায়: <a href="tel:999" className="underline">999</a> (জাতীয় জরুরি সেবা — অ্যাম্বুলেন্স, পুলিশ, ফায়ার)</span>
          <span>স্বাস্থ্য পরামর্শ: <a href="tel:16263" className="font-semibold underline">16263</a> (স্বাস্থ্য বাতায়ন)</span>
        </div>
      </div>

      <nav aria-label="স্বাস্থ্যসেবার অংশ" className="border-b border-slate-200 print:hidden" data-testid="health-nav">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 sm:px-6 [scrollbar-width:none]">
          {HEALTH_NAV.map((n) => {
            const on = active(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold leading-[1.4] transition-colors ${on ? (("urgent" in n && n.urgent) ? "border-red-700 bg-red-700 text-white" : "border-sky-800 bg-sky-800 text-white") : ("urgent" in n && n.urgent) ? "border-red-300 bg-white text-red-800 hover:border-red-500" : "border-slate-200 bg-white text-slate-700 hover:border-sky-400"}`}>
                <n.icon size={16} aria-hidden /> {n.bn}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
      <AppFooter lang="bn" />
    </div>
  );
}
