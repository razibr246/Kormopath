import { NextResponse } from "next/server";
import { forecastHours } from "@/lib/weather";
import { DISTRICTS, sprayWindow } from "@/lib/haatbazar";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Open-Meteo forecast (no API key). Data is CC BY 4.0 and must be credited; free use is for
// non-commercial purposes — a commercial deployment needs an Open-Meteo plan or self-hosting.

export async function GET(req: Request) {
  const rl = checkRateLimit(req, { limit: 60, windowMs: 60_000, bucket: "weather" });
  if (!rl.success) return rateLimitResponse(rl.limit, rl.resetSeconds);

  const id = new URL(req.url).searchParams.get("d") ?? "";
  const district = DISTRICTS.find((d) => d.id === id);
  if (!district) return NextResponse.json({ error: "Unknown district" }, { status: 400 });

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}` +
    `&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m&timezone=Asia%2FDhaka&forecast_days=2`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const hours = forecastHours(await res.json());

    return NextResponse.json({
      district: district.id,
      hours,
      spray: sprayWindow(hours),
      fetchedAt: new Date().toISOString(),
      source: { label: "Weather data by Open-Meteo.com (CC BY 4.0)", url: "https://open-meteo.com/" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Forecast unavailable", source: { label: "Open-Meteo.com", url: "https://open-meteo.com/" } }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
