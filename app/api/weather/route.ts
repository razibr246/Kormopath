import { NextResponse } from "next/server";
import { z } from "zod";
import { DISTRICTS, sprayWindow, type WeatherHour } from "@/lib/haatbazar";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Open-Meteo forecast (no API key). Data is CC BY 4.0 and must be credited; free use is for
// non-commercial purposes — a commercial deployment needs an Open-Meteo plan or self-hosting.
const OpenMeteo = z.object({
  hourly: z.object({
    time: z.array(z.string()).min(1).max(400),
    temperature_2m: z.array(z.number().nullable()),
    precipitation_probability: z.array(z.number().nullable()),
    precipitation: z.array(z.number().nullable()),
    wind_speed_10m: z.array(z.number().nullable()),
  }),
  utc_offset_seconds: z.number().optional(),
});

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
    const parsed = OpenMeteo.safeParse(await res.json());
    if (!parsed.success) throw new Error("Unexpected forecast format");
    const h = parsed.data.hourly;

    // Hours from "now" in Dhaka time (UTC+6), as the API returns local times without offset.
    const nowDhaka = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 13);
    const start = Math.max(0, h.time.findIndex((t) => t.slice(0, 13) >= nowDhaka));
    const hours: WeatherHour[] = h.time.slice(start, start + 24).map((t, k) => {
      const i = start + k;
      const clamp = (v: number | null | undefined, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : 0);
      return {
        time: t,
        temperatureC: clamp(h.temperature_2m[i], -20, 60),
        precipProbability: Math.round(clamp(h.precipitation_probability[i], 0, 100)),
        precipitationMm: clamp(h.precipitation[i], 0, 500),
        windKmh: clamp(h.wind_speed_10m[i], 0, 300),
      };
    });
    if (!hours.length) throw new Error("No forecast hours");

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
