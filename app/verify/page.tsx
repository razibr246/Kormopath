import { check, usingDevSecret } from "@/lib/passport";
import { Navbar } from "@/components/layout/Chrome";
import { AppFooter } from "@/components/layout/AppFooter";
import { BadgeCheck, ShieldX, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Verify({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const r = check(t);
  const p = r.passport;
  const lang = "en";

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased">
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        {r.valid && p ? (
          <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-sm hover:shadow-md transition-all motion-safe:animate-rise-in">
            {/* Top iridescent accent glow */}
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" aria-hidden />

            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                <BadgeCheck size={28} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={12} /> Signature valid
                  </span>
                  <span className="text-[12px] font-semibold text-slate-600">
                    {p.v === 2 ? "Selective disclosure v2" : "Full passport v1"}
                  </span>
                </div>
                <h1 className="text-[24px] sm:text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 mt-1">
                  Skill Passport <span className="font-mono text-emerald-700">{r.id}</span>
                </h1>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3.5 text-[14px] sm:grid-cols-2 border-t border-slate-100 pt-5">
              {p.v === 1 && (
                <div>
                  <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Holder</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{p.name}</dd>
                </div>
              )}
              {p.track && (
                <div>
                  <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Track</dt>
                  <dd className="font-bold text-slate-900 mt-0.5">{p.track}</dd>
                </div>
              )}
              {p.challenge && (
                <div>
                  <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Challenge</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{p.challenge}</dd>
                </div>
              )}
              <div>
                <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Issued (UTC)</dt>
                <dd className="font-mono text-[13px] font-semibold text-slate-800 mt-0.5">{new Date(p.issuedAt).toUTCString()}</dd>
              </div>
              {p.testsPassed !== undefined && (
                <div>
                  <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Automated Tests</dt>
                  <dd className="font-mono font-bold text-emerald-700 mt-0.5">
                    {p.testsPassed}/{p.testsTotal} passed
                    {p.v === 1 ? ` (edge cases: ${p.edgePassed ? "yes" : "no"}, perf: ${p.perfPassed ? "yes" : "no"})` : ""}
                  </dd>
                </div>
              )}
              {p.vivaScore !== undefined && (
                <div>
                  <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Viva Defense Score</dt>
                  <dd className="font-mono font-bold text-emerald-700 mt-0.5">{p.vivaScore}/{p.vivaTotal}</dd>
                </div>
              )}
              {p.v === 1 && (
                <>
                  <div>
                    <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Assistance Status</dt>
                    <dd className="font-semibold text-slate-800 mt-0.5">{p.assisted ? "Viewed reference fix" : "Independent solution (zero assistance)"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Code SHA-256 Fingerprint</dt>
                    <dd className="truncate font-mono text-[11px] font-medium text-slate-700 mt-0.5 bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5">{p.codeSha256}</dd>
                  </div>
                </>
              )}
              {p.v === 2 && (
                <div>
                  <dt className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider">Proof Expiration</dt>
                  <dd className="font-mono text-[13px] font-semibold text-slate-800 mt-0.5">{new Date(p.expiresAt).toUTCString()}</dd>
                </div>
              )}
            </dl>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-[12px] leading-relaxed text-slate-600">
              <div className="flex items-start gap-2">
                <Lock size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                <div>
                  Cryptographic HMAC-SHA256 signature confirms this record has not been tampered with since issuance. Test execution was completed client-side in a sandboxed Web Worker.
                  {usingDevSecret() && " This deployment uses the public developer verification secret."}
                </div>
              </div>
            </div>
          </article>
        ) : (
          <article className="rounded-2xl border border-red-200/80 bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-sm hover:shadow-md transition-all motion-safe:animate-rise-in">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-200/60 shadow-xs">
                <ShieldX size={28} aria-hidden />
              </div>
              <div>
                <span className="text-[12px] font-bold text-red-700 uppercase tracking-wider">Verification Error</span>
                <h1 className="text-[22px] sm:text-[26px] font-extrabold text-slate-900 mt-0.5">This passport cannot be verified</h1>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-slate-700 bg-red-50/60 border border-red-100 rounded-xl p-3">
              {t ? r.reason : "No passport token found in this link."}
            </p>
          </article>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/workspace"
            className="inline-flex items-center gap-1.5 text-[14px] font-bold text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg px-2 py-1 transition-colors"
          >
            <span>Complete skills evaluation to earn your own Skill Passport</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>
      <AppFooter lang={lang} />
    </div>
  );
}
