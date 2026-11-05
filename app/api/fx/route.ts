import { NextResponse } from "next/server";
import { FX_FALLBACK } from "@/lib/data";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const t0 = performance.now();
  // Never let a slow upstream hang the page: fall back to the stored rate after 6 s.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal, next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json();
    const rate = Number(d?.rates?.BDT);
    if (!(rate > 80 && rate < 250)) throw new Error("rate out of sane range");
    return NextResponse.json({
      usdBdt: rate,
      live: true,
      source: { label: "open.er-api.com daily mid-market rate", url: "https://www.exchangerate-api.com", checked: d.time_last_update_utc ?? new Date().toUTCString(), confidence: "reported" },
      ms: Math.round(performance.now() - t0),
    });
  } catch (e) {
    return NextResponse.json({ usdBdt: FX_FALLBACK.usdBdt, live: false, source: FX_FALLBACK.source, error: (e as Error).message, ms: Math.round(performance.now() - t0) });
  } finally {
    clearTimeout(timer);
  }
}
