import { check, usingDevSecret } from "@/lib/passport";
import { Navbar, Footer } from "@/components/Chrome";
import { BadgeCheck, ShieldX } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Verify({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  const r = check(t);
  const p = r.passport;
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-2xl px-4 py-12">
        {r.valid && p ? (
          <article className="rounded-2xl border border-line bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <BadgeCheck size={40} className="text-kept" aria-hidden />
            <div>
                <p className="text-[14px] font-semibold text-kept">Signature valid · {p.v === 2 ? "Selective share proof" : "Full passport"}</p>
                <h1 className="display text-[28px] font-extrabold leading-tight">Skill Passport {r.id}</h1>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
              {p.v === 1 && <div><dt className="text-muted">Holder</dt><dd className="font-semibold">{p.name}</dd></div>}
              {p.track && <div><dt className="text-muted">Track</dt><dd className="font-semibold">{p.track}</dd></div>}
              {p.challenge && <div><dt className="text-muted">Challenge</dt><dd className="font-semibold">{p.challenge}</dd></div>}
              <div><dt className="text-muted">Issued</dt><dd className="num font-semibold">{new Date(p.issuedAt).toUTCString()}</dd></div>
              {p.testsPassed !== undefined && <div><dt className="text-muted">Tests passed</dt><dd className="num font-semibold">{p.testsPassed}/{p.testsTotal}{p.v === 1 ? ` (edge cases ${p.edgePassed ? "passed" : "failed"}, performance ${p.perfPassed ? "passed" : "failed"})` : ""}</dd></div>}
              {p.vivaScore !== undefined && <div><dt className="text-muted">Viva</dt><dd className="num font-semibold">{p.vivaScore}/{p.vivaTotal}</dd></div>}
              {p.v === 1 && <><div><dt className="text-muted">Help used</dt><dd className="font-semibold">{p.assisted ? "Viewed the reference fix" : "None"}</dd></div><div className="min-w-0"><dt className="text-muted">Code fingerprint (SHA-256)</dt><dd className="truncate font-mono text-[12px]">{p.codeSha256}</dd></div></>}
              {p.v === 2 && <div><dt className="text-muted">Expires</dt><dd className="num font-semibold">{new Date(p.expiresAt).toUTCString()}</dd></div>}
            </dl>
            <p className="mt-6 rounded-lg bg-paper p-3 text-[13px] text-muted">
              This signature confirms the record has not changed since this deployment signed it. Assessment results are submitted by the browser; this is not independent identity, employment or skill certification. Selective links disclose only the chosen fields and expire at the shown time.
              {usingDevSecret() && " This deployment uses a demo signing key."}
            </p>
          </article>
        ) : (
          <article className="rounded-2xl border border-leak/40 bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <ShieldX size={40} className="text-leak" aria-hidden />
              <h1 className="display text-[26px] font-extrabold">This passport can&apos;t be verified</h1>
            </div>
            <p className="mt-3 text-[16px]">{t ? r.reason : "No passport in this link."}</p>
          </article>
        )}
        <p className="mt-6 text-center"><Link href="/" className="font-semibold text-kept underline underline-offset-4">Earn your own Skill Passport</Link></p>
      </main>
      <Footer />
    </>
  );
}
